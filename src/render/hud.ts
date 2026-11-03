import { drawTacticalMap } from './tacticalMap';
import { bindings, keyLabel } from '../client/bindings';
import { settings } from '../client/settings';
import { config } from '../config';
import { interactionTarget, lockOffer, stationOffer } from '../game/doors';
import { weaponStats } from '../game/weapons';
import { ladderInReach } from '../game/movement';
import type { GameState, Player } from '../game/state';
import { floorTitle, stopAt, wavesOnFloor } from '../game/tower';
import { isTopFloor, zombiesInWave } from '../game/waves';

import { aliveZombies } from '../game/zombies';
import type { Menu } from './menu';
import { COLOR, clamp, keycap, measure, panel, roundedRect, text } from './ui';

const floorName = floorTitle;

export interface Hud {
  toggleMap(): void;
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
export function createHud(menu: Menu): Hud {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none';
  document.body.appendChild(canvas);
  const context = canvas.getContext('2d')!;

  let mapOpen = false;
  let previousTick = 0;
  let killAt = -10;
  let killWasHead = false;
  // The score last drawn, and the gain just made, shown as a short-lived +N under the crosshair.
  let shownPoints = 0;
  let gainAmount = 0;
  let gainAt = -10;
  window.addEventListener('keydown', event => {
    if (event.code === bindings.map && !event.repeat && !menu.isOpen() && document.pointerLockElement) { event.preventDefault(); mapOpen = !mapOpen; }
  });
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
    toggleMap() { mapOpen = !mapOpen; },
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

      if (state.tick < previousTick) { marks.length = 0; ghostHealth = player.health; hitUntil = 0; killAt = -10; gainAt = -10; shownPoints = state.points[player.id] ?? 0; }
      previousTick = state.tick;
      if (menu.isOpen()) mapOpen = false;
      // Reacting to what just happened in the game.
      if (player.lastShotTick !== seenShotTick) {
        seenShotTick = player.lastShotTick;
        if (seenShotTick >= 0) {
          lastShotAt = time;
          if (player.lastShotZombie) {
            hitUntil = time + (player.lastShotKill ? KILL_MARKER_SECONDS : HIT_MARKER_SECONDS);
            hitIsKill = player.lastShotKill;
            if (hitIsKill) { killAt = time; killWasHead = player.lastShotHead; }
          }
        }
      }
      const points = state.points[player.id] ?? 0;
      if (points > shownPoints) {
        // Gains within a moment of each other add up, so rapid hits read as one number.
        gainAmount = time - gainAt < 0.9 ? gainAmount + points - shownPoints : points - shownPoints;
        gainAt = time;
      }
      shownPoints = points;
      if (player.lastHurtTick !== seenHurtTick) {
        seenHurtTick = player.lastHurtTick;
        if (seenHurtTick >= 0) {
          marks.push({ fromX: player.lastHurtX, fromZ: player.lastHurtZ, born: time });
          hurtAt = time;
        }
      }
      ghostHealth = Math.max(player.health, ghostHealth - 28 * frame);

      if (!menu.onTitle()) drawGame(width, height, state, player, time);
      if (mapOpen && !menu.isOpen()) drawTacticalMap(context, width, height, state, player);
      menu.draw(context, width, height, time);
    },
  };

  function bearingTo(player: Player, x: number, z: number): number {
    return Math.atan2(x - player.x, -(z - player.z));
  }

  function waypoints(state: GameState, player: Player): Waypoint[] {
    const points: Waypoint[] = [];
    const phase = state.waves.phase;
    const level = state.level;
    if (phase === 'entry' && level.gate) {
      const panelPos = level.gate.panel;
      points.push({ x: panelPos.x, z: panelPos.z, color: COLOR.good, label: 'GATE' });
    } else if (phase === 'lift') {
      const lift = level.elevator;
      points.push({ x: lift.position.x, z: lift.position.z, color: COLOR.good, label: 'ELEVATOR' });
    } else if (phase === 'search') {
      const item = level.objective;
      if (item) points.push({ x: item.position.x, z: item.position.z, color: COLOR.good, label: 'KEYCARD' });
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
    const unit = Math.min(height / 1080, width / 1500);
    const margin = 48 * unit;
    const points = waypoints(state, player);

    drawVignette(width, height, player, time);
    drawDamageMarks(width, height, player, time, unit);
    if (!player.aiming && !player.ladder && !player.mantle) drawCrosshair(width, height, player, time, unit);
    drawHitMarker(width, height, unit, time);
    if (settings.showCompass) drawCompass(width, unit, player, points);
    drawObjective(margin, unit, state, player, points);
    drawRadar(margin, height, unit, state, player, points);
    drawHealth(margin, height, unit, state.lives, player, time);
    drawAmmo(width, height, margin, unit, player, time);
    drawStatus(width, height, margin, unit, state, player, time);
    if (settings.cameraStyle === 'bodycam') {
      const elapsed = Math.floor(state.tick / config.ticksPerSecond);
      const timestamp = `${String(Math.floor(elapsed / 3600)).padStart(2, '0')}:${String(Math.floor(elapsed / 60) % 60).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;
      const rx = width - margin - 248 * unit;
      context.fillStyle = Math.floor(time * 2) % 2 ? COLOR.danger : '#7c3330';
      context.beginPath(); context.arc(rx + 6 * unit, margin + 196 * unit, 4 * unit, 0, Math.PI * 2); context.fill();
      text(context, `REC / BODY 01   ${timestamp}`, rx + 18 * unit, margin + 201 * unit, { size: 13 * unit, color: COLOR.dim, spacing: 1 * unit });
    }
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
    const flash = settings.reducedFlashing ? 0 : sinceHurt < 0.6 ? 1 - sinceHurt / 0.6 : 0;
    const low = Math.max(0, 1 - player.health / config.player.maxHealth - 0.2);
    const beat = low > 0 && !settings.reducedFlashing ? 0.75 + 0.25 * Math.sin(time * (3 + low * 6)) : 1;
    const alpha = settings.reducedFlashing ? low * 0.2 : Math.min(0.9, flash * 0.65 + low * 0.55 * beat);
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

  }

  function drawHitMarker(width: number, height: number, unit: number, time: number): void {
    const cx = width / 2, cy = height / 2;
    if (settings.showHitMarkers && time < hitUntil) {
      const total = hitIsKill ? KILL_MARKER_SECONDS : HIT_MARKER_SECONDS;
      const t = (hitUntil - time) / total;
      const inner = (hitIsKill ? 13 : 11) * unit + (1 - t) * 4 * unit;
      const outer = inner + (hitIsKill ? 14 : 10) * unit;
      context.save();
      context.globalAlpha = Math.min(settings.reducedFlashing ? 0.65 : 1, t * 1.6);
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
        title = state.floor > 0 ? `${floorName(state.floor)}: barricade two doors` : 'Barricade two doors';
        detail = `Boards found ${state.pickups.filter((pickup) => pickup.taken).length} of ${state.pickups.length}   Doors sealed ${state.doors.filter((door) => door.boarded).length}`;
        timer = waves.timer;
        break;
      case 'break':
        title = `Wave ${waves.number} incoming`;
        detail = 'Reload and reposition';
        timer = waves.timer;
        break;
      case 'active':
        title = `Wave ${waves.number} of ${wavesOnFloor(state.floor)}`;
        detail = `${waves.toSpawn + aliveZombies(state)} zombies left`;
        break;
      case 'cleared':
        title = `${floorName(state.floor)} cleared`;
        detail = `All ${wavesOnFloor(state.floor)} waves survived`;
        break;
      case 'search': {
        const item = state.level.objective;
        title = `Find the ${item ? item.label.toLowerCase() : 'way on'}`;
        const shut = state.locks.filter((lock) => !lock.open).length;
        detail = shut > 0 ? 'Locked doors open for points' : 'Check the offices';
        break;
      }
      case 'won':
        title = 'Extraction';
        detail = 'You made it out';
        break;
      case 'lift': {
        title = 'Get in the elevator';
        const lift = state.level.elevator;
        const distance = Math.hypot(lift.position.x - player.x, lift.position.z - player.z);
        detail = distance > 3 ? `${Math.round(distance)} m to the elevator` : 'Everyone inside to go up';
        break;
      }
      case 'ride':
        title = `Going up to ${floorName(state.floor + 1).toLowerCase()}`;
        detail = 'Hold on';
        break;
    }

    const x = margin;
    const y = margin;
    const w = 410 * unit;
    const h = 118 * unit;
    panel(context, x, y, w, h);
    context.fillStyle = COLOR.accent;
    context.fillRect(x, y + 10 * unit, 4 * unit, h - 20 * unit);
    text(context, 'OBJECTIVE', x + 26 * unit, y + 32 * unit, { size: 15 * unit, color: COLOR.accent, spacing: 5 * unit, weight: 700 });
    text(context, title, x + 26 * unit, y + 66 * unit, { size: 27 * unit, weight: 700 });
    text(context, detail, x + 26 * unit, y + 95 * unit, { size: 18 * unit, color: COLOR.dim });
    if (timer !== null) {
      const urgent = timer < 10 && waves.phase === 'prep';
      text(context, clock(timer), x + w - 22 * unit, y + 32 * unit, {
        size: 23 * unit,
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
      if (surface === 'floor' || surface === 'tile' || surface === 'ceiling' || surface === 'slab' || surface === 'step') continue;
      const bottom = box.position.y - box.size.y / 2;
      const top = box.position.y + box.size.y / 2;
      if (bottom > player.y + 1.3 || top < player.y + 0.35) continue;
      const solid = surface === 'wall' || surface === 'plaster' || surface === 'building' || surface === 'pillar';
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

    text(context, player.y > 3 ? 'NORTHLINE / STREET' : 'B1 / PARKING & FREIGHT', margin, cy - radius - 18 * unit, { size: 14 * unit, color: COLOR.dim, spacing: 2 * unit });
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

  function drawHealth(margin: number, height: number, unit: number, lives: number, player: Player, time: number): void {
    const radius = 112 * unit;
    const x = margin;
    const w = radius * 2;
    const y = height - margin - 36 * unit;
    const h = 16 * unit;
    const fraction = clamp(player.health / config.player.maxHealth, 0, 1);
    const ghost = clamp(ghostHealth / config.player.maxHealth, 0, 1);

    panel(context, x - 16 * unit, y - 52 * unit, w + 32 * unit, 98 * unit, 'rgba(10,20,26,0.68)', 8 * unit);
    text(context, 'VITALS', x, y - 12 * unit, { size: 15 * unit, color: COLOR.dim, spacing: 4 * unit, weight: 700 });
    // One pip per life, lit while it is still there.
    for (let i = 0; i < config.player.lives; i++) {
      context.fillStyle = i < lives ? COLOR.accent : 'rgba(255,255,255,0.14)';
      roundedRect(context, x + 82 * unit + i * 20 * unit, y - 25 * unit, 14 * unit, 14 * unit, 3 * unit);
      context.fill();
    }
    text(context, String(Math.ceil(player.health)), x + w, y - 8 * unit, { size: 30 * unit, weight: 800, align: 'right', color: fraction < 0.3 ? COLOR.danger : COLOR.text });
    roundedRect(context, x, y, w, h, 3 * unit);
    context.fillStyle = 'rgba(0,0,0,0.6)';
    context.fill();
    context.save();
    roundedRect(context, x, y, w, h, 3 * unit);
    context.clip();
    context.fillStyle = 'rgba(255,255,255,0.7)';
    context.fillRect(x, y, w * ghost, h);
    const pulse = fraction < 0.3 && !settings.reducedFlashing ? 0.75 + 0.25 * Math.sin(time * 9) : 1;
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
    const stats = weaponStats(player.weapon);
    const magazine = stats.magazineSize;
    const right = width - margin;
    const baseY = height - margin - 40 * unit;
    const reloading = player.reloadLeft > 0;
    const low = player.ammo <= Math.ceil(magazine / 3);

    panel(context, right - 278 * unit, baseY - 142 * unit, 300 * unit, 200 * unit, 'rgba(10,20,26,0.62)', 8 * unit);
    text(context, player.stowed ? `${stats.name}   [${keyLabel(bindings.swap)}] SWAP` : stats.name, right, baseY - 100 * unit, { size: 17 * unit, color: COLOR.dim, align: 'right', spacing: 6 * unit, weight: 700 });
    if (reloading) {
      text(context, 'RELOADING', right, baseY - 10 * unit, { size: 36 * unit, weight: 800, align: 'right', color: COLOR.accent, spacing: 4 * unit });
      const w = 260 * unit;
      const progress = 1 - player.reloadLeft / stats.reloadSeconds;
      roundedRect(context, right - w, baseY + 8 * unit, w, 6 * unit, 3 * unit);
      context.fillStyle = 'rgba(255,255,255,0.16)';
      context.fill();
      roundedRect(context, right - w, baseY + 8 * unit, w * progress, 6 * unit, 3 * unit);
      context.fillStyle = COLOR.accent;
      context.fill();
    } else {
      const blink = player.ammo === 0 && !settings.reducedFlashing ? 0.55 + 0.45 * Math.sin(time * 10) : 1;
      context.save();
      context.globalAlpha = blink;
      const reserveLabel = `/ ${player.reserve}`;
      const infinity = measure(context, reserveLabel, 30 * unit, 700, 1 * unit);
      text(context, reserveLabel, right, baseY - 12 * unit, { size: 30 * unit, color: player.reserve === 0 ? COLOR.danger : COLOR.dim, align: 'right', weight: 700, spacing: 1 * unit });
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

  function drawStatus(width: number, height: number, margin: number, unit: number, state: GameState, player: Player, time: number): void {
    const x = width - margin - 248 * unit;
    panel(context, x, margin, 248 * unit, 112 * unit);
    text(context, `SURVIVAL / SOLO / ${floorName(state.floor).toUpperCase()}`, x + 20 * unit, margin + 28 * unit, { size: 13 * unit, spacing: 3 * unit, color: COLOR.dim });
    text(context, String(state.waves.number).padStart(2, '0'), x + 20 * unit, margin + 84 * unit, { size: 52 * unit, weight: 800, color: COLOR.accent });
    text(context, `/ ${String(wavesOnFloor(state.floor)).padStart(2, '0')} WAVES`, x + 93 * unit, margin + 77 * unit, { size: 16 * unit, color: COLOR.dim });
    for (let i = 0; i < wavesOnFloor(state.floor); i++) {
      context.fillStyle = i < state.waves.number - (state.waves.phase === 'cleared' ? 0 : 1) ? COLOR.good : 'rgba(255,255,255,.12)';
      context.fillRect(x + (20 + i * 43) * unit, margin + 99 * unit, 35 * unit, 3 * unit);
    }
    // The score, under the wave counter.
    const scoreY = margin + 124 * unit;
    panel(context, x, scoreY, 248 * unit, 56 * unit);
    text(context, 'POINTS', x + 20 * unit, scoreY + 34 * unit, { size: 13 * unit, spacing: 3 * unit, color: COLOR.dim });
    text(context, String(state.points[player.id] ?? 0), x + 228 * unit, scoreY + 40 * unit, { size: 34 * unit, weight: 800, align: 'right', color: COLOR.text });
    if (time - gainAt < 0.9) {
      const age = time - gainAt;
      text(context, `+${gainAmount}`, width / 2, height / 2 + (112 + age * 18) * unit, { size: 22 * unit, weight: 700, align: 'center', color: COLOR.accent, spacing: 2 * unit, alpha: Math.min(1, (0.9 - age) * 3) });
    }
    if (time - killAt < 1.3) {
      text(context, killWasHead ? 'HEADSHOT' : 'HOSTILE DOWN', width / 2, height / 2 + 77 * unit, { size: 16 * unit, align: 'center', color: killWasHead ? COLOR.danger : COLOR.accent, spacing: 3 * unit, alpha: Math.min(1, (1.3 - time + killAt) * 3) });
    }
    const hintY = height - margin;
    const hints = [[bindings.map, 'MAP'], [bindings.reload, 'RELOAD'], [bindings.cover, 'COVER']];
    let hx = width / 2 - 185 * unit;
    for (const [key, label] of hints) {
      const kw = keycap(context, keyLabel(key), hx, hintY, 25 * unit);
      text(context, label, hx + kw + 7 * unit, hintY - 3 * unit, { size: 12 * unit, color: COLOR.dim, spacing: 1 * unit });
      hx += 130 * unit;
    }
    if (player.bars > 0) text(context, `BOARDS ${player.bars} / ${config.doors.carryLimit}`, margin, height - margin + 29 * unit, { size: 13 * unit, color: COLOR.accent, spacing: 2 * unit });
    if (player.ammo <= 3 && player.reloadLeft <= 0) text(context, player.ammo === 0 ? (player.reserve > 0 ? 'EMPTY / RELOAD' : 'NO AMMO / FIND A STATION') : 'LOW MAGAZINE', width - margin, height - margin + 28 * unit, { size: 14 * unit, align: 'right', color: COLOR.danger, spacing: 2 * unit });
  }

  // A line of keycaps and a verb, low in the middle of the screen.
  function drawPrompt(width: number, height: number, unit: number, state: GameState, player: Player): void {
    let prompt: { keys: string[]; label: string } | null = null;
    const interaction = interactionTarget(state, player);
    if (interaction?.kind === 'station') {
      const offer = stationOffer(state, player, interaction.index);
      prompt = offer.status === 'ok'
        ? { keys: [bindings.use], label: `${offer.label}   ${offer.cost} pts` }
        : offer.status === 'full' ? { keys: [], label: 'Ammo full' } : { keys: [], label: `${offer.label.replace('Buy ', '')} costs ${offer.cost} points` };
    } else if (interaction?.kind === 'lock') {
      const offer = lockOffer(state, player, interaction.index);
      prompt = offer.status === 'ok'
        ? { keys: [bindings.use], label: `Open ${offer.label.toLowerCase()}   ${offer.cost} pts` }
        : { keys: [], label: `${offer.label} costs ${offer.cost} points` };
    } else if (interaction?.kind === 'objective') prompt = { keys: [bindings.use], label: `Take the ${state.level.objective?.label.toLowerCase() ?? 'item'}` };
    else if (interaction?.kind === 'gate') prompt = { keys: [bindings.use], label: 'Close the gate' };
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

    if (waves.phase === 'cleared' || waves.phase === 'search') {
      title = `${floorName(state.floor).toUpperCase()} CLEARED`;
      detail = isTopFloor(state) ? 'Extraction is on the way' : state.objective.done ? 'The elevator is opening' : 'Find the keycard to wake the elevator';
      color = COLOR.accent;
      age = 0.5;
    } else if (waves.phase === 'lift') {
      title = 'ELEVATOR READY';
      detail = 'Step inside to go up';
      color = COLOR.good;
      age = 0.5;
    } else if (waves.phase === 'ride') {
      title = floorName(state.floor + 1).toUpperCase();
      detail = 'Going up';
      color = COLOR.accent;
      age = 0.5;
    } else if (waves.arrivedTick >= 0 && seconds(waves.arrivedTick) < BANNER_SECONDS) {
      title = floorName(state.floor).toUpperCase();
      detail = `${stopAt(state.floor).name}. Board up the doors`;
      color = COLOR.accent;
      age = seconds(waves.arrivedTick);
    } else if (waves.diedTick >= 0 && seconds(waves.diedTick) < BANNER_SECONDS) {
      title = waves.lostRun ? 'OUT OF LIVES' : 'YOU WERE OVERRUN';
      detail = waves.lostRun
        ? 'Back to wave 1 with fresh lives'
        : `Restarting wave ${waves.number}. ${state.lives} ${state.lives === 1 ? 'life' : 'lives'} left`;
      color = COLOR.danger;
      age = seconds(waves.diedTick);
    } else if (state.gate.closed && seconds(state.gate.closedTick) < BANNER_SECONDS) {
      title = 'GATE SEALED';
      detail = 'Choose which doors to block. The rest let them in';
      color = COLOR.good;
      age = seconds(state.gate.closedTick);
    } else if (waves.startedTick >= 0 && seconds(waves.startedTick) < BANNER_SECONDS) {
      title = `WAVE ${waves.number}`;
      detail = `${zombiesInWave(state.floor, waves.number)} zombies incoming`;
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
