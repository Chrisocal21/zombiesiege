import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { settings } from '../client/settings';
import { config } from '../config';
import { caseFree, charging } from '../game/objectives';
import type { GameState } from '../game/state';
import type { Level, Objective, WallFitting } from '../levels/types';
import { buildHelicopter } from './helicopter';
import { labelTexture } from './streetTextures';

// What each floor's objective looks like: the keycard, the breaker panels, the charger, the lamp
// cases and their drop-off, and on the roof the helipad, its light box and the helicopter.

type Sync = (state: GameState, time: number, dt: number) => void;

const CABINET = new THREE.MeshStandardMaterial({ color: 0x6b7278, roughness: 0.45, metalness: 0.7 });
const DARK = new THREE.MeshStandardMaterial({ color: 0x1d2024, roughness: 0.55, metalness: 0.5 });
const HAZARD = new THREE.MeshStandardMaterial({ color: 0xe0b323, roughness: 0.6 });
const OFF = new THREE.Color(0xff3a22);
const ON = new THREE.Color(0x38e070);
const AMBER = new THREE.Color(0xffb02a);

function mesh(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
  const made = new THREE.Mesh(geometry, material);
  made.position.set(x, y, z);
  made.castShadow = true;
  made.receiveShadow = true;
  parent.add(made);
  return made;
}

function glowSprite(parent: THREE.Object3D, map: THREE.Texture, color: THREE.ColorRepresentation, scale: number, x: number, y: number, z: number): THREE.Sprite {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map, color, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
  sprite.scale.setScalar(scale);
  sprite.position.set(x, y, z);
  parent.add(sprite);
  return sprite;
}

// A group standing on a wall fitting, turned so +z points out of the wall into the room.
function onWall(scene: THREE.Object3D, fitting: WallFitting): THREE.Group {
  const group = new THREE.Group();
  group.position.set(fitting.position.x, fitting.position.y, fitting.position.z);
  group.rotation.y = Math.atan2(fitting.normal.x, fitting.normal.z);
  scene.add(group);
  return group;
}

// A canvas the code paints on as things change, shown as a lit screen.
function liveScreen(width: number, height: number): { texture: THREE.CanvasTexture; context: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return { texture, context: canvas.getContext('2d')! };
}

// A shaft of light standing over something to pick up, so it can be found.
function beacon(parent: THREE.Object3D, color: THREE.Color, height: number): THREE.Mesh {
  const geometry = new THREE.CylinderGeometry(0.05, 0.16, height, 12, 1, true);
  const colors = new Float32Array(geometry.attributes.position.count * 3);
  for (let i = 0; i < geometry.attributes.position.count; i++) {
    const brightness = 1 - (geometry.attributes.position.getY(i) + height / 2) / height;
    colors.set([color.r * brightness, color.g * brightness, color.b * brightness], i * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const beam = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
    vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: 0.45,
  }));
  beam.position.y = height / 2 + 0.1;
  parent.add(beam);
  return beam;
}

function pulse(beam: THREE.Mesh, time: number, phase = 0): void {
  (beam.material as THREE.MeshBasicMaterial).opacity = settings.reducedFlashing ? 0.25 : 0.3 + 0.12 * Math.sin(time * 2.4 + phase);
}

// ---------------------------------------------------------------------------------------------

function keycard(scene: THREE.Object3D, objective: Extract<Objective, { kind: 'keycard' }>, glowMap: THREE.Texture): Sync {
  const group = new THREE.Group();
  group.position.set(objective.position.x, objective.position.y, objective.position.z);
  scene.add(group);
  const card = new THREE.Group();
  mesh(card, new RoundedBoxGeometry(0.22, 0.012, 0.14, 2, 0.004), new THREE.MeshStandardMaterial({ color: 0xe8eaec, roughness: 0.4 }), 0, 0, 0);
  mesh(card, new THREE.BoxGeometry(0.22, 0.0125, 0.03), new THREE.MeshStandardMaterial({ color: 0x38e070, emissive: 0x38e070, emissiveIntensity: 0.9 }), 0, 0, -0.03);
  mesh(card, new THREE.BoxGeometry(0.035, 0.0135, 0.03), new THREE.MeshStandardMaterial({ color: 0xc8943a, metalness: 0.9, roughness: 0.3 }), -0.06, 0, 0.03);
  group.add(card);
  const beam = beacon(group, ON, 0.9);
  glowSprite(group, glowMap, 0x38e070, 0.8, 0, 0.2, 0).material.opacity = 0.6;
  const light = new THREE.PointLight(0x38e070, 2.5, 4, 2);
  light.position.y = 0.5;
  group.add(light);
  return (state, time) => {
    group.visible = !state.objective.done;
    card.rotation.y = time * 1.2;
    card.position.y = 0.12 + Math.sin(time * 2) * 0.02;
    pulse(beam, time);
  };
}

// Breaker panels: a steel box on the wall with its door open on rows of breakers, and a big
// handle down the side that is thrown up to bring the circuit back. A lamp and an amber glow
// mark it in the dark until it is thrown.
function breakerFace(index: number, total: number): THREE.CanvasTexture {
  const { texture, context } = liveScreen(256, 320);
  context.fillStyle = '#c9cdc8';
  context.fillRect(0, 0, 256, 320);
  context.fillStyle = '#1a1c1e';
  context.font = 'bold 26px Arial, sans-serif';
  context.textAlign = 'center';
  context.fillText(`CIRCUIT ${String.fromCharCode(65 + index)}`, 128, 36);
  context.font = '15px Arial, sans-serif';
  context.fillText(`DISTRIBUTION BOARD ${index + 1} OF ${total}`, 128, 58);
  for (let row = 0; row < 6; row++) {
    for (let column = 0; column < 2; column++) {
      const x = 34 + column * 104;
      const y = 82 + row * 36;
      context.fillStyle = '#26292c';
      context.fillRect(x, y, 84, 26);
      context.fillStyle = (row * 2 + column + index) % 5 === 0 ? '#c4161c' : '#e8e8e2';
      context.fillRect(x + 6, y + 6, 20, 14);
      context.fillStyle = '#4a4e52';
      context.font = '11px Arial, sans-serif';
      context.textAlign = 'left';
      context.fillText(`${row * 2 + column + 1}`, x + 34, y + 18);
    }
  }
  context.fillStyle = '#e0b323';
  context.fillRect(0, 300, 256, 20);
  context.fillStyle = '#1a1c1e';
  context.font = 'bold 13px Arial, sans-serif';
  context.textAlign = 'center';
  context.fillText('DANGER  400V', 128, 315);
  return texture;
}

function breakers(scene: THREE.Object3D, objective: Extract<Objective, { kind: 'breakers' }>, glowMap: THREE.Texture): Sync {
  const panels = objective.panels.map((fitting, index) => {
    const group = onWall(scene, fitting);
    mesh(group, new RoundedBoxGeometry(0.62, 0.86, 0.18, 2, 0.02), CABINET, 0, 0, 0.09);
    mesh(group, new THREE.PlaneGeometry(0.54, 0.76), new THREE.MeshStandardMaterial({ map: breakerFace(index, objective.panels.length), roughness: 0.6 }), 0, 0, 0.181);
    // The door, swung open against the wall.
    const door = mesh(group, new RoundedBoxGeometry(0.6, 0.84, 0.025, 2, 0.008), CABINET, -0.6, 0, 0.32);
    door.rotation.y = -1.25;
    mesh(group, new THREE.BoxGeometry(0.62, 0.05, 0.005), HAZARD, 0, 0.38, 0.184);
    // The handle: a housing on the side, and the arm that swings from down to up.
    mesh(group, new RoundedBoxGeometry(0.14, 0.34, 0.16, 2, 0.02), DARK, 0.38, -0.05, 0.08);
    const lever = new THREE.Group();
    lever.position.set(0.38, -0.05, 0.16);
    group.add(lever);
    mesh(lever, new THREE.CylinderGeometry(0.02, 0.02, 0.24, 8), DARK, 0, 0, 0.12).rotation.x = Math.PI / 2;
    mesh(lever, new THREE.SphereGeometry(0.04, 12, 8), new THREE.MeshStandardMaterial({ color: 0xc4161c, roughness: 0.35 }), 0, 0, 0.25);
    const lampMaterial = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: OFF, emissiveIntensity: 2 });
    mesh(group, new THREE.SphereGeometry(0.03, 12, 8), lampMaterial, 0.22, 0.47, 0.12);
    const halo = glowSprite(group, glowMap, AMBER, 1.4, 0, 0, 0.4);
    const light = new THREE.PointLight(AMBER, 3, 6, 2);
    light.position.set(0, 0.2, 0.6);
    group.add(light);
    // A cable tray up to the ceiling.
    mesh(group, new THREE.BoxGeometry(0.16, 3.4 - 0.43 - fitting.position.y, 0.06), DARK, 0, (3.4 - fitting.position.y + 0.43) / 2, 0.04);
    return { lever, lampMaterial, halo, light };
  });
  return (state, time) => {
    panels.forEach(({ lever, lampMaterial, halo, light }, index) => {
      const tick = state.objective.thrown[index] ?? -1;
      const thrown = tick >= 0;
      const swing = thrown ? Math.min(1, (state.tick - tick) / (0.25 * config.ticksPerSecond)) : 0;
      lever.rotation.x = 0.75 - 1.5 * swing;
      lampMaterial.emissive.copy(thrown ? ON : OFF);
      const beat = settings.reducedFlashing ? 0.7 : 0.55 + 0.45 * Math.sin(time * 3.2 + index);
      halo.material.opacity = thrown ? 0 : 0.5 * beat;
      light.intensity = thrown ? 0 : 3 * beat;
    });
  };
}

// The charger in recovery: a cabinet with a screen and a column of lights showing the charge, the
// helipad's battery pack sitting on top of it wired in, and a beacon that turns while it charges.
function charger(scene: THREE.Object3D, objective: Extract<Objective, { kind: 'charge' } | { kind: 'signal' }>, glowMap: THREE.Texture, title: string): { sync: Sync; group: THREE.Group } {
  const group = onWall(scene, objective.device);
  mesh(group, new RoundedBoxGeometry(1.2, 1.55, 0.55, 2, 0.03), CABINET, 0, 0.775, 0.3);
  mesh(group, new THREE.BoxGeometry(1.22, 0.08, 0.57), HAZARD, 0, 0.04, 0.3);
  mesh(group, new THREE.BoxGeometry(1.0, 0.04, 0.02), DARK, 0, 0.22, 0.58);
  for (let k = 0; k < 6; k++) mesh(group, new THREE.BoxGeometry(0.7, 0.012, 0.01), DARK, -0.05, 0.32 + k * 0.05, 0.58);
  const { texture, context } = liveScreen(384, 224);
  const display = new THREE.MeshStandardMaterial({ color: 0x050607, emissive: 0xffffff, emissiveMap: texture, emissiveIntensity: 1.2 });
  mesh(group, new THREE.PlaneGeometry(0.62, 0.36), display, -0.16, 1.15, 0.576);
  mesh(group, new THREE.PlaneGeometry(0.9, 0.16), new THREE.MeshStandardMaterial({ map: labelTexture([{ text: title, size: 54, color: '#ffffff' }], '#1d3f73', 512, 96, '#ffffff'), roughness: 0.6 }), 0, 1.44, 0.576);
  // Ten lights up the side, filling as it charges.
  const cells = Array.from({ length: 10 }, (_, k) => {
    const material = new THREE.MeshStandardMaterial({ color: 0x0b0c0d, emissive: 0x000000, emissiveIntensity: 1.8 });
    mesh(group, new THREE.BoxGeometry(0.12, 0.045, 0.02), material, 0.36, 0.86 + k * 0.058, 0.58);
    return material;
  });
  // The battery pack on top, with its cables.
  mesh(group, new RoundedBoxGeometry(0.8, 0.36, 0.42, 2, 0.03), new THREE.MeshStandardMaterial({ color: 0x2b2f33, roughness: 0.5, metalness: 0.3 }), -0.1, 1.73, 0.3);
  mesh(group, new THREE.PlaneGeometry(0.6, 0.16), new THREE.MeshStandardMaterial({ map: labelTexture([{ text: 'HELIPAD UPS', size: 48, color: '#1a1a1a' }, { text: '48V  /  LITHIUM', size: 26, color: '#1a1a1a' }], '#e0b323', 384, 112, '#1a1a1a'), roughness: 0.6 }), -0.1, 1.74, 0.512);
  const cable = new THREE.MeshStandardMaterial({ color: 0x111214, roughness: 0.7 });
  for (const [x, color] of [[0.2, 0xc4161c], [0.26, 0x111214]] as const) {
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(x, 1.75, 0.3), new THREE.Vector3(x + 0.3, 1.7, 0.45), new THREE.Vector3(0.5, 1.35, 0.58)]);
    mesh(group, new THREE.TubeGeometry(curve, 16, 0.018, 6), color === 0x111214 ? cable : new THREE.MeshStandardMaterial({ color, roughness: 0.6 }), 0, 0, 0);
  }
  const beaconLamp = new THREE.MeshStandardMaterial({ color: 0x331a00, emissive: AMBER, emissiveIntensity: 0, transparent: true, opacity: 0.9 });
  mesh(group, new THREE.CylinderGeometry(0.07, 0.08, 0.14, 16), beaconLamp, 0.42, 1.62, 0.3);
  const halo = glowSprite(group, glowMap, AMBER, 1.2, 0.42, 1.62, 0.3);
  const light = new THREE.PointLight(AMBER, 0, 7, 2);
  light.position.set(0, 1.3, 1.0);
  group.add(light);
  const marker = glowSprite(group, glowMap, ON, 1.8, 0, 1.1, 0.9);

  let shown = '';
  const paint = (percent: number, status: string, tone: string) => {
    const key = `${percent}:${status}`;
    if (key === shown) return;
    shown = key;
    context.fillStyle = '#071014';
    context.fillRect(0, 0, 384, 224);
    context.fillStyle = '#7fa0a8';
    context.font = 'bold 22px monospace';
    context.textAlign = 'left';
    context.fillText(title, 18, 34);
    context.fillStyle = tone;
    context.font = 'bold 74px monospace';
    context.fillText(`${String(percent).padStart(3, ' ')}%`, 18, 118);
    context.strokeStyle = '#2b4248';
    context.lineWidth = 3;
    context.strokeRect(18, 138, 348, 26);
    context.fillRect(22, 142, 340 * (percent / 100), 18);
    context.font = 'bold 22px monospace';
    context.fillText(status, 18, 200);
    texture.needsUpdate = true;
  };

  const sync: Sync = (state, time) => {
    const charge = state.objective.charge / objective.seconds;
    const percent = Math.floor(charge * 100);
    const holding = state.waves.phase === 'hold';
    const running = holding && charging(state);
    const done = state.objective.done || charge >= 1;
    const ready = state.waves.phase === 'search' && !done;
    if (done) paint(100, objective.kind === 'signal' ? 'LIGHTS ON  /  LANDED' : 'CHARGED', '#38e070');
    else if (running) paint(percent, objective.kind === 'signal' ? 'LIGHTS ON  /  INBOUND' : 'CHARGING', '#ffb02a');
    else if (holding) paint(percent, 'PAUSED  /  ROOM EMPTY', '#ff5a3a');
    else if (ready) paint(percent, 'READY  /  PRESS START', '#38e070');
    else paint(percent, 'LOCKED  /  AREA NOT SECURE', '#ff5a3a');
    cells.forEach((cell, k) => cell.emissive.copy(done ? ON : k < Math.floor(charge * 10) ? AMBER : k === Math.floor(charge * 10) && running && Math.sin(time * 8) > 0 ? AMBER : new THREE.Color(0)));
    const spin = running && !settings.reducedFlashing ? 0.5 + 0.5 * Math.sin(time * 9) : running ? 0.7 : 0;
    beaconLamp.emissiveIntensity = 2.4 * spin;
    halo.material.opacity = 0.7 * spin;
    light.intensity = running ? 2 + 3 * spin : done ? 1.5 : 0;
    light.color.copy(done ? ON : AMBER);
    marker.material.opacity = ready ? (settings.reducedFlashing ? 0.5 : 0.35 + 0.25 * Math.sin(time * 3)) : 0;
  };
  return { sync, group };
}

// A yellow hard case of spare helipad lamps, about the size you carry in both arms.
export function buildLampCase(): THREE.Group {
  const group = new THREE.Group();
  const shell = new THREE.MeshStandardMaterial({ color: 0xe8b21c, roughness: 0.45 });
  const black = new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.6 });
  mesh(group, new RoundedBoxGeometry(0.62, 0.26, 0.42, 3, 0.05), shell, 0, 0.13, 0);
  mesh(group, new THREE.BoxGeometry(0.635, 0.025, 0.435), black, 0, 0.17, 0);
  for (const x of [-0.18, 0.18]) mesh(group, new RoundedBoxGeometry(0.08, 0.06, 0.03, 2, 0.01), black, x, 0.16, 0.215);
  mesh(group, new RoundedBoxGeometry(0.2, 0.03, 0.04, 2, 0.012), black, 0, 0.275, 0);
  for (const x of [-0.09, 0.09]) mesh(group, new THREE.BoxGeometry(0.025, 0.03, 0.03), black, x, 0.262, 0);
  mesh(group, new THREE.PlaneGeometry(0.3, 0.09), new THREE.MeshStandardMaterial({
    map: labelTexture([{ text: 'HELIPAD LIGHTING', size: 34, color: '#1a1a1a' }, { text: 'SPARE LAMPS  /  FRAGILE', size: 22, color: '#1a1a1a' }], '#f2f2ec', 384, 112, '#1a1a1a'),
    roughness: 0.7,
  }), 0, 0.09, 0.2115);
  return group;
}

// The lamp cases, a shaft of light over each one lying loose, and the drop-off by the elevator
// where the delivered ones are stacked.
function cases(scene: THREE.Object3D, objective: Extract<Objective, { kind: 'carry' }>, glowMap: THREE.Texture): Sync {
  const items = objective.items.map(() => {
    const group = new THREE.Group();
    scene.add(group);
    group.add(buildLampCase());
    const beam = beacon(group, AMBER, 1.6);
    const halo = glowSprite(group, glowMap, AMBER, 0.9, 0, 0.25, 0);
    return { group, beam, halo };
  });
  const drop = new THREE.Group();
  drop.position.set(objective.dropoff.x, 0.006, objective.dropoff.z);
  scene.add(drop);
  const ringMaterial = new THREE.MeshBasicMaterial({ color: AMBER, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.08, 48), ringMaterial);
  ring.rotation.x = -Math.PI / 2;
  drop.add(ring);
  // A pallet for the cases to stand on.
  const timber = new THREE.MeshStandardMaterial({ color: 0x8a6a44, roughness: 0.85 });
  for (const z of [-0.4, 0, 0.4]) mesh(drop, new THREE.BoxGeometry(1.2, 0.08, 0.1), timber, 0, 0.04, z);
  for (const x of [-0.5, -0.25, 0, 0.25, 0.5]) mesh(drop, new THREE.BoxGeometry(0.1, 0.025, 1.0), timber, x, 0.0925, 0);
  const slots: [number, number, number, number][] = [[-0.3, 0.105, -0.2, 0.05], [0.3, 0.105, 0.2, -0.08], [0, 0.365, 0, 0.3]];

  return (state, time) => {
    const carrying = state.players.some((player) => player.carrying >= 0);
    items.forEach(({ group, beam, halo }, index) => {
      const item = state.objective.items[index];
      if (!item) return;
      if (item.delivered) {
        const order = state.objective.items.filter((other) => other.delivered && other.deliveredTick <= item.deliveredTick).length - 1;
        const [x, y, z, yaw] = slots[Math.min(order, slots.length - 1)];
        group.visible = true;
        group.position.set(objective.dropoff.x + x, y, objective.dropoff.z + z);
        group.rotation.y = yaw;
        beam.visible = halo.visible = false;
        return;
      }
      const free = caseFree(state, index);
      group.visible = free;
      group.position.set(item.x, item.y, item.z);
      group.rotation.y = index * 1.3;
      beam.visible = halo.visible = true;
      pulse(beam, time, index);
      halo.material.opacity = 0.5;
    });
    const done = state.objective.done;
    ringMaterial.color.copy(done ? ON : AMBER);
    ringMaterial.opacity = done ? 0.35 : carrying ? (settings.reducedFlashing ? 0.8 : 0.55 + 0.35 * Math.sin(time * 5)) : 0.3;
  };
}

// The helipad: the painted circle and H, a ring of landing lights round its edge that come on
// when the light box is switched on, floodlights, a windsock, and the helicopter.
function helipadTexture(): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d')!;
  const middle = size / 2;
  context.clearRect(0, 0, size, size);
  // Dark green deck paint, worn at the edges.
  context.fillStyle = '#26332c';
  context.beginPath();
  context.arc(middle, middle, size * 0.49, 0, Math.PI * 2);
  context.fill();
  // The yellow touchdown circle and the white H.
  context.strokeStyle = '#e8c22a';
  context.lineWidth = size * 0.035;
  context.beginPath();
  context.arc(middle, middle, size * 0.36, 0, Math.PI * 2);
  context.stroke();
  context.strokeStyle = '#f0f0ea';
  context.lineWidth = size * 0.012;
  context.beginPath();
  context.arc(middle, middle, size * 0.47, 0, Math.PI * 2);
  context.stroke();
  context.fillStyle = '#f0f0ea';
  const w = size * 0.07;
  const h = size * 0.4;
  context.fillRect(middle - size * 0.15, middle - h / 2, w, h);
  context.fillRect(middle + size * 0.15 - w, middle - h / 2, w, h);
  context.fillRect(middle - size * 0.15, middle - w / 2, size * 0.3, w);
  context.font = `bold ${size * 0.045}px Arial, sans-serif`;
  context.textAlign = 'center';
  context.fillText('7.5 t', middle, middle + size * 0.29);
  // Scuffs and rubber marks.
  for (let i = 0; i < 400; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.sqrt(Math.random()) * size * 0.48;
    context.fillStyle = `rgba(0,0,0,${0.03 + Math.random() * 0.08})`;
    context.fillRect(middle + Math.cos(angle) * radius, middle + Math.sin(angle) * radius, 2 + Math.random() * 18, 1 + Math.random() * 4);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function helipad(scene: THREE.Object3D, objective: Extract<Objective, { kind: 'signal' }>, glowMap: THREE.Texture, environment: THREE.Texture): Sync {
  const { sync: syncBox } = charger(scene, objective, glowMap, 'HELIPAD LIGHTS');
  const pad = new THREE.Group();
  pad.position.set(objective.pad.x, 0, objective.pad.z);
  scene.add(pad);
  const radius = 5.8;
  const deck = new THREE.Mesh(
    new THREE.PlaneGeometry(radius * 2, radius * 2),
    new THREE.MeshStandardMaterial({ map: helipadTexture(), transparent: true, roughness: 0.75, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
  );
  deck.rotation.x = -Math.PI / 2;
  deck.position.y = 0.008;
  deck.receiveShadow = true;
  pad.add(deck);

  // Landing lights round the edge, in a ring that chases round once they are on.
  const count = 20;
  const housing = new THREE.MeshStandardMaterial({ color: 0x2a2e31, roughness: 0.5, metalness: 0.6 });
  const lamps = Array.from({ length: count }, (_, k) => {
    const angle = (k / count) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    mesh(pad, new THREE.CylinderGeometry(0.11, 0.13, 0.06, 12), housing, x, 0.03, z);
    const material = new THREE.MeshStandardMaterial({ color: 0x0c1a10, emissive: ON, emissiveIntensity: 0, transparent: true, opacity: 0.95 });
    mesh(pad, new THREE.SphereGeometry(0.08, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), material, x, 0.06, z);
    const halo = glowSprite(pad, glowMap, ON, 0.9, x, 0.15, z);
    return { material, halo };
  });
  const padLights = [0, 1, 2, 3].map((k) => {
    const angle = (k / 4) * Math.PI * 2 + Math.PI / 4;
    const light = new THREE.PointLight(0x5cff8a, 0, 9, 2);
    light.position.set(Math.cos(angle) * radius * 0.85, 0.6, Math.sin(angle) * radius * 0.85);
    pad.add(light);
    return light;
  });
  // A floodlight on a short post at two corners, aimed in at the H.
  const floods = [[-1, -1], [1, 1]].map(([sx, sz]) => {
    const post = new THREE.Group();
    post.position.set(sx * (radius + 1.2), 0, sz * (radius + 1.2));
    pad.add(post);
    mesh(post, new THREE.CylinderGeometry(0.05, 0.06, 1.6, 10), housing, 0, 0.8, 0);
    const head = mesh(post, new RoundedBoxGeometry(0.42, 0.3, 0.2, 2, 0.03), housing, 0, 1.7, 0);
    head.lookAt(pad.position.x, 0, pad.position.z);
    const face = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xf4f6ff, emissiveIntensity: 0 });
    const lens = mesh(post, new THREE.PlaneGeometry(0.36, 0.24), face, 0, 1.7, 0);
    lens.lookAt(new THREE.Vector3(-sx * 10, 0, -sz * 10).add(post.position).add(pad.position));
    lens.translateZ(0.11);
    const spot = new THREE.SpotLight(0xf4f6ff, 0, 22, 0.75, 0.6, 1.4);
    spot.position.set(0, 1.7, 0);
    spot.target.position.set(-sx * (radius + 1.2), 0, -sz * (radius + 1.2));
    post.add(spot, spot.target);
    return { face, spot };
  });
  // A windsock on a pole beside the pad.
  const sockPole = new THREE.Group();
  sockPole.position.set(radius + 2.4, 0, -radius + 0.5);
  pad.add(sockPole);
  mesh(sockPole, new THREE.CylinderGeometry(0.04, 0.05, 3.2, 8), new THREE.MeshStandardMaterial({ color: 0xd8d8d0, roughness: 0.5 }), 0, 1.6, 0);
  const sock = new THREE.Group();
  sock.position.set(0, 3.1, 0);
  sockPole.add(sock);
  const sockMaterial = new THREE.MeshStandardMaterial({ color: 0xff6a1a, roughness: 0.8, side: THREE.DoubleSide });
  const stripe = new THREE.MeshStandardMaterial({ color: 0xf2f2ec, roughness: 0.8, side: THREE.DoubleSide });
  for (let k = 0; k < 5; k++) {
    const piece = mesh(sock, new THREE.CylinderGeometry(0.22 - k * 0.03, 0.25 - k * 0.03, 0.34, 14, 1, true), k % 2 ? stripe : sockMaterial, 0, 0, 0.2 + k * 0.33);
    piece.rotation.x = Math.PI / 2;
  }
  const syncHelicopter = buildHelicopter(scene, glowMap, environment);

  return (state, time, dt) => {
    syncBox(state, time, dt);
    const on = state.objective.startedTick >= 0 || state.objective.done;
    lamps.forEach(({ material, halo }, k) => {
      const chase = settings.reducedFlashing ? 1 : 0.45 + 0.55 * Math.max(0, Math.cos(time * 4 - (k / count) * Math.PI * 2));
      material.emissiveIntensity = on ? 2.6 * chase : 0.05;
      halo.material.opacity = on ? 0.75 * chase : 0;
    });
    for (const light of padLights) light.intensity = on ? 5 : 0;
    for (const { face, spot } of floods) {
      face.emissiveIntensity = on ? 2.2 : 0;
      spot.intensity = on ? 70 : 0;
    }
    sock.rotation.y = Math.sin(time * 0.4) * 0.3 + 0.6;
    sock.rotation.x = Math.sin(time * 1.7) * 0.05 + 0.15;
    syncHelicopter(state, time, dt);
  };
}

export function buildObjective(scene: THREE.Object3D, level: Level, glowMap: THREE.Texture, environment: THREE.Texture): Sync {
  const objective = level.objective;
  if (!objective) return () => {};
  switch (objective.kind) {
    case 'keycard': return keycard(scene, objective, glowMap);
    case 'breakers': return breakers(scene, objective, glowMap);
    case 'charge': return charger(scene, objective, glowMap, 'BATTERY CHARGER').sync;
    case 'carry': return cases(scene, objective, glowMap);
    case 'signal': return helipad(scene, objective, glowMap, environment);
  }
}
