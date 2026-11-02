import { ACTIONS, type Action, bindings, keyLabel, rebind, resetBindings } from '../client/bindings';
import { SETTING_RANGES, type Settings, resetSettings, saveSettings, settings } from '../client/settings';
import { COLOR, clamp, keycap, measure, panel, roundedRect, text } from './ui';

export type Screen = 'main' | 'pause' | 'controls' | 'settings';

export interface MenuCallbacks {
  // Start the game from the title screen.
  play(): void;
  // Go back to the game from the pause menu.
  resume(): void;
  restart(): void;
}

export interface Menu {
  isOpen(): boolean;
  screen(): Screen | null;
  // True on the title screen and on the controls and settings screens opened from it.
  onTitle(): boolean;
  open(screen: 'main' | 'pause'): void;
  close(): void;
  draw(context: CanvasRenderingContext2D, width: number, height: number, time: number): void;
}

interface Mouse {
  x: number;
  y: number;
  down: boolean;
  // True for the frame after the button went down.
  clicked: boolean;
}

// The title screen, the pause menu, the controls list where keys are rebound, and the settings.
// Drawn on the HUD canvas, driven by the mouse.
export function createMenu(callbacks: MenuCallbacks): Menu {
  let current: Screen | null = 'main';
  // Which of the two top screens the controls and settings screens go back to.
  let parent: 'main' | 'pause' = 'main';
  let rebinding: Action | null = null;
  let dragging: string | null = null;
  const mouse: Mouse = { x: 0, y: 0, down: false, clicked: false };

  window.addEventListener('mousemove', (event) => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
  });
  window.addEventListener('mousedown', (event) => {
    if (current === null) return;
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
      if (current === null) return;
      if (rebinding) {
        event.preventDefault();
        event.stopPropagation();
        if (event.code !== 'Escape') rebind(rebinding, event.code);
        rebinding = null;
        return;
      }
      if (event.code === 'Escape' && (current === 'controls' || current === 'settings')) current = parent;
    },
    true,
  );

  return {
    isOpen: () => current !== null,
    screen: () => current,
    onTitle: () => current !== null && parent === 'main',
    open(screen) {
      current = screen;
      parent = screen;
      rebinding = null;
    },
    close() {
      current = null;
      rebinding = null;
      document.body.style.cursor = 'none';
    },
    draw(context, width, height, time) {
      if (current === null) return;
      const unit = height / 1080;
      let hovering = false;

      const inside = (x: number, y: number, w: number, h: number) =>
        mouse.x >= x && mouse.x <= x + w && mouse.y >= y && mouse.y <= y + h;

      // A line of the main menu: big text on the left, with an amber bar when pointed at.
      const item = (label: string, x: number, y: number): boolean => {
        const size = 40 * unit;
        const w = Math.max(measure(context, label, size, 600, 3 * unit) + 60 * unit, 360 * unit);
        const h = size * 1.5;
        const hover = inside(x - 24 * unit, y - size, w, h);
        if (hover) hovering = true;
        if (hover) {
          context.fillStyle = COLOR.accent;
          context.fillRect(x - 24 * unit, y - size * 0.9, 5 * unit, size * 1.15);
          const wash = context.createLinearGradient(x - 24 * unit, 0, x + w, 0);
          wash.addColorStop(0, 'rgba(245,165,36,0.2)');
          wash.addColorStop(1, 'rgba(245,165,36,0)');
          context.fillStyle = wash;
          context.fillRect(x - 24 * unit, y - size * 0.9, w, size * 1.15);
        }
        text(context, label, x + (hover ? 10 * unit : 0), y, { size, color: hover ? COLOR.text : COLOR.dim, spacing: 3 * unit });
        return hover && mouse.clicked;
      };

      // A rectangular button, for the bottom of the controls and settings panels.
      const button = (label: string, x: number, y: number, w: number, h: number, accent = false): boolean => {
        const hover = inside(x, y, w, h);
        if (hover) hovering = true;
        roundedRect(context, x, y, w, h, 6 * unit);
        context.fillStyle = hover ? (accent ? COLOR.accent : 'rgba(255,255,255,0.16)') : accent ? 'rgba(245,165,36,0.22)' : 'rgba(255,255,255,0.07)';
        context.fill();
        context.strokeStyle = accent ? COLOR.accent : COLOR.border;
        context.lineWidth = 1;
        context.stroke();
        text(context, label, x + w / 2, y + h * 0.64, {
          size: h * 0.42,
          align: 'center',
          spacing: 2 * unit,
          color: hover && accent ? '#15110a' : COLOR.text,
          shadow: false,
        });
        return hover && mouse.clicked;
      };

      // The darkening on the left, so the title reads over any scene.
      const wash = context.createLinearGradient(0, 0, width * 0.7, 0);
      wash.addColorStop(0, 'rgba(4,6,9,0.94)');
      wash.addColorStop(0.55, 'rgba(4,6,9,0.62)');
      wash.addColorStop(1, 'rgba(4,6,9,0.12)');
      context.fillStyle = wash;
      context.fillRect(0, 0, width, height);
      // Letterbox bars, for the film look.
      context.fillStyle = 'rgba(0,0,0,0.55)';
      context.fillRect(0, 0, width, 56 * unit);
      context.fillRect(0, height - 56 * unit, width, 56 * unit);

      const left = width * 0.075;

      if (current === 'main' || current === 'pause') {
        text(context, 'PROBABLY FINE STUDIOS', left, height * 0.22, { size: 20 * unit, color: COLOR.accent, spacing: 8 * unit });
        text(context, 'ZOMBIE', left, height * 0.32, { size: 118 * unit, weight: 800, spacing: 10 * unit });
        text(context, 'SIEGE', left, height * 0.32 + 112 * unit, { size: 118 * unit, weight: 800, spacing: 10 * unit });
        context.fillStyle = COLOR.accent;
        context.fillRect(left, height * 0.32 + 138 * unit, 150 * unit, 5 * unit);
        text(context, 'LEVEL 0  /  THE GARAGE', left, height * 0.32 + 184 * unit, { size: 22 * unit, color: COLOR.dim, spacing: 6 * unit });

        let y = height * 0.66;
        const step = 62 * unit;
        const entries: [string, () => void][] =
          current === 'main'
            ? [
                ['PLAY', () => callbacks.play()],
                ['CONTROLS', () => (current = 'controls')],
                ['SETTINGS', () => (current = 'settings')],
              ]
            : [
                ['RESUME', () => callbacks.resume()],
                ['RESTART LEVEL', () => callbacks.restart()],
                ['CONTROLS', () => (current = 'controls')],
                ['SETTINGS', () => (current = 'settings')],
              ];
        if (current === 'pause') {
          text(context, 'PAUSED', left, y - step * 0.9, { size: 20 * unit, color: COLOR.dim, spacing: 8 * unit });
        }
        for (const [label, action] of entries) {
          if (item(label, left, y)) action();
          y += step;
        }
        text(context, 'Esc opens this menu in the game', left, height - 80 * unit, { size: 17 * unit, color: COLOR.faint, spacing: 1 * unit });
      } else {
        // The controls and settings screens share a centred panel.
        const panelWidth = Math.min(width * 0.84, 1180 * unit);
        const panelHeight = height * 0.74;
        const px = (width - panelWidth) / 2;
        const py = height * 0.13;
        panel(context, px, py, panelWidth, panelHeight, COLOR.panelSolid, 10 * unit);
        text(context, current === 'controls' ? 'CONTROLS' : 'SETTINGS', px + 44 * unit, py + 70 * unit, { size: 40 * unit, weight: 800, spacing: 6 * unit });
        context.fillStyle = COLOR.accent;
        context.fillRect(px + 44 * unit, py + 90 * unit, 90 * unit, 4 * unit);

        const buttonHeight = 54 * unit;
        const buttonY = py + panelHeight - buttonHeight - 30 * unit;

        if (current === 'controls') {
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
          // Settings: three sliders and three switches.
          const x = px + 44 * unit;
          const trackWidth = Math.min(520 * unit, panelWidth * 0.46);
          let y = py + 170 * unit;
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
            y += 74 * unit;
          };
          slider('sensitivity', 'Mouse sensitivity', (value) => value.toFixed(2));
          slider('fieldOfView', 'Field of view', (value) => `${Math.round(value)}`);
          slider('fisheye', 'Lens warp', (value) => (value === 0 ? 'Off' : value.toFixed(2)));

          const toggle = (key: 'showRadar' | 'showCompass' | 'showHitMarkers', label: string): void => {
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
            y += 66 * unit;
          };
          toggle('showRadar', 'Radar');
          toggle('showCompass', 'Compass');
          toggle('showHitMarkers', 'Hit markers');
          if (button('RESET TO DEFAULTS', x, buttonY, 300 * unit, buttonHeight)) resetSettings();
        }
        if (button('BACK', px + panelWidth - 44 * unit - 220 * unit, buttonY, 220 * unit, buttonHeight, true)) current = parent;
      }

      document.body.style.cursor = hovering ? 'pointer' : 'default';
      mouse.clicked = false;
    },
  };
}
