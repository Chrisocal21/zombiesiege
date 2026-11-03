// Units are meters. Y is up, and the floor surface of the garage sits at y = 0.
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

// What a box is made of. The renderer picks a material from this; the rules ignore it.
// 'board', 'gate', 'lift', 'lock' and 'step' are solid but never drawn as boxes: boards, the gate and the lift doors
// are drawn from the game state, and steps are the stair-stepped stand-in for a smooth ramp.
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
  | 'lift'
  | 'lock'
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

// The elevator to the next floor. Its doors are a gap in the wall like any doorway, with a cab
// behind it. The doors open once the floor is cleared, and the cab carries everyone up.
export interface Elevator extends Door {
  // How far into the cab, from the wall's center line, counts as being inside it, and how wide.
  cabDepth: number;
  cabWidth: number;
}

// A door that stays shut until a player pays points for it. Zombies cannot use it either.
export interface Lock extends Door {
  cost: number;
  // What is on the other side, for the prompt and the map.
  label: string;
}

// Something to find on the floor before the elevator will work.
export interface Objective {
  kind: 'keycard';
  label: string;
  position: Vec3;
}

// A buying point on a wall. Walk up, press use, and pay points.
export interface Station {
  kind: 'ammo' | 'shotgun';
  // The middle of the station on the wall face, and the direction it faces into the room.
  position: Vec3;
  normal: { x: number; z: number };
}

// A lamp: a glowing fitting with a real light in it.
export interface LevelLight {
  position: Vec3;
  color: string;
  intensity: number;
  // The bulb is on a bad wire and stutters.
  flicker?: boolean;
  // Set into a low ceiling, as in an office, rather than hung from a high one.
  ceiling?: boolean;
}

export interface Level {
  name: string;
  // The garage has the street, ramp and gate. A ward is a closed floor of rooms inside the tower.
  theme: 'garage' | 'ward';
  boxes: LevelBox[];
  ladders: Ladder[];
  lights: LevelLight[];
  doors: Door[];
  gate: Gate | null;
  elevator: Elevator;
  stations: Station[];
  // Doors that open for points, and the thing to find before leaving, if the floor has them.
  locks: Lock[];
  objective: Objective | null;
  ramp: Ramp | null;
  // The area zombies find their way around walls in, for floors with rooms.
  navBounds: { minX: number; maxX: number; minZ: number; maxZ: number } | null;
  // Bundles of boards lying on the floor. Each one boards up a door.
  barricadeBars: Vec3[];
  // Where the players start, out in the street, and where they come back after dying inside.
  streetSpawns: Vec3[];
  playerSpawns: Vec3[];
  // Which way a player faces when placed at a spawn, if it matters. 0 faces -z.
  spawnYaw?: number;
  // Lamp posts along the street. A few of them carry a real light.
  streetLamps: Vec3[];
  checkpoint: Vec3;
  kit?: Vec3;
}
