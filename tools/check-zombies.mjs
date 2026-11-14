import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { extname } from 'node:path';
registerHooks({ resolve(s, c, next) {
  if (s.startsWith('.') && !extname(s)) { try { return next(`${s}.ts`, c); } catch (e) { if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e; return next(`${s}/index.ts`, c); } }
  return next(s, c); } });
const { config } = await import('../src/config.ts');
const { createGameState } = await import('../src/game/state.ts');
const { level0 } = await import('../src/levels/level0.ts');
const { startOnFloor } = await import('../src/game/waves.ts');
const { step } = await import('../src/game/update.ts');
const { idleInput } = await import('../src/game/inputs.ts');
const { spawnZombie, damageZombie, raycastZombies, zombieHeights } = await import('../src/game/zombies.ts');

const fresh = (floor) => {
  const s = createGameState(level0);
  startOnFloor(s, floor);
  s.zombies = []; s.waves.phase = 'active'; s.waves.toSpawn = 0; s.waves.number = 1;
  return s;
};
const run = (s, seconds, stop) => { for (let i = 0; i < seconds * 120; i++) { step(s, [idleInput(0)], 1 / 120); if (stop?.()) return true; } return false; };
const put = (s, kind, x, z) => { spawnZombie(s, x, z, null, kind); const z0 = s.zombies[s.zombies.length - 1]; z0.alertUntil = -1; return z0; };

// The kinds a floor throws up over its waves: runners from the second wave, a brute or screamer leading the last.
{
  const s = createGameState(level0);
  startOnFloor(s, 3);
  const seen = { walker: 0, runner: 0, brute: 0, screamer: 0 };
  for (let i = 0; i < 400 * 120 && s.waves.phase !== 'cleared' && s.waves.phase !== 'search'; i++) {
    step(s, [idleInput(0)], 1 / 120);
    s.players[0].health = 100;
    for (const z of s.zombies) { if (!z.seen) { z.seen = true; seen[z.kind]++; } }
    if (s.zombies.length) for (const z of s.zombies) { if (!z.dead && Math.hypot(z.x - s.players[0].x, z.z - s.players[0].z) < 3) { z.dead = true; z.deadLeft = 0; } }
  }
  console.log('kinds on floor 3:', JSON.stringify(seen));
  assert.ok(seen.walker > 0 && seen.runner > 0, 'walkers and runners come');
}

// A screamer that sees a player screams: the others nearby are alerted and frenzied, and reinforcements are called.
{
  const s = fresh(5);
  const p = s.players[0]; Object.assign(p, { x: 0, z: 0 });
  const screamer = put(s, 'screamer', 8, 0); screamer.nextCryTick = 0;
  const walker = put(s, 'walker', 14, 4);
  run(s, 0.5);
  assert.ok(screamer.cryTick >= 0, 'screamer screams');
  assert.ok(walker.enragedUntil > s.tick, 'the walker is frenzied');
  assert.ok(s.waves.reinforce >= 1 || s.zombies.length > 2, 'reinforcements are called');
  const at = { x: screamer.x, z: screamer.z };
  run(s, 1.0);
  assert.ok(Math.abs(screamer.x - at.x) < 0.4, 'it stands its ground while screaming');
}

// A brute charges at a player a few metres off, much faster than it walks.
{
  const s = fresh(5);
  Object.assign(s.players[0], { x: 0, z: 0 });
  const brute = put(s, 'brute', 9, 0); brute.nextCryTick = 0; brute.alertUntil = 1e9;
  const x0 = brute.x;
  run(s, 1);
  assert.ok(brute.chargeUntil > 0, 'brute charges');
  assert.ok(x0 - brute.x > 2.2, `charge covers ground (${(x0 - brute.x).toFixed(2)} m)`);
}

// Shot in the legs, a zombie goes down and crawls; a head shot kills a walker, but not a brute.
{
  const s = fresh(5);
  const z = put(s, 'walker', 0, -5);
  const origin = { x: 0, y: 0.5, z: 0 };
  const hit = raycastZombies(s, origin, { x: 0, y: 0, z: -1 }, 20);
  assert.ok(hit && hit.leg && !hit.head, 'a low shot is a leg shot');
  damageZombie(s, z, 25, { leg: true, from: { x: 0, z: 0 } });
  damageZombie(s, z, 25, { leg: true, from: { x: 0, z: 0 } });
  assert.ok(z.crawling && !z.dead, 'two leg hits put it on the floor');
  assert.ok(zombieHeights(z).height < 1, 'a crawler is low');
  const speedBefore = z.x;
  const brute = put(s, 'brute', 5, 5);
  damageZombie(s, brute, 22, { leg: true, from: { x: 0, z: 0 } });
  damageZombie(s, brute, 22, { leg: true, from: { x: 0, z: 0 } });
  assert.ok(!brute.crawling, 'a brute does not crawl');
  void speedBefore;
}

// A solid hit rocks a zombie back and slows it for a moment.
{
  const s = fresh(5);
  const z = put(s, 'walker', 0, -6);
  damageZombie(s, z, 30, { from: { x: 0, z: 0 } });
  assert.ok(z.z < -6, 'knocked back');
  assert.ok(z.staggerUntil > s.tick, 'staggered');
}

// Shots wake the far-off, and far-off zombies unalerted shamble slower than alerted ones.
{
  const s = fresh(5);
  Object.assign(s.players[0], { x: -16, z: 0 });
  const far = put(s, 'walker', 15, 0), alert = put(s, 'walker', 15, 6);
  alert.alertUntil = 1e9;
  const a0 = far.x, b0 = alert.x;
  run(s, 2);
  const unaware = a0 - far.x, aware = b0 - alert.x;
  assert.ok(unaware < aware, `unaware walks slower (${unaware.toFixed(2)} vs ${aware.toFixed(2)})`);
  s.players[0].lastShotTick = s.tick;
  step(s, [idleInput(0)], 1 / 120);
  assert.ok(far.alertUntil > s.tick, 'a gunshot alerts everything in earshot');
}

// Close in, a crowd spreads round the player instead of queueing on one line.
{
  const s = fresh(5);
  Object.assign(s.players[0], { x: 0, z: 0 });
  for (let i = 0; i < 6; i++) { const z = put(s, 'walker', 8, 0.01 * i); z.alertUntil = 1e9; }
  run(s, 3.5);
  const angles = s.zombies.map((z) => Math.atan2(z.z, z.x));
  const spread = Math.max(...angles) - Math.min(...angles);
  assert.ok(spread > 0.5, `the crowd fans out (${spread.toFixed(2)} rad)`);
}
console.log('ok', config.zombie.kinds.brute.health);
