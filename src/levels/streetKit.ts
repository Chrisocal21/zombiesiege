import { alcoveBoxes, gapsOn, wallLine } from './build';
import type { Door, Elevator, LevelBox, Surface } from './types';

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
export function frontage(axis: 'x' | 'z', fixed: number, from: number, to: number, openings: Door[], height: number, color: string, surface: Surface = 'building', bare: Door[] = []): LevelBox[] {
  const here = openings.filter((door) => (axis === 'x' ? door.position.z === fixed : door.position.x === fixed));
  return [
    ...wallLine(axis, fixed, from, to, gapsOn(axis, fixed, here), height, 0.5, color, surface),
    ...here.filter((door) => !bare.includes(door)).flatMap((door) => [
      ...alcoveBoxes(door, { ceiling: KIOSK_HEIGHT, depth: 3, width: 3, thickness: 0.5, wallColor: color, floorColor: '#5a5d60', wallSurface: 'wall', floorSurface: 'floor' }),
      alcoveRoof(door, KIOSK_HEIGHT, color),
    ]),
  ];
}

// The cars and vans that line the streets. Each one parked takes the next from these, so the same
// car does not stand twice in a row as you walk down a street: the paint changes every time, and the
// body goes saloon, estate, compact in turn. An ambulance is never one of them.
const CAR_PAINT = ['#6b2a2a', '#2f4a5c', '#4a4f55', '#344e41', '#a8782f', '#8d8f8a', '#7a5a3a', '#d8d4c4', '#5d3b55', '#2a2c30', '#b5b09c', '#3f6a63', '#8c3b2b', '#354e67'];
const CAR_BODY = [{ x: 4.55, y: 1.48, z: 1.86 }, { x: 4.8, y: 1.7, z: 1.9 }, { x: 4.15, y: 1.4, z: 1.76 }];
const VAN_PAINT = ['#c5c8c5', '#3a4a5c', '#344e41', '#a8782f', '#6b2a2a', '#d8d4c4'];
const VAN_BODY = [{ x: 5.45, y: 2.4, z: 2.04 }, { x: 4.9, y: 2.2, z: 1.95 }];
// Stepping by 5 through the list, so neighbours are never alike; now and then (every seventh) one repeats
// a car from a few back, so a street is not a catalogue.
function paintIndex(n: number): number {
  return n % 7 === 6 ? paintIndex(n - 3) : n * 5;
}
let carsParked = 0;
let vansParked = 0;

// A parked car, long side along x, or a van. The colour given is ignored for the fleet's own; see above.
export function parkedCar(x: number, z: number, _first: string, van = false): LevelBox {
  const n = van ? vansParked++ : carsParked++;
  const paint = van ? VAN_PAINT : CAR_PAINT;
  const size = van ? VAN_BODY[n % VAN_BODY.length] : CAR_BODY[n % CAR_BODY.length];
  return {
    position: { x, y: size.y / 2, z },
    size: { ...size },
    color: paint[paintIndex(n) % paint.length],
    surface: van ? 'van' : 'car',
  };
}

// A low solid block: a concrete barrier, a stall, a planter.
export function block(x: number, z: number, sx: number, sy: number, sz: number, color: string, surface: LevelBox['surface'] = 'plain'): LevelBox {
  return { position: { x, y: sy / 2, z }, size: { x: sx, y: sy, z: sz }, color, surface };
}

// A road checkpoint where a block's road meets the next: the road runs on through a walled lane
// beyond the gate, with a guard post and concrete barriers on the near side. The gate itself is the
// elevator's opening, drawn as a pair of swing gates (see render/lift.ts). `color` is the wall's.
const LANE = 10;
export function checkpointBoxes(lift: Elevator, color: string): LevelBox[] {
  const out = { x: -lift.normal.x, z: -lift.normal.z };
  const across = { x: lift.normal.z, z: -lift.normal.x };
  const alongX = out.x !== 0;
  const half = lift.width / 2;
  // A box centred `o` metres out through the gate and `a` metres across the road, lengths along each.
  const part = (o: number, a: number, lenOut: number, lenAcross: number, y: number, h: number, c: string, surface: Surface): LevelBox => ({
    position: { x: lift.position.x + out.x * o + across.x * a, y, z: lift.position.z + out.z * o + across.z * a },
    size: { x: alongX ? lenOut : lenAcross, y: h, z: alongX ? lenAcross : lenOut },
    color: c,
    surface,
  });
  const boxes: LevelBox[] = [
    // The lane beyond: asphalt underfoot and a wall each side and across the end.
    part(0.25 + LANE / 2, 0, LANE, lift.width + 1, -0.25, 0.5, '#2a2d32', 'slab'),
    part(0.25 + LANE / 2, half + 0.25, LANE, 0.5, 2.5, 5, color, 'wall'),
    part(0.25 + LANE / 2, -half - 0.25, LANE, 0.5, 2.5, 5, color, 'wall'),
    part(0.25 + LANE + 0.25, 0, 0.5, lift.width + 1, 2.5, 5, color, 'wall'),
  ];
  // On this side: concrete barriers narrowing the road to the gate, and the guard post.
  for (const side of [-1, 1]) boxes.push(part(-1.4, side * (half + 0.55), 2.6, 0.6, 0.45, 0.9, '#8a8d90', 'plain'));
  boxes.push(part(-1.8, -(half + 2.1), 2.2, 2.0, 1.3, 2.6, '#4b5a46', 'plain'));
  return boxes;
}
