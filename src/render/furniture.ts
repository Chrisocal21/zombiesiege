import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { LevelBox, Prop } from '../levels/types';
import { cardboardMaterial } from './streetTextures';
import * as T from './furnitureTextures';
import { seeded, type Random } from './furnitureTextures';

// The furniture of the hospital floors. The level gives each piece a solid box, which is all the
// rules know about, and the piece is modelled inside that box: the top you can stand on is where
// the box's top is. Parts share materials, so the scenery bake merges a whole floor of furniture
// into a few draw calls however many parts it has.

// Where a builder puts its parts: a group with its origin on the floor in the middle of the box
// and the piece's front toward +z, the box's colour, and randomness seeded by where it stands.
interface Kit {
  group: THREE.Group;
  color: string;
  random: Random;
}

type V3 = [number, number, number];

let environment: THREE.Texture | null = null;
const materials = new Map<string, THREE.Material>();
function material<M extends THREE.Material>(key: string, make: () => M): M {
  let made = materials.get(key) as M | undefined;
  if (!made) {
    made = make();
    materials.set(key, made);
  }
  return made;
}

// A texture laid on in metres, so it keeps its real size on a part of any size.
function tiled<M extends THREE.Material>(made: M, metres: number): M {
  made.userData.tile = metres;
  return made;
}
// Transparent, but safe to merge with others of its kind because the order they draw in does not
// matter: shadows and stains on the floor, glass, and clear plastic.
function mergeable<M extends THREE.Material>(made: M): M {
  made.userData.bake = true;
  return made;
}

function shade(color: string, amount: number): string {
  const result = new THREE.Color(color);
  result.lerp(new THREE.Color(amount < 0 ? '#000000' : '#ffffff'), Math.abs(amount));
  return `#${result.getHexString()}`;
}

const standard = (key: string, options: THREE.MeshStandardMaterialParameters) => material(key, () => new THREE.MeshStandardMaterial(options));
const metal = (key: string, color: string, roughness: number, reflect: number) =>
  material(key, () => new THREE.MeshStandardMaterial({ color, metalness: 0.9, roughness, envMap: environment, envMapIntensity: reflect }));

const steel = () => metal('steel', '#9aa2a8', 0.36, 0.5);
const chrome = () => metal('chrome', '#c9ced2', 0.2, 0.65);
const darkSteel = () => standard('darkSteel', { color: '#2d3236', metalness: 0.6, roughness: 0.5 });
const blackPlastic = () => standard('blackPlastic', { color: '#16181b', roughness: 0.5 });
const greyPlastic = () => standard('greyPlastic', { color: '#4a5157', roughness: 0.55 });
const whitePlastic = () => standard('whitePlastic', { color: '#dfe2df', roughness: 0.42 });
const rubber = () => standard('rubber', { color: '#111213', roughness: 0.95 });
const epoxy = () => standard('epoxy', { color: '#1d2023', roughness: 0.28, envMap: environment, envMapIntensity: 0.6 });
const painted = (color: string) => material(`painted:${color}`, () => tiled(new THREE.MeshStandardMaterial({ map: T.grime(), color, roughness: 0.55, metalness: 0.25, envMap: environment, envMapIntensity: 0.4 }), 1));
const laminate = (color: string) => material(`laminate:${color}`, () => tiled(new THREE.MeshStandardMaterial({ map: T.laminate(), color, roughness: 0.5 }), 1));
const wood = (color: string) => material(`wood:${color}`, () => tiled(new THREE.MeshStandardMaterial({ map: T.veneer(), color, roughness: 0.45, envMap: environment, envMapIntensity: 0.35 }), 1.3));
const vinyl = (color: string) => material(`vinyl:${color}`, () => tiled(new THREE.MeshStandardMaterial({ map: T.vinyl(), color, roughness: 0.42 }), 0.8));
const fabric = (color: string) => material(`fabric:${color}`, () => tiled(new THREE.MeshStandardMaterial({ map: T.vinyl(), color, roughness: 0.95 }), 0.5));
const cloth = (color: string, bloody: boolean) => material(`cloth:${color}:${bloody}`, () => new THREE.MeshStandardMaterial({ map: T.sheet(bloody), color, roughness: 0.95, side: THREE.DoubleSide }));
const curtainCloth = (color: string) => material(`curtain:${color}`, () => tiled(new THREE.MeshStandardMaterial({ map: T.curtain(), color, roughness: 0.9, side: THREE.DoubleSide }), 0.5));
const netting = () => material('net', () => tiled(new THREE.MeshStandardMaterial({ map: T.net(), color: '#e8eeee', alphaTest: 0.5, roughness: 0.9, side: THREE.DoubleSide }), 0.25));
const paperSheet = (variant: number) => standard(`paper:${variant}`, { map: T.paper(variant), roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -1 });
const plain = (color: string, roughness = 0.6) => standard(`plain:${color}:${roughness}`, { color, roughness });
const glass = () => material('glass', () => mergeable(new THREE.MeshPhysicalMaterial({
  color: '#dcecf0', roughness: 0.05, metalness: 0, transparent: true, opacity: 0.18, envMap: environment, envMapIntensity: 1.4, depthWrite: false,
})));
const clearPlastic = (color: string) => material(`clear:${color}`, () => mergeable(new THREE.MeshStandardMaterial({ color, roughness: 0.2, transparent: true, opacity: 0.7, depthWrite: false })));
// A lit screen. The picture is emissive, so it glows in a dark room.
const screen = (key: string, map: THREE.Texture, brightness = 1) =>
  standard(`screen:${key}`, { color: '#050607', roughness: 0.2, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: brightness });
const deadScreen = () => standard('deadScreen', { color: '#0a0c0e', roughness: 0.1, metalness: 0.3, envMap: environment, envMapIntensity: 1 });
const label = (map: THREE.Texture, key: string) => standard(`label:${key}`, { map, roughness: 0.6 });
const glow = (color: string) => standard(`glow:${color}`, { color: '#000000', emissive: color, emissiveIntensity: 1.6 });
const contactShadow = () => material('contactShadow', () => mergeable(new THREE.MeshBasicMaterial({
  map: T.contactShadow(), color: '#000000', transparent: true, opacity: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
})));
const bloodPool = (variant: number) => material(`bloodPool:${variant}`, () => mergeable(new THREE.MeshStandardMaterial({
  map: T.bloodPool(variant), transparent: true, depthWrite: false, roughness: 0.16, metalness: 0.1, polygonOffset: true, polygonOffsetFactor: -4,
})));

// Texture coordinates measured in metres from the part's corner, as world.ts does for boxes.
function metreUVs(geometry: THREE.BufferGeometry, tile: number): void {
  geometry.computeBoundingBox();
  const min = geometry.boundingBox!.min;
  const position = geometry.attributes.position;
  const normal = geometry.attributes.normal;
  const uv = geometry.attributes.uv;
  if (!normal || !uv) return;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i) - min.x;
    const y = position.getY(i) - min.y;
    const z = position.getZ(i) - min.z;
    const nx = Math.abs(normal.getX(i));
    const ny = Math.abs(normal.getY(i));
    const nz = Math.abs(normal.getZ(i));
    if (nx >= ny && nx >= nz) uv.setXY(i, z / tile, y / tile);
    else if (ny >= nz) uv.setXY(i, x / tile, z / tile);
    else uv.setXY(i, x / tile, y / tile);
  }
  uv.needsUpdate = true;
}

function place(parent: THREE.Object3D, geometry: THREE.BufferGeometry, made: THREE.Material, x: number, y: number, z: number, shadow: boolean): THREE.Mesh {
  const tile = made.userData.tile as number | undefined;
  if (tile) metreUVs(geometry, tile);
  const mesh = new THREE.Mesh(geometry, made);
  mesh.position.set(x, y, z);
  mesh.castShadow = shadow;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

// A block, with its edges rounded off by `radius` if it is given.
function box(parent: THREE.Object3D, w: number, h: number, d: number, x: number, y: number, z: number, made: THREE.Material, radius = 0): THREE.Mesh {
  const r = Math.min(radius, Math.min(w, h, d) / 2 - 0.0005);
  const geometry = r > 0.001 ? new RoundedBoxGeometry(w, h, d, 1, r) : new THREE.BoxGeometry(w, h, d);
  return place(parent, geometry, made, x, y, z, Math.max(w, h, d) > 0.3);
}

function cylinder(parent: THREE.Object3D, radius: number, h: number, x: number, y: number, z: number, made: THREE.Material, segments = 10, top = radius): THREE.Mesh {
  return place(parent, new THREE.CylinderGeometry(top, radius, h, segments), made, x, y, z, h > 0.3);
}

// A round bar from one point to another.
function bar(parent: THREE.Object3D, from: V3, to: V3, radius: number, made: THREE.Material, segments = 8): THREE.Mesh {
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const along = b.clone().sub(a);
  const mesh = place(parent, new THREE.CylinderGeometry(radius, radius, along.length(), segments), made, 0, 0, 0, along.length() > 0.3);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), along.normalize());
  return mesh;
}

// A bent tube or cable through some points.
function tube(parent: THREE.Object3D, points: V3[], radius: number, made: THREE.Material, radial = 6): THREE.Mesh {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  return place(parent, new THREE.TubeGeometry(curve, points.length * 8, radius, radial, false), made, 0, 0, 0, false);
}

function plane(parent: THREE.Object3D, w: number, h: number, x: number, y: number, z: number, made: THREE.Material, yaw = 0, pitch = 0): THREE.Mesh {
  const mesh = place(parent, new THREE.PlaneGeometry(w, h), made, x, y, z, false);
  mesh.rotation.set(pitch, yaw, 0, 'YXZ');
  return mesh;
}

// Something lying flat on a surface at height y, face up.
function flat(parent: THREE.Object3D, w: number, d: number, x: number, y: number, z: number, made: THREE.Material, yaw = 0): THREE.Mesh {
  return plane(parent, w, d, x, y, z, made, yaw, -Math.PI / 2);
}

function group(parent: THREE.Object3D, x: number, y: number, z: number, yaw = 0): THREE.Group {
  const made = new THREE.Group();
  made.position.set(x, y, z);
  made.rotation.y = yaw;
  parent.add(made);
  return made;
}

const pick = <V>(random: Random, list: readonly V[]): V => list[Math.floor(random() * list.length) % list.length];

// ---------------------------------------------------------------------------------------------
// Small things that turn up on many pieces.

function caster(parent: THREE.Object3D, x: number, z: number, radius: number): void {
  box(parent, radius * 1.1, radius * 1.2, radius * 0.9, x, radius * 1.45, z, darkSteel());
  cylinder(parent, radius * 0.22, radius * 0.9, x, radius * 2.4, z, chrome(), 6);
  const wheel = cylinder(parent, radius, radius * 0.7, x, radius, z, rubber(), 12);
  wheel.rotation.z = Math.PI / 2;
}

// A flat screen on a stand, facing +z from where it stands.
function monitor(parent: THREE.Object3D, x: number, y: number, z: number, yaw: number, face: THREE.Material, size = 0.56): void {
  const stand = group(parent, x, y, z, yaw);
  box(stand, 0.24, 0.014, 0.17, 0, 0.007, 0, blackPlastic(), 0.005);
  box(stand, 0.05, 0.26, 0.025, 0, 0.14, -0.05, blackPlastic());
  const height = size * 0.6;
  box(stand, size, height, 0.032, 0, 0.16 + height / 2, -0.025, blackPlastic(), 0.008);
  box(stand, size * 0.4, height * 0.5, 0.03, 0, 0.16 + height / 2, -0.05, blackPlastic(), 0.01);
  plane(stand, size - 0.026, height - 0.026, 0, 0.16 + height / 2, -0.008, face);
}

function keyboard(parent: THREE.Object3D, x: number, y: number, z: number, yaw: number): void {
  const board = group(parent, x, y, z, yaw);
  box(board, 0.44, 0.018, 0.14, 0, 0.009, 0, blackPlastic(), 0.004);
  flat(board, 0.42, 0.125, 0, 0.0185, 0, standard('keyboard', { map: T.keyboard(), roughness: 0.6 }));
  box(board, 0.06, 0.03, 0.1, 0.32, 0.015, 0.02, blackPlastic(), 0.012);
}

function mug(parent: THREE.Object3D, x: number, y: number, z: number, color: string): void {
  cylinder(parent, 0.04, 0.095, x, y + 0.0475, z, plain(color, 0.3), 14);
  cylinder(parent, 0.034, 0.002, x, y + 0.085, z, plain('#2a1a10', 0.2), 12);
  const handle = place(parent, new THREE.TorusGeometry(0.025, 0.007, 6, 10, Math.PI), plain(color, 0.3), x + 0.04, y + 0.05, z, false);
  handle.rotation.z = -Math.PI / 2;
}

function paperStack(parent: THREE.Object3D, x: number, y: number, z: number, yaw: number, random: Random): void {
  const sheets = group(parent, x, y, z, yaw);
  const height = 0.01 + random() * 0.04;
  box(sheets, 0.21, height, 0.297, 0, height / 2, 0, plain('#e9e6de', 0.9));
  flat(sheets, 0.21, 0.297, 0, height + 0.0006, 0, paperSheet(Math.floor(random() * 3)), (random() - 0.5) * 0.1);
}

function binder(parent: THREE.Object3D, x: number, y: number, z: number, yaw: number, color: string, lying: boolean): void {
  const file = group(parent, x, y, z, yaw);
  if (lying) box(file, 0.3, 0.06, 0.26, 0, 0.03, 0, plain(color, 0.5), 0.006);
  else box(file, 0.06, 0.3, 0.26, 0, 0.15, 0, plain(color, 0.5), 0.006);
}

function phone(parent: THREE.Object3D, x: number, y: number, z: number, yaw: number): void {
  const set = group(parent, x, y, z, yaw);
  box(set, 0.19, 0.05, 0.17, 0, 0.025, 0, greyPlastic(), 0.012);
  box(set, 0.2, 0.035, 0.05, 0, 0.065, -0.04, greyPlastic(), 0.014);
  flat(set, 0.08, 0.06, 0.03, 0.051, 0.04, standard('phoneKeys', { color: '#8a9096', roughness: 0.6 }));
}

function bottle(parent: THREE.Object3D, x: number, y: number, z: number, radius: number, height: number, body: THREE.Material, cap: THREE.Material): void {
  cylinder(parent, radius, height * 0.8, x, y + height * 0.4, z, body, 10);
  cylinder(parent, radius * 0.55, height * 0.2, x, y + height * 0.9, z, cap, 8);
}

function drugBox(parent: THREE.Object3D, w: number, h: number, d: number, x: number, y: number, z: number, random: Random, yaw = 0): THREE.Mesh {
  const index = Math.floor(random() * T.DRUG_COUNT);
  const mesh = box(parent, w, h, d, x, y, z, label(T.drugLabel(index), `drug${index}`));
  mesh.rotation.y = yaw;
  return mesh;
}

// Loose pages dropped on the floor around a piece, some way out from its sides.
function scatterPapers(kit: Kit, w: number, d: number, count: number): void {
  for (let i = 0; i < count; i++) {
    const side = kit.random() < 0.5 ? -1 : 1;
    const alongX = kit.random() < 0.5;
    const x = alongX ? (kit.random() - 0.5) * w : side * (w / 2 + 0.15 + kit.random() * 0.6);
    const z = alongX ? side * (d / 2 + 0.15 + kit.random() * 0.6) : (kit.random() - 0.5) * d;
    flat(kit.group, 0.21, 0.297, x, 0.003 + i * 0.0004, z, paperSheet(Math.floor(kit.random() * 3)), kit.random() * Math.PI * 2);
  }
}

function bloodOnFloor(kit: Kit, x: number, z: number, size: number): void {
  flat(kit.group, size, size, x, 0.005, z, bloodPool(Math.floor(kit.random() * 2)), kit.random() * Math.PI * 2);
}

// An office chair, its seat facing +z from where it stands.
function officeChair(parent: THREE.Object3D, x: number, z: number, yaw: number, cover: THREE.Material, knocked = false): void {
  const chair = group(parent, x, knocked ? 0.27 : 0, z, yaw);
  if (knocked) chair.rotation.z = Math.PI / 2 - 0.12;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const spoke = box(chair, 0.045, 0.035, 0.3, Math.sin(a) * 0.15, 0.075, Math.cos(a) * 0.15, blackPlastic());
    spoke.rotation.y = a;
    caster(chair, Math.sin(a) * 0.29, Math.cos(a) * 0.29, 0.028);
  }
  cylinder(chair, 0.022, 0.2, 0, 0.21, 0, chrome(), 8);
  cylinder(chair, 0.042, 0.12, 0, 0.15, 0, blackPlastic(), 10);
  box(chair, 0.2, 0.04, 0.22, 0, 0.33, 0, blackPlastic());
  box(chair, 0.48, 0.08, 0.46, 0, 0.39, 0.02, cover, 0.03);
  box(chair, 0.06, 0.34, 0.03, 0, 0.5, -0.22, blackPlastic());
  const back = box(chair, 0.44, 0.5, 0.06, 0, 0.82, -0.25, cover, 0.03);
  back.rotation.x = -0.12;
  for (const side of [-1, 1]) {
    box(chair, 0.03, 0.2, 0.04, side * 0.24, 0.5, -0.02, blackPlastic());
    box(chair, 0.06, 0.025, 0.24, side * 0.24, 0.61, 0.01, blackPlastic(), 0.01);
  }
}

// A drip stand: five feet on wheels, a pole, hooks, a bag and its line, and sometimes a monitor.
function dripStand(parent: THREE.Object3D, x: number, z: number, random: Random, to: V3 | null, withMonitor: boolean): void {
  const yaw = (random() - 0.5) * 0.6;
  const stand = group(parent, x, 0, z, yaw);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const leg = box(stand, 0.025, 0.02, 0.24, Math.sin(a) * 0.12, 0.06, Math.cos(a) * 0.12, chrome());
    leg.rotation.y = a;
    caster(stand, Math.sin(a) * 0.23, Math.cos(a) * 0.23, 0.022);
  }
  cylinder(stand, 0.012, 1.95, 0, 1.03, 0, chrome(), 8);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    bar(stand, [0, 1.98, 0], [Math.cos(a) * 0.1, 2.02, Math.sin(a) * 0.1], 0.005, chrome(), 5);
  }
  const blood = random() < 0.4;
  box(stand, 0.11, 0.18, 0.03, 0.09, 1.86, 0, clearPlastic(blood ? '#7a0c10' : '#e4eef0'), 0.014);
  cylinder(stand, 0.008, 0.06, 0.09, 1.74, 0, clearPlastic('#e4eef0'), 6);
  if (to) {
    // Where the line ends, in the stand's own turned frame.
    const dx = to[0] - x;
    const dz = to[2] - z;
    const lx = dx * Math.cos(yaw) - dz * Math.sin(yaw);
    const lz = dx * Math.sin(yaw) + dz * Math.cos(yaw);
    tube(stand, [[0.09, 1.71, 0], [0.09, 1.35, 0.02], [(0.09 + lx) / 2, 1.0, lz / 2], [lx, to[1], lz]], 0.003, clearPlastic('#d8e4e6'), 4);
  }
  if (withMonitor) {
    box(stand, 0.05, 0.05, 0.06, 0, 1.38, 0.03, darkSteel());
    box(stand, 0.3, 0.22, 0.08, 0, 1.4, 0.09, greyPlastic(), 0.014);
    plane(stand, 0.26, 0.17, 0, 1.4, 0.131, screen('ecg', T.ecgScreen()));
  }
}

// A cloth laid over something: across the top it follows `lift`, which raises it over whatever is
// under it, and past the sides it falls straight down by `drop`, in folds. With `ends`, it falls
// over the two ends as well.
function drape(width: number, length: number, drop: number, random: Random, wrinkle: number, lift?: (u: number, v: number) => number, ends = 0): THREE.BufferGeometry {
  const span = width + drop * 2;
  const reach = length + ends * 2;
  const geometry = new THREE.PlaneGeometry(span, reach, Math.ceil(span / 0.025), Math.ceil(reach / 0.035));
  geometry.rotateX(-Math.PI / 2);
  const waves = Array.from({ length: 6 }, () => [random() * 6.28, 3 + random() * 10, 2 + random() * 8, random() * 6.28]);
  const fold = random() * 6.28;
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const u = position.getX(i);
    const v = position.getZ(i);
    const over = Math.max(0, Math.abs(u) - width / 2);
    const past = Math.max(0, Math.abs(v) - length / 2);
    // Hanging cloth starts from the height of the edge it falls over.
    const edgeU = Math.sign(u) * Math.min(Math.abs(u), width / 2);
    const edgeV = Math.sign(v) * Math.min(Math.abs(v), length / 2);
    const hang = Math.max(over, past);
    let y = (lift ? lift(edgeU, edgeV) : 0) - hang;
    let x = u;
    let z = v;
    if (over > 0) x = Math.sign(u) * (width / 2 + 0.01 + over * 0.06 + Math.sin(v * 11 + fold) * 0.018 * Math.min(1, over * 10));
    if (past > 0) z = Math.sign(v) * (length / 2 + 0.01 + past * 0.06 + Math.sin(u * 11 + fold) * 0.018 * Math.min(1, past * 10));
    let noise = 0;
    for (const [a, fu, fv, b] of waves) noise += Math.sin(u * fu + a) * Math.sin(v * fv + b);
    y += (noise / waves.length) * wrinkle * (1 + hang * 4);
    position.setXYZ(i, x, y, z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

// The shape of someone lying on their back under a sheet, head toward -z, `length` long.
function bodyUnderSheet(length: number): (u: number, v: number) => number {
  const bump = (u: number, t: number, cu: number, ct: number, ru: number, rt: number, h: number) => {
    const q = ((u - cu) / ru) ** 2 + ((t - ct) / rt) ** 2;
    return q < 1 ? h * Math.sqrt(1 - q) : 0;
  };
  const shape = (u: number, v: number) => {
    const t = v + length / 2 - 0.05;
    return Math.max(
      bump(u, t, 0, 0.16, 0.1, 0.13, 0.17),
      bump(u, t, 0, 0.58, 0.25, 0.36, 0.18),
      bump(u, t, 0, 0.98, 0.22, 0.2, 0.15),
      bump(u, t, 0, 1.38, 0.2, 0.4, 0.1),
      bump(u, t, -0.1, 1.38, 0.08, 0.4, 0.12),
      bump(u, t, 0.1, 1.38, 0.08, 0.4, 0.12),
      bump(u, t, -0.1, 1.8, 0.06, 0.07, 0.17),
      bump(u, t, 0.1, 1.8, 0.06, 0.07, 0.17),
      bump(u, t, -0.3, 0.75, 0.06, 0.3, 0.08),
      bump(u, t, 0.3, 0.75, 0.06, 0.3, 0.08),
    );
  };
  // The sheet is pulled taut between high points, so smooth the shape out a little.
  return (u, v) => {
    let sum = 0;
    for (const du of [-0.05, 0, 0.05]) for (const dv of [-0.05, 0, 0.05]) sum += shape(u + du, v + dv);
    return sum / 9;
  };
}

// ---------------------------------------------------------------------------------------------
// The pieces. Each is given its width (x), height and depth (z) and builds into the kit's group.

type Builder = (kit: Kit, w: number, h: number, d: number) => void;

// An office desk on steel frames, with a drawer pedestal, a computer and the clutter of a working
// day that ended suddenly. The middle of the top is kept clear: keycards are put there.
const desk: Builder = (kit, w, h, d) => {
  const { group: g, random } = kit;
  const top = 0.035;
  box(g, w, top, d, 0, h - top / 2, 0, wood(kit.color), 0.006);
  const frame = darkSteel();
  for (const side of [-1, 1]) {
    const x = side * (w / 2 - 0.07);
    for (const end of [-1, 1]) box(g, 0.05, h - top, 0.05, x, (h - top) / 2, end * (d / 2 - 0.09), frame);
    box(g, 0.05, 0.03, d - 0.12, x, 0.015, 0, frame);
    box(g, 0.05, 0.04, d - 0.12, x, h - top - 0.02, 0, frame);
  }
  box(g, w - 0.2, h * 0.42, 0.018, 0, h - top - h * 0.21 - 0.02, -d / 2 + 0.1, painted('#5d646b'));
  const px = w / 2 - 0.36;
  const ph = h - top - 0.07;
  box(g, 0.42, ph, d - 0.24, px, 0.04 + ph / 2, -0.02, painted('#6d747a'), 0.004);
  const drawers = [0.16, 0.16, ph - 0.34];
  let y = 0.04 + ph;
  for (const dh of drawers) {
    y -= dh;
    box(g, 0.4, dh - 0.012, 0.018, px, y + dh / 2, (d - 0.24) / 2 - 0.02 + 0.009, painted('#7a8288'), 0.003);
    box(g, 0.16, 0.012, 0.02, px, y + dh - 0.04, (d - 0.24) / 2 - 0.02 + 0.026, chrome());
  }

  const on = random() > 0.2;
  monitor(g, -w * 0.27, h, -d * 0.24, (random() - 0.5) * 0.3, on ? screen(`office${Math.floor(random() * 3)}`, T.officeScreen(Math.floor(random() * 3))) : deadScreen());
  keyboard(g, -w * 0.27, h, d * 0.12, (random() - 0.5) * 0.2);
  for (let i = 0; i < 3; i++) {
    const x = w * 0.2 + random() * (w * 0.3 - 0.18);
    const z = (random() - 0.5) * (d - 0.35);
    const thing = random();
    if (thing < 0.35) paperStack(g, x, h, z, (random() - 0.5) * 0.8, random);
    else if (thing < 0.55) mug(g, x, h, z, pick(random, ['#e8e8e8', '#b3261e', '#1d4f7a', '#2a2a2a']));
    else if (thing < 0.75) phone(g, x, h, z, (random() - 0.5) * 0.6);
    else binder(g, x, h, z, random() * 3, pick(random, ['#1d4f7a', '#8a1a1a', '#1a1a1a', '#2e6b3f']), true);
  }
  if (random() < 0.8) {
    const knocked = random() < 0.25;
    officeChair(g, -w * 0.25 + (random() - 0.5) * 0.4, knocked ? d / 2 + 0.5 : d / 2 + 0.08, knocked ? random() * 6 : Math.PI + (random() - 0.5) * 0.9, fabric('#2b3036'), knocked);
  }
  scatterPapers(kit, w, d, Math.floor(random() * 4));
};

// A reception or nurses' counter: a raised ledge on the public side (+z), a lower worktop with
// computers behind it on the staff side.
const counter: Builder = (kit, w, h, d) => {
  const { group: g, random } = kit;
  const front = laminate(kit.color);
  const groove = laminate(shade(kit.color, -0.35));
  const panelZ = d / 2 - 0.05;
  box(g, w, h - 0.12, 0.04, 0, 0.1 + (h - 0.12) / 2, panelZ, front, 0.004);
  for (let x = -w / 2 + 0.3; x < w / 2 - 0.1; x += 0.3) box(g, 0.012, h - 0.34, 0.004, x, 0.1 + (h - 0.34) / 2 + 0.1, panelZ + 0.021, groove);
  box(g, w + 0.004, 0.05, 0.046, 0, 0.32, panelZ, steel());
  box(g, w - 0.04, 0.1, 0.04, 0, 0.05, panelZ - 0.05, blackPlastic());
  // Light strips: one washing the floor along the kick plinth, one under the ledge for the staff.
  box(g, w - 0.08, 0.012, 0.012, 0, 0.094, panelZ - 0.012, glow('#a8dcff'));
  box(g, w - 0.1, 0.008, 0.02, 0, h - 0.045, d / 2 - 0.29, glow('#ffd9a0'));
  box(g, w + 0.04, 0.04, 0.34, 0, h - 0.02, d / 2 - 0.14, wood('#b48c62'), 0.008);
  for (let x = -w / 2 + 0.4; x < w / 2; x += 0.9) box(g, 0.02, 0.16, 0.16, x, h - 0.12, d / 2 - 0.22, steel());
  for (const side of [-1, 1]) box(g, 0.04, h - 0.04, d - 0.04, side * (w / 2 - 0.02), (h - 0.04) / 2, 0, front, 0.004);
  const work = Math.min(0.76, h - 0.2);
  box(g, w - 0.08, 0.03, d - 0.11, 0, work, -0.025, laminate('#d9d6cf'), 0.004);

  const stations = Math.max(1, Math.floor(w / 1.6));
  for (let i = 0; i < stations; i++) {
    const x = -w / 2 + (w / stations) * (i + 0.5);
    // A drawer pedestal under the worktop against the front panel.
    const pedestalX = x + (i % 2 ? 0.45 : -0.45);
    if (Math.abs(pedestalX) < w / 2 - 0.3) {
      box(g, 0.42, work - 0.04, 0.5, pedestalX, (work - 0.04) / 2 + 0.02, panelZ - 0.27, laminate('#9aa0a4'));
      for (let k = 0; k < 3; k++) box(g, 0.4, (work - 0.08) / 3 - 0.01, 0.016, pedestalX, 0.04 + (k + 0.5) * ((work - 0.08) / 3), panelZ - 0.527, laminate('#b4babe'));
    }
    const on = random() > 0.25;
    monitor(g, x, work + 0.015, panelZ - 0.16, Math.PI + (random() - 0.5) * 0.3, on ? screen(`office${(i + 2) % 3}`, T.officeScreen((i + 2) % 3)) : deadScreen(), 0.5);
    keyboard(g, x, work + 0.015, -d / 2 + 0.2, Math.PI + (random() - 0.5) * 0.2);
    if (random() < 0.6) paperStack(g, x + 0.45, work + 0.015, -d / 2 + 0.25, random() * 3, random);
    if (random() < 0.5) phone(g, x - 0.45, work + 0.015, -0.05, Math.PI + random() - 0.5);
    if (random() < 0.7) officeChair(g, x + (random() - 0.5) * 0.4, -d / 2 - 0.1, (random() - 0.5) * 1.2, fabric('#2b3036'));
  }
  // On the ledge: hand gel, a bell, a clipboard.
  const ledgeY = h;
  const gelX = -w / 2 + 0.3 + random() * (w - 0.6);
  bottle(g, gelX, ledgeY, d / 2 - 0.12, 0.035, 0.18, clearPlastic('#cfe6ef'), whitePlastic());
  box(g, 0.02, 0.05, 0.02, gelX, ledgeY + 0.2, d / 2 - 0.12, whitePlastic());
  const bellX = -w / 2 + 0.3 + random() * (w - 0.6);
  cylinder(g, 0.04, 0.012, bellX, ledgeY + 0.006, d / 2 - 0.15, blackPlastic(), 12);
  place(g, new THREE.SphereGeometry(0.035, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), chrome(), bellX, ledgeY + 0.012, d / 2 - 0.15, false);
  const clip = group(g, -w / 2 + 0.4 + random() * (w - 0.8), ledgeY, d / 2 - 0.14, (random() - 0.5) * 0.6);
  box(clip, 0.23, 0.008, 0.32, 0, 0.004, 0, plain('#6b4a2a', 0.6));
  flat(clip, 0.21, 0.29, 0, 0.0085, 0.01, paperSheet(1));
  box(clip, 0.08, 0.012, 0.03, 0, 0.012, -0.14, chrome());
  scatterPapers(kit, w, d, Math.floor(random() * 3));
};

// A row of waiting-room seats joined on a beam, each with arms between.
const seating: Builder = (kit, w, h, d) => {
  const { group: g, random } = kit;
  const seats = Math.max(1, Math.floor((w - 0.06) / 0.6));
  const pitch = (w - 0.06) / seats;
  const frame = darkSteel();
  box(g, w - 0.06, 0.06, 0.08, 0, 0.34, -0.06, frame);
  for (const side of [-1, 1]) {
    const x = side * (w / 2 - Math.min(0.3, w / 4));
    box(g, 0.06, 0.33, 0.06, x, 0.17, -0.06, frame);
    box(g, 0.07, 0.03, d - 0.2, x, 0.015, -0.02, frame);
    for (const end of [-1, 1]) box(g, 0.07, 0.012, 0.05, x, 0.006, -0.02 + end * (d / 2 - 0.12), rubber());
  }
  const cover = vinyl(kit.color);
  const top = h + 0.12;
  for (let i = 0; i < seats; i++) {
    const x = -w / 2 + 0.03 + pitch * (i + 0.5);
    box(g, pitch - 0.08, 0.07, 0.46, x, 0.44, 0.06, cover, 0.03);
    box(g, 0.06, 0.06, 0.26, x, 0.38, -0.02, frame);
    const back = box(g, pitch - 0.1, top - 0.56, 0.05, x, (top + 0.56) / 2, -0.21, cover, 0.025);
    back.rotation.x = -0.12;
    box(g, 0.04, 0.3, 0.03, x, 0.5, -0.24, frame);
  }
  for (let i = 0; i <= seats; i++) {
    const x = -w / 2 + 0.03 + pitch * i;
    box(g, 0.03, 0.22, 0.03, x, 0.52, 0.0, frame);
    box(g, 0.055, 0.03, 0.34, x, 0.645, 0.02, blackPlastic(), 0.012);
  }
  // Things left behind in a hurry.
  if (random() < 0.7) {
    const x = -w / 2 + 0.03 + pitch * (Math.floor(random() * seats) + 0.5);
    const magazine = group(g, x, 0.478, 0.08, random() * 3);
    box(magazine, 0.21, 0.006, 0.28, 0, 0.003, 0, plain(pick(random, ['#c43c2c', '#2c6cc4', '#d8a020']), 0.5));
  }
  if (random() < 0.5) {
    const x = -w / 2 + 0.03 + pitch * (Math.floor(random() * seats) + 0.5);
    box(g, 0.3, 0.22, 0.12, x, 0.59, 0.05, plain(pick(random, ['#4a2a1e', '#1c1c1c', '#5a4a3a']), 0.7), 0.04);
  }
  if (random() < 0.5) {
    const cup = group(g, (random() - 0.5) * w, 0, d / 2 + 0.25, 0);
    cup.rotation.z = Math.PI / 2;
    cylinder(cup, 0.032, 0.1, 0.035, 0.05, 0, plain('#f0ece4', 0.6), 10, 0.042);
  }
};

// Steel filing cabinets, or a tall cupboard with doors below and binders on open shelves above
// when the piece is deep enough.
const cabinet: Builder = (kit, w, h, d) => {
  const { group: g, random } = kit;
  const body = painted(kit.color);
  const face = painted(shade(kit.color, 0.15));
  if (d < 0.7) {
    const units = Math.max(1, Math.round(w / 0.5));
    const uw = w / units;
    const drawers = Math.max(2, Math.round((h - 0.08) / 0.42));
    const dh = (h - 0.1) / drawers;
    for (let i = 0; i < units; i++) {
      const x = -w / 2 + uw * (i + 0.5);
      box(g, uw - 0.012, h - 0.06, d - 0.03, x, 0.06 + (h - 0.06) / 2, -0.015, body, 0.008);
      box(g, uw - 0.03, 0.06, d - 0.08, x, 0.03, -0.02, blackPlastic());
      const open = random() < 0.4 ? Math.floor(random() * drawers) : -1;
      for (let j = 0; j < drawers; j++) {
        const pulled = j === open ? 0.18 + random() * 0.2 : 0;
        const y = 0.08 + dh * (j + 0.5);
        const z = d / 2 + 0.0125 + pulled;
        box(g, uw - 0.05, dh - 0.022, 0.025, x, y, z - 0.015, face, 0.005);
        box(g, uw * 0.42, 0.016, 0.022, x, y + dh * 0.18, z + 0.008, chrome());
        box(g, 0.1, 0.05, 0.004, x, y - dh * 0.12, z + 0.0, chrome());
        plane(g, 0.088, 0.04, x, y - dh * 0.12, z + 0.0022, plain('#efece2', 0.8));
        if (pulled > 0) {
          for (const side of [-1, 1]) box(g, 0.01, dh * 0.7, pulled, x + side * (uw / 2 - 0.04), y - dh * 0.05, d / 2 + pulled / 2 - 0.03, body);
          for (let f = 0; f < 7; f++) {
            const folder = box(g, uw - 0.1, dh * 0.62, 0.006, x, y + dh * 0.02, d / 2 - 0.02 + f * (pulled / 7.5), plain(pick(random, ['#d4b36e', '#c9a75e', '#7fa86a', '#c46a5a']), 0.8));
            folder.rotation.x = (random() - 0.5) * 0.25;
          }
        }
      }
    }
    if (h > 1.5) {
      for (let i = 0; i < 2; i++) {
        if (random() < 0.45) continue;
        const archive = box(g, 0.4, 0.27, 0.3, -w / 4 + i * (w / 2) + (random() - 0.5) * 0.15, h + 0.135, (random() - 0.5) * 0.1, cardboardMaterial());
        archive.rotation.y = (random() - 0.5) * 0.3;
      }
    }
    scatterPapers(kit, w, d, Math.floor(random() * 5));
    return;
  }

  const units = Math.max(1, Math.round(w / 0.9));
  const uw = w / units;
  const lower = 0.86;
  box(g, w, h - 0.06, 0.02, 0, 0.06 + (h - 0.06) / 2, -d / 2 + 0.01, body);
  box(g, w, 0.025, d, 0, h - 0.0125, 0, body, 0.004);
  box(g, w - 0.04, 0.06, d - 0.06, 0, 0.03, -0.02, blackPlastic());
  for (let i = 0; i <= units; i++) box(g, 0.022, h - 0.06, d, -w / 2 + 0.011 + i * ((w - 0.022) / units), 0.06 + (h - 0.06) / 2, 0, body);
  for (let i = 0; i < units; i++) {
    const x = -w / 2 + uw * (i + 0.5);
    box(g, uw - 0.02, 0.022, d - 0.03, x, lower, 0, body);
    for (const side of [-1, 1]) {
      const door = box(g, uw / 2 - 0.018, lower - 0.09, 0.02, x + side * (uw / 4 - 0.002), 0.06 + (lower - 0.09) / 2 + 0.01, d / 2 - 0.01, face, 0.004);
      door.receiveShadow = true;
      box(g, 0.016, 0.16, 0.022, x + side * 0.04, lower - 0.2, d / 2 + 0.012, chrome());
    }
    for (let shelf = lower + 0.42; shelf < h - 0.15; shelf += 0.42) box(g, uw - 0.03, 0.02, d - 0.04, x, shelf, -0.01, body);
    for (let shelf = lower + 0.011; shelf < h - 0.3; shelf += 0.42) {
      let cursor = x - uw / 2 + 0.04;
      while (cursor < x + uw / 2 - 0.08) {
        if (random() < 0.12) {
          cursor += 0.1 + random() * 0.15;
          continue;
        }
        const color = pick(random, ['#1d4f7a', '#8a1a1a', '#1a1a1a', '#2e6b3f', '#b8902a', '#5a5f66']);
        const run = 2 + Math.floor(random() * 5);
        for (let k = 0; k < run && cursor < x + uw / 2 - 0.08; k++) {
          const spine = box(g, 0.055, 0.31, d - 0.14, cursor + 0.0275, shelf + 0.165, 0, plain(color, 0.5), 0.004);
          if (random() < 0.12) spine.rotation.z = 0.25;
          cursor += 0.058;
        }
      }
    }
  }
  scatterPapers(kit, w, d, Math.floor(random() * 3));
};

// A pharmacy gondola: shelves on both sides of a central spine, half looted.
const shelf: Builder = (kit, w, h, d) => {
  const { group: g, random } = kit;
  const body = painted(shade(kit.color, 0.25));
  box(g, w, 0.1, d, 0, 0.05, 0, painted(kit.color), 0.004);
  box(g, w - 0.04, h - 0.1, 0.03, 0, 0.1 + (h - 0.1) / 2, 0, body);
  const bays = Math.max(1, Math.round(w / 1));
  for (let i = 0; i <= bays; i++) box(g, 0.04, h - 0.1, 0.07, -w / 2 + 0.02 + i * ((w - 0.04) / bays), 0.1 + (h - 0.1) / 2, 0, darkSteel());
  const levels = [0.1, 0.5, 0.9, 1.3, 1.7];
  const strip = standard('priceStrip', { color: '#e8e6dc', roughness: 0.6 });
  for (const side of [-1, 1]) {
    for (const y of levels) {
      const depth = d / 2 - 0.04;
      if (y > 0.2) box(g, w - 0.03, 0.02, depth, 0, y, side * (0.015 + depth / 2), body);
      box(g, w - 0.03, 0.04, 0.012, 0, y + 0.01, side * (d / 2 - 0.02), strip);
      let cursor = -w / 2 + 0.05;
      const room = (y === 1.7 ? h - y : 0.4) - 0.04;
      while (cursor < w / 2 - 0.12) {
        const roll = random();
        if (roll < 0.22) {
          cursor += 0.15 + random() * 0.35;
          continue;
        }
        if (roll < 0.62) {
          const bw = 0.07 + random() * 0.08;
          const bh = Math.min(room, 0.06 + random() * 0.12);
          const bd = 0.1 + random() * 0.1;
          const run = 1 + Math.floor(random() * 4);
          for (let k = 0; k < run && cursor < w / 2 - 0.12; k++) {
            const toppled = random() < 0.08;
            const mesh = drugBox(g, toppled ? bh : bw, toppled ? bw : bh, bd, cursor + bw / 2, y + 0.011 + (toppled ? bw : bh) / 2, side * (d / 2 - 0.05 - bd / 2), random, (random() - 0.5) * 0.12);
            if (side < 0) mesh.rotation.y += Math.PI;
            cursor += bw + 0.008;
          }
        } else {
          const radius = 0.022 + random() * 0.018;
          const height = Math.min(room, 0.08 + random() * 0.08);
          const plastic = pick(random, [plain('#6b3a14', 0.25), plain('#f0f0ec', 0.4), plain('#e8eef0', 0.3)]);
          const cap = pick(random, [plain('#f2f2f2', 0.5), plain('#1d4f7a', 0.5), plain('#c43c2c', 0.5)]);
          const run = 2 + Math.floor(random() * 5);
          for (let k = 0; k < run && cursor < w / 2 - 0.12; k++) {
            bottle(g, cursor + radius, y + 0.011, side * (d / 2 - 0.06 - radius), radius, height, plastic, cap);
            cursor += radius * 2 + 0.006;
          }
        }
        cursor += 0.01;
      }
    }
  }
  // Boxes knocked off onto the floor.
  for (let i = 0; i < 6; i++) {
    const side = random() < 0.5 ? -1 : 1;
    drugBox(g, 0.09, 0.06, 0.14, (random() - 0.5) * w, 0.03, side * (d / 2 + 0.1 + random() * 0.5), random, random() * Math.PI);
  }
};

// A laboratory island: cupboards and drawers on both sides, a black epoxy top, and glassware,
// a microscope, a centrifuge and a sink on it.
const lab: Builder = (kit, w, h, d) => {
  const { group: g, random } = kit;
  const top = 0.03;
  box(g, w - 0.1, 0.1, d - 0.14, 0, 0.05, 0, blackPlastic());
  box(g, w - 0.04, h - top - 0.1, d - 0.08, 0, 0.1 + (h - top - 0.1) / 2, 0, laminate('#d6d9d6'));
  box(g, w, top, d, 0, h - top / 2, 0, epoxy(), 0.004);
  const units = Math.max(1, Math.round(w / 0.6));
  const uw = (w - 0.04) / units;
  const front = laminate(kit.color);
  const body = h - top - 0.1;
  for (const side of [-1, 1]) {
    const z = side * ((d - 0.08) / 2 + 0.011);
    for (let i = 0; i < units; i++) {
      const x = -w / 2 + 0.02 + uw * (i + 0.5);
      const kind = (i + (side > 0 ? 0 : 1)) % 3;
      const fronts = kind === 0 ? [body / 3, body / 3, body / 3] : [body];
      let y = 0.1;
      for (const fh of fronts) {
        box(g, uw - 0.012, fh - 0.012, 0.02, x, y + fh / 2, z, front, 0.004);
        const handleY = kind === 0 ? y + fh - 0.05 : y + fh - 0.1;
        bar(g, [x - uw * 0.18, handleY, z + side * 0.035], [x + uw * 0.18, handleY, z + side * 0.035], 0.006, chrome(), 6);
        for (const end of [-1, 1]) box(g, 0.01, 0.01, 0.03, x + end * uw * 0.18, handleY, z + side * 0.02, chrome());
        y += fh;
      }
    }
  }
  // Along the top, from one end to the other.
  const glassware = glass();
  const items = Math.max(3, Math.floor(w / 0.75));
  for (let i = 0; i < items; i++) {
    const x = -w / 2 + (w / items) * (i + 0.5) + (random() - 0.5) * 0.2;
    const z = (random() - 0.5) * (d - 0.4);
    const kind = i === 0 ? 'sink' : i === items - 1 ? 'microscope' : pick(random, ['tubes', 'flasks', 'centrifuge', 'tubes', 'bins', 'flasks'] as const);
    if (kind === 'sink') {
      box(g, 0.46, 0.006, 0.38, x, h + 0.003, 0, steel());
      box(g, 0.4, 0.002, 0.32, x, h + 0.0065, 0, plain('#15181a', 0.3));
      tube(g, [[x, h, -0.17], [x, h + 0.3, -0.17], [x, h + 0.38, -0.08], [x, h + 0.3, 0.0]], 0.012, chrome(), 8);
      for (const side of [-1, 1]) cylinder(g, 0.018, 0.06, x + side * 0.12, h + 0.03, -0.17, chrome(), 8);
    } else if (kind === 'microscope') {
      const scope = group(g, x, h, z, (random() - 0.5) * 1.2);
      box(scope, 0.2, 0.04, 0.26, 0, 0.02, 0, whitePlastic(), 0.01);
      box(scope, 0.07, 0.3, 0.08, 0, 0.18, -0.09, whitePlastic(), 0.015);
      box(scope, 0.14, 0.015, 0.14, 0, 0.14, 0.01, blackPlastic());
      cylinder(scope, 0.045, 0.04, 0, 0.24, 0.01, blackPlastic(), 12);
      const head = box(scope, 0.08, 0.08, 0.12, 0, 0.34, -0.04, whitePlastic(), 0.015);
      head.rotation.x = 0.3;
      for (const side of [-1, 1]) {
        const eyepiece = cylinder(scope, 0.013, 0.08, side * 0.025, 0.4, 0.03, blackPlastic(), 8);
        eyepiece.rotation.x = 0.6;
      }
      for (const side of [-1, 1]) cylinder(scope, 0.025, 0.02, side * 0.06, 0.1, -0.09, greyPlastic(), 10).rotation.z = Math.PI / 2;
    } else if (kind === 'tubes') {
      const rack = group(g, x, h, z, (random() - 0.5) * 0.5);
      box(rack, 0.26, 0.06, 0.1, 0, 0.03, 0, whitePlastic());
      for (let k = 0; k < 10; k++) {
        if (random() < 0.2) continue;
        const color = pick(random, ['#7a0c10', '#7a0c10', '#d8c040', '#e8e8e8', '#5a1a6a']);
        cylinder(rack, 0.007, 0.07, -0.11 + k * 0.0245, 0.075, 0, plain(color, 0.25), 6);
        cylinder(rack, 0.008, 0.018, -0.11 + k * 0.0245, 0.118, 0, plain(pick(random, ['#c43c2c', '#7a3ac4', '#e8d040', '#2c8c4c']), 0.5), 6);
      }
    } else if (kind === 'flasks') {
      for (let k = 0; k < 3; k++) {
        const fx = x + (k - 1) * 0.13;
        const fz = z + (random() - 0.5) * 0.15;
        const tall = random() < 0.5;
        const profile = tall
          ? [[0, 0], [0.05, 0], [0.05, 0.13], [0.048, 0.135], [0, 0.135]]
          : [[0, 0], [0.065, 0], [0.068, 0.01], [0.03, 0.12], [0.018, 0.13], [0.018, 0.18], [0, 0.18]];
        place(g, new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 14), glassware, fx, h, fz, false);
        const fill = 0.03 + random() * 0.05;
        const liquid = tall ? 0.047 : 0.06 - fill * 0.3;
        cylinder(g, liquid, fill, fx, h + fill / 2 + 0.002, fz, plain(pick(random, ['#3a8ac4', '#c4a43a', '#8a1a1a', '#3ac47a']), 0.15), 12, tall ? liquid : liquid * 0.8);
      }
    } else if (kind === 'centrifuge') {
      cylinder(g, 0.17, 0.2, x, h + 0.1, z, whitePlastic(), 18);
      cylinder(g, 0.15, 0.04, x, h + 0.22, z, greyPlastic(), 18, 0.13);
      plane(g, 0.1, 0.05, x, h + 0.13, z + 0.172, screen('analyser', T.analyserScreen(), 0.8));
    } else {
      box(g, 0.14, 0.2, 0.12, x, h + 0.1, z, plain('#f2c200', 0.5), 0.01);
      box(g, 0.15, 0.03, 0.13, x, h + 0.215, z, plain('#c43c2c', 0.5), 0.008);
      plane(g, 0.08, 0.08, x, h + 0.1, z + 0.061, label(T.biohazard(), 'biohazard'));
    }
  }
  if (random() < 0.6) paperStack(g, (random() - 0.5) * (w - 0.6), h, (random() - 0.5) * 0.3, random() * 3, random);
};

// Glass-fronted medical fridges in a row, lit inside, full of blood bags and samples. The
// readouts show they have been warming up for a while.
const fridge: Builder = (kit, w, h, d) => {
  const { group: g, random } = kit;
  const units = Math.max(1, Math.round(w / 0.75));
  const uw = w / units;
  const enamel = painted(kit.color);
  const frame = greyPlastic();
  const inside = standard('fridgeInside', { color: '#c8d4dc', roughness: 0.5, emissive: '#9ec8e6', emissiveIntensity: 0.55 });
  const wire = chrome();
  for (let i = 0; i < units; i++) {
    const x = -w / 2 + uw * (i + 0.5);
    const base = 0.2;
    const head = 0.2;
    const inner = h - base - head;
    for (const side of [-1, 1]) box(g, 0.04, h, d - 0.04, x + side * (uw / 2 - 0.02), h / 2, -0.02, enamel, 0.006);
    box(g, uw, base, d - 0.04, x, base / 2, -0.02, enamel, 0.006);
    box(g, uw, head, d - 0.04, x, h - head / 2, -0.02, enamel, 0.006);
    box(g, uw - 0.08, inner, 0.02, x, base + inner / 2, -d / 2 + 0.03, inside);
    plane(g, uw - 0.1, 0.1, x, 0.1, d / 2 - 0.035, standard('slats', { map: T.ventSlats(), roughness: 0.7 }));
    plane(g, 0.18, 0.068, x - uw * 0.15, h - head / 2, d / 2 - 0.038, screen('fridge', T.fridgeDisplay(), 1.2));
    box(g, 0.012, 0.012, 0.004, x + uw * 0.2, h - head / 2, d / 2 - 0.037, glow('#ff8a1a'));
    // Wire shelves and what is on them.
    const shelves = Math.max(3, Math.round(inner / 0.32));
    for (let s = 0; s < shelves; s++) {
      const y = base + 0.02 + s * (inner / shelves);
      box(g, uw - 0.1, 0.01, d - 0.14, x, y, -0.03, wire);
      const contents = random();
      const room = inner / shelves - 0.04;
      if (contents < 0.4) {
        for (let k = 0; k < Math.floor((uw - 0.14) / 0.075); k++) {
          if (random() < 0.15) continue;
          const bag = box(g, 0.065, Math.min(room, 0.17), 0.03, x - uw / 2 + 0.1 + k * 0.075, y + 0.005 + Math.min(room, 0.17) / 2, -0.05 + (random() - 0.5) * 0.1, plain('#6a080c', 0.18), 0.012);
          bag.rotation.x = -0.15;
        }
      } else if (contents < 0.75) {
        for (let k = 0; k < Math.floor((uw - 0.14) / 0.14); k++) {
          drugBox(g, 0.12, Math.min(room, 0.08), 0.16, x - uw / 2 + 0.12 + k * 0.14, y + 0.005 + Math.min(room, 0.08) / 2, -0.03, random, (random() - 0.5) * 0.2);
        }
      } else {
        const rack = group(g, x, y + 0.005, -0.04, 0);
        box(rack, uw - 0.2, 0.04, 0.1, 0, 0.02, 0, plain('#3a6ac4', 0.5));
        for (let k = 0; k < Math.floor((uw - 0.22) / 0.03); k++) cylinder(rack, 0.008, 0.08, -(uw - 0.22) / 2 + k * 0.03, 0.06, 0, plain(pick(random, ['#7a0c10', '#d8c040', '#e8e8e8']), 0.25), 6);
      }
    }
    // The door: a dark frame round a pane of glass, slightly open on some.
    const ajar = random() < 0.25 ? 0.35 + random() * 0.5 : 0;
    const door = group(g, x - uw / 2 + 0.025, 0, d / 2 - 0.02, -ajar);
    const doorWidth = uw - 0.05;
    for (const side of [0, 1]) box(door, 0.045, inner + 0.02, 0.04, side * (doorWidth - 0.045) + 0.0225, base + inner / 2, 0, frame, 0.006);
    for (const y of [base, base + inner]) box(door, doorWidth, 0.045, 0.04, doorWidth / 2, y, 0, frame, 0.006);
    box(door, doorWidth - 0.09, inner - 0.04, 0.008, doorWidth / 2, base + inner / 2, 0, glass());
    box(door, 0.022, inner * 0.45, 0.03, doorWidth - 0.08, base + inner / 2, 0.035, chrome(), 0.008);
  }
};

// A floor-standing chemistry analyser: a cabinet base, a sample carousel under a hood, and a
// touchscreen on an arm, halted mid-run.
const analyser: Builder = (kit, w, h, d) => {
  const { group: g, random } = kit;
  const shell = whitePlastic();
  const trim = painted(kit.color);
  const deck = 0.82;
  box(g, w - 0.04, 0.06, d - 0.1, 0, 0.03, 0, blackPlastic());
  box(g, w - 0.04, deck - 0.06, d - 0.06, 0, 0.06 + (deck - 0.06) / 2, 0, shell, 0.03);
  for (const side of [-1, 1]) box(g, 0.004, deck - 0.2, 0.004, side * 0.002, 0.1 + (deck - 0.2) / 2, d / 2 - 0.028, blackPlastic());
  box(g, w - 0.1, 0.018, 0.006, 0, deck - 0.06, d / 2 - 0.03, glow('#3aa8ff'));
  box(g, w - 0.04, 0.04, d - 0.06, 0, deck + 0.02, 0, trim, 0.01);
  // The hood over the back half, with a window into it.
  const hoodDepth = d * 0.55;
  box(g, w - 0.04, h - deck - 0.04, hoodDepth, 0, deck + 0.04 + (h - deck - 0.04) / 2, -d / 2 + 0.03 + hoodDepth / 2, shell, 0.04);
  box(g, w * 0.6, (h - deck) * 0.5, 0.01, -w * 0.08, deck + 0.04 + (h - deck) * 0.45, -d / 2 + 0.03 + hoodDepth + 0.002, glass());
  plane(g, 0.16, 0.16, w / 2 - 0.2, deck + (h - deck) * 0.6, -d / 2 + 0.035 + hoodDepth, label(T.biohazard(), 'biohazard'));
  // The carousel of sample tubes on the open deck.
  const carouselZ = d / 2 - 0.3;
  cylinder(g, 0.24, 0.05, -w * 0.15, deck + 0.065, carouselZ, greyPlastic(), 24);
  for (let k = 0; k < 20; k++) {
    if (random() < 0.2) continue;
    const a = (k / 20) * Math.PI * 2;
    cylinder(g, 0.008, 0.09, -w * 0.15 + Math.cos(a) * 0.2, deck + 0.13, carouselZ + Math.sin(a) * 0.2, plain(pick(random, ['#7a0c10', '#d8c040', '#e8e8e8']), 0.25), 6);
  }
  // The gantry that moves the probe, stopped over the carousel.
  bar(g, [-w / 2 + 0.06, deck + 0.34, carouselZ - 0.05], [w / 2 - 0.06, deck + 0.34, carouselZ - 0.05], 0.018, steel(), 10);
  box(g, 0.08, 0.1, 0.08, -w * 0.15 + 0.15, deck + 0.34, carouselZ - 0.05, greyPlastic(), 0.01);
  cylinder(g, 0.004, 0.16, -w * 0.15 + 0.15, deck + 0.21, carouselZ - 0.05, chrome(), 6);
  // The touchscreen.
  const arm = group(g, w / 2 - 0.22, deck + 0.04, d / 2 - 0.16, -0.35);
  box(arm, 0.04, 0.2, 0.04, 0, 0.1, 0, greyPlastic());
  const panel = group(arm, 0, 0.26, 0.02, 0);
  panel.rotation.x = -0.45;
  box(panel, 0.34, 0.24, 0.03, 0, 0, 0, greyPlastic(), 0.01);
  plane(panel, 0.31, 0.21, 0, 0, 0.016, screen('analyser', T.analyserScreen()));
};

// Wheeled carts in a row: a red crash cart with a defibrillator on top, a blue medication cart.
const cart: Builder = (kit, w, h, d) => {
  const { group: g, random } = kit;
  const units = Math.max(1, Math.round(w / 0.85));
  const uw = w / units;
  for (let i = 0; i < units; i++) {
    const x = -w / 2 + uw * (i + 0.5);
    const crash = i % 2 === 0;
    const color = crash ? '#a8242a' : '#2f5d8a';
    const shell = painted(color);
    const fronts = painted(shade(color, 0.12));
    const bodyTop = h - 0.04;
    const bottom = 0.13;
    box(g, uw - 0.12, bodyTop - bottom, d - 0.14, x, bottom + (bodyTop - bottom) / 2, 0, shell, 0.02);
    const drawers = 5;
    const dh = (bodyTop - bottom - 0.04) / drawers;
    const open = random() < 0.5 ? Math.floor(random() * drawers) : -1;
    for (let k = 0; k < drawers; k++) {
      const y = bottom + 0.02 + dh * (k + 0.5);
      const pulled = k === open ? 0.12 + random() * 0.12 : 0;
      box(g, uw - 0.16, dh - 0.014, 0.02, x, y, (d - 0.14) / 2 + 0.01 + pulled, fronts, 0.005);
      box(g, uw * 0.5, 0.012, 0.012, x, y + dh * 0.28, (d - 0.14) / 2 + 0.024 + pulled, blackPlastic());
      if (pulled) for (let s = 0; s < 4; s++) drugBox(g, 0.1, dh * 0.5, 0.08, x - uw * 0.25 + s * 0.13, y + 0.01, (d - 0.14) / 2 - 0.05 + pulled, random);
    }
    box(g, uw - 0.06, 0.03, d - 0.08, x, bodyTop + 0.015, 0, greyPlastic(), 0.008);
    for (const side of [-1, 1]) {
      box(g, uw - 0.06, 0.03, 0.012, x, bodyTop + 0.045, side * (d / 2 - 0.046), greyPlastic());
      box(g, 0.012, 0.03, d - 0.08, x + side * (uw / 2 - 0.036), bodyTop + 0.045, 0, greyPlastic());
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) caster(g, x + sx * (uw / 2 - 0.12), sz * (d / 2 - 0.12), 0.04);
    bar(g, [x + uw / 2 - 0.06, bodyTop - 0.05, -d / 2 + 0.12], [x + uw / 2 - 0.06, bodyTop - 0.05, d / 2 - 0.12], 0.014, chrome());
    if (crash) {
      const defib = group(g, x - 0.05, bodyTop + 0.03, 0, (random() - 0.5) * 0.3);
      box(defib, 0.32, 0.18, 0.26, 0, 0.09, 0, plain('#e8a020', 0.5), 0.03);
      plane(defib, 0.14, 0.09, -0.06, 0.12, 0.131, screen('ecg', T.ecgScreen()));
      for (const side of [-1, 1]) box(defib, 0.07, 0.04, 0.11, side * 0.12, 0.2, 0.0, greyPlastic(), 0.015);
      box(g, uw * 0.7, h * 0.75, 0.02, x, bottom + h * 0.4, -d / 2 + 0.06, plain('#e06a1a', 0.5), 0.01);
      cylinder(g, 0.05, 0.5, x + uw / 2 - 0.08, 0.5, -d / 2 + 0.14, plain('#2c7a3c', 0.4), 12);
    } else {
      for (let k = 0; k < 4; k++) box(g, 0.14, 0.08, 0.18, x - uw / 2 + 0.14 + k * 0.17, bodyTop + 0.07, (random() - 0.5) * 0.2, plain(pick(random, ['#f2c200', '#3a8ac4', '#e8e8e8', '#c43c2c']), 0.5), 0.01);
      box(g, 0.14, 0.2, 0.1, x + uw / 2 - 0.12, bodyTop + 0.13, -d / 2 + 0.12, plain('#f2c200', 0.5), 0.01);
    }
  }
};

// A hospital bed: a wheeled base, a mattress made up with a sheet and pillow, rails, a head and
// foot board with the patient's chart, and a drip stand at the head. Head toward -z.
const bed: Builder = (kit, w, h, d) => {
  const { group: g, random } = kit;
  const frame = painted('#c8ccce');
  box(g, w * 0.5, 0.1, d - 0.5, 0, 0.17, 0, darkSteel(), 0.02);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) caster(g, sx * (w / 2 - 0.14), sz * (d / 2 - 0.2), 0.055);
  box(g, 0.06, 0.04, d - 0.3, 0, 0.12, 0, darkSteel());
  for (const z of [-0.45, 0.45]) cylinder(g, 0.06, h - 0.5, 0, 0.22 + (h - 0.5) / 2, z * (d / 2), rubber(), 10);
  box(g, w - 0.1, 0.06, d - 0.2, 0, h - 0.2, 0, frame, 0.01);
  const mattressTop = h - 0.03;
  box(g, w - 0.14, 0.14, d - 0.3, 0, mattressTop - 0.07, 0.02, vinyl('#3e6f8a'), 0.05);
  const bloody = random() < 0.45;
  const sheetMaterial = cloth('#f4f4f0', bloody);
  place(g, drape(w - 0.14, d - 0.4, 0.12, random, 0.008), sheetMaterial, 0, mattressTop + 0.004, 0.05, true);
  const pillow = box(g, w * 0.56, 0.12, 0.36, (random() - 0.5) * 0.08, mattressTop + 0.06, -d / 2 + 0.38, cloth('#f4f4f0', false), 0.05);
  pillow.rotation.set(-0.12, (random() - 0.5) * 0.3, (random() - 0.5) * 0.1);
  // A blanket thrown back over the foot.
  const blanket = place(g, drape(w - 0.1, 0.6, 0.16, random, 0.025), cloth('#7d9fc2', false), 0, mattressTop + 0.03, d / 2 - 0.5, true);
  blanket.rotation.y = (random() - 0.5) * 0.15;
  // Head and foot boards.
  const board = laminate('#d8d2c4');
  const trim = painted('#8a9298');
  box(g, w - 0.04, 0.6, 0.05, 0, h - 0.18 + 0.3, -d / 2 + 0.05, board, 0.02);
  bar(g, [-(w / 2 - 0.04), h + 0.44, -d / 2 + 0.05], [w / 2 - 0.04, h + 0.44, -d / 2 + 0.05], 0.02, trim);
  box(g, w - 0.04, 0.42, 0.05, 0, h - 0.18 + 0.21, d / 2 - 0.05, board, 0.02);
  bar(g, [-(w / 2 - 0.04), h + 0.26, d / 2 - 0.05], [w / 2 - 0.04, h + 0.26, d / 2 - 0.05], 0.02, trim);
  const chart = group(g, (random() - 0.5) * 0.2, h + 0.06, d / 2 - 0.02, 0);
  chart.rotation.x = 0.08;
  box(chart, 0.24, 0.32, 0.01, 0, 0, 0, plain('#3a3f44', 0.5));
  plane(chart, 0.21, 0.28, 0, -0.01, 0.0055, paperSheet(1));
  // Side rails, one per side lowered on some beds.
  for (const side of [-1, 1]) {
    const lowered = random() < 0.35;
    const y = lowered ? mattressTop - 0.1 : mattressTop + 0.13;
    for (const [from, to] of [[-d / 2 + 0.2, -0.05], [0.05, d / 2 - 0.35]]) {
      const x = side * (w / 2 - 0.025);
      bar(g, [x, y + 0.11, from], [x, y + 0.11, to], 0.014, trim);
      bar(g, [x, y - 0.05, from], [x, y - 0.05, to], 0.01, trim);
      for (let k = 0; k <= 3; k++) {
        const z = from + ((to - from) * k) / 3;
        bar(g, [x, y - 0.05, z], [x, y + 0.11, z], 0.008, trim);
      }
    }
  }
  // The drip and, on half the beds, the monitor that went on beeping after everyone left.
  dripStand(g, w / 2 + 0.05, -d / 2 + 0.25, random, [w * 0.15, mattressTop + 0.05, -d / 2 + 0.6], random() < 0.5);
  if (bloody && random() < 0.6) bloodOnFloor(kit, (random() < 0.5 ? -1 : 1) * (w / 2 + 0.3), (random() - 0.5) * d * 0.6, 0.9 + random() * 0.5);
};

// A transport trolley. Some have someone on them under a sheet; the others have the head raised
// and a crumpled sheet. Head toward -z.
const gurney: Builder = (kit, w, h, d) => {
  const { group: g, random } = kit;
  const shell = whitePlastic();
  box(g, w * 0.62, 0.12, d - 0.5, 0, 0.21, 0, shell, 0.04);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) caster(g, sx * (w / 2 - 0.13), sz * (d / 2 - 0.2), 0.06);
  for (const z of [-0.35, 0.35]) box(g, 0.12, h - 0.42, 0.1, 0, 0.27 + (h - 0.42) / 2, z, steel(), 0.02);
  cylinder(g, 0.05, 0.62, 0, 0.32, 0, plain('#2c7a3c', 0.4), 12).rotation.x = Math.PI / 2;
  const frameY = h - 0.16;
  box(g, w - 0.1, 0.05, d - 0.2, 0, frameY, 0, painted('#c8ccce'), 0.01);
  for (const side of [-1, 1]) bar(g, [side * (w / 2 - 0.02), frameY + 0.02, -d * 0.3], [side * (w / 2 - 0.02), frameY + 0.02, d * 0.3], 0.012, chrome());
  // Push handles at the head.
  tube(g, [[-(w / 2 - 0.1), frameY, -d / 2 + 0.1], [-(w / 2 - 0.1), frameY + 0.18, -d / 2 + 0.02], [w / 2 - 0.1, frameY + 0.18, -d / 2 + 0.02], [w / 2 - 0.1, frameY, -d / 2 + 0.1]], 0.014, chrome(), 8);
  const pad = vinyl('#23314a');
  const padY = frameY + 0.065;
  const occupied = random() < 0.6;
  const legLength = d - 0.95;
  box(g, w - 0.2, 0.08, legLength, 0, padY, d / 2 - 0.12 - legLength / 2, pad, 0.03);
  const back = group(g, 0, padY, d / 2 - 0.12 - legLength - 0.01, 0);
  back.rotation.x = occupied ? 0 : 0.45;
  box(back, w - 0.2, 0.08, 0.68, 0, 0, -0.34, pad, 0.03);
  const top = padY + 0.04;
  if (occupied) {
    const length = d - 0.2;
    place(g, drape(w - 0.2, length, 0.22, random, 0.006, bodyUnderSheet(length), 0.14), cloth('#f2f2ee', random() < 0.75), 0, top + 0.003, -0.01, true);
    if (random() < 0.7) bloodOnFloor(kit, (random() - 0.5) * w * 0.6, (random() - 0.5) * d * 0.5, 0.8 + random() * 0.5);
  } else {
    place(g, drape(w - 0.2, legLength - 0.1, 0.1, random, 0.03), cloth('#f2f2ee', random() < 0.4), 0, top + 0.004, d / 2 - 0.12 - legLength / 2, true);
  }
};

// An operating table on its column, its pads in sections, arm boards out, a green drape over it,
// and the twin-headed theatre lamp from the ceiling above it. Head toward -z.
const operating: Builder = (kit, w, h, d) => {
  const { group: g, random } = kit;
  const cream = painted('#d9d5c8');
  box(g, 0.56, 0.1, 0.95, 0, 0.05, 0.25, cream, 0.04);
  box(g, 0.3, h - 0.32, 0.4, 0, 0.1 + (h - 0.32) / 2, 0.12, steel(), 0.03);
  box(g, 0.34, 0.06, 0.44, 0, 0.13, 0.12, cream, 0.02);
  box(g, 0.56, 0.06, d - 0.6, 0, h - 0.17, 0, steel(), 0.01);
  const pad = vinyl('#1c2026');
  const sections = [0.32, 0.72, 0.5, d - 0.2 - 0.32 - 0.72 - 0.5];
  let z = -d / 2 + 0.1;
  for (const length of sections) {
    box(g, 0.52, 0.075, length - 0.015, 0, h - 0.1, z + length / 2, pad, 0.028);
    for (const side of [-1, 1]) bar(g, [side * 0.285, h - 0.15, z + 0.05], [side * 0.285, h - 0.15, z + length - 0.05], 0.01, chrome());
    z += length;
  }
  for (const side of [-1, 1]) {
    const length = w / 2 - 0.27;
    box(g, length, 0.04, 0.17, side * (0.27 + length / 2), h - 0.09, -d / 2 + 0.75, pad, 0.015);
    box(g, 0.03, 0.03, 0.05, side * (0.28 + length * 0.8), h - 0.13, -d / 2 + 0.75, steel());
  }
  // The anaesthetic screen at the head, with drapes over the patient's half.
  tube(g, [[-0.3, h - 0.15, -d / 2 + 0.55], [-0.3, h + 0.35, -d / 2 + 0.55], [0.3, h + 0.35, -d / 2 + 0.55], [0.3, h - 0.15, -d / 2 + 0.55]], 0.01, chrome(), 6);
  const drapeGreen = cloth('#3f8a6c', true);
  const sheetOver = place(g, drape(0.52, 1.4, 0.32, random, 0.012), drapeGreen, 0, h - 0.06, 0.25, true);
  sheetOver.rotation.y = (random() - 0.5) * 0.08;
  const hanging = place(g, drape(0.01, 0.7, 0.45, random, 0.01), drapeGreen, 0, h + 0.36, -d / 2 + 0.55, false);
  hanging.rotation.y = Math.PI / 2;
  bloodOnFloor(kit, (random() - 0.5) * 0.6, (random() - 0.5) * 0.8, 1.6);
  bloodOnFloor(kit, (random() < 0.5 ? -1 : 1) * (w / 2 + 0.4), (random() - 0.5) * 1.2, 0.7);

  // The lamp, hung from the ceiling to one side so it clears the room's own light fitting.
  const mountX = -0.75;
  const ceiling = 3.4;
  cylinder(g, 0.14, 0.04, mountX, ceiling - 0.02, 0, whitePlastic(), 18);
  cylinder(g, 0.04, 0.5, mountX, ceiling - 0.29, 0, whitePlastic(), 12);
  const face = screen('lamp', T.lampFace(), 2.2);
  for (const end of [-1, 1]) {
    const headZ = end * 0.45;
    tube(g, [[mountX, ceiling - 0.52, 0], [mountX + 0.25, ceiling - 0.6, headZ * 0.5], [0.05, ceiling - 0.75, headZ], [0, ceiling - 0.86, headZ]], 0.025, whitePlastic(), 8);
    const head = group(g, 0, ceiling - 0.95, headZ, 0);
    head.rotation.x = end * 0.2;
    place(head, new THREE.LatheGeometry([[0, 0.1], [0.12, 0.09], [0.26, 0.04], [0.31, 0.0], [0.3, -0.03], [0, -0.03]].map(([r, y]) => new THREE.Vector2(r, y)), 28), whitePlastic(), 0, 0, 0, true);
    const lens = place(head, new THREE.CircleGeometry(0.29, 28), face, 0, -0.032, 0, false);
    lens.rotation.x = Math.PI / 2;
    cylinder(head, 0.025, 0.12, 0, -0.09, 0, plain('#5a8ab0', 0.4), 10);
  }
};

// A steel instrument trolley with a drape, the instruments laid out on it, and bloody gauze.
const instruments: Builder = (kit, w, h, d) => {
  const { group: g, random } = kit;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const x = sx * (w / 2 - 0.06);
      const z = sz * (d / 2 - 0.06);
      cylinder(g, 0.016, h - 0.1, x, 0.08 + (h - 0.1) / 2, z, steel(), 8);
      caster(g, x, z, 0.035);
    }
  }
  for (const y of [0.32, h - 0.03]) {
    box(g, w - 0.06, 0.02, d - 0.06, 0, y, 0, steel(), 0.004);
    for (const side of [-1, 1]) {
      box(g, w - 0.06, 0.03, 0.01, 0, y + 0.02, side * (d / 2 - 0.035), steel());
      box(g, 0.01, 0.03, d - 0.06, side * (w / 2 - 0.035), y + 0.02, 0, steel());
    }
  }
  const top = h - 0.019;
  const green = cloth('#3f8a6c', false);
  flat(g, w - 0.14, d - 0.14, 0, top + 0.002, 0, green, (random() - 0.5) * 0.05);
  // Instruments in a row: scalpels, forceps, scissors, clamps.
  for (let k = 0; k < 9; k++) {
    const x = -w / 2 + 0.16 + k * ((w - 0.5) / 9);
    const tool = group(g, x, top + 0.006, -0.05 + (random() - 0.5) * 0.04, (random() - 0.5) * 0.1);
    const kind = k % 3;
    if (kind === 0) {
      box(tool, 0.012, 0.006, 0.13, 0, 0, 0, chrome());
      box(tool, 0.008, 0.003, 0.04, 0, 0, -0.08, chrome());
    } else {
      for (const side of [-1, 1]) {
        const blade = box(tool, 0.006, 0.005, 0.15, side * 0.008, 0, 0, chrome());
        blade.rotation.y = side * 0.08;
        const ring = place(tool, new THREE.TorusGeometry(0.012, 0.003, 4, 10), chrome(), side * 0.016, 0, 0.085, false);
        ring.rotation.x = Math.PI / 2;
      }
    }
  }
  // A kidney dish, swabs and gauze.
  const dish = place(g, new THREE.LatheGeometry([[0, 0], [0.08, 0], [0.11, 0.035], [0.105, 0.04]].map(([r, y]) => new THREE.Vector2(r, y)), 18), steel(), w / 2 - 0.2, top + 0.003, d / 2 - 0.22, false);
  dish.scale.set(1.4, 1, 0.8);
  for (let k = 0; k < 5; k++) {
    const pad = box(g, 0.08, 0.012, 0.08, -w / 2 + 0.22 + random() * 0.4, top + 0.008 + k * 0.004, d / 2 - 0.25 + random() * 0.1, cloth('#f4f4f0', true));
    pad.rotation.y = random() * 3;
  }
  cylinder(g, 0.012, 0.09, w / 2 - 0.45, top + 0.05, d / 2 - 0.2, clearPlastic('#e8eef0'), 8).rotation.z = Math.PI / 2;
  // On the shelf below: wrapped sterile packs and a basin.
  for (let k = 0; k < 3; k++) box(g, 0.3, 0.06 + random() * 0.05, 0.25, -w / 2 + 0.25 + k * 0.33, 0.37, (random() - 0.5) * 0.2, plain('#5a8ab8', 0.7), 0.01);
  place(g, new THREE.LatheGeometry([[0, 0], [0.12, 0], [0.16, 0.08], [0.155, 0.085]].map(([r, y]) => new THREE.Vector2(r, y)), 18), steel(), w / 2 - 0.25, 0.331, 0, false);
  if (random() < 0.5) bloodOnFloor(kit, (random() - 0.5) * w, d / 2 + 0.3, 0.6);
};

// Steel theatre cupboards: drawers below a worktop, glass-fronted shelves of sterile stock above.
const supply: Builder = (kit, w, h, d) => {
  const { group: g, random } = kit;
  const units = Math.max(1, Math.round(w / 0.9));
  const uw = w / units;
  const worktop = 0.9;
  const upperDepth = Math.min(0.42, d * 0.5);
  const upperZ = -d / 2 + upperDepth / 2;
  const stainless = steel();
  box(g, w, worktop - 0.08, d - 0.04, 0, 0.08 + (worktop - 0.08) / 2, -0.02, stainless, 0.006);
  box(g, w - 0.04, 0.08, d - 0.1, 0, 0.04, -0.03, blackPlastic());
  box(g, w + 0.02, 0.03, d, 0, worktop + 0.015, 0, stainless, 0.006);
  const backing = whitePlastic();
  box(g, w, h - worktop - 0.35, 0.02, 0, worktop + 0.35 + (h - worktop - 0.35) / 2, -d / 2 + 0.01, backing);
  box(g, w, 0.03, upperDepth, 0, h - 0.015, upperZ, stainless, 0.004);
  for (let i = 0; i <= units; i++) box(g, 0.02, h - worktop - 0.35, upperDepth, -w / 2 + 0.01 + i * ((w - 0.02) / units), worktop + 0.35 + (h - worktop - 0.35) / 2, upperZ, stainless);
  for (let i = 0; i < units; i++) {
    const x = -w / 2 + uw * (i + 0.5);
    for (let k = 0; k < 3; k++) {
      const dh = (worktop - 0.12) / 3;
      const y = 0.1 + dh * (k + 0.5);
      box(g, uw - 0.03, dh - 0.015, 0.02, x, y, d / 2 - 0.02, stainless, 0.004);
      box(g, uw * 0.5, 0.014, 0.02, x, y + dh * 0.25, d / 2 + 0.005, chrome());
    }
    const bottom = worktop + 0.35;
    const shelves = [bottom + 0.02, bottom + 0.32, bottom + 0.62].filter((y) => y < h - 0.12);
    for (const y of shelves) {
      box(g, uw - 0.03, 0.015, upperDepth - 0.03, x, y, upperZ, glass());
      let cursor = x - uw / 2 + 0.04;
      while (cursor < x + uw / 2 - 0.1) {
        const roll = random();
        if (roll < 0.2) {
          cursor += 0.1;
          continue;
        }
        if (roll < 0.55) {
          const width = 0.12 + random() * 0.1;
          box(g, width, 0.08 + random() * 0.08, upperDepth - 0.1, cursor + width / 2, y + 0.06, upperZ, plain(pick(random, ['#5a8ab8', '#e8eef0', '#5ab8a0']), 0.7), 0.01);
          cursor += width + 0.01;
        } else if (roll < 0.8) {
          const bag = box(g, 0.12, 0.17, 0.04, cursor + 0.06, y + 0.095, upperZ, clearPlastic('#e4eef0'), 0.015);
          bag.rotation.x = -0.25;
          cursor += 0.13;
        } else {
          drugBox(g, 0.1, 0.07, 0.14, cursor + 0.05, y + 0.043, upperZ, random);
          cursor += 0.11;
        }
      }
    }
    // Glass doors, the right one left open on some.
    for (const side of [-1, 1]) {
      const open = side > 0 && random() < 0.3 ? 1.2 : 0;
      const hinge = group(g, x + side * (uw / 2 - 0.012), 0, -d / 2 + upperDepth + 0.01, side * open);
      const doorWidth = uw / 2 - 0.016;
      const doorHeight = h - bottom - 0.05;
      const cx = -side * (doorWidth / 2);
      box(hinge, doorWidth - 0.04, doorHeight - 0.04, 0.006, cx, bottom + doorHeight / 2, 0, glass());
      for (const edge of [-1, 1]) box(hinge, 0.02, doorHeight, 0.02, cx + edge * (doorWidth / 2 - 0.01), bottom + doorHeight / 2, 0, stainless);
      for (const edge of [0, 1]) box(hinge, doorWidth, 0.02, 0.02, cx, bottom + edge * doorHeight, 0, stainless);
      box(hinge, 0.012, 0.14, 0.02, -side * (doorWidth - 0.04), bottom + doorHeight * 0.4, 0.015, chrome());
    }
  }
  // Stock on the worktop.
  for (let k = 0; k < 3; k++) {
    if (random() < 0.3) continue;
    box(g, 0.25, 0.08, 0.2, -w / 2 + 0.3 + random() * (w - 0.6), worktop + 0.07, d / 2 - 0.25, plain('#5a8ab8', 0.7), 0.01);
  }
};

// A run of staff lockers, one hanging open with scrubs inside.
const lockers: Builder = (kit, w, h, d) => {
  const { group: g, random } = kit;
  const units = Math.max(1, Math.round(w / 0.38));
  const uw = w / units;
  const body = painted(kit.color);
  const doorPaint = painted(shade(kit.color, 0.1));
  const slats = standard('slats', { map: T.ventSlats(), roughness: 0.7 });
  box(g, w, 0.1, d - 0.06, 0, 0.05, -0.03, blackPlastic());
  box(g, w, h - 0.1, d - 0.04, 0, 0.1 + (h - 0.1) / 2, -0.04, body, 0.006);
  const open = Math.floor(random() * units);
  for (let i = 0; i < units; i++) {
    const x = -w / 2 + uw * (i + 0.5);
    const doorHeight = h - 0.18;
    const angle = i === open ? 1.7 : 0;
    const hinge = group(g, x - uw / 2 + 0.008, 0, d / 2 - 0.02, -angle);
    const door = group(hinge, uw / 2 - 0.008, 0.14 + doorHeight / 2, 0.011, 0);
    box(door, uw - 0.016, doorHeight, 0.02, 0, 0, 0, doorPaint, 0.004);
    for (const y of [doorHeight / 2 - 0.12, -doorHeight / 2 + 0.12]) plane(door, uw * 0.6, 0.12, 0, y, 0.0105, slats);
    box(door, 0.03, 0.09, 0.02, uw / 2 - 0.06, 0.02, 0.02, darkSteel());
    if (random() < 0.4) box(door, 0.035, 0.045, 0.02, uw / 2 - 0.06, -0.04, 0.035, chrome(), 0.008);
    plane(door, 0.07, 0.04, 0, doorHeight / 2 - 0.25, 0.0108, plain('#efece2', 0.8));
    if (i === open) {
      box(g, uw - 0.02, doorHeight - 0.02, 0.01, x, 0.14 + doorHeight / 2, d / 2 - 0.03, plain('#22262a', 0.8));
      box(g, uw - 0.04, 0.015, 0.4, x, h - 0.4, d / 2 - 0.22, body);
      box(g, uw * 0.7, 0.55, 0.08, x, h - 0.75, d / 2 - 0.12, cloth('#4a8a7a', false), 0.02);
      for (const side of [-1, 1]) box(g, 0.09, 0.07, 0.24, x + side * 0.06, 0.2, d / 2 - 0.15, plain('#e8e8e8', 0.6), 0.03);
    }
  }
};

// A changing-room bench: wooden slats on steel pedestals, a shoe rail under, a towel left on it.
const bench: Builder = (kit, w, h, d) => {
  const { group: g, random } = kit;
  const legs = Math.max(2, Math.round(w / 1.4) + 1);
  for (let i = 0; i < legs; i++) {
    const x = -w / 2 + 0.2 + i * ((w - 0.4) / (legs - 1));
    box(g, 0.06, h - 0.06, 0.06, x, (h - 0.06) / 2, 0, darkSteel());
    box(g, 0.08, 0.03, d - 0.1, x, 0.015, 0, darkSteel());
    box(g, 0.06, 0.04, d * 0.62, x, h - 0.08, 0, darkSteel());
  }
  const slat = wood('#c49a64');
  const seatDepth = d * 0.62;
  for (let k = 0; k < 3; k++) box(g, w, 0.035, seatDepth / 3 - 0.012, 0, h - 0.0175, -seatDepth / 2 + (seatDepth / 3) * (k + 0.5), slat, 0.006);
  for (const side of [-1, 1]) bar(g, [-w / 2 + 0.15, 0.12, side * (d / 2 - 0.1)], [w / 2 - 0.15, 0.12, side * (d / 2 - 0.1)], 0.012, steel());
  for (let k = 0; k < 2; k++) {
    if (random() < 0.4) continue;
    const pair = group(g, -w / 2 + 0.5 + random() * (w - 1), 0, (random() - 0.5) * 0.2, random() * 0.6);
    for (const side of [-1, 1]) box(pair, 0.09, 0.07, 0.26, side * 0.06, 0.035, 0, plain('#e8e8e8', 0.6), 0.03);
  }
  const towel = place(g, drape(seatDepth, 0.45, 0.2, random, 0.01), cloth('#e8eef0', random() < 0.4), (random() - 0.5) * (w - 1), h + 0.004, 0, true);
  towel.rotation.y = Math.PI / 2 + (random() - 0.5) * 0.3;
  if (random() < 0.6) box(g, 0.5, 0.25, 0.25, (random() - 0.5) * (w - 1), h + 0.125, 0, plain('#1c2a3a', 0.8), 0.08);
};

// A bay curtain hanging in folds from a ceiling rail, with the open mesh along its top.
const curtain: Builder = (kit, w) => {
  const { group: g, random } = kit;
  const rail = 2.3;
  bar(g, [-w / 2, rail, 0], [w / 2, rail, 0], 0.016, chrome());
  for (const end of [-1, 1]) cylinder(g, 0.007, 3.4 - rail, end * (w / 2 - 0.1), (3.4 + rail) / 2, 0, chrome(), 6);
  const drawn = 0.82 + random() * 0.18;
  const length = w * drawn;
  const start = random() < 0.5 ? -w / 2 : w / 2 - length;
  const top = rail - 0.04;
  const bottom = 0.32;
  const mesh = 0.38;
  const columns = Math.ceil(length / 0.02);
  const make = (from: number, to: number, depth: number) => {
    const geometry = new THREE.PlaneGeometry(length, to - from, columns, 4);
    const position = geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i);
      const y = position.getY(i);
      const t = (x + length / 2) / length;
      const pleat = Math.sin(t * length * (Math.PI * 2) / 0.16 + y * 0.6) * depth;
      position.setXYZ(i, start + length / 2 + x, (from + to) / 2 + y, pleat);
    }
    geometry.computeVertexNormals();
    return geometry;
  };
  place(g, make(bottom, top - mesh, 0.04), curtainCloth(kit.color), 0, 0, 0, true);
  place(g, make(top - mesh, top, 0.035), netting(), 0, 0, 0, false);
  for (let x = start + 0.04; x < start + length; x += 0.16) box(g, 0.012, 0.03, 0.02, x, rail - 0.03, 0, chrome());
};

// A ventilator and patient monitor on a rolling stand, its hoses hanging loose.
const patientMonitor: Builder = (kit, w, h, d) => {
  const { group: g } = kit;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    const leg = box(g, 0.04, 0.03, Math.min(w, d) / 2 - 0.05, Math.sin(a) * (Math.min(w, d) / 4), 0.07, Math.cos(a) * (Math.min(w, d) / 4), greyPlastic());
    leg.rotation.y = a;
    caster(g, Math.sin(a) * (Math.min(w, d) / 2 - 0.06), Math.cos(a) * (Math.min(w, d) / 2 - 0.06), 0.03);
  }
  cylinder(g, 0.03, h - 0.1, 0, 0.1 + (h - 0.1) / 2, -0.05, chrome(), 10);
  box(g, 0.34, 0.08, 0.26, 0, 0.42, -0.02, plain('#3a3f44', 0.6), 0.01);
  const vent = whitePlastic();
  box(g, 0.42, 0.34, 0.32, 0, 0.78, 0, vent, 0.04);
  plane(g, 0.24, 0.16, -0.05, 0.82, 0.161, screen('vent', T.ventScreen()));
  for (let k = 0; k < 3; k++) cylinder(g, 0.018, 0.02, 0.13, 0.9 - k * 0.07, 0.165, greyPlastic(), 10).rotation.x = Math.PI / 2;
  box(g, 0.42, 0.26, 0.1, 0, h - 0.04, 0.0, greyPlastic(), 0.015);
  plane(g, 0.37, 0.2, 0, h - 0.04, 0.0505, screen('ecg', T.ecgScreen()));
  bar(g, [-0.15, h + 0.12, 0], [0.15, h + 0.12, 0], 0.012, greyPlastic());
  for (const side of [-1, 1]) bar(g, [side * 0.15, h + 0.12, 0], [side * 0.15, h + 0.09, 0], 0.01, greyPlastic());
  // Corrugated hoses, looped down to the floor.
  const hose = plain('#bcd4e6', 0.4);
  tube(g, [[-0.15, 0.72, 0.16], [-0.25, 0.45, 0.35], [-0.1, 0.05, 0.5], [0.15, 0.04, 0.35]], 0.018, hose, 8);
  tube(g, [[0.15, 0.72, 0.16], [0.28, 0.4, 0.3], [0.32, 0.04, 0.15]], 0.018, hose, 8);
};

// ---------------------------------------------------------------------------------------------
// The roof: air-conditioning plant, vents, the water tank and a radio mast.

// A rooftop air-conditioning unit on steel skids: louvred sides, two fans in round shrouds on
// top, an isolator box on the front and insulated pipes running down to the roof.
const hvac: Builder = (kit, w, h, d) => {
  const g = kit.group;
  const casing = painted(kit.color);
  const slats = standard('slats', { map: T.ventSlats(), roughness: 0.7 });
  for (const side of [-1, 1]) box(g, w, 0.12, 0.14, 0, 0.06, side * (d / 2 - 0.1), darkSteel());
  box(g, w - 0.08, h - 0.26, d - 0.08, 0, 0.12 + (h - 0.26) / 2, 0, casing, 0.03);
  // Louvres down both long faces and the ends.
  const panels = Math.max(2, Math.round(w / 1.1));
  for (let i = 0; i < panels; i++) {
    const x = -w / 2 + (w / panels) * (i + 0.5);
    for (const side of [-1, 1]) plane(g, w / panels - 0.16, h * 0.5, x, h * 0.42, side * (d / 2 - 0.035), slats, side < 0 ? Math.PI : 0);
  }
  for (const side of [-1, 1]) plane(g, d - 0.4, h * 0.5, side * (w / 2 - 0.035), h * 0.42, 0, slats, side * Math.PI / 2);
  // Fans in round shrouds on top, with a grille over each.
  const fans = Math.max(1, Math.round(w / 1.9));
  const radius = Math.min(d * 0.36, (w / fans) * 0.4);
  for (let i = 0; i < fans; i++) {
    const x = -w / 2 + (w / fans) * (i + 0.5);
    place(g, new THREE.CylinderGeometry(radius, radius, 0.22, 24, 1, true), standard(`shroud:${kit.color}`, { color: kit.color, roughness: 0.55, metalness: 0.25, side: THREE.DoubleSide }), x, h - 0.13, 0, true);
    cylinder(g, radius - 0.02, 0.02, x, h - 0.2, 0, blackPlastic(), 24);
    for (let b = 0; b < 5; b++) {
      const blade = box(g, radius * 0.85, 0.012, 0.16, x, h - 0.17, 0, darkSteel());
      blade.rotation.set(0.35, (b / 5) * Math.PI * 2 + kit.random(), 0, 'YXZ');
      blade.position.x = x + Math.cos((b / 5) * Math.PI * 2) * radius * 0.42;
      blade.position.z = -Math.sin((b / 5) * Math.PI * 2) * radius * 0.42;
    }
    cylinder(g, 0.08, 0.06, x, h - 0.15, 0, darkSteel(), 12);
    for (let k = -2; k <= 2; k++) {
      bar(g, [x - radius * 0.95, h - 0.02, k * radius * 0.36], [x + radius * 0.95, h - 0.02, k * radius * 0.36], 0.008, darkSteel(), 4);
      bar(g, [x + k * radius * 0.36, h - 0.02, -radius * 0.95], [x + k * radius * 0.36, h - 0.02, radius * 0.95], 0.008, darkSteel(), 4);
    }
  }
  // The isolator box and its conduit, and the pipes out of the far end.
  box(g, 0.34, 0.42, 0.14, w / 2 - 0.5, h * 0.62, d / 2 + 0.04, plain('#9c9f3c', 0.6), 0.02);
  box(g, 0.05, 0.14, 0.04, w / 2 - 0.42, h * 0.62, d / 2 + 0.12, blackPlastic());
  bar(g, [w / 2 - 0.5, h * 0.62 - 0.21, d / 2 + 0.06], [w / 2 - 0.5, 0.02, d / 2 + 0.06], 0.02, darkSteel(), 6);
  const lagging = plain('#111315', 0.85);
  for (const z of [-0.25, 0.15]) {
    tube(g, [[-w / 2 + 0.05, h * 0.3, z], [-w / 2 - 0.25, h * 0.28, z], [-w / 2 - 0.4, 0.3, z], [-w / 2 - 0.42, 0.06, z + 0.4]], 0.06, lagging, 10);
  }
  plane(g, 0.3, 0.3, -w / 2 + 0.6, h * 0.75, d / 2 - 0.03, label(T.biohazard(), 'biohazard'));
};

// A mushroom vent: a short steel trunk with a louvred head under a wide cap.
const vent: Builder = (kit, w, h, d) => {
  const g = kit.group;
  const body = painted(kit.color);
  const slats = standard('slats', { map: T.ventSlats(), roughness: 0.7 });
  box(g, w * 0.7, h * 0.45, d * 0.7, 0, h * 0.225, 0, body, 0.02);
  box(g, w - 0.1, h * 0.38, d - 0.1, 0, h * 0.45 + h * 0.19, 0, body, 0.02);
  for (const side of [-1, 1]) {
    plane(g, w - 0.2, h * 0.28, 0, h * 0.64, side * (d / 2 - 0.045), slats, side < 0 ? Math.PI : 0);
    plane(g, d - 0.2, h * 0.28, side * (w / 2 - 0.045), h * 0.64, 0, slats, side * Math.PI / 2);
  }
  const cap = box(g, w, 0.08, d, 0, h - 0.04, 0, steel(), 0.02);
  cap.castShadow = true;
  box(g, w * 0.7 + 0.08, 0.06, d * 0.7 + 0.08, 0, 0.03, 0, darkSteel());
};

// The water tank: a riveted steel drum on a stand of steel legs, with a hatch, a level gauge and
// the outlet pipe down to the roof.
const tank: Builder = (kit, w, h, d) => {
  const g = kit.group;
  const legs = 1.1;
  const radius = Math.min(w, d) / 2 - 0.08;
  for (const x of [-1, 1]) for (const z of [-1, 1]) {
    box(g, 0.12, legs, 0.12, x * radius * 0.7, legs / 2, z * radius * 0.7, darkSteel());
    box(g, 0.3, 0.03, 0.3, x * radius * 0.7, 0.015, z * radius * 0.7, darkSteel());
  }
  for (const side of [-1, 1]) {
    bar(g, [-radius * 0.7, 0.2, side * radius * 0.7], [radius * 0.7, legs - 0.1, side * radius * 0.7], 0.025, darkSteel(), 6);
    bar(g, [side * radius * 0.7, 0.2, -radius * 0.7], [side * radius * 0.7, legs - 0.1, radius * 0.7], 0.025, darkSteel(), 6);
  }
  box(g, radius * 1.6, 0.1, radius * 1.6, 0, legs, 0, darkSteel());
  const drum = painted(kit.color);
  const height = h - legs - 0.35;
  cylinder(g, radius, height, 0, legs + 0.05 + height / 2, 0, drum, 32);
  for (let k = 0; k < 4; k++) cylinder(g, radius + 0.015, 0.05, 0, legs + 0.2 + (k * (height - 0.3)) / 3, 0, darkSteel(), 32);
  cylinder(g, 0.06, 0.3, 0, h - 0.15, 0, drum, 32, radius);
  box(g, 0.5, 0.06, 0.5, radius * 0.3, h - 0.04, 0, darkSteel(), 0.01);
  // Level gauge up the front, and the outlet.
  bar(g, [0, legs + 0.2, radius + 0.04], [0, h - 0.5, radius + 0.04], 0.02, clearPlastic('#9fb8c8'), 8);
  tube(g, [[radius * 0.4, legs + 0.1, radius * 0.3], [radius * 0.4, 0.5, radius * 0.6], [radius * 0.5, 0.08, d / 2 + 0.1]], 0.05, darkSteel(), 8);
};

// A lattice radio mast with a dish and a red aircraft-warning lamp on top.
const mast: Builder = (kit, w, h) => {
  const g = kit.group;
  const metalPart = steel();
  const r = w / 2 - 0.08;
  const corners: [number, number][] = [0, 1, 2].map((k) => [Math.cos((k / 3) * Math.PI * 2) * r, Math.sin((k / 3) * Math.PI * 2) * r]);
  box(g, w, 0.12, w, 0, 0.06, 0, plain('#6d7275', 0.9));
  for (const [x, z] of corners) bar(g, [x, 0.1, z], [x * 0.5, h - 0.2, z * 0.5], 0.025, metalPart, 6);
  const steps = Math.round(h / 0.6);
  for (let s = 0; s < steps; s++) {
    const y0 = 0.1 + (s / steps) * (h - 0.3);
    const y1 = 0.1 + ((s + 1) / steps) * (h - 0.3);
    const t0 = 1 - 0.5 * (s / steps);
    const t1 = 1 - 0.5 * ((s + 1) / steps);
    for (let k = 0; k < 3; k++) {
      const [ax, az] = corners[k];
      const [bx, bz] = corners[(k + 1) % 3];
      bar(g, [ax * t0, y0, az * t0], [bx * t1, y1, bz * t1], 0.008, metalPart, 4);
    }
  }
  const dish = place(g, new THREE.SphereGeometry(0.32, 16, 8, 0, Math.PI * 2, 0, 0.6), standard('dish', { color: '#dfe2df', roughness: 0.42, side: THREE.DoubleSide }), 0, h * 0.62, 0.22, true);
  dish.rotation.x = Math.PI / 2;
  box(g, 0.2, 0.2, 0.14, 0, h * 0.75, 0, whitePlastic(), 0.02);
  bar(g, [0, h - 0.2, 0], [0, h + 0.6, 0], 0.012, metalPart, 6);
  box(g, 0.12, 0.14, 0.12, 0, h - 0.1, 0, glow('#ff2a1a'), 0.02);
};

const BUILDERS: Record<Prop, Builder> = {
  desk, counter, seating, cabinet, shelf, lab, fridge, analyser, cart, bed, gurney, operating, instruments, supply, lockers, bench, curtain,
  monitor: patientMonitor, hvac, vent, tank, mast,
};

// The modelled piece for a furniture box, standing where the box stands.
export function buildFurniture(box: LevelBox, reflections: THREE.Texture): THREE.Group {
  environment = reflections;
  const facing = box.facing ?? 0;
  const turned = Math.abs(Math.sin(facing)) > 0.5;
  const w = turned ? box.size.z : box.size.x;
  const d = turned ? box.size.x : box.size.z;
  const piece = new THREE.Group();
  piece.name = box.prop ?? 'furniture';
  piece.position.set(box.position.x, box.position.y - box.size.y / 2, box.position.z);
  piece.rotation.y = facing;
  const kit: Kit = { group: piece, color: box.color, random: seeded(Math.round(box.position.x * 97) * 7919 + Math.round(box.position.z * 89) * 104729) };
  BUILDERS[box.prop!](kit, w, box.size.y, d);
  // A soft shadow on the floor under it, since the room lights do not cast any.
  if (box.prop !== 'curtain') flat(piece, w + 0.3, d + 0.3, 0, 0.004, 0, contactShadow());
  return piece;
}
