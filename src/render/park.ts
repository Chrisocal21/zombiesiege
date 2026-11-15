import * as THREE from 'three';
import type { Level, LevelBox } from '../levels/types';
import { blobs, paintTexture, seededRandom, specks } from './materials';
import { labelTexture } from './streetTextures';

// The park's own pieces (LevelBox.parkPiece): the lawn and the gravel paths with stone kerbs, a
// fountain plaza, park benches, stone planters, the groundskeeper's shed and the bandstand, plus flower
// beds along the hedges that are only drawn (they are low enough to walk through). The boxes stay
// solid exactly as the level has them; this only draws them.

type Mat = THREE.Material;

function lawnMaterial(w: number, d: number): THREE.MeshStandardMaterial {
  const map = paintTexture(512, 91, (context, size, random) => {
    context.fillStyle = '#3f5a2c';
    context.fillRect(0, 0, size, size);
    blobs(context, size, random, 120, 30, 90, '86,112,52', 0.35);
    blobs(context, size, random, 90, 20, 70, '34,52,24', 0.4);
    blobs(context, size, random, 30, 10, 30, '110,104,62', 0.25);
    // Blades of grass.
    for (let i = 0; i < 14000; i++) {
      const x = random() * size, y = random() * size, light = random() < 0.5;
      context.strokeStyle = light ? `rgba(150,180,90,${0.25 * random()})` : `rgba(20,34,14,${0.35 * random()})`;
      context.beginPath(); context.moveTo(x, y); context.lineTo(x + (random() - 0.5) * 3, y - 2 - random() * 4); context.stroke();
    }
  });
  map.repeat.set(w / 6, d / 6);
  return new THREE.MeshStandardMaterial({ map, roughness: 1 });
}

let gravelMap: THREE.CanvasTexture | null = null;
function gravelMaterial(w: number, d: number): THREE.MeshStandardMaterial {
  gravelMap ??= paintTexture(512, 57, (context, size, random) => {
    context.fillStyle = '#958c7c';
    context.fillRect(0, 0, size, size);
    blobs(context, size, random, 60, 20, 70, '120,110,96', 0.35);
    blobs(context, size, random, 40, 10, 40, '70,64,56', 0.3);
    // Stones.
    for (let i = 0; i < 9000; i++) {
      const r = 0.6 + random() * 2.2, shade = 110 + random() * 110;
      context.fillStyle = `rgba(${shade},${shade * 0.95},${shade * 0.86},${0.5 + random() * 0.4})`;
      context.beginPath(); context.ellipse(random() * size, random() * size, r, r * (0.6 + random() * 0.4), random() * 3, 0, Math.PI * 2); context.fill();
    }
    specks(context, size, random, 3000, 1, 0.15, 0.35);
  });
  const map = gravelMap.clone();
  map.needsUpdate = true;
  map.repeat.set(w / 3, d / 3);
  return new THREE.MeshStandardMaterial({ map, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
}

let stoneMap: THREE.CanvasTexture | null = null;
function stone(color = '#a8a296'): THREE.MeshStandardMaterial {
  stoneMap ??= paintTexture(256, 13, (context, size, random) => {
    context.fillStyle = '#c8c4bb';
    context.fillRect(0, 0, size, size);
    blobs(context, size, random, 70, 8, 40, '120,116,104', 0.3);
    blobs(context, size, random, 30, 6, 24, '70,80,60', 0.2);
    specks(context, size, random, 2500, 1.5, 0.2, 0.3);
  });
  return new THREE.MeshStandardMaterial({ map: stoneMap, color, roughness: 0.9 });
}

function planks(color: string, vertical: boolean, seed: number): THREE.MeshStandardMaterial {
  const map = paintTexture(256, seed, (context, size, random) => {
    context.fillStyle = color;
    context.fillRect(0, 0, size, size);
    blobs(context, size, random, 40, 6, 30, '30,22,14', 0.25);
    for (let i = 0; i < 1600; i++) {
      context.fillStyle = `rgba(20,14,8,${0.12 * random()})`;
      const a = random() * size, b = random() * size;
      if (vertical) context.fillRect(a, b, 1, 6 + random() * 30); else context.fillRect(b, a, 6 + random() * 30, 1);
    }
    context.fillStyle = 'rgba(12,8,4,0.6)';
    for (let k = 0; k < 8; k++) if (vertical) context.fillRect(k * size / 8, 0, 2, size); else context.fillRect(0, k * size / 8, size, 2);
  });
  return new THREE.MeshStandardMaterial({ map, roughness: 0.85 });
}

// A round stone edge on the ground: a tube round an ellipse with radii a (along `yaw`) and b, in world
// space about (x, z).
function ring(x: number, z: number, a: number, b: number, yaw: number, thickness: number): THREE.BufferGeometry {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  const points = Array.from({ length: 64 }, (_, i) => {
    const t = (i / 64) * Math.PI * 2;
    const u = Math.cos(t) * a, v = Math.sin(t) * b;
    return new THREE.Vector3(x + u * c - v * s, 0, z - u * s - v * c);
  });
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, true), 96, thickness, 5, true);
}

export function buildPark(parent: THREE.Object3D, level: Level): void {
  const pieces = level.boxes.filter((box) => box.parkPiece);
  if (!pieces.length) return;
  const group = new THREE.Group();
  group.name = 'Park';
  parent.add(group);
  const random = seededRandom(4471);

  const add = (geometry: THREE.BufferGeometry, material: Mat, x: number, y: number, z: number, into: THREE.Object3D = group, shadow = true) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;
    into.add(mesh);
    return mesh;
  };
  const box = (w: number, h: number, d: number, material: Mat, x: number, y: number, z: number, into?: THREE.Object3D) =>
    add(new THREE.BoxGeometry(w, h, d), material, x, y, z, into);
  const flat = (geometry: THREE.BufferGeometry, material: Mat, x: number, y: number, z: number) => {
    geometry.rotateX(-Math.PI / 2);
    return add(geometry, material, x, y, z, group, false);
  };

  const kerb = stone('#8f8a80');
  const iron = new THREE.MeshStandardMaterial({ color: 0x1d2420, roughness: 0.5, metalness: 0.7 });
  const wood = planks('#7a5534', false, 21);
  const soil = new THREE.MeshStandardMaterial({ color: 0x3a2a1e, roughness: 1 });
  const water = new THREE.MeshPhysicalMaterial({ color: 0x23383c, roughness: 0.06, metalness: 0.1, clearcoat: 1, transparent: true, opacity: 0.88 });

  const fountain = pieces.find((p) => p.parkPiece === 'fountain');
  const plazaRadius = 4.6;
  const inPlaza = (x: number, z: number) => fountain !== undefined && Math.hypot(x - fountain.position.x, z - fountain.position.z) < plazaRadius - 0.1;

  // ---- The lawn and the paths ----
  for (const lawn of pieces.filter((p) => p.parkPiece === 'lawn')) {
    flat(new THREE.PlaneGeometry(lawn.size.x, lawn.size.z), lawnMaterial(lawn.size.x, lawn.size.z), lawn.position.x, 0, lawn.position.z);
  }
  const paths = pieces.filter((p) => p.parkPiece === 'path');
  for (const path of paths) {
    flat(new THREE.PlaneGeometry(path.size.x, path.size.z), gravelMaterial(path.size.x, path.size.z), path.position.x, 0.004, path.position.z);
  }
  // Kerbs along both edges of each path, broken where another path or the plaza crosses it.
  const kerbGeometry = new THREE.BoxGeometry(1, 0.07, 0.12);
  const kerbs: THREE.Matrix4[] = [];
  for (const path of paths) {
    const alongX = path.size.x > path.size.z;
    const length = alongX ? path.size.x : path.size.z;
    const half = (alongX ? path.size.z : path.size.x) / 2;
    const start = (alongX ? path.position.x : path.position.z) - length / 2;
    for (const side of [-1, 1]) {
      let runStart: number | null = null;
      const close = (end: number) => {
        if (runStart !== null && end - runStart > 0.2) {
          const mid = (runStart + end) / 2, len = end - runStart;
          const at = alongX ? new THREE.Vector3(mid, 0.035, path.position.z + side * (half + 0.06)) : new THREE.Vector3(path.position.x + side * (half + 0.06), 0.035, mid);
          kerbs.push(new THREE.Matrix4().compose(at, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), alongX ? 0 : Math.PI / 2), new THREE.Vector3(len, 1, 1)));
        }
        runStart = null;
      };
      for (let s = start; s <= start + length + 0.001; s += 0.1) {
        const x = alongX ? s : path.position.x + side * (half + 0.06);
        const z = alongX ? path.position.z + side * (half + 0.06) : s;
        const crossed = inPlaza(x, z) || paths.some((other) => other !== path && Math.abs(x - other.position.x) < other.size.x / 2 + 0.12 && Math.abs(z - other.position.z) < other.size.z / 2 + 0.12);
        if (crossed) close(s); else runStart ??= s;
      }
      close(start + length);
    }
  }
  // (Its own material, so baking does not merge it with the other kerbs as a single mesh.)
  const kerbMesh = new THREE.InstancedMesh(kerbGeometry, kerb.clone(), kerbs.length);
  kerbs.forEach((m, i) => kerbMesh.setMatrixAt(i, m));
  kerbMesh.receiveShadow = true;
  group.add(kerbMesh);

  // ---- The fountain plaza ----
  if (fountain) {
    const { x, z } = fountain.position;
    flat(new THREE.CircleGeometry(plazaRadius, 48), gravelMaterial(plazaRadius * 2, plazaRadius * 2), x, 0.006, z);
    // A ring of paving round the basin and a kerb round the plaza.
    flat(new THREE.RingGeometry(1.5, 2.3, 48), stone('#9c978c'), x, 0.01, z);
    add(ring(x, z, plazaRadius + 0.06, plazaRadius + 0.06, 0, 0.05), kerb, 0, 0.03, 0, group, false);
    const basinStone = stone('#b4ada0');
    basinStone.side = THREE.DoubleSide;
    // The basin: a low round wall with a lip, water inside, a column and two tiers of bowls.
    add(new THREE.CylinderGeometry(1.5, 1.56, 0.5, 40, 1, true), basinStone, x, 0.25, z);
    add(new THREE.TorusGeometry(1.5, 0.09, 8, 48).rotateX(Math.PI / 2), basinStone, x, 0.52, z);
    add(new THREE.CircleGeometry(1.46, 40).rotateX(-Math.PI / 2), water, x, 0.38, z, group, false);
    add(new THREE.CylinderGeometry(0.2, 0.32, 1.3, 16), basinStone, x, 0.9, z);
    add(new THREE.CylinderGeometry(0.75, 0.2, 0.22, 24), basinStone, x, 1.45, z);
    add(new THREE.CircleGeometry(0.68, 24).rotateX(-Math.PI / 2), water, x, 1.555, z, group, false);
    add(new THREE.CylinderGeometry(0.1, 0.14, 0.5, 12), basinStone, x, 1.8, z);
    add(new THREE.CylinderGeometry(0.36, 0.1, 0.14, 18), basinStone, x, 2.1, z);
    add(new THREE.SphereGeometry(0.1, 12, 8), basinStone, x, 2.22, z);
  }

  // ---- Benches: cast iron ends, wooden slats for the seat and back ----
  for (const bench of pieces.filter((p) => p.parkPiece === 'bench')) {
    const g = new THREE.Group();
    g.position.set(bench.position.x, 0, bench.position.z);
    g.rotation.y = bench.facing ?? 0;
    group.add(g);
    const length = Math.max(bench.size.x, bench.size.z);
    for (const end of [-1, 1]) {
      const ex = end * (length / 2 - 0.12);
      box(0.06, 0.45, 0.06, iron, ex, 0.225, 0.2, g);
      box(0.06, 0.88, 0.06, iron, ex, 0.44, -0.22, g).rotation.x = -0.12;
      box(0.06, 0.05, 0.5, iron, ex, 0.43, -0.02, g);
      box(0.06, 0.05, 0.46, iron, ex, 0.62, 0.0, g);
      box(0.08, 0.04, 0.5, iron, ex, 0.02, 0, g);
    }
    for (let k = 0; k < 4; k++) box(length, 0.035, 0.085, wood, 0, 0.465, 0.2 - k * 0.11, g);
    for (let k = 0; k < 3; k++) box(length, 0.1, 0.03, wood, 0, 0.58 + k * 0.13, -0.27 - k * 0.016, g).rotation.x = -0.12;
    // A litter bin at one end of some benches.
    if (random() < 0.6) {
      const side = random() < 0.5 ? -1 : 1;
      add(new THREE.CylinderGeometry(0.2, 0.18, 0.7, 14), iron, side * (length / 2 + 0.3), 0.35, 0.05, g);
      add(new THREE.CylinderGeometry(0.21, 0.21, 0.05, 14), iron, side * (length / 2 + 0.3), 0.72, 0.05, g);
    }
  }

  // ---- Flowers ----
  const bloomGeometry = new THREE.IcosahedronGeometry(0.055, 0);
  const leafGeometry = new THREE.IcosahedronGeometry(0.16, 0);
  leafGeometry.scale(1, 0.55, 1);
  const blooms: { m: THREE.Matrix4; c: THREE.Color }[] = [];
  const leaves: THREE.Matrix4[] = [];
  const palette = ['#d8333f', '#f2c230', '#e9e4d8', '#9a5fc8', '#f07a2a', '#e6649a'].map((c) => new THREE.Color(c));
  const scratch = new THREE.Object3D();
  const plant = (x: number, z: number, base: number, colour: THREE.Color) => {
    scratch.position.set(x, base + 0.08, z); scratch.rotation.set(0, random() * 6.28, 0); scratch.scale.setScalar(0.7 + random() * 0.6);
    scratch.updateMatrix(); leaves.push(scratch.matrix.clone());
    const count = 3 + Math.floor(random() * 4);
    for (let i = 0; i < count; i++) {
      scratch.position.set(x + (random() - 0.5) * 0.24, base + 0.16 + random() * 0.14, z + (random() - 0.5) * 0.24);
      scratch.scale.setScalar(0.7 + random() * 0.6); scratch.updateMatrix();
      blooms.push({ m: scratch.matrix.clone(), c: colour.clone().offsetHSL(0, 0, (random() - 0.5) * 0.12) });
    }
  };
  // A bed: an oval of soil edged with stone, planted in bands of one colour.
  const bed = (x: number, z: number, length: number, width: number, yaw: number) => {
    const geometry = new THREE.CircleGeometry(0.5, 32);
    geometry.scale(length, width, 1);
    geometry.rotateZ(yaw);
    flat(geometry, soil, x, 0.012, z);
    add(ring(x, z, length / 2, width / 2, yaw, 0.05), kerb, 0, 0.03, 0, group, false);
    const c = Math.cos(yaw), s = Math.sin(yaw);
    let band = palette[Math.floor(random() * palette.length)];
    for (let u = -length / 2 + 0.25; u < length / 2 - 0.2; u += 0.3) {
      if (random() < 0.18) band = palette[Math.floor(random() * palette.length)];
      for (let v = -width / 2 + 0.22; v < width / 2 - 0.15; v += 0.3) {
        if ((u / (length / 2)) ** 2 + (v / (width / 2)) ** 2 > 0.7) continue;
        const a = u + (random() - 0.5) * 0.1, b = v + (random() - 0.5) * 0.1;
        plant(x + a * c - b * s, z - a * s - b * c, 0, band);
      }
    }
  };
  // Along the inside of the hedges, clear of the gates, and round the plaza.
  for (const [x, z, l, w, yaw] of [
    [-4, -16.6, 6, 1.3, 0], [5, -16.6, 6, 1.3, 0], [19.5, -16.6, 6, 1.3, 0], [-17, -16.6, 3.5, 1.2, 0],
    [-16, 16.6, 7, 1.3, 0], [4, 16.6, 7, 1.3, 0], [20.5, 16.6, 5, 1.3, 0],
    [24.6, 4.5, 6, 1.3, Math.PI / 2], [24.6, -14, 4, 1.2, Math.PI / 2],
  ] as const) bed(x, z, l, w, yaw);
  if (fountain) {
    for (const angle of [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4]) {
      bed(fountain.position.x + Math.cos(angle) * 3.4, fountain.position.z + Math.sin(angle) * 3.4, 1.8, 1.1, -angle + Math.PI / 2);
    }
  }

  // ---- Stone planters with a clipped shrub and flowers ----
  for (const p of pieces.filter((p) => p.parkPiece === 'planter')) {
    const { x, z } = p.position;
    const h = p.size.y, w = p.size.x;
    const planter = stone('#aaa395');
    box(w, h - 0.1, w, planter, x, (h - 0.1) / 2, z);
    box(w + 0.12, 0.1, w + 0.12, planter, x, h - 0.05, z);
    box(w - 0.16, 0.02, w - 0.16, soil, x, h + 0.005, z);
    const shrub = add(new THREE.IcosahedronGeometry(0.5, 1), new THREE.MeshStandardMaterial({ color: 0x2c4a24, roughness: 0.95, flatShading: true }), x, h + 0.38, z);
    shrub.scale.set(1, 0.85, 1);
    const colour = palette[Math.floor(random() * palette.length)];
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      plant(x + Math.cos(a) * (w / 2 - 0.2), z + Math.sin(a) * (w / 2 - 0.2), h - 0.05, colour);
    }
  }

  const bloomMesh = new THREE.InstancedMesh(bloomGeometry, new THREE.MeshStandardMaterial({ roughness: 0.7 }), blooms.length);
  blooms.forEach((b, i) => { bloomMesh.setMatrixAt(i, b.m); bloomMesh.setColorAt(i, b.c); });
  const leafMesh = new THREE.InstancedMesh(leafGeometry, new THREE.MeshStandardMaterial({ color: 0x2f5226, roughness: 0.9, flatShading: true }), leaves.length);
  leaves.forEach((m, i) => leafMesh.setMatrixAt(i, m));
  group.add(bloomMesh, leafMesh);

  // ---- The groundskeeper's shed: plank walls, a felt roof, a door and a window ----
  for (const shed of pieces.filter((p) => p.parkPiece === 'shed')) buildShed(group, shed, box, add);

  // ---- The bandstand ----
  for (const stand of pieces.filter((p) => p.parkPiece === 'bandstand')) {
    const { x, z } = stand.position;
    const s = stand.size.x, h = stand.size.y;
    const white = new THREE.MeshStandardMaterial({ color: 0xe8e2d4, roughness: 0.6 });
    const deck = planks('#8a6440', false, 33);
    (deck.map as THREE.Texture).repeat.set(2, 2);
    // A stone plinth with a lattice skirt, a timber deck, two steps on the west side.
    const base = stone('#9e988c');
    box(s, h - 0.08, s, base, x, (h - 0.08) / 2, z);
    box(s + 0.1, 0.08, s + 0.1, deck, x, h - 0.04, z);
    const lattice = new THREE.MeshStandardMaterial({ color: 0xd8d0c0, roughness: 0.7 });
    for (const side of [-1, 1]) {
      for (let k = -s / 2 + 0.3; k < s / 2 - 0.2; k += 0.6) {
        box(0.4, 0.4, 0.02, lattice, x + k + 0.2, h * 0.45, z + side * (s / 2 + 0.01));
        box(0.02, 0.4, 0.4, lattice, x + side * (s / 2 + 0.01), h * 0.45, z + k + 0.2);
      }
    }
    for (const [step, height] of [[0.2, 0.6], [0.6, 0.3]] as const) box(0.4, height, 2, base, x - s / 2 - step, height / 2, z);
    // Posts, a rail round three sides, and a pitched roof.
    const top = h + 3.1;
    for (const [sx, sz] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
      const px = x + sx * (s / 2 - 0.2), pz = z + sz * (s / 2 - 0.2);
      add(new THREE.CylinderGeometry(0.09, 0.1, 3.1, 12), white, px, h + 1.55, pz);
      add(new THREE.CylinderGeometry(0.16, 0.16, 0.16, 12), white, px, h + 0.08, pz);
    }
    const rail = (ax: number, az: number, bx: number, bz: number) => {
      const len = Math.hypot(bx - ax, bz - az);
      const r = box(len, 0.06, 0.06, white, (ax + bx) / 2, h + 0.9, (az + bz) / 2);
      r.rotation.y = -Math.atan2(bz - az, bx - ax);
      for (let t = 0.1; t < 1; t += 0.1) box(0.03, 0.85, 0.03, white, ax + (bx - ax) * t, h + 0.45, az + (bz - az) * t);
    };
    const e = s / 2 - 0.2;
    rail(x - e, z - e, x + e, z - e);
    rail(x - e, z + e, x + e, z + e);
    rail(x + e, z - e, x + e, z + e);
    const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3a34, roughness: 0.75, side: THREE.DoubleSide });
    box(s + 0.6, 0.18, s + 0.6, white, x, top + 0.09, z);
    const roof = add(new THREE.ConeGeometry((s + 0.9) * Math.SQRT1_2, 1.4, 4, 1), roofMaterial, x, top + 0.88, z);
    roof.rotation.y = Math.PI / 4;
    add(new THREE.SphereGeometry(0.14, 12, 8), white, x, top + 1.65, z);
  }

  group.updateMatrixWorld(true);
}

function buildShed(
  group: THREE.Group,
  shed: LevelBox,
  box: (w: number, h: number, d: number, material: Mat, x: number, y: number, z: number, into?: THREE.Object3D) => THREE.Mesh,
  add: (geometry: THREE.BufferGeometry, material: Mat, x: number, y: number, z: number, into?: THREE.Object3D, shadow?: boolean) => THREE.Mesh,
): void {
  const { x, z } = shed.position;
  const w = shed.size.x, d = shed.size.z, h = shed.size.y;
  const walls = planks('#6e5a44', true, 47);
  (walls.map as THREE.Texture).repeat.set(2, 1);
  const trim = new THREE.MeshStandardMaterial({ color: 0x2f3a2c, roughness: 0.7 });
  box(w, h, d, walls, x, h / 2, z);
  // Corner boards and a skirting board.
  for (const [sx, sz] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) box(0.12, h, 0.12, trim, x + sx * (w / 2), h / 2, z + sz * (d / 2));
  box(w + 0.04, 0.16, d + 0.04, trim, x, 0.08, z);
  // A gable roof along x, the ridge 1.5 m above the walls, with the eaves out over them.
  const felt = new THREE.MeshStandardMaterial({ color: 0x2a2a2c, roughness: 0.95 });
  const rise = 1.5, half = d / 2 + 0.3;
  const slope = Math.hypot(half, rise);
  for (const side of [-1, 1]) {
    const pane = box(w + 0.5, 0.08, slope, felt, x, h + rise / 2, z + side * half / 2);
    pane.rotation.x = side * Math.atan2(rise, half);
  }
  // The gable ends.
  const gable = new THREE.Shape([new THREE.Vector2(-d / 2, 0), new THREE.Vector2(d / 2, 0), new THREE.Vector2(0, rise * (d / 2) / half)]);
  for (const side of [-1, 1]) {
    const end = add(new THREE.ShapeGeometry(gable), walls, x + side * (w / 2 + 0.001), h, z);
    end.rotation.y = side * Math.PI / 2;
    (end.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  }
  // The door on the south side, a window beside it, and a sign over the door.
  const door = planks('#3d4a36', true, 52);
  box(1.1, 2.1, 0.06, door, x - 1.2, 1.05, z + d / 2 + 0.03);
  box(0.06, 0.06, 0.06, new THREE.MeshStandardMaterial({ color: 0xb08a3a, metalness: 0.8, roughness: 0.4 }), x - 0.78, 1.05, z + d / 2 + 0.08);
  box(1.0, 0.7, 0.04, new THREE.MeshStandardMaterial({ color: 0x1a2228, roughness: 0.1, metalness: 0.4 }), x + 0.9, 1.6, z + d / 2 + 0.02);
  for (const dy of [-0.38, 0.38]) box(1.14, 0.07, 0.08, trim, x + 0.9, 1.6 + dy, z + d / 2 + 0.04);
  for (const dx of [-0.53, 0, 0.53]) box(0.06, 0.8, 0.08, trim, x + 0.9 + dx, 1.6, z + d / 2 + 0.04);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.36), new THREE.MeshStandardMaterial({
    map: labelTexture([{ text: 'GROUNDS STAFF', size: 70, color: '#e8e4d0' }], '#2f3a2c', 768, 200), roughness: 0.7,
  }));
  sign.position.set(x - 1.2, 2.45, z + d / 2 + 0.035);
  group.add(sign);
  // A rake leaning against the wall.
  const rake = box(0.03, 1.6, 0.03, walls, x - 2.1, 0.8, z + d / 2 + 0.08);
  rake.rotation.z = 0.12;
}
