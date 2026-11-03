import { floor12 } from './floor12';
import { floor3 } from './floor3';
import { floor6 } from './floor6';
import { floor9 } from './floor9';
import { level0 } from './level0';
import { roof } from './roof';
import type { Level } from './types';

// The level for each elevator stop, by stop index, with the roof one past the last stop.
const FLOORS: Record<number, Level> = { 1: floor3, 2: floor6, 3: floor9, 4: floor12, 5: roof };

export function levelForFloor(floor: number): Level {
  return FLOORS[floor] ?? level0;
}
