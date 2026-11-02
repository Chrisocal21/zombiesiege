import { loadSettings, saveSettings, settings } from './client/settings';

// Import no renderer or game code until the static warning has been acknowledged.
loadSettings();
const warning = document.querySelector<HTMLElement>('#launch-warning')!;
const continueButton = document.querySelector<HTMLButtonElement>('#launch-continue')!;
const reducedFlashing = document.querySelector<HTMLInputElement>('#launch-reduced-flashing')!;
const status = document.querySelector<HTMLElement>('#launch-status')!;
reducedFlashing.checked = settings.reducedFlashing;
let launching = false;
let failed = false;

continueButton.addEventListener('click', async () => {
  if (failed) { location.reload(); return; }
  if (launching) return;
  launching = true;
  settings.reducedFlashing = reducedFlashing.checked;
  saveSettings();
  continueButton.disabled = true;
  reducedFlashing.disabled = true;
  continueButton.textContent = 'LOADING';
  status.textContent = 'Preparing the title screen…';
  try {
    await import('./main');
    requestAnimationFrame(() => warning.remove());
  } catch (error) {
    console.error('Game launch failed', error);
    failed = true;
    continueButton.disabled = false;
    continueButton.textContent = 'RELOAD PAGE';
    status.textContent = 'The game could not load. Reload the page to try again.';
  }
});

document.querySelector<HTMLElement>('#launch-heading')!.focus();
