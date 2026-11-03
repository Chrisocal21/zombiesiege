import { config } from '../config';
import { resolveCircle } from './collision';
import { raycastBoxes } from './hitscan';
import { eyeY, type GameState, type Player } from './state';
import { weaponStats } from './weapons';
import { damageZombie } from './zombies';

export function startMelee(state: GameState, player: Player): void {
  player.meleeLeft = weaponStats(player.weapon).melee.seconds;
  player.meleeHitPending = true;
  player.lastMeleeTick = state.tick;
  player.lastMeleeContact = 'none';
  player.lastMeleeKill = false;
  player.reloadLeft = 0;
  player.aiming = false;
  player.cooldown = Math.max(player.cooldown, player.meleeLeft);
}

// One swept hit at the contact frame, rather than damage on every animation frame.
// Each candidate has its own wall test, so neither the arc nor cleave reaches through cover.
export function resolveMelee(state: GameState, player: Player): void {
  const stats = weaponStats(player.weapon).melee;
  const forward = { x: -Math.sin(player.yaw), z: -Math.cos(player.yaw) };
  const origin = { x: player.x + Math.cos(player.yaw) * player.leanOffset, y: eyeY(player),
    z: player.z - Math.sin(player.yaw) * player.leanOffset };
  const candidates = state.zombies.filter(zombie => !zombie.dead).map(zombie => {
    const dx = zombie.x - origin.x, dz = zombie.z - origin.z;
    const horizontal = Math.hypot(dx, dz);
    const aimY = origin.y + Math.tan(player.pitch) * horizontal;
    const y = Math.max(.15, Math.min(config.zombie.height - .15, aimY));
    const distance = Math.hypot(Math.max(0, horizontal - config.zombie.radius), y - origin.y);
    return { zombie, dx, dz, horizontal, y, aimY, distance };
  }).filter(hit => hit.distance <= stats.range && hit.aimY >= -.15 && hit.aimY <= config.zombie.height + .15 &&
    (hit.horizontal < .01 || (hit.dx * forward.x + hit.dz * forward.z) / hit.horizontal >= Math.cos(stats.arc)))
    .sort((a, b) => a.distance - b.distance);

  player.lastMeleeHitTick = state.tick;
  player.lastMeleeContact = 'none';
  player.lastMeleeKill = false;
  let count = 0;
  for (const hit of candidates) {
    const dy = hit.y - origin.y, distance = Math.hypot(hit.dx, dy, hit.dz) || .001;
    const direction = { x: hit.dx / distance, y: dy / distance, z: hit.dz / distance };
    if (raycastBoxes(state.level, origin, direction, Math.max(0, distance - config.zombie.radius * .5)) !== null) continue;
    damageZombie(state, hit.zombie, stats.damage);
    hit.zombie.attackCooldown = Math.max(hit.zombie.attackCooldown, player.weapon === 'bat' ? .65 : .3);
    if (hit.horizontal > .01) {
      const pushed = resolveCircle(state.level, hit.zombie.x + hit.dx / hit.horizontal * stats.push,
        hit.zombie.z + hit.dz / hit.horizontal * stats.push, config.zombie.radius, 0, config.zombie.height);
      hit.zombie.x = pushed.x; hit.zombie.z = pushed.z;
    }
    state.points[player.id] = Math.min(Number.MAX_SAFE_INTEGER, state.points[player.id] +
      (hit.zombie.dead ? config.points.perKill : config.points.perHit));
    if (count === 0) player.lastMeleeEnd = { x: origin.x + direction.x * hit.distance, y: hit.y,
      z: origin.z + direction.z * hit.distance };
    player.lastMeleeContact = 'zombie';
    player.lastMeleeKill ||= hit.zombie.dead;
    if (++count >= stats.targets) break;
  }
  if (count) return;
  const cos = Math.cos(player.pitch);
  const direction = { x: forward.x * cos, y: Math.sin(player.pitch), z: forward.z * cos };
  const wall = raycastBoxes(state.level, origin, direction, stats.range);
  player.lastMeleeContact = wall === null ? 'none' : 'wall';
  const distance = wall ?? stats.range;
  player.lastMeleeEnd = { x: origin.x + direction.x * distance, y: origin.y + direction.y * distance,
    z: origin.z + direction.z * distance };
}
