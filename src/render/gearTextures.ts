import * as THREE from 'three';
import { OUTFITS, type Outfit } from '../client/appearance';
import { paintTexture } from './materials';

const outfitMaps = new Map<string, THREE.CanvasTexture>();
let gloveMap: THREE.CanvasTexture | undefined;

const smoothstep = (t: number) => t * t * (3 - 2 * t);

// Smooth random values that repeat every `px` by `py` lattice cells, so the texture tiles without seams.
function periodicNoise(random: () => number, px: number, py: number): (x: number, y: number) => number {
  const lattice = Float32Array.from({ length: px * py }, () => random());
  const at = (i: number, j: number) => lattice[(((j % py) + py) % py) * px + (((i % px) + px) % px)];
  return (x, y) => {
    const fx = x * px, fy = y * py;
    const ix = Math.floor(fx), iy = Math.floor(fy);
    const tx = smoothstep(fx - ix), ty = smoothstep(fy - iy);
    const top = at(ix, iy) + (at(ix + 1, iy) - at(ix, iy)) * tx;
    const bottom = at(ix, iy + 1) + (at(ix + 1, iy + 1) - at(ix, iy + 1)) * tx;
    return top + (bottom - top) * ty;
  };
}

// Three layers of blotches, big to small, thresholded so each covers a chosen share of the cloth.
interface CamoLayer { grid: [number, number]; coverage: number; cell: number }
const CAMO_LAYERS: Record<Exclude<Outfit['pattern'], 'solid'>, CamoLayer[]> = {
  // Large soft blotches, with a few small dark ones on top.
  woodland: [{ grid: [5, 4], coverage: 0.34, cell: 1 }, { grid: [6, 5], coverage: 0.25, cell: 1 }, { grid: [10, 8], coverage: 0.09, cell: 1 }],
  arid: [{ grid: [4, 3], coverage: 0.32, cell: 1 }, { grid: [6, 5], coverage: 0.2, cell: 1 }, { grid: [11, 9], coverage: 0.07, cell: 1 }],
  // Square pixels in two sizes, like a digital pattern.
  digital: [{ grid: [5, 5], coverage: 0.33, cell: 16 }, { grid: [7, 7], coverage: 0.22, cell: 16 }, { grid: [9, 9], coverage: 0.12, cell: 8 }],
  urban: [{ grid: [4, 4], coverage: 0.3, cell: 32 }, { grid: [6, 6], coverage: 0.22, cell: 16 }, { grid: [8, 8], coverage: 0.1, cell: 16 }],
};

function camoMask(size: number, random: () => number, layer: CamoLayer): Uint8Array {
  const octaves = [1, 2, 4].map((scale) => periodicNoise(random, layer.grid[0] * scale, layer.grid[1] * scale));
  const cells = size / layer.cell;
  const values = new Float32Array(cells * cells);
  for (let j = 0; j < cells; j++) for (let i = 0; i < cells; i++) {
    const x = (i + 0.5) / cells, y = (j + 0.5) / cells;
    values[j * cells + i] = octaves[0](x, y) + octaves[1](x, y) * 0.5 + octaves[2](x, y) * 0.25;
  }
  // The cut-off that leaves exactly the wanted share of cells above it.
  const threshold = Float32Array.from(values).sort()[Math.floor(values.length * (1 - layer.coverage))];
  const mask = new Uint8Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    mask[y * size + x] = values[Math.floor(y / layer.cell) * cells + Math.floor(x / layer.cell)] >= threshold ? 1 : 0;
  }
  return mask;
}

function paintCamo(ctx: CanvasRenderingContext2D, size: number, random: () => number, outfit: Outfit): void {
  ctx.fillStyle = outfit.colors[0]; ctx.fillRect(0, 0, size, size);
  if (outfit.pattern === 'solid') return;
  const image = ctx.getImageData(0, 0, size, size);
  const layers = CAMO_LAYERS[outfit.pattern];
  layers.forEach((layer, k) => {
    const mask = camoMask(size, random, layer);
    const color = new THREE.Color(outfit.colors[1 + k % (outfit.colors.length - 1)]).convertLinearToSRGB();
    for (let i = 0; i < mask.length; i++) {
      if (!mask[i]) continue;
      image.data[i * 4] = Math.round(color.r * 255);
      image.data[i * 4 + 1] = Math.round(color.g * 255);
      image.data[i * 4 + 2] = Math.round(color.b * 255);
    }
  });
  ctx.putImageData(image, 0, 0);
}

// Paint a full tile with wrapped copies of every shape, keeping the pattern seamless.
export function outfitTexture(id: string): THREE.CanvasTexture {
  const cached = outfitMaps.get(id); if (cached) return cached;
  const outfit = OUTFITS.find(item => item.id === id) || OUTFITS[0];
  const map = paintTexture(512, 912 + OUTFITS.indexOf(outfit) * 17, (ctx, size, random) => {
    paintCamo(ctx, size, random, outfit);
    weave(ctx, size, random, outfit);
  });
  map.repeat.set(1.8, 3.2); outfitMaps.set(id, map); return map;
}
function weave(ctx: CanvasRenderingContext2D, size: number, random: () => number, outfit: Outfit): void {
  ctx.lineWidth = 0.6;
  for (let i = 0; i < size; i += 3) {
    ctx.strokeStyle = 'rgba(245,240,220,0.035)'; ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(size, i); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.055)'; ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, size); ctx.stroke();
  }
  for (let i = 0; i < size; i += 32) {
    ctx.strokeStyle = outfit.pattern === 'solid' ? 'rgba(140,160,164,.11)' : 'rgba(20,30,24,.12)';
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, size); ctx.moveTo(0, i); ctx.lineTo(size, i); ctx.stroke();
  }
  for (let i = 0; i < 1200; i++) {
    ctx.fillStyle = `rgba(15,20,15,${random() * 0.055})`; ctx.fillRect(random() * size, random() * size, 1, 2);
  }
}
export function gloveTexture(): THREE.CanvasTexture {
  if (gloveMap) return gloveMap;
  gloveMap = paintTexture(256, 1007, (ctx, size, random) => {
    ctx.fillStyle = '#d2d4d0'; ctx.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 3) for (let x = 0; x < size; x += 3) {
      ctx.fillStyle = `rgba(20,28,27,${0.04 + random() * 0.14})`; ctx.fillRect(x, y, 1.5, 2);
    }
    for (let i = 0; i < 150; i++) {
      ctx.strokeStyle = `rgba(240,244,235,${random() * 0.09})`; ctx.lineWidth = 0.5;
      const x = random() * size, y = random() * size;
      ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x + 4 + random() * 9, y + 2); ctx.stroke();
    }
  });
  return gloveMap;
}
