import * as THREE from 'three';
import { config } from '../config';
import type { Player } from '../game/state';
import { loadHand } from './hand';
import type { CameraPose } from './view';

// Everything here is in meters. The gun points down -z, +x is right, +y is up.
const REST_POSITION = new THREE.Vector3(0.2, -0.2, -0.62);
const SCALE = 1.7;
// The gun is angled slightly in toward the crosshair.
const REST_YAW = 0.1;
const REST_PITCH = 0.03;
const FLASH_SECONDS = 0.05;
const SLIDE_TRAVEL = 0.032;
const MAG_DROP = 0.17;

export interface Viewmodel {
  update(player: Player, pose: CameraPose, frameSeconds: number): void;
  // Where the bullet leaves the gun, in the camera's own space.
  getMuzzle(out: THREE.Vector3): THREE.Vector3;
}

function noiseTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d')!;
  const image = context.createImageData(128, 128);
  for (let i = 0; i < image.data.length; i += 4) {
    const value = 232 + Math.random() * 23;
    image.data[i] = value;
    image.data[i + 1] = value;
    image.data[i + 2] = value;
    image.data[i + 3] = 255;
  }
  context.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function box(
  parent: THREE.Object3D,
  size: [number, number, number],
  material: THREE.Material,
  position: [number, number, number],
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}

const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function angleDelta(a: number, b: number): number {
  let difference = a - b;
  while (difference > Math.PI) difference -= Math.PI * 2;
  while (difference < -Math.PI) difference += Math.PI * 2;
  return difference;
}

// A blocky pistol held in a right hand, with a forearm in a jacket sleeve.
export function createViewmodel(viewScene: THREE.Scene): Viewmodel {
  const grain = noiseTexture();
  const slideMetal = new THREE.MeshStandardMaterial({ color: 0x3b4048, metalness: 0.9, roughness: 0.32 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x16181c, metalness: 0.8, roughness: 0.5 });
  const polymer = new THREE.MeshStandardMaterial({ color: 0x202328, roughness: 0.85, metalness: 0.05, map: grain });
  const sleeve = new THREE.MeshStandardMaterial({ color: 0x55653f, roughness: 1, map: grain });
  const sleeveCuff = new THREE.MeshStandardMaterial({ color: 0x323d29, roughness: 1, map: grain });
  const sight = new THREE.MeshStandardMaterial({
    color: 0xf4efd6,
    emissive: 0xf4efd6,
    emissiveIntensity: 0.9,
    roughness: 0.6,
  });

  const root = new THREE.Group();
  root.scale.setScalar(SCALE);
  viewScene.add(root);

  // The slide is its own group so it can slide back on each shot.
  const slide = new THREE.Group();
  root.add(slide);
  box(slide, [0.034, 0.036, 0.2], slideMetal, [0, 0.045, -0.035]);
  box(slide, [0.022, 0.006, 0.19], slideMetal, [0, 0.066, -0.035]);
  for (const z of [0.032, 0.04, 0.048, 0.056]) box(slide, [0.0355, 0.024, 0.004], darkMetal, [0, 0.046, z]);
  for (const z of [-0.106, -0.114]) box(slide, [0.0355, 0.024, 0.004], darkMetal, [0, 0.046, z]);
  box(slide, [0.0025, 0.014, 0.05], darkMetal, [0.0175, 0.052, -0.02]);
  box(slide, [0.016, 0.016, 0.012], darkMetal, [0, 0.04, -0.141]);
  box(slide, [0.008, 0.008, 0.002], new THREE.MeshBasicMaterial({ color: 0x000000 }), [0, 0.04, -0.1475]);
  box(slide, [0.006, 0.011, 0.008], sight, [0, 0.0735, -0.122]);
  box(slide, [0.006, 0.009, 0.01], darkMetal, [-0.01, 0.0715, 0.058]);
  box(slide, [0.006, 0.009, 0.01], darkMetal, [0.01, 0.0715, 0.058]);
  box(slide, [0.0035, 0.0035, 0.002], sight, [-0.01, 0.0735, 0.0535]);
  box(slide, [0.0035, 0.0035, 0.002], sight, [0.01, 0.0735, 0.0535]);

  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.04, -0.15);
  slide.add(muzzle);

  // Frame, trigger guard, and trigger.
  box(root, [0.03, 0.026, 0.175], polymer, [0, 0.012, -0.025]);
  box(root, [0.026, 0.008, 0.092], polymer, [0, -0.0245, -0.006]);
  box(root, [0.026, 0.026, 0.008], polymer, [0, -0.012, -0.05]);
  box(root, [0.008, 0.022, 0.008], darkMetal, [0, -0.01, 0.002]);
  box(root, [0.004, 0.008, 0.026], slideMetal, [-0.0165, 0.024, -0.012]);
  box(root, [0.004, 0.01, 0.01], darkMetal, [-0.0165, 0.0, 0.042]);

  // The grip leans back. The magazine and most of the hand are attached to it.
  const grip = new THREE.Group();
  grip.position.set(0, 0, 0.05);
  grip.rotation.x = -0.22;
  root.add(grip);
  box(grip, [0.032, 0.105, 0.05], polymer, [0, -0.0525, 0]);
  for (const y of [-0.03, -0.05, -0.07]) box(grip, [0.0345, 0.004, 0.004], darkMetal, [0, y, -0.0255]);

  const magazine = new THREE.Group();
  grip.add(magazine);
  box(magazine, [0.028, 0.1, 0.042], darkMetal, [0, -0.058, 0]);
  box(magazine, [0.034, 0.01, 0.056], polymer, [0, -0.113, 0.002]);

  loadHand(grip);

  // Forearm in a jacket sleeve, running back and down out of view.
  const arm = new THREE.Group();
  arm.position.set(0.011, -0.039, 0.118);
  arm.rotation.set(0.3, -0.2, 0);
  root.add(arm);
  const tube = (
    radiusFront: number,
    radiusBack: number,
    length: number,
    material: THREE.Material,
    z: number,
  ) => {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(radiusBack, radiusFront, length, 22),
      material,
    );
    mesh.rotation.x = Math.PI / 2;
    mesh.position.z = z;
    arm.add(mesh);
  };
  tube(0.039, 0.04, 0.02, sleeveCuff, 0.012);
  tube(0.037, 0.04, 0.36, sleeve, 0.2);

  // Muzzle flash: a bright core with four spikes, shown for a moment after each shot.
  const flash = new THREE.Group();
  flash.visible = false;
  const flashCore = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  const flashSpike = new THREE.MeshBasicMaterial({ color: 0xffc15a });
  box(flash, [0.034, 0.034, 0.02], flashCore, [0, 0, -0.01]);
  box(flash, [0.09, 0.008, 0.008], flashSpike, [0, 0, -0.01]);
  box(flash, [0.008, 0.09, 0.008], flashSpike, [0, 0, -0.01]);
  const diagonal = box(flash, [0.07, 0.008, 0.008], flashSpike, [0, 0, -0.01]);
  diagonal.rotation.z = Math.PI / 4;
  const diagonalOther = box(flash, [0.07, 0.008, 0.008], flashSpike, [0, 0, -0.01]);
  diagonalOther.rotation.z = -Math.PI / 4;
  muzzle.add(flash);
  const flashLight = new THREE.PointLight(0xffb15a, 0, 2.5, 2);
  muzzle.add(flashLight);

  let seenShotTick = -1;
  let flashLeft = 0;
  let kick = 0;
  let slideKick = 0;
  let bobPhase = 0;
  let time = 0;
  let swayYaw = 0;
  let swayPitch = 0;
  let lastYaw: number | null = null;
  let lastPitch = 0;

  return {
    update(player, pose, frameSeconds) {
      time += frameSeconds;

      if (player.lastShotTick !== seenShotTick) {
        seenShotTick = player.lastShotTick;
        if (seenShotTick >= 0) {
          kick = 1;
          slideKick = 1;
          flashLeft = FLASH_SECONDS;
          flash.rotation.z = Math.random() * Math.PI;
          flash.scale.setScalar(0.8 + Math.random() * 0.5);
        }
      }
      flashLeft = Math.max(0, flashLeft - frameSeconds);
      kick = Math.max(0, kick - frameSeconds * 9);
      slideKick = Math.max(0, slideKick - frameSeconds * 14);
      flash.visible = flashLeft > 0;
      flashLight.intensity = flashLeft > 0 ? 0.6 : 0;

      // The gun lags behind when you turn, then settles.
      if (lastYaw !== null) {
        swayYaw = clamp(swayYaw - angleDelta(pose.yaw, lastYaw) * 0.6, -0.09, 0.09);
        swayPitch = clamp(swayPitch - (pose.pitch - lastPitch) * 0.6, -0.09, 0.09);
      }
      lastYaw = pose.yaw;
      lastPitch = pose.pitch;
      const settle = Math.exp(-frameSeconds * 9);
      swayYaw *= settle;
      swayPitch *= settle;

      const speed = Math.hypot(player.vx, player.vz);
      const walking = Math.min(1, speed / config.player.moveSpeed);
      bobPhase += speed * frameSeconds * 1.5;
      const bobX = Math.sin(bobPhase) * 0.006 * walking;
      const bobY = Math.cos(bobPhase * 2) * 0.004 * walking;
      const breathing = Math.sin(time * 1.7) * 0.0015;

      // Reload: the gun tips, the magazine drops out, a new one slides in, and the slide is released.
      const reloading = player.reloadLeft > 0;
      const progress = reloading ? 1 - player.reloadLeft / config.pistol.reloadSeconds : 0;
      const tilt = Math.sin(progress * Math.PI);
      if (progress < 0.3) {
        magazine.visible = true;
        magazine.position.y = -smooth(progress / 0.3) * MAG_DROP;
      } else if (progress < 0.5) {
        magazine.visible = false;
      } else {
        magazine.visible = true;
        magazine.position.y = -(1 - smooth(Math.min(1, (progress - 0.5) / 0.3))) * MAG_DROP;
      }

      // An empty gun keeps the slide locked back until the reload finishes.
      const slideLocked = player.ammo === 0 && !(reloading && progress > 0.85);
      slide.position.z = SLIDE_TRAVEL * Math.max(slideKick, slideLocked ? 1 : 0);

      root.position.set(
        REST_POSITION.x + bobX - tilt * 0.02,
        REST_POSITION.y + bobY + breathing - tilt * 0.05,
        REST_POSITION.z + kick * 0.045,
      );
      root.rotation.set(
        REST_PITCH + swayPitch + kick * 0.09 + tilt * 0.35,
        REST_YAW + swayYaw,
        -tilt * 0.55,
      );
      root.updateMatrixWorld(true);
    },

    getMuzzle(out) {
      return muzzle.getWorldPosition(out);
    },
  };
}
