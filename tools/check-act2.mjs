// Act 2, the descent: the sweep floors with their sleeping dead, the transfer file then the generator,
// the notes you can read and the run log, the camera glimpse, the brute that leads the lobby's last wave
// and the garage's battery. Runs the game headless.
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
const { interactionTarget, useAction } = await import('../src/game/doors.ts');
const { cardFor, nearestNote } = await import('../src/game/notes.ts');
const { radioLine } = await import('../src/render/radio.ts');
const { ROOF, waveSize } = await import('../src/game/tower.ts');
const { SCIENTIST } = await import('../src/levels/voices.ts');

const HZ = 120;
const tick = (s) => step(s, [idleInput(0)], 1 / HZ);
const run = (s, seconds, at) => { for (let i = 0; i < seconds * HZ; i++) { for (const p of s.players) { p.health = 100; if (at) Object.assign(p, at); } tick(s); } };
const [ROOF_TOP, OFFICE, RECORDS, EXEC, SERVERS, LOBBY, GARAGE] = [1, 2, 3, 4, 5, 6, 7].map((k) => ROOF + k);

const begin = (floor) => { const s = createGameState(level0); startOnFloor(s, floor); return s; };

// ---- The roof: still a siege, the intercom on the start --------------------------------------------
{
  const s = begin(ROOF_TOP);
  assert.equal(s.level.name, 'Tower roof');
  assert.equal(flowOf(s.level).kind, 'siege');
  assert.equal(radioLine({ ...s, tick: s.waves.arrivedTick + 10 * HZ }).speaker, SCIENTIST, 'his first call');
}

// ---- 41: a sweep, sleepers, an evacuation notice -------------------------------------------------
{
  const s = begin(OFFICE);
  assert.equal(s.level.name, 'Floor 41');
  assert.equal(flowOf(s.level).kind, 'sweep');
  assert.equal(s.waves.phase, 'search', 'no waves: the floor is open');
  const sleepers = s.zombies.filter((z) => z.dormant);
  assert.ok(sleepers.length >= 10, `${sleepers.length} sleepers`);
  run(s, 20);
  assert.ok(s.zombies.filter((z) => z.dormant).length >= sleepers.length - 1, 'they stay asleep for a quiet crew');
  // The notice: stand by it and use.
  const note = s.level.notes[0];
  Object.assign(s.players[0], { x: note.position.x + 0.8, z: note.position.z });
  assert.equal(nearestNote(s, s.players[0]), 0);
  assert.deepEqual(interactionTarget(s, s.players[0]), { kind: 'note', index: 0 });
  assert.equal(s.log.length, 0);
  useAction(s, s.players[0]);
  assert.equal(s.log.length, 1);
  assert.equal(s.log[0].title, 'Evacuation notice');
  assert.ok(cardFor(s, s.players[0]), 'the card is up');
  assert.equal(s.read[0], s.tick);
  // Reading again does not log it twice, and walking off puts the card away.
  useAction(s, s.players[0]);
  assert.equal(s.log.length, 1);
  Object.assign(s.players[0], { x: 0, z: 0 });
  assert.equal(cardFor(s, s.players[0]), null, 'walking away puts it down');
  console.log('floor 41:', sleepers.length, 'sleepers');
}

// ---- 34: the file, then the generator --------------------------------------------------------------
{
  const s = begin(RECORDS);
  assert.equal(s.level.name, 'Floor 34');
  assert.equal(flowOf(s.level).kind, 'sweep');
  assert.equal(s.level.objective.kind, 'keycard');
  assert.equal(s.level.objective.label, 'Transfer file');
  useObjective(s, s.players[0], { kind: 'objective' });
  assert.equal(s.objective.step, 1);
  assert.equal(s.level.objective.kind, 'charge');
  // The hold brings them in: a trickle where there was none.
  s.zombies = [];
  s.waves.phase = 'search';
  Object.assign(s.players[0], { x: 10, z: 10.4 });
  useObjective(s, s.players[0], { kind: 'device' });
  assert.equal(s.waves.phase, 'hold');
  run(s, 12, { x: 10, z: 8 });
  assert.ok(s.zombies.length > 0, 'the generator brings them');
  run(s, 40, { x: 10, z: 8 });
  assert.ok(s.objective.done, 'the floor is done');
  assert.equal(s.waves.phase, 'lift', 'the lift opens');
  assert.equal(s.log.length, 0);
  Object.assign(s.players[0], { x: -12.6 + 0.8, z: 1.6 });
  useAction(s, s.players[0]);
  assert.equal(s.log[0].title, 'Transfer order');
}

// ---- 27: the clue floor ------------------------------------------------------------------------------
{
  const s = begin(EXEC);
  assert.equal(s.level.name, 'Floor 27');
  assert.equal(flowOf(s.level).kind, 'sweep');
  assert.ok(s.zombies.filter((z) => z.dormant).length >= 12);
  assert.equal(s.level.notes[0].title, 'Board memo');
  const quiet = radioLine({ ...s, tick: s.waves.arrivedTick + 8 * HZ });
  assert.equal(quiet.speaker, SCIENTIST);
  assert.match(quiet.text, /Say it again/);
  useObjective(s, s.players[0], { kind: 'objective' });
  assert.ok(s.objective.done);
}

// ---- 20: the camera glimpse ---------------------------------------------------------------------------
{
  const s = begin(SERVERS);
  assert.equal(s.level.name, 'Floor 20');
  assert.equal(flowOf(s.level).kind, 'siege');
  assert.equal(radioLine({ ...s, tick: s.waves.arrivedTick + 2 * HZ }).feed, undefined, 'no monitor yet');
  run(s, 8);
  for (let i = 0; i < 3; i++) useObjective(s, s.players[0], { kind: 'breaker', index: i });
  assert.ok(s.objective.done);
  const line = radioLine({ ...s, tick: s.objective.doneTick + 2 * HZ });
  assert.ok(line.feed && /CAM/.test(line.feed), 'the monitor shows on the feed');
  assert.match(line.text, /monitor/);
  assert.equal(radioLine({ ...s, tick: s.objective.doneTick + 9 * HZ }).feed, undefined, 'and goes off again');
}

// ---- The lobby: a brute leads the last wave --------------------------------------------------------------
{
  const s = begin(LOBBY);
  assert.equal(s.level.name, 'Lobby');
  assert.equal(s.level.leads, 'brute');
  s.waves.number = 4;
  s.waves.phase = 'active';
  s.waves.toSpawn = waveSize(s.floor, 4);
  s.waves.spawnTimer = 0;
  s.zombies = [];
  run(s, 3);
  assert.ok(s.zombies.some((z) => z.kind === 'brute'), 'a brute at the head of the last wave');
}

// ---- The garage: breakers, then the battery to the lift ------------------------------------------------------
{
  const s = begin(GARAGE);
  assert.equal(s.level.name, 'Tower garage');
  assert.equal(s.level.objective.kind, 'breakers');
  for (let i = 0; i < 3; i++) useObjective(s, s.players[0], { kind: 'breaker', index: i });
  assert.equal(s.objective.step, 1);
  assert.equal(s.level.objective.kind, 'carry');
  assert.equal(s.level.objective.label, 'Car battery');
  assert.equal(s.objective.items.length, 1);
  useObjective(s, s.players[0], { kind: 'case', index: 0 });
  useObjective(s, s.players[0], { kind: 'deliver' });
  assert.ok(s.objective.done);
}
console.log('ok');
