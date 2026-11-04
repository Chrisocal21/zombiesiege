import type { Level, LevelBox, Vec3 } from '../levels/types';

export interface RayHit {
  distance: number;
  // The unit direction the surface that was hit faces, back toward the ray.
  normal: Vec3;
}

export interface BoxRayHit extends RayHit {
  box: LevelBox;
}

// Where a ray first enters an axis-aligned box, or null if it misses within maxDistance.
export function rayAabb(
  origin: Vec3,
  direction: Vec3,
  min: Vec3,
  max: Vec3,
  maxDistance: number,
): RayHit | null {
  let entry = 0;
  let exit = maxDistance;
  const normal: Vec3 = { x: 0, y: 0, z: 0 };

  for (const axis of ['x', 'y', 'z'] as const) {
    const o = origin[axis];
    const d = direction[axis];

    if (d === 0) {
      if (o < min[axis] || o > max[axis]) return null;
      continue;
    }
    let t1 = (min[axis] - o) / d;
    let t2 = (max[axis] - o) / d;
    const side = -Math.sign(d);
    if (t1 > t2) {
      [t1, t2] = [t2, t1];
    }
    if (t1 > entry) {
      entry = t1;
      normal.x = normal.y = normal.z = 0;
      normal[axis] = side;
    }
    exit = Math.min(exit, t2);
  }
  return entry <= exit ? { distance: entry, normal } : null;
}

// The nearest box the ray hits, with the face it hit, or null if nothing is within maxDistance.
export function raycastBoxHit(
  level: Level,
  origin: Vec3,
  direction: Vec3,
  maxDistance: number,
  // Shots go through the cages across doorways, which are bars and not a wall.
  ignoreCages = false,
): BoxRayHit | null {
  let nearest: BoxRayHit | null = null;
  for (const box of level.boxes) {
    if (ignoreCages && box.surface === 'board') continue;
    const half = { x: box.size.x / 2, y: box.size.y / 2, z: box.size.z / 2 };
    const hit = rayAabb(
      origin,
      direction,
      { x: box.position.x - half.x, y: box.position.y - half.y, z: box.position.z - half.z },
      { x: box.position.x + half.x, y: box.position.y + half.y, z: box.position.z + half.z },
      nearest ? nearest.distance : maxDistance,
    );
    if (hit) nearest = { ...hit, box };
  }
  return nearest;
}

// Distance along the ray to the nearest box, or null if nothing is within maxDistance.
export function raycastBoxes(
  level: Level,
  origin: Vec3,
  direction: Vec3,
  maxDistance: number,
): number | null {
  return raycastBoxHit(level, origin, direction, maxDistance, true)?.distance ?? null;
}
