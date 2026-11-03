import { alcoveBoxes, gapsOn, wallLine, type Gap } from './build';
import type { Door, Elevator, Level, LevelBox, Lock, Station } from './types';
import { furniture } from './wardKit';

// Floor 3 of the hospital tower: the admissions floor. You arrive in the lobby, fight through the
// open-plan office, and pay for the doors to the records room and the manager's office, where the
// keycard that wakes the elevator is kept.
//
//   z -12  +-----------+------------------------+
//          | RECORDS   |  OFFICE            +---+
//          | (lock A)  |                    |MGR|  <- lock B
//   z   0  +-----------+                    +---+
//          | LOBBY  (free doorway)          |
//   z  12  +-----------+--------------------+
//        x -14        -4                   14

const CEILING = 3.4;
const OUTER = 0.5;
const INNER = 0.3;
const WALL = '#cfd8d0';
const FLOOR = '#9fb3ac';
const DOOR_WIDTH = 2.4;
const DOOR_HEIGHT = 2.5;
const DESK = '#7d5a3c';
const CABINET = '#5d646b';
const COUNTER = '#4c5a66';

// Zombies come in through these, as in the garage, and they can be boarded up.
const doors: Door[] = [
  { position: { x: -9, y: 0, z: 12.25 }, normal: { x: 0, z: -1 }, width: DOOR_WIDTH, height: DOOR_HEIGHT },
  { position: { x: 14.25, y: 0, z: 4 }, normal: { x: -1, z: 0 }, width: DOOR_WIDTH, height: DOOR_HEIGHT },
  { position: { x: 8, y: 0, z: 12.25 }, normal: { x: 0, z: -1 }, width: DOOR_WIDTH, height: DOOR_HEIGHT },
  { position: { x: 0, y: 0, z: -12.25 }, normal: { x: 0, z: 1 }, width: DOOR_WIDTH, height: DOOR_HEIGHT },
];

// The elevator in the lobby's west wall. It brought you here and is dead until the keycard is found.
const elevator: Elevator = {
  position: { x: -14.25, y: 0, z: 3 },
  normal: { x: 1, z: 0 },
  width: 2.2,
  height: DOOR_HEIGHT,
  cabDepth: 3,
  cabWidth: 3,
};

const locks: Lock[] = [
  { position: { x: -4, y: 0, z: -6 }, normal: { x: 1, z: 0 }, width: 2.2, height: DOOR_HEIGHT, cost: 250, label: 'Records room' },
  { position: { x: 8, y: 0, z: -8.5 }, normal: { x: -1, z: 0 }, width: 2.2, height: DOOR_HEIGHT, cost: 500, label: "Manager's office" },
];

// The doorway between the lobby and the office is open.
const lobbyDoorway: Gap = { centre: 7, width: 2.8, height: DOOR_HEIGHT };

const stations: Station[] = [
  { kind: 'ammo', position: { x: -13.95, y: 1.25, z: 8.5 }, normal: { x: 1, z: 0 } },
  // The weapon wall is in the records room, so paying for the door pays off.
  { kind: 'shotgun', position: { x: -13.95, y: 1.25, z: -6 }, normal: { x: 1, z: 0 } },
];

const stationBoxes: LevelBox[] = stations.map((station) => {
  const alongX = station.normal.z !== 0;
  return {
    position: { x: station.position.x + station.normal.x * 0.15, y: 1.5, z: station.position.z + station.normal.z * 0.15 },
    size: { x: alongX ? 1.1 : 0.3, y: 3, z: alongX ? 0.3 : 1.1 },
    color: '#000000',
    surface: 'step',
  };
});

const alcove = (door: Pick<Door, 'position' | 'normal'>): LevelBox[] =>
  alcoveBoxes(door, { ceiling: CEILING, depth: 3, width: 3, thickness: OUTER, wallColor: WALL, floorColor: FLOOR, wallSurface: 'plaster', floorSurface: 'tile' });

const outerWall = (axis: 'x' | 'z', fixed: number, from: number, to: number): LevelBox[] =>
  wallLine(axis, fixed, from, to, gapsOn(axis, fixed, [...doors, elevator]), CEILING, OUTER, WALL, 'plaster');

export const floor3: Level = {
  name: 'Floor 3',
  theme: 'ward',
  boxes: [
    ...stationBoxes,
    { position: { x: 0, y: -0.25, z: 0 }, size: { x: 29, y: 0.5, z: 25 }, color: FLOOR, surface: 'tile' },
    // One ceiling over the whole floor and the spaces behind its doors.
    { position: { x: 0, y: CEILING + 0.2, z: 0 }, size: { x: 42, y: 0.4, z: 38 }, color: '#f2f2ee', surface: 'ceiling' },

    ...outerWall('x', -12.25, -14.5, 14.5),
    ...outerWall('x', 12.25, -14.5, 14.5),
    ...outerWall('z', -14.25, -12, 12),
    ...outerWall('z', 14.25, -12, 12),
    ...doors.flatMap(alcove),
    ...alcove(elevator),

    // Lobby to office: an open doorway, and the records room's door.
    ...wallLine('z', -4, -12, 12, [{ centre: -6, width: locks[0].width, height: DOOR_HEIGHT }, lobbyDoorway], CEILING, INNER, WALL, 'plaster'),
    // Lobby to records room.
    ...wallLine('x', 0, -14, -4, [], CEILING, INNER, WALL, 'plaster'),
    // The manager's office in the north-east corner.
    ...wallLine('z', 8, -12, -5, [{ centre: -8.5, width: locks[1].width, height: DOOR_HEIGHT }], CEILING, INNER, WALL, 'plaster'),
    ...wallLine('x', -5, 8, 14, [], CEILING, INNER, WALL, 'plaster'),

    // Lobby: a reception counter and waiting seats.
    furniture(-8, 7, 4.6, 1.05, 0.9, COUNTER, 'counter', 'north'),
    furniture(-12.6, 11, 2.2, 0.8, 0.9, '#3d5a52', 'seating', 'north'),
    furniture(-5.4, 11, 2.2, 0.8, 0.9, '#3d5a52', 'seating', 'north'),
    // Open-plan office: rows of desks with room to run between.
    ...[-1, 4, 9].flatMap((x) => [-8, -3, 2].map((z) => furniture(x, z, 2.2, 0.78, 1, DESK, 'desk', z === -3 ? 'north' : 'south'))),
    furniture(12.8, 9.5, 1.2, 1.8, 3, CABINET, 'cabinet', 'west'),
    furniture(-2.4, -11.4, 3, 1.8, 0.8, CABINET, 'cabinet', 'south'),
    // Records room: tall filing cabinets in rows.
    ...[-9, -6.5, -3.5].flatMap((z) => [-11.5, -8].map((x) => furniture(x, z, 1.2, 1.9, 0.6, CABINET, 'cabinet', 'south'))),
    // The manager's desk, where the keycard is.
    furniture(12, -9.5, 2, 0.8, 1, DESK, 'desk', 'south'),
  ],
  ladders: [],
  lights: [
    { position: { x: -9, y: 3.15, z: 4 }, color: '#ffe3b8', intensity: 26, ceiling: true },
    { position: { x: -9, y: 3.15, z: 9 }, color: '#ffe3b8', intensity: 22, flicker: true, ceiling: true },
    { position: { x: -9, y: 3.15, z: -6 }, color: '#d8e6ff', intensity: 22, ceiling: true },
    { position: { x: 1, y: 3.15, z: -7 }, color: '#d8e6ff', intensity: 26, ceiling: true },
    { position: { x: 1, y: 3.15, z: 0 }, color: '#e8f0ff', intensity: 28, flicker: true, ceiling: true },
    { position: { x: 1, y: 3.15, z: 7 }, color: '#d8e6ff', intensity: 26, ceiling: true },
    { position: { x: 9.5, y: 3.15, z: 4 }, color: '#d8e6ff', intensity: 24, ceiling: true },
    { position: { x: 11, y: 3.15, z: -8.5 }, color: '#ffd9a0', intensity: 22, ceiling: true },
  ],
  doors,
  gate: null,
  elevator,
  stations,
  locks,
  signs: [
    { text: 'ADMISSIONS', sub: 'FLOOR 3  /  RECEPTION', background: '#1b5b4d', position: { x: -9, y: 2.75, z: 11.95 }, rotation: Math.PI, width: 2.6, height: 0.87 },
    { text: 'ELEVATOR', sub: 'OUT OF SERVICE  /  KEYCARD OVERRIDE', background: '#5b1b1b', position: { x: -13.96, y: 3.0, z: 5.6 }, rotation: Math.PI / 2, width: 2.4, height: 0.5 },
    { text: 'MEDICAL RECORDS', sub: 'STAFF ONLY', background: '#1d3f73', position: { x: -3.84, y: 2.9, z: -3.3 }, rotation: Math.PI / 2, width: 2.0, height: 0.6 },
    { text: 'ADMINISTRATOR', sub: 'PRIVATE', background: '#1d3f73', position: { x: 7.84, y: 2.9, z: -11.2 }, rotation: -Math.PI / 2, width: 2.0, height: 0.6 },
  ],
  // The manager's keycard overrides the elevator, and opens the helipad's control box on the roof.
  objective: { kind: 'keycard', label: 'Manager keycard', part: 'Helipad control key', position: { x: 12, y: 0.95, z: -9.5 } },
  navBounds: { minX: -19, maxX: 19, minZ: -17, maxZ: 17 },
  ramp: null,
  // Two bundles of boards: one in the lobby, one out in the office.
  barricadeBars: [
    { x: -7, y: 0, z: 2.5 },
    { x: 6.5, y: 0, z: 0 },
  ],
  streetSpawns: [],
  // Arriving, you step out of the elevator into the lobby, facing into the room.
  playerSpawns: [{ x: -11.5, y: 0, z: 3 }],
  spawnYaw: -Math.PI / 2,
  streetLamps: [],
  checkpoint: { x: -11.5, y: 0, z: 3 },
};
