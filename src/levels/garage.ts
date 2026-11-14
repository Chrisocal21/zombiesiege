import type { Elevator, Level, LevelBox, LevelLight, Station } from './types';
import { CREW, SCIENTIST } from './voices';
import { DOOR_HEIGHT, entry, furniture, shell, stationBoxes, type WardStyle } from './wardKit';

// Act 2, the bottom: the office tower's own parking level, under the lobby. It is dark and packed.
// Rows of cars in bays along the north and south walls, concrete pillars down the middle, and the
// dead coming in from the ramp, the tunnel mouths in the east wall and the stairs. Three breakers
// light the level in thirds, and the freight lift down to the tunnel has no power until all
// three are thrown.
//
//   z -12 +--lift--------------------------+
//         | cars  cars  cars  cars   cars   |
//         |    p        p        p        p |
//         |<ramp                    tunnel >|
//         |    p        p        p        p |
//         | cars  cars  cars  cars   cars   |
//   z  12 +-------------------------<-------+
//        x -20                            20

const style: WardStyle = { wall: '#8e9196', floor: '#4a4d51', ceiling: '#9a9da1' };
const CONCRETE = '#8f9296';

const doors = [entry(20.25, -5, -1, 0), entry(20.25, 5, -1, 0), entry(-20.25, 5, 1, 0), entry(8, 12.25, 0, -1)];

const elevator: Elevator = { position: { x: -14, y: 0, z: -12.25 }, normal: { x: 0, z: 1 }, width: 2.2, height: DOOR_HEIGHT, cabDepth: 3, cabWidth: 3 };

const stations: Station[] = [
  { kind: 'ammo', position: { x: -6, y: 1.25, z: -11.95 }, normal: { x: 0, z: 1 } },
  { kind: 'shotgun', weapon: 'ak', position: { x: 19.95, y: 1.25, z: 0 }, normal: { x: -1, z: 0 } },
];

const car = (x: number, z: number, color: string, van = false): LevelBox => ({
  position: { x, y: van ? 1.2 : 0.74, z },
  size: van ? { x: 5.45, y: 2.4, z: 2.04 } : { x: 4.55, y: 1.48, z: 1.86 },
  color,
  surface: van ? 'van' : 'car',
});
const pillar = (x: number, z: number): LevelBox => ({ position: { x, y: 1.7, z }, size: { x: 0.7, y: 3.4, z: 0.7 }, color: CONCRETE, surface: 'pillar' });

// Circuit 0 is the lift end and the west third, 1 the middle, 2 the east end with the tunnel mouths.
const lights: LevelLight[] = [
  { position: { x: -14, y: 3.15, z: -7 }, color: '#d8e4f0', intensity: 20, ceiling: true, circuit: 0 },
  { position: { x: -14, y: 3.15, z: 6 }, color: '#d8e4f0', intensity: 18, flicker: true, ceiling: true, circuit: 0 },
  { position: { x: -6, y: 3.15, z: 0 }, color: '#d8e4f0', intensity: 20, ceiling: true, circuit: 0 },
  { position: { x: 1, y: 3.15, z: -7 }, color: '#d8e4f0', intensity: 20, ceiling: true, circuit: 1 },
  { position: { x: 1, y: 3.15, z: 7 }, color: '#d8e4f0', intensity: 20, flicker: true, ceiling: true, circuit: 1 },
  { position: { x: 8, y: 3.15, z: 0 }, color: '#d8e4f0', intensity: 20, ceiling: true, circuit: 1 },
  { position: { x: 14, y: 3.15, z: -7 }, color: '#ffe0b0', intensity: 18, ceiling: true, circuit: 2 },
  { position: { x: 14, y: 3.15, z: 7 }, color: '#ffe0b0', intensity: 18, flicker: true, ceiling: true, circuit: 2 },
  { position: { x: 17, y: 3.15, z: 0 }, color: '#ffe0b0', intensity: 16, ceiling: true, circuit: 2 },
  ...([
    [-19.8, -2], [-8, -11.8], [0, 11.8], [10, -11.8], [19.8, 2.5], [-10, 11.8],
  ] as const).map(([x, z]): LevelLight => ({ position: { x, y: 2.75, z }, color: '#ff2a1a', intensity: 3.5, emergency: true })),
];

export const garage: Level = {
  name: 'Tower garage',
  theme: 'ward',
  boxes: [
    ...stationBoxes(stations),
    ...shell(style, 20, 12, [...doors, elevator]),

    // Pillars down the middle, two rows.
    ...[-12, -4, 4, 12].flatMap((x) => [pillar(x, -3.5), pillar(x, 3.5)]),
    // Cars in the bays along the north and south walls, with gaps to cut through.
    car(-7, -9.4, '#6b2a2a'),
    car(-1.5, -9.4, '#2f4a5c'),
    car(4, -9.4, '#bdbfbc'),
    car(9.5, -9.4, '#3f5a44'),
    car(15, -9.4, '#a8782f'),
    car(-16, 9.4, '#4a4f55'),
    car(-10, 9.4, '#7a7e83', true),
    car(-3, 9.4, '#6b2a2a'),
    car(3, 9.4, '#2b3441'),
    car(14.5, 9.4, '#bdbfbc'),
    // A concrete barrier, a pallet of boxes by the lift and a bench from the stairwell.
    furniture(-9, 0, 3, 0.9, 0.5, '#7c8084'),
    furniture(-16, -9, 1.6, 1.1, 1.2, '#8a6b45', 'cabinet', 'east'),
    furniture(16.5, 1, 0.9, 0.8, 2, '#5d646b', 'bench', 'west'),
  ],
  ladders: [],
  lights,
  doors,
  gate: null,
  elevator,
  stations,
  locks: [],
  signs: [
    { text: 'LEVEL P1', sub: 'STAFF AND VISITOR PARKING', background: '#2c3a4d', position: { x: -9, y: 2.9, z: -11.96 }, rotation: 0, width: 2.6, height: 0.8 },
    { text: 'TUNNEL ACCESS', sub: 'SERVICE LIFT  /  NO POWER', background: '#5b1b1b', position: { x: -17.5, y: 3.0, z: -11.96 }, rotation: 0, width: 2.4, height: 0.5 },
    { text: 'EXIT', sub: 'RAMP TO STREET', background: '#1b5b4d', position: { x: -19.96, y: 2.9, z: 1.5 }, rotation: Math.PI / 2, width: 1.6, height: 0.5 },
  ],
  // Two steps: the breakers light the level, and then the service lift needs a battery, and the only
  // one to be had is in one of the parked cars. It comes to the lift on foot, both hands on it.
  objective: null,
  steps: [
    {
      kind: 'breakers',
      label: 'Breakers',
      part: 'Light on the level',
      panels: [
        { position: { x: -19.95, y: 1.45, z: 2 }, normal: { x: 1, z: 0 } },
        { position: { x: 12, y: 1.45, z: -11.95 }, normal: { x: 0, z: 1 } },
        { position: { x: -2, y: 1.45, z: 11.95 }, normal: { x: 0, z: -1 } },
      ],
    },
    {
      kind: 'carry',
      label: 'Car battery',
      part: 'Power to the service lift',
      items: [{ x: -3, y: 0, z: 7.9 }],
      dropoff: { x: -14, y: 0, z: -10.6 },
    },
  ],
  cues: [
    { on: 'start', at: 1.5, speaker: CREW, text: 'Parking level. Pitch black, and the ramp is wide open.' },
    { on: 'step', step: 0, at: 0.8, speaker: CREW, text: 'Lights are up. The service lift is still dead. It wants a battery.' },
    { on: 'step', step: 0, at: 7, speaker: SCIENTIST, text: 'Take one from a car. Any one that starts. Under the street. That is how they moved me.', seconds: 6.5 },
    { on: 'done', at: 0.6, speaker: SCIENTIST, text: 'Good. The tunnel is long, and straight. Do not stop in it.' },
  ],
  atmosphere: { fog: '#030508', fogNear: 4, fogFar: 34, ambient: 1 },
  navBounds: { minX: -25, maxX: 25, minZ: -17, maxZ: 17 },
  ramp: null,
  barricadeBars: [
    { x: -9, y: 0, z: 2 },
    { x: 8, y: 0, z: -1 },
  ],
  streetSpawns: [],
  playerSpawns: [{ x: -14, y: 0, z: -8.5 }],
  spawnYaw: Math.PI,
  streetLamps: [],
  checkpoint: { x: -14, y: 0, z: -8.5 },
};
