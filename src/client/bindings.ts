// What each key does. Every action has one key or mouse button, which the player can change in
// the menu. Keys are the browser's own key codes ("KeyW"), and mouse buttons are "Mouse0" for
// left, "Mouse1" for middle and "Mouse2" for right.
export type Action =
  | 'forward'
  | 'back'
  | 'left'
  | 'right'
  | 'jump'
  | 'crouch'
  | 'fire'
  | 'aim'
  | 'reload'
  | 'swap'
  | 'leanLeft'
  | 'leanRight'
  | 'cover'
  | 'use'
  | 'freeze'
  | 'map';

export interface ActionInfo {
  id: Action;
  label: string;
  group: string;
}

export const ACTIONS: ActionInfo[] = [
  { id: 'forward', label: 'Move forward', group: 'Movement' },
  { id: 'back', label: 'Move backward', group: 'Movement' },
  { id: 'left', label: 'Move left', group: 'Movement' },
  { id: 'right', label: 'Move right', group: 'Movement' },
  { id: 'jump', label: 'Jump and climb', group: 'Movement' },
  { id: 'crouch', label: 'Crouch', group: 'Movement' },
  { id: 'fire', label: 'Fire', group: 'Combat' },
  { id: 'aim', label: 'Aim down sights', group: 'Combat' },
  { id: 'reload', label: 'Reload', group: 'Combat' },
  { id: 'swap', label: 'Swap weapon (or scroll wheel)', group: 'Combat' },
  { id: 'leanLeft', label: 'Lean left', group: 'Combat' },
  { id: 'leanRight', label: 'Lean right', group: 'Combat' },
  { id: 'cover', label: 'Take cover', group: 'Interaction' },
  { id: 'use', label: 'Use and pick up', group: 'Interaction' },
  { id: 'map', label: 'Tactical map', group: 'Interaction' },
  { id: 'freeze', label: 'Freeze zombies (testing)', group: 'Interaction' },
];

const DEFAULTS: Record<Action, string> = {
  forward: 'KeyW',
  back: 'KeyS',
  left: 'KeyA',
  right: 'KeyD',
  jump: 'Space',
  crouch: 'KeyC',
  fire: 'Mouse0',
  aim: 'Mouse2',
  reload: 'KeyR',
  swap: 'KeyX',
  leanLeft: 'KeyQ',
  leanRight: 'KeyV',
  cover: 'KeyF',
  use: 'KeyE',
  freeze: 'KeyP',
  map: 'KeyM',
};

const STORAGE_KEY = 'zombiesiege.bindings';

export const bindings: Record<Action, string> = { ...DEFAULTS };

export function loadBindings(): void {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    const parsed = JSON.parse(saved) as Partial<Record<Action, string>>;
    for (const action of Object.keys(DEFAULTS) as Action[]) {
      if (typeof parsed[action] === 'string') bindings[action] = parsed[action]!;
    }
    // Use moved from G to E, and lean right from E to V. Only bindings still on the old
    // defaults are moved; anything the player chose is kept.
    if (parsed.use === 'KeyG' && parsed.leanRight === 'KeyE') {
      bindings.use = DEFAULTS.use;
      bindings.leanRight = DEFAULTS.leanRight;
      saveBindings();
    }
  } catch {
    // Storage can be blocked. The defaults are fine.
  }
}

function saveBindings(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bindings));
  } catch {
    // Not saving is not a problem.
  }
}

// Gives an action a new key. If another action had that key, it takes the old key of this one,
// so no key ever does two things.
export function rebind(action: Action, code: string): void {
  const other = (Object.keys(bindings) as Action[]).find((id) => id !== action && bindings[id] === code);
  if (other) bindings[other] = bindings[action];
  bindings[action] = code;
  saveBindings();
}

export function resetBindings(): void {
  Object.assign(bindings, DEFAULTS);
  saveBindings();
}

const NAMES: Record<string, string> = {
  Space: 'Space',
  ShiftLeft: 'L Shift',
  ShiftRight: 'R Shift',
  ControlLeft: 'L Ctrl',
  ControlRight: 'R Ctrl',
  AltLeft: 'L Alt',
  AltRight: 'R Alt',
  Tab: 'Tab',
  Enter: 'Enter',
  Backspace: 'Backspace',
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  Mouse0: 'Left Click',
  Mouse1: 'Middle Click',
  Mouse2: 'Right Click',
  Backquote: '`',
  Minus: '-',
  Equal: '=',
  BracketLeft: '[',
  BracketRight: ']',
  Semicolon: ';',
  Quote: "'",
  Comma: ',',
  Period: '.',
  Slash: '/',
  Backslash: '\\',
};

// A short name for a key, to show on a keycap.
export function keyLabel(code: string): string {
  if (NAMES[code]) return NAMES[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return 'Num ' + code.slice(6);
  return code;
}
