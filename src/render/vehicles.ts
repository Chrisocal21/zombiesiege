import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { LevelBox } from '../levels/types';
import { cardboardMaterial, hazardMaterial, labelTexture } from './streetTextures';
import { paintTexture } from './materials';

const GLASS = new THREE.MeshPhysicalMaterial({ color: '#263b48', roughness: 0.12, metalness: 0.18, clearcoat: 1, envMapIntensity: 1.6, transparent: true, opacity: 0.83, depthWrite: false, side: THREE.DoubleSide });
const CAB_GLASS = new THREE.MeshPhysicalMaterial({ color: '#142630', roughness: 0.18, metalness: 0.1, clearcoat: 0.75, envMapIntensity: 0.8, side: THREE.DoubleSide });
const TYRE = new THREE.MeshStandardMaterial({ color: '#17191b', roughness: 0.92 });
const RIM = new THREE.MeshStandardMaterial({ color: '#9da4aa', roughness: 0.32, metalness: 0.85 });
const BRAKE = new THREE.MeshStandardMaterial({ color: '#454a4d', roughness: 0.54, metalness: 0.75 });
const TRIM = new THREE.MeshStandardMaterial({ color: '#1d2328', roughness: 0.72, metalness: 0.16 });
const INTERIOR = new THREE.MeshStandardMaterial({ color: '#30363a', roughness: 0.95 });
const HEADLIGHT = new THREE.MeshPhysicalMaterial({ color: '#ccd7df', emissive: '#62788a', emissiveIntensity: 0.15, roughness: 0.16, clearcoat: 1 });
const TAILLIGHT = new THREE.MeshPhysicalMaterial({ color: '#7c1820', roughness: 0.22, clearcoat: 1 });
const AMBER = new THREE.MeshPhysicalMaterial({ color: '#b87929', roughness: 0.26, clearcoat: 1 });
const roughnessMap = paintTexture(256, 840, (ctx, size, random) => {
  ctx.fillStyle = '#b8b8b8'; ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 2400; i++) {
    const value = 145 + random() * 70;
    ctx.fillStyle = `rgba(${value},${value},${value},0.12)`;
    ctx.fillRect(random() * size, random() * size, 1 + random() * 8, 0.5);
  }
}, false);
const paints = new Map<string, THREE.MeshPhysicalMaterial>();
function paint(color: string): THREE.MeshPhysicalMaterial {
  let material = paints.get(color);
  if (!material) {
    material = new THREE.MeshPhysicalMaterial({ color, metalness: 0.42, roughness: 0.38, roughnessMap, clearcoat: 0.7, clearcoatRoughness: 0.22, envMapIntensity: 1.2 });
    paints.set(color, material);
  }
  return material;
}
const round = (w: number, h: number, d: number, r: number) => new RoundedBoxGeometry(w, h, d, 3, r);
function add(parent: THREE.Object3D, mesh: THREE.Mesh, x: number, y: number, z: number, shadows = true): THREE.Mesh {
  mesh.position.set(x, y, z); mesh.castShadow = shadows; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function part(parent: THREE.Object3D, size: number[], at: number[], material: THREE.Material, radius = 0.015): THREE.Mesh {
  return add(parent, new THREE.Mesh(round(size[0], size[1], size[2], radius), material), at[0], at[1], at[2]);
}
function strut(parent: THREE.Object3D, from: number[], to: number[], width: number, material: THREE.Material): void {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), delta = b.clone().sub(a);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(width, width, delta.length(), 8), material);
  mesh.position.copy(a).add(b).multiplyScalar(0.5); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  mesh.castShadow = true; parent.add(mesh);
}
function pane(parent: THREE.Object3D, points: number[][], material = GLASS): void {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
  geometry.setIndex([0, 1, 2, 0, 2, 3]); geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material); mesh.receiveShadow = true; parent.add(mesh);
}

// The lower edge follows the top of each tire: the wheel openings are actual geometry.
function shellGeometry(width: number, length: number, radius: number, axle: number, upper: number[][]): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(upper[0][0], upper[0][1]);
  for (const [z, y] of upper.slice(1)) shape.lineTo(z, y);
  const rear = length / 2 - 0.035, front = -rear, arch = radius + 0.055;
  shape.lineTo(rear, 0.27);
  shape.lineTo(axle + arch, 0.27); shape.lineTo(axle + arch, radius);
  shape.absarc(axle, radius, arch, 0, Math.PI, false);
  shape.lineTo(axle - arch, 0.27);
  shape.lineTo(-axle + arch, 0.27); shape.lineTo(-axle + arch, radius);
  shape.absarc(-axle, radius, arch, 0, Math.PI, false);
  shape.lineTo(-axle - arch, 0.27); shape.lineTo(front, 0.27); shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: width - 0.1, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.025, bevelSegments: 3, curveSegments: 18, steps: 1 });
  geometry.translate(0, 0, -(width - 0.1) / 2); geometry.rotateY(-Math.PI / 2); return geometry;
}
function wheel(radius: number, width: number): THREE.Group {
  const group = new THREE.Group();
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 32), TYRE); tire.rotation.z = Math.PI / 2; tire.castShadow = true; group.add(tire);
  for (const side of [-1, 1]) {
    const x = side * (width / 2 + 0.008);
    const brake = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.65, radius * 0.65, 0.015, 24), BRAKE);
    brake.rotation.z = Math.PI / 2; brake.position.x = x; group.add(brake);
    for (const scale of [0.65, 0.9]) {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(radius * scale, scale === 0.65 ? 0.015 : 0.009, 6, 24), scale === 0.65 ? RIM : TYRE);
      rim.rotation.y = Math.PI / 2; rim.position.x = x + side * 0.013; group.add(rim);
    }
    for (let i = 0; i < 5; i++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.018, radius * 1.16, 0.04), RIM);
      spoke.position.x = x + side * 0.02; spoke.rotation.x = i * Math.PI / 5; group.add(spoke);
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.18, radius * 0.18, 0.025, 16), RIM);
    hub.rotation.z = Math.PI / 2; hub.position.x = x + side * 0.025; group.add(hub);
    for (let i = 0; i < 5; i++) {
      const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.012, 6), TRIM);
      nut.rotation.z = Math.PI / 2; nut.position.set(x + side * 0.04, Math.cos(i * Math.PI * 0.4) * radius * 0.29, Math.sin(i * Math.PI * 0.4) * radius * 0.29); group.add(nut);
    }
  }
  return group;
}

export function buildVehicle(box: LevelBox): THREE.Group {
  const van = box.surface === 'van';
  const alongX = box.size.x > box.size.z;
  const length = alongX ? box.size.x : box.size.z;
  const width = alongX ? box.size.z : box.size.x;
  const height = box.size.y;
  const body = new THREE.Group(), finish = paint(box.color);
  const radius = van ? 0.355 : 0.325, axle = length * 0.315;
  const front = -length / 2 + 0.035, rear = length / 2 - 0.035;
  for (const side of [-1, 1]) for (const end of [-1, 1]) {
    const tire = wheel(radius, 0.225); tire.position.set(side * (width / 2 - 0.12), radius, end * axle); body.add(tire);
  }
  // Dark underbody closes the center without covering the wheel openings.
  part(body, [width * 0.77, 0.12, length * 0.65], [0, 0.3, 0], TRIM, 0.03);
  if (van) {
    const shoulder = height * 0.48;
    const roofFront = -length * 0.29, windBase = -length * 0.395, cabBack = -length * 0.1;
    const roofY = height - 0.055;
    const upper = [[front, 0.72], [-length * 0.41, shoulder], [roofFront, roofY - 0.15], [-length * 0.19, roofY], [rear - 0.24, roofY], [rear, roofY - 0.2], [rear, 0.65]];
    add(body, new THREE.Mesh(shellGeometry(width, length, radius, axle, upper), finish), 0, 0, 0);
    // The glass follows the sloped cab instead of a sticker on a rectangular cargo box.
    const glassBottom = shoulder + 0.065, glassTop = roofY - 0.22;
    const windZ = (y: number) => -length * 0.41 + ((y - shoulder) / (roofY - 0.15 - shoulder)) * (roofFront + length * 0.41) - 0.08;
    pane(body, [[-width * 0.405, glassBottom, windZ(glassBottom)], [width * 0.405, glassBottom, windZ(glassBottom)], [width * 0.39, glassTop, windZ(glassTop)], [-width * 0.39, glassTop, windZ(glassTop)]], CAB_GLASS);
    // The shell has a 25 mm outward bevel; the glazing must stand beyond that plane.
    // An opaque dark tint prevents the uncut cargo shell behind the glass from showing through.
    strut(body, [-width * 0.405, glassBottom, windZ(glassBottom) - 0.006], [width * 0.405, glassBottom, windZ(glassBottom) - 0.006], 0.023, TRIM);
    strut(body, [-width * 0.39, glassTop, windZ(glassTop) - 0.006], [width * 0.39, glassTop, windZ(glassTop) - 0.006], 0.022, TRIM);
    for (const side of [-1, 1]) strut(body, [side * width * 0.405, glassBottom, windZ(glassBottom) - 0.006], [side * width * 0.39, glassTop, windZ(glassTop) - 0.006], 0.022, TRIM);
    for (const side of [-1, 1]) {
      const x = side * (width / 2 - 0.012);
      const points = [[x, shoulder + 0.03, windBase + 0.09], [x, shoulder + 0.03, cabBack - 0.06], [x, roofY - 0.19, cabBack - 0.06], [x, roofY - 0.22, roofFront + 0.1]];
      pane(body, side < 0 ? points.reverse() : points, CAB_GLASS);
      part(body, [0.018, height * 0.72, 0.014], [side * width * 0.493, height * 0.53, cabBack], TRIM, 0.003);
      // Sliding cargo door, lower rub strip and recessed handles.
      for (const z of [-length * 0.065, length * 0.34]) part(body, [0.018, height * 0.67, 0.012], [side * width * 0.493, height * 0.52, z], TRIM, 0.003);
      part(body, [0.025, 0.025, length * 0.41], [side * width * 0.498, height * 0.84, length * 0.14], TRIM, 0.004);
      part(body, [0.022, 0.09, length * 0.77], [side * width * 0.495, 0.59, length * 0.015], TRIM, 0.01);
      for (const z of [cabBack - 0.13, length * 0.04]) part(body, [0.025, 0.045, 0.17], [side * width * 0.504, shoulder - 0.11, z], TRIM, 0.012);
      strut(body, [side * width * 0.48, shoulder + 0.12, windBase + 0.1], [side * width * 0.56, shoulder + 0.16, windBase + 0.06], 0.025, TRIM);
      part(body, [0.13, 0.22, 0.13], [side * width * 0.56, shoulder + 0.19, windBase + 0.06], TRIM, 0.035);
      // Capped roof ribs read as pressed steel, not a giant flat top.
      part(body, [0.035, 0.018, length * 0.6], [side * width * 0.31, roofY + 0.025, length * 0.1], finish, 0.007);
      part(body, [0.16, 0.53, 0.055], [side * width * 0.43, 1.0, rear + 0.03], TAILLIGHT, 0.025);
      for (const y of [0.75, 1.3]) part(body, [0.08, 0.06, 0.04], [side * width * 0.43, y, rear + 0.05], RIM, 0.008);
      // Separate rear door faces and hinges.
      for (const x of [side * width * 0.04, side * width * 0.46]) part(body, [0.014, height * 0.68, 0.018], [x, height * 0.54, rear + 0.02], TRIM, 0.003);
      part(body, [0.17, 0.04, 0.026], [side * 0.15, 1.05, rear + 0.035], TRIM, 0.009);
    }
    // Wipers lie at the bottom of the windshield and a short hood sits ahead of them.
    for (const x of [-width * 0.2, width * 0.2]) strut(body, [x - 0.18, glassBottom + 0.035, windZ(glassBottom + 0.035) - 0.018], [x + 0.17, glassBottom + 0.075, windZ(glassBottom + 0.075) - 0.018], 0.012, TRIM);
    part(body, [width * 0.58, 0.035, length * 0.14], [0, 0.86, -length * 0.42], finish, 0.014);
  } else {
    const waist = height * 0.57;
    const cabinFront = -length * 0.215, cabinRear = length * 0.285;
    const roofFront = -length * 0.11, roofRear = length * 0.18;
    const roofY = height - 0.045;
    const upper = [[front, 0.55], [front + 0.13, height * 0.46], [cabinFront, waist], [cabinRear, waist], [rear - 0.15, height * 0.5], [rear, 0.62]];
    add(body, new THREE.Mesh(shellGeometry(width, length, radius, axle, upper), finish), 0, 0, 0);
    const lo = width * 0.447, hi = width * 0.365;
    pane(body, [[-lo, waist + 0.012, cabinFront], [lo, waist + 0.012, cabinFront], [hi, roofY - 0.04, roofFront], [-hi, roofY - 0.04, roofFront]]);
    pane(body, [[lo, waist + 0.02, cabinRear], [-lo, waist + 0.02, cabinRear], [-hi, roofY - 0.035, roofRear], [hi, roofY - 0.035, roofRear]]);
    for (const side of [-1, 1]) {
      const lowerX = side * lo, upperX = side * hi;
      const points = [[lowerX, waist + 0.015, cabinFront], [lowerX, waist + 0.015, cabinRear], [upperX, roofY - 0.03, roofRear], [upperX, roofY - 0.03, roofFront]];
      pane(body, side < 0 ? points.reverse() : points);
      for (const [bottomZ, topZ] of [[cabinFront, roofFront], [length * 0.065, length * 0.065], [cabinRear, roofRear]]) strut(body, [lowerX, waist, bottomZ], [upperX, roofY, topZ], 0.027, bottomZ === length * 0.065 ? TRIM : finish);
      strut(body, [lowerX, waist + 0.01, cabinFront], [lowerX, waist + 0.01, cabinRear], 0.018, TRIM);
      for (const z of [length * 0.065, cabinRear]) part(body, [0.012, waist - 0.31, 0.014], [side * width * 0.487, (waist + 0.31) / 2, z], TRIM, 0.003);
      for (const z of [-length * 0.005, length * 0.245]) part(body, [0.027, 0.035, 0.16], [side * width * 0.496, waist - 0.1, z], RIM, 0.009);
      part(body, [0.025, 0.06, length * 0.5], [side * width * 0.492, 0.3, 0], TRIM, 0.012);
      strut(body, [lowerX, waist + 0.1, cabinFront + 0.09], [side * width * 0.53, waist + 0.11, cabinFront + 0.02], 0.018, TRIM);
      part(body, [0.16, 0.095, 0.13], [side * width * 0.54, waist + 0.12, cabinFront + 0.02], finish, 0.025);
      for (const z of [-length * 0.055, length * 0.15]) {
        part(body, [0.34, 0.33, 0.12], [side * width * 0.22, waist + 0.14, z], INTERIOR, 0.05);
        part(body, [0.22, 0.14, 0.08], [side * width * 0.22, waist + 0.35, z], INTERIOR, 0.04);
      }
      strut(body, [side * width * 0.08, waist + 0.022, cabinFront + 0.012], [side * width * 0.34, waist + 0.07, cabinFront + 0.04], 0.008, TRIM);
    }
    part(body, [width * 0.75, 0.06, roofRear - roofFront + 0.08], [0, roofY, (roofFront + roofRear) / 2], finish, 0.035);
    part(body, [width * 0.77, 0.1, 0.27], [0, waist - 0.04, cabinFront + 0.13], INTERIOR, 0.035);
    // Hood shut lines and a fuel flap are inset into the painted body.
    for (const side of [-1, 1]) strut(body, [side * width * 0.35, height * 0.473, front + 0.14], [side * width * 0.365, waist + 0.002, cabinFront], 0.004, TRIM);
    part(body, [0.008, 0.15, 0.18], [width * 0.489, waist - 0.14, length * 0.34], finish, 0.02);
  }
  // Lamps sit in sculpted front/rear assemblies, with a dark grille between them.
  const lampY = van ? 0.78 : height * 0.43;
  for (const side of [-1, 1]) {
    part(body, [width * 0.23, 0.14, 0.04], [side * width * 0.32, lampY, front - 0.015], TRIM, 0.025);
    part(body, [width * 0.205, 0.1, 0.05], [side * width * 0.32, lampY + 0.006, front - 0.025], HEADLIGHT, 0.02);
    part(body, [0.055, 0.08, 0.055], [side * width * 0.427, lampY, front - 0.03], AMBER, 0.012);
    if (!van) {
      part(body, [width * 0.225, 0.13, 0.05], [side * width * 0.32, height * 0.45, rear + 0.01], TAILLIGHT, 0.025);
      part(body, [width * 0.07, 0.04, 0.054], [side * width * 0.32, height * 0.45, rear + 0.015], HEADLIGHT, 0.008);
    }
  }
  const bumperY = van ? 0.39 : 0.36;
  part(body, [width * 0.93, 0.16, 0.1], [0, bumperY, front + 0.015], TRIM, 0.035);
  part(body, [width * 0.93, 0.14, 0.1], [0, bumperY, rear - 0.01], TRIM, 0.035);
  part(body, [width * 0.37, 0.18, 0.035], [0, lampY - 0.02, front - 0.012], TRIM, 0.018);
  for (let i = 0; i < 4; i++) part(body, [width * 0.32, 0.012, 0.04], [0, lampY - 0.085 + i * 0.039, front - 0.023], BRAKE, 0.003);
  const plateMap = labelTexture([{ text: `NL ${String(Math.abs(Math.round(box.position.x * 31 + box.position.z * 17))).padStart(4, '0')}`, size: 68, color: '#263139' }], '#c6c9bb', 384, 112, '#6f7a82');
  const plate = new THREE.MeshStandardMaterial({ map: plateMap, roughness: 0.55, metalness: 0.1 });
  for (const end of [-1, 1]) {
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.115), plate);
    face.position.set(0, van && end > 0 ? 0.72 : 0.39, end * (length / 2 + 0.018)); if (end < 0) face.rotation.y = Math.PI; body.add(face);
  }
  const group = new THREE.Group(); group.name = van ? 'Cargo van' : 'Sedan'; group.add(body);
  group.position.set(box.position.x, box.position.y - height / 2, box.position.z);
  // Lanes face opposite directions. Parking bays face the drive aisle; nothing floats above its datum.
  group.rotation.y = alongX ? (box.position.z > 41 ? Math.PI / 2 : -Math.PI / 2) : (box.position.x < 0 ? Math.PI : 0);
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
