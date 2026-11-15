import type { Elevator, Level, LevelLight, Station } from './types';
import { CREW, PILOT } from './voices';
import { block, FRONT_HEIGHT, frontage, ground, parkedCar, streetDoor, checkpointBoxes } from './streetKit';
import { DOOR_HEIGHT, furniture, stationBoxes } from './wardKit';

// Act 4, the second block: the market square. A paved plaza with a fountain in the middle and
// market stalls left standing round it, closed in by the town hall on the north side. The dead pour
// in from six side streets. The transit lift's relay is a radio box on the town hall wall: start it
// and hold the space in front of it while the signal climbs.
//
//   z -16 +-[alley]---[ TOWN HALL: relay ]---[alley]-+
//         |        stalls      fountain     stalls   |
//   LIFT  >                                         [alley]
//         |        stalls                  stalls    |
//   z  16 +--------[alley]--------------[alley]------+
//        x -22                                       22

const SANDSTONE = '#8a7d6a';
const BRICK = '#7a6f66';
const STONE = '#6e7479';

const doors = [
  streetDoor(-14, -16.25, 0, 1), streetDoor(14, -16.25, 0, 1),
  streetDoor(-8, 16.25, 0, -1), streetDoor(10, 16.25, 0, -1),
  streetDoor(22.25, -7, -1, 0), streetDoor(22.25, 8, -1, 0),
];

const elevator: Elevator = { position: { x: 22.25, y: 0, z: 0 }, normal: { x: -1, z: 0 }, width: 6, height: DOOR_HEIGHT, cabDepth: 4, cabWidth: 6 };

const stations: Station[] = [
  { kind: 'ammo', position: { x: -21.95, y: 1.25, z: 8 }, normal: { x: 1, z: 0 } },
  { kind: 'shotgun', position: { x: 0, y: 1.25, z: 15.95 }, normal: { x: 0, z: -1 } },
];

const lamp = (x: number, z: number, flicker = false): LevelLight => ({ position: { x, y: 3.8, z }, color: '#ffd9a0', intensity: 30, flicker });
const lights: LevelLight[] = [
  lamp(-17, -12), lamp(17, -12, true), lamp(-17, 12), lamp(17, 12), lamp(0, -3), lamp(-9, 3, true), lamp(9, -3),
  { position: { x: 0, y: 1.4, z: 0 }, color: '#9fd4ff', intensity: 14 },
];

const stall = (x: number, z: number, color: string) => furniture(x, z, 3, 1.1, 1.5, color, 'counter', 'south');

export const market: Level = {
  name: 'Market square',
  theme: 'street',
  exitGate: true,
  atmosphere: { fog: '#6a6e78', fogNear: 25, fogFar: 100, ambient: 1.4, sky: { horizon: '#e0a070', zenith: '#4a5f86', stars: 0.05 } },
  boxes: [
    ground(-22, 22, -16, 16, '#7d7f80'),
    // A band of road through the plaza, east to west.
    ground(-22, 22, -3, 3, '#2a2d32', 'slab'),
    ...frontage('x', -16.25, -22.5, 22.5, doors, FRONT_HEIGHT, SANDSTONE),
    ...frontage('x', 16.25, -22.5, 22.5, doors, FRONT_HEIGHT, BRICK),
    ...frontage('z', -22.25, -16, 16, [], FRONT_HEIGHT, STONE),
    ...frontage('z', 22.25, -16, 16, [...doors, elevator], FRONT_HEIGHT, STONE, 'building', [elevator]),
    ...checkpointBoxes(elevator, STONE),
    ...stationBoxes(stations),

    // The fountain: a wide basin with a column.
    block(0, 0, 5, 0.9, 5, '#7d8a90'),
    block(0, 0, 1.2, 2.6, 1.2, '#8a959c'),
    // Market stalls left standing, in rows either side of the road.
    stall(-12, -8, '#8a4a3a'), stall(-6, -9.5, '#3a6a8a'), stall(6, -9.5, '#8a6a2a'), stall(12, -8, '#4a7a4a'),
    stall(-12, 8, '#7a3a6a'), stall(-6, 9.5, '#8a6a2a'), stall(6, 9.5, '#3a6a8a'), stall(12, 8, '#8a4a3a'),
    // Cars abandoned in the road, and a bus-stop shelter.
    parkedCar(-15, -1.4, '#6b2a2a'),
    parkedCar(14, 1.4, '#2f4a5c', true),
    block(-4, 13.4, 3, 2.2, 0.5, '#6d777d'),
    // Planters on the pavement and a monument plinth by the town hall.
    block(-17, -4.5, 1.6, 0.8, 1.6, '#4a5a3a'),
    block(-17, 4.5, 1.6, 0.8, 1.6, '#4a5a3a'),
    block(17, -4.5, 1.6, 0.8, 1.6, '#4a5a3a'),
    block(17, 4.5, 1.6, 0.8, 1.6, '#4a5a3a'),
    furniture(-3.5, -13, 1.2, 0.5, 2.2, '#8a959c', 'bench', 'south'),
    furniture(3.5, -13, 1.2, 0.5, 2.2, '#8a959c', 'bench', 'south'),
  ],
  ladders: [],
  lights,
  doors,
  gate: null,
  elevator,
  stations,
  locks: [],
  signs: [
    { text: 'TOWN HALL', sub: 'MARKET SQUARE  /  CIVIC OFFICES', background: '#2c3a4d', position: { x: 0, y: 4.4, z: -15.96 }, rotation: 0, width: 4.2, height: 1.0 },
    { text: 'MARKET SQUARE', sub: 'SATURDAY MARKET  /  8 TO 2', background: '#6b4a12', position: { x: -9, y: 3.4, z: 15.96 }, rotation: Math.PI, width: 3.2, height: 0.8 },
    { text: 'EAST GATE', sub: 'SIGNAL RELAY REQUIRED', background: '#5b1b1b', position: { x: 21.96, y: 3.0, z: 3.6 }, rotation: -Math.PI / 2, width: 2.4, height: 0.5 },
  ],
  // The radio relay on the town hall wall is what wakes the transit lift's signal. Start it and
  // hold the plaza in front of the hall while it climbs.
  objective: {
    kind: 'charge',
    label: 'Radio relay',
    part: 'Transit signal',
    device: { position: { x: 0, y: 0, z: -15.95 }, normal: { x: 0, z: 1 } },
    room: { minX: -8, maxX: 8, minZ: -15.8, maxZ: -8 },
    roomName: 'Town hall steps',
    seconds: 30,
  },
  // A run: the side streets keep sending them the whole time, and the relay is a short stand.
  flow: { kind: 'run', every: 3, max: 16 },
  cues: [
    { on: 'start', at: 1.5, speaker: CREW, text: 'The square. Six side streets, and every one is pouring.' },
    { on: 'start', at: 7.5, speaker: CREW, text: 'Relay is on the town hall wall. Thirty seconds on the steps and the gate gets its signal.', seconds: 6 },
    { on: 'done', at: 0.6, speaker: PILOT, text: 'Got your signal. Find us somewhere flat, and keep moving.', seconds: 6 },
  ],
  navBounds: { minX: -27, maxX: 27, minZ: -21, maxZ: 21 },
  ramp: null,
  barricadeBars: [
    { x: -9, y: 0, z: 1 },
    { x: 9, y: 0, z: -1 },
  ],
  streetSpawns: [],
  playerSpawns: [{ x: -18, y: 0, z: 0 }],
  spawnYaw: -Math.PI / 2,
  streetLamps: [],
  checkpoint: { x: -18, y: 0, z: 0 },
};
