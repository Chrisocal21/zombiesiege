// Floors that play without waves: the pharmacy (a sweep) and the service tunnel (a run), and where
// the first brute and screamer turn up. Runs the game headless.
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
const { placeResident } = await import('../src/game/zombies.ts');
const { radioLine } = await import('../src/render/radio.ts');

const HZ = 120;
const tick = (s, input) => step(s, [input ?? idleInput(0)], 1 / HZ);
const run = (s, seconds, each) => { for (let i = 0; i < seconds * HZ; i++) { each?.(); tick(s); } };
const living = (s) => s.zombies.filter((z) => !z.dead);
const asleep = (s) => living(s).filter((z) => z.dormant).length;
// A pistol shot: the player fires once, which is all the noise there is.
const shoot = (s) => tick(s, { ...idleInput(0), fire: true });

// ---- The pharmacy: a sweep -------------------------------------------------------------------
{
  const s = createGameState(level0);
  startOnFloor(s, 14);
  assert.equal(s.level.name, 'Pharmacy');
  assert.equal(s.waves.phase, 'search', 'the objective is open from the start');
  const residents = s.level.residents.length;
  assert.equal(living(s).length, residents, 'the shop\'s own dead are in place');
  assert.equal(asleep(s), residents, 'and none of them is awake');

  // Standing quietly in the stockroom: no waves, nothing new comes, nobody wakes.
  run(s, 25);
  assert.equal(s.waves.phase, 'search');
  assert.equal(living(s).length, residents, 'no waves on a sweep floor');
  assert.equal(asleep(s), residents, 'quiet play wakes nobody');
  assert.match(radioLine({ ...s, tick: s.waves.arrivedTick + 2 * HZ }).text, /stockroom/, 'the crew talks on arriving');

  // One far off, beyond earshot of a gunshot.
  placeResident(s, { x: -9, z: 60 });
  const far = s.zombies[s.zombies.length - 1];
  const before = s.zombies.length;
  shoot(s);
  assert.ok(s.players[0].lastShotTick >= 0, 'the shot was fired');
  assert.equal(s.waves.alarms, 1, 'the shot is a loud moment');
  // The shop's screamer hears it too and calls a couple more of its own.
  assert.ok(s.waves.reinforce >= s.level.flow.first, 'the first one brings the crowd off the street');
  // The player is kept on their feet here: the shop's dead reach them in seconds.
  const heal = () => { for (const p of s.players) p.health = 100; };
  // Where each newcomer is on the tick it appears.
  const crowd = [];
  let seen = before;
  const watch = () => { heal(); for (const zombie of s.zombies.slice(seen)) crowd.push({ x: zombie.x, z: zombie.z }); seen = s.zombies.length; };
  run(s, 1, watch);
  assert.equal(asleep(s), 1, 'every resident in earshot woke');
  assert.ok(far.dormant, 'the one out of earshot sleeps on');
  run(s, 4, watch);
  assert.ok(crowd.length >= s.level.flow.first, `the crowd came in (${crowd.length})`);
  const street = s.level.flow.from.map((i) => s.level.doors[i].position);
  for (const zombie of crowd) assert.ok(street.some((door) => Math.hypot(door.x - zombie.x, door.z - zombie.z) < 4), 'through the street doors');
  assert.ok(before > 0);

  // Another shot straight away brings no more; one after the gap brings a few.
  shoot(s);
  assert.equal(s.waves.alarms, 1, 'shots close together are one loud moment');
  run(s, 12);
  shoot(s);
  assert.equal(s.waves.alarms, 2);
  assert.ok(s.waves.reinforce >= s.level.flow.loud - 1, 'a later loud moment brings a few more');

  // Everyone down: a life goes, the crew is back in the stockroom, the shop's dead are back where they
  // stood, and it is still the same floor.
  const lives = s.lives;
  for (const player of s.players) player.health = 0;
  tick(s);
  assert.equal(s.lives, lives - 1);
  assert.equal(s.waves.phase, 'search');
  assert.equal(asleep(s), residents, 'the residents are back, asleep');
  assert.equal(living(s).length, residents, 'and the crowd is gone');

  // The card is the whole floor: once taken, the lift opens although the dead are still about.
  const card = s.level.objective.position;
  Object.assign(s.players[0], { x: card.x, z: card.z + 0.6, health: 100 });
  tick(s, { ...idleInput(0), use: true });
  assert.ok(s.objective.done, 'the keycard is taken');
  tick(s);
  assert.equal(s.waves.phase, 'lift', 'the way on opens with zombies still standing');
  assert.ok(s.lift.open);
  assert.ok(living(s).length > 0);
  console.log('sweep ok');
}

// ---- The service tunnel: a run ---------------------------------------------------------------
{
  const s = createGameState(level0);
  startOnFloor(s, 13);
  assert.equal(s.level.name, 'Service tunnel');
  assert.equal(s.waves.phase, 'search');
  run(s, 5);
  assert.equal(living(s).length, 0, 'a quiet beat after arriving');

  // Walking east down the tunnel, the dead come from the west, behind.
  const player = s.players[0];
  const spawned = [];
  let seen = 0;
  for (let i = 0; i < 18 * HZ; i++) {
    player.x = Math.min(4, -19 + (i / HZ) * 2.2);
    player.z = 0;
    player.health = 100;
    tick(s);
    for (const zombie of s.zombies.slice(seen)) spawned.push({ x: zombie.x, at: player.x });
    seen = s.zombies.length;
  }
  assert.ok(spawned.length > 0, 'they keep coming on a run floor');
  for (const each of spawned) assert.ok(each.x < each.at, `spawned behind the crew (${each.x.toFixed(1)} behind ${each.at.toFixed(1)})`);
  assert.equal(s.waves.phase, 'search', 'no waves');

  // Standing still gets worse: spawns come quicker after a minute and a half.
  const count = (seconds) => {
    let made = 0;
    const start = s.zombies.length;
    for (let i = 0; i < seconds * HZ; i++) {
      player.health = 100;
      tick(s);
      made += s.zombies.length - start;
      s.zombies = s.zombies.slice(0, start);
    }
    return made;
  };
  s.zombies = [];
  const early = count(20);
  run(s, 60, () => { s.zombies = []; player.health = 100; });
  const late = count(20);
  assert.ok(late > early, `more of them the longer it takes (${early} then ${late})`);
  console.log('run ok', { early, late });
}

// ---- First appearances: the brute on Floor 6, the screamer on Floor 9 --------------------------
{
  const kindsOn = (floor) => {
    const s = createGameState(level0);
    startOnFloor(s, floor);
    const kinds = new Set();
    for (let i = 0; i < 400 * HZ && s.waves.phase !== 'search' && s.waves.phase !== 'lift'; i++) {
      for (const zombie of s.zombies) { kinds.add(zombie.kind); zombie.dead = true; zombie.deadLeft = 0; }
      for (const p of s.players) p.health = 100;
      tick(s);
    }
    return kinds;
  };
  const six = kindsOn(2);
  assert.ok(six.has('brute'), 'the first brute is on Floor 6');
  assert.ok(!six.has('screamer'), 'no screamer before Floor 9');
  const three = kindsOn(1);
  assert.ok(!three.has('brute') && !three.has('screamer'), 'Floor 3 has neither');
  const nine = kindsOn(3);
  assert.ok(nine.has('screamer'), 'the first screamer is on Floor 9');
  console.log('first appearances ok', { floor3: [...three], floor6: [...six], floor9: [...nine] });
}
console.log('ok');
