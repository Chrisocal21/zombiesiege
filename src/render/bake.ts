import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Bake only immutable scenery. Doors, pickups, characters and effects retain their own rigs.
// Transparent meshes are left alone unless their material says the order they draw in does not
// matter, as for shadows and stains flat on the floor.
export function bakeStaticMeshes(root: THREE.Group): void {
  root.updateMatrixWorld(true);
  const groups = new Map<string, { material: THREE.Material; meshes: THREE.Mesh[]; shadows: boolean; receive: boolean }>();
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh) || Array.isArray(object.material)) return;
    if (object.material.transparent && !object.material.userData.bake) return;
    const key = `${object.material.uuid}:${object.castShadow}:${object.receiveShadow}`;
    let group = groups.get(key);
    if (!group) { group = { material: object.material, meshes: [], shadows: object.castShadow, receive: object.receiveShadow }; groups.set(key, group); }
    group.meshes.push(object);
  });
  const originals = new Set<THREE.BufferGeometry>();
  for (const group of groups.values()) {
    if (group.meshes.length < 2) continue;
    const geometries = group.meshes.map(mesh => {
      originals.add(mesh.geometry);
      const geo = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
      for (const key of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(key)) geo.deleteAttribute(key);
      geo.applyMatrix4(mesh.matrixWorld); return geo;
    });
    const merged = mergeGeometries(geometries, false);
    for (const geo of geometries) geo.dispose();
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, group.material);
    mesh.castShadow = group.shadows; mesh.receiveShadow = group.receive;
    mesh.name = 'Baked scenery'; root.add(mesh);
    for (const original of group.meshes) original.removeFromParent();
  }
  // Keep any geometry still referenced by unmerged meshes.
  root.traverse(object => { if (object instanceof THREE.Mesh) originals.delete(object.geometry); });
  for (const geometry of originals) geometry.dispose();
}
