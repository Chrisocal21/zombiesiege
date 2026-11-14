import type { Elevator, Level, LevelBox, LevelLight, Station } from './types';
import { DOOR_HEIGHT, entry, furniture, shell, stationBoxes, type WardStyle } from './wardKit';

// Act 3, the finale: the vault. A wide, cold chamber with the vault door in the middle of the north
// wall and its control panel beside it. The lift comes in on the south wall. Start the unlock at the
// panel and hold the space in front of the door while it runs, with the dead coming from all four
// sides: the whole crew fights from the middle of the room.
//
//   z -12 +-----+--[ VAULT DOOR ]--+-----+
//         |     panel                    |
//         |   F       F       F       F  |   (F = pillar / fridge column)
//         |                              |
//   z  12 +-----------lift----------------+
//        x -14                          14

const style: WardStyle = { wall: '#aab6bf', floor: '#56646e', ceiling: '#d6dee3' };
const STEEL = '#4a5058';
const FRIDGE = '#aebcc6';

const doors = [entry(14.25, -4, -1, 0), entry(14.25, 5, -1, 0), entry(-14.25, -4, 1, 0), entry(-14.25, 5, 1, 0)];

const elevator: Elevator = { position: { x: 0, y: 0, z: 12.25 }, normal: { x: 0, z: -1 }, width: 2.2, height: DOOR_HEIGHT, cabDepth: 3, cabWidth: 3 };

const stations: Station[] = [
  { kind: 'ammo', position: { x: -6, y: 1.25, z: 11.95 }, normal: { x: 0, z: -1 } },
  { kind: 'shotgun', weapon: 'ak', position: { x: 6, y: 1.25, z: 11.95 }, normal: { x: 0, z: -1 } },
];

const pillar = (x: number, z: number): LevelBox => ({ position: { x, y: 1.7, z }, size: { x: 0.9, y: 3.4, z: 0.9 }, color: '#8f969c', surface: 'pillar' });

const lights: LevelLight[] = [
  { position: { x: 0, y: 3.15, z: -8 }, color: '#ff8a70', intensity: 26, ceiling: true },
  { position: { x: -8, y: 3.15, z: -4 }, color: '#c8e4ff', intensity: 18, flicker: true, ceiling: true },
  { position: { x: 8, y: 3.15, z: -4 }, color: '#c8e4ff', intensity: 18, ceiling: true },
  { position: { x: -8, y: 3.15, z: 4 }, color: '#c8e4ff', intensity: 18, ceiling: true },
  { position: { x: 8, y: 3.15, z: 4 }, color: '#c8e4ff', intensity: 18, flicker: true, ceiling: true },
  { position: { x: 0, y: 3.15, z: 0 }, color: '#e8f4ff', intensity: 24, ceiling: true },
  { position: { x: 0, y: 3.15, z: 8 }, color: '#c8e4ff', intensity: 16, ceiling: true },
];

export const vaultLevel: Level = {
  name: 'The vault',
  theme: 'ward',
  boxes: [
    ...stationBoxes(stations),
    ...shell(style, 14, 12, [...doors, elevator]),

    // The vault door: a slab in the north wall, with the control panel beside it.
    { position: { x: 0, y: 1.5, z: -11.55 }, size: { x: 4.4, y: 3, z: 0.7 }, color: STEEL, surface: 'plain' },
    // Pillars and fridge columns in the middle of the room, cover for the hold.
    pillar(-7, -3),
    pillar(7, -3),
    pillar(-7, 5),
    pillar(7, 5),
    furniture(-3.5, 1, 1.2, 2, 3, FRIDGE, 'fridge', 'east'),
    furniture(3.5, 1, 1.2, 2, 3, FRIDGE, 'fridge', 'west'),
    furniture(0, 6.5, 3.2, 0.9, 1, '#8a959c', 'lab', 'south'),
    furniture(-11.5, 0.5, 0.9, 0.8, 2.2, '#8a959c', 'bench', 'east'),
    furniture(11.5, 0.5, 0.9, 0.8, 2.2, '#8a959c', 'bench', 'west'),
  ],
  ladders: [],
  lights,
  doors,
  gate: null,
  elevator,
  stations,
  locks: [],
  signs: [
    { text: 'VAULT', sub: 'SAMPLE STORE  /  TIME LOCK', background: '#6b1b1b', position: { x: 0, y: 3.0, z: -10.95 }, rotation: 0, width: 3.0, height: 0.8 },
    { text: 'LIFT', sub: 'PHARMACY  /  LABORATORY', background: '#5b1b1b', position: { x: 4, y: 3.0, z: 11.96 }, rotation: Math.PI, width: 2.4, height: 0.5 },
  ],
  // The vault's time lock is run from the panel by its door. Start it and hold the room in front of the door.
  objective: {
    kind: 'charge',
    label: 'Vault time lock',
    part: 'Vault unlocked',
    device: { position: { x: 3.7, y: 1.45, z: -11.95 }, normal: { x: 0, z: 1 } },
    room: { minX: -7, maxX: 7, minZ: -11.8, maxZ: -2 },
    roomName: 'Vault door',
    seconds: 60,
  },
  atmosphere: { fog: '#05070b', fogNear: 8, fogFar: 40, ambient: 1 },
  navBounds: { minX: -19, maxX: 19, minZ: -17, maxZ: 17 },
  ramp: null,
  barricadeBars: [
    { x: -3, y: 0, z: 4 },
    { x: 3, y: 0, z: 4 },
  ],
  streetSpawns: [],
  playerSpawns: [{ x: 0, y: 0, z: 9 }],
  spawnYaw: 0,
  streetLamps: [],
  checkpoint: { x: 0, y: 0, z: 9 },
};
