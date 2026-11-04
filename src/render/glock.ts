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

interface PackHand {
  forearm: THREE.Bone;
  // The forearm, from the palm's frame, at rest.
  fromPalm: THREE.Matrix4;
  rest: { position: THREE.Vector3; quaternion: THREE.Quaternion; scale: THREE.Vector3 };
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

  new GLTFLoader().load(GLOCK_MODEL, (gltf) => {
    frame.add(gltf.scene);
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
      hands[side] = {
        forearm, fromPalm: palm.invert().multiply(forearm.matrixWorld),
        rest: { position: forearm.position.clone(), quaternion: forearm.quaternion.clone(), scale: forearm.scale.clone() },
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
  function place(side: Side, socket: THREE.Object3D | null) {
    const hand = hands[side];
    if (!hand) return;
    const bone = hand.forearm;
    if (!socket) {
      bone.scale.setScalar(1e-4);
      return;
    }
    bone.parent!.updateWorldMatrix(true, false);
    socket.updateWorldMatrix(true, false);
    // Only where the socket is and which way it faces: the weapons are scaled up, the arms are not.
    socket.matrixWorld.decompose(socketAt, socketTurn, socketSize);
    target.compose(socketAt, socketTurn, ONE).multiply(hand.fromPalm).premultiply(bone.parent!.matrixWorld.clone().invert());
    target.decompose(bone.position, bone.quaternion, bone.scale);
  }

  // The forearms back where the clips expect them, and the gun out.
  function holdGlock() {
    for (const part of gun) part.visible = true;
    for (const hand of Object.values(hands)) {
      hand.forearm.position.copy(hand.rest.position);
      hand.forearm.quaternion.copy(hand.rest.quaternion);
      hand.forearm.scale.copy(hand.rest.scale);
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
