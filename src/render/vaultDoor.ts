import * as THREE from 'three';
import { config } from '../config';
import type { GameState } from '../game/state';
import type { Level } from '../levels/types';

// The vault door: a heavy steel slab with a locking wheel and bolts, hinged on its west edge. It swings
// open into the room when the time lock releases, and slams shut again on whatever is driven back in.

type Sync = (state: GameState) => void;

const OPEN_SECONDS = 2.4;
const SHUT_SECONDS = 0.9;
// How far it swings, toward the room.
const OPEN_ANGLE = -1.75;

const smooth = (t: number) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };

export function buildVaultDoor(scene: THREE.Object3D, level: Level): Sync {
  const box = level.boxes.find((each) => each.vaultDoor);
  if (!box) return () => {};
  const width = box.size.x - 0.2, height = box.size.y - 0.1, depth = 0.5;
  const front = box.position.z + box.size.z / 2;
  const steel = new THREE.MeshStandardMaterial({ color: 0x5b636b, metalness: 0.85, roughness: 0.38 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a2f34, metalness: 0.7, roughness: 0.45 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xb08a3e, metalness: 0.9, roughness: 0.3 });
  const add = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  // The hinge on the west edge, at the door's front face.
  const hinge = new THREE.Group();
  hinge.position.set(box.position.x - width / 2, 0, front - depth / 2);
  scene.add(hinge);
  const door = new THREE.Group();
  door.position.x = width / 2;
  hinge.add(door);
  add(door, new THREE.BoxGeometry(width, height, depth), steel, 0, height / 2, 0);
  // A raised ring and the locking wheel with its spokes, on the room side.
  const ring = add(door, new THREE.TorusGeometry(0.95, 0.07, 10, 40), dark, 0, height / 2, depth / 2 + 0.03);
  ring.rotation.set(0, 0, 0);
  const wheel = new THREE.Group();
  wheel.position.set(0, height / 2, depth / 2 + 0.16);
  door.add(wheel);
  add(wheel, new THREE.TorusGeometry(0.42, 0.035, 8, 32), brass, 0, 0, 0);
  for (let k = 0; k < 4; k++) {
    const spoke = add(wheel, new THREE.CylinderGeometry(0.025, 0.025, 0.84, 8), brass, 0, 0, 0);
    spoke.rotation.z = (k * Math.PI) / 4;
  }
  add(wheel, new THREE.CylinderGeometry(0.09, 0.09, 0.12, 16), brass, 0, 0, -0.04).rotation.x = Math.PI / 2;
  // Bolt heads round the edge, and the bolts that run out of the side into the frame.
  for (let k = 0; k < 16; k++) {
    const angle = (k / 16) * Math.PI * 2;
    add(door, new THREE.CylinderGeometry(0.04, 0.04, 0.05, 8), dark, Math.cos(angle) * 1.2, height / 2 + Math.sin(angle) * 1.2, depth / 2 + 0.02).rotation.x = Math.PI / 2;
  }
  for (let k = 0; k < 4; k++) add(door, new THREE.CylinderGeometry(0.06, 0.06, 0.3, 10), steel, width / 2 + 0.1, 0.5 + k * 0.6, 0).rotation.z = Math.PI / 2;
  // The hinge barrels.
  for (const y of [0.5, height - 0.5]) add(hinge, new THREE.CylinderGeometry(0.11, 0.11, 0.5, 14), dark, 0, y, depth / 2);

  return (state) => {
    const vault = state.vault;
    const seconds = (tick: number) => (state.tick - tick) / config.ticksPerSecond;
    let open = 0;
    if (vault.openTick >= 0 && state.tick >= vault.openTick) open = smooth(seconds(vault.openTick) / OPEN_SECONDS);
    if (vault.shutTick >= 0 && state.tick >= vault.shutTick) open = 1 - Math.min(1, seconds(vault.shutTick) / SHUT_SECONDS) ** 2;
    hinge.rotation.y = OPEN_ANGLE * open;
    // The wheel spins the bolts back first.
    const unlocking = vault.openTick >= 0 ? Math.max(0, Math.min(1, (seconds(vault.openTick) + 0.8) / 0.8)) : 0;
    wheel.rotation.z = unlocking * Math.PI * 1.5;
  };
}
