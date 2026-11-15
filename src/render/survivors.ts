import * as THREE from 'three';
import type { GameState, Survivor } from '../game/state';
import { SURVIVOR_MODEL, createJoints, rig, type Joints, type RiggedBody } from './characterRig';
import { loadModel } from './models';

// The people hiding on a floor (P04's restaurant): the survivor's body in their own clothes, no gun.
// Hiding, they crouch low with their arms round their knees and look about; told to come, they walk
// behind the crew; once away they are gone. Until the model loads they are not drawn.

export interface SurvivorViews { update(state: GameState, dt: number): void }

const LOOKS: Record<Survivor['look'], { top: string; bottom: string; apron?: string }> = {
  cook: { top: '#e8e6df', bottom: '#2e3136', apron: '#d8d4ca' },
  waiter: { top: '#1e2024', bottom: '#1e2024', apron: '#6b2a2a' },
  diner: { top: '#5a6f86', bottom: '#3f3a34' },
};

function dress(object: THREE.Object3D, look: Survivor['look'], index: number): void {
  const colours = LOOKS[look];
  // Diners each wear something of their own.
  const top = look === 'diner' ? ['#5a6f86', '#8a5a3a', '#6a7a4a', '#7a3a4a'][index % 4] : colours.top;
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const name = (child.material as THREE.Material).name;
    if (name.startsWith('Glove')) child.visible = false;
    if (name.startsWith('Top')) child.material = new THREE.MeshStandardMaterial({ color: top, roughness: 0.85 });
    if (name.startsWith('Bottom')) child.material = new THREE.MeshStandardMaterial({ color: colours.bottom, roughness: 0.85 });
  });
}

// A waist apron, hanging from the hips.
function apron(colour: string): THREE.Object3D {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.5), new THREE.MeshStandardMaterial({ color: colour, roughness: 0.9, side: THREE.DoubleSide }));
  mesh.position.set(0, -0.16, -0.11);
  return mesh;
}

interface Figure { group: THREE.Group; joints: Joints; body: RiggedBody; phase: number; gait: number; crouch: number }

export function createSurvivorViews(scene: THREE.Object3D): SurvivorViews {
  let template: THREE.Object3D | null = null;
  void loadModel(SURVIVOR_MODEL).then((model) => { template = model.scene; });
  let figures: Figure[] = [];
  let built: GameState['survivors'] | null = null;

  function build(state: GameState): void {
    for (const figure of figures) scene.remove(figure.group);
    figures = state.survivors.map((survivor, index) => {
      const group = new THREE.Group();
      group.name = `Survivor ${index}`;
      const body = rig(template!);
      group.add(body.object);
      dress(body.object, survivor.look, index);
      const colours = LOOKS[survivor.look];
      if (colours.apron) body.attach('Hips', apron(colours.apron));
      group.position.set(survivor.x, 0, survivor.z);
      group.rotation.y = survivor.yaw;
      scene.add(group);
      return { group, joints: createJoints(), body, phase: index * 1.3, gait: 0, crouch: survivor.mode === 'hiding' ? 1 : 0 };
    });
    built = state.survivors;
  }

  function pose(figure: Figure, survivor: Survivor, dt: number, time: number, index: number): void {
    const { joints } = figure;
    figure.crouch += ((survivor.mode === 'hiding' ? 1 : 0) - figure.crouch) * Math.min(1, dt * 4);
    figure.gait += (Math.min(1, survivor.speed / 3) - figure.gait) * Math.min(1, dt * 8);
    figure.phase += Math.min(survivor.speed, 6) * dt * 2.6;
    const c = figure.crouch, gait = figure.gait * (1 - c), swing = Math.sin(figure.phase) * gait;
    const shiver = Math.sin(time * 9 + index) * 0.02 * c;
    joints.hips.position.y = 0.94 - c * 0.5 + Math.abs(Math.sin(figure.phase)) * 0.02 * gait;
    joints.torso.rotation.set(-0.12 - c * 0.45 + shiver, swing * 0.06, 0);
    joints.head.rotation.set(-0.05 + c * 0.2, Math.sin(time * (0.6 + index * 0.1) + index) * 0.35 * c, 0);
    joints.legs.forEach((leg, i) => {
      const step = i === 0 ? swing : -swing;
      leg.rotation.set(step * 0.5 + c * 1.5, 0, (i === 0 ? 1 : -1) * c * 0.12);
      joints.knees[i].rotation.set(-Math.max(0, -step) * 0.7 - 0.03 - c * 2.1, 0, 0);
      joints.ankles[i].rotation.set(c * 0.55, 0, 0);
    });
    // Hiding, the arms wrap round the knees; walking, they swing close, nervous.
    joints.arms.forEach((arm, i) => {
      const inward = i === 0 ? 1 : -1;
      arm.rotation.set((i === 0 ? -swing : swing) * 0.35 + c * 0.75, 0, inward * (0.1 + c * 0.15));
      joints.elbows[i].rotation.set(0.3 + c * 0.45, 0, 0);
      joints.wrists[i].rotation.set(0, 0, 0);
    });
    figure.body.pose(joints);
  }

  return {
    update(state, dt) {
      if (!template) return;
      if (built !== state.survivors && (state.survivors.length !== figures.length || state.survivors.some((each, i) => each.look !== built?.[i]?.look))) build(state);
      built = state.survivors;
      const time = performance.now() / 1000;
      state.survivors.forEach((survivor, index) => {
        const figure = figures[index];
        if (!figure) return;
        figure.group.visible = survivor.mode !== 'away';
        if (!figure.group.visible) return;
        const group = figure.group;
        const ease = 1 - Math.exp(-dt * 20);
        const far = Math.hypot(survivor.x - group.position.x, survivor.z - group.position.z) > 3;
        group.position.x = far ? survivor.x : group.position.x + (survivor.x - group.position.x) * ease;
        group.position.z = far ? survivor.z : group.position.z + (survivor.z - group.position.z) * ease;
        const turn = Math.atan2(Math.sin(survivor.yaw - group.rotation.y), Math.cos(survivor.yaw - group.rotation.y));
        group.rotation.y += turn * Math.min(1, dt * 8);
        pose(figure, survivor, dt, time, index);
      });
    },
  };
}
