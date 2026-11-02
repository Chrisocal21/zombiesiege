// What a player wants to do this tick. The game state is the only thing that acts on it.
// The message comes from the keyboard today and from the network in Phase 2.
export interface InputMessage {
  playerId: number;
  // -1 to 1. Forward is positive, right is positive.
  moveForward: number;
  moveRight: number;
  // Radians turned since the last message. Positive turns left and up.
  lookYaw: number;
  lookPitch: number;
  // True while the button is held.
  fire: boolean;
  reload: boolean;
  aim: boolean;
  // -1 to lean left, 1 to lean right. Only has an effect while aiming.
  lean: number;
}
