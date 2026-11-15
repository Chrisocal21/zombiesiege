import type { Elevator, Level, LevelLight, Station } from './types';
import { CREW } from './voices';
import { block, checkpointBoxes, frontage, ground, parkedCar, streetDoor } from './streetKit';
import { DOOR_HEIGHT, stationBoxes } from './wardKit';

// Act 8, High Water: a flood channel beside the survivors' water intake, after days of rain. The channel
// floor is the ground; two raised catwalks run along its north and south walls, dry at first and
// stepped up at both ends. The water rises in three stages. It slows anyone wading in it, the dead
// included. Two control points, one on each wall and each reached from a catwalk, open the sluice gates.
// Opened, the water drains. The short way is straight across the channel; the dry way is the catwalks.
//
//   z -12 +--gap-----------------------------------+
//         | catwalk N      [VALVE 1]                 |
//   (in)  >  channel (water rises)                    > way on
//         | catwalk S           [VALVE 2]            |
//   z  12 +-----------------gap----------------------+
//        x -26                                    26

const CONCRETE = '#7a7d7e';
const WALL = '#5d6469';
const RAIL = '#8a8f93';
const SLUDGE = '#3c4638';
const STEEL = '#586068';

const doors = [streetDoor(-14, -12.25, 0, 1), streetDoor(10, -12.25, 0, 1), streetDoor(-8, 12.25, 0, -1), streetDoor(16, 12.25, 0, -1)];

const elevator: Elevator = { position: { x: 26.25, y: 0, z: 0 }, normal: { x: -1, z: 0 }, width: 6, height: DOOR_HEIGHT, cabDepth: 4, cabWidth: 6 };

const stations: Station[] = [
  { kind: 'ammo', position: { x: -25.95, y: 1.25, z: 7 }, normal: { x: 1, z: 0 } },
  { kind: 'shotgun', weapon: 'ak', position: { x: 25.95, y: 1.25, z: -7 }, normal: { x: -1, z: 0 } },
];

const lamp = (x: number, z: number, flicker = false): LevelLight => ({ position: { x, y: 4.0, z }, color: '#dfe6e0', intensity: 30, flicker });
const lights: LevelLight[] = [lamp(-18, -8), lamp(-4, 8, true), lamp(8, -8), lamp(18, 6), lamp(0, 0)];

export const highWater: Level = {
  name: 'High Water',
  theme: 'street',
  exitGate: true,
  scenery: { north: 'trees', south: 'trees', east: 'trees', west: 'trees', skyline: false },
  atmosphere: { fog: '#2c3438', fogNear: 10, fogFar: 56, ambient: 1.2, sky: { horizon: '#5a6468', zenith: '#161c24', stars: 0.1 } },
  // The water: 0.5 m after 20 s, 0.9 after 55 s, 1.1 after 90 s. The catwalks are 1.2 m, so they stay dry.
  flood: { stages: [{ at: 20, height: 0.5 }, { at: 55, height: 0.9 }, { at: 90, height: 1.1 }] },
  boxes: [
    ground(-26, 26, -12, 12, SLUDGE, 'plain'),
    ground(-26, 26, -2, 2, CONCRETE, 'slab'),
    ...frontage('x', -12.25, -26.5, 26.5, doors, 2.8, WALL, 'wall'),
    ...frontage('x', 12.25, -26.5, 26.5, doors, 2.8, WALL, 'wall'),
    ...frontage('z', -26.25, -12, 12, [], 2.8, WALL, 'wall'),
    ...frontage('z', 26.25, -12, 12, [elevator], 4.6, '#6e7479', 'building', [elevator]),
    ...checkpointBoxes(elevator, '#6e7479'),
    ...stationBoxes(stations),

    // The north catwalk (z -11 to -7) and the south (z 7 to 11): 1.2 m up, with two steps at each end.
    block(0, -9, 40, 1.2, 4, STEEL, 'plain'),
    block(-21.5, -9, 1, 0.4, 3.4, STEEL, 'step'), block(-20.7, -9, 1, 0.8, 3.4, STEEL, 'step'),
    block(21.5, -9, 1, 0.4, 3.4, STEEL, 'step'), block(20.7, -9, 1, 0.8, 3.4, STEEL, 'step'),
    block(0, 9, 40, 1.2, 4, STEEL, 'plain'),
    block(-21.5, 9, 1, 0.4, 3.4, STEEL, 'step'), block(-20.7, 9, 1, 0.8, 3.4, STEEL, 'step'),
    block(21.5, 9, 1, 0.4, 3.4, STEEL, 'step'), block(20.7, 9, 1, 0.8, 3.4, STEEL, 'step'),
    // Rails along the channel side of each catwalk.
    block(0, -7.1, 40, 0.5, 0.1, RAIL, 'plain'), block(0, 7.1, 40, 0.5, 0.1, RAIL, 'plain'),
    // The two control points: a valve housing on each outer wall, with its panel above the catwalk.
    block(-8, -11.55, 2.6, 3.4, 0.9, '#4a5a3a', 'crate'),
    block(6, 11.55, 2.6, 3.4, 0.9, '#4a5a3a', 'crate'),
    // The intake grille and a wrecked van in the channel, and concrete blocks to fight from.
    block(-2, 0, 0.6, 1.4, 3.6, STEEL, 'plain'),
    parkedCar(-14, 0.8, '#4a4f55', true), parkedCar(12, -1, '#7a3030'),
    block(4, 3, 1.6, 0.8, 1.2, CONCRETE, 'plain'), block(-18, -3, 1.4, 0.9, 1.4, CONCRETE, 'plain'),
  ],
  ladders: [],
  lights,
  doors,
  gate: null,
  elevator,
  stations,
  locks: [],
  signs: [
    { text: 'WATER INTAKE 3', sub: 'SLUICE CONTROL  /  FLOOD STAGE 2', background: '#5b1b1b', position: { x: -25.96, y: 2.4, z: -3.6 }, rotation: Math.PI / 2, width: 3.0, height: 0.7 },
  ],
  // Two control points, both on the catwalks, opened in either order. Opened, the water drains.
  objective: {
    kind: 'breakers',
    label: 'Sluice gates',
    part: 'Control points',
    panels: [
      { position: { x: -8, y: 2.0, z: -11.09 }, normal: { x: 0, z: 1 } },
      { position: { x: 6, y: 2.0, z: 11.09 }, normal: { x: 0, z: -1 } },
    ],
  },
  flow: { kind: 'sweep', loud: 3, first: 5 },
  residents: [
    { x: -22, z: -1, yaw: 1.2, roam: 2 }, { x: -10, z: 1, yaw: -2, roam: 3 }, { x: 2, z: -8, yaw: 0.5 },
    { x: 14, z: 2, yaw: 2.6, roam: 2 }, { x: 20, z: 9, yaw: -1.4 }, { x: -4, z: 9, yaw: 3 },
  ],
  notes: [
    {
      position: { x: -22, y: 1.28, z: -9 },
      what: 'intake log',
      title: 'Intake log',
      lines: [
        'WATER INTAKE 3  /  STAGE 2 WARNING',
        'River over the bank at the east weir. The channel will fill in stages. Plan for chest-deep by the third.',
        'Sluice gates 1 and 2 are on the catwalks. Both open, and it drains.',
        'Delivery manifests for the plant list a contractor not on any register. Look at the waste transport records.',
      ],
    },
  ],
  cues: [
    { on: 'start', at: 1.5, speaker: CREW, text: 'The intake channel. The water is already coming up.' },
    { on: 'start', at: 8, speaker: CREW, text: 'Two sluice controls, one on each wall. The catwalks stay dry. The channel does not.', seconds: 6 },
    { on: 'done', at: 0.6, speaker: CREW, text: 'Gates are open. It is draining. The community has clean water, for now.' },
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
