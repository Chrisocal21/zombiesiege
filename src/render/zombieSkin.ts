import * as THREE from 'three';
import type { ZombieKind } from '../game/state';

// The zombie models come with their wounds painted on, but the skin is pale and clean next to the
// rest of the world. This repaints their body texture for each kind and each individual: a sickly
// grade over the skin, bruised and rotten patches, dark veins, drips and splatters of blood, and eyes
// that glow a little in the dark. A body texture is a flat atlas, with the face at the top left, the
// front of the torso at the bottom left and the arms down the right side.

interface Grade {
  // The skin's colour under a multiply, so the pale pink goes grey, green or raw.
  tone: string;
  // The colours of the bruised, rotten patches.
  patches: string[];
  patchCount: number;
  vein: string;
  veinCount: number;
  // How much blood is added on top of what is painted already, 0 to 1.
  blood: number;
  // The eyes: the glow colour and how bright.
  eye: string;
  eyeGlow: number;
}

const GRADES: Record<ZombieKind, Grade> = {
  walker: { tone: '#cdd2bc', patches: ['#8f9a72', '#8a7a82', '#9a8a68'], patchCount: 13, vein: '#3c4a46', veinCount: 16, blood: 0.55, eye: '#d8e07a', eyeGlow: 0.9 },
  runner: { tone: '#dcbcae', patches: ['#a85a50', '#9a6a62', '#8a4a44'], patchCount: 10, vein: '#5a2e2e', veinCount: 26, blood: 0.8, eye: '#ff5a3a', eyeGlow: 1.4 },
  brute: { tone: '#b4ac9a', patches: ['#6e665e', '#66725e', '#82625a'], patchCount: 18, vein: '#2c3432', veinCount: 22, blood: 0.7, eye: '#ffb02a', eyeGlow: 1.2 },
  screamer: { tone: '#dde4ea', patches: ['#8e9eaa', '#8484a0', '#a090a0'], patchCount: 12, vein: '#3a4660', veinCount: 34, blood: 0.5, eye: '#9ad8ff', eyeGlow: 1.6 },
};

// The islands of the body atlas, as fractions of its width and height: where the skin is.
const ISLANDS = [
  { x: 0.02, y: 0.02, w: 0.46, h: 0.38 }, // face
  { x: 0.02, y: 0.69, w: 0.56, h: 0.3 }, // chest and belly
  { x: 0.02, y: 0.53, w: 0.56, h: 0.14 }, // shoulders and back
  { x: 0.62, y: 0.12, w: 0.35, h: 0.16 }, // upper arm
  { x: 0.62, y: 0.31, w: 0.35, h: 0.16 }, // lower arm
  { x: 0.62, y: 0.63, w: 0.36, h: 0.16 }, // forearm
  { x: 0.62, y: 0.82, w: 0.36, h: 0.16 }, // forearm
];
// The mouth, on the face island, where a good deal of blood belongs.
const MOUTH = { x: 0.22, y: 0.23 };
// The eyeballs and their small second pair, near the top of the atlas.
const EYES = [{ x: 0.5, y: 0.0, w: 0.1, h: 0.1 }, { x: 0.5, y: 0.1, w: 0.1, h: 0.1 }, { x: 0.5, y: 0.2, w: 0.1, h: 0.1 }];

function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const cache = new Map<string, { map: THREE.CanvasTexture; emissive: THREE.CanvasTexture }>();

// The body texture repainted. \`source\` is the model's own diffuse image. The result is cached by model,
// kind and seed, so a crowd of the same kind shares a few textures.
export function gradedBody(source: THREE.Texture, model: number, kind: ZombieKind, seed: number): { map: THREE.CanvasTexture; emissive: THREE.CanvasTexture } | null {
  const key = `${model}|${kind}|${seed}`;
  const found = cache.get(key);
  if (found) return found;
  const image = source.image as CanvasImageSource & { width: number; height: number } | undefined;
  if (!image || !image.width) return null;
  const size = 1024;
  const grade = GRADES[kind];
  const random = seeded(model * 7919 + seed * 104729 + kind.length * 31);

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(image, 0, 0, size, size);

  // The skin goes sickly.
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = grade.tone;
  ctx.fillRect(0, 0, size, size);

  const spot = (island: (typeof ISLANDS)[number]) => ({ x: (island.x + random() * island.w) * size, y: (island.y + random() * island.h) * size });

  // Bruised and rotten patches, soft at the edges.
  for (let i = 0; i < grade.patchCount; i++) {
    const { x, y } = spot(ISLANDS[Math.floor(random() * ISLANDS.length)]);
    const radius = (14 + random() * 52) * (size / 1024);
    const color = grade.patches[Math.floor(random() * grade.patches.length)];
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, color + '88');
    gradient.addColorStop(1, color + '00');
    ctx.fillStyle = gradient;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  // Dark veins: little random walks that fork.
  ctx.globalCompositeOperation = 'multiply';
  ctx.lineCap = 'round';
  for (let i = 0; i < grade.veinCount; i++) {
    let { x, y } = spot(ISLANDS[Math.floor(random() * ISLANDS.length)]);
    let angle = random() * Math.PI * 2;
    ctx.strokeStyle = grade.vein + '77';
    ctx.lineWidth = 1 + random() * 2.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    const steps = 7 + Math.floor(random() * 9);
    for (let s = 0; s < steps; s++) {
      angle += (random() - 0.5) * 0.9;
      x += Math.cos(angle) * (8 + random() * 14);
      y += Math.sin(angle) * (8 + random() * 14);
      ctx.lineTo(x, y);
      if (random() < 0.14) { ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y); angle += (random() - 0.5) * 2; }
    }
    ctx.stroke();
  }

  // Blood: drips running down from wounds, and splatters round them.
  ctx.globalCompositeOperation = 'source-over';
  const drops = Math.round(10 + grade.blood * 22);
  for (let i = 0; i < drops; i++) {
    const { x, y } = spot(ISLANDS[Math.floor(random() * ISLANDS.length)]);
    const dark = `rgba(${70 + random() * 40},${10 + random() * 14},${10 + random() * 12},${0.55 + random() * 0.35})`;
    if (random() < 0.5) {
      // A drip: a line that thickens and ends in a bead.
      const length = 30 + random() * 120;
      ctx.strokeStyle = dark;
      ctx.lineWidth = 1.5 + random() * 3.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x + (random() - 0.5) * 8, y + length * 0.35, x + (random() - 0.5) * 8, y + length * 0.7, x + (random() - 0.5) * 6, y + length);
      ctx.stroke();
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.arc(x, y + length, ctx.lineWidth * 0.9, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // A splatter: a clot and a spray of droplets.
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.ellipse(x, y, 5 + random() * 14, 4 + random() * 10, random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
      for (let d = 0; d < 14; d++) {
        const a = random() * Math.PI * 2, r = 8 + random() * 38;
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, 0.8 + random() * 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  // The mouth and chin, always bloody.
  const mx = MOUTH.x * size, my = MOUTH.y * size;
  const mouth = ctx.createRadialGradient(mx, my + 14, 4, mx, my + 20, 70 + grade.blood * 40);
  mouth.addColorStop(0, 'rgba(90,10,10,0.9)');
  mouth.addColorStop(0.6, 'rgba(70,12,10,0.55)');
  mouth.addColorStop(1, 'rgba(70,12,10,0)');
  ctx.fillStyle = mouth;
  ctx.fillRect(mx - 130, my - 70, 260, 260);
  for (let i = 0; i < 4; i++) {
    ctx.strokeStyle = 'rgba(80,12,12,0.8)';
    ctx.lineWidth = 2 + random() * 3;
    ctx.beginPath();
    const x = mx - 36 + random() * 72;
    ctx.moveTo(x, my + 24);
    ctx.lineTo(x + (random() - 0.5) * 10, my + 70 + random() * 120);
    ctx.stroke();
  }
  // A dirty finish over everything: grime gathered low on each island.
  ctx.globalCompositeOperation = 'multiply';
  for (const island of ISLANDS) {
    const gradient = ctx.createLinearGradient(0, (island.y + island.h * 0.55) * size, 0, (island.y + island.h) * size);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(1, 'rgba(170,156,140,1)');
    ctx.fillStyle = gradient;
    ctx.fillRect(island.x * size, (island.y + island.h * 0.55) * size, island.w * size, island.h * 0.45 * size);
  }

  const map = new THREE.CanvasTexture(canvas);
  map.flipY = false;
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;

  // The glow: only the eyes, in the colour of the kind.
  const glow = document.createElement('canvas');
  glow.width = glow.height = 256;
  const g = glow.getContext('2d')!;
  g.fillStyle = '#000';
  g.fillRect(0, 0, 256, 256);
  g.globalCompositeOperation = 'lighter';
  for (const eye of EYES) {
    g.drawImage(canvas, eye.x * size, eye.y * size, eye.w * size, eye.h * size, eye.x * 256, eye.y * 256, eye.w * 256, eye.h * 256);
  }
  g.globalCompositeOperation = 'multiply';
  g.fillStyle = grade.eye;
  g.fillRect(0, 0, 256, 256);
  const emissive = new THREE.CanvasTexture(glow);
  emissive.flipY = false;
  emissive.colorSpace = THREE.SRGBColorSpace;

  const result = { map, emissive };
  cache.set(key, result);
  return result;
}

export function eyeGlow(kind: ZombieKind): number {
  return GRADES[kind].eyeGlow;
}
