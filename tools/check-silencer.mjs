// Floors that play without waves: the pharmacy (a sweep) and the service tunnel (a run), and where
// the first brute and screamer turn up. Runs the game headless.
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { extname } from 'node:path';
registerHooks({ resolve(s, c, next) {
  if (s.startsWith('.') && !extname(s)) { try { return next(`${s}.ts`, c); } catch (e) { if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e; return next(`${s}/index.ts`, c); } }
  return next(s, c); } });
// Silencers: one lies a short walk from the start of every floor, picking it up quiets the pistol
// and the AK, and a quiet shot leaves a walker ten metres off asleep where a loud one wakes it.
const { createGameState } = await import('../src/game/state.ts');
const { level0 } = await import('../src/levels/level0.ts');
const { startOnFloor } = await import('../src/game/waves.ts');
const { step } = await import('../src/game/update.ts');
const { idleInput } = await import('../src/game/inputs.ts');
const { takeSupply, silenced } = await import('../src/game/items.ts');
const { FIRST_FLOOR } = await import('../src/game/tower.ts');

const missing = [];
for (let floor = FIRST_FLOOR; floor <= 20; floor++) {
  const s = createGameState(level0);
  startOnFloor(s, floor);
  const p = s.players[0];
  const found = s.supplies.filter((x) => x.item === 'silencer');
  if (found.length !== 1) { missing.push(`${floor}:${s.level.name}`); continue; }
  const d = Math.hypot(found[0].x - p.x, found[0].z - p.z);
  assert.ok(d >= 5 && d <= 40, `floor ${floor} silencer ${d.toFixed(1)} m from the start`);
}
console.log('floors without a silencer:', missing.join(', ') || 'none');
assert.ok(missing.length <= 2, 'nearly every floor has a silencer');

function trial(quiet) {
  const s = createGameState(level0);
  startOnFloor(s, -4);
  const p = s.players[0];
  if (quiet) {
    const index = s.supplies.findIndex((x) => x.item === 'silencer');
    p.x = s.supplies[index].x; p.z = s.supplies[index].z;
    takeSupply(s, p, index);
    assert.equal(p.silencer, true);
    assert.equal(s.supplies.some((x) => x.item === 'silencer'), false);
  }
  const z = s.zombies.find((each) => each.dormant);
  // Ten metres behind the walker's back, out of its sight.
  p.x = z.x - Math.sin(z.yaw) * 10; p.z = z.z - Math.cos(z.yaw) * 10;
  z.roam = null;
  assert.equal(silenced(p), quiet);
  p.lastShotTick = s.tick;
  step(s, [idleInput(p.id)], 1 / 120);
  step(s, [idleInput(p.id)], 1 / 120);
  return z.alertUntil > s.tick;
}
assert.equal(trial(false), true, 'a loud shot wakes a walker 10 m off');
assert.equal(trial(true), false, 'a silenced shot leaves it be');
console.log('silencer check passed');
