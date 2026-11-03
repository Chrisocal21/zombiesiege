import { loadBindings } from './client/bindings';
import { createAudio } from './client/audio';
import { createLocalInput } from './client/localInput';
import { loadSettings, settings } from './client/settings';
import { config } from './config';
import { createGameState, eyeY, type GameState } from './game/state';
import { MAX_PITCH, step } from './game/update';
import { startOnFloor } from './game/waves';
import { spawnZombie } from './game/zombies';
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
// Where the camera stands behind the title screen: in the garage, looking out at the gate.
const TITLE_CAMERA = { x: -1.2, y: 1.3, z: -5.5, yaw: -2.75, pitch: 0.14 };
// Where the title's zombies stand, and how far each is turned from facing the camera.
const TITLE_ZOMBIES: [number, number, number][] = [[0.24, -1.23, 0.1], [2.29, -0.99, -0.25], [-0.39, 0.66, 0.3], [4.45, 1.36, -0.4], [2.07, 4.51, 0.15], [1.27, 7.0, -0.2], [3.4, 9.0, 0.35]];
// Whether the title's zombies are still standing in the state, to be cleared when the game starts.
let dressed = false;
let state = dressTitle(createGameState(level));
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

// Behind the title, a few of them stand in the garage between the camera and the open gate,
// lit from the street. They go before the game starts.
function dressTitle(next: GameState): GameState {
  // A moment into the game, so they can be caught mid-reach with their arms out.
  next.tick = 33;
  TITLE_ZOMBIES.forEach(([x, z, turn], index) => {
    spawnZombie(next, x, z, null);
    const zombie = next.zombies[next.zombies.length - 1];
    zombie.yaw = Math.atan2(x - TITLE_CAMERA.x, z - TITLE_CAMERA.z) + turn;
    zombie.lastAttackTick = (index * 5) % 14;
  });
  dressed = true;
  return next;
}

// The menu is held until the photosensitivity warning over it is dismissed.
export function releaseTitle(): void {
  menu.release();
}

function startPose() {
  const player = state.players[0];
  return { x: player.x, y: eyeY(player), z: player.z };
}

// The title screen and the pause menu both end by capturing the mouse and going back to the game.
async function enterGame(): Promise<void> {
  input.reset();
  if (!(await input.lock())) {
    menu.showError('Mouse capture failed. Click RESUME or DEPLOY to try again.');
    return;
  }
  menu.close();
  lastTime = performance.now();
}

const menu = createMenu({
  play() {
    // A game not yet started still has the title's zombies standing in it.
    if (dressed) {
      state.zombies = [];
      state.tick = 0;
      dressed = false;
    }
    enterGame();
  },
  sound: (kind) => audio.ui(kind),
  playFloor(floor) {
    state = createGameState(level);
    // The garage starts out in the street as usual; the floors start just out of the elevator.
    if (floor > 0) startOnFloor(state, floor);
    dressed = false;
    previous = startPose();
    leftover = 0;
    enterGame();
  },
  resume: enterGame,
  gameState: () => state,
  restart() {
    state = createGameState(level);
    previous = startPose();
    leftover = 0;
    enterGame();
  },
  toTitle() {
    state = dressTitle(createGameState(level));
    previous = startPose();
    leftover = 0;
    menu.open('main');
  },
});
const hud = createHud(menu);

input.onPause(() => {
  if (menu.isOpen()) return;
  menu.open('pause');
  document.exitPointerLock();
});

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
    // Behind the title, a slow handheld drift in the garage, looking out at the gate.
    const t = now / 1000;
    pose = {
      x: TITLE_CAMERA.x + Math.sin(t * 0.11) * 0.45,
      y: TITLE_CAMERA.y + Math.sin(t * 0.37) * 0.015,
      z: TITLE_CAMERA.z + Math.sin(t * 0.07) * 0.35,
      yaw: TITLE_CAMERA.yaw + Math.sin(t * 0.09) * 0.035,
      pitch: TITLE_CAMERA.pitch + Math.sin(t * 0.13) * 0.008,
      roll: Math.sin(t * 0.21) * 0.004,
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
  view.setFlashlight(!onTitle && player.flashlight && player.health > 0);
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
