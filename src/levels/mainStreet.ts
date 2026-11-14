import type { Elevator, Level, LevelLight, Station } from './types';
import { gapsOn, wallLine } from './build';
import { CREW, SCIENTIST_HERE } from './voices';
import { block, FRONT_HEIGHT, frontage, ground, parkedCar, streetDoor } from './streetKit';
import { DOOR_HEIGHT, furniture, stationBoxes } from './wardKit';

// Act 4, the first block: Main Street, out in the open, at first light. The crew steps out at the west
// end and the way on is the steel gate at the east end, which opens from the control box beside it.
// This is a run: the dead come out of the shop doors behind the crew, and standing still gets worse.
// Two staggered lines of barriers across the road make it a long S-bend, and the north shop, whose
// doors open either side of the barriers, is the shortcut: straight through, in the dark, past the
// shoppers who never left.
//
//   z -10 +--[shop]-----------[shop]-------------------------+
//         |    pavement                                      |
//   LIFT  >    road         (cars, barriers)           pass   |  (closed)
//         |    pavement                                      |
//   z  10 +---------[shop]-------------------[shop]----------+
//        x -28                                             28

const BRICK = '#7a6f66';
const STONE = '#6e7479';

const BARRIER = '#8a8d90';

const doors = [streetDoor(-12, -10.25, 0, 1), streetDoor(14, -10.25, 0, 1), streetDoor(-4, 10.25, 0, -1), streetDoor(20, 10.25, 0, -1)];

const elevator: Elevator = { position: { x: 28.25, y: 0, z: 0 }, normal: { x: -1, z: 0 }, width: 2.2, height: DOOR_HEIGHT, cabDepth: 3, cabWidth: 3 };

const stations: Station[] = [
  { kind: 'ammo', position: { x: -20, y: 1.25, z: -9.95 }, normal: { x: 0, z: 1 } },
  { kind: 'shotgun', position: { x: 2, y: 1.25, z: 9.95 }, normal: { x: 0, z: -1 } },
];

const lamp = (x: number, z: number, flicker = false): LevelLight => ({ position: { x, y: 3.8, z }, color: '#ffcf8a', intensity: 30, flicker });
const lights: LevelLight[] = [lamp(-22, -8.4), lamp(-8, 8.4, true), lamp(6, -8.4), lamp(18, 8.4), lamp(24, -8.4), lamp(-14, 8.4), lamp(-1, -8.4)];

// The north shop, behind the pavement: a long room with its doors at either end of the barriers.
const shopLights: LevelLight[] = [
  { position: { x: -8, y: 3.15, z: -12.5 }, color: '#ffe2b0', intensity: 14, ceiling: true },
  { position: { x: 0.75, y: 3.15, z: -12.5 }, color: '#ffe2b0', intensity: 12, flicker: true, ceiling: true },
  { position: { x: 9, y: 3.15, z: -12.5 }, color: '#ffe2b0', intensity: 14, ceiling: true },
];

export const mainStreet: Level = {
  name: 'Main Street',
  theme: 'street',
  exitGate: true,
  atmosphere: { fog: '#8a8f98', fogNear: 25, fogFar: 100, ambient: 1.3, sky: { horizon: '#d9a070', zenith: '#50648a', stars: 0.05 } },
  boxes: [
    ground(-28, 28, -6, 6, '#2a2d32', 'slab'),
    ground(-28, 28, -10, -6, '#7d7f80'),
    ground(-28, 28, 6, 10, '#7d7f80'),
    // The north frontage has its two doors opening into the shop, not into closed alcoves.
    ...wallLine('x', -10.25, -28.5, 28.5, gapsOn('x', -10.25, doors), FRONT_HEIGHT, 0.5, BRICK, 'building'),
    ground(-15, 16.5, -14.5, -10.5, '#5a5047'),
    ...wallLine('x', -14.75, -15.25, 16.75, [], FRONT_HEIGHT, 0.5, BRICK, 'building'),
    ...wallLine('z', -15.25, -14.75, -10.25, [], FRONT_HEIGHT, 0.5, BRICK, 'building'),
    ...wallLine('z', 16.75, -14.75, -10.25, [], FRONT_HEIGHT, 0.5, BRICK, 'building'),
    { position: { x: 0.75, y: 3.5, z: -12.5 }, size: { x: 32, y: 0.3, z: 4.6 }, color: '#cfcac0', surface: 'wall' },
    furniture(-4, -14, 5, 1.05, 0.8, '#6d5a48', 'counter', 'south'),
    furniture(5, -14.1, 3, 2, 0.6, '#7a6a58', 'shelf', 'south'),
    furniture(-10, -14.1, 3, 2, 0.6, '#7a6a58', 'shelf', 'south'),
    block(11, -12.6, 1.2, 1, 1.2, '#7a6f5a', 'crate'),
    // Two staggered lines of barriers across the road and both pavements: a gap at the south, then a gap
    // at the north, so the road is an S-bend.
    block(-4, -2, 1.2, 2.2, 17, BARRIER),
    block(4, 2, 1.2, 2.2, 17, BARRIER),
    ...frontage('x', 10.25, -28.5, 28.5, doors, FRONT_HEIGHT, STONE),
    ...frontage('z', -28.25, -10, 10, [], FRONT_HEIGHT, STONE),
    ...frontage('z', 28.25, -10, 10, [elevator], FRONT_HEIGHT, BRICK),
    ...stationBoxes(stations),

    // Parked cars at the kerbs, and a van left across a lane.
    parkedCar(-20, -4.4, '#6b2a2a'),
    parkedCar(-8, -4.4, '#2f4a5c'),
    parkedCar(2, -4.4, '#c5c8c5', true),
    parkedCar(16, -4.4, '#a8782f'),
    parkedCar(-16, 4.4, '#4a4f55'),
    parkedCar(-6, 4.4, '#344e41'),
    parkedCar(9, 4.2, '#d6ddd7', true),
    parkedCar(24, 4.4, '#354e67'),
    // Concrete barriers and planters out in the road.
    block(-1, 0.6, 3, 1.1, 0.8, '#8a8d90'),
    block(11, -1.4, 0.8, 1.1, 3, '#8a8d90'),
    block(-13, -1, 0.8, 1.1, 2.6, '#8a8d90'),
    block(18, 0.8, 3, 1.1, 0.8, '#8a8d90'),
    block(-23, -7.2, 1.6, 0.8, 0.8, '#4a5a3a'),
    block(21, 7.2, 1.6, 0.8, 0.8, '#4a5a3a'),
    // The newspaper stand at the far end, with the pass on it.
    block(24, -8, 1.2, 0.9, 0.8, '#6b3a2a'),
    // A bench and a bin along the north pavement.
    furniture(-5, -8.6, 2.2, 0.5, 0.6, '#5a4a3a', 'bench', 'south'),
    block(9, 8.6, 0.7, 1, 0.7, '#3a3f44', 'barrel'),
  ],
  ladders: [],
  lights: [...lights, ...shopLights],
  doors,
  gate: null,
  elevator,
  stations,
  locks: [],
  signs: [
    { text: 'MAIN STREET', sub: 'SHOPS  /  CAFES  /  PHARMACY', background: '#2c3a4d', position: { x: -17, y: 4.2, z: -9.96 }, rotation: 0, width: 3.4, height: 0.9 },
    { text: 'OPEN LATE', sub: 'NEWSAGENT', background: '#6b4a12', position: { x: 12, y: 3.2, z: 9.96 }, rotation: Math.PI, width: 2.4, height: 0.7 },
    { text: 'ROAD CLOSED', sub: 'GATE CONTROL', background: '#6b4a12', position: { x: 27.96, y: 2.6, z: -3.8 }, rotation: -Math.PI / 2, width: 3.2, height: 0.8 },
    { text: 'THE SHOP', sub: 'OPEN LATE', background: '#6b4a12', position: { x: -12, y: 3.4, z: -9.96 }, rotation: 0, width: 2.2, height: 0.6 },
  ],
  // The gate at the east end opens from the control box beside it.
  objective: { kind: 'breakers', label: 'Gate control', part: 'The east gate', panels: [{ position: { x: 27.95, y: 1.45, z: 4.5 }, normal: { x: -1, z: 0 } }] },
  flow: { kind: 'run', every: 3.6, max: 12 },
  residents: [
    { x: -8, z: -12.8, yaw: Math.PI },
    { x: -2, z: -12, yaw: 0.5 },
    { x: 3, z: -12.5, yaw: Math.PI },
    { x: 6.5, z: -12.9, yaw: 0 },
    { x: 9, z: -11.6, yaw: -Math.PI / 2 },
    { x: 13, z: -12.8, yaw: Math.PI },
    { x: 4, z: 0.5, yaw: Math.PI / 2 },
    { x: 15, z: 5.5, yaw: 0 },
  ],
  cues: [
    { on: 'start', at: 1.5, speaker: CREW, text: 'Daylight. Main Street. Gate at the far end, and they are already coming out of the shops.' },
    { on: 'start', at: 8, speaker: SCIENTIST_HERE, text: 'The barriers make it a long way round. The shop on the left goes straight through. I would not stop in there.', seconds: 6.5 },
    { on: 'done', at: 0.6, speaker: CREW, text: 'Gate is open. Go, go.' },
  ],
  navBounds: { minX: -33, maxX: 33, minZ: -15, maxZ: 15 },
  ramp: null,
  barricadeBars: [
    { x: -10, y: 0, z: 2 },
    { x: 12, y: 0, z: -3 },
  ],
  streetSpawns: [],
  playerSpawns: [{ x: -24, y: 0, z: 0 }],
  spawnYaw: -Math.PI / 2,
  streetLamps: [],
  checkpoint: { x: -24, y: 0, z: 0 },
};
