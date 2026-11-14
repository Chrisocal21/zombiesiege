// A floor whose objective comes in steps: the hidden lab, breakers to the freezer and then the cryo
// carriers to the lift. Steps finish in order, going down does not undo one already done, and the
// radio follows each step and area. Runs the game headless.
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { extname } from 'node:path';
registerHooks({ resolve(s, c, next) {
  if (s.startsWith('.') && !extname(s)) { try { return next(`${s}.ts`, c); } catch (e) { if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e; return next(`${s}/index.ts`, c); } }
  return next(s, c); } });
const { createGameState, stepDoneTick, circuitLive } = await import('../src/game/state.ts');
const { level0 } = await import('../src/levels/level0.ts');
const { startOnFloor } = await import('../src/game/waves.ts');
const { step } = await import('../src/game/update.ts');
const { idleInput } = await import('../src/game/inputs.ts');
const { useObjective, fittingFront } = await import('../src/game/objectives.ts');
const { radioLine } = await import('../src/render/radio.ts');
const { SCIENTIST, CREW } = await import('../src/levels/voices.ts');

const HZ = 120;
const tick = (s) => step(s, [idleInput(0)], 1 / HZ);
const run = (s, seconds) => { for (let i = 0; i < seconds * HZ; i++) { for (const p of s.players) p.health = 100; tick(s); } };

const s = createGameState(level0);
startOnFloor(s, 15);
assert.equal(s.level.name, 'Hidden lab');
assert.equal(s.objective.step, 0);
assert.equal(s.level.objective.kind, 'breakers', 'the first step is the freezer breakers');
assert.ok(s.players[0].flashlight, 'the power is out, so the light is on');
assert.equal(s.waves.phase, 'prep', 'the lab is still a siege');
assert.equal(radioLine({ ...s, tick: s.waves.arrivedTick + 2 * HZ }).speaker, SCIENTIST, 'the scientist talks the crew in');
// Past the arrival lines before any of the work is done.
run(s, 9);

// The breakers: the lights come back one circuit at a time, and the last one moves to the next step.
const breakers = s.level.objective;
useObjective(s, s.players[0], { kind: 'breaker', index: 0 });
useObjective(s, s.players[0], { kind: 'breaker', index: 1 });
assert.equal(s.objective.step, 0);
assert.ok(circuitLive(s, 0) && !circuitLive(s, 2), 'circuit by circuit');
useObjective(s, s.players[0], { kind: 'breaker', index: 2 });
assert.equal(s.objective.step, 1, 'the carriers are next');
assert.equal(s.objective.done, false, 'the floor is not done yet');
assert.equal(s.level.objective.kind, 'carry');
assert.equal(s.objective.items.length, 2);
assert.equal(s.objective.past.length, 1);
assert.ok(s.objective.past[0].thrown.every((t) => t >= 0), 'how the breakers were left is kept');
assert.ok(circuitLive(s, 2), 'the lights stay on');
assert.ok(stepDoneTick(s, 0) >= 0 && stepDoneTick(s, 1) < 0);
const stepTick = stepDoneTick(s, 0);
assert.equal(radioLine({ ...s, tick: stepTick + 1.5 * HZ }).speaker, SCIENTIST, 'the scientist on the freezer');
assert.match(radioLine({ ...s, tick: stepTick + 1.5 * HZ }).text, /cryo carriers/);

// Walking into cold storage is heard once.
const cold = s.level.cues.findIndex((cue) => cue.on === 'area');
run(s, 7);
Object.assign(s.players[0], { x: 12, z: -7 });
run(s, 0.2);
assert.ok(s.heard[cold] >= 0, 'the area cue fired');
const heardAt = s.heard[cold];
assert.equal(radioLine({ ...s, tick: heardAt + 1 * HZ }).speaker, CREW);
Object.assign(s.players[0], { x: -12, z: 0 });
run(s, 0.2);
Object.assign(s.players[0], { x: 12, z: -7 });
run(s, 0.2);
assert.equal(s.heard[cold], heardAt, 'and only the first time');

// Everyone down while carrying: a life goes, the carrier is put down where it was, the breakers stay done.
useObjective(s, s.players[0], { kind: 'case', index: 0 });
assert.equal(s.players[0].carrying, 0);
s.waves.phase = 'active';
s.waves.toSpawn = 3;
for (const p of s.players) Object.assign(p, { health: 0, lives: 1 });
tick(s);
assert.ok(s.practice && s.players.every((p) => p.health > 0 && p.lives === 1), 'practice: everyone is back up, no life lost');
assert.equal(s.objective.step, 1, 'going down does not undo the breakers');
assert.equal(s.level.objective.kind, 'carry');
assert.equal(s.players[0].carrying, -1, 'the carrier is put down');
assert.ok(Math.hypot(s.objective.items[0].x - 12, s.objective.items[0].z + 7) < 1, 'where it was dropped');

// Both carriers to the lift: the floor is done.
for (const index of [0, 1]) {
  useObjective(s, s.players[0], { kind: 'case', index });
  useObjective(s, s.players[0], { kind: 'deliver' });
}
assert.ok(s.objective.done, 'the floor is done');
assert.ok(stepDoneTick(s, 1) >= 0);
assert.equal(radioLine({ ...s, tick: s.objective.doneTick + 1 * HZ }).speaker, SCIENTIST);

// Starting the floor again begins at the first step.
startOnFloor(s, 15);
assert.equal(s.objective.step, 0);
assert.equal(s.level.objective, breakers.kind === 'breakers' ? s.level.steps[0] : null);
assert.equal(s.objective.past.length, 0);

// A floor with one objective is one step, as before.
startOnFloor(s, 14);
assert.equal(s.objective.step, 0);
assert.equal(s.level.objective.kind, 'keycard');
useObjective(s, s.players[0], { kind: 'objective' });
assert.ok(s.objective.done);
assert.equal(s.objective.past.length, 0);
assert.ok(fittingFront);
console.log('ok');
