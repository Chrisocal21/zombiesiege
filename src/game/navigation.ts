import { config } from '../config';
import type { GameState, Zombie } from './state';

// Zombies on a floor with rooms find their way round walls with a grid: every cell a zombie fits
// in is marked, then the distance to the nearest player is worked out across them. A zombie with a
// clear line to its target just walks at it, and otherwise steps down the distances.
//
// Not every zombie takes the same road. There are three routes: the shortest, and two that treat
// patches of the floor as costly, in different places, so they bend off through other rooms and
// round other furniture and arrive from other sides. A zombie's route is its id modulo three.
const CELL = 0.5;
// The grid is rebuilt this often, in seconds, so shut doors, boards and moving players are noticed.
const REFRESH_SECONDS = 0.25;
const UNREACHED = -1;

interface Field {
  builtTick: number;
  minX: number;
  minZ: number;
  cols: number;
  rows: number;
  walk: Uint8Array;
  // The cost to the nearest player, one grid per route.
  distance: Int32Array[];
}

export const ROUTES = 3;
export const routeOf = (zombie: { id: number }): number => zombie.id % ROUTES;

// Patches of floor a route avoids: smooth noise over a coarse grid, fixed for the route, so the
// costly areas are the same from one rebuild to the next.
const PATCH = 4;
function hash(ix: number, iz: number, route: number): number {
  let h = Math.imul(ix + 101, 374761393) ^ Math.imul(iz + 211, 668265263) ^ Math.imul(route + 7, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1103515245);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function patchCost(x: number, z: number, route: number): number {
  if (route === 0) return 0;
  const fx = x / PATCH, fz = z / PATCH;
  const ix = Math.floor(fx), iz = Math.floor(fz);
  const tx = fx - ix, tz = fz - iz;
  const a = hash(ix, iz, route), b = hash(ix + 1, iz, route), c = hash(ix, iz + 1, route), d = hash(ix + 1, iz + 1, route);
  return (a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + d * tx) * tz;
}
// How much extra a step through the costliest patch takes, against 10 for a plain step.
const PATCH_WEIGHT = 34;

const fields = new WeakMap<GameState, Field>();

function build(state: GameState): Field | null {
  const bounds = state.level.navBounds;
  if (!bounds) return null;
  const cols = Math.ceil((bounds.maxX - bounds.minX) / CELL);
  const rows = Math.ceil((bounds.maxZ - bounds.minZ) / CELL);
  const walk = new Uint8Array(cols * rows).fill(1);
  const clearance = config.zombie.radius + 0.05;

  // A box blocks every cell whose middle is within the zombie's radius of it, if it stands in
  // the way of a zombie's body.
  for (const box of state.level.boxes) {
    // A cage across a doorway still counts as a way in: zombies come to it and cannot get through.
    if (box.surface === 'board') continue;
    const top = box.position.y + box.size.y / 2;
    const bottom = box.position.y - box.size.y / 2;
    if (top <= config.player.stepHeight || bottom >= config.zombie.height) continue;
    const c0 = Math.max(0, Math.floor((box.position.x - box.size.x / 2 - clearance - bounds.minX) / CELL));
    const c1 = Math.min(cols - 1, Math.floor((box.position.x + box.size.x / 2 + clearance - bounds.minX) / CELL));
    const r0 = Math.max(0, Math.floor((box.position.z - box.size.z / 2 - clearance - bounds.minZ) / CELL));
    const r1 = Math.min(rows - 1, Math.floor((box.position.z + box.size.z / 2 + clearance - bounds.minZ) / CELL));
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const x = bounds.minX + (c + 0.5) * CELL;
        const z = bounds.minZ + (r + 0.5) * CELL;
        if (Math.abs(x - box.position.x) < box.size.x / 2 + clearance && Math.abs(z - box.position.z) < box.size.z / 2 + clearance) {
          walk[r * cols + c] = 0;
        }
      }
    }
  }

  const sources: number[] = [];
  for (const player of state.players) {
    if (player.health <= 0) continue;
    const c = Math.floor((player.x - bounds.minX) / CELL);
    const r = Math.floor((player.z - bounds.minZ) / CELL);
    if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
    // Wherever a player stands counts as open, even close to furniture.
    walk[r * cols + c] = 1;
    sources.push(r * cols + c);
  }
  const distance: Int32Array[] = [];
  for (let route = 0; route < ROUTES; route++) distance.push(spread(walk, cols, rows, bounds.minX, bounds.minZ, sources, route));
  return { builtTick: state.tick, minX: bounds.minX, minZ: bounds.minZ, cols, rows, walk, distance };
}

// Works out the cost from every open cell to the nearest source, a plain step costing 10 and a
// diagonal 14, plus whatever the route's patches add. A binary heap keeps it quick.
function spread(walk: Uint8Array, cols: number, rows: number, minX: number, minZ: number, sources: number[], route: number): Int32Array {
  const distance = new Int32Array(cols * rows).fill(UNREACHED);
  const extra = new Int32Array(cols * rows);
  if (route !== 0) {
    for (let cell = 0; cell < extra.length; cell++) {
      const c = cell % cols;
      const r = (cell - c) / cols;
      extra[cell] = Math.round(patchCost(minX + (c + 0.5) * CELL, minZ + (r + 0.5) * CELL, route) * PATCH_WEIGHT);
    }
  }
  const heapCost: number[] = [];
  const heapCell: number[] = [];
  const push = (cost: number, cell: number) => {
    let i = heapCost.length;
    heapCost.push(cost);
    heapCell.push(cell);
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (heapCost[parent] <= cost) break;
      heapCost[i] = heapCost[parent]; heapCell[i] = heapCell[parent];
      i = parent;
    }
    heapCost[i] = cost; heapCell[i] = cell;
  };
  const pop = (): [number, number] => {
    const top: [number, number] = [heapCost[0], heapCell[0]];
    const cost = heapCost.pop()!;
    const cell = heapCell.pop()!;
    const n = heapCost.length;
    if (n > 0) {
      let i = 0;
      for (;;) {
        let child = 2 * i + 1;
        if (child >= n) break;
        if (child + 1 < n && heapCost[child + 1] < heapCost[child]) child++;
        if (heapCost[child] >= cost) break;
        heapCost[i] = heapCost[child]; heapCell[i] = heapCell[child];
        i = child;
      }
      heapCost[i] = cost; heapCell[i] = cell;
    }
    return top;
  };
  const best = new Int32Array(cols * rows).fill(0x7fffffff);
  for (const source of sources) { best[source] = 0; push(0, source); }
  while (heapCost.length) {
    const [cost, here] = pop();
    if (cost > best[here]) continue;
    distance[here] = cost;
    const c = here % cols;
    const r = (here - c) / cols;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nc: number = c + dc;
        const nr: number = r + dr;
        if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
        const next = nr * cols + nc;
        if (!walk[next]) continue;
        // No cutting a corner through a wall.
        if (dr !== 0 && dc !== 0 && (!walk[r * cols + nc] || !walk[nr * cols + c])) continue;
        const through = cost + (dr !== 0 && dc !== 0 ? 14 : 10) + extra[next];
        if (through < best[next]) { best[next] = through; push(through, next); }
      }
    }
  }
  return distance;
}

function fieldFor(state: GameState): Field | null {
  let field = fields.get(state);
  if (!field || state.tick - field.builtTick >= REFRESH_SECONDS * config.ticksPerSecond || state.tick < field.builtTick) {
    field = build(state) ?? undefined;
    if (field) fields.set(state, field);
    else fields.delete(state);
  }
  return field ?? null;
}

function cellOf(field: Field, x: number, z: number): number {
  const c = Math.floor((x - field.minX) / CELL);
  const r = Math.floor((z - field.minZ) / CELL);
  return c < 0 || r < 0 || c >= field.cols || r >= field.rows ? -1 : r * field.cols + c;
}

// Whether a straight walk from one point to another stays on open cells.
function clearLine(field: Field, ax: number, az: number, bx: number, bz: number): boolean {
  const length = Math.hypot(bx - ax, bz - az);
  const steps = Math.ceil(length / (CELL * 0.5));
  for (let i = 1; i < steps; i++) {
    const cell = cellOf(field, ax + ((bx - ax) * i) / steps, az + ((bz - az) * i) / steps);
    if (cell < 0 || !field.walk[cell]) return false;
  }
  return true;
}

// Where a zombie should head to reach a target: null to walk straight at it, a point to walk
// to first, or undefined when there is no way through at all (a shut door, boards).
export function nextStep(state: GameState, zombie: Zombie, target: { x: number; z: number }): { x: number; z: number } | null | undefined {
  const field = fieldFor(state);
  if (!field) return null;
  if (clearLine(field, zombie.x, zombie.z, target.x, target.z)) return null;

  const distance = field.distance[routeOf(zombie)];
  let cell: number = cellOf(field, zombie.x, zombie.z);
  if (cell < 0) return undefined;
  if (distance[cell] === UNREACHED) {
    // Pressed against furniture, in a cell that is shut: step to the nearest open one.
    const c: number = cell % field.cols;
    const r: number = (cell - c) / field.cols;
    let nearest: number = -1;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nc: number = c + dc;
        const nr: number = r + dr;
        if (nc < 0 || nr < 0 || nc >= field.cols || nr >= field.rows) continue;
        const next = nr * field.cols + nc;
        if (distance[next] !== UNREACHED && (nearest < 0 || distance[next] < distance[nearest])) nearest = next;
      }
    }
    if (nearest < 0) return undefined;
    cell = nearest;
  }
  // Follow the distances down a few cells, so the path does not zigzag from cell to cell.
  for (let hop = 0; hop < 3 && distance[cell] > 0; hop++) {
    const c: number = cell % field.cols;
    const r: number = (cell - c) / field.cols;
    let best: number = cell;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nc: number = c + dc;
        const nr: number = r + dr;
        if (nc < 0 || nr < 0 || nc >= field.cols || nr >= field.rows) continue;
        const next = nr * field.cols + nc;
        if (distance[next] === UNREACHED || distance[next] >= distance[best]) continue;
        if (dr !== 0 && dc !== 0 && (!field.walk[r * field.cols + nc] || !field.walk[nr * field.cols + c])) continue;
        best = next;
      }
    }
    if (best === cell) break;
    cell = best;
  }
  const c = cell % field.cols;
  const r = (cell - c) / field.cols;
  return { x: field.minX + (c + 0.5) * CELL, z: field.minZ + (r + 0.5) * CELL };
}
