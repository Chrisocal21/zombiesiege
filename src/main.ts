import { loadBindings } from './client/bindings';
import { createLocalInput } from './client/localInput';
import { loadSettings, settings } from './client/settings';
import { config } from './config';
import { createGameState, eyeY } from './game/state';
import { MAX_PITCH, step } from './game/update';
import { level0 } from './levels/level0';
import { createEffects } from './render/effects';
import { createHud } from './render/hud';
import { createMenu } from './render/menu';
import { createView, syncCamera } from './render/view';
import { createViewmodel } from './render/viewmodel';
import { createZombieViews } from './render/zombies';

document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.style.background = '#000';

loadSettings();
loadBindings();

const level = level0;
let state = createGameState(level);
const view = createView(level);
const input = createLocalInput(view.renderer.domElement);
const viewmodel = createViewmodel(view.viewScene);
const effects = createEffects(view.scene, view.camera, viewmodel);
const zombieViews = createZombieViews(view.scene);

const tickSeconds = 1 / config.ticksPerSecond;
let leftover = 0;
let lastTime = performance.now();
let previous = startPose();

function startPose() {
  const player = state.players[0];
  return { x: player.x, y: eyeY(player), z: player.z };
}

// The title screen and the pause menu both end by capturing the mouse and going back to the game.
function enterGame(): void {
  menu.close();
  input.reset();
  input.lock();
  lastTime = performance.now();
}

const menu = createMenu({
  play: enterGame,
  resume: enterGame,
  restart() {
    state = createGameState(level);
    previous = startPose();
    leftover = 0;
    enterGame();
  },
});
const hud = createHud(level, menu);

// Esc, or anything else that releases the mouse, opens the pause menu.
input.onUnlock(() => {
  if (!menu.isOpen()) menu.open('pause');
});

view.renderer.setAnimationLoop((now) => {
  // Capped so a hidden tab does not trigger a flood of catch-up ticks.
  const frameSeconds = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;
  const paused = menu.isOpen();

  if (!paused) {
    leftover += frameSeconds;
    while (leftover >= tickSeconds) {
      const before = state.players[0];
      previous = { x: before.x, y: eyeY(before), z: before.z };
      step(state, [input.poll(0)], tickSeconds);
      leftover -= tickSeconds;
    }
  }
  // A restart replaces the player object, so it is looked up fresh every frame.
  const player = state.players[0];

  // Draw between the last two ticks so motion stays smooth on any screen refresh rate.
  // Turning is drawn from the latest tick plus the mouse movement not yet sent.
  const blend = leftover / tickSeconds;
  const look = paused ? { yaw: 0, pitch: 0 } : input.pendingLook();
  const yaw = player.yaw + look.yaw;
  let pose = {
    // The head sits out to the side of the body when leaning.
    x: previous.x + (player.x - previous.x) * blend + Math.cos(yaw) * player.leanOffset,
    y: previous.y + (eyeY(player) - previous.y) * blend,
    z: previous.z + (player.z - previous.z) * blend - Math.sin(yaw) * player.leanOffset,
    yaw,
    pitch: Math.max(-MAX_PITCH, Math.min(MAX_PITCH, player.pitch + look.pitch)),
    roll: -(player.leanOffset / config.player.leanDistance) * config.view.leanRoll,
  };
  const onTitle = menu.onTitle();
  if (onTitle) {
    // Behind the title, the camera drifts slowly along the street.
    const t = now / 1000;
    const spawn = level.streetSpawns[0];
    pose = {
      x: spawn.x - 6 + Math.sin(t * 0.09) * 5,
      y: spawn.y + 2.1,
      z: spawn.z + 1,
      yaw: 0.35 + Math.sin(t * 0.07) * 0.22,
      pitch: 0.02,
      roll: 0,
    };
  }

  syncCamera(view.camera, pose);
  if (!onTitle) viewmodel.update(player, pose, paused ? 0 : frameSeconds);
  view.setAim(onTitle ? 0 : viewmodel.aimAmount());
  view.animate(now / 1000, state);
  input.setLookScale(view.camera.fov / settings.fieldOfView);
  effects.update(player, paused ? 0 : frameSeconds);
  zombieViews.update(state, paused ? 0 : frameSeconds);
  view.render(!onTitle);
  hud.draw(state, player, now / 1000);
});
