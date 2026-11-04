import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export const GLOCK_MODEL = '/models/glock17.glb';

// The pack's eye, in its own space: it looks down +z with +y up. Our view space looks down -z.
const PACK_EYE = new THREE.Vector3(0.013, 1.53, -0.11);
// Where the grip sits in our view space at rest. The arms turn about it for recoil and sway.
export const GLOCK_PIVOT = new THREE.Vector3(0.061, -0.063, -0.301);
// The pack laid its clips end to end on one timeline. Each one starts where the last ends.
const CLIPS = ['Fire', 'Reload', 'ReloadEmpty', 'Draw', 'Holster'] as const;
type ClipName = (typeof CLIPS)[number];

export interface GlockState {
  // Seconds since the last shot, or null when no shot is playing.
  sinceShot: number | null;
  // 0 to 1 through a reload, or null when not reloading.
  reload: number | null;
  reloadEmpty: boolean;
  // Seconds since the gun was drawn, or null once the draw has finished.
  sinceDraw: number | null;
  // The slide locks back on an empty magazine.
  empty: boolean;
}

export interface Glock {
  // The arms and gun, turning about the grip. Placed at GLOCK_PIVOT, the pack's eye sits at
  // the parent's origin.
  readonly root: THREE.Group;
  readonly muzzle: THREE.Object3D;
  readonly ejection: THREE.Object3D;
  ready(): boolean;
  // Where the sights' top edge sits in view space at rest, so aiming can line it up.
  sightTop(out: THREE.Vector3): THREE.Vector3;
  pose(state: GlockState): void;
  // The same arms on another weapon: the Glock is put away and each palm goes to an attach point
  // (render/handSockets), with the Glock grip's finger curl. No point for a hand puts that arm away.
  holdOther(right: THREE.Object3D | null, left: THREE.Object3D | null): void;
}

type Side = 'right' | 'left';
// How far the palm's skin sits off the line of the hand's bones.
const PALM_SKIN = 0.014;

// Where an arm's mesh ends at the elbow, in the forearm's frame, and how thick it is there.
interface Elbow { local: THREE.Vector3; radius: number }

interface PackHand {
  forearm: THREE.Bone;
  // The upper arm bone, which turns with the forearm so the mesh moves as one piece.
  upper: THREE.Object3D;
  upperRest: { position: THREE.Vector3; quaternion: THREE.Quaternion; scale: THREE.Vector3 };
  elbow: Elbow;
  // The upper arm and elbow joint that carry the arm on from the cut end, out of the bottom of the view.
  extension: { tube: THREE.Mesh; joint: THREE.Mesh };
  // The forearm, from the palm's frame, at rest.
  fromPalm: THREE.Matrix4;
  rest: { position: THREE.Vector3; quaternion: THREE.Quaternion; scale: THREE.Vector3 };
}

// Finds where an arm's mesh ends at the elbow, in the forearm bone's own frame: among the vertices
// weighted mostly to this side's bones, the ring furthest from the hand along the forearm. Read
// from the bind pose, so it holds however the arm is posed.
function findElbow(scene: THREE.Object3D, prefix: string, wristBone: THREE.Object3D, forearm: THREE.Bone): Elbow | null {
  const meshes: THREE.SkinnedMesh[] = [];
  scene.traverse((object) => { if (object instanceof THREE.SkinnedMesh) meshes.push(object); });
  // From the hand back toward the elbow, in the forearm's frame.
  const hand = wristBone.position.clone();
  const direction = hand.clone().negate().normalize();
  const points: THREE.Vector3[] = [];
  const reach: number[] = [];
  for (const mesh of meshes) {
    const bones = mesh.skeleton.bones;
    const ours = new Set<number>();
    bones.forEach((bone, index) => { if (bone.name.startsWith(prefix)) ours.add(index); });
    const at = bones.indexOf(forearm);
    if (at < 0) continue;
    // Bind pose to the forearm's frame.
    const toBone = mesh.skeleton.boneInverses[at].clone().multiply(mesh.bindMatrix);
    const indices = mesh.geometry.attributes.skinIndex, weights = mesh.geometry.attributes.skinWeight, position = mesh.geometry.attributes.position;
    for (let i = 0; i < indices.count; i++) {
      let weight = 0;
      for (let j = 0; j < 4; j++) if (ours.has(indices.getComponent(i, j))) weight += weights.getComponent(i, j);
      if (weight < 0.5) continue;
      const point = new THREE.Vector3().fromBufferAttribute(position, i).applyMatrix4(toBone);
      points.push(point);
      reach.push(point.clone().sub(hand).dot(direction));
    }
  }
  if (!points.length) return null;
  const furthest = Math.max(...reach);
  const ring = points.filter((_, i) => reach[i] > furthest - 1.5);
  const centre = ring.reduce((sum, p) => sum.add(p), new THREE.Vector3()).divideScalar(ring.length);
  const around = ring.reduce((sum, p) => {
    const off = p.clone().sub(centre);
    return sum + off.addScaledVector(direction, -off.dot(direction)).length();
  }, 0) / ring.length;
  // The bone's frame is in centimetres: its world scale turns that into metres.
  const radius = around * forearm.getWorldScale(new THREE.Vector3()).x;
  return { local: centre, radius };
}

// The arm texture's average colour, for the parts that carry the arm on.
function averageSkin(scene: THREE.Object3D): THREE.Color | null {
  let color: THREE.Color | null = null;
  scene.traverse((object) => {
    if (color || !(object instanceof THREE.SkinnedMesh)) return;
    const material = Array.isArray(object.material) ? object.material[0] : object.material;
    const image = (material as THREE.MeshStandardMaterial).map?.image as CanvasImageSource | undefined;
    if (!image) return;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 16;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return;
    context.drawImage(image, 0, 0, 16, 16);
    const data = context.getImageData(0, 0, 16, 16).data;
    let r = 0, g = 0, b = 0;
    for (let i = 0; i < data.length; i += 4) { r += data[i]; g += data[i + 1]; b += data[i + 2]; }
    const n = data.length / 4 * 255;
    color = new THREE.Color().setRGB(r / n, g / n, b / n, THREE.SRGBColorSpace);
  });
  return color;
}

// The Glock 17 pack: both arms, the gun, and its fire, reload and draw animations.
export function loadGlock(parent: THREE.Object3D): Glock {
  const root = new THREE.Group();
  root.name = 'Glock 17 arms';
  root.visible = false;
  parent.add(root);
  // Turning half way round maps the pack's +z forward onto our -z.
  const frame = new THREE.Group();
  frame.rotation.y = Math.PI;
  frame.position.copy(PACK_EYE).negate().applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI).sub(GLOCK_PIVOT);
  root.position.copy(GLOCK_PIVOT);
  root.add(frame);
  const muzzle = new THREE.Object3D(); muzzle.name = 'Glock muzzle';
  const ejection = new THREE.Object3D(); ejection.name = 'Glock ejection port';
  const sight = new THREE.Vector3();
  let mixer: THREE.AnimationMixer | null = null;
  const actions = new Map<ClipName, THREE.AnimationAction>();
  const hands: Partial<Record<Side, PackHand>> = {};
  const gun: THREE.Object3D[] = [];
  let loaded = false;

  // The skin the arm extensions are made of, matched to the arm's own texture once it has loaded.
  const skin = new THREE.MeshStandardMaterial({ color: '#d9ad99', roughness: 0.75 });

  new GLTFLoader().load(GLOCK_MODEL, (gltf) => {
    frame.add(gltf.scene);
    skin.color.copy(averageSkin(gltf.scene) ?? skin.color).multiplyScalar(0.92);
    gltf.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
        // The skinned arms move well outside their bind-pose bounds.
        object.frustumCulled = false;
        if (!(object instanceof THREE.SkinnedMesh)) gun.push(object);
      }
    });
    mixer = new THREE.AnimationMixer(gltf.scene);
    for (const name of CLIPS) {
      const clip = gltf.animations.find((animation) => animation.name === name);
      if (!clip) continue;
      const start = Math.min(...clip.tracks.map((track) => track.times[0]));
      for (const track of clip.tracks) track.shift(-start);
      clip.resetDuration();
      const action = mixer.clipAction(clip);
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
      action.play();
      action.weight = 0;
      actions.set(name, action);
    }
    // Pose at rest once so the muzzle, port and sights can be read off the model.
    pose({ sinceShot: null, reload: null, reloadEmpty: false, sinceDraw: null, empty: false });
    root.updateWorldMatrix(true, true);
    for (const side of ['right', 'left'] as Side[]) {
      const prefix = side === 'right' ? 'Right' : 'Left';
      const find = (part: string) => {
        let found: THREE.Object3D | undefined;
        gltf.scene.traverse((object) => { if (!found && new RegExp(`^${prefix}${part}(_\\d+)?$`).test(object.name)) found = object; });
        return found;
      };
      const forearm = find('ForeArm'), wrist = find('Hand'), knuckle = find('HandMiddle1'), index = find('HandIndex1'), pinky = find('HandPinky1');
      if (!(forearm instanceof THREE.Bone) || !wrist || !knuckle || !index || !pinky) continue;
      const at = (object: THREE.Object3D) => object.getWorldPosition(new THREE.Vector3());
      // The same frame as an attach point: x along the fingers, y toward the thumb, the origin
      // on the palm's skin.
      const x = at(knuckle).sub(at(wrist)).normalize();
      const across = at(index).sub(at(pinky));
      const y = across.addScaledVector(x, -across.dot(x)).normalize();
      const z = x.clone().cross(y);
      const origin = at(wrist).lerp(at(knuckle), 0.6).addScaledVector(z, side === 'right' ? -PALM_SKIN : PALM_SKIN);
      const palm = new THREE.Matrix4().makeBasis(x, y, z).setPosition(origin);
      const upper = forearm.parent;
      if (!upper) continue;
      const elbow = findElbow(gltf.scene, prefix, wrist, forearm);
      if (!elbow) continue;
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 24, 1, true), skin);
      const joint = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), skin);
      tube.castShadow = joint.castShadow = true;
      tube.frustumCulled = joint.frustumCulled = false;
      tube.visible = joint.visible = false;
      root.add(tube, joint);
      hands[side] = {
        forearm, fromPalm: palm.invert().multiply(forearm.matrixWorld),
        rest: { position: forearm.position.clone(), quaternion: forearm.quaternion.clone(), scale: forearm.scale.clone() },
        upper, upperRest: { position: upper.position.clone(), quaternion: upper.quaternion.clone(), scale: upper.scale.clone() },
        elbow, extension: { tube, joint },
      };
    }
    const slideMesh = gltf.scene.getObjectByName('Slide_Glock_D_0') as THREE.Mesh | undefined;
    if (slideMesh) {
      slideMesh.geometry.computeBoundingBox();
      const box = slideMesh.geometry.boundingBox!.clone().applyMatrix4(slideMesh.matrixWorld);
      // Kept on the unscaled root, not the slide (in centimetres), so the flash keeps its size.
      const inRoot = (x: number, y: number, z: number) => root.worldToLocal(new THREE.Vector3(x, y, z));
      const centreX = (box.min.x + box.max.x) / 2;
      // The bore runs a little under the slide's top, out of its front face.
      root.add(muzzle, ejection);
      muzzle.position.copy(inRoot(centreX, box.max.y - (box.max.y - box.min.y) * 0.35, box.min.z));
      ejection.position.copy(inRoot(box.max.x, box.max.y, (box.min.z + box.max.z) / 2));
      root.worldToLocal(sight.set(centreX, box.max.y, (box.min.z + box.max.z) / 2)).add(GLOCK_PIVOT);
    }
    loaded = true;
  });

  // Plays one clip at a time over the rest pose, which is the fire clip's first frame.
  function pose(state: GlockState) {
    if (!mixer) return;
    let name: ClipName = 'Fire';
    let time = 0;
    const duration = (clip: ClipName) => actions.get(clip)?.getClip().duration ?? 0;
    if (state.reload !== null) {
      name = state.reloadEmpty ? 'ReloadEmpty' : 'Reload';
      time = state.reload * duration(name);
    } else if (state.sinceDraw !== null && state.sinceDraw < duration('Draw')) {
      name = 'Draw';
      time = state.sinceDraw;
    } else if (state.empty) {
      // The empty reload opens with the slide still locked back.
      name = 'ReloadEmpty';
    } else if (state.sinceShot !== null) {
      time = Math.min(state.sinceShot, duration('Fire'));
    }
    for (const [clip, action] of actions) {
      action.weight = clip === name ? 1 : 0;
      action.time = clip === name ? time : 0;
    }
    mixer.update(0);
  }

  const target = new THREE.Matrix4();
  const socketAt = new THREE.Vector3(), socketTurn = new THREE.Quaternion(), socketSize = new THREE.Vector3();
  const ONE = new THREE.Vector3(1, 1, 1);
  const forearmRest = new THREE.Matrix4();
  const elbowAt = new THREE.Vector3(), shoulder = new THREE.Vector3(), along = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);
  // Where each shoulder is, in the view's space: below the frame and behind the eye.
  const SHOULDER = { right: new THREE.Vector3(0.3, -0.62, 0.34), left: new THREE.Vector3(-0.3, -0.62, 0.34) };
  function place(side: Side, socket: THREE.Object3D | null) {
    const hand = hands[side];
    if (!hand) return;
    const { upper, forearm, extension } = hand;
    // The arm moves as one piece: the forearm keeps its rest pose in the upper arm, and the upper
    // arm goes where it must for the palm to land on the socket.
    forearm.position.copy(hand.rest.position); forearm.quaternion.copy(hand.rest.quaternion); forearm.scale.copy(hand.rest.scale);
    if (!socket) {
      upper.scale.setScalar(1e-4);
      extension.tube.visible = extension.joint.visible = false;
      return;
    }
    upper.parent!.updateWorldMatrix(true, false);
    socket.updateWorldMatrix(true, false);
    // Only where the socket is and which way it faces: the weapons are scaled up, the arms are not.
    socket.matrixWorld.decompose(socketAt, socketTurn, socketSize);
    forearmRest.compose(hand.rest.position, hand.rest.quaternion, hand.rest.scale);
    target.compose(socketAt, socketTurn, ONE).multiply(hand.fromPalm).multiply(forearmRest.invert())
      .premultiply(upper.parent!.matrixWorld.clone().invert());
    target.decompose(upper.position, upper.quaternion, upper.scale);
    // The upper arm and elbow, from where the mesh ends to the shoulder, which is below the frame.
    root.updateWorldMatrix(true, false);
    forearm.updateWorldMatrix(true, false);
    elbowAt.copy(hand.elbow.local).applyMatrix4(forearm.matrixWorld);
    root.worldToLocal(elbowAt);
    shoulder.copy(SHOULDER[side]);
    if (root.parent) root.parent.localToWorld(shoulder);
    root.worldToLocal(shoulder);
    along.subVectors(shoulder, elbowAt);
    const length = along.length();
    const radius = hand.elbow.radius;
    extension.tube.visible = extension.joint.visible = true;
    extension.tube.position.copy(elbowAt).addScaledVector(along, 0.5);
    extension.tube.quaternion.setFromUnitVectors(UP, along.normalize());
    extension.tube.scale.set(radius * 0.97, length, radius * 0.97);
    extension.joint.position.copy(elbowAt);
    extension.joint.scale.setScalar(radius * 0.99);
  }

  // The arms and gun back as the clips expect them.
  function holdGlock() {
    for (const part of gun) part.visible = true;
    for (const hand of Object.values(hands)) {
      for (const [bone, rest] of [[hand.forearm, hand.rest], [hand.upper, hand.upperRest]] as const) {
        bone.position.copy(rest.position);
        bone.quaternion.copy(rest.quaternion);
        bone.scale.copy(rest.scale);
      }
      hand.extension.tube.visible = hand.extension.joint.visible = false;
    }
  }

  return {
    root, muzzle, ejection,
    ready: () => loaded,
    sightTop: (out) => out.copy(sight),
    pose(state) {
      holdGlock();
      pose(state);
    },
    holdOther(right, left) {
      if (!loaded) return;
      pose({ sinceShot: null, reload: null, reloadEmpty: false, sinceDraw: null, empty: false });
      for (const part of gun) part.visible = false;
      place('right', right);
      place('left', left);
    },
  };
}
