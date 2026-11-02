import type { Level, Vec3 } from '../levels/types';

// Distance along the ray to the nearest box, or null if nothing is within maxDistance.
export function raycastBoxes(
  level: Level,
  origin: Vec3,
  direction: Vec3,
  maxDistance: number,
): number | null {
  let nearest = maxDistance;
  let hit = false;

  for (const box of level.boxes) {
    let entry = 0;
    let exit = nearest;
    let missed = false;

    for (const axis of ['x', 'y', 'z'] as const) {
      const min = box.position[axis] - box.size[axis] / 2;
      const max = box.position[axis] + box.size[axis] / 2;
      const o = origin[axis];
      const d = direction[axis];

      if (d === 0) {
        if (o < min || o > max) missed = true;
        continue;
      }
      let t1 = (min - o) / d;
      let t2 = (max - o) / d;
      if (t1 > t2) [t1, t2] = [t2, t1];
      entry = Math.max(entry, t1);
      exit = Math.min(exit, t2);
    }

    if (!missed && entry <= exit) {
      nearest = entry;
      hit = true;
    }
  }
  return hit ? nearest : null;
}
