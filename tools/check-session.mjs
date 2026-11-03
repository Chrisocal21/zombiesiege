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
const { createLocalSession } = await import('../src/client/session.ts');
const { closeGate } = await import('../src/game/doors.ts');
const { createGameState, eyeY } = await import('../src/game/state.ts');
const { step } = await import('../src/game/update.ts');
const { startOnFloor } = await import('../src/game/waves.ts');
const { level0 } = await import('../src/levels/level0.ts');

// The same random numbers on every run, so two games fed the same input can be compared.
let seed = 1;
Math.random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

const tickSeconds = 1 / config.ticksPerSecond;
const idle = { playerId: 0, moveForward: 0, moveRight: 0, lookYaw: 0, lookPitch: 0, fire: false, reload: false, aim: false, lean: 0, crouch: false, jump: false, toggleCover: false, use: false, toggleFreeze: false };
// A scripted player: walks, turns, shoots and reloads, keyed on the tick so both runs agree.
const scripted = (tick) => ({
  ...idle,
  moveForward: tick % 400 < 250 ? 1 : 0,
  moveRight: tick % 300 < 100 ? -1 : 0,
  lookYaw: tick % 500 < 60 ? 0.01 : 0,
  fire: tick % 90 < 8,
  reload: tick % 700 === 0,
});

// A game in the middle of a fight, so zombies, shots and waves all run.
function fight() {
  const state = createGameState(level0);
  closeGate(state);
  return state;
}

// The old main loop: frame time piles up, then whole ticks are run from it.
function oldLoop(state, frames) {
  let leftover = 0;
  for (const frameSeconds of frames) {
    leftover += frameSeconds;
    while (leftover >= tickSeconds) {
      step(state, [scripted(state.tick)], tickSeconds);
      leftover -= tickSeconds;
    }
  }
  return { state, blend: leftover / tickSeconds };
}

// Uneven frame times, like a real screen: 60, 144 and dropped frames, capped at 0.1 seconds.
const frames = [];
for (let i = 0; i < 1500; i++) frames.push([1 / 60, 1 / 144, 1 / 30, 0.1, 1 / 75][i % 5]);

seed = 1;
const expected = oldLoop(fight(), frames);
seed = 1;
const session = createLocalSession(fight());
for (const frameSeconds of frames) session.advance(frameSeconds, () => scripted(session.state.tick));

assert.ok(expected.state.tick > 3000, 'the scripted fight runs for a while');
assert.ok(expected.state.zombies.length > 0, 'zombies spawned in the scripted fight');
assert.equal(session.state.tick, expected.state.tick, 'same number of ticks');
assert.equal(session.blend, expected.blend, 'same draw blend between ticks');
assert.deepEqual(JSON.parse(JSON.stringify(session.state)), JSON.parse(JSON.stringify(expected.state)), 'the session plays the game exactly as the old loop did');

// The eyes from the tick before the latest one, for drawing between the two.
seed = 1;
const stepped = createLocalSession(fight());
stepped.advance(tickSeconds * 3.5, () => idle);
const player = stepped.player();
assert.equal(stepped.state.tick, 3);
assert.ok(Math.abs(stepped.blend - 0.5) < 1e-9, 'half a tick left over');
assert.equal(stepped.previous.y, eyeY(player));

// Swapping in a new game starts it clean: no leftover time, and the eyes where the player stands.
const floor = createGameState(level0);
startOnFloor(floor, 2);
stepped.replace(floor);
assert.equal(stepped.state, floor);
assert.equal(stepped.blend, 0);
assert.deepEqual(stepped.previous, { x: floor.players[0].x, y: eyeY(floor.players[0]), z: floor.players[0].z });
assert.equal(stepped.player(), floor.players[0]);

console.log(`PASS: local session matches the old loop over ${expected.state.tick} ticks with ${expected.state.zombies.length} zombies`);
