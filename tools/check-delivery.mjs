// Act 5, The Missing Delivery: a sweep road with three cases to carry and three people to bring out.
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
const { LAST_FLOOR, actOf } = await import('../src/game/tower.ts');

const HZ = 120;
const run = (s, seconds) => { for (let i = 0; i < seconds * HZ; i++) { for (const p of s.players) p.health = 100; step(s, [idleInput(0)], 1 / HZ); } };
const s = createGameState(level0);
startOnFloor(s, LAST_FLOOR - 2);
assert.equal(s.level.name, 'The Missing Delivery');
assert.equal(actOf(s.floor), 5);
assert.equal(flowOf(s.level).kind, 'sweep');
assert.equal(s.level.objective.kind, 'carry');
assert.equal(s.level.objective.items.length, 3);
assert.equal(s.survivors.length, 3, 'three people in the bus');
assert.ok(s.level.exitGate, 'the way on is the camp gate');
const p = s.players[0];
const inside = (b, x, z) => Math.abs(b.position.x - x) < b.size.x / 2 && Math.abs(b.position.z - z) < b.size.z / 2 && b.position.y + b.size.y / 2 > 0.3;
assert.ok(!s.level.boxes.some((b) => inside(b, p.x, p.z)), 'spawn is clear');
for (const item of s.level.objective.items) assert.ok(!s.level.boxes.some((b) => inside(b, item.x, item.z)), 'each case is reachable');
assert.ok(!s.level.boxes.some((b) => inside(b, s.level.objective.dropoff.x, s.level.objective.dropoff.z)), 'the drop-off is clear');
run(s, 5);
console.log('ok', s.level.name, s.waves.phase);
