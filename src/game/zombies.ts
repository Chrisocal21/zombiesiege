import { config } from '../config';
import type { Level, Vec3 } from '../levels/types';
import { resolveCircle } from './collision';
import { rayAabb } from './hitscan';
import { dropSupply } from './items';
import { nextStep, routeOf } from './navigation';
import type { GameState, Player, Zombie } from './state';

export function spawnZombie(
  state: GameState,
  x: number,
  z: number,
  entry: { x: number; z: number } | null,
): void {
  const id = state.nextZombieId++;
  state.zombies.push({
    id,
    x,
    z,
    yaw: 0,
    health: config.zombie.maxHealth,
    attackCooldown: config.zombie.firstAttackDelay,
    // A repeating pattern is enough to keep a crowd from walking in lockstep.
    speedFactor: 0.85 + 0.3 * ((id * 0.618) % 1),
    lastAttackTick: -1,
    lastHitTick: -1,
    entry,
    dead: false,
    deadLeft: 0,
  });
}

export function aliveZombies(state: GameState): number {
  let count = 0;
  for (const zombie of state.zombies) if (!zombie.dead) count++;
  return count;
}

function nearestPlayer(state: GameState, zombie: Zombie): Player | null {
  let nearest: Player | null = null;
  let nearestDistance = Infinity;
  for (const player of state.players) {
    if (player.health <= 0) continue;
    const distance = Math.hypot(player.x - zombie.x, player.z - zombie.z);
    if (distance < nearestDistance) {
      nearest = player;
      nearestDistance = distance;
    }
  }
  return nearest;
}

// How a side-route zombie arcs: no swing inside FLANK_END metres, building at FLANK_RATE per metre
// of distance, up to FLANK_MAX metres sideways.
const FLANK_END = 3.5;
const FLANK_RATE = 0.6;
const FLANK_MAX = 7;

// Chasing, swinging, and falling over, for every zombie, once per tick.
export function updateZombies(state: GameState, dt: number, level: Level): void {
  const zombieConfig = config.zombie;

  for (const zombie of state.zombies) {
    if (zombie.dead) {
      zombie.deadLeft -= dt;
      continue;
    }
    zombie.attackCooldown = Math.max(0, zombie.attackCooldown - dt);

    // Coming in through a doorway, a zombie walks to the spot just inside it first.
    if (zombie.entry && Math.hypot(zombie.entry.x - zombie.x, zombie.entry.z - zombie.z) < 0.5) {
      zombie.entry = null;
    }
    const target = nearestPlayer(state, zombie);
    if (!target) continue;
    const goal = zombie.entry ?? target;
    const dx = goal.x - zombie.x;
    const dz = goal.z - zombie.z;
    const distance = Math.hypot(dx, dz);
    // On a floor with rooms it walks round the walls toward a point on the way, or stays put if
    // every way to the players is shut.
    let heading = { x: dx, z: dz };
    let blocked = false;
    if (zombie.entry === null && level.navBounds) {
      const step = nextStep(state, zombie, target);
      if (step === undefined) blocked = true;
      else if (step) heading = { x: step.x - zombie.x, z: step.z - zombie.z };
    }
    // Walking at the player in the open, the side routes swing wide, left or right, and close in
    // once near, so a crowd comes at the player from several directions.
    if (zombie.entry === null && !blocked && distance > FLANK_END) {
      const route = routeOf(zombie);
      if (route !== 0 && heading.x === dx && heading.z === dz) {
        const side = route === 1 ? 1 : -1;
        const swing = Math.min(FLANK_MAX, (distance - FLANK_END) * FLANK_RATE);
        heading = { x: dx + (dz / distance) * swing * side, z: dz - (dx / distance) * swing * side };
      }
    }
    // Yaw 0 faces -z, the same as the player.
    zombie.yaw = Math.atan2(-heading.x, -heading.z);

    const inReach =
      zombie.entry === null && distance <= zombieConfig.attackRange && target.y < zombieConfig.reachHeight
      && !caged(level, zombie, target);
    if (inReach) {
      if (zombie.attackCooldown === 0) {
        zombie.attackCooldown = zombieConfig.secondsBetweenAttacks;
        zombie.lastAttackTick = state.tick;
        hurtPlayer(state, target, zombieConfig.attackDamage);
        target.lastHurtX = zombie.x;
        target.lastHurtZ = zombie.z;
      }
    } else {
      // A zombie that has only just arrived winds up before its first swing.
      zombie.attackCooldown = Math.max(zombie.attackCooldown, zombieConfig.firstAttackDelay);
    }

    // It stops a little short of its reach, so it stays on you without walking into you.
    if (!blocked && (zombie.entry || distance > zombieConfig.attackRange * 0.75)) {
      const headingLength = Math.hypot(heading.x, heading.z) || 1;
      const speed =
        zombieConfig.moveSpeed *
        zombie.speedFactor *
        (1 + zombieConfig.speedPerWave * (state.waves.number - 1) + config.elevator.speedPerFloor * state.floor);
      const moved = resolveCircle(
        level,
        zombie.x + (heading.x / headingLength) * speed * dt,
        zombie.z + (heading.z / headingLength) * speed * dt,
        zombieConfig.radius,
        0,
        zombieConfig.height,
      );
      zombie.x = moved.x;
      zombie.z = moved.z;
    }
  }

  separate(state);
  state.zombies = state.zombies.filter((zombie) => !zombie.dead || zombie.deadLeft > 0);
}

// Whether a cage across a doorway is between a zombie and its target, so it cannot reach through.
function caged(level: Level, zombie: Zombie, target: { x: number; z: number }): boolean {
  for (const box of level.boxes) {
    if (box.surface !== 'board') continue;
    const hx = box.size.x / 2 + 0.2, hz = box.size.z / 2 + 0.2;
    // The segment against the box grown by a body's width, a slab at a time.
    let near = 0, far = 1;
    for (const [from, to, centre, half] of [[zombie.x, target.x, box.position.x, hx], [zombie.z, target.z, box.position.z, hz]]) {
      const delta = to - from;
      if (Math.abs(delta) < 1e-9) { if (Math.abs(from - centre) > half) { near = 2; break; } continue; }
      let a = (centre - half - from) / delta, b = (centre + half - from) / delta;
      if (a > b) [a, b] = [b, a];
      near = Math.max(near, a); far = Math.min(far, b);
    }
    if (near <= far) return true;
  }
  return false;
}

// Keeps zombies from standing inside each other.
function separate(state: GameState): void {
  const zombies = state.zombies;
  const minimum = config.zombie.radius * 1.8;
  for (let i = 0; i < zombies.length; i++) {
    const a = zombies[i];
    if (a.dead) continue;
    for (let j = i + 1; j < zombies.length; j++) {
      const b = zombies[j];
      if (b.dead) continue;
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const distance = Math.hypot(dx, dz);
      if (distance >= minimum || distance === 0) continue;
      const push = (minimum - distance) / 2 / distance;
      a.x -= dx * push;
      a.z -= dz * push;
      b.x += dx * push;
      b.z += dz * push;
    }
  }
}

export function hurtPlayer(state: GameState, player: Player, damage: number): void {
  player.health = Math.max(0, player.health - damage);
  player.lastHurtTick = state.tick;
}

// The nearest living zombie along a ray, if it is closer than maxDistance.
export function raycastZombies(
  state: GameState,
  origin: Vec3,
  direction: Vec3,
  maxDistance: number,
): { zombie: Zombie; distance: number; head: boolean } | null {
  const { radius, height, headHeight } = config.zombie;
  const body = radius * 0.8;
  const head = radius * 0.55;
  let nearest: { zombie: Zombie; distance: number; head: boolean } | null = null;

  for (const zombie of state.zombies) {
    if (zombie.dead) continue;
    const limit = nearest ? nearest.distance : maxDistance;
    // The body and the head are separate boxes, which gives a head hit its own place to land.
    const parts = [
      { min: { x: zombie.x - body, y: 0, z: zombie.z - body }, max: { x: zombie.x + body, y: headHeight, z: zombie.z + body } },
      { min: { x: zombie.x - head, y: headHeight, z: zombie.z - head }, max: { x: zombie.x + head, y: height, z: zombie.z + head } },
    ];
    for (let index = 0; index < parts.length; index++) {
      const part = parts[index];
      const hit = rayAabb(origin, direction, part.min, part.max, limit);
      if (hit && (nearest === null || hit.distance < nearest.distance)) {
        nearest = { zombie, distance: hit.distance, head: index === 1 };
      }
    }
  }
  return nearest;
}

export function damageZombie(state: GameState, zombie: Zombie, damage: number): void {
  zombie.health -= damage;
  zombie.lastHitTick = state.tick;
  if (zombie.health <= 0) {
    zombie.dead = true;
    zombie.deadLeft = config.zombie.deathSeconds;
    dropSupply(state, zombie.x, zombie.z);
  }
}
