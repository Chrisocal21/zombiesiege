// Act 7, The Silence: three pieces of evidence in order; a big cluster of dead round the tower.
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
startOnFloor(s, LAST_ROADS + 1);
assert.equal(s.level.name, 'The Silence');
assert.equal(actOf(s.floor), 7);
assert.equal(flowOf(s.level).kind, 'sweep');
assert.equal(s.level.steps.length, 3);
assert.ok(s.level.residents.length >= 10, 'a substantial cluster');
const p = s.players[0];
const inside = (b, x, z) => Math.abs(b.position.x - x) < b.size.x / 2 && Math.abs(b.position.z - z) < b.size.z / 2 && b.position.y + b.size.y / 2 > 0.3;
assert.ok(!s.level.boxes.some((b) => inside(b, p.x, p.z)), 'spawn is clear');
for (const d of s.level.residents) assert.ok(!s.level.boxes.some((b) => inside(b, d.x, d.z)), `dead at ${d.x},${d.z} is clear`);
for (const [i, st] of s.level.steps.entries()) {
  assert.equal(s.objective.step, i);
  Object.assign(p, { x: st.position.x, z: st.position.z + 1.2, y: 0 });
  useObjective(s, p, { kind: 'objective' });
  run(s, 2);
}
assert.ok(s.objective.done, 'the list is found');
console.log('ok', s.level.name);
