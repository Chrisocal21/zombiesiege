import { config } from '../config';
import type { InputMessage } from '../game/inputs';

export interface LocalInput {
  // Turns what the keyboard and mouse did since the last call into one message.
  poll(playerId: number): InputMessage;
  isLocked(): boolean;
}

export function createLocalInput(element: HTMLElement): LocalInput {
  const keys = new Set<string>();
  let yaw = 0;
  let pitch = 0;

  window.addEventListener('keydown', (event) => keys.add(event.code));
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => keys.clear());

  const isLocked = () => document.pointerLockElement === element;

  element.addEventListener('click', () => {
    if (!isLocked()) element.requestPointerLock();
  });

  window.addEventListener('mousemove', (event) => {
    if (!isLocked()) return;
    yaw -= event.movementX * config.player.lookSensitivity;
    pitch -= event.movementY * config.player.lookSensitivity;
  });

  return {
    isLocked,
    poll(playerId) {
      const message: InputMessage = {
        playerId,
        moveForward: (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0),
        moveRight: (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0),
        lookYaw: yaw,
        lookPitch: pitch,
      };
      yaw = 0;
      pitch = 0;
      return message;
    },
  };
}
