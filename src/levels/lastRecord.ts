import type { Elevator, Level, LevelLight, Station } from './types';
import { CREW } from './voices';
import { block, checkpointBoxes, frontage, ground, parkedCar, streetDoor } from './streetKit';
import { DOOR_HEIGHT, stationBoxes } from './wardKit';

// Act 11, The Last Record: the site's data hall, going dark as it fails. Two steps. First the record
// itself: the final incident log is on a console in the middle of the hall. Then the upload: the log is
// pushed out over the site's last link, which takes a held stand at the server rack while the facility
// shuts down around the crew. Light gives them away here (Level.lightsCall): the dead are drawn to the
// research and to any torch, and the upload sends them faster. The way out is the maintenance route at
// the east end, not the way in.
//
//   z -12 +--gap--------------------gap-------------+
//         |  racks   [CONSOLE]        [SERVER RACK]  |
//   (in)  >  hall                                      > maintenance route
//         |      (desks)      racks                   |
//   z  12 +--------gap------------------gap----------+
//        x -26                                    26

const WALL = '#4f545a';
const FLOOR = '#34383e';
const RACK = '#2e3338';
const DESK = '#6a5a3e';
const STEEL = '#586068';

const doors = [streetDoor(-12, -12.25, 0, 1), streetDoor(8, -12.25, 0, 1), streetDoor(-4, 12.25, 0, -1), streetDoor(16, 12.25, 0, -1)];

const elevator: Elevator = { position: { x: 26.25, y: 0, z: 0 }, normal: { x: -1, z: 0 }, width: 6, height: DOOR_HEIGHT, cabDepth: 4, cabWidth: 6 };

const stations: Station[] = [
  { kind: 'ammo', position: { x: -25.95, y: 1.25, z: 8 }, normal: { x: 1, z: 0 } },
  { kind: 'shotgun', weapon: 'ak', position: { x: 25.95, y: 1.25, z: -8 }, normal: { x: -1, z: 0 }, },
];

// Only a few failing lights: the hall is dark.
const status = (x: number, z: number, flicker = false): LevelLight => ({ position: { x, y: 3.0, z }, color: '#c8d8f0', intensity: 14, flicker });
const lights: LevelLight[] = [status(-20, -4, true), status(-8, 6), status(2, -4, true), status(12, 6), status(22, -2, true)];

export const lastRecord: Level = {
  name: 'The Last Record',
  theme: 'street',
  exitGate: true,
  lightsCall: true,
  scenery: { north: 'trees', south: 'trees', east: 'trees', west: 'trees', skyline: false },
  atmosphere: { fog: '#16181c', fogNear: 6, fogFar: 36, ambient: 0.7, sky: { horizon: '#2a2e36', zenith: '#08090c', stars: 0.05 } },
  boxes: [
    ground(-26, 26, -12, 12, FLOOR, 'slab'),
    ...frontage('x', -12.25, -26.5, 26.5, doors, 3.0, WALL, 'wall'),
    ...frontage('x', 12.25, -26.5, 26.5, doors, 3.0, WALL, 'wall'),
    ...frontage('z', -26.25, -12, 12, [], 3.0, WALL, 'wall'),
    ...frontage('z', 26.25, -12, 12, [elevator], 4.6, '#6e7479', 'building', [elevator]),
    ...checkpointBoxes(elevator, '#6e7479'),
    ...stationBoxes(stations),

    // Server racks in rows, with aisles between, to fight and hide in.
    block(-18, -7, 5, 2.2, 0.9, RACK, 'plain'), block(-18, 7, 5, 2.2, 0.9, RACK, 'plain'),
    block(-6, -7, 5, 2.2, 0.9, RACK, 'plain'), block(-6, 7, 5, 2.2, 0.9, RACK, 'plain'),
    block(6, -4, 0.9, 2.2, 5, RACK, 'plain'), block(6, 6, 0.9, 2.2, 5, RACK, 'plain'),
    // The console in the middle of the hall, with the final log on it.
    block(0, 0, 2.0, 0.8, 1.2, DESK, 'crate'),
    // The upload rack at the east end, with its link device on the face.
    block(18, -8, 5, 2.8, 2.4, STEEL, 'plain'), block(18, 8, 4, 1.2, 1.4, STEEL, 'plain'),
    block(-22, 2, 1.8, 0.9, 1.4, DESK, 'crate'), parkedCar(12, 1, '#4a4f55'),
  ],
  ladders: [],
  lights,
  doors,
  gate: null,
  elevator,
  stations,
  locks: [],
  signs: [
    { text: 'DATA HALL 1', sub: 'SITE SHUTDOWN IN PROGRESS', background: '#5b1b1b', position: { x: -25.96, y: 2.6, z: -3.6 }, rotation: Math.PI / 2, width: 3.0, height: 0.7 },
  ],
  // Two steps: the final log on the console, then the upload held at the rack.
  objective: null,
  steps: [
    { kind: 'keycard', label: 'Final log', part: 'The last incident record', position: { x: 0, y: 0.95, z: 0 } },
    {
      kind: 'charge',
      label: 'Send the record',
      part: 'Out over the last link',
      stand: 'Start it at the rack. They will come to the noise',
      device: { position: { x: 18, y: 1.35, z: -6.58 }, normal: { x: 0, z: 1 } },
      room: { minX: 13, maxX: 23, minZ: -6.5, maxZ: 0 },
      roomName: 'Upload rack',
      seconds: 40,
    },
  ],
  flow: { kind: 'sweep', loud: 3, first: 5 },
  residents: [
    { x: -22, z: -2, yaw: 0.4, roam: 2 }, { x: -12, z: 0, yaw: -2, roam: 3 }, { x: -2, z: 3, yaw: 1.2 },
    { x: 3, z: -2, yaw: -0.6 }, { x: 10, z: 8, yaw: 2.4 }, { x: 14, z: -3, yaw: 3 }, { x: 22, z: 4, yaw: -1.6 },
  ],
  notes: [
    {
      position: { x: -22, y: 0.92, z: 2 },
      what: 'shutdown notice',
      title: 'Shutdown notice',
      lines: [
        'DATA HALL 1  /  SITE SHUTDOWN',
        'Mains lost. Hall on battery, then on nothing. The last link is the rack on the east wall.',
        'The final log is on the central console. Upload takes forty seconds and the rack is loud.',
        'The maintenance route on the east side was never meant to be a way out. It is now.',
      ],
    },
  ],
  cues: [
    { on: 'start', at: 1.5, speaker: CREW, text: 'The data hall. It is nearly dark and the site is shutting down.' },
    { on: 'start', at: 8, speaker: CREW, text: 'Final log on the console, then the upload at the rack. Torches call them in.', seconds: 6 },
    { on: 'step', step: 0, at: 0.6, speaker: CREW, text: 'We have the log. Get to the rack on the east wall and start the upload.' },
    { on: 'done', at: 0.6, speaker: CREW, text: 'It is out. Every record they hid is out. Now go by the maintenance route.' },
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
