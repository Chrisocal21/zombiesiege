import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { config } from '../config';
import type { Level } from '../levels/types';

const NIGHT = 0x0b0e14;
const FIELD_OF_VIEW = 75;

export interface View {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  // The weapon and hand live in their own scene, drawn on top of the world, so they never poke through walls.
  viewScene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  render(): void;
}

export interface CameraPose {
  x: number;
  z: number;
  yaw: number;
  pitch: number;
}

// Puts the camera at a pose worked out from the game state. The renderer only reads the state.
export function syncCamera(camera: THREE.PerspectiveCamera, pose: CameraPose): void {
  camera.position.set(pose.x, config.player.eyeHeight, pose.z);
  camera.rotation.set(pose.pitch, pose.yaw, 0, 'YXZ');
}

export function createView(level: Level): View {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.autoClear = false;
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

  const aspect = window.innerWidth / window.innerHeight;
  const camera = new THREE.PerspectiveCamera(FIELD_OF_VIEW, aspect, 0.1, 100);
  const spawn = level.playerSpawns[0];
  camera.position.set(spawn.x, spawn.y + config.player.eyeHeight, spawn.z);

  // The view camera never moves. The weapon is placed relative to it, which is the same as
  // being attached to the player's camera, but it has its own close near plane.
  const viewScene = new THREE.Scene();
  const viewCamera = new THREE.PerspectiveCamera(FIELD_OF_VIEW, aspect, 0.02, 10);
  viewScene.add(new THREE.HemisphereLight(0xc4d2ee, 0x2a2e36, 1.4));
  const key = new THREE.DirectionalLight(0xdde8ff, 3);
  key.position.set(-1, 2, 1);
  viewScene.add(key);
  // A studio-style environment gives the metal something to reflect.
  const environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04);
  viewScene.environment = environment.texture;
  viewScene.environmentIntensity = 0.4;

  window.addEventListener('resize', () => {
    const newAspect = window.innerWidth / window.innerHeight;
    camera.aspect = newAspect;
    camera.updateProjectionMatrix();
    viewCamera.aspect = newAspect;
    viewCamera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return {
    scene,
    camera,
    viewScene,
    renderer,
    render() {
      renderer.clear();
      renderer.render(scene, camera);
      renderer.clearDepth();
      renderer.render(viewScene, viewCamera);
    },
  };
}
