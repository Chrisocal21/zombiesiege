import { createLocalInput } from './client/localInput';
import { config } from './config';
import { createGameState } from './game/state';
import { step } from './game/update';
import { level0 } from './levels/level0';
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

const tickSeconds = 1 / config.ticksPerSecond;
let leftover = 0;
let lastTime = performance.now();

renderer.setAnimationLoop((now) => {
  // Capped so a hidden tab does not trigger a flood of catch-up ticks.
  leftover += Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  while (leftover >= tickSeconds) {
    step(state, [input.poll(0)], tickSeconds, level);
    leftover -= tickSeconds;
  }

  syncCamera(camera, state.players[0]);
  renderer.render(scene, camera);
  hud.draw(input.isLocked());
});
