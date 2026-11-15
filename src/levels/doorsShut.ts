import type { Elevator, Level, LevelLight, Lock, Station } from './types';
import { CREW } from './voices';
import { block, checkpointBoxes, frontage, ground, parkedCar, streetDoor } from './streetKit';
import { DOOR_HEIGHT, stationBoxes } from './wardKit';

// Act 9, Doors Shut: a settlement that will not answer. Its people have shut themselves in behind a
// wall across a school yard, and a group of evacuees the crew is looking for went in and has not come out.
// There are two ways through the wall. The main gate is locked from inside: the crew can force it,
// which costs points and makes the whole noise of it. Or they can go in by the service door in the
// north corner, which is open, and cross the courtyard past the dead that were shut in with the
// settlement. Inside, the evacuees are hiding in the stores at the east end, frightened and not hostile.
// The register on the table in the east hall names where the rest of them went.
//
//   z -14 +--gap--------------+--------------gap-----+
//         |  yard  [notice]   S  courtyard   [stores]  |
//   (in)  >                   G                         > road gate
//         |  [van]            |           [register]   |
//   z  14 +-----gap-----------+---------------gap------+
//        x -26              x -8                      26
//   G = main gate (forced, 250 points)   S = service door (open)

const WALL = '#6a655c';
const YARD = '#585a50';
const COURT = '#6f6b5e';
const CRATE = '#6a5a3e';
const TARP = '#4a5a6a';

const doors = [streetDoor(-18, -14.25, 0, 1), streetDoor(2, -14.25, 0, 1), streetDoor(-4, 14.25, 0, -1), streetDoor(18, 14.25, 0, -1)];

// The main gate, locked from inside; the service door, open. Both face the yard.
const gate: Lock = { position: { x: -8.25, y: 0, z: 3 }, normal: { x: -1, z: 0 }, width: 2.4, height: DOOR_HEIGHT, cost: 250, label: 'Main gate' };
const service = streetDoor(-8.25, -9, -1, 0);

const elevator: Elevator = { position: { x: 26.25, y: 0, z: 0 }, normal: { x: -1, z: 0 }, width: 6, height: DOOR_HEIGHT, cabDepth: 4, cabWidth: 6 };

const stations: Station[] = [
  { kind: 'ammo', position: { x: -25.95, y: 1.25, z: 8 }, normal: { x: 1, z: 0 } },
];

const lamp = (x: number, z: number, flicker = false): LevelLight => ({ position: { x, y: 3.6, z }, color: '#ffd9a0', intensity: 26, flicker, post: true });
const lights: LevelLight[] = [lamp(-20, -4), lamp(-12, 8, true), lamp(-2, -6), lamp(4, 6, true), lamp(14, -2), lamp(22, 6)];

export const doorsShut: Level = {
  name: 'Doors Shut',
  theme: 'street',
  scenery: { north: 'trees', south: 'trees', east: 'trees', west: 'trees', skyline: false },
  atmosphere: { fog: '#34383e', fogNear: 14, fogFar: 66, ambient: 1.3, sky: { horizon: '#8a6a58', zenith: '#1c2440', stars: 0.3 } },
  boxes: [
    ground(-26, -8, -14, 14, YARD, 'plain'),
    ground(-8, 26, -14, 14, COURT, 'plain'),
    ...frontage('x', -14.25, -26.5, 26.5, doors, 2.8, WALL, 'wall'),
    ...frontage('x', 14.25, -26.5, 26.5, doors, 2.8, WALL, 'wall'),
    ...frontage('z', -26.25, -14, 14, [], 2.8, WALL, 'wall'),
    // The wall across the school yard: the main gate and the service door are the only ways through.
    ...frontage('z', -8.25, -14, 14, [gate, service], 3.4, '#5d5a52', 'wall', [gate, service]),
    ...frontage('z', 26.25, -14, 14, [elevator], 4.6, '#6e7479', 'building', [elevator]),
    ...checkpointBoxes(elevator, '#6e7479'),
    ...stationBoxes(stations),

    // The yard outside: a van, the notice board's table and some rubble to fight from.
    parkedCar(-16, 7, '#4a5a3a', true), parkedCar(-22, -8, '#4a4f55'),
    block(-20, -5, 1.4, 0.8, 1.0, CRATE, 'crate'), block(-13, -2, 1.6, 0.9, 1.4, '#7a7d7e', 'plain'),
    // The courtyard: a car pushed across it, tarps, crates and a handcart, all in the way.
    parkedCar(0, 4, '#7a3030'), block(-3, -8, 2.4, 1.2, 1.6, TARP, 'plain'), block(4, -5, 1.8, 1.0, 1.6, CRATE, 'crate'),
    block(8, 8, 2.2, 1.1, 1.4, CRATE, 'crate'), block(-4, 10, 1.6, 0.9, 1.4, '#7a7d7e', 'plain'),
    // The stores at the east end: three lean-to stalls with their backs to the wall, where the evacuees hide.
    block(21, -9, 6, 2.4, 2.4, '#5b5f58', 'plain'), block(21, 10, 6, 2.4, 2.4, '#5b5f58', 'plain'), block(14, 0, 1.6, 1.0, 3.4, CRATE, 'crate'),
    // The register's table in the east hall.
    block(22, 0.5, 1.4, 0.8, 1.0, CRATE, 'crate'),
  ],
  ladders: [],
  lights,
  doors,
  gate: null,
  elevator,
  stations,
  locks: [gate],
  signs: [
    { text: 'LINCOLN ROAD SETTLEMENT', sub: 'NO ENTRY  /  NO CONTACT', background: '#5b1b1b', position: { x: -25.96, y: 2.4, z: -3.6 }, rotation: Math.PI / 2, width: 3.2, height: 0.7 },
    { text: 'SERVICE', sub: 'DELIVERIES  /  STAFF', background: '#1b4a5b', position: { x: -9.5, y: 2.2, z: -9.2 }, rotation: -Math.PI / 2, width: 1.6, height: 0.5 },
  ],
  // The register in the east hall: it names where the rest of the evacuees went.
  objective: { kind: 'keycard', label: 'Evacuee register', part: 'Where they went', position: { x: 22, y: 0.95, z: 0.5 } },
  // A sweep: the dead already shut in with them stand in the courtyard. Gunshots, and forcing the gate, are loud.
  flow: { kind: 'sweep', loud: 3, first: 5 },
  residents: [
    { x: -18, z: 2, yaw: 0.4, roam: 2 }, { x: -12, z: -6, yaw: -2, roam: 2 },
    { x: -4, z: 0, yaw: 1.2 }, { x: 2, z: -3, yaw: -0.6 }, { x: 6, z: 4, yaw: 2.4, roam: 2 }, { x: 10, z: -2, yaw: 3 }, { x: 12, z: 9, yaw: -1.6 },
  ],
  // Three people hiding in the stores: frightened, not hostile. They follow the crew out through the road gate.
  rescue: {
    name: 'The settlement stores',
    people: [
      { x: 19.5, z: -7.2, yaw: 3.0, look: 'diner' },
      { x: 20.8, z: 8.2, yaw: 0.2, look: 'cook' },
      { x: 22.4, z: 8.8, yaw: -0.4, look: 'waiter' },
    ],
    exit: { minX: 22.5, maxX: 26, minZ: -3, maxZ: 3 },
    points: 150,
    log: { title: 'The settlement stores', lines: ['Three of the people who had come looking for shelter had been shut in the stores for two days. They said nobody inside had meant them harm: the doors were shut because everyone was afraid.', 'One of them remembered the family the crew is looking for being sent east by the road.'] },
    line: 'Three people out of the stores, through the road gate',
  },
  notes: [
    {
      position: { x: -20, y: 0.92, z: -5 },
      what: 'notice',
      title: 'Settlement notice',
      lines: [
        'LINCOLN ROAD SETTLEMENT  /  NOTICE',
        'The gate is shut and will stay shut. Nobody comes in who has not been through the checks.',
        'The service door in the north corner is still unlocked: the cook uses it. We have not had the heart to bolt it.',
        'If you are looking for someone, do not knock. Write it down and leave it.',
      ],
    },
  ],
  cues: [
    { on: 'start', at: 1.5, speaker: CREW, text: 'The settlement. Doors shut. They are not answering the radio.' },
    { on: 'start', at: 8, speaker: CREW, text: 'The gate is locked. We can force it, and every one of them will hear it. Or the service door in the north corner is open.', seconds: 7 },
    { on: 'done', at: 0.6, speaker: CREW, text: 'The register says east. Whoever knew the road is still alive.' },
  ],
  navBounds: { minX: -31, maxX: 31, minZ: -19, maxZ: 19 },
  ramp: null,
  barricadeBars: [],
  streetSpawns: [],
  playerSpawns: [{ x: -23, y: 0, z: 0 }],
  spawnYaw: -Math.PI / 2,
  streetLamps: [],
  checkpoint: { x: -23, y: 0, z: 0 },
};
