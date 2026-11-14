import type { Elevator, Level, LevelLight, Lock, Station } from './types';
import { DOOR_HEIGHT, doorway, entry, furniture, partition, shell, stationBoxes, type WardStyle } from './wardKit';

// Act 2, first floor down: the open-plan offices on floor 41 of the office tower. The power is out.
// A kitchen in the north-west, a meeting room in the north-east behind a paid door, and rows of
// desks between them. The freight lift only runs once all three breakers are thrown.
//
//   z -10 +-------+--------------+---------------+
//         |KITCHEN|  (open plan)  | MEETING (lock)|
//   z  -3 +--  ---+               +----  ---------+
//   LIFT  |         DESK ROWS                    |
//   z  10 +--------------------------------------+
//        x -16   -4                8            16

const style: WardStyle = { wall: '#b9bcc1', floor: '#3f454d', ceiling: '#d4d6d9' };
const DESK = '#8b8f94';
const CABINET = '#6c7279';

const doors = [entry(-6, -10.25, 0, 1), entry(1, -10.25, 0, 1), entry(16.25, 4, -1, 0), entry(4, 10.25, 0, -1)];

const elevator: Elevator = { position: { x: -16.25, y: 0, z: 0 }, normal: { x: 1, z: 0 }, width: 2.2, height: DOOR_HEIGHT, cabDepth: 3, cabWidth: 3 };

const locks: Lock[] = [{ position: { x: 12, y: 0, z: -3 }, normal: { x: 0, z: 1 }, width: 2.2, height: DOOR_HEIGHT, cost: 250, label: 'Meeting room' }];

const stations: Station[] = [
  { kind: 'ammo', position: { x: -15.95, y: 1.25, z: -6 }, normal: { x: 1, z: 0 } },
  { kind: 'shotgun', weapon: 'ak', position: { x: 10, y: 1.25, z: 9.95 }, normal: { x: 0, z: -1 } },
];

// Circuit 0 is the lift lobby and the west rows, 1 the middle of the floor and the kitchen, 2 the
// east rows and the meeting room.
const lights: LevelLight[] = [
  { position: { x: -12, y: 3.15, z: 4 }, color: '#e6efff', intensity: 22, ceiling: true, circuit: 0 },
  { position: { x: -12, y: 3.15, z: -5 }, color: '#e6efff', intensity: 20, flicker: true, ceiling: true, circuit: 0 },
  { position: { x: -6, y: 3.15, z: 6 }, color: '#e6efff', intensity: 22, ceiling: true, circuit: 0 },
  { position: { x: -8, y: 3.15, z: -7 }, color: '#fff0d8', intensity: 20, ceiling: true, circuit: 1 },
  { position: { x: -1, y: 3.15, z: 1 }, color: '#e6efff', intensity: 24, flicker: true, ceiling: true, circuit: 1 },
  { position: { x: 2, y: 3.15, z: -6 }, color: '#e6efff', intensity: 22, ceiling: true, circuit: 1 },
  { position: { x: 4, y: 3.15, z: 6 }, color: '#e6efff', intensity: 22, ceiling: true, circuit: 2 },
  { position: { x: 10, y: 3.15, z: 1 }, color: '#e6efff', intensity: 24, ceiling: true, circuit: 2 },
  { position: { x: 12, y: 3.15, z: -6.5 }, color: '#d8e8ff', intensity: 20, flicker: true, ceiling: true, circuit: 2 },
  ...([
    [-15.8, 3], [-4, 9.8], [-9, -9.8], [15.8, 8], [7.9, -6], [1, 2],
  ] as const).map(([x, z]): LevelLight => ({ position: { x, y: 2.75, z }, color: '#ff2a1a', intensity: 3.5, emergency: true })),
];

export const office41: Level = {
  name: 'Floor 41',
  theme: 'ward',
  boxes: [
    ...stationBoxes(stations),
    ...shell(style, 16, 10, [...doors, elevator]),

    // Kitchen, open to the floor through one doorway.
    ...partition(style, 'x', -4, -12, -4, [doorway(-8)]),
    ...partition(style, 'z', -12, -10, -4),
    ...partition(style, 'z', -4, -10, -4),
    // Meeting room, shut behind its paid door.
    ...partition(style, 'x', -3, 8, 16, [{ centre: 12, width: 2.2, height: DOOR_HEIGHT }]),
    ...partition(style, 'z', 8, -10, -3),

    // Kitchen: a counter and a fridge.
    furniture(-8, -9.4, 3, 0.95, 0.8, '#5f666d', 'counter', 'south'),
    furniture(-4.9, -7, 0.9, 1.9, 0.9, '#aebcc6', 'fridge', 'west'),
    // Meeting room: a long table and a cabinet.
    furniture(12, -6.5, 4, 0.8, 1.4, '#7d5a3c', 'desk', 'south'),
    furniture(15.4, -8.5, 0.6, 1.4, 1.6, CABINET, 'cabinet', 'west'),
    // Rows of desks with lanes between them.
    ...[-8, -2, 4].flatMap((x) => [-1.5, 3.5, 7.5].map((z) => furniture(x, z, 2, 0.8, 1, DESK, 'desk', 'south'))),
    // Filing cabinets along the south wall, and a reception counter by the lift.
    furniture(-13, 9.4, 1.6, 1.4, 0.6, CABINET, 'cabinet', 'north'),
    furniture(-10.5, 9.4, 1.6, 1.4, 0.6, CABINET, 'cabinet', 'north'),
    furniture(-13.5, -2.5, 0.9, 1.05, 3, '#4c5a66', 'counter', 'east'),
  ],
  ladders: [],
  lights,
  doors,
  gate: null,
  elevator,
  stations,
  locks,
  signs: [
    { text: 'FLOOR 41', sub: 'OPEN-PLAN OFFICES', background: '#2c3a4d', position: { x: -9.7, y: 2.9, z: 9.96 }, rotation: Math.PI, width: 2.8, height: 0.8 },
    { text: 'KITCHEN', sub: 'PLEASE CLEAN UP AFTER YOURSELF', background: '#4d3a2c', position: { x: -8, y: 2.8, z: -3.84 }, rotation: Math.PI, width: 2.0, height: 0.5 },
    { text: 'MEETING ROOM', sub: 'BOOK AHEAD', background: '#2c3a4d', position: { x: 14.2, y: 2.9, z: -2.84 }, rotation: Math.PI, width: 1.8, height: 0.5 },
    { text: 'FREIGHT LIFT', sub: 'NO POWER  /  RESET THE BREAKERS', background: '#5b1b1b', position: { x: -15.96, y: 3.0, z: 3.4 }, rotation: Math.PI / 2, width: 2.4, height: 0.5 },
  ],
  // One breaker in the kitchen, one on the south wall of the open plan, and one in the meeting room.
  objective: {
    kind: 'breakers',
    label: 'Breakers',
    part: 'Power to the freight lift',
    panels: [
      { position: { x: -10.4, y: 1.45, z: -9.95 }, normal: { x: 0, z: 1 } },
      { position: { x: -6, y: 1.45, z: 9.95 }, normal: { x: 0, z: -1 } },
      { position: { x: 15.95, y: 1.45, z: -5 }, normal: { x: -1, z: 0 } },
    ],
  },
  atmosphere: { fog: '#05070a', fogNear: 6, fogFar: 40, ambient: 1 },
  navBounds: { minX: -21, maxX: 21, minZ: -15, maxZ: 15 },
  ramp: null,
  barricadeBars: [
    { x: -1, y: 0, z: 5 },
    { x: 9, y: 0, z: 2 },
  ],
  streetSpawns: [],
  playerSpawns: [{ x: -13, y: 0, z: 0 }],
  spawnYaw: -Math.PI / 2,
  streetLamps: [],
  checkpoint: { x: -13, y: 0, z: 0 },
};
