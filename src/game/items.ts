import { config } from '../config';
import type { GameState, Player } from './state';

// Things to carry and use: bandages and first aid kits heal, water keeps natural regeneration quick.
export const ITEM_IDS = ['bandage', 'medkit', 'water'] as const;
export type ItemId = (typeof ITEM_IDS)[number];

export interface ItemStats {
  name: string;
  // Health given, as a share of full health. Water gives none.
  heal: number;
  // Hydration given, out of 100.
  drink: number;
  useSeconds: number;
  carryMax: number;
  // Chance a killed zombie drops one.
  dropChance: number;
}

export const ITEMS: Record<ItemId, ItemStats> = {
  bandage: { name: 'BANDAGE', heal: 0.5, drink: 0, useSeconds: 1.6, carryMax: 10, dropChance: 0.1 },
  medkit: { name: 'FIRST AID KIT', heal: 1, drink: 0, useSeconds: 3.2, carryMax: 10, dropChance: 0.03 },
  water: { name: 'WATER', heal: 0, drink: 35, useSeconds: 1, carryMax: 10, dropChance: 0.08 },
};

export type Items = Record<ItemId, number>;
export const startingItems = (): Items => ({ bandage: 1, medkit: 0, water: 1 });

export interface Supply {
  id: number;
  item: ItemId;
  x: number;
  z: number;
}
const MAX_SUPPLIES = 12;
export const SUPPLY_RANGE = 1.6;

// How quickly health comes back on its own: full speed at half hydration, down to half speed when
// parched and up to one and a half times when well watered.
export function regenFactor(player: Player): number {
  return 0.5 + player.hydration / 100;
}

export function canUse(player: Player, item: ItemId): boolean {
  if (player.health <= 0 || player.items[item] <= 0 || player.itemLeft > 0) return false;
  if (player.carrying >= 0 || player.ladder || player.mantle || player.meleeLeft > 0) return false;
  const stats = ITEMS[item];
  if (stats.heal > 0) return player.health < config.player.maxHealth;
  return player.hydration < 100;
}

// Starts using an item. It takes effect after its use time, and the gun is down meanwhile.
export function startItem(player: Player, item: ItemId): void {
  if (!canUse(player, item)) return;
  player.item = item;
  player.itemLeft = ITEMS[item].useSeconds;
  player.reloadLeft = 0;
  player.aiming = false;
}

// Counts down a use in progress and applies it at the end.
export function updateItem(player: Player, dt: number): void {
  if (player.itemLeft <= 0 || !player.item) return;
  player.itemLeft -= dt;
  if (player.carrying >= 0 || player.health <= 0) {
    player.itemLeft = 0;
    player.item = null;
    return;
  }
  if (player.itemLeft > 0) return;
  const stats = ITEMS[player.item];
  if (player.items[player.item] > 0) {
    player.items[player.item]--;
    player.health = Math.min(config.player.maxHealth, player.health + stats.heal * config.player.maxHealth);
    player.hydration = Math.min(100, player.hydration + stats.drink);
  }
  player.itemLeft = 0;
  player.item = null;
}

// Thirst: hydration drains slowly, so water is worth a sip every so often.
export function thirst(player: Player, dt: number): void {
  if (player.health > 0) player.hydration = Math.max(0, player.hydration - config.player.thirstPerSecond * dt);
}

// A killed zombie sometimes leaves something behind.
export function dropSupply(state: GameState, x: number, z: number): void {
  if (state.supplies.length >= MAX_SUPPLIES) return;
  const roll = Math.random();
  let edge = 0;
  for (const item of ITEM_IDS) {
    edge += ITEMS[item].dropChance;
    if (roll < edge) {
      state.supplies.push({ id: state.nextSupplyId++, item, x, z });
      return;
    }
  }
}

// A restock set out by the elevator once a wave or a floor is done, so everyone can patch up and
// drink before the next one. One set per player, spread out in a row; it ignores the drop cap.
export function dropCache(state: GameState, items: ItemId[]): void {
  const lift = state.level.elevator;
  const players = Math.max(1, state.players.length);
  const all: ItemId[] = [];
  for (let i = 0; i < players; i++) all.push(...items);
  all.forEach((item, index) => {
    const along = (index - (all.length - 1) / 2) * 0.7;
    const sideX = Math.abs(lift.normal.z) * along;
    const sideZ = Math.abs(lift.normal.x) * along;
    state.supplies.push({ id: state.nextSupplyId++, item, x: lift.position.x + lift.normal.x * 2.4 + sideX, z: lift.position.z + lift.normal.z * 2.4 + sideZ });
  });
}

export function nearestSupply(state: GameState, player: Player): number {
  let nearest = -1;
  let best = SUPPLY_RANGE;
  state.supplies.forEach((supply, index) => {
    if (player.items[supply.item] >= ITEMS[supply.item].carryMax) return;
    const distance = Math.hypot(supply.x - player.x, supply.z - player.z);
    if (distance <= best) { nearest = index; best = distance; }
  });
  return nearest;
}

export function takeSupply(state: GameState, player: Player, index: number): void {
  const supply = state.supplies[index];
  if (!supply || player.items[supply.item] >= ITEMS[supply.item].carryMax) return;
  player.items[supply.item]++;
  state.supplies.splice(index, 1);
}
