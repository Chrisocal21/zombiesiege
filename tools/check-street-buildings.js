// Browser check: node tools/shot.cjs --street-check --views=tools/street-views.json
import * as THREE from '/node_modules/.vite/deps/three.js';
import { buildStreetBuildings } from '/src/render/streetBuildings.ts';
import { level0 } from '/src/levels/level0.ts';
import { createGameState } from '/src/game/state.ts';
import { step } from '/src/game/update.ts';
import { raycastBoxHit } from '/src/game/hitscan.ts';

export async function checkStreetBuildings() {
  const root = new THREE.Group();
  await buildStreetBuildings(root, level0);
  root.updateMatrixWorld(true);
  const group = root.getObjectByName('Street buildings');
  const models = group.children.filter(model => model.userData.streetFrontage);
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  assert(models.length === 10, 'Missing street frontage model');
  const fronts = new Map();
  for (const model of models) {
    const lot = model.userData.streetFrontage;
    const bounds = new THREE.Box3().setFromObject(model);
    assert(Math.abs(bounds.min.y - lot.base) < 0.001, `${model.name}: wrong ground contact`);
    assert(Math.abs(model.scale.x - model.scale.y) < 0.001 && Math.abs(model.scale.y - model.scale.z) < 0.001,
      `${model.name}: distorted proportions`);
    const low = lot.front === '-z' ? bounds.min.x : bounds.min.z;
    const high = lot.front === '-z' ? bounds.max.x : bounds.max.z;
    assert(Math.abs(low - lot.from) < 0.001 && Math.abs(high - lot.to) < 0.001, `${model.name}: incorrect frontage coverage`);
    const row = fronts.get(lot.front) ?? [];
    row.push([low, high]); fronts.set(lot.front, row);
  }
  for (const [front, row] of fronts) {
    row.sort((a, b) => a[0] - b[0]);
    for (let i = 1; i < row.length; i++) assert(Math.abs(row[i][0] - row[i - 1][1]) < 0.001, `${front}: gap or overlapping lots`);
  }
  // A driver's-eye ray through either road opening must not hit a house in the carriageway.
  for (const side of [-1, 1]) {
    const ray = new THREE.Raycaster(new THREE.Vector3(side * 24, 6.5, 41), new THREE.Vector3(side, 0, 0), 0, 9.1);
    assert(ray.intersectObject(root, true).length === 0, `Building blocks the ${side < 0 ? 'west' : 'east'} road`);
    const closureRay = new THREE.Raycaster(new THREE.Vector3(side * 24, 8.9, 41), new THREE.Vector3(side, 0, 0), 0, 12);
    const closure = closureRay.intersectObject(root, true)[0];
    assert(closure && closure.distance > 9.5 && closure.distance < 10, 'Skyline is visible through the tunnel closure');
    const hit = raycastBoxHit(level0, closureRay.ray.origin, closureRay.ray.direction, 12);
    assert(hit && Math.abs(hit.distance - closure.distance) < 0.1, 'Security gate does not stop shots at its visible face');
  }
  const input = { playerId: 0, moveForward: 1, moveRight: 0, lookYaw: 0, lookPitch: 0,
    fire: false, reload: false, aim: false, lean: 0, crouch: false, jump: false,
    toggleCover: false, use: false, swap: false, toggleFreeze: false };
  const passages = [];
  for (const side of [-1, 1]) {
    const state = createGameState(level0), player = state.players[0];
    Object.assign(player, { x: side * 24, y: 4.9, z: 41, yaw: -side * Math.PI / 2 });
    for (let i = 0; i < 480; i++) step(state, [input], 1 / 120);
    assert(Math.abs(player.x) > 30 && Math.abs(player.x) < 33.3, 'Road passage or existing closure collision is incorrect');
    passages.push(player.x);
  }
  const state = createGameState(level0), player = state.players[0];
  Object.assign(player, { x: 3, y: 4.9, z: 34.6, yaw: 0 });
  for (let i = 0; i < 720; i++) step(state, [input], 1 / 120);
  assert(player.z < 10 && player.y < 0.2, 'Garage ramp approach is obstructed');
  return { frontages: models.length, continuousRows: fronts.size, proportions: 'uniform', passages, garageApproach: 'clear' };
}
