import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { config } from '../config';
import type { GameState, Zombie } from '../game/state';
import { clothTexture, skinTexture } from './materials';

const SHIRTS = ['#6b3d2f', '#3d5060', '#55553d', '#733030', '#4a3d5c', '#3b5a48'];
const PANTS = ['#2a2f38', '#3a3328', '#262a30', '#33302f'];

// Ticks the swing animation lasts, and the flash after a hit.
const SWING_TICKS = 50;
const FLASH_TICKS = 16;

interface ZombieView {
  group: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  armLeft: THREE.Group;
  armRight: THREE.Group;
  legLeft: THREE.Group;
  legRight: THREE.Group;
  materials: THREE.MeshStandardMaterial[];
  phase: number;
  initialised: boolean;
}

export interface ZombieViews {
  // Call once per frame. Creates, moves, animates and removes the zombie models to match the state.
  update(state: GameState, frameSeconds: number): void;
}

const box = (w: number, h: number, d: number, radius = 0.025) => new RoundedBoxGeometry(w, h, d, 2, radius);

export function createZombieViews(scene: THREE.Scene): ZombieViews {
  const skinMap = skinTexture();
  const clothMap = clothTexture();
  const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xff6a2c });
  const mouthMaterial = new THREE.MeshBasicMaterial({ color: 0x120706 });

  const geometry = {
    thigh: box(0.19, 0.9, 0.21),
    boot: box(0.2, 0.12, 0.3, 0.04),
    torso: box(0.48, 0.64, 0.27, 0.06),
    shoulder: box(0.14, 0.14, 0.15, 0.05),
    upperArm: box(0.12, 0.34, 0.13),
    foreArm: box(0.1, 0.36, 0.11),
    hand: box(0.09, 0.13, 0.1, 0.03),
    neck: box(0.1, 0.1, 0.1),
    head: box(0.25, 0.29, 0.27, 0.07),
    jaw: box(0.2, 0.07, 0.2, 0.025),
    eye: box(0.045, 0.03, 0.02, 0.008),
    mouth: box(0.13, 0.04, 0.02, 0.008),
  };

  const views = new Map<number, ZombieView>();

  function build(zombie: Zombie): ZombieView {
    const shirt = SHIRTS[zombie.id % SHIRTS.length];
    const pants = PANTS[(zombie.id * 7) % PANTS.length];
    const make = (map: THREE.Texture, color: string, roughness: number) =>
      new THREE.MeshStandardMaterial({ map, bumpMap: map, bumpScale: 1.5, color, roughness, emissive: 0xff1c10, emissiveIntensity: 0 });
    const skin = make(skinMap, '#ffffff', 0.78);
    const shirtMaterial = make(clothMap, shirt, 0.95);
    const pantsMaterial = make(clothMap, pants, 0.95);

    const mesh = (geo: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D) => {
      const m = new THREE.Mesh(geo, material);
      m.position.set(x, y, z);
      m.castShadow = true;
      m.receiveShadow = true;
      parent.add(m);
      return m;
    };
    const joint = (x: number, y: number, z: number, parent: THREE.Object3D) => {
      const g = new THREE.Group();
      g.position.set(x, y, z);
      parent.add(g);
      return g;
    };

    const group = new THREE.Group();

    const legLeft = joint(-0.12, 0.92, 0, group);
    const legRight = joint(0.12, 0.92, 0, group);
    for (const leg of [legLeft, legRight]) {
      mesh(geometry.thigh, pantsMaterial, 0, -0.45, 0, leg);
      mesh(geometry.boot, pantsMaterial, 0, -0.86, -0.05, leg);
    }

    const torso = joint(0, 0.92, 0, group);
    mesh(geometry.torso, shirtMaterial, 0, 0.34, 0, torso);

    const head = joint(0, 1.6, 0, torso);
    head.position.y = 0.68;
    mesh(geometry.neck, skin, 0, -0.03, 0, head);
    mesh(geometry.head, skin, 0, 0.14, -0.01, head);
    mesh(geometry.jaw, skin, 0, -0.04, -0.02, head);
    const eyeLeft = mesh(geometry.eye, eyeMaterial, -0.06, 0.17, -0.145, head);
    const eyeRight = mesh(geometry.eye, eyeMaterial, 0.06, 0.17, -0.145, head);
    eyeLeft.castShadow = eyeRight.castShadow = false;
    mesh(geometry.mouth, mouthMaterial, 0, 0.02, -0.12, head).castShadow = false;

    const armLeft = joint(-0.31, 0.6, 0, torso);
    const armRight = joint(0.31, 0.6, 0, torso);
    for (const arm of [armLeft, armRight]) {
      mesh(geometry.shoulder, shirtMaterial, 0, 0.0, 0, arm);
      mesh(geometry.upperArm, shirtMaterial, 0, -0.2, 0, arm);
      const forearm = joint(0, -0.38, 0, arm);
      forearm.rotation.x = 0.35;
      mesh(geometry.foreArm, skin, 0, -0.18, 0, forearm);
      mesh(geometry.hand, skin, 0, -0.42, 0, forearm);
    }

    scene.add(group);
    return {
      group,
      torso,
      head,
      armLeft,
      armRight,
      legLeft,
      legRight,
      materials: [skin, shirtMaterial, pantsMaterial],
      phase: zombie.id * 1.7,
      initialised: false,
    };
  }

  function dispose(view: ZombieView): void {
    scene.remove(view.group);
    for (const material of view.materials) material.dispose();
  }

  return {
    update(state, frameSeconds) {
      const live = new Set<number>();
      const smoothing = 1 - Math.exp(-frameSeconds * 28);

      for (const zombie of state.zombies) {
        live.add(zombie.id);
        let view = views.get(zombie.id);
        if (!view) {
          view = build(zombie);
          views.set(zombie.id, view);
        }

        const group = view.group;
        if (!view.initialised) {
          group.position.set(zombie.x, 0, zombie.z);
          group.rotation.y = zombie.yaw;
          view.initialised = true;
        }
        // The state moves in 120 Hz steps; this eases the model along so it stays smooth.
        const before = group.position.clone();
        group.position.x += (zombie.x - group.position.x) * smoothing;
        group.position.z += (zombie.z - group.position.z) * smoothing;
        let turn = zombie.yaw - group.rotation.y;
        turn = Math.atan2(Math.sin(turn), Math.cos(turn));
        group.rotation.y += turn * (1 - Math.exp(-frameSeconds * 12));
        const speed = frameSeconds > 0 ? group.position.distanceTo(before) / frameSeconds : 0;

        view.phase += speed * frameSeconds * 2.6;
        const swing = Math.sin(view.phase);
        const walking = Math.min(1, speed / 1.2);
        const limp = zombie.id % 3 === 0 ? 0.55 : 1;

        view.legLeft.rotation.x = swing * 0.6 * walking * limp;
        view.legRight.rotation.x = -swing * 0.6 * walking;
        view.torso.rotation.x = -(0.16 + Math.abs(swing) * 0.03 * walking);
        view.torso.rotation.z = swing * 0.05 * walking;
        view.head.rotation.z = Math.sin(view.phase * 0.5 + zombie.id) * 0.12 + (zombie.id % 2 ? 0.1 : -0.1);
        view.head.rotation.x = -0.08;

        // Arms reach out in front, swaying a little. A swing brings them up and down hard.
        const sinceSwing = state.tick - zombie.lastAttackTick;
        const swinging = zombie.lastAttackTick >= 0 && sinceSwing < SWING_TICKS;
        let reach = 1.35;
        if (swinging) {
          const t = sinceSwing / SWING_TICKS;
          reach = 2.35 - 1.9 * t * t;
        }
        view.armLeft.rotation.x = reach + Math.sin(view.phase * 0.9) * 0.08;
        view.armRight.rotation.x = reach - Math.sin(view.phase * 0.9) * 0.08;
        view.armLeft.rotation.z = 0.06;
        view.armRight.rotation.z = -0.06;

        const sinceHit = state.tick - zombie.lastHitTick;
        const flash = zombie.lastHitTick >= 0 && sinceHit < FLASH_TICKS ? 1 - sinceHit / FLASH_TICKS : 0;
        for (const material of view.materials) material.emissiveIntensity = flash * 0.9;

        if (zombie.dead) {
          // Falls over backwards and lies there.
          const t = Math.min(1, 1 - zombie.deadLeft / (config.zombie.deathSeconds * 0.45));
          const fall = 1 - (1 - t) * (1 - t);
          group.rotation.x = (Math.PI / 2) * fall;
          group.position.y = 0.14 * fall;
          view.armLeft.rotation.x = view.armRight.rotation.x = 1.35 - 1.1 * fall;
        }
      }

      for (const [id, view] of views) {
        if (live.has(id)) continue;
        dispose(view);
        views.delete(id);
      }
    },
  };
}
