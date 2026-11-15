// Arrival and getting unstuck: nothing hurts the crew for a few seconds after arriving or while a co-op
// player is still loading; STUCK puts a player back at the floor's start; and the doorways the dead come
// in by are shut to the living.
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { extname } from 'node:path';
registerHooks({ resolve(s, c, next) {
  if (s.startsWith('.') && !extname(s)) { try { return next(`${s}.ts`, c); } catch (e) { if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e; return next(`${s}/index.ts`, c); } }
  return next(s, c); } });
const { config } = await import('../src/config.ts');
const { createGameState, spawnPoint } = await import('../src/game/state.ts');
const { level0 } = await import('../src/levels/level0.ts');
const { startOnFloor } = await import('../src/game/waves.ts');
const { step } = await import('../src/game/update.ts');
const { idleInput } = await import('../src/game/inputs.ts');
const { hurtPlayer, ARRIVAL_GRACE_SECONDS } = await import('../src/game/zombies.ts');
const { readClientMessage } = await import('../src/net/protocol.ts');
const { LAST_ROADS } = await import('../src/game/tower.ts');

const HZ = config.ticksPerSecond;

// The grace after arriving, then hurt as usual; and a player still loading is never hurt.
{
  const s = createGameState(level0);
  startOnFloor(s, 1);
  const p = s.players[0];
  s.waves.arrivedTick = s.tick;
  hurtPlayer(s, p, 30);
  assert.equal(p.health, 100, 'safe straight after arriving');
  s.tick += ARRIVAL_GRACE_SECONDS * HZ;
  hurtPlayer(s, p, 30);
  assert.equal(p.health, 70, 'hurt once the grace is over');
  p.loading = true;
  hurtPlayer(s, p, 30);
  assert.equal(p.health, 70, 'safe while still loading');
  step(s, [{ ...idleInput(0), loading: false }], 1 / HZ);
  assert.equal(p.loading, false, 'the flag follows the input');
  assert.equal(readClientMessage(JSON.stringify({ type: 'input', seq: 1, input: { loading: true, unstick: true } }), 0).input.loading, true, 'the server lets it through');
}

// STUCK: back to the floor's own spawn, standing, whatever was going on.
{
  const s = createGameState(level0);
  startOnFloor(s, 1);
  const p = s.players[0];
  Object.assign(p, { x: p.x + 7, z: p.z - 3, y: 2, vy: -3, onGround: false });
  step(s, [{ ...idleInput(0), unstick: true }], 1 / HZ);
  const at = spawnPoint(s.level.playerSpawns, 0, s.level.spawnYaw);
  assert.ok(Math.hypot(p.x - at.x, p.z - at.z) < 0.2, `back at the spawn (${p.x.toFixed(2)}, ${p.z.toFixed(2)})`);
  assert.equal(p.y, at.y);
}

// Doorways: walking straight at one from inside stops at the wall line, on every outdoor floor that has them.
{
  const s = createGameState(level0);
  startOnFloor(s, LAST_ROADS + 2);
  const door = s.level.doors[0];
  assert.ok(door, 'the floor has a doorway');
  s.zombies = [];
  s.frozen = true;
  const p = s.players[0];
  Object.assign(p, { x: door.position.x + door.normal.x * 2, z: door.position.z + door.normal.z * 2, y: 0, yaw: Math.atan2(door.normal.x, door.normal.z) });
  for (let i = 0; i < 3 * HZ; i++) step(s, [{ ...idleInput(0), moveForward: 1 }], 1 / HZ);
  const past = (p.x - door.position.x) * door.normal.x + (p.z - door.position.z) * door.normal.z;
  assert.ok(past > 0.2, `kept on the room side of the doorway (${past.toFixed(2)} m in)`);
  // The same walk with the doorways left open does go through, so the test is walking the right way.
  s.level = { ...s.level, doors: [] };
  for (let i = 0; i < 3 * HZ; i++) step(s, [{ ...idleInput(0), moveForward: 1 }], 1 / HZ);
  const open = (p.x - door.position.x) * door.normal.x + (p.z - door.position.z) * door.normal.z;
  assert.ok(open < -0.5, `walks out when nothing stops it (${open.toFixed(2)})`);
}
console.log('ok safety');
