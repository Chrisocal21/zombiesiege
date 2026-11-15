// Act 7, False Instructions: three pieces of evidence in order; a big cluster of dead round the tower.
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
const run = (s, seconds) => { for (let i = 0; i < seconds * HZ; i++) { for (const p of s.players) p.health = 100; step(s, [idleInput(0)], 1 / HZ); } };
const s = createGameState(level0);
startOnFloor(s, LAST_ROADS + 2);
assert.equal(s.level.name, 'False Instructions');
assert.equal(actOf(s.floor), 7);
assert.deepEqual(s.level.steps.map((x) => x.kind), ['keycard', 'breakers', 'charge']);
const p = s.players[0];
const inside = (b, x, z) => Math.abs(b.position.x - x) < b.size.x / 2 && Math.abs(b.position.z - z) < b.size.z / 2 && b.position.y + b.size.y / 2 > 0.3;
assert.ok(!s.level.boxes.some((b) => inside(b, p.x, p.z)), 'spawn is clear');
for (const d of s.level.residents) assert.ok(!s.level.boxes.some((b) => inside(b, d.x, d.z)), `dead at ${d.x},${d.z} is clear`);
const k = s.level.steps[0].position;
Object.assign(p, { x: k.x + 1.2, z: k.z, y: 0 });
useObjective(s, p, { kind: 'objective' });
run(s, 2);
assert.equal(s.objective.step, 1, 'log read: on to the cabinets');
useObjective(s, p, { kind: 'breaker', index: 0 });
useObjective(s, p, { kind: 'breaker', index: 1 });
run(s, 2);
assert.equal(s.objective.step, 2, 'loop cut: on to the rack');
const d = s.level.steps[2].device.position;
Object.assign(p, { x: d.x, z: d.z + 2 });
useObjective(s, p, { kind: 'device' });
s.zombies = [];
run(s, 40);
assert.ok(s.objective.done, 'correction sent');
console.log('ok', s.level.name);
