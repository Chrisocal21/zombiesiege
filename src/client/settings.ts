import { config } from '../config';

// Choices the player makes in the menu. They live in the browser, not in the game state, because
// they change how the game is shown and controlled, not what happens in it.
export interface Settings {
  // Multiplies mouse turning. 1 is the default feel.
  sensitivity: number;
  // Master volume, 0 to 1.
  volume: number;
  // Degrees, when not aiming.
  fieldOfView: number;
  // Strength of the lens warp. 0 is a flat picture.
  fisheye: number;
  showRadar: boolean;
  showCompass: boolean;
  showHitMarkers: boolean;
  bloom: boolean;
  cameraMotion: boolean;
  cameraStyle: 'standard' | 'bodycam';
  reducedFlashing: boolean;
}

export const SETTING_RANGES = {
  sensitivity: { min: 0.2, max: 3, step: 0.05 },
  volume: { min: 0, max: 1, step: 0.05 },
  fieldOfView: { min: 60, max: 110, step: 1 },
  fisheye: { min: 0, max: 0.4, step: 0.01 },
} as const;

const DEFAULTS: Settings = {
  sensitivity: 1,
  volume: 0.7,
  fieldOfView: config.view.fieldOfView,
  fisheye: config.view.fisheye,
  showRadar: true,
  showCompass: true,
  showHitMarkers: true,
  bloom: true,
  cameraMotion: true,
  cameraStyle: 'standard',
  reducedFlashing: true,
};

const STORAGE_KEY = 'zombiesiege.settings';

export const settings: Settings = { ...DEFAULTS };

export function loadSettings(): void {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    const parsed = JSON.parse(saved) as Partial<Settings>;
    for (const key of Object.keys(DEFAULTS) as (keyof Settings)[]) {
      const value = parsed[key];
      if (typeof value === 'number' && !Number.isFinite(value)) continue;
      if (typeof value === typeof DEFAULTS[key]) (settings as unknown as Record<string, unknown>)[key] = value;
    }
    for (const key of Object.keys(SETTING_RANGES) as (keyof typeof SETTING_RANGES)[]) {
      const range = SETTING_RANGES[key];
      settings[key] = Math.max(range.min, Math.min(range.max, settings[key]));
    }
    if (settings.cameraStyle !== 'standard' && settings.cameraStyle !== 'bodycam') settings.cameraStyle = 'standard';
  } catch {
    // Storage can be blocked. The defaults are fine.
  }
}

export function saveSettings(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Not saving is not a problem.
  }
}

export function resetSettings(): void {
  Object.assign(settings, DEFAULTS);
  saveSettings();
}
