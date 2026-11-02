import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// The hand model has a bone in every finger joint. Each bone is posed once when the model
// loads, so the hand is holding the grip from then on. See ASSET_LICENSES.md for its source.
const MODEL_URL = '/models/right-hand.glb';
const SKIN_COLOR = 0x9a6f55;

// Everything below is in the grip's own space: +x right, +y up along the grip, +z back.
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).normalize();

// Which way the hand faces. Fingers point forward and a little out, with the thumb side up.
const HAND_FORWARD = v(0.3, 0.3, -1);
const HAND_THUMB_SIDE = v(0, 1, 0);
// Where the middle finger's knuckle sits against the grip.
const MIDDLE_KNUCKLE = new THREE.Vector3(0.037, -0.023, -0.02);

// The direction of each finger bone in turn, from the knuckle out to the tip.
const WRAP_GRIP = [v(-0.9, 0, -0.3), v(-0.7, 0, 0.7), v(0.1, 0, 1)];
const POSE: Record<string, THREE.Vector3[]> = {
  index: [v(-0.55, -0.05, -0.85), v(-0.8, 0, 0.5), v(-0.1, 0, 1)],
  middle: WRAP_GRIP,
  ring: WRAP_GRIP,
  pinky: WRAP_GRIP,
  thumb: [v(-0.7, 0.75, -0.4), v(-0.2, 0.3, -1), v(0.12, 0.05, -1)],
};

const CHAINS: Record<string, string[]> = {
  index: ['index-finger-phalanx-proximal', 'index-finger-phalanx-intermediate', 'index-finger-phalanx-distal', 'index-finger-tip'],
  middle: ['middle-finger-phalanx-proximal', 'middle-finger-phalanx-intermediate', 'middle-finger-phalanx-distal', 'middle-finger-tip'],
  ring: ['ring-finger-phalanx-proximal', 'ring-finger-phalanx-intermediate', 'ring-finger-phalanx-distal', 'ring-finger-tip'],
  pinky: ['pinky-finger-phalanx-proximal', 'pinky-finger-phalanx-intermediate', 'pinky-finger-phalanx-distal', 'pinky-finger-tip'],
  thumb: ['thumb-metacarpal', 'thumb-phalanx-proximal', 'thumb-phalanx-distal', 'thumb-tip'],
};

// The model's bones are not nested, so bending a joint has to carry the later joints with it.
function aimChain(chain: THREE.Bone[], directions: THREE.Vector3[]): void {
  directions.forEach((direction, i) => {
    const pivot = chain[i].position.clone();
    const current = chain[i + 1].position.clone().sub(pivot).normalize();
    const turn = new THREE.Quaternion().setFromUnitVectors(current, direction);
    for (let j = i; j < chain.length; j++) {
      chain[j].position.sub(pivot).applyQuaternion(turn).add(pivot);
      chain[j].quaternion.premultiply(turn);
    }
  });
}

// Adds the hand to the grip as soon as the model has loaded.
export function loadHand(grip: THREE.Object3D): void {
  new GLTFLoader().load(MODEL_URL, (gltf) => {
    let mesh: THREE.SkinnedMesh | undefined;
    gltf.scene.traverse((object) => {
      if (object instanceof THREE.SkinnedMesh) mesh = object;
    });
    if (!mesh) return;

    mesh.frustumCulled = false;
    mesh.material = new THREE.MeshStandardMaterial({ color: SKIN_COLOR, roughness: 0.62 });

    const bones = new Map(mesh.skeleton.bones.map((bone) => [bone.name, bone]));
    const position = (name: string) => bones.get(name)!.position.clone();

    // Build the hand's own axes from its joints, then turn them onto the grip's axes.
    const knuckle = position('middle-finger-phalanx-proximal');
    const forward = knuckle.clone().sub(position('wrist')).normalize();
    const across = position('index-finger-phalanx-proximal').sub(position('pinky-finger-phalanx-proximal'));
    const back = forward.clone().cross(across).normalize();
    const thumbSide = back.clone().cross(forward).normalize();

    const targetBack = HAND_FORWARD.clone().cross(HAND_THUMB_SIDE).normalize();
    const targetThumbSide = targetBack.clone().cross(HAND_FORWARD).normalize();
    const from = new THREE.Matrix4().makeBasis(forward, thumbSide, back);
    const to = new THREE.Matrix4().makeBasis(HAND_FORWARD, targetThumbSide, targetBack);
    const facing = new THREE.Quaternion().setFromRotationMatrix(to.multiply(from.invert()));

    gltf.scene.quaternion.copy(facing);
    gltf.scene.position.copy(MIDDLE_KNUCKLE).sub(knuckle.applyQuaternion(facing));

    const toHandSpace = facing.clone().invert();
    for (const [finger, directions] of Object.entries(POSE)) {
      aimChain(
        CHAINS[finger].map((name) => bones.get(name)!),
        directions.map((direction) => direction.clone().applyQuaternion(toHandSpace)),
      );
    }

    grip.add(gltf.scene);
  });
}
