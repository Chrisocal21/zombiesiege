import { config } from '../config';
import type { Player } from './state';

const ALL_WEAPONS = ['pistol', 'shotgun', 'machete', 'bat'] as const;
export type WeaponId = (typeof ALL_WEAPONS)[number];
// The machete and spiked bat are switched off until they look right: nobody can pick, cycle to or
// be sent one. Their rules and models stay, so turning them back on is adding them here.
export const WEAPON_IDS: readonly WeaponId[] = ['pistol', 'shotgun'];

export interface WeaponLoadout { weapon: WeaponId; ammo: number; reserve: number }
export interface MeleeStats {
  damage: number; range: number; arc: number; seconds: number; windup: number; targets: number; push: number;
}
export const isMelee = (weapon: WeaponId): boolean => weapon === 'machete' || weapon === 'bat';

export interface WeaponStats {
  kind: 'firearm' | 'melee';
  melee: MeleeStats;
  name: string;
  damage: number;
  pellets: number;
  spread: number;
  secondsBetweenShots: number;
  magazineSize: number;
  reserveStart: number;
  reserveMax: number;
  reloadSeconds: number;
  range: number;
  bulletSpeed: number;
}

export function weaponStats(weapon: WeaponId): WeaponStats {
  switch (weapon) {
    case 'pistol': return { kind: 'firearm', melee: { damage: 30, range: 1.2, arc: .5, seconds: .5, windup: .14, targets: 1, push: .12 }, name: 'P9 PISTOL', ...config.pistol, pellets: 1, spread: 0 };
    case 'shotgun': return { kind: 'firearm', melee: { damage: 40, range: 1.35, arc: .55, seconds: .6, windup: .18, targets: 1, push: .22 }, name: 'SAWED-OFF', ...config.shotgun };
    case 'machete':
    case 'bat': {
      const machete = weapon === 'machete';
      const melee = { damage: machete ? 70 : 110, range: machete ? 1.7 : 1.9, arc: machete ? .8 : .65,
        seconds: machete ? .6 : .9, windup: machete ? .18 : .29, targets: machete ? 2 : 1, push: machete ? .12 : .4 };
      return { kind: 'melee', name: machete ? 'MACHETE' : 'SPIKED BAT', melee, damage: melee.damage,
        range: melee.range, secondsBetweenShots: melee.seconds, pellets: 0, spread: 0,
        magazineSize: 0, reserveStart: 0, reserveMax: 0, reloadSeconds: 0, bulletSpeed: 0 };
    }
    default: {
      const unhandled: never = weapon;
      throw new Error(`Unknown weapon: ${unhandled}`);
    }
  }
}

// Tools have no ammo. Firearms keep their exact rounds while a tool is in hand.
export function equipWeapon(player: Player, weapon: WeaponId, tick: number): void {
  if (weapon === player.weapon || !owns(player, weapon) || player.meleeLeft > 0) return;
  const held = { weapon: player.weapon, ammo: player.ammo, reserve: player.reserve };
  if (isMelee(weapon)) {
    if (!isMelee(player.weapon)) player.holsteredGun = held;
    player.weapon = weapon; player.ammo = player.reserve = 0;
  } else {
    const away = player.holsteredGun?.weapon === weapon ? player.holsteredGun : player.stowed;
    if (!away || away.weapon !== weapon) return;
    if (isMelee(player.weapon)) {
      if (away === player.stowed) player.stowed = player.holsteredGun;
      player.holsteredGun = null;
    } else player.stowed = held;
    player.weapon = away.weapon; player.ammo = away.ammo; player.reserve = away.reserve;
  }
  player.reloadLeft = 0;
  player.aiming = false;
  player.cooldown = Math.max(player.cooldown, 0.4);
  player.lastSwapTick = tick;
}

export function nextWeapon(player: Player, direction = 1): WeaponId {
  const available = WEAPON_IDS.filter(weapon => owns(player, weapon));
  return available[(available.indexOf(player.weapon) + direction + available.length) % available.length];
}

export function swapWeapon(player: Player, tick: number, direction = 1): void {
  equipWeapon(player, nextWeapon(player, direction), tick);
}

export function owns(player: Player, weapon: WeaponId): boolean {
  return WEAPON_IDS.includes(weapon) && (player.weapon === weapon || player.stowed?.weapon === weapon || player.holsteredGun?.weapon === weapon);
}

// Spare rounds of a weapon whether it is in hand or put away.
export function reserveOf(player: Player, weapon: WeaponId): number {
  return player.weapon === weapon ? player.reserve : player.stowed?.weapon === weapon ? player.stowed.reserve : player.holsteredGun?.weapon === weapon ? player.holsteredGun.reserve : 0;
}

export function setReserve(player: Player, weapon: WeaponId, rounds: number): void {
  if (player.weapon === weapon) player.reserve = rounds;
  else if (player.stowed?.weapon === weapon) player.stowed.reserve = rounds;
  else if (player.holsteredGun?.weapon === weapon) player.holsteredGun.reserve = rounds;
}

// Takes the shotgun in hand and puts the pistol away.
export function giveShotgun(player: Player, tick: number): void {
  player.meleeLeft = 0;
  player.meleeHitPending = false;
  const stats = weaponStats('shotgun');
  if (owns(player, 'shotgun')) equipWeapon(player, 'shotgun', tick);
  else if (isMelee(player.weapon)) equipWeapon(player, player.holsteredGun?.weapon ?? 'pistol', tick);
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
  if (!isMelee(player.weapon)) player.reserve = fix(player.weapon, player.ammo, player.reserve);
  if (player.stowed) player.stowed.reserve = fix(player.stowed.weapon, player.stowed.ammo, player.stowed.reserve);
  if (player.holsteredGun) player.holsteredGun.reserve = fix(player.holsteredGun.weapon, player.holsteredGun.ammo, player.holsteredGun.reserve);
}
