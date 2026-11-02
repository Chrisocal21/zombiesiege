import { createLocalInput } from './client/localInput';
import { config } from './config';
import { createGameState, eyeY } from './game/state';
import { MAX_PITCH, step } from './game/update';
import { level0 } from './levels/level0';
import { createEffects } from './render/effects';
import { createHud } from './render/hud';
import { createView, syncCamera } from './render/view';
import { createViewmodel } from './render/viewmodel';
import { createZombieViews } from './render/zombies';

document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.style.background = '#000';

const level = level0;
const state = createGameState(level);
const view = createView(level);
const input = createLocalInput(view.renderer.domElement);
const hud = createHud(level);
const viewmodel = createViewmodel(view.viewScene);
const effects = createEffects(view.scene, view.camera, viewmodel);
const zombieViews = createZombieViews(view.scene);

const tickSeconds = 1 / config.ticksPerSecond;
let leftover = 0;
let lastTime = performance.now();
let previous = { x: state.players[0].x, y: eyeY(state.players[0]), z: state.players[0].z };

view.renderer.setAnimationLoop((now) => {
  // Capped so a hidden tab does not trigger a flood of catch-up ticks.
  const frameSeconds = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;
  leftover += frameSeconds;

  while (leftover >= tickSeconds) {
    const before = state.players[0];
    previous = { x: before.x, y: eyeY(before), z: before.z };
    step(state, [input.poll(0)], tickSeconds);
    leftover -= tickSeconds;
  }
  // A restart replaces the player object, so it is looked up fresh every frame.
  const player = state.players[0];

  // Draw between the last two ticks so motion stays smooth on any screen refresh rate.
  // Turning is drawn from the latest tick plus the mouse movement not yet sent.
  const blend = leftover / tickSeconds;
  const look = input.pendingLook();
  const yaw = player.yaw + look.yaw;
  const pose = {
    // The head sits out to the side of the body when leaning.
    x: previous.x + (player.x - previous.x) * blend + Math.cos(yaw) * player.leanOffset,
    y: previous.y + (eyeY(player) - previous.y) * blend,
    z: previous.z + (player.z - previous.z) * blend - Math.sin(yaw) * player.leanOffset,
    yaw,
    pitch: Math.max(-MAX_PITCH, Math.min(MAX_PITCH, player.pitch + look.pitch)),
    roll: -(player.leanOffset / config.player.leanDistance) * config.view.leanRoll,
  };
  syncCamera(view.camera, pose);
  viewmodel.update(player, pose, frameSeconds);
  view.setAim(viewmodel.aimAmount());
  view.animate(now / 1000, state);
  input.setLookScale(view.camera.fov / config.view.fieldOfView);
  effects.update(player, frameSeconds);
  zombieViews.update(state, frameSeconds);
  view.render();
  hud.draw(input.isLocked(), state, player);
});
