// The vault: the time lock, Patient O's two stages, the scene where the scientist steps out, Patient O
// sealed back in, and the scientist following the crew on into Act 4. Runs the game headless.
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
const { useObjective } = await import('../src/game/objectives.ts');
const { damageZombie } = await import('../src/game/zombies.ts');
const { bossZombie } = await import('../src/game/story.ts');
const { radioLine } = await import('../src/render/radio.ts');
const { LAST_VAULT } = await import('../src/game/tower.ts');
const { config } = await import('../src/config.ts');

const HZ = config.ticksPerSecond;
const VAULT = LAST_VAULT;
const tick = (s, input) => step(s, [input ?? idleInput(0)], 1 / HZ);
// Runs with the crew kept on its feet, the other dead cleared, and the player held where put.
const hold = (s, at) => () => { for (const p of s.players) p.health = 100; if (at) Object.assign(s.players[0], at); };
const run = (s, seconds, each) => { for (let i = 0; i < seconds * HZ; i++) { each?.(); tick(s); } };
const doorBox = (s) => s.level.boxes.some((box) => box.vaultDoor);

const s = createGameState(level0);
startOnFloor(s, VAULT);
assert.equal(s.level.name, 'The vault');
assert.equal(s.scientist, null, 'he is still behind the door');
assert.equal(s.level.objective.kind, 'charge');
assert.ok(doorBox(s), 'the vault door is shut');

// Skip the waves: straight to the time lock, with the player on the panel.
s.zombies = []; s.waves.phase = 'search'; s.waves.number = 5;
const panel = { x: 3.7, z: -10.6 };
Object.assign(s.players[0], panel);
useObjective(s, s.players[0], { kind: 'device' });
assert.equal(s.waves.phase, 'hold');

// Patient O comes partway through.
run(s, 21, hold(s, panel));
assert.equal(s.boss, null, 'not yet');
run(s, 2, hold(s, panel));
assert.ok(s.boss, 'Patient O arrives');
const boss = bossZombie(s);
assert.ok(boss.boss && boss.kind === 'brute' && boss.look === 'patient');
assert.equal(s.boss.stage, 1);
assert.match(radioLine({ ...s, tick: s.boss.arrivedTick + 1 * HZ }).text, /big/);

// It goes for whoever is on the panel, even with someone else nearer.
if (s.players.length < 2) s.players.push({ ...s.players[0], id: 1, x: boss.x + 2, z: boss.z });
const start = Math.hypot(boss.x - panel.x, boss.z - panel.z);
run(s, 3, () => { hold(s, panel)(); s.players[1].health = 100; });
assert.ok(Math.hypot(boss.x - panel.x, boss.z - panel.z) < start - 2, 'it makes for the panel');
s.players.pop();

// In stage 1 it cannot be brought low, and a head shot staggers it.
for (let i = 0; i < 400; i++) damageZombie(s, boss, 50, {});
assert.ok(boss.health >= s.boss.maxHealth * config.zombie.boss.stageOneFloor - 1e-6, 'it shrugs off the worst in stage 1');
assert.ok(!boss.dead);
damageZombie(s, boss, 30, { head: true });
assert.ok(boss.staggerUntil > s.tick, 'a head shot staggers it');

// The lock releases: the scene. Nobody moves, the door opens, he steps out.
run(s, 40, hold(s, panel));
assert.equal(s.objective.step, 1, 'the time lock is done');
assert.equal(s.level.objective.kind, 'contain');
assert.ok(s.scene, 'the scene plays');
assert.ok(s.scientist, 'he is there');
const frozen = { x: s.players[0].x, z: s.players[0].z, bx: boss.x, bz: boss.z };
for (let i = 0; i < 2 * HZ; i++) tick(s, { ...idleInput(0), moveForward: 1 });
assert.equal(s.players[0].x, frozen.x, 'nobody moves in the scene');
assert.equal(boss.x, frozen.bx, 'nor does it');
run(s, 2);
assert.ok(!doorBox(s), 'the vault door is open');
for (let i = 0; i < 10 * HZ && s.scene; i++) tick(s);
assert.equal(s.scene, null, 'the scene is over');
const plan = s.level.boss;
assert.equal(s.boss.stage, 2, 'enraged');
assert.ok(Math.hypot(boss.x - plan.stand.x, boss.z - plan.stand.z) < 1, 'between the crew and the lift');
assert.ok(Math.hypot(s.scientist.x - s.level.scene.to.x, s.scientist.z - s.level.scene.to.z) < 0.6, 'he is out of the vault');
assert.match(radioLine({ ...s, tick: s.tick + 1 * HZ }).text, /Drive it back/);

// A wipe in stage 2 puts it back where it stood at full strength, the scientist with the crew.
const lives = s.lives;
boss.health = 10;
for (const p of s.players) p.health = 0;
tick(s);
assert.equal(s.lives, lives - 1);
const again = bossZombie(s);
assert.ok(again && again.health === s.boss.maxHealth, 'back at full strength');
assert.ok(s.scientist, 'he is still with them');

// Beaten down, it falls back into the vault, and the door is shut on it.
s.zombies = s.zombies.filter((zombie) => zombie.boss);
for (let i = 0; i < 200 && s.boss.retreatTick < 0; i++) damageZombie(s, again, 60, {});
assert.ok(s.boss.retreatTick >= 0, 'it breaks');
assert.ok(!again.dead && again.health > 0, 'it cannot be killed');
damageZombie(s, again, 1000, {});
assert.ok(again.health > 0, 'nothing hurts it once it falls back');
let sealedAfter = -1;
for (let i = 0; i < 14 * HZ; i++) { hold(s, { x: 6, z: 8 })(); tick(s); if (s.boss.sealedTick >= 0) { sealedAfter = i / HZ; break; } }
assert.ok(sealedAfter >= 0, 'sealed');
console.log('sealed after', sealedAfter.toFixed(1), 's');
assert.ok(doorBox(s), 'the door is shut again');
assert.equal(bossZombie(s), null, 'it is gone from the room');
assert.ok(s.objective.done, 'the floor is done');
// The crew finishes off the last wave, the one the wipe brought back.
for (let i = 0; i < 60 * HZ && s.waves.phase !== 'lift'; i++) { hold(s, { x: 6, z: 8 })(); for (const z of s.zombies) { z.dead = true; z.deadLeft = 0; } s.waves.toSpawn = 0; tick(s); }
assert.equal(s.waves.phase, 'lift', 'the lift opens');

// Everyone into the cab: he comes too, to Main Street.
const e = s.level.elevator;
Object.assign(s.players[0], { x: e.position.x - e.normal.x * 1.7, z: e.position.z - e.normal.z * 1.7 });
let rode = false;
for (let i = 0; i < 40 * HZ; i++) { s.players[0].health = 100; tick(s); if (s.floor === VAULT + 1) { rode = true; break; } }
assert.ok(rode, 'rode on to Act 4');
assert.ok(s.scientist, 'he is with them on Main Street');
console.log('rode to', s.level.name);

// ---- Following, on the floor after the vault ---------------------------------------------------
{
  const t = createGameState(level0);
  startOnFloor(t, VAULT + 1);
  assert.ok(t.scientist, 'starting on an Act 4 floor, he is there');
  const p = t.players[0];
  const from = Math.hypot(t.scientist.x - p.x, t.scientist.z - p.z);
  // The player walks off a way; he keeps up.
  const there = { x: p.x + 8, z: p.z };
  run(t, 6, () => { hold(t, there)(); t.zombies = []; });
  const gap = Math.hypot(t.scientist.x - there.x, t.scientist.z - there.z);
  assert.ok(gap < 4, `he follows (${from.toFixed(1)} then ${gap.toFixed(1)} m)`);
  // Never hurt: nothing touches him, whatever is about.
  assert.equal(t.scientist.health, undefined);
  // Lost and out of sight: brought up to the crew.
  Object.assign(t.scientist, { x: there.x + 200, z: there.z + 200 });
  run(t, 3, () => { hold(t, there)(); t.zombies = []; });
  assert.ok(Math.hypot(t.scientist.x - there.x, t.scientist.z - there.z) < 4, 'brought back up to the crew');
  console.log('follow ok');
}

// ---- Starting the vault over -------------------------------------------------------------------
{
  const t = createGameState(level0);
  startOnFloor(t, VAULT);
  t.zombies = []; t.waves.phase = 'search';
  Object.assign(t.players[0], panel);
  useObjective(t, t.players[0], { kind: 'device' });
  run(t, 25, hold(t, panel));
  assert.ok(t.boss);
  // A wipe in stage 1: the lock starts over, and Patient O goes with it.
  for (const p of t.players) p.health = 0;
  tick(t);
  assert.equal(t.boss, null);
  assert.equal(t.waves.phase, 'search');
  // Out of lives: the floor from the start, no scientist, the door shut.
  t.lives = 1;
  for (const p of t.players) p.health = 0;
  tick(t);
  assert.equal(t.objective.step, 0);
  assert.equal(t.scientist, null);
  assert.ok(doorBox(t));
  console.log('restart ok');
}
console.log('ok');
