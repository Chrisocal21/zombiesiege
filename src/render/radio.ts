import { config } from '../config';
import type { GameState } from '../game/state';

// Short radio and crew lines that carry the story of the prologue between objectives. Each one is tied to
// a moment on its floor: the start, or the objective being done, and shown for a few seconds. They are
// read straight from the game state, so they need nothing of their own to save.

export interface RadioLine { speaker: string; text: string; alpha: number }

interface Cue { on: 'start' | 'done'; at: number; speaker: string; text: string; seconds?: number }

const CREW = 'CREW';
const HOSPITAL = 'NORTHLINE GENERAL';

// By floor index: the prologue is -5 to -1.
const CUES: Record<number, Cue[]> = {
  [-5]: [
    { on: 'start', at: 2, speaker: CREW, text: 'Dry. Not a drop. After the day we have had.' },
    { on: 'start', at: 8, speaker: CREW, text: 'Check the police car. If the radio still works, we can call this in.' },
    { on: 'done', at: 0.6, speaker: HOSPITAL, text: 'Northline General to any unit. We are still here. We have wounded.', seconds: 5.5 },
    { on: 'done', at: 6.6, speaker: CREW, text: 'Nine miles. No fuel, no choice. We go on foot.' },
  ],
  [-4]: [
    { on: 'start', at: 1.5, speaker: CREW, text: 'The pumps are dry, and that alarm just woke the whole road.' },
    { on: 'start', at: 7.5, speaker: CREW, text: 'The survivors can take the delivery van. Hold the forecourt while it warms up.' },
    { on: 'done', at: 0.6, speaker: CREW, text: 'Van is running. Get them out of here.' },
  ],
  [-3]: [
    { on: 'start', at: 1.5, speaker: CREW, text: 'The evacuation point. Whatever they screened here, it did not hold.' },
    { on: 'done', at: 0.6, speaker: CREW, text: 'Gate controls are all thrown. The exit is open. Move.' },
  ],
  [-2]: [
    { on: 'start', at: 1.5, speaker: CREW, text: 'Take your time on this one. There is a back alley behind the kitchen.' },
    { on: 'done', at: 0.6, speaker: CREW, text: 'Got the key. Nothing between us and the hospital but the last mile.' },
  ],
  [-1]: [
    { on: 'start', at: 1.5, speaker: CREW, text: 'There it is. Raise that barrier and we are in the garage.' },
    { on: 'done', at: 0.6, speaker: CREW, text: 'Barrier is up. Everyone into the garage. Stay together.' },
  ],
};

const SHOWN = 5;
const FADE = 0.35;

// The line to show now, if any.
export function radioLine(state: GameState): RadioLine | null {
  const cues = CUES[state.floor];
  if (!cues) return null;
  const seconds = (tick: number) => (state.tick - tick) / config.ticksPerSecond;
  for (const cue of cues) {
    const tick = cue.on === 'start' ? state.waves.arrivedTick : state.objective.done ? state.objective.doneTick : -1;
    if (tick < 0) continue;
    const age = seconds(tick) - cue.at;
    const length = cue.seconds ?? SHOWN;
    if (age < 0 || age >= length) continue;
    return { speaker: cue.speaker, text: cue.text, alpha: Math.min(1, age / FADE, (length - age) / FADE) };
  }
  return null;
}
