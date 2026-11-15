// Act 11, The Last Record: a dark data hall where light calls the dead; the final log, then a held upload.
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
const { LAST_GROUND_ZERO, actOf } = await import('../src/game/tower.ts');

const HZ = 120;
const run = (s, seconds) => { for (let i = 0; i < seconds * HZ; i++) { for (const p of s.players) p.health = 100; step(s, [idleInput(0)], 1 / HZ); } };
const s = createGameState(level0);
startOnFloor(s, LAST_GROUND_ZERO);
assert.equal(s.level.name, 'The Last Record');
assert.equal(actOf(s.floor), 11);
assert.equal(flowOf(s.level).kind, 'sweep');
assert.ok(s.level.lightsCall, 'light calls the dead');
assert.ok(s.level.exitGate, 'the maintenance route leads on');
assert.deepEqual(s.level.steps.map((x) => x.kind), ['keycard', 'charge']);
const p = s.players[0];
const inside = (b, x, z) => Math.abs(b.position.x - x) < b.size.x / 2 && Math.abs(b.position.z - z) < b.size.z / 2 && b.position.y + b.size.y / 2 > 0.3;
assert.ok(!s.level.boxes.some((b) => inside(b, p.x, p.z)), 'spawn is clear');
for (const d of s.level.residents) assert.ok(!s.level.boxes.some((b) => inside(b, d.x, d.z)), `dead at ${d.x},${d.z} is clear`);
// Step one: the log.
Object.assign(p, { x: 0, z: 1.2, y: 0 });
useObjective(s, p, { kind: 'objective' });
run(s, 2);
assert.equal(s.objective.step, 1, 'the log is found: on to the upload');
// Step two: the held upload.
const d = s.level.steps[1].device.position;
Object.assign(p, { x: d.x, z: d.z + 2 });
useObjective(s, p, { kind: 'device' });
s.zombies = [];
run(s, 45);
assert.ok(s.objective.done, 'the record is out');
console.log('ok', s.level.name);
