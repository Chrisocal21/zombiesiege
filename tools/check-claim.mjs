// Split Claim: two posts that each know half. The posts are quiet until the manifest is read; telling the
// mill about the ward cannot be said until the clinic has told the crew; said after, it settles the floor
// for nothing. Paying settles it too, and so does the walk across, which brings the dead.
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
const { interactionTarget, useAction } = await import('../src/game/doors.ts');
const { LAST_BLACKWATER, actOf } = await import('../src/game/tower.ts');

const HZ = 120;
const tick = (s, input = {}) => { for (const p of s.players) p.health = 100; step(s, [{ ...idleInput(0), ...input }], 1 / HZ); };
const run = (s, seconds) => { for (let i = 0; i < seconds * HZ; i++) tick(s); };
const CLINIC = 0, MILL = 1;

function start() {
  const s = createGameState(level0);
  startOnFloor(s, LAST_BLACKWATER + 1);
  assert.equal(s.level.name, 'Split Claim');
  assert.equal(actOf(s.floor), 9);
  const p = s.players[0];
  const inside = (b, x, z) => Math.abs(b.position.x - x) < b.size.x / 2 && Math.abs(b.position.z - z) < b.size.z / 2 && b.position.y + b.size.y / 2 > 0.3;
  assert.ok(!s.level.boxes.some((b) => inside(b, p.x, p.z)), 'spawn is clear');
  at(s, p, CLINIC, false);
  assert.notEqual(interactionTarget(s, p)?.kind, 'talk', 'the posts are quiet before the manifest is read');
  const manifest = s.level.steps[0].position;
  Object.assign(p, { x: manifest.x - 1.2, z: manifest.z });
  useObjective(s, p, { kind: 'objective' });
  run(s, 1);
  assert.equal(s.objective.step, 1);
  return { s, p };
}
// Stands the player at a post and, unless told not to, picks up the set.
function at(s, p, index, open = true) {
  const post = s.level.talks[index].position;
  Object.assign(p, { x: post.x, z: post.z + (index === CLINIC ? 1.2 : -1.2), y: 0 });
  s.zombies = [];
  if (!open) return;
  run(s, 0.1);
  assert.equal(interactionTarget(s, p)?.kind, 'talk');
  useAction(s, p);
  assert.ok(s.talk && s.talk.index === index && s.talk.reply < 0);
}

// Comparing what each side knows: the ward cannot be told to the mill until the clinic has said it.
{
  const { s, p } = start();
  at(s, p, MILL);
  tick(s, { selectWeapon: 'ak' });
  assert.equal(s.talk.reply, -1, 'not yet: the crew does not know about the ward');
  assert.ok(!s.objective.done);
  at(s, p, CLINIC);
  tick(s, { selectWeapon: 'pistol' });
  assert.equal(s.talk.reply, 0);
  run(s, 8);
  at(s, p, MILL);
  const points = s.points[p.id] ?? 0;
  tick(s, { selectWeapon: 'ak' });
  assert.ok(s.objective.done, 'the mill lets the medicine go');
  assert.equal(s.points[p.id], points + 150);
  assert.equal(s.waves.alarms, 0, 'and nobody heard a thing');
  run(s, 8);
  at(s, p, CLINIC, false);
  assert.notEqual(interactionTarget(s, p)?.kind, 'talk', 'the other post has nothing left to say');
}

// Paying the mill.
{
  const { s, p } = start();
  s.points[p.id] = 300;
  at(s, p, MILL);
  tick(s, { selectWeapon: 'shotgun' });
  assert.equal(s.points[p.id], 0);
  assert.ok(s.objective.done);
}

// The walk across: settled, paid for in noise.
{
  const { s, p } = start();
  at(s, p, CLINIC);
  const points = s.points[p.id] ?? 0;
  tick(s, { selectWeapon: 'shotgun' });
  assert.ok(s.objective.done);
  assert.equal(s.waves.alarms, 1);
  assert.equal(s.points[p.id], points + 100);
}

// Saying nothing: the load can still be stood on.
{
  const { s } = start();
  assert.equal(s.level.steps[1].kind, 'charge');
  const { device, room } = s.level.steps[1];
  assert.ok(device.position.x > room.minX && device.position.x < room.maxX);
}
console.log('ok claim');
