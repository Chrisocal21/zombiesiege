import type { GameState } from './state';

// Seconds the water takes to climb from one authored stage to the next.
const RISE_SECONDS = 12;
// Seconds the water takes to drain once the control points are open.
const DRAIN_SECONDS = 25;

// How deep the floodwater stands on a floor with a flood (Level.flood), in metres above the ground, now.
// It rises in authored stages after the crew arrives, and drains once the floor's job is done.
export function floodHeight(state: GameState): number {
  const flood = state.level.flood;
  if (!flood || state.waves.arrivedTick < 0) return 0;
  const seconds = (state.tick - state.waves.arrivedTick) / 120;
  let height = 0;
  let before = 0;
  for (const stage of flood.stages) {
    if (seconds < stage.at) break;
    height = before + (stage.height - before) * Math.min(1, (seconds - stage.at) / RISE_SECONDS);
    before = stage.height;
  }
  if (state.objective.done && state.objective.doneTick >= 0) {
    const drained = (state.tick - state.objective.doneTick) / 120 / DRAIN_SECONDS;
    height = Math.max(0, height * (1 - Math.min(1, drained)));
  }
  return height;
}

// How much wading slows someone whose feet are under the water: half speed, from a hand's depth.
export function wadeFactor(footY: number, water: number): number {
  return footY + 0.25 < water ? 0.5 : 1;
}
