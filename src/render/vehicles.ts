import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { LevelBox } from '../levels/types';
import { cardboardMaterial, hazardMaterial, labelTexture } from './streetTextures';

const GLASS = new THREE.MeshPhysicalMaterial({ color: 0x0d141c, roughness: 0.06, metalness: 0.2, clearcoat: 1, envMapIntensity: 3 });
const TYRE = new THREE.MeshStandardMaterial({ color: 0x131314, roughness: 0.85 });
const RIM = new THREE.MeshStandardMaterial({ color: 0xa6abb2, roughness: 0.3, metalness: 0.9 });
const TRIM = new THREE.MeshStandardMaterial({ color: 0x17181a, roughness: 0.6, metalness: 0.2 });
const HEADLIGHT = new THREE.MeshBasicMaterial({ color: 0xcfd8e6 });
const TAILLIGHT = new THREE.MeshBasicMaterial({ color: 0x8c1414 });

const round = (w: number, h: number, d: number, r: number) => new RoundedBoxGeometry(w, h, d, 3, r);

function wheel(radius: number, width: number): THREE.Group {
  const group = new THREE.Group();
  const tyre = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 20), TYRE);
  tyre.rotation.z = Math.PI / 2;
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.62, radius * 0.62, width + 0.01, 14), RIM);
  rim.rotation.z = Math.PI / 2;
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.2, radius * 0.2, width + 0.03, 8), TRIM);
  hub.rotation.z = Math.PI / 2;
  for (const part of [tyre, rim, hub]) part.castShadow = true;
  group.add(tyre, rim, hub);
  return group;
}

function add(parent: THREE.Object3D, mesh: THREE.Mesh, x: number, y: number, z: number, shadows = true): THREE.Mesh {
  mesh.position.set(x, y, z);
  mesh.castShadow = shadows;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

// A parked car fitted into the box the rules use for it. Built nose toward -z, then turned to
// whichever way the box lies.
export function buildVehicle(box: LevelBox): THREE.Group {
  const van = box.surface === 'van';
  const alongX = box.size.x > box.size.z;
  const length = alongX ? box.size.x : box.size.z;
  const width = alongX ? box.size.z : box.size.x;
  const height = box.size.y;

  const paint = new THREE.MeshPhysicalMaterial({
    color: box.color,
    metalness: 0.45,
    roughness: 0.4,
    clearcoat: 0.9,
    clearcoatRoughness: 0.2,
    envMapIntensity: 1.6,
  });
  const body = new THREE.Group();
  const wheelRadius = van ? 0.36 : 0.33;

  for (const x of [-1, 1]) {
    for (const z of [-1, 1]) {
      const w = wheel(wheelRadius, 0.24);
      w.position.set(x * (width / 2 - 0.1), wheelRadius, z * length * 0.33);
      body.add(w);
    }
  }

  if (van) {
    const lower = wheelRadius * 0.8;
    const shell = add(body, new THREE.Mesh(round(width * 0.98, height - lower - 0.04, length * 0.98, 0.14), paint), 0, lower + (height - lower - 0.04) / 2, 0);
    shell.scale.set(1, 1, 1);
    // Windscreen and side windows along the cab, at the front.
    add(body, new THREE.Mesh(round(width * 0.86, height * 0.28, 0.05, 0.02), GLASS), 0, height * 0.7, -length * 0.49, false);
    for (const side of [-1, 1]) {
      add(body, new THREE.Mesh(round(0.04, height * 0.26, length * 0.2, 0.015), GLASS), side * width * 0.495, height * 0.7, -length * 0.3, false);
    }
    // A sliding door's seam, and a roof rail.
    for (const side of [-1, 1]) {
      add(body, new THREE.Mesh(new THREE.BoxGeometry(0.01, height * 0.6, 0.012), TRIM), side * width * 0.495, height * 0.52, -length * 0.1, false);
      add(body, new THREE.Mesh(new THREE.BoxGeometry(0.01, height * 0.6, 0.012), TRIM), side * width * 0.495, height * 0.52, length * 0.12, false);
    }
    add(body, new THREE.Mesh(round(width * 0.7, 0.06, length * 0.6, 0.02), TRIM), 0, height - 0.02, length * 0.12);
  } else {
    const lowerHeight = height * 0.4;
    const lowerBottom = 0.24;
    add(body, new THREE.Mesh(round(width * 0.98, lowerHeight, length * 0.99, 0.12), paint), 0, lowerBottom + lowerHeight / 2, 0);
    // The cabin: dark glass, with a painted roof and pillars.
    const cabinBottom = lowerBottom + lowerHeight - 0.02;
    const cabinHeight = height - cabinBottom;
    const cabinLength = length * 0.52;
    const cabinZ = length * 0.06;
    add(body, new THREE.Mesh(round(width * 0.84, cabinHeight, cabinLength, 0.1), GLASS), 0, cabinBottom + cabinHeight / 2, cabinZ, false);
    add(body, new THREE.Mesh(round(width * 0.82, 0.07, cabinLength * 0.86, 0.03), paint), 0, height - 0.03, cabinZ);
    for (const side of [-1, 1]) {
      for (const z of [-0.5, 0.02, 0.5]) {
        add(body, new THREE.Mesh(new THREE.BoxGeometry(0.03, cabinHeight * 0.92, 0.07), paint), side * width * 0.415, cabinBottom + cabinHeight / 2, cabinZ + z * cabinLength * 0.92, false);
      }
      add(body, new THREE.Mesh(new THREE.BoxGeometry(0.01, lowerHeight * 0.75, 0.012), TRIM), side * width * 0.49, lowerBottom + lowerHeight / 2, cabinZ - 0.02, false);
      add(body, new THREE.Mesh(new THREE.BoxGeometry(0.01, lowerHeight * 0.75, 0.012), TRIM), side * width * 0.49, lowerBottom + lowerHeight / 2, cabinZ + cabinLength * 0.45, false);
      // Door mirrors.
      add(body, new THREE.Mesh(round(0.1, 0.07, 0.05, 0.015), paint), side * (width / 2 + 0.03), cabinBottom + 0.05, cabinZ - cabinLength * 0.48);
    }
  }

  // Bumpers, grille and lights.
  const bumperY = van ? 0.38 : 0.34;
  add(body, new THREE.Mesh(round(width * 0.98, 0.12, 0.1, 0.03), TRIM), 0, bumperY, -length / 2 + 0.02);
  add(body, new THREE.Mesh(round(width * 0.98, 0.12, 0.1, 0.03), TRIM), 0, bumperY, length / 2 - 0.02);
  for (const side of [-1, 1]) {
    add(body, new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.09, 0.03), HEADLIGHT), side * width * 0.34, bumperY + 0.22, -length / 2 + 0.01, false);
    add(body, new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.09, 0.03), TAILLIGHT), side * width * 0.34, bumperY + 0.22, length / 2 - 0.01, false);
  }
  add(body, new THREE.Mesh(new THREE.BoxGeometry(width * 0.34, 0.1, 0.03), TRIM), 0, bumperY + 0.2, -length / 2 + 0.01, false);
  add(body, new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.02), new THREE.MeshStandardMaterial({ color: 0xe4e2d4, roughness: 0.6 })), 0, bumperY + 0.2, length / 2 - 0.005, false);

  const group = new THREE.Group();
  group.add(body);
  group.position.set(box.position.x, box.position.y - height / 2, box.position.z);
  // The car is built along z; a box lying along x turns it a quarter, and which way it faces
  // is varied a little so a row of cars does not look stamped.
  const variation = Math.sin(box.position.x * 3.7 + box.position.z * 1.3) > 0 ? 0 : Math.PI;
  group.rotation.y = (alongX ? Math.PI / 2 : 0) + variation;
  return group;
}

// Cartons stacked on a pallet and wrapped in clear film.
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
  hazard.map!.repeat.set(3, 1.5);
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
