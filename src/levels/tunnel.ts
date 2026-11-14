import type { Elevator, Level, LevelLight, Station } from './types';
import { DOOR_HEIGHT, entry, furniture, shell, stationBoxes, type WardStyle } from './wardKit';

// Act 3, the first floor: the service tunnel under the street, from the tower's garage toward the
// pharmacy. A long, narrow concrete run with cable trays and concrete barriers staggered down it,
// so every fight is along a line. This is a moving floor: three breakers are spread down its
// length, and the lift at the far end is dead until they are all thrown. The dead come out of
// maintenance doors in the side walls and down the tunnel from the east.
//
//   z -5.5 +-lift--------------------------------------------------+
//          |  [b]       [b]            [b]      [b]                 |
//   z  5.5 +----------------------------------------------<--------+
//         x -22                                                  22

const style: WardStyle = { wall: '#6f7377', floor: '#3a3d40', ceiling: '#7c8085' };
const BARRIER = '#8a8d90';
const TRAY = '#5d6368';

const doors = [entry(-6, -5.75, 0, 1), entry(14, -5.75, 0, 1), entry(8, 5.75, 0, -1), entry(22.25, 0, -1, 0)];

// The lift to the pharmacy is on the west wall, where the tunnel starts.
const elevator: Elevator = { position: { x: -22.25, y: 0, z: 0 }, normal: { x: 1, z: 0 }, width: 2.2, height: DOOR_HEIGHT, cabDepth: 3, cabWidth: 3 };

const stations: Station[] = [
  { kind: 'ammo', position: { x: -14, y: 1.25, z: -5.45 }, normal: { x: 0, z: 1 } },
  { kind: 'shotgun', position: { x: 0, y: 1.25, z: 5.45 }, normal: { x: 0, z: -1 } },
];

// Circuit 0 is the west end, 1 the middle, 2 the east end.
const lights: LevelLight[] = [
  { position: { x: -17, y: 3.15, z: 0 }, color: '#d8e4f0', intensity: 18, ceiling: true, circuit: 0 },
  { position: { x: -10, y: 3.15, z: 0 }, color: '#d8e4f0', intensity: 18, flicker: true, ceiling: true, circuit: 0 },
  { position: { x: -3, y: 3.15, z: 0 }, color: '#ffe0b0', intensity: 18, ceiling: true, circuit: 1 },
  { position: { x: 4, y: 3.15, z: 0 }, color: '#d8e4f0', intensity: 18, flicker: true, ceiling: true, circuit: 1 },
  { position: { x: 11, y: 3.15, z: 0 }, color: '#ffe0b0', intensity: 18, ceiling: true, circuit: 2 },
  { position: { x: 18, y: 3.15, z: 0 }, color: '#d8e4f0', intensity: 16, flicker: true, ceiling: true, circuit: 2 },
  ...([
    [-20.8, 3], [-8, -5.3], [2, 5.3], [12, 5.3], [21, -3],
  ] as const).map(([x, z]): LevelLight => ({ position: { x, y: 2.75, z }, color: '#ff2a1a', intensity: 3.5, emergency: true })),
];

export const tunnel: Level = {
  name: 'Service tunnel',
  theme: 'ward',
  boxes: [
    ...stationBoxes(stations),
    ...shell(style, 22, 5.5, [...doors, elevator]),

    // Concrete barriers and a cable drum staggered down the tunnel so no line of fire runs the length of it.
    furniture(-14, 1.6, 0.8, 1.1, 2.4, BARRIER),
    furniture(-6, -1.8, 0.8, 1.1, 2.4, BARRIER),
    furniture(2, 1.8, 0.8, 1.1, 2.4, BARRIER),
    furniture(9, -1.4, 0.8, 1.1, 2.4, BARRIER),
    furniture(17, 1.6, 0.8, 1.1, 2.4, BARRIER),
    furniture(-1, -3.9, 1.8, 0.7, 0.8, '#8a9ba3', 'cart', 'north'),
    furniture(12.5, 3.8, 1.6, 0.9, 1.0, TRAY, 'cabinet', 'south'),
  ],
  ladders: [],
  lights,
  doors,
  gate: null,
  elevator,
  stations,
  locks: [],
  signs: [
    { text: 'SERVICE TUNNEL', sub: 'AUTHORISED PERSONNEL  /  HARD HATS', background: '#6b4a12', position: { x: -19, y: 2.9, z: -5.45 }, rotation: 0, width: 2.8, height: 0.7 },
    { text: 'PHARMACY', sub: 'DELIVERIES  /  300 M', background: '#1b5b4d', position: { x: 20, y: 2.9, z: 5.45 }, rotation: Math.PI, width: 2.0, height: 0.6 },
    { text: 'LIFT', sub: 'NO POWER  /  RESET THE BREAKERS', background: '#5b1b1b', position: { x: -21.96, y: 3.0, z: -3.4 }, rotation: Math.PI / 2, width: 2.4, height: 0.5 },
  ],
  // One breaker near each end of the tunnel and one in the middle: the player has to cross it.
  objective: {
    kind: 'breakers',
    label: 'Breakers',
    part: 'Power to the lift',
    panels: [
      { position: { x: -9.5, y: 1.45, z: 5.45 }, normal: { x: 0, z: -1 } },
      { position: { x: 5, y: 1.45, z: -5.45 }, normal: { x: 0, z: 1 } },
      { position: { x: 21.95, y: 1.45, z: 3.5 }, normal: { x: -1, z: 0 } },
    ],
  },
  atmosphere: { fog: '#030508', fogNear: 5, fogFar: 36, ambient: 1 },
  navBounds: { minX: -27, maxX: 27, minZ: -10, maxZ: 10 },
  ramp: null,
  barricadeBars: [
    { x: -12, y: 0, z: 0 },
    { x: 6, y: 0, z: 1 },
  ],
  streetSpawns: [],
  playerSpawns: [{ x: -19, y: 0, z: 0 }],
  spawnYaw: -Math.PI / 2,
  streetLamps: [],
  checkpoint: { x: -19, y: 0, z: 0 },
};
