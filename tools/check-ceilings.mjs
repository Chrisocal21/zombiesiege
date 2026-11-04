import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { extname } from 'node:path';
registerHooks({ resolve(s, c, next) {
  if (s.startsWith('.') && !extname(s)) {
    try { return next(`${s}.ts`, c); } catch (e) {
      if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e;
      return next(`${s}/index.ts`, c);
    }
  }
  return next(s, c);
} });
const { createGameState } = await import('../src/game/state.ts');
const { moveBody } = await import('../src/game/movement.ts');
const { idleInput } = await import('../src/game/inputs.ts');
const { createPlayer } = await import('../src/game/state.ts');
const { ceilingHeight, groundHeight, resolveCircle } = await import('../src/game/collision.ts');
const { config } = await import('../src/config.ts');
const levels = Object.values({
  level0: (await import('../src/levels/level0.ts')).level0,
  floor3: (await import('../src/levels/floor3.ts')).floor3,
  floor6: (await import('../src/levels/floor6.ts')).floor6,
  floor9: (await import('../src/levels/floor9.ts')).floor9,
  floor12: (await import('../src/levels/floor12.ts')).floor12,
  roof: (await import('../src/levels/roof.ts')).roof,
});
const dt = 1 / 120, H = config.player.height;
let stands = 0, breaches = 0, ladders = 0;
for (const level of levels) {
  // Standing on every box top, jumping repeatedly toward a random direction: the head must never pass a slab above.
  for (const box of level.boxes) {
    const x = box.position.x, z = box.position.z, y0 = box.position.y + box.size.y / 2;
    if (groundHeight(level, x, z, config.player.radius, y0) < y0 - 1e-6) continue;
    const p = createPlayer(0, { x: 0, y: 0, z: 0 });
    Object.assign(p, { x, z, y: y0, onGround: true, vx: 0, vy: 0, vz: 0 });
    const lid = ceilingHeight(level, x, z, config.player.radius, y0 + H, y0 + 0.05);
    // Only open standing spots: not inside another box, with room to stand.
    const fit = resolveCircle(level, x, z, config.player.radius, y0, H);
    if (Math.hypot(fit.x - x, fit.z - z) > 1e-6 || lid < y0 + H) continue;
    stands++;
    let top = y0;
    for (let t = 0; t < 3; t += dt) {
      moveBody(p, { ...idleInput(0), jump: true }, dt, level);
      top = Math.max(top, p.y);
    }
    if (top + H > lid + 1e-6 && p.ladder === null && !p.mantle) { breaches++; console.log('breach', level.name ?? '', box.position, y0, top, lid); }
  }
  for (const ladder of level.ladders) {
    ladders++;
    const p = createPlayer(0, { x: 0, y: 0, z: 0 });
    Object.assign(p, { x: ladder.x + ladder.normal.x * 0.4, z: ladder.z + ladder.normal.z * 0.4, y: ladder.bottom, yaw: Math.atan2(ladder.normal.x, ladder.normal.z), onGround: true, vx: 0, vy: 0, vz: 0 });
    let reached = false;
    for (let t = 0; t < 20 && !reached; t += dt) {
      moveBody(p, { ...idleInput(0), moveForward: 1 }, dt, level);
      if (p.ladder === null && p.y >= ladder.top - 0.01) reached = true;
    }
    console.log('ladder', ladder.x.toFixed(1), ladder.z.toFixed(1), 'top', ladder.top, reached ? 'reached' : `STUCK at ${p.y.toFixed(2)} on=${!!p.ladder}`);
  }
}
console.log({ stands, breaches, ladders });
assert.equal(breaches, 0);
