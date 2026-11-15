import type { Door, Elevator, Level, LevelLight, Station } from './types';
import { wallLine } from './build';
import { CREW } from './voices';
import { block, FRONT_HEIGHT, frontage, ground, parkedCar, streetDoor, checkpointBoxes } from './streetKit';
import { DOOR_HEIGHT, furniture, stationBoxes } from './wardKit';

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
  streetDoor(-18, 12.25, 0, -1), streetDoor(6, 12.25, 0, -1),
];

// Casa Rosa, behind the south frontage: its front door off the pavement, a dining room, the kitchen through a
// door in the partition, and the kitchen's back door onto a walled alley where the delivery van stands. Four
// people are hiding in the kitchen. Getting them to the van is the crew's choice; nothing waits on it.
const restaurantDoor: Door = { position: { x: 21, y: 0, z: 12.25 }, normal: { x: 0, z: -1 }, width: 1.8, height: 2.5 };
const ROSA = '#7a4a3e';
const restaurant = [
  ground(15.5, 33, 12.5, 19, '#6b5546'),
  ...wallLine('z', 15.25, 12.5, 19.5, [], 3.6, 0.5, ROSA, 'wall'),
  ...wallLine('z', 33.25, 12.5, 24, [], 6, 0.5, ROSA, 'wall'),
  // The partition between the dining room and the kitchen, with its door.
  ...wallLine('z', 27.25, 12.5, 19, [{ centre: 16.4, width: 1.3, height: 2.3 }], 3.6, 0.3, '#c9bfae', 'wall'),
  // The back wall, with the kitchen's back door onto the alley.
  ...wallLine('x', 19.25, 15, 33.5, [{ centre: 30.2, width: 1.3, height: 2.3 }], 3.6, 0.5, ROSA, 'wall'),
  { position: { x: 24.25, y: 3.75, z: 15.9 }, size: { x: 18, y: 0.3, z: 7.2 }, color: '#d9d0c0', surface: 'wall' as const },
  // Tables in the dining room, the kitchen's steel counters.
  furniture(18, 14.6, 1.2, 0.76, 1.2, '#5a3a2a', 'desk'),
  furniture(18, 17.4, 1.2, 0.76, 1.2, '#5a3a2a', 'desk'),
  furniture(22.5, 16, 1.2, 0.76, 1.2, '#5a3a2a', 'desk'),
  furniture(25.4, 14.2, 1.2, 0.76, 1.2, '#5a3a2a', 'desk'),
  furniture(30, 13.2, 4.6, 0.92, 0.8, '#9aa2a8', 'counter', 'north'),
  furniture(32.5, 16, 0.8, 0.92, 2.4, '#9aa2a8', 'counter', 'west'),
  // The back alley: open to the sky, walled, the van at its far end.
  ground(15.5, 33, 19.5, 24, '#3a3c40'),
  ...wallLine('x', 24.25, 15, 33.5, [], 6, 0.5, '#5a4e46', 'wall'),
  ...wallLine('z', 15.25, 19.5, 24, [], 6, 0.5, '#5a4e46', 'wall'),
  { position: { x: 18.4, y: 1.2, z: 22.4 }, size: { x: 5.45, y: 2.4, z: 2.04 }, color: '#e6e3da', surface: 'van' as const },
  block(31.5, 23.2, 1.4, 1.2, 1, '#2f4a3a', 'container'),
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
  scenery: { north: 'city', south: { kind: 'city', open: [[14.5, 35]] }, west: 'city', east: 'city', skyline: true },
  exitGate: true,
  atmosphere: { fog: '#181c24', fogNear: 18, fogFar: 80, ambient: 1.05, sky: { horizon: '#1e2232', zenith: '#05070d', stars: 0.8 } },
  boxes: [
    ground(-34, 34, -8, 8, '#282b30', 'slab'),
    ground(-34, 34, -12, -8, '#7d7f80'),
    ground(-34, 34, 8, 12, '#7d7f80'),
    ...frontage('x', -12.25, -34.5, 34.5, doors, FRONT_HEIGHT, BRICK),
    ...frontage('x', 12.25, -34.5, 34.5, [...doors, restaurantDoor], FRONT_HEIGHT, STONE, 'building', [restaurantDoor]),
    ...restaurant,
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
    block(17, 10.4, 1.4, 0.8, 1.2, '#6b3a2a'),
    block(25, 10.4, 1.4, 0.8, 1.2, '#6b3a2a'),
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
    { text: 'CASA ROSA', sub: 'RISTORANTE', background: '#6b2a2a', position: { x: 21, y: 3.4, z: 11.96 }, rotation: Math.PI, width: 2.6, height: 0.8 },
    { text: 'TO NORTHLINE GENERAL', sub: '3 MILES', background: '#5b1b1b', position: { x: 33.96, y: 3.0, z: 4.2 }, rotation: -Math.PI / 2, width: 3.4, height: 0.7 },
  ],
  // A walk down the road: the dead already about it walk where they please until they see or hear the
  // crew, every gunshot brings more out of the doorways, and once the job is done they come after the crew.
  flow: { kind: 'sweep', loud: 3, first: 4, then: { every: 3.5, max: 12 } },
  // The kitchen's service key, on a hook by the back door: it opens the gate at the end of the street.
  objective: { kind: 'keycard', label: 'Service key', part: 'Back-alley key', position: { x: 29, y: 1.0, z: 9.4 } },
  // Voices from the restaurant's kitchen. Optional: the crew can leave without them.
  rescue: {
    name: 'Casa Rosa',
    people: [
      { x: 31.6, z: 18.2, yaw: -2.4, look: 'cook' },
      { x: 30.4, z: 18.4, yaw: 2.9, look: 'waiter' },
      { x: 32.3, z: 17.3, yaw: -1.9, look: 'diner' },
      { x: 29.4, z: 18.2, yaw: 2.5, look: 'diner' },
    ],
    exit: { minX: 21, maxX: 24, minZ: 20, maxZ: 23.8 },
    points: 150,
    log: { title: 'Casa Rosa', lines: ['Four people were hiding in the kitchen of Casa Rosa: the cook, a waiter and two who had come in to eat.', 'They got out through the back alley in the restaurant’s van, headed for the camp.'] },
    line: 'Four people out in the restaurant’s van',
  },
  residents: [
    { x: 19.5, z: 16, yaw: 1.2 }, { x: 24.5, z: 17.6, yaw: -2 }, { x: 28.5, z: 15, yaw: 2.6 },
    { x: 27.5, z: 21.6, yaw: 0.4 }, { x: 25, z: 22.6, yaw: -1.1 },
  ],
  cues: [
    { on: 'start', at: 1.5, speaker: CREW, text: 'Restaurants both sides. The gate needs a key, and somebody is shouting in one of these kitchens.' },
    { on: 'area', at: 0, area: { minX: 27.5, maxX: 33, minZ: 12.6, maxZ: 19 }, speaker: CREW, text: 'Kitchen. Voices behind the counter. Easy, we are the good guys.', seconds: 5 },
  ],
  navBounds: { minX: -39, maxX: 39, minZ: -17, maxZ: 25 },
  ramp: null,
  // Out in the open there is nothing to board up: the crew walks the street and deals with what is on it.
  barricadeBars: [],
  streetSpawns: [],
  playerSpawns: [{ x: -30, y: 0, z: 0 }],
  spawnYaw: -Math.PI / 2,
  streetLamps: [],
  checkpoint: { x: -30, y: 0, z: 0 },
};
