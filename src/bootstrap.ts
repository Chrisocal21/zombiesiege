import { loadSettings, saveSettings, settings } from './client/settings';

// The game loads straight away and its title screen comes up behind the photosensitivity
// warning. Until the warning is dismissed, flashing is held at its reduced setting whatever was
// saved, so nothing behind the warning can flash. Any key dismisses it.
loadSettings();
const warning = document.querySelector<HTMLElement>('#launch-warning')!;
const reducedFlashing = document.querySelector<HTMLInputElement>('#launch-reduced-flashing')!;
const status = document.querySelector<HTMLElement>('#launch-status')!;
reducedFlashing.checked = settings.reducedFlashing;
let failed = false;
let ready = false;
let dismissed = false;
// A key pressed while the game is still loading is remembered and used as soon as it is ready.
let waiting = false;

const game = import('./main').then((module) => {
  // The game read the saved settings again as it loaded.
  if (!dismissed) settings.reducedFlashing = true;
  ready = true;
  status.textContent = 'Press any key to continue';
  status.classList.add('ready');
  return module;
});
game.catch((error) => {
  console.error('Game launch failed', error);
  failed = true;
  status.textContent = 'The game could not load. Press any key to reload';
});
settings.reducedFlashing = true;

async function dismiss(): Promise<void> {
  if (failed) { location.reload(); return; }
  if (dismissed) return;
  if (!ready) { waiting = true; return; }
  dismissed = true;
  const module = await game;
  settings.reducedFlashing = reducedFlashing.checked;
  saveSettings();
  warning.classList.add('closing');
  setTimeout(() => warning.remove(), 550);
  // After the key press is over, so the same press does not also pass the title screen.
  setTimeout(() => module.releaseTitle(), 80);
}

window.addEventListener('keydown', (event) => {
  if (dismissed || ['Shift', 'Control', 'Alt', 'Meta', 'Tab'].includes(event.key) || event.repeat) return;
  event.preventDefault();
  void dismiss();
});
void game.then(() => { if (waiting) void dismiss(); }, () => {});

document.querySelector<HTMLElement>('#launch-heading')!.focus();
