import { gloveTexture } from './gearTextures';
import { appearance, selectedGloves } from '../client/appearance';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// The hand models have a bone in every finger joint. Each bone is posed once when the model
// loads. See ASSET_LICENSES.md for their source.


// Everything below is in the grip's own space: +x right, +y up along the grip, +z back.
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).normalize();

export interface HandSpec {
  url: string;
  // Which way the fingers point, and which side the thumb is on.
  forward: THREE.Vector3;
  thumbSide: THREE.Vector3;
  // Where the middle finger's knuckle sits.
  middleKnuckle: THREE.Vector3;
  // The direction of each finger bone in turn, from the knuckle out to the tip.
  pose: Record<string, THREE.Vector3[]>;
}

// Keep the palm upright behind the backstrap, with the wrist below the grip. The index
// reaches forward through the guard before curling onto the trigger; the thumb rides
// above the support thumb along the left side of the frame.
export const RIGHT_HAND_ON_GRIP: HandSpec = {
  url: '/models/right-hand.glb',
  forward: v(0.08, 0.65, -0.76),
  thumbSide: v(0, 1, 0),
  middleKnuckle: new THREE.Vector3(0.026, -0.02, -0.022),
  pose: {
    index: [v(0.08, -0.06, -1), v(-1, -0.06, 0.05), v(-0.5, 0.05, 0.86)],
    middle: [v(-0.9, 0, -0.3), v(-0.7, 0, 0.7), v(0.1, 0, 1)],
    ring: [v(-0.9, 0.13, -0.3), v(-0.7, 0.1, 0.7), v(0.1, 0.05, 1)],
    pinky: [v(-0.9, 0.28, -0.3), v(-0.7, 0.2, 0.7), v(0.1, 0.1, 1)],
    thumb: [v(-0.6, 0.75, -0.27), v(0, 0.35, -0.94), v(0, 0.1, -1)],
  },
};

// The support palm meets the firing hand rather than flaring out to the side. Its fingers
// close around the firing fingers, with the thumb forward and outside the firing thumb.
export const LEFT_HAND_SUPPORT: HandSpec = {
  url: '/models/left-hand.glb',
  forward: v(0.18, 0.5, -0.85),
  thumbSide: v(0, 1, 0),
  middleKnuckle: new THREE.Vector3(-0.028, -0.035, -0.037),
  pose: {
    index: [v(0.9, -0.03, -0.32), v(0.6, 0.02, 0.8), v(-0.25, 0.03, 1)],
    middle: [v(0.92, 0, -0.25), v(0.5, 0.04, 0.88), v(-0.3, 0.03, 0.95)],
    ring: [v(0.92, 0.12, -0.25), v(0.5, 0.1, 0.88), v(-0.3, 0.05, 0.95)],
    pinky: [v(0.9, 0.22, -0.22), v(0.5, 0.14, 0.88), v(-0.3, 0.08, 0.95)],
    thumb: [v(-0.32, 0.82, -0.47), v(-0.1, 0.15, -1), v(0.05, 0, -1)],
  },
};

// The firing palm sits farther back around the shotgun's swept wooden stock.
export const RIGHT_HAND_ON_SHOTGUN: HandSpec = {
  ...RIGHT_HAND_ON_GRIP,
  forward: v(-0.55, 0.45, -0.70),
  thumbSide: v(0.15, 0.65, -0.75),
  middleKnuckle: new THREE.Vector3(0.026, -0.012, 0.069),
  pose: {
    ...RIGHT_HAND_ON_GRIP.pose,
    index: [v(-0.28, -0.3, -1), v(-1, -0.02, -0.35), v(-0.7, 0.1, -0.7)],
    middle: [v(-0.9, 0, -0.3), v(-0.05, 0.96, 0.25), v(0.05, 0.95, 0.3)],
    ring: [v(-0.65, 0.5, -0.2), v(0.03, 0.95, 0.3), v(0.8, 0.1, 0.6)],
    pinky: [v(-0.6, 0.65, -0.25), v(0, 0.95, 0.3), v(0.65, 0.2, 0.7)],
    thumb: [v(-0.7, 0.7, -0.14), v(-0.9, 0.35, -0.2), v(-0.8, -0.1, -0.6)],
  },
};

export const RIGHT_HAND_ON_TOOL: HandSpec = {
  ...RIGHT_HAND_ON_GRIP,
  middleKnuckle: new THREE.Vector3(.024,-.025,-.016),
  pose: {
    index: [v(-.9,0,-.15),v(.1,0,1),v(.8,0,.6)],
    middle: [v(-.9,0,-.15),v(.1,0,1),v(.8,0,.6)],
    ring: [v(-.9,.12,-.15),v(.1,.05,1),v(.8,.03,.6)],
    pinky: [v(-.9,.22,-.12),v(.1,.1,1),v(.8,.05,.6)],
    thumb: RIGHT_HAND_ON_GRIP.pose.thumb,
  },
};

export const LEFT_HAND_ON_BAT: HandSpec = {
  ...LEFT_HAND_SUPPORT,
  forward: v(.12,.6,-.79),
  middleKnuckle: new THREE.Vector3(-.024,-.110,-.018),
  pose: {
    index: [v(.9,0,-.15),v(-.1,0,1),v(-.8,0,.6)],
    middle: [v(.9,0,-.15),v(-.1,0,1),v(-.8,0,.6)],
    ring: [v(.9,.12,-.15),v(-.1,.05,1),v(-.8,.03,.6)],
    pinky: [v(.9,.22,-.12),v(-.1,.1,1),v(-.8,.05,.6)],
    thumb: LEFT_HAND_SUPPORT.pose.thumb,
  },
};

// A cupped support palm under the shotgun's wood fore-end. The knuckles run along
// the barrels, with the fingers wrapping up the far side instead of stacking on the grip.
export const LEFT_HAND_ON_FOREND: HandSpec = {
  url: '/models/left-hand.glb',
  forward: v(0.65, 0.45, -0.61),
  thumbSide: v(0, 0, -1),
  middleKnuckle: new THREE.Vector3(0.006, 0.027, -0.165),
  pose: {
    index: [v(0.7, 0.68, 0.15), v(-0.8, 0.49, 0.11), v(-0.8, -0.49, -0.11)],
    middle: [v(0.7, 0.68, 0.15), v(-0.8, 0.49, 0.11), v(-0.8, -0.49, -0.11)],
    ring: [v(0.72, 0.66, 0.18), v(-0.8, 0.49, 0.15), v(-0.8, -0.49, -0.08)],
    pinky: [v(0.74, 0.64, 0.23), v(-0.8, 0.49, 0.18), v(-0.8, -0.49, -0.05)],
    thumb: [v(-0.2, 0.7, -0.68), v(0.1, 0.25, -1), v(0.1, 0, -1)],
  },
};

// Pinch the brass ends of the fresh shells at the exposed breech. The hand follows
// the barrel hinge and the shells' insertion travel during the break-action reload.
export const LEFT_HAND_LOADING_SHOTGUN: HandSpec = {
  url: '/models/left-hand.glb',
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
  url: '/models/left-hand.glb',
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
  url: '/models/left-hand.glb',
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

export interface Hand {
  // Bends the index finger back: 0 is resting on the trigger, 1 is fully pulled.
  pullIndex(amount: number): void;
  blendPose(from: HandSpec, to: HandSpec, amount: number): void;
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

// Adds a hand to the parent as soon as its model has loaded.
export function loadHand(parent: THREE.Object3D, spec: HandSpec): Hand {
  const hand: Hand = { pullIndex: () => {}, blendPose: () => {}, getWrist: () => false };

  new GLTFLoader().load(spec.url, (gltf) => {
    gltf.scene.name = spec.url.includes('right-hand') ? 'Primary hand mesh' : 'Support hand mesh';
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

    const targetSide = spec.forward.clone().cross(spec.thumbSide).normalize();
    const targetThumbSide = targetSide.clone().cross(spec.forward).normalize();
    const from = new THREE.Matrix4().makeBasis(forward, thumbSide, side);
    const to = new THREE.Matrix4().makeBasis(spec.forward, targetThumbSide, targetSide);
    const facing = new THREE.Quaternion().setFromRotationMatrix(to.multiply(from.invert()));

    gltf.scene.quaternion.copy(facing);
    gltf.scene.position.copy(spec.middleKnuckle).sub(knuckle.applyQuaternion(facing));

    const toHandSpace = facing.clone().invert();
    for (const [finger, directions] of Object.entries(spec.pose)) {
      aimChain(
        CHAINS[finger].map((name) => bones.get(name)!),
        directions.map((direction) => direction.clone().applyQuaternion(toHandSpace)),
      );
    }

    // Remember the resting index finger, so each pull starts again from there.
    const index = CHAINS.index.map((name) => bones.get(name)!);
    const rest = index.map((bone) => ({ position: bone.position.clone(), quaternion: bone.quaternion.clone() }));
    const axis = new THREE.Vector3(0, 1, 0).applyQuaternion(toHandSpace);
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

    interface SolvedPose {
      position: THREE.Vector3;
      quaternion: THREE.Quaternion;
      joints: { position: THREE.Vector3; quaternion: THREE.Quaternion }[];
    }
    const solved = new Map<HandSpec, SolvedPose>();
    const solve = (target: HandSpec): SolvedPose => {
      const cached = solved.get(target);
      if (cached) return cached;
      boneList.forEach((bone, i) => { bone.position.copy(bind[i].position); bone.quaternion.copy(bind[i].quaternion); });
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
        joints: boneList.map(bone => ({ position: bone.position.clone(), quaternion: bone.quaternion.clone() })),
      };
      solved.set(target, value); return value;
    };
    hand.blendPose = (fromSpec, toSpec, amount) => {
      const a = solve(fromSpec), b = solve(toSpec), t = THREE.MathUtils.clamp(amount, 0, 1);
      gltf.scene.position.copy(a.position).lerp(b.position, t);
      gltf.scene.quaternion.copy(a.quaternion).slerp(b.quaternion, t);
      boneList.forEach((bone, i) => {
        bone.position.copy(a.joints[i].position).lerp(b.joints[i].position, t);
        bone.quaternion.copy(a.joints[i].quaternion).slerp(b.joints[i].quaternion, t);
      });
      // Trigger pulls start from the active weapon's index pose after a grip change.
      index.forEach((bone, i) => {
        rest[i].position.copy(bone.position);
        rest[i].quaternion.copy(bone.quaternion);
      });
      axis.set(0, 1, 0).applyQuaternion(gltf.scene.quaternion.clone().invert());
    };
    hand.getWrist = out => {
      out.copy(bones.get('wrist')!.position).applyQuaternion(gltf.scene.quaternion).add(gltf.scene.position);
      return true;
    };
  });

  return hand;
}
