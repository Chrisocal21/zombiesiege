import { config } from '../config';
import type { Level } from '../levels/types';
import { raycastBoxes } from './hitscan';
import type { InputMessage } from './inputs';
import { moveBody } from './movement';
import { eyeY, type GameState, type Player } from './state';
import { updateWaves } from './waves';
import { damageZombie, raycastZombies, updateZombies } from './zombies';

export const MAX_PITCH = Math.PI / 2 - 0.05;

// Advances the game by one tick. Rules only, nothing here knows about Three.js.
export function step(state: GameState, inputs: InputMessage[], dt: number, level: Level): void {
  for (const input of inputs) {
    const player = state.players[input.playerId];
    if (!player || player.health <= 0) continue;

    look(player, input);
    // You can't look down the sights mid-reload, or while hanging off a ladder or a ledge.
    player.aiming = input.aim && player.reloadLeft === 0 && !player.ladder && !player.mantle;
    moveBody(player, input, dt, level);
    lean(player, input, dt, level);
    weapon(state, player, input, dt, level);
  }

  updateZombies(state, dt, level);
  updateWaves(state, dt, level);
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
  const pistol = config.pistol;
  player.cooldown = Math.max(0, player.cooldown - dt);

  if (player.reloadLeft > 0) {
    player.reloadLeft -= dt;
    if (player.reloadLeft <= 0) {
      player.reloadLeft = 0;
      player.ammo = pistol.magazineSize;
    }
    return;
  }
  // Both hands are busy on a ladder or a ledge.
  if (player.ladder || player.mantle) return;

  const wantsReload = input.reload && player.ammo < pistol.magazineSize;
  // Pulling the trigger on an empty magazine reloads too.
  if (wantsReload || (input.fire && player.ammo === 0)) {
    player.reloadLeft = pistol.reloadSeconds;
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
  // The shot starts from the head, so leaning round a corner lets you shoot round it.
  const origin = {
    x: player.x + Math.cos(player.yaw) * player.leanOffset,
    y: eyeY(player),
    z: player.z - Math.sin(player.yaw) * player.leanOffset,
  };
  const wallDistance = raycastBoxes(level, origin, direction, pistol.range);
  const zombieHit = raycastZombies(state, origin, direction, wallDistance ?? pistol.range);
  if (zombieHit) damageZombie(state, zombieHit.zombie, pistol.damage);

  const hitDistance = zombieHit ? zombieHit.distance : wallDistance;
  const distance = hitDistance ?? pistol.range;

  player.lastShotTick = state.tick;
  player.lastShotHit = hitDistance !== null;
  player.lastShotZombie = zombieHit !== null;
  player.lastShotEnd = {
    x: origin.x + direction.x * distance,
    y: origin.y + direction.y * distance,
    z: origin.z + direction.z * distance,
  };
}
