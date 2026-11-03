import { alcoveBoxes, gapsOn, wallLine, type Gap } from './build';
import type { Door, Elevator, LevelBox, Station, Surface } from './types';

// Shared parts for the hospital floors: the shell of a floor, partitions, furniture, and the
// steps that stop a player walking into a wall station.
export const CEILING = 3.4;
export const OUTER = 0.5;
export const INNER = 0.3;
export const DOOR_HEIGHT = 2.5;

export interface WardStyle {
  wall: string;
  floor: string;
  ceiling: string;
}

// The floor, ceiling and outer walls of a rectangular floor from -halfX..halfX and -halfZ..halfZ,
// with a gap and a closed space behind each of the openings (zombie doors and the elevator).
export function shell(style: WardStyle, halfX: number, halfZ: number, openings: Door[]): LevelBox[] {
  const wallX = halfX + OUTER / 2;
  const wallZ = halfZ + OUTER / 2;
  const outer = (axis: 'x' | 'z', fixed: number, from: number, to: number): LevelBox[] =>
    wallLine(axis, fixed, from, to, gapsOn(axis, fixed, openings), CEILING, OUTER, style.wall, 'plaster');
  return [
    { position: { x: 0, y: -0.25, z: 0 }, size: { x: halfX * 2 + 1, y: 0.5, z: halfZ * 2 + 1 }, color: style.floor, surface: 'tile' },
    { position: { x: 0, y: CEILING + 0.2, z: 0 }, size: { x: halfX * 2 + 14, y: 0.4, z: halfZ * 2 + 14 }, color: style.ceiling, surface: 'ceiling' },
    ...outer('x', -wallZ, -wallX - 0.25, wallX + 0.25),
    ...outer('x', wallZ, -wallX - 0.25, wallX + 0.25),
    ...outer('z', -wallX, -halfZ, halfZ),
    ...outer('z', wallX, -halfZ, halfZ),
    ...openings.flatMap((opening) =>
      alcoveBoxes(opening, {
        ceiling: CEILING, depth: 3, width: 3, thickness: OUTER,
        wallColor: style.wall, floorColor: style.floor, wallSurface: 'plaster', floorSurface: 'tile',
      }),
    ),
  ];
}

// An inner wall along one axis at a fixed position on the other, with gaps for doorways.
export function partition(style: WardStyle, axis: 'x' | 'z', fixed: number, from: number, to: number, gaps: Gap[] = []): LevelBox[] {
  return wallLine(axis, fixed, from, to, [...gaps].sort((a, b) => a.centre - b.centre), CEILING, INNER, style.wall, 'plaster');
}

export const doorway = (centre: number, width = 2.8): Gap => ({ centre, width, height: DOOR_HEIGHT });

// A door opening in the outer wall, which zombies come through.
export function entry(x: number, z: number, nx: number, nz: number): Door {
  return { position: { x, y: 0, z }, normal: { x: nx, z: nz }, width: 2.4, height: DOOR_HEIGHT };
}

// Furniture is solid but low, so zombies and players go around it and can climb onto it.
export function furniture(x: number, z: number, sx: number, sy: number, sz: number, color: string, surface: Surface = 'plain'): LevelBox {
  return { position: { x, y: sy / 2, z }, size: { x: sx, y: sy, z: sz }, color, surface };
}

export function stationBoxes(stations: Station[]): LevelBox[] {
  return stations.map((station) => {
    const alongX = station.normal.z !== 0;
    return {
      position: { x: station.position.x + station.normal.x * 0.15, y: 1.5, z: station.position.z + station.normal.z * 0.15 },
      size: { x: alongX ? 1.1 : 0.3, y: 3, z: alongX ? 0.3 : 1.1 },
      color: '#000000',
      surface: 'step' as const,
    };
  });
}

export type { Elevator };
