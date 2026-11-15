// Act 5, Last Refuge: the camp siege. Waves through the fence gaps, dark floodlights until the two
// generators are thrown, then the lift, and the run ends here. Runs the game headless.
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { extname } from 'node:path';
registerHooks({ resolve(s, c, next) {
  if (s.startsWith('.') && !extname(s)) { try { return next(`${s}.ts`, c); } catch (e) { if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e; return next(`${s}/index.ts`, c); } }
  return next(s, c); } });
const { createGameState, flowOf, circuitLive } = await import('../src/game/state.ts');
const { level0 } = await import('../src/levels/level0.ts');
const { startOnFloor } = await import('../src/game/waves.ts');
const { step } = await import('../src/game/update.ts');
const { idleInput } = await import('../src/game/inputs.ts');
const { useObjective } = await import('../src/game/objectives.ts');
const { LAST_FLOOR, actOf, wavesOnFloor } = await import('../src/game/tower.ts');

const HZ = 120;
const tick = (s) => step(s, [idleInput(0)], 1 / HZ);
const run = (s, seconds, until) => { for (let i = 0; i < seconds * HZ; i++) { for (const p of s.players) p.health = 100; tick(s); if (until?.()) return true; } return false; };

const s = createGameState(level0);
startOnFloor(s, LAST_FLOOR);
assert.equal(LAST_FLOOR, 22);
assert.equal(s.level.name, 'Last Refuge');
assert.equal(actOf(s.floor), 5);
assert.equal(flowOf(s.level).kind, 'siege');
assert.equal(wavesOnFloor(s.floor), 4);
assert.equal(s.level.objective.panels.length, 2, 'two generators');
assert.ok(s.level.lights.some((l) => l.circuit !== undefined && !circuitLive(s, l.circuit)), 'the floodlights start dark');
// Nobody starts inside a wall or box.
const p = s.players[0];
assert.ok(!s.level.boxes.some((b) => Math.abs(b.position.x - p.x) < b.size.x / 2 && Math.abs(b.position.z - p.z) < b.size.z / 2 && b.position.y + b.size.y / 2 > 0.3), 'spawn is clear');
// The waves come: someone is spawned through a gap within a minute and a half.
assert.ok(run(s, 90, () => s.zombies.length > 0), 'the dead come through the fence');
// The fall-back call is said when wave 3 begins, and the final push when wave 4 does.
const { radioLine } = await import('../src/render/radio.ts');
s.tick += 20 * HZ; s.waves.phase = 'active'; s.waves.number = 3; s.waves.startedTick = s.tick - 3 * HZ;
assert.match(radioLine(s)?.text ?? '', /fall back to the medical yard/i, 'wave 3: fall back');
s.waves.number = 4; s.waves.startedTick = s.tick - 3 * HZ;
assert.match(radioLine(s)?.text ?? '', /last push/i, 'wave 4: the last push');
// Skip the waves, throw both generators, and the lift opens; the run ends here.
s.zombies = []; s.waves.phase = 'search'; s.waves.number = wavesOnFloor(s.floor);
useObjective(s, p, { kind: 'breaker', index: 0 });
assert.ok(!s.objective.done, 'one generator is not enough');
assert.ok(s.level.lights.some((l) => l.circuit === 0 && circuitLive(s, 0)) && !circuitLive(s, 1), 'the west floodlights are up, the yard still dark');
useObjective(s, p, { kind: 'breaker', index: 1 });
assert.ok(s.objective.done, 'both generators thrown');
run(s, 3);
assert.equal(s.waves.phase, 'lift', 'the lift opens');
const e = s.level.elevator;
Object.assign(p, { x: e.position.x - e.normal.x * 1.7, z: e.position.z - e.normal.z * 1.7 });
run(s, 8, () => s.waves.phase === 'won');
assert.equal(s.waves.phase, 'won', 'the run ends at the camp, the last floor built');
console.log('ok', s.level.name);
