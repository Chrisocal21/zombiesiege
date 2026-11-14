import { roof } from './roof';
import type { Level } from './types';
import { CREW, SCIENTIST } from './voices';

// Act 2, the start: the roof of the office tower. The air ambulance has set the crew down, and
// the streets below are too overrun to land on. It is the hospital roof's shape under a new
// name: the same machine room with the freight lift, the same four stair heads the dead climb
// out of, and the same plant to fight round. The lift is dead, and its controls are in the box
// on the east parapet. Switch them on and hold the box until the lift has power.
//
// There is no helipad here, so the hospital roof's lights and landing pad are dropped.

// Where the controls cabinet stands, on the roof against the east parapet's inner face, and where its
// front is.
const controls = { position: { x: 17.95, y: 0, z: -3 }, normal: { x: -1, z: 0 } };

export const towerRoof: Level = {
  ...roof,
  name: 'Tower roof',
  // The hospital roof's helipad light box is not here: the controls cabinet stands in its place.
  boxes: roof.boxes.filter((box) => !(box.surface === 'step' && box.position.x === 17.6 && box.position.z === -3)),
  signs: [{ text: 'ROOF ACCESS', sub: 'FREIGHT LIFT  /  PLANT ROOM', background: '#5b1b1b', position: { x: 0, y: 3.35, z: 9.98 }, rotation: Math.PI, width: 2.6, height: 0.7 }],
  objective: {
    kind: 'charge',
    label: 'Lift controls',
    part: 'Power to the freight lift',
    device: controls,
    room: { minX: 12.8, maxX: 17.6, minZ: -7, maxZ: 1 },
    roomName: 'Roof controls',
    seconds: 40,
  },
  // The scientist's first call, on the roof's intercom. Calm, exact, and he does not say where he is.
  cues: [
    { on: 'start', at: 2, speaker: CREW, text: 'Tower roof. The lift is dead, and the controls are in the box on the east parapet.' },
    { on: 'start', at: 9, speaker: SCIENTIST, text: 'Roof, can you hear me? Good. Do not take the stairs. Power the lift and come down.', seconds: 6.5 },
    { on: 'done', at: 0.6, speaker: SCIENTIST, text: 'Forty-one next. Keep your voices down. The ones on the way are asleep.', seconds: 6 },
  ],
  // They come down from the helicopter beside the lift, as the crew did on the hospital roof.
  playerSpawns: [{ x: -4, y: 0, z: 8 }],
  checkpoint: { x: -4, y: 0, z: 8 },
};
