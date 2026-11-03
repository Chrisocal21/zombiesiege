import { config } from '../config';

// The tower has many more storeys than the elevator stops at. `floor` everywhere else is the
// index into this list of stops, with the garage as 0.
export const stops = config.tower.stops;

// The roof is the floor index one past the last stop.
export const ROOF = stops.length;

export function stopAt(floor: number): { number: number; name: string; waves: number } {
  return floor >= ROOF ? config.tower.roof : stops[floor];
}

export function wavesOnFloor(floor: number): number {
  return stopAt(floor).waves;
}

// The storey number as printed in the elevator, or 'ROOF' past the last stop.
export function storeyLabel(floor: number): string {
  if (floor >= stops.length) return 'ROOF';
  return stops[floor].number === 0 ? 'G' : String(stops[floor].number);
}

// 'Ground floor' or 'Floor 6'.
export function floorTitle(floor: number): string {
  if (floor >= stops.length) return 'Roof';
  return stops[floor].number === 0 ? 'Ground floor' : `Floor ${stops[floor].number}`;
}

// How many storeys the elevator climbs to reach the next stop.
export function storeysToNext(floor: number): number {
  return stopAt(floor + 1).number - stopAt(floor).number;
}

// Zombies in a wave. A floor with fewer waves still ends on the biggest one in the table.
export function waveSize(floor: number, wave: number): number {
  const table = config.waves.zombiesPerWave;
  const count = wavesOnFloor(floor);
  const index = count <= 1 ? table.length - 1 : Math.round(((wave - 1) * (table.length - 1)) / (count - 1));
  return Math.round(table[index] * (1 + config.elevator.extraZombiesPerFloor * floor));
}
