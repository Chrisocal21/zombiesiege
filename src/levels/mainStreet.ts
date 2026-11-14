import type { Elevator, Level, LevelLight, Station } from './types';
import { block, FRONT_HEIGHT, frontage, ground, parkedCar, streetDoor } from './streetKit';
import { DOOR_HEIGHT, furniture, stationBoxes } from './wardKit';

// Act 4, the first block: Main Street, out in the open. The transit lift comes up in a kiosk at the
// west end. A shopping street runs east between two rows of shopfronts, parked cars and barriers
// standing in the road. The shop doors along both sides are where the dead come from. The transit
// pass the lift needs is in the newspaper stand at the far end, and the road is shut by a barrier.
//
//   z -10 +--[shop]-----------[shop]-------------------------+
//         |    pavement                                      |
//   LIFT  >    road         (cars, barriers)           pass   |  (closed)
//         |    pavement                                      |
//   z  10 +---------[shop]-------------------[shop]----------+
//        x -28                                             28

const BRICK = '#7a6f66';
const STONE = '#6e7479';

const doors = [streetDoor(-12, -10.25, 0, 1), streetDoor(14, -10.25, 0, 1), streetDoor(-4, 10.25, 0, -1), streetDoor(20, 10.25, 0, -1)];

const elevator: Elevator = { position: { x: -28.25, y: 0, z: 0 }, normal: { x: 1, z: 0 }, width: 2.2, height: DOOR_HEIGHT, cabDepth: 3, cabWidth: 3 };

const stations: Station[] = [
  { kind: 'ammo', position: { x: -20, y: 1.25, z: -9.95 }, normal: { x: 0, z: 1 } },
  { kind: 'shotgun', position: { x: 2, y: 1.25, z: 9.95 }, normal: { x: 0, z: -1 } },
];

const lamp = (x: number, z: number, flicker = false): LevelLight => ({ position: { x, y: 3.8, z }, color: '#ffcf8a', intensity: 30, flicker });
const lights: LevelLight[] = [lamp(-22, -8.4), lamp(-8, 8.4, true), lamp(6, -8.4), lamp(18, 8.4), lamp(24, -8.4), lamp(-14, 8.4), lamp(-1, -8.4)];

export const mainStreet: Level = {
  name: 'Main Street',
  theme: 'street',
  atmosphere: { fog: '#1a2029', fogNear: 20, fogFar: 85, ambient: 1.1, sky: { horizon: '#1a2230', zenith: '#05070d', stars: 0.8 } },
  boxes: [
    ground(-28, 28, -6, 6, '#2a2d32', 'slab'),
    ground(-28, 28, -10, -6, '#7d7f80'),
    ground(-28, 28, 6, 10, '#7d7f80'),
    ...frontage('x', -10.25, -28.5, 28.5, doors, FRONT_HEIGHT, BRICK),
    ...frontage('x', 10.25, -28.5, 28.5, doors, FRONT_HEIGHT, STONE),
    ...frontage('z', -28.25, -10, 10, [elevator], FRONT_HEIGHT, STONE),
    ...frontage('z', 28.25, -10, 10, [], FRONT_HEIGHT, BRICK),
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
  lights,
  doors,
  gate: null,
  elevator,
  stations,
  locks: [],
  signs: [
    { text: 'MAIN STREET', sub: 'SHOPS  /  CAFES  /  PHARMACY', background: '#2c3a4d', position: { x: -17, y: 4.2, z: -9.96 }, rotation: 0, width: 3.4, height: 0.9 },
    { text: 'OPEN LATE', sub: 'NEWSAGENT', background: '#6b4a12', position: { x: 12, y: 3.2, z: 9.96 }, rotation: Math.PI, width: 2.4, height: 0.7 },
    { text: 'TRANSIT LIFT', sub: 'PASS REQUIRED', background: '#5b1b1b', position: { x: -27.96, y: 3.0, z: 3.6 }, rotation: Math.PI / 2, width: 2.4, height: 0.5 },
    { text: 'ROAD CLOSED', sub: 'EMERGENCY ACCESS ONLY', background: '#6b4a12', position: { x: 27.96, y: 2.6, z: 0 }, rotation: -Math.PI / 2, width: 3.2, height: 0.8 },
  ],
  objective: { kind: 'keycard', label: 'Transit pass', part: 'Transit lift pass', position: { x: 24, y: 1.0, z: -8 } },
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
