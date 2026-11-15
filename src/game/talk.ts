import { config } from '../config';
import { completeStep } from './objectives';
import { flowOf, type GameState, type Player } from './state';
import type { WeaponId } from './weapons';

// Someone to talk to on a floor (Level.talks): a voice on a radio or an intercom, with a few things to
// say back. Each answer can cost points and can change the floor: pay for the job to be done from the
// other end, take ammunition, open a lock, or bring the dead down on the crew. Walk up and press use to
// open it; the three weapon keys are the answers while it is open, so it runs on the inputs every
// player already sends and plays the same in co-op.

// How long the choices wait for an answer, how long the reply stays up, and how close to stand.
export const CHOOSE_SECONDS = 25;
export const REPLY_SECONDS = 7;
const REACH = 1.8;

const ANSWER_KEYS: WeaponId[] = ['pistol', 'shotgun', 'ak'];
const ticks = (seconds: number) => seconds * config.ticksPerSecond;

// Whether this talk can be opened now: not finished, and on the step it belongs to if it names one.
function open(state: GameState, index: number): boolean {
  const talk = state.level.talks?.[index];
  if (!talk || state.talks[index]?.done) return false;
  if (talk.step !== undefined && (state.objective.step !== talk.step || state.objective.done)) return false;
  return true;
}

// The nearest talk this player can open, or -1.
export function nearestTalk(state: GameState, player: Player): number {
  const talks = state.level.talks;
  if (!talks || player.y > 1.5) return -1;
  let nearest = -1;
  let best: number = REACH;
  talks.forEach((talk, index) => {
    if (!open(state, index)) return;
    const distance = Math.hypot(talk.position.x - player.x, talk.position.z - player.z);
    if (distance <= best) { nearest = index; best = distance; }
  });
  return nearest;
}

// Starts the talk, unless someone else is in the middle of one.
export function openTalk(state: GameState, player: Player, index: number): void {
  if (state.talk && state.talk.player !== player.id) return;
  if (!open(state, index)) return;
  state.talk = { index, player: player.id, tick: state.tick, reply: -1, poorTick: -1 };
}

// Puts the talk away when its time is up, its speaker walks off or goes down, or the floor moves past it.
export function updateTalk(state: GameState): void {
  const current = state.talk;
  if (!current) return;
  const talk = state.level.talks?.[current.index];
  const player = state.players.find((each) => each.id === current.player);
  const limit = current.reply >= 0 ? REPLY_SECONDS : CHOOSE_SECONDS;
  const away = !talk || !player || player.out || player.health <= 0
    || Math.hypot(talk.position.x - player.x, talk.position.z - player.z) > REACH + 1.5;
  if (away || state.tick - current.tick > ticks(limit)) state.talk = null;
}

// A weapon key pressed by the one talking is an answer. Returns whether the press was used up here,
// so it does not also change the gun in hand.
export function chooseTalk(state: GameState, player: Player, key: WeaponId): boolean {
  const current = state.talk;
  if (!current || current.player !== player.id || current.reply >= 0 || player.health <= 0) return false;
  const talk = state.level.talks?.[current.index];
  const number = ANSWER_KEYS.indexOf(key);
  if (!talk || number < 0) return false;
  const choice = talk.choices[number];
  if (!choice || state.talks[current.index].chosen.includes(number)) return true;
  const cost = choice.cost ?? 0;
  if ((state.points[player.id] ?? 0) < cost) { current.poorTick = state.tick; return true; }

  state.points[player.id] = (state.points[player.id] ?? 0) - cost + (choice.points ?? 0);
  if (choice.ammo) player.reserve += choice.ammo;
  if (choice.opens !== undefined && state.locks[choice.opens] && !state.locks[choice.opens].open) {
    const lock = state.level.locks[choice.opens];
    state.locks[choice.opens] = { open: true, openedTick: state.tick };
    state.level.boxes = state.level.boxes.filter((box) => !(box.surface === 'lock' && box.position.x === lock.position.x && box.position.z === lock.position.z));
  }
  if (choice.alarm) {
    const flow = flowOf(state.level);
    if (flow.kind === 'sweep') {
      state.waves.reinforce += state.waves.alarms === 0 ? flow.first ?? flow.loud : flow.loud;
      state.waves.alarms++;
      state.waves.loudTick = state.tick;
    }
  }
  state.talks[current.index].chosen.push(number);
  // An answer that settles things ends the talk for good; one that only asks leaves it open for later.
  if (!choice.stay) state.talks[current.index].done = true;
  if (!state.log.some((entry) => entry.title === `${talk.who}: ${choice.label}`)) state.log.push({ floor: state.floor, title: `${talk.who}: ${choice.label}`, lines: choice.reply });
  current.reply = number;
  current.tick = state.tick;
  player.lastBuyTick = state.tick;
  // Last, since it moves the floor on to its next step.
  if (choice.skip && !state.objective.done) completeStep(state);
  return true;
}
