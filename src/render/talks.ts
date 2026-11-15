import * as THREE from 'three';
import type { GameState } from '../game/state';
import type { Level } from '../levels/types';

// What stands where a floor has someone to talk to (Level.talks): a field radio, a box with a handset
// and a whip aerial, with a green lamp that pulses while there is still something to say and goes out
// once the talk is settled.

type Sync = (state: GameState, time: number) => void;

export function buildTalks(scene: THREE.Object3D, level: Level, glowMap: THREE.Texture): Sync {
  const talks = level.talks ?? [];
  if (talks.length === 0) return () => {};
  const casing = new THREE.MeshStandardMaterial({ color: '#39422f', roughness: 0.6, metalness: 0.3 });
  const dark = new THREE.MeshStandardMaterial({ color: '#141614', roughness: 0.5, metalness: 0.5 });
  const lamps = talks.map((talk) => {
    const group = new THREE.Group();
    group.position.set(talk.position.x, talk.position.y, talk.position.z);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.24, 0.16), casing);
    body.position.y = 0.12;
    body.castShadow = true;
    const face = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.02), dark);
    face.position.set(-0.04, 0.14, 0.085);
    const handset = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.2), dark);
    handset.position.set(0, 0.265, 0);
    const aerial = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.006, 0.7, 6), dark);
    aerial.position.set(0.14, 0.59, -0.05);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), new THREE.MeshBasicMaterial({ color: '#58ff9a' }));
    lamp.position.set(0.12, 0.2, 0.085);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowMap, color: '#58ff9a', blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
    glow.position.copy(lamp.position);
    glow.scale.setScalar(0.5);
    group.add(body, face, handset, aerial, lamp, glow);
    scene.add(group);
    return { lamp: lamp.material, glow: glow.material };
  });
  const lit = new THREE.Color('#58ff9a').multiplyScalar(3);
  return (state, time) => {
    lamps.forEach((each, index) => {
      const talk = talks[index];
      const done = state.talks[index]?.done ?? false;
      const waiting = talk.step !== undefined && state.objective.step !== talk.step;
      const pulse = done ? 0 : waiting ? 0.2 : 0.55 + 0.45 * Math.sin(time * 3.2);
      each.lamp.color.copy(lit).multiplyScalar(pulse);
      each.glow.opacity = 0.7 * pulse;
    });
  };
}
