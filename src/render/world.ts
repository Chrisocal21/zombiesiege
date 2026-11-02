import { bakeStaticMeshes } from './bake';
import { buildDressing } from './dressing';
import { settings } from '../client/settings';
import { buildArchitecture } from './architecture';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { GameState } from '../game/state';
import type { Ladder, Level, LevelBox, LevelLight } from '../levels/types';
import {
  floorDecalTexture,
  glowTexture,
  plankMaterial,
  puddleAlphaTexture,
  surfaceMaterial,
  tileMeters,
} from './materials';
import { buildGate, buildStreet } from './street';
import { asphaltMaterial, hazardMaterial, labelTexture } from './streetTextures';
import { buildCartons, buildPillar, buildVehicle } from './vehicles';

export interface World {
  // Call every frame with the running time in seconds and the game state, for flickering lamps,
  // boarded doors and the bundles of boards.
  update(time: number, state: GameState): void;
}

const BEVEL: Partial<Record<string, number>> = { crate: 0.035, container: 0.03, plain: 0.05 };

// Texture coordinates measured in meters from the box's corner, so a texture keeps its real
// size on every box however big it is.
function boxMapUVs(geometry: THREE.BufferGeometry, box: LevelBox, tile: number): void {
  const position = geometry.attributes.position;
  const normal = geometry.attributes.normal;
  const uv = geometry.attributes.uv;
  // Boxes with the same texture get different spots on it, except where the picture has to line
  // up with the box's own edges.
  const aligned = box.surface === 'crate';
  const shiftU = aligned ? 0 : Math.abs(Math.sin(box.position.x * 12.9898 + box.position.z * 78.233)) * 4;
  const shiftV = aligned ? 0 : Math.abs(Math.sin(box.position.z * 39.346 + box.position.y * 11.135)) * 4;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i) + box.size.x / 2;
    const y = position.getY(i) + box.size.y / 2;
    const z = position.getZ(i) + box.size.z / 2;
    const nx = Math.abs(normal.getX(i));
    const ny = Math.abs(normal.getY(i));
    const nz = Math.abs(normal.getZ(i));
    let u: number;
    let v: number;
    if (nx >= ny && nx >= nz) {
      u = z;
      v = y;
    } else if (ny >= nz) {
      u = x;
      v = z;
    } else {
      u = x;
      v = y;
    }
    uv.setXY(i, (u + shiftU) / tile, (v + shiftV) / tile);
  }
  uv.needsUpdate = true;
}

function barrelGeometry(): THREE.BufferGeometry {
  const outline: [number, number][] = [
    [0, -0.5], [0.44, -0.5], [0.47, -0.47], [0.47, -0.38], [0.5, -0.33], [0.5, -0.28], [0.47, -0.24],
    [0.47, 0.24], [0.5, 0.28], [0.5, 0.33], [0.47, 0.38], [0.47, 0.47], [0.44, 0.5], [0.36, 0.5],
    [0.36, 0.47], [0, 0.47],
  ];
  return new THREE.LatheGeometry(outline.map(([r, y]) => new THREE.Vector2(r, y)), 24);
}

const slabMaterials = (() => {
  const concrete = surfaceMaterial('wall', '#8a8d90');
  const ceiling = surfaceMaterial('floor', '#7a7d82');
  const top = asphaltMaterial();
  // Right, left, top, bottom, front, back.
  return [concrete, concrete, top, ceiling, concrete, concrete];
})();

// What a box looks like. A few kinds are built from several parts, and a few are never drawn
// as boxes at all: boards and the gate are drawn from the game state, and steps are only there
// for walking on.
function buildBoxObject(box: LevelBox, index: number): THREE.Object3D | null {
  const surface = box.surface ?? 'plain';
  if (surface === 'board' || surface === 'gate' || surface === 'step') return null;
  if (surface === 'car' || surface === 'van') return buildVehicle(box);
  if (surface === 'building' || surface === 'crate') return buildArchitecture(box);
  if (surface === 'cartons') return buildCartons(box);
  if (surface === 'pillar') return buildPillar(box, surfaceMaterial('plain', box.color), index);

  if (surface === 'barrel') {
    const mesh = new THREE.Mesh(barrelGeometry(), surfaceMaterial(surface, box.color));
    mesh.scale.set(box.size.x, box.size.y, box.size.z);
    mesh.position.set(box.position.x, box.position.y, box.position.z);
    mesh.castShadow = mesh.receiveShadow = true;
    return mesh;
  }

  const bevel = BEVEL[surface];
  const geometry = bevel
    ? new RoundedBoxGeometry(box.size.x, box.size.y, box.size.z, 3, bevel)
    : new THREE.BoxGeometry(box.size.x, box.size.y, box.size.z);
  let tile = tileMeters(surface);
  // A crate is sized in whole panels, so its picture lines up with its corners.

  boxMapUVs(geometry, box, tile);

  let material: THREE.Material | THREE.Material[];
  if (surface === 'slab') material = slabMaterials;

  else material = surfaceMaterial(surface, box.color);

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(box.position.x, box.position.y, box.position.z);
  mesh.castShadow = surface !== 'floor';
  mesh.receiveShadow = true;
  return mesh;
}

const STEEL = new THREE.MeshStandardMaterial({ color: 0x6b7077, roughness: 0.45, metalness: 0.8 });
const DARK_STEEL = new THREE.MeshStandardMaterial({ color: 0x23262a, roughness: 0.6, metalness: 0.6 });

function buildLadder(ladder: Ladder): THREE.Group {
  const group = new THREE.Group();
  const height = ladder.top - ladder.bottom + 0.4;
  const railOffset = ladder.width / 2 - 0.04;
  const railGeometry = new THREE.CylinderGeometry(0.028, 0.028, height, 10);
  const rungGeometry = new THREE.CylinderGeometry(0.018, 0.018, railOffset * 2, 8);
  rungGeometry.rotateZ(Math.PI / 2);

  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(railGeometry, STEEL);
    rail.position.set(side * railOffset, ladder.bottom + height / 2, 0.07);
    rail.castShadow = true;
    group.add(rail);
    // Brackets holding the rails off the wall.
    for (let y = ladder.bottom + 0.3; y < ladder.top; y += 0.9) {
      const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.07), DARK_STEEL);
      bracket.position.set(side * railOffset, y, 0.035);
      group.add(bracket);
    }
  }
  for (let y = ladder.bottom + 0.25; y < ladder.top + 0.3; y += 0.3) {
    const rung = new THREE.Mesh(rungGeometry, STEEL);
    rung.position.set(0, y, 0.07);
    rung.castShadow = true;
    group.add(rung);
  }

  group.position.set(ladder.x, 0, ladder.z);
  // The ladder is modelled facing +z and turned to face along the level's normal.
  group.rotation.y = Math.atan2(ladder.normal.x, ladder.normal.z);
  return group;
}

interface Lamp {
  light: THREE.PointLight;
  glow: THREE.Sprite;
  bulb: THREE.MeshBasicMaterial;
  base: number;
  flicker: boolean;
  seed: number;
}

function buildLamp(lightConfig: LevelLight, glowMap: THREE.Texture, parent: THREE.Group): Lamp {
  const { x, y, z } = lightConfig.position;
  const color = new THREE.Color(lightConfig.color);
  const group = new THREE.Group();
  group.position.set(x, y, z);

  if (y >= 4) {
    // A fluorescent fitting hanging from the ceiling.
    const housing = new THREE.Mesh(new RoundedBoxGeometry(1.3, 0.09, 0.3, 2, 0.03), DARK_STEEL);
    housing.position.y = 0.16;
    group.add(housing);
    const tubes = new THREE.MeshBasicMaterial({ color });
    for (const side of [-1, 1]) {
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.18, 8), tubes);
      tube.rotation.z = Math.PI / 2;
      tube.position.set(0, 0.1, side * 0.08);
      group.add(tube);
    }
    for (const end of [-0.5, 0.5]) {
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.3, 4), DARK_STEEL);
      chain.position.set(end, 0.35, 0);
      group.add(chain);
    }
    const lamp = new THREE.PointLight(color, lightConfig.intensity, 18, 2);
    lamp.position.y = -0.5;
    group.add(lamp);
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: glowMap, color, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.6 }),
    );
    halo.scale.set(1.8, 0.42, 1);
    halo.position.y = 0.0;
    group.add(halo);
    parent.add(group);
    return { light: lamp, glow: halo, bulb: tubes, base: lightConfig.intensity, flicker: lightConfig.flicker === true, seed: x * 3.1 + z * 1.7 };
  }

  // The fitting hangs off whichever wall is closest, or stands on a pole if there is none near.
  const wallX = Math.abs(x) > 9 ? -Math.sign(x) : 0;
  const wallZ = Math.abs(z) > 9 ? -Math.sign(z) : 0;
  const head = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.1, 0.22, 2, 0.03), DARK_STEEL);
  head.castShadow = true;
  group.add(head);
  const bulb = new THREE.MeshBasicMaterial({ color });
  const lens = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.012, 0.15), bulb);
  lens.position.y = -0.056;
  group.add(lens);

  if (wallX !== 0 || wallZ !== 0) {
    // Arm out of the wall.
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.34), DARK_STEEL);
    if (wallX !== 0) arm.rotation.y = Math.PI / 2;
    arm.position.set(wallX * 0.2, 0.02, wallZ * 0.2);
    group.add(arm);
    head.rotation.y = wallX !== 0 ? Math.PI / 2 : 0;
    lens.rotation.y = head.rotation.y;
  } else {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, y, 10), DARK_STEEL);
    pole.position.y = -y / 2;
    pole.castShadow = true;
    group.add(pole);
  }

  const light = new THREE.PointLight(color, lightConfig.intensity, 24, 2);
  light.position.y = -0.4;
  group.add(light);

  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowMap,
      color,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      opacity: 0.8,
    }),
  );
  glow.scale.setScalar(2.4);
  glow.position.y = -0.1;
  group.add(glow);

  parent.add(group);
  return {
    light,
    glow,
    bulb,
    base: lightConfig.intensity,
    flicker: lightConfig.flicker === true,
    seed: x * 3.1 + z * 1.7,
  };
}

// How long the boards take to fly into place, in ticks.
const BOARD_TICKS = 40;
const PLANK_HEIGHTS = [0.42, 0.92, 1.45, 1.98];

// Door frames, the red lights behind them, the boards that appear when a door is boarded up, and
// the bundles of boards lying on the floor waiting to be found.
function buildDoors(scene: THREE.Scene, level: Level, glowMap: THREE.Texture): (state: GameState, time: number) => void {
  const wood = plankMaterial();
  const frameMaterial = new THREE.MeshStandardMaterial({ color: 0xb59a2e, roughness: 0.55, metalness: 0.35 });
  const nailMaterial = new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.5, metalness: 0.7 });

  const boards: THREE.Group[] = [];
  for (const door of level.doors) {
    const facing = Math.atan2(door.normal.x, door.normal.z);
    const group = new THREE.Group();
    // The inner face of the wall, so the frame stands just proud of it.
    group.position.set(door.position.x + door.normal.x * 0.25, 0, door.position.z + door.normal.z * 0.25);
    group.rotation.y = facing;
    scene.add(group);

    for (const side of [-1, 1]) {
      const jamb = new THREE.Mesh(new RoundedBoxGeometry(0.2, door.height + 0.2, 0.14, 2, 0.02), frameMaterial);
      jamb.position.set(side * (door.width / 2 + 0.1), (door.height + 0.2) / 2, 0.07);
      jamb.castShadow = true;
      group.add(jamb);
    }
    const header = new THREE.Mesh(new RoundedBoxGeometry(door.width + 0.4, 0.2, 0.14, 2, 0.02), frameMaterial);
    header.position.set(0, door.height + 0.1, 0.07);
    header.castShadow = true;
    group.add(header);

    // A dim red light in the dark space behind the door.
    const lamp = new THREE.Group();
    lamp.position.set(door.position.x - door.normal.x * 1.6, 3.2, door.position.z - door.normal.z * 1.6);
    lamp.add(new THREE.PointLight(0xff4a2a, 9, 8, 2));
    const bulb = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: glowMap, color: 0xff3a22, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.7 }),
    );
    bulb.scale.setScalar(0.9);
    lamp.add(bulb);
    scene.add(lamp);

    // The boards, across the opening on the room side.
    const planks = new THREE.Group();
    PLANK_HEIGHTS.forEach((y, index) => {
      const plank = new THREE.Mesh(new RoundedBoxGeometry(door.width + 0.7, 0.21, 0.06, 2, 0.01), wood);
      plank.position.set(index % 2 === 0 ? 0.05 : -0.07, y, 0.2);
      plank.rotation.z = (index % 2 === 0 ? 1 : -1) * (0.025 + index * 0.012);
      plank.castShadow = plank.receiveShadow = true;
      for (const side of [-1, 1]) {
        const nail = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.02, 8), nailMaterial);
        nail.rotation.x = Math.PI / 2;
        nail.position.set(side * (door.width / 2 + 0.05), 0, 0.035);
        plank.add(nail);
      }
      planks.add(plank);
    });
    planks.visible = false;
    group.add(planks);
    boards.push(planks);
  }

  // A bundle of boards on the floor, with a soft pillar of light so it can be found in the dark.
  const beamGeometry = new THREE.CylinderGeometry(0.06, 0.12, 0.55, 12, 1, true);
  const beamColors = new Float32Array(beamGeometry.attributes.position.count * 3);
  for (let i = 0; i < beamGeometry.attributes.position.count; i++) {
    const brightness = 1 - (beamGeometry.attributes.position.getY(i) + 0.275) / 0.55;
    beamColors.set([brightness, 0.78 * brightness, 0.35 * brightness], i * 3);
  }
  beamGeometry.setAttribute('color', new THREE.BufferAttribute(beamColors, 3));
  const beamMaterial = new THREE.MeshBasicMaterial({
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    opacity: 0.5,
  });
  const strapMaterial = new THREE.MeshStandardMaterial({ color: 0x1d1f22, roughness: 0.6, metalness: 0.5 });

  const bundles = level.barricadeBars.map((bar, index) => {
    const group = new THREE.Group();
    group.position.set(bar.x, 0, bar.z);
    group.rotation.y = index * 1.3 + 0.4;
    for (let i = 0; i < 5; i++) {
      const plank = new THREE.Mesh(new RoundedBoxGeometry(1.5, 0.07, 0.2, 2, 0.015), wood);
      plank.position.set((i % 2) * 0.05 - 0.03, 0.04 + Math.floor(i / 2) * 0.075, (i - 2) * 0.1);
      plank.rotation.y = (i - 2) * 0.05;
      plank.castShadow = plank.receiveShadow = true;
      group.add(plank);
    }
    for (const x of [-0.45, 0.45]) {
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.25, 0.7), strapMaterial);
      strap.position.set(x, 0.12, 0);
      group.add(strap);
    }
    const beam = new THREE.Mesh(beamGeometry, beamMaterial.clone());
    beam.position.y = 0.6;
    group.add(beam);
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: glowMap, color: 0xffc860, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.55 }),
    );
    halo.scale.setScalar(0.9);
    halo.position.y = 0.2;
    group.add(halo);
    scene.add(group);
    return { group, beam };
  });

  return (state, time) => {
    boards.forEach((planks, index) => {
      const door = state.doors[index];
      planks.visible = door.boarded;
      if (!door.boarded) return;
      const progress = Math.min(1, (state.tick - door.boardedTick) / BOARD_TICKS);
      planks.children.forEach((plank, order) => {
        // Each plank slams in a little after the one before.
        const local = Math.max(0, Math.min(1, progress * 1.8 - order * 0.2));
        plank.visible = local > 0;
        plank.position.z = 0.2 + (1 - local) * 0.9;
      });
    });
    bundles.forEach(({ group, beam }, index) => {
      group.visible = !state.pickups[index].taken;
      (beam.material as THREE.MeshBasicMaterial).opacity = settings.reducedFlashing ? 0.22 : 0.2 + 0.08 * Math.sin(time * 2.4 + index);
    });
  };
}

function buildSky(scene: THREE.Scene): void {
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(110, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      vertexShader: /* glsl */ `
        varying float height;
        void main() {
          height = normalize(position).y;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying float height;
        void main() {
          vec3 horizon = vec3(0.075, 0.1, 0.15);
          vec3 zenith = vec3(0.012, 0.02, 0.045);
          vec3 color = mix(horizon, zenith, pow(clamp(height, 0.0, 1.0), 0.55));
          gl_FragColor = vec4(color, 1.0);
          #include <colorspace_fragment>
        }
      `,
    }),
  );
  dome.renderOrder = -2;
  scene.add(dome);

  // Stars scattered over the upper sky.
  const count = 700;
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  let seed = 4;
  const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  for (let i = 0; i < count; i++) {
    const azimuth = random() * Math.PI * 2;
    const elevation = Math.asin(0.08 + random() * 0.92);
    positions.set(
      [Math.cos(azimuth) * Math.cos(elevation) * 100, Math.sin(elevation) * 100, Math.sin(azimuth) * Math.cos(elevation) * 100],
      i * 3,
    );
    sizes[i] = random();
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const stars = new THREE.Points(
    starGeometry,
    new THREE.PointsMaterial({ color: 0xcfdcff, size: 1.1, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.75, depthWrite: false }),
  );
  stars.renderOrder = -1;
  scene.add(stars);

  // The moon, in the direction the moonlight comes from.
  const moon = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: glowTexture(), color: 0xc9d8ff, fog: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending }),
  );
  moon.position.set(-27, 79, 18);
  moon.scale.setScalar(26);
  scene.add(moon);
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(3.4, 32),
    new THREE.MeshBasicMaterial({ color: 0xe8efff, fog: false, depthWrite: false }),
  );
  disc.position.copy(moon.position).multiplyScalar(0.95);
  disc.lookAt(0, 0, 0);
  scene.add(disc);

  // A ring of dark buildings far off, with a few lit windows.
  const skyline = new THREE.Group();
  const buildingMaterial = new THREE.MeshBasicMaterial({ color: 0x090c11, fog: false });
  const windowMaterial = new THREE.MeshBasicMaterial({ color: 0xffc77a, fog: false });
  const windowGeometry = new THREE.PlaneGeometry(0.9, 1.2);
  for (let i = 0; i < 40; i++) {
    const angle = (i / 40) * Math.PI * 2 + random() * 0.1;
    const distance = 88 + random() * 14;
    const width = 6 + random() * 10;
    const height = 14 + random() * 34;
    const building = new THREE.Mesh(new THREE.BoxGeometry(width, height, width * (0.6 + random() * 0.5)), buildingMaterial);
    building.position.set(Math.cos(angle) * distance, height / 2 - 1, Math.sin(angle) * distance);
    building.lookAt(0, building.position.y, 0);
    skyline.add(building);
    const depth = building.geometry.parameters.depth;
    for (let w = 0; w < 7; w++) {
      if (random() < 0.45) continue;
      const lit = new THREE.Mesh(windowGeometry, windowMaterial);
      lit.position.set((random() - 0.5) * (width - 2), (random() - 0.5) * (height - 3), depth / 2 + 0.05);
      building.add(lit);
    }
  }
  scene.add(skyline);
}

// Pipes, ducts and signs along the garage ceiling and walls.
function buildGarageDressing(scene: THREE.Scene, level: Level): void {
  const duct = new THREE.MeshStandardMaterial({ color: 0x8b9096, roughness: 0.5, metalness: 0.7 });
  const pipeRed = new THREE.MeshStandardMaterial({ color: 0x9c2a22, roughness: 0.5, metalness: 0.5 });
  const ceilingY = 4.5;

  // Two big pipes and a duct running across the ceiling.
  for (const [z, material, radius] of [[-3.6, pipeRed, 0.11], [3.4, DARK_STEEL, 0.14]] as const) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 19.6, 14), material);
    pipe.rotation.z = Math.PI / 2;
    pipe.position.set(0, ceilingY - 0.3, z);
    pipe.castShadow = true;
    scene.add(pipe);
    for (let x = -9; x <= 9; x += 3) {
      const hanger = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.25, 0.05), STEEL);
      hanger.position.set(x, ceilingY - 0.15, z);
      scene.add(hanger);
    }
  }
  const ductBox = new THREE.Mesh(new RoundedBoxGeometry(0.7, 0.42, 19.4, 2, 0.03), duct);
  ductBox.position.set(-7, ceilingY - 0.32, 0);
  ductBox.castShadow = true;
  scene.add(ductBox);
  for (let z = -8; z <= 8; z += 4) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.48, 0.08), STEEL);
    band.position.set(-7, ceilingY - 0.32, z);
    scene.add(band);
  }
  // A cable tray along the east side.
  const tray = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 19.4), DARK_STEEL);
  tray.position.set(7, ceilingY - 0.2, 0);
  scene.add(tray);

  // A hazard-striped skirting along the foot of the walls, broken at each opening, is left to the
  // wall texture; the signs are separate.
  const sign = (text: string, sub: string, background: string, x: number, y: number, z: number, rotation: number, w: number, h: number) => {
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: labelTexture([{ text, size: 90, color: '#ffffff' }, { text: sub, size: 44, color: '#ffd24a' }], background, 768, 256, '#ffffff') }),
    );
    face.position.set(x, y, z);
    face.rotation.y = rotation;
    scene.add(face);
  };
  // Over the gate, pointing up the ramp, and on the east wall by the loading dock.
  sign('EXIT', 'RAMP  \u25B2  STREET', '#0f3a24', level.gate.position.x, 3.85, 9.97, Math.PI, 2.4, 0.8);
  sign('LOADING DOCK', 'DELIVERIES ONLY', '#1d3f73', 9.97, 3.5, -6, -Math.PI / 2, 2.6, 0.9);
  sign('B1', 'PARKING', '#1d3f73', -9.97, 3.5, 2, Math.PI / 2, 1.6, 0.8);

  // Roller shutters on the east wall, shut, with yellow bumpers: the dock doors.
  const shutter = new THREE.MeshStandardMaterial({ color: 0x8b9096, roughness: 0.5, metalness: 0.6 });
  for (const z of [-8.4]) {
    const door = new THREE.Mesh(new RoundedBoxGeometry(0.1, 2.9, 3, 2, 0.02), shutter);
    door.position.set(9.92, 1.7, z + 2.6);
    scene.add(door);
    const hazard = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 3.1), hazardMaterial());
    hazard.position.set(9.9, 0.35, z + 2.6);
    scene.add(hazard);
  }
}

// Builds the level from the level file: the garage, the ramp and the street above it, the lamps,
// decals, doors, gate, and the night sky.
export function buildWorld(scene: THREE.Scene, level: Level, environment: THREE.Texture): World {
  const staticProps = new THREE.Group();
  scene.add(staticProps);
  level.boxes.forEach((box, index) => {
    const object = buildBoxObject(box, index);
    if (object) staticProps.add(object);
  });
  bakeStaticMeshes(staticProps);
  for (const ladder of level.ladders) scene.add(buildLadder(ladder));

  // Ground beyond everything, so there is no void.
  const outside = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400),
    new THREE.MeshBasicMaterial({ color: 0x090c10 }),
  );
  outside.rotation.x = -Math.PI / 2;
  outside.position.y = -0.52;
  scene.add(outside);

  const decal = new THREE.Mesh(
    new THREE.PlaneGeometry(21, 21),
    new THREE.MeshStandardMaterial({
      map: floorDecalTexture(),
      transparent: true,
      roughness: 0.95,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    }),
  );
  decal.rotation.x = -Math.PI / 2;
  decal.position.y = 0.002;
  decal.receiveShadow = true;
  scene.add(decal);

  // Wet patches that catch the lamplight.
  const puddleMaterial = new THREE.MeshStandardMaterial({
    color: 0x1b2430,
    roughness: 0.04,
    metalness: 0.1,
    envMap: environment,
    envMapIntensity: 1.6,
    opacity: 0.9,
    alphaMap: puddleAlphaTexture(),
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
  });
  for (const [x, z, size] of [[-1.5, 6.5, 3.2], [6.5, 0, 2.6], [-3.5, -8, 2.2], [1, -3.5, 2.4]]) {
    const puddle = new THREE.Mesh(new THREE.PlaneGeometry(size, size), puddleMaterial);
    puddle.rotation.x = -Math.PI / 2;
    puddle.rotation.z = x * 1.7;
    puddle.position.set(x, 0.004, z);
    scene.add(puddle);
  }

  buildGarageDressing(scene, level);
  const detailProps = new THREE.Group(); scene.add(detailProps);
  const animateDressing = buildDressing(detailProps, level);
  bakeStaticMeshes(detailProps);

  const lampGroup = new THREE.Group();
  scene.add(lampGroup);
  const glowMap = glowTexture();
  const lamps = level.lights.map((light) => buildLamp(light, glowMap, lampGroup));

  buildSky(scene);
  buildStreet(scene, level, glowMap);
  const syncDoors = buildDoors(scene, level, glowMap);
  const syncGate = buildGate(scene, level, glowMap);

  return {
    update(time, state) {
      animateDressing(time);
      syncDoors(state, time);
      syncGate(state, time);
      for (const lamp of lamps) {
        let brightness = 1;
        if (lamp.flicker && !settings.reducedFlashing) {
          // Mostly steady, with short bursts of stutter.
          const burst = Math.sin(time * 1.3 + lamp.seed) > 0.82;
          brightness = burst ? 0.25 + 0.75 * Math.abs(Math.sin(time * 47 + lamp.seed)) : 1;
          if (Math.sin(time * 0.37 + lamp.seed) > 0.97) brightness = 0.08;
        }
        lamp.light.intensity = lamp.base * brightness;
        lamp.glow.material.opacity = 0.22 * brightness;
        lamp.bulb.color.copy(lamp.light.color).multiplyScalar(0.25 + 0.75 * brightness);
      }
    },
  };
}
