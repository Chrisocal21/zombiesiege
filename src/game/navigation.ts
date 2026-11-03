import { config } from '../config';
import type { GameState, Zombie } from './state';

// Zombies on a floor with rooms find their way round walls with a grid: every cell a zombie fits
// in is marked, then the distance to the nearest player is worked out across them. A zombie with a
// clear line to its target just walks at it, and otherwise steps down the distances.
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
  distance: Int32Array;
}

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

  const distance = new Int32Array(cols * rows).fill(UNREACHED);
  const queue: number[] = [];
  for (const player of state.players) {
    if (player.health <= 0) continue;
    const c = Math.floor((player.x - bounds.minX) / CELL);
    const r = Math.floor((player.z - bounds.minZ) / CELL);
    if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
    // Wherever a player stands counts as open, even close to furniture.
    walk[r * cols + c] = 1;
    distance[r * cols + c] = 0;
    queue.push(r * cols + c);
  }
  for (let head = 0; head < queue.length; head++) {
    const here = queue[head];
    const c = here % cols;
    const r = (here - c) / cols;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nc: number = c + dc;
        const nr: number = r + dr;
        if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
        const next = nr * cols + nc;
        if (!walk[next] || distance[next] !== UNREACHED) continue;
        // No cutting a corner through a wall.
        if (dr !== 0 && dc !== 0 && (!walk[r * cols + nc] || !walk[nr * cols + c])) continue;
        distance[next] = distance[here] + 1;
        queue.push(next);
      }
    }
  }
  return { builtTick: state.tick, minX: bounds.minX, minZ: bounds.minZ, cols, rows, walk, distance };
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

  let cell: number = cellOf(field, zombie.x, zombie.z);
  if (cell < 0) return undefined;
  if (field.distance[cell] === UNREACHED) {
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
        if (field.distance[next] !== UNREACHED && (nearest < 0 || field.distance[next] < field.distance[nearest])) nearest = next;
      }
    }
    if (nearest < 0) return undefined;
    cell = nearest;
  }
  // Follow the distances down a few cells, so the path does not zigzag from cell to cell.
  for (let hop = 0; hop < 3 && field.distance[cell] > 0; hop++) {
    const c: number = cell % field.cols;
    const r: number = (cell - c) / field.cols;
    let best: number = cell;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nc: number = c + dc;
        const nr: number = r + dr;
        if (nc < 0 || nr < 0 || nc >= field.cols || nr >= field.rows) continue;
        const next = nr * field.cols + nc;
        if (field.distance[next] === UNREACHED || field.distance[next] >= field.distance[best]) continue;
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
