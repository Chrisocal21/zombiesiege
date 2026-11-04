import { settings } from '../client/settings';
import { appearance, selectedGloves } from '../client/appearance';
import { gloveTexture, outfitTexture } from './gearTextures';
import { paintTexture } from './materials';
import * as THREE from 'three';
import { config } from '../config';
import type { Player } from '../game/state';
import { isMelee, weaponStats, type WeaponId } from '../game/weapons';
import { BAT_GRIP, FIST_GRIP, FOREND_GRIP, GUN_GRIP, SHOTGUN_GRIP, LEFT_HAND_LOADING_SHOTGUN, LEFT_HAND_MODEL, LEFT_HAND_ON_MAGAZINE, LEFT_HAND_ON_SLIDE, RIGHT_HAND_MODEL, SUPPORT_GRIP, loadHand, type Hold } from './hand';
import { handSocket, showSockets, triggerContact } from './handSockets';
import type { CameraPose } from './view';
import { buildLampCase } from './objectives';
import { box, softBox, profile, barrelPart } from './weaponGeometry';
import { createLongGun } from './longGuns';
import { createMeleeWeapons } from './meleeWeapons';
import { GLOCK_PIVOT, loadGlock } from './glock';

// Everything here is in meters. The gun points down -z, +x is right, +y is up.
const REST_POSITION = new THREE.Vector3(0.11, -0.18, -0.64);
const BODYCAM_POSITION = new THREE.Vector3(0, -0.045, -0.62);
const SCALE = 1.55;
// The gun is angled slightly in toward the crosshair.
const REST_YAW = 0.1;
const REST_PITCH = 0.03;
// Aimed, the sights sit dead on the camera's center line. The pitch levels the rear dots
// with the front dot, and the height puts that line through the eye.
const AIM_POSITION = new THREE.Vector3(0, -0.1120, -0.50);
// The pump shotgun and the AK, held by the Glock pack's arms. At the hip each is pulled back and down
// so the arms rise from the bottom of the view; aimed, the top of the receiver sits on the centre line.
const LONG_POSE = {
  shotgun: { rest: new THREE.Vector3(0.16, -0.24, -0.56), bodycam: new THREE.Vector3(0.05, -0.17, -0.52), aim: new THREE.Vector3(0, -0.075, -0.46), yaw: 0.16 },
  ak: { rest: new THREE.Vector3(0.16, -0.25, -0.54), bodycam: new THREE.Vector3(0.05, -0.18, -0.5), aim: new THREE.Vector3(0, -0.105, -0.46), yaw: 0.16 },
};
const TOOL_POSITION = new THREE.Vector3(0.23, -0.20, -0.68);
const AIM_PITCH = 0.0157;
// The Glock pack holds its gun at eye level. At the hip it sits lower, out to the right and
// turned in, so the forearm leaves the frame at the bottom corner. Aimed, it moves a little
// forward so the arms crowd the view less.
const GLOCK_HIP_OFFSET = new THREE.Vector3(0.065, -0.08, -0.02);
const GLOCK_HIP_YAW = 0.12;
const GLOCK_AIM_FORWARD = -0.08;
const GLOCK_PREVIEW_POSITION = new THREE.Vector3(-0.035, -0.005, -0.40);
const GLOCK_PREVIEW_ROTATION = new THREE.Euler(0.05, 1.1, 0);
const FLASH_SECONDS = 0.05;
const FLASH_SIZE = 0.13;
const SLIDE_TRAVEL = 0.032;
const TRIGGER_TRAVEL = 0.32;
// Where the fresh magazine starts, off screen, and where it lines up under the grip.
const MAGAZINE_AWAY = new THREE.Vector3(-0.15, -0.22, 0.08);
const MAGAZINE_READY = new THREE.Vector3(0, -0.085, 0);

export interface Viewmodel {
  update(player: Player, pose: CameraPose, frameSeconds: number, preview?: boolean): void;
  // How far up to the eye the gun is: 0 is at the hip, 1 is fully aimed.
  aimAmount(): number;
  getEjection(out: THREE.Vector3): THREE.Vector3;
  // Where the bullet leaves the gun, in the camera's own space.
  getMuzzle(out: THREE.Vector3): THREE.Vector3;
}

function noiseTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d')!;
  const image = context.createImageData(128, 128);
  for (let i = 0; i < image.data.length; i += 4) {
    const value = 232 + Math.random() * 23;
    image.data[i] = value;
    image.data[i + 1] = value;
    image.data[i + 2] = value;
    image.data[i + 3] = 255;
  }
  context.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// A hot white center fading to orange, with uneven tapered tongues of flame.
function flashTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d')!;
  context.translate(size / 2, size / 2);
  context.globalCompositeOperation = 'lighter';
  const lengths = [120, 78, 104, 66, 112, 84];
  lengths.forEach((length, i) => {
    context.save();
    context.rotate((i / lengths.length) * Math.PI * 2 + 0.2);
    const tongue = context.createLinearGradient(0, 0, length, 0);
    tongue.addColorStop(0, 'rgba(255, 196, 110, 0.9)');
    tongue.addColorStop(1, 'rgba(255, 90, 20, 0)');
    context.fillStyle = tongue;
    context.beginPath();
    context.moveTo(0, -16);
    context.quadraticCurveTo(length * 0.4, -9, length, 0);
    context.quadraticCurveTo(length * 0.4, 9, 0, 16);
    context.fill();
    context.restore();
  });
  const core = context.createRadialGradient(0, 0, 0, 0, 0, 62);
  core.addColorStop(0, 'rgba(255, 250, 225, 1)');
  core.addColorStop(0.35, 'rgba(255, 210, 130, 0.75)');
  core.addColorStop(1, 'rgba(255, 110, 30, 0)');
  context.fillStyle = core;
  context.fillRect(-size / 2, -size / 2, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function angleDelta(a: number, b: number): number {
  let difference = a - b;
  while (difference > Math.PI) difference -= Math.PI * 2;
  while (difference < -Math.PI) difference += Math.PI * 2;
  return difference;
}

// A blocky pistol held in a right hand, with a forearm in a jacket sleeve.
export function createViewmodel(viewScene: THREE.Scene): Viewmodel {
  const grain = noiseTexture();
  const stipple = grain.clone();
  stipple.repeat.set(30, 30);
  stipple.needsUpdate = true;
  const wear = paintTexture(512, 811, (ctx, size, random) => {
    ctx.fillStyle = '#a8abb0'; ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 1600; i++) {
      ctx.strokeStyle = `rgba(210,218,225,${random() * 0.17})`; ctx.lineWidth = 0.4;
      const x = random() * size, y = random() * size;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + random() * 30, y + 0.8); ctx.stroke();
    }
  });
  const slideMetal = new THREE.MeshStandardMaterial({ color: 0x454b53, metalness: 0.8, roughness: 0.33, map: wear, bumpMap: wear, bumpScale: 0.00008 });
  const brightMetal = new THREE.MeshStandardMaterial({ color: 0x8a8d92, metalness: 1, roughness: 0.3 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x101114, metalness: 0.7, roughness: 0.5 });
  const polymer = new THREE.MeshStandardMaterial({ color: 0x1b1c20, roughness: 0.62, metalness: 0.05 });
  const gripPolymer = new THREE.MeshStandardMaterial({
    color: 0x1b1c20,
    roughness: 0.82,
    metalness: 0.05,
    bumpMap: stipple,
    bumpScale: 0.0002,
  });
  const textile = outfitTexture(appearance.outfit);
  const gloveMap = gloveTexture().clone(); gloveMap.repeat.set(3, 3);
  const sleeve = new THREE.MeshStandardMaterial({ color: '#a4a4a4', roughness: 0.96, map: textile, bumpMap: textile, bumpScale: 0.0006 });
  // A short glove cuff joins the source hand's wrist cut to the shirt cuff.
  const sleeveCuff = new THREE.MeshStandardMaterial({ color: selectedGloves().color, roughness: 0.9, map: gloveMap, bumpMap: gloveMap, bumpScale: 0.00014 });
  let currentOutfit = appearance.outfit;
  const sight = new THREE.MeshStandardMaterial({
    color: 0xf4efd6,
    emissive: 0xf4efd6,
    emissiveIntensity: 0.9,
    roughness: 0.6,
  });

  const root = new THREE.Group();
  root.name = 'Weapon viewmodel';
  root.scale.setScalar(SCALE);
  viewScene.add(root);

  // The slide is its own group so it can slide back on each shot.
  const slide = new THREE.Group();
  slide.name = 'Pistol slide';
  root.add(slide);
  profile(
    slide,
    [
      [-0.065, 0.029, 0.001],
      [-0.0635, 0.067, 0.002],
      [0.128, 0.067, 0.003],
      [0.135, 0.059, 0.002],
      [0.135, 0.036, 0.003],
      [0.124, 0.029, 0.002],
    ],
    0.03,
    0.0028,
    slideMetal,
  );
  // Cocking grooves cut across both sides at the back and front of the slide.
  const grooves = [...Array(7).keys()].map((i) => 0.024 + i * 0.0052);
  const frontGrooves = [...Array(4).keys()].map((i) => -0.098 - i * 0.0052);
  for (const z of [...grooves, ...frontGrooves]) {
    box(slide, [0.0304, 0.027, 0.0022], darkMetal, [0, 0.046, z]).rotation.x = 0.16;
  }
  // Ejection port with the barrel hood showing through it.
  box(slide, [0.0172, 0.0012, 0.05], darkMetal, [0.0028, 0.0671, -0.016]);
  box(slide, [0.0145, 0.0014, 0.024], brightMetal, [-0.0002, 0.0672, -0.03]);
  // The firing pin plate on the back of the slide, and the muzzle at the front.
  softBox(slide, [0.011, 0.017, 0.0014], 0.0006, slideMetal, [0, 0.048, 0.065]);
  barrelPart(slide, 0.0014, 0.001, brightMetal, [0, 0.051, 0.0656]);
  barrelPart(slide, 0.0078, 0.006, brightMetal, [0, 0.0475, -0.1345]);
  barrelPart(slide, 0.0048, 0.0012, darkMetal, [0, 0.0475, -0.1376]);
  barrelPart(slide, 0.0034, 0.0012, darkMetal, [0, 0.0345, -0.1352]);
  // Sights, with three white dots to line up.
  softBox(slide, [0.0044, 0.0062, 0.01], 0.001, darkMetal, [0, 0.0695, -0.12]);
  box(slide, [0.0024, 0.0024, 0.0008], sight, [0, 0.0705, -0.1148]);
  softBox(slide, [0.02, 0.0035, 0.01], 0.001, darkMetal, [0, 0.0683, 0.052]);
  for (const x of [-0.0066, 0.0066]) {
    softBox(slide, [0.0056, 0.0068, 0.009], 0.001, darkMetal, [x, 0.0728, 0.052]);
    box(slide, [0.0024, 0.0024, 0.0008], sight, [x, 0.0732, 0.0568]);
  }

  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.0475, -0.14);
  slide.add(muzzle);

  // The polymer frame, drawn as one piece with the trigger guard as a real opening.
  profile(
    root,
    [
      [-0.067, 0.03, 0.002],
      [0.122, 0.03, 0.001],
      [0.124, 0.012, 0.003],
      [0.118, 0.006, 0.001],
      [0.047, 0.006, 0.006],
      [0.044, -0.028, 0.009],
      [-0.015, -0.028, 0.006],
      [-0.024, -0.012, 0.004],
      [-0.03, -0.03, 0.001],
      [-0.07, -0.03, 0.001],
      [-0.0675, 0.016, 0.003],
      [-0.0725, 0.0215, 0.004],
    ],
    0.0275,
    0.0028,
    polymer,
    [
      [-0.016, -0.001, 0.003],
      [0.037, -0.001, 0.004],
      [0.037, -0.0215, 0.006],
      [-0.01, -0.0215, 0.004],
    ],
  );
  // Accessory rail grooves under the front of the frame.
  for (const z of [-0.082, -0.09, -0.098, -0.106]) box(root, [0.028, 0.0052, 0.0028], darkMetal, [0, 0.0105, z]);
  // A curved trigger, slide stop, takedown lever, and magazine release.
  const trigger = profile(
    root,
    [
      [-0.003, 0.001, 0.0005],
      [0.006, 0.001, 0.0005],
      [0.0035, -0.008, 0.003],
      [0.0065, -0.0165, 0.001],
      [0.0025, -0.0165, 0.001],
      [-0.0005, -0.008, 0.003],
    ],
    0.0058,
    0.0009,
    darkMetal,
  );
  softBox(root, [0.0024, 0.0048, 0.021], 0.0009, darkMetal, [-0.0145, 0.0262, -0.01]);
  softBox(root, [0.0024, 0.0034, 0.011], 0.0009, darkMetal, [-0.0145, 0.0195, -0.038]);
  softBox(root, [0.0026, 0.0095, 0.0085], 0.001, darkMetal, [-0.0148, -0.009, 0.0305]);

  // The grip with its stippled texture, drawn at its lean. The group is tilted to match, so
  // the magazine and the hand can work along the grip's own axis.
  profile(
    root,
    [
      [-0.0235, -0.004, 0.003],
      [-0.0417, -0.0777, 0.004],
      [-0.0856, -0.0678, 0.006],
      [-0.0695, 0.0044, 0.004],
    ],
    0.03,
    0.0056,
    gripPolymer,
  );
  const grip = new THREE.Group();
  grip.name = 'Pistol grip';
  grip.position.set(0, 0, 0.05);
  grip.rotation.x = -0.22;
  grip.updateMatrix();
  root.add(grip);

  const magazine = new THREE.Group();
  magazine.name = 'Pistol magazine';
  grip.add(magazine);
  box(magazine, [0.022, 0.066, 0.036], darkMetal, [0, -0.04, -0.002]);
  softBox(magazine, [0.0275, 0.008, 0.047], 0.0028, polymer, [0, -0.0775, -0.002]);

  // Roll pins, extractor and frame rails add scale without altering the sight line.
  for (const side of [-1, 1]) {
    for (const z of [-0.047, 0.012, 0.031]) {
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.0018, 0.0018, 0.0284, 12), brightMetal);
      pin.rotation.z = Math.PI / 2; pin.position.set(0, 0.015, z); root.add(pin);
    }
    softBox(root, [0.001, 0.002, 0.065], 0.0003, darkMetal, [side * 0.014, 0.005, -0.08]);
  }
  const engraving = paintTexture(256, 31, (ctx, size) => {
    ctx.clearRect(0, 0, size, size); ctx.fillStyle = '#929ba3'; ctx.font = '26px sans-serif'; ctx.fillText('P9   /   9x19', 16, 120);
    ctx.font = '12px sans-serif'; ctx.fillText('NORTHLINE   /   02401', 16, 145);
  });
  const mark = new THREE.Mesh(new THREE.PlaneGeometry(0.052, 0.023), new THREE.MeshStandardMaterial({ map: engraving, transparent: true, roughness: 0.5, depthWrite: false }));
  mark.rotation.y = Math.PI / 2; mark.position.set(0.0152, 0.047, -0.073); slide.add(mark);
  const ejection = new THREE.Object3D(); ejection.position.set(0.02, 0.065, -0.008); root.add(ejection);
  // Where the palms go on the pistol: the trigger hand on the grip's right side, the support hand
  // over its fingers from the left. Both lie along the grip's lean.
  const pistolSockets = {
    primary: handSocket(grip, 'Pistol trigger hand', 'right', [0.0185, -0.036, 0.004], [0, 0.2, -1], [0, 1, 0.2], 0.016, 0.024),
    support: handSocket(grip, 'Pistol support hand', 'left', [-0.032, -0.040, -0.006], [0, 0.08, -1], [0, 1, 0.08], 0.030, 0.032),
  };
  triggerContact(pistolSockets.primary, root, [0.003, -0.011, -0.009]);
  // All pistol parts form one equippable object. The primary hand owns the active weapon;
  // its authored sockets remain useful for fitting and for the support-hand targets.
  const pistol = new THREE.Group(); pistol.name = 'P9 pistol';
  pistol.add(...root.children);
  root.add(pistol);
  const rightHand = loadHand(root, RIGHT_HAND_MODEL);

  // One persistent support hand performs both the firing grip and the reload.
  // Blending its actual finger rig avoids duplicated hands popping in and out.
  const leftHand = new THREE.Group();
  leftHand.name = 'Support hand anchor';
  root.add(leftHand);
  const supportHand = loadHand(leftHand, LEFT_HAND_MODEL);

  const longGuns = { shotgun: createLongGun('shotgun'), ak: createLongGun('ak') };
  root.add(longGuns.shotgun.root, longGuns.ak.root);
  const tools = createMeleeWeapons(slideMetal, gripPolymer);
  root.add(tools.machete, tools.bat);
  const holds = {
    pistol: { grip: GUN_GRIP, socket: pistolSockets.primary },
    pistolSupport: { grip: SUPPORT_GRIP, socket: pistolSockets.support },
    shotgun: { grip: SHOTGUN_GRIP, socket: longGuns.shotgun.sockets.primary },
    forend: { grip: FOREND_GRIP, socket: longGuns.shotgun.sockets.support },
    ak: { grip: SHOTGUN_GRIP, socket: longGuns.ak.sockets.primary },
    akForend: { grip: FOREND_GRIP, socket: longGuns.ak.sockets.support },
    machete: { grip: FIST_GRIP, socket: tools.sockets.machete },
    bat: { grip: BAT_GRIP, socket: tools.sockets.batRight },
    batSupport: { grip: BAT_GRIP, socket: tools.sockets.batLeft },
  } satisfies Record<string, Hold>;
  const weaponParts = new Set<THREE.Object3D>();
  for (const weapon of [pistol, longGuns.shotgun.root, longGuns.ak.root, tools.machete, tools.bat]) weapon.traverse((part) => weaponParts.add(part));
  if (import.meta.env.DEV && new URLSearchParams(location.search).has('sockets')) {
    showSockets(Object.values(holds).map((hold) => hold.socket));
  }
  // The long guns' models load after the viewmodel is built, so their meshes are not in weaponParts.
  const onLongGun = (part: THREE.Object3D) => { for (let up: THREE.Object3D | null = part; up; up = up.parent) if (up === longGuns.shotgun.root || up === longGuns.ak.root) return true; return false; };
  const supportMatrix = new THREE.Matrix4();
  const rootInverse = new THREE.Matrix4();
  const supportOffset = new THREE.Matrix4();
  const offsetSupport = (offset: THREE.Vector3) => {
    supportOffset.makeTranslation(offset.x, offset.y, offset.z).premultiply(supportMatrix);
    supportOffset.decompose(leftHand.position, leftHand.quaternion, leftHand.scale);
  };
  const handOffset = new THREE.Vector3();

  const forwardAxis = new THREE.Vector3(0, 0, 1);
  // Cover the wrist cut without extending a second, cylindrical "palm" into the hand.
  // The shirt starts over this short cuff and continues down the forearm off screen.
  const SLEEVE_START = 0;
  const SLEEVE_RADIUS = 0.025;
  // Account for the viewmodel's overall scale when bounding the wrist-to-elbow length.
  const FOREARM_LENGTH = 0.34 / SCALE;
  const UPPER_ARM_LENGTH = 0.30 / SCALE;
  const sleeveProfile = Array.from({ length: 36 }, (_, i) => {
    const t = i / 35;
    const radius = SLEEVE_RADIUS + t * 0.008 + Math.sin(t * Math.PI * 13) * 0.0008 * Math.sin(t * Math.PI);
    return new THREE.Vector2(radius, t);
  });
  const sleeveGeometry = new THREE.LatheGeometry(sleeveProfile, 28);
  // The source wrist cut is slightly oval/irregular. The glove cuff covers its seam.
  const cuffGeometry = new THREE.CylinderGeometry(0.020, 0.022, 0.028, 28);
  const bandGeometry = new THREE.TorusGeometry(SLEEVE_RADIUS, 0.0016, 6, 28);
  const elbowGeometry = new THREE.SphereGeometry(SLEEVE_RADIUS + 0.008, 20, 12);
  const makeArm = () => {
    const rig = new THREE.Group(); root.add(rig);
    const cuff = new THREE.Mesh(cuffGeometry, sleeveCuff);
    cuff.rotation.x = Math.PI / 2; cuff.position.z = 0.008; rig.add(cuff);
    const cloth = new THREE.Mesh(sleeveGeometry, sleeve);
    cloth.rotation.x = Math.PI / 2; cloth.position.z = SLEEVE_START; rig.add(cloth);
    // A stitched shirt cuff overlaps the glove at the wrist.
    const band = new THREE.Mesh(bandGeometry, sleeve);
    band.position.z = SLEEVE_START; rig.add(band);
    const joint = new THREE.Mesh(elbowGeometry, sleeve); rig.add(joint);
    const upperRig = new THREE.Group(); root.add(upperRig);
    const upperCloth = new THREE.Mesh(sleeveGeometry, sleeve);
    upperCloth.rotation.x = Math.PI / 2;
    upperCloth.scale.set(1.32, 1, 1.32); upperRig.add(upperCloth);
    return { rig, cloth, joint, upperRig, upperCloth };
  };
  const rightArm = makeArm();
  const leftArm = makeArm();
  rightArm.rig.name = 'Primary tactical sleeve and glove gauntlet';
  leftArm.rig.name = 'Support tactical sleeve and glove gauntlet';
  const rightWrist = new THREE.Vector3();
  const leftWrist = new THREE.Vector3();
  const armDirection = new THREE.Vector3();
  const upperDirection = new THREE.Vector3();
  const elbow = new THREE.Vector3();
  const syncArm = (arm: ReturnType<typeof makeArm>, wrist: THREE.Vector3, side: number, bodycam: number, shotgun: boolean) => {
    // Bent elbows sit below and behind the wrists, close enough to avoid long,
    // straight sleeves stretching toward targets behind the camera.
    elbow.set(side * (0.09 + bodycam * 0.01), -0.25, 0.30);
    if (shotgun) {
      if (side < 0) elbow.set(-0.09, -0.35, 0.20);
      else elbow.set(0.20, -0.10, 0.37);
    }
    armDirection.copy(elbow).sub(wrist);
    arm.rig.position.copy(wrist);
    arm.rig.quaternion.setFromUnitVectors(forwardAxis, armDirection.clone().normalize());
    const length = Math.min(FOREARM_LENGTH, Math.max(0.12, armDirection.length() - SLEEVE_START));
    arm.cloth.scale.y = length;
    // A bent upper arm continues below the frame when a reload lifts the elbow into view.
    // Both segments have bounded lengths; the forearm never stretches to fill the screen.
    arm.joint.position.z = length;
    elbow.copy(wrist).addScaledVector(armDirection, length / armDirection.length());
    arm.upperRig.position.copy(elbow);
    upperDirection.set(side * 0.20, -0.48, 0.48).sub(elbow);
    arm.upperCloth.scale.y = Math.min(UPPER_ARM_LENGTH, upperDirection.length());
    arm.upperRig.quaternion.setFromUnitVectors(forwardAxis, upperDirection.normalize());
  };

  // Muzzle flash: a soft glowing burst, shown for a moment after each shot.
  const flashMaterial = new THREE.SpriteMaterial({
    map: flashTexture(),
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
  });
  const flash = new THREE.Sprite(flashMaterial);
  flash.visible = false;
  flash.position.z = -0.012;
  muzzle.add(flash);
  const flashLight = new THREE.PointLight(0xffb15a, 0, 2.5, 2);
  muzzle.add(flashLight);

  // Lit parts shade each other, so the fingers and thumb cast shadows on the gun.
  root.traverse((object) => {
    if (object instanceof THREE.Mesh && object.material instanceof THREE.MeshStandardMaterial) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });

  // The empty magazine that falls out at the start of a reload.
  const droppedMagazine = magazine.clone();
  droppedMagazine.visible = false;
  viewScene.add(droppedMagazine);
  const droppedVelocity = new THREE.Vector3();

  // A lamp case held low in both arms, with the gun put away.
  const carried = buildLampCase();
  carried.visible = false;
  viewScene.add(carried);
  let carry = 0;

  // Once its model loads, the Glock pack's own arms and animations stand in for the pistol.
  const glock = loadGlock(viewScene);
  const glockBase = new THREE.Vector3();
  const glockSight = new THREE.Vector3();
  let glockShown = false;
  let sinceShot: number | null = null;
  let sinceDraw: number | null = null;

  let seenShotTick = -1;
  let heldWeapon: WeaponId = 'pistol';
  let swapDip = 0;
  let flashLeft = 0;

  let slideKick = 0;
  let triggerPull = 0;
  let wasReloading = false;
  let reloadWasEmpty = false;
  let bodycamAmount = 0;
  let aimProgress = 0;
  let aim = 0;
  const basePosition = new THREE.Vector3();
  let bobPhase = 0;
  let lowered = 0;
  let time = 0;
  let swayYaw = 0;
  let swayPitch = 0;
  let lastYaw: number | null = null;
  let lastPitch = 0;
  let recoil = 0;
  let recoilVelocity = 0;
  let lastVerticalSpeed = 0;
  let landing = 0;

  return {
    update(player, pose, frameSeconds, preview = false) {
      // The pump shotgun or the AK.
      const shotgunHeld = player.weapon === 'shotgun' || player.weapon === 'ak';
      const longGun = longGuns[player.weapon === 'ak' ? 'ak' : 'shotgun'];
      const longPose = LONG_POSE[player.weapon === 'ak' ? 'ak' : 'shotgun'];
      const toolHeld = isMelee(player.weapon);
      const glockHeld = player.weapon === 'pistol' && glock.ready();
      // The Glock pack's arms hold the other weapons too, once they have loaded.
      const packArms = !glockHeld && glock.ready();
      if (player.weapon !== heldWeapon || glockHeld !== glockShown) {
        if (player.weapon !== heldWeapon) {
          swapDip = 1;
          sinceDraw = glockHeld ? 0 : null;
        }
        heldWeapon = player.weapon;
        glockShown = glockHeld;
        pistol.visible = player.weapon === 'pistol';
        tools.machete.visible = player.weapon === 'machete';
        tools.bat.visible = player.weapon === 'bat';
        longGuns.shotgun.root.visible = player.weapon === 'shotgun';
        longGuns.ak.root.visible = player.weapon === 'ak';
        (shotgunHeld ? longGun.muzzle : glockHeld ? glock.muzzle : slide).add(muzzle);
        if (shotgunHeld || glockHeld) muzzle.position.set(0, 0, 0);
        else muzzle.position.set(0, 0.0475, -0.14);
      }
      if (sinceDraw !== null) sinceDraw += frameSeconds;
      if (sinceShot !== null) sinceShot += frameSeconds;
      swapDip *= Math.exp(-frameSeconds * 8);
      const stats = weaponStats(player.weapon);
      if (currentOutfit !== appearance.outfit) {
        currentOutfit = appearance.outfit;
        sleeve.map = sleeve.bumpMap = outfitTexture(currentOutfit); sleeve.needsUpdate = true;
      }
      sleeveCuff.color.set(selectedGloves().color);
      time += frameSeconds;

      if (player.lastShotTick !== seenShotTick) {
        seenShotTick = player.lastShotTick;
        if (seenShotTick >= 0) {
          recoilVelocity += player.weapon === 'shotgun' ? 5 : player.weapon === 'ak' ? 2.8 : 2.2;
          slideKick = 1;
          triggerPull = 1;
          sinceShot = 0;
          flashLeft = FLASH_SECONDS;
          flashMaterial.rotation = Math.random() * Math.PI * 2;
          flash.scale.setScalar(FLASH_SIZE * (player.weapon === 'shotgun' ? 1.6 : 1) * (0.8 + Math.random() * 0.5));
        }
      }
      // Integrate a damped spring in short steps so 30 Hz and 144 Hz settle alike.
      for (let elapsed = 0; elapsed < frameSeconds;) {
        const dt = Math.min(1 / 120, frameSeconds - elapsed); elapsed += dt;
        recoilVelocity += (-240 * recoil - 24 * recoilVelocity) * dt;
        recoil += recoilVelocity * dt;
      }
      if (player.onGround && lastVerticalSpeed < -1.5) landing = Math.min(0.025, -lastVerticalSpeed * 0.003);
      lastVerticalSpeed = player.vy;
      landing *= Math.exp(-frameSeconds * 12);
      flashLeft = Math.max(0, flashLeft - frameSeconds);
      slideKick = Math.max(0, slideKick - frameSeconds * 14);
      triggerPull = Math.max(0, triggerPull - frameSeconds * 9);
      trigger.rotation.x = -TRIGGER_TRAVEL * triggerPull;
      flash.visible = !settings.reducedFlashing && flashLeft > 0;
      flashLight.intensity = !settings.reducedFlashing && flashLeft > 0 ? 0.6 : 0;

      // The gun lags behind when you turn, then settles.
      if (lastYaw !== null) {
        swayYaw = clamp(swayYaw - angleDelta(pose.yaw, lastYaw) * 0.6, -0.09, 0.09);
        swayPitch = clamp(swayPitch - (pose.pitch - lastPitch) * 0.6, -0.09, 0.09);
      }
      lastYaw = pose.yaw;
      lastPitch = pose.pitch;
      const settle = Math.exp(-frameSeconds * 9);
      swayYaw *= settle;
      swayPitch *= settle;

      // Footsteps only bob the gun while the feet are on the ground.
      const speed = player.onGround ? Math.hypot(player.vx, player.vz) : 0;
      // Both hands are busy climbing, so the gun drops out of the way.
      lowered += ((player.ladder || player.mantle || player.itemLeft > 0 ? 1 : 0) - lowered) * Math.min(1, frameSeconds * 10);
      carry += ((player.carrying >= 0 && !preview ? 1 : 0) - carry) * Math.min(1, frameSeconds * 8);
      const walking = Math.min(1, speed / config.player.moveSpeed);
      bobPhase += speed * frameSeconds * 1.5;
      const bobX = Math.sin(bobPhase) * 0.006 * walking;
      const bobY = Math.cos(bobPhase * 2) * 0.004 * walking;
      carried.visible = carry > 0.02;
      carried.position.set(bobX * 2, -0.9 + 0.3 * carry + bobY * 3, -0.6);
      carried.rotation.set(0.32, Math.sin(bobPhase) * 0.03 * walking, Math.sin(bobPhase) * 0.02 * walking);
      root.visible = carry < 0.98 && !glockHeld;
      glock.root.visible = carry < 0.98 && (glockHeld || packArms);
      const breathing = Math.sin(time * 1.7) * 0.0015;
      const motion = settings.cameraMotion ? 1 : 0;

      // Reload: the empty magazine falls away, the left hand brings up a fresh one and seats it
      // with a push, then lets go, and the slide is released if the gun was empty.
      const reloading = player.reloadLeft > 0;
      const progress = reloading ? 1 - player.reloadLeft / stats.reloadSeconds : 0;
      // The Glock's own reload clips move its arms, so it skips the drawn pistol's roll.
      const tilt = glockHeld ? 0 : Math.sin(progress * Math.PI);
      const stage = (from: number, to: number) => smooth(clamp((progress - from) / (to - from), 0, 1));

      if (reloading && !wasReloading && shotgunHeld) reloadWasEmpty = false;
      if (reloading && !wasReloading && !shotgunHeld) {
        reloadWasEmpty = player.ammo === 0;
        magazine.getWorldPosition(droppedMagazine.position);
        magazine.getWorldQuaternion(droppedMagazine.quaternion);
        magazine.getWorldScale(droppedMagazine.scale);
        droppedVelocity.set(-0.12, -0.5, 0.06);
        droppedMagazine.visible = !glockHeld;
      }
      wasReloading = reloading;
      if (droppedMagazine.visible) {
        droppedVelocity.y -= 7 * frameSeconds;
        droppedMagazine.position.addScaledVector(droppedVelocity, frameSeconds);
        droppedMagazine.rotation.x += 2.2 * frameSeconds;
        droppedMagazine.rotation.z += 1.3 * frameSeconds;
        if (droppedMagazine.position.y < -1.5) droppedMagazine.visible = false;
      }

      const firing = toolHeld ? (player.weapon === 'bat' ? holds.bat : holds.machete) : shotgunHeld ? holds[player.weapon === 'ak' ? 'ak' : 'shotgun'] : holds.pistol;
      rightHand.holdWeapon(toolHeld ? (player.weapon === 'bat' ? tools.bat : tools.machete) : shotgunHeld ? longGun.root : pistol, firing);
      root.updateWorldMatrix(true, true);
      rootInverse.copy(root.matrixWorld).invert();
      supportMatrix.copy(rootInverse).multiply(grip.matrixWorld);
      leftHand.visible = true;
      offsetSupport(handOffset.set(0, 0, 0));
      // Each hand is posed after the parts it holds have moved, so it follows them this frame.
      if (toolHeld) {
        magazine.visible = false;
        leftHand.visible = player.weapon === 'bat';
        supportHand.blendPose(holds.batSupport, holds.batSupport, 0);
      } else if (shotgunHeld) {
        magazine.visible = false;
        const loading = longGun.update(player.ammo, progress, reloading, triggerPull, sinceShot);
        supportMatrix.copy(rootInverse).multiply(longGun.root.matrixWorld).multiply(longGun.supportTransform).multiply(grip.matrix);
        supportMatrix.decompose(leftHand.position, leftHand.quaternion, leftHand.scale);
        supportHand.blendPose(holds[player.weapon === 'ak' ? 'akForend' : 'forend'], LEFT_HAND_LOADING_SHOTGUN, loading);
      } else if (reloading) {
        // Keep both hands joined as the pistol rolls inward, then bring a fresh
        // magazine up from the belt, insert it, work the slide and rebuild the grip.
        magazine.visible = progress > 0.22;
        magazine.position.copy(MAGAZINE_AWAY)
          .lerp(MAGAZINE_READY, stage(0.22, 0.49))
          .multiplyScalar(1 - stage(0.49, 0.66));
        if (progress < 0.22) {
          offsetSupport(handOffset.copy(MAGAZINE_AWAY).multiplyScalar(stage(0.06, 0.22)));
          supportHand.blendPose(holds.pistolSupport, LEFT_HAND_ON_MAGAZINE, stage(0.04, 0.18));
        } else if (progress < 0.66) {
          offsetSupport(magazine.position);
          supportHand.blendPose(LEFT_HAND_ON_MAGAZINE, LEFT_HAND_ON_MAGAZINE, 0);
        } else if (reloadWasEmpty && progress < 0.86) {
          offsetSupport(handOffset.set(0, 0, SLIDE_TRAVEL * stage(0.76, 0.82) * (1 - stage(0.82, 0.86))));
          supportHand.blendPose(LEFT_HAND_ON_MAGAZINE, LEFT_HAND_ON_SLIDE, stage(0.66, 0.76));
        } else {
          supportHand.blendPose(reloadWasEmpty ? LEFT_HAND_ON_SLIDE : LEFT_HAND_ON_MAGAZINE, holds.pistolSupport,
            stage(reloadWasEmpty ? 0.86 : 0.66, 0.98));
        }
      } else {
        magazine.visible = true;
        magazine.position.set(0, 0, 0);
        supportHand.blendPose(holds.pistolSupport, holds.pistolSupport, 0);
      }
      rightHand.pullIndex(toolHeld ? 0 : triggerPull);
      // Track the hand-model wrists, including reload pose changes, instead of
      // guessing sleeve attachment points and leaving gaps at the cuffs.
      if (!rightHand.getWrist(rightWrist)) rightWrist.set(0.01, -0.035, 0.13);
      if (supportHand.getWrist(leftWrist)) {
        leftHand.updateMatrix();
        leftWrist.applyMatrix4(leftHand.matrix);
      } else leftWrist.set(-0.08, -0.045, 0.10);
      const bodycamTarget = settings.cameraStyle === 'bodycam' && !preview ? 1 : 0;
      bodycamAmount += (bodycamTarget - bodycamAmount) * (1 - Math.exp(-frameSeconds * 12));
      if (frameSeconds === 0) bodycamAmount = bodycamTarget;
      syncArm(rightArm, rightWrist, 1, bodycamAmount, shotgunHeld);
      syncArm(leftArm, leftWrist, -1, bodycamAmount, shotgunHeld);

      // The drawn hands and sleeves stand in only until the Glock pack's arms have loaded.
      rightArm.rig.visible = rightArm.upperRig.visible = !packArms;
      leftArm.rig.visible = leftArm.upperRig.visible = !packArms && player.weapon !== 'machete';
      // Only the hands' own meshes: the right hand carries the equipped weapon as its child.
      for (const hand of [root.getObjectByName('Primary hand mesh'), leftHand.getObjectByName('Support hand mesh')]) {
        hand?.traverse((part) => { if (part instanceof THREE.Mesh && !weaponParts.has(part) && !onLongGun(part)) part.visible = !packArms; });
      }

      // The gun jolts up a little as the magazine is pushed home.
      const seat = glockHeld ? 0 : stage(0.64, 0.68) * (1 - stage(0.68, 0.74));

      // An empty gun keeps the slide locked back until the reload is nearly done.
      const slideLocked = player.ammo === 0 && !(reloading && progress > 0.85);
      slide.position.z = shotgunHeld ? 0 : SLIDE_TRAVEL * Math.max(slideKick, slideLocked ? 1 : 0);

      // Raising the gun to the eye. It also steadies the bob, sway, and recoil.
      const aimStep = frameSeconds / config.player.aimSeconds;
      aimProgress = clamp(aimProgress + (player.aiming ? aimStep : -aimStep), 0, 1);
      aim = smooth(aimProgress);
      const loose = 1 - aim * 0.8;
      basePosition.copy(shotgunHeld ? longPose.rest : REST_POSITION)
        .lerp(shotgunHeld ? longPose.bodycam : BODYCAM_POSITION, bodycamAmount)
        .lerp(shotgunHeld ? longPose.aim : AIM_POSITION, aim);
      if (toolHeld) basePosition.copy(TOOL_POSITION);

      root.position.set(
        basePosition.x + bobX * loose * motion - tilt * 0.03,
        basePosition.y + (bobY + breathing) * loose * motion - landing + tilt * 0.03 + seat * 0.012 - lowered * 0.35 - carry * 0.6 - swapDip * 0.3,
        basePosition.z + recoil * 0.25 * (1 - aim * 0.5),
      );
      root.rotation.set(
        REST_PITCH + (AIM_PITCH - REST_PITCH) * aim + swayPitch * loose + recoil * 0.75 * (1 - aim * 0.6) + tilt * 0.3,
        (shotgunHeld ? longPose.yaw : REST_YAW) * (1 - bodycamAmount) * (1 - aim) + swayYaw * loose,
        -tilt * 0.5 + Math.sin(bobPhase) * walking * 0.012 * loose * motion,
      );
      if (toolHeld) {
        root.rotation.x -= .13;
        root.rotation.z -= player.weapon === 'bat' ? .25 : .18;
      }
      if (player.meleeLeft > 0) {
        const phase = 1 - player.meleeLeft / stats.melee.seconds;
        const lift = smooth(clamp(phase / .18, 0, 1));
        const strike = smooth(clamp((phase - .18) / .24, 0, 1));
        const recover = 1 - smooth(clamp((phase - .58) / .42, 0, 1));
        const sweep = (lift - strike * 2) * recover;
        if (toolHeld) {
          root.position.x += sweep * .22;
          root.position.y += (lift * .08 - strike * .14) * recover;
          root.position.z -= strike * recover * .12;
          root.rotation.z -= sweep * (player.weapon === 'bat' ? 1.05 : .82);
          root.rotation.x -= lift * recover * .25;
        } else {
          root.position.z -= Math.sin(phase * Math.PI) * .18;
          root.position.y += Math.sin(phase * Math.PI) * .035;
          root.rotation.z += Math.sin(phase * Math.PI) * (shotgunHeld ? .2 : .4);
          root.rotation.x -= Math.sin(phase * Math.PI) * .16;
        }
      }
      if (preview) {
        root.position.set(0.01, -0.07, -0.58);
        root.rotation.set(0.02, -0.6, -0.13);
      }
      root.updateMatrixWorld(true);

      if (glockHeld) {
        // The arms take the same bob, sway, recoil and dips as the drawn guns, measured from
        // where those guns rest. Aimed, the sights' top edge moves onto the centre line.
        glock.sightTop(glockSight);
        glockBase.copy(GLOCK_PIVOT).addScaledVector(GLOCK_HIP_OFFSET, 1 - aim)
          .addScaledVector(glockSight.set(-glockSight.x, -glockSight.y, GLOCK_AIM_FORWARD), aim);
        glock.root.position.copy(glockBase).add(root.position).sub(basePosition);
        glock.root.rotation.set(
          root.rotation.x - (REST_PITCH + (AIM_PITCH - REST_PITCH) * aim),
          root.rotation.y - REST_YAW * (1 - bodycamAmount) * (1 - aim) + GLOCK_HIP_YAW * (1 - aim),
          root.rotation.z,
        );
        // The character preview shows the gun side on, muzzle to the left, both hands on the grip.
        if (preview) {
          glock.root.position.copy(GLOCK_PREVIEW_POSITION);
          glock.root.rotation.copy(GLOCK_PREVIEW_ROTATION);
        }
        glock.pose({
          sinceShot, reload: reloading ? progress : null, reloadEmpty: reloadWasEmpty, sinceDraw,
          empty: player.ammo === 0 && !reloading,
        });
        glock.root.updateMatrixWorld(true);
      } else if (packArms) {
        // Each palm on the weapon's attach point: the trigger hand on the grip or handle, the other
        // on the fore-end or the bat's lower grip. The machete is held in one hand.
        const bat = player.weapon === 'bat';
        glock.holdOther(
          toolHeld ? (bat ? holds.bat.socket : holds.machete.socket) : longGun.sockets.primary,
          toolHeld ? (bat ? holds.batSupport.socket : null) : longGun.sockets.support,
        );
      }
    },

    aimAmount: () => aim,

    getEjection(out) { return (glockShown ? glock.ejection : heldWeapon === 'ak' ? longGuns.ak.ejection : ejection).getWorldPosition(out); },

    getMuzzle(out) {
      return muzzle.getWorldPosition(out);
    },
  };
}
