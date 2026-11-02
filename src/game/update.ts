import { config } from '../config';
import type { Level } from '../levels/types';
import { resolveCircle } from './collision';
import { raycastBoxes } from './hitscan';
import type { InputMessage } from './inputs';
import type { GameState, Player } from './state';

const MAX_PITCH = Math.PI / 2 - 0.05;

// Advances the game by one tick. Rules only, nothing here knows about Three.js.
export function step(state: GameState, inputs: InputMessage[], dt: number, level: Level): void {
  for (const input of inputs) {
    const player = state.players[input.playerId];
    if (!player) continue;

    look(player, input);
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
  const length = Math.hypot(input.moveForward, input.moveRight);
  if (length === 0) return;

  // Dividing by length keeps diagonal movement from being faster.
  const forward = input.moveForward / Math.max(length, 1);
  const right = input.moveRight / Math.max(length, 1);
  const speed = config.player.moveSpeed * dt;
  const sin = Math.sin(player.yaw);
  const cos = Math.cos(player.yaw);
  const moved = resolveCircle(
    level,
    player.x + (-sin * forward + cos * right) * speed,
    player.z + (-cos * forward + -sin * right) * speed,
    config.player.radius,
  );
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
  const distance = raycastBoxes(level, origin, direction, pistol.range) ?? pistol.range;

  player.lastShotTick = state.tick;
  player.lastShotEnd = {
    x: origin.x + direction.x * distance,
    y: origin.y + direction.y * distance,
    z: origin.z + direction.z * distance,
  };
}
