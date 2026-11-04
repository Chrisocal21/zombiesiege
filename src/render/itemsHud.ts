import { bindings, keyLabel } from '../client/bindings';
import { WHEEL_SEGMENTS, wheelSegment, type WheelState } from '../client/wheel';
import { ITEMS, ITEM_IDS, regenFactor, type ItemId } from '../game/items';
import type { Player } from '../game/state';
import { owns, weaponStats, type WeaponId } from '../game/weapons';
import { COLOR, keycap, roundedRect, text } from './ui';

const ITEM_COLOR: Record<ItemId, string> = { bandage: '#e8e2d2', medkit: '#e5483c', water: '#5db4ff' };

// A small drawing of each item: a roll of gauze, a white case with a cross, a bottle.
function itemIcon(context: CanvasRenderingContext2D, item: ItemId, cx: number, cy: number, size: number, alpha: number): void {
  context.save();
  context.globalAlpha = alpha;
  const half = size / 2;
  if (item === 'bandage') {
    context.fillStyle = '#e8e2d2';
    roundedRect(context, cx - half * 0.8, cy - half * 0.45, size * 0.8, size * 0.5, size * 0.12);
    context.fill();
    context.fillStyle = '#c44';
    context.fillRect(cx - half * 0.12, cy - half * 0.45, size * 0.16, size * 0.5);
  } else if (item === 'medkit') {
    context.fillStyle = '#f4f4f0';
    roundedRect(context, cx - half * 0.85, cy - half * 0.6, size * 0.85, size * 0.62, size * 0.1);
    context.fill();
    context.fillStyle = '#e5483c';
    context.fillRect(cx - size * 0.05, cy - half * 0.4, size * 0.1, size * 0.4);
    context.fillRect(cx - size * 0.2, cy - size * 0.12, size * 0.4, size * 0.1);
  } else {
    context.fillStyle = '#5db4ff';
    roundedRect(context, cx - half * 0.38, cy - half * 0.55, size * 0.38, size * 0.82, size * 0.1);
    context.fill();
    context.fillStyle = '#dfeeff';
    context.fillRect(cx - half * 0.2, cy - half * 0.8, size * 0.2, size * 0.2);
  }
  context.restore();
}

// Items in hand and how fast health is coming back, beside the health readout.
export function drawItemBar(context: CanvasRenderingContext2D, x: number, base: number, unit: number, player: Player): void {
  const slot = 50 * unit;
  const gap = 8 * unit;
  ITEM_IDS.forEach((item, index) => {
    const sx = x + index * (slot + gap);
    const count = player.items[item];
    const active = player.item === item;
    roundedRect(context, sx, base - slot, slot, slot, 6 * unit);
    context.fillStyle = active ? 'rgba(232,184,102,0.28)' : 'rgba(6,10,14,0.55)';
    context.fill();
    context.strokeStyle = active ? COLOR.accent : COLOR.border;
    context.lineWidth = 1.5 * unit;
    context.stroke();
    itemIcon(context, item, sx + slot / 2, base - slot / 2 + 2 * unit, slot * 0.6, count > 0 ? 1 : 0.28);
    text(context, `${count}`, sx + slot - 6 * unit, base - 6 * unit, { size: 14 * unit, weight: 800, align: 'right', color: count > 0 ? COLOR.text : COLOR.faint });
    keycap(context, keyLabel(bindings[item]), sx + 4 * unit, base - slot + 18 * unit, 14 * unit);
  });
  const regen = Math.round(regenFactor(player) * 100);
  const thirsty = player.hydration < 25;
  text(context, `REGEN ${regen}%`, x, base - slot - 8 * unit, { size: 12 * unit, weight: 700, spacing: 2 * unit, color: thirsty ? COLOR.danger : COLOR.dim });
}

// Progress while a bandage, kit or drink is being used, low in the middle of the screen.
export function drawItemUse(context: CanvasRenderingContext2D, width: number, height: number, unit: number, player: Player): void {
  if (!player.item || player.itemLeft <= 0) return;
  const stats = ITEMS[player.item];
  const fraction = 1 - player.itemLeft / stats.useSeconds;
  const w = 260 * unit;
  const x = (width - w) / 2;
  const y = height * 0.62;
  text(context, `${player.item === 'water' ? 'DRINKING' : 'USING'} ${stats.name}`, width / 2, y - 12 * unit, { size: 14 * unit, weight: 700, align: 'center', spacing: 3 * unit, color: COLOR.text });
  roundedRect(context, x, y, w, 8 * unit, 4 * unit);
  context.fillStyle = 'rgba(6,10,14,0.7)';
  context.fill();
  roundedRect(context, x, y, Math.max(8 * unit, w * fraction), 8 * unit, 4 * unit);
  context.fillStyle = ITEM_COLOR[player.item];
  context.fill();
}

const WEAPON_LABEL: Record<WeaponId, string> = { pistol: 'PISTOL', shotgun: 'SHOTGUN', ak: 'AK', machete: 'MACHETE', bat: 'SPIKED BAT' };

// The wheel, held open: weapons and items in a ring, the segment under the mouse lit.
export function drawWheel(context: CanvasRenderingContext2D, width: number, height: number, unit: number, player: Player, wheel: WheelState): void {
  if (!wheel.open) return;
  const cx = width / 2;
  const cy = height / 2;
  const outer = 190 * unit;
  const inner = 74 * unit;
  const count = WHEEL_SEGMENTS.length;
  const turn = Math.PI * 2;
  const picked = wheelSegment(wheel.x, wheel.y);
  context.save();
  context.fillStyle = 'rgba(4,8,12,0.45)';
  context.fillRect(0, 0, width, height);
  WHEEL_SEGMENTS.forEach((segment, index) => {
    const mid = -Math.PI / 2 + (index / count) * turn;
    const from = mid - turn / count / 2 + 0.012;
    const to = mid + turn / count / 2 - 0.012;
    const available = segment.kind === 'weapon' ? owns(player, segment.id) : player.items[segment.id] > 0;
    context.beginPath();
    context.arc(cx, cy, outer, from, to);
    context.arc(cx, cy, inner, to, from, true);
    context.closePath();
    const lit = index === picked;
    context.fillStyle = lit ? 'rgba(232,184,102,0.34)' : 'rgba(20,30,38,0.82)';
    context.fill();
    context.strokeStyle = lit ? COLOR.accent : COLOR.border;
    context.lineWidth = (lit ? 2.5 : 1.5) * unit;
    context.stroke();
    const radius = (outer + inner) / 2;
    const ix = cx + Math.cos(mid) * radius;
    const iy = cy + Math.sin(mid) * radius;
    context.globalAlpha = available ? 1 : 0.35;
    if (segment.kind === 'item') {
      itemIcon(context, segment.id, ix, iy - 4 * unit, 40 * unit, 1);
      text(context, `x${player.items[segment.id]}`, ix, iy + 26 * unit, { size: 14 * unit, weight: 800, align: 'center', color: COLOR.text });
    } else {
      const inHand = player.weapon === segment.id;
      text(context, WEAPON_LABEL[segment.id], ix, iy + 5 * unit, { size: 13 * unit, weight: 800, align: 'center', spacing: 1 * unit, color: inHand ? COLOR.accent : COLOR.text });
      if (inHand) text(context, 'IN HAND', ix, iy + 22 * unit, { size: 9 * unit, weight: 700, align: 'center', spacing: 2 * unit, color: COLOR.accent });
    }
    context.globalAlpha = 1;
  });
  // The middle names what is chosen, or what the wheel is for.
  const chosen = WHEEL_SEGMENTS[picked];
  const title = chosen ? (chosen.kind === 'weapon' ? WEAPON_LABEL[chosen.id] : ITEMS[chosen.id].name) : 'WEAPONS & ITEMS';
  text(context, title, cx, cy - 2 * unit, { size: 14 * unit, weight: 800, align: 'center', spacing: 2 * unit, color: COLOR.text });
  let detail = 'Move the mouse, release to choose';
  if (chosen?.kind === 'weapon') {
    detail = owns(player, chosen.id) ? (weaponStats(chosen.id).kind === 'firearm' ? 'Firearm' : 'Melee') : 'Not owned';
  } else if (chosen) {
    const stats = ITEMS[chosen.id];
    detail = stats.heal >= 1 ? 'Heals fully' : stats.heal > 0 ? `Heals ${Math.round(stats.heal * 100)}%` : `+${stats.drink} hydration`;
  }
  text(context, detail, cx, cy + 18 * unit, { size: 10 * unit, weight: 600, align: 'center', color: COLOR.dim });
  // The pointer, so it is clear which way the mouse is leaning.
  if (Math.hypot(wheel.x, wheel.y) > 2) {
    const scale = (inner - 10 * unit) / 110;
    context.beginPath();
    context.arc(cx + wheel.x * scale, cy + wheel.y * scale, 5 * unit, 0, turn);
    context.fillStyle = COLOR.accent;
    context.fill();
  }
  context.restore();
}
