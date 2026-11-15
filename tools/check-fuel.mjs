// Act 6, Running on Empty: the fuel yard. Two power cabinets, then a held fuel transfer, then the run ends here.
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
const { LAST_REFUGE, actOf } = await import('../src/game/tower.ts');

const HZ = 120;
const run = (s, seconds, at) => { for (let i = 0; i < seconds * HZ; i++) { for (const p of s.players) { p.health = 100; if (at) Object.assign(p, at); } step(s, [idleInput(0)], 1 / HZ); } };
const s = createGameState(level0);
startOnFloor(s, LAST_REFUGE + 1);
assert.equal(s.level.name, 'Running on Empty');
assert.equal(actOf(s.floor), 6);
assert.equal(flowOf(s.level).kind, 'sweep');
assert.equal(s.level.steps.length, 2);
const inside = (b, x, z) => Math.abs(b.position.x - x) < b.size.x / 2 && Math.abs(b.position.z - z) < b.size.z / 2 && b.position.y + b.size.y / 2 > 0.3;
const p = s.players[0];
assert.ok(!s.level.boxes.some((b) => inside(b, p.x, p.z)), 'spawn is clear');
assert.ok(s.level.boxes.some((b) => inside(b, 14, -7.4)), 'the tanker is there');
assert.equal(s.objective.step, 0);
useObjective(s, p, { kind: 'breaker', index: 0 });
useObjective(s, p, { kind: 'breaker', index: 1 });
run(s, 2);
assert.equal(s.objective.step, 1, 'both cabinets thrown: on to the transfer');
const d = s.level.steps[1].device.position;
Object.assign(p, { x: d.x, z: d.z + 2 });
useObjective(s, p, { kind: 'device' });
s.zombies = [];
run(s, 50, { x: d.x, z: d.z + 2 });
assert.ok(s.objective.done, 'the tanker fills');
console.log('ok', s.level.name);
