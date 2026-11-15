// Act 7, High Ground: the relay. Two power cabinets, then a held antenna alignment, then the run ends here.
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
const { useObjective } = await import('../src/game/objectives.ts');
const { LAST_ROADS, actOf } = await import('../src/game/tower.ts');

const HZ = 120;
const run = (s, seconds, at) => { for (let i = 0; i < seconds * HZ; i++) { for (const p of s.players) { p.health = 100; if (at) Object.assign(p, at); } step(s, [idleInput(0)], 1 / HZ); } };
const s = createGameState(level0);
startOnFloor(s, LAST_ROADS + 2);
assert.equal(s.level.name, 'High Ground');
assert.equal(actOf(s.floor), 7);
assert.equal(flowOf(s.level).kind, 'sweep');
assert.equal(s.level.steps.length, 2);
const inside = (b, x, z) => Math.abs(b.position.x - x) < b.size.x / 2 && Math.abs(b.position.z - z) < b.size.z / 2 && b.position.y + b.size.y / 2 > 0.3;
const p = s.players[0];
assert.ok(!s.level.boxes.some((b) => inside(b, p.x, p.z)), 'spawn is clear');
assert.ok(s.level.boxes.some((b) => inside(b, 10, -6)), 'the dish hut is there');
assert.equal(s.objective.step, 0);
useObjective(s, p, { kind: 'breaker', index: 0 });
useObjective(s, p, { kind: 'breaker', index: 1 });
run(s, 2);
assert.equal(s.objective.step, 1, 'both cabinets thrown: on to the transfer');
const d = s.level.steps[1].device.position;
Object.assign(p, { x: d.x, z: d.z + 2 });
useObjective(s, p, { kind: 'device' });
s.zombies = [];
run(s, 58, { x: d.x, z: d.z + 2 });
assert.ok(s.objective.done, 'the antenna is aligned');
// The choice: a flashlight calls the dead, the dark does not.
const quiet = createGameState(level0); startOnFloor(quiet, LAST_ROADS + 2);
const lit = createGameState(level0); startOnFloor(lit, LAST_ROADS + 2);
for (const g of [quiet, lit]) { g.zombies = []; g.players[0].flashlight = g === lit; }
run(quiet, 60); run(lit, 60);
assert.ok(lit.zombies.length > quiet.zombies.length, `flashlight on calls more (${lit.zombies.length} against ${quiet.zombies.length})`);
console.log('ok', s.level.name);
