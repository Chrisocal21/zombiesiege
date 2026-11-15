import type { Elevator, Level, LevelLight, Station } from './types';
import { block, FRONT_HEIGHT, frontage, ground, parkedCar, streetDoor, checkpointBoxes } from './streetKit';
import { DOOR_HEIGHT, stationBoxes } from './wardKit';

// Prologue P04, Commercial District (Mile 3): shops and restaurants on both sides of a street split by a row of
// buildings in the middle, so there are two ways through: the north lane and the south lane, with alleys
// between. The restaurant's service key is at the east end, by the kitchen's back door, and the kitchen's
// back alley is where people are hiding. Nothing here is on a clock.
//
//   z -12 +--[cafe]------------[bar]---------------[bank]-----------+
//         |  north lane                                              |
//         |      [block]    [block]     [block]   (alleys between)   |
//         |  south lane                                         EXIT >
//   z  12 +-----[bistro]------------[shop]------------[kitchen]------+
//        x -34                                                      34

const BRICK = '#7a5f55';
const STONE = '#5f666c';

const doors = [
  streetDoor(-26, -12.25, 0, 1), streetDoor(-2, -12.25, 0, 1), streetDoor(22, -12.25, 0, 1),
  streetDoor(-18, 12.25, 0, -1), streetDoor(6, 12.25, 0, -1), streetDoor(26, 12.25, 0, -1),
];

const elevator: Elevator = { position: { x: 34.25, y: 0, z: 0 }, normal: { x: -1, z: 0 }, width: 6, height: DOOR_HEIGHT, cabDepth: 4, cabWidth: 6 };
const entry: Elevator = { position: { x: -34.25, y: 0, z: 0 }, normal: { x: 1, z: 0 }, width: 6, height: DOOR_HEIGHT, cabDepth: 4, cabWidth: 6 };

const stations: Station[] = [
  { kind: 'ammo', position: { x: -32, y: 1.25, z: -11.95 }, normal: { x: 0, z: 1 } },
  { kind: 'shotgun', position: { x: -8, y: 1.25, z: 11.95 }, normal: { x: 0, z: -1 } },
];

const lamp = (x: number, z: number, flicker = false): LevelLight => ({ position: { x, y: 3.8, z }, color: '#ffc27a', intensity: 30, flicker });
const lights: LevelLight[] = [lamp(-30, -10.4), lamp(-18, 10.4, true), lamp(-8, -10.4), lamp(4, 10.4), lamp(14, -10.4, true), lamp(24, 10.4), lamp(30, -10.4)];

export const commercial: Level = {
  name: 'Commercial District',
  theme: 'street',
  exitGate: true,
  atmosphere: { fog: '#181c24', fogNear: 18, fogFar: 80, ambient: 1.05, sky: { horizon: '#1e2232', zenith: '#05070d', stars: 0.8 } },
  boxes: [
    ground(-34, 34, -8, 8, '#282b30', 'slab'),
    ground(-34, 34, -12, -8, '#7d7f80'),
    ground(-34, 34, 8, 12, '#7d7f80'),
    ...frontage('x', -12.25, -34.5, 34.5, doors, FRONT_HEIGHT, BRICK),
    ...frontage('x', 12.25, -34.5, 34.5, doors, FRONT_HEIGHT, STONE),
    ...frontage('z', 34.25, -12, 12, [elevator], FRONT_HEIGHT, STONE, 'building', [elevator]),
    ...checkpointBoxes(elevator, STONE),
    ...frontage('z', -34.25, -12, 12, [entry], FRONT_HEIGHT, BRICK, 'building', [entry]),
    ...checkpointBoxes(entry, BRICK),
    ...stationBoxes(stations),

    // The row of buildings down the middle, with two alleys through it. The roofs are flat.
    { position: { x: -17, y: 3, z: 0 }, size: { x: 14, y: 6, z: 6 }, color: '#6a5a50', surface: 'building' },
    { position: { x: 1, y: 3, z: 0 }, size: { x: 14, y: 6, z: 6 }, color: '#5f666c', surface: 'building' },
    { position: { x: 19, y: 3, z: 0 }, size: { x: 14, y: 6, z: 6 }, color: '#6a5a50', surface: 'building' },
    // Cars, barriers, planters, and the restaurant's tables out on the pavement.
    parkedCar(-24, -6.2, '#6b2a2a'),
    parkedCar(-6, 6.2, '#2f4a5c'),
    parkedCar(10, -6.2, '#c5c8c5', true),
    parkedCar(28, 6.2, '#344e41'),
    block(-28, 3.4, 0.8, 1.1, 3, '#8a8d90'),
    block(-10, -3.6, 0.8, 1.1, 3, '#8a8d90'),
    block(12, 3.6, 0.8, 1.1, 3, '#8a8d90'),
    block(30, -3.4, 0.8, 1.1, 3, '#8a8d90'),
    block(21, 10.4, 1.4, 0.8, 1.2, '#6b3a2a'),
    block(31, 10.4, 1.4, 0.8, 1.2, '#6b3a2a'),
    block(-12, -10.4, 0.7, 1, 0.7, '#3a3f44', 'barrel'),
  ],
  ladders: [],
  lights,
  doors,
  gate: null,
  elevator,
  entry,
  stations,
  locks: [],
  signs: [
    { text: 'HIGH STREET', sub: 'CAFES  /  BARS  /  RESTAURANTS', background: '#2c3a4d', position: { x: -22, y: 4.2, z: -11.96 }, rotation: 0, width: 3.6, height: 0.9 },
    { text: 'CASA ROSA', sub: 'KITCHEN  /  BACK ALLEY', background: '#6b2a2a', position: { x: 26, y: 3.4, z: 11.96 }, rotation: Math.PI, width: 2.6, height: 0.8 },
    { text: 'TO NORTHLINE GENERAL', sub: '3 MILES', background: '#5b1b1b', position: { x: 33.96, y: 3.0, z: 4.2 }, rotation: -Math.PI / 2, width: 3.4, height: 0.7 },
  ],
  // The kitchen's service key, on a hook by the back door: it opens the gate at the end of the street.
  objective: { kind: 'keycard', label: 'Service key', part: 'Back-alley key', position: { x: 29, y: 1.0, z: 9.4 } },
  navBounds: { minX: -39, maxX: 39, minZ: -17, maxZ: 17 },
  ramp: null,
  barricadeBars: [
    { x: -20, y: 0, z: -4 },
    { x: 4, y: 0, z: 5 },
  ],
  streetSpawns: [],
  playerSpawns: [{ x: -30, y: 0, z: 0 }],
  spawnYaw: -Math.PI / 2,
  streetLamps: [],
  checkpoint: { x: -30, y: 0, z: 0 },
};
