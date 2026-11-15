import type { Elevator, Level, LevelLight, Station } from './types';
import { CREW } from './voices';
import { block, checkpointBoxes, frontage, ground, parkedCar, streetDoor } from './streetKit';
import { DOOR_HEIGHT, stationBoxes } from './wardKit';

// Act 11, Containment Protocol: the site's clean lab, where the preserved sample can be compared with the
// contaminated research. Three steps. First the air: two cabinets route power to the filtered air plant,
// and the lab's lights are on those circuits. Then the samples: two sealed containers are carried from
// the contaminated store to the clean bench, handled one at a time. Then the transfer: the comparison rig
// is slow to move, and the crew holds the area round it while it is packed. The dead are all round the
// contaminated store. The campaign sample itself is never at risk: only these two containers are.
//
//   z -12 +--gap--------------------gap-------------+
//         | [CAB 1]   store (dirty)       [RIG]      |
//   (in)  >  corridor        [BENCH]                   > transfer dock
//         |            [CAB 2]  (clean)              |
//   z  12 +--------gap------------------gap----------+
//        x -28                                    28

const FLOOR = '#c9cdc4';
const WALL = '#8a9096';
const STEEL = '#586068';
const DIRTY = '#4a5240';
const BENCH = '#b8bcb4';
const CRATE = '#6a5a3e';

const doors = [streetDoor(-14, -12.25, 0, 1), streetDoor(6, -12.25, 0, 1), streetDoor(-6, 12.25, 0, -1), streetDoor(16, 12.25, 0, -1)];

const elevator: Elevator = { position: { x: 28.25, y: 0, z: 0 }, normal: { x: -1, z: 0 }, width: 6, height: DOOR_HEIGHT, cabDepth: 4, cabWidth: 6 };

const stations: Station[] = [
  { kind: 'ammo', position: { x: -27.95, y: 1.25, z: 8 }, normal: { x: 1, z: 0 } },
  { kind: 'shotgun', weapon: 'ak', position: { x: 27.95, y: 1.25, z: -8 }, normal: { x: -1, z: 0 } },
];

// Circuits 0 and 1: the lab's own lights, dark until the air plant has power.
const lamp = (x: number, z: number, circuit?: number, flicker = false): LevelLight => ({ position: { x, y: 3.6, z }, color: '#e6f2ff', intensity: 28, circuit, flicker });
const lights: LevelLight[] = [lamp(-22, 0), lamp(-14, 6, undefined, true), lamp(-6, -6), lamp(2, -6, 0), lamp(2, 6, 1), lamp(10, 0, 0), lamp(16, 6, 1), lamp(22, -2, 0, true)];

export const containment: Level = {
  name: 'Containment Protocol',
  theme: 'street',
  exitGate: true,
  scenery: { north: 'trees', south: 'trees', east: 'trees', west: 'trees', skyline: false },
  atmosphere: { fog: '#2c3238', fogNear: 10, fogFar: 54, ambient: 1.0, sky: { horizon: '#5a6068', zenith: '#12161e', stars: 0.1 } },
  boxes: [
    ground(-28, 28, -12, 12, FLOOR, 'slab'),
    ground(-28, -4, -12, 12, DIRTY, 'plain'),
    ...frontage('x', -12.25, -28.5, 28.5, doors, 3.0, WALL, 'wall'),
    ...frontage('x', 12.25, -28.5, 28.5, doors, 3.0, WALL, 'wall'),
    ...frontage('z', -28.25, -12, 12, [], 3.0, WALL, 'wall'),
    ...frontage('z', 28.25, -12, 12, [elevator], 4.6, '#6e7479', 'building', [elevator]),
    ...checkpointBoxes(elevator, '#6e7479'),
    ...stationBoxes(stations),

    // The air plant's two power cabinets, panels facing in.
    block(-10, -10.9, 2.4, 2.2, 1.4, '#4a5a3a', 'crate'),
    block(4, 10.9, 2.4, 2.2, 1.4, '#4a5a3a', 'crate'),
    // The contaminated store at the west: shelving and wrecked stock to fight round.
    block(-20, -8, 5, 2.2, 0.8, STEEL, 'plain'), block(-20, 8, 5, 2.2, 0.8, STEEL, 'plain'), block(-12, 3, 2.0, 1.0, 1.6, CRATE, 'crate'),
    parkedCar(-24, 0, '#4a4f55', true),
    // The clean bench in the middle: a long steel bench the containers are set down on.
    block(6, -3, 4.0, 0.9, 1.2, BENCH, 'plain'), block(10, 5, 2.0, 1.0, 1.6, STEEL, 'plain'),
    // The comparison rig's crate at the east end, with its hold device on the face.
    block(18, -8, 5, 2.8, 2.4, STEEL, 'plain'), block(22, 6, 2.0, 1.0, 1.6, CRATE, 'crate'),
  ],
  ladders: [],
  lights,
  doors,
  gate: null,
  elevator,
  stations,
  locks: [],
  signs: [
    { text: 'CLEAN LAB 2', sub: 'SEALED  /  FILTERED AIR ONLY', background: '#1b5b4d', position: { x: -3.96, y: 2.6, z: -3.6 }, rotation: Math.PI / 2, width: 3.0, height: 0.7 },
  ],
  // Three steps: air power, the two sample containers to the bench, the rig's transfer held.
  objective: null,
  steps: [
    {
      kind: 'breakers',
      label: 'Filtered air',
      part: 'Air plant power',
      panels: [
        { position: { x: -10, y: 1.45, z: -9.88 }, normal: { x: 0, z: 1 } },
        { position: { x: 4, y: 1.45, z: 9.88 }, normal: { x: 0, z: -1 } },
      ],
    },
    {
      kind: 'carry',
      label: 'Sample container',
      part: 'Contaminated samples',
      items: [{ x: -16, y: 0.5, z: -3 }, { x: -22, y: 0.5, z: 4 }],
      dropoff: { x: 6, y: 0.9, z: -1.8 },
    },
    {
      kind: 'charge',
      label: 'Comparison rig',
      part: 'Equipment transfer',
      device: { position: { x: 18, y: 1.35, z: -6.58 }, normal: { x: 0, z: 1 } },
      room: { minX: 13, maxX: 23, minZ: -6.5, maxZ: 0 },
      roomName: 'Rig bay',
      seconds: 45,
    },
  ],
  flow: { kind: 'sweep', loud: 3, first: 5 },
  residents: [
    { x: -24, z: -4, yaw: 0.4, roam: 2 }, { x: -16, z: 0, yaw: -2, roam: 2 }, { x: -14, z: 8, yaw: 1.2 },
    { x: -8, z: -3, yaw: -0.6 }, { x: 0, z: 2, yaw: 2.4 }, { x: 12, z: -2, yaw: 3 }, { x: 20, z: 3, yaw: -1.6 },
  ],
  notes: [
    {
      position: { x: 6, y: 0.95, z: -3 },
      what: 'protocol card',
      title: 'Containment protocol',
      lines: [
        'CLEAN LAB 2  /  SAMPLE HANDLING',
        'Filtered air first. Both cabinets, or the lab stays sealed.',
        'One container at a time from the store to the bench. Do not run. The unique sample is in the vault drawer and is not to be moved.',
        'The comparison rig needs a full hour to pack. Do not leave it unattended.',
      ],
    },
  ],
  cues: [
    { on: 'start', at: 1.5, speaker: CREW, text: 'The clean lab. The doctor says it is the only place the comparison can be done.' },
    { on: 'start', at: 8, speaker: CREW, text: 'Air first, then the two containers to the bench, then the rig. Carry, do not run.', seconds: 7 },
    { on: 'step', step: 0, at: 0.6, speaker: CREW, text: 'Air is filtering. Get the containers from the store.' },
    { on: 'step', step: 1, at: 0.6, speaker: CREW, text: 'Samples are on the bench. Now the rig. It is slow, and they will come.' },
    { on: 'done', at: 0.6, speaker: CREW, text: 'The rig is packed. The doctor says the treatment is a narrow road, not a cure. It is a road.' },
  ],
  navBounds: { minX: -33, maxX: 33, minZ: -17, maxZ: 17 },
  ramp: null,
  barricadeBars: [],
  streetSpawns: [],
  playerSpawns: [{ x: -26, y: 0, z: 4 }],
  spawnYaw: -Math.PI / 2,
  streetLamps: [],
  checkpoint: { x: -26, y: 0, z: 4 },
};
