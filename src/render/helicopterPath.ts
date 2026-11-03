import type { GameState } from '../game/state';

// Where the air ambulance is, worked out from the game state alone, so the picture and the sound
// agree. It is called once the helipad lights are on, comes in from the north-west over the city
// for the second half of the wait, hovers, and settles on the pad as the wait runs out.
export interface HelicopterPose {
  visible: boolean;
  x: number;
  y: number;
  z: number;
  // Heading: 0 faces -z, as for players.
  yaw: number;
  // Nose down while flying forward, level once hovering.
  pitch: number;
  // 0 out of earshot, 1 overhead.
  near: number;
  landed: boolean;
}

const START = { x: -95, y: 34, z: -70 };
const HOVER_HEIGHT = 16;
// The heading it lands on: nose east, so its side door faces the machine room.
const LANDING_YAW = -Math.PI / 2;

const hidden: HelicopterPose = { visible: false, x: 0, y: 0, z: 0, yaw: 0, pitch: 0, near: 0, landed: false };

const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp = (t: number) => Math.max(0, Math.min(1, t));

export function helicopterPose(state: GameState): HelicopterPose {
  const objective = state.level.objective;
  if (objective?.kind !== 'signal') return hidden;
  const phase = state.waves.phase;
  const pad = objective.pad;
  if (phase === 'evac' || phase === 'won') return { visible: true, x: pad.x, y: 0, z: pad.z, yaw: LANDING_YAW, pitch: 0, near: 1, landed: true };
  if (phase !== 'hold') return hidden;

  const progress = state.objective.charge / objective.seconds;
  const flight = clamp((progress - 0.45) / 0.55);
  if (flight <= 0) return hidden;

  // The approach: a long curve in from over the city to a hover above the pad.
  if (flight < 0.72) {
    const t = smooth(flight / 0.72);
    const control = { x: -40, y: 28, z: 30 };
    const at = (a: number, b: number, c: number) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * c;
    const x = at(START.x, control.x, pad.x);
    const y = at(START.y, control.y, HOVER_HEIGHT);
    const z = at(START.z, control.z, pad.z);
    // Facing along the way it is going.
    const dt = 0.01;
    const t2 = Math.min(1, t + dt);
    const ahead = (a: number, b: number, c: number) => (1 - t2) * (1 - t2) * a + 2 * (1 - t2) * t2 * b + t2 * t2 * c;
    const dx = ahead(START.x, control.x, pad.x) - x;
    const dz = ahead(START.z, control.z, pad.z) - z;
    const travel = Math.atan2(-dx, -dz);
    // It turns onto the landing heading as it slows into the hover.
    const turn = smooth(clamp((t - 0.7) / 0.3));
    const yaw = travel + Math.atan2(Math.sin(LANDING_YAW - travel), Math.cos(LANDING_YAW - travel)) * turn;
    const distance = Math.hypot(x - pad.x, y, z - pad.z);
    return { visible: true, x, y, z, yaw, pitch: 0.18 * (1 - turn), near: clamp(1 - distance / 120), landed: false };
  }
  // The descent onto the pad.
  const t = smooth((flight - 0.72) / 0.28);
  return { visible: true, x: pad.x, y: HOVER_HEIGHT * (1 - t), z: pad.z, yaw: LANDING_YAW, pitch: 0, near: 1, landed: false };
}
