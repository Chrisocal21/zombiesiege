// Units are meters. Y is up, and the floor surface sits at y = 0.
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface LevelBox {
  // Center of the box, not a corner.
  position: Vec3;
  size: Vec3;
  color: string;
}

export interface Level {
  name: string;
  boxes: LevelBox[];
  playerSpawns: Vec3[];
  zombieSpawns: Vec3[];
  checkpoint: Vec3;
  kit?: Vec3;
}
