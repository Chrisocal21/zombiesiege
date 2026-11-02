import * as THREE from 'three';
import { config } from '../config';
import type { Player } from '../game/state';

const FLASH_SECONDS = 0.05;
const TRACER_SECONDS = 0.08;
const IMPACT_SECONDS = 0.25;

export interface Effects {
  // Call once per frame after the camera has been synced to the player.
  update(player: Player, frameSeconds: number): void;
}

// The pistol in view, plus the muzzle flash, tracer, and impact spark for each shot.
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

  const tracer = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
    new THREE.LineBasicMaterial({ color: 0xffe9a0 }),
  );
  tracer.frustumCulled = false;
  tracer.visible = false;
  scene.add(tracer);

  const impact = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.12, 0.12),
    new THREE.MeshBasicMaterial({ color: 0xffd27a }),
  );
  impact.visible = false;
  scene.add(impact);

  let seenShotTick = -1;
  let flashLeft = 0;
  let tracerLeft = 0;
  let impactLeft = 0;
  let kick = 0;
  const muzzle = new THREE.Vector3();

  return {
    update(player, frameSeconds) {
      if (player.lastShotTick !== seenShotTick) {
        seenShotTick = player.lastShotTick;
        if (seenShotTick >= 0) {
          camera.updateMatrixWorld();
          muzzle.set(0, 0.02, -0.2);
          gun.localToWorld(muzzle);
          const end = player.lastShotEnd;
          tracer.geometry.setFromPoints([muzzle, new THREE.Vector3(end.x, end.y, end.z)]);
          impact.position.set(end.x, end.y, end.z);
          flashLeft = FLASH_SECONDS;
          tracerLeft = TRACER_SECONDS;
          impactLeft = IMPACT_SECONDS;
          kick = 1;
        }
      }

      flashLeft = Math.max(0, flashLeft - frameSeconds);
      tracerLeft = Math.max(0, tracerLeft - frameSeconds);
      impactLeft = Math.max(0, impactLeft - frameSeconds);
      kick = Math.max(0, kick - frameSeconds * 12);
      flash.visible = flashLeft > 0;
      tracer.visible = tracerLeft > 0;
      impact.visible = impactLeft > 0;

      // The gun dips while reloading and kicks back after a shot.
      const reloadProgress = player.reloadLeft > 0 ? 1 - player.reloadLeft / config.pistol.reloadSeconds : 0;
      gun.rotation.x = Math.sin(reloadProgress * Math.PI) * -0.9 + kick * 0.15;
      gun.position.z = -0.55 + kick * 0.05;
      gun.position.y = -0.2;
    },
  };
}
