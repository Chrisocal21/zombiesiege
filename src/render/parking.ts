import * as THREE from 'three';
import type { Level } from '../levels/types';
import { SPECIAL_PARKING_BAY, SURFACE_PARKING_BAYS } from '../levels/parking';
import { hazardMaterial, labelTexture } from './streetTextures';

export function buildHospitalParking(parent: THREE.Object3D, level: Level): void {
  if (!level.ramp) return;
  const ground = level.ramp.rise;
  const teal = new THREE.MeshStandardMaterial({ color: '#365f61', roughness: 0.85 });
  const rubber = new THREE.MeshStandardMaterial({ color: '#262d30', roughness: 0.9 });
  const yellow = new THREE.MeshStandardMaterial({ color: '#b7a265', roughness: 0.85 });
  const hazard = hazardMaterial();
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z); mesh.receiveShadow = true; parent.add(mesh);
  };
  const sign = (text: string, sub: string, w: number, h: number, x: number, y: number, z: number, turn: number) => {
    const map = labelTexture([{ text, size: 90, color: '#e6e9df' }, { text: sub, size: 38, color: '#d2c392' }], '#25464c', 1024, 256);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map, roughness: 0.8 }));
    mesh.position.set(x, y, z); mesh.rotation.y = turn; parent.add(mesh);
  };
  // Stops are at the closed end of actual bays, never attached to cars in road lanes.
  for (const bay of SURFACE_PARKING_BAYS) {
    if (bay.kind === 'KEEP CLEAR' || bay.id === SPECIAL_PARKING_BAY.id) continue;
    const stopX = bay.x < 0 ? -22.7 : 21.7;
    box(0.18, 0.09, 1.7, stopX, ground + 0.045, bay.z, rubber);
    for (const offset of [-0.5, 0.5]) box(0.19, 0.012, 0.32, stopX, ground + 0.096, bay.z + offset, yellow);
  }
  sign('VISITOR PARKING', 'ACCESSIBLE BAYS / MAIN ENTRANCE', 4.8, 1, -25.94, ground + 2.8, 18.4, Math.PI / 2);
  sign('HOSPITAL TRANSPORT', 'AMBULANCE BAY / KEEP ACCESS CLEAR', 4.8, 1, 25.94, ground + 2.8, 21.35, -Math.PI / 2);
  sign('E05  RESERVED', 'KEEP BAY CLEAR', 3.8, 0.9, 25.94, ground + 2.8, SPECIAL_PARKING_BAY.z, -Math.PI / 2);

  // Wall paint follows each solid segment, preserving all garage door and lift openings.
  for (const wall of level.boxes) {
    if (wall.surface !== 'wall' || wall.position.y - wall.size.y / 2 > 0.1 || wall.size.y < 4) continue;
    if (Math.abs(wall.position.x) > 11 || Math.abs(wall.position.z) > 11) continue;
    box(wall.size.x + 0.015, 0.32, wall.size.z + 0.015, wall.position.x, 1.25, wall.position.z, teal);
  }
  sign('B1  /  STAFF PARKING', 'NORTHLINE GENERAL HOSPITAL', 4.5, 0.85, -9.96, 3.1, 3, Math.PI / 2);
  sign('LIFTS / HOSPITAL', 'FOLLOW THE GREEN WALKWAY', 3.8, 0.7, -6, 3.4, -9.96, 0);
  sign('10  /  SLOW', 'PEDESTRIANS / SINGLE LANE RAMP', 2.8, 0.75, 9.94, 3.25, 7.5, -Math.PI / 2);
  for (const pillar of level.boxes.filter(b => b.surface === 'pillar')) {
    box(pillar.size.x + 0.025, 0.6, pillar.size.z + 0.025, pillar.position.x, 2.3, pillar.position.z, teal);
    box(pillar.size.x + 0.03, 0.45, pillar.size.z + 0.03, pillar.position.x, 0.45, pillar.position.z, hazard);
    sign('B1', 'STAFF', 0.5, 0.43, pillar.position.x, 2.3, pillar.position.z + pillar.size.z / 2 + 0.02, 0);
  }
}
