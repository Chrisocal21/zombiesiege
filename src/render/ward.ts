import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { settings } from '../client/settings';
import type { GameState } from '../game/state';
import type { Level } from '../levels/types';
import { labelTexture } from './streetTextures';

const STEEL = new THREE.MeshStandardMaterial({ color: 0x8a9096, roughness: 0.4, metalness: 0.85 });
const FRAME = new THREE.MeshStandardMaterial({ color: 0x3a4046, roughness: 0.5, metalness: 0.7 });

// How long a bought door takes to slide up into the ceiling, in ticks.
const OPEN_TICKS = 70;

// The steel doors that stay shut until paid for. Each has a sign with its price and a light that
// turns from red to green, and slides up into the ceiling once opened.
export function buildLocks(scene: THREE.Object3D, level: Level, glowMap: THREE.Texture): (state: GameState, time: number) => void {
  const doors = level.locks.map((lock) => {
    const group = new THREE.Group();
    group.position.set(lock.position.x, 0, lock.position.z);
    group.rotation.y = Math.atan2(lock.normal.x, lock.normal.z);
    scene.add(group);

    for (const side of [-1, 1]) {
      const jamb = new THREE.Mesh(new RoundedBoxGeometry(0.2, lock.height + 0.2, 0.4, 2, 0.02), FRAME);
      jamb.position.set(side * (lock.width / 2 + 0.1), (lock.height + 0.2) / 2, 0);
      jamb.castShadow = true;
      group.add(jamb);
    }
    const header = new THREE.Mesh(new RoundedBoxGeometry(lock.width + 0.4, 0.2, 0.4, 2, 0.02), FRAME);
    header.position.set(0, lock.height + 0.1, 0);
    group.add(header);

    const leaf = new THREE.Group();
    const slab = new THREE.Mesh(new RoundedBoxGeometry(lock.width, lock.height, 0.12, 2, 0.015), STEEL);
    slab.castShadow = slab.receiveShadow = true;
    leaf.add(slab);
    // The price, on both faces.
    const texture = labelTexture(
      [{ text: 'LOCKED', size: 62, color: '#ff6a58' }, { text: lock.label.toUpperCase(), size: 34, color: '#e4e8df' }, { text: `${lock.cost} PTS`, size: 56, color: '#ffd24a' }],
      '#14181b', 512, 320, '#ff6a58',
    );
    for (const side of [-1, 1]) {
      const face = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.75), new THREE.MeshBasicMaterial({ map: texture }));
      face.position.set(0, 0.1, side * 0.065);
      if (side < 0) face.rotation.y = Math.PI;
      leaf.add(face);
    }
    leaf.position.y = lock.height / 2;
    group.add(leaf);

    const lamp = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: glowMap, color: 0xff3a22, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.8 }),
    );
    lamp.scale.setScalar(0.6);
    lamp.position.set(0, lock.height + 0.3, 0.3);
    group.add(lamp);
    const light = new THREE.PointLight(0xff3a22, 4, 5, 2);
    light.position.set(0, lock.height - 0.2, 0.7);
    group.add(light);
    return { lock, leaf, lamp, light };
  });

  return (state) => {
    doors.forEach(({ lock, leaf, lamp, light }, index) => {
      const lockState = state.locks[index];
      const open = lockState?.open ?? false;
      const progress = open ? Math.min(1, (state.tick - lockState.openedTick) / OPEN_TICKS) : 0;
      const eased = progress * progress * (3 - 2 * progress);
      leaf.position.y = lock.height / 2 + eased * (lock.height + 0.15);
      leaf.visible = progress < 1;
      const color = open ? 0x38e070 : 0xff3a22;
      (lamp.material as THREE.SpriteMaterial).color.setHex(color);
      light.color.setHex(color);
      light.intensity = open ? 1.5 : 4;
    });
  };
}

// The keycard lying on the manager's desk, turning slowly in a pillar of light until it is taken.
export function buildObjective(scene: THREE.Object3D, level: Level, glowMap: THREE.Texture): (state: GameState, time: number) => void {
  const objective = level.objective;
  if (!objective) return () => {};
  const group = new THREE.Group();
  group.position.set(objective.position.x, objective.position.y, objective.position.z);
  scene.add(group);

  const card = new THREE.Group();
  const body = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.012, 0.14, 2, 0.004), new THREE.MeshStandardMaterial({ color: 0xe8eaec, roughness: 0.4 }));
  card.add(body);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.0125, 0.03), new THREE.MeshStandardMaterial({ color: 0x38e070, emissive: 0x38e070, emissiveIntensity: 0.9 }));
  stripe.position.z = -0.03;
  card.add(stripe);
  const chip = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.0135, 0.03), new THREE.MeshStandardMaterial({ color: 0xc8943a, metalness: 0.9, roughness: 0.3 }));
  chip.position.set(-0.06, 0, 0.03);
  card.add(chip);
  card.position.y = 0.12;
  group.add(card);

  const beamGeometry = new THREE.CylinderGeometry(0.05, 0.14, 0.9, 12, 1, true);
  const beamColors = new Float32Array(beamGeometry.attributes.position.count * 3);
  for (let i = 0; i < beamGeometry.attributes.position.count; i++) {
    const brightness = 1 - (beamGeometry.attributes.position.getY(i) + 0.45) / 0.9;
    beamColors.set([0.2 * brightness, brightness, 0.45 * brightness], i * 3);
  }
  beamGeometry.setAttribute('color', new THREE.BufferAttribute(beamColors, 3));
  const beam = new THREE.Mesh(beamGeometry, new THREE.MeshBasicMaterial({
    vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: 0.45,
  }));
  beam.position.y = 0.55;
  group.add(beam);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowMap, color: 0x38e070, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.6 }));
  halo.scale.setScalar(0.8);
  halo.position.y = 0.2;
  group.add(halo);
  const light = new THREE.PointLight(0x38e070, 2.5, 4, 2);
  light.position.y = 0.5;
  group.add(light);

  return (state, time) => {
    group.visible = !state.objective.done;
    card.rotation.y = time * 1.2;
    card.position.y = 0.12 + Math.sin(time * 2) * 0.02;
    (beam.material as THREE.MeshBasicMaterial).opacity = settings.reducedFlashing ? 0.25 : 0.3 + 0.12 * Math.sin(time * 2.4);
  };
}

// Light panels in the ceiling and signs on the walls that make a floor of rooms read as a hospital.
export function buildWardDressing(scene: THREE.Object3D, level: Level): void {
  const panel = new THREE.MeshBasicMaterial({ color: 0xf2f6ff });
  for (const light of level.lights) {
    const fitting = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.04, 0.5), panel);
    fitting.position.set(light.position.x, 3.38, light.position.z);
    scene.add(fitting);
  }
  for (const sign of level.signs) {
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(sign.width, sign.height),
      new THREE.MeshBasicMaterial({
        map: labelTexture([{ text: sign.text, size: 80, color: '#ffffff' }, { text: sign.sub, size: 38, color: '#bfe8d8' }], sign.background, 768, 256, '#ffffff'),
      }),
    );
    face.position.set(sign.position.x, sign.position.y, sign.position.z);
    face.rotation.y = sign.rotation;
    scene.add(face);
  }
}
