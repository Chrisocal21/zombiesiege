import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { extname } from 'node:path';
registerHooks({ resolve(s, c, next) {
  if (s.startsWith('.') && !extname(s)) { try { return next(`${s}.ts`, c); } catch (e) { if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e; return next(`${s}/index.ts`, c); } }
  return next(s, c); } });
const { createGameState } = await import('../src/game/state.ts');
const { level0 } = await import('../src/levels/level0.ts');
const { startOnFloor } = await import('../src/game/waves.ts');
const { step } = await import('../src/game/update.ts');
const { idleInput } = await import('../src/game/inputs.ts');
const { FIRST_FLOOR, stopAt, storeyLabel, crowdAt } = await import('../src/game/tower.ts');

assert.equal(FIRST_FLOOR, -5);
assert.equal(stopAt(-5).name, 'Breakdown');
assert.equal(stopAt(-1).name, 'Final Push');
assert.equal(storeyLabel(-5), 'MI 9');
for (let f = -5; f <= -1; f++) assert.ok(crowdAt(f).length > 0);

const s = createGameState(level0);
startOnFloor(s, -5);
assert.equal(s.level.name, 'Breakdown');
const run = (seconds, stop) => { for (let i = 0; i < seconds * 120; i++) { step(s, [idleInput(0)], 1 / 120); if (stop?.()) return true; } return false; };
assert.ok(run(60, () => s.waves.phase === 'active' && s.zombies.length > 2), 'a wave starts at the Breakdown');
console.log('Breakdown wave, zombies', s.zombies.length);

for (const floor of [-5, -4, -3, -2, -1]) {
  assert.equal(s.floor, floor);
  s.zombies = []; s.objective.done = true; s.waves.phase = 'lift'; s.lift.open = true;
  const e = s.level.elevator;
  Object.assign(s.players[0], { x: e.position.x - e.normal.x * 1.7, z: e.position.z - e.normal.z * 1.7, health: 100 });
  assert.ok(run(10, () => s.floor === floor + 1), 'went through the gate to the next floor');
  console.log('reached', s.level.name, 'phase', s.waves.phase);
}
assert.equal(s.floor, 0);
assert.equal(s.level.name, level0.name);
console.log('ok');
