import { config } from '../config';
import type { InputMessage } from '../game/inputs';

export interface LocalInput {
  // Turns what the keyboard and mouse did since the last call into one message.
  poll(playerId: number): InputMessage;
  // Mouse turning that has happened but has not been sent in a message yet.
  // The camera adds it on so looking around never waits for the next tick.
  pendingLook(): { yaw: number; pitch: number };
  // Scales mouse turning, so aiming feels the same at the zoomed-in view.
  setLookScale(scale: number): void;
  isLocked(): boolean;
}

export function createLocalInput(element: HTMLElement): LocalInput {
  const keys = new Set<string>();
  let yaw = 0;
  let pitch = 0;
  let firing = false;
  let aiming = false;
  let lookScale = 1;
  // A click is remembered until the next message goes out, even if the button
  // is released before then, so quick clicks are never dropped.
  let clickQueued = false;
  // Jump and cover are single presses, remembered the same way.
  let jumpQueued = false;
  let coverQueued = false;

  window.addEventListener('keydown', (event) => {
    keys.add(event.code);
    if (event.repeat) return;
    if (event.code === 'Space') {
      jumpQueued = true;
      event.preventDefault();
    }
    if (event.code === 'KeyF') coverQueued = true;
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => {
    keys.clear();
    firing = false;
    aiming = false;
  });
  window.addEventListener('contextmenu', (event) => event.preventDefault());

  const isLocked = () => document.pointerLockElement === element;

  element.addEventListener('click', () => {
    if (isLocked()) return;
    // Raw mouse movement skips the operating system's mouse acceleration.
    // Not every browser allows it, so fall back to the normal lock.
    const request = element.requestPointerLock({ unadjustedMovement: true });
    request?.catch(() => element.requestPointerLock());
  });
  document.addEventListener('pointerlockchange', () => {
    if (isLocked()) return;
    firing = false;
    aiming = false;
  });

  window.addEventListener('mousemove', (event) => {
    if (!isLocked()) return;
    yaw -= event.movementX * config.player.lookSensitivity * lookScale;
    pitch -= event.movementY * config.player.lookSensitivity * lookScale;
  });
  window.addEventListener('mousedown', (event) => {
    if (isLocked() && event.button === 0) {
      firing = true;
      clickQueued = true;
    }
    if (isLocked() && event.button === 2) aiming = true;
  });
  window.addEventListener('mouseup', (event) => {
    if (event.button === 0) firing = false;
    if (event.button === 2) aiming = false;
  });

  return {
    isLocked,
    pendingLook: () => ({ yaw, pitch }),
    setLookScale(scale) {
      lookScale = scale;
    },
    poll(playerId) {
      const message: InputMessage = {
        playerId,
        moveForward: (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0),
        moveRight: (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0),
        lookYaw: yaw,
        lookPitch: pitch,
        fire: firing || clickQueued,
        reload: keys.has('KeyR'),
        aim: aiming,
        lean: (keys.has('KeyE') ? 1 : 0) - (keys.has('KeyQ') ? 1 : 0),
        crouch: keys.has('KeyC') || keys.has('ControlLeft'),
        // Holding Space keeps trying to jump, so it climbs as soon as a ledge is in reach.
        jump: jumpQueued || keys.has('Space'),
        toggleCover: coverQueued,
      };
      yaw = 0;
      pitch = 0;
      clickQueued = false;
      jumpQueued = false;
      coverQueued = false;
      return message;
    },
  };
}
