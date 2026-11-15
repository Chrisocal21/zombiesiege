import type { Elevator, Level, LevelLight, Station } from './types';
import { CREW } from './voices';
import { block, checkpointBoxes, frontage, ground, parkedCar, streetDoor } from './streetKit';
import { DOOR_HEIGHT, stationBoxes } from './wardKit';

// Act 9, Split Claim: a depot two settlements share, and one load that both have signed for. The clinic
// at Lincoln Road needs the medicine in it for a fever ward; the mill sent grain for the whole load last
// month and has the paper to show it. Each has a radio post at its own end of the yard and neither knows
// what the other knows. Two steps. Read the manifest in the depot. Then settle it, one of four ways: stand
// on the load until both sides stand down (the long, loud way); pay the mill's claim; walk the medicine
// across with the clinic's porters, which is free and loud; or ask each side what it knows and tell the
// mill about the ward, which costs nothing because nobody had told them.
//
//   z -12 +--gap-------------------------gap---------+
//         | [CLINIC POST]     +------+                |
//   (in)  >                   | load |                 > road out
//         |                   +------+   [MILL POST]  |
//   z  12 +--------gap------------------gap----------+
//        x -26                                    26

const WALL = '#66625a';
const YARD = '#55584e';
const ROAD = '#2c2f33';
const CRATE = '#6a5a3e';
const TARP = '#4a5a6a';
const STEEL = '#586068';

const doors = [streetDoor(-16, -12.25, 0, 1), streetDoor(10, -12.25, 0, 1), streetDoor(-8, 12.25, 0, -1), streetDoor(16, 12.25, 0, -1)];

const elevator: Elevator = { position: { x: 26.25, y: 0, z: 0 }, normal: { x: -1, z: 0 }, width: 6, height: DOOR_HEIGHT, cabDepth: 4, cabWidth: 6 };

const stations: Station[] = [
  { kind: 'ammo', position: { x: -25.95, y: 1.25, z: 8 }, normal: { x: 1, z: 0 } },
];

const lamp = (x: number, z: number, flicker = false): LevelLight => ({ position: { x, y: 3.6, z }, color: '#ffd9a0', intensity: 26, flicker, post: true });
const lights: LevelLight[] = [lamp(-20, 2), lamp(-12, -8), lamp(-2, 7, true), lamp(6, -7), lamp(14, 8), lamp(21, -3, true)];

export const splitClaim: Level = {
  name: 'Split Claim',
  theme: 'street',
  exitGate: true,
  scenery: { north: 'trees', south: 'trees', east: 'trees', west: 'trees', skyline: false },
  atmosphere: { fog: '#34383e', fogNear: 14, fogFar: 64, ambient: 1.25, sky: { horizon: '#8a6a58', zenith: '#1c2440', stars: 0.3 } },
  boxes: [
    ground(-26, 26, -12, 12, YARD, 'plain'),
    ground(-26, 26, -2, 2, ROAD, 'slab'),
    ...frontage('x', -12.25, -26.5, 26.5, doors, 2.8, WALL, 'wall'),
    ...frontage('x', 12.25, -26.5, 26.5, doors, 2.8, WALL, 'wall'),
    ...frontage('z', -26.25, -12, 12, [], 2.8, WALL, 'wall'),
    ...frontage('z', 26.25, -12, 12, [elevator], 4.6, '#6e7479', 'building', [elevator]),
    ...checkpointBoxes(elevator, '#6e7479'),
    ...stationBoxes(stations),

    // The load in the middle of the yard: the lorry's pallets under a tarp, with the manifest table and
    // the tally board (the device for standing on the load) on its south face.
    block(0, -5.5, 6, 2.2, 3, TARP, 'plain'), block(-4.6, -5, 1.4, 0.8, 1.0, CRATE, 'crate'),
    block(4.4, -4.6, 1.6, 1.1, 1.4, CRATE, 'crate'), block(1, 5.5, 2.2, 1.0, 1.6, CRATE, 'crate'),
    // The clinic's post in the north-west and the mill's in the south-east: a crate each with a radio on it.
    block(-19, -9, 1.2, 0.8, 0.9, '#7a7d7e', 'crate'), block(-21.5, -9.6, 1.6, 1.4, 1.2, '#8a8f92', 'plain'),
    block(18, 9, 1.2, 0.8, 0.9, CRATE, 'crate'), block(20.6, 9.6, 1.8, 1.2, 1.2, '#7a6a48', 'crate'),
    // Cover: the lorry that brought it, a handcart, a steel bin.
    parkedCar(-10, 5, '#4a5a3a', true), parkedCar(11, -6, '#4a4f55'),
    block(-12, -4, 1.8, 1.0, 1.4, STEEL, 'plain'), block(9, 4, 1.6, 0.9, 1.4, CRATE, 'crate'),
  ],
  ladders: [],
  lights,
  doors,
  gate: null,
  elevator,
  stations,
  locks: [],
  signs: [
    { text: 'SHARED DEPOT', sub: 'LINCOLN ROAD CLINIC  /  HATCH MILL', background: '#1b4a5b', position: { x: -25.96, y: 2.4, z: -3.6 }, rotation: Math.PI / 2, width: 3.2, height: 0.7 },
  ],
  objective: null,
  steps: [
    { kind: 'keycard', label: 'Depot manifest', part: 'What came, and who signed', position: { x: -4.6, y: 0.95, z: -5 } },
    {
      kind: 'charge',
      label: 'Settle the claim',
      part: 'The claim, settled',
      stand: 'Stand on the load, or talk to both posts',
      device: { position: { x: 0, y: 1.35, z: -3.98 }, normal: { x: 0, z: 1 } },
      room: { minX: -5, maxX: 5, minZ: -4, maxZ: 3 },
      roomName: 'Depot',
      seconds: 40,
    },
  ],
  flow: { kind: 'sweep', loud: 3, first: 4 },
  roamers: 1,
  residents: [
    { x: -14, z: 1, yaw: 0.4, roam: 2 }, { x: -6, z: 8, yaw: -2 }, { x: 6, z: 1, yaw: 1.2, roam: 2 },
    { x: 14, z: -8, yaw: -0.6 }, { x: 21, z: 3, yaw: 3 },
  ],
  notes: [
    {
      position: { x: -4.6, y: 0.92, z: -5 },
      what: 'manifest',
      title: 'Depot manifest',
      lines: [
        'SHARED DEPOT  /  LOAD 31',
        'Flour 40 sacks. Tinned goods 22 cases. Antibiotics 1 case (60 courses). Dressings 4 cases.',
        'Signed for: Hatch Mill, whole load, against grain sent. Signed for: Lincoln Road Clinic, medical, urgent.',
        'Two signatures. One load. The driver left before anyone could ask him which.',
      ],
    },
  ],
  // The two posts. Each side will say what it knows if asked, and neither knows the other half. Telling
  // the mill about the ward can only be said once the clinic has told the crew about it.
  talks: [
    {
      position: { x: -19, y: 0.8, z: -9 },
      who: 'Lincoln Road clinic',
      what: 'clinic radio',
      step: 1,
      lines: [
        'Depot, this is the clinic. That case of antibiotics is ours. We signed for it.',
        'The mill is sitting on the whole load and will not pick up the set. Are you with them?',
      ],
      choices: [
        {
          label: 'Ask why it cannot wait',
          stay: true,
          reply: [
            'Eleven on the fever ward, nine of them children. We ran out of courses on Tuesday.',
            'We have not told the mill. If the mill knows how short we are, the price goes up. That is what we think.',
          ],
        },
        {
          label: 'Offer to walk the medicine across with their porters',
          skip: true,
          alarm: true,
          points: 100,
          reply: [
            'Then we are coming out for it now. Four porters, the handcart, and every one of them will be heard.',
            'The mill keeps the food. Tell them we did not take a sack. Thank you.',
          ],
        },
      ],
    },
    {
      position: { x: 18, y: 0.8, z: 9 },
      who: 'Hatch Mill',
      what: 'mill radio',
      step: 1,
      lines: [
        'Whoever is in the yard: that load is signed to Hatch Mill. All of it.',
        'We are not thieves. We sent the grain. Say what you want and be quick.',
      ],
      choices: [
        {
          label: 'Ask what their paper says',
          stay: true,
          reply: [
            'Whole load against forty sacks of grain, sent last month, eaten by now. That is the bargain and we kept our half.',
            'The clinic signed after us. Nobody has told us why they want a case of pills that badly. Nobody tells us anything.',
          ],
        },
        {
          label: 'Pay the mill for the medical cases',
          cost: 300,
          skip: true,
          reply: [
            'That is fair, and more than the clinic offered, which was nothing.',
            'The medical goes to Lincoln Road. The food is ours. We will send two to carry it.',
          ],
        },
        {
          label: 'Tell them about the fever ward',
          after: { talk: 0, choice: 0 },
          skip: true,
          points: 150,
          reply: [
            'Children. ... They could have said. We have children.',
            'Take the medical across. No charge. And tell that clinic to pick up its set next time, we would have sent flour with it.',
          ],
        },
      ],
    },
  ],
  cues: [
    { on: 'start', at: 1.5, speaker: CREW, text: 'The shared depot. One load came in and two settlements say it is theirs.' },
    { on: 'start', at: 8, speaker: CREW, text: 'Read the manifest on the table by the load before anyone starts shouting.', seconds: 6 },
    { on: 'step', step: 0, at: 0.6, speaker: CREW, text: 'Two signatures on one load. Both posts have a radio lit: clinic north-west, mill south-east.' },
    { on: 'step', step: 0, at: 7, speaker: CREW, text: 'Talk to them, or stand on the load until they give up. Standing on it will be loud.', seconds: 6 },
    { on: 'done', at: 0.6, speaker: CREW, text: 'Settled. The medicine is going to Lincoln Road and nobody fired on anybody over it.' },
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
