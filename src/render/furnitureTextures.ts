import * as THREE from 'three';
import { blobs, paintTexture, specks } from './materials';

// Canvas-painted textures for the hospital furniture: surfaces that tile in metres, and the
// screens, labels and stains that are drawn once and stretched over one face.

export type Random = () => number;

export function seeded(seed: number): Random {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const cache = new Map<string, THREE.CanvasTexture>();
function once(key: string, make: () => THREE.CanvasTexture): THREE.CanvasTexture {
  let texture = cache.get(key);
  if (!texture) {
    texture = make();
    cache.set(key, texture);
  }
  return texture;
}

// A canvas of any shape, for a picture that covers one face rather than tiling.
function picture(width: number, height: number, seed: number, paint: (context: CanvasRenderingContext2D, width: number, height: number, random: Random) => void): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  paint(canvas.getContext('2d')!, width, height, seeded(seed));
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

const FONT = "'Bahnschrift', 'Segoe UI', Arial, sans-serif";
function write(context: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, color: string, weight = 700, align: CanvasTextAlign = 'left'): void {
  context.font = `${weight} ${size}px ${FONT}`;
  context.fillStyle = color;
  context.textAlign = align;
  context.textBaseline = 'middle';
  context.fillText(text, x, y);
}

// Lines of grey bars that read as text from a distance.
function textLines(context: CanvasRenderingContext2D, random: Random, x: number, y: number, width: number, rows: number, gap: number, color: string): void {
  context.fillStyle = color;
  for (let row = 0; row < rows; row++) {
    let cursor = x;
    const end = x + width * (0.55 + random() * 0.45);
    while (cursor < end) {
      const word = 6 + random() * 26;
      context.fillRect(cursor, y + row * gap, Math.min(word, end - cursor), gap * 0.42);
      cursor += word + 4;
    }
  }
}

// Long, fine grain under a clear lacquer. Pale, so the material's colour sets the wood.
export const veneer = () => once('veneer', () => paintTexture(512, 51, (context, size, random) => {
  context.fillStyle = '#ebdfcf';
  context.fillRect(0, 0, size, size);
  for (let i = 0; i < 170; i++) {
    const y = random() * size;
    context.strokeStyle = random() < 0.72 ? `rgba(96,60,28,${0.05 + random() * 0.15})` : `rgba(255,244,222,${0.06 + random() * 0.1})`;
    context.lineWidth = 0.6 + random() * 2.4;
    context.beginPath();
    context.moveTo(-10, y);
    context.bezierCurveTo(size * 0.33, y + (random() - 0.5) * 16, size * 0.66, y + (random() - 0.5) * 16, size + 10, y);
    context.stroke();
  }
  blobs(context, size, random, 14, size * 0.05, size * 0.2, '120,80,40', 0.12);
  specks(context, size, random, size * 2, 1.5, 0.05, 0.08);
}));

// Powder-coated steel: grime collected low down, scuffs, and a little rust.
export const grime = () => once('grime', () => paintTexture(512, 52, (context, size, random) => {
  context.fillStyle = '#ebebe8';
  context.fillRect(0, 0, size, size);
  blobs(context, size, random, 20, size * 0.04, size * 0.2, '70,64,56', 0.1);
  blobs(context, size, random, 7, size * 0.01, size * 0.04, '120,70,30', 0.18);
  context.lineCap = 'round';
  for (let i = 0; i < 70; i++) {
    const x = random() * size;
    const y = random() * size;
    const light = random() < 0.5;
    context.strokeStyle = light ? `rgba(255,255,255,${0.2 + random() * 0.25})` : `rgba(30,28,26,${0.1 + random() * 0.14})`;
    context.lineWidth = 0.6 + random() * 1.2;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + (random() - 0.5) * 50, y + (random() - 0.5) * 10);
    context.stroke();
  }
  specks(context, size, random, size * 3, 1.5, 0.08, 0.12);
}));

export const laminate = () => once('laminate', () => paintTexture(256, 53, (context, size, random) => {
  context.fillStyle = '#eeeeec';
  context.fillRect(0, 0, size, size);
  blobs(context, size, random, 10, size * 0.05, size * 0.25, '0,0,0', 0.035);
  specks(context, size, random, size * 4, 1, 0.07, 0.07);
}));

export const vinyl = () => once('vinyl', () => paintTexture(256, 54, (context, size, random) => {
  context.fillStyle = '#e6e6e6';
  context.fillRect(0, 0, size, size);
  blobs(context, size, random, 14, size * 0.05, size * 0.2, '0,0,0', 0.06);
  context.lineCap = 'round';
  for (let i = 0; i < 18; i++) {
    const x = random() * size;
    const y = random() * size;
    context.strokeStyle = `rgba(0,0,0,${0.06 + random() * 0.08})`;
    context.lineWidth = 0.8;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + (random() - 0.5) * 30, y + (random() - 0.5) * 30);
    context.stroke();
  }
  specks(context, size, random, size * 2, 1, 0.05, 0.06);
}));

function bloodStain(context: CanvasRenderingContext2D, random: Random, x: number, y: number, radius: number): void {
  for (let i = 0; i < 9; i++) {
    const px = x + (random() - 0.5) * radius;
    const py = y + (random() - 0.5) * radius;
    const r = radius * (0.3 + random() * 0.5);
    const gradient = context.createRadialGradient(px, py, 0, px, py, r);
    gradient.addColorStop(0, 'rgba(120,8,8,0.85)');
    gradient.addColorStop(0.75, 'rgba(105,6,6,0.7)');
    gradient.addColorStop(1, 'rgba(80,10,8,0)');
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(px, py, r, 0, Math.PI * 2);
    context.fill();
  }
  for (let i = 0; i < 26; i++) {
    const angle = random() * Math.PI * 2;
    const distance = radius * (0.6 + random() * 1.1);
    context.fillStyle = `rgba(100,6,6,${0.5 + random() * 0.4})`;
    context.beginPath();
    context.arc(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance, 1 + random() * 3.5, 0, Math.PI * 2);
    context.fill();
  }
}

// Cotton sheet with a fine weave and creases. White, so the material can dye it green for theatre
// drapes; blood on a dyed sheet goes dark, as it does.
export const sheet = (bloody: boolean) => once(`sheet:${bloody}`, () => paintTexture(512, bloody ? 56 : 55, (context, size, random) => {
  context.fillStyle = '#f4f4f0';
  context.fillRect(0, 0, size, size);
  for (let i = 0; i < size; i += 3) {
    context.fillStyle = 'rgba(0,0,0,0.025)';
    context.fillRect(0, i, size, 1);
    context.fillRect(i, 0, 1, size);
  }
  context.lineCap = 'round';
  for (let i = 0; i < 28; i++) {
    const x = random() * size;
    const y = random() * size;
    context.strokeStyle = `rgba(0,0,0,${0.03 + random() * 0.04})`;
    context.lineWidth = 5 + random() * 12;
    context.beginPath();
    context.moveTo(x, y);
    context.quadraticCurveTo(x + (random() - 0.5) * 120, y + (random() - 0.5) * 120, x + (random() - 0.5) * 220, y + (random() - 0.5) * 220);
    context.stroke();
  }
  blobs(context, size, random, 10, size * 0.05, size * 0.2, '90,80,60', 0.05);
  if (bloody) {
    for (let i = 0; i < 3; i++) bloodStain(context, random, size * (0.2 + random() * 0.6), size * (0.2 + random() * 0.6), size * (0.06 + random() * 0.08));
  }
}));

// Hospital curtain print: a small two-tone motif on white, dyed by the material.
export const curtain = () => once('curtain', () => paintTexture(256, 57, (context, size, random) => {
  context.fillStyle = '#f6f8f8';
  context.fillRect(0, 0, size, size);
  const step = size / 8;
  for (let x = 0; x < 8; x++) {
    for (let y = 0; y < 8; y++) {
      const cx = x * step + step / 2 + (y % 2) * step / 2;
      const cy = y * step + step / 2;
      context.fillStyle = 'rgba(70,120,124,0.45)';
      context.beginPath();
      context.moveTo(cx, cy - step * 0.22);
      context.lineTo(cx + step * 0.22, cy);
      context.lineTo(cx, cy + step * 0.22);
      context.lineTo(cx - step * 0.22, cy);
      context.closePath();
      context.fill();
      context.fillStyle = 'rgba(150,190,190,0.35)';
      context.fillRect(cx - step * 0.06 + step / 2, cy - step * 0.06, step * 0.12, step * 0.12);
    }
  }
  blobs(context, size, random, 8, size * 0.05, size * 0.2, '60,55,40', 0.06);
}));

// The open mesh along the top of a bay curtain. Drawn with alpha, cut out by alpha test.
export const net = () => once('net', () => {
  const texture = paintTexture(128, 58, (context, size) => {
    context.strokeStyle = '#ffffff';
    context.lineWidth = 3;
    for (let i = 0; i <= size; i += 10) {
      context.beginPath();
      context.moveTo(i, 0);
      context.lineTo(i, size);
      context.moveTo(0, i);
      context.lineTo(size, i);
      context.stroke();
    }
  });
  return texture;
});

// A soft dark rectangle, for the shadow on the floor under a piece of furniture.
export const contactShadow = () => once('contact', () => {
  const texture = paintTexture(128, 59, (context) => {
    context.shadowColor = 'rgba(0,0,0,1)';
    context.shadowBlur = 22;
    context.shadowOffsetX = 1000;
    context.fillStyle = '#000';
    context.fillRect(30 - 1000, 30, 68, 68);
  }, false);
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
});

// A pool of blood with smears and drops around it, mostly dried at the edges.
export const bloodPool = (variant: number) => once(`blood:${variant}`, () => {
  const texture = paintTexture(256, 60 + variant, (context, size, random) => {
    const cx = size / 2;
    const cy = size / 2;
    for (let i = 0; i < 14; i++) {
      const angle = random() * Math.PI * 2;
      const distance = random() * size * 0.16;
      const r = size * (0.08 + random() * 0.12);
      const x = cx + Math.cos(angle) * distance;
      const y = cy + Math.sin(angle) * distance;
      const gradient = context.createRadialGradient(x, y, 0, x, y, r);
      gradient.addColorStop(0, 'rgba(70,2,2,0.95)');
      gradient.addColorStop(0.85, 'rgba(62,3,3,0.9)');
      gradient.addColorStop(1, 'rgba(50,6,4,0)');
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(x, y, r, 0, Math.PI * 2);
      context.fill();
    }
    // A smear dragged out of it.
    const angle = random() * Math.PI * 2;
    context.save();
    context.translate(cx, cy);
    context.rotate(angle);
    for (let i = 0; i < 6; i++) {
      context.fillStyle = `rgba(66,4,4,${0.35 + random() * 0.3})`;
      context.fillRect(size * 0.1, -size * 0.05 + i * size * 0.018, size * (0.18 + random() * 0.2), size * 0.012);
    }
    context.restore();
    for (let i = 0; i < 40; i++) {
      const a = random() * Math.PI * 2;
      const distance = size * (0.24 + random() * 0.2);
      context.fillStyle = `rgba(70,3,3,${0.6 + random() * 0.35})`;
      context.beginPath();
      context.arc(cx + Math.cos(a) * distance, cy + Math.sin(a) * distance, 1 + random() * 4, 0, Math.PI * 2);
      context.fill();
    }
  });
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
});

// What the office computers were showing when the power stayed on and the staff did not.
export const officeScreen = (variant: number) => once(`office:${variant}`, () => picture(512, 320, 70 + variant, (context, w, h, random) => {
  if (variant === 0) {
    const gradient = context.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, '#12385f');
    gradient.addColorStop(1, '#071526');
    context.fillStyle = gradient;
    context.fillRect(0, 0, w, h);
    context.fillStyle = '#0a0f16';
    context.fillRect(0, h - 22, w, 22);
    for (let i = 0; i < 6; i++) {
      context.fillStyle = ['#3d7bd9', '#e3a33a', '#3aa36a', '#cfd6de', '#c94c4c', '#8a63c9'][i];
      context.fillRect(10 + i * 26, h - 17, 16, 12);
    }
    context.fillStyle = '#e9edf1';
    context.fillRect(30, 24, 450, 240);
    context.fillStyle = '#2b5d8f';
    context.fillRect(30, 24, 450, 22);
    write(context, 'PATIENT RECORDS  -  ADMISSIONS', 40, 35, 13, '#ffffff');
    context.strokeStyle = 'rgba(40,60,80,0.25)';
    for (let y = 58; y < 260; y += 14) {
      context.beginPath();
      context.moveTo(30, y);
      context.lineTo(480, y);
      context.stroke();
    }
    textLines(context, random, 40, 61, 420, 14, 14, 'rgba(40,52,64,0.55)');
    context.fillStyle = '#f7f7f7';
    context.fillRect(130, 110, 250, 104);
    context.strokeStyle = '#c0392b';
    context.lineWidth = 3;
    context.strokeRect(130, 110, 250, 104);
    context.fillStyle = '#c0392b';
    context.fillRect(130, 110, 250, 26);
    write(context, 'CONNECTION LOST', 255, 124, 15, '#ffffff', 700, 'center');
    write(context, 'Server unreachable. Retrying...', 255, 160, 13, '#333333', 500, 'center');
    context.fillStyle = '#d5dbe1';
    context.fillRect(215, 182, 80, 22);
    write(context, 'OK', 255, 193, 12, '#222222', 700, 'center');
  } else if (variant === 1) {
    context.fillStyle = '#0a0a0a';
    context.fillRect(0, 0, w, h);
    context.fillStyle = '#b3161b';
    context.fillRect(0, 0, w, 66);
    write(context, '⚠  EMERGENCY ALERT', w / 2, 34, 30, '#ffffff', 800, 'center');
    write(context, 'SHELTER IN PLACE', w / 2, 112, 38, '#ffffff', 800, 'center');
    write(context, 'Do not approach infected persons', w / 2, 158, 18, '#bdbdbd', 500, 'center');
    write(context, 'Evacuation from the roof helipad only', w / 2, 188, 18, '#f0b23a', 600, 'center');
    context.fillStyle = '#2a2a2a';
    context.fillRect(40, 232, w - 80, 10);
    context.fillStyle = '#b3161b';
    context.fillRect(40, 232, (w - 80) * 0.18, 10);
    write(context, 'NORTHLINE MEMORIAL  /  ALL STAFF', w / 2, 278, 13, '#777777', 600, 'center');
  } else {
    context.fillStyle = '#dfe5ea';
    context.fillRect(0, 0, w, h);
    context.fillStyle = '#1d4f7a';
    context.fillRect(0, 0, w, 34);
    write(context, 'WARD MANAGER', 14, 17, 16, '#ffffff');
    write(context, 'BEDS 1 - 24', w - 14, 17, 13, '#bcd3e8', 600, 'right');
    for (let row = 0; row < 15; row++) {
      const y = 42 + row * 18;
      const code = random() < 0.3;
      context.fillStyle = code ? '#f2c4c4' : row % 2 ? '#ffffff' : '#eef2f5';
      context.fillRect(8, y, w - 16, 16);
      textLines(context, random, 16, y + 5, 240, 1, 10, 'rgba(40,52,64,0.6)');
      if (code) write(context, 'CODE BLACK', w - 20, y + 8, 11, '#a01010', 800, 'right');
      else textLines(context, random, w - 140, y + 5, 110, 1, 10, 'rgba(40,52,64,0.4)');
    }
  }
}));

// An ICU monitor alarming over a bed nobody is in any more.
export const ecgScreen = () => once('ecg', () => picture(512, 320, 80, (context, w, h) => {
  context.fillStyle = '#020403';
  context.fillRect(0, 0, w, h);
  context.fillStyle = '#c0141a';
  context.fillRect(0, 0, w, 40);
  write(context, 'ASYSTOLE', 16, 21, 22, '#ffffff', 800);
  write(context, 'BED 04', w - 16, 21, 16, '#ffd0d0', 700, 'right');
  const trace = (y: number, color: string, blip: number) => {
    context.strokeStyle = color;
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(14, y);
    for (let x = 14; x < 350; x += 2) {
      const d = x - blip;
      const v = Math.abs(d) < 14 ? Math.sin((d / 14) * Math.PI) * -18 * Math.exp(-Math.abs(d) / 6) : 0;
      context.lineTo(x, y + v);
    }
    context.stroke();
  };
  trace(100, '#35f06a', 120);
  trace(176, '#3ad8ff', 999);
  trace(248, '#f2e33a', 999);
  write(context, 'HR', 372, 72, 16, '#35f06a');
  write(context, '0', 498, 104, 54, '#35f06a', 800, 'right');
  write(context, 'SpO2', 372, 152, 16, '#3ad8ff');
  write(context, '--', 498, 184, 44, '#3ad8ff', 800, 'right');
  write(context, 'NIBP', 372, 228, 16, '#ff5a5a');
  write(context, '0/0', 498, 260, 36, '#ff5a5a', 800, 'right');
  context.strokeStyle = '#1d2a22';
  context.lineWidth = 1;
  context.strokeRect(360, 50, 146, 258);
}));

export const ventScreen = () => once('vent', () => picture(512, 320, 81, (context, w, h) => {
  context.fillStyle = '#07111d';
  context.fillRect(0, 0, w, h);
  context.fillStyle = '#e09a12';
  context.fillRect(0, 0, w, 36);
  write(context, 'CIRCUIT DISCONNECT', 14, 19, 18, '#111111', 800);
  const wave = (y: number, color: string, shape: (t: number) => number) => {
    context.strokeStyle = color;
    context.lineWidth = 3;
    context.beginPath();
    for (let x = 14; x < 330; x += 2) {
      const t = ((x - 14) / 105) % 1;
      const v = y - shape(t) * 42;
      if (x === 14) context.moveTo(x, v);
      else context.lineTo(x, v);
    }
    context.stroke();
  };
  wave(130, '#f2d23a', (t) => (t < 0.35 ? Math.sin((t / 0.35) * Math.PI * 0.5) : Math.max(0, 1 - (t - 0.35) * 5)));
  wave(250, '#3ad8ff', (t) => (t < 0.35 ? 1 - t * 2 : -Math.exp(-(t - 0.35) * 8)) * 0.8);
  const values = [['Ppeak', '0'], ['PEEP', '5'], ['FiO2', '40'], ['VT', '---']];
  values.forEach(([label, value], i) => {
    write(context, label, 350, 64 + i * 64, 14, '#8fb0c8');
    write(context, value, 498, 92 + i * 64, 32, '#ffffff', 800, 'right');
  });
}));

export const analyserScreen = () => once('analyser', () => picture(512, 320, 82, (context, w, h, random) => {
  context.fillStyle = '#eef3f7';
  context.fillRect(0, 0, w, h);
  context.fillStyle = '#00639a';
  context.fillRect(0, 0, w, 40);
  write(context, 'CHEMISTRY ANALYSER', 16, 21, 18, '#ffffff', 700);
  context.fillStyle = '#c0392b';
  context.fillRect(16, 54, w - 32, 40);
  write(context, 'SAMPLE ERROR 0x3F  /  RACK 2', w / 2, 75, 18, '#ffffff', 800, 'center');
  for (let i = 0; i < 20; i++) {
    const x = 46 + (i % 10) * 44;
    const y = 132 + Math.floor(i / 10) * 50;
    context.fillStyle = random() < 0.25 ? '#c0392b' : random() < 0.6 ? '#2ea44f' : '#b8c2cc';
    context.beginPath();
    context.arc(x, y, 15, 0, Math.PI * 2);
    context.fill();
  }
  context.fillStyle = '#c8d3dc';
  context.fillRect(16, 244, w - 32, 16);
  context.fillStyle = '#00639a';
  context.fillRect(16, 244, (w - 32) * 0.62, 16);
  write(context, 'Run halted - operator required', 16, 290, 15, '#3a4a58', 600);
}));

// The temperature readout on a medical fridge, gone up.
export const fridgeDisplay = () => once('fridge', () => picture(256, 96, 83, (context, w, h) => {
  context.fillStyle = '#060606';
  context.fillRect(0, 0, w, h);
  context.font = "bold 58px 'Consolas', 'Courier New', monospace";
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = '#ff3b2f';
  context.fillText('14.8°C', w / 2 - 10, h / 2 + 2);
  context.fillStyle = '#ffb02f';
  context.beginPath();
  context.arc(w - 18, 18, 7, 0, Math.PI * 2);
  context.fill();
}));

export const keyboard = () => once('keyboard', () => picture(256, 80, 84, (context, w, h) => {
  context.fillStyle = '#1b1d20';
  context.fillRect(0, 0, w, h);
  const rows = 5;
  const key = (h - 8) / rows;
  for (let row = 0; row < rows; row++) {
    const count = row === 4 ? 0 : 15;
    for (let i = 0; i < count; i++) {
      context.fillStyle = '#3a3e44';
      context.fillRect(4 + i * ((w - 8) / 15) + 1, 4 + row * key + 1, (w - 8) / 15 - 3, key - 3);
    }
  }
  context.fillStyle = '#3a3e44';
  context.fillRect(4, 4 + 4 * key + 1, 40, key - 3);
  context.fillRect(70, 4 + 4 * key + 1, 110, key - 3);
  context.fillRect(w - 50, 4 + 4 * key + 1, 46, key - 3);
}));

// A printed page: a form, a table, or a page with an URGENT stamp across it.
export const paper = (variant: number) => once(`paper:${variant}`, () => picture(212, 300, 85 + variant, (context, w, h, random) => {
  context.fillStyle = '#f2f0ea';
  context.fillRect(0, 0, w, h);
  context.fillStyle = '#1d4f7a';
  context.fillRect(14, 14, 40, 14);
  textLines(context, random, 62, 16, 120, 1, 12, 'rgba(30,30,30,0.6)');
  if (variant === 1) {
    context.strokeStyle = 'rgba(30,30,30,0.35)';
    for (let y = 48; y < h - 20; y += 16) {
      context.beginPath();
      context.moveTo(14, y);
      context.lineTo(w - 14, y);
      context.stroke();
    }
    for (const x of [14, 80, 140, w - 14]) {
      context.beginPath();
      context.moveTo(x, 48);
      context.lineTo(x, h - 28);
      context.stroke();
    }
  } else {
    textLines(context, random, 14, 48, w - 28, 16, 14, 'rgba(30,30,30,0.45)');
  }
  if (variant === 2) {
    context.save();
    context.translate(w / 2, h / 2);
    context.rotate(-0.4);
    context.strokeStyle = 'rgba(190,20,20,0.75)';
    context.lineWidth = 4;
    context.strokeRect(-70, -22, 140, 44);
    write(context, 'URGENT', 0, 1, 30, 'rgba(190,20,20,0.75)', 800, 'center');
    context.restore();
  }
  specks(context, w, random, 300, 1.5, 0, 0.08);
}));

const DRUGS: [string, string, string][] = [
  ['AMOXICILLIN', '500 mg  /  21 capsules', '#2e7d4f'],
  ['MORPHINE SULFATE', '10 mg/ml  /  10 x 1 ml', '#b3161b'],
  ['PARACETAMOL', '500 mg  /  32 tablets', '#1d4f9a'],
  ['SODIUM CHLORIDE', '0.9%  /  10 x 10 ml', '#4a8fc2'],
  ['INSULIN', '100 units/ml  /  5 pens', '#e09a12'],
  ['ADRENALINE', '1 mg/ml  /  10 ampoules', '#8a2a8a'],
  ['CEFTRIAXONE', '1 g  /  10 vials', '#2a8a86'],
  ['IBUPROFEN', '400 mg  /  24 tablets', '#d0562a'],
];
export const DRUG_COUNT = DRUGS.length;

export const drugLabel = (index: number) => once(`drug:${index}`, () => picture(256, 128, 90 + index, (context, w, h, random) => {
  const [name, dose, color] = DRUGS[index % DRUGS.length];
  context.fillStyle = '#f7f7f4';
  context.fillRect(0, 0, w, h);
  context.fillStyle = color;
  context.fillRect(0, 0, 46, h);
  context.fillRect(46, h - 14, w - 46, 14);
  write(context, name, 56, 34, name.length > 12 ? 20 : 26, '#1a1a1a', 800);
  write(context, dose, 56, 62, 14, '#555555', 600);
  context.fillStyle = '#1a1a1a';
  let x = 150;
  while (x < 240) {
    const bar = 1 + Math.floor(random() * 3);
    context.fillRect(x, 80, bar, 26);
    x += bar + 1 + Math.floor(random() * 3);
  }
}));

export const ventSlats = () => once('slats', () => picture(128, 64, 95, (context, w, h) => {
  context.fillStyle = '#2a2e32';
  context.fillRect(0, 0, w, h);
  for (let y = 4; y < h - 2; y += 8) {
    context.fillStyle = '#0b0d0f';
    context.fillRect(6, y, w - 12, 4);
  }
}));

export const biohazard = () => once('biohazard', () => picture(128, 128, 96, (context, w, h) => {
  context.fillStyle = '#f2c200';
  context.fillRect(0, 0, w, h);
  context.strokeStyle = '#111';
  context.lineWidth = 6;
  context.strokeRect(5, 5, w - 10, h - 10);
  context.lineWidth = 7;
  for (let i = 0; i < 3; i++) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 3;
    context.beginPath();
    context.arc(w / 2 + Math.cos(a) * 18, 54 + Math.sin(a) * 18, 18, 0, Math.PI * 2);
    context.stroke();
  }
  context.beginPath();
  context.arc(w / 2, 54, 8, 0, Math.PI * 2);
  context.stroke();
  write(context, 'BIOHAZARD', w / 2, 106, 15, '#111', 800, 'center');
}));

// The underside of an operating lamp: a ring of LED lenses round a sterile handle.
export const lampFace = () => once('lampface', () => picture(256, 256, 97, (context, w) => {
  context.fillStyle = '#16181a';
  context.fillRect(0, 0, w, w);
  const lens = (x: number, y: number) => {
    const gradient = context.createRadialGradient(x, y, 0, x, y, 20);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.55, '#fffaf0');
    gradient.addColorStop(1, 'rgba(255,250,240,0)');
    context.fillStyle = gradient;
    context.fillRect(x - 20, y - 20, 40, 40);
  };
  for (let ring = 1; ring <= 2; ring++) {
    const count = ring * 7;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      lens(w / 2 + Math.cos(a) * ring * 46, w / 2 + Math.sin(a) * ring * 46);
    }
  }
  context.fillStyle = '#2a2d30';
  context.beginPath();
  context.arc(w / 2, w / 2, 22, 0, Math.PI * 2);
  context.fill();
}));
