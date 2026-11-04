import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { AXLE_Y, CAR, createElCajon, WHEEL_X } from './elCajon';
import { createSedan, createVan, type Fit } from './vehicleModels';
import type { LevelBox } from '../levels/types';
import { cardboardMaterial, hazardMaterial, labelTexture } from './streetTextures';

const round = (w: number, h: number, d: number, r: number) => new RoundedBoxGeometry(w, h, d, 3, r);
function add(parent: THREE.Object3D, mesh: THREE.Mesh, x: number, y: number, z: number, shadows = true): THREE.Mesh {
  mesh.position.set(x, y, z); mesh.castShadow = shadows; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
// The El Cajon, scaled to fill its box. It is built facing +z with the lowest point of its tyres at
// y -0.676, so it is stood on the ground and turned to face the bay's aisle.
function buildElCajonVehicle(box: LevelBox): THREE.Group {
  const model = createElCajon();
  const car = new THREE.Group();
  car.add(model.body);
  [[-1, CAR.wheelRearZ], [1, CAR.wheelRearZ], [-1, CAR.wheelFrontZ], [1, CAR.wheelFrontZ]].forEach(([side, z], i) => {
    const wheel = model.wheels[i];
    wheel.position.set(side * WHEEL_X, AXLE_Y, z);
    car.add(wheel);
  });
  car.position.y = CAR.wheelRadius - AXLE_Y;
  const fit = new THREE.Group();
  fit.add(car);
  // The shell is about 5.1 m long; the box says how long it should be.
  fit.scale.setScalar(Math.max(box.size.x, box.size.z) / 5.1);
  const group = new THREE.Group();
  group.name = 'El Cajon';
  group.add(fit);
  group.position.set(box.position.x, box.position.y - box.size.y / 2, box.position.z);
  // Facing the drive aisle: west from the east side of the street.
  group.rotation.y = box.size.x > box.size.z ? (box.position.x < 0 ? Math.PI / 2 : -Math.PI / 2) : 0;
  return group;
}

const templates = new Map<string, { body: THREE.Group; fit: Fit }>();
let tyre: THREE.Mesh | null = null;

// One finished tyre and rim, built once: the El Cajon's, which every vehicle borrows and scales.
function tyreTemplate(): THREE.Mesh {
  if (!tyre) tyre = createElCajon().wheels[0];
  return tyre;
}

// A saloon, estate, van or ambulance, sized to its box and facing the way its place requires.
export function buildVehicle(box: LevelBox): THREE.Group {
  if (box.vehicleRole === 'elCajon') return buildElCajonVehicle(box);
  const van = box.surface === 'van';
  const estate = !van && box.size.y > 1.6;
  const alongX = box.size.x > box.size.z;
  const length = alongX ? box.size.x : box.size.z;
  const width = alongX ? box.size.z : box.size.x;
  const height = box.size.y;
  const ambulance = box.vehicleRole === 'ambulance';
  const key = [van ? 'van' : estate ? 'estate' : 'saloon', ambulance, box.color, length, width, height].join('|');
  let template = templates.get(key);
  if (!template) {
    template = van ? createVan({ length, width, height, color: box.color, ambulance }) : createSedan({ length, width, height, color: box.color, estate });
    templates.set(key, template);
  }
  const model = new THREE.Group();
  model.name = template.body.name;
  model.add(template.body.clone());
  for (const side of [-1, 1]) for (const z of template.fit.axles) {
    const wheel = tyreTemplate().clone();
    wheel.scale.setScalar(template.fit.radius / 0.39);
    wheel.position.set(side * template.fit.track, template.fit.radius, z);
    model.add(wheel);
  }
  // The models face +z; the old placement turns -z toward the front, so the model is turned round.
  model.rotation.y = Math.PI;
  const group = new THREE.Group();
  group.name = model.name;
  group.add(model);
  group.position.set(box.position.x, box.position.y - height / 2, box.position.z);
  // Lanes face opposite directions. Parking bays face the drive aisle; nothing floats above its datum.
  const surfaceBay = group.position.y > 4 && box.position.z < 35;
  group.rotation.y = alongX ? (surfaceBay ? (box.position.x < 0 ? -Math.PI / 2 : Math.PI / 2)
    : box.position.z > 41 ? Math.PI / 2 : -Math.PI / 2) : (box.position.x < 0 ? Math.PI : 0);
  return group;
}

export function buildCartons(box: LevelBox): THREE.Group {
  const group = new THREE.Group();
  group.position.set(box.position.x, box.position.y - box.size.y / 2, box.position.z);
  const wood = new THREE.MeshStandardMaterial({ color: 0x8f6c3f, roughness: 0.9 });
  const cardboard = cardboardMaterial();
  const tape = new THREE.MeshStandardMaterial({ color: 0xd8c59a, roughness: 0.5 });

  const palletHeight = 0.14;
  for (const z of [-0.5, 0, 0.5]) {
    add(group, new THREE.Mesh(new THREE.BoxGeometry(box.size.x, 0.04, 0.16), wood), 0, palletHeight - 0.02, z * (box.size.z - 0.16) / 1);
    add(group, new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, box.size.z), wood), z * (box.size.x - 0.16), 0.05, 0);
  }
  const layers = Math.max(1, Math.floor((box.size.y - palletHeight) / 0.4));
  const cartonHeight = (box.size.y - palletHeight) / layers;
  for (let layer = 0; layer < layers; layer++) {
    for (const x of [-1, 1]) {
      for (const z of [-1, 1]) {
        const carton = add(
          group,
          new THREE.Mesh(round(box.size.x / 2 - 0.02, cartonHeight - 0.015, box.size.z / 2 - 0.02, 0.012), cardboard),
          x * (box.size.x / 4),
          palletHeight + cartonHeight * (layer + 0.5),
          z * (box.size.z / 4),
        );
        carton.rotation.y = (((layer + x + z) % 3) - 1) * 0.015;
      }
    }
    add(group, new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.003, box.size.z - 0.1), tape), 0, palletHeight + cartonHeight * (layer + 1) + 0.002, 0, false);
  }
  const wrap = new THREE.Mesh(
    round(box.size.x + 0.02, box.size.y - palletHeight + 0.01, box.size.z + 0.02, 0.03),
    new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, roughness: 0.08, clearcoat: 1, depthWrite: false }),
  );
  wrap.position.set(0, palletHeight + (box.size.y - palletHeight) / 2, 0);
  group.add(wrap);
  return group;
}

// A column with a striped base and a number plate.
export function buildPillar(box: LevelBox, concrete: THREE.Material, index: number): THREE.Group {
  const group = new THREE.Group();
  group.position.set(box.position.x, box.position.y - box.size.y / 2, box.position.z);
  const geometry = new THREE.BoxGeometry(box.size.x, box.size.y, box.size.z);
  const column = new THREE.Mesh(geometry, concrete);
  column.position.y = box.size.y / 2;
  column.castShadow = column.receiveShadow = true;
  group.add(column);

  const hazard = hazardMaterial();
  hazard.map!.wrapS = hazard.map!.wrapT = THREE.RepeatWrapping;
  hazard.map!.repeat.set(1, 1);
  const band = new THREE.Mesh(new THREE.BoxGeometry(box.size.x + 0.03, 1, box.size.z + 0.03), hazard);
  band.position.y = 0.5;
  band.receiveShadow = true;
  group.add(band);

  const plate = new THREE.MeshStandardMaterial({
    map: labelTexture([{ text: `B1-${index + 1}`, size: 64, color: '#ffffff' }], '#1d4f8f', 192, 96, '#ffffff'),
    roughness: 0.6,
  });
  for (const z of [-1, 1]) {
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.2), plate);
    sign.position.set(0, 2.2, z * (box.size.z / 2 + 0.005));
    if (z < 0) sign.rotation.y = Math.PI;
    group.add(sign);
  }
  return group;
}
