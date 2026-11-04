import * as THREE from 'three';
import { loadModel } from './models';
import { handSocket, triggerContact, type HandSocket } from './handSockets';

// The two long guns, from the downloaded models: a pump shotgun and an AK. Both are close to real
// size (the viewmodel's own scale is taken out), point down -z, and are held by the Glock pack's arms
// at the sockets below, which are in the model's own metres.
export type LongGunKind = 'shotgun' | 'ak';

export interface LongGun {
  // The gun and its parts. Its origin is the middle of the receiver.
  readonly root: THREE.Group;
  readonly muzzle: THREE.Object3D;
  readonly ejection: THREE.Object3D;
  readonly sockets: { primary: HandSocket; support: HandSocket };
  // Where the support hand's old model would sit, relative to the gun at rest.
  readonly supportTransform: THREE.Matrix4;
  ready(): boolean;
  // Moves the parts: a pump of the fore-end after a shot, shells and magazines on a reload. Returns how
  // far the support hand is off the gun loading it, for the old hand model's pose.
  update(ammo: number, progress: number, reloading: boolean, pull: number, sinceShot: number | null): number;
}

const smooth = (t: number) => { t = THREE.MathUtils.clamp(t, 0, 1); return t * t * (3 - 2 * t); };
// The viewmodel scales everything by 1.55. Taken out, the guns are real size against the arms.
const REAL = 1 / 1.55;

type Vec = [number, number, number];
interface Grip { at: Vec; fingers: Vec; thumb: Vec; radius: number; depth: number }
interface Spec {
  file: string;
  scale: number;
  muzzle: Vec;
  ejection: Vec;
  // Trigger hand and support hand: where the palm lies on the gun, which way the fingers point, which
  // way the thumb, then the handle's half width and half depth.
  primary: Grip;
  support: Grip;
  trigger: Vec;
}

const SPECS: Record<LongGunKind, Spec> = {
  shotgun: {
    file: 'pump', scale: 0.96 * REAL, muzzle: [0, 0.008, -0.525], ejection: [0.02, 0.03, 0.0],
    primary: { at: [0.019, -0.012, 0.115], fingers: [-0.4, 0.3, -1], thumb: [0, 1, -0.1], radius: 0.017, depth: 0.026 },
    support: { at: [0, -0.026, -0.245], fingers: [0.75, -0.35, -0.5], thumb: [0, 0, -1], radius: 0.022, depth: 0.026 },
    trigger: [0, -0.024, 0.047],
  },
  ak: {
    file: 'ak', scale: 0.92 * REAL, muzzle: [0, 0.035, -0.33], ejection: [0.03, 0.05, 0.0],
    primary: { at: [0.019, -0.05, 0.2], fingers: [-0.4, 0.25, -1], thumb: [0, 1, -0.2], radius: 0.017, depth: 0.026 },
    support: { at: [0, -0.04, -0.2], fingers: [0.75, -0.35, -0.5], thumb: [0, 0, -1], radius: 0.024, depth: 0.03 },
    trigger: [0, -0.04, 0.12],
  },
};

export function createLongGun(kind: LongGunKind): LongGun {
  const spec = SPECS[kind];
  const root = new THREE.Group();
  root.name = kind === 'ak' ? 'AK' : 'Pump shotgun';
  root.visible = false;
  const model = new THREE.Group();
  model.scale.setScalar(spec.scale);
  root.add(model);
  const muzzle = new THREE.Object3D(); muzzle.name = `${root.name} muzzle`;
  muzzle.position.set(...spec.muzzle).multiplyScalar(spec.scale);
  const ejection = new THREE.Object3D(); ejection.name = `${root.name} ejection port`;
  ejection.position.set(...spec.ejection).multiplyScalar(spec.scale);
  root.add(muzzle, ejection);

  // The support hand rides a pivot, so it can leave the fore-end for a magazine or a shell.
  const supportPivot = new THREE.Group();
  const home = new THREE.Vector3(...spec.support.at);
  model.add(supportPivot);
  const { primary: p, support: s } = spec;
  const sockets = {
    primary: handSocket(model, `${root.name} trigger hand`, 'right', p.at, p.fingers, p.thumb, p.radius, p.depth),
    support: handSocket(supportPivot, `${root.name} support hand`, 'left', [0, 0, 0], s.fingers, s.thumb, s.radius, s.depth),
  };
  supportPivot.position.copy(home);
  triggerContact(sockets.primary, model, spec.trigger);

  // Moving parts, found by name once the model is in.
  let forend: THREE.Group | null = null;
  let bolt: THREE.Group | null = null;
  let magazine: THREE.Group | null = null;
  let trigger: THREE.Object3D | null = null;
  let loaded = false;
  loadModel(`/models/weapons/${spec.file}.glb`).then((gltf) => {
    model.add(gltf.scene);
    const parts = new Map<string, THREE.Object3D>();
    gltf.scene.traverse((object) => {
      parts.set(object.name, object);
      if (object instanceof THREE.Mesh) { object.castShadow = true; object.receiveShadow = true; }
    });
    const group = (names: string[]) => {
      const holder = new THREE.Group();
      model.add(holder);
      for (const name of names) { const part = parts.get(name); if (part) holder.attach(part); }
      return holder;
    };
    if (kind === 'shotgun') { forend = group(['Forend_lowpoly', 'ForendSlider_lowpoly']); trigger = parts.get('Trigger_lowpoly') ?? null; }
    else { bolt = group(['AKBOLT']); magazine = group(['AKMAG']); }
    loaded = true;
  });

  const supportTransform = new THREE.Matrix4();
  const target = new THREE.Vector3();
  const away = new THREE.Vector3(-0.07, -0.16, 0.08);
  // Where the shells go in, under the receiver, and where a fresh magazine is seated.
  const port = new THREE.Vector3(0, -0.075, 0.02);
  const well = new THREE.Vector3(0, -0.12, 0.09);
  const magPosition = new THREE.Vector3();

  return {
    root, muzzle, ejection, sockets, supportTransform,
    ready: () => loaded,
    update(_ammo, progress, reloading, pull, sinceShot) {
      const stage = (a: number, b: number) => smooth((progress - a) / (b - a));
      let carry = 0;
      target.copy(home);
      if (kind === 'shotgun') {
        // After a shot the fore-end is worked back and forward. A reload pumps once at the end.
        const cycle = (t: number) => Math.sin(Math.PI * THREE.MathUtils.clamp(t, 0, 1));
        let slide = sinceShot !== null ? cycle((sinceShot - 0.22) / 0.5) : 0;
        if (reloading) slide = cycle((progress - 0.78) / 0.18);
        if (forend) forend.position.z = 0.1 * slide;
        // One shell in, then the next: the hand goes to the port and back for each.
        if (reloading && progress < 0.78) {
          const beat = (progress / 0.78) * 2;
          carry = Math.sin(Math.PI * (beat - Math.floor(beat))) ** 0.6 * (1 - stage(0.7, 0.78));
        }
        target.lerp(port, carry);
        target.z += 0.1 * slide;
        if (trigger) trigger.rotation.x = -0.35 * pull;
      } else {
        // The bolt kicks back on each shot. A reload drops the magazine, the hand brings a new one up
        // and rocks it home, and the bolt is pulled back and let go.
        const kick = sinceShot !== null ? Math.max(0, 1 - sinceShot / 0.07) : 0;
        const pulled = reloading ? Math.sin(Math.PI * THREE.MathUtils.clamp((progress - 0.82) / 0.16, 0, 1)) : 0;
        if (bolt) bolt.position.z = 0.045 * Math.max(kick, pulled);
        carry = reloading ? stage(0.05, 0.2) * (1 - stage(0.7, 0.84)) : 0;
        const out = reloading ? stage(0.12, 0.3) * (1 - stage(0.46, 0.66)) : 0;
        if (magazine) magazine.position.copy(away).multiplyScalar(out);
        if (reloading) target.lerp(magPosition.copy(away).multiplyScalar(out).add(well), carry);
      }
      supportPivot.position.copy(target);
      supportTransform.makeTranslation(target.x - home.x, target.y - home.y, target.z - home.z);
      return carry;
    },
  };
}
