import { config } from '../config';
import type { Level, LevelBox } from '../levels/types';

// Only the feet count when working out what you are standing on, so you can stand near an edge.
const FOOT_RADIUS_SCALE = 0.6;

function top(box: LevelBox): number {
  return box.position.y + box.size.y / 2;
}

function bottom(box: LevelBox): number {
  return box.position.y - box.size.y / 2;
}

// How far a point is from the box's footprint, seen from above.
function footprintDistance(box: LevelBox, x: number, z: number): { dx: number; dz: number; nearestX: number; nearestZ: number } {
  const nearestX = Math.max(box.position.x - box.size.x / 2, Math.min(x, box.position.x + box.size.x / 2));
  const nearestZ = Math.max(box.position.z - box.size.z / 2, Math.min(z, box.position.z + box.size.z / 2));
  return { dx: x - nearestX, dz: z - nearestZ, nearestX, nearestZ };
}

// Pushes a circle standing at height y out of every box that stands in its way. A box is in the
// way if it is taller than a step above the feet and starts below the top of the head.
export function resolveCircle(
  level: Level,
  x: number,
  z: number,
  radius: number,
  y: number,
  height: number,
): { x: number; z: number } {
  for (const box of level.boxes) {
    if (top(box) <= y + config.player.stepHeight || bottom(box) >= y + height) continue;

    const { dx, dz, nearestX, nearestZ } = footprintDistance(box, x, z);
    const distance = Math.hypot(dx, dz);
    if (distance >= radius || distance === 0) continue;

    x = nearestX + (dx / distance) * radius;
    z = nearestZ + (dz / distance) * radius;
  }
  return { x, z };
}

// The height of the surface under the feet: the highest box top that is no more than a step
// above the current height. The floor counts, so this is never below 0.
export function groundHeight(level: Level, x: number, z: number, radius: number, y: number): number {
  let ground = -Infinity;
  for (const box of level.boxes) {
    const boxTop = top(box);
    if (boxTop > y + config.player.stepHeight || boxTop <= ground) continue;
    const { dx, dz } = footprintDistance(box, x, z);
    if (Math.hypot(dx, dz) < radius * FOOT_RADIUS_SCALE) ground = boxTop;
  }
  return ground;
}

// The lowest underside above `from`, for hitting your head while jumping. Infinity if clear.
// `from` is the head by default. Passing a lower height, such as the feet plus a step, also finds a
// slab the head is already inside, which is what stops a jump from standing on a crate going
// straight up through a ceiling.
export function ceilingHeight(level: Level, x: number, z: number, radius: number, headY: number, from = headY): number {
  let ceiling = Infinity;
  for (const box of level.boxes) {
    const boxBottom = bottom(box);
    if (boxBottom < from - 0.01 || boxBottom >= ceiling) continue;
    const { dx, dz } = footprintDistance(box, x, z);
    if (Math.hypot(dx, dz) < radius) ceiling = boxBottom;
  }
  return ceiling;
}

// The box whose footprint contains the point, and whose top is the highest such, ignoring
// anything above maxTop. Used to find a ledge to climb onto.
export function ledgeAt(level: Level, x: number, z: number, minTop: number, maxTop: number): LevelBox | null {
  let best: LevelBox | null = null;
  for (const box of level.boxes) {
    const boxTop = top(box);
    if (boxTop < minTop || boxTop > maxTop) continue;
    const { dx, dz } = footprintDistance(box, x, z);
    if (dx !== 0 || dz !== 0) continue;
    if (best === null || boxTop > top(best)) best = box;
  }
  return best;
}

export function boxTop(box: LevelBox): number {
  return top(box);
}

export { footprintDistance };
