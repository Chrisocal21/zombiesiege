import { config } from '../config';
import type { GameState, Player } from '../game/state';
import { ladderInReach } from '../game/movement';
import { TOTAL_WAVES } from '../game/waves';
import { aliveZombies } from '../game/zombies';
import type { Level } from '../levels/types';

export interface Hud {
  draw(locked: boolean, state: GameState, player: Player): void;
}

const TEXT = '#e6e9ef';
const WARNING = '#e0805a';
// Seconds a banner stays up after the wave starts or the player dies.
const BANNER_SECONDS = 3;
const HURT_SECONDS = 0.6;

// The HUD is a transparent 2D canvas layered over the 3D view.
export function createHud(level: Level): Hud {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none';
  document.body.appendChild(canvas);
  const context = canvas.getContext('2d')!;

  const seconds = (state: GameState, tick: number) => (state.tick - tick) / config.ticksPerSecond;

  function text(value: string, x: number, y: number, size: number, color = TEXT, align: CanvasTextAlign = 'center'): void {
    context.font = `${size}px sans-serif`;
    context.textAlign = align;
    context.fillStyle = color;
    context.fillText(value, x, y);
  }

  function vignette(width: number, height: number, alpha: number): void {
    const gradient = context.createRadialGradient(width / 2, height / 2, height * 0.3, width / 2, height / 2, height * 0.95);
    gradient.addColorStop(0, 'rgba(150,0,0,0)');
    gradient.addColorStop(1, `rgba(150,0,0,${alpha})`);
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
  }

  return {
    draw(locked, state, player) {
      const width = window.innerWidth;
      const height = window.innerHeight;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      context.clearRect(0, 0, width, height);

      if (!locked) {
        context.fillStyle = 'rgba(0, 0, 0, 0.6)';
        context.fillRect(0, 0, width, height);
        text('Click to play', width / 2, height / 2, 28);
        text(
          'WASD move, mouse look, left click shoot, hold right click aim, R reload',
          width / 2,
          height / 2 + 36,
          16,
        );
        text(
          'Space jump or climb a ledge, C crouch, F take cover, Q and E lean while aiming or in cover',
          width / 2,
          height / 2 + 60,
          16,
        );
        text('Walk into a ladder to climb it, W up and S down', width / 2, height / 2 + 84, 16);
        return;
      }

      // The gun's own sights take over from the crosshair while aiming.
      if (!player.aiming && !player.ladder && !player.mantle) {
        context.fillStyle = TEXT;
        context.fillRect(width / 2 - 1, height / 2 - 8, 2, 16);
        context.fillRect(width / 2 - 8, height / 2 - 1, 16, 2);
      }

      // Taking a hit flashes the edges of the screen red. Low health keeps them a little red.
      const sinceHurt = player.lastHurtTick >= 0 ? seconds(state, player.lastHurtTick) : Infinity;
      const lowHealth = 1 - player.health / config.player.maxHealth;
      const flash = sinceHurt < HURT_SECONDS ? 1 - sinceHurt / HURT_SECONDS : 0;
      vignette(width, height, Math.min(0.85, flash * 0.7 + lowHealth * 0.35));

      // Ammo, bottom right.
      const ammo = player.reloadLeft > 0 ? 'Reloading' : `${player.ammo} / ${config.pistol.magazineSize}`;
      text(ammo, width - 32, height - 32, 28, player.ammo === 0 || player.reloadLeft > 0 ? WARNING : TEXT, 'right');

      // Health, bottom left.
      const barWidth = 240;
      const barHeight = 14;
      const fraction = Math.max(0, player.health / config.player.maxHealth);
      context.fillStyle = 'rgba(0,0,0,0.55)';
      context.fillRect(32, height - 46, barWidth, barHeight);
      context.fillStyle = fraction > 0.3 ? '#78b86a' : WARNING;
      context.fillRect(32, height - 46, barWidth * fraction, barHeight);
      text(`${Math.ceil(player.health)}`, 32, height - 56, 16, TEXT, 'left');

      // Wave and zombies left, top centre.
      const waves = state.waves;
      if (waves.phase === 'break') {
        text(`Wave ${waves.number} of ${TOTAL_WAVES} in ${Math.ceil(waves.timer)}`, width / 2, 44, 22);
      } else if (waves.phase === 'active') {
        const left = waves.toSpawn + aliveZombies(state);
        text(`Wave ${waves.number} of ${TOTAL_WAVES}`, width / 2, 40, 22);
        text(`${left} left`, width / 2, 64, 16);
      }

      // Big banners.
      if (waves.phase === 'cleared') {
        text('Level 0 cleared', width / 2, height * 0.34, 54);
        text('Starting again from wave 1', width / 2, height * 0.34 + 38, 18);
      } else if (waves.diedTick >= 0 && seconds(state, waves.diedTick) < BANNER_SECONDS) {
        text('You were overrun', width / 2, height * 0.34, 46, WARNING);
        text(`Restarting wave ${waves.number}`, width / 2, height * 0.34 + 36, 18);
      } else if (waves.startedTick >= 0 && seconds(state, waves.startedTick) < BANNER_SECONDS) {
        const fade = Math.min(1, (BANNER_SECONDS - seconds(state, waves.startedTick)) * 1.5);
        context.globalAlpha = fade;
        text(`Wave ${waves.number}`, width / 2, height * 0.3, 54);
        context.globalAlpha = 1;
      }

      // A hint for what the body can do right now.
      let hint: string | null = null;
      if (player.cover) hint = 'In cover: Q and E peek, hold right click to rise, F to leave';
      else if (ladderInReach(player, level)) hint = 'W to climb the ladder';
      if (hint) text(hint, width / 2, height - 28, 16, 'rgba(230,233,239,0.75)');
    },
  };
}
