import { bindings, keyLabel } from '../client/bindings';
import type { GameState, Player } from '../game/state';
import { COLOR, panel, text } from './ui';

// Uses the actual collision geometry, so the map stays correct when props are rearranged.
export function drawTacticalMap(ctx: CanvasRenderingContext2D, width: number, height: number, state: GameState, player: Player): void {
  const u = Math.min(height / 900, width / 1200);
  const w = 1000 * u, h = 710 * u, x = (width - w) / 2, y = (height - h) / 2;
  ctx.fillStyle = 'rgba(2,8,12,0.72)'; ctx.fillRect(0, 0, width, height);
  panel(ctx, x, y, w, h, COLOR.panelSolid, 12 * u);
  text(ctx, 'OPERATIONS / B1', x + 32 * u, y + 46 * u, { size: 25 * u, weight: 800, spacing: 3 * u });
  text(ctx, 'TACTICAL MAP', x + 32 * u, y + 74 * u, { size: 13 * u, color: COLOR.accent, spacing: 4 * u });
  text(ctx, `${keyLabel(bindings.map)} / CLOSE`, x + w - 32 * u, y + 48 * u, { size: 14 * u, align: 'right', color: COLOR.dim });
  const mapX = x + 30 * u, mapY = y + 100 * u, mapW = 660 * u, mapH = 570 * u;
  const street = player.y > 3;
  const bounds = street ? { x: -27, z: 10, w: 54, d: 39 } : { x: -14, z: -14, w: 28, d: 28 };
  const scale = Math.min(mapW / bounds.w, mapH / bounds.d);
  const ox = mapX + (mapW - bounds.w * scale) / 2, oy = mapY + (mapH - bounds.d * scale) / 2;
  const point = (px: number, pz: number) => [ox + (px - bounds.x) * scale, oy + (pz - bounds.z) * scale];
  ctx.save(); ctx.beginPath(); ctx.rect(mapX, mapY, mapW, mapH); ctx.clip();
  ctx.fillStyle = '#12242c'; ctx.fillRect(mapX, mapY, mapW, mapH);
  ctx.strokeStyle = 'rgba(146,188,197,0.07)'; ctx.lineWidth = 1;
  for (let i = 0; i < bounds.w; i += 2) { const px = ox + i * scale; ctx.beginPath(); ctx.moveTo(px, mapY); ctx.lineTo(px, mapY + mapH); ctx.stroke(); }
  for (let i = 0; i < bounds.d; i += 2) { const pz = oy + i * scale; ctx.beginPath(); ctx.moveTo(mapX, pz); ctx.lineTo(mapX + mapW, pz); ctx.stroke(); }
  for (const box of state.level.boxes) {
    const bottom = box.position.y - box.size.y / 2, top = box.position.y + box.size.y / 2;
    if (bottom > player.y + 1.4 || top < player.y + 0.3 || ['floor', 'slab', 'step'].includes(box.surface ?? '')) continue;
    const [px, py] = point(box.position.x - box.size.x / 2, box.position.z - box.size.z / 2);
    ctx.fillStyle = box.surface === 'gate' || box.surface === 'board' ? '#c9a660' : box.surface === 'wall' || box.surface === 'building' ? '#577179' : '#344c58';
    ctx.fillRect(px, py, box.size.x * scale, box.size.z * scale);
    ctx.strokeStyle = 'rgba(162,195,204,0.28)'; ctx.strokeRect(px, py, box.size.x * scale, box.size.z * scale);
  }
  const marker = (px: number, pz: number, color: string, label: string) => {
    const [mx, my] = point(px, pz); ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(mx, my, 5 * u, 0, Math.PI * 2); ctx.fill();
    if (label) text(ctx, label, mx + 9 * u, my - 9 * u, { size: 11 * u, color, spacing: 1 });
  };
  if (!street) {
    state.level.doors.forEach((door, i) => marker(door.position.x, door.position.z, state.doors[i].boarded ? COLOR.good : COLOR.danger, state.doors[i].boarded ? 'SEALED' : 'ENTRY'));
    state.pickups.filter(p => !p.taken).forEach(p => marker(p.x, p.z, COLOR.accent, 'BOARDS'));
    state.zombies.filter(z => !z.dead).forEach(z => marker(z.x, z.z, COLOR.danger, ''));
  }
  marker(state.level.elevator.position.x, state.level.elevator.position.z, state.waves.phase === 'lift' ? COLOR.good : COLOR.dim, 'ELEVATOR');
  for (const station of state.level.stations) marker(station.position.x, station.position.z, COLOR.accent, station.kind === 'shotgun' ? 'WEAPONS' : 'AMMO');
  marker(state.level.gate.panel.x, state.level.gate.panel.z, COLOR.good, 'GATE');
  const [px, py] = point(player.x, player.z);
  ctx.save(); ctx.translate(px, py); ctx.rotate(-player.yaw);
  ctx.beginPath(); ctx.moveTo(0, -10 * u); ctx.lineTo(7 * u, 7 * u); ctx.lineTo(0, 3 * u); ctx.lineTo(-7 * u, 7 * u); ctx.closePath(); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.restore();
  ctx.restore();
  const sx = x + 725 * u;
  text(ctx, street ? 'STREET LEVEL' : 'THE GARAGE', sx, y + 146 * u, { size: 20 * u, color: COLOR.accent, weight: 800 });
  text(ctx, 'SURVIVE THE NIGHT', sx, y + 179 * u, { size: 12 * u, color: COLOR.dim, spacing: 2 * u });
  ['01 / Enter the garage', '02 / Seal the shutter', '03 / Barricade two doors', '04 / Survive five waves', '05 / Take the elevator up'].forEach((line, i) => text(ctx, line, sx, y + (245 + i * 44) * u, { size: 15 * u, color: i < (state.gate.closed ? 2 : 0) ? COLOR.good : COLOR.text }));
  text(ctx, 'LEGEND', sx, y + 490 * u, { size: 12 * u, color: COLOR.dim, spacing: 3 * u });
  [['YOU', '#ffffff'], ['SUPPLIES', COLOR.accent], ['HOSTILES', COLOR.danger], ['SEALED / GATE', COLOR.good]].forEach(([label, color], i) => {
    ctx.fillStyle = color; ctx.fillRect(sx, y + (515 + i * 27) * u, 6 * u, 6 * u);
    text(ctx, label, sx + 17 * u, y + (522 + i * 27) * u, { size: 12 * u, color: COLOR.dim });
  });
  text(ctx, 'N ↑     Live map · Combat continues while open', x + 32 * u, y + h - 16 * u, { size: 12 * u, color: COLOR.dim });
}
