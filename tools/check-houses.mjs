// Act 10, Empty Houses: a quiet street, sleepers in one house, a route note in another that ends the floor.
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
const { LAST_FLOOR, LAST_FAULT_LINES, actOf } = await import('../src/game/tower.ts');

const HZ = 120;
const run = (s, seconds) => { for (let i = 0; i < seconds * HZ; i++) { for (const p of s.players) p.health = 100; step(s, [idleInput(0)], 1 / HZ); } };
const s = createGameState(level0);
startOnFloor(s, LAST_FLOOR);
assert.equal(LAST_FLOOR, LAST_FAULT_LINES + 1);
assert.equal(s.level.name, 'Empty Houses');
assert.equal(actOf(s.floor), 10);
assert.equal(flowOf(s.level).kind, 'sweep');
assert.equal(s.level.roamers, 0, 'a quiet street');
assert.equal(s.level.notes.length, 2, 'two cards to read');
const p = s.players[0];
const inside = (b, x, z) => Math.abs(b.position.x - x) < b.size.x / 2 && Math.abs(b.position.z - z) < b.size.z / 2 && b.position.y + b.size.y / 2 > 0.3;
assert.ok(!s.level.boxes.some((b) => inside(b, p.x, p.z)), 'spawn is clear');
for (const d of s.level.residents) assert.ok(!s.level.boxes.some((b) => inside(b, d.x, d.z)), `sleeper at ${d.x},${d.z} is clear`);
run(s, 3);
Object.assign(p, { x: -2, z: -8.4, y: 0 });
useObjective(s, p, { kind: 'objective' });
run(s, 3);
assert.ok(s.objective.done, 'route note found');
console.log('ok', s.level.name);
