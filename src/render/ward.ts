import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { circuitLive, type GameState } from '../game/state';
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

// Light panels in the ceiling and signs on the walls that make a floor of rooms read as a hospital.
// On a floor with the power out, each circuit's panels stay dark until its breaker is thrown.
export function buildWardDressing(scene: THREE.Object3D, level: Level): (state: GameState) => void {
  const panels = new Map<number, THREE.MeshBasicMaterial>();
  const lit = new THREE.Color(0xf2f6ff);
  for (const light of level.lights) {
    if (!light.ceiling || light.emergency) continue;
    const circuit = light.circuit ?? -1;
    let panel = panels.get(circuit);
    if (!panel) {
      panel = new THREE.MeshBasicMaterial({ color: lit });
      panels.set(circuit, panel);
    }
    const fitting = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.04, 0.5), panel);
    fitting.position.set(light.position.x, 3.38, light.position.z);
    scene.add(fitting);
  }
  // Signs are lit by the room, with a faint glow of their own so they still read in the dark.
  for (const sign of level.signs) {
    const map = labelTexture([{ text: sign.text, size: 80, color: '#ffffff' }, { text: sign.sub, size: 38, color: '#bfe8d8' }], sign.background, 768, 256, '#ffffff');
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(sign.width, sign.height),
      new THREE.MeshStandardMaterial({ map, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: 0.3, roughness: 0.5 }),
    );
    face.position.set(sign.position.x, sign.position.y, sign.position.z);
    face.rotation.y = sign.rotation;
    scene.add(face);
  }
  const dark = new THREE.Color(0x15171a);
  return (state) => {
    for (const [circuit, panel] of panels) panel.color.copy(circuitLive(state, circuit < 0 ? undefined : circuit) ? lit : dark);
  };
}
