// Units are meters. Y is up, and the floor surface sits at y = 0.
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

// What a box is made of. The renderer picks a material from this; the rules ignore it.
export type Surface = 'floor' | 'wall' | 'crate' | 'container' | 'barrel' | 'plain';

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
  playerSpawns: Vec3[];
  zombieSpawns: Vec3[];
  checkpoint: Vec3;
  kit?: Vec3;
}
