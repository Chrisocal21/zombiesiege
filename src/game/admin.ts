import type { GameState, Player } from './state';
import { giveWeapon, isMelee, owns, reserveOf, setReserve, weaponStats, type WeaponId } from './weapons';

export interface AdminResult {
  ok: boolean;
  message: string;
}

export function changePoints(state: GameState, playerId: number, amount: number): AdminResult {
  if (!Number.isSafeInteger(amount) || amount === 0) {
    return { ok: false, message: 'Enter a positive whole number of points.' };
  }
  const current = state.points[playerId];
  if (!Number.isSafeInteger(current) || current < 0) {
    return { ok: false, message: 'Cannot change this player\'s points.' };
  }
  if (amount > 0) {
    if (amount > Number.MAX_SAFE_INTEGER - current) {
      return { ok: false, message: 'That amount would exceed the points limit.' };
    }
    state.points[playerId] = current + amount;
    return { ok: true, message: `Added ${amount.toLocaleString()} points.` };
  }
  const removed = Math.min(current, -amount);
  if (removed === 0) return { ok: false, message: 'There are no points to remove.' };
  state.points[playerId] = current - removed;
  return { ok: true, message: `Removed ${removed.toLocaleString()} points.` };
}

// Puts the weapon in hand exactly as a wall station would, for nothing: a full magazine and its
// starting spare rounds, swapping out the other wall gun if one is carried.
export function spawnWeapon(state: GameState, player: Player, weapon: WeaponId): AdminResult {
  const stats = weaponStats(weapon);
  const had = owns(player, weapon);
  giveWeapon(player, weapon, state.tick);
  return { ok: true, message: had ? `${stats.name} in hand and topped up.` : `${stats.name} in hand.` };
}

export function spawnSilencer(player: Player): AdminResult {
  if (player.silencer) return { ok: false, message: 'A silencer is already fitted.' };
  player.silencer = true;
  return { ok: true, message: 'Silencer fitted to the pistol and the AK.' };
}

export function spawnAmmo(player: Player, weapon: WeaponId, amount: number): AdminResult {
  if (isMelee(weapon)) return { ok: false, message: 'Melee weapons do not need ammunition.' };
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    return { ok: false, message: 'Enter a positive whole number of rounds.' };
  }
  const stats = weaponStats(weapon);
  if (!owns(player, weapon)) return { ok: false, message: `Spawn ${stats.name} before adding its ammo.` };

  const reserve = reserveOf(player, weapon);
  const added = Math.min(amount, Math.max(0, stats.reserveMax - reserve));
  if (added === 0) return { ok: false, message: `${stats.name} spare ammo is already full.` };
  setReserve(player, weapon, reserve + added);
  const suffix = added < amount ? ' Spare ammo is now full.' : '';
  return { ok: true, message: `Added ${added.toLocaleString()} rounds to ${stats.name}.${suffix}` };
}
