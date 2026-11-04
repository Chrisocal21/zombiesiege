import type { ItemId } from '../game/items';
import type { WeaponId } from '../game/weapons';

// The weapon and item wheel: held open with a key, the mouse picks a segment by direction and
// letting go chooses it. Segments run clockwise from the top.
export type WheelSegment = { kind: 'weapon'; id: WeaponId } | { kind: 'item'; id: ItemId };

export const WHEEL_SEGMENTS: WheelSegment[] = [
  { kind: 'weapon', id: 'pistol' },
  { kind: 'weapon', id: 'shotgun' },
  { kind: 'item', id: 'bandage' },
  { kind: 'item', id: 'medkit' },
  { kind: 'item', id: 'water' },
];

// How far the mouse has to move from the middle before a segment is chosen, and the furthest it goes.
export const WHEEL_DEADZONE = 28;
export const WHEEL_REACH = 110;

export interface WheelState {
  open: boolean;
  // The mouse's offset from the middle, in pixels, y down.
  x: number;
  y: number;
}

export function wheelSegment(x: number, y: number): number {
  if (Math.hypot(x, y) < WHEEL_DEADZONE) return -1;
  const turn = Math.PI * 2;
  const angle = (((Math.atan2(y, x) + Math.PI / 2) % turn) + turn) % turn;
  return Math.round(angle / (turn / WHEEL_SEGMENTS.length)) % WHEEL_SEGMENTS.length;
}
