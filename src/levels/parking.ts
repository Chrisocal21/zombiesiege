// Shared markings and scenery positions; E05 is deliberately free of vehicles and props.
export const SPECIAL_PARKING_BAY = { id: 'E05', x: 19.5, z: 30.35, width: 5, depth: 2.7 };
export const SURFACE_PARKING_BAYS = [-1, 1].flatMap(side => Array.from({ length: 5 }, (_, i) => ({
  id: `${side < 0 ? 'W' : 'E'}0${i + 1}`,
  x: side < 0 ? -20.5 : 19.5,
  z: 18.35 + i * 3,
  kind: side < 0 && i === 0 ? 'ACCESSIBLE' : side < 0 && i === 1 ? 'KEEP CLEAR'
    : side > 0 && i === 1 ? 'AMBULANCE' : side > 0 && i === 4 ? 'RESERVED'
    : i === 4 || (side > 0 && i === 3) ? 'STAFF' : 'VISITORS',
})));
