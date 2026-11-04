import { config } from '../config';
import type { Level } from '../levels/types';
import { closeLift, everyoneInCab, openLift } from './elevator';
import { dropCache } from './items';
import { beginPrep, closeGate, doorwaySpawn, openDoors } from './doors';
import { levelForFloor } from '../levels';
import { charging, dropCase, everyoneAboard } from './objectives';
import { createPlayer, enterLevel, spawnPoint, type GameState, type Player } from './state';
import { ROOF, storeysToNext, waveSize, wavesOnFloor } from './tower';
import { guaranteeAmmo } from './weapons';
import { aliveZombies, spawnZombie } from './zombies';

export function isTopFloor(state: GameState): boolean {
  return state.floor >= ROOF;
}

// One zombie in through the next open door, if any door is open.
function spawnAtDoor(state: GameState, level: Level): void {
  const waves = state.waves;
  const open = openDoors(state);
  if (open.length > 0) {
    const door = level.doors[open[waves.spawnIndex % open.length]];
    const spawn = doorwaySpawn(door, (waves.spawnIndex * 0.381966) % 1);
    spawnZombie(state, spawn.x, spawn.z, spawn.entry);
  }
  waves.spawnIndex++;
}

// While holding out, they keep coming, a few at a time.
function trickle(state: GameState, dt: number, level: Level): void {
  const waves = state.waves;
  waves.spawnTimer -= dt;
  if (waves.spawnTimer > 0) return;
  waves.spawnTimer = config.objectives.holdSpawnSeconds / (1 + config.objectives.holdSpawnPerFloor * state.floor);
  if (aliveZombies(state) < config.objectives.holdMaxZombies) spawnAtDoor(state, level);
}

// Every floor up brings more zombies to each wave.
export const zombiesInWave = waveSize;

// Spawns the wave's zombies one at a time, runs the break between waves, and resets the wave if
// every player is down.
export function updateWaves(state: GameState, dt: number, level: Level): void {
  const waves = state.waves;

  const safe = waves.phase === 'cleared' || waves.phase === 'search' || waves.phase === 'lift' || waves.phase === 'ride' || waves.phase === 'won';
  if (!safe && state.players.length > 0 && state.players.every((player) => player.health <= 0)) {
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
      if (!state.objective.done) {
        waves.phase = 'search';
      } else {
        // The floor is clear: the elevator opens and waits for everyone to step in.
        openLift(state);
        waves.phase = 'lift';
      }
    }
    return;
  }

  // Cleared, but the floor's objective is still to be done. Nothing attacks until it is, unless
  // the objective is one that brings them (see 'hold').
  if (waves.phase === 'search') {
    if (state.objective.done) {
      openLift(state);
      waves.phase = 'lift';
    }
    return;
  }

  // The charger filling, or the helicopter on its way. They keep coming all the while.
  if (waves.phase === 'hold') {
    const objective = level.objective;
    if (objective?.kind !== 'charge' && objective?.kind !== 'signal') return;
    if (charging(state)) state.objective.charge = Math.min(objective.seconds, state.objective.charge + dt);
    if (state.objective.charge < objective.seconds) {
      trickle(state, dt, level);
      return;
    }
    state.objective.done = true;
    state.objective.doneTick = state.tick;
    if (objective.kind === 'signal') {
      // The helicopter is down. Everyone onto the pad.
      waves.phase = 'evac';
    } else {
      // Finish off whoever is left, and the floor is clear again.
      waves.phase = 'active';
      waves.number = wavesOnFloor(state.floor);
      waves.toSpawn = 0;
    }
    return;
  }

  if (waves.phase === 'evac') {
    if (everyoneAboard(state)) {
      waves.phase = 'won';
      return;
    }
    trickle(state, dt, level);
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
      spawnAtDoor(state, level);
      waves.toSpawn--;
      waves.spawnTimer = config.waves.secondsBetweenSpawns;
    }
    return;
  }

  if (aliveZombies(state) === 0) {
    if (waves.number >= wavesOnFloor(state.floor)) {
      waves.phase = 'cleared';
      waves.timer = config.waves.levelClearedSeconds;
      // The floor is done: stock up before the lift.
      dropCache(state, ['bandage', 'medkit', 'water']);
    } else {
      // A wave is done: a little something before the next.
      dropCache(state, state.waves.number % 2 ? ['bandage'] : ['water']);
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
  const player = createPlayer(old.id, spawnPoint(level.playerSpawns, old.id, level.spawnYaw));
  player.yaw = level.spawnYaw ?? 0;
  player.flashlight = old.flashlight;
  if (!keepGuns) return player;
  player.weapon = old.weapon;
  player.stowed = old.stowed;
  player.holsteredGun = old.holsteredGun;
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
  state.zombies = [];
  state.players = state.players.map((old) => respawn(old, level, keepGuns));
  const waves = state.waves;
  waves.number = 1;
  waves.toSpawn = 0;
  // Only the garage has a street gate, and it stays shut, so it goes straight down with no
  // animation. Either way, the prep countdown starts now, with zombies rushing every door.
  if (level.gate) {
    closeGate(state);
    state.gate.closedTick = -1_000_000;
  } else {
    beginPrep(state);
  }
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
// Going down while holding a room loses the charge and goes back to the charger; going down
// waiting for the helicopter keeps it waiting.
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
  for (const player of state.players) dropCase(state, player);
  // Going down costs a life but not the guns: weapons and spare rounds come back with the player.
  state.players = state.players.map((old) => respawn(old, level, true));
  if (waves.phase === 'hold') {
    state.objective.charge = 0;
    state.objective.startedTick = -1;
    waves.phase = 'search';
    return;
  }
  if (waves.phase === 'evac') return;
  waves.phase = 'break';
  waves.timer = config.waves.startDelaySeconds;
  waves.toSpawn = 0;
}
