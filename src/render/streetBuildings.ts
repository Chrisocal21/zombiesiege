import * as THREE from 'three';
import type { Level } from '../levels/types';
import { placeModel } from './models';

// The real buildings around the street outside the garage. They stand on the level's hidden
// building boxes, which stay the solid walls, so each one is lined up with its front flush on
// the face of its box that looks onto the street. A few more stand further back for a skyline.

type Front = '+x' | '-x' | '-z';

interface Placement {
  model: string;
  // Which way its front looks, onto the street.
  front: Front;
  // Where its front sits: x for fronts looking along x, z for the one looking along z.
  plane: number;
  // The middle of its front, along the street.
  along: number;
}

// Turns a model so the face it was built with on -z looks the given way.
const TURN: Record<Front, number> = { '+x': -Math.PI / 2, '-x': Math.PI / 2, '-z': 0 };

const STREET: Placement[] = [
  // Across the road.
  { model: 'building-big-wide-01', front: '-z', plane: 48, along: -18.8 },
  { model: 'building-big-wide-02', front: '-z', plane: 48, along: 17.2 },
  // The left side, looking from the garage.
  { model: 'building-big-01', front: '+x', plane: -26, along: 22 },
  { model: 'building-small', front: '+x', plane: -26, along: 40 },
  // The right side.
  { model: 'building-medium-02', front: '-x', plane: 26, along: 18.5 },
  { model: 'building-medium-01', front: '-x', plane: 26, along: 33.5 },
  { model: 'building-small', front: '-x', plane: 26, along: 46.5 },
];

// Further back, over the rooftops: the towers.
const SKYLINE: { model: string; x: number; z: number; turn: number }[] = [
  { model: 'skyscraper-01', x: -48, z: 86, turn: 0.3 },
  { model: 'skyscraper-02', x: 30, z: 98, turn: -0.2 },
  { model: 'building-big-01', x: -6, z: 112, turn: 0.1 },
  { model: 'skyscraper-02', x: 70, z: 62, turn: 0.7 },
  { model: 'skyscraper-01', x: -75, z: 40, turn: -0.5 },
];

const box = new THREE.Box3();

// Turns the model, then moves it so its base is on the ground and its front on the plane.
function stand(model: THREE.Object3D, place: Placement, ground: number): void {
  model.rotation.y = TURN[place.front];
  model.position.set(0, 0, 0);
  model.updateMatrixWorld(true);
  box.setFromObject(model);
  const centreX = (box.min.x + box.max.x) / 2, centreZ = (box.min.z + box.max.z) / 2;
  model.position.y = ground - box.min.y;
  if (place.front === '-z') model.position.set(place.along - centreX, model.position.y, place.plane - box.min.z);
  else if (place.front === '+x') model.position.set(place.plane - box.max.x, model.position.y, place.along - centreZ);
  else model.position.set(place.plane - box.min.x, model.position.y, place.along - centreZ);
}

function prepare(model: THREE.Object3D): THREE.Object3D {
  model.traverse((object) => {
    // Far too big to cast shadows from the street lamps; they still take the light.
    if (object instanceof THREE.Mesh) object.receiveShadow = true;
  });
  return model;
}

export function buildStreetBuildings(scene: THREE.Object3D, level: Level): void {
  const ground = level.ramp?.rise ?? 0;
  const group = new THREE.Group();
  group.name = 'Street buildings';
  scene.add(group);
  for (const place of STREET) {
    void placeModel(`/models/city/${place.model}.glb`).then((model) => {
      stand(prepare(model), place, ground);
      group.add(model);
    });
  }
  for (const tower of SKYLINE) {
    void placeModel(`/models/city/${tower.model}.glb`).then((model) => {
      prepare(model).rotation.y = tower.turn;
      model.updateMatrixWorld(true);
      box.setFromObject(model);
      model.position.set(tower.x, ground - box.min.y, tower.z);
      group.add(model);
    });
  }
}
