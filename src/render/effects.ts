import * as THREE from 'three';
import { config } from '../config';
import type { Player } from '../game/state';

const FLASH_SECONDS = 0.05;
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
  // Call once per frame after the camera has been synced to the player.
  update(player: Player, frameSeconds: number): void;
}

// The pistol in view, plus the muzzle flash, flying bullets, and impact sparks.
export function createEffects(scene: THREE.Scene, camera: THREE.PerspectiveCamera): Effects {
  const gun = new THREE.Group();
  gun.position.set(0.22, -0.2, -0.55);
  gun.scale.setScalar(0.75);
  const slide = new THREE.Mesh(
    new THREE.BoxGeometry(0.07, 0.08, 0.34),
    new THREE.MeshLambertMaterial({ color: 0x5a616d }),
  );
  const grip = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.16, 0.08),
    new THREE.MeshLambertMaterial({ color: 0x3a3f47 }),
  );
  grip.position.set(0, -0.1, 0.1);
  gun.add(slide, grip);

  const flash = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.1, 0.1),
    new THREE.MeshBasicMaterial({ color: 0xffe08a }),
  );
  flash.position.set(0, 0.02, -0.22);
  flash.visible = false;
  gun.add(flash);
  camera.add(gun);

  const bulletGeometry = new THREE.BoxGeometry(0.03, 0.03, 0.14);
  const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xffe9a0 });
  const sparkGeometry = new THREE.BoxGeometry(0.06, 0.06, 0.06);
  const sparkMaterial = new THREE.MeshBasicMaterial({ color: 0xffd27a });

  const bullets: Bullet[] = [];
  const sparks: Spark[] = [];

  let seenShotTick = -1;
  let flashLeft = 0;
  let kick = 0;
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
          camera.updateMatrixWorld();
          muzzle.set(0, 0.02, -0.2);
          gun.localToWorld(muzzle);
          const end = player.lastShotEnd;
          fireBullet(new THREE.Vector3(end.x, end.y, end.z), player.lastShotHit);
          flashLeft = FLASH_SECONDS;
          kick = 1;
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

      flashLeft = Math.max(0, flashLeft - frameSeconds);
      kick = Math.max(0, kick - frameSeconds * 12);
      flash.visible = flashLeft > 0;

      // The gun dips while reloading and kicks back after a shot.
      const reloadProgress =
        player.reloadLeft > 0 ? 1 - player.reloadLeft / config.pistol.reloadSeconds : 0;
      gun.rotation.x = Math.sin(reloadProgress * Math.PI) * -0.9 + kick * 0.15;
      gun.position.z = -0.55 + kick * 0.05;
      gun.position.y = -0.2;
    },
  };
}
