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
  // True when the freeze key was pressed since the last message. A testing aid.
  toggleFreeze: boolean;
}
