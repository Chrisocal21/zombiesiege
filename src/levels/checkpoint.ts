import type { Elevator, Level, LevelLight, Station } from './types';
import { CREW } from './voices';
import { block, FRONT_HEIGHT, frontage, ground, parkedCar, streetDoor, checkpointBoxes } from './streetKit';
import { DOOR_HEIGHT, stationBoxes } from './wardKit';

// Prologue P03, Failed Evacuation Checkpoint (Mile 5): the army's screening point, where people were
// checked before being let through. The infected turned inside the screening tents and the barriers are
// shut. Three gate controls are on the booths along the lanes; once they are all thrown the exit opens.
//
//   z -10 +--[tent]----------[tent]------------[booth]-----------+
//         |  concrete lane, jersey barriers                      |
//         |  road   (buses, trucks, barriers)              EXIT >
//         |  concrete lane                                       |
//   z  10 +-------[tent]---------------[tent]--------------------+
//        x -30                                                30

const CONCRETE = '#6a6f73';
const TENT = '#58634e';

const doors = [streetDoor(-18, -10.25, 0, 1), streetDoor(2, -10.25, 0, 1), streetDoor(-6, 10.25, 0, -1), streetDoor(16, 10.25, 0, -1)];

const elevator: Elevator = { position: { x: 30.25, y: 0, z: 0 }, normal: { x: -1, z: 0 }, width: 6, height: DOOR_HEIGHT, cabDepth: 4, cabWidth: 6 };
const entry: Elevator = { position: { x: -30.25, y: 0, z: 0 }, normal: { x: 1, z: 0 }, width: 6, height: DOOR_HEIGHT, cabDepth: 4, cabWidth: 6 };

const stations: Station[] = [
  { kind: 'ammo', position: { x: -26, y: 1.25, z: -9.95 }, normal: { x: 0, z: 1 } },
  { kind: 'shotgun', position: { x: 8, y: 1.25, z: 9.95 }, normal: { x: 0, z: -1 } },
];

const lamp = (x: number, z: number, flicker = false): LevelLight => ({ position: { x, y: 3.8, z }, color: '#d6e6ff', intensity: 34, flicker });
const lights: LevelLight[] = [lamp(-24, 8.4), lamp(-12, -8.4, true), lamp(0, 8.4), lamp(10, -8.4), lamp(20, 8.4, true), lamp(26, -8.4)];

export const checkpoint: Level = {
  name: 'Checkpoint',
  theme: 'street',
  scenery: { north: 'trees', south: 'trees', west: 'trees', east: 'trees' },
  exitGate: true,
  atmosphere: { fog: '#1c2128', fogNear: 20, fogFar: 85, ambient: 1.05, sky: { horizon: '#2a2a3a', zenith: '#06080f', stars: 0.6 } },
  boxes: [
    ground(-30, 30, -6, 6, '#2a2d32', 'slab'),
    ground(-30, 30, -10, -6, '#8a8d90'),
    ground(-30, 30, 6, 10, '#8a8d90'),
    ...frontage('x', -10.25, -30.5, 30.5, doors, FRONT_HEIGHT, TENT, 'wall'),
    ...frontage('x', 10.25, -30.5, 30.5, doors, FRONT_HEIGHT, TENT, 'wall'),
    ...frontage('z', 30.25, -10, 10, [elevator], FRONT_HEIGHT, CONCRETE, 'building', [elevator]),
    ...checkpointBoxes(elevator, CONCRETE),
    ...frontage('z', -30.25, -10, 10, [entry], FRONT_HEIGHT, CONCRETE, 'building', [entry]),
    ...checkpointBoxes(entry, CONCRETE),
    ...stationBoxes(stations),

    // Shut lanes: buses and a truck across the road, jersey barriers, screening tables.
    parkedCar(-14, -4.4, '#c5c8c5', true),
    parkedCar(-10, 4.4, '#3a4a5c', true),
    parkedCar(-2, -4.4, '#4a4f55'),
    parkedCar(12, 4.4, '#344e41', true),
    parkedCar(22, -4.4, '#6b2a2a'),
    block(-6, 0.5, 0.8, 1.1, 3.4, '#9a9da0'),
    block(6, -0.8, 0.8, 1.1, 3.4, '#9a9da0'),
    block(18, 1, 0.8, 1.1, 3.4, '#9a9da0'),
    block(-22, 7.4, 2.4, 0.9, 0.9, '#7a6f5a', 'crate'),
    block(24, -7.4, 2.4, 0.9, 0.9, '#7a6f5a', 'crate'),
  ],
  ladders: [],
  lights,
  doors,
  gate: null,
  elevator,
  entry,
  stations,
  locks: [],
  signs: [
    { text: 'EVACUATION POINT 4', sub: 'SCREENING  /  NO ENTRY', background: '#3a4a2a', position: { x: -12, y: 4.2, z: -9.96 }, rotation: 0, width: 3.6, height: 0.9 },
    { text: 'LANE CLOSED', sub: 'TURN BACK', background: '#6b4a12', position: { x: 4, y: 3.2, z: 9.96 }, rotation: Math.PI, width: 2.6, height: 0.7 },
    { text: 'EXIT GATE', sub: 'CLEARED VEHICLES ONLY', background: '#5b1b1b', position: { x: 29.96, y: 3.0, z: 3.6 }, rotation: -Math.PI / 2, width: 3, height: 0.6 },
  ],
  // The gate controls, on the booths along the lanes. Once the last is thrown the exit is only open a while:
  // a convoy is leaving, and the gate shuts again behind it.
  exitTimer: 45,
  cues: [
    { on: 'start', at: 1.5, speaker: CREW, text: 'The screening point. Whoever was checked in here never got out.' },
    { on: 'done', at: 0.6, speaker: CREW, text: 'The gate is moving. Go, before it shuts again.', seconds: 4 },
  ],
  // A walk down the road: the dead already about it walk where they please until they see or hear the
  // crew, every gunshot brings more out of the doorways, and once the job is done they come after the crew.
  flow: { kind: 'sweep', loud: 3, first: 5, then: { every: 3, max: 12 } },
  objective: {
    kind: 'breakers',
    label: 'Gate controls',
    part: 'Exit gate open',
    panels: [
      { position: { x: -10, y: 1.45, z: -9.95 }, normal: { x: 0, z: 1 } },
      { position: { x: 4, y: 1.45, z: 9.95 }, normal: { x: 0, z: -1 } },
      { position: { x: 14, y: 1.45, z: -9.95 }, normal: { x: 0, z: 1 } },
    ],
  },
  navBounds: { minX: -35, maxX: 35, minZ: -15, maxZ: 15 },
  ramp: null,
  // Out in the open there is nothing to board up: the crew walks the street and deals with what is on it.
  barricadeBars: [],
  streetSpawns: [],
  playerSpawns: [{ x: -26, y: 0, z: 0 }],
  spawnYaw: -Math.PI / 2,
  streetLamps: [],
  checkpoint: { x: -26, y: 0, z: 0 },
};
