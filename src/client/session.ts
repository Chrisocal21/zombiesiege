import { config } from '../config';
import { idleInput, mergeInputs, type InputMessage } from '../game/inputs';
import { eyeY, type GameState, type Player } from '../game/state';
import { step } from '../game/update';
import { SNAPSHOT_TICKS } from '../net/protocol';
import type { Coop } from './coop';

export interface EyePosition { x: number; y: number; z: number }

// Where the game runs. Solo runs it here in the browser; co-op runs it on a server and sends
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
  // The game is paused here: nothing is pressed until it carries on.
  hold(): void;
  // Turning this player has done that the state does not show yet, to add when drawing the view.
  pendingLook(): { yaw: number; pitch: number };
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
    hold() {},
    pendingLook: () => ({ yaw: 0, pitch: 0 }),
    replace(next) {
      state = next;
      leftover = 0;
      previous = eyes(player());
    },
  };
}

// Inputs go to the server at most this often; anything in between is merged in.
const SEND_SECONDS = 1 / 60;
const snapshotMs = (SNAPSHOT_TICKS / config.ticksPerSecond) * 1000;

// Co-op: the server runs the game. This sends this player's input and draws the states that
// come back, between the last two. Until the first arrives, `waiting` stands in.
export function createRemoteSession(coop: Coop, waiting: GameState): Session {
  let unsent: InputMessage | null = null;
  let sinceSend = 0;
  let holding = false;
  const state = () => coop.latest()?.state ?? waiting;
  const find = (game: GameState) => game.players.find((each) => each.id === coop.playerId);
  const player = () => find(state()) ?? state().players[0] ?? waiting.players[0];
  return {
    get playerId() { return coop.playerId; },
    get state() { return state(); },
    get blend() {
      const latest = coop.latest();
      return latest ? Math.min(1, (performance.now() - latest.arrived) / snapshotMs) : 1;
    },
    get previous() {
      const before = coop.before();
      const earlier = before && find(before.state);
      return eyes(earlier ?? player());
    },
    player,
    advance(frameSeconds, poll) {
      if (coop.playerId < 0) return;
      holding = false;
      const input = poll(coop.playerId);
      unsent = unsent ? mergeInputs(unsent, input) : input;
      sinceSend += frameSeconds;
      if (sinceSend >= SEND_SECONDS) {
        coop.sendInput(unsent);
        unsent = null;
        sinceSend = 0;
      }
    },
    hold() {
      // One idle input, so the server stops this player walking while the menu is open.
      if (holding || coop.playerId < 0) return;
      holding = true;
      unsent = null;
      coop.sendInput(idleInput(coop.playerId));
    },
    pendingLook() {
      const look = coop.unappliedLook();
      return { yaw: look.yaw + (unsent?.lookYaw ?? 0), pitch: look.pitch + (unsent?.lookPitch ?? 0) };
    },
    // The server owns the game, so restarts and test floors do nothing here.
    replace() {},
  };
}
