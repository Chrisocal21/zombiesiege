import { config } from '../config';
import type { GameState } from '../game/state';
import type { Scene, Vec3 } from '../levels/types';

// What the camera film needs of a scene: how long, the shots and the captions.
export type Film = Pick<Scene, 'seconds' | 'shots' | 'captions'>;
import type { IntroPose } from './intro';

// A scene in a level (the vault opening): the camera follows the level's shots while the rules hold
// still, with letterbox bars and captions. The scene's time comes from the game's ticks, so every
// player in a co-op game sees the same moment.

const smooth = (t: number) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
const mix = (a: Vec3, b: Vec3, t: number): Vec3 => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t });

// The seconds into the scene, and the scene itself, while one plays.
export function playing(state: GameState): { scene: Film; t: number } | null {
  // The flight out at the end of the run.
  if (state.waves.phase === 'flight' && state.level.flight) return { scene: state.level.flight, t: state.level.flight.seconds - state.waves.timer };
  const scene = state.level.scene;
  if (!state.scene || !scene) return null;
  return { scene, t: (state.tick - state.scene.startTick) / config.ticksPerSecond };
}

// Where the camera is at time t: along the shot playing then, eased, looking where the shot looks.
export function scenePose(scene: Film, t: number): IntroPose {
  const shot = scene.shots.find((each) => t >= each.from && t < each.to) ?? scene.shots[scene.shots.length - 1];
  const k = smooth((t - shot.from) / (shot.to - shot.from));
  const at = mix(shot.start.at, shot.end.at, k);
  const look = mix(shot.start.look, shot.end.look, k);
  const dx = look.x - at.x, dy = look.y - at.y, dz = look.z - at.z;
  return {
    x: at.x, y: at.y, z: at.z,
    yaw: Math.atan2(-dx, -dz),
    pitch: Math.atan2(dy, Math.hypot(dx, dz)),
    // A touch of handheld drift.
    roll: Math.sin(t * 0.7) * 0.004,
  };
}

export interface SceneOverlay {
  update(scene: Film, t: number): void;
  hide(hidden: boolean): void;
  remove(): void;
}

// Letterbox bars, the captions (a title, or a speaker and a line), and a dip to black at each cut.
export function createSceneOverlay(): SceneOverlay {
  const root = document.createElement('div');
  root.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:5;font-family:Bahnschrift,"Arial Narrow",sans-serif;color:#fff';
  const bar = (edge: 'top' | 'bottom') => {
    const el = document.createElement('div');
    el.style.cssText = `position:absolute;left:0;right:0;${edge}:0;height:0;background:#000`;
    root.appendChild(el);
    return el;
  };
  const top = bar('top'), bottom = bar('bottom');
  const caption = document.createElement('div');
  caption.style.cssText = 'position:absolute;left:8vw;right:8vw;bottom:16vh;text-align:center;text-shadow:0 2px 12px #000';
  root.appendChild(caption);
  const fade = document.createElement('div');
  fade.style.cssText = 'position:absolute;inset:0;background:#000;opacity:0';
  root.appendChild(fade);
  document.body.appendChild(root);

  let shown = -2;
  return {
    update(scene, t) {
      const bars = smooth(t / 0.6) * (1 - smooth((t - (scene.seconds - 0.6)) / 0.6));
      top.style.height = bottom.style.height = `${12 * bars}vh`;
      const cut = scene.shots.slice(1).reduce((dip, shot) => Math.max(dip, 1 - Math.abs(t - shot.from) / 0.3), 0);
      fade.style.opacity = String(Math.max(0, cut, 1 - t / 0.5));
      const index = scene.captions.findIndex((c) => t >= c.from && t < c.to);
      if (index === shown) return;
      shown = index;
      const c = scene.captions[index];
      if (!c) { caption.innerHTML = ''; return; }
      const text = (value: string) => value.replace(/[&<>]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[ch]!);
      caption.innerHTML = c.title
        ? `<div style="font-size:max(34px,5.5vh);font-weight:800;letter-spacing:.35em;margin-bottom:.4vh">${text(c.title)}</div>`
          + `<div style="font-size:max(16px,2.4vh);letter-spacing:.18em;font-weight:600;opacity:.92">${text(c.line)}</div>`
        : (c.speaker ? `<div style="font-size:max(12px,1.5vh);letter-spacing:.3em;font-weight:800;color:#7fd0ff;margin-bottom:.8vh">${text(c.speaker)}</div>` : '')
          + `<div style="font-size:max(18px,2.7vh);letter-spacing:.04em;font-weight:600">${text(c.line)}</div>`;
    },
    hide(hidden) { root.style.display = hidden ? 'none' : ''; },
    remove() { root.remove(); },
  };
}
