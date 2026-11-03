import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { buildingMaterial } from './streetTextures';
import { glowTexture } from './materials';

// The city seen from the roof: blocks of buildings on a street grid far below, windows lit here
// and there, street lamps in lines along the roads, and a few towers standing taller than the
// hospital with red lamps on top. All of it is one merged mesh and two sets of points.

// Metres per window texture tile: four windows across, four storeys up.
const TILE = 12;

function seededRandom(seed: number): () => number {
  let value = seed;
  return () => ((value = (value * 16807) % 2147483647) - 1) / 2147483646;
}

// Texture coordinates in metres from the box's corner, so windows keep their size on any building.
function metreUVs(geometry: THREE.BufferGeometry, w: number, h: number, d: number, shift: number): void {
  const position = geometry.attributes.position;
  const normal = geometry.attributes.normal;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i) + w / 2;
    const y = position.getY(i) + h / 2;
    const z = position.getZ(i) + d / 2;
    const u = Math.abs(normal.getX(i)) > 0.5 ? z : x;
    const v = Math.abs(normal.getY(i)) > 0.5 ? z : y;
    uv.setXY(i, (u + shift) / TILE, v / TILE);
  }
}

export function buildCity(scene: THREE.Object3D, ground: number): void {
  const random = seededRandom(91);
  const blocks: THREE.BufferGeometry[] = [];
  const beacons: number[] = [];
  const lamps: number[] = [];
  const block = 26;
  for (let bx = -5; bx <= 5; bx++) {
    for (let bz = -5; bz <= 5; bz++) {
      const cx = bx * block;
      const cz = bz * block;
      const distance = Math.hypot(cx, cz);
      // The hospital's own block, and anything past the edge of sight.
      if (distance < 20 || distance > 125) continue;
      // Each block holds one to three buildings.
      const count = 1 + Math.floor(random() * 3);
      for (let k = 0; k < count; k++) {
        const w = 7 + random() * 10;
        const d = 7 + random() * 10;
        const tall = distance > 55 && random() < 0.12;
        const h = tall ? 52 + random() * 18 : 9 + random() * 30;
        const x = cx + (random() - 0.5) * (block - 8 - w * 0.5);
        const z = cz + (random() - 0.5) * (block - 8 - d * 0.5);
        const geometry = new THREE.BoxGeometry(w, h, d);
        metreUVs(geometry, w, h, d, Math.floor(random() * 4) * 3);
        geometry.translate(x, ground + h / 2, z);
        blocks.push(geometry);
        if (tall) beacons.push(x, ground + h + 0.6, z);
      }
      // Street lamps along two sides of the block.
      for (let s = -2; s <= 2; s++) {
        lamps.push(cx + s * 5, ground + 6, cz + block / 2);
        lamps.push(cx + block / 2, ground + 6, cz + s * 5);
      }
    }
  }
  const material = buildingMaterial('#8d8f96').clone();
  material.emissiveIntensity = 1.1;
  const city = new THREE.Mesh(mergeGeometries(blocks, false)!, material);
  city.name = 'City';
  scene.add(city);
  for (const geometry of blocks) geometry.dispose();

  const glow = glowTexture();
  const points = (positions: number[], color: number, size: number) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const made = new THREE.Points(geometry, new THREE.PointsMaterial({
      map: glow, color, size, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    scene.add(made);
  };
  points(lamps, 0xffa040, 5);
  points(beacons, 0xff2a1a, 7);
}
