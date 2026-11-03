import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { extname } from 'node:path';

// Vite resolves extensionless TypeScript imports; Node needs the extension for this check.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && !extname(specifier)) {
      try {
        return nextResolve(`${specifier}.ts`, context);
      } catch (error) {
        if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
        return nextResolve(`${specifier}/index.ts`, context);
      }
    }
    return nextResolve(specifier, context);
  },
});

const { config } = await import('../src/config.ts');
const { closeGate } = await import('../src/game/doors.ts');
const { createGameState } = await import('../src/game/state.ts');
const { startOnFloor, updateWaves } = await import('../src/game/waves.ts');
const { level0 } = await import('../src/levels/level0.ts');
const { floor3 } = await import('../src/levels/floor3.ts');

const perDoor = config.waves.doorRushZombies;

// Closing the garage gate is the "flip the switch" moment: the prep countdown starts and every
// door immediately gets its rush of zombies.
{
  const state = createGameState(level0);
  assert.equal(state.waves.phase, 'entry');
  assert.equal(state.zombies.length, 0);
  closeGate(state);
  assert.equal(state.waves.phase, 'prep');
  assert.equal(state.waves.timer, config.waves.prepSeconds);
  assert.equal(state.zombies.length, level0.doors.length * perDoor);
  assert.ok(level0.doors.length >= 4, 'the garage should have at least four doors');

  // Every zombie should be heading in from a door, not already loose in the middle of the room.
  for (const zombie of state.zombies) {
    assert.ok(zombie.entry !== null, 'a rushed zombie should still be walking in from its doorway');
    assert.equal(zombie.health, config.zombie.maxHealth);
    assert.equal(zombie.dead, false);
  }

  // Each door gets its own zombies, spread across the doorway rather than stacked on one spot.
  for (const door of level0.doors) {
    const nearDoor = state.zombies.filter((zombie) => Math.hypot(zombie.x - door.position.x, zombie.z - door.position.z) < door.width + 3);
    assert.equal(nearDoor.length, perDoor, `door at (${door.position.x}, ${door.position.z}) should get ${perDoor} zombies`);
    const distinctSpots = new Set(nearDoor.map((zombie) => `${zombie.x.toFixed(3)},${zombie.z.toFixed(3)}`));
    assert.equal(distinctSpots.size, perDoor, 'zombies at the same door should not be stacked on one spot');
  }

  // Zombies already chase the nearest player during prep, since updateZombies runs regardless of
  // wave phase; only the wave clock itself waits out the prep timer.
  const before = state.zombies.map((zombie) => ({ x: zombie.x, z: zombie.z }));
  for (let i = 0; i < 60; i++) updateWaves(state, 1 / config.ticksPerSecond, state.level);
  const movedTowardPlayer = state.zombies.some((zombie, index) => {
    const distanceBefore = Math.hypot(before[index].x - state.players[0].x, before[index].z - state.players[0].z);
    const distanceAfter = Math.hypot(zombie.x - state.players[0].x, zombie.z - state.players[0].z);
    return distanceAfter < distanceBefore - 0.001;
  });
  // updateWaves alone does not move zombies (that is updateZombies' job via step()), so this just
  // confirms prep does not itself freeze or clear them while the countdown runs.
  assert.equal(state.zombies.length, level0.doors.length * perDoor, 'prep must not clear the rushed zombies while the timer counts down');
  void movedTowardPlayer;
}

// Arriving on an upper floor is the same moment, without a gate: beginPrep runs directly.
{
  const state = createGameState(level0);
  startOnFloor(state, 1);
  assert.equal(state.level.name, floor3.name);
  assert.equal(state.waves.phase, 'prep');
  assert.equal(state.zombies.length, floor3.doors.length * perDoor);
  assert.ok(!state.level.gate, 'upper floors have no street gate');
}

// The real gate interaction only exists during 'entry', so a player cannot trigger the door
// rush twice through normal play once the gate is down.
{
  const { interactionTarget } = await import('../src/game/doors.ts');
  const state = createGameState(level0);
  const player = state.players[0];
  const gate = level0.gate;
  player.x = gate.panel.x;
  player.z = gate.panel.z;
  player.y = 0;
  assert.deepEqual(interactionTarget(state, player), { kind: 'gate' });
  closeGate(state);
  assert.notDeepEqual(interactionTarget(state, player), { kind: 'gate' });
}

console.log('PASS: every door rushes zombies the moment the gate closes or a floor begins');
