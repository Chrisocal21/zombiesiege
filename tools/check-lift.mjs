// Act 12, Lift Window: the last floor. Lights, then fuel, then three cases to the ramp; no gate on foot.
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { extname } from 'node:path';
registerHooks({ resolve(s, c, next) {
  if (s.startsWith('.') && !extname(s)) { try { return next(`${s}.ts`, c); } catch (e) { if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e; return next(`${s}/index.ts`, c); } }
  return next(s, c); } });
const { createGameState, flowOf } = await import('../src/game/state.ts');
const { level0 } = await import('../src/levels/level0.ts');
const { startOnFloor } = await import('../src/game/waves.ts');
const { step } = await import('../src/game/update.ts');
const { idleInput } = await import('../src/game/inputs.ts');
const { LAST_FLOOR, LAST_GROUND_ZERO, actOf } = await import('../src/game/tower.ts');

const HZ = 120;
const run = (s, seconds) => { for (let i = 0; i < seconds * HZ; i++) { for (const p of s.players) p.health = 100; step(s, [idleInput(0)], 1 / HZ); } };
const s = createGameState(level0);
startOnFloor(s, LAST_FLOOR);
assert.equal(LAST_FLOOR, LAST_GROUND_ZERO + 1);
assert.equal(s.level.name, 'Lift Window');
assert.equal(actOf(s.floor), 12);
assert.equal(flowOf(s.level).kind, 'sweep');
assert.ok(!s.level.exitGate, 'the last floor ends through its lift');
assert.deepEqual(s.level.steps.map((x) => x.kind), ['breakers', 'charge', 'carry']);
assert.equal(s.survivors.length, 3, 'three in the hangar queue');
const p = s.players[0];
const inside = (b, x, z) => Math.abs(b.position.x - x) < b.size.x / 2 && Math.abs(b.position.z - z) < b.size.z / 2 && b.position.y + b.size.y / 2 > 0.3;
assert.ok(!s.level.boxes.some((b) => inside(b, p.x, p.z)), 'spawn is clear');
const carry = s.level.steps[2];
for (const item of carry.items) assert.ok(!s.level.boxes.some((b) => inside(b, item.x, item.z)), 'each case is reachable');
assert.ok(!s.level.boxes.some((b) => inside(b, carry.dropoff.x, carry.dropoff.z)), 'the drop-off is clear');
for (const d of s.level.residents) assert.ok(!s.level.boxes.some((b) => inside(b, d.x, d.z)), `dead at ${d.x},${d.z} is clear`);
run(s, 5);
console.log('ok', s.level.name, s.waves.phase);
