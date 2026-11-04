import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { extname } from 'node:path';
registerHooks({ resolve(s, c, next) {
  if (s.startsWith('.') && !extname(s)) {
    try { return next(`${s}.ts`, c); } catch (e) {
      if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e;
      return next(`${s}/index.ts`, c);
    }
  }
  return next(s, c);
} });
const { level0 } = await import('../src/levels/level0.ts');
const { createGameState } = await import('../src/game/state.ts');
const { moveBody } = await import('../src/game/movement.ts');
const { idleInput } = await import('../src/game/inputs.ts');
const { groundHeight } = await import('../src/game/collision.ts');
const { SPECIAL_PARKING_BAY, SURFACE_PARKING_BAYS } = await import('../src/levels/parking.ts');
const r = level0.ramp;
const surface = z => r.rise * Math.max(0, Math.min(1, (z - r.zBottom) / (r.zTop - r.zBottom)));
for (const dt of [1 / 120, 1 / 60, 1 / 30]) for (const direction of [-1, 1]) for (const sprint of [false, true]) {
  const p = createGameState(level0).players[0];
  Object.assign(p, { x: r.x, z: direction < 0 ? 35 : 10, y: direction < 0 ? r.rise : 0,
    yaw: direction < 0 ? 0 : Math.PI, onGround: true, vx: 0, vy: 0, vz: 0 });
  let samples = 0;
  for (let t = 0; t < 8; t += dt) {
    const before = p.y;
    moveBody(p, { ...idleInput(0), moveForward: 1, sprint }, dt, level0);
    assert.ok(Math.abs(p.y - surface(p.z)) < 1e-6, `ramp mismatch at z=${p.z}: ${p.y}`);
    assert.ok(p.onGround && p.vy === 0, 'walking must stay grounded');
    assert.ok(Math.abs(p.y - before) <= 9 * r.rise / (r.zTop - r.zBottom) * dt + 1e-6, 'height stair-step');
    samples++;
    if ((direction < 0 && p.z < 10) || (direction > 0 && p.z > 35)) break;
  }
  assert.ok(direction < 0 ? p.z < 10 : p.z > 35, 'full traversal');
  assert.ok(samples > 20);
}
// Jumping must still leave the slope and land on its exact surface.
const p = createGameState(level0).players[0];
Object.assign(p, { x: 3, z: 23, y: surface(23), onGround: true, vx: 0, vy: 0, vz: 0 });
moveBody(p, { ...idleInput(0), jump: true }, 1 / 120, level0);
assert.ok(!p.onGround && p.y > surface(23));
for (let i = 0; i < 240; i++) moveBody(p, idleInput(0), 1 / 120, level0);
assert.ok(p.onGround && Math.abs(p.y - surface(23)) < 1e-6);
assert.equal(groundHeight(level0, -5, 40, 0.4, 4.9), 4.9, 'street unchanged');
assert.equal(groundHeight(level0, 3, 6, 0.4, 0), 0, 'garage unchanged');
const cars = level0.boxes.filter(b => (b.surface === 'car' || b.surface === 'van') && b.position.y > 4.9 && b.position.z < 35);
for (const bay of SURFACE_PARKING_BAYS.filter(b => ['RESERVED', 'ACCESSIBLE', 'KEEP CLEAR'].includes(b.kind))) {
  assert.ok(!cars.some(car => Math.abs(car.position.x - bay.x) < (car.size.x + 5) / 2
    && Math.abs(car.position.z - bay.z) < (car.size.z + 2.7) / 2), `${bay.id} must remain unobstructed`);
}
assert.equal(SPECIAL_PARKING_BAY.id, 'E05');
for (const car of cars) assert.ok(SURFACE_PARKING_BAYS.some(bay =>
  Math.abs(car.position.x - bay.x) + car.size.x / 2 <= 2.5 && Math.abs(car.position.z - bay.z) + car.size.z / 2 <= 1.35), 'vehicle outside parking bay');
console.log('PASS: continuous ramp height uphill/downhill, walking/sprinting at 30/60/120 Hz, both lips, jumping and flat floors');
console.log('PASS: parked vehicles fit bays; accessible space, access aisle and reserved E05 stay empty');
