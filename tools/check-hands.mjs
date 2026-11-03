// Structural and skinning checks on the shipped assets, without a browser or WebGL.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { articulateHand, refineHandSurface, FINGER_CHAINS } from '../src/render/handRig.ts';

for (const side of ['right', 'left']) {
  const bytes = fs.readFileSync(new URL(`../public/models/${side}-hand.glb`, import.meta.url));
  const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  let mesh; gltf.scene.traverse(object => { if (object.isSkinnedMesh) mesh = object; });
  const originalTriangles = mesh.geometry.index.count / 3;
  mesh.geometry = refineHandSurface(mesh.geometry);
  assert.equal(mesh.geometry.index.count / 3, originalTriangles * 4);
  gltf.scene.updateMatrixWorld(true); mesh.skeleton.update();
  const positions = mesh.geometry.getAttribute('position');
  const before = Array.from({ length: positions.count }, (_, i) => mesh.applyBoneTransform(i, new THREE.Vector3().fromBufferAttribute(positions, i)));
  const rig = articulateHand(mesh);
  gltf.scene.updateMatrixWorld(true); mesh.skeleton.update();
  assert.equal(mesh.skeleton.bones.length, 36);
  let maxError = 0;
  const weighted = new Set(), indices = mesh.geometry.getAttribute('skinIndex'), weights = mesh.geometry.getAttribute('skinWeight');
  for (let i = 0; i < positions.count; i++) {
    maxError = Math.max(maxError, mesh.applyBoneTransform(i, new THREE.Vector3().fromBufferAttribute(positions, i)).distanceTo(before[i]));
    let total = 0;
    for (let j = 0; j < 4; j++) {
      total += weights.getComponent(i, j);
      if (weights.getComponent(i, j) > 0) weighted.add(indices.getComponent(i, j));
    }
    assert.ok(Math.abs(total - 1) < 1e-6, 'skin weights must stay normalized');
  }
  assert.ok(maxError < 1e-6, `rest skin moved by ${maxError}m`);
  for (let i = 25; i < 36; i++) assert.ok(weighted.has(i), `new bone ${i} must influence the mesh`);
  for (const names of Object.values(FINGER_CHAINS)) {
    const chain = names.map(name => rig.bones.get(name));
    for (let i = 1; i < chain.length; i++) assert.equal(chain[i].parent, chain[i - 1]);
    const lengths = chain.slice(1).map((bone, i) => rig.point(bone).distanceTo(rig.point(chain[i])));
    for (let i = 0; i < 3; i++) rig.rotate(chain[i], new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), .6));
    rig.updateFolds();
    chain.slice(1).forEach((bone, i) => assert.ok(Math.abs(rig.point(bone).distanceTo(rig.point(chain[i])) - lengths[i]) < 1e-7, 'bending must preserve finger lengths'));
  }
  gltf.scene.updateMatrixWorld(true); mesh.skeleton.update();
  for (let i = 0; i < positions.count; i++) assert.ok(mesh.applyBoneTransform(i, new THREE.Vector3().fromBufferAttribute(positions, i)).toArray().every(Number.isFinite));
  console.log(`PASS: ${side} hand — 36 bones, weighted folds, connected fingers, unchanged bind skin, fixed segment lengths`);
}
