import * as THREE from 'three';
import type { GameState } from '../game/state';
import { SURVIVOR_MODEL, createJoints, rig, type Joints, type RiggedBody } from './characterRig';
import { loadModel } from './models';

// The scientist, once he is out of the vault: the survivor's body in a clean white lab coat to the
// knees, no gun, the sample case in his right hand. He walks where the rules put him. Until the model
// loads he is not drawn.

export interface ScientistView { update(state: GameState, dt: number): void }

// A long coat, open down the front, hanging from the shoulders like the zombies' garments do.
const COAT = new THREE.MeshStandardMaterial({ color: '#eef2f4', roughness: 0.85, side: THREE.DoubleSide });

function labCoat(): THREE.Object3D {
  const length = 1.02;
  const arc = Math.PI * 2 * 0.88;
  // The gap faces forward.
  const geometry = new THREE.CylinderGeometry(0.205, 0.28, length, 24, 6, true, Math.PI / 2 + (Math.PI * 2 - arc) / 2, arc);
  const coat = new THREE.Mesh(geometry, COAT);
  coat.scale.z = 0.78;
  coat.position.set(0, 0.26 - length / 2, 0.01);
  coat.castShadow = true;
  // A collar, and a pen in the breast pocket.
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.022, 6, 18, Math.PI * 1.3), COAT);
  collar.rotation.set(Math.PI / 2, 0, Math.PI * 0.85);
  collar.position.set(0, 0.25, 0.01);
  const pen = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.11, 6), new THREE.MeshStandardMaterial({ color: '#1d3f73' }));
  pen.position.set(0.09, 0.12, 0.13);
  const group = new THREE.Group();
  group.add(coat, collar, pen);
  return group;
}

// A coat sleeve down an arm bone, which runs along its own y.
function sleeve(length: number, radius: number): THREE.Object3D {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.92, length, 12, 1, true), COAT);
  mesh.position.y = length / 2;
  mesh.castShadow = true;
  return mesh;
}

// The sample case at his right side, held by its handle: brushed steel, its long side along the way
// he faces, with a blue status light. It hangs from the body, not the hand, so it stays upright.
function sampleCase(): THREE.Object3D {
  const group = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: '#b9c1c8', metalness: 0.85, roughness: 0.32 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.42), steel);
  body.position.y = 0.15;
  body.castShadow = true;
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, 0.14), new THREE.MeshStandardMaterial({ color: '#2a2e33', roughness: 0.6 }));
  handle.position.y = 0.32;
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.102, 0.03, 0.05), new THREE.MeshStandardMaterial({ color: '#4fc3ff', emissive: '#4fc3ff', emissiveIntensity: 2 }));
  lamp.position.set(0, 0.24, -0.15);
  group.add(body, handle, lamp);
  // At the right hand's height, beside the hip, facing -z with the body.
  group.position.set(0.3, 0.42, 0);
  return group;
}

// His own clothes under the coat, clean: a pale shirt, dark trousers, no gloves.
function dressPlain(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const name = (child.material as THREE.Material).name;
    if (name.startsWith('Glove')) child.visible = false;
    if (name.startsWith('Top')) child.material = new THREE.MeshStandardMaterial({ color: '#c9d6e2', roughness: 0.8 });
    if (name.startsWith('Bottom')) child.material = new THREE.MeshStandardMaterial({ color: '#3a3f46', roughness: 0.85 });
  });
}

export function createScientistView(scene: THREE.Object3D): ScientistView {
  let template: THREE.Object3D | null = null;
  void loadModel(SURVIVOR_MODEL).then((model) => { template = model.scene; });
  let figure: { group: THREE.Group; joints: Joints; body: RiggedBody; phase: number; gait: number } | null = null;

  function build(): NonNullable<typeof figure> {
    const group = new THREE.Group();
    group.name = 'The scientist';
    const body = rig(template!);
    group.add(body.object);
    dressPlain(body.object);
    body.attach('Spine1', labCoat());
    for (const side of ['Left', 'Right']) {
      body.attach(`${side}Arm`, sleeve(0.28, 0.068));
      body.attach(`${side}ForeArm`, sleeve(0.24, 0.058));
    }
    group.add(sampleCase());
    scene.add(group);
    return { group, joints: createJoints(), body, phase: 0, gait: 0 };
  }

  function pose(speed: number, dt: number, time: number): void {
    const { joints } = figure!;
    figure!.gait += (Math.min(1, speed / 3) - figure!.gait) * Math.min(1, dt * 8);
    figure!.phase += Math.min(speed, 6) * dt * 2.6;
    const gait = figure!.gait, swing = Math.sin(figure!.phase) * gait;
    const breathe = Math.sin(time * 1.3) * 0.015;
    joints.hips.position.y = 0.94 + Math.abs(Math.sin(figure!.phase)) * 0.02 * gait;
    // Shoulders a little hunched over the case, glancing about.
    joints.torso.rotation.set(-0.1 - 0.08 * gait + breathe, swing * 0.06, 0);
    joints.head.rotation.set(-0.05, Math.sin(time * 0.7) * 0.25 * (1 - gait), 0);
    joints.legs.forEach((leg, i) => {
      const step = i === 0 ? swing : -swing;
      leg.rotation.set(step * 0.5, 0, 0);
      joints.knees[i].rotation.set(-Math.max(0, -step) * 0.7 - 0.03, 0, 0);
      joints.ankles[i].rotation.set(0, 0, 0);
    });
    // The left arm swings; the right holds the case close.
    joints.arms[0].rotation.set(-swing * 0.4 + 0.05, 0, 0.08);
    joints.elbows[0].rotation.set(0.25 + 0.15 * gait, 0, 0);
    joints.wrists[0].rotation.set(0, 0, 0);
    joints.arms[1].rotation.set(0.02, 0, -0.16);
    joints.elbows[1].rotation.set(0.1, 0, 0);
    joints.wrists[1].rotation.set(0, 0, 0);
    figure!.body.pose(joints);
  }

  return {
    update(state, dt) {
      const scientist = state.scientist;
      if (!scientist || !template) {
        if (figure) figure.group.visible = false;
        return;
      }
      figure ??= build();
      figure.group.visible = true;
      const group = figure.group;
      // Eased toward where the rules have him, so 30 Hz updates in co-op still look smooth.
      const ease = 1 - Math.exp(-dt * 20);
      const far = Math.hypot(scientist.x - group.position.x, scientist.z - group.position.z) > 3;
      group.position.x = far ? scientist.x : group.position.x + (scientist.x - group.position.x) * ease;
      group.position.z = far ? scientist.z : group.position.z + (scientist.z - group.position.z) * ease;
      const turn = Math.atan2(Math.sin(scientist.yaw - group.rotation.y), Math.cos(scientist.yaw - group.rotation.y));
      group.rotation.y += turn * Math.min(1, dt * 8);
      pose(scientist.speed, dt, performance.now() / 1000);
    },
  };
}
