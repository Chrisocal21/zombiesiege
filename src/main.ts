import { createLocalInput } from './client/localInput';
import { config } from './config';
import { createGameState } from './game/state';
import { MAX_PITCH, step } from './game/update';
import { level0 } from './levels/level0';
import { createEffects } from './render/effects';
import { createHud } from './render/hud';
import { createView, syncCamera } from './render/view';

document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.style.background = '#000';

const level = level0;
const state = createGameState(level);
const { scene, camera, renderer } = createView(level);
const input = createLocalInput(renderer.domElement);
const hud = createHud();
const effects = createEffects(scene, camera);

const tickSeconds = 1 / config.ticksPerSecond;
let leftover = 0;
let lastTime = performance.now();
let previousX = state.players[0].x;
let previousZ = state.players[0].z;

renderer.setAnimationLoop((now) => {
  // Capped so a hidden tab does not trigger a flood of catch-up ticks.
  const frameSeconds = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;
  leftover += frameSeconds;

  const player = state.players[0];
  while (leftover >= tickSeconds) {
    previousX = player.x;
    previousZ = player.z;
    step(state, [input.poll(0)], tickSeconds, level);
    leftover -= tickSeconds;
  }

  // Draw between the last two ticks so motion stays smooth on any screen refresh rate.
  // Turning is drawn from the latest tick plus the mouse movement not yet sent.
  const blend = leftover / tickSeconds;
  const look = input.pendingLook();
  syncCamera(camera, {
    x: previousX + (player.x - previousX) * blend,
    z: previousZ + (player.z - previousZ) * blend,
    yaw: player.yaw + look.yaw,
    pitch: Math.max(-MAX_PITCH, Math.min(MAX_PITCH, player.pitch + look.pitch)),
  });
  effects.update(player, frameSeconds);
  renderer.render(scene, camera);
  hud.draw(input.isLocked(), player);
});
