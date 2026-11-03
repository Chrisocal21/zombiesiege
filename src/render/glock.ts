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
  let loaded = false;

  new GLTFLoader().load(GLOCK_MODEL, (gltf) => {
    frame.add(gltf.scene);
    gltf.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
        // The skinned arms move well outside their bind-pose bounds.
        object.frustumCulled = false;
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

  return {
    root, muzzle, ejection,
    ready: () => loaded,
    sightTop: (out) => out.copy(sight),
    pose,
  };
}
