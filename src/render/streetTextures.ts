import * as THREE from 'three';
import { blobs, concreteBase, cracks, paintTexture, specks, type Painter } from './materials';

// Painted textures for the street, the tower, cargo and signs. Like the rest, they are drawn on a
// canvas when the page loads, so there are no files to download or license.

const paintAsphalt: Painter = (context, size, random) => {
  context.fillStyle = '#3a3c40';
  context.fillRect(0, 0, size, size);
  blobs(context, size, random, 36, size * 0.05, size * 0.22, '20,20,22', 0.22);
  blobs(context, size, random, 30, size * 0.04, size * 0.18, '110,112,116', 0.1);
  // Loose stone in the tar.
  specks(context, size, random, size * 12, 3, 0.2, 0.25);
  cracks(context, size, random, 4);
  // Darker patched squares where the road has been repaired.
  for (let i = 0; i < 3; i++) {
    context.fillStyle = 'rgba(10,10,12,0.25)';
    context.fillRect(random() * size * 0.7, random() * size * 0.7, size * (0.1 + random() * 0.15), size * (0.08 + random() * 0.1));
  }
};

export function asphaltMaterial(): THREE.MeshStandardMaterial {
  const map = paintTexture(1024, 51, paintAsphalt);
  return new THREE.MeshStandardMaterial({ map, bumpMap: map, bumpScale: 2.5, roughness: 0.96 });
}

// Windows on a tower face: a grid of dark glass, some of it lit. The lit flags come from a hash of
// the cell, so the albedo and the emissive picture agree.
const CELLS = 8;
function lit(column: number, row: number, seed: number): number {
  const value = Math.abs(Math.sin(column * 127.1 + row * 311.7 + seed * 74.7) * 43758.5453) % 1;
  return value;
}

const LIGHT_TONES = ['255,214,140', '255,236,190', '170,200,255', '255,190,110'];

function paintBuilding(emissive: boolean): Painter {
  return (context, size, random) => {
    if (emissive) {
      context.fillStyle = '#000';
      context.fillRect(0, 0, size, size);
    } else {
      context.fillStyle = '#2c313a';
      context.fillRect(0, 0, size, size);
      blobs(context, size, random, 14, size * 0.08, size * 0.3, '10,12,16', 0.3);
      specks(context, size, random, size * 3, 2, 0.06, 0.12);
    }
    const pitch = size / CELLS;
    for (let column = 0; column < CELLS; column++) {
      for (let row = 0; row < CELLS; row++) {
        const x = column * pitch + pitch * 0.24;
        const y = row * pitch + pitch * 0.14;
        const w = pitch * 0.52;
        const h = pitch * 0.72;
        const glow = lit(column, row, 1);
        if (emissive) {
          if (glow > 0.22) continue;
          const tone = LIGHT_TONES[Math.floor(lit(column, row, 2) * LIGHT_TONES.length)];
          context.fillStyle = `rgba(${tone},${0.4 + lit(column, row, 3) * 0.4})`;
          context.fillRect(x, y, w, h);
        } else {
          context.fillStyle = '#10161f';
          context.fillRect(x, y, w, h);
          // A glint along the top of dark glass, and a frame.
          context.fillStyle = 'rgba(120,150,190,0.14)';
          context.fillRect(x, y, w, h * 0.22);
          context.strokeStyle = 'rgba(0,0,0,0.6)';
          context.lineWidth = 3;
          context.strokeRect(x, y, w, h);
          context.beginPath();
          context.moveTo(x + w / 2, y);
          context.lineTo(x + w / 2, y + h);
          context.stroke();
        }
      }
    }
  };
}

export function buildingMaterial(color: string): THREE.MeshStandardMaterial {
  const map = paintTexture(512, 52, paintBuilding(false));
  const emissiveMap = paintTexture(512, 52, paintBuilding(true));
  return new THREE.MeshStandardMaterial({
    map,
    emissiveMap,
    emissive: 0xffffff,
    emissiveIntensity: 1.1,
    roughness: 0.8,
    metalness: 0.1,
    color,
  });
}

const paintCardboard: Painter = (context, size, random) => {
  context.fillStyle = '#b58b58';
  context.fillRect(0, 0, size, size);
  // Corrugation shows as fine lines.
  for (let y = 0; y < size; y += 4) {
    context.fillStyle = `rgba(60,36,12,${0.05 + random() * 0.06})`;
    context.fillRect(0, y, size, 1.5);
  }
  blobs(context, size, random, 12, size * 0.08, size * 0.3, '70,44,18', 0.25);
  specks(context, size, random, size * 2, 2, 0.08, 0.14);
  // A printed mark, with an arrow, on every carton.
  context.fillStyle = 'rgba(40,30,20,0.55)';
  context.font = `bold ${size * 0.12}px sans-serif`;
  context.fillText('THIS WAY UP', size * 0.14, size * 0.3);
  context.fillRect(size * 0.44, size * 0.42, size * 0.06, size * 0.26);
  context.beginPath();
  context.moveTo(size * 0.47, size * 0.34);
  context.lineTo(size * 0.38, size * 0.45);
  context.lineTo(size * 0.56, size * 0.45);
  context.closePath();
  context.fill();
};

export function cardboardMaterial(): THREE.MeshStandardMaterial {
  const map = paintTexture(256, 53, paintCardboard);
  return new THREE.MeshStandardMaterial({ map, bumpMap: map, bumpScale: 1, roughness: 0.92 });
}

const paintHazard: Painter = (context, size, random) => {
  context.fillStyle = '#16161a';
  context.fillRect(0, 0, size, size);
  context.fillStyle = '#e2b422';
  const stripe = size / 4;
  for (let i = -4; i < 8; i++) {
    context.beginPath();
    context.moveTo(i * stripe, size);
    context.lineTo(i * stripe + stripe, size);
    context.lineTo(i * stripe + stripe + size, 0);
    context.lineTo(i * stripe + size, 0);
    context.closePath();
    context.fill();
  }
  blobs(context, size, random, 10, size * 0.05, size * 0.2, '20,16,10', 0.3);
  specks(context, size, random, size * 2, 3, 0.1, 0.3);
};

export function hazardMaterial(): THREE.MeshStandardMaterial {
  const map = paintTexture(256, 54, paintHazard);
  return new THREE.MeshStandardMaterial({ map, roughness: 0.7 });
}

// A flat sign with lines of text. Used for the parking sign over the ramp, the pillar numbers and
// the labels on the walls.
export function labelTexture(
  lines: { text: string; size: number; color: string }[],
  background: string,
  width: number,
  height: number,
  border?: string,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d')!;
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);
  if (border) {
    context.strokeStyle = border;
    context.lineWidth = height * 0.04;
    context.strokeRect(height * 0.04, height * 0.04, width - height * 0.08, height * 0.92);
  }
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  const total = lines.reduce((sum, line) => sum + line.size * 1.25, 0);
  let y = (height - total) / 2;
  for (const line of lines) {
    context.font = `bold ${line.size}px 'Arial Narrow', 'Bahnschrift', sans-serif`;
    context.fillStyle = line.color;
    context.fillText(line.text, width / 2, y + line.size * 0.625);
    y += line.size * 1.25;
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

// Slats of a roller shutter, across the width, with a hazard bar along the bottom edge.
const paintShutter: Painter = (context, size, random) => {
  context.fillStyle = '#7c8187';
  context.fillRect(0, 0, size, size);
  const slats = 16;
  const slat = size / slats;
  for (let i = 0; i < slats; i++) {
    const gradient = context.createLinearGradient(0, i * slat, 0, (i + 1) * slat);
    gradient.addColorStop(0, 'rgba(255,255,255,0.3)');
    gradient.addColorStop(0.45, 'rgba(255,255,255,0.02)');
    gradient.addColorStop(0.55, 'rgba(0,0,0,0.3)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.05)');
    context.fillStyle = gradient;
    context.fillRect(0, i * slat, size, slat);
  }
  for (let i = 0; i < 40; i++) {
    const x = random() * size;
    const y = random() * size;
    const streak = context.createLinearGradient(0, y, 0, y + size * 0.3);
    streak.addColorStop(0, 'rgba(90,50,25,0.35)');
    streak.addColorStop(1, 'rgba(90,50,25,0)');
    context.fillStyle = streak;
    context.fillRect(x, y, 2 + random() * 4, size * 0.3);
  }
  blobs(context, size, random, 12, size * 0.04, size * 0.16, '30,26,22', 0.25);
  specks(context, size, random, size * 2, 2, 0.1, 0.18);
};

export function shutterMaterial(): THREE.MeshStandardMaterial {
  const map = paintTexture(512, 55, paintShutter);
  return new THREE.MeshStandardMaterial({ map, bumpMap: map, bumpScale: 4, roughness: 0.5, metalness: 0.7 });
}

// The street and plaza, painted once over everything at street level. The ramp is cut out of it.
export function streetDecalTexture(
  x0: number,
  z0: number,
  width: number,
  depth: number,
  ramp: { x: number; width: number; zBottom: number; zTop: number },
): THREE.CanvasTexture {
  const pixels = 2048;
  const scale = pixels / width;
  const canvas = document.createElement('canvas');
  canvas.width = pixels;
  canvas.height = Math.round(depth * scale);
  const context = canvas.getContext('2d')!;
  const random = (() => {
    let state = 77;
    return () => ((state = (state * 16807) % 2147483647) - 1) / 2147483646;
  })();
  const px = (x: number) => (x - x0) * scale;
  const pz = (z: number) => (z - z0) * scale;

  // Pavement over the plaza and the far sidewalk. The road in between stays bare asphalt.
  const paving = (zFrom: number, zTo: number) => {
    context.fillStyle = '#8b8d90';
    context.fillRect(px(x0), pz(zFrom), width * scale, (zTo - zFrom) * scale);
    // Slab joints every 1.5 meters, and wear.
    context.strokeStyle = 'rgba(20,20,22,0.55)';
    context.lineWidth = 2;
    for (let x = x0; x <= x0 + width; x += 1.5) {
      context.beginPath();
      context.moveTo(px(x), pz(zFrom));
      context.lineTo(px(x), pz(zTo));
      context.stroke();
    }
    for (let z = zFrom; z <= zTo; z += 1.5) {
      context.beginPath();
      context.moveTo(px(x0), pz(z));
      context.lineTo(px(x0 + width), pz(z));
      context.stroke();
    }
    for (let i = 0; i < 90; i++) {
      const cx = px(x0 + random() * width);
      const cz = pz(zFrom + random() * (zTo - zFrom));
      const radius = 20 + random() * 90;
      const gradient = context.createRadialGradient(cx, cz, 0, cx, cz, radius);
      gradient.addColorStop(0, `rgba(${random() < 0.7 ? '20,20,22' : '200,200,205'},${0.1 + random() * 0.18})`);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      context.fillStyle = gradient;
      context.fillRect(cx - radius, cz - radius, radius * 2, radius * 2);
    }
  };
  paving(10.5, 35.5);
  paving(46.5, 48);

  // Kerbs.
  context.fillStyle = '#b4b6b8';
  context.fillRect(px(x0), pz(35.5), width * scale, 0.5 * scale);
  context.fillRect(px(x0), pz(46), width * scale, 0.5 * scale);
  context.fillStyle = 'rgba(0,0,0,0.35)';
  context.fillRect(px(x0), pz(36), width * scale, 0.08 * scale);
  context.fillRect(px(x0), pz(45.92), width * scale, 0.08 * scale);

  // A dashed white line down the middle of the road, and a worn edge line each side.
  context.fillStyle = 'rgba(224,224,216,0.8)';
  for (let x = x0 + 1; x < x0 + width - 3; x += 5) context.fillRect(px(x), pz(41) - 0.06 * scale, 3 * scale, 0.14 * scale);
  context.fillStyle = 'rgba(214,170,36,0.65)';
  context.fillRect(px(x0), pz(36.5), width * scale, 0.1 * scale);
  context.fillRect(px(x0), pz(45.4), width * scale, 0.1 * scale);

  // A zebra crossing from the far sidewalk to the ramp.
  context.fillStyle = 'rgba(232,232,226,0.82)';
  for (let x = -1.2; x < 7.4; x += 1) context.fillRect(px(x), pz(36.6), 0.5 * scale, 8.8 * scale);

  // Manhole covers and a drain at the kerb.
  for (const [x, z] of [[-10, 39], [12, 43.5], [-18, 31]]) {
    context.fillStyle = 'rgba(14,14,16,0.85)';
    context.beginPath();
    context.arc(px(x), pz(z), 0.45 * scale, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = 'rgba(120,120,125,0.6)';
    context.lineWidth = 3;
    context.stroke();
  }

  // Dirt and tyre marks over the road, and worn paint.
  for (let i = 0; i < 30; i++) {
    const cx = px(x0 + random() * width);
    const cz = pz(36 + random() * 10);
    const radius = 30 + random() * 120;
    const gradient = context.createRadialGradient(cx, cz, 0, cx, cz, radius);
    gradient.addColorStop(0, 'rgba(8,8,9,0.3)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = gradient;
    context.fillRect(cx - radius, cz - radius, radius * 2, radius * 2);
  }
  context.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    context.strokeStyle = 'rgba(6,6,7,0.3)';
    context.lineWidth = 0.2 * scale;
    context.beginPath();
    const startX = px(x0 + 4 + random() * (width - 8));
    context.moveTo(startX, pz(36.6));
    context.bezierCurveTo(startX + 40, pz(39), startX - 30, pz(42), startX + 60, pz(45.4));
    context.stroke();
  }

  // The ramp is a hole in the street. Leave it clear, with a hazard-striped edge around it.
  context.clearRect(px(ramp.x - ramp.width / 2 - 0.5), pz(ramp.zBottom), (ramp.width + 1) * scale, (ramp.zTop - ramp.zBottom) * scale);
  // Yellow warning paint across the top of the ramp.
  context.fillStyle = 'rgba(224,180,34,0.85)';
  for (let i = 0; i < 9; i++) {
    context.fillRect(px(ramp.x - ramp.width / 2 + i * (ramp.width / 9)), pz(ramp.zTop + 0.1), (ramp.width / 9) * 0.55 * scale, 0.5 * scale);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

// Kept so the floor and wall painters can share the concrete look.
export function plainConcreteTexture(): THREE.CanvasTexture {
  return paintTexture(512, 56, (context, size, random) => concreteBase(context, size, random, '#8c8e92'));
}
