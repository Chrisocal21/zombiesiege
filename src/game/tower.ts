import { config } from '../config';

// The tower has many more storeys than the elevator stops at. `floor` everywhere else is the
// index into this list of stops, with the garage as 0.
export const stops = config.tower.stops;

// The roof is the floor index one past the last stop.
export const ROOF = stops.length;

// Act 2: the floors after the roof, going down the office tower. Floor ROOF + 1 is the first.
// Act 3 follows it: the tunnel, the pharmacy and the lab.
export const descent = config.tower.descent;
export const vault = config.tower.vault;
export const daybreak = config.tower.daybreak;
const sequel = [...descent, ...vault, ...daybreak];
export const LAST_DESCENT = ROOF + descent.length;
export const LAST_VAULT = LAST_DESCENT + vault.length;
export const LAST_FLOOR = ROOF + sequel.length;

// True from Act 2 on: the floors after the hospital's roof.
export function isDescent(floor: number): boolean {
  return floor > ROOF;
}

// Which act a floor belongs to, 1 to 4.
export function actOf(floor: number): 1 | 2 | 3 | 4 {
  return floor <= ROOF ? 1 : floor <= LAST_DESCENT ? 2 : floor <= LAST_VAULT ? 3 : 4;
}

export function stopAt(floor: number): { number: number; name: string; waves: number } {
  if (floor > ROOF) return sequel[Math.min(floor - ROOF, sequel.length) - 1];
  return floor === ROOF ? config.tower.roof : stops[floor];
}

// Whether the lift goes down in getting from one floor to another.
export function goesDown(from: number, to: number): boolean {
  return stopAt(to).number < stopAt(from).number;
}

export function wavesOnFloor(floor: number): number {
  return stopAt(floor).waves;
}

// The storey number as printed in the elevator, or 'ROOF' past the last stop.
export function storeyLabel(floor: number): string {
  if (floor > ROOF) {
    const number = stopAt(floor).number;
    return number === 0 ? 'G' : number < 0 ? `B${-number}` : String(number);
  }
  if (floor >= stops.length) return 'ROOF';
  return stops[floor].number === 0 ? 'G' : String(stops[floor].number);
}

// 'Ground floor' or 'Floor 6'.
export function floorTitle(floor: number): string {
  if (floor > ROOF) {
    const number = stopAt(floor).number;
    return number === 0 ? 'Ground floor' : number < 0 ? `Level B${-number}` : `Floor ${number}`;
  }
  if (floor >= stops.length) return 'Roof';
  return stops[floor].number === 0 ? 'Ground floor' : `Floor ${stops[floor].number}`;
}

// How many storeys the elevator climbs to reach the next stop.
export function storeysToNext(floor: number): number {
  return Math.abs(stopAt(floor + 1).number - stopAt(floor).number);
}

// Zombies in a wave. A floor with fewer waves still ends on the biggest one in the table.
export function waveSize(floor: number, wave: number): number {
  const table = config.waves.zombiesPerWave;
  const count = wavesOnFloor(floor);
  const index = count <= 1 ? table.length - 1 : Math.round(((wave - 1) * (table.length - 1)) / (count - 1));
  return Math.round(table[index] * (1 + config.elevator.extraZombiesPerFloor * floor));
}
