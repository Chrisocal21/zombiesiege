import type { Door, Elevator, Gate, Level, LevelBox, Ramp, Surface } from './types';

const FLOOR = '#6b6e72';
const WALL = '#8a8d90';
const CRATE = '#a07a4c';
const CONTAINER = '#3f5a6e';
const BARRIER = '#9a9a96';
const BARREL = '#7a2f26';
const SLAB = '#7d8085';
const BUILDING = '#4a505a';

// The garage ceiling is the underside of the street. The street is a slab on top of it.
const CEILING = 4.5;
const STREET = 4.9;
const WALL_THICKNESS = 0.5;
const DOOR_WIDTH = 2.4;
const DOOR_HEIGHT = 2.5;
// How deep and how wide the dark space behind each door is, where the zombies wait.
const ALCOVE_DEPTH = 3;
const ALCOVE_WIDTH = 3;

// One door in each of the four walls.
const doors: Door[] = [
  { position: { x: 6.5, y: 0, z: -10.25 }, normal: { x: 0, z: 1 }, width: DOOR_WIDTH, height: DOOR_HEIGHT },
  { position: { x: -7, y: 0, z: 10.25 }, normal: { x: 0, z: -1 }, width: DOOR_WIDTH, height: DOOR_HEIGHT },
  { position: { x: -10.25, y: 0, z: -5.5 }, normal: { x: 1, z: 0 }, width: DOOR_WIDTH, height: DOOR_HEIGHT },
  { position: { x: 10.25, y: 0, z: 5.5 }, normal: { x: -1, z: 0 }, width: DOOR_WIDTH, height: DOOR_HEIGHT },
];

// The gate is in the south wall, at the foot of the ramp.
const gate: Gate = {
  position: { x: 3, y: 0, z: 10.25 },
  normal: { x: 0, z: -1 },
  width: 4.2,
  height: 3.2,
  panel: { x: 6.1, y: 1.2, z: 9.6 },
};

// The elevator is in the north wall, west of the container. Its cab sits behind the wall like the
// space behind each doorway.
const elevator: Elevator = {
  position: { x: -6, y: 0, z: -10.25 },
  normal: { x: 0, z: 1 },
  width: 2.2,
  height: 2.5,
  cabDepth: ALCOVE_DEPTH,
  cabWidth: ALCOVE_WIDTH,
};

const ramp: Ramp = { x: 3, width: 4.2, zBottom: 10.5, zTop: 34.5, rise: STREET };

interface Opening {
  centre: number;
  width: number;
  height: number;
}

// A wall along one axis, from `from` to `to`, with a gap cut for each opening and a beam over it.
function wall(axis: 'x' | 'z', fixed: number, from: number, to: number): LevelBox[] {
  const boxes: LevelBox[] = [];
  const along = (start: number, end: number, bottom: number, top: number): LevelBox => {
    const middle = (start + end) / 2;
    const length = end - start;
    const y = (bottom + top) / 2;
    const height = top - bottom;
    return axis === 'x'
      ? { position: { x: middle, y, z: fixed }, size: { x: length, y: height, z: WALL_THICKNESS }, color: WALL, surface: 'wall' }
      : { position: { x: fixed, y, z: middle }, size: { x: WALL_THICKNESS, y: height, z: length }, color: WALL, surface: 'wall' };
  };

  const onThisWall = (position: { x: number; z: number }) => (axis === 'x' ? position.z === fixed : position.x === fixed);
  const centreOf = (position: { x: number; z: number }) => (axis === 'x' ? position.x : position.z);
  const openings: Opening[] = [...doors, gate, elevator]
    .filter((opening) => onThisWall(opening.position))
    .map((opening) => ({ centre: centreOf(opening.position), width: opening.width, height: opening.height }))
    .sort((a, b) => a.centre - b.centre);

  let cursor = from;
  for (const opening of openings) {
    boxes.push(along(cursor, opening.centre - opening.width / 2, 0, CEILING));
    // The beam over the opening.
    boxes.push(along(opening.centre - opening.width / 2, opening.centre + opening.width / 2, opening.height, CEILING));
    cursor = opening.centre + opening.width / 2;
  }
  boxes.push(along(cursor, to, 0, CEILING));
  return boxes;
}

// A closed space behind a door, with a floor so a player can step into it. The street slab is
// its roof.
function alcove(door: Door): LevelBox[] {
  const out = { x: -door.normal.x, z: -door.normal.z };
  const outerFace = WALL_THICKNESS / 2;
  const sideOffset = ALCOVE_WIDTH / 2 + WALL_THICKNESS / 2;
  const boxes: LevelBox[] = [];
  // Positions are worked out as (distance out from the wall's center line, distance sideways).
  const place = (outward: number, sideways: number, y: number, depth: number, width: number, height: number, color: string, surface: Surface): void => {
    const x = door.position.x + out.x * outward + (out.z !== 0 ? sideways : 0);
    const z = door.position.z + out.z * outward + (out.x !== 0 ? sideways : 0);
    const alongX = out.x !== 0;
    boxes.push({
      position: { x, y, z },
      size: { x: alongX ? depth : width, y: height, z: alongX ? width : depth },
      color,
      surface,
    });
  };

  const middle = outerFace + ALCOVE_DEPTH / 2;
  for (const side of [-1, 1]) {
    place(middle, side * sideOffset, CEILING / 2, ALCOVE_DEPTH, WALL_THICKNESS, CEILING, WALL, 'wall');
  }
  const capOffset = outerFace + ALCOVE_DEPTH + WALL_THICKNESS / 2;
  place(capOffset, 0, CEILING / 2, WALL_THICKNESS, ALCOVE_WIDTH + WALL_THICKNESS * 2, CEILING, WALL, 'wall');
  place(middle, 0, -0.25, ALCOVE_DEPTH, ALCOVE_WIDTH, 0.5, FLOOR, 'floor');
  return boxes;
}

// The ramp as many small steps, each lower than a step height, so it walks like a slope.
function rampSteps(): LevelBox[] {
  const boxes: LevelBox[] = [];
  const run = ramp.zTop - ramp.zBottom;
  const count = Math.round(run / 0.5);
  const length = run / count;
  for (let i = 0; i < count; i++) {
    const z = ramp.zBottom + length * (i + 0.5);
    // The slope's height at the middle of this step.
    const top = (ramp.rise * (i + 0.5)) / count;
    boxes.push({
      position: { x: ramp.x, y: (top - 0.5) / 2, z },
      size: { x: ramp.width, y: top + 0.5, z: length },
      color: FLOOR,
      surface: 'step',
    });
  }
  return boxes;
}

// A box standing on the street.
function onStreet(x: number, z: number, sx: number, sy: number, sz: number, color: string, surface: Surface): LevelBox {
  return { position: { x, y: STREET + sy / 2, z }, size: { x: sx, y: sy, z: sz }, color, surface };
}

// A box standing on the garage floor.
function inGarage(x: number, z: number, sx: number, sy: number, sz: number, color: string, surface: Surface, base = 0): LevelBox {
  return { position: { x, y: base + sy / 2, z }, size: { x: sx, y: sy, z: sz }, color, surface };
}

const half = ramp.width / 2;
const trenchLeft = ramp.x - half;
const trenchRight = ramp.x + half;

// A parking garage under a tower, with a loading dock at the north end. The players start out
// in the street, run across it and down a ramp, and close the metal gate behind them. A doorway
// in each wall is where the zombies come from. The tower above is the way up, in later levels,
// to the roof and the helicopter.
export const level0: Level = {
  name: 'Level 0',
  boxes: [
    { position: { x: 0, y: -0.25, z: 0 }, size: { x: 21, y: 0.5, z: 21 }, color: FLOOR, surface: 'floor' },

    ...wall('x', -10.25, -10.5, 10.5),
    ...wall('x', 10.25, -10.5, 10.5),
    ...wall('z', -10.25, -10, 10),
    ...wall('z', 10.25, -10, 10),
    ...doors.flatMap(alcove),
    ...alcove(elevator),

    // The ramp down from the street, between two retaining walls.
    ...rampSteps(),
    { position: { x: trenchLeft - 0.25, y: (STREET - 0.5) / 2, z: (ramp.zBottom + ramp.zTop) / 2 }, size: { x: 0.5, y: STREET + 0.5, z: ramp.zTop - ramp.zBottom }, color: WALL, surface: 'wall' },
    { position: { x: trenchRight + 0.25, y: (STREET - 0.5) / 2, z: (ramp.zBottom + ramp.zTop) / 2 }, size: { x: 0.5, y: STREET + 0.5, z: ramp.zTop - ramp.zBottom }, color: WALL, surface: 'wall' },

    // The street: a slab over the whole garage and the plaza and road in front of it, with a gap
    // for the ramp. The garage ceiling is its underside.
    { position: { x: (-34 + trenchLeft - 0.5) / 2, y: STREET - 0.2, z: 16 }, size: { x: trenchLeft - 0.5 + 34, y: 0.4, z: 64 }, color: SLAB, surface: 'slab' },
    { position: { x: (trenchRight + 0.5 + 34) / 2, y: STREET - 0.2, z: 16 }, size: { x: 34 - trenchRight - 0.5, y: 0.4, z: 64 }, color: SLAB, surface: 'slab' },
    { position: { x: ramp.x, y: STREET - 0.2, z: (-16 + 10.5) / 2 }, size: { x: ramp.width + 1, y: 0.4, z: 26.5 }, color: SLAB, surface: 'slab' },
    { position: { x: ramp.x, y: STREET - 0.2, z: (ramp.zTop + 48) / 2 }, size: { x: ramp.width + 1, y: 0.4, z: 48 - ramp.zTop }, color: SLAB, surface: 'slab' },

    // The tower over the garage, and the buildings that close in the street.
    { position: { x: 0, y: STREET + 32, z: -3 }, size: { x: 80, y: 64, z: 27 }, color: BUILDING, surface: 'building' },
    ...[-33, 33].flatMap((x): LevelBox[] => [
      onStreet(x, 22.75, 14, 40, 25.5, BUILDING, 'building'),
      { position: { x, y: STREET + 24, z: 41.75 }, size: { x: 14, y: 32, z: 12.5 }, color: BUILDING, surface: 'building' },
      onStreet(x, 47.25, 14, 8, 1.5, BUILDING, 'wall'),
      onStreet(x < 0 ? -33.5 : 33.5, 41, 0.5, 2.2, 10, BARRIER, 'plain'),
    ]),

    { position: { x: 0, y: STREET + 20, z: 54 }, size: { x: 80, y: 40, z: 12 }, color: BUILDING, surface: 'building' },

    // Both road lanes follow x. Keep the marked crossing and the ramp approach clear.
    onStreet(-16, 38.2, 4.55, 1.48, 1.86, '#7a3030', 'car'),
    onStreet(-8.5, 44.0, 4.55, 1.48, 1.86, '#344e41', 'car'),
    onStreet(14, 43.7, 5.45, 2.45, 2.04, '#c5c8c5', 'van'),
    onStreet(20.5, 38.2, 4.55, 1.48, 1.86, '#b68c39', 'car'),
    onStreet(-3, 40, 3.2, 1.2, 0.6, BARRIER, 'plain'),
    // Surface-lot vehicles sit fully within the painted 5 m bays, noses toward the aisle.
    onStreet(-20.5, 27.35, 4.55, 1.48, 1.86, '#354e67', 'car'),
    onStreet(19.5, 21.35, 4.9, 2.35, 1.98, '#873d3b', 'van'),

    // Shipping container against the north wall. The roof is at 2.6 m.
    inGarage(0, -8.78, 6.1, 2.6, 2.44, CONTAINER, 'container'),
    // A tall crate beside it, close enough to climb from the crate onto the container.
    inGarage(-3.5, -6.4, 2, 2, 2, CRATE, 'crate'),
    // Two small crates stacked into steps, in the north-west corner.
    inGarage(-8.5, -8.6, 1, 1, 1, CRATE, 'crate'),
    inGarage(-8.5, -8.6, 1, 1, 1, CRATE, 'crate', 1),
    inGarage(-8.5, -7.5, 1, 1, 1, CRATE, 'crate'),
    // A long low crate in the east, and cartons on pallets by the loading dock.
    inGarage(5, 3, 3, 1.5, 1.5, CRATE, 'crate'),
    inGarage(8.9, -8.6, 1.2, 1.5, 1.2, '#b89a6a', 'cartons'),
    inGarage(8.9, -7.1, 1.2, 1.1, 1.2, '#b89a6a', 'cartons'),

    // Concrete columns holding up the street.
    inGarage(-5, -1.5, 0.7, CEILING, 0.7, '#8f9296', 'pillar'),
    inGarage(5, -1.5, 0.7, CEILING, 0.7, '#8f9296', 'pillar'),
    inGarage(-5, 6.5, 0.7, CEILING, 0.7, '#8f9296', 'pillar'),
    inGarage(5, 6.5, 0.7, CEILING, 0.7, '#8f9296', 'pillar'),

    // Concrete barriers, low enough to duck behind.
    inGarage(0.5, 1.8, 3.2, 1.2, 0.6, BARRIER, 'plain'),
    inGarage(-2.5, -3.5, 0.6, 1.2, 3.2, BARRIER, 'plain'),

    // Cars in the bays.
    inGarage(-8.7, 0.5, 1.9, 1.45, 4.4, '#7a1f1f', 'car'),
    inGarage(-8.7, 5.6, 1.9, 1.45, 4.4, '#d6d6d2', 'car'),
    inGarage(8.7, -1, 2, 2.35, 5, '#cbd0cc', 'van'),
    inGarage(-3.2, 8.4, 4.4, 1.45, 1.9, '#27415e', 'car'),

    inGarage(7.2, -5.6, 0.9, 1.1, 0.9, BARREL, 'barrel'),
    inGarage(8.2, -4.9, 0.9, 1.1, 0.9, BARREL, 'barrel'),
    inGarage(-8.8, -3.6, 0.9, 1.1, 0.9, BARREL, 'barrel'),
  ],
  ladders: [
    // Up the front of the container, to its roof.
    { x: 2, z: -7.56, normal: { x: 0, z: 1 }, bottom: 0, top: 2.6, width: 0.8 },
  ],
  // Fluorescent fixtures hanging from the ceiling. One of them is on a bad wire.
  lights: [
    { position: { x: -5, y: 4.3, z: -5 }, color: '#d8e6ff', intensity: 52 },
    { position: { x: 5, y: 4.3, z: -5 }, color: '#d8e6ff', intensity: 52 },
    { position: { x: 0, y: 4.3, z: 0.5 }, color: '#e8f0ff', intensity: 58 },
    { position: { x: -5, y: 4.3, z: 5 }, color: '#d8e6ff', intensity: 52 },
    { position: { x: 5, y: 4.3, z: 5 }, color: '#d8e6ff', intensity: 52, flicker: true },
    { position: { x: 1, y: 4.3, z: 8.2 }, color: '#ffd9a0', intensity: 48 },
  ],
  doors,
  gate,
  elevator,
  // Resupply on the west wall, near the south-west corner and out of the way of the doors.
  stations: [
    { kind: 'ammo', position: { x: -9.95, y: 1.25, z: 8.8 }, normal: { x: 1, z: 0 } },
    // The weapon wall, on the east side between the two doors.
    { kind: 'shotgun', position: { x: 9.95, y: 1.25, z: -1 }, normal: { x: -1, z: 0 } },
  ],
  ramp,
  // Two bundles of boards, far apart, so finding them takes some of the opening time.
  barricadeBars: [
    { x: -6.2, y: 0, z: 3 },
    { x: 6.5, y: 0, z: -4.5 },
  ],
  streetSpawns: [
    { x: -2, y: STREET, z: 46.5 },
    { x: 0, y: STREET, z: 46.5 },
  ],
  playerSpawns: [
    { x: -1, y: 0, z: 4 },
    { x: 1, y: 0, z: 4 },
  ],
  streetLamps: [
    { x: -9, y: STREET, z: 35 },
    { x: 14, y: STREET, z: 35 },
    { x: -20, y: STREET, z: 47 },
    { x: 9, y: STREET, z: 47 },
    { x: 20, y: STREET, z: 20 },
    { x: -20, y: STREET, z: 18 },
  ],
  // Placeholder: the real spot is an open question, and nothing uses it until Phase 2.
  checkpoint: { x: 0, y: 0, z: -6 },
};
