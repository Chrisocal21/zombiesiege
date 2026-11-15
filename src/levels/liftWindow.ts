import type { Elevator, Level, LevelLight, Station } from './types';
import { CREW } from './voices';
import { block, checkpointBoxes, frontage, ground, parkedCar, streetDoor } from './streetKit';
import { DOOR_HEIGHT, stationBoxes } from './wardKit';

// Act 12, Lift Window: the last floor. The airfield staging apron at first light, with one extraction
// aircraft on the ground for a short window. Three steps, in order. First the lighting: the apron's two
// floodlight cabinets are dead, and both are thrown. Then the fuel: the bowser is hooked up and held
// while it fills, the noise bringing the dead. Then the cargo: the sample case, the records case and the
// medical case are carried to the loading ramp. The scientists and survivors queue in the hangar and
// follow the crew to the ramp. The last of the dead are about the apron the whole time.
//
//   z -14 +--gap-----------------------------gap----+
//         | [CAB 1]  hangar [QUEUE]       bowser      |
//   (in)  >  apron                                    > loading ramp
//         |  [CAB 2]        (cargo)    (aircraft)    |
//   z  14 +-----gap-----------------------gap--------+
//        x -28                                    28

const APRON = '#4a4d52';
const WALL = '#5d6469';
const HANGAR = '#6e7479';
const STEEL = '#586068';
const CRATE = '#6a5a3e';
const BOWSER = '#b9402e';
const PLANE = '#8a9096';

const doors = [streetDoor(-14, -14.25, 0, 1), streetDoor(8, -14.25, 0, 1), streetDoor(-6, 14.25, 0, -1), streetDoor(16, 14.25, 0, -1)];

const elevator: Elevator = { position: { x: 28.25, y: 0, z: 0 }, normal: { x: -1, z: 0 }, width: 6, height: DOOR_HEIGHT, cabDepth: 4, cabWidth: 6 };

const stations: Station[] = [
  { kind: 'ammo', position: { x: -27.95, y: 1.25, z: 9 }, normal: { x: 1, z: 0 } },
  { kind: 'shotgun', weapon: 'ak', position: { x: 27.95, y: 1.25, z: -9 }, normal: { x: -1, z: 0 } },
];

// Circuits 0 and 1: the apron floodlights, dark until the cabinets are thrown.
const flood = (x: number, z: number, circuit?: number, flicker = false): LevelLight => ({ position: { x, y: 4.6, z }, color: '#fff3d6', intensity: 38, circuit, flicker });
const lights: LevelLight[] = [flood(-20, -6), flood(-8, 6, undefined, true), flood(4, -8, 0), flood(4, 8, 1), flood(14, -6, 0), flood(14, 6, 1), flood(22, 0, 0, true)];

export const liftWindow: Level = {
  name: 'Lift Window',
  theme: 'street',
  scenery: { north: 'trees', south: 'trees', east: 'trees', west: 'trees', skyline: false },
  atmosphere: { fog: '#4a4a52', fogNear: 16, fogFar: 80, ambient: 1.4, sky: { horizon: '#d89a6a', zenith: '#34406a', stars: 0.05 } },
  boxes: [
    ground(-28, 28, -14, 14, APRON, 'slab'),
    ...frontage('x', -14.25, -28.5, 28.5, doors, 2.8, WALL, 'wall'),
    ...frontage('x', 14.25, -28.5, 28.5, doors, 2.8, WALL, 'wall'),
    ...frontage('z', -28.25, -14, 14, [], 2.8, WALL, 'wall'),
    ...frontage('z', 28.25, -14, 14, [elevator], 4.6, HANGAR, 'building', [elevator]),
    ...checkpointBoxes(elevator, HANGAR),
    ...stationBoxes(stations),

    // Two floodlight cabinets, one on each long wall, panels facing in.
    block(-12, -12.9, 2.4, 2.2, 1.4, '#4a5a3a', 'crate'),
    block(0, 12.9, 2.4, 2.2, 1.4, '#4a5a3a', 'crate'),
    // The hangar front on the north-east, where the queue waits (open to the apron).
    block(12, -11, 12, 3.2, 0.5, HANGAR, 'wall'), block(18, -8, 0.5, 3.2, 6, HANGAR, 'wall'),
    // The bowser, across the middle of the apron, with its hookup on the west side.
    block(14, 5, 8, 2.6, 2.6, BOWSER, 'plain'), block(9.6, 5, 1.2, 2.0, 2.2, '#3a3d42', 'crate'),
    // The aircraft's fuselage at the loading ramp end, and cargo stacks.
    block(23, 8, 9, 3.0, 3.0, PLANE, 'plain'), block(23, -3, 2.6, 1.2, 2.6, CRATE, 'crate'),
    block(-4, -3, 2.0, 1.0, 1.6, STEEL, 'plain'), block(-18, 4, 1.8, 0.9, 1.4, CRATE, 'crate'), parkedCar(-6, 0, '#4a5a3a', true),
    parkedCar(-22, -8, '#4a4f55'), block(4, 0, 2.2, 1.0, 1.4, '#7a7d7e', 'plain'),
  ],
  ladders: [],
  lights,
  doors,
  gate: null,
  elevator,
  stations,
  locks: [],
  signs: [
    { text: 'STAGING APRON 2', sub: 'EVACUATION  /  LIFT WINDOW 06:10', background: '#1b5b4d', position: { x: -27.96, y: 2.6, z: -3.6 }, rotation: Math.PI / 2, width: 3.0, height: 0.7 },
  ],
  // Three steps: the floodlights, the fuel, then the three cases to the ramp.
  objective: null,
  steps: [
    {
      kind: 'breakers',
      label: 'Apron lighting',
      part: 'Lights on the apron',
      panels: [
        { position: { x: -12, y: 1.45, z: -11.88 }, normal: { x: 0, z: 1 } },
        { position: { x: 0, y: 1.45, z: 11.88 }, normal: { x: 0, z: -1 } },
      ],
    },
    {
      kind: 'charge',
      label: 'Aircraft fuel',
      part: 'Fuel for the lift',
      device: { position: { x: 9.5, y: 1.35, z: 5 }, normal: { x: -1, z: 0 } },
      room: { minX: 4, maxX: 12, minZ: 1, maxZ: 9 },
      roomName: 'Bowser',
      seconds: 40,
    },
    {
      kind: 'carry',
      label: 'Cargo case',
      part: 'The sample and the records',
      items: [{ x: 21, y: 0.5, z: -6 }, { x: -16, y: 0.5, z: 6 }, { x: -2, y: 0.5, z: -6 }],
      dropoff: { x: 25.5, y: 0.5, z: 0 },
    },
  ],
  // A sweep: the apron's dead stand about it, and the fuel hold calls more.
  flow: { kind: 'sweep', loud: 3, first: 5 },
  residents: [
    { x: -20, z: 2, yaw: 0.4, roam: 2 }, { x: -8, z: -8, yaw: -2, roam: 3 }, { x: 0, z: 4, yaw: 1.2 }, { x: 6, z: -4, yaw: -0.6 },
    { x: 10, z: 10, yaw: 2.4, roam: 2 }, { x: 18, z: 2, yaw: 3 }, { x: 24, z: -9, yaw: -1.6 },
  ],
  // The people in the hangar queue: they follow the crew to the loading ramp.
  rescue: {
    name: 'The hangar queue',
    people: [
      { x: 14, z: -9.5, yaw: 3.0, look: 'diner' },
      { x: 16, z: -9.8, yaw: 3.1, look: 'cook' },
      { x: 15, z: -8.6, yaw: -2.8, look: 'waiter' },
    ],
    exit: { minX: 24.5, maxX: 27.5, minZ: -3, maxZ: 3 },
    points: 200,
    log: { title: 'The hangar queue', lines: ['The scientists and the families waiting for the lift came out of the hangar behind the crew and went up the ramp in the first light.', 'The record went with them, and so did the sample.'] },
    line: 'The hangar queue, on the ramp',
  },
  notes: [
    {
      position: { x: -18, y: 0.92, z: 4 },
      what: 'lift schedule',
      title: 'Lift schedule',
      lines: [
        'STAGING APRON 2  /  LIFT WINDOW 06:10 to 06:40',
        'One aircraft, one pass. Floodlights on circuit 4. Fuel from the bowser, the hookup is on its west side.',
        'People first. The sample and the records ride with the people. Everything else is left on the apron.',
      ],
    },
  ],
  cues: [
    { on: 'start', at: 1.5, speaker: CREW, text: 'First light. The apron. We have one lift and a short window.' },
    { on: 'start', at: 8, speaker: CREW, text: 'Lights, then fuel, then the cases. Bring the queue to the ramp. People first.', seconds: 7 },
    { on: 'step', step: 0, at: 0.6, speaker: CREW, text: 'Lights are on. Get the bowser started. It is loud, and they will come.' },
    { on: 'step', step: 1, at: 0.6, speaker: CREW, text: 'Fuel is in. Now the cases, the sample first, and the people to the ramp.' },
    { on: 'done', at: 0.6, speaker: CREW, text: 'Wheels up in a minute. The record goes with us, and so do they. That is the regional lift.' },
  ],
  navBounds: { minX: -33, maxX: 33, minZ: -19, maxZ: 19 },
  ramp: null,
  barricadeBars: [],
  streetSpawns: [],
  playerSpawns: [{ x: -24, y: 0, z: 0 }],
  spawnYaw: -Math.PI / 2,
  streetLamps: [],
  checkpoint: { x: -24, y: 0, z: 0 },
};
