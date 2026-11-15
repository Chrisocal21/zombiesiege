// Act 12, Perimeter Fall: hold the west flank, then throw the emergency gate cabinet; the gate leads on.
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
const { LAST_FLOOR, actOf } = await import('../src/game/tower.ts');

const HZ = 120;
const run = (s, seconds) => { for (let i = 0; i < seconds * HZ; i++) { for (const p of s.players) p.health = 100; step(s, [idleInput(0)], 1 / HZ); } };
const s = createGameState(level0);
startOnFloor(s, LAST_FLOOR - 1);
assert.equal(s.level.name, 'Perimeter Fall');
assert.equal(actOf(s.floor), 12);
assert.equal(flowOf(s.level).kind, 'sweep');
assert.ok(s.level.exitGate, 'the gate leads on to the lift');
assert.deepEqual(s.level.steps.map((x) => x.kind), ['charge', 'breakers']);
const p = s.players[0];
const inside = (b, x, z) => Math.abs(b.position.x - x) < b.size.x / 2 && Math.abs(b.position.z - z) < b.size.z / 2 && b.position.y + b.size.y / 2 > 0.3;
assert.ok(!s.level.boxes.some((b) => inside(b, p.x, p.z)), 'spawn is clear');
for (const d of s.level.residents) assert.ok(!s.level.boxes.some((b) => inside(b, d.x, d.z)), `dead at ${d.x},${d.z} is clear`);
// Step one: hold the bunker.
const d = s.level.steps[0].device.position;
Object.assign(p, { x: d.x, z: d.z + 2 });
useObjective(s, p, { kind: 'device' });
s.zombies = [];
run(s, 40);
assert.equal(s.objective.step, 1, 'flank held: on to the gate');
// Step two: the gate cabinet.
useObjective(s, p, { kind: 'breaker', index: 0 });
run(s, 2);
assert.ok(s.objective.done, 'gate open');
console.log('ok', s.level.name);
