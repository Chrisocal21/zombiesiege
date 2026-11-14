import type { Elevator, Level, LevelLight, Lock, Station } from './types';
import { DOOR_HEIGHT, entry, furniture, partition, shell, stationBoxes, type WardStyle } from './wardKit';

// Act 2, fourth floor down: the server floor, floor 20. Rows of racks make long, narrow aisles in
// the dark, lit only by blinking status lamps and the red emergency strips. Three breakers
// bring the floor back: one on the west wall, one on the south wall, and one in the UPS room
// behind a paid door in the north-east.
//
//   z -10 +--lift------------+------------------+
//         |   RACK ROWS      |  UPS ROOM (lock) |
//   z  -4 +------------------+---  -------------+
//         |       CROSS AISLE                    >
//   z   2 +   RACK ROWS                          |
//   z  10 +--------------------------------------+
//        x -16               10                16

const style: WardStyle = { wall: '#9ea6ad', floor: '#2f353b', ceiling: '#c8ccd0' };
const RACK = '#3a4047';
const STATUS = '#2b5d7a';

const doors = [entry(16.25, 2, -1, 0), entry(16.25, 7, -1, 0), entry(-16.25, 4, 1, 0), entry(4, 10.25, 0, -1)];

const elevator: Elevator = { position: { x: -12, y: 0, z: -10.25 }, normal: { x: 0, z: 1 }, width: 2.2, height: DOOR_HEIGHT, cabDepth: 3, cabWidth: 3 };

const locks: Lock[] = [{ position: { x: 13, y: 0, z: -4 }, normal: { x: 0, z: 1 }, width: 2.2, height: DOOR_HEIGHT, cost: 500, label: 'UPS room' }];

const stations: Station[] = [
  { kind: 'ammo', position: { x: -6, y: 1.25, z: -9.95 }, normal: { x: 0, z: 1 } },
  { kind: 'shotgun', weapon: 'ak', position: { x: -12, y: 1.25, z: 9.95 }, normal: { x: 0, z: -1 } },
];

// Circuit 0 is the lift end and the west racks, 1 the middle aisles, 2 the east end and the UPS room.
const lights: LevelLight[] = [
  { position: { x: -12, y: 3.15, z: -6 }, color: '#cfe4ff', intensity: 20, ceiling: true, circuit: 0 },
  { position: { x: -12, y: 3.15, z: 4 }, color: '#cfe4ff', intensity: 18, flicker: true, ceiling: true, circuit: 0 },
  { position: { x: -6, y: 3.15, z: -1 }, color: '#cfe4ff', intensity: 20, ceiling: true, circuit: 0 },
  { position: { x: 0, y: 3.15, z: -1 }, color: '#bcd6f5', intensity: 22, ceiling: true, circuit: 1 },
  { position: { x: 0, y: 3.15, z: 7 }, color: '#bcd6f5', intensity: 18, flicker: true, ceiling: true, circuit: 1 },
  { position: { x: 0, y: 3.15, z: -7.5 }, color: '#bcd6f5', intensity: 18, ceiling: true, circuit: 1 },
  { position: { x: 8, y: 3.15, z: -1 }, color: '#bcd6f5', intensity: 20, ceiling: true, circuit: 2 },
  { position: { x: 13, y: 3.15, z: -7 }, color: '#cfe4ff', intensity: 18, flicker: true, ceiling: true, circuit: 2 },
  { position: { x: 12, y: 3.15, z: 5 }, color: '#cfe4ff', intensity: 18, ceiling: true, circuit: 2 },
  ...([
    [-15.8, -3], [-4, 9.8], [-6, -7], [6, 1.5], [15.8, 5], [9.5, -9.8], [-9.5, 3],
  ] as const).map(([x, z]): LevelLight => ({ position: { x, y: 2.75, z }, color: '#ff2a1a', intensity: 3.5, emergency: true })),
];

export const servers20: Level = {
  name: 'Floor 20',
  theme: 'ward',
  boxes: [
    ...stationBoxes(stations),
    ...shell(style, 16, 10, [...doors, elevator]),

    // The UPS room in the north-east, shut behind its paid door.
    ...partition(style, 'x', -4, 10, 16, [{ centre: 13, width: 2.2, height: DOOR_HEIGHT }]),
    ...partition(style, 'z', 10, -10, -4),

    // Rows of racks: north of the cross aisle and south of it, each row a run with gaps to cut through.
    ...[-7, -3, 1, 5].flatMap((x) => [-6.5].map((z) => furniture(x, z, 0.9, 2.1, 4.4, RACK, 'cabinet', 'east'))),
    ...[-7, -3, 1, 5].flatMap((x) => [6].map((z) => furniture(x, z, 0.9, 2.1, 4.4, RACK, 'cabinet', 'east'))),
    // A cooling unit by the east wall and a console desk at the lift end.
    furniture(13.2, 9, 3, 1.4, 1.2, STATUS, 'hvac', 'north'),
    furniture(-13.5, 7.5, 2, 0.8, 1, '#7e8186', 'desk', 'north'),
    // UPS room: battery cabinets along its walls.
    furniture(14.8, -8.5, 0.9, 1.6, 2, RACK, 'cabinet', 'west'),
    furniture(11.5, -8.8, 2.2, 1.6, 0.9, RACK, 'cabinet', 'south'),
  ],
  ladders: [],
  lights,
  doors,
  gate: null,
  elevator,
  stations,
  locks,
  signs: [
    { text: 'FLOOR 20', sub: 'SERVER FLOOR', background: '#1d3f73', position: { x: -8.7, y: 2.9, z: 9.96 }, rotation: Math.PI, width: 2.6, height: 0.8 },
    { text: 'UPS ROOM', sub: 'BATTERY BANK  /  AUTHORISED ONLY', background: '#6b4a12', position: { x: 15.8, y: 2.9, z: -3.84 }, rotation: Math.PI, width: 2.2, height: 0.5 },
    { text: 'FREIGHT LIFT', sub: 'NO POWER  /  RESET THE BREAKERS', background: '#5b1b1b', position: { x: -9, y: 3.0, z: -9.96 }, rotation: 0, width: 2.4, height: 0.5 },
  ],
  objective: {
    kind: 'breakers',
    label: 'Breakers',
    part: 'Power to the freight lift',
    panels: [
      { position: { x: -15.95, y: 1.45, z: -2 }, normal: { x: 1, z: 0 } },
      { position: { x: -6, y: 1.45, z: 9.95 }, normal: { x: 0, z: -1 } },
      { position: { x: 15.95, y: 1.45, z: -5.5 }, normal: { x: -1, z: 0 } },
    ],
  },
  atmosphere: { fog: '#04060a', fogNear: 5, fogFar: 36, ambient: 1 },
  navBounds: { minX: -21, maxX: 21, minZ: -15, maxZ: 15 },
  ramp: null,
  barricadeBars: [
    { x: -9, y: 0, z: 0 },
    { x: 9, y: 0, z: 4 },
  ],
  streetSpawns: [],
  playerSpawns: [{ x: -12, y: 0, z: -7.5 }],
  spawnYaw: Math.PI,
  streetLamps: [],
  checkpoint: { x: -12, y: 0, z: -7.5 },
};
