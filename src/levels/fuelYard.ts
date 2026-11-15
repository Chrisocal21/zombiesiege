import type { Elevator, Level, LevelLight, Station } from './types';
import { CREW } from './voices';
import { block, checkpointBoxes, frontage, ground, parkedCar, streetDoor } from './streetKit';
import { DOOR_HEIGHT, stationBoxes } from './wardKit';

// Act 6, Running on Empty: the fuel yard on the road out of the camp's valley. The camp has three days of
// generator fuel and nothing to move a vehicle. Two steps. First the pumps: the yard's power cabinets
// are dead, and both have to be thrown. Then the transfer: the fuel tanker is hooked up, and the crew
// must hold the area around it while it fills. The noise of the pumps brings the dead; the hold is the
// only time they are sent for.
//
//   z -12 +--gap--------------------gap-------------+
//         |  [CAB 1]     tanker [PUMP]    tanks      |
//   (in)  >  forecourt  (canopy)                      > road
//         |            [CAB 2]    (drums)            |
//   z  12 +--------gap------------------gap----------+
//        x -28                                    28

const CONCRETE = '#7a7d7e';
const FENCE = '#58605c';
const TANK = '#9aa09e';
const TANKER = '#b9402e';
const DRUM = '#3d5a6a';
const CANOPY = '#5b6670';
const ROAD = '#2a2d32';

const doors = [streetDoor(-14, -12.25, 0, 1), streetDoor(6, -12.25, 0, 1), streetDoor(-4, 12.25, 0, -1), streetDoor(18, 12.25, 0, -1)];

// The yard's road gate at the east end: the way on once the tanker is full.
const elevator: Elevator = { position: { x: 28.25, y: 0, z: 0 }, normal: { x: -1, z: 0 }, width: 6, height: DOOR_HEIGHT, cabDepth: 4, cabWidth: 6 };

const stations: Station[] = [
  { kind: 'ammo', position: { x: -27.95, y: 1.25, z: 8 }, normal: { x: 1, z: 0 } },
  { kind: 'shotgun', weapon: 'ak', position: { x: 27.95, y: 1.25, z: -8 }, normal: { x: -1, z: 0 } },
];

const flood = (x: number, z: number, flicker = false): LevelLight => ({ position: { x, y: 4.4, z }, color: '#ffe9c0', intensity: 36, flicker });
const lights: LevelLight[] = [flood(-18, -6), flood(-10, 6, true), flood(0, -6), flood(8, 6), flood(18, -1, true), flood(24, 6)];

export const fuelYard: Level = {
  name: 'Running on Empty',
  theme: 'street',
  exitGate: true,
  scenery: { north: 'trees', south: 'trees', east: 'trees', west: 'trees', skyline: false },
  atmosphere: { fog: '#3a3d44', fogNear: 16, fogFar: 78, ambient: 1.4, sky: { horizon: '#9a7a62', zenith: '#202a48', stars: 0.25 } },
  boxes: [
    ground(-28, 28, -12, 12, CONCRETE, 'slab'),
    ground(-28, 28, -2, 2, ROAD, 'slab'),
    ...frontage('x', -12.25, -28.5, 28.5, doors, 2.8, FENCE, 'wall'),
    ...frontage('x', 12.25, -28.5, 28.5, doors, 2.8, FENCE, 'wall'),
    ...frontage('z', -28.25, -12, 12, [], 2.8, FENCE, 'wall'),
    ...frontage('z', 28.25, -12, 12, [elevator], 4.6, '#6e7479', 'building', [elevator]),
    ...checkpointBoxes(elevator, '#6e7479'),
    ...stationBoxes(stations),

    // The pump canopy over the forecourt: posts only, so it is shot through. Two pump islands below it.
    block(-8, -4, 0.4, 3.6, 0.4, CANOPY), block(-8, 4, 0.4, 3.6, 0.4, CANOPY), block(2, -4, 0.4, 3.6, 0.4, CANOPY), block(2, 4, 0.4, 3.6, 0.4, CANOPY),
    block(-3, -4, 1.6, 1.3, 0.8, '#c8ccd0', 'crate'), block(-3, 4, 1.6, 1.3, 0.8, '#c8ccd0', 'crate'),
    // The two power cabinets, one on each side of the yard, each with its panel facing the forecourt.
    block(-14, -10.9, 2.4, 2.2, 1.4, '#4a5a3a', 'crate'),
    block(0, 10.9, 2.4, 2.2, 1.4, '#4a5a3a', 'crate'),
    // The tanker, across the east end of the yard, with its hookup on the side that faces the road.
    block(14, -7.4, 9, 2.8, 2.8, TANKER, 'plain'),
    block(19.2, -7.4, 1.6, 2.2, 2.4, '#3a3d42', 'crate'),
    // Storage tanks and drums along the south and east.
    block(8, 8.6, 3.2, 3.2, 3.2, TANK, 'plain'), block(12.5, 8.6, 3.2, 3.2, 3.2, TANK, 'plain'),
    block(22, 7, 0.9, 1.1, 0.9, DRUM, 'plain'), block(23.2, 7.6, 0.9, 1.1, 0.9, DRUM, 'plain'), block(22.4, 8.6, 0.9, 1.1, 0.9, DRUM, 'plain'),
    parkedCar(-22, -6, '#4a4f55'),
    parkedCar(-17, 7, '#7a3030', true),
    // A table in the pump office kiosk for the fuel ledger.
    block(-24, 9, 1.4, 0.8, 1.0, '#6a5a3e', 'crate'),
  ],
  ladders: [],
  lights,
  doors,
  gate: null,
  elevator,
  stations,
  locks: [],
  signs: [
    { text: 'FUEL', sub: 'PUMPS 1 AND 2  /  OUT OF SERVICE', background: '#5b1b1b', position: { x: -27.96, y: 2.6, z: -3.6 }, rotation: Math.PI / 2, width: 2.8, height: 0.7 },
    { text: 'TANKER BAY', sub: 'HOOKUP  /  TRANSFER HERE', background: '#1b5b4d', position: { x: 9.5, y: 2.9, z: -5.96 }, rotation: 0, width: 2.4, height: 0.5 },
  ],
  // Two steps: power for the pumps (both cabinets), then the transfer, held while the tanker fills.
  objective: null,
  steps: [
    {
      kind: 'breakers',
      label: 'Pump power',
      part: 'Power to the pumps',
      panels: [
        { position: { x: -14, y: 1.45, z: -9.88 }, normal: { x: 0, z: 1 } },
        { position: { x: 0, y: 1.45, z: 9.88 }, normal: { x: 0, z: -1 } },
      ],
    },
    {
      kind: 'charge',
      label: 'Start the fuel transfer',
      part: 'Fuel for the camp',
      stand: 'Start it at the pump. The noise calls them',
      device: { position: { x: 14, y: 1.35, z: -5.98 }, normal: { x: 0, z: 1 } },
      room: { minX: 8, maxX: 21, minZ: -5.6, maxZ: 3 },
      roomName: 'Tanker bay',
      seconds: 45,
    },
  ],
  // A sweep: the yard's own dead stand about the forecourt. The pumps' noise is what calls the rest.
  flow: { kind: 'sweep', loud: 3, first: 5 },
  residents: [
    { x: -20, z: 2, yaw: 0.4, roam: 2 }, { x: -6, z: 0.5, yaw: -2, roam: 3 }, { x: 4, z: -1, yaw: 2.2 },
    { x: 10, z: 2, yaw: -0.7 }, { x: 24, z: -1, yaw: 1.6, roam: 2 }, { x: -12, z: 9, yaw: 3 },
  ],
  notes: [
    {
      position: { x: -24, y: 0.92, z: 9 },
      what: 'fuel ledger',
      title: 'Fuel ledger',
      lines: [
        'PUMPS 1 AND 2  /  LAST ENTRY',
        'Tanker delivery arrived the night before the roads closed: eleven thousand litres.',
        'Pumps need both power cabinets thrown. The hookup is on the tanker\'s road side.',
        'Do not run the pumps at night. They are loud.',
      ],
    },
  ],
  cues: [
    { on: 'start', at: 1.5, speaker: CREW, text: 'The fuel yard. The camp has three days of fuel. This is what is left on the road.' },
    { on: 'start', at: 8, speaker: CREW, text: 'Two power cabinets, then the tanker hookup. The pumps are loud. Be ready to hold.', seconds: 6 },
    { on: 'step', step: 0, at: 0.6, speaker: CREW, text: 'Pumps have power. Get to the tanker and start the transfer.' },
    { on: 'done', at: 0.6, speaker: CREW, text: 'Tanker is full. That is the camp\'s fuel, for now. The road east is open.' },
  ],
  navBounds: { minX: -33, maxX: 33, minZ: -17, maxZ: 17 },
  ramp: null,
  barricadeBars: [],
  streetSpawns: [],
  playerSpawns: [{ x: -24, y: 0, z: 3 }],
  spawnYaw: -Math.PI / 2,
  streetLamps: [],
  checkpoint: { x: -24, y: 0, z: 3 },
};
