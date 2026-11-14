import { config } from '../config';
import type { Level, Resident, Vec3 } from '../levels/types';
import { resolveCircle } from './collision';
import { rayAabb, raycastBoxes } from './hitscan';
import { dropSupply } from './items';
import { nextStep, routeOf } from './navigation';
import { flowOf, type GameState, type Player, type Zombie, type ZombieKind } from './state';
import { crowdAt, depth } from './tower';
import { bossTarget, hurtBoss, retreatPoint } from './story';

const ticks = (seconds: number): number => Math.round(seconds * config.ticksPerSecond);

// The numbers for a zombie's kind.
export function kindOf(zombie: Pick<Zombie, 'kind'>): (typeof config.zombie.kinds)[ZombieKind] {
  return config.zombie.kinds[zombie.kind];
}

export function zombieRadius(zombie: Pick<Zombie, 'kind'>): number {
  return kindOf(zombie).radius;
}

// How tall it stands, and where its head begins. A crawler is low to the floor.
export function zombieHeights(zombie: Pick<Zombie, 'kind' | 'crawling'>): { height: number; headHeight: number } {
  const size = kindOf(zombie).size;
  const low = zombie.crawling ? config.zombie.crawlHeight : 1;
  return { height: config.zombie.height * size * low * (zombie.crawling ? 0.6 : 1), headHeight: config.zombie.headHeight * size * low * (zombie.crawling ? 0.5 : 1) };
}

export function spawnZombie(
  state: GameState,
  x: number,
  z: number,
  entry: { x: number; z: number } | null,
  kind: ZombieKind = 'walker',
): void {
  const id = state.nextZombieId++;
  const crowd = crowdAt(state.floor);
  const stats = config.zombie.kinds[kind];
  state.zombies.push({
    id,
    kind,
    look: crowd[Math.floor(((id * 0.7548776662) % 1) * crowd.length)],
    legDamage: 0,
    crawling: false,
    // Fresh from the doors they know where the players are, for a while.
    alertUntil: state.tick + ticks(config.zombie.alertSeconds),
    enragedUntil: -1,
    staggerUntil: -1,
    chargeUntil: -1,
    cryTick: -1,
    nextCryTick: kind === 'brute' ? state.tick + ticks(3) : -1,
    x,
    z,
    yaw: 0,
    health: stats.health,
    attackCooldown: stats.firstDelay,
    // A repeating pattern is enough to keep a crowd from walking in lockstep.
    speedFactor: 0.85 + 0.3 * ((id * 0.618) % 1),
    lastAttackTick: -1,
    lastHitTick: -1,
    pushing: false,
    dormant: false,
    boss: false,
    entry,
    dead: false,
    deadLeft: 0,
  });
}

// One of the floor's own dead, standing where the level puts it, not yet aware of anyone.
export function placeResident(state: GameState, resident: Resident): void {
  spawnZombie(state, resident.x, resident.z, null, resident.kind ?? 'walker');
  const zombie = state.zombies[state.zombies.length - 1];
  zombie.dormant = true;
  zombie.alertUntil = -1;
  zombie.yaw = resident.yaw ?? 0;
}

// Every resident of the level, back where it started.
export function placeResidents(state: GameState, level: Level): void {
  for (const resident of level.residents ?? []) placeResident(state, resident);
}

// Whether a standing resident notices someone: anything that alerted it, a player close enough in
// plain sight (closer still when crouching, further with a light on), or one right beside it.
// Sight is only checked every few ticks, staggered, because it casts a ray.
function noticed(state: GameState, zombie: Zombie, level: Level): boolean {
  if (state.tick < zombie.alertUntil) return true;
  const senses = config.zombie.resident;
  for (const player of state.players) {
    if (player.health <= 0) continue;
    const distance = Math.hypot(player.x - zombie.x, player.z - zombie.z);
    if (distance <= senses.touch) return true;
    const range = (senses.sight + (player.flashlight ? senses.flashlight : 0)) * (player.crouch > 0.5 ? senses.crouch : 1);
    if (distance > range || (state.tick + zombie.id) % senses.everyTicks !== 0) continue;
    const eye = { x: zombie.x, y: 1.5, z: zombie.z };
    const direction = { x: (player.x - zombie.x) / distance, y: (player.y + 1.4 - 1.5) / distance, z: (player.z - zombie.z) / distance };
    if (raycastBoxes(level, eye, direction, distance) === null) return true;
  }
  return false;
}

// A resident comes to: it knows where the players are for a while, and those standing near it wake too.
function wake(state: GameState, zombie: Zombie): void {
  zombie.dormant = false;
  zombie.alertUntil = Math.max(zombie.alertUntil, state.tick + ticks(config.zombie.alertSeconds));
  if (zombie.kind === 'brute') zombie.nextCryTick = state.tick + ticks(1.5);
  for (const other of state.zombies) {
    if (other.dormant && !other.dead && Math.hypot(other.x - zombie.x, other.z - zombie.z) <= config.zombie.resident.neighbours) {
      other.alertUntil = Math.max(other.alertUntil, state.tick + ticks(config.zombie.alertSeconds));
    }
  }
}

// Whether more of them can be coming through the doors now: during a wave or a stand, and the whole
// time on a floor that has no waves.
export function underAttack(state: GameState): boolean {
  const phase = state.waves.phase;
  if (phase === 'active' || phase === 'hold' || phase === 'evac') return true;
  return flowOf(state.level).kind !== 'siege' && (phase === 'search' || phase === 'lift');
}

export function aliveZombies(state: GameState): number {
  let count = 0;
  for (const zombie of state.zombies) if (!zombie.dead) count++;
  return count;
}

export function aliveOfKind(state: GameState, kind: ZombieKind): number {
  let count = 0;
  for (const zombie of state.zombies) if (!zombie.dead && zombie.kind === kind) count++;
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
// The golden angle, so each zombie's spot on the ring round a player is spread from the last.
const GOLDEN = 2.399963;

// Gunfire and the clatter of a swing wake every zombie within earshot.
function hearNoises(state: GameState): void {
  for (const player of state.players) {
    if (player.health <= 0) continue;
    const shot = player.lastShotTick >= 0 && state.tick - player.lastShotTick <= 2;
    const swung = player.lastMeleeHitTick >= 0 && state.tick - player.lastMeleeHitTick <= 2;
    if (!shot && !swung) continue;
    const range = shot ? config.zombie.noiseRange : config.zombie.meleeNoiseRange;
    for (const zombie of state.zombies) {
      if (zombie.dead || Math.hypot(zombie.x - player.x, zombie.z - player.z) > range) continue;
      zombie.alertUntil = Math.max(zombie.alertUntil, state.tick + ticks(config.zombie.alertSeconds));
    }
  }
}

// The screamer's call: every zombie in earshot is alerted and frenzied for a while, and more come in
// at the doors.
function scream(state: GameState, screamer: Zombie): void {
  const zombieConfig = config.zombie;
  screamer.cryTick = state.tick;
  screamer.nextCryTick = state.tick + ticks(zombieConfig.screamCooldown);
  for (const other of state.zombies) {
    if (other.dead || Math.hypot(other.x - screamer.x, other.z - screamer.z) > zombieConfig.screamCallRadius) continue;
    other.alertUntil = Math.max(other.alertUntil, state.tick + ticks(zombieConfig.alertSeconds));
    if (other.kind !== 'brute') other.enragedUntil = Math.max(other.enragedUntil, state.tick + ticks(zombieConfig.enrageSeconds));
  }
  if (underAttack(state)) state.waves.reinforce += zombieConfig.screamReinforce;
}

// Chasing, swinging, and falling over, for every zombie, once per tick.
export function updateZombies(state: GameState, dt: number, level: Level): void {
  const zombieConfig = config.zombie;
  hearNoises(state);

  for (const zombie of state.zombies) {
    if (zombie.dead) {
      zombie.deadLeft -= dt;
      continue;
    }
    // A resident stands still until it notices someone.
    if (zombie.dormant) {
      if (!noticed(state, zombie, level)) continue;
      wake(state, zombie);
    }
    const kind = kindOf(zombie);
    const radius = kind.radius;
    const { height } = zombieHeights(zombie);
    zombie.attackCooldown = Math.max(0, zombie.attackCooldown - dt);

    // Patient O, beaten, makes for the vault and lets nothing stop it.
    const back = zombie.boss ? retreatPoint(state) : null;
    if (back) {
      const bx = back.x - zombie.x, bz = back.z - zombie.z, length = Math.hypot(bx, bz) || 1;
      const pace = zombieConfig.moveSpeed * zombieConfig.boss.retreatPace * dt;
      const moved = resolveCircle(level, zombie.x + (bx / length) * Math.min(pace, length), zombie.z + (bz / length) * Math.min(pace, length), radius, 0, height);
      zombie.x = moved.x;
      zombie.z = moved.z;
      zombie.yaw = Math.atan2(-bx, -bz);
      zombie.pushing = false;
      continue;
    }

    // Coming in through a doorway, a zombie walks to the spot just inside it first.
    if (zombie.entry && Math.hypot(zombie.entry.x - zombie.x, zombie.entry.z - zombie.z) < 0.5) {
      zombie.entry = null;
    }
    const target = (zombie.boss ? bossTarget(state, zombie) : null) ?? nearestPlayer(state, zombie);
    if (!target) continue;
    const goal = zombie.entry ?? target;
    const dx = goal.x - zombie.x;
    const dz = goal.z - zombie.z;
    const distance = Math.hypot(dx, dz);
    const free = zombie.entry === null;

    // The screamer stops where it stands and screams, once it sees someone.
    const screaming = zombie.kind === 'screamer' && zombie.cryTick >= 0 && state.tick - zombie.cryTick < ticks(zombieConfig.screamSeconds);
    if (zombie.kind === 'screamer' && free && !screaming && state.tick >= zombie.nextCryTick && distance < zombieConfig.screamRange && !zombie.crawling) {
      scream(state, zombie);
    }
    // The brute roars and charges at a player a little way off.
    if (zombie.kind === 'brute' && free && state.tick >= zombie.nextCryTick && distance > zombieConfig.chargeMin && distance < zombieConfig.chargeMax) {
      zombie.cryTick = state.tick;
      zombie.chargeUntil = state.tick + ticks(zombieConfig.chargeSeconds);
      zombie.nextCryTick = state.tick + ticks(zombieConfig.chargeCooldown);
    }
    // Now and then a walker trips over its own feet.
    if (zombie.kind === 'walker' && free && !zombie.crawling && zombie.id % 3 === 1 && distance > 3 && distance < 14) {
      const phase = (state.tick / config.ticksPerSecond + zombie.id * 2.3) % zombieConfig.stumbleEvery;
      if (phase < zombieConfig.stumbleSeconds && state.tick >= zombie.staggerUntil) zombie.staggerUntil = state.tick + ticks(zombieConfig.stumbleSeconds);
    }

    // On a floor with rooms it walks round the walls toward a point on the way, or presses on toward
    // the player if every way is shut, against the cage or wall in the way.
    let heading = { x: dx, z: dz };
    let blocked = false;
    if (free && level.navBounds) {
      const step = nextStep(state, zombie, target);
      if (step === undefined) blocked = true;
      else if (step) heading = { x: step.x - zombie.x, z: step.z - zombie.z };
    }
    // Close in, each aims for its own spot on a ring round the player, so a crowd spreads out and
    // comes at the player from every side instead of queueing.
    if (free && !blocked && distance < zombieConfig.surroundRange && distance > kind.range && heading.x === dx && heading.z === dz) {
      const ring = Math.min(2.5, Math.max(0, (distance - kind.range) * 0.55));
      const angle = zombie.id * GOLDEN;
      heading = { x: dx + Math.cos(angle) * ring, z: dz + Math.sin(angle) * ring };
    }
    // Walking at the player in the open, the side routes swing wide, left or right, and close in
    // once near, so a crowd comes at the player from several directions.
    if (free && !blocked && distance > FLANK_END) {
      const route = routeOf(zombie);
      if (route !== 0 && heading.x === dx && heading.z === dz) {
        const side = route === 1 ? 1 : -1;
        const swing = Math.min(FLANK_MAX, (distance - FLANK_END) * FLANK_RATE);
        heading = { x: dx + (dz / distance) * swing * side, z: dz - (dx / distance) * swing * side };
      }
    }
    // Yaw 0 faces -z, the same as the player.
    zombie.yaw = Math.atan2(-(blocked ? dx : heading.x), -(blocked ? dz : heading.z));

    const inReach =
      free && distance <= (zombie.crawling ? 1.0 : kind.range) && target.y < zombieConfig.reachHeight * kind.size
      && !caged(level, zombie, target) && !screaming;
    if (inReach) {
      if (zombie.attackCooldown === 0) {
        zombie.attackCooldown = kind.interval;
        zombie.lastAttackTick = state.tick;
        hurtPlayer(state, target, kind.damage);
        target.lastHurtX = zombie.x;
        target.lastHurtZ = zombie.z;
      }
    } else {
      // A zombie that has only just arrived winds up before its first swing.
      zombie.attackCooldown = Math.max(zombie.attackCooldown, kind.firstDelay);
    }

    // With every way shut, it still presses toward the player.
    zombie.pushing = false;
    if (blocked) heading = { x: dx, z: dz };
    // It stops a little short of its reach, so it stays on you without walking into you.
    if (!screaming && (zombie.entry || distance > kind.range * 0.75)) {
      const headingLength = Math.hypot(heading.x, heading.z) || 1;
      // Far from every player, and not alerted by noise or a scream, a zombie only shambles.
      const sight = target.flashlight ? zombieConfig.flashlightSightRange : zombieConfig.sightRange;
      const aware = distance <= sight || state.tick < zombie.alertUntil;
      let pace = zombieConfig.moveSpeed * kind.speed * zombie.speedFactor
        * (1 + zombieConfig.speedPerWave * (state.waves.number - 1) + config.elevator.speedPerFloor * floorPace(state.floor));
      if (!aware && !zombie.entry) pace *= zombieConfig.unawareSpeed;
      if (zombie.crawling) pace *= zombieConfig.crawlSpeed;
      if (state.tick < zombie.staggerUntil) pace *= 0.18;
      if (state.tick < zombie.enragedUntil) pace *= zombieConfig.enrageSpeed;
      if (state.tick < zombie.chargeUntil) pace *= zombieConfig.chargeSpeed;
      const moved = resolveCircle(
        level,
        zombie.x + (heading.x / headingLength) * pace * dt,
        zombie.z + (heading.z / headingLength) * pace * dt,
        radius,
        0,
        height,
      );
      const intended = pace * dt;
      zombie.pushing = blocked || Math.hypot(moved.x - zombie.x, moved.z - zombie.z) < intended * 0.35;
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
  for (let i = 0; i < zombies.length; i++) {
    const a = zombies[i];
    if (a.dead) continue;
    for (let j = i + 1; j < zombies.length; j++) {
      const b = zombies[j];
      if (b.dead) continue;
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const distance = Math.hypot(dx, dz);
      const minimum = (zombieRadius(a) + zombieRadius(b)) * 0.9;
      if (distance >= minimum || distance === 0) continue;
      // A heavier body shoves the lighter one more.
      const share = kindOf(a).size / (kindOf(a).size + kindOf(b).size);
      const push = (minimum - distance) / distance;
      a.x -= dx * push * (1 - share);
      a.z -= dz * push * (1 - share);
      b.x += dx * push * share;
      b.z += dz * push * share;
    }
  }
}

// The floor's share of the pace: slower in the prologue, as it always was, and growing with depth
// up to a cap after that.
function floorPace(floor: number): number {
  return floor < 0 ? floor : Math.min(depth(floor), config.elevator.speedDepthCap);
}

export function hurtPlayer(state: GameState, player: Player, damage: number): void {
  player.health = Math.max(0, player.health - damage);
  player.lastHurtTick = state.tick;
}

// The nearest living zombie along a ray, if it is closer than maxDistance. `leg` says the bullet
// went in below the knee.
export function raycastZombies(
  state: GameState,
  origin: Vec3,
  direction: Vec3,
  maxDistance: number,
): { zombie: Zombie; distance: number; head: boolean; leg: boolean } | null {
  let nearest: { zombie: Zombie; distance: number; head: boolean; leg: boolean } | null = null;

  for (const zombie of state.zombies) {
    if (zombie.dead) continue;
    const radius = zombieRadius(zombie);
    const { height, headHeight } = zombieHeights(zombie);
    const body = radius * 0.8;
    const head = radius * config.zombie.headWidth;
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
        const y = origin.y + direction.y * hit.distance;
        nearest = { zombie, distance: hit.distance, head: index === 1, leg: index === 0 && !zombie.crawling && y < headHeight * 0.38 };
      }
    }
  }
  return nearest;
}

// What a head shot does: a multiple of the shot's damage, less for a brute's thick skull. A walker
// takes two pistol head shots, not one, so aim has to be good for both.
export function headDamage(zombie: Zombie, damage: number): number {
  return damage * (zombie.kind === 'brute' ? config.zombie.bruteHeadMultiplier : config.zombie.headMultiplier);
}

// Where a hit came from and what it hit, so the zombie can be knocked about.
export interface HitInfo {
  from?: { x: number; z: number };
  leg?: boolean;
  head?: boolean;
}

export function damageZombie(state: GameState, zombie: Zombie, damage: number, hit: HitInfo = {}): void {
  // Patient O cannot be killed, only beaten back.
  if (zombie.boss) {
    hurtBoss(state, zombie, damage, hit.head ?? false);
    return;
  }
  zombie.health -= damage;
  zombie.lastHitTick = state.tick;
  // Being shot wakes it up, wherever it was.
  zombie.alertUntil = Math.max(zombie.alertUntil, state.tick + ticks(config.zombie.alertSeconds));
  if (zombie.health <= 0) {
    zombie.dead = true;
    zombie.deadLeft = config.zombie.deathSeconds;
    dropSupply(state, zombie.x, zombie.z);
    return;
  }
  if (hit.leg && zombie.kind !== 'brute') {
    zombie.legDamage += damage;
    if (zombie.legDamage >= config.zombie.legDamageToCrawl) zombie.crawling = true;
  }
  // A solid hit rocks it back. A brute only notices a very heavy one.
  const heavy = zombie.kind === 'brute' ? damage >= 40 : damage >= 15;
  if (heavy && hit.from && state.tick >= zombie.staggerUntil) {
    zombie.staggerUntil = state.tick + ticks(Math.min(0.7, damage / 60));
    const dx = zombie.x - hit.from.x, dz = zombie.z - hit.from.z;
    const length = Math.hypot(dx, dz) || 1;
    const push = Math.min(0.55, damage / 70) / (zombie.kind === 'brute' ? 3 : 1);
    const { height } = zombieHeights(zombie);
    const moved = resolveCircle(state.level, zombie.x + (dx / length) * push, zombie.z + (dz / length) * push, zombieRadius(zombie), 0, height);
    zombie.x = moved.x;
    zombie.z = moved.z;
  }
}
