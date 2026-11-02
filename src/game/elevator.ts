import type { GameState, Player } from './state';
import { liftDoorBox } from './state';

export function openLift(state: GameState): void {
  state.level.boxes = state.level.boxes.filter((box) => box.surface !== 'lift');
  state.lift = { open: true, changedTick: state.tick };
}

export function closeLift(state: GameState): void {
  state.level.boxes.push(liftDoorBox(state.level.elevator));
  state.lift = { open: false, changedTick: state.tick };
}

// Standing in the cab, past the doorway and between its side walls.
export function inCab(state: GameState, player: Player): boolean {
  const { position, normal, cabDepth, cabWidth } = state.level.elevator;
  const dx = player.x - position.x;
  const dz = player.z - position.z;
  const inside = -(dx * normal.x + dz * normal.z);
  const across = Math.abs(dx * normal.z - dz * normal.x);
  return inside > 0.25 && inside < cabDepth + 0.25 && across < cabWidth / 2 && player.y < 1;
}

// True once every player still standing is in the cab.
export function everyoneInCab(state: GameState): boolean {
  const alive = state.players.filter((player) => player.health > 0);
  return alive.length > 0 && alive.every((player) => inCab(state, player));
}
