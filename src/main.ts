import { loadBindings } from './client/bindings';
import { createAudio } from './client/audio';
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
const audio = createAudio();

const tickSeconds = 1 / config.ticksPerSecond;
let reviewing = false;
let leftover = 0;
let lastTime = performance.now();
let previous = startPose();
let gaitPhase = 0;
let visualRecoil = 0;
let renderedShot = -1;
let bodycamRoll = 0;
let bodycamLastYaw: number | null = null;

function startPose() {
  const player = state.players[0];
  return { x: player.x, y: eyeY(player), z: player.z };
}

// The title screen and the pause menu both end by capturing the mouse and going back to the game.
async function enterGame(): Promise<void> {
  input.reset();
  if (!(await input.lock())) return;
  menu.close();
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
  toTitle() {
    state = createGameState(level);
    previous = startPose();
    leftover = 0;
    menu.open('main');
  },
});
const hud = createHud(menu);

// Esc, or anything else that releases the mouse, opens the pause menu.
input.onUnlock(() => {
  if (!menu.isOpen()) menu.open('pause');
});

view.renderer.setAnimationLoop((now) => {
  // Capped so a hidden tab does not trigger a flood of catch-up ticks.
  const frameSeconds = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;
  const paused = menu.isOpen();

  if (!paused && !reviewing) {
    leftover += frameSeconds;
    while (leftover >= tickSeconds) {
      const before = state.players[0];
      previous = { x: before.x, y: eyeY(before), z: before.z };
      step(state, [input.poll(0)], tickSeconds);
      leftover -= tickSeconds;
    }
  }
  // The run is over: show the victory screen and let go of the mouse.
  if (state.waves.phase === 'won' && !menu.isOpen()) {
    menu.open('victory', {
      floors: state.floor + 1,
      points: state.points[0] ?? 0,
      lives: state.lives,
      seconds: state.tick / config.ticksPerSecond,
    });
    document.exitPointerLock();
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

  const speed = player.onGround ? Math.hypot(player.vx, player.vz) : 0;
  gaitPhase += speed * frameSeconds * 1.5;
  if (player.lastShotTick !== renderedShot) {
    renderedShot = player.lastShotTick;
    if (renderedShot >= 0) visualRecoil = 0.006;
  }
  visualRecoil *= Math.exp(-frameSeconds * 16);
  const motion = settings.cameraMotion && !paused ? 1 : 0;
  const gait = Math.min(1, speed / config.player.moveSpeed) * (player.aiming ? 0.3 : 1) * motion;
  const chest = settings.cameraStyle === 'bodycam' && !onTitle;
  const yawChange = bodycamLastYaw === null ? 0 : Math.atan2(Math.sin(pose.yaw - bodycamLastYaw), Math.cos(pose.yaw - bodycamLastYaw));
  bodycamLastYaw = pose.yaw;
  const rollTarget = chest && motion ? Math.max(-0.035, Math.min(0.035, -yawChange * 0.4)) : 0;
  bodycamRoll += (rollTarget - bodycamRoll) * (1 - Math.exp(-frameSeconds * 12));
  syncCamera(view.camera, { ...pose,
    y: pose.y + Math.sin(gaitPhase * 2) * (chest ? 0.022 : 0.012) * gait,
    pitch: pose.pitch + visualRecoil * motion,
    roll: pose.roll + Math.sin(gaitPhase) * (chest ? 0.008 : 0.002) * gait + bodycamRoll,
  });
  const outfitPreview = menu.screen() === 'character';
  if (!onTitle || outfitPreview) viewmodel.update(player, pose, paused ? 0 : frameSeconds, outfitPreview);
  view.setAim(onTitle ? 0 : viewmodel.aimAmount());
  view.animate(now / 1000, state);
  input.setLookScale(view.camera.fov / settings.fieldOfView);
  effects.update(player, paused ? 0 : frameSeconds, state.level);
  zombieViews.update(state, paused ? 0 : frameSeconds);
  audio.update(state, player, paused || onTitle, frameSeconds);
  view.render(!onTitle);
  if (outfitPreview) view.renderOutfitPreview();
  hud.draw(state, player, now / 1000);
});

// Opt-in development review harness; excluded from production builds.
if (import.meta.env.DEV && new URLSearchParams(location.search).has('review')) {
  import('./client/review').then(({ installReview }) => installReview({
    level, menu, hud, view,
    replace(next) { state = next; previous = startPose(); leftover = 0; reviewing = true; },
    state: () => state,
  }));
}
