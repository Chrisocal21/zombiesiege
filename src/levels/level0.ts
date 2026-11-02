import type { Level } from './types';

const FLOOR = '#6b6e72';
const WALL = '#8a8d90';
const CRATE = '#a07a4c';
const CONTAINER = '#3f5a6e';
const BARRIER = '#9a9a96';
const BARREL = '#7a2f26';

// A walled night yard, 20 by 20 meters. A shipping container along the north wall has a ladder
// up to its roof, a crate beside it to climb, and a few barriers and barrels for cover.
export const level0: Level = {
  name: 'Level 0',
  boxes: [
    { position: { x: 0, y: -0.25, z: 0 }, size: { x: 21, y: 0.5, z: 21 }, color: FLOOR, surface: 'floor' },

    { position: { x: 0, y: 2, z: -10.25 }, size: { x: 21, y: 4, z: 0.5 }, color: WALL, surface: 'wall' },
    { position: { x: 0, y: 2, z: 10.25 }, size: { x: 21, y: 4, z: 0.5 }, color: WALL, surface: 'wall' },
    { position: { x: -10.25, y: 2, z: 0 }, size: { x: 0.5, y: 4, z: 20 }, color: WALL, surface: 'wall' },
    { position: { x: 10.25, y: 2, z: 0 }, size: { x: 0.5, y: 4, z: 20 }, color: WALL, surface: 'wall' },

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
    { position: { x: 9.7, y: 3.3, z: 5 }, color: '#ffb066', intensity: 70, flicker: true },
    { position: { x: 0, y: 3.3, z: 9.7 }, color: '#a9c8ff', intensity: 55 },
    { position: { x: 3.4, y: 3.7, z: -7.2 }, color: '#ffe2b0', intensity: 60 },
  ],
  playerSpawns: [
    { x: -1, y: 0, z: 6 },
    { x: 1, y: 0, z: 6 },
  ],
  zombieSpawns: [
    { x: -9, y: 0, z: -9 },
    { x: 9, y: 0, z: -9 },
    { x: -9, y: 0, z: 9 },
    { x: 9, y: 0, z: 9 },
  ],
  // Placeholder: the real spot is an open question, and nothing uses it until Phase 2.
  checkpoint: { x: 0, y: 0, z: -6 },
};
