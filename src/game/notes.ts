import { config } from '../config';
import type { GameState, Player } from './state';

// Notes to read on a floor (Level.notes). They are optional: nothing waits on them.

// How long the card stays up, and how close a player must be to read.
export const CARD_SECONDS = 9;
const REACH = 1.6;

// The nearest note this player can read, or -1.
export function nearestNote(state: GameState, player: Player): number {
  const notes = state.level.notes;
  if (!notes || player.y > 1.5) return -1;
  let nearest = -1;
  let best: number = REACH;
  notes.forEach((note, index) => {
    const distance = Math.hypot(note.position.x - player.x, note.position.z - player.z);
    if (distance <= best) { nearest = index; best = distance; }
  });
  return nearest;
}

// Reads a note: its card goes up, and the first time it is read it goes in the run's log.
export function readNote(state: GameState, player: Player, index: number): void {
  const note = state.level.notes?.[index];
  if (!note) return;
  state.card = { tick: state.tick, player: player.id, title: note.title, lines: note.lines };
  if (state.read[index] < 0) state.read[index] = state.tick;
  if (!state.log.some((entry) => entry.title === note.title)) state.log.push({ floor: state.floor, title: note.title, lines: note.lines });
}

// The card to show this player now, if any. Putting it away early is a matter of walking off.
export function cardFor(state: GameState, player: Player): GameState['card'] {
  const card = state.card;
  if (!card || card.player !== player.id) return null;
  if (state.tick - card.tick > CARD_SECONDS * config.ticksPerSecond) return null;
  const index = state.level.notes?.findIndex((note) => note.title === card.title) ?? -1;
  if (index >= 0) {
    const note = state.level.notes![index];
    if (Math.hypot(note.position.x - player.x, note.position.z - player.z) > REACH + 1.5) return null;
  }
  return card;
}
