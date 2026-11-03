import { config } from '../config';
import type { Elevator, Ladder, Level, LevelBox, Lock, Vec3 } from '../levels/types';
import type { WeaponId } from './weapons';

// A pull-up onto a ledge, played out over a fixed time. Nothing else moves the player meanwhile.
export interface Mantle {
  // 0 at the start, 1 when the player stands on the ledge.
  progress: number;
  fromX: number;
  fromY: number;
  fromZ: number;
  toX: number;
  toY: number;
  toZ: number;
}

export interface Player {
  cameraStyle: 'standard' | 'bodycam';
  // Smoothed chest-camera offset, also used by hitscan so the image and shot agree.
  cameraDrop: number;
  id: number;
  x: number;
  // Height of the feet above the floor.
  y: number;
  z: number;
  // Meters per second.
  vx: number;
  vy: number;
  vz: number;
  onGround: boolean;
  // Yaw 0 faces -z. Positive yaw turns left.
  yaw: number;
  pitch: number;
  // True while looking down the sights.
  aiming: boolean;
  // 0 standing to 1 fully crouched, easing.
  crouch: number;
  // -1 to 1, easing toward the lean being asked for.
  lean: number;
  // How far the head is actually out to the side in meters, negative for left. A wall can
  // stop it short of the full lean.
  leanOffset: number;
  // Pressed against a wall or barrier. Only slides along it, and can lean without aiming.
  cover: boolean;
  // Unit direction from the surface toward the player, while in cover.
  coverNormal: { x: number; z: number };
  // Height of the top of the surface being used as cover.
  coverTop: number;
  // The ladder being climbed, or null.
  ladder: Ladder | null;
  mantle: Mantle | null;
  health: number;
  // Tick of the last hit taken, or -1, and where the zombie that hit was standing.
  lastHurtTick: number;
  lastHurtX: number;
  lastHurtZ: number;
  // The weapon in hand. Its magazine and spare rounds are `ammo` and `reserve`.
  weapon: WeaponId;
  // The other weapon, put away with its own rounds, or null while only the pistol is owned.
  stowed: { weapon: WeaponId; ammo: number; reserve: number } | null;
  // Tick of the last weapon swap or purchase of a weapon, or -1.
  lastSwapTick: number;
  ammo: number;
  // Spare rounds outside the magazine.
  reserve: number;
  // Seconds until the next shot is allowed.
  cooldown: number;
  // Seconds left on a reload, or 0 when not reloading.
  reloadLeft: number;
  // The renderer uses these to show the last shot. -1 means no shot yet.
  lastShotTick: number;
  lastShotEnd: Vec3;
  // False when the shot flew its full range without hitting anything.
  lastShotHit: boolean;
  // True when the last shot hit a zombie rather than the level, and when it killed it.
  lastShotZombie: boolean;
  lastShotKill: boolean;
  // Tick of the last time the trigger was pulled on an empty gun, or -1.
  lastDryTick: number;
  // Tick of the last purchase at a wall station, or -1.
  lastBuyTick: number;
  // True when the last shot hit a zombie in the head.
  lastShotHead: boolean;
  // Bundles of boards being carried.
  bars: number;
  // The objective's case held in both hands, by index, or -1. The gun is down while carrying.
  carrying: number;
  // The light on the shoulder, for floors with the power out.
  flashlight: boolean;
}

export interface Zombie {
  id: number;
  x: number;
  z: number;
  yaw: number;
  health: number;
  // Seconds until it can hit again.
  attackCooldown: number;
  // Each zombie walks a little faster or slower than the rest, 0.85 to 1.15.
  speedFactor: number;
  // Tick of its last swing and of the last bullet that hit it, for the renderer. -1 means never.
  lastAttackTick: number;
  lastHitTick: number;
  // While still coming in through a doorway, the spot just inside it to walk to first.
  // Null once it is in the room and chasing.
  entry: { x: number; z: number } | null;
  dead: boolean;
  // Seconds left of the falling-over animation once dead, after which it is removed.
  deadLeft: number;
}

// 'won' is the end of the run, after the top floor. 'lift' is the elevator standing open once the floor is cleared, and 'ride' is the trip up.
// 'entry' is the run from the street into the garage, ending when the gate is closed. 'prep' is
// the countdown to board up doors, 'break' the rest between waves.
// 'search' is a cleared floor whose objective is still to be done: nothing attacks until it is,
// unless the objective itself brings them.
// 'hold' is a charger filling, or the helicopter on its way, with zombies coming all the while.
// 'evac' is the helicopter down on the roof, waiting for everyone to get aboard.
export type WavePhase = 'entry' | 'prep' | 'break' | 'active' | 'cleared' | 'search' | 'hold' | 'evac' | 'lift' | 'ride' | 'won';

export interface Waves {
  // The wave being fought, or the one coming up during a break. Starts at 1.
  number: number;
  phase: WavePhase;
  // Seconds left of a break, or of the level-cleared screen.
  timer: number;
  // Zombies of this wave not yet spawned.
  toSpawn: number;
  spawnTimer: number;
  spawnIndex: number;
  // Tick the wave last began, and the tick the player last died, for messages on screen.
  startedTick: number;
  diedTick: number;
  // Tick the players last stepped out of the elevator onto a new floor, or -1.
  arrivedTick: number;
  // True when the last time everyone went down was the final life, so the floor started over.
  lostRun: boolean;
}

export interface DoorState {
  boarded: boolean;
  // Tick it was boarded, for the renderer's animation. -1 if open.
  boardedTick: number;
}

export interface GateState {
  closed: boolean;
  // Tick it was closed, for the renderer's animation. -1 while open.
  closedTick: number;
}

export interface LiftState {
  open: boolean;
  // Tick the doors last started to open or close, for the renderer's animation. -1 before any.
  changedTick: number;
}

export interface LockState {
  open: boolean;
  // Tick it was opened, for the renderer's animation. -1 while shut.
  openedTick: number;
}

export interface ObjectiveState {
  // True once the floor's objective has been done, or at once if it has none.
  done: boolean;
  doneTick: number;
  // Breakers: the tick each one was thrown, or -1 while it is still off.
  thrown: number[];
  // Charge and signal: seconds filled so far, and the tick it was started, or -1.
  charge: number;
  startedTick: number;
  // Carry: where each case lies when nobody holds it, and whether it has been brought in.
  items: { x: number; y: number; z: number; delivered: boolean; deliveredTick: number }[];
}

// The objective as it stands when a floor begins.
export function freshObjective(level: Level): ObjectiveState {
  const objective = level.objective;
  return {
    done: objective === null,
    doneTick: -1,
    thrown: objective?.kind === 'breakers' ? objective.panels.map(() => -1) : [],
    charge: 0,
    startedTick: -1,
    items: objective?.kind === 'carry' ? objective.items.map((item) => ({ ...item, delivered: false, deliveredTick: -1 })) : [],
  };
}

// A floor with breakers to throw is dark until they all are, circuit by circuit.
export function circuitLive(state: GameState, circuit: number | undefined): boolean {
  if (circuit === undefined || state.level.objective?.kind !== 'breakers') return true;
  return (state.objective.thrown[circuit] ?? 0) >= 0;
}

export interface BarPickup {
  x: number;
  z: number;
  taken: boolean;
}

export interface GameState {
  tick: number;
  // This game's own copy of the level, because boarded doors add solid boxes to it.
  level: Level;
  // A testing aid: while true, zombies and the wave clock stand still.
  frozen: boolean;
  gate: GateState;
  lift: LiftState;
  // Shared by the players. Going down costs one.
  lives: number;
  // Each player's score, by player id. Spent on doors and weapons once those exist.
  points: number[];
  // Which floor of the tower this is. The ground floor is 0.
  floor: number;
  doors: DoorState[];
  locks: LockState[];
  objective: ObjectiveState;
  pickups: BarPickup[];
  players: Player[];
  zombies: Zombie[];
  nextZombieId: number;
  waves: Waves;
}

// A solid box that fills the elevator doorway while the doors are shut.
export function liftDoorBox(elevator: Elevator): LevelBox {
  const alongX = elevator.normal.z !== 0;
  return {
    position: { x: elevator.position.x, y: elevator.height / 2, z: elevator.position.z },
    size: { x: alongX ? elevator.width : 0.4, y: elevator.height, z: alongX ? 0.4 : elevator.width },
    color: '#000000',
    surface: 'lift',
  };
}

// A solid box that fills a locked door.
export function lockBox(lock: Lock): LevelBox {
  const alongX = lock.normal.z !== 0;
  return {
    position: { x: lock.position.x, y: lock.height / 2, z: lock.position.z },
    size: { x: alongX ? lock.width : 0.4, y: lock.height, z: alongX ? 0.4 : lock.width },
    color: '#000000',
    surface: 'lock',
  };
}

// Puts the game on a floor: its own copy of the level, with every door open and unboarded, every
// lock shut, the bundles of boards back on the floor, and the elevator closed.
export function enterLevel(state: GameState, level: Level): void {
  state.level = { ...level, boxes: [...level.boxes, liftDoorBox(level.elevator), ...level.locks.map(lockBox)] };
  state.gate = { closed: false, closedTick: -1 };
  state.lift = { open: false, changedTick: -1 };
  state.doors = level.doors.map(() => ({ boarded: false, boardedTick: -1 }));
  state.locks = level.locks.map(() => ({ open: false, openedTick: -1 }));
  state.objective = freshObjective(level);
  state.pickups = level.barricadeBars.map((bar) => ({ x: bar.x, z: bar.z, taken: false }));
  for (const player of state.players) {
    player.bars = 0;
    player.carrying = -1;
    // Out of the elevator into the dark, the light comes on by itself.
    player.flashlight = level.objective?.kind === 'breakers';
  }
}

export function createPlayer(id: number, spawn: Vec3): Player {
  return {
    cameraStyle: 'standard',
    cameraDrop: 0,
    id,
    x: spawn.x,
    y: spawn.y,
    z: spawn.z,
    vx: 0,
    vy: 0,
    vz: 0,
    onGround: true,
    yaw: 0,
    pitch: 0,
    aiming: false,
    crouch: 0,
    lean: 0,
    leanOffset: 0,
    cover: false,
    coverNormal: { x: 0, z: 0 },
    coverTop: 0,
    ladder: null,
    mantle: null,
    health: config.player.maxHealth,
    lastHurtTick: -1,
    lastHurtX: 0,
    lastHurtZ: 0,
    weapon: 'pistol',
    stowed: null,
    lastSwapTick: -1,
    ammo: config.pistol.magazineSize,
    reserve: config.pistol.reserveStart,
    cooldown: 0,
    reloadLeft: 0,
    lastShotTick: -1,
    lastShotEnd: { x: 0, y: 0, z: 0 },
    lastShotHit: false,
    lastShotZombie: false,
    lastShotKill: false,
    lastShotHead: false,
    lastDryTick: -1,
    lastBuyTick: -1,
    bars: 0,
    carrying: -1,
    flashlight: false,
  };
}

export function createGameState(level: Level): GameState {
  const players: Player[] = [];
  for (let id = 0; id < config.playerCount; id++) players.push(createPlayer(id, level.streetSpawns[id]));
  const state: GameState = {
    tick: 0,
    level,
    frozen: false,
    gate: { closed: false, closedTick: -1 },
    lift: { open: false, changedTick: -1 },
    floor: 0,
    lives: config.player.lives,
    points: players.map(() => 0),
    doors: [],
    locks: [],
    objective: { done: true, doneTick: -1, thrown: [], charge: 0, startedTick: -1, items: [] },
    pickups: [],
    players,
    zombies: [],
    nextZombieId: 0,
    waves: {
      number: 1,
      phase: 'entry',
      timer: 0,
      toSpawn: 0,
      spawnTimer: 0,
      spawnIndex: 0,
      startedTick: -1,
      diedTick: -1,
      arrivedTick: -1,
      lostRun: false,
    },
  };
  enterLevel(state, level);
  return state;
}

// Active camera height: crouch and the smoothed chest-camera preset also affect shot origin.
export function eyeY(player: Player): number {
  const { eyeHeight, crouchEyeHeight } = config.player;
  return player.y + eyeHeight + (crouchEyeHeight - eyeHeight) * player.crouch - player.cameraDrop;
}
