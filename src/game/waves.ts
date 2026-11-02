import { config } from '../config';
import type { Level } from '../levels/types';
import { doorwaySpawn, openDoors, resetDoors } from './doors';
import { createPlayer, type GameState } from './state';
import { aliveZombies, spawnZombie } from './zombies';

export const TOTAL_WAVES = config.waves.zombiesPerWave.length;

// Spawns the wave's zombies one at a time, runs the break between waves, and resets the wave if
// every player is down.
export function updateWaves(state: GameState, dt: number, level: Level): void {
  const waves = state.waves;

  if (state.players.every((player) => player.health <= 0)) {
    restartWave(state, level);
    return;
  }

  if (waves.phase === 'prep' || waves.phase === 'break') {
    waves.timer -= dt;
    if (waves.timer <= 0) startWave(state);
    return;
  }

  if (waves.phase === 'cleared') {
    waves.timer -= dt;
    if (waves.timer <= 0) {
      // A fresh run: the boards come off and there is a new opening to choose doors in.
      resetDoors(state);
      state.zombies = [];
      waves.number = 1;
      waves.phase = 'prep';
      waves.timer = config.waves.prepSeconds;
    }
    return;
  }

  if (waves.toSpawn > 0) {
    waves.spawnTimer -= dt;
    if (waves.spawnTimer <= 0) {
      // Zombies only come through the doors that are still open.
      const open = openDoors(state);
      if (open.length > 0) {
        const door = level.doors[open[waves.spawnIndex % open.length]];
        const spawn = doorwaySpawn(door, (waves.spawnIndex * 0.381966) % 1);
        spawnZombie(state, spawn.x, spawn.z, spawn.entry);
      }
      waves.spawnIndex++;
      waves.toSpawn--;
      waves.spawnTimer = config.waves.secondsBetweenSpawns;
    }
    return;
  }

  if (aliveZombies(state) === 0) {
    if (waves.number >= TOTAL_WAVES) {
      waves.phase = 'cleared';
      waves.timer = config.waves.levelClearedSeconds;
    } else {
      waves.number++;
      waves.phase = 'break';
      waves.timer = config.waves.breakSeconds;
    }
  }
}

function startWave(state: GameState): void {
  const waves = state.waves;
  waves.phase = 'active';
  waves.toSpawn = config.waves.zombiesPerWave[waves.number - 1];
  waves.spawnTimer = 0;
  waves.startedTick = state.tick;
}

// Everyone is down: clear the field, bring everyone back at full health, and begin the same
// wave again after a short pause.
function restartWave(state: GameState, level: Level): void {
  state.zombies = [];
  state.players = state.players.map((player) => createPlayer(player.id, level));
  const waves = state.waves;
  waves.phase = 'break';
  waves.timer = config.waves.startDelaySeconds;
  waves.toSpawn = 0;
  waves.diedTick = state.tick;
}
