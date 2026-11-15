import * as THREE from 'three';
import type { Level } from '../levels/types';
import { blobs, paintTexture, specks } from './materials';

// Drawn-only detail for the hospital roof: a stone coping on the parapet, pipe runs along its foot on
// brackets, cable trays, a skylight, roof drains, vent stacks and aerials on the huts, and a red
// warning light on the machine room. All of it stays clear of where the player walks, so nothing
// here needs a collision box.

export function buildRoofDressing(parent: THREE.Object3D, level: Level): void {
  if (level.theme !== 'roof') return;
  const group = new THREE.Group();
  group.name = 'Roof dressing';
  parent.add(group);

  const metal = (color: number, rough = 0.45) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.7 });
  const pipeGrey = metal(0x8a9298), pipeBlue = metal(0x3b5f86), pipeRed = metal(0x8a2c26), dark = metal(0x23272b, 0.6);
  const coping = new THREE.MeshStandardMaterial({
    map: paintTexture(256, 88, (c, s, r) => { c.fillStyle = '#b9bbb5'; c.fillRect(0, 0, s, s); blobs(c, s, r, 60, 8, 40, '110,110,100', 0.3); specks(c, s, r, 2000, 1.5, 0.2, 0.3); }),
    roughness: 0.9,
  });
  const add = (g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, shadow = true) => {
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set(x, y, z);
    mesh.castShadow = shadow; mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  const HX = 18, HZ = 14, PARAPET = 1.1;

  // Coping: a slightly wider stone cap along the top of the parapet.
  add(new THREE.BoxGeometry(HX * 2 + 1.2, 0.08, 0.62), coping, 0, PARAPET + 0.04, -HZ - 0.2);
  add(new THREE.BoxGeometry(HX * 2 + 1.2, 0.08, 0.62), coping, 0, PARAPET + 0.04, HZ + 0.2);
  add(new THREE.BoxGeometry(0.62, 0.08, HZ * 2), coping, -HX - 0.2, PARAPET + 0.04, 0);
  add(new THREE.BoxGeometry(0.62, 0.08, HZ * 2), coping, HX + 0.2, PARAPET + 0.04, 0);

  // A pipe run: a tube between two points on brackets every 2 m, with a flange at each joint.
  const run = (ax: number, az: number, bx: number, bz: number, y: number, radius: number, material: THREE.Material) => {
    const length = Math.hypot(bx - ax, bz - az);
    const pipe = add(new THREE.CylinderGeometry(radius, radius, length, 12), material, (ax + bx) / 2, y, (az + bz) / 2);
    pipe.rotation.z = Math.PI / 2;
    pipe.rotation.y = -Math.atan2(bz - az, bx - ax);
    const steps = Math.max(1, Math.round(length / 2));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
      add(new THREE.BoxGeometry(0.1, y, 0.1), dark, x, y / 2, z);
      if (i > 0 && i < steps) add(new THREE.CylinderGeometry(radius * 1.25, radius * 1.25, 0.1, 12), dark, x, y, z).rotation.copy(pipe.rotation);
    }
  };
  // Along the foot of the parapet, clear of the stair huts, the machine room, the tank and the mast.
  run(-9.5, -13.7, 9.5, -13.7, 0.28, 0.09, pipeBlue);
  run(-9.5, -13.35, 9.5, -13.35, 0.2, 0.06, pipeRed);
  run(7.5, 13.7, 17.5, 13.7, 0.28, 0.09, pipeGrey);
  run(17.55, -13, 17.55, -5.5, 0.28, 0.09, pipeBlue);
  run(-17.55, -9, -17.55, 0.5, 0.28, 0.09, pipeGrey);
  run(-17.55, -9.4, -17.55, 0.1, 0.2, 0.06, pipeRed);

  // Cable tray between the machine room and the east plant, a ladder-style tray on legs.
  const trayZ = 8.3;
  add(new THREE.BoxGeometry(5.5, 0.04, 0.3), dark, 8.2, 0.14, trayZ);
  for (let x = 5.6; x < 10.9; x += 0.4) add(new THREE.BoxGeometry(0.03, 0.03, 0.3), dark, x, 0.16, trayZ);
  for (const x of [5.6, 8.2, 10.8]) add(new THREE.BoxGeometry(0.05, 0.14, 0.05), dark, x, 0.07, trayZ);

  // Roof drains and a skylight lying flat on the roof, low enough to step over.
  for (const [x, z] of [[-12.5, -2], [4, -8], [14.5, 8], [-4, 10.8]]) {
    add(new THREE.CylinderGeometry(0.28, 0.28, 0.03, 16), dark, x, 0.016, z, false);
    for (let k = -1; k <= 1; k++) add(new THREE.BoxGeometry(0.4, 0.012, 0.025), metal(0x555b61), x, 0.035, z + k * 0.09, false);
  }
  const frame = metal(0x4a5056);
  const glass = new THREE.MeshStandardMaterial({ color: 0x1b2a38, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.7 });
  add(new THREE.BoxGeometry(2.2, 0.06, 1.4), frame, -9, 0.09, -8.4);
  add(new THREE.BoxGeometry(2.0, 0.04, 1.2), glass, -9, 0.13, -8.4, false);
  add(new THREE.BoxGeometry(0.05, 0.05, 1.2), frame, -9, 0.15, -8.4);

  // Vent stacks and aerials on the stair huts and the machine room.
  const hutTops: [number, number, number][] = [[-12, 3.2, -12], [12, 3.2, -12], [16.1, 3.2, 4], [-16.1, 3.2, 4]];
  hutTops.forEach(([x, y, z], i) => {
    add(new THREE.CylinderGeometry(0.1, 0.1, 0.9, 10), pipeGrey, x + 1.2, y + 0.65, z + 1);
    add(new THREE.CylinderGeometry(0.2, 0.1, 0.12, 10), pipeGrey, x + 1.2, y + 1.14, z + 1);
    add(new THREE.CylinderGeometry(0.012, 0.012, 1.8, 5), dark, x - 1, y + 1.1, z - 0.8);
    add(new THREE.BoxGeometry(0.5, 0.012, 0.012), dark, x - 1, y + 1.7, z - 0.8);
    add(new THREE.BoxGeometry(0.35, 0.012, 0.012), dark, x - 1, y + 1.4, z - 0.8);
    if (i % 2 === 0) add(new THREE.BoxGeometry(0.8, 0.5, 0.5), pipeGrey, x - 0.6, y + 0.35, z + 1.2);
  });
  // The machine room: a motor housing, a vent and a red aircraft warning light on a short mast.
  add(new THREE.BoxGeometry(1.4, 0.7, 1), pipeGrey, -3, 4.65, 12.3);
  add(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 6), dark, 3.6, 5.1, 12.8);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff2a1a }));
  beacon.position.set(3.6, 5.78, 12.8);
  group.add(beacon);
  const glow = new THREE.PointLight(0xff2a1a, 6, 9, 2);
  glow.position.set(3.6, 5.8, 12.8);
  group.add(glow);

  group.updateMatrixWorld(true);
}
