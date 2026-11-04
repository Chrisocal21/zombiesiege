import * as THREE from 'three';
import type { LevelBox } from '../levels/types';
import { paintTexture, surfaceMaterial } from './materials';
import { labelTexture, shutterMaterial } from './streetTextures';

// The hospital shares the street's masonry, metal frames and human-scale windows, but its
// ward wings, clinical podium and entrance signs distinguish it from the office blocks.
export function buildHospital(box: LevelBox): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Northline General Hospital';
  root.position.set(box.position.x, box.position.y - box.size.y / 2, box.position.z);
  const { x: width, y: height, z: depth } = box.size;
  const concrete = surfaceMaterial('plain', '#b6b5a8');
  const stone = surfaceMaterial('plain', '#777f7e');
  const frame = new THREE.MeshStandardMaterial({ color: '#465557', roughness: 0.6, metalness: 0.45 });
  const teal = new THREE.MeshStandardMaterial({ color: '#244f52', roughness: 0.7, metalness: 0.15 });
  const glass = new THREE.MeshStandardMaterial({ color: '#334c5a', roughness: 0.36, metalness: 0.25 });
  const warmGlass = new THREE.MeshStandardMaterial({ color: '#9b947c', emissive: '#c3af80', emissiveIntensity: 0.17, roughness: 0.55 });
  const blind = new THREE.MeshStandardMaterial({ color: '#8d9994', roughness: 0.85 });
  const light = new THREE.MeshBasicMaterial({ color: '#d1dbcc' });
  const brickMap = paintTexture(512, 417, (ctx, size, random) => {
    ctx.fillStyle = '#5e605b'; ctx.fillRect(0, 0, size, size);
    for (let row = 0; row < 16; row++) for (let column = -1; column < 8; column++) {
      const shade = Math.floor(random() * 22);
      ctx.fillStyle = `rgb(${100 + shade},${75 + shade},${62 + shade})`;
      ctx.fillRect(column * 64 + (row % 2) * 32 + 2, row * 32 + 2, 60, 28);
      ctx.fillStyle = 'rgba(22,24,23,0.12)';
      for (let i = 0; i < 12; i++) ctx.fillRect(column * 64 + (row % 2) * 32 + random() * 60, row * 32 + random() * 28, 5, 2);
    }
  });
  const brick = new THREE.MeshStandardMaterial({ map: brickMap, bumpMap: brickMap, bumpScale: 0.018, roughness: 0.92 });
  const add = (parent: THREE.Object3D, w: number, h: number, d: number, x: number, y: number, z: number, material: THREE.Material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    if (material === brick) {
      const uv = mesh.geometry.attributes.uv, pos = mesh.geometry.attributes.position, normal = mesh.geometry.attributes.normal;
      for (let i = 0; i < uv.count; i++) uv.setXY(i,
        (Math.abs(normal.getX(i)) > 0.5 ? pos.getZ(i) : pos.getX(i)) / 2.4, pos.getY(i) / 1.6);
    }
    parent.add(mesh);
    return mesh;
  };
  add(root, width, height, depth, 0, height / 2, 0, concrete);

  // Wrap the podium and ward windows around all four sides so corners remain a real building.
  for (const [span, x, z, turn] of [
    [width, 0, depth / 2, 0], [width, 0, -depth / 2, Math.PI],
    [depth, width / 2, 0, Math.PI / 2], [depth, -width / 2, 0, -Math.PI / 2],
  ]) {
    const face = new THREE.Group();
    face.position.set(x, 0, z); face.rotation.y = turn; root.add(face);
    add(face, span, 7.2, 0.16, 0, 3.6, 0.08, brick);
    add(face, span, 0.65, 0.4, 0, 0.325, 0.2, stone);
    add(face, span + 0.25, 0.3, 0.55, 0, 7.2, 0.2, concrete);
    add(face, span + 0.25, 0.25, 0.55, 0, height - 0.3, 0.2, stone);
    const bays = Math.floor(span / 3.4), pitch = span / bays;
    for (let bay = 0; bay < bays; bay++) {
      const bx = -span / 2 + (bay + 0.5) * pitch;
      // Windows on the lobby / outpatient floor, above a robust stone sill.
      add(face, pitch - 0.55, 3.1, 0.13, bx, 2.5, 0.22, frame);
      add(face, pitch - 0.75, 2.9, 0.06, bx, 2.5, 0.32, glass);
      add(face, 0.06, 2.9, 0.05, bx, 2.5, 0.38, frame);
      for (let floor = 0, y = 9.1; y < height - 2; floor++, y += 3.5) {
        const lit = (bay * 13 + floor * 7 + Math.round(turn * 10)) % 17 === 0;
        add(face, pitch - 0.68, 2.1, 0.12, bx, y, 0.12, frame);
        add(face, pitch - 0.84, 1.94, 0.06, bx, y, 0.22, lit ? warmGlass : glass);
        add(face, 0.055, 1.94, 0.04, bx, y, 0.27, frame);
        add(face, pitch - 0.84, 0.055, 0.04, bx, y - 0.35, 0.27, frame);
        if ((bay + floor * 3) % 5 === 0) add(face, pitch - 0.9, 0.56, 0.025, bx, y + 0.62, 0.265, blind);
        add(face, pitch - 0.5, 0.12, 0.35, bx, y - 1.1, 0.2, concrete);
      }
    }
    // Group the ward bays into wings instead of a single uninterrupted glass wall.
    for (let bx = -span / 2; bx <= span / 2 + 0.01; bx += span / Math.max(1, Math.round(span / 13))) {
      add(face, 0.5, height - 7.4, 0.42, bx, (height + 7.4) / 2, 0.2, concrete);
    }
  }

  const front = new THREE.Group();
  front.position.z = depth / 2; root.add(front);
  const label = (text: string, sub: string, w: number, h: number, x: number, y: number, z: number, background = '#204346') => {
    const map = labelTexture([{ text, size: 100, color: '#e8ece3' }, { text: sub, size: 35, color: '#bdcfc7' }], background, 2048, 256);
    const material = new THREE.MeshStandardMaterial({
      map, emissiveMap: map,
      roughness: 0.65, emissive: '#ffffff', emissiveIntensity: 0.12,
    });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
    sign.position.set(x, y, z); front.add(sign);
  };
  // Sign on a solid panel below the ward windows, high enough to read above the B1 sign.
  add(front, 34, 2.5, 0.5, -6, 6.1, 0.55, teal);
  label('NORTHLINE GENERAL HOSPITAL', 'ACUTE CARE  /  TRAUMA CENTRE', 28, 1.85, -4, 6.1, 0.82);
  add(front, 1.65, 1.65, 0.1, -21.5, 6.1, 0.85, teal);
  add(front, 1.15, 0.34, 0.07, -21.5, 6.1, 0.93, light);
  add(front, 0.34, 1.15, 0.07, -21.5, 6.1, 0.93, light);

  // A cantilever canopy needs no walk-through support posts in the playable plaza.
  add(front, 13, 0.38, 3.5, -12, 4.35, 1.75, teal);
  add(front, 13.15, 0.12, 3.6, -12, 4.6, 1.75, concrete);
  for (const x of [-16.8, -7.2]) add(front, 0.16, 0.45, 3, x, 4.05, 1.5, frame);
  add(front, 10, 0.025, 0.14, -12, 4.14, 2.95, light);
  label('MAIN ENTRANCE', 'RECEPTION  /  VISITOR SERVICES', 10, 0.65, -12, 4.35, 3.52);
  // The closed lobby is scenery; emergency routing points players to the playable B1 ramp.
  add(front, 4.4, 3.65, 0.22, -12, 1.825, 0.45, frame);
  add(front, 4.15, 3.4, 0.1, -12, 1.8, 0.6, shutterMaterial());
  label('ENTRANCE CLOSED', 'EMERGENCY ACCESS VIA B1 RAMP', 3.8, 0.6, -12, 1.7, 0.67);
  add(front, 12, 1.2, 0.3, 18, 5.8, 0.5, frame);
  label('EMERGENCY', '24 HOURS  /  ACCESS VIA B1', 11.5, 1, 18, 5.8, 0.67, '#713b32');
  label('B1  /  EMERGENCY ACCESS', 'USE PARKING RAMP', 8, 1.1, 3, 2.8, 0.45);
  // A high hospital marker remains visible when the player looks up from the road.
  add(front, 3.8, 6, 0.4, -22, 16, 0.4, teal);
  const markerMap = labelTexture([{ text: 'H', size: 420, color: '#e8ece3' },
    { text: 'HOSPITAL', size: 64, color: '#bdcfc7' }], '#204346', 512, 768);
  const marker = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 4.8), new THREE.MeshStandardMaterial({
    map: markerMap, emissiveMap: markerMap, emissive: '#ffffff', emissiveIntensity: 0.2, roughness: 0.7,
  }));
  marker.position.set(-22, 16, 0.62); front.add(marker);
  return root;
}
