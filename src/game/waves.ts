import { config } from '../config';
import type { Door, Level } from '../levels/types';
import { closeLift, everyoneInCab, openLift } from './elevator';
import { dropCache } from './items';
import { beginPrep, closeGate, doorwaySpawn } from './doors';
import { levelForFloor } from '../levels';
import { charging, completeStep, dropCase, everyoneAboard, inArea, lastStep } from './objectives';
import { createPlayer, enterLevel, flowOf, spawnPoint, type GameState, type Player } from './state';
import { LAST_FLOOR, ROOF, storeysToNext, waveSize, wavesOnFloor } from './tower';
import type { ZombieKind } from './state';
import { guaranteeAmmo } from './weapons';
import { aliveOfKind, aliveZombies, placeResidents, spawnZombie, underAttack } from './zombies';

export function isTopFloor(state: GameState): boolean {
  return state.floor >= ROOF;
}

const ticks = (seconds: number): number => Math.round(seconds * config.ticksPerSecond);

// A repeatable stand-in for chance, so the server and a browser agree on who comes through the door.
function chance(seed: number): number {
  return (Math.sin(seed * 12.9898) * 43758.5453) % 1 * 0.5 + 0.5;
}

// What kind comes next. Runners join from the second wave, and the last wave of a floor is led by a
// brute or a screamer. The first brute is met on Floor 6 (stop 2) and the first screamer on Floor 9
// (stop 3), and from there on the odd one turns up among the rest.
function kindForSpawn(state: GameState, leader: boolean): ZombieKind {
  const waves = state.waves;
  const floor = state.floor;
  if (floor <= 0) return waves.number >= 4 && chance(state.nextZombieId) < 0.12 ? 'runner' : 'walker';
  const last = waves.number >= wavesOnFloor(floor);
  if (leader && last && floor >= 2) {
    if (floor % 2 === 0 && aliveOfKind(state, 'brute') === 0) return 'brute';
    if (floor >= 3 && aliveOfKind(state, 'screamer') === 0) return 'screamer';
  }
  const roll = chance(state.nextZombieId * 1.7 + floor);
  if (waves.number >= 3 && floor >= 3 && roll < 0.05 && aliveOfKind(state, 'brute') === 0) return 'brute';
  if (waves.number >= 2 && floor >= 3 && roll > 0.955 && aliveOfKind(state, 'screamer') === 0) return 'screamer';
  const runners = Math.min(0.34, 0.08 + 0.05 * (waves.number - 1) + 0.02 * floor);
  return chance(state.nextZombieId * 0.37 + 5) < runners ? 'runner' : 'walker';
}

// One zombie in through a door, if the floor has any: the next of `from` (door indexes), or of every
// door when that is left out.
function spawnAtDoor(state: GameState, level: Level, leader = false, kind?: ZombieKind, from?: number[]): void {
  const waves = state.waves;
  // Caged doors still get their share: the zombies come down the passage and are held at the cage.
  const doors: Door[] = from ? from.map((index) => level.doors[index]).filter((door) => door) : level.doors;
  if (doors.length > 0) {
    const door = doors[waves.spawnIndex % doors.length];
    const spawn = doorwaySpawn(door, (waves.spawnIndex * 0.381966) % 1);
    spawnZombie(state, spawn.x, spawn.z, spawn.entry, kind ?? kindForSpawn(state, leader));
  }
  waves.spawnIndex++;
}

// Zombies a screamer or a loud moment called in come through the doors, one every so often.
function callReinforcements(state: GameState, level: Level): void {
  const waves = state.waves;
  if (waves.reinforce <= 0 || state.tick % 40 !== 0) return;
  if (!underAttack(state)) { waves.reinforce = 0; return; }
  waves.reinforce--;
  const flow = flowOf(level);
  if (aliveZombies(state) < 28) spawnAtDoor(state, level, false, 'walker', flow.kind === 'sweep' ? flow.from : undefined);
}

// While holding out, they keep coming, a few at a time.
function trickle(state: GameState, dt: number, level: Level): void {
  const waves = state.waves;
  waves.spawnTimer -= dt;
  if (waves.spawnTimer > 0) return;
  waves.spawnTimer = config.objectives.holdSpawnSeconds / (1 + config.objectives.holdSpawnPerFloor * state.floor);
  if (aliveZombies(state) < config.objectives.holdMaxZombies) spawnAtDoor(state, level);
}

// On a sweep floor, how long after one loud moment before the next one brings more of them.
const LOUD_GAP_SECONDS = 12;
// On a run floor, the quiet beat after arriving, how far a door must be from every player to spawn
// at it, how many seconds the trail lags the crew by, and how far ahead of the trail the crew must be
// to count as on the move.
const RUN_GRACE_SECONDS = 6;
const RUN_DOOR_CLEARANCE = 10;
const RUN_TRAIL_SECONDS = 6;
const RUN_MOVING = 2;

// The pressure on a floor with no waves. On a sweep floor every loud moment, a gunshot, brings more
// in through the doors. On a run floor they keep coming through the doors behind the crew, on the
// side it came from, and faster the longer it takes.
function pressure(state: GameState, dt: number, level: Level): void {
  const flow = flowOf(level);
  const waves = state.waves;
  if (flow.kind === 'sweep') {
    const loud = state.players.some((player) => player.health > 0 && player.lastShotTick >= 0 && state.tick - player.lastShotTick <= 1);
    if (loud && (waves.loudTick < 0 || state.tick - waves.loudTick >= ticks(LOUD_GAP_SECONDS))) {
      waves.reinforce += waves.alarms === 0 ? flow.first ?? flow.loud : flow.loud;
      waves.alarms++;
      waves.loudTick = state.tick;
    }
    return;
  }
  if (flow.kind !== 'run') return;
  const centre = crewCentre(state);
  if (centre) {
    const follow = Math.min(1, dt / RUN_TRAIL_SECONDS);
    waves.trailX += (centre.x - waves.trailX) * follow;
    waves.trailZ += (centre.z - waves.trailZ) * follow;
  }
  waves.spawnTimer -= dt;
  if (waves.spawnTimer > 0) return;
  const since = Math.max(waves.arrivedTick, waves.diedTick);
  const minutes = since >= 0 ? (state.tick - since) / config.ticksPerSecond / 60 : 0;
  waves.spawnTimer = flow.every / (1 + minutes);
  if (aliveZombies(state) >= flow.max) return;
  const door = doorBehind(state, level);
  if (door < 0) return;
  spawnAtDoor(state, level, false, undefined, [door]);
}

// The middle of the players still standing, or null if none are.
function crewCentre(state: GameState): { x: number; z: number } | null {
  const alive = state.players.filter((player) => player.health > 0);
  if (alive.length === 0) return null;
  return { x: alive.reduce((sum, p) => sum + p.x, 0) / alive.length, z: alive.reduce((sum, p) => sum + p.z, 0) / alive.length };
}

// A door behind the crew, on the side it came from and well away from every player, picked in turn,
// or -1 if there is none. A crew standing still has no behind: then any door well away will do.
function doorBehind(state: GameState, level: Level): number {
  const centre = crewCentre(state);
  if (!centre) return -1;
  const back = { x: state.waves.trailX - centre.x, z: state.waves.trailZ - centre.z };
  const moving = Math.hypot(back.x, back.z) > RUN_MOVING;
  const doors: number[] = [];
  level.doors.forEach((door, index) => {
    const behind = !moving || (door.position.x - centre.x) * back.x + (door.position.z - centre.z) * back.z > 0;
    const clear = state.players.every((player) => player.health <= 0 || Math.hypot(door.position.x - player.x, door.position.z - player.z) > RUN_DOOR_CLEARANCE);
    if (behind && clear) doors.push(index);
  });
  return doors.length ? doors[state.waves.spawnIndex % doors.length] : -1;
}

// The trail starts where the crew does.
function resetTrail(state: GameState): void {
  const centre = crewCentre(state);
  state.waves.trailX = centre?.x ?? 0;
  state.waves.trailZ = centre?.z ?? 0;
}

// The first time a player walks into the area of one of the level's radio cues.
function listen(state: GameState): void {
  const cues = state.level.cues;
  if (!cues) return;
  cues.forEach((cue, index) => {
    if (cue.on !== 'area' || !cue.area || (state.heard[index] ?? 0) >= 0) return;
    if (state.players.some((player) => player.health > 0 && inArea(player, cue.area!))) state.heard[index] = state.tick;
  });
}

// Every floor up brings more zombies to each wave.
export const zombiesInWave = waveSize;

// Spawns the wave's zombies one at a time, runs the break between waves, and resets the wave if
// every player is down.
export function updateWaves(state: GameState, dt: number, level: Level): void {
  const waves = state.waves;
  // A step done this tick hands the game a new copy of the level with the next step in it.
  level = state.level;
  const siege = flowOf(level).kind === 'siege';

  // On a siege floor nothing attacks once the waves are cleared, so going down there cannot happen.
  // On a floor with no waves the dead are about the whole time.
  const quiet = waves.phase === 'ride' || waves.phase === 'arrive' || waves.phase === 'won'
    || (siege && (waves.phase === 'cleared' || waves.phase === 'search' || waves.phase === 'lift'));
  if (!quiet && state.players.length > 0 && state.players.every((player) => player.health <= 0)) {
    restartWave(state, level);
    return;
  }

  // Nothing happens until the players are in and the gate is closed, and nothing after the end.
  if (waves.phase === 'entry' || waves.phase === 'won') return;
  listen(state);
  callReinforcements(state, level);

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

  // The objective is being done. On a siege floor the waves are cleared and nothing attacks until it
  // is, unless the objective is one that brings them (see 'hold'). On a floor with no waves this is
  // the whole floor, with the dead about all the while.
  if (waves.phase === 'search') {
    if (state.objective.done) {
      openLift(state);
      waves.phase = 'lift';
      return;
    }
    if (!siege) pressure(state, dt, level);
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
    const final = lastStep(state);
    completeStep(state);
    if (objective.kind === 'signal' && final) {
      // The helicopter is down. Everyone onto the pad.
      waves.phase = 'evac';
    } else if (siege) {
      // Finish off whoever is left, and the floor is clear again.
      waves.phase = 'active';
      waves.number = wavesOnFloor(state.floor);
      waves.toSpawn = 0;
    } else {
      // The stand is over and the floor carries on as before.
      waves.phase = 'search';
      waves.spawnTimer = config.objectives.holdSpawnSeconds;
    }
    return;
  }

  if (waves.phase === 'evac') {
    if (everyoneAboard(state)) {
      if (state.floor >= LAST_FLOOR) {
        waves.phase = 'won';
        return;
      }
      // The air ambulance takes the crew on to the office tower: Act 2 begins on its roof.
      state.floor++;
      startFloor(state, true);
      return;
    }
    trickle(state, dt, level);
    return;
  }

  if (waves.phase === 'lift') {
    if (!siege) pressure(state, dt, level);
    if (everyoneInCab(state)) {
      closeLift(state);
      // In the prologue the way on is a gate, not a lift: everyone goes straight through to the next floor.
      if (state.floor < 0) {
        state.floor++;
        startFloor(state, true);
        state.waves.arrivedTick = state.tick;
        return;
      }
      // The last floor built so far: the run ends here until the next one exists.
      if (state.floor >= LAST_FLOOR) {
        waves.phase = 'won';
        return;
      }
      // Whoever was left on the floor stays there.
      state.zombies = [];
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

  // Arrived: still in the cab, the doors slide open, and then the floor's countdown begins.
  if (waves.phase === 'arrive') {
    waves.timer -= dt;
    if (waves.timer <= 0) {
      openLift(state);
      waves.arrivedTick = state.tick;
      beginFloor(state, level);
    }
    return;
  }

  if (waves.toSpawn > 0) {
    waves.spawnTimer -= dt;
    if (waves.spawnTimer <= 0) {
      // Zombies only come through the doors that are still open. The first of the wave leads it.
      spawnAtDoor(state, level, waves.toSpawn === zombiesInWave(state.floor, waves.number));
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
  // Everyone stays in the cab, and the doors open a moment later to let them out.
  startFloor(state, true, true);
  state.waves.phase = 'arrive';
  state.waves.timer = config.elevator.arriveSeconds;
}

// Where a player stands in the cab: its middle, spread across its width, facing the doors.
function cabSpot(level: Level, index: number, count: number): { x: number; z: number; yaw: number } {
  const { position, normal, cabDepth } = level.elevator;
  const inside = 0.25 + cabDepth / 2;
  const across = (index - (count - 1) / 2) * 0.8;
  return {
    x: position.x - normal.x * inside + normal.z * across,
    z: position.z - normal.z * inside - normal.x * across,
    yaw: Math.atan2(-normal.x, -normal.z),
  };
}

// A player back at full health at the spawn, with or without the weapons and rounds they had.
function respawn(old: Player, level: Level, keepGuns: boolean, cab: { x: number; z: number; yaw: number } | null = null): Player {
  const player = createPlayer(old.id, cab ? { x: cab.x, y: 0, z: cab.z } : spawnPoint(level.playerSpawns, old.id, level.spawnYaw));
  player.yaw = cab ? cab.yaw : level.spawnYaw ?? 0;
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
  // In the prologue the gate stays shut until the floor is done.
  if (floor >= 0) openLift(state);
  state.waves.arrivedTick = state.tick;
}

function startFloor(state: GameState, keepGuns: boolean, inCab = false): void {
  const level = levelForFloor(state.floor);
  enterLevel(state, level);
  state.zombies = [];
  placeResidents(state, level);
  state.players = state.players.map((old, i) => respawn(old, level, keepGuns, inCab ? cabSpot(level, i, state.players.length) : null));
  const waves = state.waves;
  waves.number = 1;
  waves.toSpawn = 0;
  waves.reinforce = 0;
  waves.loudTick = -1;
  waves.alarms = 0;
  if (!inCab) beginFloor(state, level);
}

// Only the garage has a street gate, and it stays shut, so it goes straight down with no
// animation. A floor with no waves is open from the moment the crew steps out. Otherwise the prep
// countdown starts now, with zombies rushing every door.
function beginFloor(state: GameState, level: Level): void {
  if (level.gate) {
    closeGate(state);
    state.gate.closedTick = -1_000_000;
  } else if (flowOf(level).kind !== 'siege') {
    state.waves.phase = 'search';
    state.waves.spawnTimer = RUN_GRACE_SECONDS;
    resetTrail(state);
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
// waiting for the helicopter keeps it waiting. On a floor with no waves the crew goes back to where
// it came in, with the floor's own dead back where they stood, and the steps already done stay done.
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
  if (flowOf(level).kind !== 'siege') {
    placeResidents(state, level);
    if (waves.phase === 'hold') {
      state.objective.charge = 0;
      state.objective.startedTick = -1;
    }
    waves.phase = state.objective.done ? 'lift' : 'search';
    waves.reinforce = 0;
    waves.spawnTimer = RUN_GRACE_SECONDS;
    resetTrail(state);
    return;
  }
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
