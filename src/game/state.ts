import { config } from '../config';
import type { Ladder, Level, Vec3 } from '../levels/types';

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
  // Tick of the last hit taken, or -1.
  lastHurtTick: number;
  ammo: number;
  // Seconds until the next shot is allowed.
  cooldown: number;
  // Seconds left on a reload, or 0 when not reloading.
  reloadLeft: number;
  // The renderer uses these to show the last shot. -1 means no shot yet.
  lastShotTick: number;
  lastShotEnd: Vec3;
  // False when the shot flew its full range without hitting anything.
  lastShotHit: boolean;
  // True when the last shot hit a zombie rather than the level.
  lastShotZombie: boolean;
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
  dead: boolean;
  // Seconds left of the falling-over animation once dead, after which it is removed.
  deadLeft: number;
}

export type WavePhase = 'break' | 'active' | 'cleared';

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
}

export interface GameState {
  tick: number;
  players: Player[];
  zombies: Zombie[];
  nextZombieId: number;
  waves: Waves;
}

export function createPlayer(id: number, level: Level): Player {
  const spawn = level.playerSpawns[id];
  return {
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
    ammo: config.pistol.magazineSize,
    cooldown: 0,
    reloadLeft: 0,
    lastShotTick: -1,
    lastShotEnd: { x: 0, y: 0, z: 0 },
    lastShotHit: false,
    lastShotZombie: false,
  };
}

export function createGameState(level: Level): GameState {
  const players: Player[] = [];
  for (let id = 0; id < config.playerCount; id++) players.push(createPlayer(id, level));
  return {
    tick: 0,
    players,
    zombies: [],
    nextZombieId: 0,
    waves: {
      number: 1,
      phase: 'break',
      timer: config.waves.startDelaySeconds,
      toSpawn: 0,
      spawnTimer: 0,
      spawnIndex: 0,
      startedTick: -1,
      diedTick: -1,
    },
  };
}

// Where the eyes are above the floor, lower when crouched.
export function eyeY(player: Player): number {
  const { eyeHeight, crouchEyeHeight } = config.player;
  return player.y + eyeHeight + (crouchEyeHeight - eyeHeight) * player.crouch;
}
