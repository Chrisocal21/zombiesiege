// Act 10, Shelter Zero: emergency lighting (two cabinets), people shut in classrooms, a secured exit that costs points.
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
const { useAction, lockOffer } = await import('../src/game/doors.ts');
const { useObjective } = await import('../src/game/objectives.ts');
const { LAST_GHOST_SIGNAL, actOf } = await import('../src/game/tower.ts');

const HZ = 120;
const run = (s, seconds) => { for (let i = 0; i < seconds * HZ; i++) { for (const p of s.players) p.health = 100; step(s, [idleInput(0)], 1 / HZ); } };
const s = createGameState(level0);
startOnFloor(s, LAST_GHOST_SIGNAL);
assert.equal(s.level.name, 'Shelter Zero');
assert.equal(actOf(s.floor), 10);
assert.equal(flowOf(s.level).kind, 'sweep');
assert.equal(s.survivors.length, 3, 'three people in the classrooms');
assert.equal(s.level.locks.length, 1, 'the secured exit');
const p = s.players[0];
const inside = (b, x, z) => Math.abs(b.position.x - x) < b.size.x / 2 && Math.abs(b.position.z - z) < b.size.z / 2 && b.position.y + b.size.y / 2 > 0.3;
assert.ok(!s.level.boxes.some((b) => inside(b, p.x, p.z)), 'spawn is clear');
for (const d of s.level.residents) assert.ok(!s.level.boxes.some((b) => inside(b, d.x, d.z)), `dead at ${d.x},${d.z} is clear`);
for (const q of s.level.rescue.people) assert.ok(!s.level.boxes.some((b) => inside(b, q.x, q.z)), `person at ${q.x},${q.z} is clear`);
assert.equal(lockOffer(s, p, 0).status, 'poor');
s.points[0] = 300;
Object.assign(p, { x: 12.2, z: 0, y: 0 });
assert.equal(lockOffer(s, p, 0).status, 'ok');
useAction(s, p);
assert.ok(s.locks[0].open, 'the exit is forced');
assert.equal(s.points[0], 180, 'it cost 120');
useObjective(s, p, { kind: 'breaker', index: 0 });
useObjective(s, p, { kind: 'breaker', index: 1 });
run(s, 3);
assert.ok(s.objective.done, 'the lights are on');
console.log('ok', s.level.name);
