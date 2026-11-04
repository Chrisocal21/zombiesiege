import * as THREE from 'three';
import type { Surface } from '../levels/types';

// Every texture here is painted on a canvas when the page loads, so there are no image files to
// download or license. Each one tiles seamlessly.

export type Painter = (context: CanvasRenderingContext2D, size: number, random: () => number) => void;

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function paintTexture(size: number, seed: number, paint: Painter, color = true): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  paint(canvas.getContext('2d')!, size, seededRandom(seed));
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  if (color) texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Draws something at a spot and again at every wrapped copy of it, so it tiles seamlessly.
export function wrapped(size: number, x: number, y: number, reach: number, draw: (x: number, y: number) => void): void {
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const px = x + dx * size;
      const py = y + dy * size;
      if (px > -reach && px < size + reach && py > -reach && py < size + reach) draw(px, py);
    }
  }
}

export function blobs(
  context: CanvasRenderingContext2D,
  size: number,
  random: () => number,
  count: number,
  minRadius: number,
  maxRadius: number,
  rgb: string,
  alpha: number,
): void {
  for (let i = 0; i < count; i++) {
    const radius = minRadius + random() * (maxRadius - minRadius);
    const a = alpha * (0.4 + random() * 0.6);
    wrapped(size, random() * size, random() * size, radius, (x, y) => {
      const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, `rgba(${rgb},${a})`);
      gradient.addColorStop(1, `rgba(${rgb},0)`);
      context.fillStyle = gradient;
      context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    });
  }
}

export function specks(
  context: CanvasRenderingContext2D,
  size: number,
  random: () => number,
  count: number,
  maxSize: number,
  light: number,
  dark: number,
): void {
  for (let i = 0; i < count; i++) {
    const shade = random() < 0.5 ? 255 : 0;
    context.fillStyle = `rgba(${shade},${shade},${shade},${(shade ? light : dark) * random()})`;
    const w = 1 + random() * maxSize;
    wrapped(size, random() * size, random() * size, w, (x, y) => context.fillRect(x, y, w, 1 + random() * maxSize));
  }
}

export function cracks(context: CanvasRenderingContext2D, size: number, random: () => number, count: number): void {
  context.lineCap = 'round';
  for (let i = 0; i < count; i++) {
    let x = random() * size;
    let y = random() * size;
    let angle = random() * Math.PI * 2;
    context.beginPath();
    context.moveTo(x, y);
    const segments = 6 + Math.floor(random() * 10);
    for (let s = 0; s < segments; s++) {
      angle += (random() - 0.5) * 1.1;
      x += Math.cos(angle) * (10 + random() * 26);
      y += Math.sin(angle) * (10 + random() * 26);
      context.lineTo(x, y);
    }
    context.strokeStyle = `rgba(30,32,36,${0.35 + random() * 0.3})`;
    context.lineWidth = 0.8 + random() * 1.4;
    context.stroke();
  }
}

export function concreteBase(context: CanvasRenderingContext2D, size: number, random: () => number, tone: string): void {
  context.fillStyle = tone;
  context.fillRect(0, 0, size, size);
  blobs(context, size, random, 40, size * 0.05, size * 0.2, '40,42,46', 0.1);
  blobs(context, size, random, 30, size * 0.04, size * 0.15, '200,202,205', 0.06);
  specks(context, size, random, size * 5, 3, 0.12, 0.16);
  // Small pits.
  for (let i = 0; i < size * 0.6; i++) {
    context.fillStyle = `rgba(20,22,26,${0.2 + random() * 0.3})`;
    const r = 0.6 + random() * 1.6;
    wrapped(size, random() * size, random() * size, r, (x, y) => {
      context.beginPath();
      context.arc(x, y, r, 0, Math.PI * 2);
      context.fill();
    });
  }
}

const paintFloor: Painter = (context, size, random) => {
  concreteBase(context, size, random, '#85888c');
  blobs(context, size, random, 10, size * 0.08, size * 0.22, '16,16,18', 0.22);
  cracks(context, size, random, 5);
  // Slab joints every two meters of a four meter tile.
  for (const at of [0, size / 2]) {
    for (const [x, y, w, h] of [
      [at - 2, 0, 4, size],
      [0, at - 2, size, 4],
    ]) {
      context.fillStyle = 'rgba(14,15,17,0.85)';
      wrapped(size, x, y, 4, (px, py) => context.fillRect(px, py, w, h));
      context.fillStyle = 'rgba(210,212,215,0.18)';
      wrapped(size, x + (w === 4 ? 4 : 0), y + (h === 4 ? 4 : 0), 4, (px, py) => context.fillRect(px, py, w === 4 ? 2 : w, h === 4 ? 2 : h));
    }
  }
};

// Hospital floor: square tiles in a grid of grout, each a shade apart, scuffed by feet and trolleys.
const paintTile: Painter = (context, size, random) => {
  context.fillStyle = '#d9dcd9';
  context.fillRect(0, 0, size, size);
  const cell = size / 4;
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const shade = 200 + Math.floor(random() * 40);
      context.fillStyle = `rgb(${shade},${shade + 2},${shade})`;
      context.fillRect(col * cell, row * cell, cell, cell);
    }
  }
  blobs(context, size, random, 14, size * 0.05, size * 0.2, '60,66,70', 0.07);
  // Scuffs from shoes and wheels.
  context.lineCap = 'round';
  for (let i = 0; i < 26; i++) {
    const x = random() * size;
    const y = random() * size;
    context.strokeStyle = `rgba(70,74,78,${0.08 + random() * 0.12})`;
    context.lineWidth = 1 + random() * 3;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + (random() - 0.5) * 120, y + (random() - 0.5) * 40);
    context.stroke();
  }
  // Grout.
  context.fillStyle = 'rgba(70,76,80,0.75)';
  for (let i = 0; i < 4; i++) {
    context.fillRect(i * cell - 2, 0, 4, size);
    context.fillRect(0, i * cell - 2, size, 4);
  }
  context.fillRect(size - 2, 0, 2, size);
  context.fillRect(0, size - 2, size, 2);
  specks(context, size, random, size * 2, 2, 0.1, 0.12);
};

// Painted plaster, one wall's height tall: a dark skirting, a darker band to chair height with a
// rail on top, then plain wall. The paint colour comes from the box.
const paintPlaster: Painter = (context, size, random) => {
  const metre = size / 3.4;
  context.fillStyle = '#ecece6';
  context.fillRect(0, 0, size, size);
  blobs(context, size, random, 22, size * 0.06, size * 0.22, '110,100,80', 0.06);
  const dado = size - 1.05 * metre;
  context.fillStyle = 'rgba(70,80,84,0.22)';
  context.fillRect(0, dado, size, size - dado);
  // The rail, lit on top and shadowed below.
  context.fillStyle = 'rgba(255,255,255,0.7)';
  context.fillRect(0, dado - 4, size, 5);
  context.fillStyle = 'rgba(20,24,28,0.4)';
  context.fillRect(0, dado + 1, size, 5);
  // Skirting.
  context.fillStyle = '#4f5659';
  context.fillRect(0, size - 0.12 * metre, size, 0.12 * metre);
  context.fillStyle = 'rgba(255,255,255,0.22)';
  context.fillRect(0, size - 0.12 * metre, size, 3);
  // Scrapes where trolleys and beds have hit the wall at bed height.
  context.lineCap = 'round';
  for (let i = 0; i < 18; i++) {
    const x = random() * size;
    const y = size - (0.5 + random() * 0.5) * metre;
    context.strokeStyle = `rgba(60,64,66,${0.1 + random() * 0.14})`;
    context.lineWidth = 1 + random() * 3;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + (random() - 0.5) * 160, y + (random() - 0.5) * 10);
    context.stroke();
  }
  // Water stains run down from the ceiling.
  for (let i = 0; i < 3; i++) {
    const x = random() * size;
    const streak = context.createLinearGradient(0, 0, 0, size * 0.5);
    streak.addColorStop(0, 'rgba(120,96,50,0.22)');
    streak.addColorStop(1, 'rgba(120,96,50,0)');
    context.fillStyle = streak;
    context.fillRect(x, 0, 14 + random() * 30, size * 0.5);
  }
  specks(context, size, random, size * 2, 2, 0.1, 0.1);
};

// Suspended ceiling: pale panels in a metal grid, with a few stained.
const paintCeiling: Painter = (context, size, random) => {
  context.fillStyle = '#e4e6e4';
  context.fillRect(0, 0, size, size);
  const cell = size / 4;
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      if (random() < 0.15) {
        context.fillStyle = `rgba(120,100,60,${0.08 + random() * 0.12})`;
        context.fillRect(col * cell, row * cell, cell, cell);
      }
    }
  }
  for (let i = 0; i < size * 1.5; i++) {
    context.fillStyle = `rgba(60,62,64,${0.1 + random() * 0.2})`;
    context.fillRect(random() * size, random() * size, 2, 2);
  }
  context.fillStyle = 'rgba(70,76,80,0.9)';
  for (let i = 0; i < 4; i++) {
    context.fillRect(i * cell - 3, 0, 6, size);
    context.fillRect(0, i * cell - 3, size, 6);
  }
};

const paintWall: Painter = (context, size, random) => {
  concreteBase(context, size, random, '#8c8f93');
  cracks(context, size, random, 2);
  // Panel joints: one down each side of a four meter panel and one across the middle.
  context.fillStyle = 'rgba(12,13,15,0.9)';
  context.fillRect(0, 0, 6, size);
  context.fillRect(0, size / 2 - 3, size, 6);
  context.fillStyle = 'rgba(220,222,225,0.16)';
  context.fillRect(6, 0, 2, size);
  context.fillRect(0, size / 2 + 3, size, 2);
  // Bolts at the joints, each with a rust streak below it.
  for (const bx of [28, size - 28]) {
    for (const by of [size / 2 - 40, size / 2 + 40, 60, size - 60]) {
      const streak = context.createLinearGradient(0, by, 0, by + 150 + random() * 120);
      streak.addColorStop(0, 'rgba(110,52,24,0.55)');
      streak.addColorStop(1, 'rgba(110,52,24,0)');
      context.fillStyle = streak;
      context.fillRect(bx - 3, by, 6, 270);
      context.fillStyle = '#26282b';
      context.beginPath();
      context.arc(bx, by, 7, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = 'rgba(200,202,205,0.35)';
      context.beginPath();
      context.arc(bx - 2, by - 2, 3, 0, Math.PI * 2);
      context.fill();
    }
  }
  // Grime climbs the base of the wall. The wall is one tile tall, so the base is the bottom edge.
  const grime = context.createLinearGradient(0, size, 0, size * 0.55);
  grime.addColorStop(0, 'rgba(20,18,14,0.6)');
  grime.addColorStop(1, 'rgba(20,18,14,0)');
  context.fillStyle = grime;
  context.fillRect(0, size * 0.55, size, size * 0.45);
  blobs(context, size, random, 6, size * 0.06, size * 0.15, '70,58,40', 0.16);
};

const paintCrate: Painter = (context, size, random) => {
  const wood = ['#a67e50', '#9c7547', '#b08656', '#94703f'];
  context.fillStyle = '#5a4126';
  context.fillRect(0, 0, size, size);
  const frame = size * 0.09;
  const slats = 5;
  const slatWidth = (size - frame * 2) / slats;
  // The slats between the frame boards, each its own shade.
  for (let i = 0; i < slats; i++) {
    const x = frame + i * slatWidth;
    context.fillStyle = wood[Math.floor(random() * wood.length)];
    context.fillRect(x + 1.5, frame, slatWidth - 3, size - frame * 2);
    // Grain.
    for (let g = 0; g < 14; g++) {
      const gx = x + 3 + random() * (slatWidth - 6);
      context.strokeStyle = `rgba(${random() < 0.5 ? '40,24,10' : '230,200,150'},${0.1 + random() * 0.12})`;
      context.lineWidth = 0.7 + random();
      context.beginPath();
      context.moveTo(gx, frame);
      context.bezierCurveTo(gx + 6, size * 0.3, gx - 6, size * 0.6, gx + 2, size - frame);
      context.stroke();
    }
  }
  // The frame boards around the edge.
  for (const [x, y, w, h] of [
    [0, 0, size, frame],
    [0, size - frame, size, frame],
    [0, 0, frame, size],
    [size - frame, 0, frame, size],
  ]) {
    context.fillStyle = wood[Math.floor(random() * wood.length)];
    context.fillRect(x + 1.5, y + 1.5, w - 3, h - 3);
    context.fillStyle = 'rgba(0,0,0,0.18)';
    context.fillRect(x + 1.5, y + h - 4.5, w - 3, 3);
  }
  // A diagonal brace across the slats, nailed at both ends.
  context.save();
  context.translate(size / 2, size / 2);
  context.rotate(Math.PI / 4);
  const length = size * 1.28;
  const braceWidth = frame * 1.1;
  context.fillStyle = 'rgba(0,0,0,0.35)';
  context.fillRect(-length / 2 + 2, -braceWidth / 2 + 5, length, braceWidth);
  context.fillStyle = wood[1];
  context.fillRect(-length / 2, -braceWidth / 2, length, braceWidth);
  for (let g = 0; g < 18; g++) {
    context.strokeStyle = `rgba(40,24,10,${0.1 + random() * 0.12})`;
    context.beginPath();
    const gy = -braceWidth / 2 + random() * braceWidth;
    context.moveTo(-length / 2, gy);
    context.lineTo(length / 2, gy + (random() - 0.5) * 3);
    context.stroke();
  }
  context.restore();
  // Clip the brace to the panel: repaint the frame over it.
  for (const [x, y, w, h] of [
    [0, 0, size, frame],
    [0, size - frame, size, frame],
    [0, 0, frame, size],
    [size - frame, 0, frame, size],
  ]) {
    context.fillStyle = wood[Math.floor(random() * wood.length)];
    context.fillRect(x + 1.5, y + 1.5, w - 3, h - 3);
  }
  // Nail heads on the corners and the middle of each edge.
  context.fillStyle = '#35373a';
  for (const [nx, ny] of [
    [0.045, 0.045], [0.955, 0.045], [0.045, 0.955], [0.955, 0.955], [0.5, 0.045], [0.5, 0.955], [0.045, 0.5], [0.955, 0.5],
  ]) {
    context.beginPath();
    context.arc(nx * size, ny * size, size * 0.012, 0, Math.PI * 2);
    context.fill();
  }
  blobs(context, size, random, 8, size * 0.08, size * 0.25, '25,16,8', 0.22);
  specks(context, size, random, size * 1.5, 2, 0.06, 0.12);
};

const paintContainer: Painter = (context, size, random) => {
  context.fillStyle = '#b9bcc0';
  context.fillRect(0, 0, size, size);
  // Corrugation: nine ribs across the tile, lit from one side.
  const ribs = 9;
  const ribWidth = size / ribs;
  for (let i = 0; i < ribs; i++) {
    const gradient = context.createLinearGradient(i * ribWidth, 0, (i + 1) * ribWidth, 0);
    gradient.addColorStop(0, 'rgba(255,255,255,0.35)');
    gradient.addColorStop(0.35, 'rgba(255,255,255,0.05)');
    gradient.addColorStop(0.5, 'rgba(0,0,0,0.22)');
    gradient.addColorStop(0.62, 'rgba(0,0,0,0.05)');
    gradient.addColorStop(1, 'rgba(255,255,255,0.35)');
    context.fillStyle = gradient;
    context.fillRect(i * ribWidth, 0, ribWidth, size);
  }
  // Rain streaks and dirt running down the ribs.
  for (let i = 0; i < 70; i++) {
    const x = random() * size;
    const length = size * (0.15 + random() * 0.6);
    const y = random() * size;
    const streak = context.createLinearGradient(0, y, 0, y + length);
    streak.addColorStop(0, 'rgba(40,30,20,0)');
    streak.addColorStop(0.2, `rgba(40,30,20,${0.08 + random() * 0.12})`);
    streak.addColorStop(1, 'rgba(40,30,20,0)');
    context.fillStyle = streak;
    wrapped(size, x, y, length, (px, py) => context.fillRect(px, py, 2 + random() * 5, length));
  }
  // Chipped paint showing rust.
  for (let i = 0; i < 36; i++) {
    const r = 2 + random() * 8;
    context.fillStyle = `rgba(${95 + random() * 40},${40 + random() * 25},${14 + random() * 14},${0.2 + random() * 0.3})`;
    wrapped(size, random() * size, random() * size, r, (x, y) => {
      context.beginPath();
      context.ellipse(x, y, r, r * (0.4 + random() * 0.8), random() * 3, 0, Math.PI * 2);
      context.fill();
    });
  }
  blobs(context, size, random, 14, size * 0.05, size * 0.2, '30,24,18', 0.2);
  specks(context, size, random, size * 3, 2, 0.1, 0.16);
};

const paintBarrel: Painter = (context, size, random) => {
  context.fillStyle = '#d6d6d6';
  context.fillRect(0, 0, size, size);
  blobs(context, size, random, 22, size * 0.04, size * 0.16, '60,22,10', 0.4);
  blobs(context, size, random, 18, size * 0.03, size * 0.12, '20,14,10', 0.3);
  for (let i = 0; i < 160; i++) {
    const r = 1.5 + random() * 7;
    context.fillStyle = `rgba(${100 + random() * 40},${44 + random() * 24},${14 + random() * 10},${0.3 + random() * 0.5})`;
    wrapped(size, random() * size, random() * size, r, (x, y) => {
      context.beginPath();
      context.ellipse(x, y, r, r * (0.4 + random() * 0.8), random() * 3, 0, Math.PI * 2);
      context.fill();
    });
  }
  for (let i = 0; i < 40; i++) {
    const x = random() * size;
    const y = random() * size;
    const length = size * (0.1 + random() * 0.4);
    const streak = context.createLinearGradient(0, y, 0, y + length);
    streak.addColorStop(0, 'rgba(70,30,12,0.5)');
    streak.addColorStop(1, 'rgba(70,30,12,0)');
    context.fillStyle = streak;
    wrapped(size, x, y, length, (px, py) => context.fillRect(px, py, 2 + random() * 3, length));
  }
  specks(context, size, random, size * 2, 2, 0.08, 0.14);
};

const paintGlow: Painter = (context, size) => {
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.15, 'rgba(255,255,255,0.55)');
  gradient.addColorStop(0.45, 'rgba(255,255,255,0.14)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
};

// A bright soft dot, for a lamp's glow.
export function glowTexture(): THREE.CanvasTexture {
  const texture = paintTexture(128, 1, paintGlow);
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

// Painted once over the whole floor: lane lines, scuffs, oil and dirt along the walls.
export function floorDecalTexture(): THREE.CanvasTexture {
  const texture = paintTexture(2048, 41, (context, size, random) => {
    const scale = size / 21;
    const meters = (value: number) => (value + 10.5) * scale;
    context.clearRect(0, 0, size, size);

    // Dirt gathers along the walls.
    for (const [x0, y0, x1, y1] of [
      [0, 0, 1, 0], [0, 0, 0, 1], [size, 0, size - 1, 0], [0, size, 0, size - 1],
    ]) {
      const gradient = context.createLinearGradient(x0, y0, x0 + (x1 - x0) * size * 0.1, y0 + (y1 - y0) * size * 0.1);
      gradient.addColorStop(0, 'rgba(14,12,9,0.5)');
      gradient.addColorStop(1, 'rgba(14,12,9,0)');
      context.fillStyle = gradient;
      context.fillRect(0, 0, size, size);
    }
    blobs(context, size, random, 30, size * 0.02, size * 0.07, '10,9,8', 0.3);
    blobs(context, size, random, 12, size * 0.015, size * 0.04, '6,5,4', 0.55);

    // Parking bays: white lines out from the west and east walls and the south wall, a stop line
    // at the foot of the ramp, arrows, and yellow hatching under the loading dock.
    context.strokeStyle = 'rgba(226,226,220,0.8)';
    context.lineWidth = 0.12 * scale;
    const line = (x0: number, z0: number, x1: number, z1: number) => {
      context.beginPath();
      context.moveTo(meters(x0), meters(z0));
      context.lineTo(meters(x1), meters(z1));
      context.stroke();
    };
    for (const z of [-2.7, 3.05, 8.2]) line(-10, z, -7.4, z);
    line(-7.4, -2.7, -7.4, 8.2);
    for (const z of [-3.7, 1.8]) line(7.4, z, 10, z);
    line(7.4, -3.7, 7.4, 1.8);
    for (const x of [-5.8, -0.6]) line(x, 7.3, x, 10);
    line(-5.8, 7.3, -0.6, 7.3);
    // Numbered staff spaces and a pedestrian route to the hospital lifts.
    context.save();
    context.fillStyle = 'rgba(65,116,108,0.7)';
    context.fillRect(meters(-7.1), meters(-8.8), 0.6 * scale, 16.6 * scale);
    context.fillStyle = '#e0dfcf'; context.textAlign = 'center';
    context.font = `bold ${0.55 * scale}px Arial`;
    for (const [text, x, z] of [['B01', -8.7, -2.15], ['B02', -8.7, 7.9], ['B03', 8.7, 1.5], ['B04', -3.2, 9.7]] as const) {
      context.fillText(text, meters(x), meters(z));
    }
    context.font = `bold ${0.65 * scale}px Arial`;
    context.fillText('SLOW', meters(3), meters(5.6));
    context.restore();
    // A stop line at the foot of the ramp, and arrows pointing up the ramp.
    context.fillStyle = 'rgba(226,226,220,0.8)';
    context.fillRect(meters(0.9), meters(8.9), 4.2 * scale, 0.25 * scale);
    for (const x of [2.2, 3.8]) {
      context.beginPath();
      context.moveTo(meters(x), meters(6.1));
      context.lineTo(meters(x - 0.45), meters(6.9));
      context.lineTo(meters(x - 0.15), meters(6.9));
      context.lineTo(meters(x - 0.15), meters(7.9));
      context.lineTo(meters(x + 0.15), meters(7.9));
      context.lineTo(meters(x + 0.15), meters(6.9));
      context.lineTo(meters(x + 0.45), meters(6.9));
      context.closePath();
      context.fill();
    }
    // Yellow hatching where the loading dock keeps clear.
    context.save();
    context.beginPath();
    context.rect(meters(-3.6), meters(-7.4), 7.2 * scale, 1.2 * scale);
    context.clip();
    context.strokeStyle = 'rgba(214,170,36,0.8)';
    context.lineWidth = 0.18 * scale;
    for (let i = -20; i < 40; i++) line(-3.6 + i * 0.45, -7.4, -3.6 + i * 0.45 + 1.2, -6.2);
    context.restore();
    // Worn: knock the paint back with dirt.
    specks(context, size, random, size * 9, 5, 0, 0.5);

    // Tyre marks.
    context.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      context.strokeStyle = 'rgba(8,8,8,0.3)';
      context.lineWidth = 0.22 * scale;
      context.beginPath();
      const startX = meters(-7 + random() * 14);
      const startY = meters(-4 + random() * 10);
      context.moveTo(startX, startY);
      context.bezierCurveTo(startX + 90, startY + 200, startX + 40, startY + 420, startX + 210, startY + 640);
      context.stroke();
    }
  });
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

// A soft-edged blob, for puddles.
export function puddleAlphaTexture(): THREE.CanvasTexture {
  const texture = paintTexture(
    256,
    7,
    (context, size, random) => {
      context.fillStyle = '#000';
      context.fillRect(0, 0, size, size);
      for (let i = 0; i < 6; i++) {
        const x = size * (0.3 + random() * 0.4);
        const y = size * (0.3 + random() * 0.4);
        const radius = size * (0.18 + random() * 0.18);
        const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, '#fff');
        gradient.addColorStop(0.7, '#cfcfcf');
        gradient.addColorStop(1, '#000');
        context.fillStyle = gradient;
        context.globalCompositeOperation = 'lighten';
        context.fillRect(0, 0, size, size);
      }
    },
    false,
  );
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

// How many meters one repeat of the texture covers on each surface.
const TILE_METERS: Record<Surface, number> = {
  floor: 4,
  wall: 4,
  crate: 1,
  container: 1,
  barrel: 1,
  plain: 2,
  board: 1,
  pillar: 2,
  cartons: 1,
  car: 1,
  van: 1,
  slab: 4,
  tile: 2,
  plaster: 3.4,
  ceiling: 2,
  building: 12,
  gate: 1,
  lift: 1,
  lock: 1,
  step: 1,
};

export function tileMeters(surface: Surface): number {
  return TILE_METERS[surface];
}

const cache = new Map<string, THREE.MeshStandardMaterial>();

export function surfaceMaterial(surface: Surface, color: string): THREE.MeshStandardMaterial {
  const key = `${surface}:${color}`;
  const cached = cache.get(key);
  if (cached) return cached;

  let material: THREE.MeshStandardMaterial;
  switch (surface) {
    case 'floor': {
      const map = paintTexture(1024, 11, paintFloor);
      material = new THREE.MeshStandardMaterial({ map, bumpMap: map, bumpScale: 0.0132, roughness: 0.92, color });
      break;
    }
    case 'wall': {
      const map = paintTexture(1024, 12, paintWall);
      material = new THREE.MeshStandardMaterial({ map, bumpMap: map, bumpScale: 0.0132, roughness: 0.95, color });
      break;
    }
    case 'tile': {
      const map = paintTexture(1024, 21, paintTile);
      material = new THREE.MeshStandardMaterial({ map, bumpMap: map, bumpScale: 0.006, roughness: 0.38, metalness: 0.04, color });
      break;
    }
    case 'plaster': {
      const map = paintTexture(1024, 22, paintPlaster);
      material = new THREE.MeshStandardMaterial({ map, bumpMap: map, bumpScale: 0.006, roughness: 0.9, color });
      break;
    }
    case 'ceiling': {
      const map = paintTexture(512, 23, paintCeiling);
      material = new THREE.MeshStandardMaterial({ map, bumpMap: map, bumpScale: 0.01, roughness: 0.95, color });
      break;
    }
    case 'crate': {
      const map = paintTexture(512, 13, paintCrate);
      material = new THREE.MeshStandardMaterial({ map, bumpMap: map, bumpScale: 0.0096, roughness: 0.88, color });
      break;
    }
    case 'container': {
      const map = paintTexture(512, 14, paintContainer);
      material = new THREE.MeshStandardMaterial({
        map,
        bumpMap: map,
        bumpScale: 0.024,
        roughness: 0.55,
        metalness: 0.35,
        color,
      });
      break;
    }
    case 'barrel': {
      const map = paintTexture(512, 15, paintBarrel);
      material = new THREE.MeshStandardMaterial({ map, bumpMap: map, bumpScale: 0.0084, roughness: 0.5, metalness: 0.45, color });
      break;
    }
    default: {
      const map = paintTexture(512, 16, (context, size, random) => concreteBase(context, size, random, '#9a9c9f'));
      material = new THREE.MeshStandardMaterial({ map, bumpMap: map, bumpScale: 0.012, roughness: 0.93, color });
    }
  }
  cache.set(key, material);
  return material;
}

const paintSkin: Painter = (context, size, random) => {
  context.fillStyle = '#9b968b';
  context.fillRect(0, 0, size, size);
  blobs(context, size, random, 24, size * 0.05, size * 0.2, '70,60,90', 0.28);
  blobs(context, size, random, 18, size * 0.04, size * 0.16, '60,80,50', 0.3);
  blobs(context, size, random, 8, size * 0.03, size * 0.1, '90,12,12', 0.35);
  // Dark veins.
  context.lineCap = 'round';
  for (let i = 0; i < 20; i++) {
    let x = random() * size;
    let y = random() * size;
    context.beginPath();
    context.moveTo(x, y);
    for (let s = 0; s < 6; s++) {
      x += (random() - 0.5) * 40;
      y += (random() - 0.2) * 40;
      context.lineTo(x, y);
    }
    context.strokeStyle = `rgba(52,40,70,${0.25 + random() * 0.25})`;
    context.lineWidth = 0.8 + random() * 1.2;
    context.stroke();
  }
  specks(context, size, random, size * 3, 2, 0.1, 0.18);
};

const paintCloth: Painter = (context, size, random) => {
  context.fillStyle = '#bdbdbd';
  context.fillRect(0, 0, size, size);
  // Folds and wear.
  context.lineCap = 'round';
  for (let i = 0; i < 30; i++) {
    const x = random() * size;
    const y = random() * size;
    context.strokeStyle = `rgba(0,0,0,${0.08 + random() * 0.12})`;
    context.lineWidth = 2 + random() * 3;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + (random() - 0.5) * 90, y + random() * 70);
    context.stroke();
  }
  blobs(context, size, random, 16, size * 0.04, size * 0.18, '28,22,16', 0.4);
  blobs(context, size, random, 9, size * 0.03, size * 0.12, '96,10,10', 0.55);
  // Rips that show skin through.
  for (let i = 0; i < 7; i++) {
    const x = random() * size;
    const y = random() * size;
    context.fillStyle = 'rgba(120,128,108,0.9)';
    context.beginPath();
    context.moveTo(x, y);
    for (let s = 0; s < 6; s++) context.lineTo(x + (random() - 0.4) * 46, y + (random() - 0.5) * 30 + s * 6);
    context.closePath();
    context.fill();
  }
  specks(context, size, random, size * 3, 2, 0.08, 0.2);
};

export function skinTexture(): THREE.CanvasTexture {
  return paintTexture(256, 21, paintSkin);
}

export function clothTexture(): THREE.CanvasTexture {
  return paintTexture(256, 22, paintCloth);
}

const paintPlank: Painter = (context, size, random) => {
  context.fillStyle = '#a07b4d';
  context.fillRect(0, 0, size, size);
  // Grain runs along the length, which is the horizontal direction of the texture.
  for (let i = 0; i < 90; i++) {
    const y = random() * size;
    context.strokeStyle = `rgba(${random() < 0.6 ? '45,28,12' : '235,205,155'},${0.08 + random() * 0.16})`;
    context.lineWidth = 0.6 + random() * 1.8;
    context.beginPath();
    context.moveTo(0, y);
    context.bezierCurveTo(size * 0.3, y + (random() - 0.5) * 8, size * 0.6, y + (random() - 0.5) * 8, size, y + (random() - 0.5) * 4);
    context.stroke();
  }
  blobs(context, size, random, 10, size * 0.05, size * 0.2, '30,18,8', 0.3);
  specks(context, size, random, size * 2, 2, 0.08, 0.16);
};

// Rough, weathered planks, for boarding doors and for the bundles on the floor.
export function plankMaterial(): THREE.MeshStandardMaterial {
  const map = paintTexture(256, 31, paintPlank);
  return new THREE.MeshStandardMaterial({ map, bumpMap: map, bumpScale: 0.009000000000000001, roughness: 0.9 });
}
