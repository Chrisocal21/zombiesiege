import type { Elevator, Level, LevelLight, Lock, Station } from './types';
import { CREW } from './voices';
import { block, checkpointBoxes, frontage, ground, parkedCar, streetDoor } from './streetKit';
import { DOOR_HEIGHT, stationBoxes } from './wardKit';

// Act 11, The Original Site: the company's first research complex, out past the old town. Its emergency
// protocol shut every entrance when the power failed, and the archive is dark. Two steps. First power:
// two cabinets route what is left of the generator to the archive wing (its lights are on that circuit).
// Then the records: the incident file in the archive. There are two ways in from the car park. The
// security shutter is down, and forcing it costs points and is loud. The maintenance door in the south
// corner is open, and leads through the plant yard past the dead that were shut in with the site.
//
//   z -14 +--gap--------------+--------------gap-----+
//         | car park [CAB 1]  S   plant yard  [ARCHIVE] |
//   (in)  >                   G                         > loading dock
//         |  [vans]           |  [CAB 2] (plant)        |
//   z  14 +-----gap--M--------+---------------gap------+
//        x -26              x -8                      26
//   G = security shutter (forced, 300 points)   M = maintenance door (open)

const WALL = '#6a6f74';
const LOT = '#34373c';
const FLOOR = '#5a5f66';
const STEEL = '#586068';
const CRATE = '#6a5a3e';
const SHELF = '#4a4f55';

const doors = [streetDoor(-18, -14.25, 0, 1), streetDoor(10, -14.25, 0, 1), streetDoor(2, 14.25, 0, -1), streetDoor(18, 14.25, 0, -1)];

const shutter: Lock = { position: { x: -8.25, y: 0, z: -3 }, normal: { x: -1, z: 0 }, width: 2.4, height: DOOR_HEIGHT, cost: 300, label: 'Security shutter' };
const maintenance = streetDoor(-8.25, 9, -1, 0);

const elevator: Elevator = { position: { x: 26.25, y: 0, z: 0 }, normal: { x: -1, z: 0 }, width: 6, height: DOOR_HEIGHT, cabDepth: 4, cabWidth: 6 };

const stations: Station[] = [
  { kind: 'ammo', position: { x: -25.95, y: 1.25, z: -8 }, normal: { x: 1, z: 0 } },
  { kind: 'shotgun', weapon: 'ak', position: { x: 25.95, y: 1.25, z: 9 }, normal: { x: -1, z: 0 } },
];

// Circuit 0 and 1 are the archive wing's lights: dark until both cabinets are thrown.
const lamp = (x: number, z: number, circuit?: number, flicker = false): LevelLight => ({ position: { x, y: 3.6, z }, color: '#dfe8f0', intensity: 26, circuit, flicker });
const lights: LevelLight[] = [lamp(-20, 0), lamp(-14, 8, undefined, true), lamp(-2, -6), lamp(6, 6, undefined, true), lamp(14, -6, 0), lamp(14, 6, 1), lamp(22, 0, 0), lamp(22, -8, 1)];

export const originalSite: Level = {
  name: 'The Original Site',
  theme: 'street',
  scenery: { north: 'trees', south: 'trees', east: 'trees', west: 'trees', skyline: false },
  atmosphere: { fog: '#30353c', fogNear: 10, fogFar: 54, ambient: 1.0, sky: { horizon: '#5a6068', zenith: '#12161e', stars: 0.2 } },
  boxes: [
    ground(-26, -8, -14, 14, LOT, 'slab'),
    ground(-8, 26, -14, 14, FLOOR, 'slab'),
    ...frontage('x', -14.25, -26.5, 26.5, doors, 3.0, WALL, 'wall'),
    ...frontage('x', 14.25, -26.5, 26.5, doors, 3.0, WALL, 'wall'),
    ...frontage('z', -26.25, -14, 14, [], 3.0, WALL, 'wall'),
    // The wall between the car park and the plant: the shutter and the maintenance door.
    ...frontage('z', -8.25, -14, 14, [shutter, maintenance], 3.6, '#4f545a', 'wall', [shutter, maintenance]),
    ...frontage('z', 26.25, -14, 14, [elevator], 4.6, '#6e7479', 'building', [elevator]),
    ...checkpointBoxes(elevator, '#6e7479'),
    ...stationBoxes(stations),

    // Car park: vans and a guard hut's table.
    parkedCar(-18, 8, '#4a4f55', true), parkedCar(-14, -7, '#7a3030'), block(-21, -3, 1.6, 0.9, 1.4, '#7a7d7e', 'plain'),
    // The two power cabinets, one on each side wall of the plant yard, panels facing in.
    block(14, -12.9, 2.4, 2.2, 1.4, '#4a5a3a', 'crate'),
    block(2, 12.9, 2.4, 2.2, 1.4, '#4a5a3a', 'crate'),
    // The plant yard: pipework, tanks and crates to fight round.
    block(-2, -3, 3.0, 2.6, 3.0, STEEL, 'plain'), block(4, 3, 1.8, 1.0, 1.6, CRATE, 'crate'), block(-3, 6, 2.0, 1.0, 1.6, '#7a7d7e', 'plain'),
    block(8, -7, 4.0, 1.4, 1.2, STEEL, 'plain'), parkedCar(8, 6, '#4a4f55'),
    // The archive at the east end: shelving in rows, the incident file on the table by the dock.
    block(18, -9, 5, 2.4, 0.8, SHELF, 'plain'), block(18, 9, 5, 2.4, 0.8, SHELF, 'plain'), block(18, -3, 4, 2.0, 0.8, SHELF, 'plain'),
    block(22, 2.5, 1.4, 0.8, 1.0, CRATE, 'crate'),
  ],
  ladders: [],
  lights,
  doors,
  gate: null,
  elevator,
  stations,
  locks: [shutter],
  signs: [
    { text: 'NORTHLINE RESEARCH', sub: 'SITE 1  /  EMERGENCY LOCKDOWN', background: '#5b1b1b', position: { x: -25.96, y: 2.6, z: 3.6 }, rotation: Math.PI / 2, width: 3.2, height: 0.7 },
    { text: 'MAINTENANCE', sub: 'PLANT ACCESS  /  STAFF', background: '#1b4a5b', position: { x: -9.5, y: 2.2, z: 8.8 }, rotation: -Math.PI / 2, width: 1.8, height: 0.5 },
  ],
  // Two steps: power to the archive wing (both cabinets), then the incident file.
  objective: null,
  steps: [
    {
      kind: 'breakers',
      label: 'Archive power',
      part: 'Power to the archive',
      panels: [
        { position: { x: 14, y: 1.45, z: -11.88 }, normal: { x: 0, z: 1 } },
        { position: { x: 2, y: 1.45, z: 11.88 }, normal: { x: 0, z: -1 } },
      ],
    },
    { kind: 'keycard', label: 'Incident file', part: 'What the company knew', position: { x: 22, y: 0.95, z: 2.5 } },
  ],
  flow: { kind: 'sweep', loud: 3, first: 5 },
  residents: [
    { x: -17, z: 1, yaw: 0.4, roam: 2 }, { x: -12, z: -9, yaw: -2, roam: 2 },
    { x: -3, z: 2, yaw: 1.2 }, { x: 5, z: -2, yaw: -0.6 }, { x: 10, z: 4, yaw: 2.4, roam: 2 }, { x: 16, z: 0, yaw: 3 }, { x: 20, z: -5, yaw: -1.6 },
  ],
  notes: [
    {
      position: { x: -21, y: 0.92, z: 3 },
      what: 'lockdown notice',
      title: 'Lockdown notice',
      lines: [
        'NORTHLINE SITE 1  /  EMERGENCY PROTOCOL 4',
        'All external doors seal on loss of mains. Archive wing on its own circuit; two cabinets in the plant yard.',
        'The security shutter will not open without authority. The maintenance door was left on the latch for the night shift.',
      ],
    },
    {
      position: { x: 22, y: 0.95, z: 2.5 },
      what: 'incident file',
      title: 'Incident file',
      lines: [
        'INCIDENT 11 / CONTAINMENT FAILURE, SITE 1',
        'Sample handling breach at 02:10. Eleven staff exposed. The decision was taken to keep the site quiet and move the work.',
        'Nothing here was a weapon. It was an accident, and then it was a cover story.',
      ],
    },
  ],
  cues: [
    { on: 'start', at: 1.5, speaker: CREW, text: 'Site One. The company\'s first lab. Everything is sealed.' },
    { on: 'start', at: 8, speaker: CREW, text: 'The shutter will take points and make noise. The maintenance door in the south corner is open.', seconds: 7 },
    { on: 'step', step: 0, at: 0.6, speaker: CREW, text: 'Archive has power. Get to the incident file.' },
    { on: 'done', at: 0.6, speaker: CREW, text: 'It was an accident, and they hid it. We have it in their own words.' },
  ],
  navBounds: { minX: -31, maxX: 31, minZ: -19, maxZ: 19 },
  ramp: null,
  barricadeBars: [],
  streetSpawns: [],
  playerSpawns: [{ x: -23, y: 0, z: 0 }],
  spawnYaw: -Math.PI / 2,
  streetLamps: [],
  checkpoint: { x: -23, y: 0, z: 0 },
};
