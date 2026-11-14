import type { Elevator, Level, LevelLight, Station } from './types';
import { CREW, SCIENTIST } from './voices';
import { DOOR_HEIGHT, doorway, entry, furniture, partition, shell, stationBoxes, type WardStyle } from './wardKit';

// Act 2, fifth floor down: the ground lobby. A wide marble hall with a reception desk, columns and
// seating, and the street doors giving way at the south end. The freight lift is on the north
// wall. The security booth in the north-west holds the lift's service controls. Start them and
// hold the booth while the lift winds up, and the way down to the garage is open.
//
//   z -12 +-BOOTH-+-----lift-----------------------+
//         | (ctrl) |   RECEPTION                    |
//   z  -4 +--  ----+                                |
//         |          COLUMNS AND SEATING        >   |
//   z  12 +----------------<--------<---------------+
//        x -18   -10                              18

const style: WardStyle = { wall: '#c8c6c0', floor: '#8d8f93', ceiling: '#e4e3df' };
const PILLAR = '#a8aaae';
const DESK = '#6d5a48';
const SEAT = '#46505c';

const doors = [entry(-8, 12.25, 0, -1), entry(8, 12.25, 0, -1), entry(18.25, -4, -1, 0), entry(-18.25, 4, 1, 0)];

const elevator: Elevator = { position: { x: 0, y: 0, z: -12.25 }, normal: { x: 0, z: 1 }, width: 2.2, height: DOOR_HEIGHT, cabDepth: 3, cabWidth: 3 };

const stations: Station[] = [
  { kind: 'ammo', position: { x: 6, y: 1.25, z: -11.95 }, normal: { x: 0, z: 1 } },
  { kind: 'shotgun', position: { x: 17.95, y: 1.25, z: 4 }, normal: { x: -1, z: 0 } },
];

const lights: LevelLight[] = [
  { position: { x: -14, y: 3.15, z: -8 }, color: '#e6efff', intensity: 18, ceiling: true },
  { position: { x: -6, y: 3.15, z: -8 }, color: '#fff0d8', intensity: 20, flicker: true, ceiling: true },
  { position: { x: 6, y: 3.15, z: -8 }, color: '#fff0d8', intensity: 20, ceiling: true },
  { position: { x: 14, y: 3.15, z: -8 }, color: '#fff0d8', intensity: 18, ceiling: true },
  { position: { x: -12, y: 3.15, z: 0 }, color: '#fff0d8', intensity: 20, ceiling: true },
  { position: { x: 0, y: 3.15, z: 0 }, color: '#ffffff', intensity: 24, ceiling: true },
  { position: { x: 12, y: 3.15, z: 0 }, color: '#fff0d8', intensity: 20, flicker: true, ceiling: true },
  { position: { x: -10, y: 3.15, z: 8 }, color: '#d8e8ff', intensity: 18, ceiling: true },
  { position: { x: 0, y: 3.15, z: 8 }, color: '#d8e8ff', intensity: 20, flicker: true, ceiling: true },
  { position: { x: 10, y: 3.15, z: 8 }, color: '#d8e8ff', intensity: 18, ceiling: true },
  { position: { x: -14, y: 3.15, z: -8 }, color: '#ffb070', intensity: 14, ceiling: true },
];

export const lobby1: Level = {
  name: 'Lobby',
  theme: 'ward',
  boxes: [
    ...stationBoxes(stations),
    ...shell(style, 18, 12, [...doors, elevator]),

    // The security booth in the north-west corner, open through one doorway on its south side.
    ...partition(style, 'x', -4, -18, -10, [doorway(-14, 3)]),
    ...partition(style, 'z', -10, -12, -4),
    furniture(-15.5, -7, 3, 0.95, 0.8, '#4c5a66', 'counter', 'south'),
    furniture(-11.2, -8.5, 0.8, 1.2, 0.8, '#5d646b', 'monitor', 'east'),

    // The reception desk, with a gap at each end, and the columns down the hall.
    furniture(2, -5.5, 7, 1.05, 1, DESK, 'counter', 'south'),
    ...[-9, -3, 3, 9].flatMap((x) => [0.5].map((z) => furniture(x, z, 1.2, 3.2, 1.2, PILLAR))),
    // Seating groups.
    furniture(-14, 6, 3.4, 0.8, 0.9, SEAT, 'seating', 'south'),
    furniture(14, 7.5, 3.4, 0.8, 0.9, SEAT, 'seating', 'south'),
    furniture(14.5, -8, 0.9, 0.8, 3.2, SEAT, 'seating', 'west'),
    // A baggage trolley left in the hall.
    furniture(-4, 6.5, 1.8, 0.7, 0.8, '#8a9ba3', 'cart', 'north'),
  ],
  ladders: [],
  lights,
  doors,
  gate: null,
  elevator,
  stations,
  locks: [],
  signs: [
    { text: 'RECEPTION', sub: 'GROUND FLOOR  /  VISITORS SIGN IN', background: '#2c3a4d', position: { x: -4.5, y: 2.9, z: -11.96 }, rotation: 0, width: 3.0, height: 0.9 },
    { text: 'SECURITY', sub: 'STAFF ONLY', background: '#6b1b1b', position: { x: -14, y: 2.9, z: -3.84 }, rotation: Math.PI, width: 1.8, height: 0.5 },
    { text: 'FREIGHT LIFT', sub: 'GARAGE  /  SERVICE POWER REQUIRED', background: '#5b1b1b', position: { x: 4, y: 3.0, z: -11.96 }, rotation: 0, width: 2.6, height: 0.5 },
  ],
  // The lift's service controls are in the security booth. Start them and hold the booth.
  objective: {
    kind: 'charge',
    label: 'Service controls',
    part: 'Lift service power',
    device: { position: { x: -14, y: 0, z: -11.95 }, normal: { x: 0, z: 1 } },
    room: { minX: -17.8, maxX: -10.2, minZ: -11.8, maxZ: -4.2 },
    roomName: 'Security booth',
    seconds: 50,
  },
  // The street doors are barricaded, and the last wave comes at them led by a brute.
  leads: 'brute',
  cues: [
    { on: 'start', at: 1.5, speaker: CREW, text: 'The lobby. Street doors are barricaded, and something heavy is leaning on them.' },
    { on: 'start', at: 8, speaker: SCIENTIST, text: 'Those doors will not hold forever. Get the service controls running and keep the booth.', seconds: 6 },
    { on: 'done', at: 0.6, speaker: CREW, text: 'Lift is awake. Garage is the way down.' },
  ],
  navBounds: { minX: -23, maxX: 23, minZ: -17, maxZ: 17 },
  ramp: null,
  barricadeBars: [
    { x: -6, y: 0, z: 3 },
    { x: 6, y: 0, z: 3 },
  ],
  streetSpawns: [],
  playerSpawns: [{ x: 0, y: 0, z: -9.5 }],
  spawnYaw: Math.PI,
  streetLamps: [],
  checkpoint: { x: 0, y: 0, z: -9.5 },
};
