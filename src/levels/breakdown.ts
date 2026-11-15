import type { Elevator, Level, LevelBox, LevelLight, Station } from './types';
import { CREW, HOSPITAL } from './voices';
import { block, FRONT_HEIGHT, frontage, ground, parkedCar, streetDoor, checkpointBoxes } from './streetKit';
import { DOOR_HEIGHT, stationBoxes } from './wardKit';

// Prologue P01, Breakdown (Mile 9): the ambulance is out of fuel at a farm crossroads after the day's
// earlier rescues. This floor is open country, not a street: the road runs west to east and is blocked at
// its east end by a jackknifed lorry, a hay field with a shed lies north of it, the front yards of the farm
// cottages lie south, and a farm track leads north out of the junction to the field gate, which is the way
// on. At first it is quiet. The crew crosses to the police car at the junction for a working radio, and once
// it is found the hospital's call comes through, and with it the dead out of the hedges all round.
//
//   z -22 +--[gap]-------------------[FIELD GATE]--------------+
//         |  hay field    shed        | t |      paddock        |
//         |   bales   trees           | r |   bales   trees     [gap]
//   z  -4 |                           | k |                     |
//         |  AMBULANCE      POLICE CAR (radio)      LORRY (road blocked)
//   z   4 |                                                     |
//         |  front yards: trees, a pickup, benches, wood stacks |
//   z  18 +-------[gap]------------------------[gap]------------+
//        x -32                                                32

const HEDGE = '#2c4426';
const FENCE = '#5a4f40';
const GRASS = '#5d6842';
const YARD = '#56623e';
const DIRT = '#6a5a44';
const STRAW = '#b89a4a';

const doors = [
  streetDoor(-20, -22.25, 0, 1), streetDoor(-14, 18.25, 0, -1), streetDoor(20, 18.25, 0, -1),
  streetDoor(32.25, -13, -1, 0),
];

// The field gate at the top of the farm track, in the north hedge.
const elevator: Elevator = { position: { x: 10.5, y: 0, z: -22.25 }, normal: { x: 0, z: 1 }, width: 5, height: DOOR_HEIGHT, cabDepth: 4, cabWidth: 5 };

const stations: Station[] = [{ kind: 'ammo', position: { x: -31.95, y: 1.25, z: 9 }, normal: { x: 1, z: 0 } }];

// Lanterns on posts: along the road, at the junction, by the shed and up the track.
const lamp = (x: number, z: number, flicker = false): LevelLight => ({ position: { x, y: 3.6, z }, color: '#ffd29a', intensity: 24, flicker, post: true });
const lights: LevelLight[] = [lamp(-26, 5.2), lamp(-10, -5.2), lamp(6.6, -6.5, true), lamp(14.4, -15), lamp(18, 5.2), lamp(-20, -12.5), lamp(-4, 12, true)];

// A tree: a trunk, drawn as the whole tree, with its canopy well above head height (it only stops shots).
function tree(x: number, z: number): LevelBox[] {
  return [
    block(x, z, 0.6, 3.2, 0.6, '#4a3a2a', 'tree'),
    { position: { x, y: 4.6, z }, size: { x: 3.6, y: 2.8, z: 3.6 }, color: '#3a5a2e', surface: 'plain', hidden: true },
  ];
}
const piece = (box: LevelBox, parkPiece: NonNullable<LevelBox['parkPiece']>, facing?: number): LevelBox => ({ ...box, hidden: true, parkPiece, facing });
// A hay bale: a plain straw block, low enough to see and shoot over.
const bale = (x: number, z: number, alongX = true): LevelBox => block(x, z, alongX ? 1.8 : 1.2, 1.1, alongX ? 1.2 : 1.8, STRAW);

export const breakdown: Level = {
  name: 'Breakdown',
  theme: 'street',
  scenery: { north: 'trees', south: 'houses', west: 'trees', east: 'trees' },
  exitGate: true,
  atmosphere: { fog: '#3a3028', fogNear: 30, fogFar: 120, ambient: 1.5, sky: { horizon: '#9a6040', zenith: '#1c2236', stars: 0.1 } },
  boxes: [
    // The ground, in pieces that do not overlap: the two fields either side of the track, the road, the yards.
    ground(-32, 8, -22, -4, GRASS, 'plain'),
    ground(8, 13, -22, -4, DIRT, 'plain'),
    ground(13, 32, -22, -4, GRASS, 'plain'),
    ground(-32, 32, -4, 4, '#2e3034', 'slab'),
    ground(-32, 32, 4, 18, YARD, 'plain'),
    ...frontage('x', -22.25, -32.5, 32.5, [...doors, elevator], FRONT_HEIGHT, HEDGE, 'wall', [elevator]),
    ...frontage('x', 18.25, -32.5, 32.5, doors, FRONT_HEIGHT, FENCE, 'wall'),
    ...frontage('z', 32.25, -22, 18, doors, FRONT_HEIGHT, HEDGE, 'wall'),
    ...frontage('z', -32.25, -22, 18, [], FRONT_HEIGHT, HEDGE, 'wall'),
    ...checkpointBoxes(elevator, HEDGE),
    ...stationBoxes(stations),

    // On the road: the crew's ambulance, dry; the police car at the junction with its radio still working;
    // and the lorry jackknifed across both lanes at the east end, with what ran into it.
    { position: { x: -22, y: 1.275, z: -1.6 }, size: { x: 6.2, y: 2.55, z: 2.2 }, color: '#d6ddd7', surface: 'van', vehicleRole: 'ambulance' },
    { ...parkedCar(4, -2.4, '#2b3a63'), size: { x: 4.9, y: 1.5, z: 2.0 }, position: { x: 4, y: 0.75, z: -2.4 }, vehicleRole: 'police' },
    block(24, 0, 2.6, 2.7, 7.6, '#4a5560', 'container'),
    parkedCar(27.4, -1.2, '#6b2a2a', true),
    parkedCar(18.6, 1.9, '#2f4a5c'),
    parkedCar(-7, 2.2, '#a8782f'),
    block(15, -2.6, 0.8, 1.1, 3, '#8a8d90'),

    // The hay field, north-west: the shed, bales in a broken row, trees along the far hedge.
    piece(block(-22, -16, 5, 3.2, 4, '#7a6a58'), 'shed'),
    bale(-12, -9), bale(-9.6, -9.4), bale(-6, -13, false), bale(-14, -17), bale(-27, -8, false), bale(0, -18),
    ...tree(-29, -19), ...tree(-9, -19.5), ...tree(3, -11), ...tree(-17, -8),
    block(-18.4, -13.2, 0.7, 1, 0.7, '#3a3f44', 'barrel'), block(-25.6, -13.4, 1.6, 0.8, 0.8, '#4a5a3a'),

    // The paddock, north-east of the track.
    bale(19, -9), bale(24, -17, false), bale(27, -8),
    ...tree(17, -19), ...tree(29, -19.5), ...tree(22, -12.5),
    block(15.6, -8, 0.7, 1, 0.7, '#3a3f44', 'barrel'),

    // The front yards, south: a pickup on the grass, benches, wood stacks, and trees to break the view.
    parkedCar(-18, 9.5, '#344e41'),
    piece(block(-6, 14.6, 2, 0.5, 0.62, '#5a4a3a'), 'bench', Math.PI), piece(block(14, 14.6, 2, 0.5, 0.62, '#5a4a3a'), 'bench', Math.PI),
    block(-26, 13, 1.8, 1.1, 1.2, '#7a5f3c', 'crate'), block(6, 9, 1.8, 1.1, 1.2, '#7a5f3c', 'crate'), block(26, 12, 1.8, 1.1, 1.2, '#7a5f3c', 'crate'),
    ...tree(-28, 7.5), ...tree(-11, 12.5), ...tree(2, 15), ...tree(18, 8.5), ...tree(29, 15),
  ],
  ladders: [],
  lights,
  doors,
  gate: null,
  elevator,
  stations,
  locks: [],
  signs: [
    { text: 'NORTHLINE', sub: '9 MILES  /  GENERAL HOSPITAL', background: '#2c3a4d', position: { x: -31.96, y: 3.6, z: -9 }, rotation: Math.PI / 2, width: 3.4, height: 0.9 },
    { text: 'FIELD GATE', sub: 'FARM TRACK  /  ON FOOT FROM HERE', background: '#5b1b1b', position: { x: 16, y: 3.0, z: -21.96 }, rotation: 0, width: 3.2, height: 0.7 },
  ],
  // At first it is quiet: a few of the dead stand about the road, the field and the yards, asleep on their
  // feet, and the crew picks a way between them to the police car. Once the radio is found the hospital's
  // call is heard, and with it the hedges empty onto the crossroads. From then on the crew runs for the gate.
  flow: { kind: 'sweep', loud: 3, first: 4, from: [0, 1, 2, 3], then: { every: 3, max: 16 } },
  roamers: 2,
  residents: [
    { x: -3, z: -1.8, yaw: 0.6 }, { x: 0, z: 2.4, yaw: 2.4 }, { x: 10.5, z: -11, yaw: 3, roam: 2 }, { x: 13.5, z: 1.5, yaw: 1.2 },
    { x: -11, z: -14, yaw: -1, roam: 2 }, { x: 21, z: -14, yaw: 0.4, roam: 2 }, { x: -3, z: 9.5, yaw: -2.2, roam: 2 }, { x: 22, z: 9, yaw: 0.2 },
  ],
  cues: [
    { on: 'start', at: 1.5, speaker: CREW, text: 'Dry. Not a drop. The police car at the crossroads might still have a radio.' },
    { on: 'start', at: 9, speaker: CREW, text: 'Slowly. They are standing in the field and the yards. They have not noticed us.', seconds: 5.5 },
    { on: 'done', at: 0.5, speaker: HOSPITAL, text: 'All units, all units. Northline General is still receiving. Come in on foot if you have to.', seconds: 6 },
    { on: 'done', at: 7, speaker: CREW, text: 'They heard it too. The road east is blocked: up the farm track to the field gate. Run.', seconds: 5.5 },
  ],
  // The radio in the police car: the hospital's call is what sends them on.
  objective: { kind: 'keycard', label: 'Police radio', part: 'Hospital call', position: { x: 4, y: 1.0, z: -0.9 } },
  navBounds: { minX: -37, maxX: 37, minZ: -34, maxZ: 23 },
  ramp: null,
  // Out in the open there is nothing to board up: the crew walks the street and deals with what is on it.
  barricadeBars: [],
  streetSpawns: [],
  playerSpawns: [{ x: -16.5, y: 0, z: 1.2 }],
  spawnYaw: -Math.PI / 2,
  streetLamps: [],
  checkpoint: { x: -16.5, y: 0, z: 1.2 },
};
