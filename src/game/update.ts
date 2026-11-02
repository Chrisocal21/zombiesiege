import { config } from '../config';
import type { Level } from '../levels/types';
import { resolveCircle } from './collision';
import { raycastBoxes } from './hitscan';
import type { InputMessage } from './inputs';
import type { GameState, Player } from './state';

export const MAX_PITCH = Math.PI / 2 - 0.05;

// Advances the game by one tick. Rules only, nothing here knows about Three.js.
export function step(state: GameState, inputs: InputMessage[], dt: number, level: Level): void {
  for (const input of inputs) {
    const player = state.players[input.playerId];
    if (!player) continue;

    look(player, input);
    // You can't look down the sights mid-reload.
    player.aiming = input.aim && player.reloadLeft === 0;
    move(player, input, dt, level);
    weapon(state, player, input, dt, level);
  }
  state.tick++;
}

function look(player: Player, input: InputMessage): void {
  player.yaw += input.lookYaw;
  player.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, player.pitch + input.lookPitch));
}

function move(player: Player, input: InputMessage, dt: number, level: Level): void {
  let targetX = 0;
  let targetZ = 0;
  const length = Math.hypot(input.moveForward, input.moveRight);
  if (length > 0) {
    // Dividing by length keeps diagonal movement from being faster.
    const forward = input.moveForward / Math.max(length, 1);
    const right = input.moveRight / Math.max(length, 1);
    const sin = Math.sin(player.yaw);
    const cos = Math.cos(player.yaw);
    const speed = config.player.moveSpeed * (player.aiming ? config.player.aimMoveMultiplier : 1);
    targetX = (-sin * forward + cos * right) * speed;
    targetZ = (-cos * forward + -sin * right) * speed;
  }

  // Speed up and slow down over a short time instead of jumping.
  const dx = targetX - player.vx;
  const dz = targetZ - player.vz;
  const gap = Math.hypot(dx, dz);
  const maxChange = config.player.acceleration * dt;
  if (gap <= maxChange) {
    player.vx = targetX;
    player.vz = targetZ;
  } else {
    player.vx += (dx / gap) * maxChange;
    player.vz += (dz / gap) * maxChange;
  }

  if (player.vx === 0 && player.vz === 0) return;
  const moved = resolveCircle(
    level,
    player.x + player.vx * dt,
    player.z + player.vz * dt,
    config.player.radius,
  );
  // Whatever a wall stopped is taken out of the speed, so you slide along it.
  player.vx = (moved.x - player.x) / dt;
  player.vz = (moved.z - player.z) / dt;
  player.x = moved.x;
  player.z = moved.z;
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
  const origin = { x: player.x, y: config.player.eyeHeight, z: player.z };
  const hitDistance = raycastBoxes(level, origin, direction, pistol.range);
  const distance = hitDistance ?? pistol.range;

  player.lastShotTick = state.tick;
  player.lastShotHit = hitDistance !== null;
  player.lastShotEnd = {
    x: origin.x + direction.x * distance,
    y: origin.y + direction.y * distance,
    z: origin.z + direction.z * distance,
  };
}
