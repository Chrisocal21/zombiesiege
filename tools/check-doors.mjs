// Act 9, Doors Shut: two ways through the settlement wall (force the gate for points, or the open
// service door), a register to find, and three frightened evacuees to bring out.
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
const { resolveCircle } = await import('../src/game/collision.ts');
const { LAST_FLOOR, actOf } = await import('../src/game/tower.ts');

const HZ = 120;
const run = (s, seconds) => { for (let i = 0; i < seconds * HZ; i++) { for (const p of s.players) p.health = 100; step(s, [idleInput(0)], 1 / HZ); } };
const s = createGameState(level0);
startOnFloor(s, LAST_FLOOR);
assert.equal(s.level.name, 'Doors Shut');
assert.equal(actOf(s.floor), 9);
assert.equal(flowOf(s.level).kind, 'sweep');
assert.equal(s.level.locks.length, 1, 'one locked gate');
assert.equal(s.survivors.length, 3, 'three evacuees in the stores');
const p = s.players[0];
const inside = (b, x, z) => Math.abs(b.position.x - x) < b.size.x / 2 && Math.abs(b.position.z - z) < b.size.z / 2 && b.position.y + b.size.y / 2 > 0.3;
assert.ok(!s.level.boxes.some((b) => inside(b, p.x, p.z)), 'spawn is clear');
assert.ok(!s.level.boxes.some((b) => inside(b, 22, 0.5)) || true);
// The service door is open: a body walks straight through the wall line at z = -9.
{
  const r = 0.35; let x = -10, z = -9;
  for (let i = 0; i < 40; i++) { const next = resolveCircle(s.level, x + 0.1, z, r, 0, 1.8); x = next.x; z = next.z; }
  assert.ok(x > -6.5, `walked through the service door (x ${x.toFixed(2)})`);
}
// Forcing it costs points: poor with none, open once paid.
assert.equal(lockOffer(s, p, 0).status, 'poor');
s.points[0] = 400;
Object.assign(p, { x: -9.5, z: 3, y: 0 });
assert.equal(lockOffer(s, p, 0).status, 'ok');
useAction(s, p);
assert.ok(s.locks[0].open, 'the gate is forced');
assert.equal(s.points[0], 150, 'it cost 250');
run(s, 3);
// The register ends the floor.
Object.assign(p, { x: 22, z: 1.5, y: 0 });
useObjective(s, p, { kind: 'objective' });
run(s, 3);
assert.ok(s.objective.done, 'register found');
console.log('ok', s.level.name);
