import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { config } from '../config';
import type { GameState, Zombie } from '../game/state';
import { paintTexture } from './materials';
import { eyeGlow, gradedBody } from './zombieSkin';
import { createJoints, riggedBody, whenZombieModelsLoad, zombieModelsReady, type RiggedBody } from './characterRig';

// How each kind of infected is built: its body scale (width, height, depth) and a tint on its skin and
// clothes. The brute is broad and dark, the runner lean, the screamer pale.
const KIND_LOOK = {
  walker: { scale: [1, 1, 1], tint: '#ffffff' },
  runner: { scale: [0.9, 0.98, 0.9], tint: '#ffd8d0' },
  brute: { scale: [1.38, 1.26, 1.34], tint: '#c8b4a6' },
  screamer: { scale: [0.94, 1.04, 0.94], tint: '#e4ecf4' },
} as const;

// Who the infected were, from the place they are in. A tint pulls the clothes toward the uniform, and
// gear sits on the head. A palette gives each shopper their own colour.
// `top` is the garment on the torso (the models are bare-chested): its colours, how long it is, and
// whether it has a hem that hangs open like a coat or gown.
interface Look { tint: string; strength: number; palette?: string[]; gear?: 'hardhat' | 'helmet' | 'cap' | 'police' | 'scrubs'; top?: { colors: string[]; length: number; coat?: boolean } }
const LOOKS: Record<string, Look> = {
  patient: { tint: '#b9cfe8', strength: 0.5, top: { colors: ['#a9c3df', '#b8cde0'], length: 0.62, coat: true } },
  nurse: { tint: '#8fd0b2', strength: 0.4, gear: 'scrubs', top: { colors: ['#5fbf9f', '#7fcfb4'], length: 0.52 } },
  surgeon: { tint: '#5fb0a6', strength: 0.4, gear: 'scrubs', top: { colors: ['#3f9a92', '#4aa89f'], length: 0.52 } },
  visitor: { tint: '#ffffff', strength: 0.3, top: { colors: ['#8a9ab0', '#a89a86', '#7a8a7a', '#b0a8a0', '#6e7a96'], length: 0.52 } },
  guard: { tint: '#56648a', strength: 0.5, gear: 'cap', top: { colors: ['#38456d', '#2f3a5c'], length: 0.54 } },
  worker: { tint: '#d8d2c6', strength: 0.3, top: { colors: ['#e2e2e6', '#9bb0cc', '#c9b79a', '#8fa59f'], length: 0.52 } },
  exec: { tint: '#5d6372', strength: 0.4, top: { colors: ['#2a2e3a', '#33363e', '#3a3a44'], length: 0.58, coat: true } },
  utility: { tint: '#e8c24a', strength: 0.35, gear: 'hardhat', top: { colors: ['#e6b422', '#f0c02a'], length: 0.54 } },
  shopper: { tint: '#ffffff', strength: 0.25, top: { colors: ['#c75a4a', '#4a7ac7', '#5ac78a', '#c7b04a', '#9a6ac7', '#d8d8d8', '#e08a4a'], length: 0.5 } },
  scientist: { tint: '#eef4f6', strength: 0.4, top: { colors: ['#eef2f4', '#e4eaee'], length: 0.86, coat: true } },
  soldier: { tint: '#76865c', strength: 0.5, gear: 'helmet', top: { colors: ['#59683f', '#4f5d3a'], length: 0.6 } },
  police: { tint: '#3d4c78', strength: 0.5, gear: 'police', top: { colors: ['#27345c', '#2f3b66'], length: 0.58 } },
};

const SHIRTS = ['#61544a', '#48565b', '#5b5c4c', '#704a42', '#53515b', '#4f5d53'];
const PANTS = ['#343c43', '#49453c', '#343739', '#48433d'];
const SKINS = ['#a99c88', '#96816a', '#756553', '#b7ad9a', '#8e8475'];
const HAIR = ['#37332d', '#4c4840', '#666057', '#393732'];
// A dead body takes this long to hit the floor, and sinks out of sight over its last moments.
const COLLAPSE_SECONDS = 0.95;
const SINK_SECONDS = 0.8;
const SINK_DEPTH = 0.35;

type Ring = [y: number, width: number, depth: number, centerZ?: number];
interface Segment { group: THREE.Group; parts: THREE.BufferGeometry[]; }
interface ZombieView {
  group: THREE.Group;
  hips: THREE.Object3D;
  torso: THREE.Object3D;
  head: THREE.Object3D;
  arms: THREE.Object3D[];
  elbows: THREE.Object3D[];
  wrists: THREE.Object3D[];
  legs: THREE.Object3D[];
  knees: THREE.Object3D[];
  ankles: THREE.Object3D[];
  // The drawn zombie's one material, or null for a skinned model, whose materials are shared.
  material: THREE.MeshStandardMaterial | null;
  geometries: THREE.BufferGeometry[];
  // The skinned model the joints pose, once the models have loaded.
  rig: RiggedBody | null;
  phase: number;
  gait: number;
  initialised: boolean;
  // How far into a crawl it is, and how far into a stagger, from 0 to 1, eased so they don't snap.
  crawl: number;
  stagger: number;
  // How far slumped it stands, 1 for one of the floor's own dead not yet woken.
  slump: number;
}
// The height of the ground a zombie stands on: the garage floor, the slope of the ramp, or the street.
function surfaceHeight(level: GameState['level'], x: number, z: number): number {
  const ramp = level.ramp;
  if (!ramp || z < ramp.zBottom) return 0;
  if (z > ramp.zTop) return ramp.rise;
  if (Math.abs(x - ramp.x) > ramp.width / 2) return 0;
  return ramp.rise * (z - ramp.zBottom) / (ramp.zTop - ramp.zBottom);
}

export interface ZombieViews { update(state: GameState, frameSeconds: number): void; }

// A single surface atlas gives cloth grain and skin pores their own UV space. It is shared by
// every figure; outfit and complexion are vertex colors rather than separate draw calls.
function surfaceAtlas(): THREE.CanvasTexture {
  return paintTexture(512, 2108, (ctx, size, random) => {
    ctx.fillStyle = '#d5d0c6'; ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 27000; i++) {
      const x = random() * size, y = random() * size;
      const alpha = x < size / 2 ? 0.06 + random() * 0.13 : random() * 0.08;
      ctx.fillStyle = `rgba(43,35,28,${alpha})`;
      ctx.fillRect(x, y, x < size / 2 ? 0.7 : 0.45, 1 + random() * 1.5);
    }
    for (let y = 2; y < size; y += 3) {
      ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size / 2, y); ctx.stroke();
    }
    for (let i = 0; i < 35; i++) {
      const x = size / 2 + random() * size / 2, y = random() * size;
      const r = 4 + random() * 25;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
      gradient.addColorStop(0, `rgba(${i % 4 === 0 ? '92,48,42' : '87,82,65'},0.22)`);
      gradient.addColorStop(1, 'rgba(90,75,65,0)');
      ctx.fillStyle = gradient; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // Cloth gets broad dried grime at the lower hem and a shoulder stain, rather than only
    // micro-noise. The large features remain visible from a few meters away.
    for (const [x, y, r] of [[54, 430, 110], [191, 305, 90], [38, 110, 65]]) {
      const stain = ctx.createRadialGradient(x, y, 4, x, y, r);
      stain.addColorStop(0, 'rgba(45,32,20,0.32)'); stain.addColorStop(1, 'rgba(45,32,20,0)');
      ctx.fillStyle = stain; ctx.fillRect(Math.max(0, x - r), y - r, Math.min(size / 2, x + r) - Math.max(0, x - r), r * 2);
    }
    // Broad dirt traces and water staining read from gameplay distances without looking furry.
    for (let i = 0; i < 18; i++) {
      const x = random() * size / 2, y = random() * size;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, 40);
      gradient.addColorStop(0, 'rgba(32,27,22,0.15)'); gradient.addColorStop(1, 'rgba(32,27,22,0)');
      ctx.fillStyle = gradient; ctx.fillRect(x - 40, y - 40, 80, 80);
    }
  });
}

// Ring meshes make a continuous tailored/sculpted silhouette, instead of separate balls and
// cylinders. Faces point toward -z. The face's eye hollows and jaw are built into the skull.
function shaped(rings: Ring[], radial = 20, face = false): THREE.BufferGeometry {
  const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
  const firstY = rings[0][0], height = Math.max(0.001, Math.abs(rings[rings.length - 1][0] - firstY));
  rings.forEach(([y, w, d, center = 0], row) => {
    for (let i = 0; i <= radial; i++) {
      const a = i / radial * Math.PI * 2;
      const x = Math.sin(a) * w;
      let z = Math.cos(a) * d + center;
      if (face && Math.cos(a) < -0.3) {
        const front = Math.max(0, -Math.cos(a));
        // Deepen the orbital plane and cheek hollows; keep a flatter human forehead.
        const eye = Math.exp(-Math.pow((y - 0.19) / 0.026, 2)) * Math.exp(-Math.pow((Math.abs(x) - 0.039) / 0.026, 2));
        const cheek = Math.exp(-Math.pow((y - 0.112) / 0.035, 2)) * Math.exp(-Math.pow((Math.abs(x) - 0.065) / 0.026, 2));
        z += (eye * 0.012 + cheek * 0.008) * front;
      }
      positions.push(x, y, z); uvs.push(i / radial, Math.abs(y - firstY) / height);
      if (row < rings.length - 1 && i < radial) {
        const n = row * (radial + 1) + i;
        if (rings[rings.length - 1][0] > firstY) indices.push(n, n + 1, n + radial + 1, n + 1, n + radial + 2, n + radial + 1);
        else indices.push(n, n + radial + 1, n + 1, n + 1, n + radial + 1, n + radial + 2);
      }
    }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); geo.setIndex(indices);
  geo.computeVertexNormals(); geo.userData.sculptFace = face; return geo;
}
function frayed(geometry: THREE.BufferGeometry, edgeY: number, seed: number): THREE.BufferGeometry {
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    if (Math.abs(positions.getY(i) - edgeY) > 0.008) continue;
    const angle = Math.atan2(positions.getX(i), positions.getZ(i));
    positions.setY(i, positions.getY(i) - 0.003 - (1 + Math.sin(angle * 5 + seed)) * 0.005);
  }
  geometry.computeVertexNormals(); return geometry;
}
function softBox(w: number, h: number, d: number, radius = 0.01): THREE.BufferGeometry {
  return new RoundedBoxGeometry(w, h, d, 2, radius);
}
function wedge(points: number[]): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2));
  geometry.computeVertexNormals(); return geometry;
}

// A pool of blood that spreads under a body: dark red with a wet edge, drawn once and shared.
function bloodPoolTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.translate(size / 2, size / 2);
  ctx.fillStyle = '#5a0f0e';
  ctx.beginPath();
  for (let i = 0; i <= 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    const r = size * 0.4 * (0.82 + 0.18 * Math.sin(a * 3 + 1) + 0.1 * Math.sin(a * 7)) ;
    ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const shine = ctx.createRadialGradient(size * 0.42, size * 0.4, 4, size * 0.42, size * 0.4, size * 0.25);
  shine.addColorStop(0, 'rgba(160,40,36,0.55)');
  shine.addColorStop(1, 'rgba(160,40,36,0)');
  ctx.fillStyle = shine;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createZombieViews(scene: THREE.Scene): ZombieViews {
  const atlas = surfaceAtlas();
  const views = new Map<number, ZombieView>();
  // Blood spreads under every body that falls, stays a good while, then dries away.
  const poolGeometry = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const poolMap = bloodPoolTexture();
  const pools = new Map<number, { mesh: THREE.Mesh; born: number; level: string; size: number }>();
  // Once the skinned models arrive, the drawn zombies are rebuilt as models.
  whenZombieModelsLoad(() => {
    for (const [id, view] of views) { dispose(view); views.delete(id); }
  });
  // A skinned zombie: the same tree of joints as the drawn one, without its meshes, posing a model.
  // The clothes and skin of a skinned zombie: the body texture repainted for its kind and a seed of its
  // own, trousers dyed for what it was, and eyes that glow.
  const tinted = new Map<string, THREE.Material>();
  function dress(rig: RiggedBody, zombie: Zombie): void {
    const look = LOOKS[zombie.look] ?? LOOKS.visitor;
    const base = new THREE.Color(look.palette ? look.palette[zombie.id % look.palette.length] : look.tint);
    const lookColor = new THREE.Color(1, 1, 1).lerp(base, look.strength);
    const model = zombie.id % 2;
    const seed = Math.floor(zombie.id * 0.618 * 3) % 3;
    rig.object.traverse((object) => {
      if (!(object instanceof THREE.SkinnedMesh) || Array.isArray(object.material)) return;
      const source = object.material as THREE.MeshStandardMaterial;
      const name = source.name;
      const skin = name.startsWith('Body');
      if (!skin && !name.startsWith('Bottom')) return;
      const id = `${source.uuid}|${skin ? `${zombie.kind}|${seed}` : lookColor.getHexString()}`;
      let material = tinted.get(id);
      if (!material) {
        const copy = source.clone();
        if (skin && source.map) {
          const graded = gradedBody(source.map, model, zombie.kind, seed);
          if (graded) {
            copy.map = graded.map;
            copy.emissiveMap = graded.emissive;
            copy.emissive = new THREE.Color(1, 1, 1);
            copy.emissiveIntensity = eyeGlow(zombie.kind);
          }
          copy.roughness = 0.78;
        } else if (!skin) {
          copy.color.multiply(lookColor);
        }
        material = copy;
        tinted.set(id, material);
      }
      object.material = material;
    });
    if (look.gear) rig.attach('Head', gear(look.gear, zombie.id));
    if (look.top) rig.attach('Spine1', garment(look.top, zombie.id));
  }
  // A shirt, gown or coat torn to rags: open down one side, a ragged hem, holes, stained and dark with
  // blood and grime toward the bottom.
  function garment(top: NonNullable<Look['top']>, id: number): THREE.Object3D {
    const group = new THREE.Group();
    const rows = 9, columns = 22;
    const arc = Math.PI * 2 * (0.78 + 0.08 * ((id * 0.37) % 1));
    const start = (id % 2 ? 1 : -1) * 0.6 + Math.PI * (id % 2 ? 0.1 : -0.1);
    const geometry = new THREE.CylinderGeometry(0.158, top.coat ? 0.19 : 0.152, top.length, columns, rows, true, start, arc);
    const positions = geometry.attributes.position;
    const colors = new Float32Array(positions.count * 3);
    const base = new THREE.Color(top.colors[id % top.colors.length]);
    const blood = new THREE.Color('#4a120e');
    const noise = (x: number, y: number, seed: number) => (Math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453) % 1;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
      const low = (top.length / 2 - y) / top.length; // 0 at the shoulder, 1 at the hem
      let nx = x, ny = y, nz = z;
      // The hem is ragged: each column hangs a different length, and the cloth hangs loose.
      if (low > 0.85) ny += (Math.abs(noise(x, 0, id)) * 0.9 + 0.15) * 0.14 * (1 + Math.abs(noise(z, 1, id)));
      const loose = 1 + 0.12 * low * Math.abs(noise(x, z, id + 3));
      nx *= loose; nz *= loose;
      positions.setXYZ(i, nx, ny, nz);
      // Grime and blood gather low and around a wound or two.
      const grime = Math.min(1, low * 0.9 + Math.abs(noise(x, y, id + 9)) * 0.25);
      const wound = Math.max(0, 1 - Math.hypot(x - 0.06 * (id % 3 - 1), y - 0.02 - 0.06 * (id % 2)) / 0.13);
      const color = base.clone().multiplyScalar(1 - grime * 0.5).lerp(blood, Math.min(0.85, wound * 0.9 + low * low * 0.25));
      colors.set([color.r, color.g, color.b], i * 3);
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide });
    const shell = new THREE.Mesh(geometry, material);
    // Wider than it is deep, hanging from the shoulders.
    shell.scale.z = 0.68;
    shell.position.set(0, 0.26 - top.length / 2, 0.01);
    shell.castShadow = true;
    group.add(shell);
    return group;
  }
  // A hat, helmet or cap, a few metres of simple shapes sitting on the head bone.
  function gear(kind: NonNullable<Look['gear']>, id: number): THREE.Object3D {
    const group = new THREE.Group();
    const paint = (color: string) => new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
    const add = (geometry: THREE.BufferGeometry, color: string, y: number, z = 0) => {
      const mesh = new THREE.Mesh(geometry, paint(color));
      mesh.position.set(0, y, z); mesh.castShadow = true; group.add(mesh); return mesh;
    };
    if (kind === 'hardhat') {
      add(new THREE.SphereGeometry(0.135, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), '#e6b422', 0.1);
      add(new THREE.CylinderGeometry(0.17, 0.17, 0.018, 20), '#e6b422', 0.1, 0.02);
    } else if (kind === 'helmet') {
      add(new THREE.SphereGeometry(0.145, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2 + 0.25), '#4f5a3a', 0.1);
    } else if (kind === 'police') {
      add(new THREE.CylinderGeometry(0.125, 0.14, 0.07, 18), '#1f2a46', 0.2);
      add(new THREE.CylinderGeometry(0.15, 0.15, 0.012, 18), '#111827', 0.17, 0.05);
    } else if (kind === 'scrubs') {
      add(new THREE.SphereGeometry(0.128, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), id % 2 ? '#4fa89a' : '#7fc6b0', 0.1);
    } else {
      add(new THREE.CylinderGeometry(0.12, 0.13, 0.06, 18), '#2a3350', 0.2);
    }
    return group;
  }
  function buildRigged(zombie: Zombie): ZombieView {
    const group = new THREE.Group(); group.name = `Infected ${zombie.id}`;
    group.rotation.order = 'YXZ';
    const joints = createJoints();
    const rig = riggedBody(zombie.id);
    group.add(rig.object);
    dress(rig, zombie);
    // Each kind has its own build, and no two are quite the same height.
    const [sx, sy, sz] = KIND_LOOK[zombie.kind].scale;
    const height = zombie.boss ? 1.16 : 0.95 + 0.1 * ((zombie.id * 0.381966) % 1);
    group.scale.set(sx * height, sy * height, sz * height);
    scene.add(group);
    return { group, ...joints, material: null, geometries: [], rig,
      phase: zombie.id * 1.77, gait: 0, initialised: false, crawl: 0, stagger: 0, slump: zombie.dormant ? 1 : 0 };
  }
  function build(zombie: Zombie): ZombieView {
    if (zombieModelsReady()) return buildRigged(zombie);
    const group = new THREE.Group(); group.name = `Infected ${zombie.id}`;
    // Turn to face first, then fall about the body's own axes.
    group.rotation.order = 'YXZ';
    const shirt = SHIRTS[zombie.id % SHIRTS.length], pants = PANTS[zombie.id % PANTS.length];
    const skin = SKINS[zombie.id % SKINS.length], hair = HAIR[zombie.id % HAIR.length];
    const longSleeves = zombie.id % 3 !== 1;
    const material = new THREE.MeshStandardMaterial({ map: atlas, bumpMap: atlas, bumpScale: 0.001,
      vertexColors: true, roughness: 0.88, emissive: '#7d261b', emissiveIntensity: 0 });
    const geometries: THREE.BufferGeometry[] = [];
    const segments: Segment[] = [];
    const segment = (parent: THREE.Object3D, x: number, y: number, z: number): Segment => {
      const part = { group: new THREE.Group(), parts: [] as THREE.BufferGeometry[] };
      part.group.position.set(x, y, z); parent.add(part.group); segments.push(part); return part;
    };
    const part = (target: Segment, geo: THREE.BufferGeometry, color: string, skinSurface = false,
      at: [number, number, number] = [0, 0, 0], rotation: [number, number, number] = [0, 0, 0]) => {
      const sculptFace = geo.userData.sculptFace === true;
      const g = geo.index ? geo.toNonIndexed() : geo.clone(); geo.dispose();
      const transform = new THREE.Matrix4().compose(new THREE.Vector3(...at), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)), new THREE.Vector3(1, 1, 1));
      g.applyMatrix4(transform);
      const pos = g.attributes.position, uv = g.attributes.uv;
      const colors = new Float32Array(pos.count * 3); const base = new THREE.Color(color);
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        let grime = 0.92 + 0.08 * Math.sin(x * 43 + y * 28 + zombie.id);
        let red = 1, green = 1, blue = 1;
        if (sculptFace) {
          const front = Math.max(0, Math.min(1, -z / 0.08));
          const orbit = Math.exp(-Math.pow((y - 0.19) / 0.031, 2)) * Math.exp(-Math.pow((Math.abs(x) - 0.038) / 0.031, 2));
          const cheek = Math.exp(-Math.pow((y - 0.12) / 0.035, 2)) * Math.exp(-Math.pow((Math.abs(x) - 0.061) / 0.025, 2));
          grime *= 1 - front * (orbit * 0.32 + cheek * 0.17);
          const bruiseSide = zombie.id % 2 ? 1 : -1;
          const discolor = Math.exp(-Math.pow((x - bruiseSide * 0.055) / 0.038, 2) - Math.pow((y - 0.127) / 0.044, 2)) * front;
          red -= discolor * 0.04; green -= discolor * 0.19; blue -= discolor * 0.14;
        }
        if (target.group.name === 'chest' && color === shirt) {
          const side = zombie.id % 2 ? -1 : 1;
          const lowerGrime = Math.exp(-Math.pow((x - side * 0.095) / 0.12, 2) - Math.pow((y - 0.095) / 0.20, 2));
          const shoulderGrime = Math.exp(-Math.pow((x + side * 0.16) / 0.11, 2) - Math.pow((y - 0.41) / 0.10, 2));
          grime *= 1 - Math.max(0, -z / 0.13) * (lowerGrime * 0.28 + shoulderGrime * 0.2);
        }
        colors[i * 3] = base.r * grime * red; colors[i * 3 + 1] = base.g * grime * green; colors[i * 3 + 2] = base.b * grime * blue;
        uv.setXY(i, (skinSurface ? 0.53 : 0.025) + uv.getX(i) * 0.44, 0.04 + uv.getY(i) * 0.9);
      }
      g.setAttribute('color', new THREE.BufferAttribute(colors, 3)); target.parts.push(g);
    };
    const body = segment(group, 0, 0.94, 0);
    part(body, shaped([[-0.10, 0.165, 0.112], [-0.03, 0.18, 0.122], [0.08, 0.16, 0.111], [0.14, 0.15, 0.103]]), pants);
    part(body, softBox(0.35, 0.025, 0.24), '#38352e', false, [0, 0.08, 0]);
    part(body, softBox(0.04, 0.035, 0.015, 0.004), '#79766b', false, [0, 0.08, -0.126]);
    const chest = segment(body.group, 0, 0, 0); chest.group.name = 'chest';
    part(chest, frayed(shaped([[-0.03, 0.174, 0.123], [0.04, 0.18, 0.12], [0.16, 0.162, 0.109], [0.28, 0.187, 0.124], [0.39, 0.218, 0.127], [0.47, 0.23, 0.112], [0.51, 0.185, 0.102], [0.55, 0.065, 0.067]]), -0.03, zombie.id), shirt);
    // Placket, chest pockets and folded collar keep the outfit visibly clothing-shaped.
    part(chest, softBox(0.019, 0.43, 0.009, 0.003), '#3b3931', false, [0, 0.25, -0.123]);
    for (const side of [-1, 1]) {
      part(chest, softBox(0.082, 0.088, 0.009, 0.006), shirt, false, [side * 0.1, 0.32, -0.126]);
      part(chest, softBox(0.089, 0.014, 0.012, 0.003), '#4b4840', false, [side * 0.1, 0.367, -0.131]);
      const collarSag = side < 0 ? 0.018 : 0;
      part(chest, wedge([side * 0.025, 0.53, -0.083, side * 0.125, 0.48 - collarSag, -0.101, side * 0.065, 0.413 - collarSag, -0.135]), shirt);
      // Back-facing collar face (triangles use a single-sided material).
      part(chest, wedge([side * 0.065, 0.413 - collarSag, -0.135, side * 0.125, 0.48 - collarSag, -0.101, side * 0.025, 0.53, -0.083]), shirt);
    }
    for (let i = 0; i < 6; i++) part(chest, softBox(0.009, 0.01, 0.007, 0.002), '#a49a83', false, [0, 0.06 + i * 0.069, -0.132]);
    // A short abraded seam and narrow fabric split; small enough to avoid decal-like patches.
    part(chest, wedge([-0.145, 0.246, -0.12, -0.082, 0.214, -0.126, -0.113, 0.234, -0.129]), '#9b9079');
    part(chest, wedge([-0.113, 0.234, -0.129, -0.082, 0.214, -0.126, -0.145, 0.246, -0.12]), '#9b9079');
    part(chest, softBox(0.052, 0.006, 0.006, 0.002), '#34342e', false, [0.1, 0.385, -0.135], [0, 0, 0.16]);
    const head = segment(chest.group, 0, 0.56, -0.008);
    part(head, shaped([[-0.065, 0.048, 0.047], [0.018, 0.052, 0.051], [0.048, 0.049, 0.05]]), skin, true);
    part(head, shaped([[0.015, 0.044, 0.047, -0.015], [0.04, 0.067, 0.061, -0.016], [0.075, 0.079, 0.075, -0.008], [0.115, 0.088, 0.087], [0.16, 0.092, 0.094, 0.006], [0.2, 0.089, 0.094, 0.007], [0.245, 0.084, 0.088, 0.01], [0.283, 0.065, 0.074, 0.012], [0.302, 0.032, 0.047, 0.013], [0.31, 0.001, 0.001, 0.013]], 28, true), skin, true);
    // Small lid-shadowed eyes, sculpted nose bridge and closed, uneven lips. No glowing eyes.
    for (const side of [-1, 1]) {
      part(head, softBox(0.027, 0.01, 0.009, 0.004), '#615b4f', true, [side * 0.038, 0.19, -0.081]);
      part(head, softBox(0.016, 0.0055, 0.006, 0.002), '#a09d88', true, [side * 0.038, 0.188, -0.087]);
      part(head, softBox(0.006, 0.006, 0.003, 0.001), '#353833', true, [side * 0.038, 0.188, -0.091]);
      part(head, softBox(0.035, 0.012, 0.016, 0.006), skin, true, [side * 0.038, 0.203, -0.086], [0, 0, side * 0.11]);
      part(head, softBox(0.027, 0.004, 0.005, 0.002), hair, false, [side * 0.039, 0.211, -0.093], [0, 0, side * 0.1]);
      part(head, shaped([[0.117, 0.009, 0.012], [0.13, 0.015, 0.017], [0.17, 0.014, 0.018], [0.184, 0.006, 0.012]], 10), skin, true, [side * 0.093, 0, 0.002]);
    }
    part(head, shaped([[0.121, 0.015, 0.015, -0.101], [0.137, 0.017, 0.025, -0.108], [0.16, 0.012, 0.024, -0.106], [0.197, 0.009, 0.011, -0.087]], 12), skin, true);
    part(head, softBox(0.049, 0.005, 0.011, 0.002), '#675044', true, [0, 0.083, -0.087], [0, 0, 0.035]);
    part(head, softBox(0.045, 0.006, 0.009, 0.003), skin, true, [0, 0.076, -0.088]);
    if (zombie.id % 4 !== 3) {
      // A scalp following the skull, rather than a spherical helmet perched above it.
      const scalp = shaped([[0.207, 0.092, 0.098, 0.007], [0.248, 0.088, 0.094, 0.01], [0.286, 0.07, 0.079, 0.012], [0.307, 0.035, 0.051, 0.013], [0.315, 0.001, 0.001, 0.014]], 24);
      const hairline = scalp.attributes.position;
      for (let i = 0; i < 25; i++) {
        const a = i / 24 * Math.PI * 2;
        hairline.setY(i, 0.207 - Math.max(0, Math.cos(a)) * 0.045 + Math.max(0, -Math.cos(a)) * 0.025 + Math.sin(a * 5 + zombie.id) * 0.004);
      }
      scalp.computeVertexNormals(); part(head, scalp, hair);
    }
    const arms: THREE.Group[] = [], elbows: THREE.Group[] = [], wrists: THREE.Group[] = [];
    const legs: THREE.Group[] = [], knees: THREE.Group[] = [], ankles: THREE.Group[] = [];
    for (const side of [-1, 1]) {
      const arm = segment(chest.group, side * 0.224, 0.46, 0); arms.push(arm.group);
      part(arm, shaped([[0.025, 0.055, 0.065], [-0.025, 0.085, 0.087], [-0.12, 0.076, 0.078], [-0.23, 0.062, 0.064], [-0.31, 0.054, 0.055]]), shirt);
      const elbow = segment(arm.group, 0, -0.30, 0); elbows.push(elbow.group);
      part(elbow, shaped([[0.015, 0.054, 0.055], [-0.055, 0.06, 0.06], [-0.14, 0.049, 0.05], [-0.235, 0.036, 0.037], [-0.278, 0.033, 0.035]]), longSleeves ? shirt : skin, !longSleeves);
      if (longSleeves) part(elbow, frayed(shaped([[-0.237, 0.039, 0.039], [-0.266, 0.038, 0.038]]), -0.266, zombie.id + side), '#4a4941');
      const wrist = segment(elbow.group, 0, -0.275, 0); wrists.push(wrist.group);
      part(wrist, shaped([[0.005, 0.032, 0.029], [-0.035, 0.043, 0.028], [-0.084, 0.04, 0.024], [-0.104, 0.032, 0.021]]), skin, true);
      for (let finger = 0; finger < 4; finger++) {
        const x = (finger - 1.5) * 0.017;
        const length = finger === 3 ? 0.055 : 0.072 - Math.abs(finger - 1) * 0.005;
        part(wrist, shaped([[0, 0.009, 0.009], [-length * 0.55, 0.008, 0.009, -0.007], [-length, 0.006, 0.007, -0.02]], 8), skin, true, [x, -0.094, -0.002], [0, 0, (finger - 1.5) * 0.06]);
      }
      part(wrist, shaped([[0, 0.013, 0.013], [-0.034, 0.011, 0.012], [-0.057, 0.008, 0.009]], 8), skin, true, [-side * 0.039, -0.034, -0.007], [0.25, 0, -side * 0.52]);
      const hip = segment(body.group, side * 0.095, -0.02, 0); legs.push(hip.group);
      part(hip, shaped([[0.035, 0.09, 0.113], [-0.08, 0.098, 0.108], [-0.19, 0.086, 0.092], [-0.34, 0.068, 0.075], [-0.43, 0.061, 0.065]]), pants);
      part(hip, softBox(0.004, 0.14, 0.075, 0.002), '#292f32', false, [side * 0.094, -0.1, -0.015]);
      const knee = segment(hip.group, 0, -0.42, 0); knees.push(knee.group);
      part(knee, shaped([[0.018, 0.061, 0.065], [-0.052, 0.066, 0.073], [-0.15, 0.061, 0.069], [-0.27, 0.047, 0.052], [-0.385, 0.041, 0.044]]), pants);
      for (const y of [-0.045, -0.087]) part(knee, softBox(0.113, 0.008, 0.008, 0.003), '#41433e', false, [0, y, -0.065], [0, 0, side * 0.08]);
      const ankle = segment(knee.group, 0, -0.405, 0); ankles.push(ankle.group);
      part(ankle, softBox(0.125, 0.104, 0.264, 0.025), '#33342e', false, [0, -0.035, -0.065]);
      part(ankle, softBox(0.132, 0.026, 0.273, 0.009), '#202522', false, [0, -0.075, -0.065]);
      for (let lace = 0; lace < 4; lace++) part(ankle, softBox(0.067, 0.004, 0.005, 0.001), '#706b5a', false, [0, 0.019, -0.064 - lace * 0.017]);
    }
    for (const segment of segments) {
      if (!segment.parts.length) continue;
      const geo = mergeGeometries(segment.parts, false)!; geometries.push(geo);
      segment.parts.forEach(g => g.dispose());
      const mesh = new THREE.Mesh(geo, material); mesh.castShadow = mesh.receiveShadow = true;
      segment.group.add(mesh);
    }
    scene.add(group);
    return { group, hips: body.group, torso: chest.group, head: head.group, arms, elbows, wrists, legs, knees, ankles,
      material, geometries, rig: null, phase: zombie.id * 1.77, gait: 0, initialised: false, crawl: 0, stagger: 0, slump: zombie.dormant ? 1 : 0 };
  }
  // A body going down: the knees give first and the hips drop, then it topples, gathering speed,
  // and lands with a small bounce, limp, arms flung out and head turned aside. Most fall on their
  // face; some go over backwards. Near the end it sinks out of sight before it is removed.
  function collapse(view: ZombieView, id: number, since: number, left: number): void {
    const forward = id % 3 !== 0, side = id % 2 ? 1 : -1;
    const t = since / COLLAPSE_SECONDS;
    const stage = (from: number, to: number) => { const x = Math.max(0, Math.min(1, (t - from) / (to - from))); return x * x * (3 - 2 * x); };
    // Going over backwards, the knees only half give, and the legs end up straight.
    const buckle = stage(0, 0.35) * (forward ? 1 - 0.75 * stage(0.6, 1) : 0.4 * (1 - stage(0.5, 0.9)));
    const drop = Math.max(0, Math.min(1, (t - 0.15) / 0.85));
    const bounce = t > 1 && t < 1.35 ? Math.sin((t - 1) / 0.35 * Math.PI) * 0.07 : 0;
    const topple = drop * drop;
    const limp = stage(0.1, 0.9);
    view.group.rotation.x = (forward ? -1 : 1) * (Math.PI / 2 * topple - bounce);
    view.group.rotation.z = side * 0.18 * topple;
    view.group.position.y = 0.13 * topple - SINK_DEPTH * Math.max(0, 1 - left / SINK_SECONDS);
    view.hips.position.y = 0.94 - 0.36 * buckle;
    view.hips.rotation.y = view.hips.rotation.z = 0;
    view.torso.rotation.x = forward ? -0.13 - 0.45 * buckle : -0.13 + 0.25 * buckle;
    view.torso.rotation.y = side * 0.2 * limp;
    view.torso.rotation.z = 0;
    view.head.rotation.x = forward ? 0.35 * buckle * (1 - topple) : -0.3 * buckle;
    view.head.rotation.y = side * 1.0 * topple;
    view.head.rotation.z = side * 0.2 * limp;
    view.legs.forEach((leg, i) => {
      leg.rotation.x = 0.85 * buckle + (i === 0 ? 0.12 : -0.05) * topple;
      view.knees[i].rotation.x = -1.55 * buckle - (i === 0 ? 0.35 : 0.12) * topple;
      view.ankles[i].rotation.x = 0.45 * buckle;
    });
    view.arms.forEach((arm, i) => {
      const out = i === 0 ? -1 : 1;
      arm.rotation.x = (forward ? 0.5 : 0.25) * (1 - limp) + (forward ? 0.35 : -0.3) * topple + bounce * 2;
      arm.rotation.z = out * (0.08 + 0.85 * topple) + bounce * out * 1.5;
      view.elbows[i].rotation.x = 0.58 * (1 - limp) + (0.25 + 0.3 * i) * limp;
      view.wrists[i].rotation.x = -0.12 * (1 - limp) + 0.3 * limp;
    });
  }
  // What sets each kind apart on top of the walking pose: the runner's lean and arm pump, the brute's
  // wide swagger, the scream and the roar, the charge, a stagger or a trip, the crawl and the lunge.
  function applyKind(view: ZombieView, zombie: Zombie, tick: number, dt: number, attack: number, swing: number, walk: number, phase: number): void {
    const ticksPerSecond = config.ticksPerSecond;
    const dead = zombie.dead;
    // Eased states, so a change of state is a movement and not a jump.
    view.crawl += ((zombie.crawling && !dead ? 1 : 0) - view.crawl) * Math.min(1, dt * 6);
    const staggered = !dead && tick < zombie.staggerUntil ? 1 : 0;
    view.stagger += (staggered - view.stagger) * Math.min(1, dt * 10);
    const cryAge = zombie.cryTick >= 0 ? (tick - zombie.cryTick) / ticksPerSecond : 99;
    const cryLength = zombie.kind === 'screamer' ? config.zombie.screamSeconds : 0.7;
    const crying = !dead && (zombie.kind === 'screamer' || zombie.kind === 'brute') && cryAge < cryLength
      ? Math.min(1, Math.sin(cryAge / cryLength * Math.PI) * 2) : 0;
    const charging = !dead && zombie.kind === 'brute' && tick < zombie.chargeUntil;
    const out = (side: number) => (side === 0 ? -1 : 1);
    const blend = (current: number, to: number, amount: number) => current + (to - current) * amount;
    const alive = !dead;

    // What is wrong with each one. Every walker and screamer has something of its own: a hunch, a lolling
    // head, a dragging leg or a dead arm, and the odd spasm, so no two shamble alike.
    if (alive && (zombie.kind === 'walker' || zombie.kind === 'screamer') && view.crawl < 0.5) {
      const time = tick / ticksPerSecond;
      const trait = zombie.id % 7;
      const sign = zombie.id % 2 ? 1 : -1;
      view.head.rotation.x += 0.16 + 0.1 * Math.sin(time * 1.7 + zombie.id);
      if (trait === 1 || trait === 4) view.torso.rotation.x -= 0.26;
      if (trait === 0 || trait === 5) { view.head.rotation.z += sign * 0.36; view.torso.rotation.z += sign * 0.07; }
      if (trait === 2 || trait === 6) {
        const arm = zombie.id % 2;
        view.arms[arm].rotation.x = 0.04 + 0.14 * Math.sin(phase * 0.9);
        view.arms[arm].rotation.z = out(arm) * 0.1;
        view.elbows[arm].rotation.x = 0.1;
        view.wrists[arm].rotation.x = 0.25 * Math.sin(phase * 1.3);
      }
      if (trait === 3) {
        view.legs[1].rotation.x *= 0.3;
        view.knees[1].rotation.x = -0.05;
        view.ankles[1].rotation.x = -0.4;
        view.hips.rotation.z += sign * 0.08 * walk;
        view.hips.position.y -= 0.03;
      }
      // A spasm: the head snaps round and the shoulders jerk.
      const spasm = Math.max(0, Math.sin(time * 1.1 + zombie.id * 2.7) - 0.9) * 10;
      if (spasm > 0) {
        view.head.rotation.y += sign * spasm * 0.65;
        view.torso.rotation.z += sign * spasm * 0.12;
        view.arms.forEach((arm) => { arm.rotation.x += spasm * 0.3; });
      }
      // Standing, it still sways.
      if (walk < 0.25) {
        view.torso.rotation.z += Math.sin(time * 0.8 + zombie.id) * 0.05;
        view.hips.rotation.y += Math.sin(time * 0.6 + zombie.id * 2) * 0.05;
      }
    }

    if (alive && zombie.kind === 'runner') {
      view.torso.rotation.x -= 0.32 * (1 - view.crawl);
      view.head.rotation.x -= 0.14;
      const pump = Math.max(0.4, walk);
      view.arms.forEach((arm, side) => {
        const sign = side === 0 ? 1 : -1;
        arm.rotation.x = blend(0.15 + sign * swing * 0.95 * pump + attack * 0.9, arm.rotation.x, view.crawl);
        arm.rotation.z = blend(out(side) * -0.1, arm.rotation.z, view.crawl);
        view.elbows[side].rotation.x = blend(1.25 - sign * swing * 0.3 * pump, view.elbows[side].rotation.x, view.crawl);
      });
      view.legs[0].rotation.x *= 1.55; view.legs[1].rotation.x *= 1.55;
      view.knees[0].rotation.x *= 1.4; view.knees[1].rotation.x *= 1.4;
    }
    if (alive && zombie.kind === 'brute') {
      view.hips.rotation.z += swing * 0.07 * walk;
      view.hips.position.y += 0.03 * Math.abs(swing) * walk;
      view.torso.rotation.x += 0.1;
      view.arms.forEach((arm, side) => {
        arm.rotation.z = out(side) * (0.4 + 0.06 * Math.sin(phase * 0.9 + side)) + 0;
        arm.rotation.x = 0.5 + attack * 1.1;
        view.elbows[side].rotation.x = 0.35 - attack * 0.25;
      });
    }
    if (charging) {
      view.torso.rotation.x -= 0.4;
      view.head.rotation.x -= 0.15;
      view.arms.forEach((arm) => { arm.rotation.x = -0.5; });
    }
    if (crying > 0) {
      const brute = zombie.kind === 'brute';
      view.torso.rotation.x += crying * (brute ? 0.5 : 0.75);
      view.head.rotation.x += crying * (brute ? 0.55 : 0.95);
      view.hips.rotation.y += Math.sin(view.phase * 11) * 0.05 * crying;
      view.head.rotation.z += Math.sin(view.phase * 17) * 0.07 * crying;
      view.arms.forEach((arm, side) => {
        arm.rotation.z = blend(arm.rotation.z, out(side) * (brute ? 0.8 : 1.25), crying);
        arm.rotation.x = blend(arm.rotation.x, brute ? 0.3 : 0.05, crying);
        view.elbows[side].rotation.x = blend(view.elbows[side].rotation.x, 0.3, crying);
      });
    }
    if (view.stagger > 0.01) {
      view.torso.rotation.x += 0.45 * view.stagger;
      view.head.rotation.x += 0.4 * view.stagger;
      view.arms.forEach((arm, side) => {
        arm.rotation.z += out(side) * 0.55 * view.stagger;
        arm.rotation.x -= 0.5 * view.stagger;
      });
    }
    if (view.crawl > 0.01) {
      // Face down on the ground, dragging itself forward on its arms with its legs trailing.
      const crawl = view.crawl;
      view.group.rotation.x = -1.32 * crawl;
      view.group.position.y += 0.2 * crawl;
      view.head.rotation.x = blend(view.head.rotation.x, 1.05, crawl);
      view.arms.forEach((arm, side) => {
        const reach = Math.sin(view.phase * 1.3 + side * Math.PI);
        arm.rotation.x = blend(arm.rotation.x, 2.75 + reach * 0.55, crawl);
        arm.rotation.z = blend(arm.rotation.z, out(side) * 0.18, crawl);
        view.elbows[side].rotation.x = blend(view.elbows[side].rotation.x, 0.35 + Math.max(0, reach) * 0.5, crawl);
      });
      view.legs.forEach((leg, side) => {
        leg.rotation.x = blend(leg.rotation.x, 0.1 + 0.18 * Math.sin(view.phase * 1.3 + side * Math.PI + 1), crawl);
        view.knees[side].rotation.x = blend(view.knees[side].rotation.x, -0.15, crawl);
      });
    } else if (!dead) {
      view.group.rotation.x = 0;
    }
    // One of the floor's own dead, not yet woken: chin on its chest, shoulders rolled forward, arms
    // hanging and knees gone soft, swaying a little where it stands. Waking, it lifts its head.
    view.slump += ((zombie.dormant && !dead ? 1 : 0) - view.slump) * Math.min(1, dt * (zombie.dormant ? 2 : 5));
    if (view.slump > 0.01 && view.crawl < 0.5) {
      const slump = view.slump;
      const time = tick / ticksPerSecond;
      const breathe = Math.sin(time * 0.9 + zombie.id * 1.3);
      view.torso.rotation.x = blend(view.torso.rotation.x, -0.42 + breathe * 0.03, slump);
      view.torso.rotation.z = blend(view.torso.rotation.z, (zombie.id % 2 ? 0.08 : -0.08) + Math.sin(time * 0.35 + zombie.id) * 0.04, slump);
      view.head.rotation.x = blend(view.head.rotation.x, -0.8 + breathe * 0.04, slump);
      view.head.rotation.z = blend(view.head.rotation.z, zombie.id % 3 === 0 ? 0.3 : -0.12, slump);
      view.hips.rotation.y += Math.sin(time * 0.3 + zombie.id * 2) * 0.06 * slump;
      view.hips.position.y -= 0.05 * slump;
      view.arms.forEach((arm, side) => {
        arm.rotation.x = blend(arm.rotation.x, 0.08 + 0.04 * Math.sin(time * 0.5 + side + zombie.id), slump);
        arm.rotation.z = blend(arm.rotation.z, out(side) * 0.06, slump);
        view.elbows[side].rotation.x = blend(view.elbows[side].rotation.x, 0.18, slump);
        view.wrists[side].rotation.x = blend(view.wrists[side].rotation.x, 0.1, slump);
      });
      view.knees.forEach((knee) => { knee.rotation.x = blend(knee.rotation.x, -0.16, slump); });
    }
    // A swing carries the body forward, and a walker's lean goes with it.
    if (view.rig) view.rig.object.position.z = -0.24 * attack * (zombie.kind === 'brute' ? 1.4 : 1);
    if (attack > 0 && alive) view.torso.rotation.x -= attack * 0.28;
  }
  function dispose(view: ZombieView): void {
    scene.remove(view.group); view.material?.dispose(); view.geometries.forEach(g => g.dispose());
  }
  return {
    update(state, dt) {
      const live = new Set<number>();
      const smoothing = 1 - Math.exp(-dt * 24);
      for (const zombie of state.zombies) {
        live.add(zombie.id);
        let view = views.get(zombie.id);
        if (!view) { view = build(zombie); views.set(zombie.id, view); }
        if (!view.initialised) {
          view.group.position.set(zombie.x, 0, zombie.z); view.group.rotation.y = zombie.yaw; view.initialised = true;
        }
        const dx = zombie.x - view.group.position.x, dz = zombie.z - view.group.position.z;
        view.group.position.x += dx * smoothing; view.group.position.z += dz * smoothing;
        // On the garage ramp, and out on the street above it, the ground is higher.
        const base = surfaceHeight(state.level, view.group.position.x, view.group.position.z);
        view.group.position.y = base;
        const turn = Math.atan2(Math.sin(zombie.yaw - view.group.rotation.y), Math.cos(zombie.yaw - view.group.rotation.y));
        view.group.rotation.y += turn * (1 - Math.exp(-dt * 9));
        const speed = dt > 0 ? Math.hypot(dx, dz) * smoothing / dt : 0;
        // Held back by a cage or wall, it keeps shuffling and straining toward the player.
        const strain = zombie.pushing && !zombie.dead ? 1 : 0;
        const walking = Math.min(1, Math.max(speed / 1.4, strain * 0.6));
        view.gait += (walking - view.gait) * Math.min(1, dt * 7);
        // A shamble lurches: the stride speeds and drags in time with a limp rhythm of its own.
        const lurch = zombie.kind === 'runner' || zombie.kind === 'brute' ? 1 : 1 + 0.4 * Math.sin(state.tick / config.ticksPerSecond * 5.3 + zombie.id * 1.9);
        view.phase += Math.min(Math.max(speed, strain * 1.1), 3.5) * dt * 3.1 * lurch + dt * 0.18;
        const phase = view.phase, swing = Math.sin(phase), walk = view.gait;
        const limp = zombie.id % 3 === 0 ? 0.62 : 1;
        view.hips.position.y = 0.94 + Math.abs(Math.sin(phase)) * 0.019 * walk;
        view.hips.rotation.y = swing * 0.055 * walk;
        view.hips.rotation.z = swing * 0.025 * walk;
        view.torso.rotation.x = -0.13 - Math.sin(phase * 0.5) * 0.025;
        view.torso.rotation.y = -swing * 0.075 * walk;
        view.torso.rotation.z = Math.sin(phase * 0.5 + zombie.id) * 0.025;
        view.head.rotation.z = 0.065 * Math.sin(phase * 0.45 + zombie.id) + (zombie.id % 2 ? 0.065 : -0.055);
        view.head.rotation.x = -0.07 + Math.sin(phase * 0.6) * 0.025;
        view.legs[0].rotation.x = swing * 0.45 * walk * limp;
        view.legs[1].rotation.x = -swing * 0.45 * walk;
        view.knees[0].rotation.x = -Math.max(0, -swing) * 0.62 * walk - 0.03;
        view.knees[1].rotation.x = -Math.max(0, swing) * 0.62 * walk - 0.03;
        view.ankles[0].rotation.x = -view.legs[0].rotation.x * 0.4 - view.knees[0].rotation.x * 0.45;
        view.ankles[1].rotation.x = -view.legs[1].rotation.x * 0.4 - view.knees[1].rotation.x * 0.45;
        const attackAge = (state.tick - zombie.lastAttackTick) / config.ticksPerSecond;
        const attack = zombie.lastAttackTick >= 0 && attackAge < 0.55 ? Math.sin(attackAge / 0.55 * Math.PI) : 0;
        view.arms.forEach((arm, side) => {
          const asymmetry = side === 0 ? 1 : -1;
          // The skinned zombies reach further out in front, the arms of the drawn ones being shorter.
          arm.rotation.x = (view.rig ? 0.85 : 0.45) + 0.15 * Math.sin(phase * 0.7 + side) + attack * (view.rig ? 0.55 : 0.83) + strain * (0.2 + 0.18 * Math.sin(phase * 1.3 + side * 2));
          arm.rotation.z = asymmetry * (0.08 + Math.sin(phase * 0.5) * 0.025);
          view.elbows[side].rotation.x = 0.58 + Math.sin(phase * 0.8 + side) * 0.1 - attack * 0.38;
          view.wrists[side].rotation.x = -0.12 - attack * 0.15;
          view.wrists[side].rotation.z = asymmetry * 0.11;
        });
        applyKind(view, zombie, state.tick, dt, attack, swing, walk, phase);
        const hitAge = (state.tick - zombie.lastHitTick) / config.ticksPerSecond;
        const flinch = zombie.lastHitTick >= 0 && hitAge < 0.22 ? Math.sin(hitAge / 0.22 * Math.PI) : 0;
        view.torso.rotation.x += flinch * 0.2; view.head.rotation.x -= flinch * 0.18;
        if (view.material) view.material.emissiveIntensity = flinch * 0.025;
        if (zombie.dead) { view.group.rotation.x = 0; collapse(view, zombie.id, config.zombie.deathSeconds - zombie.deadLeft, zombie.deadLeft); view.group.position.y += base; }
        view.rig?.pose(view);
      }
      for (const [id, view] of views) if (!live.has(id)) { dispose(view); views.delete(id); }

      // Pools of blood under the dead.
      const now = state.tick / config.ticksPerSecond;
      for (const zombie of state.zombies) {
        if (!zombie.dead || pools.has(zombie.id)) continue;
        const material = new THREE.MeshStandardMaterial({ map: poolMap, transparent: true, roughness: 0.18, metalness: 0.05, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 });
        const mesh = new THREE.Mesh(poolGeometry, material);
        mesh.position.set(zombie.x, surfaceHeight(state.level, zombie.x, zombie.z) + 0.014, zombie.z);
        mesh.rotation.y = zombie.id * 1.3;
        mesh.receiveShadow = true;
        scene.add(mesh);
        pools.set(zombie.id, { mesh, born: now, level: state.level.name, size: 0.7 + 0.5 * config.zombie.kinds[zombie.kind].size * (zombie.kind === 'brute' ? 1.3 : 1) });
      }
      for (const [id, pool] of pools) {
        const age = now - pool.born;
        const grow = 1 - Math.exp(-age * 1.3);
        pool.mesh.scale.setScalar(pool.size * (0.15 + 0.95 * grow) * 2);
        const fade = Math.max(0, Math.min(1, (45 - age) / 8));
        (pool.mesh.material as THREE.MeshStandardMaterial).opacity = 0.85 * fade;
        pool.mesh.visible = pool.level === state.level.name && fade > 0;
        if (fade <= 0 || age < 0) { scene.remove(pool.mesh); (pool.mesh.material as THREE.Material).dispose(); pools.delete(id); }
      }
    },
  };
}
