import type { Elevator, Level, LevelLight, Station } from './types';
import { block, FRONT_HEIGHT, frontage, ground, parkedCar, streetDoor } from './streetKit';
import { DOOR_HEIGHT, furniture, stationBoxes } from './wardKit';

// Prologue P02, Roadside Station (Mile 7): a petrol station on the road, with no fuel left. The crew's alarm
// has drawn the dead. Survivors are trapped here and a delivery van is their way out, but it needs time to
// start. The crew holds the forecourt while the van warms, then goes on by the footpath gate at the east end.
//
//   z -10 +--[motel]---------[diner]-----------------------------+
//         |  verge                                                |
//         |  road   AMBULANCE (dead)  (cars, barriers)       GATE >  (on foot)
//         |  verge                                                |
//   z  10 +---------[farm shop]--------------[shop]---------------+
//        x -28                                                  28

const BRICK = '#7d6a5a';
const HEDGE = '#2c4426';

const doors = [streetDoor(-8, -10.25, 0, 1), streetDoor(10, -10.25, 0, 1), streetDoor(-2, 10.25, 0, -1), streetDoor(18, 10.25, 0, -1)];

const elevator: Elevator = { position: { x: 28.25, y: 0, z: 0 }, normal: { x: -1, z: 0 }, width: 2.2, height: DOOR_HEIGHT, cabDepth: 3, cabWidth: 3 };

const stations: Station[] = [
  { kind: 'ammo', position: { x: -22, y: 1.25, z: -9.95 }, normal: { x: 0, z: 1 } },
  { kind: 'shotgun', position: { x: 4, y: 1.25, z: 9.95 }, normal: { x: 0, z: -1 } },
];

const lamp = (x: number, z: number, flicker = false): LevelLight => ({ position: { x, y: 3.8, z }, color: '#ffb877', intensity: 28, flicker });
const lights: LevelLight[] = [lamp(-24, 8.4), lamp(-14, -8.4, true), lamp(0, 8.4), lamp(6, -8.4), lamp(14, 8.4), lamp(22, -8.4), lamp(23, 8.4)];

export const deadStop: Level = {
  name: 'Roadside Station',
  theme: 'street',
  exitGate: true,
  atmosphere: { fog: '#2a2a30', fogNear: 22, fogFar: 90, ambient: 1.25, sky: { horizon: '#5a3a3a', zenith: '#0c0e1a', stars: 0.35 } },
  boxes: [
    ground(-28, 28, -6, 6, '#2a2d32', 'slab'),
    ground(-28, 28, -10, -6, '#55603f', 'plain'),
    ground(-28, 28, 6, 10, '#55603f', 'plain'),
    ...frontage('x', -10.25, -28.5, 28.5, doors, FRONT_HEIGHT, BRICK),
    ...frontage('x', 10.25, -28.5, 28.5, doors, FRONT_HEIGHT, HEDGE, 'wall'),
    ...frontage('z', 28.25, -10, 10, [elevator], FRONT_HEIGHT, HEDGE, 'wall'),
    ...frontage('z', -28.25, -10, 10, [], FRONT_HEIGHT, HEDGE, 'wall'),
    ...stationBoxes(stations),

    // The crew's ambulance, dead in the road, and the cars left on the road around it.
    { position: { x: -20, y: 1.175, z: -2.2 }, size: { x: 4.9, y: 2.35, z: 1.98 }, color: '#d6ddd7', surface: 'van', vehicleRole: 'ambulance' },
    parkedCar(-8, -4.4, '#2f4a5c'),
    parkedCar(4, 4.4, '#6b2a2a'),
    parkedCar(14, -4.4, '#a8782f'),
    parkedCar(23, 4.4, '#c5c8c5', true),
    parkedCar(-14, 4.4, '#4a4f55'),
    // Roadworks barriers and a bin or two.
    block(-1, 0.5, 3, 1.1, 0.8, '#8a8d90'),
    block(9, -1.2, 0.8, 1.1, 3, '#8a8d90'),
    block(18, 1, 3, 1.1, 0.8, '#8a8d90'),
    block(-24, 7.2, 1.6, 0.8, 0.8, '#4a5a3a'),
    block(25, -7.2, 1.6, 0.8, 0.8, '#4a5a3a'),
    furniture(0, -8.6, 2.2, 0.5, 0.6, '#5a4a3a', 'bench', 'south'),
    block(12, 8.6, 0.7, 1, 0.7, '#3a3f44', 'barrel'),
  ],
  ladders: [],
  lights,
  doors,
  gate: null,
  elevator,
  stations,
  locks: [],
  signs: [
    { text: 'MILE 9', sub: 'NORTHLINE GENERAL  /  9 MILES', background: '#2c3a4d', position: { x: -14, y: 4.2, z: -9.96 }, rotation: 0, width: 3.4, height: 0.9 },
    { text: 'PETROL STATION', sub: 'NO FUEL', background: '#6b4a12', position: { x: 2, y: 3.4, z: -9.96 }, rotation: 0, width: 2.8, height: 0.8 },
    { text: 'FARM SHOP', sub: 'CLOSED', background: '#3a4a2a', position: { x: 8, y: 3.2, z: 9.96 }, rotation: Math.PI, width: 2.4, height: 0.7 },
    { text: 'FOOTPATH GATE', sub: 'ON FOOT FROM HERE', background: '#5b1b1b', position: { x: 27.96, y: 3.0, z: 3.6 }, rotation: -Math.PI / 2, width: 2.8, height: 0.6 },
  ],
  // Whatever the crew can carry from the dead ambulance to the gate: the gear that comes with them on foot.
  objective: {
    kind: 'charge',
    label: 'Delivery van',
    part: 'Survivors away',
    device: { position: { x: -3, y: 0, z: -9.95 }, normal: { x: 0, z: 1 } },
    room: { minX: -10, maxX: 6, minZ: -9.8, maxZ: 2 },
    roomName: 'The forecourt',
    seconds: 45,
  },
  navBounds: { minX: -33, maxX: 33, minZ: -15, maxZ: 15 },
  ramp: null,
  barricadeBars: [
    { x: -10, y: 0, z: 2 },
    { x: 12, y: 0, z: -3 },
  ],
  streetSpawns: [],
  playerSpawns: [{ x: -15, y: 0, z: 0.5 }],
  spawnYaw: -Math.PI / 2,
  streetLamps: [],
  checkpoint: { x: -15, y: 0, z: 0.5 },
};
