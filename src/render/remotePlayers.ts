import * as THREE from 'three';
import { config } from '../config';
import type { Pose } from '../net/protocol';

// One colour per seat, so each player can be told apart.
const COLORS = ['#4fa3ff', '#ff8a3d', '#5ee08a', '#e05ec8'];

export interface RemotePlayers { update(others: ReadonlyMap<number, Pose>, floor: number): void }

// The other players in a co-op room, as plain boxes for now: a body, and a nose showing which
// way they face. Real character models come later.
export function createRemotePlayers(scene: THREE.Object3D): RemotePlayers {
  const { height, radius } = config.player;
  const body = new THREE.BoxGeometry(radius * 2, height, radius * 2);
  body.translate(0, height / 2, 0);
  const nose = new THREE.BoxGeometry(0.16, 0.16, 0.4);
  // Yaw 0 faces -z, so the nose sticks out that way at eye height.
  nose.translate(0, config.player.eyeHeight, -radius - 0.15);
  const figures = new Map<number, THREE.Group>();
  return {
    update(others, floor) {
      for (const [id, figure] of figures) {
        if (!others.has(id)) {
          scene.remove(figure);
          figures.delete(id);
        }
      }
      for (const [id, pose] of others) {
        let figure = figures.get(id);
        if (!figure) {
          const material = new THREE.MeshStandardMaterial({ color: COLORS[id % COLORS.length], roughness: 0.7 });
          figure = new THREE.Group();
          for (const geometry of [body, nose]) {
            const mesh = new THREE.Mesh(geometry, material);
            mesh.castShadow = true;
            figure.add(mesh);
          }
          scene.add(figure);
          figures.set(id, figure);
        }
        figure.visible = pose.floor === floor;
        figure.position.set(pose.x, pose.y, pose.z);
        figure.rotation.y = pose.yaw;
      }
    },
  };
}
