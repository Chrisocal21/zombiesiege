import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { extname } from 'node:path';

// Vite resolves extensionless TypeScript imports; Node needs the extension for this check.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && !extname(specifier)) {
      try {
        return nextResolve(`${specifier}.ts`, context);
      } catch (error) {
        if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
        return nextResolve(`${specifier}/index.ts`, context);
      }
    }
    return nextResolve(specifier, context);
  },
});

const { config } = await import('../src/config.ts');
const { changePoints, spawnAmmo, spawnWeapon } = await import('../src/game/admin.ts');
const { createGameState, createPlayer } = await import('../src/game/state.ts');
const { step } = await import('../src/game/update.ts');
const { WEAPON_IDS, swapWeapon, weaponStats } = await import('../src/game/weapons.ts');
const { spawnZombie } = await import('../src/game/zombies.ts');
const { level0 } = await import('../src/levels/level0.ts');

const state = createGameState(level0);
const player = state.players[0];
assert.deepEqual(WEAPON_IDS.map((weapon) => weaponStats(weapon).name), ['P9 PISTOL', 'SAWED-OFF']);
assert.throws(() => weaponStats('invalid'), /Unknown weapon/);

assert.equal(changePoints(state, 0, 1200).ok, true);
assert.equal(state.points[0], 1200);
assert.equal(changePoints(state, 0, -250).ok, true);
assert.equal(state.points[0], 950);
assert.match(changePoints(state, 0, -1000).message, /Removed 950/);
assert.equal(state.points[0], 0);
for (const amount of [0, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
  assert.equal(changePoints(state, 0, amount).ok, false);
  assert.equal(state.points[0], 0);
}
assert.equal(changePoints(state, 9, 1).ok, false);
state.points[0] = Number.MAX_SAFE_INTEGER - 1;
assert.equal(changePoints(state, 0, 2).ok, false);
assert.equal(state.points[0], Number.MAX_SAFE_INTEGER - 1);
state.points[0] = 0;

assert.equal(spawnAmmo(player, 'shotgun', 1).ok, false);
player.ammo = 7;
player.reserve = 13;
player.reloadLeft = 1;
assert.equal(spawnWeapon(player, 'shotgun').ok, true);
assert.equal(player.weapon, 'pistol');
assert.equal(player.ammo, 7);
assert.equal(player.reserve, 13);
assert.equal(player.reloadLeft, 1);
assert.deepEqual(player.stowed, { weapon: 'shotgun', ammo: 2, reserve: 12 });
const beforeDuplicate = structuredClone(player);
assert.equal(spawnWeapon(player, 'shotgun').ok, false);
assert.deepEqual(player, beforeDuplicate);

for (const amount of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
  assert.equal(spawnAmmo(player, 'pistol', amount).ok, false);
  assert.equal(player.reserve, 13);
}
assert.equal(spawnAmmo(player, 'pistol', 8).ok, true);
assert.equal(player.reserve, 21);
assert.equal(spawnAmmo(player, 'shotgun', 5).ok, true);
assert.equal(player.stowed.reserve, 17);
assert.match(spawnAmmo(player, 'shotgun', 100).message, /Added 7 rounds/);
assert.equal(player.stowed.reserve, weaponStats('shotgun').reserveMax);
assert.equal(spawnAmmo(player, 'shotgun', 1).ok, false);
assert.equal(state.points[0], 0);

swapWeapon(player, state.tick);
assert.equal(player.weapon, 'shotgun');
assert.equal(player.reserve, weaponStats('shotgun').reserveMax);
assert.equal(player.stowed.weapon, 'pistol');
assert.equal(player.stowed.ammo, 7);
assert.equal(player.stowed.reserve, 21);
assert.equal(spawnAmmo(player, 'pistol', 4).ok, true);
swapWeapon(player, state.tick);
assert.equal(player.weapon, 'pistol');
assert.equal(player.ammo, 7);
assert.equal(player.reserve, 25);

const full = createPlayer(0, { x: 0, y: 0, z: 0 });
full.stowed = { weapon: 'pistol', ammo: 1, reserve: 2 };
const beforeFull = structuredClone(full);
assert.equal(spawnWeapon(full, 'shotgun').ok, false);
assert.deepEqual(full, beforeFull);

const live = createGameState(level0);
live.frozen = true;
const gunner = live.players[0];
assert.equal(spawnWeapon(gunner, 'shotgun').ok, true);
assert.equal(spawnAmmo(gunner, 'shotgun', 9).ok, true);
const neutral = {
  playerId: 0, moveForward: 0, moveRight: 0, lookYaw: 0, lookPitch: 0,
  fire: false, reload: false, aim: false, lean: 0, crouch: false, jump: false,
  toggleCover: false, use: false, swap: false, toggleFreeze: false,
};
const tick = 1 / config.ticksPerSecond;
step(live, [{ ...neutral, swap: true }], tick);
for (let i = 0; i < config.ticksPerSecond; i++) step(live, [neutral], tick);
step(live, [{ ...neutral, fire: true }], tick);
assert.equal(gunner.weapon, 'shotgun');
assert.equal(gunner.ammo, 1);
assert.equal(gunner.reserve, 21);
step(live, [{ ...neutral, reload: true }], tick);
for (let i = 0; i < Math.ceil(config.shotgun.reloadSeconds * config.ticksPerSecond) + 1; i++) step(live, [neutral], tick);
assert.equal(gunner.ammo, 2);
assert.equal(gunner.reserve, 20);

const scoring = createGameState(level0);
scoring.frozen = true;
scoring.level.boxes = [];
const shooter = scoring.players[0];
Object.assign(shooter, { x: 0, y: 0, z: 5, yaw: 0, pitch: 0, onGround: true });
spawnZombie(scoring, 0, 3, null);
step(scoring, [{ ...neutral, fire: true }], tick);
assert.equal(shooter.lastShotZombie, true);
const earned = shooter.lastShotHead ? config.points.perHeadshot : shooter.lastShotKill ? config.points.perKill : config.points.perHit;
assert.equal(scoring.points[0], earned);
assert.equal(changePoints(scoring, 0, Number.MAX_SAFE_INTEGER - earned).ok, true);
spawnZombie(scoring, 0, 3, null);
shooter.cooldown = 0;
step(scoring, [{ ...neutral, fire: true }], tick);
assert.equal(shooter.lastShotZombie, true);
assert.equal(scoring.points[0], Number.MAX_SAFE_INTEGER);
assert.equal(changePoints(scoring, 0, -1).ok, true);
assert.equal(scoring.points[0], Number.MAX_SAFE_INTEGER - 1);

const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
};
const { bindings, loadBindings, rebind, resetBindings } = await import('../src/client/bindings.ts');
const storageKey = 'zombiesiege.bindings';
resetBindings();
const defaults = { ...bindings };
assert.equal(defaults.pause, 'KeyP');
assert.equal(defaults.freeze, 'KeyO');

const old = { ...defaults, freeze: 'KeyP' };
delete old.pause;
storage.set(storageKey, JSON.stringify(old));
loadBindings();
assert.equal(bindings.pause, 'KeyP');
assert.equal(bindings.freeze, 'KeyO');
assert.equal(JSON.parse(storage.get(storageKey)).pause, 'KeyP');

resetBindings();
const occupiedFreezeKey = { ...defaults, freeze: 'KeyP', map: 'KeyO' };
delete occupiedFreezeKey.pause;
storage.set(storageKey, JSON.stringify(occupiedFreezeKey));
loadBindings();
assert.equal(bindings.pause, 'KeyP');
assert.notEqual(bindings.freeze, 'KeyP');
assert.notEqual(bindings.freeze, 'KeyO');
assert.equal(bindings.map, 'KeyO');
assert.equal(new Set(Object.values(bindings)).size, Object.keys(bindings).length);

resetBindings();
const custom = { ...defaults, use: 'KeyP', freeze: 'KeyJ', map: 'KeyO' };
delete custom.pause;
storage.set(storageKey, JSON.stringify(custom));
loadBindings();
assert.equal(bindings.pause, 'KeyP');
assert.equal(bindings.use, 'KeyE');
assert.equal(bindings.freeze, 'KeyJ');
assert.equal(bindings.map, 'KeyO');

resetBindings();
storage.set(storageKey, JSON.stringify({ ...defaults, pause: 'KeyU', freeze: 'KeyP' }));
loadBindings();
assert.equal(bindings.pause, 'KeyU');
assert.equal(bindings.freeze, 'KeyP');

resetBindings();
rebind('pause', 'KeyQ');
assert.equal(bindings.pause, 'KeyQ');
assert.equal(bindings.leanLeft, 'KeyP');
assert.equal(new Set(Object.values(bindings)).size, Object.keys(bindings).length);

console.log('PASS: points, inventory, shooting/reloading, weapon swapping, and binding migration');
