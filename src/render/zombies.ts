import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { config } from '../config';
import type { GameState, Zombie } from '../game/state';
import { paintTexture } from './materials';
import { createJoints, riggedBody, whenZombieModelsLoad, zombieModelsReady, type RiggedBody } from './characterRig';

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

export function createZombieViews(scene: THREE.Scene): ZombieViews {
  const atlas = surfaceAtlas();
  const views = new Map<number, ZombieView>();
  // Once the skinned models arrive, the drawn zombies are rebuilt as models.
  whenZombieModelsLoad(() => {
    for (const [id, view] of views) { dispose(view); views.delete(id); }
  });
  // A skinned zombie: the same tree of joints as the drawn one, without its meshes, posing a model.
  function buildRigged(zombie: Zombie): ZombieView {
    const group = new THREE.Group(); group.name = `Infected ${zombie.id}`;
    group.rotation.order = 'YXZ';
    const joints = createJoints();
    const rig = riggedBody(zombie.id);
    group.add(rig.object);
    scene.add(group);
    return { group, ...joints, material: null, geometries: [], rig,
      phase: zombie.id * 1.77, gait: 0, initialised: false };
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
      material, geometries, rig: null, phase: zombie.id * 1.77, gait: 0, initialised: false };
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
        const turn = Math.atan2(Math.sin(zombie.yaw - view.group.rotation.y), Math.cos(zombie.yaw - view.group.rotation.y));
        view.group.rotation.y += turn * (1 - Math.exp(-dt * 9));
        const speed = dt > 0 ? Math.hypot(dx, dz) * smoothing / dt : 0;
        const walking = Math.min(1, speed / 1.4);
        view.gait += (walking - view.gait) * Math.min(1, dt * 7);
        view.phase += Math.min(speed, 3.5) * dt * 3.1 + dt * 0.18;
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
          arm.rotation.x = (view.rig ? 0.85 : 0.45) + 0.15 * Math.sin(phase * 0.7 + side) + attack * (view.rig ? 0.55 : 0.83);
          arm.rotation.z = asymmetry * (0.08 + Math.sin(phase * 0.5) * 0.025);
          view.elbows[side].rotation.x = 0.58 + Math.sin(phase * 0.8 + side) * 0.1 - attack * 0.38;
          view.wrists[side].rotation.x = -0.12 - attack * 0.15;
          view.wrists[side].rotation.z = asymmetry * 0.11;
        });
        const hitAge = (state.tick - zombie.lastHitTick) / config.ticksPerSecond;
        const flinch = zombie.lastHitTick >= 0 && hitAge < 0.22 ? Math.sin(hitAge / 0.22 * Math.PI) : 0;
        view.torso.rotation.x += flinch * 0.2; view.head.rotation.x -= flinch * 0.18;
        if (view.material) view.material.emissiveIntensity = flinch * 0.025;
        if (zombie.dead) collapse(view, zombie.id, config.zombie.deathSeconds - zombie.deadLeft, zombie.deadLeft);
        view.rig?.pose(view);
      }
      for (const [id, view] of views) if (!live.has(id)) { dispose(view); views.delete(id); }
    },
  };
}
