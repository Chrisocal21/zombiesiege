import type { Elevator, Level, LevelLight, Station } from './types';
import { CREW } from './voices';
import { block, FRONT_HEIGHT, frontage, ground, parkedCar, streetDoor, checkpointBoxes } from './streetKit';
import { DOOR_HEIGHT, stationBoxes } from './wardKit';

// Act 4, the third block: the failed barricades near the edge of the zone. Two staggered lines of
// concrete and sandbags run across the road with gaps torn through them, and army trucks are
// left where they stopped. Floodlights stand on poles along the road, each run from a generator
// trailer: throw the switch on all three trailers and the lift's signal has power and the way east
// is lit.
//
//   z -9 +--[shop]----------------[shop]------------------+
//        |   GEN 1            |  |        GEN 3            |
//   LIFT >   road   (barrier lines, trucks)        [road]  >  east
//        |            GEN 2      |  |                      |
//   z  9 +--------[shop]-------------[shop]----------------+
//       x -30                                            30

const STONE = '#6e7479';
const BRICK = '#7a6f66';
const BARRIER = '#8a8d90';
const SANDBAG = '#8a7d5a';
const ARMY = '#4a5a3a';

const doors = [streetDoor(-16, -9.25, 0, 1), streetDoor(6, -9.25, 0, 1), streetDoor(-6, 9.25, 0, -1), streetDoor(16, 9.25, 0, -1)];

const elevator: Elevator = { position: { x: 30.25, y: 0, z: 0 }, normal: { x: -1, z: 0 }, width: 6, height: DOOR_HEIGHT, cabDepth: 4, cabWidth: 6 };
const entry: Elevator = { position: { x: -30.25, y: 0, z: 0 }, normal: { x: 1, z: 0 }, width: 6, height: DOOR_HEIGHT, cabDepth: 4, cabWidth: 6 };

const stations: Station[] = [
  { kind: 'ammo', position: { x: -24, y: 1.25, z: 8.95 }, normal: { x: 0, z: -1 } },
  { kind: 'shotgun', weapon: 'ak', position: { x: 0, y: 1.25, z: -8.95 }, normal: { x: 0, z: 1 } },
];

// Circuit 0 is the west third, 1 the middle, 2 the east.
const flood = (x: number, z: number, circuit: number, flicker = false): LevelLight => ({ position: { x, y: 3.8, z }, color: '#ffe9c0', intensity: 34, circuit, flicker });
const lights: LevelLight[] = [
  flood(-12, -7, 0), flood(-14, 7, 0, true), flood(-4, -7, 1), flood(2, 7, 1), flood(12, -7, 1, true), flood(20, 7, 2), flood(26, -7, 2),
  ...([[-27, 3], [-1, 0], [10, 3], [24, 0]] as const).map(([x, z]): LevelLight => ({ position: { x, y: 2.75, z }, color: '#ff2a1a', intensity: 3.5, emergency: true })),
];

export const barricades: Level = {
  name: 'The barricades',
  theme: 'street',
  scenery: { north: 'city', south: 'city', west: 'city', east: 'city', skyline: true },
  exitGate: true,
  atmosphere: { fog: '#383c46', fogNear: 14, fogFar: 70, ambient: 1.5, sky: { horizon: '#6a5a66', zenith: '#1a2236', stars: 0.3 } },
  boxes: [
    ground(-30, 30, -6, 6, '#2a2d32', 'slab'),
    ground(-30, 30, -9, -6, '#7d7f80'),
    ground(-30, 30, 6, 9, '#7d7f80'),
    ...frontage('x', -9.25, -30.5, 30.5, doors, FRONT_HEIGHT, STONE),
    ...frontage('x', 9.25, -30.5, 30.5, doors, FRONT_HEIGHT, BRICK),
    ...frontage('z', -30.25, -9, 9, [entry], FRONT_HEIGHT, STONE, 'building', [entry]),
    ...checkpointBoxes(entry, STONE),
    ...frontage('z', 30.25, -9, 9, [elevator], FRONT_HEIGHT, BRICK, 'building', [elevator]),
    ...checkpointBoxes(elevator, BRICK),
    ...stationBoxes(stations),

    // The first barricade line, torn open in the middle and near the north kerb.
    block(-10, -4.2, 1.2, 1.2, 3.6, BARRIER),
    block(-10, 4.2, 1.2, 1.2, 3.6, BARRIER),
    block(-11.4, 0, 1.6, 0.9, 2.2, SANDBAG),
    // The second line, further east, open near the south kerb.
    block(8, -3.6, 1.2, 1.2, 4.4, BARRIER),
    block(8, 2.6, 1.2, 1.2, 2.2, BARRIER),
    block(9.6, -0.4, 1.6, 0.9, 2.4, SANDBAG),
    // Army trucks left where they stopped, and a wrecked car in the road.
    parkedCar(-18, -3.2, ARMY, true),
    parkedCar(-2, 3.2, ARMY, true),
    parkedCar(16, -2, '#4a4f55'),
    parkedCar(22, 3.4, '#7a3030'),
    // Generator trailers, each with its switchgear on the face that looks at the road.
    block(-22, -7.2, 5, 2.2, 2.0, ARMY, 'crate'),
    block(0, 7.4, 5, 2.2, 2.0, ARMY, 'crate'),
    block(14, -7.2, 5, 2.2, 2.0, ARMY, 'crate'),
    // Sandbag walls in front of the shops.
    block(-28, -7.6, 2, 0.9, 0.8, SANDBAG),
    block(26, 7.6, 3, 0.9, 0.8, SANDBAG),
  ],
  ladders: [],
  lights,
  doors,
  gate: null,
  elevator,
  entry,
  stations,
  locks: [],
  signs: [
    { text: 'CHECKPOINT 4', sub: 'ALL TRAFFIC STOP', background: '#6b1b1b', position: { x: -12, y: 4.2, z: -8.96 }, rotation: 0, width: 3.0, height: 0.9 },
    { text: 'NO ENTRY', sub: 'RESTRICTED ZONE', background: '#6b4a12', position: { x: 22, y: 4.0, z: 8.96 }, rotation: Math.PI, width: 2.6, height: 0.8 },
    { text: 'EAST GATE', sub: 'NO POWER  /  GENERATORS', background: '#5b1b1b', position: { x: 29.96, y: 3.0, z: 3.6 }, rotation: -Math.PI / 2, width: 2.4, height: 0.5 },
  ],
  // The three generator trailers' switchgear faces the road: one on the north side in the west, one
  // on the south side in the middle, and one on the north side in the east.
  objective: {
    kind: 'breakers',
    label: 'Generators',
    part: 'Floodlights and lift power',
    panels: [
      { position: { x: -22, y: 1.45, z: -6.2 }, normal: { x: 0, z: 1 } },
      { position: { x: 0, y: 1.45, z: 6.4 }, normal: { x: 0, z: -1 } },
      { position: { x: 14, y: 1.45, z: -6.2 }, normal: { x: 0, z: 1 } },
    ],
  },
  // A run: they come in behind the crew all the way along the three generators.
  flow: { kind: 'run', every: 3.4, max: 14 },
  notes: [
    {
      position: { x: -28, y: 0.92, z: -7.6 },
      what: 'evacuation map',
      title: 'Evacuation map',
      lines: [
        'ZONE 4  /  EVACUATION ROUTES',
        'Assembly point: the outskirts camp, east. All roads past this line are closed to civilians.',
        'Air ambulance pickups only where flares are lit. Public park, east of the checkpoint.',
        'Do not stop on the route.',
      ],
    },
  ],
  cues: [
    { on: 'start', at: 1.5, speaker: CREW, text: 'The barricades. Whoever held this line did not hold it.' },
    { on: 'start', at: 7.5, speaker: CREW, text: 'Three generators along the road. Throw all three and the gate has power.', seconds: 6 },
    { on: 'done', at: 0.6, speaker: CREW, text: 'Floodlights are up, gate is live. The park is next.' },
  ],
  navBounds: { minX: -35, maxX: 35, minZ: -14, maxZ: 14 },
  ramp: null,
  // Out in the open there is nothing to board up: the crew walks the street and deals with what is on it.
  barricadeBars: [],
  streetSpawns: [],
  playerSpawns: [{ x: -26, y: 0, z: 0 }],
  spawnYaw: -Math.PI / 2,
  streetLamps: [],
  checkpoint: { x: -26, y: 0, z: 0 },
};
