import { gloveTexture } from './gearTextures';
import { appearance, selectedGloves } from '../client/appearance';
import * as THREE from 'three';
import type { HandSocket } from './handSockets';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// The hand models have a bone in every finger joint. Each bone is posed once when the model
// loads. See ASSET_LICENSES.md for their source.


// Two ways to pose a hand. A hold puts the palm on one of a weapon's attach points (see
// handSockets.ts) and closes fingers round its handle. A hand-made pose places the hand and
// aims every finger bone directly, for moments that are not a grip on a handle: reloads.

export const RIGHT_HAND_MODEL = '/models/right-hand.glb';
export const LEFT_HAND_MODEL = '/models/left-hand.glb';

export type Finger = 'index' | 'middle' | 'ring' | 'pinky' | 'thumb';
type Vec = [number, number, number];

// How a hand holds a handle. Fingers in `wrap` close round it, however thick it is. The others
// take the bone directions in `pose`, knuckle out to tip, in the hand's own frame: x the way the
// fingers point, y toward the thumb, z out of the palm. A finger in neither stays straight.
export interface Grip {
  wrap: Finger[];
  pose: Partial<Record<Finger, Vec[]>>;
}

// A hold: this grip, on this attach point.
export interface Hold { grip: Grip; socket: HandSocket }

// The trigger hand on a gun: three fingers round the grip, the index along the frame and in
// through the guard, and the thumb high on the far side.
export const GUN_GRIP: Grip = {
  wrap: ['middle', 'ring', 'pinky'],
  pose: {
    index: [[1, 0.05, 0.3], [0.55, 0, 0.85], [0.1, 0, 1]],
    thumb: [[0.6, 0.6, 0.55], [0.85, 0.3, 0.45], [0.95, 0.15, 0.3]],
  },
};

// The support hand on a pistol: every finger round the trigger hand's fingers, the thumb
// forward along the frame under the firing thumb.
export const SUPPORT_GRIP: Grip = {
  wrap: ['index', 'middle', 'ring', 'pinky'],
  pose: { thumb: [[0.7, 0.6, 0.4], [0.9, 0.4, 0.2], [0.95, 0.3, 0.1]] },
};

// Cupped under a fore-end: the fingers up the far side, the thumb forward along the near side.
export const FOREND_GRIP: Grip = {
  wrap: ['index', 'middle', 'ring', 'pinky'],
  pose: { thumb: [[0.5, 0.75, 0.45], [0.3, 0.95, 0.1], [0.2, 1, 0]] },
};

// A fist round a handle, the thumb closing round it the other way.
export const FIST_GRIP: Grip = {
  wrap: ['index', 'middle', 'ring', 'pinky', 'thumb'],
  pose: {},
};

// A hand-made pose, in its parent's space: +x right, +y up, +z back.
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).normalize();

export interface HandSpec {
  // Which way the fingers point, and which side the thumb is on.
  forward: THREE.Vector3;
  thumbSide: THREE.Vector3;
  // Where the middle finger's knuckle sits.
  middleKnuckle: THREE.Vector3;
  // The direction of each finger bone in turn, from the knuckle out to the tip.
  pose: Record<string, THREE.Vector3[]>;
}

export type HandPose = Hold | HandSpec;

// Pinch the brass ends of the fresh shells at the exposed breech. The hand follows
// the barrel hinge and the shells' insertion travel during the break-action reload.
export const LEFT_HAND_LOADING_SHOTGUN: HandSpec = {
  forward: v(0.8, 0.6, -0.05),
  thumbSide: v(0, 0, -1),
  middleKnuckle: new THREE.Vector3(-0.025, 0.065, -0.025),
  pose: {
    index: [v(0.95, -0.1, -0.3), v(0.2, -1, 0), v(-0.7, -0.3, 0)],
    middle: [v(0.95, -0.2, -0.1), v(0.1, -1, 0), v(-0.8, -0.3, 0)],
    ring: [v(0.85, -0.4, 0.1), v(-0.3, -0.9, 0), v(-0.8, 0.1, 0)],
    pinky: [v(0.8, -0.5, 0.2), v(-0.4, -0.9, 0), v(-0.8, 0.2, 0)],
    thumb: [v(0.3, 0.6, -0.7), v(0.65, -0.65, -0.3), v(0.2, -0.9, 0)],
  },
};

// An overhand rack. The palm crosses the top/rear of the slide rather than passing
// through the receiver. This is used only after inserting an empty-gun reload.
export const LEFT_HAND_ON_SLIDE: HandSpec = {
  forward: v(0.93, 0.02, -0.36),
  thumbSide: v(0, 0, 1),
  middleKnuckle: new THREE.Vector3(-0.026, 0.083, -0.008),
  pose: {
    index: [v(0.95, -0.08, 0), v(0.26, -0.96, 0), v(-0.8, -0.3, 0)],
    middle: [v(0.96, -0.08, 0), v(0.25, -0.96, 0), v(-0.8, -0.3, 0)],
    ring: [v(0.95, -0.12, 0), v(0.25, -0.96, 0), v(-0.8, -0.3, 0)],
    pinky: [v(0.92, -0.2, 0), v(0.25, -0.96, 0), v(-0.8, -0.3, 0)],
    thumb: [v(0.7, -0.4, 0.5), v(0.4, -0.8, 0.2), v(0.1, -1, 0)],
  },
};

// The left hand holds a fresh magazine by its base: palm on the left side and under the
// baseplate, index finger up the front, the other fingers wrapped round, thumb up the back.
export const LEFT_HAND_ON_MAGAZINE: HandSpec = {
  forward: v(0.05, 1, -0.1),
  thumbSide: v(0, 0, 1),
  middleKnuckle: new THREE.Vector3(-0.03, -0.038, -0.014),
  pose: {
    index: [v(0.35, 0.8, -0.5), v(0.15, 1, -0.05), v(0.05, 1, 0.1)],
    middle: [v(0.5, 0.2, -0.8), v(0.95, 0, -0.1), v(0.6, -0.1, 0.8)],
    ring: [v(0.5, 0.1, -0.8), v(0.95, -0.05, -0.1), v(0.6, -0.1, 0.8)],
    pinky: [v(0.5, 0, -0.8), v(0.95, -0.1, -0.1), v(0.6, -0.1, 0.8)],
    thumb: [v(0.2, 0.7, 0.7), v(0.35, 1, 0.05), v(0.15, 1, -0.1)],
  },
};

const CHAINS: Record<string, string[]> = {
  index: ['index-finger-phalanx-proximal', 'index-finger-phalanx-intermediate', 'index-finger-phalanx-distal', 'index-finger-tip'],
  middle: ['middle-finger-phalanx-proximal', 'middle-finger-phalanx-intermediate', 'middle-finger-phalanx-distal', 'middle-finger-tip'],
  ring: ['ring-finger-phalanx-proximal', 'ring-finger-phalanx-intermediate', 'ring-finger-phalanx-distal', 'ring-finger-tip'],
  pinky: ['pinky-finger-phalanx-proximal', 'pinky-finger-phalanx-intermediate', 'pinky-finger-phalanx-distal', 'pinky-finger-tip'],
  thumb: ['thumb-metacarpal', 'thumb-phalanx-proximal', 'thumb-phalanx-distal', 'thumb-tip'],
};

// How far the index finger's two outer joints bend at a full trigger pull, in radians.
const PULL_MIDDLE_JOINT = 0.2;
const PULL_END_JOINT = 0.35;
// The palm's middle, this far from the wrist toward the middle knuckle.
const PALM_CENTRE = 0.6;
// How wide a patch of skin round the palm's middle sets where the palm surface is. Any wider
// and it catches the ball of the thumb.
const PALM_PATCH = 0.006;
// Half a finger's thickness: a wrapped finger's joints stay this far out from the handle.
const FINGER_RADIUS = 0.0085;

export interface Hand {
  // Bends the index finger back: 0 is resting on the trigger, 1 is fully pulled.
  pullIndex(amount: number): void;
  // Poses the hand part way from one pose to another. Holds follow their attach point, so this
  // is called every frame.
  blendPose(from: HandPose, to: HandPose, amount: number): void;
  // Wrist in the local space of the parent passed to loadHand.
  getWrist(out: THREE.Vector3): boolean;
}

// Rotates the joints of a chain from `first` onward around that first joint.
function bendFrom(chain: THREE.Bone[], first: number, turn: THREE.Quaternion): void {
  const pivot = chain[first].position.clone();
  for (let j = first; j < chain.length; j++) {
    chain[j].position.sub(pivot).applyQuaternion(turn).add(pivot);
    chain[j].quaternion.premultiply(turn);
  }
}

// The model's bones are not nested, so bending a joint has to carry the later joints with it.
function aimChain(chain: THREE.Bone[], directions: THREE.Vector3[]): void {
  directions.forEach((direction, i) => {
    const current = chain[i + 1].position.clone().sub(chain[i].position).normalize();
    bendFrom(chain, i, new THREE.Quaternion().setFromUnitVectors(current, direction));
  });
}

// Closes a finger round a handle. Each bone turns so the next joint lands on a circle round the
// handle's axis, carrying on round the way the finger already points.
function wrapChain(chain: THREE.Bone[], centre: THREE.Vector3, axis: THREE.Vector3, radius: number): void {
  let sense = 0;
  for (let i = 0; i < chain.length - 1; i++) {
    const from = chain[i].position.clone();
    const length = chain[i + 1].position.distanceTo(from);
    const offset = from.clone().sub(centre);
    const along = offset.dot(axis);
    const radial = offset.addScaledVector(axis, -along);
    const distance = radial.length();
    if (distance < 1e-6) return;
    const out = radial.divideScalar(distance);
    const around = axis.clone().cross(out);
    const current = chain[i + 1].position.clone().sub(from).normalize();
    if (i === 0) sense = Math.sign(current.dot(around)) || 1;
    // The angle round the axis from this joint to where the next one meets the circle. A joint
    // too far out to reach just points straight at the handle.
    const cos = THREE.MathUtils.clamp((radius * radius + distance * distance - length * length) / (2 * radius * distance), -1, 1);
    const turn = Math.acos(cos);
    const target = centre.clone().addScaledVector(axis, along)
      .addScaledVector(out, radius * Math.cos(turn))
      .addScaledVector(around, sense * radius * Math.sin(turn));
    bendFrom(chain, i, new THREE.Quaternion().setFromUnitVectors(current, target.sub(from).normalize()));
  }
}

// An object's world matrix from its local transforms as they are now, even mid-frame.
function currentWorld(object: THREE.Object3D, out: THREE.Matrix4): THREE.Matrix4 {
  out.identity();
  for (let node: THREE.Object3D | null = object; node; node = node.parent) {
    node.updateMatrix();
    out.premultiply(node.matrix);
  }
  return out;
}

// Adds a hand to the parent as soon as its model has loaded.
export function loadHand(parent: THREE.Object3D, url: string): Hand {
  const hand: Hand = { pullIndex: () => {}, blendPose: () => {}, getWrist: () => false };

  new GLTFLoader().load(url, (gltf) => {
    gltf.scene.name = url === RIGHT_HAND_MODEL ? 'Primary hand mesh' : 'Support hand mesh';
    let mesh: THREE.SkinnedMesh | undefined;
    gltf.scene.traverse((object) => {
      if (object instanceof THREE.SkinnedMesh) mesh = object;
    });
    if (!mesh) return;

    mesh.frustumCulled = false;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const leather = gloveTexture();
    const gloveMaterial = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.87,
      map: leather, bumpMap: leather, bumpScale: 0.00032, vertexColors: true, clearcoat: 0.02, clearcoatRoughness: 0.95 });
    mesh.material = gloveMaterial;

    const bones = new Map(mesh.skeleton.bones.map((bone) => [bone.name, bone]));
    const boneList = mesh.skeleton.bones;
    const bind = boneList.map(bone => ({ position: bone.position.clone(), quaternion: bone.quaternion.clone() }));
    const position = (name: string) => bones.get(name)!.position.clone();

    // Build the hand's own axes from its joints, then turn them onto the target axes.
    const knuckle = position('middle-finger-phalanx-proximal');
    const forward = knuckle.clone().sub(position('wrist')).normalize();
    const across = position('index-finger-phalanx-proximal').sub(position('pinky-finger-phalanx-proximal'));
    const side = forward.clone().cross(across).normalize();
    const thumbSide = side.clone().cross(forward).normalize();

    // Reinforcement and stitched seams are vertex panels on the skinned surface, so
    // every pad follows the finger rig through support grips, magazines and slide racks.
    const vertexPositions = mesh.geometry.attributes.position;
    const panelWeights = new Float32Array(vertexPositions.count);
    const seams = new Float32Array(vertexPositions.count);
    const wristOrigin = position('wrist');
    const knuckles = ['index', 'middle', 'ring', 'pinky'].map(finger => position(CHAINS[finger][0]));
    const fingerJoints = Object.values(CHAINS).flatMap(chain => chain.slice(1, 3).map(name => position(name)));
    const point = new THREE.Vector3();
    for (let i = 0; i < vertexPositions.count; i++) {
      point.fromBufferAttribute(vertexPositions, i);
      const fromWrist = point.clone().sub(wristOrigin);
      const along = fromWrist.dot(forward), depth = fromWrist.dot(side);
      // The source includes a long, irregular wrist tail. Keep a short overlap inside
      // the cuff so it cannot protrude through the shirt when a weapon changes the grip.
      if (along < 0) {
        point.addScaledVector(forward, -along * 0.8);
        vertexPositions.setXYZ(i, point.x, point.y, point.z);
      }
      let weight = 0;
      for (const center of knuckles) weight = Math.max(weight, Math.exp(-point.distanceToSquared(center) / 0.00012));
      for (const center of fingerJoints) weight = Math.max(weight, Math.exp(-point.distanceToSquared(center) / 0.000035) * 0.7);
      // Dark palm grip, lighter dorsal reinforcement, narrow stitched boundary.
      panelWeights[i] = depth > 0 ? weight : weight * 0.38;
      seams[i] = Math.abs(along - 0.022) < 0.0014 ? 0.55 : 0;
    }
    vertexPositions.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
    const colorArray = new Float32Array(vertexPositions.count * 3);
    mesh.geometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
    let currentGloves = '';
    const syncGloves = () => {
      if (currentGloves === appearance.gloves) return;
      currentGloves = appearance.gloves;
      const gloves = selectedGloves(), base = new THREE.Color(gloves.color), accent = new THREE.Color(gloves.accent);
      const darkGrip = base.clone().multiplyScalar(0.75), color = new THREE.Color();
      for (let i = 0; i < vertexPositions.count; i++) {
        color.copy(darkGrip).lerp(base, 0.7).lerp(accent, panelWeights[i] * 0.78 + seams[i] * 0.35);
        colorArray[i * 3] = color.r; colorArray[i * 3 + 1] = color.g; colorArray[i * 3 + 2] = color.b;
      }
      mesh!.geometry.attributes.color.needsUpdate = true;
    };
    syncGloves();
    mesh.onBeforeRender = syncGloves;

    // The palm: its middle, and the skin over it, from the joints and the mesh. The models are
    // mirror images, so the palm is on the opposite side of the hand's axes in each.
    const palmNormal = url === RIGHT_HAND_MODEL ? side.clone().negate() : side.clone();
    const palmCentre = position('wrist').lerp(knuckle, PALM_CENTRE);
    let palmDepth = 0;
    for (let i = 0; i < vertexPositions.count; i++) {
      point.fromBufferAttribute(vertexPositions, i).sub(palmCentre);
      const out = point.dot(palmNormal);
      if (out > palmDepth && point.addScaledVector(palmNormal, -out).length() < PALM_PATCH) palmDepth = out;
    }
    const palmAnchor = palmCentre.clone().addScaledVector(palmNormal, palmDepth);
    const inHand = ([x, y, z]: Vec) => forward.clone().multiplyScalar(x)
      .addScaledVector(thumbSide, y).addScaledVector(palmNormal, z).normalize();
    // Turns the hand's own axes onto an attach point's: fingers to x, thumb to y.
    const toSocket = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(forward, thumbSide, side).invert());
    // A trigger pull curls the index toward the palm.
    const curlAxis = forward.clone().cross(palmNormal).normalize();

    // Remember the resting index finger, so each pull starts again from there.
    const index = CHAINS.index.map((name) => bones.get(name)!);
    const rest = index.map((bone) => ({ position: bone.position.clone(), quaternion: bone.quaternion.clone() }));
    const axis = curlAxis.clone();
    const turn = new THREE.Quaternion();

    hand.pullIndex = (amount) => {
      index.forEach((bone, i) => {
        bone.position.copy(rest[i].position);
        bone.quaternion.copy(rest[i].quaternion);
      });
      bendFrom(index, 1, turn.setFromAxisAngle(axis, amount * PULL_MIDDLE_JOINT));
      bendFrom(index, 2, turn.setFromAxisAngle(axis, amount * PULL_END_JOINT));
    };

    parent.add(gltf.scene);

    // A pose worked out once: the fingers, and where the hand sits. For a hold that is in the
    // attach point's frame; for a hand-made pose, in the parent's.
    interface SolvedPose {
      position: THREE.Vector3;
      quaternion: THREE.Quaternion;
      joints: { position: THREE.Vector3; quaternion: THREE.Quaternion }[];
      curl: THREE.Vector3;
    }
    const resetBones = () => boneList.forEach((bone, i) => { bone.position.copy(bind[i].position); bone.quaternion.copy(bind[i].quaternion); });
    const joints = () => boneList.map(bone => ({ position: bone.position.clone(), quaternion: bone.quaternion.clone() }));

    const solvedSpecs = new Map<HandSpec, SolvedPose>();
    const solveSpec = (target: HandSpec): SolvedPose => {
      const cached = solvedSpecs.get(target);
      if (cached) return cached;
      resetBones();
      const targetSide = target.forward.clone().cross(target.thumbSide).normalize();
      const targetUp = targetSide.clone().cross(target.forward).normalize();
      const basis = new THREE.Matrix4().makeBasis(target.forward, targetUp, targetSide);
      const source = new THREE.Matrix4().makeBasis(forward, thumbSide, side);
      const rotation = new THREE.Quaternion().setFromRotationMatrix(basis.multiply(source.invert()));
      const inverse = rotation.clone().invert();
      for (const [finger, directions] of Object.entries(target.pose)) {
        aimChain(CHAINS[finger].map(name => bones.get(name)!), directions.map(direction => direction.clone().applyQuaternion(inverse)));
      }
      const value = {
        position: target.middleKnuckle.clone().sub(position('middle-finger-phalanx-proximal').applyQuaternion(rotation)),
        quaternion: rotation,
        joints: joints(),
        // The hand-made poses curl the trigger finger round their parent's up axis.
        curl: new THREE.Vector3(0, 1, 0).applyQuaternion(inverse),
      };
      solvedSpecs.set(target, value); return value;
    };

    // Holds are worked out once per grip and handle thickness.
    const solvedHolds = new Map<Grip, Map<number, SolvedPose>>();
    const solveHold = (grip: Grip, radius: number): SolvedPose => {
      const byRadius = solvedHolds.get(grip) ?? new Map<number, SolvedPose>();
      solvedHolds.set(grip, byRadius);
      const cached = byRadius.get(radius);
      if (cached) return cached;
      resetBones();
      // The handle lies along the knuckles, its centre a radius in from the palm's skin.
      const centre = palmAnchor.clone().addScaledVector(palmNormal, radius);
      for (const finger of Object.keys(CHAINS) as Finger[]) {
        const chain = CHAINS[finger].map(name => bones.get(name)!);
        if (grip.wrap.includes(finger)) wrapChain(chain, centre, thumbSide, radius + FINGER_RADIUS);
        else if (grip.pose[finger]) aimChain(chain, grip.pose[finger]!.map(inHand));
      }
      const value = {
        position: palmAnchor.clone().applyQuaternion(toSocket).negate(),
        quaternion: toSocket.clone(),
        joints: joints(),
        curl: curlAxis.clone(),
      };
      byRadius.set(radius, value); return value;
    };

    const parentWorld = new THREE.Matrix4();
    const socketWorld = new THREE.Matrix4();
    const placed = new THREE.Matrix4();
    const ignoredScale = new THREE.Vector3();
    const one = new THREE.Vector3(1, 1, 1);
    // Where a pose puts the hand in its parent's space, right now.
    const place = (pose: HandPose, at: THREE.Vector3, facing: THREE.Quaternion): SolvedPose => {
      if (!('socket' in pose)) {
        const solved = solveSpec(pose);
        at.copy(solved.position);
        facing.copy(solved.quaternion);
        return solved;
      }
      const solved = solveHold(pose.grip, pose.socket.userData.radius);
      currentWorld(parent, parentWorld).invert();
      currentWorld(pose.socket, socketWorld);
      placed.compose(solved.position, solved.quaternion, one).premultiply(socketWorld).premultiply(parentWorld);
      placed.decompose(at, facing, ignoredScale);
      return solved;
    };
    const fromPosition = new THREE.Vector3(), toPosition = new THREE.Vector3();
    const fromQuaternion = new THREE.Quaternion(), toQuaternion = new THREE.Quaternion();

    hand.blendPose = (fromPose, toPose, amount) => {
      const a = place(fromPose, fromPosition, fromQuaternion);
      const b = place(toPose, toPosition, toQuaternion);
      const t = THREE.MathUtils.clamp(amount, 0, 1);
      gltf.scene.position.copy(fromPosition).lerp(toPosition, t);
      gltf.scene.quaternion.copy(fromQuaternion).slerp(toQuaternion, t);
      boneList.forEach((bone, i) => {
        bone.position.copy(a.joints[i].position).lerp(b.joints[i].position, t);
        bone.quaternion.copy(a.joints[i].quaternion).slerp(b.joints[i].quaternion, t);
      });
      // Trigger pulls start from the active weapon's index pose after a grip change.
      index.forEach((bone, i) => {
        rest[i].position.copy(bone.position);
        rest[i].quaternion.copy(bone.quaternion);
      });
      axis.copy(t < 0.5 ? a.curl : b.curl);
    };
    hand.getWrist = out => {
      out.copy(bones.get('wrist')!.position).applyQuaternion(gltf.scene.quaternion).add(gltf.scene.position);
      return true;
    };
  });

  return hand;
}
