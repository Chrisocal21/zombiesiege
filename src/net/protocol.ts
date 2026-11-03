import type { InputMessage } from '../game/inputs';
import type { GameState } from '../game/state';
import { WEAPON_IDS } from '../game/weapons';
import type { Level } from '../levels/types';

// What a browser and the co-op server say to each other: JSON over one WebSocket per player.
// Shared by both sides, so it must not touch the browser or the server's own APIs.

export const MAX_PLAYERS = 4;

// Room codes are short, so they can be read out to a friend.
export const ROOM_CODE = /^[A-Z0-9]{4,8}$/;

// The server sends the game this many ticks apart: 30 times a second at 120 ticks.
export const SNAPSHOT_TICKS = 4;

// The game as the server sends it. The level is large and rarely changes, so it only comes
// along when it does: on joining, on a new floor, and when doors are boarded or unlocked.
export type SnapshotState = Omit<GameState, 'level'>;

// An input as a browser sends it. The server fills in which player it is from.
export type SentInput = Omit<InputMessage, 'playerId'>;

export type ClientMessage =
  // `seq` counts up with each input, so the server can say which it has used.
  | { type: 'input'; seq: number; input: SentInput }
  // Start the room's game again, from the garage (0) or straight onto a floor, for everyone.
  | { type: 'restart'; floor: number };

// The highest floor a restart can start on: the roof.
export const TOP_FLOOR = 5;

export type ReadMessage =
  | { type: 'input'; seq: number; input: InputMessage }
  | { type: 'restart'; floor: number };

export type ServerMessage =
  // Sent once on joining: which player this browser is.
  | { type: 'welcome'; room: string; playerId: number }
  // Sent instead of welcome when every seat is taken, then the server hangs up.
  | { type: 'full' }
  // `ack` is the last input from this browser that the game has used.
  | { type: 'snapshot'; ack: number; state: SnapshotState; level?: Level };

const asNumber = (value: unknown, limit: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(-limit, Math.min(limit, value)) : 0;

// Anything a browser sends is checked before the game sees it: numbers kept in range, switches
// made true or false, and unknown weapons dropped.
export function readClientMessage(data: unknown, playerId: number): ReadMessage | null {
  if (typeof data !== 'string' || data.length > 2048) return null;
  let message: { type?: unknown; seq?: unknown; floor?: unknown; input?: Record<string, unknown> };
  try {
    message = JSON.parse(data);
  } catch {
    return null;
  }
  if (message?.type === 'restart') {
    const floor = message.floor;
    return typeof floor === 'number' && Number.isInteger(floor) && floor >= 0 && floor <= TOP_FLOOR ? { type: 'restart', floor } : null;
  }
  if (message?.type !== 'input' || typeof message.seq !== 'number' || typeof message.input !== 'object' || !message.input) return null;
  const raw = message.input;
  const flag = (key: string) => raw[key] === true;
  const weapon = WEAPON_IDS.find((id) => id === raw.selectWeapon);
  return {
    type: 'input',
    seq: message.seq,
    input: {
      playerId,
      cameraStyle: raw.cameraStyle === 'bodycam' ? 'bodycam' : 'standard',
      moveForward: asNumber(raw.moveForward, 1),
      moveRight: asNumber(raw.moveRight, 1),
      // A whole turn or more in one go is not a real mouse movement.
      lookYaw: asNumber(raw.lookYaw, Math.PI),
      lookPitch: asNumber(raw.lookPitch, Math.PI),
      fire: flag('fire'),
      reload: flag('reload'),
      aim: flag('aim'),
      lean: asNumber(raw.lean, 1),
      crouch: flag('crouch'),
      jump: flag('jump'),
      toggleCover: flag('toggleCover'),
      use: flag('use'),
      swap: flag('swap'),
      swapDirection: raw.swapDirection === -1 || raw.swapDirection === 1 ? raw.swapDirection : undefined,
      selectWeapon: weapon,
      melee: flag('melee'),
      toggleFreeze: flag('toggleFreeze'),
      toggleLight: flag('toggleLight'),
    },
  };
}
