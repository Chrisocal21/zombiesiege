import type { Elevator, Level, LevelLight, Station } from './types';
import { CREW } from './voices';
import { block, checkpointBoxes, frontage, ground, parkedCar, streetDoor } from './streetKit';
import { DOOR_HEIGHT, stationBoxes } from './wardKit';

// Act 5, The Missing Delivery: the access road to the camp, a little before dawn. The camp's supply
// convoy never arrived. Its trucks lie along the road with their loads spilled, and a broken-down bus
// is full of people who walked out of the city and stopped. The crew can carry only so much: a case
// takes both hands and the dead are on the road, and the bus passengers will only follow if the crew
// is not busy. What gets back to the gate is the choice.
//
//   z -9 +--gap-----------------gap---------------+
//        |   [truck:case]   [bus]    [truck:case]  |
//   (in)    road               (drop-off)           > camp gate
//        |         [truck:case]                    |
//   z  9 +--------gap---------------gap-----------+
//       x -30                                     30

const SCRUB = '#4a5a3a';
const VERGE = '#5a5a48';
const ROAD = '#2a2d32';
const TRUCK = '#5a6a4a';
const BUS = '#c8b45a';
const CRATE = '#7a6340';

const doors = [streetDoor(-14, -9.25, 0, 1), streetDoor(12, -9.25, 0, 1), streetDoor(-4, 9.25, 0, -1), streetDoor(18, 9.25, 0, -1)];

// The camp's road gate, with its lane beyond.
const elevator: Elevator = { position: { x: 30.25, y: 0, z: 0 }, normal: { x: -1, z: 0 }, width: 6, height: DOOR_HEIGHT, cabDepth: 4, cabWidth: 6 };

const stations: Station[] = [
  { kind: 'ammo', position: { x: -29.95, y: 1.25, z: -6 }, normal: { x: 1, z: 0 } },
  { kind: 'shotgun', weapon: 'ak', position: { x: 0, y: 1.25, z: -8.95 }, normal: { x: 0, z: 1 } },
];

const lamp = (x: number, z: number, flicker = false): LevelLight => ({ position: { x, y: 3.6, z }, color: '#ffd9a0', intensity: 26, flicker, post: true });
const lights: LevelLight[] = [lamp(-22, -4.5), lamp(-8, 4.5, true), lamp(6, -4.5), lamp(20, 4.5), lamp(26, -4.5, true)];

export const delivery: Level = {
  name: 'The Missing Delivery',
  theme: 'street',
  scenery: { north: 'trees', south: 'trees', west: 'trees', east: 'trees', skyline: false },
  exitGate: true,
  atmosphere: { fog: '#30343c', fogNear: 14, fogFar: 74, ambient: 1.4, sky: { horizon: '#7a5a5a', zenith: '#161c30', stars: 0.35 } },
  boxes: [
    ground(-30, 30, -6, 6, ROAD, 'slab'),
    ground(-30, 30, -9, -6, VERGE),
    ground(-30, 30, 6, 9, VERGE),
    ...frontage('x', -9.25, -30.5, 30.5, doors, 2.8, SCRUB, 'wall'),
    ...frontage('x', 9.25, -30.5, 30.5, doors, 2.8, SCRUB, 'wall'),
    ...frontage('z', -30.25, -9, 9, [], 2.8, SCRUB, 'wall'),
    ...frontage('z', 30.25, -9, 9, [elevator], 4.6, '#6e7479', 'building', [elevator]),
    ...checkpointBoxes(elevator, '#6e7479'),
    ...stationBoxes(stations),

    // The convoy: three trucks that stopped where they were hit, each with its load spilled behind it.
    block(-16, -4.2, 6.4, 2.6, 2.4, TRUCK, 'crate'), block(-12.2, -4.6, 1.2, 0.9, 1.4, CRATE, 'crate'),
    block(2, 4.6, 6.4, 2.6, 2.4, TRUCK, 'crate'), block(5.6, 4.2, 1.2, 0.9, 1.4, CRATE, 'crate'),
    block(18, -4.0, 6.4, 2.6, 2.4, TRUCK, 'crate'), block(14.6, -4.4, 1.2, 0.9, 1.4, CRATE, 'crate'),
    // The bus the walkers stopped at, broken down across the middle of the road.
    block(-2, -3, 9, 2.8, 2.6, BUS, 'crate'),
    parkedCar(8, 2.4, '#4a4f55'),
    parkedCar(-24, 3.2, '#7a3030'),
    // The camp's drop-off: a tarp over a pallet by the gate, where the road is lit.
    block(24.5, -3.6, 3, 0.4, 2.2, CRATE, 'crate'),
  ],
  ladders: [],
  lights,
  doors,
  gate: null,
  elevator,
  stations,
  locks: [],
  signs: [
    { text: 'LAST REFUGE', sub: 'SURVIVOR CAMP  /  2 KM', background: '#1b4a5b', position: { x: -29.96, y: 3.0, z: 3.6 }, rotation: Math.PI / 2, width: 2.8, height: 0.7 },
    { text: 'CAMP SUPPLY', sub: 'DROP-OFF  /  CASES HERE', background: '#1b5b4d', position: { x: 24.5, y: 2.6, z: -4.76 }, rotation: 0, width: 2.4, height: 0.5 },
  ],
  // A walk down the road with the dead about it; every gunshot brings more out of the scrub.
  flow: { kind: 'sweep', loud: 3, first: 4, then: { every: 4, max: 10 } },
  // Three cases from the three trucks, to the pallet by the gate. A case takes both hands.
  objective: {
    kind: 'carry',
    label: 'Supply case',
    part: 'The convoy cargo',
    items: [{ x: -12.2, y: 0, z: -5.7 }, { x: 5.6, y: 0, z: 3.0 }, { x: 14.6, y: 0, z: -5.6 }],
    dropoff: { x: 24.5, y: 0, z: -2.2 },
  },
  // People off the road in the bus, hiding low. They will follow the crew to the gate, if the crew can
  // fight and look after them at once.
  rescue: {
    name: 'The stalled bus',
    people: [
      { x: -3.2, z: -1.2, yaw: Math.PI, look: 'diner' },
      { x: -1.8, z: -1.0, yaw: 3.4, look: 'diner' },
      { x: -0.4, z: -1.3, yaw: 2.8, look: 'waiter' },
    ],
    exit: { minX: 25.5, maxX: 29.5, minZ: -3, maxZ: 3 },
    points: 150,
    log: { title: 'The stalled bus', lines: ['Three people had walked out of the city and stopped when the bus they were riding gave out.', 'They reached the camp gate with the crew.'] },
    line: 'Three people from the bus, through the gate',
  },
  residents: [
    { x: -20, z: 0, yaw: 1.4, roam: 3 }, { x: -8, z: 4, yaw: -2, roam: 2 }, { x: 4, z: -4, yaw: 0.6 },
    { x: 10, z: 0, yaw: 2.6, roam: 3 }, { x: 22, z: 3, yaw: -1.2 },
  ],
  cues: [
    { on: 'start', at: 1.5, speaker: CREW, text: 'The camp road. Their convoy never got through. Look for the trucks.' },
    { on: 'start', at: 8, speaker: CREW, text: 'Three cases, and somebody is hiding in that bus. We cannot carry cases and cover them both. Choose.', seconds: 7 },
    { on: 'done', at: 0.6, speaker: CREW, text: 'Supplies are at the drop-off. The camp is a short walk. Go through the gate.' },
  ],
  navBounds: { minX: -35, maxX: 35, minZ: -14, maxZ: 14 },
  ramp: null,
  barricadeBars: [],
  streetSpawns: [],
  playerSpawns: [{ x: -26, y: 0, z: 0 }],
  spawnYaw: -Math.PI / 2,
  streetLamps: [],
  checkpoint: { x: -26, y: 0, z: 0 },
};
