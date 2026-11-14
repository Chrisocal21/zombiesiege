import { config } from '../config';
import type { Level, LevelBox } from '../levels/types';
import { resolveCircle } from './collision';
import { doorwaySpawn } from './doors';
import { raycastBoxes } from './hitscan';
import { nextStep } from './navigation';
import { completeStep, inArea } from './objectives';
import { eyeY, type Companion, type GameState, type Player, type Zombie } from './state';
import { LAST_VAULT } from './tower';
import { levelForFloor } from '../levels';
import { spawnZombie } from './zombies';

// The story's moving parts in the rules: the scientist who follows the crew once he is out of the
// vault, Patient O, the boss who comes for the time lock and is beaten back into the vault, and the
// scene where the vault opens. Everything here lives in the game state, so co-op shares it.

const ticks = (seconds: number): number => Math.round(seconds * config.ticksPerSecond);

// ---- The scientist ------------------------------------------------------------------------------

// He walks up to this close to the nearest player and waits there.
const FOLLOW_DISTANCE = 2.4;
const RADIUS = 0.35;
// Further than this from everyone, and out of everyone's sight for LOST_SECONDS, he is brought up
// behind the nearest player, so he can never be left behind or stuck.
const LOST_DISTANCE = 14;
const LOST_SECONDS = 2;

// From the vault on, the scientist goes everywhere the crew does.
export function scientistOn(floor: number): boolean {
  return floor > LAST_VAULT;
}

function companion(x: number, z: number, yaw: number): Companion {
  return { x, z, yaw, speed: 0, lostTicks: 0 };
}

// Puts him where a floor begins: on the floors after the vault he is always with the crew, at the
// spot given (in the cab with them, or beside where they start). Before it he is not there yet.
export function placeScientist(state: GameState, spot: { x: number; z: number; yaw: number }): void {
  if (!scientistOn(state.floor)) {
    state.scientist = null;
    return;
  }
  state.scientist = companion(spot.x, spot.z, spot.yaw);
}

function nearestAlive(state: GameState, x: number, z: number): { player: Player; distance: number } | null {
  let best: { player: Player; distance: number } | null = null;
  for (const player of state.players) {
    if (player.health <= 0) continue;
    const distance = Math.hypot(player.x - x, player.z - z);
    if (!best || distance < best.distance) best = { player, distance };
  }
  return best;
}

// Whether any player standing can see him.
function seen(state: GameState, level: Level, x: number, z: number): boolean {
  return state.players.some((player) => {
    if (player.health <= 0) return false;
    const distance = Math.hypot(x - player.x, z - player.z);
    if (distance > 40) return false;
    const eye = { x: player.x, y: eyeY(player), z: player.z };
    const direction = { x: (x - player.x) / distance, y: (1.5 - eye.y) / distance, z: (z - player.z) / distance };
    return raycastBoxes(level, eye, direction, distance) === null;
  });
}

// A free spot close behind a player, or beside or in front of them if behind is a wall.
function spotNear(level: Level, player: Player): { x: number; z: number } {
  const forward = { x: -Math.sin(player.yaw), z: -Math.cos(player.yaw) };
  const tries = [[-1.6, 0], [-1.2, 1.2], [-1.2, -1.2], [0, 1.5], [0, -1.5], [1.6, 0]];
  for (const [back, side] of tries) {
    const x = player.x + forward.x * back + forward.z * side;
    const z = player.z + forward.z * back - forward.x * side;
    const moved = resolveCircle(level, x, z, RADIUS, 0, 1.8);
    if (Math.hypot(moved.x - x, moved.z - z) < 0.05) return { x, z };
  }
  return { x: player.x, z: player.z };
}

// He keeps close to the nearest player, round the walls the way the dead find their way, and stops
// a step away. Nothing attacks him and nothing he does can end a mission.
function updateScientist(state: GameState, dt: number, level: Level): void {
  const scientist = state.scientist;
  if (!scientist || state.scene) return;
  const near = nearestAlive(state, scientist.x, scientist.z);
  if (!near) { scientist.speed = 0; return; }
  const { player, distance } = near;
  if (distance > FOLLOW_DISTANCE) {
    let heading = { x: player.x - scientist.x, z: player.z - scientist.z };
    if (level.navBounds) {
      // The way round the walls to the nearest player, as the dead find it, by the shortest road.
      const step = nextStep(state, { id: 0, x: scientist.x, z: scientist.z } as Zombie, player);
      if (step) heading = { x: step.x - scientist.x, z: step.z - scientist.z };
    }
    const length = Math.hypot(heading.x, heading.z) || 1;
    const pace = config.player.moveSpeed * (distance > 6 ? 1 : 0.65);
    const moved = resolveCircle(level, scientist.x + (heading.x / length) * pace * dt, scientist.z + (heading.z / length) * pace * dt, RADIUS, 0, 1.8);
    scientist.speed = Math.hypot(moved.x - scientist.x, moved.z - scientist.z) / Math.max(dt, 1e-6);
    scientist.x = moved.x;
    scientist.z = moved.z;
    scientist.yaw = Math.atan2(-heading.x, -heading.z);
  } else {
    scientist.speed = 0;
    scientist.yaw = Math.atan2(-(player.x - scientist.x), -(player.z - scientist.z));
  }
  // Left behind, or stuck where nobody can see: brought up to the crew.
  const lost = distance > LOST_DISTANCE && !seen(state, level, scientist.x, scientist.z);
  scientist.lostTicks = lost ? scientist.lostTicks + 1 : 0;
  if (scientist.lostTicks > ticks(LOST_SECONDS)) {
    const spot = spotNear(level, player);
    scientist.x = spot.x;
    scientist.z = spot.z;
    scientist.lostTicks = 0;
  }
}

// ---- Patient O ----------------------------------------------------------------------------------

// The boss's zombie, while it is on the floor.
export function bossZombie(state: GameState): Zombie | null {
  const boss = state.boss;
  if (!boss) return null;
  return state.zombies.find((zombie) => zombie.id === boss.zombieId && !zombie.dead) ?? null;
}

// Its health goes up with the number of players.
function bossHealth(state: GameState, stage: 1 | 2): number {
  const settings = config.zombie.boss;
  const scale = settings.healthBase + settings.healthPerPlayer * Math.max(1, state.players.length);
  return Math.round((stage === 1 ? settings.stageOneHealth : settings.stageTwoHealth) * scale);
}

// It comes in through its door, slow and heavy, and goes for whoever is on the time lock.
function arrive(state: GameState, level: Level): void {
  const boss = level.boss!;
  const door = level.doors[boss.door] ?? level.doors[0];
  const spawn = doorwaySpawn(door, 0.5);
  spawnZombie(state, spawn.x, spawn.z, spawn.entry, 'brute');
  const zombie = state.zombies[state.zombies.length - 1];
  const health = bossHealth(state, 1);
  Object.assign(zombie, { boss: true, look: 'patient', health, speedFactor: config.zombie.boss.stageOneSpeed });
  state.boss = { zombieId: zombie.id, stage: 1, arrivedTick: state.tick, retreatTick: -1, sealedTick: -1, maxHealth: health, staggerTick: -1 };
}

// Stage 2: the vault is open, and it is enraged. It stands between the crew and the lift.
function enrage(state: GameState, level: Level): void {
  const boss = state.boss;
  const zombie = bossZombie(state);
  if (!boss || !zombie) return;
  const health = bossHealth(state, 2);
  boss.stage = 2;
  boss.maxHealth = health;
  Object.assign(zombie, {
    health, speedFactor: config.zombie.boss.stageTwoSpeed, entry: null, staggerUntil: -1, chargeUntil: -1,
    x: level.boss!.stand.x, z: level.boss!.stand.z, alertUntil: state.tick + ticks(60), nextCryTick: state.tick + ticks(2),
  });
}

// What a hit does to it. In stage 1 it cannot be brought below a share of its health, and a head
// shot (its weak point) staggers it, though not again for a while. In stage 2 a hit that would kill
// it instead breaks it: it turns and falls back into the vault, and nothing more hurts it.
export function hurtBoss(state: GameState, zombie: Zombie, damage: number, head: boolean): void {
  const boss = state.boss;
  if (!boss || boss.retreatTick >= 0) return;
  const settings = config.zombie.boss;
  zombie.health -= damage;
  zombie.lastHitTick = state.tick;
  zombie.alertUntil = Math.max(zombie.alertUntil, state.tick + ticks(config.zombie.alertSeconds));
  if (boss.stage === 1) zombie.health = Math.max(zombie.health, boss.maxHealth * settings.stageOneFloor);
  if (head && state.tick - boss.staggerTick >= ticks(settings.staggerEvery)) {
    boss.staggerTick = state.tick;
    zombie.staggerUntil = state.tick + ticks(settings.staggerSeconds);
    zombie.chargeUntil = -1;
  }
  if (boss.stage === 2 && zombie.health <= 0) {
    zombie.health = 1;
    boss.retreatTick = state.tick;
    zombie.staggerUntil = -1;
    zombie.chargeUntil = -1;
  }
}

// Where it heads when beaten: straight for the vault, through the open door.
export function retreatPoint(state: GameState): { x: number; z: number } | null {
  const boss = state.boss;
  const plan = state.level.boss;
  if (!boss || !plan || boss.retreatTick < 0 || boss.sealedTick >= 0) return null;
  // First to the front of the door, then in.
  const zombie = bossZombie(state);
  const front = { x: plan.retreat.x, z: plan.retreat.z + 4.5 };
  if (zombie && zombie.z > front.z + 0.5 && Math.abs(zombie.x - front.x) > 0.8) return front;
  return plan.retreat;
}

// The vault door's slab, from the floor's own level: the game's copy loses it while the door is open.
function vaultDoorBox(state: GameState): LevelBox | undefined {
  return levelForFloor(state.floor).boxes.find((box) => box.vaultDoor);
}

// The vault door shuts on it, and it is sealed in. Anyone else inside is put back out first.
function seal(state: GameState, level: Level): void {
  const boss = state.boss!;
  const plan = level.boss!;
  boss.sealedTick = state.tick;
  state.vault.shutTick = state.tick;
  state.zombies = state.zombies.filter((zombie) => zombie.id !== boss.zombieId);
  const door = vaultDoorBox(state);
  if (door && !state.level.boxes.includes(door)) state.level.boxes.push(door);
  const outside = { x: plan.retreat.x, z: plan.retreat.z + 5 };
  for (const player of state.players) {
    if (player.z < (door?.position.z ?? plan.retreat.z + 2)) Object.assign(player, outside);
  }
  if (state.scientist && state.scientist.z < (door?.position.z ?? plan.retreat.z + 2)) Object.assign(state.scientist, outside);
  if (state.level.objective?.kind === 'contain') completeStep(state);
}

function updateBoss(state: GameState, level: Level): void {
  const plan = level.boss;
  if (!plan) return;
  // It comes partway through the time lock.
  if (!state.boss && state.waves.phase === 'hold' && state.objective.step === 0 && state.objective.charge >= plan.arriveAt) arrive(state, level);
  const boss = state.boss;
  if (!boss || boss.sealedTick >= 0) return;
  const zombie = bossZombie(state);
  if (!zombie) return;
  if (boss.retreatTick >= 0) {
    // Inside the vault, or far too long about it: the door shuts.
    const inside = Math.hypot(zombie.x - plan.retreat.x, zombie.z - plan.retreat.z) < 1.1;
    if (inside || state.tick - boss.retreatTick > ticks(config.zombie.boss.retreatSeconds)) {
      if (!inside) Object.assign(zombie, { x: plan.retreat.x, z: plan.retreat.z });
      seal(state, level);
    }
  }
}

// Everyone went down. In stage 1 the time lock starts over, and it with it, so it goes. In stage 2
// it is back where it stood, at full strength.
export function bossAfterWipe(state: GameState, level: Level): void {
  const boss = state.boss;
  if (!boss || boss.sealedTick >= 0 || !level.boss) return;
  if (boss.stage === 1) {
    state.boss = null;
    return;
  }
  const spawn = level.boss.stand;
  spawnZombie(state, spawn.x, spawn.z, null, 'brute');
  const zombie = state.zombies[state.zombies.length - 1];
  boss.zombieId = zombie.id;
  boss.retreatTick = -1;
  const health = bossHealth(state, 2);
  boss.maxHealth = health;
  Object.assign(zombie, { boss: true, look: 'patient', health, speedFactor: config.zombie.boss.stageTwoSpeed });
}

// Who it goes for: in the first stage, whoever is in the room of the time lock, if anyone is.
export function bossTarget(state: GameState, zombie: Zombie): Player | null {
  const objective = state.level.objective;
  if (state.boss?.stage === 1 && objective?.kind === 'charge') {
    let best: Player | null = null;
    for (const player of state.players) {
      if (player.health <= 0 || !inArea(player, objective.room)) continue;
      if (!best || Math.hypot(player.x - zombie.x, player.z - zombie.z) < Math.hypot(best.x - zombie.x, best.z - zombie.z)) best = player;
    }
    if (best) return best;
  }
  return null;
}

// ---- The vault scene ----------------------------------------------------------------------------

// Begins the scene after its step: the rules stand still, the door swings open a moment in, and the
// scientist is there behind it.
export function startScene(state: GameState, level: Level): void {
  const scene = level.scene;
  if (!scene) return;
  state.scene = { startTick: state.tick };
  state.vault.openTick = state.tick + ticks(scene.doorAt);
  state.scientist = companion(scene.from.x, scene.from.z, Math.PI);
  // The camera opens on the door, not on whoever was in the room: the rest of the dead are cleared,
  // and Patient O goes off to where it will stand when the scene ends.
  const boss = bossZombie(state);
  state.zombies = state.zombies.filter((zombie) => zombie === boss);
  if (boss && level.boss) Object.assign(boss, { x: level.boss.stand.x, z: level.boss.stand.z, entry: null });
}

export function sceneSeconds(state: GameState): number {
  return state.scene ? (state.tick - state.scene.startTick) / config.ticksPerSecond : 0;
}

function updateScene(state: GameState, level: Level): void {
  const scene = level.scene;
  if (!state.scene || !scene) return;
  const t = sceneSeconds(state);
  // The door opens: its slab stops being solid.
  if (state.vault.openTick >= 0 && state.tick >= state.vault.openTick && state.vault.shutTick < 0) {
    const door = vaultDoorBox(state);
    if (door) state.level.boxes = state.level.boxes.filter((box) => box !== door);
  }
  // He walks out.
  const scientist = state.scientist;
  if (scientist) {
    const k = Math.max(0, Math.min(1, (t - scene.walkAt) / scene.walkSeconds));
    scientist.x = scene.from.x + (scene.to.x - scene.from.x) * k;
    scientist.z = scene.from.z + (scene.to.z - scene.from.z) * k;
    scientist.speed = k > 0 && k < 1 ? Math.hypot(scene.to.x - scene.from.x, scene.to.z - scene.from.z) / scene.walkSeconds : 0;
    scientist.yaw = Math.atan2(-(scene.to.x - scene.from.x), -(scene.to.z - scene.from.z));
  }
  if (t >= scene.seconds) {
    state.scene = null;
    enrage(state, level);
  }
}

// The story's part of every tick.
export function updateStory(state: GameState, dt: number): void {
  const level = state.level;
  if (state.scene) {
    updateScene(state, level);
    return;
  }
  updateBoss(state, level);
  updateScientist(state, dt, level);
}
