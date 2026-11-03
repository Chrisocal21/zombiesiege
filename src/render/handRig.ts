import * as THREE from 'three';

export const FINGER_CHAINS = {
  index: ['index-finger-phalanx-proximal', 'index-finger-phalanx-intermediate', 'index-finger-phalanx-distal', 'index-finger-tip'],
  middle: ['middle-finger-phalanx-proximal', 'middle-finger-phalanx-intermediate', 'middle-finger-phalanx-distal', 'middle-finger-tip'],
  ring: ['ring-finger-phalanx-proximal', 'ring-finger-phalanx-intermediate', 'ring-finger-phalanx-distal', 'ring-finger-tip'],
  pinky: ['pinky-finger-phalanx-proximal', 'pinky-finger-phalanx-intermediate', 'pinky-finger-phalanx-distal', 'pinky-finger-tip'],
  thumb: ['thumb-metacarpal', 'thumb-phalanx-proximal', 'thumb-phalanx-distal', 'thumb-tip'],
};

// One curved subdivision gives the small tracking mesh enough vertices to deform cleanly
// around the extra fold bones. Interpolate influences by bone ID, never the numeric indices.
export function refineHandSurface(source: THREE.BufferGeometry): THREE.BufferGeometry {
  const position = source.getAttribute('position'), normal = source.getAttribute('normal');
  const uv = source.getAttribute('uv'), skinIndex = source.getAttribute('skinIndex'), skinWeight = source.getAttribute('skinWeight');
  const positions: number[] = [], normals: number[] = [], uvs: number[] = [], indices: number[] = [], weights: number[] = [];
  for (let i = 0; i < position.count; i++) {
    positions.push(position.getX(i), position.getY(i), position.getZ(i));
    normals.push(normal.getX(i), normal.getY(i), normal.getZ(i));
    uvs.push(uv.getX(i), uv.getY(i));
    for (let j = 0; j < 4; j++) { indices.push(skinIndex.getComponent(i, j)); weights.push(skinWeight.getComponent(i, j)); }
  }
  const edges = new Map<string, number>();
  const midpoint = (a: number, b: number) => {
    const key = a < b ? `${a}:${b}` : `${b}:${a}`;
    const cached = edges.get(key); if (cached !== undefined) return cached;
    const pa = new THREE.Vector3().fromBufferAttribute(position, a), pb = new THREE.Vector3().fromBufferAttribute(position, b);
    const na = new THREE.Vector3().fromBufferAttribute(normal, a), nb = new THREE.Vector3().fromBufferAttribute(normal, b);
    const edge = pb.clone().sub(pa);
    const p = pa.add(pb).multiplyScalar(0.5).addScaledVector(na, -edge.dot(na) / 8).addScaledVector(nb, edge.dot(nb) / 8);
    const n = na.add(nb).normalize(), result = positions.length / 3;
    positions.push(...p.toArray()); normals.push(...n.toArray());
    uvs.push((uv.getX(a) + uv.getX(b)) / 2, (uv.getY(a) + uv.getY(b)) / 2);
    const influences = new Map<number, number>();
    for (const vertex of [a, b]) for (let j = 0; j < 4; j++) {
      const bone = skinIndex.getComponent(vertex, j);
      influences.set(bone, (influences.get(bone) ?? 0) + skinWeight.getComponent(vertex, j) / 2);
    }
    const top = [...influences].sort((a, b) => b[1] - a[1]).slice(0, 4), sum = top.reduce((sum, [, weight]) => sum + weight, 0);
    for (let j = 0; j < 4; j++) { indices.push(top[j]?.[0] ?? 0); weights.push((top[j]?.[1] ?? 0) / sum); }
    edges.set(key, result); return result;
  };
  const triangles: number[] = [];
  const index = source.getIndex();
  for (let i = 0; i < (index?.count ?? position.count); i += 3) {
    const a = index?.getX(i) ?? i, b = index?.getX(i + 1) ?? i + 1, c = index?.getX(i + 2) ?? i + 2;
    const ab = midpoint(a, b), bc = midpoint(b, c), ca = midpoint(c, a);
    triangles.push(a, ab, ca, ab, b, bc, ca, bc, c, ab, bc, ca);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(indices, 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));
  geometry.setIndex(triangles);
  return geometry;
}

// Upgrade the flat WebXR tracking skeleton into an articulated deformation rig. Keep the
// original inverse bind matrices: reparenting in place must not change the rest mesh.
export function articulateHand(mesh: THREE.SkinnedMesh) {
  const original = mesh.skeleton.bones.slice();
  const bones = new Map(original.map(bone => [bone.name, bone]));
  const armature = bones.get('wrist')!.parent!;
  armature.updateWorldMatrix(true, true);
  const point = (bone: THREE.Bone) => armature.worldToLocal(bone.getWorldPosition(new THREE.Vector3()));
  const wrist = bones.get('wrist')!;
  const palm = new THREE.Bone(); palm.name = 'palm';
  palm.position.copy(point(wrist)).lerp(point(bones.get(FINGER_CHAINS.middle[0])!), 0.6);
  armature.add(palm); wrist.attach(palm);
  const added = [palm];
  const folds: { bone: THREE.Bone; joint: THREE.Bone; rest: THREE.Quaternion; index: number; at: THREE.Vector3 }[] = [];
  for (const [finger, names] of Object.entries(FINGER_CHAINS)) {
    const chain = names.map(name => bones.get(name)!);
    let parent = palm;
    if (finger !== 'thumb') {
      const metacarpal = bones.get(`${finger}-finger-metacarpal`)!;
      parent.attach(metacarpal); parent = metacarpal;
    }
    for (const joint of chain) { parent.attach(joint); parent = joint; }
    // Knuckle and middle-joint folds retain volume by sharing the rotation on either side
    // of a hinge. These are weighted bones, not cosmetic joints added to a debug skeleton.
    for (const [i, label] of ['knuckle', 'middle'].entries()) {
      const joint = chain[i], bone = new THREE.Bone();
      bone.name = `${finger}-${label}-fold`;
      bone.position.copy(joint.position); bone.quaternion.copy(joint.quaternion);
      joint.parent!.add(bone);
      folds.push({ bone, joint, rest: joint.quaternion.clone(), index: original.indexOf(joint), at: point(joint) });
      added.push(bone);
    }
  }
  armature.updateWorldMatrix(true, true);
  const indices = mesh.geometry.getAttribute('skinIndex'), weights = mesh.geometry.getAttribute('skinWeight');
  const positions = mesh.geometry.getAttribute('position'), vertex = new THREE.Vector3();
  const palmAt = point(palm);
  for (let i = 0; i < positions.count; i++) {
    vertex.fromBufferAttribute(positions, i);
    const influence = new Map<number, number>();
    for (let j = 0; j < 4; j++) {
      const index = indices.getComponent(i, j), weight = weights.getComponent(i, j);
      if (weight > 0) influence.set(index, (influence.get(index) ?? 0) + weight);
    }
    for (const fold of folds) {
      const weight = influence.get(fold.index) ?? 0;
      const share = weight * 0.65 * Math.exp(-vertex.distanceToSquared(fold.at) / 0.00010);
      if (share < 0.001) continue;
      influence.set(fold.index, weight - share);
      influence.set(original.length + added.indexOf(fold.bone), share);
    }
    const wristIndex = original.indexOf(wrist), wristWeight = influence.get(wristIndex) ?? 0;
    const palmWeight = wristWeight * 0.7 * Math.exp(-vertex.distanceToSquared(palmAt) / 0.0012);
    influence.set(wristIndex, wristWeight - palmWeight);
    influence.set(original.length, palmWeight);
    const strongest = [...influence].sort((a, b) => b[1] - a[1]).slice(0, 4);
    const sum = strongest.reduce((total, [, weight]) => total + weight, 0);
    for (let j = 0; j < 4; j++) {
      indices.setComponent(i, j, strongest[j]?.[0] ?? 0);
      weights.setComponent(i, j, (strongest[j]?.[1] ?? 0) / sum);
    }
  }
  indices.needsUpdate = weights.needsUpdate = true;
  const previous = mesh.skeleton;
  mesh.skeleton = new THREE.Skeleton([...original, ...added], [
    ...previous.boneInverses.map(matrix => matrix.clone()), ...added.map(bone => bone.matrixWorld.clone().invert()),
  ]);
  previous.dispose();
  bones.set('palm', palm);
  // Model-space turns converted to each joint's parent space. Children now follow naturally.
  const rotate = (bone: THREE.Bone, turn: THREE.Quaternion) => {
    const parentRotation = bone.parent!.getWorldQuaternion(new THREE.Quaternion());
    const modelRotation = armature.getWorldQuaternion(new THREE.Quaternion());
    const frame = parentRotation.invert().multiply(modelRotation);
    bone.quaternion.premultiply(frame.clone().multiply(turn).multiply(frame.invert()));
    bone.updateWorldMatrix(false, true);
  };
  const updateFolds = () => {
    for (const fold of folds) {
      fold.bone.position.copy(fold.joint.position);
      fold.bone.quaternion.copy(fold.rest).slerp(fold.joint.quaternion, 0.5);
    }
  };
  return { bones, wrist, palm, armature, point, rotate, updateFolds };
}
