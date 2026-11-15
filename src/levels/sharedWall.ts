import type { Elevator, Level, LevelLight, Station } from './types';
import { CREW } from './voices';
import { block, checkpointBoxes, frontage, ground, parkedCar, streetDoor } from './streetKit';
import { DOOR_HEIGHT, stationBoxes } from './wardKit';

// Act 9, Shared Wall: the evacuation road both settlements use, with the dead coming up it. Lincoln Road
// holds a line on the north side and Hatch Mill one on the south, and neither has what the other has: the
// mill has rounds and nine people who can shoot; the clinic has hands and nothing to fire. Three steps.
// Carry the mill's two spare ammunition cases across to the clinic line. Hold the clinic line. Hold the
// mill line. While a line is the job, the radio at the OTHER line can be asked to send people across,
// which shortens the stand: for points, or for nothing if the crew dealt fairly with that side at the
// depot (Split Claim), which is looked up in the run's log. A family waits at the west end to be walked
// through to the road gate; that is never needed to go on.
//
//   z -12 +--gap---------------------------gap-------+
//         | family          [== CLINIC LINE ==] radio |
//   (in)  >   - - - - - - - evacuation road - - - - -   > road out
//         | radio [== MILL LINE ==]  (cases)          |
//   z  12 +--gap----------------------gap------------+
//        x -26                                    26

const WALL = '#66625a';
const YARD = '#50544a';
const ROAD = '#2c2f33';
const CRATE = '#6a5a3e';
const SAND = '#8a7f62';
const STEEL = '#586068';

const doors = [streetDoor(-14, -12.25, 0, 1), streetDoor(21, -12.25, 0, 1), streetDoor(-21, 12.25, 0, -1), streetDoor(14, 12.25, 0, -1)];

const elevator: Elevator = { position: { x: 26.25, y: 0, z: 0 }, normal: { x: -1, z: 0 }, width: 6, height: DOOR_HEIGHT, cabDepth: 4, cabWidth: 6 };

const stations: Station[] = [
  { kind: 'ammo', position: { x: -25.95, y: 1.25, z: 5 }, normal: { x: 1, z: 0 } },
  { kind: 'shotgun', weapon: 'ak', position: { x: 25.95, y: 1.25, z: -7 }, normal: { x: -1, z: 0 } },
];

const lamp = (x: number, z: number, flicker = false): LevelLight => ({ position: { x, y: 3.6, z }, color: '#ffd9a0', intensity: 26, flicker, post: true });
const lights: LevelLight[] = [lamp(-20, -3), lamp(-13, 6), lamp(-4, -7, true), lamp(4, 6), lamp(12, -6), lamp(20, 4, true)];

// What the crew may have done at the depot, as the run's log has it.
const TOLD = 'Hatch Mill: Tell them about the fever ward';
const PAID = 'Hatch Mill: Pay the mill for the medical cases';
const WALKED = 'Lincoln Road clinic: Offer to walk the medicine across with their porters';

export const sharedWall: Level = {
  name: 'Shared Wall',
  theme: 'street',
  exitGate: true,
  scenery: { north: 'trees', south: 'trees', east: 'trees', west: 'trees', skyline: false },
  atmosphere: { fog: '#33363c', fogNear: 14, fogFar: 62, ambient: 1.2, sky: { horizon: '#7a5a52', zenith: '#181e36', stars: 0.35 } },
  boxes: [
    ground(-26, 26, -12, 12, YARD, 'plain'),
    ground(-26, 26, -2, 2, ROAD, 'slab'),
    ...frontage('x', -12.25, -26.5, 26.5, doors, 2.8, WALL, 'wall'),
    ...frontage('x', 12.25, -26.5, 26.5, doors, 2.8, WALL, 'wall'),
    ...frontage('z', -26.25, -12, 12, [], 2.8, WALL, 'wall'),
    ...frontage('z', 26.25, -12, 12, [elevator], 4.6, '#6e7479', 'building', [elevator]),
    ...checkpointBoxes(elevator, '#6e7479'),
    ...stationBoxes(stations),

    // The clinic line, north-east: a sandbag wall with the line's board on its face, and low bags either side.
    block(12, -10.5, 8, 2.2, 1.0, SAND, 'plain'), block(6.6, -6.5, 2.4, 1.0, 1.0, SAND, 'plain'), block(17.4, -6.5, 2.4, 1.0, 1.0, SAND, 'plain'),
    // The mill line, south-west: the same, in grain sacks and a steel bin.
    block(-12, 10.5, 8, 2.2, 1.0, CRATE, 'crate'), block(-17.4, 6.5, 2.4, 1.0, 1.0, CRATE, 'crate'), block(-6.6, 6.5, 2.4, 1.0, 1.0, STEEL, 'plain'),
    // A crate with a radio on it at each line.
    block(22.5, -9.4, 1.2, 0.8, 0.9, '#7a7d7e', 'crate'), block(-23, 9.6, 1.2, 0.8, 0.9, CRATE, 'crate'),
    // The mill's cart by its line, where the spare cases lie, and cover along the road.
    block(-3, 8.5, 2.2, 1.0, 1.4, CRATE, 'crate'),
    parkedCar(-8, -5, '#4a5a3a', true), parkedCar(6, 4.5, '#4a4f55'), block(0, -6, 1.8, 1.0, 1.4, STEEL, 'plain'), block(19, 7, 1.6, 0.9, 1.4, CRATE, 'crate'),
  ],
  ladders: [],
  lights,
  doors,
  gate: null,
  elevator,
  stations,
  locks: [],
  signs: [
    { text: 'EVACUATION ROAD', sub: 'LINCOLN ROAD LINE NORTH  /  HATCH MILL LINE SOUTH', background: '#1b4a5b', position: { x: -25.96, y: 2.4, z: -3.6 }, rotation: Math.PI / 2, width: 3.4, height: 0.7 },
  ],
  objective: null,
  steps: [
    { kind: 'carry', label: 'Ammunition case', part: 'Rounds for the clinic line', to: 'the clinic line', items: [{ x: -1.4, y: 0, z: 6.9 }, { x: -4.4, y: 0, z: 6.9 }], dropoff: { x: 12, y: 0, z: -8.2 } },
    {
      kind: 'charge',
      label: 'Hold the clinic line',
      part: 'The clinic line, held',
      stand: 'Start it at the board on the sandbags. They will come',
      device: { position: { x: 12, y: 1.35, z: -9.98 }, normal: { x: 0, z: 1 } },
      room: { minX: 5, maxX: 25, minZ: -11.5, maxZ: -3 },
      roomName: 'Clinic line',
      seconds: 40,
    },
    {
      kind: 'charge',
      label: 'Hold the mill line',
      part: 'The mill line, held',
      stand: 'Start it at the board on the sacks. They will come',
      device: { position: { x: -12, y: 1.35, z: 9.98 }, normal: { x: 0, z: -1 } },
      room: { minX: -25, maxX: -5, minZ: 3, maxZ: 11.5 },
      roomName: 'Mill line',
      seconds: 40,
    },
  ],
  flow: { kind: 'sweep', loud: 3, first: 4 },
  roamers: 1,
  residents: [
    { x: -10, z: -8, yaw: 0.4, roam: 2 }, { x: -2, z: 1, yaw: -2, roam: 2 }, { x: 8, z: -1, yaw: 1.2 },
    { x: 14, z: 8, yaw: -0.6, roam: 2 }, { x: 22, z: 2, yaw: 3 },
  ],
  // A family at the west end, waiting for someone to say the road is open.
  rescue: {
    name: 'The evacuation road',
    people: [
      { x: -22.5, z: -8.5, yaw: 2.6, look: 'diner' },
      { x: -21.2, z: -9.4, yaw: 2.9, look: 'waiter' },
      { x: -23.6, z: -9.6, yaw: 2.4, look: 'diner' },
    ],
    exit: { minX: 22.5, maxX: 26, minZ: -3, maxZ: 3 },
    points: 150,
    log: { title: 'The evacuation road', lines: ['A family of three had been waiting at the west end of the road since morning for someone to say it was open.', 'They went through between the two lines. The mill\'s people and the clinic\'s both stood up to let them by.'] },
    line: 'A family through the road gate, between the two lines',
  },
  notes: [
    {
      position: { x: -3, y: 1.02, z: 8.5 },
      what: 'tally',
      title: 'Mill line tally',
      lines: [
        'HATCH MILL  /  SOUTH LINE',
        'Rounds: enough for forty. Rifles: fourteen. People who can shoot: nine.',
        'Clinic line reports the other way round: hands, and nothing to put in them.',
        'Two cases spare on this cart. If somebody will carry them across, they are the clinic\'s.',
      ],
    },
  ],
  // The radio at each line, lit while the OTHER line is the one being held. Each side can be asked what it
  // has, paid to send people across, or asked for them for nothing if the crew did right by it at the depot.
  talks: [
    {
      position: { x: -23, y: 0.8, z: 9.6 },
      who: 'Hatch Mill line',
      what: 'mill radio',
      step: 1,
      lines: [
        'Mill line. The clinic has our two cases now, so they can shoot. They cannot aim.',
        'You are about to stand on their wall. What do you want from ours?',
      ],
      choices: [
        {
          label: 'Ask what they can spare',
          stay: true,
          reply: [
            'Nine who can shoot, and this wall wants twenty. Anyone I send north is a gap here.',
            'I will open a gap for a fair price, or for somebody who has earned it. Not for the asking.',
          ],
        },
        {
          label: 'Pay for four rifles on the clinic line',
          cost: 200,
          shorten: 20,
          reply: [
            'Four rifles, going north now. They will be on the clinic wall before you are.',
            'They come back the minute that line is quiet. Hold it short.',
          ],
        },
        {
          label: 'Remind them how the depot was settled',
          remembered: [TOLD, PAID],
          shorten: 20,
          ammo: 24,
          reply: [
            'That was you, at the depot. You were straight with us when nobody else was.',
            'Four rifles to the clinic line and a box of rounds for yourself. No charge.',
          ],
        },
      ],
    },
    {
      position: { x: 22.5, y: 0.8, z: -9.4 },
      who: 'Lincoln Road line',
      what: 'clinic radio',
      step: 2,
      lines: [
        'Clinic line. We are still standing, which this morning I would not have bet on.',
        'The mill wall is next and they are thin. Tell me what you need.',
      ],
      choices: [
        {
          label: 'Ask what they can spare',
          stay: true,
          reply: [
            'Porters and orderlies. Nobody who had fired a gun before today, but they can load, carry and drag people back.',
            'Every one I send south is a stretcher I cannot lift here. Make it worth it.',
          ],
        },
        {
          label: 'Pay for six porters on the mill line',
          cost: 200,
          shorten: 20,
          reply: [
            'Six, with the handcart, crossing now. They will keep the mill\'s rifles fed.',
            'Send them back in one piece.',
          ],
        },
        {
          label: 'Remind them who got the medicine across',
          remembered: [TOLD, PAID, WALKED],
          shorten: 20,
          points: 100,
          reply: [
            'The ward is alive because of that case. All eleven.',
            'Six porters to the mill line, and you owe us nothing. Go.',
          ],
        },
      ],
    },
  ],
  cues: [
    { on: 'start', at: 1.5, speaker: CREW, text: 'The evacuation road. Clinic line on the north side, mill line on the south, and the dead coming up between.' },
    { on: 'start', at: 8, speaker: CREW, text: 'The mill has rounds to spare and the clinic has none. Two cases on the mill cart: carry them across.', seconds: 7 },
    { on: 'step', step: 0, at: 0.6, speaker: CREW, text: 'The clinic can shoot now. Their line goes first: start it at the board on the sandbags.' },
    { on: 'step', step: 0, at: 7, speaker: CREW, text: 'The mill radio is lit on the far side. They might send rifles across before you start.', seconds: 6 },
    { on: 'step', step: 1, at: 0.6, speaker: CREW, text: 'Clinic line held. Now the mill wall, south-west. The clinic radio is lit if you want their porters.', seconds: 7 },
    { on: 'done', at: 0.6, speaker: CREW, text: 'Both lines held, each with the other\'s people on it. The road is open.' },
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
