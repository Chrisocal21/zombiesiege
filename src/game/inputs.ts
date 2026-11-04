import type { ItemId } from './items';
import type { WeaponId } from './weapons';

// What a player asked for during one tick. A networked player will send the same thing.
export interface InputMessage {
  // Optional for older clients/replays. The host chooses the fixed camera-height preset.
  cameraStyle?: 'standard' | 'bodycam';
  playerId: number;
  moveForward: number;
  moveRight: number;
  lookYaw: number;
  lookPitch: number;
  fire: boolean;
  reload: boolean;
  aim: boolean;
  // -1 for left, 1 for right.
  lean: number;
  // Held while crouching.
  crouch: boolean;
  // True for any tick where jump was pressed since the last message.
  jump: boolean;
  // True when the cover key was pressed since the last message.
  toggleCover: boolean;
  // True when the use key (pick up, board up) was pressed since the last message.
  use: boolean;
  // True when the swap-weapon key was pressed since the last message.
  swap: boolean;
  swapDirection?: -1 | 1;
  selectWeapon?: WeaponId;
  melee?: boolean;
  // The item to start using, from the wheel or its key.
  useItem?: ItemId;
  // True when the freeze key was pressed since the last message. A testing aid.
  toggleFreeze: boolean;
  // True when the flashlight key was pressed since the last message.
  toggleLight?: boolean;
}

// Standing still with nothing pressed.
export function idleInput(playerId: number): InputMessage {
  return {
    playerId, moveForward: 0, moveRight: 0, lookYaw: 0, lookPitch: 0, fire: false, reload: false, aim: false,
    lean: 0, crouch: false, jump: false, toggleCover: false, use: false, swap: false, toggleFreeze: false,
  };
}

// Two inputs as one, for when they arrive faster than ticks run: the later held keys and stick
// positions, all the turning from both, and any press from either.
export function mergeInputs(earlier: InputMessage, later: InputMessage): InputMessage {
  return {
    ...later,
    lookYaw: earlier.lookYaw + later.lookYaw,
    lookPitch: earlier.lookPitch + later.lookPitch,
    fire: earlier.fire || later.fire,
    jump: earlier.jump || later.jump,
    toggleCover: earlier.toggleCover || later.toggleCover,
    use: earlier.use || later.use,
    swap: earlier.swap || later.swap,
    swapDirection: later.swapDirection ?? earlier.swapDirection,
    selectWeapon: later.selectWeapon ?? earlier.selectWeapon,
    melee: earlier.melee || later.melee,
    useItem: later.useItem ?? earlier.useItem,
    toggleFreeze: earlier.toggleFreeze || later.toggleFreeze,
    toggleLight: earlier.toggleLight || later.toggleLight,
  };
}

// What stays held once an input has been used for a tick: the keys still down and where the
// stick is, but no more turning and no presses, so a single press does not repeat.
export function heldPart(input: InputMessage): InputMessage {
  return {
    ...input,
    lookYaw: 0, lookPitch: 0, toggleCover: false, use: false, swap: false, swapDirection: undefined,
    selectWeapon: undefined, useItem: undefined, toggleFreeze: false, toggleLight: false,
  };
}
