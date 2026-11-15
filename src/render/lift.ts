import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { config } from '../config';
import { settings } from '../client/settings';
import type { GameState } from '../game/state';
import { goesDown, stopAt, storeyLabel, storeysToNext } from '../game/tower';
import type { Level } from '../levels/types';

const FRAME = new THREE.MeshStandardMaterial({ color: 0x8a8f96, roughness: 0.35, metalness: 0.85 });
const DOOR = new THREE.MeshStandardMaterial({ color: 0xa9aeb4, roughness: 0.3, metalness: 0.9 });
const GATE_LEAF = new THREE.MeshStandardMaterial({ color: 0x3c4249, roughness: 0.7, metalness: 0.6 });

function displayTexture(gate: boolean): { texture: THREE.CanvasTexture; draw: (label: string, open: boolean, arrow?: string) => void } {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const context = canvas.getContext('2d')!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return {
    texture,
    draw(label, open, arrow = '▲') {
      context.fillStyle = '#0b0d10';
      context.fillRect(0, 0, 512, 160);
      context.strokeStyle = '#8a8f96';
      context.lineWidth = 6;
      context.strokeRect(3, 3, 506, 154);
      context.textAlign = 'center';
      context.fillStyle = '#ffffff';
      context.font = '700 54px Bahnschrift, Arial Narrow, sans-serif';
      context.fillText(gate ? 'CHECKPOINT' : 'ELEVATOR', 256, 70);
      context.fillStyle = open ? '#38e070' : gate ? '#ff5a4a' : '#ffd24a';
      context.font = '700 46px Bahnschrift, Arial Narrow, sans-serif';
      context.fillText(gate ? (open ? 'OPEN  ▶' : 'CLOSED') : label === 'ROOF' ? '▲  ROOF' : `${arrow}  FLOOR ${label}`, 256, 130);
      texture.needsUpdate = true;
    },
  };
}

const HAZARD = new THREE.MeshStandardMaterial({ color: 0xd9a82a, roughness: 0.5, metalness: 0.4 });

// A road checkpoint's gate: two steel swing gates across the road between posts, under a gantry with the
// sign and a lamp that is red while it is shut and green once it is open. Once the way is open the gates
// swing out into the lane beyond, against its walls.
function buildCheckpointGate(scene: THREE.Object3D, lift: Level['elevator'], glowMap: THREE.Texture, always = false): (state: GameState, time: number) => void {
  const group = new THREE.Group();
  group.position.set(lift.position.x + lift.normal.x * 0.25, 0, lift.position.z + lift.normal.z * 0.25);
  group.rotation.y = Math.atan2(lift.normal.x, lift.normal.z);
  scene.add(group);
  const half = lift.width / 2;
  const height = lift.height;

  // Posts either side, tall enough to carry the gantry.
  const topY = height + 1.5;
  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.26, topY, 0.26), FRAME);
    post.position.set(side * (half + 0.13), topY / 2, -0.12);
    post.castShadow = true;
    group.add(post);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.3), HAZARD);
    cap.position.set(side * (half + 0.13), height + 0.1, -0.12);
    group.add(cap);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(lift.width + 0.52, 0.22, 0.22), FRAME);
  beam.position.set(0, topY - 0.11, -0.12);
  group.add(beam);

  // A leaf: top and bottom rails, bars, and a diagonal brace, hinged at its origin and reaching along +x.
  const length = half;
  const leaf = (): THREE.Group => {
    const leafGroup = new THREE.Group();
    const bar = (w: number, h: number, material: THREE.Material, x: number, y: number) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.07), material);
      mesh.position.set(x, y, 0);
      mesh.castShadow = true;
      leafGroup.add(mesh);
      return mesh;
    };
    bar(length, 0.1, HAZARD, length / 2, height - 0.08);
    bar(length, 0.09, GATE_LEAF, length / 2, 0.3);
    bar(length, 0.07, GATE_LEAF, length / 2, height / 2);
    for (let i = 0; i <= 6; i++) bar(0.05, height - 0.2, GATE_LEAF, (i / 6) * (length - 0.05) + 0.025, height / 2 - 0.02);
    const brace = bar(Math.hypot(length, height - 0.5), 0.06, GATE_LEAF, length / 2, height / 2);
    brace.rotation.z = Math.atan2(height - 0.5, length);
    return leafGroup;
  };
  const leaves = [-1, 1].map((side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * half, 0, -0.2);
    const body = leaf();
    // The right-hand gate reaches the other way.
    if (side === 1) body.scale.x = -1;
    pivot.add(body);
    group.add(pivot);
    return { pivot, side };
  });

  const display = displayTexture(true);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.75), new THREE.MeshBasicMaterial({ map: display.texture }));
  sign.position.set(0, topY - 0.6, 0.0);
  group.add(sign);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), new THREE.MeshBasicMaterial({ color: 0xff5a4a }));
  lamp.position.set(0, topY + 0.08, -0.12);
  group.add(lamp);
  const light = new THREE.PointLight(0xff5a4a, 4, 9, 2);
  light.position.set(0, topY - 0.3, 0.4);
  group.add(light);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowMap, color: 0xff5a4a, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.5 }));
  glow.scale.setScalar(1.1);
  glow.position.copy(lamp.position);
  group.add(glow);

  // A lamp in the lane beyond, so the road is seen to go on into the dusk.
  const laneLight = new THREE.PointLight(0xffd9a0, 7, 13, 2);
  laneLight.position.set(0, 3.2, -4.5);
  group.add(laneLight);

  let shownOpen: boolean | null = null;
  return (state, time) => {
    const open = always || state.lift.open;
    const doorTicks = config.elevator.doorSeconds * 1.6 * config.ticksPerSecond;
    const since = always || state.lift.changedTick < 0 ? Infinity : (state.tick - state.lift.changedTick) / doorTicks;
    const progress = open ? Math.min(1, since) : Math.max(0, 1 - since);
    const eased = progress * progress * (3 - 2 * progress);
    for (const { pivot, side } of leaves) pivot.rotation.y = -side * eased * Math.PI * 0.47;
    if (open !== shownOpen) {
      shownOpen = open;
      display.draw('', open);
      const colour = open ? 0x38e070 : 0xff5a4a;
      (lamp.material as THREE.MeshBasicMaterial).color.setHex(colour);
      (glow.material as THREE.SpriteMaterial).color.setHex(colour);
      light.color.setHex(colour);
    }
    const blink = settings.reducedFlashing || open ? 1 : 0.55 + 0.45 * Math.sin(time * 5);
    light.intensity = 4 * blink;
    glow.material.opacity = 0.5 * blink;
  };
}

// The elevator: a steel frame, two sliding doors, a sign that says which floor is next, and a lit
// cab behind the wall. The doors are solid in the rules while shut and drawn from the game state.
export function buildLift(scene: THREE.Object3D, level: Level, glowMap: THREE.Texture): (state: GameState, time: number) => void {
  if (level.exitGate) {
    const ahead = buildCheckpointGate(scene, level.elevator, glowMap);
    const behind = level.entry ? buildCheckpointGate(scene, level.entry, glowMap, true) : null;
    return (state, time) => { ahead(state, time); behind?.(state, time); };
  }
  const lift = level.elevator;
  const facing = Math.atan2(lift.normal.x, lift.normal.z);
  const group = new THREE.Group();
  group.position.set(lift.position.x + lift.normal.x * 0.25, 0, lift.position.z + lift.normal.z * 0.25);
  group.rotation.y = facing;
  scene.add(group);

  for (const side of [-1, 1]) {
    const jamb = new THREE.Mesh(new RoundedBoxGeometry(0.22, lift.height + 0.22, 0.2, 2, 0.02), FRAME);
    jamb.position.set(side * (lift.width / 2 + 0.11), (lift.height + 0.22) / 2, 0.1);
    jamb.castShadow = true;
    group.add(jamb);
  }
  const header = new THREE.Mesh(new RoundedBoxGeometry(lift.width + 0.44, 0.22, 0.2, 2, 0.02), FRAME);
  header.position.set(0, lift.height + 0.11, 0.1);
  group.add(header);

  // Two leaves that slide apart into the wall on either side.
  const leafWidth = lift.width / 2;
  const leaves = [-1, 1].map((side) => {
    const leaf = new THREE.Mesh(new RoundedBoxGeometry(leafWidth, lift.height, 0.06, 2, 0.01), level.exitGate ? GATE_LEAF : DOOR);
    leaf.castShadow = leaf.receiveShadow = true;
    leaf.position.set(side * leafWidth / 2, lift.height / 2, -0.2);
    group.add(leaf);
    return { leaf, side };
  });

  const display = displayTexture(Boolean(level.exitGate));
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.53), new THREE.MeshBasicMaterial({ map: display.texture }));
  sign.position.set(0, lift.height + 0.55, 0.22);
  group.add(sign);
  // The same sign inside the cab, over the doors, so the floors can be watched going by.
  const inside = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.53), new THREE.MeshBasicMaterial({ map: display.texture }));
  inside.position.set(0, lift.height + 0.3, -0.3);
  inside.rotation.y = Math.PI;
  group.add(inside);

  // The cab behind the wall is lit from the ceiling.
  const cab = new THREE.Group();
  cab.position.set(lift.position.x - lift.normal.x * (0.25 + lift.cabDepth / 2), 3.2, lift.position.z - lift.normal.z * (0.25 + lift.cabDepth / 2));
  const light = new THREE.PointLight(0xfff0d0, 14, 7, 2);
  cab.add(light);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowMap, color: 0xfff0d0, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.5 }));
  glow.scale.setScalar(1.2);
  cab.add(glow);
  scene.add(cab);

  let shownLabel = '';
  let shownOpen: boolean | null = null;
  const travel = leafWidth + 0.05;

  return (state, time) => {
    const doorTicks = config.elevator.doorSeconds * config.ticksPerSecond;
    const since = state.lift.changedTick < 0 ? Infinity : (state.tick - state.lift.changedTick) / doorTicks;
    const progress = state.lift.open ? Math.min(1, since) : Math.max(0, 1 - since);
    const eased = progress * progress * (3 - 2 * progress);
    for (const { leaf, side } of leaves) leaf.position.x = side * (leafWidth / 2 + travel * eased);

    const riding = state.waves.phase === 'ride';
    // Riding up, the number climbs storey by storey. Arriving, it shows the storey reached. Otherwise
    // it names the next stop.
    let label = storeyLabel(state.floor + 1);
    if (riding) {
      const from = stopAt(state.floor).number, to = stopAt(state.floor + 1).number;
      const total = config.elevator.rideSeconds + config.elevator.rideSecondsPerStorey * storeysToNext(state.floor);
      const done = Math.min(1, Math.max(0, 1 - state.waves.timer / total));
      const storey = to < from ? Math.max(to, from - Math.floor(done * (from - to + 1))) : Math.min(to, from + Math.floor(done * (to - from + 1)));
      label = storey === to ? storeyLabel(state.floor + 1) : storey <= 0 ? 'G' : String(storey);
    } else if (state.waves.phase === 'arrive') label = storeyLabel(state.floor);
    if (label !== shownLabel || state.lift.open !== shownOpen) {
      shownLabel = label;
      shownOpen = state.lift.open;
      display.draw(label, state.lift.open, goesDown(state.floor, state.floor + 1) || (state.waves.phase === 'arrive' && state.floor > 0 && goesDown(state.floor - 1, state.floor)) ? '▼' : '▲');
    }
    const pulse = settings.reducedFlashing ? 1 : 0.7 + 0.3 * Math.sin(time * 6);
    light.intensity = (riding ? 10 * pulse : 14) * (0.5 + 0.5 * Math.max(eased, riding ? 1 : 0.4));
  };
}
