import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// One corner of a side profile: forward along the gun, up, and how much to round the corner.
export type Corner = [number, number, number];

function trace<T extends THREE.Path>(path: T, corners: Corner[]): T {
  const point = (i: number) => {
    const [x, y] = corners[(i + corners.length) % corners.length];
    return new THREE.Vector2(x, y);
  };
  corners.forEach(([, , radius], i) => {
    const here = point(i);
    const entry = point(i - 1).sub(here).normalize().multiplyScalar(radius).add(here);
    const exit = point(i + 1).sub(here).normalize().multiplyScalar(radius).add(here);
    if (i === 0) path.moveTo(entry.x, entry.y);
    else path.lineTo(entry.x, entry.y);
    path.quadraticCurveTo(here.x, here.y, exit.x, exit.y);
  });
  path.closePath();
  return path;
}

// Turns a side profile into a solid part with bevelled edges, centered across the gun.
export function profile(
  parent: THREE.Object3D,
  corners: Corner[],
  width: number,
  bevel: number,
  material: THREE.Material,
  hole?: Corner[],
): THREE.Mesh {
  const shape = trace(new THREE.Shape(), corners);
  if (hole) shape.holes.push(trace(new THREE.Path(), hole));
  const depth = width - bevel * 2;
  const extruded = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments: 4,
    curveSegments: 10,
  });
  extruded.translate(0, 0, -depth / 2);
  extruded.rotateY(Math.PI / 2);
  const mesh = new THREE.Mesh(toCreasedNormals(extruded, Math.PI / 4), material);
  parent.add(mesh);
  return mesh;
}

export function softBox(
  parent: THREE.Object3D,
  size: [number, number, number],
  radius: number,
  material: THREE.Material,
  position: [number, number, number],
): THREE.Mesh {
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(...size, 3, radius), material);
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}

export function barrelPart(
  parent: THREE.Object3D,
  radius: number,
  length: number,
  material: THREE.Material,
  position: [number, number, number],
): void {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 24), material);
  mesh.rotation.x = Math.PI / 2;
  mesh.position.set(...position);
  parent.add(mesh);
}

export function box(
  parent: THREE.Object3D,
  size: [number, number, number],
  material: THREE.Material,
  position: [number, number, number],
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}

