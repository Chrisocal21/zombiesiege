// Units are meters. Y is up, and the floor surface of the garage sits at y = 0.
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

// What a box is made of. The renderer picks a material from this; the rules ignore it.
// 'board', 'gate' and 'step' are solid but never drawn as boxes: boards and the gate are drawn
// from the game state, and steps are the stair-stepped stand-in for a smooth ramp.
export type Surface =
  | 'floor'
  | 'wall'
  | 'crate'
  | 'container'
  | 'barrel'
  | 'plain'
  | 'pillar'
  | 'cartons'
  | 'car'
  | 'van'
  | 'slab'
  | 'building'
  | 'board'
  | 'gate'
  | 'step';

export interface LevelBox {
  // Center of the box, not a corner.
  position: Vec3;
  size: Vec3;
  color: string;
  surface?: Surface;
}

// A ladder runs up the face of a box. The player climbs it from the side the normal points to.
export interface Ladder {
  // Where the ladder sits on the wall face, at floor height.
  x: number;
  z: number;
  // Unit direction pointing away from the wall, toward where the player stands.
  normal: { x: number; z: number };
  // Heights of the first and last rung. Climbing off the top puts you at y = top.
  bottom: number;
  top: number;
  width: number;
}

// A doorway through the wall. Zombies come in through it unless it has been boarded up.
export interface Door {
  // The middle of the opening at floor height, on the wall's center line.
  position: Vec3;
  // Unit direction pointing into the room.
  normal: { x: number; z: number };
  width: number;
  height: number;
}

// The metal gate at the bottom of the ramp. The players close it behind them to start the
// countdown for boarding up doors.
export interface Gate {
  position: Vec3;
  // Unit direction pointing into the room.
  normal: { x: number; z: number };
  width: number;
  height: number;
  // Where the control that closes it is, inside the room beside the gate.
  panel: Vec3;
}

// A smooth ramp down from the street into the building. The rules walk it as many small steps,
// and the renderer draws it as one sloped surface.
export interface Ramp {
  // Center line and width across the ramp.
  x: number;
  width: number;
  // The z of the bottom, where the gate is, and of the top, where the street is.
  zBottom: number;
  zTop: number;
  // Height of the top above the bottom.
  rise: number;
}

// A lamp: a glowing fitting with a real light in it.
export interface LevelLight {
  position: Vec3;
  color: string;
  intensity: number;
  // The bulb is on a bad wire and stutters.
  flicker?: boolean;
}

export interface Level {
  name: string;
  boxes: LevelBox[];
  ladders: Ladder[];
  lights: LevelLight[];
  doors: Door[];
  gate: Gate;
  ramp: Ramp;
  // Bundles of boards lying on the floor. Each one boards up a door.
  barricadeBars: Vec3[];
  // Where the players start, out in the street, and where they come back after dying inside.
  streetSpawns: Vec3[];
  playerSpawns: Vec3[];
  // Lamp posts along the street. A few of them carry a real light.
  streetLamps: Vec3[];
  checkpoint: Vec3;
  kit?: Vec3;
}
