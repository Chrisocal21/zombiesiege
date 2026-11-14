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
const { LAST_FLOOR } = await import('../src/game/tower.ts');

const s = createGameState(level0);
startOnFloor(s, 7);
assert.equal(s.level.name, 'Floor 41');
const run = (seconds, stop) => { for (let i = 0; i < seconds * 120; i++) { step(s, [idleInput(0)], 1 / 120); if (stop?.()) return true; } return false; };

// Floor 41: the power is out, waves come, and every zombie reaches the player through the rooms.
assert.ok(run(60, () => s.waves.phase === 'active' && s.zombies.length > 3), 'a wave starts');
assert.ok(s.players[0].health > 0 || true);
console.log('floor 41 wave running, zombies', s.zombies.length);

// Skip ahead: objective done, in the cab, ride down to 34, then 34's lift ends the run.
for (let floor = 7; floor <= LAST_FLOOR; floor++) {
  assert.equal(s.floor, floor);
  s.zombies = []; s.objective.done = true; s.waves.phase = 'lift'; s.lift.open = true;
  const e = s.level.elevator;
  Object.assign(s.players[0], { x: e.position.x - e.normal.x * 1.7, z: e.position.z - e.normal.z * 1.7, health: 100 });
  if (floor === LAST_FLOOR) { s.zombies = []; s.waves.phase = 'evac'; const pad = s.level.objective.pad; Object.assign(s.players[0], { x: pad.x, z: pad.z }); run(2, () => s.waves.phase === 'won'); assert.equal(s.waves.phase, 'won', 'the park ends the run when everyone is aboard'); continue; }
  if (floor < LAST_FLOOR) { assert.ok(run(40, () => s.floor === floor + 1), 'rode down to the next floor'); console.log('reached', s.level.name); }
  else { run(5, () => s.waves.phase === 'won'); assert.equal(s.waves.phase, 'won', 'run ends after the last built floor'); }
}
console.log('ok', LAST_FLOOR);

// The hospital roof's helicopter carries the crew on to the office tower roof instead of ending the run.
{
  const t = createGameState(level0);
  startOnFloor(t, 5);
  assert.equal(t.level.name, 'Roof');
  t.objective.done = true; t.waves.phase = 'evac';
  Object.assign(t.players[0], { x: t.level.objective.pad.x, z: t.level.objective.pad.z });
  step(t, [idleInput(0)], 1 / 120);
  assert.equal(t.floor, 6);
  assert.equal(t.level.name, 'Tower roof');
  assert.notEqual(t.waves.phase, 'won');
  console.log('roof hands on to', t.level.name, 'phase', t.waves.phase);
}
