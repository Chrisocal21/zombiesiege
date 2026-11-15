import type { Elevator, Level, LevelLight, Station } from './types';
import { CREW } from './voices';
import { block, checkpointBoxes, frontage, ground, parkedCar, streetDoor } from './streetKit';
import { DOOR_HEIGHT, stationBoxes } from './wardKit';

// Act 12, Perimeter Fall: an overrun military perimeter on the road to the airfield. Three zones, west to
// east. The west flank: a sandbagged bunker where the last defenders are holding, and the crew helps them
// by holding the area round it while they pull back. The broken checkpoint in the middle: wrecks and
// barriers across the road, crossed on foot. The emergency gate at the east end: its control cabinet is
// on the south wall, and throwing it opens the way on to the staging apron. Distant fighting is only noise
// and light in the dark; the zones are small.
//
//   z -12 +--gap--------------------gap-------------+
//         | [BUNKER]   checkpoint wrecks             |
//   (in)  >  west flank   (barriers)      gate        > staging apron
//         |                      [GATE CABINET]       |
//   z  12 +--------gap------------------gap----------+
//        x -28                                    28

const CONCRETE = '#7a7d7e';
const FENCE = '#58605c';
const SAND = '#8a7a58';
const KHAKI = '#5a5f48';
const STEEL = '#586068';
const ROAD = '#2a2d32';

const doors = [streetDoor(-12, -12.25, 0, 1), streetDoor(8, -12.25, 0, 1), streetDoor(-2, 12.25, 0, -1), streetDoor(18, 12.25, 0, -1)];

const elevator: Elevator = { position: { x: 28.25, y: 0, z: 0 }, normal: { x: -1, z: 0 }, width: 6, height: DOOR_HEIGHT, cabDepth: 4, cabWidth: 6 };

const stations: Station[] = [
  { kind: 'ammo', position: { x: -27.95, y: 1.25, z: 8 }, normal: { x: 1, z: 0 } },
  { kind: 'shotgun', weapon: 'ak', position: { x: 27.95, y: 1.25, z: -8 }, normal: { x: -1, z: 0 } },
];

const flare = (x: number, z: number, flicker = false): LevelLight => ({ position: { x, y: 4.2, z }, color: '#ffb878', intensity: 30, flicker });
const lights: LevelLight[] = [flare(-20, -6), flare(-10, 6, true), flare(0, -4, true), flare(10, 6), flare(20, -4, true), flare(24, 6)];

export const perimeterFall: Level = {
  name: 'Perimeter Fall',
  theme: 'street',
  exitGate: true,
  scenery: { north: 'trees', south: 'trees', east: 'trees', west: 'trees', skyline: false },
  atmosphere: { fog: '#3a3532', fogNear: 12, fogFar: 62, ambient: 1.1, sky: { horizon: '#9a5a3a', zenith: '#1a1a2c', stars: 0.1 } },
  boxes: [
    ground(-28, 28, -12, 12, CONCRETE, 'slab'),
    ground(-28, 28, -2, 2, ROAD, 'slab'),
    ...frontage('x', -12.25, -28.5, 28.5, doors, 2.8, FENCE, 'wall'),
    ...frontage('x', 12.25, -28.5, 28.5, doors, 2.8, FENCE, 'wall'),
    ...frontage('z', -28.25, -12, 12, [], 2.8, FENCE, 'wall'),
    ...frontage('z', 28.25, -12, 12, [elevator], 4.6, '#6e7479', 'building', [elevator]),
    ...checkpointBoxes(elevator, '#6e7479'),
    ...stationBoxes(stations),

    // The west flank's bunker, on the north side, with sandbags in front and the hold device on its face.
    block(-14, -9, 5, 2.4, 2.4, KHAKI, 'plain'),
    block(-18, -5, 3, 0.9, 0.8, SAND, 'plain'), block(-10, -5, 3, 0.9, 0.8, SAND, 'plain'),
    // The broken checkpoint: barriers and wrecks across the road, with gaps to cross through.
    block(0, -6, 1.0, 1.0, 5, CONCRETE, 'plain'), block(0, 6, 1.0, 1.0, 5, CONCRETE, 'plain'),
    parkedCar(-3, 0.5, '#4a5a3a', true), parkedCar(4, -1.2, '#7a3030'), block(2, 3.6, 1.8, 1.0, 1.4, STEEL, 'plain'),
    // The gate control cabinet on the south wall, panel facing the apron road.
    block(14, 10.9, 2.4, 2.2, 1.4, '#4a5a3a', 'crate'),
    // The emergency gate's posts and rubble round it.
    block(18, -6, 1.6, 1.0, 1.4, CONCRETE, 'plain'), block(22, 6, 2.0, 1.0, 1.6, SAND, 'plain'), parkedCar(-22, 6, '#4a4f55'),
  ],
  ladders: [],
  lights,
  doors,
  gate: null,
  elevator,
  stations,
  locks: [],
  signs: [
    { text: 'PERIMETER 3', sub: 'MILITARY  /  CHECKPOINT BREACHED', background: '#5b1b1b', position: { x: -27.96, y: 2.6, z: -3.6 }, rotation: Math.PI / 2, width: 3.0, height: 0.7 },
    { text: 'EMERGENCY GATE', sub: 'CONTROL  /  SOUTH WALL', background: '#1b5b4d', position: { x: 14, y: 3.2, z: 10.18 }, rotation: Math.PI, width: 2.2, height: 0.5 },
  ],
  // Two steps: hold the flank while the defenders withdraw, then open the emergency gate.
  objective: null,
  steps: [
    {
      kind: 'charge',
      label: 'Cover the west flank',
      part: 'Cover the defenders',
      stand: 'Start it at the bunker board. They will come',
      device: { position: { x: -14, y: 1.35, z: -7.78 }, normal: { x: 0, z: 1 } },
      room: { minX: -19, maxX: -9, minZ: -7.7, maxZ: -1 },
      roomName: 'West bunker',
      seconds: 35,
    },
    {
      kind: 'breakers',
      label: 'Emergency gate',
      part: 'Open the gate',
      panels: [{ position: { x: 14, y: 1.45, z: 9.88 }, normal: { x: 0, z: -1 } }],
    },
  ],
  flow: { kind: 'sweep', loud: 3, first: 5 },
  residents: [
    { x: -22, z: 0, yaw: 0.4, roam: 2 }, { x: -6, z: -2, yaw: -2, roam: 3 }, { x: -4, z: 3, yaw: 1.2 }, { x: 6, z: 1, yaw: -0.6 },
    { x: 8, z: -8, yaw: 2.2, roam: 2 }, { x: 12, z: 3, yaw: 3 }, { x: 20, z: 0, yaw: -1.6 }, { x: 24, z: -8, yaw: 0.8 },
  ],
  notes: [
    {
      position: { x: -24, y: 0.92, z: 6 },
      what: 'field order',
      title: 'Field order',
      lines: [
        'PERIMETER 3  /  WITHDRAWAL ORDER',
        'West bunker holds until the column is clear of the checkpoint. Then it falls back to the secondary line.',
        'The emergency gate is on its own cabinet on the south wall. It will open from there. Nobody has been able to reach it.',
      ],
    },
  ],
  cues: [
    { on: 'start', at: 1.5, speaker: CREW, text: 'The perimeter is broken. Fighting to the north, you can hear it. We have to cross it.' },
    { on: 'start', at: 8, speaker: CREW, text: 'Cover the bunker on the west flank while they pull back. Then the gate cabinet on the south wall.', seconds: 7 },
    { on: 'step', step: 0, at: 0.6, speaker: CREW, text: 'The bunker is clear. Cross the checkpoint and get to the gate cabinet.' },
    { on: 'done', at: 0.6, speaker: CREW, text: 'The gate is open. The staging apron is straight ahead.' },
  ],
  navBounds: { minX: -33, maxX: 33, minZ: -17, maxZ: 17 },
  ramp: null,
  barricadeBars: [],
  streetSpawns: [],
  playerSpawns: [{ x: -24, y: 0, z: 0 }],
  spawnYaw: -Math.PI / 2,
  streetLamps: [],
  checkpoint: { x: -24, y: 0, z: 0 },
};
