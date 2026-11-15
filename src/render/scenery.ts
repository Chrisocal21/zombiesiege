import * as THREE from 'three';
import type { Backdrop, Level, LevelBox } from '../levels/types';
import { placeModel } from './models';
import { blobs, paintTexture, seededRandom, specks, surfaceMaterial } from './materials';
import { buildArchitecture } from './architecture';

// What is seen beyond the edges of an outdoor block (Level.scenery). Each edge of a street floor is a
// line of tall walls, there to walk into; this draws, in their place, a row of real buildings over
// shopfronts, or a fence with houses behind it, or a hedge with fields and trees. The walls' boxes on
// those lines are not drawn as boxes at all (see `sceneryLines`).

type Side = 'north' | 'south' | 'west' | 'east';

export interface SceneryLine {
  side: Side;
  backdrop: Backdrop;
  axis: 'x' | 'z';
  // Where the wall's centre line is, and which way the street is from it.
  fixed: number;
  normal: { x: number; z: number };
  from: number;
  to: number;
  // The wall's boxes on this line, and the openings in it (doorways and the gate) along the line.
  boxes: LevelBox[];
  gaps: { from: number; to: number; gate: boolean }[];
  // Stretches with no tall building (Scenery's `open`).
  open: [number, number][];
}

// The ground floor of a city row is drawn by the game; everything above this height is the model's.
const BAND = 4.4;
const HEDGE = 2.3;
const FENCE = 1.9;

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

// The edge lines of a street floor: on each side, the line of tall walls with the longest run. Returns
// the lines and the boxes they replace (walls, the beams over openings, and the closed spaces behind
// doorways on lines that are hedges or fences).
export function sceneryLines(level: Level): { lines: SceneryLine[]; skip: Set<LevelBox> } {
  const lines: SceneryLine[] = [];
  const skip = new Set<LevelBox>();
  const scenery = level.scenery;
  if (!scenery) return { lines, skip };
  const walls = level.boxes.filter((box) => (box.surface === 'building' || box.surface === 'wall') && box.position.y + box.size.y / 2 >= 2.4);
  const sides: [Side, 'x' | 'z', number][] = [['north', 'x', -1], ['south', 'x', 1], ['west', 'z', -1], ['east', 'z', 1]];
  for (const [side, axis, sign] of sides) {
    const edge = scenery[side];
    if (!edge) continue;
    const backdrop = typeof edge === 'string' ? edge : edge.kind;
    const open = typeof edge === 'string' ? [] : edge.open ?? [];
    // Walls running along this axis, thin across it, on this side of the middle.
    const candidates = walls.filter((box) => {
      const thin = axis === 'x' ? box.size.z <= 0.6 && box.size.x > box.size.z : box.size.x <= 0.6 && box.size.z > box.size.x;
      const at = axis === 'x' ? box.position.z : box.position.x;
      return thin && at * sign > 1;
    });
    const groups = new Map<number, LevelBox[]>();
    for (const box of candidates) {
      const at = axis === 'x' ? box.position.z : box.position.x;
      groups.set(at, [...(groups.get(at) ?? []), box]);
    }
    let best: [number, LevelBox[]] | null = null;
    let bestSpan = 0;
    for (const [at, boxes] of groups) {
      const span = boxes.filter((b) => b.position.y - b.size.y / 2 < 0.1).reduce((sum, b) => sum + (axis === 'x' ? b.size.x : b.size.z), 0)
        + boxes.filter((b) => b.position.y - b.size.y / 2 >= 0.1).reduce((sum, b) => sum + (axis === 'x' ? b.size.x : b.size.z), 0);
      if (span > bestSpan + 0.5 || (Math.abs(span - bestSpan) <= 0.5 && best && Math.abs(at) < Math.abs(best[0]))) { best = [at, boxes]; bestSpan = span; }
    }
    if (!best) continue;
    const [fixed, boxes] = best;
    const along = (b: LevelBox) => (axis === 'x' ? b.position.x : b.position.z);
    const length = (b: LevelBox) => (axis === 'x' ? b.size.x : b.size.z);
    const from = Math.min(...boxes.map((b) => along(b) - length(b) / 2));
    const to = Math.max(...boxes.map((b) => along(b) + length(b) / 2));
    // Openings: under a beam (a box that does not reach the ground).
    const gaps = boxes.filter((b) => b.position.y - b.size.y / 2 >= 0.1).map((b) => ({
      from: along(b) - length(b) / 2, to: along(b) + length(b) / 2,
      gate: [level.elevator, level.entry].some((lift) => lift && Math.abs((axis === 'x' ? lift.position.x : lift.position.z) - along(b)) < 0.1 && Math.abs((axis === 'x' ? lift.position.z : lift.position.x) - fixed) < 0.1),
    })).sort((a, b) => a.from - b.from);
    const normal = axis === 'x' ? { x: 0, z: -sign } : { x: -sign, z: 0 };
    lines.push({ side, backdrop, axis, fixed, normal, from, to, boxes, gaps, open });
    for (const box of boxes) skip.add(box);
    // A hedge or fence has no closed spaces behind its gaps: what is behind them is open ground.
    if (backdrop !== 'city') {
      for (const gap of gaps) {
        if (gap.gate) continue;
        const mid = (gap.from + gap.to) / 2;
        for (const box of level.boxes) {
          const a = axis === 'x' ? box.position.x : box.position.z;
          const out = ((axis === 'x' ? box.position.z : box.position.x) - fixed) * sign;
          if (Math.abs(a - mid) < 2.6 && out > 0.1 && out < 4.6 && (box.surface === 'wall' || box.surface === 'floor')) skip.add(box);
        }
      }
    }
  }
  return { lines, skip };
}

// ---- Shared bits ------------------------------------------------------------------------------

const clip = new THREE.Plane(new THREE.Vector3(0, 1, 0), -BAND);

// A copy of a model whose materials stop at the top of the ground floor, so the shopfronts drawn by
// the game show instead of the model's own. Materials are clipped once per model file.
const clipped = new Map<string, THREE.Object3D>();
async function rowModel(file: string): Promise<THREE.Object3D> {
  let template = clipped.get(file);
  if (!template) {
    template = await placeModel(`/models/${file}.glb`);
    const done = new Map<THREE.Material, THREE.Material>();
    template.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const swap = (m: THREE.Material) => {
        let copy = done.get(m);
        if (!copy) {
          copy = m.clone();
          copy.clippingPlanes = [clip];
          copy.clipShadows = true;
          // Night-time buildings: a little of their own colour back so the facades read in the dark.
          if (copy instanceof THREE.MeshStandardMaterial && copy.map) { copy.emissiveMap = copy.map; copy.emissive = new THREE.Color(0x1a1a1f); }
          done.set(m, copy);
        }
        return copy;
      };
      child.material = Array.isArray(child.material) ? child.material.map(swap) : swap(child.material);
      child.castShadow = false;
      child.receiveShadow = true;
    });
    clipped.set(file, template);
  }
  return template.clone(true);
}

async function plainModel(file: string): Promise<THREE.Object3D> {
  const model = await placeModel(`/models/${file}.glb`);
  model.traverse((child) => { if (child instanceof THREE.Mesh) { child.castShadow = false; child.receiveShadow = true; } });
  return model;
}

// Turns a model so its front (+z) faces `normal`, then moves it so its front face is `inset` behind
// the line (towards -normal) and its middle is at `along` on the line. Returns its width along the line.
function face(model: THREE.Object3D, line: SceneryLine, along: number, inset: number, ground = 0, sideAlign?: { edge: number; dir: number }): number {
  model.rotation.y = Math.atan2(line.normal.x, line.normal.z) + (model.userData.turn ?? 0);
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const plane = line.fixed + (line.axis === 'x' ? line.normal.z : line.normal.x) * (0.25 - inset);
  if (line.axis === 'x') {
    const width = box.max.x - box.min.x;
    const x = sideAlign ? (sideAlign.dir > 0 ? sideAlign.edge - box.min.x : sideAlign.edge - box.max.x) : along - (box.min.x + box.max.x) / 2;
    const z = line.normal.z > 0 ? plane - box.max.z : plane - box.min.z;
    model.position.set(model.position.x + x, ground - box.min.y, model.position.z + z);
    return width;
  }
  const width = box.max.z - box.min.z;
  const z = sideAlign ? (sideAlign.dir > 0 ? sideAlign.edge - box.min.z : sideAlign.edge - box.max.z) : along - (box.min.z + box.max.z) / 2;
  const x = line.normal.x > 0 ? plane - box.max.x : plane - box.min.x;
  model.position.set(model.position.x + x, ground - box.min.y, model.position.z + z);
  return width;
}

// A point `out` metres behind the line (away from the street) and `along` it.
function behind(line: SceneryLine, along: number, out: number): THREE.Vector3 {
  return line.axis === 'x'
    ? new THREE.Vector3(along, 0, line.fixed - line.normal.z * out)
    : new THREE.Vector3(line.fixed - line.normal.x * out, 0, along);
}

function solidRuns(line: SceneryLine): [number, number][] {
  const runs: [number, number][] = [];
  let cursor = line.from;
  for (const gap of line.gaps) {
    if (gap.from > cursor + 0.01) runs.push([cursor, gap.from]);
    cursor = Math.max(cursor, gap.to);
  }
  if (line.to > cursor + 0.01) runs.push([cursor, line.to]);
  return runs;
}

function boxAlong(line: SceneryLine, a: number, b: number, bottom: number, top: number, depth: number, out: number): LevelBox {
  const mid = (a + b) / 2;
  const centre = line.fixed - (line.axis === 'x' ? line.normal.z : line.normal.x) * out;
  return line.axis === 'x'
    ? { position: { x: mid, y: (bottom + top) / 2, z: centre }, size: { x: b - a, y: top - bottom, z: depth }, color: '#888', surface: 'building' }
    : { position: { x: centre, y: (bottom + top) / 2, z: mid }, size: { x: depth, y: top - bottom, z: b - a }, color: '#888', surface: 'building' };
}

function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, at: THREE.Vector3, parent: THREE.Object3D): THREE.Mesh {
  const m = new THREE.Mesh(geometry, material);
  m.position.copy(at);
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

// A box whose texture repeats every `tile` metres instead of stretching over each face.
function tiledBox(w: number, h: number, d: number, tile: number): THREE.BoxGeometry {
  const geometry = new THREE.BoxGeometry(w, h, d);
  const pos = geometry.attributes.position, normal = geometry.attributes.normal, uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    const side = Math.abs(normal.getX(i)) > 0.5, top = Math.abs(normal.getY(i)) > 0.5;
    uv.setXY(i, (side ? pos.getZ(i) : pos.getX(i)) / tile, (top ? pos.getZ(i) : pos.getY(i)) / tile);
  }
  return geometry;
}

let grass: THREE.MeshStandardMaterial | null = null;
function grassMaterial(): THREE.MeshStandardMaterial {
  if (!grass) {
    const map = paintTexture(512, 71, (context, size, random) => {
      context.fillStyle = '#3c4a2a';
      context.fillRect(0, 0, size, size);
      blobs(context, size, random, 70, 20, 90, '72,86,44', 0.35);
      blobs(context, size, random, 50, 10, 60, '40,48,26', 0.4);
      blobs(context, size, random, 20, 10, 40, '96,84,52', 0.25);
      specks(context, size, random, 9000, 2, 0.12, 0.25);
    });
    map.repeat.set(30, 30);
    grass = new THREE.MeshStandardMaterial({ map, roughness: 1 });
  }
  return grass;
}

let hedge: THREE.MeshStandardMaterial | null = null;
function hedgeMaterial(): THREE.MeshStandardMaterial {
  if (!hedge) {
    const map = paintTexture(256, 33, (context, size, random) => {
      context.fillStyle = '#1f3219';
      context.fillRect(0, 0, size, size);
      blobs(context, size, random, 220, 4, 14, '58,82,40', 0.55);
      blobs(context, size, random, 160, 3, 10, '12,22,10', 0.6);
      specks(context, size, random, 3000, 2, 0.2, 0.3);
    });
    map.repeat.set(1, 1);
    hedge = new THREE.MeshStandardMaterial({ map, roughness: 0.95 });
  }
  return hedge;
}

// ---- City rows ----------------------------------------------------------------------------------

// Buildings for a row, each with the width of its front at full size worked out when loaded. `turn`
// turns a model whose long face is not its +z face.
const ROW_KIT = [
  { file: 'blocks/mid-2' }, { file: 'blocks/mid-3' }, { file: 'blocks/mid-3s' }, { file: 'blocks/mid-3t' },
  { file: 'blocks/brick-apt' }, { file: 'blocks/brick-mid', turn: Math.PI / 2 }, { file: 'blocks/mid-1' },
];
const SKYLINE_KIT = ['blocks/glass-office', 'blocks/glass-slant', 'blocks/brick-office', 'blocks/sky-4'];

async function cityRow(parent: THREE.Object3D, line: SceneryLine, random: () => number): Promise<void> {
  // The ground floor: shopfronts along the solid runs, a plain lintel over each doorway, a cornice on top.
  for (const [a, b] of solidRuns(line)) {
    const shop = buildArchitecture(boxAlong(line, a, b, 0, BAND, 0.5, 0));
    parent.add(shop);
  }
  const stone = surfaceMaterial('plain', '#77756f');
  for (const gap of line.gaps) {
    if (gap.gate) continue;
    const lintel = boxAlong(line, gap.from, gap.to, 2.5, BAND, 0.5, 0);
    mesh(new THREE.BoxGeometry(lintel.size.x, lintel.size.y, lintel.size.z), stone, new THREE.Vector3(lintel.position.x, lintel.position.y, lintel.position.z), parent);
  }
  const trim = surfaceMaterial('plain', '#4d4c49');
  for (const [a, b] of solidRuns(line).length && line.gaps.some((g) => g.gate) ? solidRuns(line) : [[line.from, line.to] as [number, number]]) {
    const cornice = boxAlong(line, a, b, BAND - 0.15, BAND + 0.35, 1.1, -0.3);
    mesh(new THREE.BoxGeometry(cornice.size.x, cornice.size.y, cornice.size.z), trim, new THREE.Vector3(cornice.position.x, cornice.position.y, cornice.position.z), parent);
  }

  const kit = await Promise.all(ROW_KIT.map(async (entry) => {
    const model = await rowModel(entry.file);
    model.userData.turn = entry.turn ?? 0;
    model.rotation.y = entry.turn ?? 0;
    model.updateMatrixWorld(true);
    const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
    return { entry, width: size.x };
  }));

  const gate = line.gaps.find((g) => g.gate);
  if (gate) {
    // An end of the block, with the road going on through it: a building each side of the road,
    // fronts to the street, lined up with the road's edge and running on past the corner.
    for (const dir of [-1, 1]) {
      const pick = kit[1 + Math.floor(random() * 4)];
      const model = await rowModel(pick.entry.file);
      model.userData.turn = pick.entry.turn ?? 0;
      const edge = dir < 0 ? gate.from - 0.45 : gate.to + 0.45;
      face(model, line, 0, 0.3, 0, { edge, dir });
      parent.add(model);
    }
    return;
  }

  // A long side: fill each stretch with buildings side by side, scaled together to fit it exactly.
  const stretches: [number, number][] = [];
  let start = line.from;
  for (const [a, b] of [...line.open].sort((p, q) => p[0] - q[0])) {
    if (a > start + 6) stretches.push([start, a]);
    start = Math.max(start, b);
  }
  if (line.to > start + 6) stretches.push([start, line.to]);
  for (const [a, b] of stretches) {
    const length = b - a;
    const chosen: typeof kit = [];
    let total = 0;
    while (total < length - 4) {
      const left = length - total;
      const options = kit.filter((k) => k.width < left + 8 && (k.entry.file !== 'blocks/mid-1' || left > 50));
      const pick = options.length ? options[Math.floor(random() * options.length)] : kit[2];
      chosen.push(pick);
      total += pick.width;
    }
    const scale = length / total;
    let cursor = a;
    for (const pick of chosen) {
      const model = await rowModel(pick.entry.file);
      model.userData.turn = pick.entry.turn ?? 0;
      model.scale.setScalar(scale);
      const width = pick.width * scale;
      face(model, line, cursor + width / 2, 0.3);
      parent.add(model);
      cursor += width;
    }
  }
}

// ---- Fences, hedges, yards and fields ----------------------------------------------------------

async function scatter(parent: THREE.Object3D, file: string, spots: { at: THREE.Vector3; scale: number; yaw: number }[]): Promise<void> {
  if (!spots.length) return;
  const template = await plainModel(file);
  for (const spot of spots) {
    const model = template.clone(true);
    model.position.copy(spot.at);
    model.scale.setScalar(spot.scale);
    model.rotation.y = spot.yaw;
    parent.add(model);
  }
}

async function countrySide(parent: THREE.Object3D, line: SceneryLine, random: () => number): Promise<void> {
  const length = line.to - line.from;
  // Open ground behind the line, out to the fog.
  const depth = 70;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(line.axis === 'x' ? length + 80 : depth, line.axis === 'x' ? depth : length + 80), grassMaterial());
  ground.rotation.x = -Math.PI / 2;
  const centre = behind(line, (line.from + line.to) / 2, depth / 2 + 0.3);
  ground.position.set(centre.x, -0.01, centre.z);
  ground.receiveShadow = true;
  parent.add(ground);

  // The line itself: a fence of boards on posts, or a hedge, broken at each opening.
  const fence = line.backdrop === 'houses';
  const wood = surfaceMaterial('plain', '#6b5a44');
  for (const [a, b] of solidRuns(line)) {
    if (fence) {
      const boards = boxAlong(line, a, b, 0, FENCE, 0.08, 0);
      mesh(tiledBox(boards.size.x, boards.size.y, boards.size.z, 2), wood, new THREE.Vector3(boards.position.x, boards.position.y, boards.position.z), parent).castShadow = true;
      for (let s = a; s <= b + 0.01; s += 2.4) {
        const post = boxAlong(line, s - 0.06, s + 0.06, 0, FENCE + 0.12, 0.14, -0.06);
        mesh(new THREE.BoxGeometry(post.size.x, post.size.y, post.size.z), wood, new THREE.Vector3(post.position.x, post.position.y, post.position.z), parent);
      }
    } else {
      const top = Math.min(HEDGE, Math.max(...line.boxes.map((box) => box.position.y + box.size.y / 2)));
      const body = boxAlong(line, a, b, 0, top, 1.1, 0.2);
      const hedgeMesh = mesh(tiledBox(body.size.x, body.size.y, body.size.z, 2), hedgeMaterial(), new THREE.Vector3(body.position.x, body.position.y, body.position.z), parent);
      hedgeMesh.castShadow = true;
    }
  }
  // Grass tufts along a hedge's foot break up its straight edge.
  const tufts: { at: THREE.Vector3; scale: number; yaw: number }[] = [];
  if (!fence) {
    for (const [a, b] of solidRuns(line)) {
      for (let s = a + 0.6; s < b - 0.4; s += 1.3 + random() * 1.2) tufts.push({ at: behind(line, s, -0.45 - random() * 0.2), scale: 0.7 + random() * 0.5, yaw: random() * 6.28 });
    }
  }

  // Behind it: houses in their yards, or fields with trees.
  const trees: { at: THREE.Vector3; scale: number; yaw: number }[] = [];
  const treesB: typeof trees = [];
  const houses: { file: string; along: number; out: number }[] = [];
  if (fence) {
    const files = ['houses/house-1', 'houses/house-2', 'houses/house-3', 'houses/house-4', 'houses/house-5', 'houses/house-6', 'houses/house-7', 'houses/house-8', 'houses/home-1', 'houses/home-2', 'houses/home-3', 'houses/home-5', 'houses/home-6', 'houses/home-7'];
    let cursor = line.from + 2;
    while (cursor < line.to - 8) {
      const file = files[Math.floor(random() * files.length)];
      const width = 14 + random() * 4;
      houses.push({ file, along: cursor + width / 2, out: 7 + random() * 4 });
      cursor += width + 2 + random() * 3;
    }
  }
  for (let s = line.from - 20; s < line.to + 20; s += 5 + random() * 6) {
    const out = (fence ? 22 : 5) + random() * (fence ? 25 : 40);
    (random() < 0.5 ? trees : treesB).push({ at: behind(line, s, out), scale: 1.6 + random() * 0.9, yaw: random() * 6.28 });
  }
  // A farmhouse or two out in the fields.
  if (!fence && line.axis === 'x') houses.push({ file: random() < 0.5 ? 'houses/home-4' : 'houses/house-9', along: line.from + length * (0.3 + random() * 0.4), out: 26 + random() * 10 });

  await Promise.all([
    scatter(parent, 'plants/tree-a', trees),
    scatter(parent, 'plants/tree-b', treesB),
    scatter(parent, 'plants/bush', tufts),
    ...houses.map(async (house) => {
      const model = await plainModel(house.file);
      face(model, line, house.along, house.out);
      parent.add(model);
    }),
  ]);
}

// ---- Skyline ------------------------------------------------------------------------------------

async function skyline(parent: THREE.Object3D, level: Level, random: () => number): Promise<void> {
  const bounds = level.navBounds ?? { minX: -30, maxX: 30, minZ: -12, maxZ: 12 };
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cz = (bounds.minZ + bounds.maxZ) / 2;
  const count = 11;
  await Promise.all(Array.from({ length: count }, async (_, i) => {
    const angle = (i / count) * Math.PI * 2 + random() * 0.4;
    const distance = 62 + random() * 22;
    const model = await plainModel(SKYLINE_KIT[i % SKYLINE_KIT.length]);
    // Far towers are dark shapes in the haze: the fog would wash them out to the colour of the sky.
    model.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const darken = (m: THREE.Material) => {
        const copy = m.clone() as THREE.MeshStandardMaterial;
        copy.fog = false;
        copy.color.multiplyScalar(0.42);
        return copy;
      };
      child.material = Array.isArray(child.material) ? child.material.map(darken) : darken(child.material);
    });
    model.scale.setScalar(0.7 + random() * 0.45);
    model.rotation.y = Math.round(random() * 4) * (Math.PI / 2);
    model.position.set(cx + Math.cos(angle) * distance * 1.15, 0, cz + Math.sin(angle) * distance);
    parent.add(model);
  }));
}

export async function buildScenery(scene: THREE.Object3D, level: Level, lines: SceneryLine[]): Promise<void> {
  if (!level.scenery) return;
  const group = new THREE.Group();
  group.name = 'Scenery';
  scene.add(group);
  const random = seededRandom(hash(level.name));
  const jobs: Promise<void>[] = [];
  for (const line of lines) {
    const part = new THREE.Group();
    part.name = `Scenery ${line.side} ${line.backdrop}`;
    group.add(part);
    jobs.push(line.backdrop === 'city' ? cityRow(part, line, seededRandom(hash(level.name + line.side))) : countrySide(part, line, seededRandom(hash(level.name + line.side))));
  }
  if (level.scenery.skyline) jobs.push(skyline(group, level, random));
  await Promise.all(jobs);
  group.updateMatrixWorld(true);
  group.traverse((child) => { child.matrixAutoUpdate = false; });
  group.userData.ready = true;
}
