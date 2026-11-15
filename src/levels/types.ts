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
  // A tree's trunk: drawn as a whole tree.
  | 'tree'
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
  vehicleRole?: 'ambulance' | 'elCajon' | 'police';
  // Which ambulance paint: the hospital's own teal and red when left out, or the fire and rescue service's red and white.
  livery?: 'rescue';
  // The vault's door: solid until the time lock opens it, drawn from the game state, and shut again
  // once what was driven back in is sealed behind it.
  vaultDoor?: boolean;
  // Part of the park, drawn by render/park.ts in place of the box (which is hidden).
  parkPiece?: 'lawn' | 'path' | 'bench' | 'shed' | 'planter' | 'fountain' | 'bandstand' | 'median';
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
// 'contain': the floor's boss (Level.boss) is beaten back into the vault and sealed behind its door.
export type Objective =
  | { kind: 'keycard'; label: string; part: string; position: Vec3 }
  | { kind: 'breakers'; label: string; part: string; panels: WallFitting[] }
  | { kind: 'charge'; label: string; part: string; device: WallFitting; room: Area; roomName: string; seconds: number; screen?: string }
  | { kind: 'carry'; label: string; part: string; items: Vec3[]; dropoff: Vec3 }
  | { kind: 'signal'; label: string; part: string; device: WallFitting; pad: Vec3; padRadius: number; seconds: number; style?: 'helipad' | 'flares' }
  | { kind: 'contain'; label: string; part: string };

// The floor's boss, Patient O: a brute grown far past the rest. It comes through door `door`
// `arriveAt` seconds into the first step's hold. It cannot be killed: in the first stage it shrugs
// off the worst and staggers when shot in the head; once the vault is open it is enraged, and beaten
// down it falls back to `retreat`, inside the vault, and the door is shut on it.
export interface Boss {
  name: string;
  door: number;
  arriveAt: number;
  retreat: Vec3;
  // Where it stands when the scene ends: between the crew and the lift.
  stand: Vec3;
}

// A short scene when step `after` of the floor is done: the rules stop, the camera takes over, and
// the scientist walks from `from` to `to`. The shots and captions are for the renderer.
export interface Flight { seconds: number; shots: Scene['shots']; captions: Scene['captions'] }

export interface Scene {
  after: number;
  seconds: number;
  from: Vec3;
  to: Vec3;
  // When in the scene the vault door starts to swing open, and when the scientist starts to walk.
  doorAt: number;
  walkAt: number;
  walkSeconds: number;
  shots: { from: number; to: number; start: { at: Vec3; look: Vec3 }; end: { at: Vec3; look: Vec3 } }[];
  captions: { from: number; to: number; title?: string; speaker?: string; line: string }[];
}

// How a floor plays.
// 'siege' (the default): waves come through the doors, then the floor goes quiet and the objective
//   is done, then the way on opens.
// 'sweep': no waves. The objective is open from the start, and the floor's own dead (residents)
//   stand where they are until they see or hear someone. Each loud moment (a gunshot) brings `loud`
//   more through the doors, `first` for the very first one, through the doors listed in `from` (all
//   of them when left out).
// 'run': no waves. The objective is open from the start, and the dead keep coming through doors
//   behind the crew, one every `every` seconds at first and faster the longer they take, never more
//   than `max` alive. A charge step becomes a short stand.
export type Flow =
  | { kind: 'siege' }
  | { kind: 'sweep'; loud: number; first?: number; from?: number[]; then?: { every: number; max: number } }
  | { kind: 'run'; every: number; max: number };

// One of a floor's own dead, standing somewhere before the crew arrives. It does not move until it
// sees, hears or is woken by another.
export interface Resident {
  x: number;
  z: number;
  kind?: 'walker' | 'runner' | 'brute' | 'screamer';
  // Which way it faces. 0 faces -z.
  yaw?: number;
  // It walks about, up to this many metres from where it was put, until it notices someone. Left
  // out, it stands (or sits slumped) where it is.
  roam?: number;
}

// A line of radio or crew talk, shown for a few seconds at a moment on the floor.
// 'start': after arriving. 'done': once the whole floor's objective is done. 'step': once step
// `step` of the floor's steps is done. 'area': once the first player walks into `area`. 'boss':
// once the floor's boss arrives. 'wave': once wave `wave` of a siege floor begins.
// `at` is the seconds after that moment.
// `feed` puts a security-camera monitor on screen while the line shows, with that label on it.
export interface Cue {
  on: 'start' | 'done' | 'step' | 'area' | 'boss' | 'wave';
  at: number;
  // For 'wave': which wave of a siege floor it is said when it begins.
  wave?: number;
  speaker: string;
  text: string;
  seconds?: number;
  step?: number;
  area?: Area;
  feed?: string;
}

// People hiding on a floor whom the crew can get out (P04's restaurant): where each one is, the way they
// leave, and what is remembered once they have. It is never needed to go on, and nothing is on a clock.
export interface Rescue {
  // The place, for the HUD and the log.
  name: string;
  people: { x: number; z: number; yaw?: number; look: 'cook' | 'waiter' | 'diner' }[];
  // Once someone following the crew walks into this, they are away.
  exit: Area;
  // Points for each person who gets out, to every player.
  points: number;
  // What goes into the run's log once they are all out, and what the crew says.
  log: { title: string; lines: string[] };
  line: string;
}

// Something to read on a floor: a memo, an order, a page of notes. Press use beside it for a card
// with its words, and it goes into the run's log. Reading is never needed to go on.
export interface Note {
  position: Vec3;
  // What it is, for the prompt ("Read the memo").
  what: string;
  title: string;
  lines: string[];
  // How the paper lies on the surface it is on: flat on a desk, or upright on a wall.
  wall?: { x: number; z: number };
}

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
  // A lantern on a cast iron post standing on the ground, as along a park path.
  post?: boolean;
}

// How the air looks on a floor: the fog colour and range, and how strong the ambient sky light is.
export interface Atmosphere {
  fog: string;
  fogNear: number;
  fogFar: number;
  ambient: number;
  // The colours of the sky on a floor that is outdoors, and how bright the stars are (0 to 1). The
  // night sky when left out.
  sky?: { horizon: string; zenith: string; stars: number };
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
  // The roof is open to the sky, with the helipad. A street is a block of the city in the open air.
  theme: 'garage' | 'ward' | 'roof' | 'street';
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
  // What has to be done before the way on opens. On a floor with `steps`, the steps are done in
  // order and `objective` is the one being done now (the game sets it), so leave it null there.
  objective: Objective | null;
  steps?: Objective[];
  flow?: Flow;
  // Who leads the last wave of a siege floor, when it should not be left to the floor's number.
  leads?: 'brute' | 'screamer';
  residents?: Resident[];
  // How many of the dead are walking about the floor when the crew arrives, besides the residents,
  // placed by the game well away from the start (src/game/roam.ts). Left out, a number by theme.
  roamers?: number;
  // A dark floor where a light gives the crew away: while any living player has their flashlight on, one
  // more of the dead is called in every few seconds, and the held stand sends them faster.
  lightsCall?: boolean;
  // A floor where floodwater rises in authored stages: how deep it stands (metres above the ground) once
  // `at` seconds have passed since the crew arrived. It slows anyone wading, and drains once the job is done.
  flood?: { stages: { at: number; height: number }[] };
  cues?: Cue[];
  notes?: Note[];
  rescue?: Rescue;
  boss?: Boss;
  scene?: Scene;
  // The flight out, after the last floor's helicopter lifts: a camera film with captions, then the run ends.
  flight?: Flight;
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
  // The way on is a steel gate on foot, as in the prologue, and not a lift.
  exitGate?: boolean;
  // How long the way on stays open once it opens, in seconds, on a floor where it is a race: when it runs
  // out the gate shuts again, the controls come back off and more of the dead are called in.
  exitTimer?: number;
  // On a gate floor, the checkpoint the crew has just come through, behind where they start: open.
  entry?: Elevator;
  // What is seen beyond each edge of an outdoor block, drawn in place of its plain walls (the walls are
  // still there to walk into). North is the edge at -z, west the edge at -x. `skyline` puts towers on
  // the horizon.
  scenery?: Scenery;
}

// 'city': a row of real buildings, their ground floors shopfronts with the block's doorways in them.
// 'houses': a fence, front yards and houses. 'trees': a hedge with fields and trees behind it.
// A side can leave stretches of a city row `open` (from, to along the line): low buildings, or a place the
// crew can walk into behind the frontage, where a tall building would stand in the way.
export type Backdrop = 'city' | 'houses' | 'trees';
export type SceneryEdge = Backdrop | { kind: Backdrop; open?: [number, number][] };
export interface Scenery {
  north?: SceneryEdge;
  south?: SceneryEdge;
  west?: SceneryEdge;
  east?: SceneryEdge;
  skyline?: boolean;
}
