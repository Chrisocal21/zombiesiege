import type { Elevator, Level, LevelLight, Lock, Station } from './types';
import { DOOR_HEIGHT, doorway, entry, furniture, partition, shell, stationBoxes, type WardStyle } from './wardKit';

// Floor 6 of the hospital tower: the pharmacy and laboratories. A long, narrow floor split by a
// central corridor, with cold blue-white walls and steel benches.
//
//   z -9  +-------------+------------+--------------+
//         | PHARMACY    | LAB 1      | COLD STORE   |
//         | (lock A)    |            | (lock B)     |
//   z -2.5+------+------+-----  -----+------  ------+
//         LOBBY  |           CORRIDOR
//   z 2.5 +------+---------+------------------------+
//         |      | LAB 2   | DISPENSARY             |
//   z  9  +------+---------+------------------------+
//        x -16  -10        2                        16

const style: WardStyle = { wall: '#c9d6e0', floor: '#8497a6', ceiling: '#eef2f6' };
const BENCH = '#8a959c';
const SHELF = '#5f7a8c';
const FRIDGE = '#aebcc6';
const DESK = '#7d5a3c';

const doors = [entry(-5, 9.25, 0, -1), entry(10, 9.25, 0, -1), entry(16.25, 5, -1, 0), entry(2, -9.25, 0, 1)];

const elevator: Elevator = { position: { x: -16.25, y: 0, z: 0 }, normal: { x: 1, z: 0 }, width: 2.2, height: DOOR_HEIGHT, cabDepth: 3, cabWidth: 3 };

const locks: Lock[] = [
  { position: { x: -5.5, y: 0, z: -2.5 }, normal: { x: 0, z: 1 }, width: 2.2, height: DOOR_HEIGHT, cost: 250, label: 'Pharmacy' },
  { position: { x: 11.5, y: 0, z: -2.5 }, normal: { x: 0, z: 1 }, width: 2.2, height: DOOR_HEIGHT, cost: 500, label: 'Cold storage' },
];

const stations: Station[] = [
  { kind: 'ammo', position: { x: -15.95, y: 1.25, z: 6 }, normal: { x: 1, z: 0 } },
  { kind: 'shotgun', position: { x: -5.5, y: 1.25, z: -8.95 }, normal: { x: 0, z: 1 } },
];

const lights: LevelLight[] = [
  { position: { x: -13, y: 3.15, z: 4 }, color: '#dff0ff', intensity: 22, ceiling: true },
  { position: { x: -13, y: 3.15, z: -5 }, color: '#dff0ff', intensity: 22, flicker: true, ceiling: true },
  { position: { x: -5, y: 3.15, z: 0 }, color: '#e8f4ff', intensity: 26, ceiling: true },
  { position: { x: 2, y: 3.15, z: 0 }, color: '#e8f4ff', intensity: 28, flicker: true, ceiling: true },
  { position: { x: 9, y: 3.15, z: 0 }, color: '#e8f4ff', intensity: 26, ceiling: true },
  { position: { x: 14, y: 3.15, z: 0 }, color: '#e8f4ff', intensity: 24, ceiling: true },
  { position: { x: -5.5, y: 3.15, z: -6 }, color: '#c8ffe0', intensity: 24, ceiling: true },
  { position: { x: 2, y: 3.15, z: -6 }, color: '#e0f0ff', intensity: 24, ceiling: true },
  { position: { x: 11.5, y: 3.15, z: -6 }, color: '#a8d4ff', intensity: 22, flicker: true, ceiling: true },
  { position: { x: -4, y: 3.15, z: 6 }, color: '#e0f0ff', intensity: 24, ceiling: true },
  { position: { x: 6, y: 3.15, z: 6 }, color: '#e0f0ff', intensity: 24, ceiling: true },
  { position: { x: 12, y: 3.15, z: 6 }, color: '#e0f0ff', intensity: 22, ceiling: true },
];

export const floor6: Level = {
  name: 'Floor 6',
  theme: 'ward',
  boxes: [
    ...stationBoxes(stations),
    ...shell(style, 16, 9, [...doors, elevator]),

    // The lobby is walled off from the corridor by one wide doorway.
    ...partition(style, 'z', -10, -9, 9, [doorway(0, 3.4)]),
    // North rooms: the pharmacy and cold store are bought into, the lab is open.
    ...partition(style, 'x', -2.5, -10, 16, [
      { centre: -5.5, width: 2.2, height: DOOR_HEIGHT },
      doorway(3),
      { centre: 11.5, width: 2.2, height: DOOR_HEIGHT },
    ]),
    ...partition(style, 'z', -1, -9, -2.5),
    ...partition(style, 'z', 7, -9, -2.5),
    // South rooms: both open.
    ...partition(style, 'x', 2.5, -10, 16, [doorway(-6), doorway(9)]),
    ...partition(style, 'z', 2, 2.5, 9),

    // Lobby.
    furniture(-12, 6.5, 0.9, 1.05, 4, '#4c5a66'),
    furniture(-14, -6, 2.2, 0.8, 0.9, '#3d5a52'),
    furniture(-11.2, -7.6, 0.9, 0.8, 2.2, '#3d5a52'),
    // Pharmacy: tall shelving at either end, the weapon wall between.
    furniture(-8.6, -6, 0.6, 2, 3.6, SHELF),
    furniture(-2.4, -6, 0.6, 2, 3.6, SHELF),
    // Lab 1.
    furniture(2.5, -5.5, 4, 0.9, 1, BENCH),
    furniture(5.8, -8, 1.2, 1.9, 1.2, FRIDGE),
    // Cold storage and the keycard on its table.
    furniture(15.4, -5.5, 1.2, 2, 4, FRIDGE),
    furniture(9, -7.5, 1.4, 1.2, 1.4, '#7b8a96'),
    furniture(13, -6.5, 2, 0.8, 1, DESK),
    // Corridor.
    furniture(5, 1.3, 1.8, 0.7, 0.8, '#8a9ba3'),
    // Lab 2 and the dispensary.
    furniture(-7, 6.2, 5, 0.9, 1, BENCH),
    furniture(8, 5.5, 0.9, 1.05, 4.5, '#4c5a66'),
    furniture(13, 4, 3, 0.8, 1, '#3d5a52'),
  ],
  ladders: [],
  lights,
  doors,
  gate: null,
  elevator,
  stations,
  locks,
  signs: [
    { text: 'PHARMACY', sub: 'AUTHORISED STAFF', background: '#1b5b4d', position: { x: -8.2, y: 2.9, z: -2.34 }, rotation: 0, width: 2.0, height: 0.6 },
    { text: 'LAB 1', sub: 'BIOHAZARD', background: '#6b4a12', position: { x: 5.6, y: 2.9, z: -2.34 }, rotation: 0, width: 1.4, height: 0.5 },
    { text: 'COLD STORAGE', sub: 'SAMPLES  /  -20C', background: '#1d3f73', position: { x: 14.2, y: 2.9, z: -2.34 }, rotation: 0, width: 2.0, height: 0.6 },
    { text: 'LAB 2', sub: 'PATHOLOGY', background: '#6b4a12', position: { x: -2.5, y: 2.9, z: 2.34 }, rotation: Math.PI, width: 1.6, height: 0.5 },
    { text: 'DISPENSARY', sub: 'COLLECT HERE', background: '#1b5b4d', position: { x: 13, y: 2.9, z: 2.34 }, rotation: Math.PI, width: 2.0, height: 0.6 },
    { text: 'FLOOR 6', sub: 'PHARMACY AND LABORATORIES', background: '#1d3f73', position: { x: -10.16, y: 2.8, z: -5 }, rotation: -Math.PI / 2, width: 3.0, height: 0.9 },
    { text: 'ELEVATOR', sub: 'OUT OF SERVICE  /  KEYCARD OVERRIDE', background: '#5b1b1b', position: { x: -15.96, y: 3.0, z: -3.5 }, rotation: Math.PI / 2, width: 2.4, height: 0.5 },
  ],
  objective: { kind: 'keycard', label: 'Lab keycard', position: { x: 13, y: 0.95, z: -6.5 } },
  navBounds: { minX: -21, maxX: 21, minZ: -14, maxZ: 14 },
  ramp: null,
  barricadeBars: [
    { x: -3, y: 0, z: 5 },
    { x: 11, y: 0, z: 5 },
  ],
  streetSpawns: [],
  playerSpawns: [{ x: -13, y: 0, z: 0 }],
  spawnYaw: -Math.PI / 2,
  streetLamps: [],
  checkpoint: { x: -13, y: 0, z: 0 },
};
