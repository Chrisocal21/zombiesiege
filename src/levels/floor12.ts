import type { Elevator, Level, LevelLight, Lock, Station } from './types';
import { DOOR_HEIGHT, entry, furniture, partition, shell, stationBoxes, type WardStyle } from './wardKit';

// Floor 12 of the hospital tower: intensive care. One wide open ward with a nurses' station in
// the middle, curtained bays along the north wall and an isolation room at each end. Warm, dim
// and quiet, in beige.
//
//   z -11 +--elev--+--+--+--+--+--+--+
//         | BAYS (curtains)           |
//   z   1 +-------+----------+-------+
//         | ISO A | NURSES   | ISO B |
//         |(lock) | STATION  | (lock)|
//   z  11 +-------+----------+-------+
//        x -15   -9          9      15

const style: WardStyle = { wall: '#d6cbb8', floor: '#a89a86', ceiling: '#ece6da' };
const COUNTER = '#6e5a46';
const BED = '#c9d0d4';
const CURTAIN = '#8fa6a8';

const doors = [entry(15.25, -5, -1, 0), entry(-15.25, -5, 1, 0), entry(-2, 11.25, 0, -1), entry(4, 11.25, 0, -1)];

// Arriving at the north wall, in front of the bays.
const elevator: Elevator = { position: { x: -9, y: 0, z: -11.25 }, normal: { x: 0, z: 1 }, width: 2.2, height: DOOR_HEIGHT, cabDepth: 3, cabWidth: 3 };

const locks: Lock[] = [
  { position: { x: -12, y: 0, z: 1 }, normal: { x: 0, z: -1 }, width: 2.2, height: DOOR_HEIGHT, cost: 250, label: 'Isolation room A' },
  { position: { x: 12, y: 0, z: 1 }, normal: { x: 0, z: -1 }, width: 2.2, height: DOOR_HEIGHT, cost: 500, label: 'Isolation room B' },
];

const stations: Station[] = [
  { kind: 'ammo', position: { x: -12.9, y: 1.25, z: -10.95 }, normal: { x: 0, z: 1 } },
  { kind: 'shotgun', position: { x: -14.95, y: 1.25, z: 6 }, normal: { x: 1, z: 0 } },
];

const lights: LevelLight[] = [
  { position: { x: -9, y: 3.15, z: -7 }, color: '#ffd9b0', intensity: 18, ceiling: true },
  { position: { x: -2, y: 3.15, z: -7 }, color: '#ffd9b0', intensity: 18, flicker: true, ceiling: true },
  { position: { x: 6, y: 3.15, z: -7 }, color: '#ffd9b0', intensity: 18, ceiling: true },
  { position: { x: 13, y: 3.15, z: -7 }, color: '#ffd9b0', intensity: 16, ceiling: true },
  { position: { x: -12, y: 3.15, z: -1 }, color: '#ffe9c8', intensity: 18, ceiling: true },
  { position: { x: 12, y: 3.15, z: -1 }, color: '#ffe9c8', intensity: 18, ceiling: true },
  { position: { x: 0, y: 3.15, z: 4.25 }, color: '#ffe9c8', intensity: 22, ceiling: true },
  { position: { x: -5, y: 3.15, z: 9 }, color: '#ffd9b0', intensity: 16, flicker: true, ceiling: true },
  { position: { x: 7, y: 3.15, z: 9 }, color: '#ffd9b0', intensity: 16, ceiling: true },
  { position: { x: -12, y: 3.15, z: 6 }, color: '#7fb0ff', intensity: 14, flicker: true, ceiling: true },
  { position: { x: 12, y: 3.15, z: 6 }, color: '#7fb0ff', intensity: 14, ceiling: true },
];

export const floor12: Level = {
  name: 'Floor 12',
  theme: 'ward',
  boxes: [
    ...stationBoxes(stations),
    ...shell(style, 15, 11, [...doors, elevator]),

    // The isolation rooms at either end, each shut behind a paid door.
    ...partition(style, 'x', 1, -15, -9, [{ centre: -12, width: 2.2, height: DOOR_HEIGHT }]),
    ...partition(style, 'z', -9, 1, 11),
    ...partition(style, 'x', 1, 9, 15, [{ centre: 12, width: 2.2, height: DOOR_HEIGHT }]),
    ...partition(style, 'z', 9, 1, 11),

    // Curtained bays along the north wall, each with a bed.
    ...[-4, 0, 4, 8, 12].map((x) => furniture(x, -9.5, 0.12, 2, 3, CURTAIN)),
    ...[-2, 2, 6, 10, 13.5].map((x) => furniture(x, -9.6, 1, 0.6, 2, BED)),
    // The nurses' station in the middle of the ward, open on its east side.
    furniture(0, 1.75, 8, 1.05, 0.9, COUNTER),
    furniture(0, 6.75, 8, 1.05, 0.9, COUNTER),
    furniture(-4, 4.25, 0.9, 1.05, 5.4, COUNTER),
    // Isolation A.
    furniture(-12, 7.5, 1, 0.6, 2.2, BED),
    furniture(-10.2, 9.8, 0.8, 1.2, 0.8, '#5d646b'),
    // Isolation B, with the key on the doctor's desk.
    furniture(13.8, 4.5, 1, 0.6, 2.2, BED),
    furniture(11, 8.5, 2, 0.8, 1, '#7d5a3c'),
    // Trolleys left in the ward.
    furniture(-6.5, -2, 0.9, 0.7, 2.1, '#8a9ba3'),
    furniture(7, -2.5, 0.9, 0.7, 2.1, '#8a9ba3'),
  ],
  ladders: [],
  lights,
  doors,
  gate: null,
  elevator,
  stations,
  locks,
  signs: [
    { text: 'INTENSIVE CARE', sub: 'FLOOR 12  /  QUIET', background: '#5b3a1b', position: { x: -7.8, y: 2.9, z: 10.95 }, rotation: Math.PI, width: 2.6, height: 0.8 },
    { text: 'ISOLATION A', sub: 'INFECTION CONTROL', background: '#6b1b1b', position: { x: -9.9, y: 2.9, z: 0.84 }, rotation: Math.PI, width: 1.4, height: 0.5 },
    { text: 'ISOLATION B', sub: 'INFECTION CONTROL', background: '#6b1b1b', position: { x: 9.9, y: 2.9, z: 0.84 }, rotation: Math.PI, width: 1.4, height: 0.5 },
    { text: 'BAYS 1 TO 5', sub: 'ONE VISITOR AT A TIME', background: '#1d3f73', position: { x: 6, y: 3.0, z: -10.96 }, rotation: 0, width: 2.2, height: 0.6 },
    { text: 'ELEVATOR', sub: 'OUT OF SERVICE  /  KEYCARD OVERRIDE', background: '#5b1b1b', position: { x: -5.5, y: 3.0, z: -10.96 }, rotation: 0, width: 2.4, height: 0.5 },
  ],
  objective: { kind: 'keycard', label: 'Roof access key', position: { x: 11, y: 0.95, z: 8.5 } },
  navBounds: { minX: -20, maxX: 20, minZ: -16, maxZ: 16 },
  ramp: null,
  barricadeBars: [
    { x: -5, y: 0, z: -4 },
    { x: 8, y: 0, z: -1 },
  ],
  streetSpawns: [],
  playerSpawns: [{ x: -9, y: 0, z: -8 }],
  spawnYaw: Math.PI,
  streetLamps: [],
  checkpoint: { x: -9, y: 0, z: -8 },
};
