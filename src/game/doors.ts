import { config } from '../config';
import type { Door, LevelBox } from '../levels/types';
import type { GameState, Player } from './state';

export type Interaction = { kind: 'pickup'; index: number } | { kind: 'door'; index: number } | null;

// The spot a player stands at to board a door up, a little way inside the room.
function doorSide(door: Door): { x: number; z: number } {
  return { x: door.position.x + door.normal.x, z: door.position.z + door.normal.z };
}

// What pressing the use key would do right now: pick up a bundle of boards, or board up a door.
// Only possible in the opening prep time, so the choice of doors is made before the first wave.
export function interactionTarget(state: GameState, player: Player): Interaction {
  if (state.waves.phase !== 'prep') return null;

  if (player.bars < config.doors.carryLimit) {
    let nearest = -1;
    let nearestDistance: number = config.doors.pickupRange;
    state.pickups.forEach((pickup, index) => {
      if (pickup.taken) return;
      const distance = Math.hypot(pickup.x - player.x, pickup.z - player.z);
      if (distance <= nearestDistance) {
        nearest = index;
        nearestDistance = distance;
      }
    });
    if (nearest >= 0) return { kind: 'pickup', index: nearest };
  }

  if (player.bars > 0) {
    let nearest = -1;
    let nearestDistance: number = config.doors.boardRange;
    state.level.doors.forEach((door, index) => {
      if (state.doors[index].boarded) return;
      const side = doorSide(door);
      const distance = Math.hypot(side.x - player.x, side.z - player.z);
      if (distance <= nearestDistance) {
        nearest = index;
        nearestDistance = distance;
      }
    });
    if (nearest >= 0) return { kind: 'door', index: nearest };
  }
  return null;
}

// A solid box that fills a doorway, so nothing can walk or shoot through boards.
function boardBox(door: Door): LevelBox {
  const alongX = door.normal.z !== 0;
  return {
    position: { x: door.position.x, y: door.height / 2, z: door.position.z },
    size: { x: alongX ? door.width : 0.5, y: door.height, z: alongX ? 0.5 : door.width },
    color: '#000000',
    surface: 'board',
  };
}

export function useAction(state: GameState, player: Player): void {
  const target = interactionTarget(state, player);
  if (!target) return;

  if (target.kind === 'pickup') {
    state.pickups[target.index].taken = true;
    player.bars++;
    return;
  }
  player.bars--;
  state.doors[target.index] = { boarded: true, boardedTick: state.tick };
  state.level.boxes.push(boardBox(state.level.doors[target.index]));
}

// Takes the boards off every door and puts the bundles back on the floor.
export function resetDoors(state: GameState): void {
  state.level.boxes = state.level.boxes.filter((box) => box.surface !== 'board');
  state.doors = state.level.doors.map(() => ({ boarded: false, boardedTick: -1 }));
  state.pickups.forEach((pickup) => (pickup.taken = false));
  for (const player of state.players) player.bars = 0;
}

export function openDoors(state: GameState): number[] {
  const open: number[] = [];
  state.level.doors.forEach((_, index) => {
    if (!state.doors[index].boarded) open.push(index);
  });
  return open;
}

// Where a zombie comes into being behind a door, and the spot inside the room it walks to first.
export function doorwaySpawn(
  door: Door,
  variation: number,
): { x: number; z: number; entry: { x: number; z: number } } {
  const out = { x: -door.normal.x, z: -door.normal.z };
  // Sideways across the doorway, so a crowd does not queue in a single file.
  const sideways = (variation - 0.5) * (door.width - 1);
  const side = { x: Math.abs(door.normal.z) * sideways, z: Math.abs(door.normal.x) * sideways };
  const depth = 0.25 + 2;
  return {
    x: door.position.x + out.x * depth + side.x,
    z: door.position.z + out.z * depth + side.z,
    entry: {
      x: door.position.x + door.normal.x * config.doors.entryDistance + side.x,
      z: door.position.z + door.normal.z * config.doors.entryDistance + side.z,
    },
  };
}
