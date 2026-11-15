// Shared Wall: two lines held in turn, and the radio at the other line can shorten the stand. Paying for
// people shortens it; the free answer is refused unless the run's log shows the crew dealt fairly at the
// depot (Split Claim), and given once it does. The level's own steps are never changed by it.
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
const { useObjective, objectiveTarget, fittingFront, inArea } = await import('../src/game/objectives.ts');
const { interactionTarget, useAction } = await import('../src/game/doors.ts');
const { LAST_BLACKWATER, LAST_FAULT_LINES, actOf } = await import('../src/game/tower.ts');
const { sharedWall } = await import('../src/levels/sharedWall.ts');

const HZ = 120;
const tick = (s, input = {}) => { for (const p of s.players) p.health = 100; step(s, [{ ...idleInput(0), ...input }], 1 / HZ); };
const run = (s, seconds) => { for (let i = 0; i < seconds * HZ; i++) tick(s); };
const MILL = 0, CLINIC = 1;

assert.equal(LAST_FAULT_LINES, LAST_BLACKWATER + 3);

// A game on the floor with the two cases carried across, so the clinic line is the job.
function start(log = []) {
  const s = createGameState(level0);
  s.log.push(...log.map((title) => ({ floor: LAST_BLACKWATER + 1, title, lines: [] })));
  startOnFloor(s, LAST_BLACKWATER + 3);
  assert.equal(s.level.name, 'Shared Wall');
  assert.equal(actOf(s.floor), 9);
  const p = s.players[0];
  const inside = (b, x, z) => Math.abs(b.position.x - x) < b.size.x / 2 && Math.abs(b.position.z - z) < b.size.z / 2 && b.position.y + b.size.y / 2 > 0.3;
  const clear = (x, z, what) => assert.ok(!s.level.boxes.some((b) => inside(b, x, z)), `${what} is clear`);
  clear(p.x, p.z, 'spawn');
  const carry = s.level.objective;
  assert.equal(carry.kind, 'carry');
  clear(carry.dropoff.x, carry.dropoff.z, 'drop-off');
  for (const person of s.level.rescue.people) clear(person.x, person.z, 'a place to wait');
  carry.items.forEach((item, index) => {
    clear(item.x, item.z, 'a case');
    Object.assign(p, { x: item.x, z: item.z + 0.5, y: 0 });
    assert.equal(objectiveTarget(s, p)?.kind, 'case');
    useObjective(s, p, { kind: 'case', index });
    Object.assign(p, { x: carry.dropoff.x, z: carry.dropoff.z });
    useObjective(s, p, { kind: 'deliver' });
  });
  run(s, 0.5);
  assert.equal(s.objective.step, 1);
  return { s, p };
}
// Stands the player at a line's radio and picks up the set.
function at(s, p, index) {
  const post = s.level.talks[index].position;
  Object.assign(p, { x: post.x + (index === MILL ? 1.2 : -1.2), z: post.z, y: 0 });
  s.zombies = [];
  run(s, 0.1);
  assert.equal(interactionTarget(s, p)?.kind, 'talk');
  useAction(s, p);
  assert.ok(s.talk && s.talk.index === index && s.talk.reply < 0);
}
// Starts the stand the floor is on and stays in its room until it is over. Returns how long it took.
function hold(s, p) {
  const objective = s.level.objective;
  const spot = fittingFront(objective.device);
  Object.assign(p, { x: spot.x, z: spot.z, y: 0 });
  assert.ok(inArea(p, objective.room), 'the board is inside its line');
  assert.equal(objectiveTarget(s, p)?.kind, 'device');
  useObjective(s, p, { kind: 'device' });
  const stepNow = s.objective.step, began = s.tick;
  while (s.objective.step === stepNow && !s.objective.done && s.tick - began < 80 * HZ) { s.zombies = []; tick(s); }
  return (s.tick - began) / HZ;
}

// Nothing owed and nothing paid: both stands at full length, and the free answers refused.
{
  const { s, p } = start();
  at(s, p, MILL);
  tick(s, { selectWeapon: 'ak' });
  assert.equal(s.talk.reply, -1, 'the mill owes this crew nothing');
  assert.equal(s.level.objective.seconds, 40);
  const first = hold(s, p);
  assert.ok(first > 39 && first < 42, `clinic line took ${first}`);
  assert.equal(s.objective.step, 2);
  const second = hold(s, p);
  assert.ok(second > 39 && second < 42, `mill line took ${second}`);
  assert.ok(s.objective.done);
}

// Paying the mill for rifles: the clinic stand is 20 seconds shorter. Paying twice is not on offer.
{
  const { s, p } = start();
  s.points[p.id] = 500;
  at(s, p, MILL);
  tick(s, { selectWeapon: 'shotgun' });
  assert.equal(s.points[p.id], 300);
  assert.equal(s.level.objective.seconds, 20);
  assert.equal(sharedWall.steps[1].seconds, 40, 'the level itself is untouched');
  run(s, 8);
  Object.assign(p, { x: s.level.talks[MILL].position.x + 1.2, z: s.level.talks[MILL].position.z });
  assert.notEqual(interactionTarget(s, p)?.kind, 'talk', 'the mill has sent what it will');
  const first = hold(s, p);
  assert.ok(first > 19 && first < 22, `clinic line took ${first}`);
  assert.equal(s.level.objective.seconds, 40, 'the mill line is its own stand');
}

// A crew that told the mill about the ward: rifles and rounds for nothing, then the clinic's porters too.
{
  const { s, p } = start(['Hatch Mill: Tell them about the fever ward']);
  const reserve = p.reserve, points = s.points[p.id] ?? 0;
  at(s, p, MILL);
  tick(s, { selectWeapon: 'ak' });
  assert.equal(s.talk.reply, 2);
  assert.equal(p.reserve, reserve + 24);
  assert.equal(s.level.objective.seconds, 20);
  assert.equal(s.waves.alarms, 0);
  hold(s, p);
  assert.equal(s.objective.step, 2);
  at(s, p, CLINIC);
  tick(s, { selectWeapon: 'ak' });
  assert.equal(s.points[p.id], points + 100);
  assert.equal(s.level.objective.seconds, 20);
  const second = hold(s, p);
  assert.ok(second > 19 && second < 22, `mill line took ${second}`);
  assert.ok(s.objective.done);
}

// A crew that walked the medicine across: the clinic remembers, the mill does not.
{
  const { s, p } = start(['Lincoln Road clinic: Offer to walk the medicine across with their porters']);
  at(s, p, MILL);
  tick(s, { selectWeapon: 'ak' });
  assert.equal(s.talk.reply, -1);
  hold(s, p);
  at(s, p, CLINIC);
  tick(s, { selectWeapon: 'ak' });
  assert.equal(s.talk.reply, 2);
}
console.log('ok wall');
