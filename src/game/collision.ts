import type { Level } from '../levels/types';

// Anything whose top is above this height blocks walking. The floor does not.
const MIN_BLOCKING_TOP = 0.1;

// Pushes a circle on the floor plane out of every box it overlaps.
export function resolveCircle(
  level: Level,
  x: number,
  z: number,
  radius: number,
): { x: number; z: number } {
  for (const box of level.boxes) {
    if (box.position.y + box.size.y / 2 < MIN_BLOCKING_TOP) continue;

    const halfX = box.size.x / 2;
    const halfZ = box.size.z / 2;
    const nearestX = Math.max(box.position.x - halfX, Math.min(x, box.position.x + halfX));
    const nearestZ = Math.max(box.position.z - halfZ, Math.min(z, box.position.z + halfZ));
    const dx = x - nearestX;
    const dz = z - nearestZ;
    const distance = Math.hypot(dx, dz);
    if (distance >= radius || distance === 0) continue;

    x = nearestX + (dx / distance) * radius;
    z = nearestZ + (dz / distance) * radius;
  }
  return { x, z };
}
