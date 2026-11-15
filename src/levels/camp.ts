import type { Elevator, Level, LevelLight, Station } from './types';
import { CREW } from './voices';
import { block, frontage, ground, parkedCar, streetDoor } from './streetKit';
import { DOOR_HEIGHT, stationBoxes } from './wardKit';

// Act 5, Last Refuge: the outskirts camp at nightfall. A rectangle of tents, a garage shed and stacked
// supplies behind a chain-and-timber fence, with four gaps torn in it where the dead come through. The
// camp's generators are down: the floodlights on their masts are dark until they are thrown again, and
// the camp has to hold on the few lamps it still has. East of the middle runs an inner fence round the
// medical yard, with one gate, where everyone falls back when the line breaks.
//
//   z -14 +--gap----------------gap------------------+
//         |  tents   [GEN A]     |  yard  [GEN B]      |
//   ROAD  >  (garage)             gate  (triage)       >  LIFT
//         |          [supplies]  |                     |
//   z  14 +-------gap---------------------gap---------+
//        x -28                                       28

const FENCE = '#6b6258';
const CANVAS = '#7d8068';
const CANVAS_DARK = '#5e6450';
const CRATE = '#6a5a3e';
const MEDICAL = '#c9cdc4';
const STEEL = '#5b6068';
const GENERATOR = '#4a5a3a';

const doors = [streetDoor(-16, -14.25, 0, 1), streetDoor(4, -14.25, 0, 1), streetDoor(-8, 14.25, 0, -1), streetDoor(14, 14.25, 0, -1)];

const elevator: Elevator = { position: { x: 28.25, y: 0, z: 0 }, normal: { x: -1, z: 0 }, width: 3, height: DOOR_HEIGHT, cabDepth: 3, cabWidth: 3 };

const stations: Station[] = [
  { kind: 'ammo', position: { x: -27.95, y: 1.25, z: 8 }, normal: { x: 1, z: 0 } },
  { kind: 'shotgun', weapon: 'ak', position: { x: 27.95, y: 1.25, z: -8 }, normal: { x: -1, z: 0 } },
];

// A tent: a low canvas block with a lifted front, drawn as a box.
const tent = (x: number, z: number, long: number, wide: number, dark = false) => block(x, z, long, 2.2, wide, dark ? CANVAS_DARK : CANVAS, 'plain');

// Circuit 0 is the west camp (generator A), circuit 1 the medical yard (generator B). Until they are
// thrown the floodlights are dark; the lanterns stay lit on their own.
const flood = (x: number, z: number, circuit: number, flicker = false): LevelLight => ({ position: { x, y: 4.2, z }, color: '#fff0cc', intensity: 40, circuit, flicker });
const lantern = (x: number, z: number, flicker = false): LevelLight => ({ position: { x, y: 2.4, z }, color: '#ffb068', intensity: 12, flicker });
const lights: LevelLight[] = [
  flood(-20, -9, 0), flood(-14, 9, 0, true), flood(-6, -9, 0), flood(2, 10, 0), flood(14, -9, 1), flood(20, 9, 1, true), flood(24, -3, 1),
  lantern(-24, 3), lantern(-10, 0, true), lantern(8, 1), lantern(18, 0),
  ...([[-26, -6], [1, -1], [26, 5]] as const).map(([x, z]): LevelLight => ({ position: { x, y: 2.75, z }, color: '#ff2a1a', intensity: 3, emergency: true })),
];

export const camp: Level = {
  name: 'Last Refuge',
  theme: 'street',
  scenery: { north: 'trees', south: 'trees', east: 'trees', west: 'trees', skyline: false },
  atmosphere: { fog: '#2a2e36', fogNear: 12, fogFar: 62, ambient: 1.2, sky: { horizon: '#5a4a52', zenith: '#10162a', stars: 0.55 } },
  boxes: [
    ground(-28, 28, -14, 14, '#4a4636', 'plain'),
    // The gravel track down the middle of the camp.
    ground(-28, 28, -2, 2, '#6e6a5e', 'plain'),
    ...frontage('x', -14.25, -28.5, 28.5, doors, 2.6, FENCE, 'wall'),
    ...frontage('x', 14.25, -28.5, 28.5, doors, 2.6, FENCE, 'wall'),
    ...frontage('z', -28.25, -14, 14, [], 2.6, FENCE, 'wall'),
    ...frontage('z', 28.25, -14, 14, [elevator], 3.6, STEEL, 'wall', [elevator]),
    ...stationBoxes(stations),

    // The west camp: sleeping tents either side of the track, and the garage shed at the far end.
    tent(-22, -8, 5, 3.4), tent(-22, 6, 5, 3.4, true), tent(-14, -8, 5, 3.4, true), tent(-12, 7, 5, 3.4),
    block(-25, 0, 3.2, 2.8, 5.4, '#6d7176', 'building'),
    parkedCar(-18, 0.2, '#4a5a3a', true),
    // Supplies stacked in the middle: crates and a water tank, the thing the dead come for.
    block(-3, -6, 2.4, 1.4, 1.6, CRATE, 'crate'), block(-1, -7, 1.4, 1, 1.4, CRATE, 'crate'),
    block(-2, 6.5, 2.6, 1.8, 1.8, STEEL, 'crate'), block(1.5, 5.5, 1.6, 1.0, 1.4, CRATE, 'crate'),
    // The generators, each with its switchgear on the face that looks at the track.
    block(-8, -11.4, 4.4, 2.2, 2.0, GENERATOR, 'crate'),
    block(16, -11.4, 4.4, 2.2, 2.0, GENERATOR, 'crate'),

    // The inner fence round the medical yard, with one gate in the west side where the track runs in.
    block(10, -8, 0.3, 2.4, 12, FENCE, 'wall'),
    block(10, 8.5, 0.3, 2.4, 11, FENCE, 'wall'),
    // Triage: cots under a pale awning, and a stack of medical crates.
    tent(20, -6, 6, 3.6), block(20, 7, 5, 0.7, 2.2, MEDICAL, 'crate'), block(15, 6.5, 2, 1.1, 1.4, CRATE, 'crate'),
    block(24.5, 0, 2, 1.6, 4, STEEL, 'crate'),
    // Sandbags at the gaps, to fight from.
    block(-16, -11.6, 2.4, 0.9, 0.8, '#8a7d5a'), block(4, -11.6, 2.4, 0.9, 0.8, '#8a7d5a'),
    block(-8, 11.6, 2.4, 0.9, 0.8, '#8a7d5a'), block(14, 11.6, 2.4, 0.9, 0.8, '#8a7d5a'),
  ],
  ladders: [],
  lights,
  doors,
  gate: null,
  elevator,
  stations,
  locks: [],
  signs: [
    { text: 'LAST REFUGE', sub: 'SURVIVOR CAMP  /  REGISTER HERE', background: '#1b4a5b', position: { x: -27.96, y: 2.2, z: -3.6 }, rotation: Math.PI / 2, width: 2.8, height: 0.7 },
    { text: 'MEDICAL', sub: 'TRIAGE YARD', background: '#5b1b1b', position: { x: 9.84, y: 1.9, z: 0 }, rotation: -Math.PI / 2, width: 2.0, height: 0.6 },
    { text: 'CAMP LIFT', sub: 'FUEL  /  ROAD  /  NEXT', background: '#1b5b4d', position: { x: 27.96, y: 3.0, z: 3.6 }, rotation: -Math.PI / 2, width: 2.4, height: 0.5 },
  ],
  // The siege: waves come through the four gaps in the fence. Afterwards the two generators are
  // thrown, the camp lights come up, and the lift opens.
  flow: { kind: 'siege' },
  objective: {
    kind: 'breakers',
    label: 'Generators',
    part: 'Camp floodlights',
    panels: [
      { position: { x: -8, y: 1.45, z: -10.35 }, normal: { x: 0, z: 1 } },
      { position: { x: 16, y: 1.45, z: -10.35 }, normal: { x: 0, z: 1 } },
    ],
  },
  cues: [
    { on: 'start', at: 1.5, speaker: CREW, text: 'The camp. Fences, tents, and the lights are out. They will come for the noise.' },
    { on: 'start', at: 8, speaker: CREW, text: 'Hold the gaps. If the line breaks, fall back to the medical yard.', seconds: 6 },
    { on: 'wave', wave: 3, at: 2, speaker: CREW, text: 'The line will not hold. Fall back to the medical yard. Use the gate, make them come through it.', seconds: 7 },
    { on: 'wave', wave: 3, at: 11, speaker: CREW, text: 'Hold the gate. Nothing gets into the yard except through that gap.', seconds: 5 },
    { on: 'wave', wave: 4, at: 2, speaker: CREW, text: 'Last push. They are all at the gate. Take them there, then get the generators back.', seconds: 7 },
    { on: 'done', at: 0.6, speaker: CREW, text: 'Generators are running, the camp is lit. Fuel and a way out of here are next.' },
  ],
  navBounds: { minX: -33, maxX: 33, minZ: -19, maxZ: 19 },
  ramp: null,
  // Planks from the supply stack, to close two of the four gaps before the first wave.
  barricadeBars: [
    { x: -5, y: 0, z: -4 },
    { x: 6, y: 0, z: 4 },
  ],
  streetSpawns: [],
  playerSpawns: [{ x: -24, y: 0, z: 4 }],
  spawnYaw: -Math.PI / 2,
  streetLamps: [],
  checkpoint: { x: -24, y: 0, z: 4 },
};
