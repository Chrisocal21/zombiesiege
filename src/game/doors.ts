import { config } from '../config';
import type { Door, LevelBox } from '../levels/types';
import { objectiveTarget, useObjective, type ObjectiveTarget } from './objectives';
import type { GameState, Player } from './state';
import { giveShotgun, isMelee, owns, reserveOf, setReserve, weaponStats } from './weapons';
import { spawnZombie } from './zombies';

export type Interaction =
  | { kind: 'pickup'; index: number }
  | { kind: 'door'; index: number }
  | { kind: 'gate' }
  | { kind: 'station'; index: number }
  | { kind: 'lock'; index: number }
  | ObjectiveTarget
  | null;

// The spot a player stands at to board a door up, a little way inside the room.
function doorSide(door: Door): { x: number; z: number } {
  return { x: door.position.x + door.normal.x, z: door.position.z + door.normal.z };
}

// What pressing the use key would do right now: pick up a bundle of boards, or board up a door.
// Only possible in the opening prep time, so the choice of doors is made before the first wave.
export function interactionTarget(state: GameState, player: Player): Interaction {
  if (state.waves.phase === 'entry') {
    const gate = state.level.gate;
    if (!gate) return null;
    const panel = gate.panel;
    const near = Math.hypot(panel.x - player.x, panel.z - player.z) <= config.doors.gateRange;
    return near && player.y < 1 ? { kind: 'gate' } : null;
  }
  const phase = state.waves.phase;
  if (phase === 'prep' || phase === 'break' || phase === 'active' || phase === 'search' || phase === 'hold' || phase === 'evac') {
    // Hands full: only somewhere to put the case down.
    if (player.carrying >= 0) return objectiveTarget(state, player);
    const locks = state.level.locks;
    for (let index = 0; index < locks.length; index++) {
      if (state.locks[index].open) continue;
      const lock = locks[index];
      const near = Math.hypot(lock.position.x - player.x, lock.position.z - player.z) <= config.stations.range;
      if (near && player.y < 1) return { kind: 'lock', index };
    }
    const objective = objectiveTarget(state, player);
    if (objective) return objective;
    const stations = state.level.stations;
    for (let index = 0; index < stations.length; index++) {
      const station = stations[index];
      const near = Math.hypot(station.position.x - player.x, station.position.z - player.z) <= config.stations.range;
      if (near && player.y < 1) return { kind: 'station', index };
    }
  }
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
export function boardBox(door: Door): LevelBox {
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

  if (target.kind === 'station') {
    buy(state, player, target.index);
    return;
  }

  if (target.kind === 'lock') {
    openLock(state, player, target.index);
    return;
  }

  if (target.kind === 'objective' || target.kind === 'breaker' || target.kind === 'device' || target.kind === 'case' || target.kind === 'deliver') {
    useObjective(state, player, target);
    return;
  }

  if (target.kind === 'gate') {
    closeGate(state);
    return;
  }

  if (target.kind === 'pickup') {
    state.pickups[target.index].taken = true;
    player.bars++;
    return;
  }
  player.bars--;
  state.doors[target.index] = { boarded: true, boardedTick: state.tick };
  state.level.boxes.push(boardBox(state.level.doors[target.index]));
}

// What a locked door costs this player, and whether they can pay it.
export function lockOffer(state: GameState, player: Player, index: number): { label: string; cost: number; status: 'ok' | 'poor' } {
  const lock = state.level.locks[index];
  return { label: lock.label, cost: lock.cost, status: (state.points[player.id] ?? 0) >= lock.cost ? 'ok' : 'poor' };
}

function openLock(state: GameState, player: Player, index: number): void {
  const offer = lockOffer(state, player, index);
  if (offer.status !== 'ok') return;
  state.points[player.id] -= offer.cost;
  state.locks[index] = { open: true, openedTick: state.tick };
  const lock = state.level.locks[index];
  state.level.boxes = state.level.boxes.filter(
    (box) => !(box.surface === 'lock' && box.position.x === lock.position.x && box.position.z === lock.position.z),
  );
  player.lastBuyTick = state.tick;
}

export interface Offer {
  // What pressing use does here: 'weapon' buys the gun itself, 'ammo' fills spare rounds.
  action: 'weapon' | 'ammo';
  label: string;
  cost: number;
  // 'ok' can be bought now, 'full' has nothing to fill, 'poor' costs more than the player has.
  status: 'ok' | 'full' | 'poor';
}

// What a station is selling this player right now.
export function stationOffer(state: GameState, player: Player, index: number): Offer {
  const kind = state.level.stations[index].kind;
  const points = state.points[player.id] ?? 0;
  if (kind === 'shotgun' && !owns(player, 'shotgun')) {
    return { action: 'weapon', label: 'Buy sawed-off shotgun', cost: config.stations.shotgunCost, status: points >= config.stations.shotgunCost ? 'ok' : 'poor' };
  }
  // The ammo locker fills whatever is in hand, and the weapon wall fills its own gun's shells.
  const weapon = kind === 'shotgun' ? 'shotgun' : isMelee(player.weapon) ? player.holsteredGun?.weapon ?? 'pistol' : player.weapon;
  const cost = kind === 'shotgun' ? config.stations.shellCost : config.stations.ammoCost;
  const full = reserveOf(player, weapon) >= weaponStats(weapon).reserveMax;
  return { action: 'ammo', label: kind === 'shotgun' ? 'Buy shells' : isMelee(player.weapon) ? `Buy ${weaponStats(weapon).name} ammo` : 'Buy ammo', cost, status: full ? 'full' : points >= cost ? 'ok' : 'poor' };
}

function buy(state: GameState, player: Player, index: number): void {
  const offer = stationOffer(state, player, index);
  if (offer.status !== 'ok') return;
  state.points[player.id] -= offer.cost;
  if (offer.action === 'weapon') giveShotgun(player, state.tick);
  else {
    const weapon = state.level.stations[index].kind === 'shotgun' ? 'shotgun' : isMelee(player.weapon) ? player.holsteredGun?.weapon ?? 'pistol' : player.weapon;
    setReserve(player, weapon, weaponStats(weapon).reserveMax);
  }
  player.lastBuyTick = state.tick;
}

// Starts the countdown for boarding up doors, and rushes zombies in through every one of them at
// once, spread across each doorway's width so they do not queue up single file. Boarding becomes
// a scramble against zombies already coming through, rather than a quiet beat beforehand.
export function beginPrep(state: GameState): void {
  state.waves.phase = 'prep';
  state.waves.timer = config.waves.prepSeconds;
  const count: number = config.waves.doorRushZombies;
  for (const door of state.level.doors) {
    for (let i = 0; i < count; i++) {
      const variation = count === 1 ? 0.5 : 0.2 + (0.6 * i) / (count - 1);
      const spawn = doorwaySpawn(door, variation);
      spawnZombie(state, spawn.x, spawn.z, spawn.entry);
    }
  }
}

// Closing the gate shuts the way out and starts the countdown for boarding up doors.
export function closeGate(state: GameState): void {
  const gate = state.level.gate;
  if (!gate) return;
  const alongX = gate.normal.z !== 0;
  state.gate = { closed: true, closedTick: state.tick };
  state.level.boxes.push({
    position: { x: gate.position.x, y: gate.height / 2, z: gate.position.z },
    size: { x: alongX ? gate.width : 0.4, y: gate.height, z: alongX ? 0.4 : gate.width },
    color: '#000000',
    surface: 'gate',
  });
  beginPrep(state);
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
