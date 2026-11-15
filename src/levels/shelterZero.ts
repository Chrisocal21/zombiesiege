import type { Elevator, Level, LevelLight, Lock, Station } from './types';
import { CREW } from './voices';
import { block, checkpointBoxes, frontage, ground, parkedCar, streetDoor } from './streetKit';
import { DOOR_HEIGHT, stationBoxes } from './wardKit';

// Act 10, Shelter Zero: the old school, where the street was sent. Its generator failed in the night and
// the shelter is dark. The crew restores the emergency lighting (two cabinets, and the lights on those
// circuits come up), finds the people shut in the classrooms, and opens the secured exit: the fire door
// at the east end, held shut by the shelter's own lock, which costs points to force. Everyone found
// follows the crew out. The register on the wall says who was here.
//
//   z -12 +--gap--------------------gap-------------+
//         | [CAB 1]   classrooms                     |
//   (in)  >  hall                      X (secured)    > way out
//         |                  [CAB 2]  (desks)        |
//   z  12 +--------gap------------------gap----------+
//        x -26                                    26
//   X = secured exit (forced, 120 points)

const WALL = '#6f6a5e';
const HALL = '#8a8a7c';
const DESK = '#6a5a3e';
const STEEL = '#586068';
const CHALK = '#3a4a44';

const doors = [streetDoor(-14, -12.25, 0, 1), streetDoor(4, -12.25, 0, 1), streetDoor(-4, 12.25, 0, -1), streetDoor(10, 12.25, 0, -1)];

const exit: Lock = { position: { x: 13.75, y: 0, z: 0 }, normal: { x: -1, z: 0 }, width: 2.4, height: DOOR_HEIGHT, cost: 120, label: 'Secured exit' };

const elevator: Elevator = { position: { x: 26.25, y: 0, z: 0 }, normal: { x: -1, z: 0 }, width: 6, height: DOOR_HEIGHT, cabDepth: 4, cabWidth: 6 };

const stations: Station[] = [
  { kind: 'ammo', position: { x: -25.95, y: 1.25, z: 8 }, normal: { x: 1, z: 0 } },
];

// Circuits 0 and 1 are the emergency lighting: out until both cabinets are thrown.
const lamp = (x: number, z: number, circuit?: number, flicker = false): LevelLight => ({ position: { x, y: 3.2, z }, color: '#fff0d0', intensity: 26, circuit, flicker });
const lights: LevelLight[] = [lamp(-20, 0, undefined, true), lamp(-12, -6, 0), lamp(-12, 6, 1), lamp(-2, -6, 0), lamp(-2, 6, 1), lamp(8, 0, 0), lamp(20, 0, 1)];

export const shelterZero: Level = {
  name: 'Shelter Zero',
  theme: 'street',
  exitGate: true,
  scenery: { north: 'trees', south: 'trees', east: 'trees', west: 'trees', skyline: false },
  atmosphere: { fog: '#2a2a30', fogNear: 8, fogFar: 44, ambient: 0.9, sky: { horizon: '#4a4a56', zenith: '#101420', stars: 0.2 } },
  boxes: [
    ground(-26, 26, -12, 12, HALL, 'floor'),
    ...frontage('x', -12.25, -26.5, 26.5, doors, 3.0, WALL, 'wall'),
    ...frontage('x', 12.25, -26.5, 26.5, doors, 3.0, WALL, 'wall'),
    ...frontage('z', -26.25, -12, 12, [], 3.0, WALL, 'wall'),
    // The secured exit's wall near the east end: the fire door is its only gap.
    ...frontage('z', 13.75, -12, 12, [exit], 3.2, '#5d5a52', 'wall', [exit]),
    ...frontage('z', 26.25, -12, 12, [elevator], 4.6, '#6e7479', 'building', [elevator]),
    ...checkpointBoxes(elevator, '#6e7479'),
    ...stationBoxes(stations),

    // The two generator cabinets, panels facing the hall.
    block(-14, -10.9, 2.4, 2.2, 1.4, '#4a5a3a', 'crate'),
    block(0, 10.9, 2.4, 2.2, 1.4, '#4a5a3a', 'crate'),
    // Classroom partitions on the north and south sides, with open doorways, and desks.
    block(-6, -8, 0.3, 2.6, 6, WALL, 'wall'), block(6, -8, 0.3, 2.6, 6, WALL, 'wall'),
    block(-6, 8, 0.3, 2.6, 6, WALL, 'wall'), block(6, 8, 0.3, 2.6, 6, WALL, 'wall'),
    block(-2, -9, 2.0, 0.8, 1.0, DESK, 'crate'), block(2, 9.5, 2.0, 0.8, 1.0, DESK, 'crate'), block(-10, 5, 1.6, 0.8, 1.0, DESK, 'crate'),
    block(0, -11.7, 3, 1.4, 0.3, CHALK, 'plain'),
    // The register's table by the hall door, and a wrecked bus outside.
    block(-22, -5, 1.4, 0.8, 1.0, DESK, 'crate'), parkedCar(-19, 8, '#7a7d7e', true), block(10, 3, 1.8, 0.9, 1.4, STEEL, 'plain'),
  ],
  ladders: [],
  lights,
  doors,
  gate: null,
  elevator,
  stations,
  locks: [exit],
  signs: [
    { text: 'OLD TOWN SCHOOL', sub: 'SHELTER  /  GENERATOR FAILED', background: '#5b1b1b', position: { x: -25.96, y: 2.6, z: -3.6 }, rotation: Math.PI / 2, width: 3.0, height: 0.7 },
  ],
  // The emergency lighting: both cabinets, in either order.
  objective: {
    kind: 'breakers',
    label: 'Emergency lighting',
    part: 'Light in the shelter',
    panels: [
      { position: { x: -14, y: 1.45, z: -9.88 }, normal: { x: 0, z: 1 } },
      { position: { x: 0, y: 1.45, z: 9.88 }, normal: { x: 0, z: -1 } },
    ],
  },
  flow: { kind: 'sweep', loud: 3, first: 5 },
  roamers: 3,
  residents: [
    { x: -20, z: 2, yaw: 0.4, roam: 2 }, { x: -9, z: 0, yaw: -2, roam: 2 }, { x: 0, z: -3, yaw: 1.2 },
    { x: 3, z: 3, yaw: -0.6 }, { x: 10, z: -1, yaw: 2.4 },
  ],
  // The people shut in the classrooms: they follow the crew through the exit to the way out.
  rescue: {
    name: 'The classrooms',
    people: [
      { x: -3, z: -8.5, yaw: 3.0, look: 'diner' },
      { x: 3, z: 8.5, yaw: 0.2, look: 'cook' },
      { x: 4, z: -7.6, yaw: -0.4, look: 'waiter' },
    ],
    exit: { minX: 21, maxX: 25.5, minZ: -3, maxZ: 3 },
    points: 200,
    log: { title: 'The classrooms', lines: ['They had been shut in the classrooms since the generator failed, with the doors held shut from outside by whoever was left.', 'One of them had the register, and said the Ward family went on the second bus to the airfield.'] },
    line: 'Three people out of the classrooms, through the exit',
  },
  notes: [
    {
      position: { x: -22, y: 0.92, z: -5 },
      what: 'shelter register',
      title: 'Shelter register',
      lines: [
        'OLD TOWN SCHOOL  /  SHELTER REGISTER',
        'Ward, Sam (child), fever. Ward, Dana. Ward, Eli. Second bus to the airfield, departed 22:40.',
        'Those who are here are the ones who stayed to keep the doors shut. The generator went at 04:00.',
        'The secured exit is the fire door. It was locked from inside so nobody would open it in the dark.',
      ],
    },
  ],
  cues: [
    { on: 'start', at: 1.5, speaker: CREW, text: 'The school. The shelter is dark. The generator failed in the night.' },
    { on: 'start', at: 8, speaker: CREW, text: 'Two generator cabinets, then find the ones shut in the classrooms. The fire door will cost to force.', seconds: 7 },
    { on: 'done', at: 0.6, speaker: CREW, text: 'Lights are on. The register says the Wards went on the second bus, to the airfield. We have a place to look.' },
  ],
  navBounds: { minX: -31, maxX: 31, minZ: -17, maxZ: 17 },
  ramp: null,
  barricadeBars: [],
  streetSpawns: [],
  playerSpawns: [{ x: -23, y: 0, z: 0 }],
  spawnYaw: -Math.PI / 2,
  streetLamps: [],
  checkpoint: { x: -23, y: 0, z: 0 },
};
