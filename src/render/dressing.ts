import * as THREE from 'three';
import type { Level } from '../levels/types';
import { glowTexture, paintTexture, puddleAlphaTexture } from './materials';
import { labelTexture } from './streetTextures';

// Reusable detail kit. Large solid props remain defined by the level's collision boxes.
export function buildDressing(scene: THREE.Scene | THREE.Group, level: Level): (time: number) => void {
  const steel = new THREE.MeshStandardMaterial({ color: '#444e55', metalness: 0.7, roughness: 0.5 });
  const rubber = new THREE.MeshStandardMaterial({ color: '#171b1d', roughness: 0.95 });
  const yellow = new THREE.MeshStandardMaterial({ color: '#cfa74f', roughness: 0.78 });
  const shadowMap = glowTexture();
  const shadow = new THREE.MeshBasicMaterial({ map: shadowMap, color: '#000000', transparent: true, opacity: 0.48, depthWrite: false });
  const box = (parent: THREE.Object3D, size: number[], position: number[], material: THREE.Material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material);
    mesh.position.set(position[0], position[1], position[2]);
    mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
  };
  const sign = (label: string, sub: string, w: number, h: number, bg: string) => new THREE.Mesh(
    new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({
      map: labelTexture([{ text: label, size: 74, color: '#e4e8df' }, { text: sub, size: 30, color: '#d4ad58' }], bg, 768, 256),
      roughness: 0.7, emissive: '#aebfd0', emissiveIntensity: 0.07,
    }),
  );
  for (const prop of level.boxes) {
    if (!['car', 'van', 'crate', 'cartons', 'container', 'barrel'].includes(prop.surface ?? '')) continue;
    const base = prop.position.y - prop.size.y / 2;
    const contact = new THREE.Mesh(new THREE.PlaneGeometry(prop.size.x * 1.35, prop.size.z * 1.4), shadow);
    contact.rotation.x = -Math.PI / 2;
    contact.position.set(prop.position.x, base + 0.012, prop.position.z); scene.add(contact);
    if (prop.surface === 'car' || prop.surface === 'van') {
      // Stops sit within the parked vehicle's existing envelope.
      const alongX = prop.size.x > prop.size.z;
      const stop = box(scene, alongX ? [0.18, 0.1, prop.size.z * 0.8] : [prop.size.x * 0.8, 0.1, 0.18],
        [prop.position.x + (alongX ? prop.size.x * 0.34 : 0), base + 0.05, prop.position.z + (alongX ? 0 : prop.size.z * 0.34)], yellow);
      stop.receiveShadow = true;
    }
    if (prop.surface !== 'container') continue;
    const group = new THREE.Group(); group.position.set(prop.position.x, base, prop.position.z); scene.add(group);
    const { x: w, y: h, z: d } = prop.size;
    const paint = new THREE.MeshStandardMaterial({ color: prop.color, metalness: 0.45, roughness: 0.66 });
    for (const side of [-1, 1]) {
      for (let x = -w / 2 + 0.15; x < w / 2; x += 0.26) box(group, [0.045, h - 0.12, 0.055], [x, h / 2, side * d / 2], paint);
      for (const x of [-1, 1]) box(group, [0.1, h, 0.1], [x * (w / 2 - 0.05), h / 2, side * d / 2], steel);
      for (const y of [0.08, h - 0.08]) box(group, [w, 0.12, 0.12], [0, y, side * d / 2], steel);
    }
    for (const z of [-d * 0.25, d * 0.25]) {
      box(group, [0.05, h * 0.84, 0.035], [w / 2 + 0.03, h / 2, z], steel);
      for (const y of [0.3, h - 0.3]) box(group, [0.08, 0.07, 0.19], [w / 2 + 0.045, y, z], steel);
    }
    const label = sign('CARGO 024', 'MAX. GROSS 30,480 KG', 1.2, 0.45, '#243d48');
    label.position.set(w * 0.24, h * 0.71, d / 2 + 0.038); group.add(label);
  }

  const streetY = level.ramp.rise;
  const wet = new THREE.MeshPhysicalMaterial({ color: '#32434c', roughness: 0.1, metalness: 0.3, clearcoat: 1,
    alphaMap: puddleAlphaTexture(), transparent: true, opacity: 0.5, depthWrite: false });
  for (const [x, z, w, d] of [[-10, 37, 7, 1.3], [14, 44, 6, 2], [-18, 26, 4, 2.5], [7, 37, 5, 1.1], [18, 29, 3, 2]]) {
    const puddle = new THREE.Mesh(new THREE.PlaneGeometry(w, d), wet);
    puddle.rotation.x = -Math.PI / 2; puddle.rotation.z = x * 0.1;
    puddle.position.set(x, streetY + 0.018, z); scene.add(puddle);
  }
  // Grate texture replaces many tiny meshes, preserving detail without dozens of draw calls.
  const grateMap = paintTexture(128, 320, (ctx, size) => {
    ctx.fillStyle = '#4c555a'; ctx.fillRect(0, 0, size, size);
    for (let x = 8; x < size; x += 15) { ctx.fillStyle = '#11171b'; ctx.fillRect(x, 8, 8, size - 16); }
    ctx.strokeStyle = '#8a8f90'; ctx.strokeRect(2, 2, size - 4, size - 4);
  });
  const grate = new THREE.MeshStandardMaterial({ map: grateMap, metalness: 0.7, roughness: 0.75 });
  for (const x of [-22, -12, 12, 22]) {
    const drain = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.8), grate);
    drain.rotation.x = -Math.PI / 2; drain.position.set(x, streetY + 0.02, 36.15); scene.add(drain);
  }
  // Visible destinations and district identity make the street feel connected.
  for (const side of [-1, 1]) {
    const tunnel = sign(side < 0 ? 'OLD TOWN' : 'RIVERSIDE', 'ROAD CLOSED / EVACUATION IN EFFECT', 5.8, 0.85, '#17353c');
    tunnel.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    tunnel.position.set(side * 25.96, streetY + 6.7, 41); scene.add(tunnel);
    const storefront = sign(side < 0 ? 'NORTHLINE' : '24 / SEVEN', side < 0 ? 'PHARMACY  +  MEDICAL' : 'MARKET & COFFEE', 6, 0.85, '#17343a');
    storefront.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    storefront.position.set(side * 25.85, streetY + 3.3, 29); scene.add(storefront);
  }
  // Wall-mounted fire and electrical equipment lives against existing solid walls.
  for (const [x, z, rotation] of [[-9.92, -0.9, Math.PI / 2], [9.92, 1.8, -Math.PI / 2]]) {
    const group = new THREE.Group(); group.position.set(x, 0, z); group.rotation.y = rotation; scene.add(group);
    box(group, [0.65, 0.9, 0.08], [0, 1.4, 0], steel);
    const label = sign('DANGER', 'HIGH VOLTAGE', 0.38, 0.22, '#62521e'); label.position.set(0, 1.5, 0.045); group.add(label);
    box(group, [0.05, 0.14, 0.045], [0.23, 1.3, 0.05], rubber);
  }
  const dustGeometry = new THREE.BufferGeometry();
  const points = new Float32Array(110 * 3);
  for (let i = 0; i < 110; i++) { points[i * 3] = Math.sin(i * 93.73) * 9; points[i * 3 + 1] = (i * 0.137) % 4; points[i * 3 + 2] = Math.cos(i * 41.9) * 9; }
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(points, 3));
  const dust = new THREE.Points(dustGeometry, new THREE.PointsMaterial({ color: '#b4c0b5', size: 0.018, transparent: true, opacity: 0.2, depthWrite: false, map: shadowMap }));
  scene.add(dust);
  return time => { dust.rotation.y = Math.sin(time * 0.025) * 0.08; dust.position.y = Math.sin(time * 0.12) * 0.12; };
}
