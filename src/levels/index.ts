import { floor3 } from './floor3';
import { level0 } from './level0';
import type { Level } from './types';

// The level for each elevator stop, by stop index. Stops without a floor of their own yet reuse the garage.
const FLOORS: Record<number, Level> = { 1: floor3 };

export function levelForFloor(floor: number): Level {
  return FLOORS[floor] ?? level0;
}
