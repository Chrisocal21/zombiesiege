import type { Elevator, Level, LevelLight, Lock, Station } from './types';
import { DOOR_HEIGHT, doorway, entry, furniture, partition, shell, stationBoxes, type WardStyle } from './wardKit';

// Act 2, third floor down: the executive suites on floor 27. Warm wood and quiet carpet, with the
// lights still on. A corridor runs from the freight lift to the east end, with the boardroom, a
// waiting area, two offices and the chief executive's suite off it. The suite is behind a paid
// door and holds the keycard that wakes the lift.
//
//   z -10 +--------+---------------+---------------+
//         | WAITING|   BOARDROOM    | OFFICE A (lock)|
//   z -2.5+--  ----+----  ----------+-----  ---------+
//   LIFT  |              CORRIDOR                  >  |
//   z 2.5 +-------+-----------+---------------------+
//         | RECEP.| OFFICE B  |  CEO SUITE (lock)    |
//   z  10 +-------+-----------+---------------------+
//        x -15   -6           3                     15

const style: WardStyle = { wall: '#c9b99d', floor: '#5a4636', ceiling: '#e6dccb' };
const WOOD = '#7d5a3c';
const LEATHER = '#4a3228';
const BOOKS = '#6d5238';

const doors = [entry(15.25, 0, -1, 0), entry(-4, -10.25, 0, 1), entry(-1, 10.25, 0, -1), entry(-11, 10.25, 0, -1)];

const elevator: Elevator = { position: { x: -15.25, y: 0, z: 0 }, normal: { x: 1, z: 0 }, width: 2.2, height: DOOR_HEIGHT, cabDepth: 3, cabWidth: 3 };

const locks: Lock[] = [
  { position: { x: 10, y: 0, z: -2.5 }, normal: { x: 0, z: 1 }, width: 2.2, height: DOOR_HEIGHT, cost: 250, label: 'Office A' },
  { position: { x: 10, y: 0, z: 2.5 }, normal: { x: 0, z: -1 }, width: 2.2, height: DOOR_HEIGHT, cost: 500, label: 'Chief executive suite' },
];

const stations: Station[] = [
  { kind: 'ammo', position: { x: -14.95, y: 1.25, z: -6 }, normal: { x: 1, z: 0 } },
  { kind: 'shotgun', position: { x: -1, y: 1.25, z: -9.95 }, normal: { x: 0, z: 1 } },
];

const lights: LevelLight[] = [
  { position: { x: -11, y: 3.15, z: -6 }, color: '#ffd9a8', intensity: 18, ceiling: true },
  { position: { x: -2, y: 3.15, z: -6 }, color: '#ffd9a8', intensity: 22, ceiling: true },
  { position: { x: 10, y: 3.15, z: -6 }, color: '#ffd9a8', intensity: 18, flicker: true, ceiling: true },
  { position: { x: -9, y: 3.15, z: 0 }, color: '#ffe6c4', intensity: 20, ceiling: true },
  { position: { x: 0, y: 3.15, z: 0 }, color: '#ffe6c4', intensity: 20, flicker: true, ceiling: true },
  { position: { x: 9, y: 3.15, z: 0 }, color: '#ffe6c4', intensity: 20, ceiling: true },
  { position: { x: -11, y: 3.15, z: 6.5 }, color: '#ffd9a8', intensity: 18, ceiling: true },
  { position: { x: -1.5, y: 3.15, z: 6.5 }, color: '#ffd9a8', intensity: 18, ceiling: true },
  { position: { x: 9, y: 3.15, z: 6.5 }, color: '#ffb877', intensity: 20, flicker: true, ceiling: true },
];

export const exec27: Level = {
  name: 'Floor 27',
  theme: 'ward',
  boxes: [
    ...stationBoxes(stations),
    ...shell(style, 15, 10, [...doors, elevator]),

    // North side of the corridor: the waiting area, the boardroom, and office A behind its paid door.
    ...partition(style, 'x', -2.5, -15, 15, [doorway(-12, 3), doorway(-4, 3.4), { centre: 10, width: 2.2, height: DOOR_HEIGHT }]),
    ...partition(style, 'z', -8, -10, -2.5, [doorway(-6, 2.8)]),
    ...partition(style, 'z', 3, -10, -2.5),
    // South side: reception, office B, and the chief executive's suite behind its paid door.
    ...partition(style, 'x', 2.5, -15, 15, [doorway(-11, 3), doorway(-1, 3), { centre: 10, width: 2.2, height: DOOR_HEIGHT }]),
    ...partition(style, 'z', -6, 2.5, 10),
    ...partition(style, 'z', 3, 2.5, 10),

    // Waiting area.
    furniture(-12.5, -8.8, 3, 0.8, 0.9, LEATHER, 'seating', 'south'),
    // Boardroom: a long table down the middle.
    furniture(-2.5, -6.2, 6, 0.8, 1.6, WOOD, 'desk', 'south'),
    furniture(-6.8, -9.2, 0.9, 1.9, 1.4, BOOKS, 'cabinet', 'east'),
    // Office A.
    furniture(10, -7.5, 2.4, 0.8, 1.2, WOOD, 'desk', 'south'),
    furniture(14.4, -5.5, 0.6, 2, 3, BOOKS, 'shelf', 'west'),
    // Reception.
    furniture(-11, 6.8, 3.4, 1.05, 0.9, '#4c3c30', 'counter', 'north'),
    furniture(-14, 4, 0.9, 0.8, 2.2, LEATHER, 'seating', 'east'),
    // Office B.
    furniture(-1.5, 7.2, 2.2, 0.8, 1.1, WOOD, 'desk', 'north'),
    furniture(-4.7, 5.5, 0.6, 2, 2.4, BOOKS, 'shelf', 'east'),
    // The chief executive's suite, with the keycard on the desk.
    furniture(11, 7.2, 2.6, 0.8, 1.3, WOOD, 'desk', 'north'),
    furniture(14.4, 5.4, 0.6, 2, 3, BOOKS, 'shelf', 'west'),
    furniture(5.2, 8, 1.8, 0.8, 0.9, LEATHER, 'seating', 'east'),
  ],
  ladders: [],
  lights,
  doors,
  gate: null,
  elevator,
  stations,
  locks,
  signs: [
    { text: 'FLOOR 27', sub: 'EXECUTIVE SUITES', background: '#4a3228', position: { x: -9.7, y: 2.9, z: 9.96 }, rotation: Math.PI, width: 2.8, height: 0.8 },
    { text: 'BOARDROOM', sub: 'IN SESSION', background: '#4a3228', position: { x: -1, y: 2.9, z: -2.34 }, rotation: Math.PI, width: 2.0, height: 0.5 },
    { text: 'CHIEF EXECUTIVE', sub: 'BY APPOINTMENT ONLY', background: '#2c3a4d', position: { x: 13, y: 2.9, z: 2.84 }, rotation: 0, width: 2.4, height: 0.5 },
    { text: 'FREIGHT LIFT', sub: 'SECURITY KEYCARD REQUIRED', background: '#5b1b1b', position: { x: -14.96, y: 3.0, z: 3.4 }, rotation: Math.PI / 2, width: 2.4, height: 0.5 },
  ],
  // The chief executive's keycard, on the desk in the suite behind the second paid door.
  objective: { kind: 'keycard', label: 'Executive keycard', part: 'Freight lift override', position: { x: 11, y: 0.95, z: 7.2 } },
  navBounds: { minX: -20, maxX: 20, minZ: -15, maxZ: 15 },
  ramp: null,
  barricadeBars: [
    { x: -3, y: 0, z: 1 },
    { x: 6, y: 0, z: -1 },
  ],
  streetSpawns: [],
  playerSpawns: [{ x: -12, y: 0, z: 0 }],
  spawnYaw: -Math.PI / 2,
  streetLamps: [],
  checkpoint: { x: -12, y: 0, z: 0 },
};
