import { loadSettings, saveSettings, settings } from './client/settings';

// The game loads straight away and its title screen comes up behind the photosensitivity
// warning. Until the warning is dismissed, flashing is held at its reduced setting whatever was
// saved, so nothing behind the warning can flash.
loadSettings();
const warning = document.querySelector<HTMLElement>('#launch-warning')!;
const continueButton = document.querySelector<HTMLButtonElement>('#launch-continue')!;
const reducedFlashing = document.querySelector<HTMLInputElement>('#launch-reduced-flashing')!;
const status = document.querySelector<HTMLElement>('#launch-status')!;
reducedFlashing.checked = settings.reducedFlashing;
let failed = false;
let acknowledged = false;

const game = import('./main').then((module) => {
  // The game read the saved settings again as it loaded.
  if (!acknowledged) settings.reducedFlashing = true;
  status.textContent = 'Ready';
  return module;
});
game.catch((error) => {
  console.error('Game launch failed', error);
  failed = true;
  continueButton.lastChild!.textContent = 'RELOAD PAGE';
  status.textContent = 'The game could not load';
});
settings.reducedFlashing = true;

continueButton.addEventListener('click', async () => {
  if (failed) { location.reload(); return; }
  if (acknowledged) return;
  acknowledged = true;
  const choice = reducedFlashing.checked;
  continueButton.disabled = true;
  reducedFlashing.disabled = true;
  try {
    const module = await game;
    settings.reducedFlashing = choice;
    saveSettings();
    warning.classList.add('closing');
    setTimeout(() => warning.remove(), 450);
    module.releaseTitle();
  } catch {
    // Reported above; the button now reloads the page.
    acknowledged = false;
    continueButton.disabled = false;
  }
});

continueButton.focus();
