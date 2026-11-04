import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// The building blocks the El Cajon is made from, shared so every vehicle is built the same way:
// curved surfaces and flat patches that share edges, thin tubes for lines and mouldings, window rings,
// and a final merge by material so a whole vehicle is a few dozen draw calls.
export type V = [number, number, number];

export interface Mats {
  paint: THREE.MeshPhysicalMaterial;
  chrome: THREE.MeshStandardMaterial;
  brushed: THREE.MeshStandardMaterial;
  windowMetal: THREE.MeshStandardMaterial;
  black: THREE.MeshStandardMaterial;
  rubber: THREE.MeshStandardMaterial;
  glass: THREE.MeshPhysicalMaterial;
  red: THREE.MeshPhysicalMaterial;
  amber: THREE.MeshPhysicalMaterial;
  lens: THREE.MeshPhysicalMaterial;
  plate: THREE.MeshStandardMaterial;
  cloth: THREE.MeshStandardMaterial;
  dash: THREE.MeshStandardMaterial;
  white: THREE.MeshStandardMaterial;
}

let shared: Omit<Mats, 'paint'> | null = null;
const paints = new Map<string, THREE.MeshPhysicalMaterial>();

function lensTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const c = canvas.getContext('2d')!;
  const gradient = c.createRadialGradient(46, 38, 4, 64, 64, 63);
  gradient.addColorStop(0, '#ffffff'); gradient.addColorStop(0.55, '#c9d5dc'); gradient.addColorStop(1, '#6c7b89');
  c.fillStyle = gradient; c.fillRect(0, 0, 128, 128);
  c.strokeStyle = 'rgba(255,255,255,0.38)'; c.lineWidth = 1;
  for (let i = 8; i < 128; i += 7) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, 128); c.stroke(); }
  for (let i = 12; i < 128; i += 15) { c.beginPath(); c.moveTo(0, i); c.lineTo(128, i); c.stroke(); }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function plateTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 64;
  const c = canvas.getContext('2d')!;
  c.fillStyle = '#d9d9cf'; c.fillRect(0, 0, 256, 64);
  c.strokeStyle = '#222'; c.lineWidth = 3; c.strokeRect(3, 3, 250, 58);
  c.fillStyle = '#1a1a1a'; c.font = 'bold 40px monospace'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('NL 1177', 128, 34);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function matsFor(color: string): Mats {
  if (!shared) {
    shared = {
      chrome: new THREE.MeshStandardMaterial({ color: 0xe1e5e9, metalness: 0.95, roughness: 0.17 }),
      brushed: new THREE.MeshStandardMaterial({ color: 0x9da5ae, metalness: 0.85, roughness: 0.36 }),
      windowMetal: new THREE.MeshStandardMaterial({ color: 0x68737e, metalness: 0.7, roughness: 0.43 }),
      black: new THREE.MeshStandardMaterial({ color: 0x11161b, roughness: 0.78 }),
      rubber: new THREE.MeshStandardMaterial({ color: 0x202124, roughness: 0.9 }),
      glass: new THREE.MeshPhysicalMaterial({ color: 0xb1ced6, metalness: 0.05, roughness: 0.07, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false, clearcoat: 1 }),
      red: new THREE.MeshPhysicalMaterial({ color: 0xa9080b, roughness: 0.24, metalness: 0.12, clearcoat: 1 }),
      amber: new THREE.MeshPhysicalMaterial({ color: 0xdc7416, roughness: 0.25, clearcoat: 1 }),
      lens: new THREE.MeshPhysicalMaterial({ map: lensTexture(), roughness: 0.16, metalness: 0.25, clearcoat: 1 }),
      plate: new THREE.MeshStandardMaterial({ map: plateTexture(), roughness: 0.5 }),
      cloth: new THREE.MeshStandardMaterial({ color: 0x4a4540, roughness: 0.92 }),
      dash: new THREE.MeshStandardMaterial({ color: 0x23282c, roughness: 0.8 }),
      white: new THREE.MeshStandardMaterial({ color: 0xe9ece8, roughness: 0.4 }),
    };
  }
  let paint = paints.get(color);
  if (!paint) {
    paint = new THREE.MeshPhysicalMaterial({ color, metalness: 0.32, roughness: 0.34, clearcoat: 0.9, clearcoatRoughness: 0.2, envMapIntensity: 1.3 });
    paints.set(color, paint);
  }
  return { ...shared, paint };
}

export function kit(body: THREE.Group, m: Mats) {
  const add = (g: THREE.BufferGeometry, mat: THREE.Material, p: V = [0, 0, 0], parent: THREE.Object3D = body) => {
    const mesh = new THREE.Mesh(g, mat);
    mesh.position.set(...p);
    parent.add(mesh);
    return mesh;
  };
  const box = (mat: THREE.Material, size: V, p: V, radius = 0.008, parent: THREE.Object3D = body) =>
    add(Math.min(...size) < 0.01 ? new THREE.BoxGeometry(...size) :
      new RoundedBoxGeometry(...size, 2, Math.min(radius, ...size.map((x) => x * 0.45))), mat, p, parent);
  // A flat quad or triangle, wound to face outward.
  const patch = (mat: THREE.Material, points: V[], outward: V, parent: THREE.Object3D = body) => {
    const normal = new THREE.Vector3().crossVectors(
      new THREE.Vector3(...points[1]).sub(new THREE.Vector3(...points[0])),
      new THREE.Vector3(...points[2]).sub(new THREE.Vector3(...points[0])),
    );
    const front = normal.dot(new THREE.Vector3(...outward)) >= 0;
    const indices = points.length === 3 ? (front ? [0, 1, 2] : [0, 2, 1]) : (front ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(points.length === 3 ? [0, 0, 1, 0, 0.5, 1] : [0, 0, 1, 0, 1, 1, 0, 1], 2));
    g.setIndex(indices);
    g.computeVertexNormals();
    return add(g, mat, [0, 0, 0], parent);
  };
  // A grid of points over (u, v), wound to face outward.
  const surface = (mat: THREE.Material, nu: number, nv: number, sample: (u: number, v: number) => V, outward: V) => {
    const p: number[] = [], uv: number[] = [], indices: number[] = [];
    for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) {
      p.push(...sample(i / nu, j / nv));
      uv.push(i / nu, j / nv);
      if (i < nu && j < nv) {
        const a = i * (nv + 1) + j, b = a + nv + 1;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(indices); g.computeVertexNormals();
    const normals = g.attributes.normal;
    const sum = new THREE.Vector3();
    for (let i = 0; i < normals.count; i++) sum.add(new THREE.Vector3().fromBufferAttribute(normals, i));
    if (sum.dot(new THREE.Vector3(...outward)) < 0) {
      for (let i = 0; i < indices.length; i += 3) [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]];
      g.setIndex(indices); g.computeVertexNormals();
    }
    return add(g, mat);
  };
  const rod = (mat: THREE.Material, a: V, b: V, radius: number, parent: THREE.Object3D = body) => {
    const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b);
    const delta = to.clone().sub(from);
    const mesh = add(new THREE.CylinderGeometry(radius, radius, delta.length(), 8), mat, [0, 0, 0], parent);
    mesh.position.copy(from.add(to).multiplyScalar(0.5));
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    return mesh;
  };
  const line = (mat: THREE.Material, points: V[], radius: number, parent: THREE.Object3D = body) => {
    const curve = new THREE.CurvePath<THREE.Vector3>();
    for (let i = 0; i < points.length - 1; i++) curve.add(new THREE.LineCurve3(new THREE.Vector3(...points[i]), new THREE.Vector3(...points[i + 1])));
    return add(new THREE.TubeGeometry(curve, Math.max(8, points.length * 3), radius, 6, false), mat, [0, 0, 0], parent);
  };
  const ring = (mat: THREE.Material, outer: V[], inner: V[], outward: V) => {
    for (let i = 0; i < outer.length; i++) {
      const j = (i + 1) % outer.length;
      patch(mat, [outer[i], outer[j], inner[j], inner[i]], outward);
    }
  };
  // A window surround: rubber seal at the glass, a satin strip, then the painted frame.
  const windowMolding = (outer: V[], inner: V[], outward: V) => {
    const offset = new THREE.Vector3(...outward).normalize().multiplyScalar(0.0015);
    const contour = (t: number): V[] => inner.map((p, i) => [
      THREE.MathUtils.lerp(p[0], outer[i][0], t) + offset.x,
      THREE.MathUtils.lerp(p[1], outer[i][1], t) + offset.y,
      THREE.MathUtils.lerp(p[2], outer[i][2], t) + offset.z,
    ]);
    ring(m.black, contour(0.36), contour(0.34), outward);
    ring(m.black, contour(0.14), contour(0), outward);
    ring(m.windowMetal, contour(0.34), contour(0.14), outward);
  };
  const disc = (mat: THREE.Material, radius: number, depth: number, p: V, axis: 'x' | 'z' = 'z', parent: THREE.Object3D = body) => {
    const mesh = add(new THREE.CylinderGeometry(radius, radius, depth, radius < 0.02 ? 10 : radius < 0.07 ? 20 : 40), mat, p, parent);
    mesh.rotation[axis === 'x' ? 'z' : 'x'] = Math.PI / 2;
    return mesh;
  };
  // A glass window set inside a painted surround: the outer and inner outlines, four corners each.
  const windowPane = (outer: V[], inner: V[], outward: V) => {
    ring(m.paint, outer, inner, outward);
    patch(m.glass, inner, outward);
    windowMolding(outer, inner, outward);
  };
  return { add, box, patch, surface, rod, line, ring, windowMolding, disc, windowPane };
}

// Flattens the nested parts into one mesh per material, so a vehicle costs a few draw calls.
export function batch(parent: THREE.Group): void {
  parent.updateMatrixWorld(true);
  const inverse = parent.matrixWorld.clone().invert();
  const groups = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const originals = new Set<THREE.BufferGeometry>();
  parent.traverse((child) => {
    if (child === parent || !(child instanceof THREE.Mesh) || Array.isArray(child.material)) return;
    const matrix = new THREE.Matrix4().multiplyMatrices(inverse, child.matrixWorld);
    const g = child.geometry.clone().applyMatrix4(matrix);
    const list = groups.get(child.material) ?? [];
    list.push(g); groups.set(child.material, list); originals.add(child.geometry);
  });
  parent.clear();
  originals.forEach((g) => g.dispose());
  for (const [material, geometries] of groups) {
    const normalized = geometries.map((g) => g.index ? g.toNonIndexed() : g);
    const merged = mergeGeometries(normalized);
    if (!merged) throw new Error('Unable to batch vehicle geometry');
    const mesh = new THREE.Mesh(merged, material);
    mesh.castShadow = !material.transparent;
    mesh.receiveShadow = !material.transparent;
    parent.add(mesh);
    new Set([...geometries, ...normalized]).forEach((g) => g.dispose());
  }
}
