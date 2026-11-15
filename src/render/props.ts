import * as THREE from 'three';
import type { Level, LevelBox } from '../levels/types';
import { furnitureSpots, type FreeSpot } from './furniture';
import { placeModel } from './models';
import { seededRandom } from './materials';

// Cargo and clutter from the model packs: barrels, pallets of cartons and stacks of crates filling the
// boxes the levels mark as such, and small things left on counters, desks, shelves and carts. All of it
// is only seen; what is walked into is still the level's boxes. Models appear once their files load.

interface Unit { file: string; size: THREE.Vector3 }
const units = new Map<string, Promise<{ template: THREE.Object3D; size: THREE.Vector3 }>>();

function unit(file: string): Promise<{ template: THREE.Object3D; size: THREE.Vector3 }> {
  let entry = units.get(file);
  if (!entry) {
    entry = placeModel(`/models/props/${file}.glb`).then((template) => {
      template.traverse((child) => { if (child instanceof THREE.Mesh) { child.castShadow = true; child.receiveShadow = true; } });
      const size = new THREE.Box3().setFromObject(template).getSize(new THREE.Vector3());
      return { template, size };
    });
    units.set(file, entry);
  }
  return entry;
}

function place(parent: THREE.Object3D, template: THREE.Object3D, x: number, y: number, z: number, scale: THREE.Vector3 | number, yaw = 0): THREE.Object3D {
  const copy = template.clone(true);
  copy.position.set(x, y, z);
  if (typeof scale === 'number') copy.scale.setScalar(scale);
  else copy.scale.copy(scale);
  copy.rotation.y = yaw;
  parent.add(copy);
  return copy;
}

// Fills a box with copies of one model in a grid, each a little turned and shifted so it looks stacked
// by hand. The copies are stretched a touch to fill the box exactly.
async function grid(parent: THREE.Object3D, box: LevelBox, file: string, base: number, random: () => number, gapRatio = 0.04): Promise<void> {
  const { template, size } = await unit(file);
  const w = box.size.x, h = box.size.y - base, d = box.size.z;
  // Long side of the model along the box's long side.
  const turn = (w > d) !== (size.x > size.z);
  const ux = turn ? size.z : size.x, uz = turn ? size.x : size.z;
  const nx = Math.max(1, Math.round(w / ux)), nz = Math.max(1, Math.round(d / uz)), ny = Math.max(1, Math.round(h / size.y));
  const sx = w / (nx * ux), sz = d / (nz * uz), sy = h / (ny * size.y);
  const scale = turn ? new THREE.Vector3(sz, sy, sx) : new THREE.Vector3(sx, sy, sz);
  scale.multiplyScalar(1 - gapRatio);
  for (let iy = 0; iy < ny; iy++) {
    for (let ix = 0; ix < nx; ix++) {
      for (let iz = 0; iz < nz; iz++) {
        // The odd one missing from the top layer.
        if (iy === ny - 1 && ny > 1 && random() < 0.2) continue;
        const x = -w / 2 + (ix + 0.5) * (w / nx) + (random() - 0.5) * 0.04;
        const z = -d / 2 + (iz + 0.5) * (d / nz) + (random() - 0.5) * 0.04;
        place(parent, template, x, base + iy * (h / ny), z, scale, (turn ? Math.PI / 2 : 0) + (random() - 0.5) * 0.08 + (random() < 0.5 ? Math.PI : 0));
      }
    }
  }
}

// A barrel, a pallet of cartons, or a stack of crates, in place of the drawn box.
export function buildPropStack(box: LevelBox, index: number): THREE.Group {
  const group = new THREE.Group();
  group.position.set(box.position.x, box.position.y - box.size.y / 2, box.position.z);
  const random = seededRandom(index * 977 + Math.round(box.position.x * 31 + box.position.z * 17));
  const surface = box.surface;
  if (surface === 'barrel') {
    const file = ['barrel', 'barrel-dent', 'barrel-black', 'drum'][Math.floor(random() * 4)];
    void unit(file).then(({ template, size }) => {
      place(group, template, 0, 0, 0, new THREE.Vector3(box.size.x / size.x, box.size.y / size.y, box.size.z / size.z), random() * 6.28);
    });
  } else if (surface === 'cartons') {
    void unit('pallet').then(async ({ template, size }) => {
      const turn = (box.size.x > box.size.z) !== (size.x > size.z);
      place(group, template, 0, 0, 0, turn ? new THREE.Vector3(box.size.z / size.x, 1, box.size.x / size.z) : new THREE.Vector3(box.size.x / size.x, 1, box.size.z / size.z), turn ? Math.PI / 2 : 0);
      await grid(group, box, random() < 0.5 ? 'carton' : 'box-pile', size.y, random, 0.03);
    });
  } else {
    // Crates: big military ones are stacks of wooden crates; small ones a crate or two.
    void grid(group, box, box.size.y > 1.5 ? 'crate' : random() < 0.5 ? 'crate' : 'crate-small', 0, random);
  }
  return group;
}

// A tree standing on a trunk box: one of the two tree models, grown to about eight metres.
export function buildTree(box: LevelBox, index: number): THREE.Group {
  const group = new THREE.Group();
  group.position.set(box.position.x, box.position.y - box.size.y / 2, box.position.z);
  const random = seededRandom(index * 389 + 7);
  void placeModel(`/models/plants/tree-${random() < 0.5 ? 'a' : 'b'}.glb`).then((model) => {
    model.scale.setScalar(1.6 + random() * 0.4);
    model.rotation.y = random() * 6.28;
    model.traverse((child) => { if (child instanceof THREE.Mesh) { child.castShadow = true; child.receiveShadow = true; } });
    group.add(model);
  });
  return group;
}

// ---- Clutter on furniture -----------------------------------------------------------------------

// What can be left on top of each kind of furniture, smallest first. 'loose' is a little spill of
// single medical items (see below) rather than one model.
const ON_TOP: Partial<Record<NonNullable<LevelBox['prop']>, string[]>> = {
  counter: ['loose', 'medkit', 'loose', 'box-open', 'medkit-open'],
  desk: ['box', 'loose', 'box-flat'],
  shelf: ['box', 'box-open', 'box', 'box-flat'],
  cart: ['medkit-open', 'loose', 'medkit'],
  lab: ['loose', 'box'],
  supply: ['box-open', 'medkit', 'loose'],
  cabinet: ['box', 'loose'],
};
// Above this, a box on top of tall shelving reaches the signs and the ceiling.
const HIGHEST_TOP = 1.9;
// How big each small thing is drawn (the files are true to size, and a first aid bag reads better a
// little larger than life at play distance).
const SCALE: Record<string, number> = { medkit: 1.4, 'medkit-open': 1.4, 'med-items': 1.6, box: 1, 'box-open': 0.8, 'box-flat': 0.7 };

export function dressFurniture(scene: THREE.Object3D, level: Level): void {
  const group = new THREE.Group();
  group.name = 'Clutter';
  scene.add(group);
  const random = seededRandom(level.name.length * 131 + level.boxes.length);
  const stock: Placed[] = [];
  level.boxes.forEach((box) => {
    if (box.hidden) return;
    for (const spot of furnitureSpots(box)) stock.push(...stockSpot(spot, random));
    const kinds = box.prop ? ON_TOP[box.prop] : undefined;
    if (!kinds) return;
    // Not everything has something on it.
    if (random() < 0.35) return;
    const top = box.position.y + box.size.y / 2;
    if (top > HIGHEST_TOP) return;
    const long = Math.max(box.size.x, box.size.z);
    const count = Math.min(3, 1 + Math.floor(random() * long / 1.4));
    for (let i = 0; i < count; i++) {
      const file = kinds[Math.floor(random() * kinds.length)];
      const along = (random() - 0.5) * (long - 0.5);
      const across = (random() - 0.5) * 0.15;
      const x = box.position.x + (box.size.x >= box.size.z ? along : across);
      const z = box.position.z + (box.size.x >= box.size.z ? across : along);
      const yaw = random() * 6.28;
      if (file === 'loose') {
        stock.push(...spill(x, top + 0.002, z, random));
        continue;
      }
      void unit(file).then(({ template }) => {
        const copy = place(group, template, x, top + 0.002, z, SCALE[file] ?? 1, yaw);
        copy.traverse((child) => { if (child instanceof THREE.Mesh) child.castShadow = false; });
      });
    }
  });
  void looseStock(group, stock);
}

// ---- Loose medical stock ------------------------------------------------------------------------
// Single items from the first aid pack (public/models/props/med-loose.glb, one node each, every one
// standing on the ground at the origin): rows of bottles, rolls and packs on pharmacy shelves where
// boxes were taken, and a few things spilled on counters, desks and carts. Each kind is drawn as one
// instanced mesh however many there are.

// Width, height and depth in metres as the pack has them; `lie` ones are laid on their backs, and
// `shelf` ones are what a pharmacy stocks in rows.
interface Loose { size: [number, number, number]; lie?: boolean; shelf?: boolean }
const LOOSE: Record<string, Loose> = {
  antiseptic: { size: [0.06, 0.12, 0.06], shelf: true },
  sanitizer: { size: [0.05, 0.12, 0.05], shelf: true },
  bandage: { size: [0.04, 0.06, 0.04], shelf: true },
  gauze: { size: [0.03, 0.06, 0.03], shelf: true },
  tape: { size: [0.05, 0.05, 0.02], shelf: true },
  coldpack: { size: [0.08, 0.12, 0.02], shelf: true },
  dressing: { size: [0.07, 0.09, 0.03], shelf: true },
  drops: { size: [0.02, 0.05, 0.02], shelf: true },
  ointment: { size: [0.12, 0.03, 0.02], shelf: true },
  tube: { size: [0.11, 0.03, 0.02], shelf: true },
  pills: { size: [0.05, 0.03, 0.01], lie: true, shelf: true },
  glove: { size: [0.08, 0.10, 0.04], lie: true },
  wipes: { size: [0.08, 0.04, 0.01], lie: true },
  scissors: { size: [0.05, 0.11, 0.01], lie: true },
  tweezers: { size: [0.08, 0.01, 0.01], lie: true },
  plaster: { size: [0.04, 0.01, 0.01], lie: true },
};
// A touch larger than life so they read at play distance.
const LOOSE_SCALE = 1.25;
interface Placed { kind: string; x: number; y: number; z: number; yaw: number }

// Room taken along a shelf, upward and back once placed.
function footprint(kind: string): { along: number; up: number; deep: number } {
  const [w, h, d] = LOOSE[kind].size;
  return LOOSE[kind].lie
    ? { along: w * LOOSE_SCALE, up: d * LOOSE_SCALE, deep: h * LOOSE_SCALE }
    : { along: w * LOOSE_SCALE, up: h * LOOSE_SCALE, deep: d * LOOSE_SCALE };
}

// A gap on a shelf restocked with a row or two of one kind, as a pharmacy shelves them, a few missing.
function stockSpot(spot: FreeSpot, random: () => number): Placed[] {
  const kinds = Object.keys(LOOSE).filter((k) => LOOSE[k].shelf && footprint(k).up < spot.height - 0.02);
  if (!kinds.length || spot.width < 0.06) return [];
  const kind = kinds[Math.floor(random() * kinds.length)];
  const size = footprint(kind);
  const step = size.along + 0.008;
  const count = Math.max(1, Math.floor(spot.width / step));
  const rows = Math.max(1, Math.min(3, Math.floor(spot.depth / (size.deep + 0.01))));
  const cos = Math.cos(spot.yaw), sin = Math.sin(spot.yaw);
  const out: Placed[] = [];
  for (let r = 0; r < rows; r++) {
    for (let i = 0; i < count; i++) {
      if (random() < 0.12) continue;
      const u = -(count * step) / 2 + step * (i + 0.5);
      // The front row at the front of the room, the others behind it.
      const v = spot.depth / 2 - (size.deep + 0.01) * (r + 0.5);
      out.push({ kind, x: spot.x + u * cos + v * sin, y: spot.y, z: spot.z - u * sin + v * cos, yaw: spot.yaw + (random() - 0.5) * 0.15 });
    }
  }
  return out;
}

// A few odd items dropped together on a worktop.
function spill(x: number, y: number, z: number, random: () => number): Placed[] {
  const kinds = Object.keys(LOOSE);
  const out: Placed[] = [];
  const count = 2 + Math.floor(random() * 3);
  for (let i = 0; i < count; i++) {
    out.push({ kind: kinds[Math.floor(random() * kinds.length)], x: x + (random() - 0.5) * 0.35, y, z: z + (random() - 0.5) * 0.2, yaw: random() * 6.28 });
  }
  return out;
}

async function looseStock(parent: THREE.Object3D, placed: Placed[]): Promise<void> {
  if (!placed.length) return;
  const { template } = await unit('med-loose');
  template.updateMatrixWorld(true);
  const sources = new Map<string, THREE.Mesh>();
  template.traverse((child) => { if (child instanceof THREE.Mesh && child.name.startsWith('med_')) sources.set(child.name.slice(4), child); });
  const byKind = new Map<string, Placed[]>();
  for (const item of placed) byKind.set(item.kind, [...(byKind.get(item.kind) ?? []), item]);
  const matrix = new THREE.Matrix4(), turn = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  const scale = new THREE.Vector3().setScalar(LOOSE_SCALE), at = new THREE.Vector3();
  for (const [kind, items] of byKind) {
    const source = sources.get(kind);
    if (!source) continue;
    const geometry = source.geometry.clone().applyMatrix4(source.matrixWorld);
    if (LOOSE[kind].lie) {
      geometry.rotateX(-Math.PI / 2);
      geometry.computeBoundingBox();
      geometry.translate(0, -geometry.boundingBox!.min.y, 0);
    }
    const mesh = new THREE.InstancedMesh(geometry, source.material, items.length);
    items.forEach((item, i) => {
      matrix.compose(at.set(item.x, item.y, item.z), turn.setFromAxisAngle(up, item.yaw), scale);
      mesh.setMatrixAt(i, matrix);
    });
    mesh.receiveShadow = true;
    mesh.name = `Loose ${kind}`;
    parent.add(mesh);
  }
}

// The first aid kit lying where it can be picked up.
export function medkitModel(): THREE.Group {
  const holder = new THREE.Group();
  void unit('medkit').then(({ template }) => {
    const copy = place(holder, template, 0, -0.07, 0, 1.3);
    copy.rotation.x = 0;
  });
  return holder;
}

export type { Unit };
