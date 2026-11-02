import { config } from '../config';
import type { Player } from '../game/state';

export interface Hud {
  draw(locked: boolean, player: Player): void;
}

// The HUD is a transparent 2D canvas layered over the 3D view.
export function createHud(): Hud {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none';
  document.body.appendChild(canvas);
  const context = canvas.getContext('2d')!;

  return {
    draw(locked, player) {
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
        context.fillStyle = '#e6e9ef';
        context.font = '28px sans-serif';
        context.textAlign = 'center';
        context.fillText('Click to play', width / 2, height / 2);
        context.font = '16px sans-serif';
        context.fillText(
          'WASD move, mouse look, click shoot, R reload, Esc release',
          width / 2,
          height / 2 + 36,
        );
        return;
      }

      context.fillStyle = '#e6e9ef';
      context.fillRect(width / 2 - 1, height / 2 - 8, 2, 16);
      context.fillRect(width / 2 - 8, height / 2 - 1, 16, 2);

      context.font = '28px sans-serif';
      context.textAlign = 'right';
      const text =
        player.reloadLeft > 0 ? 'Reloading' : `${player.ammo} / ${config.pistol.magazineSize}`;
      context.fillStyle = player.ammo === 0 || player.reloadLeft > 0 ? '#e0805a' : '#e6e9ef';
      context.fillText(text, width - 32, height - 32);
    },
  };
}
