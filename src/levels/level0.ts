import type { Level } from './types';

const FLOOR = '#3a3e46';
const WALL = '#596070';
const CRATE = '#8a6a44';

// One small 20 by 20 room with two crates for cover.
export const level0: Level = {
  name: 'Level 0',
  boxes: [
    { position: { x: 0, y: -0.25, z: 0 }, size: { x: 21, y: 0.5, z: 21 }, color: FLOOR },

    { position: { x: 0, y: 2, z: -10.25 }, size: { x: 21, y: 4, z: 0.5 }, color: WALL },
    { position: { x: 0, y: 2, z: 10.25 }, size: { x: 21, y: 4, z: 0.5 }, color: WALL },
    { position: { x: -10.25, y: 2, z: 0 }, size: { x: 0.5, y: 4, z: 20 }, color: WALL },
    { position: { x: 10.25, y: 2, z: 0 }, size: { x: 0.5, y: 4, z: 20 }, color: WALL },

    { position: { x: -4, y: 1, z: -4 }, size: { x: 2, y: 2, z: 2 }, color: CRATE },
    { position: { x: 5, y: 0.75, z: 3 }, size: { x: 3, y: 1.5, z: 1.5 }, color: CRATE },
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
  checkpoint: { x: 0, y: 0, z: -8 },
};
