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

// The prologue: the floors before the garage, with negative indexes, the first at -prelude.length.
export const prelude = config.tower.prelude;
export const FIRST_FLOOR = -prelude.length;

// True in the prologue, where the way on is a gate on foot and not a lift.
export function onFoot(floor: number): boolean {
  return floor < 0;
}
export const LAST_DESCENT = ROOF + descent.length;
export const LAST_VAULT = LAST_DESCENT + vault.length;
export const LAST_FLOOR = ROOF + sequel.length;

// True from Act 2 on: the floors after the hospital's roof.
export function isDescent(floor: number): boolean {
  return floor > ROOF;
}

// Which act a floor belongs to: 0 for the prologue, then 1 to 4.
export function actOf(floor: number): 0 | 1 | 2 | 3 | 4 {
  if (floor < 0) return 0;
  return floor <= ROOF ? 1 : floor <= LAST_DESCENT ? 2 : floor <= LAST_VAULT ? 3 : 4;
}

export function stopAt(floor: number): { number: number; name: string; waves: number } {
  if (floor < 0) return prelude[Math.max(floor, FIRST_FLOOR) - FIRST_FLOOR];
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
  if (floor < 0) return `MI ${prelude[Math.max(floor, FIRST_FLOOR) - FIRST_FLOOR].mile}`;
  if (floor > ROOF) {
    const number = stopAt(floor).number;
    return number === 0 ? 'G' : number < 0 ? `B${-number}` : String(number);
  }
  if (floor >= stops.length) return 'ROOF';
  return stops[floor].number === 0 ? 'G' : String(stops[floor].number);
}

// 'Ground floor' or 'Floor 6'.
export function floorTitle(floor: number): string {
  if (floor < 0) return `Mile ${prelude[Math.max(floor, FIRST_FLOOR) - FIRST_FLOOR].mile}`;
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

// Who the infected were in each place: the patients and staff of the hospital, the office workers of the
// tower, the utility crew in the tunnel, shoppers, the scientists in the lab, soldiers at the barricades.
const CROWDS: Record<string, string[]> = {
  roadside: ['visitor', 'shopper', 'police', 'worker', 'visitor'],
  garage: ['visitor', 'patient', 'nurse', 'visitor', 'guard'],
  hospital: ['patient', 'patient', 'nurse', 'visitor', 'surgeon'],
  office: ['worker', 'worker', 'exec', 'worker', 'visitor'],
  utility: ['utility', 'utility', 'worker'],
  shop: ['shopper', 'shopper', 'visitor', 'nurse'],
  lab: ['scientist', 'scientist', 'guard', 'scientist'],
  military: ['soldier', 'soldier', 'soldier', 'shopper'],
  street: ['shopper', 'shopper', 'visitor', 'police', 'shopper'],
};

// The kinds of people the infected on a floor used to be, in the proportions they come in.
export function crowdAt(floor: number): string[] {
  if (floor < 0) return [CROWDS.roadside, CROWDS.roadside, CROWDS.military, CROWDS.shop, CROWDS.street][floor - FIRST_FLOOR] ?? CROWDS.street;
  if (floor <= ROOF) return floor === 0 ? CROWDS.garage : CROWDS.hospital;
  if (floor <= LAST_DESCENT) return CROWDS.office;
  if (floor <= LAST_VAULT) {
    const index = floor - LAST_DESCENT;
    return index === 1 ? CROWDS.utility : index === 2 ? CROWDS.shop : CROWDS.lab;
  }
  return floor - LAST_VAULT === 3 ? CROWDS.military : CROWDS.street;
}

// Zombies in a wave. A floor with fewer waves still ends on the biggest one in the table.
// How hard a floor is, for the size of its waves and the pace of its dead. It climbs a whole step a
// floor through the hospital, then much more slowly through Acts 2 to 4 (config.waves.laterFloorStep),
// so the last floors are a little harder than the hospital roof rather than several times over.
// The prologue counts as the garage.
export function depth(floor: number): number {
  if (floor <= 0) return 0;
  if (floor <= ROOF) return floor;
  return ROOF + (floor - ROOF) * config.waves.laterFloorStep;
}

// How much bigger a wave is for this many players: each one past the first adds a share of a solo wave.
export function crewFactor(players: number): number {
  return 1 + config.waves.extraPerPlayer * Math.max(0, players - 1);
}

// Zombies in a wave: the floor's share of the table, grown with depth, scaled by the crew and by the
// difficulty dial. Time adds more on top while a wave drags on (see waves.ts).
export function waveSize(floor: number, wave: number, players = 1): number {
  const table = config.waves.zombiesPerWave;
  const count = wavesOnFloor(floor);
  const index = count <= 1 ? table.length - 1 : Math.round(((wave - 1) * (table.length - 1)) / (count - 1));
  const size = table[index] * (1 + config.elevator.extraZombiesPerFloor * depth(floor)) * crewFactor(players) * config.waves.difficulty;
  return Math.max(1, Math.round(size));
}

// The most that may be up at once: a room can hold more of them with more players in it.
export function maxAlive(players: number): number {
  return config.waves.maxAlive + config.waves.maxAlivePerPlayer * Math.max(0, players - 1);
}
