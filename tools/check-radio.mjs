import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { extname } from 'node:path';
registerHooks({ resolve(s, c, next) {
  if (s.startsWith('.') && !extname(s)) { try { return next(`${s}.ts`, c); } catch (e) { if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e; return next(`${s}/index.ts`, c); } }
  return next(s, c); } });
const { createGameState } = await import('../src/game/state.ts');
const { level0 } = await import('../src/levels/level0.ts');
const { startOnFloor } = await import('../src/game/waves.ts');
const { radioLine } = await import('../src/render/radio.ts');
const HZ = 120;
const s = createGameState(level0);
startOnFloor(s, -5);
assert.equal(radioLine(s), null, 'nothing at the very start');
s.tick += 3 * HZ;
assert.match(radioLine(s).text, /Dry/);
s.tick += 13 * HZ;
assert.equal(radioLine(s), null, 'quiet between lines');
s.objective.done = true; s.objective.doneTick = s.tick;
s.tick += 1 * HZ;
assert.equal(radioLine(s).speaker, 'NORTHLINE GENERAL', 'the hospital call after the radio');
const garage = createGameState(level0);
garage.tick += 3 * HZ;
assert.equal(radioLine(garage), null, 'no lines out of the prologue');
for (let f = -5; f <= -1; f++) { const t = createGameState(level0); startOnFloor(t, f); t.tick += 2 * HZ; /* start lines exist or later */ }
console.log('ok');
