import * as THREE from 'three';
import { config } from '../config';
import type { Player } from '../game/state';
import type { Level } from '../levels/types';

const NIGHT = 0x0b0e14;

export interface View {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
}

// Puts the camera where the player is. The renderer only reads the game state.
export function syncCamera(camera: THREE.PerspectiveCamera, player: Player): void {
  camera.position.set(player.x, config.player.eyeHeight, player.z);
  camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ');
}

export function createView(level: Level): View {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(NIGHT);
  scene.fog = new THREE.Fog(NIGHT, 6, 34);

  scene.add(new THREE.HemisphereLight(0xa8bbdd, 0x3a4048, 3.5));
  const moon = new THREE.DirectionalLight(0xc8d8f0, 3);
  moon.position.set(6, 12, 4);
  scene.add(moon);

  for (const box of level.boxes) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(box.size.x, box.size.y, box.size.z),
      new THREE.MeshLambertMaterial({ color: box.color }),
    );
    mesh.position.set(box.position.x, box.position.y, box.position.z);
    scene.add(mesh);
  }

  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
  // The camera is in the scene so the gun attached to it gets drawn.
  scene.add(camera);
  const spawn = level.playerSpawns[0];
  camera.position.set(spawn.x, spawn.y + config.player.eyeHeight, spawn.z);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { scene, camera, renderer };
}
