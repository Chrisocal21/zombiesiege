import type { Door, Elevator, Level, LevelBox, LevelLight, Station } from './types';
import { CREW, SCIENTIST, SCIENTIST_HERE } from './voices';
import { DOOR_HEIGHT, entry, furniture, shell, stationBoxes, type WardStyle } from './wardKit';

// Act 3, the finale: the vault. A wide, cold chamber with the vault door in the middle of the north
// wall and its control panel beside it. The lift comes in on the south wall. Start the unlock at the
// panel and hold the space in front of the door while it runs, with the dead coming from all four
// sides: the whole crew fights from the middle of the room.
//
// Partway through the hold Patient O comes in through the west door and goes for whoever is on the
// panel. When the lock releases, a short scene: the door swings open and the scientist steps out with
// the sample. Then Patient O, enraged, stands between the crew and the lift, and has to be beaten back
// into the vault, where the door is shut on it. Behind the door is a small strongroom, the alcove the
// wall's opening makes.
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

// The way into the strongroom behind the vault door, in the middle of the north wall.
const strongroom: Door = { position: { x: 0, y: 0, z: -12.25 }, normal: { x: 0, z: 1 }, width: 2.4, height: DOOR_HEIGHT };

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
  // Inside the strongroom.
  { position: { x: 0, y: 2.7, z: -14.2 }, color: '#bfe8ff', intensity: 9, ceiling: true },
];

export const vaultLevel: Level = {
  name: 'The vault',
  theme: 'ward',
  boxes: [
    ...stationBoxes(stations),
    ...shell(style, 14, 12, [...doors, elevator, strongroom]),

    // The vault door: a slab across the strongroom's opening, with the control panel beside it. It is
    // drawn from the game state, swinging open and shut.
    { position: { x: 0, y: 1.5, z: -11.55 }, size: { x: 4.4, y: 3, z: 0.7 }, color: STEEL, surface: 'plain', hidden: true, vaultDoor: true },
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
  // The vault's time lock is run from the panel by its door. Start it and hold the room in front of the
  // door. Then Patient O has to be driven back into the vault.
  objective: null,
  steps: [
    {
      kind: 'charge',
      label: 'Vault time lock',
      part: 'Vault unlocked',
      device: { position: { x: 3.7, y: 0, z: -11.95 }, normal: { x: 0, z: 1 } },
      room: { minX: -7, maxX: 7, minZ: -11.8, maxZ: -2 },
      roomName: 'Vault door',
      seconds: 60,
      screen: 'VAULT TIME LOCK',
    },
    { kind: 'contain', label: 'Patient O', part: 'Patient O sealed in the vault' },
  ],
  // It comes through the west door 22 seconds into the hold, falls back into the strongroom, and
  // after the scene stands between the vault and the lift.
  boss: { name: 'Patient O', door: 2, arriveAt: 22, retreat: { x: 0, y: 0, z: -14.2 }, stand: { x: 0, y: 0, z: 3.6 } },
  scene: {
    after: 0,
    seconds: 10.5,
    from: { x: 0, y: 0, z: -14.6 },
    to: { x: 0.9, y: 0, z: -9.4 },
    doorAt: 0.9,
    walkAt: 3,
    walkSeconds: 3.2,
    shots: [
      // Wide from the room as the door swings.
      { from: 0, to: 4.6, start: { at: { x: 5.5, y: 1.75, z: -5.2 }, look: { x: 0, y: 1.4, z: -12 } }, end: { at: { x: 4.6, y: 1.7, z: -6 }, look: { x: 0, y: 1.4, z: -12.5 } } },
      // Close on him as he comes out.
      { from: 4.6, to: 10.5, start: { at: { x: 2.6, y: 1.62, z: -6.6 }, look: { x: 0.9, y: 1.55, z: -9.6 } }, end: { at: { x: 2.3, y: 1.6, z: -6.9 }, look: { x: 0.9, y: 1.6, z: -9.4 } } },
    ],
    captions: [
      { from: 0.8, to: 3.6, title: 'THE VAULT', line: 'Operation 003  ·  the time lock releases' },
      { from: 4.8, to: 7.8, speaker: SCIENTIST_HERE, line: 'You came. I have the sample. All of it that is left.' },
      { from: 7.9, to: 10.3, speaker: SCIENTIST_HERE, line: 'That thing came for it. Get me to the lift.' },
    ],
  },
  cues: [
    { on: 'start', at: 1.5, speaker: SCIENTIST, text: 'I am behind that door. The time lock takes a minute once it starts. Do not let them stop it.', seconds: 6 },
    { on: 'boss', at: 0.5, speaker: CREW, text: 'Something big just came through the west door. It is going for the panel!' },
    { on: 'boss', at: 5.5, speaker: SCIENTIST, text: 'That is Patient O. It was a subject on twelve, at the hospital. Keep it off the panel. Aim for the head.', seconds: 6 },
    { on: 'step', step: 0, at: 10.8, speaker: CREW, text: 'It is between us and the lift. Drive it back into that vault!' },
    { on: 'done', at: 0.6, speaker: SCIENTIST_HERE, text: 'It is in. That door will hold it. It has to.' },
    { on: 'done', at: 5.8, speaker: CREW, text: 'Lift is open. Everyone in, and keep him between us.' },
  ],
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
