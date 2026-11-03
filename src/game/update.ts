import { config } from '../config';
import type { Level } from '../levels/types';
import { useAction } from './doors';
import { raycastBoxes } from './hitscan';
import type { InputMessage } from './inputs';
import { moveBody } from './movement';
import { dropCase } from './objectives';
import { eyeY, type GameState, type Player, type Zombie } from './state';
import { equipWeapon, isMelee, swapWeapon, weaponStats } from './weapons';
import { resolveMelee, startMelee } from './melee';
import { updateWaves } from './waves';
import { damageZombie, raycastZombies, updateZombies } from './zombies';

export const MAX_PITCH = Math.PI / 2 - 0.05;

// Advances the game by one tick. Rules only, nothing here knows about Three.js.
export function step(state: GameState, inputs: InputMessage[], dt: number): void {
  const level = state.level;
  for (const input of inputs) {
    const player = state.players[input.playerId];
    if (!player || player.health <= 0) continue;

    if (input.toggleFreeze) state.frozen = !state.frozen;
    if (input.toggleLight) player.flashlight = !player.flashlight;
    if (input.use) useAction(state, player);
    look(player, input);
    // You can't look down the sights mid-reload, while hanging off a ladder or a ledge, or with
    // both hands round a case.
    player.aiming = input.aim && !isMelee(player.weapon) && player.meleeLeft === 0 && player.reloadLeft === 0 && !player.ladder && !player.mantle && player.carrying < 0;
    moveBody(player, input, dt, level);
    player.cameraStyle = input.cameraStyle === 'bodycam' ? 'bodycam' : 'standard';
    const targetDrop = player.cameraStyle === 'bodycam' && !player.aiming && !player.ladder && !player.mantle
      ? config.view.bodycamDrop * (1 - player.crouch * 0.45) : 0;
    const cameraStep = config.view.bodycamDrop * dt / config.player.aimSeconds;
    player.cameraDrop += Math.max(-cameraStep, Math.min(cameraStep, targetDrop - player.cameraDrop));
    lean(player, input, dt, level);
    weapon(state, player, input, dt, level);
  }

  // Whoever goes down lets go of what they were carrying.
  for (const player of state.players) if (player.health <= 0) dropCase(state, player);
  if (!state.frozen) {
    updateZombies(state, dt, level);
    updateWaves(state, dt, level);
  }
  for (const player of state.players) regenerate(state, player, dt);
  state.tick++;
}

function look(player: Player, input: InputMessage): void {
  player.yaw += input.lookYaw;
  player.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, player.pitch + input.lookPitch));
}

function regenerate(state: GameState, player: Player, dt: number): void {
  if (player.health <= 0 || player.health >= config.player.maxHealth) return;
  const quietSeconds = (state.tick - player.lastHurtTick) / config.ticksPerSecond;
  if (player.lastHurtTick >= 0 && quietSeconds < config.player.regenDelaySeconds) return;
  player.health = Math.min(config.player.maxHealth, player.health + config.player.regenPerSecond * dt);
}

// A wall closer than this to the head stops the lean, so the view never goes inside it.
const LEAN_WALL_MARGIN = 0.2;

// Leaning works while aiming or pressed against cover. The head moves out to the side, unless
// something is in the way.
function lean(player: Player, input: InputMessage, dt: number, level: Level): void {
  const target = player.aiming || player.cover ? input.lean : 0;
  const maxStep = dt / config.player.leanSeconds;
  player.lean += Math.max(-maxStep, Math.min(maxStep, target - player.lean));

  const distance = player.cover ? config.player.coverLeanDistance : config.player.leanDistance;
  const side = Math.sign(player.lean);
  let reach = Math.abs(player.lean) * distance;
  if (reach > 0) {
    const origin = { x: player.x, y: eyeY(player), z: player.z };
    const direction = { x: Math.cos(player.yaw) * side, y: 0, z: -Math.sin(player.yaw) * side };
    const wall = raycastBoxes(level, origin, direction, reach + LEAN_WALL_MARGIN);
    if (wall !== null) reach = Math.min(reach, Math.max(0, wall - LEAN_WALL_MARGIN));
  }
  player.leanOffset = side * reach;
}

function weapon(
  state: GameState,
  player: Player,
  input: InputMessage,
  dt: number,
  level: Level,
): void {
  player.cooldown = Math.max(0, player.cooldown - dt);
  if (player.meleeLeft > 0) {
    player.meleeLeft = Math.max(0, player.meleeLeft - dt);
    const attack = weaponStats(player.weapon).melee;
    if (player.meleeHitPending && player.meleeLeft <= attack.seconds - attack.windup) {
      player.meleeHitPending = false;
      if (!player.ladder && !player.mantle && player.carrying < 0) resolveMelee(state, player);
    }
    return;
  }
  // Carrying a case, the gun is down. Pulling the trigger sets the case down and brings it up.
  if (player.carrying >= 0) {
    if (input.fire) {
      dropCase(state, player);
      player.cooldown = 0.35;
      player.lastSwapTick = state.tick;
    }
    return;
  }
  if (!player.ladder && !player.mantle) {
    if (input.selectWeapon) equipWeapon(player, input.selectWeapon, state.tick);
    else if (input.swap) swapWeapon(player, state.tick, input.swapDirection);
  }
  const pistol = weaponStats(player.weapon);
  if (!player.ladder && !player.mantle && (input.melee || (isMelee(player.weapon) && input.fire && player.cooldown === 0))) {
    startMelee(state, player);
    return;
  }
  if (isMelee(player.weapon)) return;

  if (player.reloadLeft > 0) {
    player.reloadLeft -= dt;
    if (player.reloadLeft <= 0) {
      player.reloadLeft = 0;
      // Fill the magazine from the spare rounds.
      const taken = Math.min(pistol.magazineSize - player.ammo, player.reserve);
      player.ammo += taken;
      player.reserve -= taken;
    }
    return;
  }
  // Both hands are busy on a ladder or a ledge.
  if (player.ladder || player.mantle) return;

  const wantsReload = input.reload && player.ammo < pistol.magazineSize && player.reserve > 0;
  // Pulling the trigger on an empty magazine reloads too, if there is anything to load.
  if (wantsReload || (input.fire && player.ammo === 0 && player.reserve > 0)) {
    player.reloadLeft = pistol.reloadSeconds;
    return;
  }
  // Nothing in the gun and nothing spare: just a click.
  if (input.fire && player.ammo === 0 && player.cooldown <= 0) {
    player.lastDryTick = state.tick;
    player.cooldown = 0.4;
    return;
  }

  if (!input.fire || player.cooldown > 0) return;

  player.ammo--;
  player.cooldown = pistol.secondsBetweenShots;

  const cosPitch = Math.cos(player.pitch);
  const direction = {
    x: -Math.sin(player.yaw) * cosPitch,
    y: Math.sin(player.pitch),
    z: -Math.cos(player.yaw) * cosPitch,
  };
  // The shot starts at the active camera height, including the chest-camera preset.
  const origin = {
    x: player.x + Math.cos(player.yaw) * player.leanOffset,
    y: eyeY(player),
    z: player.z - Math.sin(player.yaw) * player.leanOffset,
  };
  // The middle pellet goes where the crosshair is, and shows as the shot. The rest scatter in a cone.
  const up = { x: -Math.sin(player.yaw) * -Math.sin(player.pitch), y: Math.cos(player.pitch), z: -Math.cos(player.yaw) * -Math.sin(player.pitch) };
  const right = { x: Math.cos(player.yaw), y: 0, z: -Math.sin(player.yaw) };
  let zombieHit: ReturnType<typeof raycastZombies> = null;
  let wallDistance: number | null = null;
  const struck = new Map<Zombie, boolean>();
  for (let pellet = 0; pellet < pistol.pellets; pellet++) {
    let aim = direction;
    if (pellet > 0) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.sqrt(Math.random()) * pistol.spread;
      const sideways = Math.cos(angle) * radius;
      const lift = Math.sin(angle) * radius;
      aim = {
        x: direction.x + right.x * sideways + up.x * lift,
        y: direction.y + up.y * lift,
        z: direction.z + right.z * sideways + up.z * lift,
      };
      const length = Math.hypot(aim.x, aim.y, aim.z);
      aim = { x: aim.x / length, y: aim.y / length, z: aim.z / length };
    }
    const wall = raycastBoxes(level, origin, aim, pistol.range);
    const hit = raycastZombies(state, origin, aim, wall ?? pistol.range);
    if (pellet === 0) { wallDistance = wall; zombieHit = hit; }
    if (!hit) continue;
    // A shot to the head kills whatever its health.
    damageZombie(state, hit.zombie, hit.head ? hit.zombie.health : pistol.damage);
    struck.set(hit.zombie, (struck.get(hit.zombie) ?? false) || hit.head);
  }
  // Points once per zombie hit, however many pellets landed.
  let anyKill = false;
  let anyHead = false;
  for (const [zombie, head] of struck) {
    const earned = head ? config.points.perHeadshot : zombie.dead ? config.points.perKill : config.points.perHit;
    state.points[player.id] = Math.min(Number.MAX_SAFE_INTEGER, state.points[player.id] + earned);
    if (zombie.dead) anyKill = true;
    if (head) anyHead = true;
  }
  player.lastShotKill = anyKill;
  player.lastShotHead = anyHead;

  const hitDistance = zombieHit ? zombieHit.distance : wallDistance;
  const distance = hitDistance ?? pistol.range;

  player.lastShotTick = state.tick;
  player.lastShotHit = hitDistance !== null;
  player.lastShotZombie = struck.size > 0;
  player.lastShotEnd = {
    x: origin.x + direction.x * distance,
    y: origin.y + direction.y * distance,
    z: origin.z + direction.z * distance,
  };
}
