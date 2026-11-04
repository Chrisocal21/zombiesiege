import type { Level } from '../levels/types';

// The opening scene on the street outside the garage: a few seconds of camera work before the first
// level begins. It only moves the camera and a few zombies; the rules do not run during it.
export const INTRO_SECONDS = 14;

export interface IntroPose { x: number; y: number; z: number; yaw: number; pitch: number; roll: number }

type Vec = [number, number, number];
interface Shot { from: number; to: number; start: { at: Vec; look: Vec }; end: { at: Vec; look: Vec } }

const smooth = (t: number) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
const mix = (a: Vec, b: Vec, t: number): Vec => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// Street height is 4.9; the ramp runs down to the garage from z 34.5 to z 10.5 at x 3.
const SHOTS: Shot[] = [
  // High and wide from the east: the street, the ambulance and the mouth of the ramp.
  { from: 0, to: 4.6, start: { at: [26, 9.5, 44], look: [4, 4.2, 27] }, end: { at: [19, 7.2, 42], look: [4, 4.2, 29] } },
  // Low at the top of the ramp, looking down into the dark as they come up it.
  { from: 4.6, to: 9.4, start: { at: [5.2, 5.9, 39.5], look: [3, 4.6, 20] }, end: { at: [4.4, 5.8, 38], look: [3, 4.9, 24] } },
];

// Looks from one point at another, in the game's angles: yaw 0 faces -z, pitch up is positive.
function aim(at: Vec, look: Vec): { yaw: number; pitch: number } {
  const dx = look[0] - at[0], dy = look[1] - at[1], dz = look[2] - at[2];
  return { yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)) };
}

const turn = (from: number, to: number, t: number) => from + Math.atan2(Math.sin(to - from), Math.cos(to - from)) * t;

export function introPose(t: number, finish: IntroPose): IntroPose {
  const shot = SHOTS.find((s) => t >= s.from && t < s.to);
  let base: IntroPose;
  if (shot) {
    const k = (t - shot.from) / (shot.to - shot.from);
    const at = mix(shot.start.at, shot.end.at, k);
    const look = mix(shot.start.look, shot.end.look, k);
    base = { x: at[0], y: at[1], z: at[2], ...aim(at, look), roll: 0 };
  } else {
    // Last, the camera comes round to where the player stands, and settles on their view.
    const last = SHOTS[SHOTS.length - 1];
    const from = last.end.at;
    const k = smooth((t - last.to) / (INTRO_SECONDS - last.to));
    const lookStart = aim(from, last.end.look);
    base = {
      x: from[0] + (finish.x - from[0]) * k, y: from[1] + (finish.y - from[1]) * k, z: from[2] + (finish.z - from[2]) * k,
      yaw: turn(lookStart.yaw, finish.yaw, k), pitch: lookStart.pitch + (finish.pitch - lookStart.pitch) * k, roll: 0,
    };
  }
  // A little handheld drift, gone by the time the player has control.
  const calm = 1 - smooth((t - (INTRO_SECONDS - 2)) / 2);
  base.yaw += Math.sin(t * 0.9) * 0.004 * calm;
  base.pitch += Math.sin(t * 1.3 + 1) * 0.003 * calm;
  base.roll = Math.sin(t * 0.7) * 0.004 * calm;
  return base;
}

// The ones that climb the ramp. They start well down in the garage and shamble up toward the street,
// a few quicker than the rest.
const WALKERS: { x: number; z0: number; delay: number; speed: number; sway: number }[] = [
  { x: 3.6, z0: 16, delay: 0.0, speed: 2.1, sway: 1 },
  { x: 2.3, z0: 14, delay: 1.0, speed: 1.7, sway: -1 },
  { x: 3.1, z0: 11, delay: 2.4, speed: 1.9, sway: 1 },
  { x: 4.1, z0: 11, delay: 3.4, speed: 1.4, sway: -1 },
  { x: 2.0, z0: 11, delay: 5.0, speed: 1.6, sway: 1 },
];
export const WALKER_COUNT = WALKERS.length;

export function introWalker(index: number, t: number, level: Level): { x: number; z: number; yaw: number } {
  const w = WALKERS[index];
  const top = level.ramp ? level.ramp.zTop - 0.8 : 30;
  const z = Math.min(top - index * 0.9, w.z0 + Math.max(0, t - w.delay) * w.speed);
  const x = w.x + Math.sin(t * 0.8 + index * 2) * 0.25 * w.sway;
  // Heading up the ramp toward the street, which is +z.
  return { x, z, yaw: Math.PI + Math.sin(t * 0.6 + index) * 0.12 };
}

interface Caption { from: number; to: number; title?: string; line: string }
const CAPTIONS: Caption[] = [
  { from: 0.8, to: 4.2, title: 'LEVEL 0', line: 'The hospital parking garage' },
  { from: 5.2, to: 8.8, line: 'The crew drove in to bring survivors out.' },
  { from: 9.6, to: 13.0, line: 'The garage is already overrun.' },
];

export interface IntroOverlay {
  update(t: number): void;
  hide(hidden: boolean): void;
  remove(): void;
}

// Letterbox bars, the captions, a fade in from black, and a skip hint.
export function createIntroOverlay(): IntroOverlay {
  const root = document.createElement('div');
  root.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:5;font-family:Bahnschrift,"Arial Narrow",sans-serif;color:#fff';
  const bar = (edge: 'top' | 'bottom') => {
    const el = document.createElement('div');
    el.style.cssText = `position:absolute;left:0;right:0;${edge}:0;height:12vh;background:#000`;
    root.appendChild(el);
    return el;
  };
  const top = bar('top'), bottom = bar('bottom');
  const caption = document.createElement('div');
  caption.style.cssText = 'position:absolute;left:0;right:0;bottom:17vh;text-align:center;text-shadow:0 2px 12px #000';
  root.appendChild(caption);
  const hint = document.createElement('div');
  hint.textContent = 'SPACE  SKIP';
  hint.style.cssText = 'position:absolute;right:3vw;bottom:3vh;font-size:max(12px,1.1vh);letter-spacing:.25em;opacity:.55;font-weight:700';
  root.appendChild(hint);
  const fade = document.createElement('div');
  fade.style.cssText = 'position:absolute;inset:0;background:#000';
  root.appendChild(fade);
  document.body.appendChild(root);

  let shown = -2;
  return {
    update(t) {
      // In from black at the start, with a dip at the cut between shots, and the bars draw back at the end.
      const dip = Math.max(0, 1 - Math.abs(t - SHOTS[0].to) / 0.35);
      const fadeIn = Math.max(0, 1 - t / 1.2);
      fade.style.opacity = String(Math.max(dip, fadeIn));
      const bars = 1 - smooth((t - (INTRO_SECONDS - 1.5)) / 1.5);
      top.style.height = bottom.style.height = `${12 * bars}vh`;
      hint.style.opacity = String(0.55 * bars);
      const index = CAPTIONS.findIndex((c) => t >= c.from && t < c.to);
      if (index !== shown) {
        shown = index;
        const c = CAPTIONS[index];
        caption.innerHTML = c
          ? (c.title ? `<div style="font-size:max(34px,5.5vh);font-weight:800;letter-spacing:.35em;margin-bottom:.4vh">${c.title}</div>` : '')
            + `<div style="font-size:max(16px,2.4vh);letter-spacing:.18em;font-weight:600;opacity:.92">${c.line}</div>`
          : '';
      }
    },
    hide(hidden) { root.style.display = hidden ? 'none' : ''; },
    remove() { root.remove(); },
  };
}
