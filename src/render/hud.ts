import { drawTacticalMap } from './tacticalMap';
import { bindings, keyLabel } from '../client/bindings';
import { settings } from '../client/settings';
import { config } from '../config';
import { interactionTarget, lockOffer, stationOffer } from '../game/doors';
import { isMelee, nextWeapon, weaponStats } from '../game/weapons';
import { ladderInReach } from '../game/movement';
import type { GameState, Player } from '../game/state';
import { floorTitle, stopAt, stops, wavesOnFloor } from '../game/tower';
import { zombiesInWave } from '../game/waves';
import { objectiveMarkers } from '../game/objectives';
import { clearedDetail, objectiveBrief, objectiveProgress, objectivePrompt, partBanner } from './objectiveText';
import { aliveZombies } from '../game/zombies';
import type { Menu } from './menu';
import { COLOR, clamp, keycap, measure, roundedRect, text } from './ui';

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
  // The score as drawn, which rolls up toward the real one.
  let rolledPoints = 0;
  window.addEventListener('keydown', event => {
    if (event.code === bindings.map && !event.repeat && !menu.isOpen() && document.pointerLockElement) { event.preventDefault(); mapOpen = !mapOpen; }
  });
  let seenShotTick = -1;
  let hitUntil = 0;
  let hitIsKill = false;
  let lastShotAt = -10;
  let seenMeleeHitTick = -1;
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

      if (state.tick < previousTick) { marks.length = 0; ghostHealth = player.health; hitUntil = 0; killAt = -10; gainAt = -10; shownPoints = state.points[player.id] ?? 0; rolledPoints = shownPoints; }
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
      if (player.lastMeleeHitTick !== seenMeleeHitTick) {
        seenMeleeHitTick = player.lastMeleeHitTick;
        if (seenMeleeHitTick >= 0 && player.lastMeleeContact === 'zombie') {
          hitIsKill = player.lastMeleeKill;
          hitUntil = time + (hitIsKill ? KILL_MARKER_SECONDS : HIT_MARKER_SECONDS);
          if (hitIsKill) { killAt = time; killWasHead = false; }
        }
      }
      const points = state.points[player.id] ?? 0;
      if (points > shownPoints) {
        // Gains within a moment of each other add up, so rapid hits read as one number.
        gainAmount = time - gainAt < 0.9 ? gainAmount + points - shownPoints : points - shownPoints;
        gainAt = time;
      }
      shownPoints = points;
      rolledPoints = points < rolledPoints ? points : Math.min(points, rolledPoints + Math.max((points - rolledPoints) * Math.min(1, frame * 9), frame * 80));
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
    } else if (phase === 'search' || phase === 'hold' || phase === 'evac' || phase === 'break' || phase === 'active') {
      for (const marker of objectiveMarkers(state, player)) points.push({ x: marker.at.x, z: marker.at.z, color: COLOR.good, label: marker.label });
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
    drawStatus(width, height, margin, unit, state, time);
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
      // A pill under the compass.
      const label = 'ZOMBIES FROZEN';
      const w = measure(context, label, 16 * unit, 800, 3 * unit) + 76 * unit;
      const top = 116 * unit;
      roundedRect(context, (width - w) / 2, top, w, 36 * unit, 18 * unit);
      context.fillStyle = 'rgba(60,20,16,0.72)';
      context.fill();
      text(context, label, (width - w) / 2 + 18 * unit, top + 24 * unit, { size: 16 * unit, weight: 800, spacing: 3 * unit, color: COLOR.danger, shadow: false });
      keycap(context, keyLabel(bindings.freeze), (width + w) / 2 - 10 * unit, top + 26 * unit, 22 * unit, 'right');
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
    let total = 1;
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
        detail = `Boards found ${state.pickups.filter((pickup) => pickup.taken).length} of ${state.pickups.length}   ·   Doors sealed ${state.doors.filter((door) => door.boarded).length}`;
        timer = waves.timer;
        total = config.waves.prepSeconds;
        break;
      case 'break':
        title = `Wave ${waves.number} incoming`;
        detail = 'Reload and reposition';
        timer = waves.timer;
        total = Math.max(config.waves.breakSeconds, waves.timer);
        break;
      case 'active': {
        title = `Survive wave ${waves.number}`;
        const progress = objectiveProgress(state);
        detail = `${waves.toSpawn + aliveZombies(state)} zombies left${progress ? `   ·   ${progress}` : ''}`;
        break;
      }
      case 'cleared':
        title = `${floorName(state.floor)} cleared`;
        detail = `All ${wavesOnFloor(state.floor)} waves survived`;
        break;
      case 'search':
      case 'hold':
      case 'evac': {
        const brief = objectiveBrief(state, player);
        title = brief?.title ?? 'Find the way on';
        detail = brief?.detail ?? '';
        if (brief?.timer !== undefined) {
          timer = brief.timer;
          total = brief.total ?? 1;
        }
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
    const left = x + 18 * unit;
    const titleSize = 28 * unit;
    const width = Math.max(300 * unit, measure(context, title, titleSize, 700, 0.5 * unit), measure(context, detail, 17 * unit, 600, 0.5 * unit));
    scrim(0, y - 24 * unit, x + width + 120 * unit, 140 * unit, 'left');
    context.fillStyle = COLOR.accent;
    context.fillRect(x, y + 4 * unit, 3 * unit, timer !== null ? 92 * unit : 80 * unit);

    text(context, 'OBJECTIVE', left, y + 16 * unit, { size: 13 * unit, color: COLOR.accent, spacing: 4 * unit, weight: 700 });
    text(context, title, left, y + 50 * unit, { size: titleSize, weight: 700, spacing: 0.5 * unit });
    text(context, detail, left, y + 76 * unit, { size: 17 * unit, color: COLOR.dim, spacing: 0.5 * unit });
    if (timer !== null) {
      // The time left, as a clock beside the heading and a bar running down under it.
      const urgent = timer < 10 && waves.phase === 'prep';
      const tone = urgent ? COLOR.danger : COLOR.text;
      text(context, clock(timer), left + width, y + 17 * unit, { size: 19 * unit, weight: 800, align: 'right', color: tone, spacing: 1 * unit });
      const barY = y + 90 * unit;
      roundedRect(context, left, barY, width, 3 * unit, 1.5 * unit);
      context.fillStyle = 'rgba(255,255,255,0.14)';
      context.fill();
      roundedRect(context, left, barY, width * clamp(timer / total, 0, 1), 3 * unit, 1.5 * unit);
      context.fillStyle = urgent ? COLOR.danger : COLOR.accent;
      context.fill();
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

    text(context, player.y > 3 ? 'NORTHLINE / STREET' : state.level.theme === 'garage' ? 'B1 / PARKING & FREIGHT' : `${floorName(state.floor)} / ${stopAt(state.floor).name}`.toUpperCase(), margin, cy - radius - 18 * unit, { size: 14 * unit, color: COLOR.dim, spacing: 2 * unit });
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

  // A soft dark shade spreading in from one edge of the screen, so text reads over a bright room
  // without a hard box around it.
  function scrim(x: number, y: number, w: number, h: number, from: 'left' | 'right', alpha = 0.66): void {
    const anchor = from === 'left' ? x : x + w;
    const radius = h * 0.75;
    context.save();
    context.translate(anchor, y + h / 2);
    context.scale(w / radius, 1);
    const gradient = context.createRadialGradient(0, 0, 0, 0, 0, radius);
    gradient.addColorStop(0, `rgba(4,8,12,${alpha})`);
    gradient.addColorStop(0.5, `rgba(4,8,12,${alpha * 0.62})`);
    gradient.addColorStop(1, 'rgba(4,8,12,0)');
    context.fillStyle = gradient;
    context.fillRect(from === 'left' ? 0 : -radius, -radius, radius, radius * 2);
    context.restore();
  }

  // One heartbeat on a monitor, for p from 0 to 1: a small bump, the sharp spike, and a slow wave.
  function heartbeat(p: number): number {
    const bump = (centre: number, spread: number, height: number) => height * Math.exp(-((p - centre) ** 2) / (2 * spread * spread));
    return bump(0.12, 0.025, 0.12) - bump(0.22, 0.008, 0.18) + bump(0.25, 0.01, 1) - bump(0.285, 0.01, 0.32) + bump(0.48, 0.045, 0.24);
  }

  // A red medical cross, lit for a life still left.
  function lifeCross(cx: number, cy: number, size: number, lit: boolean): void {
    const arm = size * 0.34;
    context.save();
    context.fillStyle = lit ? '#ef4f45' : 'rgba(255,255,255,0.14)';
    if (lit) {
      context.shadowColor = 'rgba(239,79,69,0.7)';
      context.shadowBlur = size * 0.6;
    }
    roundedRect(context, cx - arm / 2, cy - size / 2, arm, size, arm * 0.25);
    context.fill();
    roundedRect(context, cx - size / 2, cy - arm / 2, size, arm, arm * 0.25);
    context.fill();
    context.restore();
  }

  // Bottom left, under the radar: lives, health as a number and a bar, and a heart monitor that
  // beats faster the more hurt you are.
  function drawHealth(margin: number, height: number, unit: number, lives: number, player: Player, time: number): void {
    const x = margin;
    const w = 224 * unit;
    const base = height - margin;
    const fraction = clamp(player.health / config.player.maxHealth, 0, 1);
    const ghost = clamp(ghostHealth / config.player.maxHealth, 0, 1);
    const hurt = fraction < 0.3;
    const tone = hurt ? '#ff5a4a' : '#5fd49a';

    scrim(0, base - 92 * unit, x + w + 110 * unit, 120 * unit, 'left');
    text(context, 'VITALS', x, base - 52 * unit, { size: 12 * unit, color: COLOR.dim, spacing: 4 * unit, weight: 700 });
    for (let i = 0; i < config.player.lives; i++) {
      lifeCross(x + w - 7 * unit - (config.player.lives - 1 - i) * 22 * unit, base - 56 * unit, 14 * unit, i < lives);
    }

    const value = String(Math.max(0, Math.ceil(player.health)));
    const valueSize = 44 * unit;
    text(context, value, x, base - 10 * unit, { size: valueSize, weight: 800, color: hurt ? COLOR.danger : COLOR.text });
    const valueWidth = measure(context, value, valueSize, 800);

    // The trace runs right to left, newest beat at the right-hand end.
    const traceLeft = x + Math.max(valueWidth, 52 * unit) + 16 * unit;
    const traceWidth = x + w - traceLeft;
    const middle = base - 24 * unit;
    const amplitude = 20 * unit;
    const beatsPerSecond = (64 + (1 - fraction) * 86) / 60;
    const window = 2.4;
    const steps = Math.max(24, Math.floor(traceWidth / (2 * unit)));
    const alive = player.health > 0;
    context.save();
    const fade = context.createLinearGradient(traceLeft, 0, traceLeft + traceWidth, 0);
    fade.addColorStop(0, 'rgba(0,0,0,0)');
    fade.addColorStop(0.35, tone);
    fade.addColorStop(1, tone);
    context.strokeStyle = fade;
    context.lineWidth = 2 * unit;
    context.lineJoin = 'round';
    context.shadowColor = tone;
    context.shadowBlur = 6 * unit;
    context.beginPath();
    let endY = middle;
    for (let i = 0; i <= steps; i++) {
      const along = i / steps;
      const at = time - (1 - along) * window;
      const beat = alive ? heartbeat((((at * beatsPerSecond) % 1) + 1) % 1) : 0;
      endY = middle - beat * amplitude;
      if (i === 0) context.moveTo(traceLeft, endY);
      else context.lineTo(traceLeft + along * traceWidth, endY);
    }
    context.stroke();
    context.fillStyle = tone;
    context.beginPath();
    context.arc(traceLeft + traceWidth, endY, 2.6 * unit, 0, Math.PI * 2);
    context.fill();
    context.restore();

    // The bar, with a pale ghost of what was just lost.
    const barY = base + 2 * unit;
    const barH = 5 * unit;
    roundedRect(context, x, barY, w, barH, barH / 2);
    context.fillStyle = 'rgba(255,255,255,0.12)';
    context.fill();
    context.save();
    roundedRect(context, x, barY, w, barH, barH / 2);
    context.clip();
    context.fillStyle = 'rgba(255,255,255,0.55)';
    context.fillRect(x, barY, w * ghost, barH);
    const pulse = hurt && !settings.reducedFlashing ? 0.7 + 0.3 * Math.sin(time * 9) : 1;
    context.globalAlpha = pulse;
    context.fillStyle = tone;
    context.fillRect(x, barY, w * fraction, barH);
    context.restore();

    if (player.bars > 0) {
      text(context, `BOARDS  ${player.bars} / ${config.doors.carryLimit}`, x, base + 30 * unit, { size: 13 * unit, color: COLOR.accent, spacing: 2 * unit, weight: 700 });
    }
  }

  // A shotgun shell standing on its brass, for the magazine row.
  function shell(x: number, y: number, w: number, h: number, loaded: boolean): void {
    const brass = h * 0.28;
    roundedRect(context, x, y, w, h - brass, w * 0.25);
    context.fillStyle = loaded ? '#c8382e' : 'rgba(255,255,255,0.12)';
    context.fill();
    roundedRect(context, x - w * 0.08, y + h - brass, w * 1.16, brass, w * 0.12);
    context.fillStyle = loaded ? '#d9b25c' : 'rgba(255,255,255,0.12)';
    context.fill();
  }

  // Bottom right: the gun in hand, rounds in the magazine and spare, and the one on your back.
  function drawAmmo(width: number, height: number, margin: number, unit: number, player: Player, time: number): void {
    const stats = weaponStats(player.weapon);
    const magazine = stats.magazineSize;
    const right = width - margin;
    const base = height - margin;
    const reloading = player.reloadLeft > 0;
    const low = player.ammo <= Math.ceil(magazine / 3);

    scrim(width - margin - 330 * unit, base - 170 * unit, 330 * unit + margin, 200 * unit, 'right');

    // The weapon's name, and the other one with the key that swaps to it.
    const nameY = base - 102 * unit;
    text(context, stats.name, right, nameY, { size: 15 * unit, align: 'right', spacing: 5 * unit, weight: 700 });
    const nameWidth = measure(context, stats.name, 15 * unit, 700, 5 * unit);
    context.fillStyle = COLOR.accent;
    context.fillRect(right - nameWidth - 18 * unit, nameY - 6 * unit, 10 * unit, 2 * unit);
    {
      const other = weaponStats(nextWeapon(player)).name;
      const otherRight = right - nameWidth - 34 * unit;
      text(context, other, otherRight, nameY, { size: 13 * unit, align: 'right', spacing: 3 * unit, color: COLOR.faint, weight: 700 });
      const otherWidth = measure(context, other, 13 * unit, 700, 3 * unit);
      keycap(context, keyLabel(bindings.swap), otherRight - otherWidth - 8 * unit, nameY + 1 * unit, 20 * unit, 'right');
    }

    if (isMelee(player.weapon)) {
      const swinging = player.meleeLeft > 0;
      text(context, swinging ? 'SWINGING' : 'READY', right, base - 35 * unit,
        { size: 38 * unit, weight: 800, align: 'right', color: swinging ? COLOR.accent : COLOR.text, spacing: 3 * unit });
      text(context, `${keyLabel(bindings.fire)} SWING  /  ${keyLabel(bindings.melee)} MELEE`, right, base + 10 * unit,
        { size: 13 * unit, align: 'right', color: COLOR.dim, spacing: 1 * unit });
      if (swinging) {
        context.fillStyle = COLOR.accent;
        context.fillRect(right - 190 * unit, base - 15 * unit, 190 * unit * (1 - player.meleeLeft / stats.melee.seconds), 3 * unit);
      }
      return;
    }

    if (reloading) {
      text(context, 'RELOADING', right, base - 34 * unit, { size: 32 * unit, weight: 800, align: 'right', color: COLOR.accent, spacing: 4 * unit });
      const w = 240 * unit;
      const progress = clamp(1 - player.reloadLeft / stats.reloadSeconds, 0, 1);
      roundedRect(context, right - w, base - 16 * unit, w, 4 * unit, 2 * unit);
      context.fillStyle = 'rgba(255,255,255,0.14)';
      context.fill();
      roundedRect(context, right - w, base - 16 * unit, w * progress, 4 * unit, 2 * unit);
      context.fillStyle = COLOR.accent;
      context.fill();
    } else {
      const blink = player.ammo === 0 && !settings.reducedFlashing ? 0.55 + 0.45 * Math.sin(time * 10) : 1;
      context.save();
      context.globalAlpha = blink;
      const reserveLabel = String(player.reserve);
      const reserveSize = 26 * unit;
      const reserveWidth = measure(context, reserveLabel, reserveSize, 700, 1 * unit);
      text(context, reserveLabel, right, base - 30 * unit, { size: reserveSize, color: player.reserve === 0 ? COLOR.danger : COLOR.dim, align: 'right', weight: 700, spacing: 1 * unit });
      context.fillStyle = 'rgba(255,255,255,0.3)';
      context.save();
      context.translate(right - reserveWidth - 14 * unit, base - 40 * unit);
      context.rotate(0.35);
      context.fillRect(-1 * unit, -20 * unit, 2 * unit, 40 * unit);
      context.restore();
      text(context, String(player.ammo), right - reserveWidth - 26 * unit, base - 24 * unit, { size: 80 * unit, weight: 800, align: 'right', color: low ? COLOR.danger : COLOR.text });
      context.restore();
    }

    // The magazine, one mark per round: thin bars for the pistol, shells for the shotgun.
    const shells = stats.pellets > 1;
    const pipW = shells ? 11 * unit : 5 * unit;
    const pipH = shells ? 24 * unit : 14 * unit;
    const gap = shells ? 8 * unit : 4 * unit;
    const pipY = base - (shells ? 4 : -2) * unit;
    for (let i = 0; i < magazine; i++) {
      const px = right - (magazine - i) * (pipW + gap) + gap;
      const loaded = !reloading && i < player.ammo;
      if (shells) {
        shell(px, pipY - pipH + 14 * unit, pipW, pipH, loaded);
      } else {
        roundedRect(context, px, pipY, pipW, pipH, 1.5 * unit);
        context.fillStyle = loaded ? (low ? COLOR.danger : 'rgba(245,247,250,0.9)') : 'rgba(255,255,255,0.14)';
        context.fill();
      }
    }

    // What the body is doing, if it is not just standing.
    let stance = '';
    if (player.mantle) stance = 'CLIMBING';
    else if (player.ladder) stance = 'ON LADDER';
    else if (player.cover) stance = 'IN COVER';
    else if (player.crouch > 0.5) stance = 'CROUCHING';
    if (stance) text(context, stance, right, base - 150 * unit, { size: 13 * unit, color: COLOR.accent, align: 'right', spacing: 4 * unit, weight: 700 });

    if (player.ammo <= 3 && !reloading) {
      const warning = player.ammo === 0 ? (player.reserve > 0 ? 'EMPTY  ·  RELOAD' : 'NO AMMO  ·  FIND A STATION') : 'LOW MAGAZINE';
      text(context, warning, right, base - 128 * unit, { size: 13 * unit, align: 'right', color: COLOR.danger, spacing: 2 * unit, weight: 700 });
    }
  }

  // Top right: where you are, the wave, and the score.
  function drawStatus(width: number, height: number, margin: number, unit: number, state: GameState, time: number): void {
    const right = width - margin;
    const top = margin;
    const count = wavesOnFloor(state.floor);
    scrim(width - margin - 320 * unit, top - 24 * unit, 320 * unit + margin, 190 * unit, 'right');

    const place = state.level.theme === 'garage' ? 'THE GARAGE' : `${floorName(state.floor)}  ·  ${stopAt(state.floor).name}`.toUpperCase();
    text(context, place, right, top + 10 * unit, { size: 13 * unit, align: 'right', spacing: 3 * unit, color: 'rgba(242,244,247,0.86)', weight: 700 });

    // The wave: a big number, out of how many, and a segment for each.
    const totalLabel = `/ ${String(count).padStart(2, '0')}`;
    const totalWidth = measure(context, totalLabel, 20 * unit, 700, 1 * unit);
    text(context, totalLabel, right, top + 66 * unit, { size: 20 * unit, align: 'right', color: COLOR.dim, weight: 700, spacing: 1 * unit });
    const number = String(state.waves.number).padStart(2, '0');
    const numberRight = right - totalWidth - 8 * unit;
    text(context, number, numberRight, top + 66 * unit, { size: 56 * unit, weight: 800, align: 'right', color: COLOR.accent });
    const numberWidth = measure(context, number, 56 * unit, 800);
    text(context, 'WAVE', numberRight - numberWidth - 12 * unit, top + 66 * unit, { size: 13 * unit, align: 'right', spacing: 4 * unit, color: COLOR.dim, weight: 700 });
    const done = state.waves.number - (state.waves.phase === 'cleared' || state.waves.phase === 'search' || state.waves.phase === 'lift' ? 0 : 1);
    const segment = Math.min(34 * unit, (220 * unit) / count - 6 * unit);
    for (let i = 0; i < count; i++) {
      const sx = right - (count - i) * (segment + 6 * unit) + 6 * unit;
      const current = i === done && state.waves.phase === 'active';
      const glow = current && !settings.reducedFlashing ? 0.6 + 0.4 * Math.sin(time * 4) : 1;
      context.globalAlpha = glow;
      context.fillStyle = i < done ? COLOR.good : current ? COLOR.accent : 'rgba(255,255,255,0.14)';
      roundedRect(context, sx, top + 80 * unit, segment, 4 * unit, 2 * unit);
      context.fill();
      context.globalAlpha = 1;
    }

    // The score rolls up to its new value.
    const score = String(Math.round(rolledPoints));
    text(context, score, right, top + 132 * unit, { size: 34 * unit, weight: 800, align: 'right' });
    const scoreWidth = measure(context, score, 34 * unit, 800);
    text(context, 'PTS', right - scoreWidth - 10 * unit, top + 132 * unit, { size: 13 * unit, align: 'right', spacing: 3 * unit, color: COLOR.accent, weight: 700 });
    if (time - gainAt < 0.9) {
      const age = time - gainAt;
      const alpha = Math.min(1, (0.9 - age) * 3);
      text(context, `+${gainAmount}`, right, top + 156 * unit + age * 10 * unit, { size: 16 * unit, weight: 800, align: 'right', color: COLOR.accent, spacing: 1 * unit, alpha });
      text(context, `+${gainAmount}`, width / 2, height / 2 + (112 + age * 18) * unit, { size: 20 * unit, weight: 800, align: 'center', color: COLOR.accent, spacing: 2 * unit, alpha });
    }
    if (time - killAt < 1.3) {
      text(context, killWasHead ? 'HEADSHOT' : 'KILL', width / 2, height / 2 + 80 * unit, { size: 15 * unit, weight: 800, align: 'center', color: killWasHead ? COLOR.danger : COLOR.text, spacing: 4 * unit, alpha: Math.min(1, (1.3 - time + killAt) * 3) });
    }

    // Reminders of the less obvious keys, faint along the bottom.
    const hintY = height - margin + 26 * unit;
    const hints = [[bindings.map, 'MAP'], [bindings.melee, 'MELEE'], [bindings.swap, 'CYCLE'], [bindings.cover, 'COVER'], [bindings.light, 'LIGHT']];
    const hintSize = 20 * unit;
    const widths = hints.map(([key, label]) => Math.max(hintSize, measure(context, keyLabel(key), hintSize * 0.62, 700, 0.5) + hintSize * 0.7) + 6 * unit + measure(context, label, 11 * unit, 700, 2 * unit));
    const spacing = 26 * unit;
    let hx = width / 2 - (widths.reduce((sum, value) => sum + value, 0) + spacing * (hints.length - 1)) / 2;
    const rowWidth = widths.reduce((sum, value) => sum + value, 0) + spacing * (hints.length - 1);
    context.save();
    roundedRect(context, hx - 12 * unit, hintY - 21 * unit, rowWidth + 24 * unit, 28 * unit, 14 * unit);
    context.fillStyle = 'rgba(4,8,12,0.45)';
    context.fill();
    context.globalAlpha = 0.85;
    hints.forEach(([key, label], index) => {
      const kw = keycap(context, keyLabel(key), hx, hintY, hintSize);
      text(context, label, hx + kw + 6 * unit, hintY - 3 * unit, { size: 11 * unit, color: COLOR.text, spacing: 2 * unit, weight: 700 });
      hx += widths[index] + spacing;
    });
    context.restore();
  }

  // What pressing use does here: a pill low in the middle of the screen with the key, what it
  // does, and what it costs.
  function drawPrompt(width: number, height: number, unit: number, state: GameState, player: Player): void {
    let prompt: { keys: string[]; label: string; cost?: number; short?: boolean } | null = null;
    const interaction = interactionTarget(state, player);
    if (interaction?.kind === 'station') {
      const offer = stationOffer(state, player, interaction.index);
      prompt = offer.status === 'ok'
        ? { keys: [bindings.use], label: offer.label, cost: offer.cost }
        : offer.status === 'full' ? { keys: [], label: 'Ammo full' } : { keys: [], label: offer.label, cost: offer.cost, short: true };
    } else if (interaction?.kind === 'lock') {
      const offer = lockOffer(state, player, interaction.index);
      prompt = offer.status === 'ok'
        ? { keys: [bindings.use], label: `Open ${offer.label.toLowerCase()}`, cost: offer.cost }
        : { keys: [], label: `Open ${offer.label.toLowerCase()}`, cost: offer.cost, short: true };
    } else if (interaction && objectivePrompt(state, interaction.kind)) prompt = { keys: [bindings.use], label: objectivePrompt(state, interaction.kind)! };
    else if (player.carrying >= 0) prompt = { keys: [bindings.fire], label: 'Put the case down' };
    else if (interaction?.kind === 'gate') prompt = { keys: [bindings.use], label: 'Close the gate' };
    else if (interaction?.kind === 'pickup') prompt = { keys: [bindings.use], label: 'Pick up the boards' };
    else if (interaction?.kind === 'door') prompt = { keys: [bindings.use], label: 'Board up this door' };
    else if (player.ladder) prompt = { keys: [bindings.forward, bindings.back], label: 'Climb' };
    else if (ladderInReach(player, state.level)) prompt = { keys: [bindings.forward], label: 'Climb the ladder' };
    else if (player.cover) prompt = { keys: [bindings.leanLeft, bindings.leanRight], label: 'Peek, aim to stand up' };
    if (!prompt) return;

    const size = 30 * unit;
    const labelSize = 21 * unit;
    const pad = 16 * unit;
    const labelWidth = measure(context, prompt.label, labelSize, 600, 0.5 * unit);
    const keyWidths = prompt.keys.map((key) => Math.max(size, measure(context, keyLabel(key), size * 0.62, 700, 0.5) + size * 0.7) + 6 * unit);
    const costText = prompt.cost === undefined ? '' : prompt.short ? `NEED ${prompt.cost}` : `${prompt.cost}`;
    const costWidth = costText ? measure(context, costText, 17 * unit, 800, 1 * unit) + measure(context, ' PTS', 12 * unit, 700, 2 * unit) + 22 * unit : 0;
    const total = pad + keyWidths.reduce((sum, value) => sum + value, 0) + (prompt.keys.length ? 6 * unit : 0) + labelWidth + (costText ? 14 * unit + costWidth : 0) + pad;
    const x = (width - total) / 2;
    const y = height * 0.72;
    const h = 48 * unit;
    roundedRect(context, x, y - h / 2, total, h, h / 2);
    context.fillStyle = 'rgba(6,10,14,0.78)';
    context.fill();
    context.strokeStyle = 'rgba(255,255,255,0.12)';
    context.lineWidth = 1;
    context.stroke();

    let cursor = x + pad;
    prompt.keys.forEach((key, index) => {
      keycap(context, keyLabel(key), cursor, y + size * 0.32, size);
      cursor += keyWidths[index];
    });
    if (prompt.keys.length) cursor += 6 * unit;
    text(context, prompt.label, cursor, y + labelSize * 0.34, { size: labelSize, spacing: 0.5 * unit, color: prompt.short ? COLOR.dim : COLOR.text, shadow: false });
    cursor += labelWidth + 14 * unit;
    if (costText) {
      // The price as a chip: amber when you can pay it, red when you cannot.
      const tone = prompt.short ? COLOR.danger : COLOR.accent;
      const chipH = 28 * unit;
      roundedRect(context, cursor, y - chipH / 2, costWidth, chipH, chipH / 2);
      context.fillStyle = prompt.short ? 'rgba(229,72,60,0.16)' : 'rgba(232,184,102,0.16)';
      context.fill();
      context.strokeStyle = tone;
      context.globalAlpha = 0.6;
      context.stroke();
      context.globalAlpha = 1;
      const amountWidth = measure(context, costText, 17 * unit, 800, 1 * unit);
      text(context, costText, cursor + 11 * unit, y + 6 * unit, { size: 17 * unit, weight: 800, color: tone, spacing: 1 * unit, shadow: false });
      text(context, ' PTS', cursor + 11 * unit + amountWidth, y + 6 * unit, { size: 12 * unit, weight: 700, color: tone, spacing: 2 * unit, shadow: false });
    }
  }

  function drawBanner(width: number, height: number, unit: number, state: GameState, time: number): void {
    const waves = state.waves;
    const seconds = (tick: number) => (state.tick - tick) / config.ticksPerSecond;
    let eyebrow = '';
    let title = '';
    let detail = '';
    let color: string = COLOR.text;
    let age = 0;

    const part = partBanner(state);
    if (state.objective.doneTick >= 0 && seconds(state.objective.doneTick) < BANNER_SECONDS && part) {
      ({ eyebrow, title, detail } = part);
      color = COLOR.good;
      age = seconds(state.objective.doneTick);
    } else if (waves.phase === 'hold' && seconds(state.objective.startedTick) < BANNER_SECONDS) {
      const roof = state.level.objective?.kind === 'signal';
      eyebrow = roof ? 'THE ROOF' : 'HOLD THE ROOM';
      title = roof ? 'LIGHTS ON' : 'CHARGING';
      detail = roof ? 'The helicopter is coming. Hold out until it lands' : 'Keep someone in the room until it is full';
      color = COLOR.accent;
      age = seconds(state.objective.startedTick);
    } else if (waves.phase === 'cleared' || waves.phase === 'search') {
      eyebrow = floorName(state.floor).toUpperCase();
      title = 'CLEARED';
      detail = clearedDetail(state);
      color = COLOR.accent;
      age = 0.5;
    } else if (waves.phase === 'lift') {
      eyebrow = 'THE WAY UP';
      title = 'ELEVATOR READY';
      detail = 'Step inside to go up';
      color = COLOR.good;
      age = 0.5;
    } else if (waves.phase === 'ride') {
      eyebrow = 'GOING UP';
      title = floorName(state.floor + 1).toUpperCase();
      detail = state.floor + 1 < stops.length ? stopAt(state.floor + 1).name : 'The helipad';
      color = COLOR.accent;
      age = 0.5;
    } else if (waves.arrivedTick >= 0 && seconds(waves.arrivedTick) < BANNER_SECONDS) {
      eyebrow = floorName(state.floor).toUpperCase();
      title = stopAt(state.floor).name.toUpperCase();
      detail = state.level.objective?.kind === 'breakers' ? 'The power is out. Board up the doors before they come' : 'Board up the doors before they come';
      color = COLOR.accent;
      age = seconds(waves.arrivedTick);
    } else if (waves.diedTick >= 0 && seconds(waves.diedTick) < BANNER_SECONDS) {
      eyebrow = waves.lostRun ? 'NO LIVES LEFT' : `${state.lives} ${state.lives === 1 ? 'LIFE' : 'LIVES'} LEFT`;
      title = waves.lostRun ? 'OUT OF LIVES' : 'OVERRUN';
      detail = waves.lostRun ? 'Back to wave 1 with fresh lives' : `Restarting wave ${waves.number}`;
      color = COLOR.danger;
      age = seconds(waves.diedTick);
    } else if (state.gate.closed && seconds(state.gate.closedTick) < BANNER_SECONDS) {
      eyebrow = 'THE GARAGE';
      title = 'GATE SEALED';
      detail = 'Choose which doors to block. The rest let them in';
      color = COLOR.good;
      age = seconds(state.gate.closedTick);
    } else if (waves.startedTick >= 0 && seconds(waves.startedTick) < BANNER_SECONDS) {
      eyebrow = `${floorName(state.floor).toUpperCase()}  ·  ${waves.number} OF ${wavesOnFloor(state.floor)}`;
      title = `WAVE ${waves.number}`;
      detail = `${zombiesInWave(state.floor, waves.number)} zombies incoming`;
      age = seconds(waves.startedTick);
    } else if (state.tick < 4.5 * config.ticksPerSecond && waves.phase === 'entry') {
      eyebrow = 'LEVEL 0';
      title = 'THE GARAGE';
      detail = 'Get off the street';
      color = COLOR.accent;
      age = state.tick / config.ticksPerSecond;
    }
    if (!title) return;

    const fade = clamp(Math.min(1, age * 3, (BANNER_SECONDS - age) * 1.6), 0, 1);
    // The title slides in a little as it fades up.
    const rise = (1 - Math.min(1, age * 3)) * 14 * unit;
    const y = height * 0.3 + rise;
    context.save();
    context.globalAlpha = fade;

    // A dark band behind, widest in the middle.
    const bandRadius = 110 * unit;
    context.save();
    context.translate(width / 2, y - 26 * unit);
    context.scale(Math.min(width * 0.42, 900 * unit) / bandRadius, 1);
    const band = context.createRadialGradient(0, 0, 0, 0, 0, bandRadius);
    band.addColorStop(0, 'rgba(4,8,12,0.7)');
    band.addColorStop(0.6, 'rgba(4,8,12,0.4)');
    band.addColorStop(1, 'rgba(4,8,12,0)');
    context.fillStyle = band;
    context.fillRect(-bandRadius, -bandRadius, bandRadius * 2, bandRadius * 2);
    context.restore();

    const size = 78 * unit;
    const spacing = 14 * unit;
    const titleWidth = measure(context, title, size, 800, spacing);
    text(context, eyebrow, width / 2 + 2 * unit, y - size - 4 * unit, { size: 15 * unit, weight: 700, align: 'center', spacing: 5 * unit, color });
    text(context, title, width / 2 + spacing / 2, y, { size, weight: 800, align: 'center', spacing, color: COLOR.text });
    // Short rules either side of the title.
    context.fillStyle = color;
    const ruleLength = Math.min(width * 0.12, 160 * unit);
    context.fillRect(width / 2 - titleWidth / 2 - 30 * unit - ruleLength, y - size * 0.34, ruleLength, 2 * unit);
    context.fillRect(width / 2 + titleWidth / 2 + 30 * unit, y - size * 0.34, ruleLength, 2 * unit);
    text(context, detail, width / 2, y + 40 * unit, { size: 21 * unit, align: 'center', color: COLOR.dim, spacing: 2 * unit });
    context.restore();
    void time;
  }
}
