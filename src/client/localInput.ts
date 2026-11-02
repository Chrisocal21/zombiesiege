import { config } from '../config';
import type { InputMessage } from '../game/inputs';
import { type Action, bindings } from './bindings';
import { settings } from './settings';

export interface LocalInput {
  // Turns what the keyboard and mouse did since the last call into one message.
  poll(playerId: number): InputMessage;
  // Mouse turning that has happened but has not been sent in a message yet.
  // The camera adds it on so looking around never waits for the next tick.
  pendingLook(): { yaw: number; pitch: number };
  // Scales mouse turning, so aiming feels the same at the zoomed-in view.
  setLookScale(scale: number): void;
  isLocked(): boolean;
  // Captures the mouse. Has to be called from a click or key press.
  lock(): Promise<boolean>;
  // Forgets everything held or pressed, for when the game was paused.
  reset(): void;
  // Calls back when the mouse is released by the browser (Esc), so the menu can open.
  onUnlock(callback: () => void): void;
}

// Presses that are remembered until the next message goes out, even if released first.
const LATCHED: Action[] = ['jump', 'cover', 'use', 'freeze'];

export function createLocalInput(element: HTMLElement): LocalInput {
  const down = new Set<string>();
  let yaw = 0;
  let pitch = 0;
  let lookScale = 1;
  // A click is remembered until the next message goes out, even if the button
  // is released before then, so quick clicks are never dropped.
  let clickQueued = false;
  const queued = new Set<Action>();
  let unlockCallback: () => void = () => {};

  const isLocked = () => document.pointerLockElement === element;
  const held = (action: Action) => down.has(bindings[action]);

  function press(code: string): void {
    down.add(code);
    for (const action of LATCHED) if (bindings[action] === code) queued.add(action);
    if (bindings.fire === code) clickQueued = true;
  }

  window.addEventListener('keydown', (event) => {
    // Browser shortcuts like F5 and F11 are left alone, but the keys the game uses are not
    // allowed to scroll or tab away.
    if (!isLocked()) return;
    if (event.code === 'Space' || event.code === 'Tab') event.preventDefault();
    if (!event.repeat) press(event.code);
    else down.add(event.code);
  });
  window.addEventListener('keyup', (event) => down.delete(event.code));
  window.addEventListener('blur', () => down.clear());
  window.addEventListener('contextmenu', (event) => event.preventDefault());

  document.addEventListener('pointerlockchange', () => {
    if (isLocked()) return;
    down.clear();
    unlockCallback();
  });

  window.addEventListener('mousemove', (event) => {
    if (!isLocked()) return;
    yaw -= event.movementX * config.player.lookSensitivity * settings.sensitivity * lookScale;
    pitch -= event.movementY * config.player.lookSensitivity * settings.sensitivity * lookScale;
  });
  window.addEventListener('mousedown', (event) => {
    if (isLocked()) press(`Mouse${event.button}`);
  });
  window.addEventListener('mouseup', (event) => down.delete(`Mouse${event.button}`));

  return {
    isLocked,
    onUnlock(callback) {
      unlockCallback = callback;
    },
    async lock() {
      // Raw mouse movement skips the operating system's mouse acceleration.
      // Not every browser allows it, so fall back to the normal lock.
      try {
        await element.requestPointerLock({ unadjustedMovement: true });
      } catch {
        try {
          await element.requestPointerLock();
        } catch {
          return false;
        }
      }
      return isLocked();
    },
    reset() {
      down.clear();
      queued.clear();
      clickQueued = false;
      yaw = 0;
      pitch = 0;
    },
    pendingLook: () => ({ yaw, pitch }),
    setLookScale(scale) {
      lookScale = scale;
    },
    poll(playerId) {
      const message: InputMessage = {
        cameraStyle: settings.cameraStyle,
        playerId,
        moveForward: (held('forward') ? 1 : 0) - (held('back') ? 1 : 0),
        moveRight: (held('right') ? 1 : 0) - (held('left') ? 1 : 0),
        lookYaw: yaw,
        lookPitch: pitch,
        fire: held('fire') || clickQueued,
        reload: held('reload'),
        aim: held('aim'),
        lean: (held('leanRight') ? 1 : 0) - (held('leanLeft') ? 1 : 0),
        crouch: held('crouch'),
        // Holding the jump key keeps trying to jump, so it climbs as soon as a ledge is in reach.
        jump: queued.has('jump') || held('jump'),
        toggleCover: queued.has('cover'),
        use: queued.has('use'),
        toggleFreeze: queued.has('freeze'),
      };
      yaw = 0;
      pitch = 0;
      clickQueued = false;
      queued.clear();
      return message;
    },
  };
}
