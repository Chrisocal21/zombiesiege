// Lives belong to each player. Going down, being revived, getting up alone, bleeding out, coming back
// at a quiet moment, being out of the run, and the run ending when nobody is left standing.
// Practice games (started from the floor list) start the wave again instead. Runs the game headless.
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
const { addPlayer } = await import('../src/game/roster.ts');
const { everyoneInCab } = await import('../src/game/elevator.ts');
const { FIRST_FLOOR } = await import('../src/game/tower.ts');
const { config } = await import('../src/config.ts');

const HZ = config.ticksPerSecond;
const down = config.player.down;
const tick = (s, inputs) => step(s, s.players.map((p) => inputs?.[p.id] ?? idleInput(p.id)), 1 / HZ);
const run = (s, seconds, inputs) => { for (let i = 0; i < Math.round(seconds * HZ); i++) tick(s, inputs); };
const use = (id) => ({ ...idleInput(id), use: true });
// A run (not practice) on a siege floor, mid-wave, with nothing about.
function game(players, floor = 1) {
  const s = createGameState(level0);
  s.players = [];
  s.points = [];
  for (let id = 0; id < players; id++) addPlayer(s, id);
  startOnFloor(s, floor);
  s.practice = false;
  s.zombies = [];
  // Mid-wave, with one still to come a long way off, so the wave neither ends nor brings anyone.
  s.waves.phase = 'active';
  s.waves.toSpawn = 1;
  s.waves.spawnTimer = 1e9;
  return s;
}
const fell = (p) => { p.health = 0; };

// ---- Solo: getting up alone costs a life, and the last life cannot -------------------------------
{
  const s = game(1);
  const p = s.players[0];
  assert.equal(p.lives, 3);
  assert.equal(s.practice, false);
  fell(p);
  tick(s);
  assert.ok(p.downTick >= 0, 'down, not dead');
  assert.notEqual(s.waves.phase, 'lost', 'alone with lives to spare is not the end');
  // Crawling is slow, and there is no reloading.
  const ammo = p.ammo;
  p.ammo = 0;
  tick(s, { 0: { ...idleInput(0), reload: true } });
  assert.equal(p.reloadLeft, 0, 'no reload while down');
  p.ammo = ammo;
  const x0 = p.x, z0 = p.z;
  run(s, 1, { 0: { ...idleInput(0), moveForward: 1 } });
  const crawled = Math.hypot(p.x - x0, p.z - z0);
  assert.ok(crawled > 0.3 && crawled < 2, `crawling (${crawled.toFixed(2)} m in a second)`);
  // Getting up takes a while and a life.
  tick(s, { 0: use(0) });
  assert.ok(p.revive, 'getting up');
  run(s, down.selfReviveSeconds - 0.5);
  assert.equal(p.health, 0, 'not yet');
  run(s, 0.6);
  assert.equal(p.health, down.reviveHealth, 'up again');
  assert.equal(p.lives, 2, 'for a life');
  // Down to the last life: no getting up, and the run is over.
  p.lives = 1;
  fell(p);
  tick(s);
  assert.equal(s.waves.phase, 'lost', 'alone on the last life, the run is over');
  console.log('solo ok');
}

// ---- Bleeding out alone ----------------------------------------------------------------------------
{
  const s = game(1);
  const p = s.players[0];
  fell(p);
  run(s, down.bleedSeconds + 0.1);
  assert.ok(p.out, 'bled out');
  assert.equal(p.lives, 2);
  assert.equal(s.waves.phase, 'lost', 'and with nobody standing the run is over');
  console.log('bleed solo ok');
}

// ---- Two players: a revive is free, takes a few still seconds, and stops if the helper moves -------
{
  const s = game(2);
  const [a, b] = s.players;
  Object.assign(b, { x: a.x + 1, z: a.z });
  fell(a);
  tick(s);
  assert.notEqual(s.waves.phase, 'lost', 'one standing');
  assert.equal(s.players.length, 2);
  // A teammate in co-op cannot get up alone.
  tick(s, { 0: use(0) });
  assert.equal(a.revive, null, 'no getting up alone in co-op');
  tick(s, { 1: use(1) });
  assert.ok(b.revive && b.revive.target === a.id, 'b kneels over a');
  run(s, 1);
  tick(s, { 1: { ...idleInput(1), moveForward: 1 } });
  assert.equal(b.revive, null, 'moving stops it');
  tick(s, { 1: use(1) });
  run(s, down.reviveSeconds + 0.05);
  assert.equal(a.health, down.reviveHealth, 'back up');
  assert.equal(a.lives, 3, 'a revive costs no life');
  console.log('revive ok');
}

// ---- Bleeding out with a teammate standing: back at the next break; out of lives, out of the run ---
{
  const s = game(2);
  const [a, b] = s.players;
  fell(a);
  run(s, down.bleedSeconds + 0.1);
  assert.ok(a.out && a.lives === 2, 'a bled out and lost a life');
  assert.notEqual(s.waves.phase, 'lost', 'b is still standing');
  // The wave ends: a is back beside b.
  s.waves.phase = 'break';
  s.waves.timer = 30;
  tick(s);
  assert.ok(!a.out && a.health === config.player.maxHealth, 'back for the next wave');
  assert.ok(Math.hypot(a.x - b.x, a.z - b.z) < 0.01, 'beside b');
  // On the last life, bleeding out is out of the run, across floors too.
  s.waves.phase = 'active';
  a.lives = 1;
  fell(a);
  run(s, down.bleedSeconds + 0.1);
  assert.ok(a.out && a.lives === 0);
  s.waves.phase = 'break';
  tick(s);
  assert.ok(a.out, 'no coming back with no lives');
  // The lift does not wait for someone out of the run, but does wait for someone down.
  s.waves.phase = 'lift';
  const lift = s.level.elevator;
  const cab = { x: lift.position.x - lift.normal.x * (0.25 + lift.cabDepth / 2), z: lift.position.z - lift.normal.z * (0.25 + lift.cabDepth / 2) };
  Object.assign(b, cab);
  assert.ok(everyoneInCab(s), 'only b has to be in');
  console.log('bleed co-op ok');
}

// ---- Both down: the run is over ---------------------------------------------------------------------
{
  const s = game(2);
  for (const p of s.players) fell(p);
  tick(s);
  assert.equal(s.waves.phase, 'lost');
  // Nothing moves on after.
  run(s, 2);
  assert.equal(s.waves.phase, 'lost');
  console.log('wipe ok');
}

// ---- The run is only the run from its start: a floor from the list is practice ----------------------
{
  const s = createGameState(level0);
  startOnFloor(s, FIRST_FLOOR);
  assert.equal(s.practice, false, 'from P01 is a run');
  startOnFloor(s, 1);
  assert.equal(s.practice, true, 'anywhere else is practice');
  s.zombies = [];
  s.waves.phase = 'active';
  for (const p of s.players) Object.assign(p, { health: 0, lives: 1 });
  tick(s);
  assert.notEqual(s.waves.phase, 'lost');
  assert.ok(s.players.every((p) => p.health > 0), 'practice: the wave starts again');
  console.log('practice ok');
}
console.log('ok');

// ---- Wave sizes: grow with depth, crew and time; the later acts only a little past the hospital roof --
{
  const { waveSize, wavesOnFloor, maxAlive } = await import('../src/game/tower.ts');
  assert.deepEqual([waveSize(0, 1), waveSize(0, 5)], [4, 17], 'the garage is the base table');
  for (const floor of [10, 12, 16, 20]) { const last = waveSize(floor, wavesOnFloor(floor)); assert.ok(last <= 62, `floor ${floor} tops out near 60 (${last})`); }
  assert.ok(waveSize(16, 5, 4) > 2.5 * waveSize(16, 5, 1), 'four players face well over double');
  assert.ok(maxAlive(4) > maxAlive(1), 'a fuller room holds more of them at once');
  console.log('wave sizes ok');
}

// ---- Waiting around brings more ---------------------------------------------------------------------
{
  const s = game(1);
  s.waves.phase = 'active';
  s.waves.toSpawn = 0;
  s.zombies = [];
  const { spawnZombie } = await import('../src/game/zombies.ts');
  spawnZombie(s, s.players[0].x + 40, s.players[0].z, null);
  s.zombies[0].dormant = true;
  s.frozen = false;
  const before = s.waves.toSpawn;
  run(s, config.waves.lingerSeconds + 1);
  assert.ok(s.waves.lingered >= 1 && s.waves.toSpawn + s.zombies.length > before + 1, 'a group came in after the wave dragged on');
  console.log('linger ok');
}

// ---- Heads: two shots for a walker, not one ----------------------------------------------------------
{
  const { headDamage } = await import('../src/game/zombies.ts');
  const walker = { kind: 'walker', health: config.zombie.maxHealth };
  assert.ok(headDamage(walker, config.pistol.damage) < walker.health, 'one pistol head shot does not kill a walker');
  assert.ok(2 * headDamage(walker, config.pistol.damage) >= walker.health, 'two do');
  console.log('heads ok');
}
console.log('ok');
