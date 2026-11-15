// Act 4, daybreak: gates instead of lifts, run floors with the dead coming from behind, the shop shortcut,
// the 30 second relay stand, and the flight out at the end. Runs the game headless.
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
const { radioLine } = await import('../src/render/radio.ts');
const { playing } = await import('../src/client/scene.ts');
const { helicopterPose } = await import('../src/render/helicopterPath.ts');
const { LAST_VAULT, LAST_FLOOR } = await import('../src/game/tower.ts');

const HZ = 120;
const tick = (s) => step(s, [idleInput(0)], 1 / HZ);
const run = (s, seconds, at) => { for (let i = 0; i < seconds * HZ; i++) { for (const p of s.players) { p.health = 100; if (at) Object.assign(p, at); } tick(s); } };
const [MAIN, MARKET, BARRICADES, PARK] = [1, 2, 3, 4].map((k) => LAST_VAULT + k);

// ---- Main Street ----------------------------------------------------------------------------------
{
  const s = createGameState(level0);
  startOnFloor(s, MAIN);
  assert.equal(s.level.name, 'Main Street');
  assert.ok(s.level.exitGate, 'the way on is a gate');
  assert.equal(flowOf(s.level).kind, 'run');
  assert.equal(s.lift.open, false, 'the gate is shut');
  assert.equal(s.level.objective.kind, 'breakers');
  assert.equal(s.level.objective.panels.length, 1, 'one control box');
  assert.ok(s.zombies.filter((z) => z.dormant).length >= 6, 'the shop has its shoppers');
  const p0 = s.players[0];
  assert.ok(p0.x < -20, 'the crew starts at the west end');
  // The run: standing still, they come out of the doors behind the crew.
  run(s, 30);
  const awake = s.zombies.filter((z) => !z.dormant).length;
  assert.ok(awake >= 3, `${awake} come after a standing crew`);
  // The control box opens the gate; everyone through it goes on, with no cab.
  useObjective(s, p0, { kind: 'breaker', index: 0 });
  assert.ok(s.objective.done);
  run(s, 3);
  assert.equal(s.waves.phase, 'lift', 'the gate opens');
  assert.equal(s.lift.open, true);
  const e = s.level.elevator;
  Object.assign(p0, { x: e.position.x - e.normal.x * 1.7, z: e.position.z - e.normal.z * 1.7 });
  run(s, 3);
  assert.equal(s.floor, MARKET, 'through the gate to the market');
  assert.ok(s.level.exitGate && s.players[0].x < -10, 'the crew steps out at the start, not in a cab');
}

// ---- The shop is a way through ---------------------------------------------------------------------------
{
  const s = createGameState(level0);
  startOnFloor(s, MAIN);
  const boxes = s.level.boxes;
  const blocked = (x, z) => boxes.some((b) => b.position.y + b.size.y / 2 > 0.5 && b.position.y - b.size.y / 2 < 1.5
    && Math.abs(x - b.position.x) < b.size.x / 2 + 0.3 && Math.abs(z - b.position.z) < b.size.z / 2 + 0.3);
  // A grid walk from the start to the gate, with and without the shop's doors.
  const reach = (shop) => {
    const dist = new Map([['-24,0', 0]]); const queue = [[-24, 0, 0]];
    while (queue.length) {
      queue.sort((p, q) => p[2] - q[2]);
      const [x, z, d] = queue.shift();
      if (d > (dist.get(`${x},${z}`) ?? Infinity)) continue;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const nx = x + dx, nz = z + dz;
        if (nx < -29 || nx > 29 || nz < -15 || nz > 11) continue;
        if (!shop && nz < -10.5) continue;
        if (blocked(nx, nz) || (dx && dz && (blocked(x + dx, z) || blocked(x, z + dz)))) continue;
        const nd = d + Math.hypot(dx, dz);
        if (nd < (dist.get(`${nx},${nz}`) ?? Infinity)) { dist.set(`${nx},${nz}`, nd); queue.push([nx, nz, nd]); }
      }
    }
    if (shop) console.log('interior', dist.get('0,-12'), 'door', dist.get('-12,-10'));
    return dist.get('26,0');
  };
  const road = reach(false), shortcut = reach(true);
  console.log('road', road, 'm, shop route', shortcut, 'm');
  assert.ok(road !== undefined, 'the open road gets there');
  assert.ok(shortcut !== undefined && shortcut < road, 'the shop is the shorter way');
}

// ---- The market: a 30 second relay stand -------------------------------------------------------------------
{
  const s = createGameState(level0);
  startOnFloor(s, MARKET);
  assert.equal(flowOf(s.level).kind, 'run');
  assert.equal(s.level.objective.kind, 'charge');
  assert.equal(s.level.objective.seconds, 30);
  assert.ok(s.level.exitGate);
  run(s, 8);
  assert.match(radioLine({ ...s, tick: s.waves.arrivedTick + 8 * HZ }).text, /relay/i);
  const d = s.level.objective.device.position;
  Object.assign(s.players[0], { x: d.x, z: d.z + 3 });
  useObjective(s, s.players[0], { kind: 'device' });
  s.zombies = [];
  run(s, 33, { x: d.x, z: d.z + 3 });
  assert.ok(s.objective.done, 'the stand ends');
  assert.match(radioLine({ ...s, tick: s.objective.doneTick + 2 * HZ }).text, /somewhere flat/);
}

// ---- The barricades ---------------------------------------------------------------------------------------------
{
  const s = createGameState(level0);
  startOnFloor(s, BARRICADES);
  assert.ok(s.level.exitGate && flowOf(s.level).kind === 'run');
  assert.equal(s.level.objective.panels.length, 3);
  assert.equal(s.level.notes[0].title, 'Evacuation map');
}

// ---- The park and the flight ------------------------------------------------------------------------------------
{
  const s = createGameState(level0);
  startOnFloor(s, PARK);
  assert.equal(s.floor, LAST_FLOOR - 2);
  assert.ok(s.level.flight && s.level.flight.seconds > 10);
  s.zombies = []; s.objective.done = true; s.waves.phase = 'evac';
  const pad = s.level.objective.pad;
  Object.assign(s.players[0], { x: pad.x, z: pad.z });
  tick(s);
  assert.equal(s.waves.phase, 'flight', 'everyone aboard: the flight');
  const first = playing(s);
  assert.ok(first && first.t < 0.1, 'the film starts');
  const before = helicopterPose(s);
  run(s, 6);
  const after = helicopterPose(s);
  assert.ok(after.y > before.y + 5, 'it lifts off');
  const start = { ...s.players[0] };
  for (let i = 0; i < 2 * HZ; i++) step(s, [{ ...idleInput(0), moveForward: 1 }], 1 / HZ);
  assert.equal(s.players[0].x, start.x, 'nobody walks off during the film');
  run(s, 16);
  assert.equal(s.floor, LAST_FLOOR - 1, 'then the crew arrives on the camp road');
  assert.equal(s.level.name, 'The Missing Delivery');
}
console.log('ok');
