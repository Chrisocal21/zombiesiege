import { gloveTexture } from './gearTextures';
import { appearance, selectedGloves } from '../client/appearance';
import * as THREE from 'three';
import type { HandSocket } from './handSockets';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { articulateHand, refineHandSurface, FINGER_CHAINS as CHAINS } from './handRig';

// The source tracking joints are upgraded to a connected 36-bone deformation rig on load.
// See handRig.ts for palm articulation and the weighted knuckle/middle-joint fold bones.


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
  cup: number;
  opposeThumb?: boolean;
}

// A hold: this grip, on this attach point.
export interface Hold { grip: Grip; socket: HandSocket }

// The trigger hand on a gun: three fingers round the grip, the index along the frame and in
// through the guard, and the thumb high on the far side.
export const GUN_GRIP: Grip = {
  wrap: ['middle', 'ring', 'pinky'],
  cup: 0.10,
  pose: {
    index: [[1, 0.05, 0.3], [0.55, 0, 0.85], [0.1, 0, 1]],
    thumb: [[0.6, 0.6, 0.55], [0.85, 0.3, 0.45], [0.95, 0.15, 0.3]],
  },
};

// The support hand on a pistol: every finger round the trigger hand's fingers, the thumb
// forward along the frame under the firing thumb.
export const SUPPORT_GRIP: Grip = {
  wrap: ['index', 'middle', 'ring', 'pinky'],
  cup: 0.06,
  pose: { thumb: [[0.7, 0.6, 0.4], [0.98, 0.1, 0.12], [1, 0, 0.05]] },
};

// Cupped under a fore-end: the fingers up the far side, the thumb forward along the near side.
export const FOREND_GRIP: Grip = {
  wrap: ['index', 'middle', 'ring', 'pinky'],
  cup: 0.08,
  pose: { thumb: [[0.5, 0.75, 0.45], [0.3, 0.95, 0.1], [0.2, 1, 0]] },
};

// A fist round a handle, the thumb closing round it the other way.
export const FIST_GRIP: Grip = {
  wrap: ['index', 'middle', 'ring', 'pinky'],
  cup: 0.17,
  opposeThumb: true,
  pose: { thumb: [[0.52, 0.28, 0.8], [0.48, -0.72, 0.5], [0.15, -0.9, 0.4]] },
};

export const SHOTGUN_GRIP: Grip = {
  ...GUN_GRIP, cup: 0.08,
  pose: {
    index: [[0.9, 0.32, 0.27], [0.65, 0.12, 0.75], [0.15, 0, 1]],
    thumb: [[0.4, 0.65, 0.65], [0.8, 0.2, 0.55], [0.8, -0.15, 0.58]],
  },
};
export const BAT_GRIP: Grip = { ...FIST_GRIP, cup: 0.22 };

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

// How far the index finger's two outer joints bend at a full trigger pull, in radians.
const PULL_MIDDLE_JOINT = 0.2;
const PULL_END_JOINT = 0.35;
// Contact near the distal palm crease, this far from the wrist toward the middle knuckle.
const PALM_CENTRE = 0.78;
// How wide a patch of skin round the palm's middle sets where the palm surface is. Any wider
// and it catches the ball of the thumb.
const PALM_PATCH = 0.006;
// Half a finger's thickness: a wrapped finger's joints stay this far out from the handle.
const FINGER_RADII: Record<Finger, number> = { index: 0.007, middle: 0.0075, ring: 0.007, pinky: 0.006, thumb: 0.008 };
type Rig = ReturnType<typeof articulateHand>;

export interface Hand {
  // Equips once the model is ready. The weapon becomes a child of the palm's socket.
  holdWeapon(weapon: THREE.Object3D, hold: Hold): boolean;
  // Bends the index finger back: 0 is resting on the trigger, 1 is fully pulled.
  pullIndex(amount: number): void;
  // Poses the hand part way from one pose to another. Holds follow their attach point, so this
  // is called every frame.
  blendPose(from: HandPose, to: HandPose, amount: number): void;
  // Wrist in the local space of the parent passed to loadHand.
  getWrist(out: THREE.Vector3): boolean;
}

function aimChain(chain: THREE.Bone[], directions: THREE.Vector3[], rig: Rig): void {
  directions.forEach((direction, i) => {
    const current = rig.point(chain[i + 1]).sub(rig.point(chain[i])).normalize();
    rig.rotate(chain[i], new THREE.Quaternion().setFromUnitVectors(current, direction));
  });
}

// Two-link reach plus a pad direction: keeps the index inside the trigger guard and lets
// the opposed thumb rest on the closed fingers. Segment lengths never change.
function touchChain(chain: THREE.Bone[], target: THREE.Vector3, padDirection: THREE.Vector3,
  bendDirection: THREE.Vector3, rig: Rig): void {
  const start = rig.point(chain[0]);
  const lengths = chain.slice(1).map((bone, i) => rig.point(bone).distanceTo(rig.point(chain[i])));
  const distal = target.clone().addScaledVector(padDirection, -lengths[2]);
  const reach = distal.sub(start), direction = reach.clone().normalize();
  const distance = THREE.MathUtils.clamp(reach.length(), Math.abs(lengths[0] - lengths[1]) + 0.0001, lengths[0] + lengths[1] - 0.0001);
  const along = (lengths[0] ** 2 - lengths[1] ** 2 + distance ** 2) / (2 * distance);
  const height = Math.sqrt(Math.max(0, lengths[0] ** 2 - along ** 2));
  const bend = bendDirection.clone().addScaledVector(direction, -bendDirection.dot(direction)).normalize();
  const middle = start.clone().addScaledVector(direction, along).addScaledVector(bend, height);
  const end = start.clone().addScaledVector(direction, distance);
  aimChain(chain, [middle.clone().sub(start).normalize(), end.sub(middle).normalize(), padDirection], rig);
}

// Solve successive fixed-length phalanges against an oval handle cross-section. The pad
// clearance is different for each finger; the grip's depth follows its actual geometry.
function wrapChain(chain: THREE.Bone[], centre: THREE.Vector3, axis: THREE.Vector3, forward: THREE.Vector3,
  palmNormal: THREE.Vector3, radius: number, depth: number, rig: Rig): void {
  for (let i = 0; i < chain.length - 1; i++) {
    const from = rig.point(chain[i]);
    const length = rig.point(chain[i + 1]).distanceTo(from);
    const offset = from.clone().sub(centre);
    const along = offset.dot(axis);
    const current = rig.point(chain[i + 1]).sub(from).normalize();
    const start = Math.atan2(offset.dot(palmNormal) / radius, offset.dot(forward) / depth);
    const target = new THREE.Vector3();
    const at = (angle: number) => target.copy(centre).addScaledVector(axis, along)
      .addScaledVector(forward, depth * Math.cos(angle)).addScaledVector(palmNormal, radius * Math.sin(angle));
    let lo = start, hi = start;
    if (at(start).distanceToSquared(from) < length * length) {
      for (let step = 1; step <= 48; step++) {
        hi = start + Math.PI * step / 48;
        if (at(hi).distanceToSquared(from) >= length * length) break;
        lo = hi;
      }
      for (let step = 0; step < 20; step++) {
        const mid = (lo + hi) / 2;
        if (at(mid).distanceToSquared(from) < length * length) lo = mid; else hi = mid;
      }
    }
    at((lo + hi) / 2);
    const rotation = new THREE.Quaternion().setFromUnitVectors(current, target.sub(from).normalize());
    // Keep the distal joints from folding back on themselves on a thin handle.
    const limit = i === 0 ? 1.65 : i === 1 ? 1.92 : 1.4;
    const angle = rotation.angleTo(new THREE.Quaternion());
    if (angle > limit) rotation.slerp(new THREE.Quaternion(), 1 - limit / angle);
    rig.rotate(chain[i], rotation);
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
  const hand: Hand = { holdWeapon: () => false, pullIndex: () => {}, blendPose: () => {}, getWrist: () => false };

  new GLTFLoader().load(url, (gltf) => {
    gltf.scene.name = url === RIGHT_HAND_MODEL ? 'Primary hand mesh' : 'Support hand mesh';
    let mesh: THREE.SkinnedMesh | undefined;
    gltf.scene.traverse((object) => {
      if (object instanceof THREE.SkinnedMesh) mesh = object;
    });
    if (!mesh) return;
    const sourceGeometry = mesh.geometry;
    mesh.geometry = refineHandSurface(sourceGeometry);
    sourceGeometry.dispose();

    mesh.frustumCulled = false;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const leather = gloveTexture().clone(); leather.repeat.set(3, 3);
    const gloveMaterial = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.82,
      map: leather, bumpMap: leather, bumpScale: 0.00014, vertexColors: true, clearcoat: 0.02, clearcoatRoughness: 0.95 });
    mesh.material = gloveMaterial;
    const cuffMaterial = gloveMaterial.clone(); cuffMaterial.vertexColors = false;

    const bones = new Map(mesh.skeleton.bones.map((bone) => [bone.name, bone]));
    const position = (name: string) => bones.get(name)!.position.clone();

    // Build the hand's own axes from its joints, then turn them onto the target axes.
    const knuckle = position('middle-finger-phalanx-proximal');
    const forward = knuckle.clone().sub(position('wrist')).normalize();
    const across = position('index-finger-phalanx-proximal').sub(position('pinky-finger-phalanx-proximal'));
    const side = forward.clone().cross(across).normalize();
    const thumbSide = side.clone().cross(forward).normalize();
    const palmNormal = url === RIGHT_HAND_MODEL ? side.clone().negate() : side.clone();

    // Reinforcement and stitched seams are vertex panels on the skinned surface, so
    // every pad follows the finger rig through support grips, magazines and slide racks.
    const vertexPositions = mesh.geometry.attributes.position;
    const panelWeights = new Float32Array(vertexPositions.count);
    const seams = new Float32Array(vertexPositions.count);
    const wristOrigin = position('wrist');
    const knuckles = (['index', 'middle', 'ring', 'pinky'] as Finger[]).map(finger => position(CHAINS[finger][0]));
    const fingerJoints = Object.values(CHAINS).flatMap(chain => chain.slice(1, 3).map(name => position(name)));
    const point = new THREE.Vector3();
    for (let i = 0; i < vertexPositions.count; i++) {
      point.fromBufferAttribute(vertexPositions, i);
      const fromWrist = point.clone().sub(wristOrigin);
      const along = fromWrist.dot(forward), depth = -fromWrist.dot(palmNormal);
      // The source includes a long, irregular wrist tail. Keep a short overlap inside
      // the cuff so it cannot protrude through the shirt when a weapon changes the grip.
      if (along < 0) {
        point.addScaledVector(forward, -along * 0.96);
        vertexPositions.setXYZ(i, point.x, point.y, point.z);
      }
      let weight = 0;
      for (const center of knuckles) weight = Math.max(weight, Math.exp(-point.distanceToSquared(center) / 0.00012));
      for (const center of fingerJoints) weight = Math.max(weight, Math.exp(-point.distanceToSquared(center) / 0.000035) * 0.7);
      // Dark palm grip, lighter dorsal reinforcement, narrow stitched boundary.
      panelWeights[i] = depth > 0 ? THREE.MathUtils.smoothstep(weight, 0.2, 0.65) : weight * 0.2;
      seams[i] = depth > 0 && Math.abs(weight - 0.35) < 0.025 ? 0.8 : Math.abs(along - 0.022) < 0.0007 ? 0.55 : 0;
    }
    vertexPositions.needsUpdate = true;
    const colorArray = new Float32Array(vertexPositions.count * 3);
    mesh.geometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
    let currentGloves = '';
    const syncGloves = () => {
      if (currentGloves === appearance.gloves) return;
      currentGloves = appearance.gloves;
      const gloves = selectedGloves(), base = new THREE.Color(gloves.color), accent = new THREE.Color(gloves.accent);
      cuffMaterial.color.copy(base);
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

    const rig = articulateHand(mesh);
    const boneList = mesh.skeleton.bones;
    const bind = boneList.map(bone => ({ position: bone.position.clone(), quaternion: bone.quaternion.clone() }));
    const weaponSocket = new THREE.Object3D();
    weaponSocket.name = url === RIGHT_HAND_MODEL ? 'Right hand weapon socket' : 'Left hand weapon socket';
    weaponSocket.position.copy(palmAnchor);
    weaponSocket.quaternion.copy(toSocket).invert();
    rig.armature.add(weaponSocket);
    rig.palm.attach(weaponSocket);
    // The short glove gauntlet follows the wrist, so the hand's open cut stays covered
    // even when the forearm and palm have different orientations during a reload.
    const cuff = new THREE.Mesh(new THREE.LatheGeometry([
      new THREE.Vector2(0.020, -0.012), new THREE.Vector2(0.022, -0.008),
      new THREE.Vector2(0.020, 0), new THREE.Vector2(0.014, 0.010),
    ], 28), cuffMaterial);
    cuff.name = 'Articulated glove cuff';
    cuff.position.copy(wristOrigin);
    cuff.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), forward);
    cuff.castShadow = cuff.receiveShadow = true;
    rig.armature.add(cuff);
    rig.wrist.attach(cuff);

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
      const pull = THREE.MathUtils.clamp(amount, 0, 1);
      rig.rotate(index[1], turn.setFromAxisAngle(axis, pull * PULL_MIDDLE_JOINT));
      rig.rotate(index[2], turn.setFromAxisAngle(axis, pull * PULL_END_JOINT));
      rig.updateFolds();
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
        aimChain(CHAINS[finger as Finger].map(name => bones.get(name)!), directions.map(direction => direction.clone().applyQuaternion(inverse)), rig);
      }
      const value = {
        position: target.middleKnuckle.clone().sub(rig.point(bones.get('middle-finger-phalanx-proximal')!).applyQuaternion(rotation)),
        quaternion: rotation,
        joints: joints(),
        // The hand-made poses curl the trigger finger round their parent's up axis.
        curl: new THREE.Vector3(0, 1, 0).applyQuaternion(inverse),
      };
      solvedSpecs.set(target, value); return value;
    };

    // Holds are worked out once per grip and weapon contact profile.
    const solvedHolds = new Map<Grip, Map<HandSocket, SolvedPose>>();
    const solveHold = (grip: Grip, socket: HandSocket): SolvedPose => {
      const bySocket = solvedHolds.get(grip) ?? new Map<HandSocket, SolvedPose>();
      solvedHolds.set(grip, bySocket);
      const cached = bySocket.get(socket);
      if (cached) return cached;
      const { radius, depth } = socket.userData;
      resetBones();
      for (const [finger, amount] of [['ring', 0.5], ['pinky', 1]] as const) {
        rig.rotate(bones.get(`${finger}-finger-metacarpal`)!, new THREE.Quaternion().setFromAxisAngle(curlAxis, grip.cup * amount));
      }
      // The handle lies along the knuckles, its centre a radius in from the palm's skin.
      const centre = palmAnchor.clone().addScaledVector(palmNormal, radius);
      for (const finger of Object.keys(CHAINS) as Finger[]) {
        const chain = CHAINS[finger].map(name => bones.get(name)!);
        if (grip.wrap.includes(finger)) wrapChain(chain, centre, thumbSide, forward, palmNormal,
          radius + FINGER_RADII[finger], depth + FINGER_RADII[finger], rig);
        else if (grip.pose[finger]) aimChain(chain, grip.pose[finger]!.map(inHand), rig);
      }
      if (socket.userData.trigger) {
        const target = new THREE.Vector3(...socket.userData.trigger).applyQuaternion(toSocket.clone().invert()).add(palmAnchor);
        touchChain(index, target, palmNormal, palmNormal.clone().negate(), rig);
      }
      if (grip.opposeThumb) {
        const target = rig.point(bones.get(CHAINS.index[1])!).lerp(rig.point(bones.get(CHAINS.middle[1])!), 0.35)
          .addScaledVector(palmNormal, 0.008);
        touchChain(CHAINS.thumb.map(name => bones.get(name)!), target, thumbSide.clone().negate(), forward, rig);
      }
      const value = {
        position: palmAnchor.clone().applyQuaternion(toSocket).negate(),
        quaternion: toSocket.clone(),
        joints: joints(),
        curl: curlAxis.clone(),
      };
      bySocket.set(socket, value); return value;
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
      const solved = solveHold(pose.grip, pose.socket);
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
      rig.updateFolds();
      // Trigger pulls start from the active weapon's index pose after a grip change.
      index.forEach((bone, i) => {
        rest[i].position.copy(bone.position);
        rest[i].quaternion.copy(bone.quaternion);
      });
      axis.copy(t < 0.5 ? a.curl : b.curl);
    };
    let equipped: THREE.Object3D | undefined;
    const unequippedTransforms = new Map<THREE.Object3D, THREE.Matrix4>();
    hand.holdWeapon = (weapon, hold) => {
      if (equipped === weapon) return true;
      if (!unequippedTransforms.has(weapon)) {
        const local = currentWorld(parent, new THREE.Matrix4()).invert().multiply(currentWorld(weapon, new THREE.Matrix4()));
        unequippedTransforms.set(weapon, local);
      }
      // Restore its authored placement when putting a weapon away. A wrist animation must
      // not accumulate into the next equip's offset. Detach before solving the next grip.
      if (equipped) {
        parent.add(equipped);
        unequippedTransforms.get(equipped)!.decompose(equipped.position, equipped.quaternion, equipped.scale);
      }
      hand.blendPose(hold, hold, 0);
      weaponSocket.attach(weapon);
      equipped = weapon;
      return true;
    };
    hand.getWrist = out => {
      out.copy(rig.point(bones.get('wrist')!)).applyQuaternion(gltf.scene.quaternion).add(gltf.scene.position);
      return true;
    };
  });

  return hand;
}
