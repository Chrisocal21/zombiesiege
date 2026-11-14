import { config } from '../config';
import type { Level } from '../levels/types';
import { spawnPoint, type GameState, type Player } from './state';

// Going down, being brought back, and running out of lives. Lives belong to each player.
//
// At 0 health a player is down, not dead: they can crawl and fire what is left in the gun in hand,
// and they bleed out after config.player.down.bleedSeconds. A teammate kneeling beside them for a
// few uninterrupted seconds brings them back, at no cost. A player on their own can get up by
// themself, slower, and it costs a life; with their last life they cannot.
//
// Bleeding out costs a life. With lives left the player comes back at the next safe moment (a break
// between waves, a cleared floor, the next floor); with none they are out of the run and watch.
// With nobody left on their feet the run is over (see waves.ts).

const ticks = (seconds: number): number => Math.round(seconds * config.ticksPerSecond);

export function isDown(player: Player): boolean {
  return player.health <= 0 && !player.out;
}

// Alone, down, and with a life to spare.
export function canGetUp(state: GameState, player: Player): boolean {
  return state.players.length === 1 && isDown(player) && player.lives > 1;
}

// Nobody on their feet, and nobody who can get up by themself.
export function nobodyStanding(state: GameState): boolean {
  return state.players.length > 0
    && state.players.every((player) => player.health <= 0)
    && !state.players.some((player) => canGetUp(state, player) || player.revive !== null);
}

// Who this player would revive by pressing use now: the nearest downed teammate in reach, or
// themself when alone. Null if nobody.
export function reviveTarget(state: GameState, player: Player): Player | null {
  if (player.health <= 0) return canGetUp(state, player) && !player.revive ? player : null;
  let best: Player | null = null;
  let nearest: number = config.player.down.reach;
  for (const other of state.players) {
    if (other === player || !isDown(other)) continue;
    if (state.players.some((each) => each.revive?.target === other.id)) continue;
    const distance = Math.hypot(other.x - player.x, other.z - player.z);
    if (distance <= nearest) { best = other; nearest = distance; }
  }
  return best;
}

export function startRevive(state: GameState, player: Player): boolean {
  const target = reviveTarget(state, player);
  if (!target || player.revive) return false;
  player.revive = { target: target.id, startTick: state.tick };
  player.aiming = false;
  player.reloadLeft = 0;
  return true;
}

// How far along a revive is, 0 to 1.
export function reviveProgress(state: GameState, player: Player): number {
  const revive = player.revive;
  if (!revive) return 0;
  const need = revive.target === player.id ? config.player.down.selfReviveSeconds : config.player.down.reviveSeconds;
  return Math.min(1, (state.tick - revive.startTick) / ticks(need));
}

// Seconds this downed player has before bleeding out.
export function bleedLeft(state: GameState, player: Player): number {
  if (!isDown(player) || player.downTick < 0) return 0;
  return Math.max(0, config.player.down.bleedSeconds - (state.tick - player.downTick) / config.ticksPerSecond);
}

// The one being revived by someone, if any.
export function revivedBy(state: GameState, player: Player): Player | null {
  return state.players.find((each) => each.revive?.target === player.id) ?? null;
}

export function updateDowned(state: GameState, moved: Set<number>): void {
  const down = config.player.down;
  for (const player of state.players) {
    if (player.health > 0) { player.downTick = -1; continue; }
    if (player.out || player.downTick >= 0) continue;
    // Just gone down: whatever was in hand stops.
    player.downTick = state.tick;
    player.revive = null;
    player.aiming = false;
    player.reloadLeft = 0;
    player.item = null;
    player.itemLeft = 0;
    player.meleeLeft = 0;
    player.meleeHitPending = false;
    player.ladder = null;
    player.mantle = null;
    player.cover = false;
  }

  // Revives in progress. Moving, shooting, being hit or the other one getting too far away stops one.
  for (const player of state.players) {
    const revive = player.revive;
    if (!revive) continue;
    const target = state.players.find((each) => each.id === revive.target);
    const alone = target === player;
    const ok = target !== undefined && isDown(target)
      && (alone || (player.health > 0 && Math.hypot(target.x - player.x, target.z - player.z) <= down.reach + 0.4))
      && player.lastHurtTick < revive.startTick && !moved.has(player.id);
    if (!ok) { player.revive = null; continue; }
    if (reviveProgress(state, player) < 1) continue;
    target.health = down.reviveHealth;
    target.downTick = -1;
    // Up again, health comes back on its own only after a quiet spell, as after any hit.
    target.lastHurtTick = state.tick;
    if (alone) target.lives = Math.max(1, target.lives - 1);
    player.revive = null;
  }

  // Bleeding out.
  for (const player of state.players) {
    if (!isDown(player) || player.downTick < 0) continue;
    if (state.tick - player.downTick < ticks(down.bleedSeconds)) continue;
    if (state.players.some((each) => each.revive?.target === player.id)) continue;
    player.lives = Math.max(0, player.lives - 1);
    player.out = true;
    player.downTick = -1;
    player.revive = null;
  }
}

// A safe moment: whoever bled out with a life left is back, beside someone still standing, or at
// the floor's spawn if nobody is.
export function bringBack(state: GameState, level: Level): void {
  const standing = state.players.find((player) => player.health > 0);
  for (const player of state.players) {
    if (!player.out || player.lives <= 0) continue;
    const at = standing ?? spawnPoint(level.playerSpawns, player.id, level.spawnYaw);
    player.x = at.x;
    player.y = standing ? standing.y : 0;
    player.z = at.z;
    player.vx = player.vy = player.vz = 0;
    player.out = false;
    player.downTick = -1;
    player.health = config.player.maxHealth;
    player.lastHurtTick = -1;
  }
}
