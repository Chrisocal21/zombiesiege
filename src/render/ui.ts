// Shared look for the HUD and the menus: type, colours, panels and key caps. Everything is drawn
// on a canvas, so there is no HTML anywhere in the UI.

export const FONT = "'Bahnschrift', 'Segoe UI Semibold', 'Arial Narrow', sans-serif";

export function outfitPreviewRect(width: number, height: number): { x: number; y: number; w: number; h: number } {
  const u = height / 1080;
  const panelWidth = Math.min(width * 0.84, 1180 * u);
  return { x: (width - panelWidth) / 2 + panelWidth * 0.59, y: height * 0.13 + 140 * u, w: panelWidth * 0.36, h: 420 * u };
}

export const COLOR = {
  text: '#f2f4f7',
  dim: 'rgba(242,244,247,0.62)',
  faint: 'rgba(242,244,247,0.32)',
  accent: '#e8b866',
  danger: '#e5483c',
  good: '#80c7b4',
  panel: 'rgba(10,20,26,0.76)',
  panelSolid: 'rgba(10,18,24,0.94)',
  border: 'rgba(255,255,255,0.14)',
};

type Align = 'left' | 'center' | 'right';

export interface TextOptions {
  size: number;
  color?: string;
  align?: Align;
  weight?: number;
  // Extra space between letters, in pixels.
  spacing?: number;
  alpha?: number;
  // A soft dark outline so text reads over any scene.
  shadow?: boolean;
}

export function text(context: CanvasRenderingContext2D, value: string, x: number, y: number, options: TextOptions): void {
  context.save();
  context.font = `${options.weight ?? 600} ${options.size}px ${FONT}`;
  context.textAlign = options.align ?? 'left';
  context.textBaseline = 'alphabetic';
  (context as unknown as { letterSpacing: string }).letterSpacing = `${options.spacing ?? 0}px`;
  context.globalAlpha *= options.alpha ?? 1;
  if (options.shadow !== false) {
    context.shadowColor = 'rgba(0,0,0,0.75)';
    context.shadowBlur = options.size * 0.28;
    context.shadowOffsetY = options.size * 0.04;
  }
  context.fillStyle = options.color ?? COLOR.text;
  context.fillText(value, x, y);
  context.restore();
}

export function measure(context: CanvasRenderingContext2D, value: string, size: number, weight = 600, spacing = 0): number {
  context.save();
  context.font = `${weight} ${size}px ${FONT}`;
  (context as unknown as { letterSpacing: string }).letterSpacing = `${spacing}px`;
  const width = context.measureText(value).width;
  context.restore();
  return width;
}

export function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  context.beginPath();
  context.roundRect(x, y, w, h, r);
}

export function panel(context: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill = COLOR.panel, radius = 6): void {
  roundedRect(context, x, y, w, h, radius);
  context.fillStyle = fill;
  context.fill();
  const sheen = context.createLinearGradient(0, y, 0, y + h);
  sheen.addColorStop(0, 'rgba(164,202,211,0.055)'); sheen.addColorStop(1, 'rgba(0,0,0,0.04)');
  context.fillStyle = sheen; context.fill();
  context.strokeStyle = COLOR.border;
  context.lineWidth = 1;
  context.stroke();
}

// A keyboard key, with the key's name inside. Returns the width, so a label can follow it.
export function keycap(context: CanvasRenderingContext2D, label: string, x: number, y: number, size: number, align: Align = 'left'): number {
  const textWidth = measure(context, label, size * 0.62, 700, 0.5);
  const width = Math.max(size, textWidth + size * 0.7);
  const left = align === 'left' ? x : align === 'right' ? x - width : x - width / 2;
  const top = y - size * 0.82;
  roundedRect(context, left, top, width, size, size * 0.2);
  context.fillStyle = 'rgba(245,247,250,0.94)';
  context.fill();
  // The lower edge, so it reads as a raised key.
  context.fillStyle = 'rgba(0,0,0,0.22)';
  context.fillRect(left + size * 0.1, top + size * 0.86, width - size * 0.2, size * 0.1);
  text(context, label, left + width / 2, top + size * 0.68, { size: size * 0.62, color: '#13161b', align: 'center', weight: 700, spacing: 0.5, shadow: false });
  return width;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
