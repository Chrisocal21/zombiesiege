import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { config } from '../config';
import { settings } from '../client/settings';
import type { GameState } from '../game/state';
import type { Level } from '../levels/types';
import { placeModel } from './models';

const OLIVE = new THREE.MeshStandardMaterial({ color: 0x4a5238, roughness: 0.75, metalness: 0.2 });
const OLIVE_DARK = new THREE.MeshStandardMaterial({ color: 0x2f3624, roughness: 0.8 });
const CANVAS = new THREE.MeshStandardMaterial({ color: 0x3d4533, roughness: 0.95 });
const STRAP = new THREE.MeshStandardMaterial({ color: 0x1d2018, roughness: 0.9 });
const WOOD = new THREE.MeshStandardMaterial({ color: 0x6a5035, roughness: 0.85 });
const WOOD_DARK = new THREE.MeshStandardMaterial({ color: 0x4a3724, roughness: 0.9 });
const STEEL = new THREE.MeshStandardMaterial({ color: 0x6d7378, roughness: 0.45, metalness: 0.8 });
const BRASS = new THREE.MeshStandardMaterial({ color: 0xc8943a, roughness: 0.3, metalness: 0.9 });
const SHELL = new THREE.MeshStandardMaterial({ color: 0xa02a22, roughness: 0.6 });

// A hand-written tag tied to the drop: what it is and what it costs.
function tagTexture(kind: 'ammo' | 'shotgun', weapon?: 'shotgun' | 'ak'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const context = canvas.getContext('2d')!;
  context.fillStyle = '#b8b095';
  context.fillRect(0, 0, 256, 128);
  context.strokeStyle = '#7a6a48';
  context.lineWidth = 5;
  context.strokeRect(3, 3, 250, 122);
  context.textAlign = 'center';
  context.fillStyle = '#2a2418';
  context.font = '800 52px Bahnschrift, Arial Narrow, sans-serif';
  context.fillText(kind === 'shotgun' ? (weapon === 'ak' ? 'AK' : 'SHOTGUN') : 'AMMO', 128, 58);
  context.fillStyle = '#7a1f18';
  context.font = '700 36px Bahnschrift, Arial Narrow, sans-serif';
  context.fillText(`${kind === 'shotgun' ? (weapon === 'ak' ? config.stations.akCost : config.stations.shotgunCost) : config.stations.ammoCost} PTS`, 128, 104);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function crate(width: number, height: number, depth: number, body: THREE.Material, trim: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  const box = new THREE.Mesh(new RoundedBoxGeometry(width, height, depth, 2, 0.012), body);
  box.position.y = height / 2;
  box.castShadow = box.receiveShadow = true;
  group.add(box);
  // Battens round the sides, and metal corners.
  for (const x of [-width / 2 + 0.05, width / 2 - 0.05]) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.06, height + 0.01, depth + 0.012), trim);
    strip.position.set(x, height / 2, 0);
    group.add(strip);
  }
  return group;
}

// An ammunition drop: a duffle bag and an open ammo box with rounds showing, left on the ground.
function ammoDrop(): THREE.Group {
  const group = new THREE.Group();
  const box = crate(0.62, 0.3, 0.38, OLIVE, OLIVE_DARK);
  box.position.set(0.22, 0, 0);
  box.rotation.y = 0.12;
  group.add(box);
  // The lid propped open, and rounds standing in rows inside.
  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.03, 0.38), OLIVE_DARK);
  lid.position.set(0.22, 0.36, -0.28);
  lid.rotation.x = -1.2;
  lid.rotation.y = 0.12;
  group.add(lid);
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 9; i++) {
      const round = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.09, 8), BRASS);
      round.position.set(0.22 + (i - 4) * 0.062, 0.34, (row - 1) * 0.1);
      group.add(round);
    }
  }
  // The duffle: a fat canvas sausage with two straps, a handle and a zip line along the top.
  const duffle = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.19, 0.6, 6, 14), CANVAS);
  body.rotation.z = Math.PI / 2;
  body.scale.set(1, 1, 0.9);
  body.position.y = 0.19;
  body.castShadow = body.receiveShadow = true;
  duffle.add(body);
  for (const x of [-0.22, 0.22]) {
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.016, 6, 20), STRAP);
    strap.rotation.y = Math.PI / 2;
    strap.position.set(x, 0.19, 0);
    duffle.add(strap);
  }
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.014, 6, 14, Math.PI), STRAP);
  handle.position.set(0, 0.37, 0);
  duffle.add(handle);
  const zip = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.012, 0.02), STEEL);
  zip.position.set(0, 0.375, 0.02);
  duffle.add(zip);
  duffle.position.set(-0.42, 0, 0.1);
  duffle.rotation.y = -0.35;
  group.add(duffle);
  return group;
}

// A weapon drop: a long wooden crate with its lid off and the gun lying on top, shells beside it.
function weaponDrop(weapon: 'shotgun' | 'ak'): THREE.Group {
  const group = new THREE.Group();
  const box = crate(1.25, 0.28, 0.42, WOOD, WOOD_DARK);
  box.rotation.y = 0.08;
  group.add(box);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.035, 0.42), WOOD_DARK);
  lid.position.set(0.1, 0.02, 0.5);
  lid.rotation.x = -Math.PI / 2 + 0.25;
  lid.rotation.z = 0.1;
  lid.position.y = 0.2;
  group.add(lid);
  // Packing straw or foam under the gun.
  const foam = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.03, 0.34), new THREE.MeshStandardMaterial({ color: 0x4a4e50, roughness: 1 }));
  foam.position.set(0, 0.29, 0);
  group.add(foam);
  const holder = new THREE.Group();
  holder.position.set(0.1, 0.34, 0.14);
  holder.rotation.y = Math.PI / 2;
  group.add(holder);
  void placeModel(`/models/weapons/${weapon === 'ak' ? 'ak' : 'pump'}.glb`).then((model) => {
    model.scale.setScalar((weapon === 'ak' ? 0.92 / 1.55 : 0.96 / 1.55) * 1.15);
    model.position.y = 0.09;
    holder.add(model);
  });
  if (weapon === 'shotgun') {
    for (let i = 0; i < 2; i++) {
      const shells = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.1), SHELL);
      shells.position.set(0.75 + i * 0.18, 0.03, 0.18 - i * 0.12);
      shells.rotation.y = 0.3 + i;
      group.add(shells);
    }
  }
  return group;
}

// Supply drops on the ground along the route: a duffle and an ammo box, or a crate with a gun in it.
// They are bought from like the old wall stations were, and carry a warm lamp so they can be found
// in the dark.
export function buildStations(scene: THREE.Object3D, level: Level, glowMap: THREE.Texture): (state: GameState, time: number) => void {
  const pulses: { glow: THREE.Sprite; light: THREE.PointLight }[] = [];
  for (const station of level.stations) {
    const group = new THREE.Group();
    // Out from the wall where the old station stood, and down on the floor.
    const out = 0.85;
    group.position.set(station.position.x + station.normal.x * out, station.position.y - 1.25, station.position.z + station.normal.z * out);
    // Lying along the wall, a little turned from square so it looks dropped, not placed.
    group.rotation.y = Math.atan2(station.normal.x, station.normal.z) + (station.position.x * 0.7) % 0.5 - 0.25;
    scene.add(group);

    group.add(station.kind === 'shotgun' ? weaponDrop(station.weapon ?? 'shotgun') : ammoDrop());

    const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.17), new THREE.MeshStandardMaterial({ map: tagTexture(station.kind, station.weapon), roughness: 1, side: THREE.DoubleSide }));
    tag.position.set(station.kind === 'shotgun' ? 0.38 : 0, station.kind === 'shotgun' ? 0.36 : 0.52, station.kind === 'shotgun' ? 0.34 : 0.28);
    tag.rotation.x = -0.35;
    group.add(tag);

    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowMap, color: 0xffc060, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.3 }));
    glow.scale.setScalar(1.6);
    glow.position.set(0, 0.45, 0.1);
    group.add(glow);
    const light = new THREE.PointLight(0xffc060, 1.6, 4, 2);
    light.position.set(0, 1.3, 0.5);
    group.add(light);
    pulses.push({ glow, light });
  }

  return (state, time) => {
    const idle = state.waves.phase === 'entry' || state.waves.phase === 'lift' || state.waves.phase === 'ride' || state.waves.phase === 'arrive' || state.waves.phase === 'won';
    const pulse = settings.reducedFlashing ? 1 : 0.8 + 0.2 * Math.sin(time * 2.2);
    for (const { glow, light } of pulses) {
      glow.material.opacity = (idle ? 0.1 : 0.3) * pulse;
      light.intensity = (idle ? 0.5 : 1.6) * pulse;
    }
  };
}
