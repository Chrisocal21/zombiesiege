import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { extname } from 'node:path';
registerHooks({ resolve(s, c, next) {
  if (s.startsWith('.') && !extname(s)) { try { return next(`${s}.ts`, c); } catch (e) { if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e; return next(`${s}/index.ts`, c); } }
  return next(s, c); } });
const { createGameState } = await import('../src/game/state.ts');
const { level0 } = await import('../src/levels/level0.ts');
const { startOnFloor, updateWaves } = await import('../src/game/waves.ts');
const { inCab } = await import('../src/game/elevator.ts');
const { step } = await import('../src/game/update.ts');
const { idleInput } = await import('../src/game/inputs.ts');
const s = createGameState(level0);
startOnFloor(s, 1);
s.waves.phase = 'lift';
const e = s.level.elevator;
Object.assign(s.players[0], { x: e.position.x - e.normal.x * 1.7, z: e.position.z - e.normal.z * 1.7 });
let sawArrive = false, firstOpen = -1;
for (let i = 0; i < 120 * 30; i++) {
  step(s, [idleInput(0)], 1 / 120);
  if (s.waves.phase === 'arrive') { sawArrive = true; assert.ok(inCab(s, s.players[0]), 'in cab on arrival'); assert.equal(s.lift.open, false); assert.equal(s.zombies.length, 0); }
  if (sawArrive && s.lift.open && firstOpen < 0) { firstOpen = i; console.log('floor', s.floor, 'phase', s.waves.phase, 'inCab', inCab(s, s.players[0])); break; }
}
assert.ok(sawArrive && firstOpen > 0);
console.log('ok');
