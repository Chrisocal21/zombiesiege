// Act 8, High Water: the floodwater rises in stages, slows anyone wading, stays under the catwalks,
// and drains once both sluice gates are open.
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
const { useObjective } = await import('../src/game/objectives.ts');
const { floodHeight } = await import('../src/game/flood.ts');
const { LAST_FLOOR, actOf } = await import('../src/game/tower.ts');

const HZ = 120;
const run = (s, seconds, input = idleInput(0)) => { for (let i = 0; i < seconds * HZ; i++) { for (const p of s.players) p.health = 100; step(s, [input], 1 / HZ); } };
const s = createGameState(level0);
startOnFloor(s, LAST_FLOOR);
assert.equal(s.level.name, 'High Water');
assert.equal(actOf(s.floor), 8);
assert.equal(s.level.objective.panels.length, 2);
const p = s.players[0];
const inside = (b, x, z) => Math.abs(b.position.x - x) < b.size.x / 2 && Math.abs(b.position.z - z) < b.size.z / 2 && b.position.y + b.size.y / 2 > 0.3;
assert.ok(!s.level.boxes.some((b) => inside(b, p.x, p.z)), 'spawn is clear');
s.frozen = true; // keep the dead out of it; the water is on the clock, which still runs
run(s, 5);
assert.equal(floodHeight(s), 0, 'dry at first');
s.zombies = [];
// The clock: freeze stops game time, so move the arrival back instead.
s.frozen = false; s.tick += 400 * HZ;
const at = (seconds) => { s.waves.arrivedTick = s.tick - seconds * HZ; return floodHeight(s); };
assert.equal(at(10), 0, 'dry before the first stage');
assert.ok(at(26) > 0.1 && at(26) < 0.5, 'the first stage rising');
assert.ok(Math.abs(at(40) - 0.5) < 0.01, 'stage one holds at 0.5');
assert.ok(Math.abs(at(75) - 0.9) < 0.01, 'stage two at 0.9');
assert.ok(Math.abs(at(120) - 1.1) < 0.01, 'stage three at 1.1');
assert.ok(1.1 < 1.2, 'the catwalks (1.2) stay dry at the highest stage');
// Wading slows: walk forward 2 s dry, then 2 s in the water, same start.
Object.assign(p, { x: -24, z: 5.5, yaw: -Math.PI / 2, y: 0 });
s.waves.arrivedTick = s.tick; s.zombies = [];
const dry = (() => { const x0 = p.x; run(s, 1.5, { ...idleInput(0), moveForward: 1 }); return Math.abs(p.x - x0); })();
Object.assign(p, { x: -24, z: 5.5, y: 0 });
s.waves.arrivedTick = s.tick - 40 * HZ; s.zombies = [];
const wet = (() => { const x0 = p.x; run(s, 1.5, { ...idleInput(0), moveForward: 1 }); return Math.abs(p.x - x0); })();
assert.ok(wet < dry * 0.7, `wading is slower (${wet.toFixed(2)} m against ${dry.toFixed(2)} m)`);
// Both gates open: it drains.
s.waves.arrivedTick = s.tick - 120 * HZ;
useObjective(s, p, { kind: 'breaker', index: 0 });
useObjective(s, p, { kind: 'breaker', index: 1 });
assert.ok(s.objective.done);
const before = floodHeight(s);
run(s, 30);
assert.ok(floodHeight(s) < 0.01 && before > 1, 'the water drains once the gates are open');
console.log('ok', s.level.name);
