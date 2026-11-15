import type { Elevator, Level, LevelLight, Station } from './types';
import { CREW } from './voices';
import { block, checkpointBoxes, frontage, ground, parkedCar, streetDoor } from './streetKit';
import { DOOR_HEIGHT, stationBoxes } from './wardKit';

// Act 5, Inventory of the Living: the outskirts camp in the first quiet hour, before anything attacks it.
// Nobody is hunting the crew here. They walk the camp and check its four needs: medical, water,
// shelter and the generator. Each check restores that part's lights, and a ledger card beside it says
// what it has and what it lacks. When all four are checked the camp is visibly alive, and the road gate
// opens. No waves.
//
//   z -12 +----------------------------------------+
//         |  [MEDICAL]  [WATER]    tents   [SHELTER] |
//   (in)  >   track                                  > road gate
//         |  [GENERATOR]   (supply stack)           |
//   z  12 +----------------------------------------+
//        x -28                                    28

const FENCE = '#6b6258';
const CANVAS = '#7d8068';
const CANVAS_DARK = '#5e6450';
const CRATE = '#6a5a3e';
const MEDICAL = '#c9cdc4';
const STEEL = '#5b6068';
const GENERATOR = '#4a5a3a';

// Four gaps in the fence, so the dead have somewhere to come from if the camp is shot up.
const doors = [streetDoor(-16, -12.25, 0, 1), streetDoor(12, -12.25, 0, 1), streetDoor(-6, 12.25, 0, -1), streetDoor(16, 12.25, 0, -1)];

const elevator: Elevator = { position: { x: 28.25, y: 0, z: 0 }, normal: { x: -1, z: 0 }, width: 6, height: DOOR_HEIGHT, cabDepth: 4, cabWidth: 6 };

const stations: Station[] = [
  { kind: 'ammo', position: { x: -27.95, y: 1.25, z: 8 }, normal: { x: 1, z: 0 } },
];

const tent = (x: number, z: number, long: number, wide: number, dark = false) => block(x, z, long, 2.2, wide, dark ? CANVAS_DARK : CANVAS, 'plain');

// Circuits: 0 medical, 1 water, 2 shelter, 3 generator. Each facility's lights come on when it is checked.
const flood = (x: number, z: number, circuit: number, flicker = false): LevelLight => ({ position: { x, y: 4.2, z }, color: '#fff0cc', intensity: 34, circuit, flicker });
const lantern = (x: number, z: number): LevelLight => ({ position: { x, y: 2.4, z }, color: '#ffb068', intensity: 12 });
const lights: LevelLight[] = [
  flood(-20, -8, 0), flood(-16, -8, 0), flood(-8, -8, 1), flood(-4, -8, 1, true), flood(14, -8, 2), flood(20, -8, 2), flood(-14, 8, 3), flood(-8, 8, 3),
  lantern(-24, 2), lantern(0, 0), lantern(12, 2),
];

// A ledger card, read for what the facility has and lacks. It goes into the run's log.
const card = (x: number, z: number, title: string, lines: string[]) => ({ position: { x, y: 0.92, z }, what: 'camp ledger', title, lines });

export const inventory: Level = {
  name: 'Inventory of the Living',
  theme: 'street',
  scenery: { north: 'trees', south: 'trees', east: 'trees', west: 'trees', skyline: false },
  exitGate: true,
  atmosphere: { fog: '#34383e', fogNear: 14, fogFar: 70, ambient: 1.5, sky: { horizon: '#8a6a60', zenith: '#1c2440', stars: 0.4 } },
  boxes: [
    ground(-28, 28, -12, 12, '#4a4636', 'plain'),
    ground(-28, 28, -2, 2, '#6e6a5e', 'plain'),
    ...frontage('x', -12.25, -28.5, 28.5, doors, 2.6, FENCE, 'wall'),
    ...frontage('x', 12.25, -28.5, 28.5, doors, 2.6, FENCE, 'wall'),
    ...frontage('z', -28.25, -12, 12, [], 2.6, FENCE, 'wall'),
    ...frontage('z', 28.25, -12, 12, [elevator], 4.6, '#6e7479', 'building', [elevator]),
    ...checkpointBoxes(elevator, '#6e7479'),
    ...stationBoxes(stations),

    // Medical: a pale tent with cots, in the north-west.
    tent(-18, -8.5, 6, 3.6), block(-22, -6, 2, 0.8, 1.2, MEDICAL, 'crate'),
    // Water: a tank on a stand and a line of jerrycans.
    block(-6, -9, 2.6, 2.4, 2.6, STEEL, 'crate'), block(-3, -8.4, 1.8, 0.7, 0.8, CRATE, 'crate'),
    // Shelter: tents in rows, some without canvas.
    tent(14, -8, 5, 3.4), tent(20, -8, 5, 3.4, true), tent(14, 8, 5, 3.4, true), tent(21, 8, 5, 3.4),
    // The generator on a trailer, south-west, and the supply stack in the middle.
    block(-11, 9.4, 4.4, 2.2, 2.0, GENERATOR, 'crate'),
    block(0, 7, 2.6, 1.6, 1.8, CRATE, 'crate'), block(2.5, 6, 1.6, 1.0, 1.4, CRATE, 'crate'),
    parkedCar(-12, 3.6, '#4a5a3a', true),
    // Tables the ledger cards lie on.
    block(17, -3.4, 1.2, 0.8, 1.2, CRATE, 'crate'), block(-11, 7, 1.2, 0.8, 1.2, CRATE, 'crate'),
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
  ],
  // Nobody wanders the camp, and a lone shot only calls a couple: this is the quiet hour.
  roamers: 0,
  flow: { kind: 'sweep', loud: 2, first: 2 },
  // Four facilities, each checked at its panel. Each brings its lights back.
  objective: {
    kind: 'breakers',
    label: 'Facility check',
    part: 'Camp inventory',
    panels: [
      { position: { x: -18, y: 1.45, z: -6.66 }, normal: { x: 0, z: 1 } },
      { position: { x: -6, y: 1.45, z: -7.66 }, normal: { x: 0, z: 1 } },
      { position: { x: 14, y: 1.45, z: -6.26 }, normal: { x: 0, z: 1 } },
      { position: { x: -11, y: 1.45, z: 8.36 }, normal: { x: 0, z: -1 } },
    ],
  },
  notes: [
    card(-22, -6, 'Ledger: medical', ['MEDICAL  /  TENT 1', 'Bandages: low. Antibiotics: none. Eleven people need a dressing changed today.', 'Two of the new arrivals have fevers. The nurse wants them kept apart.', 'Needs: clean water, and a dry place for the cots.']),
    card(-3, -8.4, 'Ledger: water', ['WATER', 'One tank, a third full. Rationed at two litres a head.', 'Every rescue from the road adds a mouth. The well pump needs power.', 'Needs: fuel for the pump, and a second tank.']),
    card(17, -3.4, 'Ledger: shelter', ['SHELTER', 'Forty-one beds, sixty-eight people. Some are sleeping in vehicles.', 'The north fence is thin. The tents are canvas.', 'Needs: timber, tarps, and a place for the research crate the scientist is carrying.']),
    card(-11, 7, 'Ledger: generator', ['GENERATOR', 'One trailer set, three days of fuel at half load. The floodlights are on a separate circuit.', 'If it fails the camp is dark and the fence is blind.', 'Needs: fuel, and someone who can keep it running.']),
  ],
  cues: [
    { on: 'start', at: 1.5, speaker: CREW, text: 'The camp. Quiet, for now. Let us see what they have and what they need.' },
    { on: 'start', at: 8, speaker: CREW, text: 'Medical, water, shelter, generator. Check each one at its panel and read what is written.', seconds: 6 },
    { on: 'done', at: 0.6, speaker: CREW, text: 'Four lists, none of them long enough. The road out of here runs east.' },
  ],
  navBounds: { minX: -33, maxX: 33, minZ: -17, maxZ: 17 },
  ramp: null,
  barricadeBars: [],
  streetSpawns: [],
  playerSpawns: [{ x: -24, y: 0, z: 4 }],
  spawnYaw: -Math.PI / 2,
  streetLamps: [],
  checkpoint: { x: -24, y: 0, z: 4 },
};
