import { createGameState, type GameState } from '../game/state';
import { boardBox, closeGate } from '../game/doors';
import { spawnZombie } from '../game/zombies';
import { enterLevel } from '../game/state';
import { levelForFloor } from '../levels';
import type { Level } from '../levels/types';
import type { Hud } from '../render/hud';
import type { Menu } from '../render/menu';
import type { View } from '../render/view';
import { settings } from './settings';
import { config } from '../config';

interface ReviewContext {
  level: Level; menu: Menu; hud: Hud; view: View;
  replace(next: GameState): void;
  state(): GameState;
}

export function installReview(context: ReviewContext): void {
  let scenario = '';
  const review = {
    show(name: string) {
      scenario = name;
      const state = createGameState(context.level); state.tick = 2400;
      const player = state.players[0];
      settings.cameraStyle = name.startsWith('bodycam') ? 'bodycam' : 'standard';
      player.cameraStyle = settings.cameraStyle;
      player.cameraDrop = settings.cameraStyle === 'bodycam' ? config.view.bodycamDrop : 0;
      player.x = -5; player.z = 44; player.y = context.level.ramp?.rise ?? 0;
      player.yaw = -0.3; player.pitch = -0.03;
      context.menu.close();
      if (name === 'character' || name === 'settings' || name === 'controls') context.menu.open(name);
      if (['garage', 'combat', 'map', 'aim', 'zombie-close'].includes(name) || name.includes('reload') || name.startsWith('bodycam')) {
        player.x = 0; player.z = 7; player.y = 0; player.yaw = 0.22; player.pitch = -0.04;
        state.gate.closed = true; state.gate.closedTick = 100;
        state.waves.phase = 'active'; state.waves.number = 3; state.waves.toSpawn = 8;
      }
      if (name === 'combat' || name === 'zombie-close') {
        for (const [x, z] of [[-1.3, -0.5], [3, 2], [-4, 1]]) spawnZombie(state, x, z, null);
        for (const zombie of state.zombies) zombie.yaw = Math.atan2(zombie.x - player.x, zombie.z - player.z);
        player.ammo = 6; player.lastShotTick = state.tick;
        player.lastShotEnd = { x: -1.3, y: 1.4, z: -0.5 }; player.lastShotHit = true; player.lastShotZombie = true;
      }
      if (name === 'zombie-close') {
        state.zombies = [];
        player.x = -2; player.z = 4.5; player.yaw = 0; player.pitch = -0.1;
        spawnZombie(state, -2, 2, null);
        state.zombies[0].yaw = Math.PI;
      }
      if (name.includes('reload')) {
        player.ammo = 0;
        player.reloadLeft = config.pistol.reloadSeconds * (name.includes('drop') ? 0.86 : name.includes('return') ? 0.08 : 0.43);
      }
      if (name.includes('aim')) { player.aiming = true; player.cameraDrop = 0; }
      if (name === 'vehicles') { player.x = -1; player.z = 40; player.yaw = -Math.PI / 2; }
      if (name === 'van-close') { player.x = 8; player.z = 42.7; player.yaw = -Math.PI / 2 - 0.16; player.pitch = -0.03; }
      context.replace(state);
      if (name === 'map') context.hud.toggleMap();
    },
    // A free placement, for marketing shots: where the camera is, what the gate and doors are doing,
    // and which zombies stand where.
    place(options: {
      x: number; y?: number; z: number; yaw: number; pitch?: number; aim?: boolean;
      gate?: boolean; boarded?: number[]; phase?: 'entry' | 'prep' | 'active'; wave?: number; timer?: number;
      zombies?: [number, number, number?][]; health?: number; ammo?: number; fire?: boolean; lunge?: boolean; floor?: number; menu?: 'character' | 'settings' | 'controls' | 'main';
    }) {
      const state = createGameState(context.level); state.tick = 2400;
      if (options.floor) { state.floor = options.floor; enterLevel(state, levelForFloor(options.floor)); }
      const player = state.players[0];
      settings.cameraStyle = 'standard'; player.cameraStyle = 'standard'; player.cameraDrop = 0;
      player.x = options.x; player.z = options.z; player.y = options.y ?? 0;
      player.yaw = options.yaw; player.pitch = options.pitch ?? 0;
      player.aiming = !!options.aim;
      if (options.health !== undefined) player.health = options.health;
      if (options.ammo !== undefined) player.ammo = options.ammo;
      if (options.gate) { closeGate(state); state.gate.closedTick = 100; }
      for (const index of options.boarded ?? []) {
        state.doors[index] = { boarded: true, boardedTick: 100 };
        state.level.boxes.push(boardBox(state.level.doors[index]));
      }
      state.waves.phase = options.phase ?? (options.gate ? 'active' : 'entry');
      state.waves.number = options.wave ?? 1;
      if (state.waves.phase === 'prep') state.waves.timer = options.timer ?? 18;
      if (state.waves.phase === 'active') { state.waves.toSpawn = 6; state.waves.startedTick = state.tick - 6000; }
      for (const [x, z, yaw] of options.zombies ?? []) {
        spawnZombie(state, x, z, null);
        const zombie = state.zombies[state.zombies.length - 1];
        zombie.yaw = yaw ?? Math.atan2(x - player.x, z - player.z);
        // Frozen mid-swing, so the arms are out in front of it.
        if (options.lunge) zombie.lastAttackTick = state.tick - 33;
      }
      if (options.fire) {
        player.lastShotTick = state.tick; player.lastShotHit = true; player.lastShotZombie = true;
        const target = state.zombies[0];
        if (target) player.lastShotEnd = { x: target.x, y: 1.4, z: target.z };
      }
      context.menu.close();
      if (options.menu) context.menu.open(options.menu);
      context.replace(state);
    },
    inspect() {
      return { scenario, calls: context.view.renderer.info.render.calls, triangles: context.view.renderer.info.render.triangles,
        geometries: context.view.renderer.info.memory.geometries, textures: context.view.renderer.info.memory.textures,
        menu: context.menu.screen(), cameraStyle: settings.cameraStyle, cameraFov: context.view.camera.fov, cameraDrop: context.state().players[0].cameraDrop,
        ammo: context.state().players[0].ammo, reload: context.state().players[0].reloadLeft, x: context.state().players[0].x, z: context.state().players[0].z, locked: !!document.pointerLockElement,
        canvases: document.querySelectorAll('canvas').length, phase: context.state().waves.phase };
    },
  };
  Object.assign(window, { __siegeReview: review });
}
