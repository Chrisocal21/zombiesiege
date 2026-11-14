import * as THREE from 'three';
import type { GameState } from '../game/state';
import type { Level } from '../levels/types';

// The notes a floor has to read: a sheet of paper lying on a desk or pinned upright to a wall, with a
// faint warm glow so it can be found in the dark. Once it has been read the glow goes.

type Sync = (state: GameState, time: number) => void;

function paper(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 176;
  const context = canvas.getContext('2d')!;
  context.fillStyle = '#e6e1cf';
  context.fillRect(0, 0, 128, 176);
  context.fillStyle = '#7a1f18';
  context.fillRect(10, 10, 108, 8);
  context.fillStyle = '#4a4c50';
  for (let row = 0; row < 11; row++) context.fillRect(10, 32 + row * 12, 108 - ((row * 37) % 40), 3);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function buildNotes(scene: THREE.Object3D, level: Level): Sync {
  const notes = level.notes ?? [];
  if (notes.length === 0) return () => {};
  const map = paper();
  const material = new THREE.MeshStandardMaterial({ map, roughness: 0.9, side: THREE.DoubleSide });
  const glow = new THREE.MeshBasicMaterial({ color: 0xffd48a, transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending });
  const groups = notes.map((note, index) => {
    const group = new THREE.Group();
    group.position.set(note.position.x, note.position.y, note.position.z);
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.297), material);
    sheet.castShadow = true;
    const halo = new THREE.Mesh(new THREE.CircleGeometry(0.34, 20), glow);
    if (note.wall) {
      // Upright, facing out of the wall.
      group.rotation.y = Math.atan2(note.wall.x, note.wall.z);
      sheet.position.z = 0.012;
      halo.position.z = 0.008;
    } else {
      // Flat on the surface, turned a little from square.
      sheet.rotation.set(-Math.PI / 2, 0, 0.4 + index * 0.9);
      sheet.position.y = 0.006;
      halo.rotation.x = -Math.PI / 2;
      halo.position.y = 0.003;
    }
    const light = new THREE.PointLight(0xffd48a, 0.8, 2.6, 2);
    light.position.y = 0.3;
    group.add(sheet, halo, light);
    scene.add(group);
    return { group, halo, light };
  });
  return (state, time) => {
    groups.forEach((each, index) => {
      const unread = (state.read[index] ?? -1) < 0;
      each.halo.visible = unread;
      each.light.visible = unread;
      if (unread) each.light.intensity = 0.7 + Math.sin(time * 2.2 + index) * 0.15;
    });
  };
}
