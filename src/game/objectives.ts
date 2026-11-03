import { config } from '../config';
import type { Area, Vec3, WallFitting } from '../levels/types';
import type { GameState, Player } from './state';

// What the use key does with the floor's objective, when it does anything.
export type ObjectiveTarget =
  | { kind: 'objective' }
  | { kind: 'breaker'; index: number }
  | { kind: 'device' }
  | { kind: 'case'; index: number }
  | { kind: 'deliver' };

function within(player: Player, x: number, z: number): boolean {
  return player.y < 1 && Math.hypot(x - player.x, z - player.z) <= config.objectives.range;
}

// The spot in front of a wall fitting where a player stands to use it.
export function fittingFront(fitting: WallFitting): { x: number; z: number } {
  return { x: fitting.position.x + fitting.normal.x * 0.6, z: fitting.position.z + fitting.normal.z * 0.6 };
}

export function inArea(player: Pick<Player, 'x' | 'z'>, area: Area): boolean {
  return player.x > area.minX && player.x < area.maxX && player.z > area.minZ && player.z < area.maxZ;
}

// A case lies on the floor when it is neither brought in nor in someone's hands.
export function caseFree(state: GameState, index: number): boolean {
  const item = state.objective.items[index];
  return !!item && !item.delivered && !state.players.some((player) => player.carrying === index);
}

export function objectiveTarget(state: GameState, player: Player): ObjectiveTarget | null {
  const objective = state.level.objective;
  if (!objective || state.objective.done) return null;
  switch (objective.kind) {
    case 'keycard':
      return within(player, objective.position.x, objective.position.z) ? { kind: 'objective' } : null;
    case 'breakers': {
      const index = objective.panels.findIndex((panel, i) => {
        const spot = fittingFront(panel);
        return state.objective.thrown[i] < 0 && within(player, spot.x, spot.z);
      });
      return index >= 0 ? { kind: 'breaker', index } : null;
    }
    case 'charge':
    case 'signal': {
      // Only once the waves are done: starting it brings the zombies back.
      const spot = fittingFront(objective.device);
      return state.waves.phase === 'search' && within(player, spot.x, spot.z) ? { kind: 'device' } : null;
    }
    case 'carry': {
      if (player.carrying >= 0) return within(player, objective.dropoff.x, objective.dropoff.z) ? { kind: 'deliver' } : null;
      let nearest = -1;
      let nearestDistance = Infinity;
      state.objective.items.forEach((item, index) => {
        if (!caseFree(state, index) || !within(player, item.x, item.z)) return;
        const distance = Math.hypot(item.x - player.x, item.z - player.z);
        if (distance < nearestDistance) { nearest = index; nearestDistance = distance; }
      });
      return nearest >= 0 ? { kind: 'case', index: nearest } : null;
    }
  }
}

function complete(state: GameState): void {
  state.objective.done = true;
  state.objective.doneTick = state.tick;
}

export function useObjective(state: GameState, player: Player, target: ObjectiveTarget): void {
  const progress = state.objective;
  switch (target.kind) {
    case 'objective':
      complete(state);
      return;
    case 'breaker':
      progress.thrown[target.index] = state.tick;
      if (progress.thrown.every((tick) => tick >= 0)) complete(state);
      return;
    case 'device':
      progress.startedTick = state.tick;
      progress.charge = 0;
      state.waves.phase = 'hold';
      state.waves.spawnTimer = 0;
      return;
    case 'case':
      player.carrying = target.index;
      player.aiming = false;
      player.reloadLeft = 0;
      return;
    case 'deliver': {
      const item = progress.items[player.carrying];
      item.delivered = true;
      item.deliveredTick = state.tick;
      player.carrying = -1;
      if (progress.items.every((each) => each.delivered)) complete(state);
      return;
    }
  }
}

// Puts a carried case down where the player stands.
export function dropCase(state: GameState, player: Player): void {
  if (player.carrying < 0) return;
  const item = state.objective.items[player.carrying];
  if (item) {
    item.x = player.x;
    item.z = player.z;
    item.y = player.y;
  }
  player.carrying = -1;
}

// Charging only runs while someone still standing is in the room. The helicopter comes regardless.
export function charging(state: GameState): boolean {
  const objective = state.level.objective;
  if (objective?.kind === 'signal') return true;
  if (objective?.kind !== 'charge') return false;
  return state.players.some((player) => player.health > 0 && inArea(player, objective.room));
}

// True once every player still standing is on the helipad.
export function everyoneAboard(state: GameState): boolean {
  const objective = state.level.objective;
  if (objective?.kind !== 'signal') return false;
  const alive = state.players.filter((player) => player.health > 0);
  return alive.length > 0 && alive.every((player) => Math.hypot(player.x - objective.pad.x, player.z - objective.pad.z) <= objective.padRadius);
}

// Where the floor's objective wants the players to go next, for the HUD and the map.
export function objectiveMarkers(state: GameState, player: Player): { at: Vec3; label: string }[] {
  const objective = state.level.objective;
  if (!objective) return [];
  const phase = state.waves.phase;
  if (state.objective.done) {
    return objective.kind === 'signal' && phase === 'evac' ? [{ at: objective.pad, label: 'HELICOPTER' }] : [];
  }
  switch (objective.kind) {
    case 'keycard':
      return [{ at: objective.position, label: 'KEYCARD' }];
    case 'breakers':
      return objective.panels.filter((_, i) => state.objective.thrown[i] < 0).map((panel) => ({ at: panel.position, label: 'BREAKER' }));
    case 'charge':
      if (phase === 'hold') return inArea(player, objective.room) ? [] : [{ at: objective.device.position, label: objective.roomName.toUpperCase() }];
      return [{ at: objective.device.position, label: 'CHARGER' }];
    case 'signal':
      return phase === 'hold' ? [] : [{ at: objective.device.position, label: 'LIGHTS' }];
    case 'carry':
      if (player.carrying >= 0) return [{ at: objective.dropoff, label: 'DROP-OFF' }];
      return state.objective.items.flatMap((item, i) => (caseFree(state, i) ? [{ at: { x: item.x, y: item.y, z: item.z }, label: 'CASE' }] : []));
  }
}
