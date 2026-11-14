import type { Elevator, Level, LevelLight, Station } from './types';
import { DOOR_HEIGHT, doorway, entry, furniture, partition, shell, stationBoxes, type WardStyle } from './wardKit';

// Act 2, second floor down: the records floor, floor 34. Tall shelving makes aisles to fight
// through, and the standby generator is in a room in the south-east corner. Start it and hold the
// room while it fills, and the freight lift has power for the next drop.
//
//   z -11 +--lift---------------------------+
//         |  SHELVING AISLES                 |
//   z   3 +--------------------+--+----------+
//         |   DESKS / LOBBY    |  GENERATOR  |
//   z  11 +--------------------+--+----------+
//        x -14                  6           14

const style: WardStyle = { wall: '#aeb2a6', floor: '#464a44', ceiling: '#cfd1c8' };
const SHELF = '#5f6a63';
const DESK = '#7e8186';
const CABINET = '#575d63';

const doors = [entry(14.25, -6, -1, 0), entry(14.25, 6, -1, 0), entry(-14.25, 6, 1, 0), entry(-2, 11.25, 0, -1)];

const elevator: Elevator = { position: { x: -10, y: 0, z: -11.25 }, normal: { x: 0, z: 1 }, width: 2.2, height: DOOR_HEIGHT, cabDepth: 3, cabWidth: 3 };

const stations: Station[] = [
  { kind: 'ammo', position: { x: 0, y: 1.25, z: -10.95 }, normal: { x: 0, z: 1 } },
  { kind: 'shotgun', position: { x: -13.95, y: 1.25, z: -2 }, normal: { x: 1, z: 0 } },
];

const lights: LevelLight[] = [
  { position: { x: -10, y: 3.15, z: -7 }, color: '#ffe9c8', intensity: 18, ceiling: true },
  { position: { x: -3, y: 3.15, z: -7 }, color: '#ffe9c8', intensity: 16, flicker: true, ceiling: true },
  { position: { x: 4, y: 3.15, z: -7 }, color: '#ffe9c8', intensity: 16, ceiling: true },
  { position: { x: 11, y: 3.15, z: -7 }, color: '#ffe9c8', intensity: 14, flicker: true, ceiling: true },
  { position: { x: -8, y: 3.15, z: -1 }, color: '#e6efff', intensity: 16, ceiling: true },
  { position: { x: 0, y: 3.15, z: -1 }, color: '#e6efff', intensity: 16, ceiling: true },
  { position: { x: -9, y: 3.15, z: 7 }, color: '#e6efff', intensity: 18, ceiling: true },
  { position: { x: -1, y: 3.15, z: 7 }, color: '#e6efff', intensity: 16, flicker: true, ceiling: true },
  { position: { x: 10, y: 3.15, z: 7 }, color: '#ffb070', intensity: 16, ceiling: true },
];

export const records34: Level = {
  name: 'Floor 34',
  theme: 'ward',
  boxes: [
    ...stationBoxes(stations),
    ...shell(style, 14, 11, [...doors, elevator]),

    // The generator room in the south-east corner, open to the floor through two wide doorways.
    ...partition(style, 'x', 3, 6, 14, [doorway(10, 3.4)]),
    ...partition(style, 'z', 6, 3, 11, [doorway(8, 3.0)]),
    furniture(12.4, 9.2, 2.4, 1.3, 1.2, '#7a5f2e', 'hvac', 'north'),
    furniture(8.4, 4.4, 1.6, 0.8, 0.8, CABINET, 'cabinet', 'south'),

    // Shelving aisles in the north half, in two blocks with a cross-aisle between them.
    ...[-7, -4, 4, 7].flatMap((x) => [-8.4, -3.2].map((z) => furniture(x, z, 0.7, 2.1, 4.4, SHELF, 'shelf', 'east'))),
    // Desks and a counter in the south-west lobby.
    ...[-10, -4].flatMap((x) => [5.5, 9].map((z) => furniture(x, z, 2, 0.8, 1, DESK, 'desk', 'south'))),
    furniture(-12.6, 1.6, 0.9, 1.05, 2.6, '#4c5a66', 'counter', 'east'),
    furniture(1.5, 4.5, 1.8, 0.7, 0.8, '#8a9ba3', 'cart', 'north'),
  ],
  ladders: [],
  lights,
  doors,
  gate: null,
  elevator,
  stations,
  locks: [],
  signs: [
    { text: 'FLOOR 34', sub: 'RECORDS AND ARCHIVE', background: '#2c3a4d', position: { x: -6.8, y: 2.9, z: -10.96 }, rotation: 0, width: 2.6, height: 0.8 },
    { text: 'STANDBY GENERATOR', sub: 'STAFF ONLY', background: '#6b4a12', position: { x: 10, y: 2.9, z: 3.16 }, rotation: 0, width: 2.4, height: 0.5 },
    { text: 'FREIGHT LIFT', sub: 'GENERATOR POWER ONLY', background: '#5b1b1b', position: { x: -12.6, y: 3.0, z: -10.96 }, rotation: 0, width: 2.4, height: 0.5 },
  ],
  objective: {
    kind: 'charge',
    label: 'Generator',
    part: 'Backup power',
    device: { position: { x: 10, y: 0, z: 10.95 }, normal: { x: 0, z: -1 } },
    room: { minX: 6.2, maxX: 14, minZ: 3.2, maxZ: 11 },
    roomName: 'Generator room',
    seconds: 45,
  },
  atmosphere: { fog: '#07080a', fogNear: 8, fogFar: 45, ambient: 1 },
  navBounds: { minX: -19, maxX: 19, minZ: -16, maxZ: 16 },
  ramp: null,
  barricadeBars: [
    { x: -2, y: 0, z: 2 },
    { x: 5, y: 0, z: -1 },
  ],
  streetSpawns: [],
  playerSpawns: [{ x: -10, y: 0, z: -8 }],
  spawnYaw: Math.PI,
  streetLamps: [],
  checkpoint: { x: -10, y: 0, z: -8 },
};
