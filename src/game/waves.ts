import { config } from '../config';
import type { Level } from '../levels/types';
import { closeLift, everyoneInCab, openLift } from './elevator';
import { closeGate, doorwaySpawn, openDoors } from './doors';
import { levelForFloor } from '../levels';
import { createPlayer, enterLevel, type GameState, type Player } from './state';
import { stops, storeysToNext, waveSize, wavesOnFloor } from './tower';
import { guaranteeAmmo } from './weapons';
import { aliveZombies, spawnZombie } from './zombies';

export function isTopFloor(state: GameState): boolean {
  return state.floor >= stops.length - 1;
}

// Every floor up brings more zombies to each wave.
export const zombiesInWave = waveSize;

// Spawns the wave's zombies one at a time, runs the break between waves, and resets the wave if
// every player is down.
export function updateWaves(state: GameState, dt: number, level: Level): void {
  const waves = state.waves;

  const safe = waves.phase === 'cleared' || waves.phase === 'search' || waves.phase === 'lift' || waves.phase === 'ride' || waves.phase === 'won';
  if (!safe && state.players.every((player) => player.health <= 0)) {
    restartWave(state, level);
    return;
  }

  // Nothing happens until the players are in and the gate is closed, and nothing after the end.
  if (waves.phase === 'entry' || waves.phase === 'won') return;

  // Arriving on a new floor, the elevator doors close again behind the players.
  if (state.lift.open && waves.phase !== 'lift' && (state.tick - state.lift.changedTick) / config.ticksPerSecond > config.elevator.arrivalOpenSeconds) {
    closeLift(state);
  }

  if (waves.phase === 'prep' || waves.phase === 'break') {
    waves.timer -= dt;
    if (waves.timer <= 0) startWave(state);
    return;
  }

  if (waves.phase === 'cleared') {
    waves.timer -= dt;
    if (waves.timer <= 0) {
      if (isTopFloor(state)) {
        waves.phase = 'won';
      } else if (!state.objective.done) {
        waves.phase = 'search';
      } else {
        // The floor is clear: the elevator opens and waits for everyone to step in.
        openLift(state);
        waves.phase = 'lift';
      }
    }
    return;
  }

  // Cleared, but the floor's objective is still out there. Nothing attacks until it is found.
  if (waves.phase === 'search') {
    if (state.objective.done) {
      openLift(state);
      waves.phase = 'lift';
    }
    return;
  }

  if (waves.phase === 'lift') {
    if (everyoneInCab(state)) {
      closeLift(state);
      waves.phase = 'ride';
      waves.timer = config.elevator.rideSeconds + config.elevator.rideSecondsPerStorey * storeysToNext(state.floor);
    }
    return;
  }

  if (waves.phase === 'ride') {
    waves.timer -= dt;
    if (waves.timer <= 0) arriveOnNextFloor(state);
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
    if (waves.number >= wavesOnFloor(state.floor)) {
      waves.phase = 'cleared';
      waves.timer = config.waves.levelClearedSeconds;
    } else {
      waves.number++;
      waves.phase = 'break';
      waves.timer = config.waves.breakSeconds;
    }
  }
}

// The doors open on the next floor. Same layout for now, with the boards gone, every player at
// full health outside the elevator, and a fresh countdown to board up doors before wave 1.
function arriveOnNextFloor(state: GameState): void {
  state.floor++;
  startFloor(state, true);
  openLift(state);
  state.waves.arrivedTick = state.tick;
}

// A player back at full health at the spawn, with or without the weapons and rounds they had.
function respawn(old: Player, level: Level, keepGuns: boolean): Player {
  const player = createPlayer(old.id, level.playerSpawns[old.id]);
  player.yaw = level.spawnYaw ?? 0;
  if (!keepGuns) return player;
  player.weapon = old.weapon;
  player.stowed = old.stowed;
  player.ammo = old.ammo;
  player.reserve = old.reserve;
  guaranteeAmmo(player);
  return player;
}

// Wave 1 of the current floor: boards off, zombies gone, everyone back at full health, and the
// countdown to board up doors. The street gate is shut for good, so it goes straight back down
// with no animation.
// Starts a new game on any elevator stop, as if just arrived there, for testing a floor.
export function startOnFloor(state: GameState, floor: number): void {
  state.floor = floor;
  startFloor(state, false);
  openLift(state);
  state.waves.arrivedTick = state.tick;
}

function startFloor(state: GameState, keepGuns: boolean): void {
  const level = levelForFloor(state.floor);
  enterLevel(state, level);
  // Only the garage has a street gate, and it stays shut, so it goes straight down with no animation.
  if (level.gate) {
    closeGate(state);
    state.gate.closedTick = -1_000_000;
  }
  state.zombies = [];
  state.players = state.players.map((old) => respawn(old, level, keepGuns));
  const waves = state.waves;
  waves.number = 1;
  waves.phase = 'prep';
  waves.timer = config.waves.prepSeconds;
  waves.toSpawn = 0;
}

function startWave(state: GameState): void {
  const waves = state.waves;
  waves.phase = 'active';
  waves.toSpawn = zombiesInWave(state.floor, waves.number);
  waves.spawnTimer = 0;
  waves.startedTick = state.tick;
  for (const player of state.players) guaranteeAmmo(player);
}

// Everyone is down. That costs a life: with one left, the same wave begins again after a short
// pause. With none left the floor starts over from wave 1 and the lives are refilled.
function restartWave(state: GameState, level: Level): void {
  const waves = state.waves;
  waves.diedTick = state.tick;
  state.lives--;
  if (state.lives <= 0) {
    state.lives = config.player.lives;
    waves.lostRun = true;
    // The score goes with the run.
    state.points = state.points.map(() => 0);
    startFloor(state, false);
    return;
  }
  waves.lostRun = false;
  state.zombies = [];
  // Going down costs a life but not the guns: weapons and spare rounds come back with the player.
  state.players = state.players.map((old) => respawn(old, level, true));
  waves.phase = 'break';
  waves.timer = config.waves.startDelaySeconds;
  waves.toSpawn = 0;
}
