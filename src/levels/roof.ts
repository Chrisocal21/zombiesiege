import { alcoveBoxes, wallLine } from './build';
import type { Door, Elevator, Level, LevelBox, LevelLight, Station } from './types';
import { DOOR_HEIGHT, entry, furniture, stationBoxes } from './wardKit';

// The roof of the hospital tower, open to the night sky. The elevator comes up into its machine
// room on the south edge. Zombies climb the stairwells and come out of four stair heads. The
// helipad is in the west; the box that switches its lights on is on the far east parapet, past
// the air-conditioning plant, so the players have to cross the roof and come back.
//
//   z -14 +----------------------------------------+
//         | [STAIR 1]                   [STAIR 2]  |
//         |                          [AC PLANT]    |
//         |     ( HELIPAD )                [LIGHTS]|
//         |[STAIR 4]                 [AC]  [STAIR 3]
//         |  [TANK]          [LIFT]                |
//   z  14 +----------------------------------------+
//        x -18                                    18

const HALF_X = 18;
const HALF_Z = 14;
const PARAPET = 1.1;
const CONCRETE = '#6d7275';
const WALL = '#8a8f8c';
// The stair heads and the machine room are low concrete huts with flat tops.
const HUT_HEIGHT = 3.2;
const HOUSING_HEIGHT = 4;

const doors: Door[] = [entry(-12, -10.25, 0, 1), entry(12, -10.25, 0, 1), entry(14.25, 4, -1, 0), entry(-14.25, 4, 1, 0)];

const elevator: Elevator = { position: { x: 0, y: 0, z: 10.25 }, normal: { x: 0, z: -1 }, width: 2.2, height: DOOR_HEIGHT, cabDepth: 3, cabWidth: 3 };

const stations: Station[] = [
  { kind: 'ammo', position: { x: 3, y: 1.25, z: 9.95 }, normal: { x: 0, z: -1 } },
  { kind: 'shotgun', weapon: 'ak', position: { x: -3, y: 1.25, z: 9.95 }, normal: { x: 0, z: -1 } },
];

// Where the box that switches on the helipad lights stands against the east parapet.
const lightsBox = { position: { x: 17.8, y: 0, z: -3 }, normal: { x: -1, z: 0 } };

// A stair head: a concrete hut round the space behind a zombie door, with a flat top.
function stairHead(door: Door): LevelBox[] {
  const alongX = door.normal.z !== 0;
  const centre = alongX ? door.position.x : door.position.z;
  const fixed = alongX ? door.position.z : door.position.x;
  const out = { x: -door.normal.x, z: -door.normal.z };
  return [
    ...wallLine(alongX ? 'x' : 'z', fixed, centre - 2, centre + 2, [{ centre, width: door.width, height: door.height }], HUT_HEIGHT, 0.5, WALL),
    ...alcoveBoxes(door, { ceiling: HUT_HEIGHT, depth: 3, width: 3, thickness: 0.5, wallColor: WALL, floorColor: CONCRETE }),
    {
      position: { x: door.position.x + out.x * 1.75, y: HUT_HEIGHT + 0.1, z: door.position.z + out.z * 1.75 },
      size: { x: 4.2, y: 0.2, z: 4.2 },
      color: WALL,
      surface: 'wall',
    },
  ];
}

// The machine room on the south edge, with the elevator cab behind its doors.
function machineRoom(): LevelBox[] {
  const z = elevator.position.z;
  return [
    ...wallLine('x', z, -4.5, 4.5, [{ centre: 0, width: elevator.width, height: elevator.height }], HOUSING_HEIGHT, 0.5, WALL),
    ...alcoveBoxes(elevator, { ceiling: HOUSING_HEIGHT, depth: 3, width: 3, thickness: 0.5, wallColor: WALL, floorColor: CONCRETE }),
    { position: { x: -3.25, y: HOUSING_HEIGHT / 2, z: 12.25 }, size: { x: 2.5, y: HOUSING_HEIGHT, z: 3.5 }, color: WALL, surface: 'wall' },
    { position: { x: 3.25, y: HOUSING_HEIGHT / 2, z: 12.25 }, size: { x: 2.5, y: HOUSING_HEIGHT, z: 3.5 }, color: WALL, surface: 'wall' },
    { position: { x: 0, y: HOUSING_HEIGHT + 0.15, z: 12.1 }, size: { x: 9.4, y: 0.3, z: 4.2 }, color: WALL, surface: 'wall' },
  ];
}

const parapet = (x: number, z: number, sx: number, sz: number): LevelBox => ({
  position: { x, y: PARAPET / 2, z }, size: { x: sx, y: PARAPET, z: sz }, color: WALL, surface: 'wall',
});

const lights: LevelLight[] = [
  { position: { x: -8.5, y: 3.6, z: 7.5 }, color: '#ffd29a', intensity: 20 },
  { position: { x: 8.5, y: 3.6, z: 8 }, color: '#ffd29a', intensity: 18, flicker: true },
  { position: { x: 3.5, y: 3.6, z: -9 }, color: '#cfe0ff', intensity: 18 },
];

export const roof: Level = {
  name: 'Roof',
  theme: 'roof',
  atmosphere: { fog: '#0c1119', fogNear: 35, fogFar: 170, ambient: 1 },
  boxes: [
    ...stationBoxes(stations),
    { position: { x: 0, y: -0.25, z: 0 }, size: { x: HALF_X * 2 + 1, y: 0.5, z: HALF_Z * 2 + 1 }, color: CONCRETE, surface: 'floor' },
    parapet(0, -HALF_Z - 0.2, HALF_X * 2 + 0.8, 0.4),
    parapet(0, HALF_Z + 0.2, HALF_X * 2 + 0.8, 0.4),
    parapet(-HALF_X - 0.2, 0, 0.4, HALF_Z * 2),
    parapet(HALF_X + 0.2, 0, 0.4, HALF_Z * 2),
    // Unseen walls just past the parapet, so nobody climbs over it and falls fourteen storeys.
    { position: { x: 0, y: 3, z: -HALF_Z - 0.6 }, size: { x: HALF_X * 2 + 2, y: 6, z: 0.4 }, color: WALL, surface: 'step' },
    { position: { x: 0, y: 3, z: HALF_Z + 0.6 }, size: { x: HALF_X * 2 + 2, y: 6, z: 0.4 }, color: WALL, surface: 'step' },
    { position: { x: -HALF_X - 0.6, y: 3, z: 0 }, size: { x: 0.4, y: 6, z: HALF_Z * 2 + 2 }, color: WALL, surface: 'step' },
    { position: { x: HALF_X + 0.6, y: 3, z: 0 }, size: { x: 0.4, y: 6, z: HALF_Z * 2 + 2 }, color: WALL, surface: 'step' },
    ...doors.flatMap(stairHead),
    ...machineRoom(),
    // The helipad light box against the east parapet.
    { position: { x: 17.6, y: 0.8, z: -3 }, size: { x: 0.7, y: 1.6, z: 1.3 }, color: '#3a4046', surface: 'step' },

    // Air-conditioning plant: two islands between the lift and the light box.
    // Too tall to climb, so nobody can sit on top out of reach.
    furniture(9, -6.8, 4, 2.6, 3.4, '#7e868b', 'hvac', 'west'),
    furniture(8, 3, 3.4, 2.6, 4.4, '#7e868b', 'hvac', 'west'),
    // The water tank on its stand, vents and a radio mast.
    furniture(-13, 9.5, 3, 3.4, 3, '#5d666b', 'tank', 'east'),
    furniture(2.5, -11.6, 1.2, 0.9, 1.2, '#7e868b', 'vent', 'south'),
    furniture(-3.5, 5.5, 1.2, 0.9, 1.2, '#7e868b', 'vent', 'north'),
    furniture(13.2, 10.6, 1.6, 0.9, 1.2, '#7e868b', 'vent', 'west'),
    furniture(6.2, 12.6, 0.8, 7, 0.8, '#9aa2a8', 'mast', 'north'),
  ],
  ladders: [],
  lights,
  doors,
  gate: null,
  elevator,
  stations,
  locks: [],
  signs: [
    { text: 'HELIPAD', sub: 'ROOF  /  LEVEL 14', background: '#5b1b1b', position: { x: 0, y: 3.35, z: 9.98 }, rotation: Math.PI, width: 2.6, height: 0.7 },
  ],
  objective: {
    kind: 'signal',
    label: 'Helipad lights',
    part: 'Extraction',
    device: lightsBox,
    pad: { x: -6, y: 0, z: -3 },
    padRadius: 4,
    seconds: 90,
  },
  navBounds: { minX: -19, maxX: 19, minZ: -15, maxZ: 15 },
  ramp: null,
  barricadeBars: [
    { x: -3, y: 0, z: 7 },
    { x: 5, y: 0, z: -2 },
  ],
  streetSpawns: [],
  playerSpawns: [{ x: 0, y: 0, z: 8 }],
  spawnYaw: 0,
  streetLamps: [],
  checkpoint: { x: 0, y: 0, z: 8 },
};
