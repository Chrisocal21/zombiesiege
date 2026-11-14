import type { Elevator, Level, LevelLight, Lock, Resident, Station } from './types';
import { CREW, SCIENTIST } from './voices';
import { DOOR_HEIGHT, doorway, entry, furniture, partition, shell, stationBoxes, type WardStyle } from './wardKit';

// Act 3, the second floor: the street pharmacy. The tunnel's lift comes up into the stockroom at the
// back. Shelves of medicine, a long dispensing counter across the middle of the shop, and the
// street doors at the front pressed on by the crowd that came here for help. The manager's office is
// behind a paid door in the north-east, and the keycard for the lift down to the lab is on their desk.
// This is a sweep: there are no waves. The shop's own dead stand among the shelves, still, until they
// see or hear someone. Going in quietly, low and with a blade, gets the card without waking them; the
// first gunshot brings the crowd in off the street through the front doors, and every one after
// brings more.
//
//   z -9  +--lift----------------------------------+
//         | STOCK  | STORE | OFFICE (lock)         |
//   z -4  +--  ----+---  --+------  ---------------+
//         |   DISPENSING COUNTER (gap each end)     |
//         |   SHELVES AND DISPLAY                   |
//   z  9  +----<--------------------<---------------+
//        x -14   -3        5                       14

const style: WardStyle = { wall: '#dfe4e2', floor: '#9aa8a2', ceiling: '#f2f4f2' };
const SHELF = '#7fa393';
const COUNTER = '#4d6b62';
const DESK = '#7d5a3c';

const doors = [entry(-6, 9.25, 0, -1), entry(6, 9.25, 0, -1), entry(-14.25, 3, 1, 0), entry(14.25, 3, -1, 0)];

const elevator: Elevator = { position: { x: -9, y: 0, z: -9.25 }, normal: { x: 0, z: 1 }, width: 2.2, height: DOOR_HEIGHT, cabDepth: 3, cabWidth: 3 };

const locks: Lock[] = [{ position: { x: 10, y: 0, z: -4 }, normal: { x: 0, z: 1 }, width: 2.2, height: DOOR_HEIGHT, cost: 250, label: 'Manager office' }];

// The dead who came in for medicine and never left: in the store, behind the counter, down the aisles,
// at the front windows, and one shut in the manager's office.
const residents: Resident[] = [
  { x: 2.5, z: -6.4, yaw: Math.PI / 2 },
  { x: 3.8, z: -2.9, yaw: Math.PI },
  { x: 7.2, z: -2.7, yaw: 0.4 },
  { x: -6.3, z: 3.8, yaw: Math.PI },
  { x: 0.2, z: 5.6, kind: 'screamer', yaw: 0 },
  { x: 6.2, z: 2.8, yaw: -Math.PI / 2 },
  { x: -11.8, z: 3.2, yaw: Math.PI / 2 },
  { x: -3.5, z: 7.8, yaw: Math.PI },
  { x: 4.6, z: 7.9, yaw: Math.PI },
  { x: 11.8, z: 2.5, yaw: -Math.PI / 2 },
  { x: 6.6, z: -7.6, yaw: -Math.PI / 2 },
];

const stations: Station[] = [
  { kind: 'ammo', position: { x: -13.95, y: 1.25, z: -1 }, normal: { x: 1, z: 0 } },
  { kind: 'shotgun', position: { x: 13.95, y: 1.25, z: -1 }, normal: { x: -1, z: 0 } },
];

const lights: LevelLight[] = [
  { position: { x: -9, y: 3.15, z: -6.5 }, color: '#e8f4ee', intensity: 18, ceiling: true },
  { position: { x: 1, y: 3.15, z: -6.5 }, color: '#e8f4ee', intensity: 16, flicker: true, ceiling: true },
  { position: { x: 10, y: 3.15, z: -6.5 }, color: '#fff0d8', intensity: 18, ceiling: true },
  { position: { x: -9, y: 3.15, z: 1 }, color: '#e8f4ee', intensity: 20, ceiling: true },
  { position: { x: 0, y: 3.15, z: 1 }, color: '#e8f4ee', intensity: 22, flicker: true, ceiling: true },
  { position: { x: 9, y: 3.15, z: 1 }, color: '#e8f4ee', intensity: 20, ceiling: true },
  { position: { x: -6, y: 3.15, z: 6.5 }, color: '#c8ffe0', intensity: 18, ceiling: true },
  { position: { x: 6, y: 3.15, z: 6.5 }, color: '#c8ffe0', intensity: 18, flicker: true, ceiling: true },
];

export const pharmacy: Level = {
  name: 'Pharmacy',
  theme: 'ward',
  boxes: [
    ...stationBoxes(stations),
    ...shell(style, 14, 9, [...doors, elevator]),

    // The back rooms: the stockroom, a store, and the manager's office behind its paid door.
    ...partition(style, 'x', -4, -14, 14, [doorway(-9, 2.8), doorway(1, 2.8), { centre: 10, width: 2.2, height: DOOR_HEIGHT }]),
    ...partition(style, 'z', -3, -9, -4),
    ...partition(style, 'z', 5, -9, -4),

    // The stockroom: crates of boxed medicine.
    furniture(-12.4, -7, 1.4, 1.2, 1.4, '#8a6b45', 'cabinet', 'east'),
    furniture(-5.2, -7.2, 0.9, 1.9, 2, '#7fa393', 'fridge', 'west'),
    // The store.
    furniture(1, -8.3, 3, 0.9, 0.7, SHELF, 'shelf', 'south'),
    // The manager's office, with the keycard on the desk.
    furniture(10, -7.2, 2.4, 0.8, 1.2, DESK, 'desk', 'south'),
    furniture(13.4, -6, 0.6, 2, 3, SHELF, 'shelf', 'west'),
    // The dispensing counter across the shop, open at both ends.
    furniture(-5.5, -1.2, 6, 1.05, 0.9, COUNTER, 'counter', 'south'),
    furniture(5.5, -1.2, 6, 1.05, 0.9, COUNTER, 'counter', 'south'),
    // Shelving down the shop, in two bays with a cross aisle.
    furniture(-9.5, 4.6, 0.6, 2, 3.6, SHELF, 'shelf', 'east'),
    furniture(-3, 4.6, 0.6, 2, 3.6, SHELF, 'shelf', 'east'),
    furniture(3, 4.6, 0.6, 2, 3.6, SHELF, 'shelf', 'west'),
    furniture(9.5, 4.6, 0.6, 2, 3.6, SHELF, 'shelf', 'west'),
    // The waiting chairs and the blood-pressure machine by the front window.
    furniture(-12, 6.5, 0.9, 0.8, 2.2, '#3d5a52', 'seating', 'east'),
    furniture(12, 6.5, 0.9, 0.8, 2.2, '#3d5a52', 'seating', 'west'),
  ],
  ladders: [],
  lights,
  doors,
  gate: null,
  elevator,
  stations,
  locks,
  signs: [
    { text: 'PHARMACY', sub: 'OPEN LATE', background: '#1b5b4d', position: { x: 0, y: 3.0, z: 8.96 }, rotation: Math.PI, width: 3.0, height: 0.8 },
    { text: 'DISPENSING', sub: 'COLLECT HERE', background: '#1b5b4d', position: { x: -5.5, y: 2.6, z: -0.7 }, rotation: Math.PI, width: 2.0, height: 0.5 },
    { text: 'STAFF ONLY', sub: 'STOCKROOM AND LIFT', background: '#6b4a12', position: { x: -9, y: 2.9, z: -3.84 }, rotation: Math.PI, width: 2.2, height: 0.5 },
    { text: 'MANAGER', sub: 'PRIVATE', background: '#2c3a4d', position: { x: 13, y: 2.9, z: -3.84 }, rotation: Math.PI, width: 1.6, height: 0.5 },
    { text: 'LIFT', sub: 'LABORATORY  /  KEYCARD ONLY', background: '#5b1b1b', position: { x: -6.2, y: 3.0, z: -8.96 }, rotation: 0, width: 2.6, height: 0.5 },
  ],
  objective: { kind: 'keycard', label: 'Manager keycard', part: 'Laboratory lift key', position: { x: 10, y: 0.95, z: -7.2 } },
  // The street doors are the first two.
  flow: { kind: 'sweep', loud: 3, first: 8, from: [0, 1] },
  residents,
  cues: [
    { on: 'start', at: 1.5, speaker: CREW, text: 'Pharmacy stockroom. Listen. The street out front is full of them.' },
    { on: 'start', at: 7.5, speaker: SCIENTIST, text: "The lift to the lab takes the manager's card. Keep it quiet. If the street hears you, all of it comes in.", seconds: 6 },
    { on: 'area', at: 0, speaker: CREW, text: 'They are just standing there. Stay low, use the blade, and do not fire unless you have to.', seconds: 6, area: { minX: -14, maxX: 14, minZ: -3.6, maxZ: 9 } },
    { on: 'done', at: 0.6, speaker: SCIENTIST, text: 'That card opens the lift in the stockroom. The lab is under you. I am further down.' },
  ],
  navBounds: { minX: -19, maxX: 19, minZ: -14, maxZ: 14 },
  ramp: null,
  barricadeBars: [
    { x: 0, y: 0, z: 3 },
    { x: -7, y: 0, z: 1 },
  ],
  streetSpawns: [],
  playerSpawns: [{ x: -9, y: 0, z: -7 }],
  spawnYaw: Math.PI,
  streetLamps: [],
  checkpoint: { x: -9, y: 0, z: -7 },
};
