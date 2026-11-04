import * as THREE from 'three';
import type { Level } from '../levels/types';
import { placeModel } from './models';
import { bakeStaticMeshes } from './bake';
import { surfaceMaterial } from './materials';
import { hazardMaterial, labelTexture, shutterMaterial } from './streetTextures';

type Front = '+x' | '-x' | '-z';

interface Frontage {
  model: string;
  front: Front;
  plane: number;
  from: number;
  to: number;
  copies?: number;
  base?: number;
  reverse?: boolean;
  shops?: string[];
}

// These spans follow the solid blocks in level0. The road at z=35.5..46.5 passes UNDER
// the side blocks, whose collision starts eight metres above the street. Repeat whole
// models to fill a block; scale uniformly so windows keep their proportions.
const FRONTAGES: Frontage[] = [
  { model: 'building-big-wide-01', front: '-z', plane: 48, from: -40, to: 0, copies: 2, shops: ['NORTHLINE OFFICES', 'CORNER MARKET'] },
  { model: 'building-big-wide-02', front: '-z', plane: 48, from: 0, to: 40, copies: 2, shops: ['METRO HOUSE', 'NIGHT OWL CAFE'] },
  { model: 'building-big-01', front: '+x', plane: -26, from: 10, to: 23, shops: ['WEST END HOUSE'] },
  { model: 'building-small', front: '+x', plane: -26, from: 23, to: 35.5, reverse: true, shops: ['NORTHLINE PHARMACY'] },
  { model: 'building-medium-02', front: '-x', plane: 26, from: 10, to: 23, shops: ['RIVERSIDE HOUSE'] },
  { model: 'building-medium-01', front: '-x', plane: 26, from: 23, to: 35.5, shops: ['24 / SEVEN MARKET'] },
  { model: 'building-small', front: '+x', plane: -26, from: 35.5, to: 48, base: 8, reverse: true },
  { model: 'building-small', front: '-x', plane: 26, from: 35.5, to: 48, base: 8, reverse: true },
];

const TURN: Record<Front, number> = { '+x': -Math.PI / 2, '-x': Math.PI / 2, '-z': 0 };
const SKYLINE = [
  { model: 'skyscraper-01', x: -49, z: 88, scale: 0.68 },
  { model: 'skyscraper-02', x: 29, z: 96, scale: 0.72 },
  { model: 'building-big-01', x: -7, z: 106, scale: 0.85 },
  { model: 'skyscraper-02', x: 67, z: 68, scale: 0.65 },
  { model: 'skyscraper-01', x: -67, z: 48, scale: 0.62 },
];

function block(parent: THREE.Object3D, w: number, h: number, d: number, x: number, y: number, z: number, material: THREE.Material): void {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.receiveShadow = true;
  parent.add(mesh);
}

// Local +z faces the street. Solid decoration stays behind the collision face.
function faceGroup(front: Front, plane: number, along: number, ground: number): THREE.Group {
  const group = new THREE.Group();
  group.rotation.y = TURN[front] + Math.PI;
  group.position.set(front === '-z' ? along : plane, ground, front === '-z' ? plane : along);
  return group;
}

function sign(parent: THREE.Object3D, text: string, sub: string, width: number, y: number, z: number): void {
  const face = new THREE.Mesh(new THREE.PlaneGeometry(width, 0.65), new THREE.MeshStandardMaterial({
    map: labelTexture([{ text, size: 68, color: '#e4e4d9' }, { text: sub, size: 24, color: '#c9aa68' }], '#1d3339', 1024, 128),
    roughness: 0.75,
  }));
  face.position.set(0, y, z);
  parent.add(face);
}

function shopfront(parent: THREE.Object3D, width: number, name: string): void {
  const stone = surfaceMaterial('plain', '#767b7b');
  const frame = new THREE.MeshStandardMaterial({ color: '#25353a', roughness: 0.65, metalness: 0.45 });
  const glass = new THREE.MeshStandardMaterial({ color: '#23353e', roughness: 0.28, metalness: 0.3 });
  const shutter = shutterMaterial();
  // Cover the imported blank pedestal with recessed bays, a door, transoms and a fascia.
  block(parent, width, 4.15, 1.5, 0, 2.075, -0.76, stone);
  const bays = Math.max(3, Math.round(width / 3.2));
  const bayWidth = width / bays;
  for (let i = 0; i < bays; i++) {
    const x = -width / 2 + bayWidth * (i + 0.5);
    const door = i === Math.floor(bays / 2);
    block(parent, bayWidth - 0.28, 2.8, 0.08, x, 1.6, -0.1, frame);
    block(parent, bayWidth - 0.48, 2.55, 0.04, x, 1.6, -0.045, door ? glass : shutter);
    block(parent, bayWidth - 0.48, 0.37, 0.04, x, 2.65, -0.02, glass);
    if (door) {
      block(parent, 0.06, 2.55, 0.05, x, 1.6, -0.02, frame);
      for (const side of [-1, 1]) block(parent, 0.035, 0.34, 0.035, x + side * 0.13, 1.25, 0, stone);
    }
  }
  block(parent, width, 0.88, 0.18, 0, 3.55, -0.08, frame);
  block(parent, width, 0.14, 0.75, 0, 4.05, -0.37, frame);
  sign(parent, name, 'NORTHLINE  /  CITY CENTRE', Math.min(width - 0.8, 8), 3.55, 0.015);
}

function roadPortal(parent: THREE.Object3D, side: number, ground: number): void {
  const front: Front = side < 0 ? '+x' : '-x';
  const group = faceGroup(front, side * 26, 41.75, ground);
  group.name = side < 0 ? 'Old Town road portal' : 'Riverside road portal';
  parent.add(group);
  const stone = surfaceMaterial('wall', '#666c6b');
  const trim = new THREE.MeshStandardMaterial({ color: '#343e43', roughness: 0.72 });
  const hazard = hazardMaterial();
  // Lintel and tunnel lining match the elevated solid and the walls on either side.
  block(group, 12.5, 1.1, 8, 0, 8.55, -4, stone);
  block(group, 12.5, 0.22, 0.3, 0, 8.11, -0.15, trim);
  for (const z of [35.35, 47.25]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(8, 8, z > 46 ? 1.5 : 0.3), stone);
    wall.position.set(side * 30, ground + 4, z);
    wall.receiveShadow = true;
    parent.add(wall);
  }
  const board = new THREE.Group();
  board.position.set(0, 0, -0.2);
  group.add(board);
  block(board, 7, 1.15, 0.18, 0, 6.7, -0.1, trim);
  sign(board, side < 0 ? 'OLD TOWN' : 'RIVERSIDE', 'ROAD CLOSED  /  EVACUATION IN EFFECT', 6.6, 6.7, 0);
  for (const x of [-2.5, 2.5]) block(board, 0.07, 0.8, 0.07, x, 7.6, -0.1, trim);
  // The existing concrete barrier at x=33.5 closes the back of the passage.
  const closure = faceGroup(front, side * 33.24, 41, ground);
  parent.add(closure);
  block(closure, 9.8, 0.3, 0.04, 0, 1.9, 0, hazard);
  sign(closure, 'ROAD CLOSED', 'EMERGENCY ACCESS ONLY', 4.5, 1.15, 0.01);
  // Ceiling strips reveal the depth without additional point lights.
  const light = new THREE.MeshBasicMaterial({ color: '#c4b78c' });
  for (const x of [-4.4, 3.5]) block(group, 0.12, 0.025, 5.5, x, 7.96, -3.8, light);
}

export async function buildStreetBuildings(scene: THREE.Object3D, level: Level): Promise<void> {
  const ground = level.ramp?.rise ?? 0;
  const group = new THREE.Group();
  group.name = 'Street buildings';
  scene.add(group);
  const details = new THREE.Group();
  details.name = 'Street building shopfronts and portals';
  group.add(details);
  for (const side of [-1, 1]) roadPortal(details, side, ground);

  await Promise.all(FRONTAGES.map(async (frontage) => {
    const copies = frontage.copies ?? 1;
    const width = (frontage.to - frontage.from) / copies;
    const template = await placeModel(`/models/city/${frontage.model}.glb`);
    for (let i = 0; i < copies; i++) {
      const model = template.clone(true);
      model.rotation.y = TURN[frontage.front] + (frontage.reverse ? Math.PI : 0);
      model.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(model);
      const size = bounds.getSize(new THREE.Vector3());
      const scale = width / (frontage.front === '-z' ? size.x : size.z);
      model.scale.setScalar(scale);
      model.updateMatrixWorld(true);
      bounds.setFromObject(model);
      const centre = bounds.getCenter(new THREE.Vector3());
      const along = frontage.from + width * (i + 0.5);
      const base = ground + (frontage.base ?? 0);
      model.position.y = base - bounds.min.y;
      if (frontage.front === '-z') model.position.set(along - centre.x, model.position.y, frontage.plane - bounds.min.z);
      else if (frontage.front === '+x') model.position.set(frontage.plane - bounds.max.x, model.position.y, along - centre.z);
      else model.position.set(frontage.plane - bounds.min.x, model.position.y, along - centre.z);
      model.name = `${frontage.model} ${frontage.front} ${i} ${frontage.from}`;
      model.userData.streetFrontage = { ...frontage, from: along - width / 2, to: along + width / 2, base };
      model.traverse(object => { if (object instanceof THREE.Mesh) object.receiveShadow = true; });
      group.add(model);

      const facade = faceGroup(frontage.front, frontage.plane, along, base);
      details.add(facade);
      // Bounds include cornices and fire escapes. Recessed party walls close the narrow
      // seams between the inset walls of neighbouring models, including their ground floors.
      const height = bounds.max.y - bounds.min.y;
      block(facade, width, height - 0.4, 0.4, 0, (height - 0.4) / 2, -2,
        surfaceMaterial('plain', frontage.model.includes('wide') ? '#8b8e8b' : '#535953'));
      if (frontage.shops) shopfront(facade, width, frontage.shops[i]);
    }
  }));
  bakeStaticMeshes(details);

  await Promise.all(SKYLINE.map(async (tower) => {
    const model = await placeModel(`/models/city/${tower.model}.glb`);
    model.scale.setScalar(tower.scale);
    model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model);
    const centre = bounds.getCenter(new THREE.Vector3());
    model.position.set(tower.x - centre.x, ground - bounds.min.y, tower.z - centre.z);
    model.name = `Skyline ${tower.model}`;
    group.add(model);
  }));
}
