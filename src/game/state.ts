import { config } from '../config';
import type { Level } from '../levels/types';

export interface Player {
  id: number;
  x: number;
  z: number;
  // Yaw 0 faces -z. Positive yaw turns left.
  yaw: number;
  pitch: number;
}

export interface GameState {
  tick: number;
  players: Player[];
}

export function createGameState(level: Level): GameState {
  const players: Player[] = [];
  for (let id = 0; id < config.playerCount; id++) {
    const spawn = level.playerSpawns[id];
    players.push({ id, x: spawn.x, z: spawn.z, yaw: 0, pitch: 0 });
  }
  return { tick: 0, players };
}
