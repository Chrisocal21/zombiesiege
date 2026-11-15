// Act 5, Inventory of the Living: the quiet camp. Four facility checks light it up and open the gate.
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { extname } from 'node:path';
registerHooks({ resolve(s, c, next) {
  if (s.startsWith('.') && !extname(s)) { try { return next(`${s}.ts`, c); } catch (e) { if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e; return next(`${s}/index.ts`, c); } }
  return next(s, c); } });
const { createGameState, circuitLive } = await import('../src/game/state.ts');
const { level0 } = await import('../src/levels/level0.ts');
const { startOnFloor } = await import('../src/game/waves.ts');
const { step } = await import('../src/game/update.ts');
const { idleInput } = await import('../src/game/inputs.ts');
const { useObjective } = await import('../src/game/objectives.ts');
const { LAST_REFUGE } = await import('../src/game/tower.ts');

const HZ = 120;
const run = (s, seconds) => { for (let i = 0; i < seconds * HZ; i++) { for (const p of s.players) p.health = 100; step(s, [idleInput(0)], 1 / HZ); } };
const s = createGameState(level0);
startOnFloor(s, LAST_REFUGE - 2);
assert.equal(s.level.name, 'Inventory of the Living');
assert.equal(s.level.objective.panels.length, 4);
assert.equal(s.level.notes.length, 4, 'a ledger card for each facility');
assert.ok(s.zombies.length === 0, 'nobody is hunting the crew');
const inside = (b, x, z) => Math.abs(b.position.x - x) < b.size.x / 2 && Math.abs(b.position.z - z) < b.size.z / 2 && b.position.y + b.size.y / 2 > 0.3;
const p = s.players[0];
assert.ok(!s.level.boxes.some((b) => inside(b, p.x, p.z)), 'spawn is clear');
for (const note of s.level.notes) assert.ok(s.level.boxes.some((b) => inside(b, note.position.x, note.position.z) && Math.abs(b.position.y + b.size.y / 2 - note.position.y) < 0.3), 'each ledger card lies on something');
for (let i = 0; i < 4; i++) assert.ok(!circuitLive(s, i), `circuit ${i} starts dark`);
run(s, 20);
assert.equal(s.zombies.length, 0, 'still quiet after twenty seconds');
for (let i = 0; i < 4; i++) { assert.ok(!s.objective.done); useObjective(s, p, { kind: 'breaker', index: i }); assert.ok(circuitLive(s, i), `circuit ${i} is lit once checked`); }
assert.ok(s.objective.done, 'all four checked');
run(s, 3);
assert.equal(s.waves.phase, 'lift', 'the gate opens');
console.log('ok', s.level.name);
