// Talks: the field radio on False Instructions. It opens only on its step; a question leaves it open; an
// answer that costs is refused without the points; paying does the last step from the other end; the
// stadium answer hands over rounds and brings the dead; a weapon key spent on an answer does not change guns.
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
const { LAST_ROADS } = await import('../src/game/tower.ts');

const HZ = 120;
const tick = (s, input = {}) => { for (const p of s.players) p.health = 100; step(s, [{ ...idleInput(0), ...input }], 1 / HZ); };
const run = (s, seconds) => { for (let i = 0; i < seconds * HZ; i++) tick(s); };

// A game stood at the radio with the loop cut, so the desk is calling.
function atRadio() {
  const s = createGameState(level0);
  startOnFloor(s, LAST_ROADS + 2);
  assert.equal(s.level.name, 'False Instructions');
  const p = s.players[0];
  const radio = s.level.talks[0].position;
  Object.assign(p, { x: radio.x, z: radio.z + 1.2, y: 0 });
  assert.notEqual(interactionTarget(s, p)?.kind, 'talk', 'the radio is quiet before the loop is cut');
  const log = s.level.steps[0].position;
  Object.assign(p, { x: log.x + 1.2, z: log.z });
  useObjective(s, p, { kind: 'objective' });
  run(s, 1);
  useObjective(s, p, { kind: 'breaker', index: 0 });
  useObjective(s, p, { kind: 'breaker', index: 1 });
  run(s, 1);
  assert.equal(s.objective.step, 2);
  Object.assign(p, { x: radio.x, z: radio.z + 1.2, y: 0 });
  s.zombies = [];
  assert.equal(interactionTarget(s, p)?.kind, 'talk', 'the radio answers once the loop is cut');
  useAction(s, p);
  assert.ok(s.talk && s.talk.reply < 0, 'the talk is open on its choices');
  return { s, p };
}

// The question: a reply, the talk not settled, and the pistol key did not change the gun.
{
  const { s, p } = atRadio();
  const gun = p.weapon;
  tick(s, { selectWeapon: 'pistol' });
  assert.equal(s.talk.reply, 0);
  assert.equal(p.weapon, gun);
  assert.ok(!s.talks[0].done, 'a question leaves the talk open');
  run(s, 8);
  assert.equal(s.talk, null, 'the reply goes away');
  assert.equal(interactionTarget(s, p)?.kind, 'talk', 'and the radio can be answered again');
}

// Paying: refused without the points, then the last step is done from the other end.
{
  const { s, p } = atRadio();
  s.points[p.id] = 100;
  tick(s, { selectWeapon: 'shotgun' });
  assert.equal(s.talk.reply, -1, 'refused: not enough points');
  assert.equal(s.points[p.id], 100);
  s.points[p.id] = 300;
  tick(s, { selectWeapon: 'shotgun' });
  assert.equal(s.points[p.id], 50);
  assert.ok(s.objective.done, 'the desk sent the correction');
  assert.ok(s.talks[0].done);
  assert.ok(s.log.some((entry) => entry.title.startsWith('Regional desk')), 'the answer is in the run log');
  run(s, 8);
  assert.notEqual(interactionTarget(s, p)?.kind, 'talk', 'the radio is finished with');
}

// The stadium: rounds handed over, the dead called, and the stand still to do.
{
  const { s, p } = atRadio();
  const before = p.reserve, alarms = s.waves.alarms;
  tick(s, { selectWeapon: 'ak' });
  assert.equal(p.reserve, before + 24);
  assert.equal(s.waves.alarms, alarms + 1);
  assert.ok(!s.objective.done && s.objective.step === 2, 'the correction is still the crew to send');
}

// Walking off puts it away.
{
  const { s, p } = atRadio();
  p.x -= 6;
  tick(s);
  assert.equal(s.talk, null);
}
console.log('ok talks');
