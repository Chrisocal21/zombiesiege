import { GLOVES, OUTFITS, appearance, saveAppearance, selectedGloves, selectedOutfit } from '../client/appearance';
import { ACTIONS, type Action, bindings, keyLabel, rebind, resetBindings } from '../client/bindings';
import { SETTING_RANGES, type Settings, resetSettings, saveSettings, settings } from '../client/settings';
import { config } from '../config';
import { stops, storeyLabel } from '../game/tower';
import { outfitTexture } from './gearTextures';
import { COLOR, FONT, clamp, keycap, measure, outfitPreviewRect, panel, roundedRect, text } from './ui';

// 'title' is the press-any-key screen the game opens on; 'main' is the menu behind it.
export type Screen = 'title' | 'main' | 'pause' | 'controls' | 'settings' | 'character' | 'victory';

// What the victory screen reports about the run that just ended.
export interface RunStats {
  floors: number;
  points: number;
  lives: number;
  seconds: number;
}

export type MenuSound = 'move' | 'select' | 'back' | 'start';

export interface MenuCallbacks {
  // Start the game from the title screen.
  play(): void;
  // Start a new game straight onto one of the elevator stops, for testing.
  playFloor(floor: number): void;
  // Go back to the game from the pause menu.
  resume(): void;
  restart(): void;
  // Leave the game and go back to the title screen.
  toTitle(): void;
  // A sound for moving between, choosing, and leaving menu items.
  sound?(kind: MenuSound): void;
}

export interface Menu {
  isOpen(): boolean;
  screen(): Screen | null;
  // True on the title screen and on the controls and settings screens opened from it.
  onTitle(): boolean;
  open(screen: Screen, stats?: RunStats): void;
  close(): void;
  // The menu ignores the keyboard and mouse until the photosensitivity warning is dismissed.
  release(): void;
  draw(context: CanvasRenderingContext2D, width: number, height: number, time: number): void;
}

interface Mouse {
  x: number;
  y: number;
  down: boolean;
  // True for the frame after the button went down.
  clicked: boolean;
}

interface Entry {
  label: string;
  detail: string;
  action(): void;
}

const ease = (t: number) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);

// The logo is painted once on its own canvas, so the worn edges and stencil cuts can be taken
// out of the letters without touching anything drawn behind them. Sizes are for a 1080p screen.
const LOGO_HEIGHT = 330;
let logoCanvas: HTMLCanvasElement | null = null;
let logoWidth = 0;

function logo(): { canvas: HTMLCanvasElement; width: number } {
  if (logoCanvas) return { canvas: logoCanvas, width: logoWidth };
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = 1200 * scale;
  canvas.height = LOGO_HEIGHT * scale;
  const c = canvas.getContext('2d')!;
  c.scale(scale, scale);
  const styled = c as unknown as { letterSpacing: string; fontStretch: string };
  c.font = `800 176px ${FONT}`;
  styled.fontStretch = 'condensed';
  styled.letterSpacing = '6px';
  const word = (value: string, baseline: number, top: string, bottom: string): number => {
    const gradient = c.createLinearGradient(0, baseline - 130, 0, baseline);
    gradient.addColorStop(0, top);
    gradient.addColorStop(1, bottom);
    c.fillStyle = gradient;
    c.fillText(value, 0, baseline);
    return c.measureText(value).width;
  };
  logoWidth = Math.max(word('ZOMBIE', 150, '#ffffff', '#b4b9bf'), word('SIEGE', 310, '#f5cd7d', '#bd7a26'));

  // Wear: specks and scratches out of the paint, and a stencil cut through each word.
  let seed = 7;
  const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  c.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 1400; i++) {
    c.globalAlpha = 0.25 + random() * 0.75;
    const size = 0.8 + random() * 2.6;
    c.fillRect(random() * logoWidth, random() * LOGO_HEIGHT, size, size);
  }
  c.lineCap = 'round';
  for (let i = 0; i < 16; i++) {
    c.globalAlpha = 0.5 + random() * 0.5;
    c.lineWidth = 0.8 + random() * 1.6;
    const x = random() * logoWidth;
    const y = random() * LOGO_HEIGHT;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + 20 + random() * 70, y + (random() - 0.5) * 14);
    c.stroke();
  }
  c.globalAlpha = 1;
  c.fillRect(0, 150 - 66, logoWidth, 5);
  c.fillRect(0, 310 - 66, logoWidth, 5);
  c.globalCompositeOperation = 'source-over';
  logoCanvas = canvas;
  return { canvas, width: logoWidth };
}

// Fine moving film grain, laid over every menu.
let grain: CanvasPattern | null = null;
const GRAIN_SIZE = 192;

function drawGrain(context: CanvasRenderingContext2D, width: number, height: number, time: number): void {
  if (!grain) {
    const noise = document.createElement('canvas');
    noise.width = noise.height = GRAIN_SIZE;
    const c = noise.getContext('2d')!;
    const image = c.createImageData(GRAIN_SIZE, GRAIN_SIZE);
    for (let i = 0; i < image.data.length; i += 4) {
      const value = Math.random() < 0.5 ? 0 : 255;
      image.data[i] = image.data[i + 1] = image.data[i + 2] = value;
      image.data[i + 3] = Math.random() * 26;
    }
    c.putImageData(image, 0, 0);
    grain = context.createPattern(noise, 'repeat');
  }
  // Still when flashing is reduced; otherwise it moves at a film's frame rate.
  const frame = settings.reducedFlashing ? 0 : Math.floor(time * 12);
  const ox = (frame * 61) % GRAIN_SIZE;
  const oy = (frame * 113) % GRAIN_SIZE;
  context.save();
  context.translate(-ox, -oy);
  context.fillStyle = grain!;
  context.fillRect(ox, oy, width, height);
  context.restore();
}

// A low red glow rising from the bottom of the screen.
function drawGlow(context: CanvasRenderingContext2D, width: number, height: number): void {
  context.save();
  context.translate(width / 2, height * 1.08);
  context.scale(width / height, 1);
  const gradient = context.createRadialGradient(0, 0, 0, 0, 0, height * 0.6);
  gradient.addColorStop(0, 'rgba(150,18,12,0.32)');
  gradient.addColorStop(1, 'rgba(150,18,12,0)');
  context.fillStyle = gradient;
  context.fillRect(-height * 0.6, -height * 0.6, height * 1.2, height * 0.6);
  context.restore();
}

function drawVignette(context: CanvasRenderingContext2D, width: number, height: number, strength: number): void {
  const gradient = context.createRadialGradient(width / 2, height / 2, height * 0.35, width / 2, height / 2, Math.hypot(width, height) * 0.62);
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, `rgba(0,0,0,${strength})`);
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
}

// The title screen, the main menu, the pause menu, the controls list where keys are rebound, and
// the settings. Drawn on the HUD canvas, driven by the keyboard and the mouse.
export function createMenu(callbacks: MenuCallbacks): Menu {
  let current: Screen | null = 'title';
  // Which of the two top screens the controls and settings screens go back to.
  let parent: 'main' | 'pause' = 'main';
  let stats: RunStats = { floors: 0, points: 0, lives: 0, seconds: 0 };
  let rebinding: Action | null = null;
  let dragging: string | null = null;
  let focusedItem = 0;
  let itemCount = 3;
  let keyboardMode = false;
  let activate = false;
  let blocked = true;
  // When the current screen was opened, for the way its parts slide in.
  let shown: Screen | null = null;
  let shownAt = 0;
  let startedAt = -1;
  const mouse: Mouse = { x: 0, y: 0, down: false, clicked: false };
  const sound = (kind: MenuSound) => callbacks.sound?.(kind);

  // Press any key: the title screen gives way to the main menu.
  const leaveTitle = () => {
    if (current !== 'title' || blocked) return;
    current = 'main';
    focusedItem = 0;
    sound('start');
  };
  const back = () => {
    current = parent;
    sound('back');
  };

  window.addEventListener('mousemove', (event) => {
    keyboardMode = false;
    mouse.x = event.clientX;
    mouse.y = event.clientY;
  });
  window.addEventListener('mousedown', (event) => {
    if (current === null || blocked) return;
    if (current === 'title') {
      leaveTitle();
      return;
    }
    if (rebinding) {
      // A mouse button can be bound too.
      rebind(rebinding, `Mouse${event.button}`);
      rebinding = null;
      return;
    }
    if (event.button === 0) {
      mouse.down = true;
      mouse.clicked = true;
    }
  });
  window.addEventListener('mouseup', () => {
    mouse.down = false;
    dragging = null;
  });
  window.addEventListener(
    'keydown',
    (event) => {
      if (current === null || blocked) return;
      if (current === 'title') {
        if (!['Shift', 'Control', 'Alt', 'Meta'].includes(event.key) && !event.repeat) {
          event.preventDefault();
          leaveTitle();
        }
        return;
      }
      if (rebinding) {
        event.preventDefault();
        event.stopPropagation();
        if (event.code !== 'Escape') rebind(rebinding, event.code);
        rebinding = null;
        return;
      }
      if ((current === 'main' || current === 'pause' || current === 'victory') && ['ArrowUp', 'ArrowDown', 'KeyW', 'KeyS', 'Enter', 'Space'].includes(event.code)) {
        event.preventDefault();
        keyboardMode = true;
        const up = event.code === 'ArrowUp' || event.code === 'KeyW';
        const down = event.code === 'ArrowDown' || event.code === 'KeyS';
        if (up) focusedItem = (focusedItem + itemCount - 1) % itemCount;
        if (down) focusedItem = (focusedItem + 1) % itemCount;
        if (up || down) sound('move');
        if (event.code === 'Enter' || event.code === 'Space') activate = true;
      }
      if (current === 'character' && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.code)) {
        event.preventDefault();
        const shirt = event.code === 'ArrowLeft' || event.code === 'ArrowRight';
        const direction = event.code === 'ArrowLeft' || event.code === 'ArrowUp' ? -1 : 1;
        if (shirt) {
          const index = OUTFITS.findIndex((outfit) => outfit.id === appearance.outfit);
          appearance.outfit = OUTFITS[(index + direction + OUTFITS.length) % OUTFITS.length].id;
        } else {
          const index = GLOVES.findIndex((gloves) => gloves.id === appearance.gloves);
          appearance.gloves = GLOVES[(index + direction + GLOVES.length) % GLOVES.length].id;
        }
        saveAppearance();
        sound('move');
      }
      if (current === 'character' && event.code === 'Enter') {
        event.preventDefault();
        sound('select');
        callbacks.play();
      }
      if (event.code === 'Escape' && (current === 'controls' || current === 'settings' || current === 'character')) back();
    },
    true,
  );

  return {
    isOpen: () => current !== null,
    screen: () => current,
    onTitle: () => current !== null && current !== 'victory' && parent === 'main',
    open(screen, runStats) {
      current = screen;
      if (runStats) stats = runStats;
      if (screen === 'main' || screen === 'pause') parent = screen;
      focusedItem = 0;
      rebinding = null;
    },
    close() {
      current = null;
      rebinding = null;
      document.body.style.cursor = 'none';
    },
    release() {
      blocked = false;
    },
    draw(context, width, height, time) {
      if (current === null) return;
      const unit = height / 1080;
      let hovering = false;
      if (current !== shown) {
        shown = current;
        shownAt = time;
      }
      if (startedAt < 0) startedAt = time;
      const since = time - shownAt;

      const inside = (x: number, y: number, w: number, h: number) =>
        mouse.x >= x && mouse.x <= x + w && mouse.y >= y && mouse.y <= y + h;

      // A rectangular button, for the bottom of the controls and settings panels.
      const button = (label: string, x: number, y: number, w: number, h: number, accent = false): boolean => {
        const hover = inside(x, y, w, h);
        if (hover) hovering = true;
        roundedRect(context, x, y, w, h, 4 * unit);
        context.fillStyle = hover ? (accent ? COLOR.accent : 'rgba(255,255,255,0.16)') : accent ? 'rgba(232,184,102,0.2)' : 'rgba(255,255,255,0.07)';
        context.fill();
        context.strokeStyle = accent ? COLOR.accent : COLOR.border;
        context.lineWidth = 1;
        context.stroke();
        text(context, label, x + w / 2, y + h * 0.64, {
          size: h * 0.4,
          align: 'center',
          spacing: 3 * unit,
          weight: 700,
          color: hover && accent ? '#15110a' : COLOR.text,
          shadow: false,
        });
        if (hover && mouse.clicked) sound(accent ? 'select' : 'back');
        return hover && mouse.clicked;
      };

      // The strip along the bottom: what the keys do here, and the studio and build.
      const promptBar = (prompts: [string, string][]) => {
        const barH = 64 * unit;
        const shade = context.createLinearGradient(0, height - barH * 1.6, 0, height);
        shade.addColorStop(0, 'rgba(0,0,0,0)');
        shade.addColorStop(1, 'rgba(0,0,0,0.7)');
        context.fillStyle = shade;
        context.fillRect(0, height - barH * 1.6, width, barH * 1.6);
        context.fillStyle = 'rgba(255,255,255,0.08)';
        context.fillRect(0, height - barH, width, 1);
        let x = width * 0.07;
        const y = height - barH / 2 + 9 * unit;
        for (const [key, label] of prompts) {
          for (const part of key.split(' ')) x += keycap(context, part, x, y, 26 * unit) + 6 * unit;
          text(context, label, x + 4 * unit, y - 3 * unit, { size: 14 * unit, weight: 700, spacing: 3 * unit, color: COLOR.dim, shadow: false });
          x += measure(context, label, 14 * unit, 700, 3 * unit) + 40 * unit;
        }
        text(context, 'PROBABLY FINE STUDIOS  ·  PRE-ALPHA BUILD', width * 0.93, y - 3 * unit, { size: 12 * unit, weight: 700, spacing: 3 * unit, color: COLOR.faint, align: 'right', shadow: false });
      };

      // The logo at a scale where 1 is its full 1080p size, from a left edge or a centre.
      const drawLogo = (x: number, y: number, scale: number, centred = false) => {
        const { canvas, width: inkWidth } = logo();
        const s = scale * unit;
        const left = centred ? x - (inkWidth * s) / 2 : x;
        context.drawImage(canvas, 0, 0, inkWidth * 2, LOGO_HEIGHT * 2, left, y, inkWidth * s, LOGO_HEIGHT * s);
        return { left, right: left + inkWidth * s, bottom: y + LOGO_HEIGHT * s };
      };

      // A column of big menu lines. One is always selected; the mouse selects what it is over.
      const list = (entries: Entry[], x: number, top: number, delay: number) => {
        itemCount = entries.length;
        focusedItem = Math.min(focusedItem, entries.length - 1);
        const row = 68 * unit;
        let chosen = -1;
        entries.forEach((entry, index) => {
          const y = top + index * row;
          const appear = ease((since - delay - index * 0.05) / 0.45);
          const hitX = x - 30 * unit;
          const hitY = y - 48 * unit;
          if (!keyboardMode && inside(hitX, hitY, 560 * unit, row - 4 * unit)) {
            hovering = true;
            if (focusedItem !== index) {
              focusedItem = index;
              sound('move');
            }
            if (mouse.clicked) chosen = index;
          }
          const selected = focusedItem === index;
          const offset = (1 - appear) * -50 * unit;
          context.save();
          context.globalAlpha = appear;
          if (selected) {
            // A slanted bar of light behind the selected line, with a solid edge.
            const w = 540 * unit;
            const h = 60 * unit;
            const bx = hitX + offset;
            const by = y - 45 * unit;
            const wash = context.createLinearGradient(bx, 0, bx + w, 0);
            wash.addColorStop(0, 'rgba(232,184,102,0.32)');
            wash.addColorStop(0.6, 'rgba(232,184,102,0.08)');
            wash.addColorStop(1, 'rgba(232,184,102,0)');
            context.fillStyle = wash;
            context.beginPath();
            context.moveTo(bx, by);
            context.lineTo(bx + w, by);
            context.lineTo(bx + w - 14 * unit, by + h);
            context.lineTo(bx, by + h);
            context.closePath();
            context.fill();
            context.fillStyle = COLOR.accent;
            context.fillRect(bx, by, 5 * unit, h);
          }
          text(context, String(index + 1).padStart(2, '0'), x + offset, y - 6 * unit, { size: 15 * unit, weight: 700, spacing: 2 * unit, color: selected ? COLOR.accent : COLOR.faint });
          text(context, entry.label, x + 46 * unit + offset + (selected ? 6 * unit : 0), y, {
            size: (selected ? 44 : 34) * unit,
            weight: 800,
            spacing: 4 * unit,
            color: selected ? COLOR.text : 'rgba(242,244,247,0.55)',
          });
          context.restore();
        });
        // What the selected line does, under the list.
        const detailY = top + entries.length * row + 4 * unit;
        const detailAppear = ease((since - delay - 0.25) / 0.4);
        context.save();
        context.globalAlpha = detailAppear;
        context.fillStyle = COLOR.accent;
        context.fillRect(x, detailY - 6 * unit, 36 * unit, 2 * unit);
        text(context, entries[focusedItem].detail, x + 50 * unit, detailY, { size: 19 * unit, color: COLOR.dim, spacing: 0.5 * unit });
        context.restore();
        if (activate) chosen = focusedItem;
        if (chosen >= 0) {
          sound('select');
          entries[chosen].action();
        }
      };

      const left = width * 0.07;

      if (current === 'title') {
        // The opening screen: the logo over the scene, and an invitation to press a key.
        context.fillStyle = 'rgba(3,5,9,0.42)';
        context.fillRect(0, 0, width, height);
        drawGlow(context, width, height);
        drawVignette(context, width, height, 0.9);
        const shade = context.createLinearGradient(0, height * 0.45, 0, height);
        shade.addColorStop(0, 'rgba(0,0,0,0)');
        shade.addColorStop(1, 'rgba(0,0,0,0.75)');
        context.fillStyle = shade;
        context.fillRect(0, height * 0.45, width, height * 0.55);
        drawGrain(context, width, height, time);

        const appear = ease((time - startedAt - 0.3) / 1.4);
        context.save();
        context.globalAlpha = appear;
        text(context, 'PROBABLY FINE STUDIOS PRESENTS', width / 2, height * 0.12, { size: 15 * unit, weight: 700, spacing: 8 * unit, color: COLOR.dim, align: 'center' });
        const mark = drawLogo(width / 2, height * 0.145 + (1 - appear) * 20 * unit, 0.78, true);
        context.fillStyle = COLOR.accent;
        context.fillRect(width / 2 - 60 * unit, mark.bottom + 18 * unit, 120 * unit, 3 * unit);
        text(context, 'THE TOWER  ·  NIGHTFALL', width / 2 + 4 * unit, mark.bottom + 58 * unit, { size: 20 * unit, weight: 700, spacing: 9 * unit, color: COLOR.text, align: 'center' });
        context.restore();

        if (!blocked) {
          // A slow breath, not a blink.
          const breath = settings.reducedFlashing ? 1 : 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(time * 2.2));
          const label = 'PRESS ANY KEY TO START';
          const size = 22 * unit;
          const spacing = 7 * unit;
          const w = measure(context, label, size, 700, spacing);
          const y = height * 0.82;
          context.save();
          context.globalAlpha = breath * ease((time - startedAt - 1.2) / 0.8);
          text(context, label, width / 2 + spacing / 2, y, { size, weight: 700, spacing, align: 'center' });
          context.fillStyle = 'rgba(255,255,255,0.5)';
          context.fillRect(width / 2 - w / 2 - 110 * unit, y - 8 * unit, 80 * unit, 1);
          context.fillRect(width / 2 + w / 2 + 30 * unit, y - 8 * unit, 80 * unit, 1);
          context.restore();
        }
        text(context, 'PROBABLY FINE STUDIOS', left, height - 40 * unit, { size: 12 * unit, weight: 700, spacing: 4 * unit, color: COLOR.faint });
        text(context, 'PRE-ALPHA BUILD  ·  NOT FINAL GAME', width - left, height - 40 * unit, { size: 12 * unit, weight: 700, spacing: 4 * unit, color: COLOR.faint, align: 'right' });
      } else if (current === 'main' || current === 'pause' || current === 'victory') {
        // The scene stays visible on the right; the left is shaded for the menu.
        const wash = context.createLinearGradient(0, 0, width * 0.75, 0);
        wash.addColorStop(0, 'rgba(3,5,8,0.92)');
        wash.addColorStop(0.5, 'rgba(3,5,8,0.6)');
        wash.addColorStop(1, 'rgba(3,5,8,0.05)');
        context.fillStyle = current === 'pause' ? 'rgba(3,5,8,0.55)' : 'rgba(3,5,9,0.3)';
        context.fillRect(0, 0, width, height);
        if (current === 'main') drawGlow(context, width, height);
        context.fillStyle = wash;
        context.fillRect(0, 0, width, height);
        drawVignette(context, width, height, 0.7);
        drawGrain(context, width, height, time);

        const headAppear = ease(since / 0.5);
        context.save();
        context.globalAlpha = headAppear;
        if (current === 'main') {
          drawLogo(left, 70 * unit, 0.42);
        } else {
          text(context, current === 'pause' ? 'OPERATION 001  ·  THE TOWER' : 'OPERATION 001  ·  COMPLETE', left, 130 * unit, { size: 15 * unit, weight: 700, spacing: 6 * unit, color: COLOR.accent });
          text(context, current === 'pause' ? 'PAUSED' : 'EXTRACTED', left - 4 * unit, 230 * unit, { size: 104 * unit, weight: 800, spacing: 10 * unit });
          context.fillStyle = COLOR.accent;
          context.fillRect(left, 258 * unit, 120 * unit, 4 * unit);
        }
        context.restore();

        if (current === 'main') {
          list([
            { label: 'DEPLOY', detail: 'Solo survival. Fight up the hospital tower to the roof.', action: () => (current = 'character') },
            { label: 'CONTROLS', detail: 'See and rebind every key and mouse button.', action: () => (current = 'controls') },
            { label: 'SETTINGS', detail: 'Camera, sensitivity, field of view and display.', action: () => (current = 'settings') },
          ], left, height * 0.5, 0.1);
          drawSurvivorCard(context, width - left, 70 * unit, unit, ease((since - 0.15) / 0.5));
          const picked = drawOperationCard(context, width - left, height * 0.3, unit, ease((since - 0.2) / 0.55), config.testing.floorSelect ? { inside, clicked: mouse.clicked } : null);
          if (picked.hovering) hovering = true;
          if (picked.floor >= 0) {
            sound('select');
            callbacks.playFloor(picked.floor);
          }
          promptBar([['↑ ↓', 'NAVIGATE'], ['ENTER', 'SELECT']]);
        } else if (current === 'pause') {
          list([
            { label: 'RESUME', detail: 'Back into the fight.', action: () => callbacks.resume() },
            { label: 'RESTART RUN', detail: 'Start again from the garage with fresh lives.', action: () => callbacks.restart() },
            { label: 'CONTROLS', detail: 'See and rebind every key and mouse button.', action: () => (current = 'controls') },
            { label: 'SETTINGS', detail: 'Camera, sensitivity, field of view and display.', action: () => (current = 'settings') },
            { label: 'QUIT TO TITLE', detail: 'Leave this run. Progress is lost.', action: () => callbacks.toTitle() },
          ], left, height * 0.42, 0.05);
          promptBar([['↑ ↓', 'NAVIGATE'], ['ENTER', 'SELECT']]);
        } else {
          text(context, 'THE HELICOPTER IS HERE. YOU MADE IT OUT OF THE TOWER', left, 300 * unit, { size: 19 * unit, color: COLOR.dim, spacing: 4 * unit });
          const minutes = Math.floor(stats.seconds / 60);
          const rows: [string, string][] = [
            ['FLOORS CLEARED', String(stats.floors)],
            ['POINTS', String(stats.points)],
            ['LIVES LEFT', String(stats.lives)],
            ['TIME', `${minutes}:${String(Math.floor(stats.seconds % 60)).padStart(2, '0')}`],
          ];
          rows.forEach(([label, value], i) => {
            const rowY = 380 * unit + i * 50 * unit;
            context.fillStyle = 'rgba(255,255,255,0.08)';
            context.fillRect(left, rowY + 14 * unit, 420 * unit, 1);
            text(context, label, left, rowY, { size: 16 * unit, weight: 700, color: COLOR.dim, spacing: 4 * unit });
            text(context, value, left + 420 * unit, rowY, { size: 30 * unit, weight: 800, align: 'right' });
          });
          list([
            { label: 'PLAY AGAIN', detail: 'Back to the garage for another run.', action: () => callbacks.restart() },
            { label: 'MAIN MENU', detail: 'Back to the title screen.', action: () => callbacks.toTitle() },
          ], left, height * 0.68, 0.2);
          promptBar([['↑ ↓', 'NAVIGATE'], ['ENTER', 'SELECT']]);
        }
      } else {
        // The controls and settings screens share a centred panel over the darkened scene.
        context.fillStyle = 'rgba(3,5,8,0.7)';
        context.fillRect(0, 0, width, height);
        drawVignette(context, width, height, 0.7);
        drawGrain(context, width, height, time);
        const panelWidth = Math.min(width * 0.84, 1180 * unit);
        const panelHeight = height * 0.74;
        const px = (width - panelWidth) / 2;
        const py = height * 0.11;
        panel(context, px, py, panelWidth, panelHeight, COLOR.panelSolid, 4 * unit);
        context.fillStyle = COLOR.accent;
        context.fillRect(px, py, panelWidth, 3 * unit);
        text(context, (parent === 'main' ? 'MAIN MENU' : 'PAUSED') + '  /', px + 44 * unit, py + 40 * unit, { size: 13 * unit, weight: 700, spacing: 4 * unit, color: COLOR.faint, shadow: false });
        text(context, current === 'controls' ? 'CONTROLS' : current === 'character' ? 'YOUR SURVIVOR' : 'SETTINGS', px + 44 * unit, py + 86 * unit, { size: 40 * unit, weight: 800, spacing: 6 * unit });

        const buttonHeight = 54 * unit;
        const buttonY = py + panelHeight - buttonHeight - 30 * unit;

        if (current === 'character') {
          text(context, 'CAMOUFLAGE', px + 44 * unit, py + 160 * unit, { size: 24 * unit, color: COLOR.dim });
          text(context, 'GLOVES', px + 44 * unit, py + 310 * unit, { size: 24 * unit, color: COLOR.dim });
          const swatchSize = 64 * unit;
          const outline = (x: number, y: number, chosen: boolean) => {
            context.strokeStyle = chosen ? COLOR.accent : COLOR.border;
            context.lineWidth = chosen ? 4 : 1;
            context.strokeRect(x, y, swatchSize, swatchSize);
          };
          OUTFITS.forEach((outfit, i) => {
            const x = px + (44 + i * 85) * unit;
            const y = py + 185 * unit;
            // The same cloth that is on the sleeve in the preview.
            context.drawImage(outfitTexture(outfit.id).image as HTMLCanvasElement, 0, 0, 320, 320, x, y, swatchSize, swatchSize);
            outline(x, y, appearance.outfit === outfit.id);
            if (inside(x, y, swatchSize, swatchSize)) {
              hovering = true;
              if (mouse.clicked) { appearance.outfit = outfit.id; saveAppearance(); sound('move'); }
            }
          });
          GLOVES.forEach((gloves, i) => {
            const x = px + (44 + i * 85) * unit;
            const y = py + 335 * unit;
            context.fillStyle = gloves.color;
            context.fillRect(x, y, swatchSize, swatchSize);
            context.fillStyle = gloves.accent;
            context.fillRect(x, y + swatchSize * 0.72, swatchSize, swatchSize * 0.28);
            outline(x, y, appearance.gloves === gloves.id);
            if (inside(x, y, swatchSize, swatchSize)) {
              hovering = true;
              if (mouse.clicked) { appearance.gloves = gloves.id; saveAppearance(); sound('move'); }
            }
          });
          const preview = outfitPreviewRect(width, height);
          context.clearRect(preview.x, preview.y, preview.w, preview.h);
          context.strokeStyle = COLOR.border; context.lineWidth = 1;
          context.strokeRect(preview.x, preview.y, preview.w, preview.h);
          text(context, 'FIRST-PERSON PREVIEW', preview.x + 18 * unit, preview.y + 28 * unit, { size: 13 * unit, color: COLOR.accent, spacing: 2 * unit });
          text(context, 'P9 / ' + selectedOutfit().name.toUpperCase() + ' / ' + selectedGloves().name.toUpperCase(), preview.x + 18 * unit, preview.y + preview.h - 18 * unit, { size: 13 * unit, color: COLOR.dim, spacing: 1 * unit });
          text(context, selectedOutfit().name.toUpperCase(), px + 489 * unit, py + 160 * unit, { size: 15 * unit, spacing: 2 * unit, color: COLOR.accent, align: 'right' });
          text(context, selectedGloves().name.toUpperCase(), px + 489 * unit, py + 310 * unit, { size: 15 * unit, spacing: 2 * unit, color: COLOR.accent, align: 'right' });
          text(context, 'FIELD KIT', px + 44 * unit, py + 470 * unit, { size: 14 * unit, color: COLOR.accent, spacing: 3 * unit });
          text(context, 'P9 service pistol / 12 rounds', px + 44 * unit, py + 506 * unit, { size: 22 * unit, color: COLOR.text });
          text(context, selectedOutfit().description + '.', px + 44 * unit, py + 541 * unit, { size: 16 * unit, color: COLOR.dim });
          text(context, 'Left and right change camouflage, up and down change gloves. Enter to deploy.', px + 44 * unit, buttonY - 40 * unit, { size: 20 * unit, color: COLOR.dim });
          if (button('DEPLOY', px + 44 * unit, buttonY, 370 * unit, buttonHeight, true)) callbacks.play();
        } else if (current === 'controls') {
          const columnWidth = (panelWidth - 132 * unit) / 2;
          const rowHeight = 50 * unit;
          const groups = ['Movement', 'Combat', 'Interaction'];
          // Movement on the left; combat and interaction on the right.
          const columns: string[][] = [[groups[0]], [groups[1], groups[2]]];
          columns.forEach((columnGroups, columnIndex) => {
            const x = px + 44 * unit + columnIndex * (columnWidth + 44 * unit);
            let y = py + 150 * unit;
            for (const group of columnGroups) {
              text(context, group.toUpperCase(), x, y, { size: 19 * unit, color: COLOR.accent, spacing: 5 * unit });
              y += 16 * unit;
              for (const action of ACTIONS.filter((entry) => entry.group === group)) {
                const rowY = y;
                const hover = inside(x, rowY, columnWidth, rowHeight - 6 * unit);
                if (hover) hovering = true;
                if (hover) {
                  roundedRect(context, x, rowY, columnWidth, rowHeight - 6 * unit, 5 * unit);
                  context.fillStyle = 'rgba(255,255,255,0.07)';
                  context.fill();
                }
                text(context, action.label, x + 14 * unit, rowY + rowHeight * 0.6, { size: 24 * unit, color: hover ? COLOR.text : COLOR.dim, shadow: false });
                if (rebinding === action.id) {
                  const pulse = 0.55 + 0.45 * Math.sin(time * 7);
                  const label = 'PRESS A KEY';
                  const w = measure(context, label, 18 * unit, 700, 2 * unit) + 32 * unit;
                  roundedRect(context, x + columnWidth - w - 6 * unit, rowY + 4 * unit, w, rowHeight - 14 * unit, 6 * unit);
                  context.fillStyle = `rgba(245,165,36,${0.25 + 0.3 * pulse})`;
                  context.fill();
                  context.strokeStyle = COLOR.accent;
                  context.stroke();
                  text(context, label, x + columnWidth - 6 * unit - w / 2, rowY + rowHeight * 0.58, { size: 18 * unit, align: 'center', weight: 700, spacing: 2 * unit, color: COLOR.accent, shadow: false });
                } else {
                  keycap(context, keyLabel(bindings[action.id]), x + columnWidth - 6 * unit, rowY + rowHeight * 0.64, 34 * unit, 'right');
                }
                if (hover && mouse.clicked && rebinding === null) {
                  rebinding = action.id;
                  mouse.clicked = false;
                  sound('select');
                }
                y += rowHeight;
              }
              y += 24 * unit;
            }
          });
          text(
            context,
            rebinding ? 'Press the new key or mouse button. Esc cancels.' : 'Click an action, then press the key or mouse button you want. A key used twice swaps.',
            px + 44 * unit,
            buttonY - 22 * unit,
            { size: 18 * unit, color: rebinding ? COLOR.accent : COLOR.dim, shadow: false },
          );
          if (button('RESET TO DEFAULTS', px + 44 * unit, buttonY, 300 * unit, buttonHeight)) resetBindings();
        } else {
          // Camera style is a saved preset; presentation switches remain independent.
          const x = px + 44 * unit;
          const trackWidth = Math.min(520 * unit, panelWidth * 0.46);
          text(context, 'Camera style', x, py + 154 * unit, { size: 25 * unit, color: COLOR.dim, shadow: false });
          for (const [index, style] of (['standard', 'bodycam'] as const).entries()) {
            if (button(style === 'standard' ? 'STANDARD' : 'BODYCAM', x + (380 + index * 202) * unit, py + 122 * unit, 188 * unit, 46 * unit, settings.cameraStyle === style)) {
              settings.cameraStyle = style; saveSettings();
            }
          }
          text(context, settings.cameraStyle === 'bodycam' ? 'Chest mounted. Wide lens. Aim to raise the sights to eye level.' : 'Eye level. Conventional first-person framing.', x, py + 198 * unit, { size: 17 * unit, color: COLOR.dim, shadow: false });
          let y = py + 246 * unit;
          const slider = (id: keyof typeof SETTING_RANGES, label: string, format: (value: number) => string): void => {
            const range = SETTING_RANGES[id];
            const value = settings[id];
            text(context, label, x, y, { size: 25 * unit, color: COLOR.dim, shadow: false });
            const trackX = x + 380 * unit;
            const trackY = y - 8 * unit;
            const hover = inside(trackX - 10 * unit, trackY - 18 * unit, trackWidth + 20 * unit, 36 * unit);
            if (hover) hovering = true;
            if (hover && mouse.clicked) dragging = id;
            if (dragging === id && mouse.down) {
              const t = clamp((mouse.x - trackX) / trackWidth, 0, 1);
              const raw = range.min + t * (range.max - range.min);
              (settings as Settings)[id] = clamp(Math.round(raw / range.step) * range.step, range.min, range.max);
              saveSettings();
            }
            const fraction = (settings[id] - range.min) / (range.max - range.min);
            context.fillStyle = 'rgba(255,255,255,0.16)';
            context.fillRect(trackX, trackY - 2 * unit, trackWidth, 4 * unit);
            context.fillStyle = COLOR.accent;
            context.fillRect(trackX, trackY - 2 * unit, trackWidth * fraction, 4 * unit);
            context.beginPath();
            context.arc(trackX + trackWidth * fraction, trackY, (hover || dragging === id ? 11 : 9) * unit, 0, Math.PI * 2);
            context.fillStyle = COLOR.text;
            context.fill();
            text(context, format(value), trackX + trackWidth + 36 * unit, y, { size: 24 * unit, color: COLOR.text, shadow: false });
            y += 54 * unit;
          };
          slider('volume', 'Volume', (value) => `${Math.round(value * 100)}%`);
          slider('sensitivity', 'Mouse sensitivity', (value) => value.toFixed(2));
          slider('fieldOfView', 'Field of view', (value) => `${Math.round(value)}`);
          slider('fisheye', 'Lens warp', (value) => (value === 0 ? 'Off' : value.toFixed(2)));

          const toggle = (key: 'showRadar' | 'showCompass' | 'showHitMarkers' | 'bloom' | 'cameraMotion', label: string): void => {
            text(context, label, x, y, { size: 25 * unit, color: COLOR.dim, shadow: false });
            const w = 84 * unit;
            const h = 38 * unit;
            const tx = x + 380 * unit;
            const ty = y - 28 * unit;
            const hover = inside(tx, ty, w, h);
            if (hover) hovering = true;
            if (hover && mouse.clicked) {
              settings[key] = !settings[key];
              saveSettings();
              sound('move');
            }
            const on = settings[key];
            roundedRect(context, tx, ty, w, h, h / 2);
            context.fillStyle = on ? 'rgba(245,165,36,0.9)' : 'rgba(255,255,255,0.14)';
            context.fill();
            context.beginPath();
            context.arc(on ? tx + w - h / 2 : tx + h / 2, ty + h / 2, h * 0.38, 0, Math.PI * 2);
            context.fillStyle = on ? '#15110a' : COLOR.text;
            context.fill();
            text(context, on ? 'On' : 'Off', tx + w + 22 * unit, y, { size: 22 * unit, color: COLOR.dim, shadow: false });
            y += 46 * unit;
          };
          toggle('showRadar', 'Radar');
          toggle('showCompass', 'Compass');
          toggle('showHitMarkers', 'Hit markers');
          toggle('bloom', 'Light diffusion');
          toggle('cameraMotion', 'Camera motion');
          if (button('RESET TO DEFAULTS', x, buttonY, 300 * unit, buttonHeight)) resetSettings();
        }
        if (button('BACK', px + panelWidth - 44 * unit - 220 * unit, buttonY, 220 * unit, buttonHeight, true)) current = parent;
        promptBar(current === 'character' ? [['← →', 'CAMOUFLAGE'], ['↑ ↓', 'GLOVES'], ['ENTER', 'DEPLOY'], ['ESC', 'BACK']] : [['ESC', 'BACK']]);
      }

      document.body.style.cursor = current === 'title' ? 'default' : hovering ? 'pointer' : 'default';
      mouse.clicked = false;
      activate = false;
    },
  };
}

// Top right of the main menu: the survivor you will deploy as.
function drawSurvivorCard(context: CanvasRenderingContext2D, right: number, top: number, unit: number, appear: number): void {
  const w = 330 * unit;
  const h = 84 * unit;
  const x = right - w + (1 - appear) * 40 * unit;
  context.save();
  context.globalAlpha = appear;
  roundedRect(context, x, top, w, h, 3 * unit);
  context.fillStyle = 'rgba(8,12,16,0.72)';
  context.fill();
  context.strokeStyle = 'rgba(255,255,255,0.1)';
  context.lineWidth = 1;
  context.stroke();
  const swatch = h - 20 * unit;
  context.drawImage(outfitTexture(appearance.outfit).image as HTMLCanvasElement, 0, 0, 320, 320, x + 10 * unit, top + 10 * unit, swatch, swatch);
  context.strokeStyle = COLOR.accent;
  context.strokeRect(x + 10 * unit, top + 10 * unit, swatch, swatch);
  const tx = x + swatch + 26 * unit;
  text(context, 'SURVIVOR', tx, top + 28 * unit, { size: 12 * unit, weight: 700, spacing: 4 * unit, color: COLOR.accent, shadow: false });
  text(context, selectedOutfit().name.toUpperCase(), tx, top + 54 * unit, { size: 22 * unit, weight: 800, spacing: 2 * unit, shadow: false });
  text(context, selectedGloves().name, tx, top + 74 * unit, { size: 14 * unit, color: COLOR.dim, shadow: false });
  // Online status, for when there is any.
  context.fillStyle = COLOR.good;
  context.beginPath();
  context.arc(x + w - 70 * unit, top + 24 * unit, 3.5 * unit, 0, Math.PI * 2);
  context.fill();
  text(context, 'SOLO', x + w - 14 * unit, top + 28 * unit, { size: 12 * unit, weight: 700, spacing: 3 * unit, color: COLOR.dim, align: 'right', shadow: false });
  context.restore();
}

// Right of the main menu: the operation, with the tower drawn as a route from the garage to the
// roof, every stop and its waves. With a pointer passed in, each stop can be clicked to start
// there; the floor clicked is returned.
interface CardPointer {
  inside(x: number, y: number, w: number, h: number): boolean;
  clicked: boolean;
}

function drawOperationCard(context: CanvasRenderingContext2D, right: number, top: number, unit: number, appear: number, pointer: CardPointer | null): { floor: number; hovering: boolean } {
  let picked = -1;
  let hovering = false;
  const w = 430 * unit;
  const pad = 32 * unit;
  const rowH = 46 * unit;
  const rows = stops.length + 1;
  const h = 236 * unit + rows * rowH + 96 * unit;
  const x = right - w + (1 - appear) * 60 * unit;
  const cut = 22 * unit;
  context.save();
  context.globalAlpha = appear;
  // Glass card with one corner cut away.
  context.beginPath();
  context.moveTo(x, top);
  context.lineTo(x + w, top);
  context.lineTo(x + w, top + h - cut);
  context.lineTo(x + w - cut, top + h);
  context.lineTo(x, top + h);
  context.closePath();
  context.fillStyle = 'rgba(8,12,16,0.78)';
  context.fill();
  context.strokeStyle = 'rgba(255,255,255,0.1)';
  context.lineWidth = 1;
  context.stroke();
  context.fillStyle = COLOR.accent;
  context.fillRect(x, top, w, 3 * unit);

  text(context, 'OPERATION 001', x + pad, top + 44 * unit, { size: 13 * unit, weight: 700, spacing: 5 * unit, color: COLOR.accent, shadow: false });
  text(context, 'THE TOWER', x + pad, top + 98 * unit, { size: 48 * unit, weight: 800, spacing: 4 * unit, shadow: false });
  text(context, 'Fight up a hospital tower to the helicopter.', x + pad, top + 132 * unit, { size: 17 * unit, color: COLOR.dim, shadow: false });
  text(context, 'THREAT', x + w - pad, top + 44 * unit, { size: 11 * unit, weight: 700, spacing: 3 * unit, color: COLOR.faint, align: 'right', shadow: false });
  for (let i = 0; i < 5; i++) {
    context.fillStyle = i < 4 ? COLOR.danger : 'rgba(255,255,255,0.14)';
    context.fillRect(x + w - pad - (5 - i) * 12 * unit + 4 * unit, top + 54 * unit, 8 * unit, 14 * unit);
  }
  context.fillStyle = 'rgba(255,255,255,0.1)';
  context.fillRect(x + pad, top + 160 * unit, w - pad * 2, 1);

  // The route, roof at the top. A line runs down through a node for each stop.
  text(context, pointer ? 'ROUTE  ·  CLICK A FLOOR TO START' : 'ROUTE', x + pad, top + 194 * unit, { size: 12 * unit, weight: 700, spacing: 4 * unit, color: pointer ? COLOR.accent : COLOR.faint, shadow: false });
  const routeTop = top + 222 * unit;
  const lineX = x + pad + 9 * unit;
  context.fillStyle = 'rgba(232,184,102,0.35)';
  context.fillRect(lineX - 1 * unit, routeTop + rowH / 2, 2 * unit, (rows - 1) * rowH);
  for (let i = 0; i < rows; i++) {
    const floor = rows - 1 - i;
    const roof = floor >= stops.length;
    const y = routeTop + i * rowH;
    const middle = y + rowH / 2;
    const hover = appear > 0.9 && pointer !== null && pointer.inside(x + pad - 8 * unit, y + 2 * unit, w - pad * 2 + 16 * unit, rowH - 4 * unit);
    if (hover) {
      hovering = true;
      if (pointer!.clicked) picked = floor;
      const wash = context.createLinearGradient(x + pad, 0, x + w - pad, 0);
      wash.addColorStop(0, 'rgba(232,184,102,0.24)');
      wash.addColorStop(1, 'rgba(232,184,102,0.04)');
      context.fillStyle = wash;
      context.fillRect(x + pad - 8 * unit, y + 2 * unit, w - pad * 2 + 16 * unit, rowH - 4 * unit);
    }
    context.fillStyle = roof ? COLOR.accent : '#0b1015';
    context.strokeStyle = COLOR.accent;
    context.lineWidth = 2 * unit;
    context.beginPath();
    context.arc(lineX, middle, (roof ? 7 : 5.5) * unit, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    const label = storeyLabel(floor);
    const boxX = x + pad + 30 * unit;
    roundedRect(context, boxX, middle - 13 * unit, 52 * unit, 26 * unit, 2 * unit);
    context.fillStyle = roof ? 'rgba(232,184,102,0.2)' : 'rgba(255,255,255,0.07)';
    context.fill();
    text(context, label, boxX + 26 * unit, middle + 6 * unit, { size: 15 * unit, weight: 800, spacing: 1 * unit, align: 'center', color: roof ? COLOR.accent : COLOR.text, shadow: false });
    text(context, roof ? 'Helipad' : stops[floor].name, boxX + 68 * unit, middle + 7 * unit, { size: 19 * unit, weight: 600, color: roof ? COLOR.accent : COLOR.text, shadow: false });
    const tag = hover ? 'START HERE  ▶' : roof ? 'EXTRACT' : `${stops[floor].waves} WAVES`;
    text(context, tag, x + w - pad, middle + 5 * unit, { size: 12 * unit, weight: 700, spacing: 3 * unit, color: roof || hover ? COLOR.accent : COLOR.faint, align: 'right', shadow: false });
  }

  // The run at a glance.
  const footY = routeTop + rows * rowH + 18 * unit;
  context.fillStyle = 'rgba(255,255,255,0.1)';
  context.fillRect(x + pad, footY, w - pad * 2, 1);
  const totalWaves = stops.reduce((sum, stop) => sum + stop.waves, 0) + config.tower.roof.waves;
  const facts: [string, string][] = [[String(totalWaves), 'WAVES'], [String(stops.length), 'STOPS'], ['1', 'WAY OUT']];
  const column = (w - pad * 2) / facts.length;
  facts.forEach(([value, label], i) => {
    const fx = x + pad + i * column;
    text(context, value, fx, footY + 48 * unit, { size: 32 * unit, weight: 800, shadow: false });
    text(context, label, fx, footY + 70 * unit, { size: 11 * unit, weight: 700, spacing: 3 * unit, color: COLOR.faint, shadow: false });
  });
  context.restore();
  return { floor: picked, hovering };
}
