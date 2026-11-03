import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { config } from '../config';
import { settings } from '../client/settings';
import type { GameState } from '../game/state';
import { storeyLabel } from '../game/tower';
import type { Level } from '../levels/types';

const FRAME = new THREE.MeshStandardMaterial({ color: 0x8a8f96, roughness: 0.35, metalness: 0.85 });
const DOOR = new THREE.MeshStandardMaterial({ color: 0xa9aeb4, roughness: 0.3, metalness: 0.9 });

function displayTexture(): { texture: THREE.CanvasTexture; draw: (label: string, open: boolean) => void } {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const context = canvas.getContext('2d')!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return {
    texture,
    draw(label, open) {
      context.fillStyle = '#0b0d10';
      context.fillRect(0, 0, 512, 160);
      context.strokeStyle = '#8a8f96';
      context.lineWidth = 6;
      context.strokeRect(3, 3, 506, 154);
      context.textAlign = 'center';
      context.fillStyle = '#ffffff';
      context.font = '700 54px Bahnschrift, Arial Narrow, sans-serif';
      context.fillText('ELEVATOR', 256, 70);
      context.fillStyle = open ? '#38e070' : '#ffd24a';
      context.font = '700 46px Bahnschrift, Arial Narrow, sans-serif';
      context.fillText(label === 'ROOF' ? '▲  ROOF' : `▲  FLOOR ${label}`, 256, 130);
      texture.needsUpdate = true;
    },
  };
}

// The elevator: a steel frame, two sliding doors, a sign that says which floor is next, and a lit
// cab behind the wall. The doors are solid in the rules while shut and drawn from the game state.
export function buildLift(scene: THREE.Object3D, level: Level, glowMap: THREE.Texture): (state: GameState, time: number) => void {
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
    const leaf = new THREE.Mesh(new RoundedBoxGeometry(leafWidth, lift.height, 0.06, 2, 0.01), DOOR);
    leaf.castShadow = leaf.receiveShadow = true;
    leaf.position.set(side * leafWidth / 2, lift.height / 2, -0.2);
    group.add(leaf);
    return { leaf, side };
  });

  const display = displayTexture();
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.53), new THREE.MeshBasicMaterial({ map: display.texture }));
  sign.position.set(0, lift.height + 0.55, 0.22);
  group.add(sign);

  // The cab behind the wall is lit from the ceiling.
  const cab = new THREE.Group();
  cab.position.set(lift.position.x - lift.normal.x * (0.25 + lift.cabDepth / 2), 3.2, lift.position.z - lift.normal.z * (0.25 + lift.cabDepth / 2));
  const light = new THREE.PointLight(0xfff0d0, 14, 7, 2);
  cab.add(light);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowMap, color: 0xfff0d0, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.5 }));
  glow.scale.setScalar(1.2);
  cab.add(glow);
  scene.add(cab);

  let shownFloor = -1;
  let shownOpen: boolean | null = null;
  const travel = leafWidth + 0.05;

  return (state, time) => {
    const doorTicks = config.elevator.doorSeconds * config.ticksPerSecond;
    const since = state.lift.changedTick < 0 ? Infinity : (state.tick - state.lift.changedTick) / doorTicks;
    const progress = state.lift.open ? Math.min(1, since) : Math.max(0, 1 - since);
    const eased = progress * progress * (3 - 2 * progress);
    for (const { leaf, side } of leaves) leaf.position.x = side * (leafWidth / 2 + travel * eased);

    if (state.floor !== shownFloor || state.lift.open !== shownOpen) {
      shownFloor = state.floor;
      shownOpen = state.lift.open;
      display.draw(storeyLabel(state.floor + 1), state.lift.open);
    }
    const riding = state.waves.phase === 'ride';
    const pulse = settings.reducedFlashing ? 1 : 0.7 + 0.3 * Math.sin(time * 6);
    light.intensity = (riding ? 10 * pulse : 14) * (0.5 + 0.5 * Math.max(eased, riding ? 1 : 0.4));
  };
}
