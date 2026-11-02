import { config } from '../config';
import type { Level } from '../levels/types';
import { resolveCircle } from './collision';
import type { InputMessage } from './inputs';
import type { GameState } from './state';

const MAX_PITCH = Math.PI / 2 - 0.05;

// Advances the game by one tick. Rules only, nothing here knows about Three.js.
export function step(state: GameState, inputs: InputMessage[], dt: number, level: Level): void {
  for (const input of inputs) {
    const player = state.players[input.playerId];
    if (!player) continue;

    player.yaw += input.lookYaw;
    player.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, player.pitch + input.lookPitch));

    const length = Math.hypot(input.moveForward, input.moveRight);
    if (length > 0) {
      // Dividing by length keeps diagonal movement from being faster.
      const forward = input.moveForward / Math.max(length, 1);
      const right = input.moveRight / Math.max(length, 1);
      const speed = config.player.moveSpeed * dt;
      const sin = Math.sin(player.yaw);
      const cos = Math.cos(player.yaw);
      const moved = resolveCircle(
        level,
        player.x + (-sin * forward + -cos * right) * speed,
        player.z + (-cos * forward + sin * right) * speed,
        config.player.radius,
      );
      player.x = moved.x;
      player.z = moved.z;
    }
  }
  state.tick++;
}
