import type { Door, LevelBox, Surface } from './types';

// A gap cut in a wall: where its middle is along the wall, how wide, and how tall.
export interface Gap {
  centre: number;
  width: number;
  height: number;
}

// The openings that sit on one wall line, as gaps along it, in order.
export function gapsOn(axis: 'x' | 'z', fixed: number, openings: Pick<Door, 'position' | 'width' | 'height'>[]): Gap[] {
  return openings
    .filter((opening) => (axis === 'x' ? opening.position.z === fixed : opening.position.x === fixed))
    .map((opening) => ({ centre: axis === 'x' ? opening.position.x : opening.position.z, width: opening.width, height: opening.height }))
    .sort((a, b) => a.centre - b.centre);
}

// A wall along one axis, from `from` to `to`, with a gap cut for each opening and a beam over it.
export function wallLine(
  axis: 'x' | 'z',
  fixed: number,
  from: number,
  to: number,
  gaps: Gap[],
  ceiling: number,
  thickness: number,
  color: string,
  surface: Surface = 'wall',
): LevelBox[] {
  const boxes: LevelBox[] = [];
  const along = (start: number, end: number, bottom: number, top: number): LevelBox => {
    const middle = (start + end) / 2;
    const length = end - start;
    const y = (bottom + top) / 2;
    const height = top - bottom;
    return axis === 'x'
      ? { position: { x: middle, y, z: fixed }, size: { x: length, y: height, z: thickness }, color, surface }
      : { position: { x: fixed, y, z: middle }, size: { x: thickness, y: height, z: length }, color, surface };
  };

  let cursor = from;
  for (const gap of gaps) {
    boxes.push(along(cursor, gap.centre - gap.width / 2, 0, ceiling));
    // The beam over the opening.
    boxes.push(along(gap.centre - gap.width / 2, gap.centre + gap.width / 2, gap.height, ceiling));
    cursor = gap.centre + gap.width / 2;
  }
  boxes.push(along(cursor, to, 0, ceiling));
  return boxes;
}

export interface AlcoveStyle {
  ceiling: number;
  depth: number;
  width: number;
  thickness: number;
  wallColor: string;
  floorColor: string;
  wallSurface?: Surface;
  floorSurface?: Surface;
}

// A closed space behind a door, with a floor so a player can step into it.
export function alcoveBoxes(door: Pick<Door, 'position' | 'normal'>, style: AlcoveStyle): LevelBox[] {
  const { ceiling, depth, width, thickness, wallColor, floorColor, wallSurface = 'wall', floorSurface = 'floor' } = style;
  const out = { x: -door.normal.x, z: -door.normal.z };
  const outerFace = thickness / 2;
  const sideOffset = width / 2 + thickness / 2;
  const boxes: LevelBox[] = [];
  // Positions are worked out as (distance out from the wall's center line, distance sideways).
  const place = (outward: number, sideways: number, y: number, length: number, across: number, height: number, color: string, surface: Surface): void => {
    const x = door.position.x + out.x * outward + (out.z !== 0 ? sideways : 0);
    const z = door.position.z + out.z * outward + (out.x !== 0 ? sideways : 0);
    const alongX = out.x !== 0;
    boxes.push({
      position: { x, y, z },
      size: { x: alongX ? length : across, y: height, z: alongX ? across : length },
      color,
      surface,
    });
  };

  const middle = outerFace + depth / 2;
  for (const side of [-1, 1]) {
    place(middle, side * sideOffset, ceiling / 2, depth, thickness, ceiling, wallColor, wallSurface);
  }
  const capOffset = outerFace + depth + thickness / 2;
  place(capOffset, 0, ceiling / 2, thickness, width + thickness * 2, ceiling, wallColor, wallSurface);
  place(middle, 0, -0.25, depth, width, 0.5, floorColor, floorSurface);
  return boxes;
}
