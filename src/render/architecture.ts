import * as THREE from 'three';
import type { LevelBox } from '../levels/types';
import { buildingMaterial, labelTexture } from './streetTextures';
import { plankMaterial, surfaceMaterial } from './materials';

// Decorative detail stays inside the structural collision envelope.
const FRAME_WOOD = plankMaterial();
const ARCH_METAL = new THREE.MeshStandardMaterial({ color: '#444b50', metalness: 0.65, roughness: 0.55 });
const ARCH_GLASS = new THREE.MeshStandardMaterial({ color: '#172b35', metalness: 0.45, roughness: 0.22 });
const CRATE_LABEL = new THREE.MeshStandardMaterial({ map: labelTexture([{text: 'FREIGHT / 024', size: 32, color: '#222222'}, {text: 'KEEP DRY / UP', size: 26, color: '#222222'}], '#cabf9e', 256, 128), roughness: 1 });

export function buildArchitecture(box: LevelBox): THREE.Group {
  const group = new THREE.Group();
  group.position.set(box.position.x, box.position.y, box.position.z);
  const { x: w, y: h, z: d } = box.size;
  const metal = ARCH_METAL;
  const stone = surfaceMaterial('plain', '#96928a');
  const add = (width: number, height: number, depth: number, x: number, y: number, z: number, mat: THREE.Material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), mat);
    mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; group.add(mesh); return mesh;
  };
  if (box.surface === 'crate') {
    const wood = surfaceMaterial('crate', '#c4ac87');
    add(w - 0.06, h - 0.06, d - 0.06, 0, 0, 0, wood);
    for (const side of [-1, 1]) {
      for (const x of [-1, 1]) add(0.09, h, 0.045, x * (w / 2 - 0.045), 0, side * (d / 2 - 0.0225), FRAME_WOOD);
      for (const y of [-1, 1]) add(w, 0.09, 0.045, 0, y * (h / 2 - 0.045), side * (d / 2 - 0.0225), wood);
      for (const x of [-0.32, 0.32]) add(0.035, h, 0.02, w * x, 0, side * (d / 2 - 0.01), metal);
    }
    const label = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(w * 0.42, 0.55), 0.24), CRATE_LABEL);
    label.position.set(0, h * 0.16, d / 2 + 0.001); group.add(label);
    return group;
  }
  const facade = buildingMaterial('#b6b2a9');
  const core = add(w, h, d, 0, 0, 0, facade);
  const uv = core.geometry.attributes.uv, pos = core.geometry.attributes.position, normals = core.geometry.attributes.normal;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (Math.abs(normals.getX(i)) > 0.5 ? pos.getZ(i) : pos.getX(i)) / 12, pos.getY(i) / 12);
  for (let y = -h / 2 + 3; y < h / 2; y += 3) {
    add(w + 0.15, 0.18, d + 0.15, 0, y, 0, stone);
  }
  for (const side of [-1, 1]) {
    for (let x = -w / 2 + 1.5; x < w / 2; x += 6) {
      add(0.18, h, 0.15, x, 0, side * d / 2, stone);
      const glass = ARCH_GLASS;
      add(3.8, 2.5, 0.08, x + 1.8, -h / 2 + 1.3, side * (d / 2 + 0.03), glass);
      add(4.2, 0.16, 1.1, x + 1.8, -h / 2 + 2.8, side * (d / 2 + 0.45), metal);
    }
    for (let z = -d / 2 + 1.5; z < d / 2; z += 6) add(0.15, h, 0.18, side * w / 2, 0, z, stone);
  }
  return group;
}
