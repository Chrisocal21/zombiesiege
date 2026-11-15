import type { Elevator, Level, LevelLight, Station } from './types';
import { CREW } from './voices';
import { block, checkpointBoxes, frontage, ground, parkedCar, streetDoor } from './streetKit';
import { DOOR_HEIGHT, stationBoxes } from './wardKit';

// Act 7, High Ground: the hilltop relay, in a rising storm. The regional broadcast went quiet and the
// relay is why. Two ways in: the service road from the west, and a scramble path up the south slope. Two
// steps. First power: the relay's generator shed and the battery cabinet both have to be thrown. Then
// the antenna: the dish on the equipment hut is aligned with a held stand beside the lattice tower, and
// the work lights that make the job possible are the same lights the dead can see from the slope.
//
//   z -12 +--gap-----------------------------------+
//         |  [GEN SHED]      [TOWER]  [DISH HUT]     |
//   ROAD  >  (service road)     o                     > way on
//         |           [BATTERY]  (cars)             |
//   z  12 +-----------------gap----------------------+
//        x -26                                    26

const ROCK = '#4f5148';
const SCRUB = '#3a4636';
const CONCRETE = '#7a7d7e';
const LATTICE = '#8a8f93';
const HUT = '#5b6670';
const ROAD = '#2a2d32';

const doors = [streetDoor(-10, -12.25, 0, 1), streetDoor(8, -12.25, 0, 1), streetDoor(-14, 12.25, 0, -1), streetDoor(12, 12.25, 0, -1)];

const elevator: Elevator = { position: { x: 26.25, y: 0, z: 0 }, normal: { x: -1, z: 0 }, width: 6, height: DOOR_HEIGHT, cabDepth: 4, cabWidth: 6 };

const stations: Station[] = [
  { kind: 'ammo', position: { x: -25.95, y: 1.25, z: 8 }, normal: { x: 1, z: 0 } },
  { kind: 'shotgun', weapon: 'ak', position: { x: 25.95, y: 1.25, z: -8 }, normal: { x: -1, z: 0 } },
];

// Only a few lights: the storm is dark. The work lights over the dish hut are the ones the crew chooses.
const work = (x: number, z: number, flicker = false): LevelLight => ({ position: { x, y: 4.0, z }, color: '#f4f0e0', intensity: 38, flicker });
const lights: LevelLight[] = [work(-18, -6), work(-6, 5, true), work(14, -4), work(20, 2, true), work(6, 8)];

export const highGround: Level = {
  name: 'High Ground',
  theme: 'street',
  scenery: { north: 'trees', south: 'trees', east: 'trees', west: 'trees', skyline: false },
  atmosphere: { fog: '#272b32', fogNear: 8, fogFar: 46, ambient: 1.0, sky: { horizon: '#3a3f4a', zenith: '#0c1018', stars: 0.05 } },
  boxes: [
    ground(-26, 26, -12, 12, ROCK, 'plain'),
    ground(-26, 26, -2, 2, ROAD, 'slab'),
    ...frontage('x', -12.25, -26.5, 26.5, doors, 2.8, SCRUB, 'wall'),
    ...frontage('x', 12.25, -26.5, 26.5, doors, 2.8, SCRUB, 'wall'),
    ...frontage('z', -26.25, -12, 12, [], 2.8, SCRUB, 'wall'),
    ...frontage('z', 26.25, -12, 12, [elevator], 4.6, '#6e7479', 'building', [elevator]),
    ...checkpointBoxes(elevator, '#6e7479'),
    ...stationBoxes(stations),

    // The generator shed on the north-west side, and the battery cabinet on the south, each with a panel.
    block(-18, -10.9, 5, 2.6, 1.6, HUT, 'plain'),
    block(-4, 10.9, 3, 2.2, 1.4, '#4a5a3a', 'crate'),
    // The lattice tower: four legs and bracing, solid enough to shoot round, with its base on a plinth.
    block(2, 0, 3.4, 0.5, 3.4, CONCRETE, 'plain'),
    block(0.8, -1.2, 0.25, 7, 0.25, LATTICE), block(3.2, -1.2, 0.25, 7, 0.25, LATTICE),
    block(0.8, 1.2, 0.25, 7, 0.25, LATTICE), block(3.2, 1.2, 0.25, 7, 0.25, LATTICE),
    // The equipment hut at the foot of the tower, the dish on its roof, its console on the west wall.
    block(10, -6, 5, 3.0, 3.4, HUT, 'plain'),
    block(10, -6, 1.2, 0.6, 1.2, LATTICE, 'plain'),
    // Wrecked cars on the service road, and rocks to fight from.
    parkedCar(-20, 1.6, '#4a4f55'), parkedCar(-12, -1.4, '#7a3030', true),
    block(14, 5, 2.4, 1.1, 1.6, ROCK, 'plain'), block(-8, -7, 2, 0.9, 1.4, ROCK, 'plain'), block(20, -3, 1.8, 1.0, 1.4, ROCK, 'plain'),
    // The engineer's table in the generator shed's lee, with the last log on it.
    block(-22, 5, 1.4, 0.8, 1.0, '#6a5a3e', 'crate'),
  ],
  ladders: [],
  lights,
  doors,
  gate: null,
  elevator,
  stations,
  locks: [],
  signs: [
    { text: 'REGIONAL RELAY 6', sub: 'AUTHORISED PERSONNEL  /  GENERATOR SHED', background: '#5b1b1b', position: { x: -25.96, y: 2.4, z: -3.6 }, rotation: Math.PI / 2, width: 3.0, height: 0.7 },
    { text: 'DISH HUT', sub: 'ALIGNMENT CONSOLE', background: '#1b5b4d', position: { x: 7.5, y: 2.6, z: -4.28 }, rotation: 0, width: 2.2, height: 0.5 },
  ],
  // Two steps: the relay's power (both cabinets), then the antenna alignment, held at the dish hut.
  objective: null,
  steps: [
    {
      kind: 'breakers',
      label: 'Relay power',
      part: 'Power to the relay',
      panels: [
        { position: { x: -18, y: 1.45, z: -9.78 }, normal: { x: 0, z: 1 } },
        { position: { x: -4, y: 1.45, z: 10.18 }, normal: { x: 0, z: -1 } },
      ],
    },
    {
      kind: 'charge',
      label: 'Antenna alignment',
      part: 'Regional broadcast',
      device: { position: { x: 10, y: 1.35, z: -4.28 }, normal: { x: 0, z: 1 } },
      room: { minX: 5, maxX: 15.5, minZ: -4.2, maxZ: 3 },
      roomName: 'Dish hut',
      seconds: 50,
    },
  ],
  // A sweep: the stranded relay crew stand on the hill. The work lights and the alignment hold call the rest.
  flow: { kind: 'sweep', loud: 3, first: 5 },
  residents: [
    { x: -22, z: -1, yaw: 0.8, roam: 2 }, { x: -9, z: 3, yaw: -2.2, roam: 3 }, { x: 4, z: 6, yaw: 2.4 },
    { x: 12, z: 2, yaw: -1.0 }, { x: 19, z: -6, yaw: 1.5, roam: 2 }, { x: -2, z: -6, yaw: 3 },
  ],
  notes: [
    {
      position: { x: -22, y: 0.92, z: 5 },
      what: 'engineer\'s log',
      title: 'Engineer\'s log',
      lines: [
        'REGIONAL RELAY 6  /  LAST ENTRY',
        'Power failed before the signal did. Generator shed and battery cabinet both need throwing to bring it back.',
        'The dish drifts in the wind. It has to be aligned by hand at the hut, and the work lights stay on while it is.',
        'Somebody cut the north feed deliberately. It was not the dead.',
      ],
    },
  ],
  cues: [
    { on: 'start', at: 1.5, speaker: CREW, text: 'The relay. Weather is closing in. The broadcast stopped here.' },
    { on: 'start', at: 8, speaker: CREW, text: 'Generator shed, battery cabinet, then the dish. The lights we need are the lights they will see.', seconds: 6 },
    { on: 'step', step: 0, at: 0.6, speaker: CREW, text: 'Power is back. Get to the dish hut. It is going to be bright and loud.' },
    { on: 'done', at: 0.6, speaker: CREW, text: 'We are on the air. Other relays are answering. The pilot is out there.' },
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
