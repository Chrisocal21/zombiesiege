// What a player asked for during one tick. A networked player will send the same thing.
export interface InputMessage {
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
}
