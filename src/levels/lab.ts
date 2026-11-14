import type { Elevator, Level, LevelLight, Lock, Station } from './types';
import { DOOR_HEIGHT, doorway, entry, furniture, partition, shell, stationBoxes, type WardStyle } from './wardKit';

// Act 3, the third floor: the hidden lab behind the pharmacy. The power is out. A ring corridor
// runs round a central laboratory, so there is always a way round a fight, with cold storage
// in the north-east behind a paid door. One breaker is in each of the corridor's long walls and
// the third is in cold storage.
//
//   z -11 +--------------------------+-----------+
//         |   RING CORRIDOR          | COLD STORE |
//         |   +--------------+       |  (lock)    |
//   LIFT  |   |  CENTRAL LAB |       |            |
//         |   +----  --------+       |            |
//   z  11 +--------------------------+------------+
//        x -15       -6     6          9          15

const style: WardStyle = { wall: '#b8c9d4', floor: '#6f8594', ceiling: '#e4edf2' };
const BENCH = '#8a959c';
const FRIDGE = '#aebcc6';

const doors = [entry(15.25, 0, -1, 0), entry(15.25, 7, -1, 0), entry(-8, -11.25, 0, 1), entry(8, 11.25, 0, -1)];

const elevator: Elevator = { position: { x: -15.25, y: 0, z: 0 }, normal: { x: 1, z: 0 }, width: 2.2, height: DOOR_HEIGHT, cabDepth: 3, cabWidth: 3 };

const locks: Lock[] = [{ position: { x: 12, y: 0, z: -5 }, normal: { x: 0, z: 1 }, width: 2.2, height: DOOR_HEIGHT, cost: 500, label: 'Cold storage' }];

const stations: Station[] = [
  { kind: 'ammo', position: { x: -14.95, y: 1.25, z: -7 }, normal: { x: 1, z: 0 } },
  { kind: 'shotgun', weapon: 'ak', position: { x: -14.95, y: 1.25, z: 7 }, normal: { x: 1, z: 0 } },
];

// Circuit 0 is the lift end and the north corridor, 1 the south corridor and the central lab,
// 2 the east end and cold storage.
const lights: LevelLight[] = [
  { position: { x: -11, y: 3.15, z: -7 }, color: '#e0f0ff', intensity: 22, ceiling: true, circuit: 0 },
  { position: { x: -2, y: 3.15, z: -8 }, color: '#e8f4ff', intensity: 24, flicker: true, ceiling: true, circuit: 0 },
  { position: { x: -11, y: 3.15, z: 4 }, color: '#e0f0ff', intensity: 20, ceiling: true, circuit: 0 },
  { position: { x: 0, y: 3.15, z: 0 }, color: '#c8ffe0', intensity: 26, ceiling: true, circuit: 1 },
  { position: { x: -3, y: 3.15, z: 8 }, color: '#e0f0ff', intensity: 22, flicker: true, ceiling: true, circuit: 1 },
  { position: { x: 4, y: 3.15, z: 8 }, color: '#e0f0ff', intensity: 22, ceiling: true, circuit: 1 },
  { position: { x: 7.5, y: 3.15, z: -2 }, color: '#e8f4ff', intensity: 20, ceiling: true, circuit: 2 },
  { position: { x: 12, y: 3.15, z: -8 }, color: '#a8d4ff', intensity: 22, flicker: true, ceiling: true, circuit: 2 },
  { position: { x: 12, y: 3.15, z: 4 }, color: '#e0f0ff', intensity: 20, ceiling: true, circuit: 2 },
  ...([
    [-14.8, 3], [-5, -10.8], [5, 10.8], [8.4, 2], [14.8, 9], [-9.2, 6],
  ] as const).map(([x, z]): LevelLight => ({ position: { x, y: 2.75, z }, color: '#ff2a1a', intensity: 3.5, emergency: true })),
];

export const lab: Level = {
  name: 'Hidden lab',
  theme: 'ward',
  boxes: [
    ...stationBoxes(stations),
    ...shell(style, 15, 11, [...doors, elevator]),

    // The central laboratory: a walled block with a doorway on its north and south sides.
    ...partition(style, 'x', -4, -6, 6, [doorway(0, 2.8)]),
    ...partition(style, 'x', 4, -6, 6, [doorway(0, 2.8)]),
    ...partition(style, 'z', -6, -4, 4),
    ...partition(style, 'z', 6, -4, 4),
    // Cold storage in the north-east, shut behind its paid door.
    ...partition(style, 'x', -5, 9, 15, [{ centre: 12, width: 2.2, height: DOOR_HEIGHT }]),
    ...partition(style, 'z', 9, -11, -5),

    // Inside the central lab.
    furniture(-3, 0, 1.2, 0.9, 4, BENCH, 'lab', 'east'),
    furniture(2, -1.2, 3, 0.9, 1, BENCH, 'lab', 'south'),
    furniture(3.6, 2.2, 1.4, 1.2, 1.4, '#7b8a96', 'analyser', 'west'),
    // The corridor: trolleys and a fridge, so it is never a clear run.
    furniture(-10, -9, 1.8, 0.7, 0.8, '#8a9ba3', 'cart', 'north'),
    furniture(3, 9.3, 1.2, 1.9, 1.2, FRIDGE, 'fridge', 'north'),
    furniture(-9.4, 8.6, 1.8, 0.7, 0.8, '#8a9ba3', 'cart', 'south'),
    // Cold storage: racks of sample fridges.
    furniture(14.4, -8, 1.2, 2, 3, FRIDGE, 'fridge', 'west'),
    furniture(11, -9.2, 3, 2, 1.2, FRIDGE, 'fridge', 'south'),
  ],
  ladders: [],
  lights,
  doors,
  gate: null,
  elevator,
  stations,
  locks,
  signs: [
    { text: 'LABORATORY', sub: 'BIOSAFETY LEVEL 3', background: '#6b4a12', position: { x: -9.5, y: 2.9, z: 10.96 }, rotation: Math.PI, width: 2.6, height: 0.8 },
    { text: 'COLD STORAGE', sub: 'SAMPLES  /  -80C', background: '#1d3f73', position: { x: 14.4, y: 2.9, z: -4.84 }, rotation: Math.PI, width: 2.0, height: 0.6 },
    { text: 'LIFT', sub: 'NO POWER  /  RESET THE BREAKERS', background: '#5b1b1b', position: { x: -14.96, y: 3.0, z: 3.4 }, rotation: Math.PI / 2, width: 2.4, height: 0.5 },
  ],
  objective: {
    kind: 'breakers',
    label: 'Breakers',
    part: 'Power to the vault lift',
    panels: [
      { position: { x: -1.5, y: 1.45, z: -10.95 }, normal: { x: 0, z: 1 } },
      { position: { x: -1, y: 1.45, z: 10.95 }, normal: { x: 0, z: -1 } },
      { position: { x: 14.95, y: 1.45, z: -10.4 }, normal: { x: -1, z: 0 } },
    ],
  },
  atmosphere: { fog: '#05070a', fogNear: 6, fogFar: 38, ambient: 1 },
  navBounds: { minX: -20, maxX: 20, minZ: -16, maxZ: 16 },
  ramp: null,
  barricadeBars: [
    { x: -9, y: 0, z: -2 },
    { x: 11, y: 0, z: 3 },
  ],
  streetSpawns: [],
  playerSpawns: [{ x: -12, y: 0, z: 0 }],
  spawnYaw: -Math.PI / 2,
  streetLamps: [],
  checkpoint: { x: -12, y: 0, z: 0 },
};
