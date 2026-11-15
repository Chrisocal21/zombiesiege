import type { Elevator, Level, LevelLight, Station } from './types';
import { CREW, HOSPITAL } from './voices';
import { block, FRONT_HEIGHT, frontage, ground, parkedCar, streetDoor, checkpointBoxes } from './streetKit';
import { DOOR_HEIGHT, stationBoxes } from './wardKit';

// Prologue P01, Breakdown (Mile 9): the ambulance is out of fuel on a country road after the day's earlier
// rescues. At first it is quiet. The crew looks round the road for a working radio, and once it is found the
// hospital's call comes through, and with it the dead from the farm tracks. Then the way on is the gate east.
//
//   z -10 +--[track]----------[track]--------------------------+
//         |  verge                                              |
//         |  road   AMBULANCE (dry)   (wrecks, police car)  GATE >
//         |  verge                                              |
//   z  10 +---------------[track]-------------------------------+
//        x -28                                                28

const HEDGE = '#2c4426';
const FENCE = '#5a4f40';

const doors = [streetDoor(-6, -10.25, 0, 1), streetDoor(14, -10.25, 0, 1), streetDoor(4, 10.25, 0, -1)];

const elevator: Elevator = { position: { x: 28.25, y: 0, z: 0 }, normal: { x: -1, z: 0 }, width: 6, height: DOOR_HEIGHT, cabDepth: 4, cabWidth: 6 };

const stations: Station[] = [{ kind: 'ammo', position: { x: -20, y: 1.25, z: -9.95 }, normal: { x: 0, z: 1 } }];

const lamp = (x: number, z: number, flicker = false): LevelLight => ({ position: { x, y: 3.8, z }, color: '#ffd29a', intensity: 22, flicker });
const lights: LevelLight[] = [lamp(-22, 8.4), lamp(-8, -8.4), lamp(6, 8.4, true), lamp(18, -8.4), lamp(24, 8.4)];

export const breakdown: Level = {
  name: 'Breakdown',
  theme: 'street',
  scenery: { north: 'trees', south: 'houses', west: 'trees', east: 'trees' },
  exitGate: true,
  atmosphere: { fog: '#3a3028', fogNear: 26, fogFar: 100, ambient: 1.5, sky: { horizon: '#9a6040', zenith: '#1c2236', stars: 0.1 } },
  boxes: [
    ground(-28, 28, -6, 6, '#2e3034', 'slab'),
    ground(-28, 28, -10, -6, '#5d6842', 'plain'),
    ground(-28, 28, 6, 10, '#5d6842', 'plain'),
    ...frontage('x', -10.25, -28.5, 28.5, doors, FRONT_HEIGHT, HEDGE, 'wall'),
    ...frontage('x', 10.25, -28.5, 28.5, doors, FRONT_HEIGHT, FENCE, 'wall'),
    ...frontage('z', 28.25, -10, 10, [elevator], FRONT_HEIGHT, HEDGE, 'wall', [elevator]),
    ...checkpointBoxes(elevator, HEDGE),
    ...frontage('z', -28.25, -10, 10, [], FRONT_HEIGHT, HEDGE, 'wall'),
    ...stationBoxes(stations),

    // The crew's ambulance, dry, and what is left on the road: a police car with its door open, wrecks, hay bales.
    { position: { x: -20, y: 1.275, z: -2 }, size: { x: 6.2, y: 2.55, z: 2.2 }, color: '#d6ddd7', surface: 'van', vehicleRole: 'ambulance' },
    parkedCar(-8, 4.4, '#2f4a5c'),
    // The police car, burned out, with the radio still working.
    { ...parkedCar(6, -4.4, '#2b3a63'), size: { x: 4.9, y: 1.5, z: 2.0 }, position: { x: 6, y: 0.75, z: -4.4 }, vehicleRole: 'police' },
    parkedCar(14, 4.4, '#6b2a2a', true),
    parkedCar(22, -4.4, '#a8782f'),
    block(-2, 0.4, 3, 1.1, 0.8, '#8a8d90'),
    block(10, -1, 0.8, 1.1, 3, '#8a8d90'),
    block(-14, 7.4, 1.8, 1.1, 1.2, '#b89a4a', 'cartons'),
    block(18, 7.6, 1.8, 1.1, 1.2, '#b89a4a', 'cartons'),
    block(-24, -7.4, 1.6, 0.8, 0.8, '#4a5a3a'),
  ],
  ladders: [],
  lights,
  doors,
  gate: null,
  elevator,
  stations,
  locks: [],
  signs: [
    { text: 'NORTHLINE', sub: '9 MILES  /  GENERAL HOSPITAL', background: '#2c3a4d', position: { x: -12, y: 4.2, z: -9.96 }, rotation: 0, width: 3.4, height: 0.9 },
    { text: 'FARM TRACK', sub: 'PRIVATE', background: '#3a4a2a', position: { x: 8, y: 3.2, z: 9.96 }, rotation: Math.PI, width: 2.4, height: 0.7 },
    { text: 'FIELD GATE', sub: 'ON FOOT FROM HERE', background: '#5b1b1b', position: { x: 27.96, y: 3.0, z: 3.6 }, rotation: -Math.PI / 2, width: 2.8, height: 0.6 },
  ],
  // At first it is quiet: a few of the dead stand about the road, asleep on their feet, and the crew picks a
  // way between them to the police car. Once the radio is found the hospital's call is heard, and with it the
  // farm tracks empty onto the road behind them. From then on the crew has to run for the gate.
  flow: { kind: 'sweep', loud: 3, first: 4, from: [0, 1, 2], then: { every: 3, max: 10 } },
  residents: [
    { x: -4, z: -3, yaw: 0.6 }, { x: 1, z: 2.5, yaw: 2.4 }, { x: 7, z: 2, yaw: -1 }, { x: 12, z: -2.2, yaw: 3 },
    { x: 17, z: 0.4, yaw: 1.2 }, { x: 21, z: 2.6, yaw: -2.2 }, { x: 25, z: -1.2, yaw: 0.2 },
  ],
  cues: [
    { on: 'start', at: 1.5, speaker: CREW, text: 'Dry. Not a drop. The police car up the road might still have a radio.' },
    { on: 'start', at: 9, speaker: CREW, text: 'Slowly. Some of them are standing out there. They have not noticed us.', seconds: 5.5 },
    { on: 'done', at: 0.5, speaker: HOSPITAL, text: 'All units, all units. Northline General is still receiving. Come in on foot if you have to.', seconds: 6 },
    { on: 'done', at: 7, speaker: CREW, text: 'Hear that? And they heard it too. The gate. Run.', seconds: 4.5 },
  ],
  // The radio in the police car: the hospital's call is what sends them on.
  objective: { kind: 'keycard', label: 'Police radio', part: 'Hospital call', position: { x: 2, y: 1.0, z: -7.2 } },
  navBounds: { minX: -33, maxX: 33, minZ: -15, maxZ: 15 },
  ramp: null,
  barricadeBars: [
    { x: -10, y: 0, z: 2 },
    { x: 12, y: 0, z: 3 },
  ],
  streetSpawns: [],
  playerSpawns: [{ x: -15, y: 0, z: 0.5 }],
  spawnYaw: -Math.PI / 2,
  streetLamps: [],
  checkpoint: { x: -15, y: 0, z: 0.5 },
};
