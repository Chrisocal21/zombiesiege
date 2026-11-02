import { bindings, keyLabel } from '../client/bindings';
import { settings } from '../client/settings';
import { config } from '../config';
import { interactionTarget } from '../game/doors';
import { ladderInReach } from '../game/movement';
import type { GameState, Player } from '../game/state';
import { TOTAL_WAVES } from '../game/waves';
import { aliveZombies } from '../game/zombies';
import type { Level } from '../levels/types';
import type { Menu } from './menu';
import { COLOR, clamp, keycap, measure, panel, roundedRect, text } from './ui';

export interface Hud {
  draw(state: GameState, player: Player, time: number): void;
}

interface Waypoint {
  x: number;
  z: number;
  color: string;
  label: string;
}

interface DamageMark {
  fromX: number;
  fromZ: number;
  born: number;
}

const BANNER_SECONDS = 3.2;
const HIT_MARKER_SECONDS = 0.22;
const KILL_MARKER_SECONDS = 0.4;
const DAMAGE_MARK_SECONDS = 1.4;
// How far the radar sees, in meters.
const RADAR_RANGE = 24;

function clock(seconds: number): string {
  const whole = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

// The HUD is a transparent 2D canvas layered over the 3D view: crosshair, compass, radar, health,
// ammo, prompts and banners, followed by the menu when one is open.
export function createHud(level: Level, menu: Menu): Hud {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none';
  document.body.appendChild(canvas);
  const context = canvas.getContext('2d')!;

  let seenShotTick = -1;
  let hitUntil = 0;
  let hitIsKill = false;
  let lastShotAt = -10;
  let seenHurtTick = -1;
  let hurtAt = -10;
  const marks: DamageMark[] = [];
  // The health bar's trailing ghost, which shows how much was just lost.
  let ghostHealth: number = config.player.maxHealth;
  let lastTime = 0;

  return {
    draw(state, player, time) {
      const dpr = window.devicePixelRatio || 1;
      const width = window.innerWidth;
      const height = window.innerHeight;
      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
      }
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);
      const frame = Math.min(0.1, time - lastTime);
      lastTime = time;

      // Reacting to what just happened in the game.
      if (player.lastShotTick !== seenShotTick) {
        seenShotTick = player.lastShotTick;
        if (seenShotTick >= 0) {
          lastShotAt = time;
          if (player.lastShotZombie) {
            hitUntil = time + (player.lastShotKill ? KILL_MARKER_SECONDS : HIT_MARKER_SECONDS);
            hitIsKill = player.lastShotKill;
          }
        }
      }
      if (player.lastHurtTick !== seenHurtTick) {
        seenHurtTick = player.lastHurtTick;
        if (seenHurtTick >= 0) {
          marks.push({ fromX: player.lastHurtX, fromZ: player.lastHurtZ, born: time });
          hurtAt = time;
        }
      }
      ghostHealth = Math.max(player.health, ghostHealth - 28 * frame);

      if (!menu.onTitle()) drawGame(width, height, state, player, time);
      menu.draw(context, width, height, time);
    },
  };

  function bearingTo(player: Player, x: number, z: number): number {
    return Math.atan2(x - player.x, -(z - player.z));
  }

  function waypoints(state: GameState, player: Player): Waypoint[] {
    const points: Waypoint[] = [];
    const phase = state.waves.phase;
    if (phase === 'entry') {
      const panelPos = level.gate.panel;
      points.push({ x: panelPos.x, z: panelPos.z, color: COLOR.good, label: 'GATE' });
    } else if (phase === 'prep') {
      if (player.bars < config.doors.carryLimit) {
        state.pickups.forEach((pickup) => {
          if (!pickup.taken) points.push({ x: pickup.x, z: pickup.z, color: COLOR.accent, label: 'BOARDS' });
        });
      }
      if (player.bars > 0) {
        level.doors.forEach((door, index) => {
          if (!state.doors[index].boarded) points.push({ x: door.position.x + door.normal.x, z: door.position.z + door.normal.z, color: COLOR.text, label: 'DOOR' });
        });
      }
    }
    return points;
  }

  function drawGame(width: number, height: number, state: GameState, player: Player, time: number): void {
    const unit = height / 1080;
    const margin = 48 * unit;
    const points = waypoints(state, player);

    drawVignette(width, height, player, time);
    drawDamageMarks(width, height, player, time, unit);
    if (!player.aiming && !player.ladder && !player.mantle) drawCrosshair(width, height, player, time, unit);
    if (settings.showCompass) drawCompass(width, unit, player, points);
    drawObjective(margin, unit, state, player, points);
    drawRadar(margin, height, unit, state, player, points);
    drawHealth(margin, height, unit, player, time);
    drawAmmo(width, height, margin, unit, player, time);
    drawPrompt(width, height, unit, state, player);
    drawBanner(width, height, unit, state, time);

    if (state.frozen) {
      const label = 'ZOMBIES FROZEN';
      const w = measure(context, label, 20 * unit, 700, 3 * unit) + 90 * unit;
      panel(context, width - margin - w, margin, w, 46 * unit, 'rgba(60,20,16,0.7)');
      text(context, label, width - margin - w + 22 * unit, margin + 30 * unit, { size: 20 * unit, weight: 700, spacing: 3 * unit, color: COLOR.danger });
      keycap(context, keyLabel(bindings.freeze), width - margin - 14 * unit, margin + 32 * unit, 26 * unit, 'right');
    }
  }

  function drawVignette(width: number, height: number, player: Player, time: number): void {
    const sinceHurt = time - hurtAt;
    const flash = sinceHurt < 0.6 ? 1 - sinceHurt / 0.6 : 0;
    const low = Math.max(0, 1 - player.health / config.player.maxHealth - 0.2);
    const beat = low > 0 ? 0.75 + 0.25 * Math.sin(time * (3 + low * 6)) : 1;
    const alpha = Math.min(0.9, flash * 0.65 + low * 0.55 * beat);
    if (alpha <= 0.01) return;
    const gradient = context.createRadialGradient(width / 2, height / 2, height * 0.32, width / 2, height / 2, height * 0.98);
    gradient.addColorStop(0, 'rgba(140,0,0,0)');
    gradient.addColorStop(1, `rgba(140,0,0,${alpha})`);
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
  }

  // Red arcs around the crosshair, pointing at whatever hit you.
  function drawDamageMarks(width: number, height: number, player: Player, time: number, unit: number): void {
    for (let i = marks.length - 1; i >= 0; i--) {
      const age = time - marks[i].born;
      if (age > DAMAGE_MARK_SECONDS) {
        marks.splice(i, 1);
        continue;
      }
      const heading = -player.yaw;
      const relative = bearingTo(player, marks[i].fromX, marks[i].fromZ) - heading;
      const angle = relative - Math.PI / 2;
      const radius = 200 * unit;
      context.save();
      context.globalAlpha = 1 - age / DAMAGE_MARK_SECONDS;
      context.lineCap = 'round';
      context.lineWidth = 16 * unit;
      context.strokeStyle = COLOR.danger;
      context.shadowColor = 'rgba(229,72,60,0.8)';
      context.shadowBlur = 18 * unit;
      context.beginPath();
      context.arc(width / 2, height / 2, radius, angle - 0.3, angle + 0.3);
      context.stroke();
      context.restore();
    }
  }

  function drawCrosshair(width: number, height: number, player: Player, time: number, unit: number): void {
    const cx = width / 2;
    const cy = height / 2;
    const speed = Math.hypot(player.vx, player.vz);
    // The gap opens when moving and kicks open on every shot.
    const kick = Math.max(0, 1 - (time - lastShotAt) / 0.16);
    const gap = (7 + speed * 0.9 + kick * 9 + (player.onGround ? 0 : 6)) * unit;
    const length = 11 * unit;
    context.save();
    context.lineCap = 'butt';
    for (const pass of [0, 1]) {
      context.strokeStyle = pass === 0 ? 'rgba(0,0,0,0.55)' : 'rgba(245,247,250,0.95)';
      context.lineWidth = (pass === 0 ? 4.5 : 2.2) * unit;
      context.beginPath();
      context.moveTo(cx - gap - length, cy);
      context.lineTo(cx - gap, cy);
      context.moveTo(cx + gap, cy);
      context.lineTo(cx + gap + length, cy);
      context.moveTo(cx, cy + gap);
      context.lineTo(cx, cy + gap + length);
      context.moveTo(cx, cy - gap);
      context.lineTo(cx, cy - gap - length * 0.55);
      context.stroke();
    }
    context.restore();

    if (settings.showHitMarkers && time < hitUntil) {
      const total = hitIsKill ? KILL_MARKER_SECONDS : HIT_MARKER_SECONDS;
      const t = (hitUntil - time) / total;
      const inner = (hitIsKill ? 13 : 11) * unit + (1 - t) * 4 * unit;
      const outer = inner + (hitIsKill ? 14 : 10) * unit;
      context.save();
      context.globalAlpha = Math.min(1, t * 1.6);
      context.lineCap = 'round';
      for (const pass of [0, 1]) {
        context.strokeStyle = pass === 0 ? 'rgba(0,0,0,0.55)' : hitIsKill ? COLOR.danger : '#ffffff';
        context.lineWidth = (pass === 0 ? 6 : 3.2) * unit;
        context.beginPath();
        for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
          context.moveTo(cx + (sx * inner) / Math.SQRT2, cy + (sy * inner) / Math.SQRT2);
          context.lineTo(cx + (sx * outer) / Math.SQRT2, cy + (sy * outer) / Math.SQRT2);
        }
        context.stroke();
      }
      context.restore();
    }
  }

  function drawCompass(width: number, unit: number, player: Player, points: Waypoint[]): void {
    const span = 120;
    const stripWidth = Math.min(780 * unit, width * 0.5);
    const centerX = width / 2;
    const top = 30 * unit;
    const pixelsPerDegree = stripWidth / span;
    const heading = ((-player.yaw * 180) / Math.PI) % 360;
    const normalise = (degrees: number) => ((((degrees + 180) % 360) + 360) % 360) - 180;

    context.save();
    context.beginPath();
    context.rect(centerX - stripWidth / 2, top - 6 * unit, stripWidth, 70 * unit);
    context.clip();
    const fade = context.createLinearGradient(centerX - stripWidth / 2, 0, centerX + stripWidth / 2, 0);
    fade.addColorStop(0, 'rgba(0,0,0,0)');
    fade.addColorStop(0.5, 'rgba(0,0,0,0.38)');
    fade.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = fade;
    context.fillRect(centerX - stripWidth / 2, top - 6 * unit, stripWidth, 52 * unit);

    const names: Record<number, string> = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW' };
    const start = Math.floor((heading - span / 2) / 5) * 5;
    for (let degrees = start; degrees <= heading + span / 2; degrees += 5) {
      const x = centerX + (degrees - heading) * pixelsPerDegree;
      const mod = ((degrees % 360) + 360) % 360;
      const major = mod % 15 === 0;
      const edge = 1 - Math.min(1, Math.abs(x - centerX) / (stripWidth / 2));
      context.globalAlpha = 0.25 + 0.75 * edge;
      context.fillStyle = COLOR.text;
      context.fillRect(x - 0.75 * unit, top + (major ? 8 : 14) * unit, 1.5 * unit, (major ? 14 : 8) * unit);
      if (names[mod]) {
        text(context, names[mod], x, top + 44 * unit, {
          size: (mod % 90 === 0 ? 22 : 15) * unit,
          align: 'center',
          weight: 700,
          color: mod === 0 ? COLOR.accent : COLOR.text,
          shadow: false,
        });
      }
    }
    context.globalAlpha = 1;

    for (const point of points) {
      const bearing = (bearingTo(player, point.x, point.z) * 180) / Math.PI;
      const delta = normalise(bearing - heading);
      const x = centerX + clamp(delta, -span / 2 + 2, span / 2 - 2) * pixelsPerDegree;
      context.globalAlpha = Math.abs(delta) > span / 2 ? 0.45 : 1;
      context.fillStyle = point.color;
      context.beginPath();
      context.moveTo(x, top + 24 * unit);
      context.lineTo(x + 7 * unit, top + 31 * unit);
      context.lineTo(x, top + 38 * unit);
      context.lineTo(x - 7 * unit, top + 31 * unit);
      context.closePath();
      context.fill();
    }
    context.restore();

    // The needle and the exact heading.
    context.fillStyle = COLOR.accent;
    context.beginPath();
    context.moveTo(centerX, top + 3 * unit);
    context.lineTo(centerX - 6 * unit, top - 5 * unit);
    context.lineTo(centerX + 6 * unit, top - 5 * unit);
    context.closePath();
    context.fill();
    text(context, String(Math.round(((heading % 360) + 360) % 360)).padStart(3, '0'), centerX, top + 66 * unit, { size: 16 * unit, align: 'center', color: COLOR.dim, spacing: 2 * unit });
  }

  function drawObjective(margin: number, unit: number, state: GameState, player: Player, points: Waypoint[]): void {
    const waves = state.waves;
    let title = '';
    let detail = '';
    let timer: number | null = null;
    switch (waves.phase) {
      case 'entry':
        title = 'Get inside and close the gate';
        {
          const target = points[0];
          const distance = target ? Math.hypot(target.x - player.x, target.z - player.z) : 0;
          detail = distance > 0 ? `${Math.round(distance)} m to the gate control` : 'Run for the ramp';
        }
        break;
      case 'prep':
        title = 'Barricade two doors';
        detail = `Boards found ${state.pickups.filter((pickup) => pickup.taken).length} of ${state.pickups.length}   Doors sealed ${state.doors.filter((door) => door.boarded).length}`;
        timer = waves.timer;
        break;
      case 'break':
        title = `Wave ${waves.number} incoming`;
        detail = 'Reload and reposition';
        timer = waves.timer;
        break;
      case 'active':
        title = `Wave ${waves.number} of ${TOTAL_WAVES}`;
        detail = `${waves.toSpawn + aliveZombies(state)} zombies left`;
        break;
      case 'cleared':
        title = 'Level cleared';
        detail = 'The stairwell is open';
        break;
    }

    const x = margin;
    const y = margin;
    const w = 430 * unit;
    const h = 118 * unit;
    panel(context, x, y, w, h);
    context.fillStyle = COLOR.accent;
    context.fillRect(x, y + 10 * unit, 4 * unit, h - 20 * unit);
    text(context, 'OBJECTIVE', x + 26 * unit, y + 32 * unit, { size: 15 * unit, color: COLOR.accent, spacing: 5 * unit, weight: 700 });
    text(context, title, x + 26 * unit, y + 66 * unit, { size: 27 * unit, weight: 700 });
    text(context, detail, x + 26 * unit, y + 95 * unit, { size: 18 * unit, color: COLOR.dim });
    if (timer !== null) {
      const urgent = timer < 10 && waves.phase === 'prep';
      text(context, clock(timer), x + w - 22 * unit, y + 78 * unit, {
        size: 46 * unit,
        weight: 800,
        align: 'right',
        color: urgent ? COLOR.danger : COLOR.text,
        spacing: 1 * unit,
      });
    }
  }

  function drawRadar(margin: number, height: number, unit: number, state: GameState, player: Player, points: Waypoint[]): void {
    if (!settings.showRadar) return;
    const radius = 112 * unit;
    const cx = margin + radius;
    const cy = height - margin - 74 * unit - radius;
    const scale = radius / RADAR_RANGE;

    context.save();
    context.beginPath();
    context.arc(cx, cy, radius, 0, Math.PI * 2);
    context.fillStyle = 'rgba(8,10,14,0.66)';
    context.fill();
    context.clip();

    // The map turns so the way you face is always up.
    context.save();
    context.translate(cx, cy);
    context.rotate(player.yaw);
    context.scale(scale, scale);
    context.translate(-player.x, -player.z);
    for (const box of state.level.boxes) {
      const surface = box.surface;
      if (surface === 'floor' || surface === 'slab' || surface === 'step') continue;
      const bottom = box.position.y - box.size.y / 2;
      const top = box.position.y + box.size.y / 2;
      if (bottom > player.y + 1.3 || top < player.y + 0.35) continue;
      const solid = surface === 'wall' || surface === 'building' || surface === 'pillar';
      const blocked = surface === 'board' || surface === 'gate';
      context.fillStyle = blocked ? 'rgba(245,165,36,0.85)' : solid ? 'rgba(190,198,212,0.42)' : 'rgba(150,160,176,0.3)';
      context.fillRect(box.position.x - box.size.x / 2, box.position.z - box.size.z / 2, box.size.x, box.size.z);
    }
    context.restore();

    // Zombies, and the things to go to.
    const place = (x: number, z: number): [number, number] => {
      const dx = x - player.x;
      const dz = z - player.z;
      return [cx + (dx * Math.cos(player.yaw) - dz * Math.sin(player.yaw)) * scale, cy + (dx * Math.sin(player.yaw) + dz * Math.cos(player.yaw)) * scale];
    };
    for (const point of points) {
      let [x, y] = place(point.x, point.z);
      // Out of range, the marker waits at the edge.
      const distance = Math.hypot(x - cx, y - cy);
      const limit = radius - 9 * unit;
      if (distance > limit) {
        x = cx + ((x - cx) / distance) * limit;
        y = cy + ((y - cy) / distance) * limit;
      }
      context.fillStyle = point.color;
      context.beginPath();
      context.moveTo(x, y - 7 * unit);
      context.lineTo(x + 6 * unit, y);
      context.lineTo(x, y + 7 * unit);
      context.lineTo(x - 6 * unit, y);
      context.closePath();
      context.fill();
    }
    for (const zombie of state.zombies) {
      if (zombie.dead) continue;
      const [x, y] = place(zombie.x, zombie.z);
      if (Math.hypot(x - cx, y - cy) > radius - 4 * unit) continue;
      context.fillStyle = COLOR.danger;
      context.shadowColor = 'rgba(229,72,60,0.9)';
      context.shadowBlur = 8 * unit;
      context.beginPath();
      context.arc(x, y, 4.2 * unit, 0, Math.PI * 2);
      context.fill();
    }
    context.shadowBlur = 0;

    // You, in the middle, with a faint cone for where you are looking.
    const cone = context.createRadialGradient(cx, cy, 0, cx, cy, radius * 0.8);
    cone.addColorStop(0, 'rgba(255,255,255,0.2)');
    cone.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = cone;
    context.beginPath();
    context.moveTo(cx, cy);
    context.arc(cx, cy, radius * 0.8, -Math.PI / 2 - 0.62, -Math.PI / 2 + 0.62);
    context.closePath();
    context.fill();
    context.fillStyle = '#ffffff';
    context.beginPath();
    context.moveTo(cx, cy - 8 * unit);
    context.lineTo(cx + 6 * unit, cy + 6 * unit);
    context.lineTo(cx, cy + 3 * unit);
    context.lineTo(cx - 6 * unit, cy + 6 * unit);
    context.closePath();
    context.fill();
    context.restore();

    // The ring, with north marked on it.
    context.beginPath();
    context.arc(cx, cy, radius, 0, Math.PI * 2);
    context.strokeStyle = 'rgba(255,255,255,0.34)';
    context.lineWidth = 2 * unit;
    context.stroke();
    const northX = cx + Math.sin(player.yaw) * (radius - 14 * unit);
    const northY = cy - Math.cos(player.yaw) * (radius - 14 * unit);
    text(context, 'N', northX, northY + 6 * unit, { size: 17 * unit, weight: 800, align: 'center', color: COLOR.accent, shadow: false });
  }

  function drawHealth(margin: number, height: number, unit: number, player: Player, time: number): void {
    const radius = 112 * unit;
    const x = margin;
    const w = radius * 2;
    const y = height - margin - 36 * unit;
    const h = 16 * unit;
    const fraction = clamp(player.health / config.player.maxHealth, 0, 1);
    const ghost = clamp(ghostHealth / config.player.maxHealth, 0, 1);

    text(context, 'HEALTH', x, y - 12 * unit, { size: 15 * unit, color: COLOR.dim, spacing: 4 * unit, weight: 700 });
    text(context, String(Math.ceil(player.health)), x + w, y - 8 * unit, { size: 30 * unit, weight: 800, align: 'right', color: fraction < 0.3 ? COLOR.danger : COLOR.text });
    roundedRect(context, x, y, w, h, 3 * unit);
    context.fillStyle = 'rgba(0,0,0,0.6)';
    context.fill();
    context.save();
    roundedRect(context, x, y, w, h, 3 * unit);
    context.clip();
    context.fillStyle = 'rgba(255,255,255,0.7)';
    context.fillRect(x, y, w * ghost, h);
    const pulse = fraction < 0.3 ? 0.75 + 0.25 * Math.sin(time * 9) : 1;
    const gradient = context.createLinearGradient(x, 0, x + w, 0);
    gradient.addColorStop(0, fraction < 0.3 ? COLOR.danger : '#3fae6d');
    gradient.addColorStop(1, fraction < 0.3 ? '#ff7a63' : COLOR.good);
    context.globalAlpha = pulse;
    context.fillStyle = gradient;
    context.fillRect(x, y, w * fraction, h);
    context.globalAlpha = 1;
    // Segment marks, like a gauge.
    context.fillStyle = 'rgba(0,0,0,0.55)';
    for (let i = 1; i < 10; i++) context.fillRect(x + (w * i) / 10 - 1 * unit, y, 2 * unit, h);
    context.restore();
  }

  function drawAmmo(width: number, height: number, margin: number, unit: number, player: Player, time: number): void {
    const magazine = config.pistol.magazineSize;
    const right = width - margin;
    const baseY = height - margin - 40 * unit;
    const reloading = player.reloadLeft > 0;
    const low = player.ammo <= Math.ceil(magazine / 3);

    text(context, 'PISTOL', right, baseY - 100 * unit, { size: 17 * unit, color: COLOR.dim, align: 'right', spacing: 6 * unit, weight: 700 });
    if (reloading) {
      text(context, 'RELOADING', right, baseY - 10 * unit, { size: 44 * unit, weight: 800, align: 'right', color: COLOR.accent, spacing: 4 * unit });
      const w = 260 * unit;
      const progress = 1 - player.reloadLeft / config.pistol.reloadSeconds;
      roundedRect(context, right - w, baseY + 8 * unit, w, 6 * unit, 3 * unit);
      context.fillStyle = 'rgba(255,255,255,0.16)';
      context.fill();
      roundedRect(context, right - w, baseY + 8 * unit, w * progress, 6 * unit, 3 * unit);
      context.fillStyle = COLOR.accent;
      context.fill();
    } else {
      const blink = player.ammo === 0 ? 0.55 + 0.45 * Math.sin(time * 10) : 1;
      context.save();
      context.globalAlpha = blink;
      const infinity = measure(context, '/ ∞', 30 * unit, 700, 1 * unit);
      text(context, '/ ∞', right, baseY - 12 * unit, { size: 30 * unit, color: COLOR.dim, align: 'right', weight: 700, spacing: 1 * unit });
      text(context, String(player.ammo), right - infinity - 14 * unit, baseY - 6 * unit, { size: 96 * unit, weight: 800, align: 'right', color: low ? COLOR.danger : COLOR.text });
      context.restore();

      // One small mark per round in the magazine.
      const pip = 9 * unit;
      const gap = 5 * unit;
      for (let i = 0; i < magazine; i++) {
        const x = right - (magazine - i) * (pip + gap) + gap;
        roundedRect(context, x, baseY + 6 * unit, pip, 20 * unit, 2 * unit);
        context.fillStyle = i < player.ammo ? (low ? COLOR.danger : 'rgba(245,247,250,0.92)') : 'rgba(255,255,255,0.16)';
        context.fill();
      }
    }

    // What the body is doing, if it is not just standing.
    let stance = '';
    if (player.mantle) stance = 'CLIMBING';
    else if (player.ladder) stance = 'ON LADDER';
    else if (player.cover) stance = 'IN COVER';
    else if (player.crouch > 0.5) stance = 'CROUCHING';
    if (stance) text(context, stance, right, baseY - 130 * unit, { size: 16 * unit, color: COLOR.accent, align: 'right', spacing: 5 * unit, weight: 700 });
  }

  // A line of keycaps and a verb, low in the middle of the screen.
  function drawPrompt(width: number, height: number, unit: number, state: GameState, player: Player): void {
    let prompt: { keys: string[]; label: string } | null = null;
    const interaction = interactionTarget(state, player);
    if (interaction?.kind === 'gate') prompt = { keys: [bindings.use], label: 'Close the gate' };
    else if (interaction?.kind === 'pickup') prompt = { keys: [bindings.use], label: 'Pick up the boards' };
    else if (interaction?.kind === 'door') prompt = { keys: [bindings.use], label: 'Board up this door' };
    else if (player.ladder) prompt = { keys: [bindings.forward, bindings.back], label: 'Climb' };
    else if (ladderInReach(player, state.level)) prompt = { keys: [bindings.forward], label: 'Climb the ladder' };
    else if (player.cover) prompt = { keys: [bindings.leanLeft, bindings.leanRight], label: 'Peek, aim to stand up' };
    if (!prompt) return;

    const size = 34 * unit;
    const labelSize = 25 * unit;
    const labelWidth = measure(context, prompt.label, labelSize, 600, 1 * unit);
    const keyWidths = prompt.keys.map((key) => Math.max(size, measure(context, keyLabel(key), size * 0.62, 700, 0.5) + size * 0.7) + 6 * unit);
    const total = keyWidths.reduce((sum, value) => sum + value, 0) + labelWidth + 34 * unit;
    const x = (width - total) / 2;
    const y = height * 0.76;
    panel(context, x, y - 28 * unit, total, 54 * unit, 'rgba(9,11,15,0.7)', 27 * unit);
    let cursor = x + 18 * unit;
    prompt.keys.forEach((key, index) => {
      keycap(context, keyLabel(key), cursor, y + 8 * unit, size);
      cursor += keyWidths[index];
    });
    text(context, prompt.label, cursor + 6 * unit, y + 8 * unit, { size: labelSize, spacing: 1 * unit });
  }

  function drawBanner(width: number, height: number, unit: number, state: GameState, time: number): void {
    const waves = state.waves;
    const seconds = (tick: number) => (state.tick - tick) / config.ticksPerSecond;
    let title = '';
    let detail = '';
    let color: string = COLOR.text;
    let age = 0;

    if (waves.phase === 'cleared') {
      title = 'LEVEL CLEARED';
      detail = 'Back to the street for another run';
      color = COLOR.accent;
      age = 0.5;
    } else if (waves.diedTick >= 0 && seconds(waves.diedTick) < BANNER_SECONDS) {
      title = 'YOU WERE OVERRUN';
      detail = `Restarting wave ${waves.number}`;
      color = COLOR.danger;
      age = seconds(waves.diedTick);
    } else if (state.gate.closed && seconds(state.gate.closedTick) < BANNER_SECONDS) {
      title = 'GATE SEALED';
      detail = 'Choose which doors to block. The rest let them in';
      color = COLOR.good;
      age = seconds(state.gate.closedTick);
    } else if (waves.startedTick >= 0 && seconds(waves.startedTick) < BANNER_SECONDS) {
      title = `WAVE ${waves.number}`;
      detail = `${config.waves.zombiesPerWave[waves.number - 1]} zombies incoming`;
      age = seconds(waves.startedTick);
    } else if (state.tick < 4.5 * config.ticksPerSecond && waves.phase === 'entry') {
      title = 'LEVEL 0';
      detail = 'The garage. Get off the street';
      color = COLOR.accent;
      age = state.tick / config.ticksPerSecond;
    }
    if (!title) return;

    const fade = Math.min(1, age * 3, (BANNER_SECONDS - age) * 1.6);
    const y = height * 0.3;
    context.save();
    context.globalAlpha = clamp(fade, 0, 1);
    const size = 92 * unit;
    const spacing = 16 * unit;
    const titleWidth = measure(context, title, size, 800, spacing);
    text(context, title, width / 2 + spacing / 2, y, { size, weight: 800, align: 'center', spacing, color });
    // Rules either side of the title.
    context.fillStyle = color;
    context.globalAlpha *= 0.7;
    const ruleLength = Math.min(width * 0.2, 360 * unit);
    context.fillRect(width / 2 - titleWidth / 2 - 40 * unit - ruleLength, y - size * 0.32, ruleLength, 2 * unit);
    context.fillRect(width / 2 + titleWidth / 2 + 40 * unit, y - size * 0.32, ruleLength, 2 * unit);
    context.restore();
    context.save();
    context.globalAlpha = clamp(fade, 0, 1);
    text(context, detail, width / 2, y + 44 * unit, { size: 26 * unit, align: 'center', color: COLOR.dim, spacing: 3 * unit });
    context.restore();
    void time;
  }
}
