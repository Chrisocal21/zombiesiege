import * as THREE from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { loadModel } from './models';

// Skinned characters, posed by joint angles rather than animation files: the zombies, with the
// same angles that animate the drawn zombies, and the other players in co-op. Each model has a
// Mixamo skeleton in a T pose, built facing +z. The joints are a bare tree of
// groups laid out like the drawn zombie's (hips, chest, head, arms, legs), facing -z, with the
// arms hanging at rest. Every frame each bone takes the orientation of its joint, measured from
// that rest, and the bones in between (neck, shoulders, toes) follow their parents.

export const ZOMBIE_MODELS = ['/models/characters/zombie-a.glb', '/models/characters/zombie-b.glb'];
export const SURVIVOR_MODEL = '/models/characters/survivor.glb';

export interface Joints {
  hips: THREE.Object3D;
  torso: THREE.Object3D;
  head: THREE.Object3D;
  arms: THREE.Object3D[];
  elbows: THREE.Object3D[];
  wrists: THREE.Object3D[];
  legs: THREE.Object3D[];
  knees: THREE.Object3D[];
  ankles: THREE.Object3D[];
}

export interface RiggedBody {
  // Add this to the zombie's group. It turns the model round to face -z like the joints.
  readonly object: THREE.Object3D;
  pose(joints: Joints): void;
}

// The joints' hip height standing, where the hips bone sits in its bind pose.
const HIPS_HEIGHT = 0.94;
// How far down the T pose's arms hang at rest, short of straight down so they clear the body.
const ARM_DROP = Math.PI / 2 * 0.9;

const TURN = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
const TURN_BACK = TURN.clone().invert();

// "mixamorig_LeftArm_2" and "mixamorig:LeftArm" are both "LeftArm".
const boneName = (name: string) => name.replace(/^mixamorig[:_]?/, '').replace(/_\d+$/, '');

type Pick = (joints: Joints) => THREE.Object3D;
const MAPPED: Record<string, Pick> = {
  Hips: (j) => j.hips, Spine1: (j) => j.torso, Head: (j) => j.head,
  LeftArm: (j) => j.arms[0], LeftForeArm: (j) => j.elbows[0], LeftHand: (j) => j.wrists[0],
  RightArm: (j) => j.arms[1], RightForeArm: (j) => j.elbows[1], RightHand: (j) => j.wrists[1],
  LeftUpLeg: (j) => j.legs[0], LeftLeg: (j) => j.knees[0], LeftFoot: (j) => j.ankles[0],
  RightUpLeg: (j) => j.legs[1], RightLeg: (j) => j.knees[1], RightFoot: (j) => j.ankles[1],
};
const LEFT_ARM = new Set(['LeftArm', 'LeftForeArm', 'LeftHand']);
const RIGHT_ARM = new Set(['RightArm', 'RightForeArm', 'RightHand']);

interface BoneInfo {
  bone: THREE.Bone;
  parent: number;
  bindLocal: THREE.Quaternion;
  bindPosition: THREE.Vector3;
  // Orientation in the model's space at rest, with the arms hanging.
  rest: THREE.Quaternion;
  pick?: Pick;
}

let templates: THREE.Object3D[] | null = null;
const loading = Promise.all(ZOMBIE_MODELS.map(loadModel)).then((models) => {
  templates = models.map((model) => model.scene);
  return templates;
});

// Calls back once the models have loaded. Until then there is nothing to rig.
export function whenZombieModelsLoad(callback: () => void): void {
  void loading.then(callback);
}

export function zombieModelsReady(): boolean {
  return templates !== null;
}

// A tree of joints laid out like the drawn zombie's, standing, to pose with rotations. It is
// never drawn; a rigged body copies it.
export function createJoints(): Joints {
  const joint = (parent: THREE.Object3D, x: number, y: number, z: number) => {
    const node = new THREE.Group(); node.position.set(x, y, z); parent.add(node); return node;
  };
  const frame = new THREE.Group();
  const hips = joint(frame, 0, HIPS_HEIGHT, 0), torso = joint(hips, 0, 0, 0), head = joint(torso, 0, 0.56, 0);
  const joints: Joints = { hips, torso, head, arms: [], elbows: [], wrists: [], legs: [], knees: [], ankles: [] };
  for (const side of [-1, 1]) {
    const arm = joint(torso, side * 0.2, 0.46, 0), elbow = joint(arm, 0, -0.3, 0);
    joints.arms.push(arm); joints.elbows.push(elbow); joints.wrists.push(joint(elbow, 0, -0.27, 0));
    const leg = joint(hips, side * 0.09, 0, 0), knee = joint(leg, 0, -0.42, 0);
    joints.legs.push(leg); joints.knees.push(knee); joints.ankles.push(joint(knee, 0, -0.4, 0));
  }
  return joints;
}

// One of the zombie models, by variant. Only once they have loaded.
export function riggedBody(variant: number): RiggedBody {
  return rig(templates![variant % templates!.length]);
}

// Any loaded character model, ready to pose.
export function rig(template: THREE.Object3D): RiggedBody {
  // Measured in the model's own space, so before it is put in its turned holder.
  const model = clone(template);
  model.updateMatrixWorld(true);
  model.traverse((child) => {
    if (child instanceof THREE.SkinnedMesh) {
      child.frustumCulled = false;
      child.castShadow = child.receiveShadow = true;
    }
  });

  const bones: BoneInfo[] = [];
  const index = new Map<THREE.Bone, number>();
  const world = new THREE.Quaternion();
  const drop = (side: number) => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), side * ARM_DROP);
  model.traverse((child) => {
    if (!(child instanceof THREE.Bone)) return;
    const name = boneName(child.name);
    child.getWorldQuaternion(world);
    const rest = world.clone();
    if (LEFT_ARM.has(name)) rest.premultiply(drop(-1));
    if (RIGHT_ARM.has(name)) rest.premultiply(drop(1));
    index.set(child, bones.length);
    bones.push({
      bone: child, parent: child.parent instanceof THREE.Bone ? index.get(child.parent)! : -1,
      bindLocal: child.quaternion.clone(), bindPosition: child.position.clone(), rest, pick: MAPPED[name],
    });
  });
  const hips = bones.find((info) => boneName(info.bone.name) === 'Hips');
  // The hips' parent, a node above the skeleton, never moves: its orientation, and how a lift
  // of the hips in the model's space reads in that node's own units.
  const top = hips?.bone.parent ?? model;
  const topWorld = top.getWorldQuaternion(new THREE.Quaternion());
  const topInverse = new THREE.Matrix3().setFromMatrix4(top.matrixWorld).invert();
  const object = new THREE.Group();
  object.rotation.y = Math.PI;
  object.add(model);

  const orientation = bones.map(() => new THREE.Quaternion());
  const joint = new THREE.Quaternion();
  const inverse = new THREE.Quaternion();
  const lift = new THREE.Vector3();
  return {
    object,
    pose(joints) {
      joints.hips.parent?.updateMatrixWorld(true);
      const root = joints.hips.parent;
      const rootInverse = root ? root.getWorldQuaternion(new THREE.Quaternion()).invert() : null;
      bones.forEach((info, i) => {
        const parent = info.parent >= 0 ? orientation[info.parent] : topWorld;
        if (info.pick) {
          // The joint's turn from rest, in the joints' own space, carried into the model's.
          info.pick(joints).getWorldQuaternion(joint);
          if (rootInverse) joint.premultiply(rootInverse);
          joint.premultiply(TURN).multiply(TURN_BACK);
          orientation[i].copy(joint).multiply(info.rest);
          info.bone.quaternion.copy(inverse.copy(parent).invert()).multiply(orientation[i]);
        } else {
          info.bone.quaternion.copy(info.bindLocal);
          orientation[i].copy(parent).multiply(info.bindLocal);
        }
      });
      if (hips) {
        lift.set(0, joints.hips.position.y - HIPS_HEIGHT, 0).applyMatrix3(topInverse);
        hips.bone.position.copy(hips.bindPosition).add(lift);
      }
    },
  };
}
