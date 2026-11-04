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
  | 'tile'
  | 'plaster'
  | 'ceiling'
  | 'building'
  | 'board'
  | 'gate'
  | 'lift'
  | 'lock'
  | 'step';

// A piece of furniture the renderer models in place of the plain box. The rules only see the box,
// so the model stays inside it.
export type Prop =
  | 'desk'
  | 'counter'
  | 'seating'
  | 'cabinet'
  | 'shelf'
  | 'lab'
  | 'fridge'
  | 'analyser'
  | 'cart'
  | 'bed'
  | 'gurney'
  | 'operating'
  | 'instruments'
  | 'supply'
  | 'lockers'
  | 'bench'
  | 'curtain'
  | 'monitor'
  | 'hvac'
  | 'vent'
  | 'tank'
  | 'mast';

export interface LevelBox {
  // Center of the box, not a corner.
  position: Vec3;
  size: Vec3;
  color: string;
  surface?: Surface;
  prop?: Prop;
  // Rotation about y of the prop's front, as for signs: 0 faces +z. A bed's front is its foot.
  facing?: number;
  // Solid but not drawn, because something else is drawn in its place: the real buildings that
  // stand along the street.
  hidden?: boolean;
  // Ramp backing for shots/solids; feet follow Level.ramp's continuous surface instead.
  rampStep?: boolean;
  vehicleRole?: 'ambulance' | 'elCajon';
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

// A smooth ramp shared by ground sampling and rendering. Backing boxes remain for shots.
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

// A part of the floor's objective fixed to a wall, used from the side the normal points to.
export interface WallFitting {
  position: Vec3;
  normal: { x: number; z: number };
}

// An area on the floor plan.
export interface Area {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

// What has to be done on a floor before the elevator will work. Each one wins a part the roof's
// helipad lights need, named by `part`.
// 'keycard': pick one thing up.
// 'breakers': the power is out; throw every breaker. Each brings back the lights on its circuit.
// 'charge': once the waves are cleared, start a charger and stay in the room until it is full,
//   while zombies keep coming.
// 'carry': bring each case to the drop-off. A case takes both hands, so no shooting while carrying.
// 'signal': the roof. Once the waves are cleared, switch on the helipad lights, hold out until the
//   helicopter lands, then everyone gets aboard.
export type Objective =
  | { kind: 'keycard'; label: string; part: string; position: Vec3 }
  | { kind: 'breakers'; label: string; part: string; panels: WallFitting[] }
  | { kind: 'charge'; label: string; part: string; device: WallFitting; room: Area; roomName: string; seconds: number }
  | { kind: 'carry'; label: string; part: string; items: Vec3[]; dropoff: Vec3 }
  | { kind: 'signal'; label: string; part: string; device: WallFitting; pad: Vec3; padRadius: number; seconds: number };

// A buying point on a wall. Walk up, press use, and pay points.
export interface Station {
  kind: 'ammo' | 'shotgun';
  // What a weapon wall sells. The pump shotgun when it is left out.
  weapon?: 'shotgun' | 'ak';
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
  // On a floor whose power is out, the breaker this lamp waits for.
  circuit?: number;
  // A battery-backed emergency lamp: a small red fitting on the wall, lit only while the power is out.
  emergency?: boolean;
}

// How the air looks on a floor: the fog colour and range, and how strong the ambient sky light is.
export interface Atmosphere {
  fog: string;
  fogNear: number;
  fogFar: number;
  ambient: number;
}

// A sign hung on a wall: a heading, a line under it, and the colour of the board.
export interface LevelSign {
  text: string;
  sub: string;
  background: string;
  position: Vec3;
  // Rotation about y: 0 faces +z, and the sign is read from the side it faces.
  rotation: number;
  width: number;
  height: number;
}

export interface Level {
  name: string;
  // The garage has the street, ramp and gate. A ward is a closed floor of rooms inside the tower.
  // The roof is open to the sky, with the helipad.
  theme: 'garage' | 'ward' | 'roof';
  atmosphere?: Atmosphere;
  boxes: LevelBox[];
  ladders: Ladder[];
  lights: LevelLight[];
  doors: Door[];
  gate: Gate | null;
  elevator: Elevator;
  stations: Station[];
  // Doors that open for points, and the thing to find before leaving, if the floor has them.
  locks: Lock[];
  signs: LevelSign[];
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
