// What a browser and the co-op server say to each other: JSON over one WebSocket per player.
// Shared by both sides, so it must not touch the browser or the server's own APIs.

export const MAX_PLAYERS = 4;

// Room codes are short, so they can be read out to a friend.
export const ROOM_CODE = /^[A-Z0-9]{4,8}$/;

// Where a player stands. For now each browser runs its own game and only shares this; once the
// server runs the game, it sends the whole state instead.
export interface Pose {
  // The tower floor the player is on, so players on other floors are not drawn.
  floor: number;
  x: number;
  // Height of the feet above the floor.
  y: number;
  z: number;
  yaw: number;
}

export type ClientMessage = { type: 'pose'; pose: Pose };

export type ServerMessage =
  // Sent once on joining: which player this browser is.
  | { type: 'welcome'; room: string; playerId: number }
  // Sent instead of welcome when every seat is taken, then the server hangs up.
  | { type: 'full' }
  | { type: 'pose'; playerId: number; pose: Pose }
  | { type: 'left'; playerId: number };
