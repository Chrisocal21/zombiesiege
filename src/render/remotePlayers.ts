import * as THREE from 'three';
import { config } from '../config';
import type { Player } from '../game/state';
import { SURVIVOR_MODEL, createJoints, rig, type Joints, type RiggedBody } from './characterRig';
import { loadModel } from './models';

// One colour per seat, so each player can be told apart.
const COLORS = ['#4fa3ff', '#ff8a3d', '#5ee08a', '#e05ec8'];

export interface RemotePlayers { update(players: Player[], myId: number): void }

interface Figure {
  group: THREE.Group;
  joints: Joints;
  body: RiggedBody;
  phase: number;
  gait: number;
  x: number;
  z: number;
}

// The other players in a co-op game, as the survivor model: walking, crouching, and holding a
// gun out in both hands where they aim. A light in their seat's colour floats over each head so
// they can be told apart. Until the model loads, they are not drawn.
export function createRemotePlayers(scene: THREE.Object3D): RemotePlayers {
  let template: THREE.Object3D | null = null;
  void loadModel(SURVIVOR_MODEL).then((model) => { template = model.scene; });
  const marker = new THREE.SphereGeometry(0.06, 12, 8);
  const figures = new Map<number, Figure>();

  function build(player: Player): Figure {
    const group = new THREE.Group();
    group.name = `Player ${player.id}`;
    const body = rig(template!);
    group.add(body.object);
    const tag = new THREE.Mesh(marker, new THREE.MeshBasicMaterial({ color: COLORS[player.id % COLORS.length] }));
    tag.position.y = config.player.height + 0.25;
    group.add(tag);
    scene.add(group);
    return { group, joints: createJoints(), body, phase: 0, gait: 0, x: player.x, z: player.z };
  }

  function pose(figure: Figure, player: Player, dt: number): void {
    const { joints } = figure;
    const speed = Math.hypot(player.x - figure.x, player.z - figure.z) / Math.max(dt, 1e-3);
    figure.x = player.x; figure.z = player.z;
    figure.gait += (Math.min(1, speed / config.player.moveSpeed) - figure.gait) * Math.min(1, dt * 8);
    figure.phase += Math.min(speed, 6) * dt * 2.6;
    const swing = Math.sin(figure.phase) * figure.gait, crouch = player.crouch;
    joints.hips.position.y = 0.94 - crouch * 0.32 + Math.abs(Math.sin(figure.phase)) * 0.025 * figure.gait;
    joints.torso.rotation.set(-0.08 - crouch * 0.25, 0, -player.lean * 0.25);
    joints.head.rotation.set(player.pitch * 0.5, 0, 0);
    joints.legs.forEach((leg, i) => {
      const step = i === 0 ? swing : -swing;
      leg.rotation.x = step * 0.5 + crouch * 0.9;
      joints.knees[i].rotation.x = -Math.max(0, -step) * 0.7 - crouch * 1.5;
      joints.ankles[i].rotation.x = crouch * 0.55;
    });
    // Both hands out in front on the gun, raised to where they look.
    joints.arms.forEach((arm, i) => {
      const inward = i === 0 ? 1 : -1;
      arm.rotation.set(1.3 + player.pitch * 0.7 + crouch * 0.2, 0, inward * 0.45);
      joints.elbows[i].rotation.set(0.3, 0, inward * 0.1);
      joints.wrists[i].rotation.set(-0.1, 0, 0);
    });
    figure.body.pose(joints);
  }

  let last = performance.now();
  return {
    update(players, myId) {
      const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const others = players.filter((player) => player.id !== myId);
      for (const [id, figure] of figures) {
        if (!others.some((player) => player.id === id)) {
          scene.remove(figure.group);
          figures.delete(id);
        }
      }
      if (!template) return;
      for (const player of others) {
        let figure = figures.get(player.id);
        if (!figure) {
          figure = build(player);
          figures.set(player.id, figure);
        }
        figure.group.visible = player.health > 0;
        figure.group.position.set(player.x, player.y, player.z);
        figure.group.rotation.y = player.yaw;
        pose(figure, player, dt);
      }
    },
  };
}
