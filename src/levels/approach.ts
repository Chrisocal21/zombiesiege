import type { Elevator, Level, LevelLight, Station } from './types';
import { block, FRONT_HEIGHT, frontage, ground, parkedCar, streetDoor, checkpointBoxes } from './streetKit';
import { DOOR_HEIGHT, furniture, stationBoxes } from './wardKit';

// Prologue P05, Final Push (Mile 1): the last mile into Northline. Town streets, dark now, shops
// and flats on both sides and the road choked with abandoned cars. The barrier across the hospital's access
// road is down, and its control cabinets are on the shopfronts: three of them to switch before it lifts. The
// dead come out of every doorway. The gate at the east end leads down to the hospital garage.
//
//   z -10 +--[flats]---------[shop]------------[bank]--------------+
//         |  pavement                                              |
//         |  road   (cars, barriers, a bus)                   GATE > (hospital)
//         |  pavement                                              |
//   z  10 +--------[cafe]---------[chemist]---------[offices]------+
//        x -34                                                   34

const BRICK = '#6e5f55';
const STONE = '#5f666c';

const doors = [
  streetDoor(-26, -10.25, 0, 1), streetDoor(0, -10.25, 0, 1), streetDoor(22, -10.25, 0, 1),
  streetDoor(-14, 10.25, 0, -1), streetDoor(14, 10.25, 0, -1), streetDoor(28, 10.25, 0, -1),
];

const elevator: Elevator = { position: { x: 34.25, y: 0, z: 0 }, normal: { x: -1, z: 0 }, width: 6, height: DOOR_HEIGHT, cabDepth: 4, cabWidth: 6 };
const entry: Elevator = { position: { x: -34.25, y: 0, z: 0 }, normal: { x: 1, z: 0 }, width: 6, height: DOOR_HEIGHT, cabDepth: 4, cabWidth: 6 };

const stations: Station[] = [
  { kind: 'ammo', position: { x: -30, y: 1.25, z: -9.95 }, normal: { x: 0, z: 1 } },
  { kind: 'shotgun', position: { x: -6, y: 1.25, z: 9.95 }, normal: { x: 0, z: -1 } },
];

const lamp = (x: number, z: number, flicker = false): LevelLight => ({ position: { x, y: 3.8, z }, color: '#ffcf8a', intensity: 30, flicker });
const lights: LevelLight[] = [lamp(-30, 8.4), lamp(-20, -8.4, true), lamp(-8, 8.4), lamp(6, -8.4), lamp(8, 8.4, true), lamp(18, -8.4), lamp(24, 8.4), lamp(30, -8.4)];

export const approach: Level = {
  name: 'Final Push',
  theme: 'street',
  exitGate: true,
  atmosphere: { fog: '#171c24', fogNear: 18, fogFar: 80, ambient: 1.05, sky: { horizon: '#1c2030', zenith: '#04060c', stars: 0.9 } },
  boxes: [
    ground(-34, 34, -6, 6, '#272a2f', 'slab'),
    ground(-34, 34, -10, -6, '#7d7f80'),
    ground(-34, 34, 6, 10, '#7d7f80'),
    ...frontage('x', -10.25, -34.5, 34.5, doors, FRONT_HEIGHT, BRICK),
    ...frontage('x', 10.25, -34.5, 34.5, doors, FRONT_HEIGHT, STONE),
    ...frontage('z', 34.25, -10, 10, [elevator], FRONT_HEIGHT, STONE, 'building', [elevator]),
    ...checkpointBoxes(elevator, STONE),
    ...frontage('z', -34.25, -10, 10, [entry], FRONT_HEIGHT, BRICK, 'building', [entry]),
    ...checkpointBoxes(entry, BRICK),
    ...stationBoxes(stations),

    // Abandoned cars at both kerbs, a bus across the road, barriers.
    parkedCar(-28, 4.4, '#6b2a2a'),
    parkedCar(-20, -4.4, '#2f4a5c'),
    parkedCar(-8, 4.4, '#c5c8c5', true),
    parkedCar(-3, -4.4, '#4a4f55'),
    parkedCar(8, 4.4, '#344e41'),
    parkedCar(16, -4.4, '#a8782f', true),
    parkedCar(26, 4.4, '#354e67'),
    parkedCar(30, -4.4, '#6b2a2a'),
    block(-14, -0.6, 0.8, 1.1, 3, '#8a8d90'),
    block(2, 1.2, 3, 1.1, 0.8, '#8a8d90'),
    block(20, -0.4, 0.8, 1.1, 3, '#8a8d90'),
    block(-32, -7.2, 1.6, 0.8, 0.8, '#4a5a3a'),
    block(31, 7.2, 1.6, 0.8, 0.8, '#4a5a3a'),
    furniture(-10, -8.6, 2.2, 0.5, 0.6, '#5a4a3a', 'bench', 'south'),
    furniture(12, -8.6, 2.2, 0.5, 0.6, '#5a4a3a', 'bench', 'south'),
    block(-24, 8.6, 0.7, 1, 0.7, '#3a3f44', 'barrel'),
    block(3, 8.6, 0.7, 1, 0.7, '#3a3f44', 'barrel'),
  ],
  ladders: [],
  lights,
  doors,
  gate: null,
  elevator,
  entry,
  stations,
  locks: [],
  signs: [
    { text: 'NORTHLINE', sub: 'OLD TOWN  /  HIGH STREET', background: '#2c3a4d', position: { x: -22, y: 4.2, z: -9.96 }, rotation: 0, width: 3.4, height: 0.9 },
    { text: 'CHEMIST', sub: 'OPEN LATE', background: '#2f5a44', position: { x: 16, y: 3.4, z: 9.96 }, rotation: Math.PI, width: 2.4, height: 0.7 },
    { text: 'NORTHLINE GENERAL', sub: 'EMERGENCY  /  1 MILE', background: '#5b1b1b', position: { x: 33.96, y: 3.0, z: 3.8 }, rotation: -Math.PI / 2, width: 3.2, height: 0.7 },
    { text: 'ACCESS ROAD', sub: 'BARRIER DOWN', background: '#6b4a12', position: { x: 33.96, y: 2.2, z: -3.8 }, rotation: -Math.PI / 2, width: 2.6, height: 0.6 },
  ],
  // The control cabinets for the hospital's access barrier.
  objective: {
    kind: 'breakers',
    label: 'Control cabinets',
    part: 'Barrier raised',
    panels: [
      { position: { x: -14, y: 1.45, z: -9.95 }, normal: { x: 0, z: 1 } },
      { position: { x: 4, y: 1.45, z: 9.95 }, normal: { x: 0, z: -1 } },
      { position: { x: 11, y: 1.45, z: -9.95 }, normal: { x: 0, z: 1 } },
    ],
  },
  navBounds: { minX: -39, maxX: 39, minZ: -15, maxZ: 15 },
  ramp: null,
  barricadeBars: [
    { x: -16, y: 0, z: 2 },
    { x: 6, y: 0, z: -3 },
  ],
  streetSpawns: [],
  playerSpawns: [{ x: -30, y: 0, z: 0 }],
  spawnYaw: -Math.PI / 2,
  streetLamps: [],
  checkpoint: { x: -30, y: 0, z: 0 },
};
