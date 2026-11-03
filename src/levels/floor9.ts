import type { Elevator, Level, LevelLight, Lock, Station } from './types';
import { DOOR_HEIGHT, doorway, entry, furniture, partition, shell, stationBoxes, type WardStyle } from './wardKit';

// Floor 9 of the hospital tower: surgery. Two operating theatres, a scrub room and a recovery
// bay either side of a long sterile corridor, in surgical green.
//
//   z -12 +----------+--------+----------+
//         | THEATRE 1| CORR-  | THEATRE 2|
//         | (lock A) | IDOR   | (lock B) |
//   z   3 +---  -----+        +-----  ---+
//         | SCRUB    |        | RECOVERY |
//   z  12 +----------+--------+----------+
//        x -12      -3        3          12

const style: WardStyle = { wall: '#a9cdbb', floor: '#6f9a88', ceiling: '#f0f4f0' };
const TABLE = '#aab6bb';
const BED = '#b8c8d0';
const CABINET = '#7f9a8c';

const doors = [entry(0, -12.25, 0, 1), entry(-12.25, 7, 1, 0), entry(12.25, 7, -1, 0), entry(6, 12.25, 0, -1)];

// Arriving from the south, into the scrub room.
const elevator: Elevator = { position: { x: -8, y: 0, z: 12.25 }, normal: { x: 0, z: -1 }, width: 2.2, height: DOOR_HEIGHT, cabDepth: 3, cabWidth: 3 };

const locks: Lock[] = [
  { position: { x: -7.5, y: 0, z: 3 }, normal: { x: 0, z: 1 }, width: 2.2, height: DOOR_HEIGHT, cost: 250, label: 'Operating theatre 1' },
  { position: { x: 7.5, y: 0, z: 3 }, normal: { x: 0, z: 1 }, width: 2.2, height: DOOR_HEIGHT, cost: 500, label: 'Operating theatre 2' },
];

const stations: Station[] = [
  { kind: 'ammo', position: { x: -11.95, y: 1.25, z: 10.5 }, normal: { x: 1, z: 0 } },
  { kind: 'shotgun', position: { x: -7.5, y: 1.25, z: -11.95 }, normal: { x: 0, z: 1 } },
];

const lights: LevelLight[] = [
  { position: { x: -7, y: 3.15, z: 8 }, color: '#cfeee0', intensity: 24, ceiling: true },
  { position: { x: -7.5, y: 3.15, z: -4 }, color: '#e8fff4', intensity: 36, ceiling: true },
  { position: { x: -7.5, y: 3.15, z: -9 }, color: '#e8fff4', intensity: 28, ceiling: true },
  { position: { x: 7.5, y: 3.15, z: -4 }, color: '#e8fff4', intensity: 36, flicker: true, ceiling: true },
  { position: { x: 7.5, y: 3.15, z: -9 }, color: '#e8fff4', intensity: 28, ceiling: true },
  { position: { x: 0, y: 3.15, z: -8 }, color: '#e0f0ff', intensity: 26, ceiling: true },
  { position: { x: 0, y: 3.15, z: 0 }, color: '#e0f0ff', intensity: 28, flicker: true, ceiling: true },
  { position: { x: 0, y: 3.15, z: 8 }, color: '#e0f0ff', intensity: 26, ceiling: true },
  { position: { x: 7.5, y: 3.15, z: 7.5 }, color: '#d8e8ff', intensity: 24, ceiling: true },
];

export const floor9: Level = {
  name: 'Floor 9',
  theme: 'ward',
  boxes: [
    ...stationBoxes(stations),
    ...shell(style, 12, 12, [...doors, elevator]),

    // The sterile corridor runs the length of the floor; the scrub and recovery rooms open off it.
    ...partition(style, 'z', -3, -12, 12, [doorway(7, 3)]),
    ...partition(style, 'z', 3, -12, 12, [doorway(7, 3)]),
    // The theatres are only reached through their locked doors.
    ...partition(style, 'x', 3, -12, -3, [{ centre: -7.5, width: 2.2, height: DOOR_HEIGHT }]),
    ...partition(style, 'x', 3, 3, 12, [{ centre: 7.5, width: 2.2, height: DOOR_HEIGHT }]),

    // Scrub room.
    furniture(-11.4, 4.6, 1, 2, 2.2, CABINET, 'lockers', 'east'),
    furniture(-6, 5.5, 3.5, 0.5, 0.7, '#6d7f78', 'bench', 'south'),
    // Theatre 1: the table under the lamp, and trolleys.
    furniture(-7.5, -4, 2.6, 0.95, 1, TABLE, 'operating', 'east'),
    furniture(-10.6, -8, 1, 0.9, 1.4, TABLE, 'instruments', 'east'),
    furniture(-4.2, -9.5, 1, 1.9, 2.5, CABINET, 'supply', 'west'),
    // Theatre 2, with the keycard on the surgeon's desk.
    furniture(7.5, -5, 2.6, 0.95, 1, TABLE, 'operating', 'west'),
    furniture(11.3, -8, 1, 1.9, 3, CABINET, 'supply', 'west'),
    furniture(9.5, -10.5, 2, 0.8, 1, '#7d5a3c', 'desk', 'south'),
    // Corridor.
    furniture(0.8, -3, 0.9, 0.7, 2.1, '#8a9ba3', 'gurney', 'south'),
    furniture(-1.2, 5.5, 0.9, 0.7, 2.1, '#8a9ba3', 'gurney', 'north'),
    // Recovery bay, with the charger against its west wall.
    { position: { x: 3.45, y: 0.8, z: 10.4 }, size: { x: 0.6, y: 1.6, z: 1.3 }, color: '#3a4a44', surface: 'step' },
    furniture(4.9, 4.6, 2.1, 0.6, 1, BED, 'bed', 'east'),
    furniture(10.6, 4.6, 2.1, 0.6, 1, BED, 'bed', 'west'),
    furniture(10.6, 10.4, 2.1, 0.6, 1, BED, 'bed', 'west'),
  ],
  ladders: [],
  lights,
  doors,
  gate: null,
  elevator,
  stations,
  locks,
  signs: [
    { text: 'THEATRE 1', sub: 'STERILE  /  NO ENTRY', background: '#1b5b4d', position: { x: -10.6, y: 2.9, z: 3.16 }, rotation: 0, width: 2.0, height: 0.6 },
    { text: 'THEATRE 2', sub: 'STERILE  /  NO ENTRY', background: '#1b5b4d', position: { x: 10.6, y: 2.9, z: 3.16 }, rotation: 0, width: 2.2, height: 0.6 },
    { text: 'SCRUB', sub: 'WASH BEFORE ENTRY', background: '#1d3f73', position: { x: -2.84, y: 2.9, z: 10.6 }, rotation: Math.PI / 2, width: 1.8, height: 0.6 },
    { text: 'RECOVERY', sub: 'QUIET PLEASE', background: '#1d3f73', position: { x: 2.84, y: 2.9, z: 10.6 }, rotation: -Math.PI / 2, width: 1.8, height: 0.6 },
    { text: 'SURGERY', sub: 'FLOOR 9', background: '#1b5b4d', position: { x: 0, y: 3.0, z: -11.96 }, rotation: 0, width: 2.6, height: 0.8 },
    { text: 'ELEVATOR', sub: 'ON BATTERY  /  CHARGE IN RECOVERY', background: '#5b1b1b', position: { x: -4.6, y: 3.0, z: 11.96 }, rotation: Math.PI, width: 2.4, height: 0.5 },
  ],
  // Once the waves are done, start the charger in recovery and keep someone in the room until the
  // battery is full. The recovery bay has two outside doors of its own, so it is a hard room to hold.
  objective: {
    kind: 'charge',
    label: 'Helipad battery',
    part: 'Helipad battery',
    device: { position: { x: 3.15, y: 0, z: 10.4 }, normal: { x: 1, z: 0 } },
    room: { minX: 3.15, maxX: 12, minZ: 3.15, maxZ: 12 },
    roomName: 'Recovery',
    seconds: 60,
  },
  navBounds: { minX: -17, maxX: 17, minZ: -17, maxZ: 17 },
  ramp: null,
  barricadeBars: [
    { x: -1, y: 0, z: -6 },
    { x: 8, y: 0, z: 8 },
  ],
  streetSpawns: [],
  playerSpawns: [{ x: -8, y: 0, z: 9 }],
  spawnYaw: 0,
  streetLamps: [],
  checkpoint: { x: -8, y: 0, z: 9 },
};
