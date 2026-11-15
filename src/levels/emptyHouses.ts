import type { Elevator, Level, LevelBox, LevelLight, Station } from './types';
import { CREW } from './voices';
import { block, checkpointBoxes, frontage, ground, parkedCar, streetDoor } from './streetKit';
import { DOOR_HEIGHT, stationBoxes } from './wardKit';

// Act 10, Empty Houses: a quiet street in the old town, the morning after an evacuation. Nobody is
// hunting the crew. They walk the street and choose which houses to go into. The middle house has the
// handwritten route note that names the shelter; the other two have what the people left behind. The
// north-east house is where the sleeping dead are: going in there and firing wakes the whole street.
// The back lane passes behind the houses, and the note says which way the family went.
//
//   z -12 +--gap-----------------------------gap----+
//         |  [HOUSE A]   [HOUSE B: note]   [HOUSE C: sleepers] |
//   (in)  >   street                                   > back lane
//         |  (cars)        (hedges)                    |
//   z  12 +----------------------------------------+
//        x -26                                    26

const WALL = '#6f6a5e';
const HOUSE = '#7a6e5a';
const HOUSE2 = '#6a7066';
const HOUSE3 = '#6e5f5a';
const ROAD = '#2a2d32';
const LAWN = '#4a5240';
const CRATE = '#6a5a3e';
const HEDGE = '#3a4a34';

const doors = [streetDoor(-10, -12.25, 0, 1), streetDoor(18, -12.25, 0, 1), streetDoor(-6, 12.25, 0, -1)];

const elevator: Elevator = { position: { x: 26.25, y: 0, z: 0 }, normal: { x: -1, z: 0 }, width: 6, height: DOOR_HEIGHT, cabDepth: 4, cabWidth: 6 };

const stations: Station[] = [
  { kind: 'ammo', position: { x: -25.95, y: 1.25, z: 8 }, normal: { x: 1, z: 0 } },
];

// A house with its front, on the street side (south), open at a doorway. Three walls and a split front;
// there is no roof, so the dead and the crew can see and shoot in over it.
function house(cx: number, cz: number, w: number, d: number, color: string): LevelBox[] {
  const t = 0.3, h = 2.6, gap = 2.2;
  const front = cz + d / 2;
  const side = (w - gap) / 2;
  return [
    block(cx, cz - d / 2, w, h, t, color, 'wall'),
    block(cx - w / 2, cz, t, h, d, color, 'wall'),
    block(cx + w / 2, cz, t, h, d, color, 'wall'),
    block(cx - gap / 2 - side / 2, front, side, h, t, color, 'wall'),
    block(cx + gap / 2 + side / 2, front, side, h, t, color, 'wall'),
  ];
}

const lamp = (x: number, z: number, flicker = false): LevelLight => ({ position: { x, y: 3.4, z }, color: '#e8d4a8', intensity: 18, flicker, post: true });
const lights: LevelLight[] = [lamp(-20, 2), lamp(-4, -2, true), lamp(10, 2), lamp(20, -2, true)];

export const emptyHouses: Level = {
  name: 'Empty Houses',
  theme: 'street',
  exitGate: true,
  scenery: { north: 'trees', south: 'trees', east: 'trees', west: 'trees', skyline: false },
  atmosphere: { fog: '#3c3e44', fogNear: 12, fogFar: 60, ambient: 1.2, sky: { horizon: '#8a7a68', zenith: '#222a40', stars: 0.15 } },
  boxes: [
    ground(-26, 26, -12, 12, LAWN, 'plain'),
    ground(-26, 26, -2.5, 3.5, ROAD, 'slab'),
    ...frontage('x', -12.25, -26.5, 26.5, doors, 2.8, WALL, 'wall'),
    ...frontage('x', 12.25, -26.5, 26.5, doors, 2.8, WALL, 'wall'),
    ...frontage('z', -26.25, -12, 12, [], 2.8, WALL, 'wall'),
    ...frontage('z', 26.25, -12, 12, [elevator], 4.6, '#6e7479', 'building', [elevator]),
    ...checkpointBoxes(elevator, '#6e7479'),
    ...stationBoxes(stations),

    // Three houses on the north side of the street.
    ...house(-16, -8, 8, 7, HOUSE),
    ...house(-2, -8, 8, 7, HOUSE2),
    ...house(14, -8, 8, 7, HOUSE3),
    // Tables: the route note on the middle house's, a family's belongings on the first.
    block(-2, -9.5, 1.4, 0.8, 1.0, CRATE, 'crate'),
    block(-16, -9.5, 1.4, 0.8, 1.0, CRATE, 'crate'),
    // The south side: hedges, a few cars left where the street emptied.
    block(-14, 8, 6, 1.0, 0.8, HEDGE, 'plain'), block(6, 8.5, 6, 1.0, 0.8, HEDGE, 'plain'),
    parkedCar(-20, 1, '#4a4f55'), parkedCar(4, 0.2, '#7a3030', true), parkedCar(18, 2.4, '#4a5a3a'),
    block(10, 5.5, 1.8, 0.9, 1.4, '#7a7d7e', 'plain'),
  ],
  ladders: [],
  lights,
  doors,
  gate: null,
  elevator,
  stations,
  locks: [],
  signs: [
    { text: 'MILL STREET', sub: 'OLD TOWN  /  EVACUATED', background: '#1b4a5b', position: { x: -25.96, y: 2.4, z: -3.6 }, rotation: Math.PI / 2, width: 3.0, height: 0.7 },
  ],
  // The handwritten route note, on the middle house's table: which way the families were sent.
  objective: { kind: 'keycard', label: 'Route note', part: 'Where the street went', position: { x: -2, y: 0.95, z: -9.5 } },
  // A sweep: the street is quiet. A gunshot, or an alarm, wakes the sleepers and brings the rest.
  flow: { kind: 'sweep', loud: 2, first: 4 },
  roamers: 0,
  // The sleepers: four, in and about the north-east house.
  residents: [
    { x: 12, z: -9, yaw: 0.4 }, { x: 15, z: -10, yaw: -2 }, { x: 14, z: -6, yaw: 1.2 }, { x: 17, z: -7, yaw: 2.4 },
  ],
  notes: [
    {
      position: { x: -16, y: 0.92, z: -9.5 },
      what: 'belongings',
      title: 'Left behind',
      lines: [
        'A child\'s coat, a packed bag with the zip open, and a cup still on the table.',
        'On the fridge: a bus number, and "ASSEMBLY 6:40. BRING THE DOG."',
        'They left in a hurry, and they left together.',
      ],
    },
    {
      position: { x: -2, y: 0.92, z: -9.5 },
      what: 'route note',
      title: 'Handwritten route note',
      lines: [
        'EMPTY BY NOON. DO NOT STOP ON MILL STREET.',
        'Back lane to the east, past the water tower. The old school is the shelter now. The lights there come from the generator, when it runs.',
        'The Ward family went with the second bus. Sam had a fever. They will have been looked at.',
      ],
    },
  ],
  cues: [
    { on: 'start', at: 1.5, speaker: CREW, text: 'Mill Street. Quiet. Whatever happened here, it was done in a hurry.' },
    { on: 'start', at: 8, speaker: CREW, text: 'Search the houses. Not all of them. The north-east one has company.', seconds: 6 },
    { on: 'done', at: 0.6, speaker: CREW, text: 'The school. The shelter is the school. We go by the back lane.' },
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
