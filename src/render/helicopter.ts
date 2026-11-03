import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { settings } from '../client/settings';
import type { GameState } from '../game/state';
import { helicopterPose } from './helicopterPath';

// The air ambulance that lifts the players off the roof: a twin-engine light helicopter in white
// and red, with a ducted tail rotor, skids, a searchlight under the nose and blinking lights.
// Built facing -z with its skids at y = 0, and flown along helicopterPath.

function liveryTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext('2d')!;
  context.fillStyle = '#eceff1';
  context.fillRect(0, 0, 1024, 512);
  // A red band right round the body under the windows, and a darker belly.
  context.fillStyle = '#c4161c';
  context.fillRect(0, 300, 1024, 46);
  context.fillStyle = '#f2c230';
  context.fillRect(0, 346, 1024, 10);
  context.fillStyle = '#2a2f33';
  context.fillRect(0, 440, 1024, 72);
  // A red cross and the lettering on each flank. u = 0.25 and 0.75 are the two sides.
  for (const u of [0.25, 0.75]) {
    const x = u * 1024;
    context.fillStyle = '#c4161c';
    context.fillRect(x - 12, 200, 24, 70);
    context.fillRect(x - 35, 223, 70, 24);
    context.fillStyle = '#c4161c';
    context.font = 'bold 30px Arial, sans-serif';
    context.textAlign = 'center';
    context.save();
    context.translate(x, 395);
    context.scale(u < 0.5 ? -1 : 1, 1);
    context.fillText('AIR AMBULANCE', 0, 0);
    context.restore();
  }
  // Panel lines and grime.
  context.strokeStyle = 'rgba(0,0,0,0.18)';
  context.lineWidth = 2;
  for (let i = 0; i < 9; i++) {
    context.beginPath();
    context.moveTo(i * 120 + 40, 150);
    context.lineTo(i * 120 + 40, 440);
    context.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function buildHelicopter(scene: THREE.Object3D, glowMap: THREE.Texture, environment: THREE.Texture): (state: GameState, time: number, dt: number) => void {
  const root = new THREE.Group();
  root.visible = false;
  scene.add(root);
  const body = new THREE.Group();
  root.add(body);

  const paint = new THREE.MeshStandardMaterial({ map: liveryTexture(), roughness: 0.32, metalness: 0.15, envMap: environment, envMapIntensity: 0.6 });
  const white = new THREE.MeshStandardMaterial({ color: 0xeceff1, roughness: 0.32, metalness: 0.15, envMap: environment, envMapIntensity: 0.6 });
  const red = new THREE.MeshStandardMaterial({ color: 0xc4161c, roughness: 0.4, metalness: 0.1 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1c1f22, roughness: 0.5, metalness: 0.6 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x8d949a, roughness: 0.35, metalness: 0.9, envMap: environment, envMapIntensity: 0.6 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x0b1216, roughness: 0.05, metalness: 0.7, envMap: environment, envMapIntensity: 1.4 });
  const add = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = body) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  };

  // The cabin: a stretched egg, with the windscreen and side windows set into it.
  const cabin = add(new THREE.SphereGeometry(1, 32, 20), paint, 0, 1.5, -0.5);
  cabin.scale.set(1.2, 1.15, 2.3);
  const screen = add(new THREE.SphereGeometry(1.012, 32, 12, Math.PI * 1.5 - 0.85, 1.7, 0.42, 0.78), glass, 0, 1.5, -0.5);
  screen.scale.copy(cabin.scale);
  for (const phi of [0, Math.PI]) {
    const window = add(new THREE.SphereGeometry(1.012, 16, 8, phi - 0.42, 0.84, 0.62, 0.42), glass, 0, 1.5, -0.5);
    window.scale.copy(cabin.scale);
  }
  // The sliding side door's outline.
  for (const side of [-1, 1]) add(new THREE.BoxGeometry(0.02, 0.95, 1.3), dark, side * 1.13, 1.35, 0.1);
  // The engine fairing on top, the tail boom, fin and the ducted tail rotor.
  add(new RoundedBoxGeometry(1.2, 0.6, 2.1, 3, 0.22), white, 0, 2.5, 0.3);
  add(new THREE.BoxGeometry(0.5, 0.2, 0.5), dark, 0.0, 2.85, 1.0);
  const boom = add(new THREE.CylinderGeometry(0.15, 0.4, 4.8, 16), red, 0, 1.85, 3.6);
  boom.rotation.x = Math.PI / 2;
  const fin = add(new RoundedBoxGeometry(0.14, 1.7, 1.1, 2, 0.05), white, 0, 2.25, 6.1);
  fin.rotation.x = -0.25;
  const duct = add(new THREE.TorusGeometry(0.42, 0.11, 10, 24), white, 0, 1.95, 6.05);
  duct.rotation.y = Math.PI / 2;
  const tailRotor = new THREE.Group();
  tailRotor.position.set(0, 1.95, 6.05);
  body.add(tailRotor);
  for (let i = 0; i < 8; i++) {
    const blade = add(new THREE.BoxGeometry(0.02, 0.36, 0.06), dark, 0, 0.18, 0, tailRotor);
    blade.rotation.x = (i / 8) * Math.PI * 2;
    blade.position.set(0, Math.cos((i / 8) * Math.PI * 2) * 0.18, Math.sin((i / 8) * Math.PI * 2) * 0.18);
  }
  add(new RoundedBoxGeometry(2.0, 0.07, 0.42, 2, 0.03), white, 0, 1.85, 5.2);
  for (const side of [-1, 1]) add(new RoundedBoxGeometry(0.06, 0.42, 0.38, 2, 0.02), red, side * 1.0, 1.9, 5.2);

  // Skids on struts.
  for (const side of [-1, 1]) {
    const skid = add(new THREE.CylinderGeometry(0.05, 0.05, 3.6, 8), metal, side * 0.95, 0.06, -0.2);
    skid.rotation.x = Math.PI / 2;
    const toe = add(new THREE.CylinderGeometry(0.05, 0.05, 0.4, 8), metal, side * 0.95, 0.16, -2.12);
    toe.rotation.x = Math.PI / 2 + 0.6;
    for (const z of [-1.1, 0.7]) {
      const strut = add(new THREE.CylinderGeometry(0.045, 0.045, 1.0, 8), metal, side * 0.78, 0.5, z);
      strut.rotation.z = side * 0.38;
    }
  }

  // The main rotor: mast, hub, four blades and a faint disc when it is spinning fast.
  add(new THREE.CylinderGeometry(0.09, 0.12, 0.45, 12), metal, 0, 2.95, 0.0);
  const rotor = new THREE.Group();
  rotor.position.set(0, 3.2, 0.0);
  body.add(rotor);
  add(new THREE.CylinderGeometry(0.22, 0.22, 0.14, 16), dark, 0, 0, 0, rotor);
  for (let i = 0; i < 4; i++) {
    const arm = new THREE.Group();
    arm.rotation.y = (i / 4) * Math.PI * 2;
    rotor.add(arm);
    const blade = add(new THREE.BoxGeometry(0.3, 0.035, 5.0), dark, 0, 0, 2.7, arm);
    blade.rotation.z = 0.06;
    add(new THREE.BoxGeometry(0.3, 0.036, 0.3), red, 0, 0, 5.05, arm);
  }
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(5.2, 48),
    new THREE.MeshBasicMaterial({ color: 0x0c0e10, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }),
  );
  disc.rotation.x = -Math.PI / 2;
  rotor.add(disc);

  // Lights: a red beacon on top and one underneath, red and green at the stabiliser tips, a white
  // strobe on the tail, and the searchlight under the nose.
  const sprite = (color: number, scale: number, x: number, y: number, z: number) => {
    const made = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowMap, color, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
    made.scale.setScalar(scale);
    made.position.set(x, y, z);
    body.add(made);
    return made;
  };
  const beacons = [sprite(0xff2a1a, 1.4, 0, 2.95, 0.9), sprite(0xff2a1a, 1.2, 0, 0.45, 0.2)];
  sprite(0xff2a1a, 0.8, -1.0, 1.9, 5.4);
  sprite(0x22ff66, 0.8, 1.0, 1.9, 5.4);
  const strobe = sprite(0xffffff, 1.6, 0, 3.0, 6.5);
  const search = new THREE.SpotLight(0xf4f6ff, 0, 70, 0.3, 0.5, 1.2);
  search.position.set(0, 0.7, -2.4);
  search.target.position.set(0, -10, -6);
  body.add(search, search.target);
  const beam = new THREE.Mesh(
    new THREE.ConeGeometry(3.2, 16, 24, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xdfe8ff, transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
  );
  // The cone's point is at the lamp and it opens along the searchlight.
  const along = new THREE.Vector3().subVectors(search.target.position, search.position).normalize();
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), along.clone().negate());
  beam.position.copy(search.position).addScaledVector(along, 8);
  body.add(beam);
  const lamp = sprite(0xf4f6ff, 1.6, 0, 0.65, -2.45);
  const glowUnder = new THREE.PointLight(0xffe8c8, 0, 14, 2);
  glowUnder.position.set(0, 0.4, 0);
  body.add(glowUnder);

  let spin = 0;
  return (state, time, dt) => {
    const pose = helicopterPose(state);
    root.visible = pose.visible;
    if (!pose.visible) return;
    root.position.set(pose.x, pose.y, pose.z);
    root.rotation.set(0, pose.yaw, 0);
    // A little drift and sway in the air, none on the ground.
    const air = pose.landed ? 0 : Math.min(1, pose.y / 2);
    body.position.set(Math.sin(time * 0.7) * 0.25 * air, Math.sin(time * 1.1) * 0.15 * air, 0);
    body.rotation.set(-pose.pitch + Math.sin(time * 0.9) * 0.02 * air, 0, Math.sin(time * 0.6) * 0.035 * air);
    spin += dt * (pose.landed ? 26 : 30);
    rotor.rotation.y = spin;
    tailRotor.rotation.x = spin * 4;
    disc.visible = true;
    const blink = settings.reducedFlashing ? 0.6 : Math.sin(time * 6) > 0.3 ? 1 : 0.1;
    for (const beacon of beacons) beacon.material.opacity = blink;
    strobe.material.opacity = settings.reducedFlashing ? 0.4 : (time * 1.1) % 1 < 0.06 ? 1 : 0;
    const searching = pose.landed ? 0.3 : 1;
    search.intensity = 260 * searching;
    (beam.material as THREE.MeshBasicMaterial).opacity = 0.05 * searching;
    lamp.material.opacity = searching;
    glowUnder.intensity = pose.y < 6 ? 12 * (1 - pose.y / 6) + 3 : 0;
  };
}
