import type { Door, Level, LevelBox } from './types';

const FLOOR = '#6b6e72';
const WALL = '#8a8d90';
const CRATE = '#a07a4c';
const CONTAINER = '#3f5a6e';
const BARRIER = '#9a9a96';
const BARREL = '#7a2f26';

const WALL_HEIGHT = 4;
const WALL_THICKNESS = 0.5;
const DOOR_WIDTH = 2.4;
const DOOR_HEIGHT = 2.5;
// How deep and how wide the dark space behind each door is, where the zombies wait.
const ALCOVE_DEPTH = 3;
const ALCOVE_WIDTH = 3;

// One door in each of the four walls.
const doors: Door[] = [
  { position: { x: 6.5, y: 0, z: -10.25 }, normal: { x: 0, z: 1 }, width: DOOR_WIDTH, height: DOOR_HEIGHT },
  { position: { x: -5, y: 0, z: 10.25 }, normal: { x: 0, z: -1 }, width: DOOR_WIDTH, height: DOOR_HEIGHT },
  { position: { x: -10.25, y: 0, z: -5.5 }, normal: { x: 1, z: 0 }, width: DOOR_WIDTH, height: DOOR_HEIGHT },
  { position: { x: 10.25, y: 0, z: 5.5 }, normal: { x: -1, z: 0 }, width: DOOR_WIDTH, height: DOOR_HEIGHT },
];

// A wall along one axis, from `from` to `to`, with a gap cut for each door and a beam over it.
function wall(axis: 'x' | 'z', fixed: number, from: number, to: number): LevelBox[] {
  const boxes: LevelBox[] = [];
  const along = (start: number, end: number, y: number, height: number): LevelBox => {
    const middle = (start + end) / 2;
    const length = end - start;
    return axis === 'x'
      ? { position: { x: middle, y, z: fixed }, size: { x: length, y: height, z: WALL_THICKNESS }, color: WALL, surface: 'wall' }
      : { position: { x: fixed, y, z: middle }, size: { x: WALL_THICKNESS, y: height, z: length }, color: WALL, surface: 'wall' };
  };

  const gaps = doors
    .filter((door) => (axis === 'x' ? door.position.z === fixed : door.position.x === fixed))
    .map((door) => (axis === 'x' ? door.position.x : door.position.z))
    .sort((a, b) => a - b);

  let cursor = from;
  for (const centre of gaps) {
    boxes.push(along(cursor, centre - DOOR_WIDTH / 2, WALL_HEIGHT / 2, WALL_HEIGHT));
    // The beam over the doorway.
    boxes.push(along(centre - DOOR_WIDTH / 2, centre + DOOR_WIDTH / 2, (DOOR_HEIGHT + WALL_HEIGHT) / 2, WALL_HEIGHT - DOOR_HEIGHT));
    cursor = centre + DOOR_WIDTH / 2;
  }
  boxes.push(along(cursor, to, WALL_HEIGHT / 2, WALL_HEIGHT));
  return boxes;
}

// A closed, roofed space behind a door, with a floor so a player can step into it.
function alcove(door: Door): LevelBox[] {
  const out = { x: -door.normal.x, z: -door.normal.z };
  const outerFace = WALL_THICKNESS / 2;
  const sideOffset = ALCOVE_WIDTH / 2 + WALL_THICKNESS / 2;
  const boxes: LevelBox[] = [];
  // Positions are worked out as (distance out from the wall's center line, distance sideways).
  const place = (outward: number, sideways: number, y: number, depth: number, width: number, height: number, color: string, surface: LevelBox['surface']): void => {
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
    place(middle, side * sideOffset, WALL_HEIGHT / 2, ALCOVE_DEPTH, WALL_THICKNESS, WALL_HEIGHT, WALL, 'wall');
  }
  const capOffset = outerFace + ALCOVE_DEPTH + WALL_THICKNESS / 2;
  place(capOffset, 0, WALL_HEIGHT / 2, WALL_THICKNESS, ALCOVE_WIDTH + WALL_THICKNESS * 2, WALL_HEIGHT, WALL, 'wall');
  place(middle + WALL_THICKNESS / 2, 0, WALL_HEIGHT + 0.15, ALCOVE_DEPTH + WALL_THICKNESS, ALCOVE_WIDTH + WALL_THICKNESS * 2, 0.3, WALL, 'wall');
  place(middle, 0, -0.25, ALCOVE_DEPTH, ALCOVE_WIDTH, 0.5, FLOOR, 'floor');
  return boxes;
}

// A walled night yard, 20 by 20 meters, with a doorway in each wall. A shipping container along
// the north wall has a ladder up to its roof, a crate beside it to climb, and a few barriers and
// barrels for cover.
export const level0: Level = {
  name: 'Level 0',
  boxes: [
    { position: { x: 0, y: -0.25, z: 0 }, size: { x: 21, y: 0.5, z: 21 }, color: FLOOR, surface: 'floor' },

    ...wall('x', -10.25, -10.5, 10.5),
    ...wall('x', 10.25, -10.5, 10.5),
    ...wall('z', -10.25, -10, 10),
    ...wall('z', 10.25, -10, 10),
    ...doors.flatMap(alcove),

    // Shipping container against the north wall. The roof is at 2.6 m.
    { position: { x: 0, y: 1.3, z: -8.78 }, size: { x: 6.1, y: 2.6, z: 2.44 }, color: CONTAINER, surface: 'container' },
    // A tall crate beside it, close enough to climb from the crate onto the container.
    { position: { x: -3.5, y: 1, z: -6.4 }, size: { x: 2, y: 2, z: 2 }, color: CRATE, surface: 'crate' },
    // Two small crates stacked into steps.
    { position: { x: -7.5, y: 0.5, z: 3 }, size: { x: 1, y: 1, z: 1 }, color: CRATE, surface: 'crate' },
    { position: { x: -7.5, y: 1.5, z: 3 }, size: { x: 1, y: 1, z: 1 }, color: CRATE, surface: 'crate' },
    { position: { x: -7.5, y: 0.5, z: 4.1 }, size: { x: 1, y: 1, z: 1 }, color: CRATE, surface: 'crate' },
    // A long low crate in the east.
    { position: { x: 5, y: 0.75, z: 3 }, size: { x: 3, y: 1.5, z: 1.5 }, color: CRATE, surface: 'crate' },

    // Concrete barriers, low enough to duck behind.
    { position: { x: 3, y: 0.6, z: -1 }, size: { x: 3.2, y: 1.2, z: 0.6 }, color: BARRIER, surface: 'plain' },
    { position: { x: -2.5, y: 0.6, z: 1.5 }, size: { x: 0.6, y: 1.2, z: 3.2 }, color: BARRIER, surface: 'plain' },

    { position: { x: 7.2, y: 0.55, z: -3.2 }, size: { x: 0.9, y: 1.1, z: 0.9 }, color: BARREL, surface: 'barrel' },
    { position: { x: 8.2, y: 0.55, z: -2.5 }, size: { x: 0.9, y: 1.1, z: 0.9 }, color: BARREL, surface: 'barrel' },
    { position: { x: -8.6, y: 0.55, z: -2.2 }, size: { x: 0.9, y: 1.1, z: 0.9 }, color: BARREL, surface: 'barrel' },
  ],
  ladders: [
    // Up the front of the container, to its roof.
    { x: 2, z: -7.56, normal: { x: 0, z: 1 }, bottom: 0, top: 2.6, width: 0.8 },
  ],
  lights: [
    { position: { x: -9.7, y: 3.3, z: -2 }, color: '#ffb066', intensity: 70 },
    { position: { x: 9.7, y: 3.3, z: -4.5 }, color: '#ffb066', intensity: 70, flicker: true },
    { position: { x: 0, y: 3.3, z: 9.7 }, color: '#a9c8ff', intensity: 55 },
    { position: { x: 3.4, y: 3.7, z: -7.2 }, color: '#ffe2b0', intensity: 60 },
  ],
  doors,
  // Two bundles of boards, far apart, so finding them takes some of the opening time.
  barricadeBars: [
    { x: -7, y: 0, z: 7.5 },
    { x: 8, y: 0, z: -6.5 },
  ],
  playerSpawns: [
    { x: -1, y: 0, z: 6 },
    { x: 1, y: 0, z: 6 },
  ],
  // Placeholder: the real spot is an open question, and nothing uses it until Phase 2.
  checkpoint: { x: 0, y: 0, z: -6 },
};
