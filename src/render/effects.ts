import * as THREE from 'three';
import { config } from '../config';
import type { Player } from '../game/state';
import type { Viewmodel } from './viewmodel';

const SPARK_COUNT = 6;
const SPARK_SECONDS = 0.3;
const SPARK_SPEED = 3;
const SPARK_GRAVITY = 9;

interface Bullet {
  mesh: THREE.Mesh;
  direction: THREE.Vector3;
  end: THREE.Vector3;
  remaining: number;
  hit: boolean;
}

interface Spark {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
}

export interface Effects {
  // Call once per frame, after the camera and the viewmodel have been updated.
  update(player: Player, frameSeconds: number): void;
}

// The things a shot leaves in the world: a flying bullet and a burst of sparks where it lands.
export function createEffects(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  viewmodel: Viewmodel,
): Effects {
  const bulletGeometry = new THREE.BoxGeometry(0.03, 0.03, 0.14);
  const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xffe9a0 });
  const sparkGeometry = new THREE.BoxGeometry(0.06, 0.06, 0.06);
  const sparkMaterial = new THREE.MeshBasicMaterial({ color: 0xffd27a });

  const bullets: Bullet[] = [];
  const sparks: Spark[] = [];

  let seenShotTick = -1;
  const muzzle = new THREE.Vector3();

  function fireBullet(end: THREE.Vector3, hit: boolean): void {
    const mesh = new THREE.Mesh(bulletGeometry, bulletMaterial);
    mesh.position.copy(muzzle);
    mesh.lookAt(end);
    scene.add(mesh);
    const direction = end.clone().sub(muzzle);
    const remaining = direction.length();
    bullets.push({ mesh, direction: direction.normalize(), end, remaining, hit });
  }

  function burst(at: THREE.Vector3): void {
    for (let i = 0; i < SPARK_COUNT; i++) {
      const mesh = new THREE.Mesh(sparkGeometry, sparkMaterial);
      mesh.position.copy(at);
      scene.add(mesh);
      const velocity = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.2,
        Math.random() - 0.5,
      )
        .normalize()
        .multiplyScalar(SPARK_SPEED);
      sparks.push({ mesh, velocity, life: SPARK_SECONDS });
    }
  }

  return {
    update(player, frameSeconds) {
      if (player.lastShotTick !== seenShotTick) {
        seenShotTick = player.lastShotTick;
        if (seenShotTick >= 0) {
          // The muzzle is known in camera space, so move it into the world.
          camera.updateMatrixWorld();
          camera.localToWorld(viewmodel.getMuzzle(muzzle));
          const end = player.lastShotEnd;
          fireBullet(new THREE.Vector3(end.x, end.y, end.z), player.lastShotHit);
        }
      }

      for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        const travel = config.pistol.bulletSpeed * frameSeconds;
        if (travel >= bullet.remaining) {
          if (bullet.hit) burst(bullet.end);
          scene.remove(bullet.mesh);
          bullets.splice(i, 1);
        } else {
          bullet.mesh.position.addScaledVector(bullet.direction, travel);
          bullet.remaining -= travel;
        }
      }

      for (let i = sparks.length - 1; i >= 0; i--) {
        const spark = sparks[i];
        spark.life -= frameSeconds;
        if (spark.life <= 0) {
          scene.remove(spark.mesh);
          sparks.splice(i, 1);
          continue;
        }
        spark.velocity.y -= SPARK_GRAVITY * frameSeconds;
        spark.mesh.position.addScaledVector(spark.velocity, frameSeconds);
        spark.mesh.scale.setScalar(spark.life / SPARK_SECONDS);
      }
    },
  };
}
