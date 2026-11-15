import type { Elevator, Level, LevelLight, Station } from './types';
import { CREW } from './voices';
import { block, checkpointBoxes, frontage, ground, parkedCar, streetDoor } from './streetKit';
import { DOOR_HEIGHT, stationBoxes } from './wardKit';

// Act 7, False Instructions: a relay station still repeating a bad instruction (go to the old stadium, it
// is safe) to every radio in the region. Three steps. Trace the source: the relay log on the desk shows who
// set the loop. Cut the loop: two cabinets feed the relay, and throwing both stops the false broadcast.
// Send the correction: the true instruction goes out from the transmitter rack, a held stand while the
// dead gather at the noise. There is no one to argue with here; the work is the correction.
//
//   z -12 +--gap--------------------gap-------------+
//         | [CAB 1]  desk              [TRANSMITTER] |
//   (in)  >  yard                                      > road out
//         |                  [CAB 2]  (vans)         |
//   z  12 +--------gap------------------gap----------+
//        x -26                                    26

const WALL = '#5b6068';
const GROUND = '#4a5040';
const DESK = '#6a5a3e';
const STEEL = '#586068';
const ROAD = '#2a2d32';

const doors = [streetDoor(-14, -12.25, 0, 1), streetDoor(6, -12.25, 0, 1), streetDoor(-6, 12.25, 0, -1), streetDoor(14, 12.25, 0, -1)];

const elevator: Elevator = { position: { x: 26.25, y: 0, z: 0 }, normal: { x: -1, z: 0 }, width: 6, height: DOOR_HEIGHT, cabDepth: 4, cabWidth: 6 };

const stations: Station[] = [
  { kind: 'ammo', position: { x: -25.95, y: 1.25, z: 8 }, normal: { x: 1, z: 0 } },
  { kind: 'shotgun', weapon: 'ak', position: { x: 25.95, y: 1.25, z: -8 }, normal: { x: -1, z: 0 } },
];

const lamp = (x: number, z: number, flicker = false): LevelLight => ({ position: { x, y: 3.4, z }, color: '#d8e0ea', intensity: 22, flicker, post: true });
const lights: LevelLight[] = [lamp(-20, 0), lamp(-8, 6, true), lamp(2, -6), lamp(10, 6, true), lamp(20, -2)];

export const falseInstructions: Level = {
  name: 'False Instructions',
  theme: 'street',
  exitGate: true,
  scenery: { north: 'trees', south: 'trees', east: 'trees', west: 'trees', skyline: false },
  atmosphere: { fog: '#2c3036', fogNear: 10, fogFar: 52, ambient: 1.0, sky: { horizon: '#5a6270', zenith: '#10141c', stars: 0.15 } },
  boxes: [
    ground(-26, 26, -12, 12, GROUND, 'plain'),
    ground(-26, 26, -2, 2, ROAD, 'slab'),
    ...frontage('x', -12.25, -26.5, 26.5, doors, 2.8, WALL, 'wall'),
    ...frontage('x', 12.25, -26.5, 26.5, doors, 2.8, WALL, 'wall'),
    ...frontage('z', -26.25, -12, 12, [], 2.8, WALL, 'wall'),
    ...frontage('z', 26.25, -12, 12, [elevator], 4.6, '#6e7479', 'building', [elevator]),
    ...checkpointBoxes(elevator, '#6e7479'),
    ...stationBoxes(stations),

    // The two relay cabinets, panels facing in.
    block(-14, -10.9, 2.4, 2.2, 1.4, '#4a5a3a', 'crate'),
    block(0, 10.9, 2.4, 2.2, 1.4, '#4a5a3a', 'crate'),
    // The desk with the relay log, and cover round the yard.
    block(-22, 2, 1.8, 0.9, 1.4, DESK, 'crate'), block(-6, -6, 2.0, 0.9, 1.4, STEEL, 'plain'), block(8, 5, 2.0, 1.0, 1.6, DESK, 'crate'),
    // The transmitter rack at the east end, with its send device on the face.
    block(18, -8, 5, 2.8, 2.4, STEEL, 'plain'), block(18, 8, 4, 1.2, 1.4, STEEL, 'plain'),
    parkedCar(-12, 4, '#4a4f55'), parkedCar(4, -4, '#7a3030', true),
  ],
  ladders: [],
  lights,
  doors,
  gate: null,
  elevator,
  stations,
  locks: [],
  signs: [
    { text: 'RELAY 7', sub: 'REPEATING  /  DO NOT TRUST', background: '#5b1b1b', position: { x: -25.96, y: 2.4, z: -3.6 }, rotation: Math.PI / 2, width: 3.2, height: 0.7 },
  ],
  objective: null,
  steps: [
    { kind: 'keycard', label: 'Relay log', part: 'Who set the loop', position: { x: -22, y: 0.95, z: 2 } },
    {
      kind: 'breakers',
      label: 'Cut the loop',
      part: 'Stop the false broadcast',
      panels: [
        { position: { x: -14, y: 1.45, z: -9.88 }, normal: { x: 0, z: 1 } },
        { position: { x: 0, y: 1.45, z: 9.88 }, normal: { x: 0, z: -1 } },
      ],
    },
    {
      kind: 'charge',
      label: 'Send the correction',
      part: 'The true instruction, out',
      device: { position: { x: 18, y: 1.35, z: -6.58 }, normal: { x: 0, z: 1 } },
      room: { minX: 13, maxX: 23, minZ: -6.5, maxZ: 0 },
      roomName: 'Transmitter',
      seconds: 35,
    },
  ],
  flow: { kind: 'sweep', loud: 4, first: 5 },
  roamers: 2,
  residents: [
    { x: -18, z: -2, yaw: 0.4, roam: 2 }, { x: -9, z: 3, yaw: -2 }, { x: 0, z: -4, yaw: 1.2 },
    { x: 6, z: 2, yaw: -0.6 }, { x: 12, z: -3, yaw: 2.4 }, { x: 20, z: 4, yaw: 3 },
  ],
  notes: [
    {
      position: { x: -22, y: 0.92, z: 2 },
      what: 'relay log',
      title: 'Relay log',
      lines: [
        'RELAY 7  /  OPERATOR LOG',
        'Loop set at 02:40 from the regional desk. Not ours. Instruction: go to the old stadium, it is safe, bring everyone.',
        'The stadium is not safe. Nobody is checking that the loop is true.',
        'Cut the loop at the two cabinets. Then send the right instruction from the rack.',
      ],
    },
  ],
  cues: [
    { on: 'start', at: 1.5, speaker: CREW, text: 'Relay 7. It is repeating an instruction to every radio in the region, and the instruction is wrong.' },
    { on: 'start', at: 8, speaker: CREW, text: 'Read the log, cut the loop at both cabinets, then send the right one from the rack. It is loud.', seconds: 7 },
    { on: 'step', step: 0, at: 0.6, speaker: CREW, text: 'The loop came from the regional desk, not here. Cut it at the cabinets.' },
    { on: 'step', step: 1, at: 0.6, speaker: CREW, text: 'The false loop is dead. Get to the rack and send the true instruction. They will come.' },
    { on: 'done', at: 0.6, speaker: CREW, text: 'The correction is out. Whoever was walking to the stadium has been told to turn round.' },
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
