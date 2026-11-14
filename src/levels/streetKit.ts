import { alcoveBoxes, gapsOn, wallLine } from './build';
import type { Door, LevelBox, Surface } from './types';

// Shared parts for the outdoor levels of Act 4: ground slabs, building frontages with doorways the
// dead come out of, and the kiosk the transit lift is in. The frontages close each block in, so it needs no other walls:
// an invisible wall across a doorway would shut the dead in their alcoves. Units are metres, y up, and the ground surface sits at y = 0.
export const FRONT_HEIGHT = 11;
export const KIOSK_HEIGHT = 4.2;
export const STREET_DOOR_HEIGHT = 2.5;

// A flat slab of ground whose top is at y = 0. `slab` is paved with road asphalt; `floor` is pavement.
export function ground(minX: number, maxX: number, minZ: number, maxZ: number, color: string, surface: 'slab' | 'floor' | 'plain' = 'floor'): LevelBox {
  return {
    position: { x: (minX + maxX) / 2, y: -0.25, z: (minZ + maxZ) / 2 },
    size: { x: maxX - minX, y: 0.5, z: maxZ - minZ },
    color,
    surface,
  };
}

// A doorway in a frontage, which the dead come out of: the centre of the opening on the wall's
// centre line, and which way it faces.
export function streetDoor(x: number, z: number, nx: number, nz: number): Door {
  return { position: { x, y: 0, z }, normal: { x: nx, z: nz }, width: 2.4, height: STREET_DOOR_HEIGHT };
}

// A roof over the closed space behind an opening, so nobody sees a gap in the sky from the street.
function alcoveRoof(door: Door, height: number, color: string): LevelBox {
  const out = { x: -door.normal.x, z: -door.normal.z };
  const reach = 0.25 + 1.5;
  const alongX = out.x !== 0;
  return {
    position: { x: door.position.x + out.x * reach, y: height + 0.15, z: door.position.z + out.z * reach },
    size: { x: alongX ? 3.6 : 4, y: 0.3, z: alongX ? 4 : 3.6 },
    color,
    surface: 'wall',
  };
}

// A frontage: the face of a block of buildings along one line, with a gap and a closed space behind
// each of the openings (zombie doorways and the lift). Running along x at a fixed z, or along z at a fixed x.
export function frontage(axis: 'x' | 'z', fixed: number, from: number, to: number, openings: Door[], height: number, color: string, surface: Surface = 'building'): LevelBox[] {
  const here = openings.filter((door) => (axis === 'x' ? door.position.z === fixed : door.position.x === fixed));
  return [
    ...wallLine(axis, fixed, from, to, gapsOn(axis, fixed, here), height, 0.5, color, surface),
    ...here.flatMap((door) => [
      ...alcoveBoxes(door, { ceiling: KIOSK_HEIGHT, depth: 3, width: 3, thickness: 0.5, wallColor: color, floorColor: '#5a5d60', wallSurface: 'wall', floorSurface: 'floor' }),
      alcoveRoof(door, KIOSK_HEIGHT, color),
    ]),
  ];
}

// A parked car, long side along x, or a van.
export function parkedCar(x: number, z: number, color: string, van = false): LevelBox {
  return {
    position: { x, y: van ? 1.2 : 0.74, z },
    size: van ? { x: 5.45, y: 2.4, z: 2.04 } : { x: 4.55, y: 1.48, z: 1.86 },
    color,
    surface: van ? 'van' : 'car',
  };
}

// A low solid block: a concrete barrier, a stall, a planter.
export function block(x: number, z: number, sx: number, sy: number, sz: number, color: string, surface: LevelBox['surface'] = 'plain'): LevelBox {
  return { position: { x, y: sy / 2, z }, size: { x: sx, y: sy, z: sz }, color, surface };
}
