import * as THREE from 'three';
import { config } from '../config';
import type { Player } from '../game/state';
import { SURVIVOR_MODEL, createJoints, rig, riggedGhillie, suitsReady, type Joints, type RiggedBody } from './characterRig';
import { loadModel, placeModel } from './models';
import type { WeaponId } from '../game/weapons';

// One colour per seat, so each player can be told apart.
const COLORS = ['#4fa3ff', '#ff8a3d', '#5ee08a', '#e05ec8'];

export interface RemotePlayers { update(players: Player[], myId: number): void }

interface Figure {
  group: THREE.Group;
  // What they are holding out in front of them, one object per weapon, shown for the one in hand.
  held: Map<WeaponId, THREE.Object3D>;
  gun: THREE.Group;
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
const DARK = new THREE.MeshStandardMaterial({ color: '#1e2226', roughness: 0.6, metalness: 0.4 });
const STEEL = new THREE.MeshStandardMaterial({ color: '#8a9096', roughness: 0.4, metalness: 0.7 });
const WOOD = new THREE.MeshStandardMaterial({ color: '#6b4a2b', roughness: 0.8 });

function box(w: number, h: number, d: number, material: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  return mesh;
}

// The weapon each player holds, small and plain: a pistol of boxes, the shotgun and the AK as their real
// models, a machete and a bat. They point down -z, the way the player faces.
function buildWeapon(id: WeaponId): THREE.Object3D {
  const group = new THREE.Group();
  if (id === 'pistol') {
    group.add(box(0.035, 0.05, 0.2, DARK, 0, 0.02, -0.08), box(0.03, 0.09, 0.04, DARK, 0, -0.03, 0.0));
  } else if (id === 'machete') {
    group.add(box(0.03, 0.03, 0.12, DARK, 0, 0, 0), box(0.012, 0.07, 0.5, STEEL, 0, 0, -0.3));
  } else if (id === 'bat') {
    group.add(box(0.05, 0.05, 0.7, WOOD, 0, 0, -0.3));
  } else {
    const file = id === 'ak' ? 'ak' : 'pump';
    const scale = id === 'ak' ? 0.92 / 1.55 : 0.96 / 1.55;
    void placeModel(`/models/weapons/${file}.glb`).then((model) => { model.scale.setScalar(scale); group.add(model); });
  }
  group.visible = false;
  return group;
}

export function createRemotePlayers(scene: THREE.Object3D): RemotePlayers {
  let template: THREE.Object3D | null = null;
  void loadModel(SURVIVOR_MODEL).then((model) => { template = model.scene; });
  const marker = new THREE.SphereGeometry(0.06, 12, 8);
  const figures = new Map<number, Figure>();

  function build(player: Player): Figure {
    const group = new THREE.Group();
    group.name = `Player ${player.id}`;
    // The crew wears the ghillie suit; the survivor body stands in until it has loaded.
    const body = riggedGhillie() ?? rig(template!);
    group.add(body.object);
    const tag = new THREE.Mesh(marker, new THREE.MeshBasicMaterial({ color: COLORS[player.id % COLORS.length] }));
    tag.position.y = config.player.height + 0.25;
    group.add(tag);
    // In front of the chest, where both hands come together on it.
    const gun = new THREE.Group();
    gun.position.set(0.05, 1.28, -0.34);
    group.add(gun);
    scene.add(group);
    return { group, held: new Map(), gun, joints: createJoints(), body, phase: 0, gait: 0, x: player.x, z: player.z };
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
    // The weapon in hand, raised and lowered with where they look and how low they crouch.
    let weapon = figure.held.get(player.weapon);
    if (!weapon) {
      weapon = buildWeapon(player.weapon);
      figure.held.set(player.weapon, weapon);
      figure.gun.add(weapon);
    }
    for (const [id, object] of figure.held) object.visible = id === player.weapon;
    figure.gun.position.y = 1.28 - player.crouch * 0.34 + player.pitch * 0.12;
    figure.gun.rotation.x = player.pitch;
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
      if (!template || !suitsReady()) return;
      for (const player of others) {
        let figure = figures.get(player.id);
        if (!figure) {
          figure = build(player);
          figures.set(player.id, figure);
        }
        // Down, they lie on the floor (face down, head the way they look) until brought back; out, they are gone.
        const down = player.health <= 0;
        figure.group.visible = !player.out;
        figure.group.position.set(player.x, player.y + (down ? 0.22 : 0), player.z);
        figure.group.rotation.order = 'YXZ';
        figure.group.rotation.set(down ? -1.4 : 0, player.yaw, 0);
        pose(figure, player, dt);
      }
    },
  };
}
