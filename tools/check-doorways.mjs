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
const floors = process.argv.slice(2).map(Number);
for (const floor of floors) {
  const s = createGameState(level0);
  startOnFloor(s, floor);
  for (let i = 0; i < 120 * 45; i++) step(s, [idleInput(0)], 1 / 120);
  const doors = s.level.doors;
  const alive = s.zombies.filter((z) => !z.dead);
  let stuck = 0;
  const near = [];
  for (const z of alive) {
    const d = Math.min(...doors.map((door) => Math.hypot(z.x - door.position.x, z.z - door.position.z)));
    if (d < 3.3) { stuck++; near.push([+z.x.toFixed(1), +z.z.toFixed(1), z.pushing, z.entry ? 'entry' : 'free']); }
  }
  // Zombies must come out of their doorways, not sit behind something in them.
  assert.ok(stuck <= Math.max(2, alive.length / 4), `${s.level.name}: ${stuck} of ${alive.length} zombies stuck in doorways`);
  console.log(s.level.name, 'phase', s.waves.phase, 'alive', alive.length, 'still in doorways', stuck, JSON.stringify(near.slice(0, 4)), 'player hp', s.players[0].health);
}
