import type { Elevator, Level, LevelLight, Station } from './types';
import { CREW } from './voices';
import { block, checkpointBoxes, frontage, ground, parkedCar, streetDoor } from './streetKit';
import { DOOR_HEIGHT, stationBoxes } from './wardKit';

// Act 7, The Silence: the regional broadcast station, which stopped transmitting four days ago. Three
// pieces of evidence, found in order by following the station's own trail: the studio log on the
// engineer's table (what the last broadcast said), the cut feed at the transmitter hut (the damage was done
// with a tool, not teeth), and the list of communities still answering, on the console by the east gate.
// A big cluster of the dead stands round the tower base, and a loud approach brings it to the crew.
//
//   z -12 +--gap--------------------gap-------------+
//         |  [STUDIO: log]     (tower)   [HUT: cable] |
//   (in)  >  forecourt            o                    > east gate
//         |       (cars)     (cluster)  [CONSOLE]    |
//   z  12 +--------gap------------------gap----------+
//        x -26                                    26

const WALL = '#5b6068';
const GROUND = '#4a5040';
const STUDIO = '#6e7479';
const LATTICE = '#8a8f93';
const HUT = '#5b6670';
const CRATE = '#6a5a3e';
const ROAD = '#2a2d32';

const doors = [streetDoor(-14, -12.25, 0, 1), streetDoor(10, -12.25, 0, 1), streetDoor(-8, 12.25, 0, -1), streetDoor(16, 12.25, 0, -1)];

const elevator: Elevator = { position: { x: 26.25, y: 0, z: 0 }, normal: { x: -1, z: 0 }, width: 6, height: DOOR_HEIGHT, cabDepth: 4, cabWidth: 6 };

const stations: Station[] = [
  { kind: 'ammo', position: { x: -25.95, y: 1.25, z: 8 }, normal: { x: 1, z: 0 } },
  { kind: 'shotgun', weapon: 'ak', position: { x: 25.95, y: 1.25, z: -8 }, normal: { x: -1, z: 0 } },
];

const lamp = (x: number, z: number, flicker = false): LevelLight => ({ position: { x, y: 3.6, z }, color: '#d8e0ea', intensity: 22, flicker, post: true });
const lights: LevelLight[] = [lamp(-20, 0), lamp(-8, 6, true), lamp(2, -6), lamp(10, 6, true), lamp(20, -2)];

export const silence: Level = {
  name: 'The Silence',
  theme: 'street',
  scenery: { north: 'trees', south: 'trees', east: 'trees', west: 'trees', skyline: false },
  atmosphere: { fog: '#2c3036', fogNear: 10, fogFar: 54, ambient: 1.0, sky: { horizon: '#5a6270', zenith: '#10141c', stars: 0.15 } },
  exitGate: true,
  boxes: [
    ground(-26, 26, -12, 12, GROUND, 'plain'),
    ground(-26, 26, -2, 2, ROAD, 'slab'),
    ...frontage('x', -12.25, -26.5, 26.5, doors, 2.8, WALL, 'wall'),
    ...frontage('x', 12.25, -26.5, 26.5, doors, 2.8, WALL, 'wall'),
    ...frontage('z', -26.25, -12, 12, [], 2.8, WALL, 'wall'),
    ...frontage('z', 26.25, -12, 12, [elevator], 4.6, '#6e7479', 'building', [elevator]),
    ...checkpointBoxes(elevator, '#6e7479'),
    ...stationBoxes(stations),

    // The studio on the north-west: three walls, open to the forecourt, with the engineer's table inside.
    block(-14, -10, 8, 2.6, 0.3, STUDIO, 'wall'), block(-18, -8, 0.3, 2.6, 4, STUDIO, 'wall'), block(-10, -8, 0.3, 2.6, 4, STUDIO, 'wall'),
    block(-14, -8, 1.4, 0.8, 1.0, CRATE, 'crate'),
    // The lattice tower in the middle, four legs on a plinth, and the cluster round it.
    block(2, 0, 3.0, 0.4, 3.0, '#7a7d7e', 'plain'),
    block(1, -1, 0.25, 7, 0.25, LATTICE), block(3, -1, 0.25, 7, 0.25, LATTICE), block(1, 1, 0.25, 7, 0.25, LATTICE), block(3, 1, 0.25, 7, 0.25, LATTICE),
    // The transmitter hut on the south-east, its cut feed on the table by the wall.
    block(8, 10, 6, 3.0, 0.3, HUT, 'wall'), block(5, 8, 0.3, 3.0, 4, HUT, 'wall'), block(11, 8, 0.3, 3.0, 4, HUT, 'wall'),
    block(8, 8.6, 1.4, 0.8, 1.0, CRATE, 'crate'),
    // The east console by the gate, where the list is.
    block(21, 3, 1.6, 0.8, 1.0, CRATE, 'crate'),
    parkedCar(-18, 3, '#4a4f55'), parkedCar(-6, -4, '#7a3030', true), block(14, -6, 2.0, 0.9, 1.4, '#7a7d7e', 'plain'),
  ],
  ladders: [],
  lights,
  doors,
  gate: null,
  elevator,
  stations,
  locks: [],
  signs: [
    { text: 'REGIONAL BROADCAST', sub: 'STATION 4  /  OFF AIR', background: '#5b1b1b', position: { x: -25.96, y: 2.4, z: -3.6 }, rotation: Math.PI / 2, width: 3.2, height: 0.7 },
  ],
  // Three pieces of evidence, in order: the studio log, the cut feed, the list of communities.
  objective: null,
  steps: [
    { kind: 'keycard', label: 'Studio log', part: 'The last broadcast', position: { x: -14, y: 0.95, z: -8 } },
    { kind: 'keycard', label: 'Cut feed', part: 'Why it went quiet', position: { x: 8, y: 0.95, z: 8.6 } },
    { kind: 'keycard', label: 'Station list', part: 'Who is still answering', position: { x: 21, y: 0.95, z: 3 } },
  ],
  // A sweep with a large cluster round the tower. Gunfire is loud, and the cluster comes.
  flow: { kind: 'sweep', loud: 6, first: 6 },
  residents: [
    { x: -4, z: 0, yaw: 0.4, roam: 2 }, { x: 0, z: -5, yaw: -2 }, { x: 0, z: 5, yaw: 1.2 }, { x: 5, z: -4, yaw: -0.6 },
    { x: 6, z: 3, yaw: 2.4 }, { x: 8, z: -1, yaw: 3 }, { x: 4, z: 5, yaw: -1.6 }, { x: -2, z: 7, yaw: 0.8 },
    { x: 12, z: 2, yaw: 1.5, roam: 2 }, { x: -22, z: 0, yaw: 2.2, roam: 2 },
  ],
  notes: [
    {
      position: { x: -14, y: 0.92, z: -8 },
      what: 'studio log',
      title: 'Studio log',
      lines: [
        'STATION 4  /  LAST LOG',
        'Broadcast ran on a loop for nine days. The loop said stay in your homes. Nobody here recorded it.',
        'Feed to the transmitter hut was still live at 03:10. At 03:12 it was not.',
      ],
    },
    {
      position: { x: 8, y: 0.92, z: 8.6 },
      what: 'cut feed',
      title: 'Cut feed',
      lines: [
        'The transmitter cable is cut clean with a tool. Not chewed. Not torn.',
        'Someone stood here, in the hut, and cut it on purpose. They had a torch and bolt cutters.',
      ],
    },
  ],
  cues: [
    { on: 'start', at: 1.5, speaker: CREW, text: 'Station 4. The broadcast stopped here four days ago.' },
    { on: 'start', at: 8, speaker: CREW, text: 'Follow the trail: the studio, the hut, the list. There is a crowd round the tower. Do not be loud.', seconds: 6 },
    { on: 'step', step: 0, at: 0.6, speaker: CREW, text: 'The loop was not theirs. Check the transmitter hut.' },
    { on: 'step', step: 1, at: 0.6, speaker: CREW, text: 'Cut with a tool. Not the dead. Find the list on the east console.' },
    { on: 'done', at: 0.6, speaker: CREW, text: 'A list of communities still answering. Somebody wanted the silence, and somebody else kept the list.' },
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
