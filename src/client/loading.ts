import { modelWork } from '../render/models';

// A new floor is built the moment the crew reaches it, but its models come in over the next
// second or two and the first look round builds shaders. The game holds behind a loading screen
// until all of that is done, so a floor only comes up once it has settled.

// Frames in a row with nothing loading before the floor counts as in. A model often starts more
// work as it arrives, so one quiet frame is not enough.
const QUIET_FRAMES = 12;
// However things go, the game goes on after this long.
const LONGEST_SECONDS = 25;
// A floor that is in already shows the screen for a moment at most; it comes up after this.
const SHOW_AFTER_SECONDS = 0.08;
const FADE_IN_SECONDS = 0.2;
const FADE_OUT_SECONDS = 0.45;

export interface LoadingScreen {
  // How much the screen covers the view, from 0 to 1.
  alpha: number;
  // How far through the floor's loading, from 0 to 1.
  progress: number;
  // Drawn with nothing of the game's display under it, as over a scene.
  alone?: boolean;
}

export interface Loader {
  // Resolves when the first floor, the one behind the title, is in.
  readonly first: Promise<void>;
  // Whether the game is held for a floor still loading.
  readonly waiting: boolean;
  // Call once a frame with the floor now showing and the time in seconds.
  update(floor: string, time: number): void;
  // What to draw this frame, or null when the screen is gone.
  screen(time: number): LoadingScreen | null;
}

export function createLoader(prepare: () => Promise<void>): Loader {
  let floor: string | null = null;
  let waiting = false;
  let quiet = 0;
  // 'idle' until the models are in, then the shaders and textures are done, then 'ready'.
  let stage: 'idle' | 'preparing' | 'ready' = 'idle';
  let since = 0;
  let doneAt = -Infinity;
  let doneAlpha = 0;
  let startedBefore = 0;
  let finishedBefore = 0;
  let progress = 0;
  let firstDone: () => void = () => {};
  const first = new Promise<void>((resolve) => { firstDone = resolve; });

  const coverAt = (time: number) => Math.max(0, Math.min(1, (time - since - SHOW_AFTER_SECONDS) / FADE_IN_SECONDS));

  return {
    first,
    get waiting() { return waiting; },
    update(next, time) {
      if (next !== floor) {
        floor = next;
        waiting = true;
        quiet = 0;
        stage = 'idle';
        since = time;
        const work = modelWork();
        startedBefore = work.started - work.busy;
        finishedBefore = work.finished;
        progress = 0;
      }
      if (!waiting) return;
      const work = modelWork();
      quiet = work.busy === 0 ? quiet + 1 : 0;
      // Only this floor's share of the work counts, and the bar never runs backwards as more turns up.
      const total = work.started - startedBefore;
      const share = total > 0 ? (work.finished - finishedBefore) / total : 1;
      progress = Math.max(progress, Math.min(0.92, share * 0.92));
      // The last stretch is the shaders, which give no count: the bar creeps on towards the end.
      if (stage === 'preparing') progress += (0.99 - progress) * 0.03;
      if (quiet >= QUIET_FRAMES && stage === 'idle') {
        stage = 'preparing';
        const preparing = floor;
        void prepare().catch(() => undefined).then(() => { if (floor === preparing) stage = 'ready'; });
      }
      // Work that started while the shaders were built sends it round again.
      if (stage === 'ready' && quiet < QUIET_FRAMES) stage = 'idle';
      if ((stage === 'ready' && quiet >= QUIET_FRAMES) || time - since > LONGEST_SECONDS) {
        waiting = false;
        progress = 1;
        doneAlpha = coverAt(time);
        doneAt = time;
        firstDone();
      }
    },
    screen(time) {
      if (waiting) return { alpha: coverAt(time), progress };
      const alpha = doneAlpha * (1 - (time - doneAt) / FADE_OUT_SECONDS);
      return alpha > 0 ? { alpha, progress } : null;
    },
  };
}
