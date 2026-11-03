import { config } from '../config';
import type { InputMessage } from '../game/inputs';
import { eyeY, type GameState, type Player } from '../game/state';
import { step } from '../game/update';

export interface EyePosition { x: number; y: number; z: number }

// Where the game runs. Solo runs it here in the browser; co-op will run it on a server and send
// the state back. Either way, the rest of the client only reads the state and draws it.
export interface Session {
  // The player this browser controls.
  readonly playerId: number;
  // The latest state, to draw.
  readonly state: GameState;
  // How far between the last tick and the next one to draw, from 0 to 1.
  readonly blend: number;
  // Where this player's eyes were on the tick before the latest one, to draw between the two.
  readonly previous: EyePosition;
  // This browser's player. A restart replaces the player object, so it is looked up each time.
  player(): Player;
  // Moves the game on by a frame's worth of time, asking for this player's input once per tick.
  advance(frameSeconds: number, poll: (playerId: number) => InputMessage): void;
  // Swaps in a new game: a restart, a floor picked for testing, or the title screen.
  replace(next: GameState): void;
}

const tickSeconds = 1 / config.ticksPerSecond;

function eyes(player: Player): EyePosition {
  return { x: player.x, y: eyeY(player), z: player.z };
}

// Solo: the game runs here, on a fixed tick, with only this browser's input.
export function createLocalSession(initial: GameState, playerId = 0): Session {
  let state = initial;
  let leftover = 0;
  const player = () => state.players.find((each) => each.id === playerId) ?? state.players[0];
  let previous = eyes(player());
  return {
    playerId,
    get state() { return state; },
    get blend() { return leftover / tickSeconds; },
    get previous() { return previous; },
    player,
    advance(frameSeconds, poll) {
      leftover += frameSeconds;
      while (leftover >= tickSeconds) {
        previous = eyes(player());
        step(state, [poll(playerId)], tickSeconds);
        leftover -= tickSeconds;
      }
    },
    replace(next) {
      state = next;
      leftover = 0;
      previous = eyes(player());
    },
  };
}
