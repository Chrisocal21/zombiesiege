import type { Elevator, Level, LevelBox, LevelLight, Station } from './types';
import { BROADCAST, CREW, PILOT } from './voices';
import { block, frontage, ground, streetDoor } from './streetKit';
import { DOOR_HEIGHT, stationBoxes } from './wardKit';

// Act 4, the finish: the park. A wide field of grass with paths across it, trees along the edges and
// the hedge round it broken at five gates, a fountain in a plaza on the main path, flower beds, benches
// and a bandstand. The sun is nearly up. The transit lift comes up in a
// stone pavilion at the west edge. The extraction is a ring of red signal flares: the flare box is
// on the side of the groundskeeper's shed in the north-west. Throw them out onto the field and hold
// it while the smoke goes up, until the air ambulance comes down in the middle of the grass, then
// get everyone aboard. There is no pad: the smoke is the landing zone.
//
//   z -18 +--gate---------------gate--------------+
//         |  [SHED:flare]       (trees)             |
//         |                   ( LANDING ZONE )      gate
//   LIFT  >    paths             O O                 |
//         |                                         |
//   z  18 +--------gate---------------gate----------+
//        x -26                                    26

const HEDGE = '#2f4a2c';
const GRASS = '#4a6a3a';
const STONE = '#8a8d90';

const doors = [
  streetDoor(-10, -18.25, 0, 1), streetDoor(12, -18.25, 0, 1),
  streetDoor(-6, 18.25, 0, -1), streetDoor(14, 18.25, 0, -1),
  streetDoor(26.25, -8, -1, 0),
];

const elevator: Elevator = { position: { x: -26.25, y: 0, z: 0 }, normal: { x: 1, z: 0 }, width: 2.2, height: DOOR_HEIGHT, cabDepth: 3, cabWidth: 3 };

const stations: Station[] = [
  { kind: 'ammo', position: { x: -25.95, y: 1.25, z: -9 }, normal: { x: 1, z: 0 } },
  { kind: 'shotgun', weapon: 'ak', position: { x: -25.95, y: 1.25, z: 9 }, normal: { x: 1, z: 0 } },
];

// A tree: a trunk, drawn as the whole tree, with its canopy well above head height (not drawn: it only
// stops shots).
function tree(x: number, z: number): LevelBox[] {
  return [
    block(x, z, 0.6, 3.2, 0.6, '#4a3a2a', 'tree'),
    { position: { x, y: 4.6, z }, size: { x: 3.6, y: 2.8, z: 3.6 }, color: '#3a5a2e', surface: 'plain', hidden: true },
  ];
}

// Lanterns on iron posts along the paths.
const lamp = (x: number, z: number, flicker = false): LevelLight => ({ position: { x, y: 3.6, z }, color: '#ffe0b0', intensity: 22, flicker, post: true });
const lights: LevelLight[] = [lamp(-19, 2.3), lamp(-7, -2.3), lamp(-2.3, -11), lamp(2.3, 11, true), lamp(11, -2.3), lamp(16, 3.5)];

// A box drawn by the park's own dressing (render/park.ts) instead of as a box.
const piece = (box: LevelBox, parkPiece: NonNullable<LevelBox['parkPiece']>, facing?: number): LevelBox => ({ ...box, hidden: true, parkPiece, facing });
// A park bench, long along x or z, with its front (the seat side) facing `facing` (0 is +z).
const bench = (x: number, z: number, alongX: boolean, facing: number): LevelBox =>
  piece(block(x, z, alongX ? 2 : 0.62, 0.5, alongX ? 0.62 : 2, '#5a4a3a'), 'bench', facing);

// The fountain in the plaza on the main path, and the bandstand at the east end.
const FOUNTAIN = { x: -13, z: 0 };
const BAND = { x: 20, z: 0, size: 5, height: 0.9 };

export const park: Level = {
  name: 'The park',
  theme: 'street',
  scenery: { north: 'trees', south: 'trees', east: 'trees', skyline: true },
  atmosphere: { fog: '#8a7a80', fogNear: 25, fogFar: 110, ambient: 1.9, sky: { horizon: '#d98a62', zenith: '#27324e', stars: 0.15 } },
  boxes: [
    piece(ground(-26, 26, -18, 18, GRASS, 'plain'), 'lawn'),
    // The paths: one east to west across the field, one north to south (drawn with the plaza).
    piece(ground(-26, 26, -1.5, 1.5, '#9a958a'), 'path'),
    piece(ground(-1.5, 1.5, -18, 18, '#9a958a'), 'path'),
    ...frontage('x', -18.25, -26.5, 26.5, doors, 2.6, HEDGE, 'wall'),
    ...frontage('x', 18.25, -26.5, 26.5, doors, 2.6, HEDGE, 'wall'),
    ...frontage('z', -26.25, -18, 18, [elevator], 4.6, STONE, 'wall'),
    ...frontage('z', 26.25, -18, 18, doors, 2.6, HEDGE, 'wall'),
    ...stationBoxes(stations),

    // The groundskeeper's shed, with the flare box on its east wall.
    piece(block(-20, -14, 5, 3.2, 4, '#7a6a58'), 'shed'),
    // Trees along the edges, well clear of the landing zone.
    ...[[-20, -4.5], [-19, 6.5], [-12, -12], [-11, 12], [10, -13], [12, 13], [20, -12], [21, 6.5], [22, 13]].flatMap(([x, z]) => tree(x, z)),
    // Benches facing the paths and the fountain.
    bench(-6, -2.55, true, 0), bench(6, 2.55, true, Math.PI),
    bench(-2.55, -9, false, Math.PI / 2), bench(2.55, 9, false, -Math.PI / 2),
    bench(FOUNTAIN.x, FOUNTAIN.z - 3.7, true, 0), bench(FOUNTAIN.x, FOUNTAIN.z + 3.7, true, Math.PI),
    // The fountain: a stone basin with a column in the middle (the column stops shots).
    piece(block(FOUNTAIN.x, FOUNTAIN.z, 2.7, 0.55, 2.7, STONE), 'fountain'),
    { position: { x: FOUNTAIN.x, y: 1.3, z: FOUNTAIN.z }, size: { x: 0.6, y: 1.5, z: 0.6 }, color: STONE, hidden: true },
    // Stone planters by the crossing and the bandstand.
    piece(block(-3.6, 3.6, 1.6, 0.8, 1.6, STONE), 'planter'),
    piece(block(15, -4, 1.6, 0.8, 1.6, STONE), 'planter'),
    // A bandstand at the east side: a raised stage to fight from, up two steps on its west side, under
    // a roof on four posts.
    piece(block(BAND.x, BAND.z, BAND.size, BAND.height, BAND.size, STONE), 'bandstand'),
    { position: { x: BAND.x - BAND.size / 2 - 0.2, y: 0.3, z: BAND.z }, size: { x: 0.4, y: 0.6, z: 2 }, color: STONE, surface: 'step' },
    { position: { x: BAND.x - BAND.size / 2 - 0.6, y: 0.15, z: BAND.z }, size: { x: 0.4, y: 0.3, z: 2 }, color: STONE, surface: 'step' },
    ...[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sx, sz]): LevelBox => ({
      position: { x: BAND.x + sx * (BAND.size / 2 - 0.2), y: BAND.height + 1.55, z: BAND.z + sz * (BAND.size / 2 - 0.2) },
      size: { x: 0.2, y: 3.1, z: 0.2 }, color: '#e8e2d4', hidden: true,
    })),
    { position: { x: BAND.x, y: BAND.height + 3.35, z: BAND.z }, size: { x: BAND.size + 0.6, y: 0.5, z: BAND.size + 0.6 }, color: '#4a3a34', hidden: true },
  ],
  ladders: [],
  lights,
  doors,
  gate: null,
  elevator,
  stations,
  locks: [],
  signs: [
    { text: 'PUBLIC PARK', sub: 'OPEN DAWN TO DUSK', background: '#1b5b4d', position: { x: -12, y: 2.0, z: 17.96 }, rotation: Math.PI, width: 2.6, height: 0.7 },
    { text: 'TRANSIT LIFT', sub: 'PAVILION  /  STAFF', background: '#1b5b4d', position: { x: -25.96, y: 3.0, z: 3.6 }, rotation: Math.PI / 2, width: 2.4, height: 0.5 },
  ],
  // A walk down the road: the dead already about it walk where they please until they see or hear the
  // crew, every gunshot brings more out of the doorways, and once the job is done they come after the crew.
  flow: { kind: 'sweep', loud: 3, first: 5 },
  // The flare box on the shed's east wall. The air ambulance comes down on the landing zone.
  objective: {
    kind: 'signal',
    label: 'Signal flares',
    part: 'Extraction',
    style: 'flares',
    device: { position: { x: -17.5, y: 1.45, z: -14 }, normal: { x: 1, z: 0 } },
    pad: { x: 5, y: 0, z: 0 },
    padRadius: 5,
    seconds: 90,
  },
  cues: [
    { on: 'start', at: 1.5, speaker: CREW, text: 'The park. Flat ground at last. The flares are in the groundskeeper shed.' },
    { on: 'start', at: 8, speaker: PILOT, text: 'We see the smoke when you light it. Hold the field and we will come down.', seconds: 6 },
  ],
  // The flight out, over the city at sunrise, and the run is over.
  flight: {
    seconds: 18,
    shots: [
      { from: 0, to: 5, start: { at: { x: -4, y: 1.7, z: 7 }, look: { x: 5, y: 3, z: 0 } }, end: { at: { x: -2, y: 2.4, z: 6 }, look: { x: 5, y: 14, z: 0 } } },
      { from: 5, to: 11.5, start: { at: { x: 12, y: 24, z: 34 }, look: { x: 40, y: 20, z: -2 } }, end: { at: { x: 14, y: 30, z: 30 }, look: { x: 100, y: 28, z: -18 } } },
      { from: 11.5, to: 18, start: { at: { x: 0, y: 70, z: 20 }, look: { x: -120, y: 26, z: -50 } }, end: { at: { x: 0, y: 80, z: 20 }, look: { x: -120, y: 34, z: -30 } } },
    ],
    captions: [
      { from: 1, to: 5, speaker: PILOT, line: 'Everyone aboard. Lifting. Hold on.' },
      { from: 5.5, to: 11, speaker: BROADCAST, line: 'Northline is lost. New outbreaks are reported beyond the city. Do not return.' },
      { from: 11.5, to: 14.5, speaker: BROADCAST, line: 'Survivors are being received at the outskirts camp. Follow the signal east.' },
      { from: 14.7, to: 17.6, title: 'OUTSKIRTS CAMP', line: 'Safe. For now.' },
    ],
  },
  navBounds: { minX: -31, maxX: 31, minZ: -23, maxZ: 23 },
  ramp: null,
  // Out in the open there is nothing to board up: the crew walks the street and deals with what is on it.
  barricadeBars: [],
  streetSpawns: [],
  playerSpawns: [{ x: -22, y: 0, z: 0 }],
  spawnYaw: -Math.PI / 2,
  streetLamps: [],
  checkpoint: { x: -22, y: 0, z: 0 },
};
