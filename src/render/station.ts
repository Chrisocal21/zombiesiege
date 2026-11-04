import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { config } from '../config';
import { settings } from '../client/settings';
import type { GameState } from '../game/state';
import type { Level } from '../levels/types';

const STEEL = new THREE.MeshStandardMaterial({ color: 0x3d4a3a, roughness: 0.55, metalness: 0.6 });
const DARK = new THREE.MeshStandardMaterial({ color: 0x1b1e21, roughness: 0.6, metalness: 0.6 });
const BRASS = new THREE.MeshStandardMaterial({ color: 0xc8943a, roughness: 0.3, metalness: 0.9 });

function screenTexture(kind: 'ammo' | 'shotgun', weapon?: 'shotgun' | 'ak'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext('2d')!;
  context.fillStyle = '#071109';
  context.fillRect(0, 0, 512, 256);
  context.strokeStyle = '#38e070';
  context.lineWidth = 6;
  context.strokeRect(4, 4, 504, 248);
  context.textAlign = 'center';
  context.fillStyle = '#38e070';
  context.font = '800 96px Bahnschrift, Arial Narrow, sans-serif';
  context.fillText(kind === 'shotgun' ? (weapon === 'ak' ? 'AK' : 'SHOTGUN') : 'AMMO', 256, 120);
  context.font = '700 58px Bahnschrift, Arial Narrow, sans-serif';
  context.fillStyle = '#ffd24a';
  context.fillText(`${kind === 'shotgun' ? (weapon === 'ak' ? config.stations.akCost : config.stations.shotgunCost) : config.stations.ammoCost} PTS`, 256, 200);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Wall stations: a steel locker of ammunition with a lit price screen.
export function buildStations(scene: THREE.Object3D, level: Level, glowMap: THREE.Texture): (state: GameState, time: number) => void {
  const pulses: { glow: THREE.Sprite; light: THREE.PointLight }[] = [];
  for (const station of level.stations) {
    const group = new THREE.Group();
    group.position.set(station.position.x, station.position.y, station.position.z);
    group.rotation.y = Math.atan2(station.normal.x, station.normal.z);
    scene.add(group);

    const body = new THREE.Mesh(new RoundedBoxGeometry(1.1, 1.3, 0.28, 3, 0.03), STEEL);
    body.position.z = 0.14;
    body.castShadow = body.receiveShadow = true;
    group.add(body);
    const lid = new THREE.Mesh(new RoundedBoxGeometry(1.0, 0.5, 0.06, 2, 0.02), DARK);
    lid.position.set(0, -0.32, 0.3);
    group.add(lid);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.45), new THREE.MeshBasicMaterial({ map: screenTexture(station.kind, station.weapon) }));
    screen.position.set(0, 0.3, 0.292);
    group.add(screen);
    // A row of brass rounds standing in a rack, or a short shotgun hung up in its place.
    if (station.kind === 'shotgun') {
      for (const x of [-0.04, 0.04]) {
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.7, 12), DARK);
        barrel.rotation.z = Math.PI / 2;
        barrel.position.set(x * 0, -0.3 + x, 0.36);
        group.add(barrel);
      }
      const stock = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.14, 0.05, 2, 0.015), new THREE.MeshStandardMaterial({ color: 0x4a2f1c, roughness: 0.7 }));
      stock.position.set(0.4, -0.34, 0.36);
      group.add(stock);
    }
    for (let i = 0; i < (station.kind === 'shotgun' ? 0 : 6); i++) {
      const round = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.16, 10), BRASS);
      round.position.set(-0.4 + i * 0.16, -0.32, 0.345);
      group.add(round);
    }

    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowMap, color: 0x38e070, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.4 }));
    glow.scale.setScalar(2);
    glow.position.set(0, 0.3, 0.6);
    group.add(glow);
    const light = new THREE.PointLight(0x38e070, 3, 4, 2);
    light.position.set(0, 0.3, 0.8);
    group.add(light);
    pulses.push({ glow, light });
  }

  return (state, time) => {
    const idle = state.waves.phase === 'entry' || state.waves.phase === 'lift' || state.waves.phase === 'ride' || state.waves.phase === 'won';
    const pulse = settings.reducedFlashing ? 1 : 0.75 + 0.25 * Math.sin(time * 2.5);
    for (const { glow, light } of pulses) {
      glow.material.opacity = (idle ? 0.12 : 0.4) * pulse;
      light.intensity = (idle ? 0.8 : 3) * pulse;
    }
  };
}
