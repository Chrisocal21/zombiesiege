import assert from 'node:assert/strict';
import { rayAabb } from '../src/game/hitscan.ts';

const min = { x: -1, y: -1, z: -1 }, max = { x: 1, y: 1, z: 1 };
for (const axis of ['x', 'y', 'z']) {
  for (const side of [-1, 1]) {
    const origin = { x: 0, y: 0, z: 0 }, direction = { x: 0, y: 0, z: 0 };
    origin[axis] = side * 3; direction[axis] = -side;
    const hit = rayAabb(origin, direction, min, max, 10);
    assert.equal(hit?.distance, 2);
    assert.equal(hit.normal[axis], side, `${axis} face must point back toward the ray`);
  }
}
assert.equal(rayAabb({ x: 3, y: 0, z: 0 }, { x: -1, y: 0, z: 0 }, min, max, 1), null);
assert.equal(rayAabb({ x: 3, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }, min, max, 10), null);
assert.equal(rayAabb({ x: 3, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, min, max, 10), null);
assert.equal(rayAabb({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, min, max, 10)?.distance, 0);
console.log('PASS: six surface normals, range, parallel miss, behind-ray miss, inside origin');
