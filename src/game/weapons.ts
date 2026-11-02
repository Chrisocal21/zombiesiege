import { config } from '../config';
import type { Player } from './state';

export type WeaponId = Player['weapon'];

export interface WeaponStats {
  name: string;
  damage: number;
  pellets: number;
  spread: number;
  secondsBetweenShots: number;
  magazineSize: number;
  reserveMax: number;
  reloadSeconds: number;
  range: number;
  bulletSpeed: number;
}

export function weaponStats(weapon: WeaponId): WeaponStats {
  if (weapon === 'shotgun') return { name: 'SAWED-OFF', ...config.shotgun };
  return { name: 'P9 PISTOL', ...config.pistol, pellets: 1, spread: 0 };
}

// Puts the other weapon in hand, taking its rounds with it.
export function swapWeapon(player: Player, tick: number): void {
  const away = player.stowed;
  if (!away) return;
  player.stowed = { weapon: player.weapon, ammo: player.ammo, reserve: player.reserve };
  player.weapon = away.weapon;
  player.ammo = away.ammo;
  player.reserve = away.reserve;
  player.reloadLeft = 0;
  player.cooldown = Math.max(player.cooldown, 0.4);
  player.lastSwapTick = tick;
}

export function owns(player: Player, weapon: WeaponId): boolean {
  return player.weapon === weapon || player.stowed?.weapon === weapon;
}

// Spare rounds of a weapon whether it is in hand or put away.
export function reserveOf(player: Player, weapon: WeaponId): number {
  return player.weapon === weapon ? player.reserve : player.stowed?.weapon === weapon ? player.stowed.reserve : 0;
}

export function setReserve(player: Player, weapon: WeaponId, rounds: number): void {
  if (player.weapon === weapon) player.reserve = rounds;
  else if (player.stowed?.weapon === weapon) player.stowed.reserve = rounds;
}

// Takes the shotgun in hand and puts the pistol away.
export function giveShotgun(player: Player, tick: number): void {
  const stats = weaponStats('shotgun');
  if (player.weapon !== 'shotgun') {
    player.stowed = { weapon: player.weapon, ammo: player.ammo, reserve: player.reserve };
    player.weapon = 'shotgun';
  }
  player.ammo = stats.magazineSize;
  player.reserve = config.shotgun.reserveStart;
  player.reloadLeft = 0;
  player.cooldown = 0.4;
  player.lastSwapTick = tick;
}

// Nobody starts a wave with nothing to shoot, so running dry can never lock a run.
export function guaranteeAmmo(player: Player): void {
  const fix = (weapon: WeaponId, ammo: number, reserve: number) => {
    const size = weaponStats(weapon).magazineSize;
    return Math.max(reserve, size - ammo + size);
  };
  player.reserve = fix(player.weapon, player.ammo, player.reserve);
  if (player.stowed) player.stowed.reserve = fix(player.stowed.weapon, player.stowed.ammo, player.stowed.reserve);
}
