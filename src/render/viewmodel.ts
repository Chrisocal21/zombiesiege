import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
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
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// One corner of a side profile: forward along the gun, up, and how much to round the corner.
type Corner = [number, number, number];

function trace<T extends THREE.Path>(path: T, corners: Corner[]): T {
  const point = (i: number) => {
    const [x, y] = corners[(i + corners.length) % corners.length];
    return new THREE.Vector2(x, y);
  };
  corners.forEach(([, , radius], i) => {
    const here = point(i);
    const entry = point(i - 1).sub(here).normalize().multiplyScalar(radius).add(here);
    const exit = point(i + 1).sub(here).normalize().multiplyScalar(radius).add(here);
    if (i === 0) path.moveTo(entry.x, entry.y);
    else path.lineTo(entry.x, entry.y);
    path.quadraticCurveTo(here.x, here.y, exit.x, exit.y);
  });
  path.closePath();
  return path;
}

// Turns a side profile into a solid part with bevelled edges, centered across the gun.
function profile(
  parent: THREE.Object3D,
  corners: Corner[],
  width: number,
  bevel: number,
  material: THREE.Material,
  hole?: Corner[],
): THREE.Mesh {
  const shape = trace(new THREE.Shape(), corners);
  if (hole) shape.holes.push(trace(new THREE.Path(), hole));
  const depth = width - bevel * 2;
  const extruded = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments: 4,
    curveSegments: 10,
  });
  extruded.translate(0, 0, -depth / 2);
  extruded.rotateY(Math.PI / 2);
  const mesh = new THREE.Mesh(toCreasedNormals(extruded, Math.PI / 4), material);
  parent.add(mesh);
  return mesh;
}

function softBox(
  parent: THREE.Object3D,
  size: [number, number, number],
  radius: number,
  material: THREE.Material,
  position: [number, number, number],
): THREE.Mesh {
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(...size, 3, radius), material);
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}

function barrelPart(
  parent: THREE.Object3D,
  radius: number,
  length: number,
  material: THREE.Material,
  position: [number, number, number],
): void {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 24), material);
  mesh.rotation.x = Math.PI / 2;
  mesh.position.set(...position);
  parent.add(mesh);
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
  const stipple = grain.clone();
  stipple.repeat.set(30, 30);
  stipple.needsUpdate = true;
  const slideMetal = new THREE.MeshStandardMaterial({ color: 0x33363c, metalness: 0.85, roughness: 0.36 });
  const brightMetal = new THREE.MeshStandardMaterial({ color: 0x8a8d92, metalness: 1, roughness: 0.3 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x101114, metalness: 0.7, roughness: 0.5 });
  const polymer = new THREE.MeshStandardMaterial({ color: 0x1b1c20, roughness: 0.62, metalness: 0.05 });
  const gripPolymer = new THREE.MeshStandardMaterial({
    color: 0x1b1c20,
    roughness: 0.82,
    metalness: 0.05,
    bumpMap: stipple,
    bumpScale: 2,
  });
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
  profile(
    slide,
    [
      [-0.065, 0.029, 0.001],
      [-0.0635, 0.067, 0.002],
      [0.128, 0.067, 0.003],
      [0.135, 0.059, 0.002],
      [0.135, 0.036, 0.003],
      [0.124, 0.029, 0.002],
    ],
    0.03,
    0.0028,
    slideMetal,
  );
  // Cocking grooves cut across both sides at the back and front of the slide.
  const grooves = [...Array(7).keys()].map((i) => 0.024 + i * 0.0052);
  const frontGrooves = [...Array(4).keys()].map((i) => -0.098 - i * 0.0052);
  for (const z of [...grooves, ...frontGrooves]) {
    box(slide, [0.0304, 0.027, 0.0022], darkMetal, [0, 0.046, z]).rotation.x = 0.16;
  }
  // Ejection port with the barrel hood showing through it.
  box(slide, [0.0172, 0.0012, 0.05], darkMetal, [0.0028, 0.0671, -0.016]);
  box(slide, [0.0145, 0.0014, 0.024], brightMetal, [-0.0002, 0.0672, -0.03]);
  // The firing pin plate on the back of the slide, and the muzzle at the front.
  softBox(slide, [0.011, 0.017, 0.0014], 0.0006, slideMetal, [0, 0.048, 0.065]);
  barrelPart(slide, 0.0014, 0.001, brightMetal, [0, 0.051, 0.0656]);
  barrelPart(slide, 0.0078, 0.006, brightMetal, [0, 0.0475, -0.1345]);
  barrelPart(slide, 0.0048, 0.0012, darkMetal, [0, 0.0475, -0.1376]);
  barrelPart(slide, 0.0034, 0.0012, darkMetal, [0, 0.0345, -0.1352]);
  // Sights, with three white dots to line up.
  softBox(slide, [0.0044, 0.0062, 0.01], 0.001, darkMetal, [0, 0.0695, -0.12]);
  box(slide, [0.0024, 0.0024, 0.0008], sight, [0, 0.0705, -0.1148]);
  softBox(slide, [0.02, 0.0035, 0.01], 0.001, darkMetal, [0, 0.0683, 0.052]);
  for (const x of [-0.0066, 0.0066]) {
    softBox(slide, [0.0056, 0.0068, 0.009], 0.001, darkMetal, [x, 0.0728, 0.052]);
    box(slide, [0.0024, 0.0024, 0.0008], sight, [x, 0.0732, 0.0568]);
  }

  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.0475, -0.14);
  slide.add(muzzle);

  // The polymer frame, drawn as one piece with the trigger guard as a real opening.
  profile(
    root,
    [
      [-0.067, 0.03, 0.002],
      [0.122, 0.03, 0.001],
      [0.124, 0.012, 0.003],
      [0.118, 0.006, 0.001],
      [0.047, 0.006, 0.006],
      [0.044, -0.028, 0.009],
      [-0.015, -0.028, 0.006],
      [-0.024, -0.012, 0.004],
      [-0.03, -0.03, 0.001],
      [-0.074, -0.03, 0.001],
      [-0.0715, 0.012, 0.003],
      [-0.0775, 0.0185, 0.004],
    ],
    0.0275,
    0.0028,
    polymer,
    [
      [-0.016, -0.001, 0.003],
      [0.037, -0.001, 0.004],
      [0.037, -0.0215, 0.006],
      [-0.01, -0.0215, 0.004],
    ],
  );
  // Accessory rail grooves under the front of the frame.
  for (const z of [-0.082, -0.09, -0.098, -0.106]) box(root, [0.028, 0.0052, 0.0028], darkMetal, [0, 0.0105, z]);
  // A curved trigger, slide stop, takedown lever, and magazine release.
  profile(
    root,
    [
      [-0.003, 0.001, 0.0005],
      [0.006, 0.001, 0.0005],
      [0.0035, -0.008, 0.003],
      [0.0065, -0.0165, 0.001],
      [0.0025, -0.0165, 0.001],
      [-0.0005, -0.008, 0.003],
    ],
    0.0058,
    0.0009,
    darkMetal,
  );
  softBox(root, [0.0024, 0.0048, 0.021], 0.0009, darkMetal, [-0.0145, 0.0262, -0.01]);
  softBox(root, [0.0024, 0.0034, 0.011], 0.0009, darkMetal, [-0.0145, 0.0195, -0.038]);
  softBox(root, [0.0026, 0.0095, 0.0085], 0.001, darkMetal, [-0.0148, -0.009, 0.0305]);

  // The grip with its stippled texture, drawn at its lean. The group is tilted to match, so
  // the magazine and the hand can work along the grip's own axis.
  profile(
    root,
    [
      [-0.0235, -0.004, 0.003],
      [-0.0491, -0.1109, 0.004],
      [-0.0999, -0.0995, 0.006],
      [-0.0744, 0.0055, 0.004],
    ],
    0.033,
    0.0058,
    gripPolymer,
  );
  const grip = new THREE.Group();
  grip.position.set(0, 0, 0.05);
  grip.rotation.x = -0.22;
  root.add(grip);

  const magazine = new THREE.Group();
  grip.add(magazine);
  box(magazine, [0.024, 0.1, 0.04], darkMetal, [0, -0.058, 0]);
  softBox(magazine, [0.03, 0.0095, 0.052], 0.003, polymer, [0, -0.1135, 0.001]);

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
