import { bindings, keyLabel } from '../client/bindings';
import { WHEEL_SEGMENTS, wheelSegment, type WheelState } from '../client/wheel';
import { ITEMS, regenFactor, type ItemId } from '../game/items';
import type { Player } from '../game/state';
import { owns, weaponStats, type WeaponId } from '../game/weapons';
import { COLOR, roundedRect, text } from './ui';

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

// A small drawing of each gun, side on, muzzle to the left.
function gunIcon(context: CanvasRenderingContext2D, weapon: WeaponId, cx: number, cy: number, size: number): void {
  const u = size / 100;
  const poly = (points: [number, number][]) => {
    context.beginPath();
    points.forEach(([x, y], i) => (i ? context.lineTo(cx + x * u, cy + y * u) : context.moveTo(cx + x * u, cy + y * u)));
    context.closePath();
    context.fill();
  };
  if (weapon === 'pistol') {
    poly([[-30, -12], [28, -12], [28, 0], [10, 0], [14, 34], [0, 34], [-6, 0], [-30, 0]]);
  } else if (weapon === 'shotgun') {
    poly([[-48, -8], [10, -8], [14, -14], [24, -14], [28, -2], [46, 14], [40, 20], [20, 8], [10, 6], [-48, 6]]);
    context.fillStyle = '#8a5a30';
    poly([[-20, 6], [-4, 6], [-4, 14], [-20, 14]]);
    poly([[24, -2], [46, 14], [40, 20], [20, 8]]);
  } else {
    poly([[-50, -8], [-10, -8], [-6, -14], [14, -14], [16, -4], [50, -4], [48, 8], [14, 8], [10, 30], [-2, 22], [0, 10], [-12, 10], [-50, 4]]);
    context.fillStyle = '#8a5a30';
    poly([[14, -4], [50, -4], [48, 8], [14, 8]]);
  }
}

// A cage panel: a frame with a grid of bars.
function cageIcon(context: CanvasRenderingContext2D, cx: number, cy: number, size: number, alpha: number): void {
  context.save();
  context.globalAlpha = alpha;
  context.strokeStyle = '#9aa3ad';
  context.lineWidth = Math.max(1, size * 0.05);
  const half = size * 0.42;
  context.strokeRect(cx - half, cy - half, half * 2, half * 2);
  context.lineWidth = Math.max(1, size * 0.025);
  for (let i = -1; i <= 1; i++) {
    context.beginPath();
    context.moveTo(cx + i * half * 0.55, cy - half); context.lineTo(cx + i * half * 0.55, cy + half);
    context.moveTo(cx - half, cy + i * half * 0.55); context.lineTo(cx + half, cy + i * half * 0.55);
    context.stroke();
  }
  context.restore();
}

// The hotbar low in the middle: the guns, the cage panels being carried, and the bandages, first
// aid kits and water, each in its own numbered slot. The gun in hand is lit.
export function drawHotbar(context: CanvasRenderingContext2D, width: number, base: number, unit: number, player: Player): void {
  const slot = 54 * unit;
  const gap = 6 * unit;
  type Slot = { key: string; weapon?: WeaponId; item?: ItemId; cage?: boolean };
  const slots: Slot[] = [
    { key: keyLabel(bindings.weapon1), weapon: 'pistol' },
    { key: keyLabel(bindings.weapon2), weapon: 'shotgun' },
    { key: keyLabel(bindings.weapon3), weapon: 'ak' },
    { key: '4', cage: true },
    { key: keyLabel(bindings.bandage), item: 'bandage' },
    { key: keyLabel(bindings.medkit), item: 'medkit' },
    { key: keyLabel(bindings.water), item: 'water' },
  ];
  const total = slots.length * slot + (slots.length - 1) * gap;
  const x0 = (width - total) / 2;
  slots.forEach((entry, index) => {
    const sx = x0 + index * (slot + gap);
    const sy = base - slot;
    const weapon = entry.weapon;
    const owned = weapon ? owns(player, weapon) : entry.item ? player.items[entry.item] > 0 : player.bars > 0;
    const active = weapon ? player.weapon === weapon : entry.item ? player.item === entry.item && player.itemLeft > 0 : false;
    roundedRect(context, sx, sy, slot, slot, 5 * unit);
    context.fillStyle = active ? 'rgba(232,184,102,0.3)' : 'rgba(6,10,14,0.62)';
    context.fill();
    context.strokeStyle = active ? COLOR.accent : COLOR.border;
    context.lineWidth = (active ? 2 : 1.5) * unit;
    context.stroke();
    const cx = sx + slot / 2;
    const cy = sy + slot / 2 + 2 * unit;
    if (weapon) {
      context.save();
      context.globalAlpha = owned ? 1 : 0.22;
      context.fillStyle = active ? '#f4f1ea' : '#c8ced6';
      gunIcon(context, weapon, cx, cy, slot * 0.8);
      context.restore();
      if (owned && player.weapon === weapon) {
        text(context, `${player.ammo}`, sx + slot - 5 * unit, sy + slot - 6 * unit, { size: 12 * unit, weight: 800, align: 'right', color: player.ammo === 0 ? COLOR.danger : COLOR.text });
      }
    } else if (entry.item) {
      itemIcon(context, entry.item, cx, cy, slot * 0.58, owned ? 1 : 0.28);
      text(context, `${player.items[entry.item]}`, sx + slot - 5 * unit, sy + slot - 6 * unit, { size: 13 * unit, weight: 800, align: 'right', color: owned ? COLOR.text : COLOR.faint });
    } else {
      cageIcon(context, cx, cy, slot * 0.62, owned ? 1 : 0.28);
      text(context, `${player.bars}`, sx + slot - 5 * unit, sy + slot - 6 * unit, { size: 13 * unit, weight: 800, align: 'right', color: owned ? COLOR.text : COLOR.faint });
    }
    text(context, entry.key, sx + 6 * unit, sy + 14 * unit, { size: 11 * unit, weight: 800, color: active ? COLOR.accent : COLOR.dim });
  });
  const regen = Math.round(regenFactor(player) * 100);
  text(context, `REGEN ${regen}%`, x0, base - slot - 7 * unit, { size: 11 * unit, weight: 700, spacing: 2 * unit, color: player.hydration < 25 ? COLOR.danger : COLOR.dim });
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
