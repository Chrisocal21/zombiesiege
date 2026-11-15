import * as THREE from 'three';
import type { Level, LevelBox } from '../levels/types';
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

// What can be left on top of each kind of furniture, smallest first.
const ON_TOP: Partial<Record<NonNullable<LevelBox['prop']>, string[]>> = {
  counter: ['med-items', 'medkit', 'box', 'box-open', 'medkit-open'],
  desk: ['box', 'med-items', 'box-flat'],
  shelf: ['box', 'box-open', 'box', 'box-flat'],
  cart: ['medkit-open', 'med-items', 'medkit'],
  lab: ['med-items', 'box'],
  supply: ['box-open', 'medkit', 'box'],
  cabinet: ['box', 'med-items'],
};
// How big each small thing is drawn (the files are true to size, and a first aid bag reads better a
// little larger than life at play distance).
const SCALE: Record<string, number> = { medkit: 1.4, 'medkit-open': 1.4, 'med-items': 1.6, box: 1, 'box-open': 0.8, 'box-flat': 0.7 };

export function dressFurniture(scene: THREE.Object3D, level: Level): void {
  const group = new THREE.Group();
  group.name = 'Clutter';
  scene.add(group);
  const random = seededRandom(level.name.length * 131 + level.boxes.length);
  level.boxes.forEach((box) => {
    const kinds = box.prop ? ON_TOP[box.prop] : undefined;
    if (!kinds || box.hidden) return;
    // Not everything has something on it.
    if (random() < 0.35) return;
    const top = box.position.y + box.size.y / 2;
    const long = Math.max(box.size.x, box.size.z);
    const count = Math.min(3, 1 + Math.floor(random() * long / 1.4));
    for (let i = 0; i < count; i++) {
      const file = kinds[Math.floor(random() * kinds.length)];
      const along = (random() - 0.5) * (long - 0.5);
      const across = (random() - 0.5) * 0.15;
      const x = box.position.x + (box.size.x >= box.size.z ? along : across);
      const z = box.position.z + (box.size.x >= box.size.z ? across : along);
      const yaw = random() * 6.28;
      void unit(file).then(({ template }) => {
        const copy = place(group, template, x, top + 0.002, z, SCALE[file] ?? 1, yaw);
        copy.traverse((child) => { if (child instanceof THREE.Mesh) child.castShadow = false; });
      });
    }
  });
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
