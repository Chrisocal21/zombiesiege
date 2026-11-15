import * as THREE from 'three';
import type { Level } from '../levels/types';
import { paintTexture, seededRandom } from './materials';

// Marks on open ground, so a yard does not read as one flat sheet: oil and damp stains, cracks, scraps
// of paper, drifts of leaves and grit. One picture holds the four kinds in its quarters, and every mark on a
// floor is one flat square in a single mesh, so the lot costs one draw.

let atlas: THREE.CanvasTexture | null = null;
function decalAtlas(): THREE.CanvasTexture {
  if (atlas) return atlas;
  atlas = paintTexture(1024, 51, (context, size, random) => {
    const cell = size / 2;
    context.clearRect(0, 0, size, size);
    const within = (cx: number, cy: number, draw: () => void) => {
      context.save();
      context.beginPath(); context.rect(cx * cell, cy * cell, cell, cell); context.clip();
      context.translate(cx * cell + cell / 2, cy * cell + cell / 2);
      draw();
      context.restore();
    };
    // Top left: a dark stain, heavier in the middle, with a few drips off it.
    within(0, 0, () => {
      for (let i = 0; i < 16; i++) {
        const reach = random() * cell * 0.2, angle = random() * Math.PI * 2, radius = cell * (0.08 + random() * 0.16);
        const x = Math.cos(angle) * reach, y = Math.sin(angle) * reach;
        const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, `rgba(10,10,12,${0.3 + random() * 0.25})`);
        gradient.addColorStop(1, 'rgba(10,10,12,0)');
        context.fillStyle = gradient;
        context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      }
    });
    // Top right: cracks running out from near the middle, forking as they go.
    within(1, 0, () => {
      context.lineCap = 'round';
      const run = (x: number, y: number, angle: number, length: number, width: number) => {
        context.strokeStyle = `rgba(8,8,9,${0.55 + random() * 0.3})`;
        context.lineWidth = width;
        context.beginPath(); context.moveTo(x, y);
        for (let travelled = 0; travelled < length; travelled += 9) {
          angle += (random() - 0.5) * 0.7;
          x += Math.cos(angle) * 9; y += Math.sin(angle) * 9;
          context.lineTo(x, y);
          if (width > 1.2 && random() < 0.07) run(x, y, angle + (random() < 0.5 ? 0.8 : -0.8), length * 0.4, width * 0.6);
        }
        context.stroke();
      };
      for (let i = 0; i < 4; i++) run((random() - 0.5) * 30, (random() - 0.5) * 30, random() * Math.PI * 2, cell * (0.28 + random() * 0.14), 3);
    });
    // Bottom left: scraps of paper and card, some of them printed.
    within(0, 1, () => {
      for (let i = 0; i < 5; i++) {
        context.save();
        context.translate((random() - 0.5) * cell * 0.6, (random() - 0.5) * cell * 0.6);
        context.rotate(random() * Math.PI);
        const w = cell * (0.1 + random() * 0.14), h = w * (0.6 + random() * 0.6);
        context.fillStyle = ['#cfc9b8', '#b9b2a0', '#8f8468', '#d8d4cc'][Math.floor(random() * 4)];
        context.fillRect(-w / 2, -h / 2, w, h);
        context.fillStyle = 'rgba(40,40,44,0.5)';
        for (let line = 0; line < 4; line++) context.fillRect(-w * 0.38, -h * 0.3 + line * h * 0.17, w * (0.4 + random() * 0.36), h * 0.05);
        context.restore();
      }
    });
    // Bottom right: leaves and grit blown into a drift.
    within(1, 1, () => {
      for (let i = 0; i < 90; i++) {
        const reach = Math.pow(random(), 0.7) * cell * 0.4, angle = random() * Math.PI * 2;
        context.save();
        context.translate(Math.cos(angle) * reach, Math.sin(angle) * reach * 0.6);
        context.rotate(random() * Math.PI);
        const leaf = random() < 0.4;
        context.fillStyle = leaf ? ['#5b4a26', '#6b5a2c', '#47401f', '#74522a'][Math.floor(random() * 4)] : `rgba(20,20,20,${0.3 + random() * 0.4})`;
        context.beginPath();
        context.ellipse(0, 0, leaf ? 9 + random() * 7 : 2 + random() * 3, leaf ? 4 + random() * 3 : 2 + random() * 2, 0, 0, Math.PI * 2);
        context.fill();
        context.restore();
      }
    });
  });
  atlas.wrapS = atlas.wrapT = THREE.ClampToEdgeWrapping;
  return atlas;
}

// How wide each kind runs, in metres, and how often it turns up.
const KINDS = [
  { cell: [0, 0], min: 1.6, max: 3.6, share: 0.3 },
  { cell: [1, 0], min: 2.2, max: 4.4, share: 0.25 },
  { cell: [0, 1], min: 0.6, max: 1.1, share: 0.2 },
  { cell: [1, 1], min: 1.2, max: 2.4, share: 0.25 },
] as const;

export function isOpenGround(box: Level['boxes'][number]): boolean {
  return (box.surface === 'slab' || box.surface === 'plain') && box.size.y === 0.5 && box.position.y === -0.25 && box.size.x * box.size.z >= 60;
}

export function buildGroundDecals(parent: THREE.Object3D, level: Level): void {
  // The widest piece of open ground is the yard; the rest (a road strip) lie on top of it.
  const yard = level.boxes.filter(isOpenGround).sort((a, b) => b.size.x * b.size.z - a.size.x * a.size.z)[0];
  if (!yard) return;
  let seed = 7;
  for (const letter of level.name) seed = (seed * 31 + letter.charCodeAt(0)) % 100000;
  const random = seededRandom(seed);
  const count = Math.min(90, Math.round((yard.size.x * yard.size.z) / 13));
  const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
  for (let i = 0; i < count; i++) {
    let pick = random(), kind: (typeof KINDS)[number] = KINDS[0];
    for (const each of KINDS) { if (pick < each.share) { kind = each; break; } pick -= each.share; }
    const half = (kind.min + random() * (kind.max - kind.min)) / 2;
    const x = yard.position.x + (random() - 0.5) * (yard.size.x - 2), z = yard.position.z + (random() - 0.5) * (yard.size.z - 2);
    const angle = random() * Math.PI * 2, c = Math.cos(angle) * half, s = Math.sin(angle) * half;
    // Each a hair higher than the last, so two that overlap do not shimmer.
    const y = 0.004 + i * 0.00008;
    const base = positions.length / 3;
    for (const [px, pz] of [[-c + s, -s - c], [c + s, s - c], [c - s, s + c], [-c - s, -s + c]]) positions.push(x + px, y, z + pz);
    const u = kind.cell[0] / 2, v = 1 - kind.cell[1] / 2;
    uvs.push(u, v - 0.5, u + 0.5, v - 0.5, u + 0.5, v, u, v);
    indices.push(base, base + 2, base + 1, base, base + 3, base + 2);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({ map: decalAtlas(), transparent: true, depthWrite: false, roughness: 0.85, polygonOffset: true, polygonOffsetFactor: -2 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  parent.add(mesh);
}
