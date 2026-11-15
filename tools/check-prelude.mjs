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
// P01 is quiet at first: the road's own dead stand asleep, nothing comes, and nothing is a wave.
assert.equal(s.waves.phase, 'search');
const residents = s.zombies.length;
assert.ok(residents >= 5 && s.zombies.every((z) => z.dormant), 'the dead stand asleep on the road');
run(20);
assert.equal(s.zombies.length, residents, 'quiet play brings nothing');
// The radio is found: the call comes through and the dead come out of the farm tracks behind the crew.
s.objective.done = true;
assert.ok(run(40, () => s.zombies.length > residents + 2), 'once the radio is found the horde comes');
console.log('Breakdown: quiet, then the escape; zombies', s.zombies.length);

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

// P03: the exit is only open a while. Once the last control is thrown a countdown runs; if it runs out the gate
// shuts, the controls come back off, and more of them are called in.
{
  const t = createGameState(level0);
  startOnFloor(t, -3);
  assert.equal(t.level.name, 'Checkpoint');
  assert.ok(t.level.exitTimer > 0);
  t.zombies = []; t.waves.phase = 'search'; t.objective.done = true;
  step(t, [idleInput(0)], 1 / 120);
  assert.equal(t.waves.phase, 'lift');
  assert.ok(t.lift.open && t.waves.timer > 0, 'the gate is open and the clock runs');
  Object.assign(t.players[0], { x: -26, z: 0, health: 100 });
  for (let i = 0; i < (t.level.exitTimer + 2) * 120; i++) { t.players[0].health = 100; step(t, [idleInput(0)], 1 / 120); if (t.waves.phase !== 'lift') break; }
  assert.equal(t.waves.phase, 'search', 'too slow: back to finding the controls');
  assert.ok(!t.lift.open && !t.objective.done, 'the gate shut and the controls are off again');
  assert.ok(t.waves.reinforce > 0, 'and more were called in');
  console.log('timed exit ok');
}

// P04: four people hiding in Casa Rosa's kitchen. Spoken to, they follow; led out through the back door to the
// van in the alley, they are away, the points come in and the log remembers them. Nothing waits on it.
{
  const { useAction } = await import('../src/game/doors.ts');
  const t = createGameState(level0);
  startOnFloor(t, -2);
  assert.equal(t.level.name, 'Commercial District');
  assert.equal(t.survivors.length, 4);
  assert.ok(t.survivors.every((s) => s.mode === 'hiding'));
  // Their own dead are asleep in the restaurant and the alley; clear them for the walk.
  t.zombies = [];
  t.waves.phase = 'search';
  const p = t.players[0];
  Object.assign(p, { x: 30.5, z: 16.8, health: 100 });
  useAction(t, p);
  assert.ok(t.survivors.every((s) => s.mode === 'following'), 'they come out of hiding');
  // The player walks out the back door and down the alley; they follow.
  const route = [[30.2, 18.6], [30.2, 21.5], [25, 21.8], [22.5, 21.8]];
  const before = t.points[0];
  for (const [x, z] of route) {
    for (let i = 0; i < 4 * 120; i++) { Object.assign(p, { x, z, health: 100 }); t.zombies = []; step(t, [idleInput(0)], 1 / 120); }
  }
  for (let i = 0; i < 12 * 120 && t.rescueTick < 0; i++) { Object.assign(p, { x: 22.5, z: 21.8, health: 100 }); t.zombies = []; step(t, [idleInput(0)], 1 / 120); }
  assert.ok(t.survivors.every((s) => s.mode === 'away'), `all four got away (${t.survivors.map((s) => s.mode)})`);
  assert.equal(t.rescued, 4);
  assert.ok(t.points[0] >= before + 4 * t.level.rescue.points, 'points for each');
  assert.ok(t.log.some((entry) => entry.title === 'Casa Rosa'), 'the log remembers them');
  assert.ok(!t.objective.done, 'and it was never needed to go on');
  console.log('restaurant rescue ok');
}
