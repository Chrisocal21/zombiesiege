import { config } from '../config';
import type { Ladder, Level } from '../levels/types';
import { boxTop, ceilingHeight, groundHeight, ledgeAt, resolveCircle } from './collision';
import { raycastBoxHit } from './hitscan';
import type { InputMessage } from './inputs';
import type { Player } from './state';

const SIDES = [
  { x: 1, z: 0 },
  { x: -1, z: 0 },
  { x: 0, z: 1 },
  { x: 0, z: -1 },
];

// How far in front of the body a jump looks for a ledge to grab.
const LEDGE_GRAB_DISTANCE = 0.3;
// How far onto the ledge the player ends up, measured from the edge.
const LEDGE_STAND_DEPTH = 0.45;
// How far from the wall a ladder can be grabbed.
const LADDER_GRAB_DISTANCE = 0.4;
// Where on the body the cover check looks, above the feet.
const CHEST = 0.9;

const smooth = (t: number) => t * t * (3 - 2 * t);

// Everything about where the body is: crouching, cover, ladders, climbing, walking, jumping and
// falling. Runs once per tick for each player.
export function moveBody(player: Player, input: InputMessage, dt: number, level: Level): void {
  if (player.mantle) {
    pullUp(player, dt);
    return;
  }
  if (player.ladder) {
    climbLadder(player, input, dt, level);
    return;
  }

  if (input.toggleCover) toggleCover(player, level);
  if (player.cover) keepCover(player, level);
  crouch(player, input, dt);
  if (grabLadder(player, input, level)) return;

  walk(player, input, dt, level);
  if (input.jump && grabLedge(player, level)) return;
  fall(player, input, dt, level);
}

function crouch(player: Player, input: InputMessage, dt: number): void {
  // Behind a low barrier you duck on your own, and stand up to shoot over it by aiming.
  const lowCover = player.cover && player.coverTop - player.y < config.player.eyeHeight + 0.05;
  const target = input.crouch || (lowCover && !player.aiming) ? 1 : 0;
  const step = dt / config.player.crouchSeconds;
  player.crouch += Math.max(-step, Math.min(step, target - player.crouch));
}

function walk(player: Player, input: InputMessage, dt: number, level: Level): void {
  const { moveSpeed, aimMoveMultiplier, crouchMoveMultiplier, coverMoveMultiplier } = config.player;
  let targetX = 0;
  let targetZ = 0;
  const length = Math.hypot(input.moveForward, input.moveRight);
  if (length > 0) {
    // Dividing by length keeps diagonal movement from being faster.
    const forward = input.moveForward / Math.max(length, 1);
    const right = input.moveRight / Math.max(length, 1);
    const sin = Math.sin(player.yaw);
    const cos = Math.cos(player.yaw);
    let speed = moveSpeed;
    if (player.aiming) speed *= aimMoveMultiplier;
    speed *= 1 - player.crouch * (1 - crouchMoveMultiplier);
    if (player.cover) speed *= coverMoveMultiplier;
    if (player.carrying >= 0) speed *= config.objectives.carryMoveMultiplier;
    targetX = (-sin * forward + cos * right) * speed;
    targetZ = (-cos * forward + -sin * right) * speed;
  }

  if (player.cover) {
    // Walking away from the surface leaves cover. Otherwise you only slide along it.
    const normal = player.coverNormal;
    const away = targetX * normal.x + targetZ * normal.z;
    if (away > moveSpeed * coverMoveMultiplier * 0.3) {
      player.cover = false;
    } else {
      targetX -= normal.x * away;
      targetZ -= normal.z * away;
    }
  }

  // Speed up and slow down over a short time instead of jumping.
  const dx = targetX - player.vx;
  const dz = targetZ - player.vz;
  const gap = Math.hypot(dx, dz);
  const maxChange = config.player.acceleration * dt;
  if (gap <= maxChange) {
    player.vx = targetX;
    player.vz = targetZ;
  } else {
    player.vx += (dx / gap) * maxChange;
    player.vz += (dz / gap) * maxChange;
  }

  if (player.vx === 0 && player.vz === 0) return;
  const moved = resolveCircle(
    level,
    player.x + player.vx * dt,
    player.z + player.vz * dt,
    config.player.radius,
    player.y,
    config.player.height,
  );
  // Whatever a wall stopped is taken out of the speed, so you slide along it.
  player.vx = (moved.x - player.x) / dt;
  player.vz = (moved.z - player.z) / dt;
  player.x = moved.x;
  player.z = moved.z;
}

function fall(player: Player, input: InputMessage, dt: number, level: Level): void {
  const { radius, height, jumpSpeed, gravity } = config.player;
  const ground = groundHeight(level, player.x, player.z, radius, player.y);

  if (player.onGround) {
    if (ground < player.y - 0.02 && player.y - ground > config.player.stepHeight) {
      // Walked off an edge.
      player.onGround = false;
    } else {
      // Small steps are walked straight up or down, which is what makes a ramp smooth.
      player.y = ground;
      player.vy = 0;
    }
  }

  if (input.jump && player.onGround && player.crouch < 0.5) {
    player.vy = jumpSpeed;
    player.onGround = false;
    player.cover = false;
  }

  if (player.onGround) return;
  player.vy -= gravity * dt;
  let nextY = player.y + player.vy * dt;
  if (player.vy > 0) {
    const ceiling = ceilingHeight(level, player.x, player.z, radius, player.y + height);
    if (nextY + height > ceiling) {
      nextY = ceiling - height;
      player.vy = 0;
    }
  } else if (nextY <= ground) {
    nextY = ground;
    player.vy = 0;
    player.onGround = true;
  }
  player.y = nextY;
}

// A jump facing a ledge within reach pulls the player up onto it instead of leaping.
function grabLedge(player: Player, level: Level): boolean {
  const { radius, height, climbReach } = config.player;
  const forwardX = -Math.sin(player.yaw);
  const forwardZ = -Math.cos(player.yaw);
  const reach = radius + LEDGE_GRAB_DISTANCE;

  const ledge = ledgeAt(
    level,
    player.x + forwardX * reach,
    player.z + forwardZ * reach,
    player.y + 0.5,
    player.y + climbReach,
  );
  if (!ledge) return false;

  const topY = boxTop(ledge);
  const toX = player.x + forwardX * (reach + LEDGE_STAND_DEPTH);
  const toZ = player.z + forwardZ * (reach + LEDGE_STAND_DEPTH);
  // There has to be level ground on top, with room to stand.
  if (Math.abs(groundHeight(level, toX, toZ, radius, topY) - topY) > 0.05) return false;
  const fitted = resolveCircle(level, toX, toZ, radius, topY, height);
  if (Math.hypot(fitted.x - toX, fitted.z - toZ) > 1e-6) return false;
  if (ceilingHeight(level, toX, toZ, radius, topY + 0.01) < topY + height) return false;

  player.mantle = {
    progress: 0,
    fromX: player.x,
    fromY: player.y,
    fromZ: player.z,
    toX,
    toY: topY,
    toZ,
  };
  player.vx = player.vz = player.vy = 0;
  player.onGround = false;
  player.cover = false;
  return true;
}

function pullUp(player: Player, dt: number): void {
  const mantle = player.mantle!;
  mantle.progress = Math.min(1, mantle.progress + dt / config.player.climbSeconds);
  // Up first, then forward onto the ledge.
  const up = smooth(Math.min(1, mantle.progress / 0.6));
  const forward = smooth(Math.max(0, (mantle.progress - 0.5) / 0.5));
  player.y = mantle.fromY + (mantle.toY - mantle.fromY) * up;
  player.x = mantle.fromX + (mantle.toX - mantle.fromX) * forward;
  player.z = mantle.fromZ + (mantle.toZ - mantle.fromZ) * forward;
  if (mantle.progress >= 1) {
    player.mantle = null;
    player.onGround = true;
  }
}

// The ladder the player is standing close enough to take hold of, if they are facing it.
export function ladderInReach(player: Player, level: Level): Ladder | null {
  const { radius } = config.player;
  const facingX = -Math.sin(player.yaw);
  const facingZ = -Math.cos(player.yaw);

  for (const ladder of level.ladders) {
    const normal = ladder.normal;
    const fromX = player.x - ladder.x;
    const fromZ = player.z - ladder.z;
    const distance = fromX * normal.x + fromZ * normal.z;
    const sideways = -fromX * normal.z + fromZ * normal.x;
    if (distance < 0 || distance > radius + LADDER_GRAB_DISTANCE) continue;
    if (Math.abs(sideways) > ladder.width / 2 + 0.15) continue;
    if (player.y < ladder.bottom - 0.1 || player.y > ladder.top - 0.3) continue;
    if (facingX * normal.x + facingZ * normal.z > -0.4) continue;
    return ladder;
  }
  return null;
}

// Walking into the foot of a ladder, facing it, takes hold of it.
function grabLadder(player: Player, input: InputMessage, level: Level): boolean {
  if (input.moveForward <= 0) return false;
  const ladder = ladderInReach(player, level);
  if (!ladder) return false;

  const { radius } = config.player;
  player.ladder = ladder;
  player.x = ladder.x + ladder.normal.x * (radius + 0.05);
  player.z = ladder.z + ladder.normal.z * (radius + 0.05);
  player.vx = player.vz = player.vy = 0;
  player.onGround = false;
  player.cover = false;
  return true;
}

function climbLadder(player: Player, input: InputMessage, dt: number, level: Level): void {
  const ladder = player.ladder!;
  const { radius, ladderSpeed } = config.player;
  const normal = ladder.normal;

  if (input.jump) {
    // Kick off backwards.
    player.ladder = null;
    player.vx = normal.x * 3;
    player.vz = normal.z * 3;
    player.vy = 3;
    return;
  }

  player.y += input.moveForward * ladderSpeed * dt;

  if (player.y >= ladder.top) {
    // Over the top and onto whatever the ladder leads to.
    player.y = ladder.top;
    player.x = ladder.x - normal.x * 0.6;
    player.z = ladder.z - normal.z * 0.6;
    player.ladder = null;
    player.onGround = true;
    player.vy = 0;
    return;
  }

  const ground = groundHeight(level, player.x, player.z, radius, player.y);
  if (input.moveForward < 0 && player.y <= ground) {
    player.y = ground;
    player.ladder = null;
    player.onGround = true;
  }
}

// Takes cover on the nearest surface, or leaves it. The head can then lean out without aiming.
function toggleCover(player: Player, level: Level): void {
  if (player.cover) {
    player.cover = false;
    return;
  }
  const { radius, coverGrabDistance } = config.player;
  const chest = { x: player.x, y: player.y + CHEST, z: player.z };

  let nearest: { distance: number; side: (typeof SIDES)[number]; top: number } | null = null;
  for (const side of SIDES) {
    const hit = raycastBoxHit(level, chest, { x: side.x, y: 0, z: side.z }, radius + coverGrabDistance);
    if (hit && (nearest === null || hit.distance < nearest.distance)) {
      nearest = { distance: hit.distance, side, top: boxTop(hit.box) };
    }
  }
  if (nearest === null) return;

  // Step back to the surface so the body is flat against it.
  const gap = nearest.distance - radius;
  player.x += nearest.side.x * gap;
  player.z += nearest.side.z * gap;
  player.cover = true;
  player.coverNormal = { x: -nearest.side.x, z: -nearest.side.z };
  player.coverTop = nearest.top;
  player.vx = player.vz = 0;
}

// Cover ends when the surface runs out, for example at the end of a barrier.
function keepCover(player: Player, level: Level): void {
  const { radius } = config.player;
  const chest = { x: player.x, y: player.y + CHEST, z: player.z };
  const toward = { x: -player.coverNormal.x, y: 0, z: -player.coverNormal.z };
  const hit = raycastBoxHit(level, chest, toward, radius + 0.25);
  if (hit) player.coverTop = boxTop(hit.box);
  else player.cover = false;
}
