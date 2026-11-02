import { config } from '../config';
import type { Level, Vec3 } from '../levels/types';

export interface Player {
  id: number;
  x: number;
  z: number;
  // Meters per second.
  vx: number;
  vz: number;
  // Yaw 0 faces -z. Positive yaw turns left.
  yaw: number;
  pitch: number;
  ammo: number;
  // Seconds until the next shot is allowed.
  cooldown: number;
  // Seconds left on a reload, or 0 when not reloading.
  reloadLeft: number;
  // The renderer uses these to show the last shot. -1 means no shot yet.
  lastShotTick: number;
  lastShotEnd: Vec3;
}

export interface GameState {
  tick: number;
  players: Player[];
}

export function createGameState(level: Level): GameState {
  const players: Player[] = [];
  for (let id = 0; id < config.playerCount; id++) {
    const spawn = level.playerSpawns[id];
    players.push({
      id,
      x: spawn.x,
      z: spawn.z,
      vx: 0,
      vz: 0,
      yaw: 0,
      pitch: 0,
      ammo: config.pistol.magazineSize,
      cooldown: 0,
      reloadLeft: 0,
      lastShotTick: -1,
      lastShotEnd: { x: 0, y: 0, z: 0 },
    });
  }
  return { tick: 0, players };
}
