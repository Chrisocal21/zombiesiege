import { config } from '../config';
import type { InputMessage } from '../game/inputs';
import { type Action, bindings } from './bindings';
import { settings } from './settings';
import type { ItemId } from '../game/items';
import { WEAPON_IDS, type WeaponId } from '../game/weapons';
import { WHEEL_REACH, WHEEL_SEGMENTS, wheelSegment, type WheelState } from './wheel';

export interface LocalInput {
  // Turns what the keyboard and mouse did since the last call into one message.
  poll(playerId: number): InputMessage;
  // Mouse turning that has happened but has not been sent in a message yet.
  // The camera adds it on so looking around never waits for the next tick.
  pendingLook(): { yaw: number; pitch: number };
  // Scales mouse turning, so aiming feels the same at the zoomed-in view.
  setLookScale(scale: number): void;
  // The weapon and item wheel, while its key is held.
  wheel(): WheelState;
  isLocked(): boolean;
  // Captures the mouse. Has to be called from a click or key press.
  lock(): Promise<boolean>;
  // Forgets everything held or pressed, for when the game was paused.
  reset(): void;
  // Calls back when the mouse is released by the browser (Esc), so the menu can open.
  onUnlock(callback: () => void): void;
  // Opens the pause menu without waiting for the browser to release the mouse.
  onPause(callback: () => void): void;
}

// Presses that are remembered until the next message goes out, even if released first.
const LATCHED: Action[] = ['jump', 'cover', 'use', 'freeze', 'swap', 'light', 'melee'];

export function createLocalInput(element: HTMLElement): LocalInput {
  const down = new Set<string>();
  let yaw = 0;
  let pitch = 0;
  let lookScale = 1;
  // A click is remembered until the next message goes out, even if the button
  // is released before then, so quick clicks are never dropped.
  let clickQueued = false;
  let selectedWeapon: WeaponId | undefined;
  let selectedItem: ItemId | undefined;
  let wheelX = 0;
  let wheelY = 0;
  let wheelDirection: -1 | 1 = 1;
  const queued = new Set<Action>();
  let unlockCallback: () => void = () => {};
  let pauseCallback: () => void = () => {};

  const isLocked = () => document.pointerLockElement === element;
  const held = (action: Action) => down.has(bindings[action]);

  function press(code: string): void {
    down.add(code);
    for (const action of LATCHED) if (bindings[action] === code) queued.add(action);
    if (bindings.fire === code) clickQueued = true;
    for (const item of ['bandage', 'medkit', 'water'] as const) if (bindings[item] === code) selectedItem = item;
    if (bindings.wheel === code) { wheelX = 0; wheelY = 0; }
    WEAPON_IDS.forEach((weapon, index) => {
      if (bindings[`weapon${index + 1}` as Action] === code) selectedWeapon = weapon;
    });
  }

  window.addEventListener('keydown', (event) => {
    // Browser shortcuts like F5 and F11 are left alone, but the keys the game uses are not
    // allowed to scroll or tab away.
    if (!isLocked()) return;
    if (event.code === bindings.pause) {
      event.preventDefault();
      if (!event.repeat) pauseCallback();
      return;
    }
    if (event.code === 'Space' || event.code === 'Tab') event.preventDefault();
    if (!event.repeat) press(event.code);
    else down.add(event.code);
  });
  // Letting go of the wheel key chooses what the mouse is pointing at.
  function closeWheel(): void {
    const segment = WHEEL_SEGMENTS[wheelSegment(wheelX, wheelY)];
    if (segment?.kind === 'weapon') selectedWeapon = segment.id;
    else if (segment) selectedItem = segment.id;
    wheelX = 0;
    wheelY = 0;
  }
  window.addEventListener('keyup', (event) => {
    if (event.code === bindings.wheel && down.has(event.code)) closeWheel();
    down.delete(event.code);
  });
  window.addEventListener('blur', () => down.clear());
  window.addEventListener('contextmenu', (event) => event.preventDefault());

  document.addEventListener('pointerlockchange', () => {
    if (isLocked()) return;
    down.clear();
    unlockCallback();
  });

  window.addEventListener('mousemove', (event) => {
    if (!isLocked()) return;
    if (down.has(bindings.wheel)) {
      // The mouse picks from the wheel instead of turning the view.
      wheelX += event.movementX;
      wheelY += event.movementY;
      const length = Math.hypot(wheelX, wheelY);
      if (length > WHEEL_REACH) { wheelX *= WHEEL_REACH / length; wheelY *= WHEEL_REACH / length; }
      return;
    }
    yaw -= event.movementX * config.player.lookSensitivity * settings.sensitivity * lookScale;
    pitch -= event.movementY * config.player.lookSensitivity * settings.sensitivity * lookScale;
  });
  window.addEventListener('mousedown', (event) => {
    if (!isLocked()) return;
    const code = `Mouse${event.button}`;
    if (code === bindings.pause) {
      event.preventDefault();
      event.stopImmediatePropagation();
      pauseCallback();
      return;
    }
    press(code);
  });
  window.addEventListener('mouseup', (event) => down.delete(`Mouse${event.button}`));
  // Cycle owned weapons in the wheel's direction; a spin counts once.
  let lastWheel = 0;
  window.addEventListener('wheel', (event) => {
    if (!isLocked()) return;
    event.preventDefault();
    if (event.timeStamp - lastWheel < 250) return;
    lastWheel = event.timeStamp;
    wheelDirection = event.deltaY < 0 ? -1 : 1;
    queued.add('swap');
  }, { passive: false });

  return {
    isLocked,
    wheel: () => ({ open: down.has(bindings.wheel), x: wheelX, y: wheelY }),
    onUnlock(callback) {
      unlockCallback = callback;
    },
    onPause(callback) {
      pauseCallback = callback;
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
      selectedWeapon = undefined;
      selectedItem = undefined;
      wheelX = 0;
      wheelY = 0;
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
        fire: (held('fire') || clickQueued) && !held('wheel'),
        reload: held('reload'),
        aim: held('aim'),
        lean: (held('leanRight') ? 1 : 0) - (held('leanLeft') ? 1 : 0),
        crouch: held('crouch'),
        // Holding the jump key keeps trying to jump, so it climbs as soon as a ledge is in reach.
        jump: queued.has('jump') || held('jump'),
        toggleCover: queued.has('cover'),
        use: queued.has('use'),
        swap: queued.has('swap'),
        swapDirection: wheelDirection,
        selectWeapon: selectedWeapon,
        useItem: selectedItem,
        melee: queued.has('melee') || held('melee'),
        toggleFreeze: queued.has('freeze'),
        toggleLight: queued.has('light'),
      };
      yaw = 0;
      pitch = 0;
      clickQueued = false;
      selectedWeapon = undefined;
      selectedItem = undefined;
      wheelDirection = 1;
      queued.clear();
      return message;
    },
  };
}
