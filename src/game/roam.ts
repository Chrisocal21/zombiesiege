import { config } from '../config';
import type { Level, LevelBox, Resident } from '../levels/types';
import { resolveCircle } from './collision';

// The dead already on a floor when the crew gets there, walking about on their own: on the road, in
// the rooms, in the car park. They are placed well away from where the crew starts, out of sight, so
// a careful crew can go quiet and pick them off, or go round them.
//
// Every floor's walkable ground is worked out once, on a coarse grid flooded out from the crew's start,
// so nothing is put behind a wall, in a doorway the waves come through, or in the lift.

const CELL = 0.5;
// How far each one strays from where it was put, how far it is put from where the crew starts, and
// from each other.
const ROAM_RADIUS = 7;
const START_CLEARANCE = 20;
const MIN_CLEARANCE = 13;
const APART = 5;

interface Ground {
  minX: number;
  minZ: number;
  cols: number;
  rows: number;
  // 1 where a zombie can walk, reached from the crew's start, and where one can be put to begin with.
  open: Uint8Array;
  placeable: Uint8Array;
}

const grounds = new WeakMap<Level, Ground>();

function hash(a: number, b: number): number {
  let h = Math.imul(a + 0x9e37, 374761393) ^ Math.imul(b + 0x85eb, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1103515245);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function standsInWay(box: LevelBox): boolean {
  if (box.surface === 'board') return false;
  const top = box.position.y + box.size.y / 2;
  const bottom = box.position.y - box.size.y / 2;
  return top > config.player.stepHeight && bottom < config.zombie.height;
}

// The area to look in: the floor's nav bounds, or the ground slabs it is built on.
function boundsOf(level: Level): { minX: number; maxX: number; minZ: number; maxZ: number } | null {
  if (level.navBounds) return level.navBounds;
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const box of level.boxes) {
    if (standsInWay(box)) continue;
    minX = Math.min(minX, box.position.x - box.size.x / 2);
    maxX = Math.max(maxX, box.position.x + box.size.x / 2);
    minZ = Math.min(minZ, box.position.z - box.size.z / 2);
    maxZ = Math.max(maxZ, box.position.z + box.size.z / 2);
  }
  return Number.isFinite(minX) ? { minX, maxX, minZ, maxZ } : null;
}

// Along and across one of the floor's ways in or out, from its middle: `into` is how far into the room.
function offset(way: { position: { x: number; z: number }; normal: { x: number; z: number } }, x: number, z: number): { into: number; across: number } {
  const dx = x - way.position.x, dz = z - way.position.z;
  return { into: dx * way.normal.x + dz * way.normal.z, across: Math.abs(dx * way.normal.z - dz * way.normal.x) };
}

// Where the floor's ground ends for walking about: the doorways the waves come through (the passages
// beyond are theirs), and the lift's cab or a checkpoint lane.
function shut(level: Level, x: number, z: number): boolean {
  for (const door of level.doors) {
    const { into, across } = offset(door, x, z);
    if (into < 0.75 && into > -6 && across < door.width / 2 + 0.6) return true;
  }
  for (const way of [level.elevator, level.entry]) {
    if (!way) continue;
    const { into, across } = offset(way, x, z);
    if (into < 0.5 && into > -12 && across < way.width / 2 + 1) return true;
  }
  return false;
}

// Too close to one of the ways in or out to be put there: the dead are not left in a doorway, by the
// lift or at the garage gate.
function byAWay(level: Level, x: number, z: number): boolean {
  for (const door of level.doors) {
    const { into, across } = offset(door, x, z);
    if (into < 3 && across < door.width / 2 + 2.5) return true;
  }
  for (const way of [level.elevator, level.entry]) {
    if (!way) continue;
    const { into, across } = offset(way, x, z);
    if (into < 5 && across < way.width / 2 + 3) return true;
  }
  if (level.gate && Math.hypot(x - level.gate.panel.x, z - level.gate.panel.z) < 6) return true;
  return false;
}

export function groundOf(level: Level): Ground | null {
  const cached = grounds.get(level);
  if (cached) return cached;
  const bounds = boundsOf(level);
  if (!bounds) return null;
  const cols = Math.ceil((bounds.maxX - bounds.minX) / CELL);
  const rows = Math.ceil((bounds.maxZ - bounds.minZ) / CELL);
  const free = new Uint8Array(cols * rows).fill(1);
  const middle = (c: number, r: number) => ({ x: bounds.minX + (c + 0.5) * CELL, z: bounds.minZ + (r + 0.5) * CELL });
  // A cell is free when nothing in the way is within a body's width of its middle.
  const clearance = config.zombie.radius + 0.05;
  for (const box of level.boxes) {
    if (!standsInWay(box)) continue;
    const c0 = Math.max(0, Math.floor((box.position.x - box.size.x / 2 - clearance - bounds.minX) / CELL));
    const c1 = Math.min(cols - 1, Math.floor((box.position.x + box.size.x / 2 + clearance - bounds.minX) / CELL));
    const r0 = Math.max(0, Math.floor((box.position.z - box.size.z / 2 - clearance - bounds.minZ) / CELL));
    const r1 = Math.min(rows - 1, Math.floor((box.position.z + box.size.z / 2 + clearance - bounds.minZ) / CELL));
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const { x, z } = middle(c, r);
        if (Math.abs(x - box.position.x) < box.size.x / 2 + clearance && Math.abs(z - box.position.z) < box.size.z / 2 + clearance) free[r * cols + c] = 0;
      }
    }
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const { x, z } = middle(c, r);
      if (shut(level, x, z)) free[r * cols + c] = 0;
    }
  }
  // Only what can be walked to from where the crew starts. The start itself always counts.
  const open = new Uint8Array(cols * rows);
  const queue: number[] = [];
  for (const spawn of [...level.playerSpawns, ...level.streetSpawns]) {
    const c = Math.floor((spawn.x - bounds.minX) / CELL);
    const r = Math.floor((spawn.z - bounds.minZ) / CELL);
    if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
    const cell = r * cols + c;
    if (!open[cell]) { open[cell] = 1; queue.push(cell); }
  }
  while (queue.length) {
    const cell = queue.pop()!;
    const c = cell % cols, r = (cell - c) / cols;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = c + dc, nr = r + dr;
      if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
      const next = nr * cols + nc;
      if (open[next] || !free[next]) continue;
      open[next] = 1;
      queue.push(next);
    }
  }
  const placeable = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = r * cols + c;
      const { x, z } = middle(c, r);
      // Put somewhere with room round it, not squeezed against the furniture.
      if (c < 1 || r < 1 || c >= cols - 1 || r >= rows - 1 || byAWay(level, x, z)) continue;
      let roomy = true;
      for (let dr = -1; dr <= 1 && roomy; dr++) for (let dc = -1; dc <= 1; dc++) if (!open[(r + dr) * cols + c + dc]) { roomy = false; break; }
      if (roomy) placeable[cell] = 1;
    }
  }
  const ground = { minX: bounds.minX, minZ: bounds.minZ, cols, rows, open, placeable };
  grounds.set(level, ground);
  return ground;
}

function isOpen(ground: Ground, x: number, z: number, grid: Uint8Array = ground.open): boolean {
  const c = Math.floor((x - ground.minX) / CELL);
  const r = Math.floor((z - ground.minZ) / CELL);
  return c >= 0 && r >= 0 && c < ground.cols && r < ground.rows && grid[r * ground.cols + c] === 1;
}

// Whether a straight walk between two points stays on open ground.
function clearWalk(ground: Ground, ax: number, az: number, bx: number, bz: number): boolean {
  const steps = Math.ceil(Math.hypot(bx - ax, bz - az) / (CELL * 0.5));
  for (let i = 1; i <= steps; i++) if (!isOpen(ground, ax + ((bx - ax) * i) / steps, az + ((bz - az) * i) / steps)) return false;
  return true;
}

// How many walk about on a floor when the level does not say: most out on a street, a handful in a
// tower's rooms, none on a floor with a boss or a scene in it.
export function roamersOn(level: Level): number {
  if (level.roamers !== undefined) return level.roamers;
  if (level.boss || level.scene) return 0;
  if (level.theme === 'street') return 10;
  if (level.theme === 'garage') return 5;
  if (level.theme === 'roof') return 3;
  return 4;
}

// The floor's walkers: spread over the open ground, away from the crew's start, from the floor's own
// dead, from the people hiding there, and from each other. The same every time for the same floor.
export function roamersFor(level: Level): Resident[] {
  const count = roamersOn(level);
  const ground = groundOf(level);
  if (!ground || count <= 0) return [];
  const starts = [...level.playerSpawns, ...level.streetSpawns];
  const taken: { x: number; z: number }[] = [...(level.residents ?? []), ...(level.rescue?.people ?? [])];
  const placed: Resident[] = [];
  const seed = level.name.length * 31 + level.boxes.length;
  // Far from the start where the floor is big enough, and never closer than MIN_CLEARANCE, out of sight.
  for (let attempt = 0; attempt < 900 && placed.length < count; attempt++) {
    const clearance = Math.max(MIN_CLEARANCE, START_CLEARANCE - Math.floor(attempt / 300) * 4);
    const x = ground.minX + hash(seed, attempt * 2) * ground.cols * CELL;
    const z = ground.minZ + hash(seed, attempt * 2 + 1) * ground.rows * CELL;
    if (!isOpen(ground, x, z, ground.placeable)) continue;
    if (starts.some((s) => Math.hypot(s.x - x, s.z - z) < clearance)) continue;
    if (taken.some((t) => Math.hypot(t.x - x, t.z - z) < APART)) continue;
    // Runners now and then, deeper in.
    const kind = hash(seed + 7, attempt) < 0.15 ? 'runner' : 'walker';
    placed.push({ x, z, kind, yaw: hash(seed + 3, attempt) * Math.PI * 2, roam: ROAM_RADIUS });
    taken.push({ x, z });
  }
  return placed;
}

const ticks = (seconds: number): number => Math.round(seconds * config.ticksPerSecond);

// A walker not yet aware of anyone: it stands a while, then shuffles to somewhere else near where it
// was put, and stands again.
export function roam(
  level: Level,
  zombie: { id: number; x: number; z: number; yaw: number; roam: { x: number; z: number; radius: number } | null; roamTo: { x: number; z: number } | null; roamWait: number },
  tick: number,
  dt: number,
  radius: number,
  height: number,
): void {
  const home = zombie.roam;
  if (!home) return;
  const ground = groundOf(level);
  if (!ground) return;
  if (!zombie.roamTo) {
    if (tick < zombie.roamWait) return;
    // Somewhere new near home, in a straight line it can walk.
    for (let attempt = 0; attempt < 6; attempt++) {
      const angle = hash(zombie.id, tick + attempt * 17) * Math.PI * 2;
      const reach = home.radius * Math.sqrt(hash(zombie.id + 99, tick + attempt * 31));
      const x = home.x + Math.cos(angle) * reach;
      const z = home.z + Math.sin(angle) * reach;
      if (Math.hypot(x - zombie.x, z - zombie.z) > 1.5 && clearWalk(ground, zombie.x, zombie.z, x, z)) {
        zombie.roamTo = { x, z };
        return;
      }
    }
    zombie.roamWait = tick + ticks(1);
    return;
  }
  const dx = zombie.roamTo.x - zombie.x, dz = zombie.roamTo.z - zombie.z;
  const distance = Math.hypot(dx, dz);
  const pace = config.zombie.moveSpeed * config.zombie.roamSpeed * (0.85 + 0.3 * ((zombie.id * 0.618) % 1));
  const step = Math.min(distance, pace * dt);
  const moved = resolveCircle(level, zombie.x + (dx / (distance || 1)) * step, zombie.z + (dz / (distance || 1)) * step, radius, 0, height);
  const stuck = Math.hypot(moved.x - zombie.x, moved.z - zombie.z) < step * 0.3;
  zombie.x = moved.x;
  zombie.z = moved.z;
  if (distance > 0.05) zombie.yaw = Math.atan2(-dx, -dz);
  if (distance < 0.4 || stuck) {
    zombie.roamTo = null;
    // A few seconds' stand before it moves on.
    zombie.roamWait = tick + ticks(2 + hash(zombie.id, tick) * 5);
  }
}
