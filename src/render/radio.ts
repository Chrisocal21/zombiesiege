import { config } from '../config';
import { stepDoneTick, type GameState } from '../game/state';
import type { Cue } from '../levels/types';
import { CREW, HOSPITAL, SCIENTIST, SCIENTIST_HERE } from '../levels/voices';

// Short radio and crew lines that carry the story between objectives. Each one is tied to a moment on
// its floor: the start, a step of the objective being done, the whole objective being done, or the
// first player walking into an area, and shown for a few seconds. They are read straight from the
// game state, so they need nothing of their own to save. A level's own cues are in its level file;
// the prologue's are here.

export interface RadioLine { speaker: string; text: string; alpha: number; scientist: boolean }

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

// The tick a cue's moment came, or -1 while it has not.
function momentOf(state: GameState, cue: Cue, index: number): number {
  switch (cue.on) {
    case 'start': return state.waves.arrivedTick;
    case 'done': return state.objective.done ? state.objective.doneTick : -1;
    case 'step': return stepDoneTick(state, cue.step ?? 0);
    case 'area': return state.heard[index] ?? -1;
    case 'boss': return state.boss?.arrivedTick ?? -1;
  }
}

// The line to show now, if any. When two overlap, the one that began last cuts in over the other.
export function radioLine(state: GameState): RadioLine | null {
  const cues = state.level.cues ?? CUES[state.floor];
  if (!cues) return null;
  const seconds = (tick: number) => (state.tick - tick) / config.ticksPerSecond;
  let line: RadioLine | null = null;
  let newest = Infinity;
  for (let index = 0; index < cues.length; index++) {
    const cue = cues[index];
    const tick = momentOf(state, cue, index);
    if (tick < 0) continue;
    const age = seconds(tick) - cue.at;
    const length = cue.seconds ?? SHOWN;
    if (age < 0 || age >= length || age >= newest) continue;
    newest = age;
    line = { speaker: cue.speaker, text: cue.text, alpha: Math.min(1, age / FADE, (length - age) / FADE), scientist: cue.speaker === SCIENTIST || cue.speaker === SCIENTIST_HERE };
  }
  return line;
}
