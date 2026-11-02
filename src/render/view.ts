import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { config } from '../config';
import type { GameState } from '../game/state';
import type { Level } from '../levels/types';
import { buildWorld } from './world';

const NIGHT = 0x0c1119;

export interface View {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  // The weapon and hand live in their own scene, drawn on top of the world, so they never poke through walls.
  viewScene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  // Zooms the world view: 0 is the normal view, 1 is fully aimed.
  setAim(amount: number): void;
  render(): void;
  // Call once per frame with the running time in seconds and the game state.
  animate(time: number, state: GameState): void;
}

// The finished frame is drawn through this as a final step, bending it like a slight fisheye lens.
const LENS_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;
const LENS_FRAGMENT = /* glsl */ `
  uniform sampler2D frame;
  uniform float aspect;
  uniform float strength;
  varying vec2 vUv;
  void main() {
    vec2 offset = (vUv - 0.5) * vec2(aspect, 1.0);
    float cornerDistance = (aspect * aspect + 1.0) / 4.0;
    // Dividing keeps the corners of the frame on screen, so there is no black edge.
    offset *= (1.0 + strength * dot(offset, offset)) / (1.0 + strength * cornerDistance);
    gl_FragColor = texture2D(frame, offset / vec2(aspect, 1.0) + 0.5);
    #include <colorspace_fragment>
  }
`;

export interface CameraPose {
  x: number;
  // Height of the eyes above the floor.
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  // Tilt to the side, in radians, used when leaning.
  roll: number;
}

// Puts the camera at a pose worked out from the game state. The renderer only reads the state.
export function syncCamera(camera: THREE.PerspectiveCamera, pose: CameraPose): void {
  camera.position.set(pose.x, pose.y, pose.z);
  camera.rotation.set(pose.pitch, pose.yaw, pose.roll, 'YXZ');
}

export function createView(level: Level): View {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.autoClear = false;
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(NIGHT);
  scene.fog = new THREE.Fog(NIGHT, 8, 42);

  // Moonlight is the only thing that casts shadows across the whole yard. The lamps add pools of
  // colour, and the hemisphere keeps the shadows from going pitch black.
  scene.add(new THREE.HemisphereLight(0x6f86b8, 0x242a33, 1.1));
  const moon = new THREE.DirectionalLight(0xaec4ff, 2.2);
  moon.position.set(-12, 18, 10.5);
  moon.castShadow = true;
  moon.shadow.mapSize.set(4096, 4096);
  moon.shadow.camera.left = -17;
  moon.shadow.camera.right = 17;
  moon.shadow.camera.top = 17;
  moon.shadow.camera.bottom = -17;
  moon.shadow.camera.near = 1;
  moon.shadow.camera.far = 60;
  moon.shadow.bias = -0.0003;
  moon.shadow.normalBias = 0.03;
  scene.add(moon);
  // A studio-style environment gives the metal something to reflect.
  const environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04);
  const world = buildWorld(scene, level, environment.texture);

  const aspect = window.innerWidth / window.innerHeight;
  const camera = new THREE.PerspectiveCamera(config.view.fieldOfView, aspect, 0.1, 130);
  const spawn = level.playerSpawns[0];
  camera.position.set(spawn.x, spawn.y + config.player.eyeHeight, spawn.z);

  // The view camera never moves. The weapon is placed relative to it, which is the same as
  // being attached to the player's camera, but it has its own close near plane.
  const viewScene = new THREE.Scene();
  const viewCamera = new THREE.PerspectiveCamera(config.view.fieldOfView, aspect, 0.02, 10);
  viewScene.add(new THREE.HemisphereLight(0xc4d2ee, 0x2a2e36, 1.4));
  const key = new THREE.DirectionalLight(0xdde8ff, 3);
  // The light is aimed at where the weapon sits, with a shadow area just big enough to cover it.
  key.position.set(-0.8, 1.6, 0.4);
  key.target.position.set(0.2, -0.2, -0.6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -0.6;
  key.shadow.camera.right = 0.6;
  key.shadow.camera.top = 0.6;
  key.shadow.camera.bottom = -0.6;
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 4;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.004;
  viewScene.add(key, key.target);
  viewScene.environment = environment.texture;
  viewScene.environmentIntensity = 0.4;
  // The yard gets the same reflections, much fainter, so the metal and the puddles pick up a sky.
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.1;

  // Both scenes are drawn into this, then the lens pass puts it on screen.
  const bufferSize = renderer.getDrawingBufferSize(new THREE.Vector2());
  const frame = new THREE.WebGLRenderTarget(bufferSize.x, bufferSize.y, {
    samples: 4,
    type: THREE.HalfFloatType,
  });
  const lensMaterial = new THREE.ShaderMaterial({
    vertexShader: LENS_VERTEX,
    fragmentShader: LENS_FRAGMENT,
    uniforms: {
      frame: { value: frame.texture },
      aspect: { value: aspect },
      strength: { value: config.view.fisheye },
    },
    depthTest: false,
    depthWrite: false,
  });
  const lensScene = new THREE.Scene();
  const lensCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const lensQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), lensMaterial);
  lensQuad.frustumCulled = false;
  lensScene.add(lensQuad);

  window.addEventListener('resize', () => {
    const newAspect = window.innerWidth / window.innerHeight;
    camera.aspect = newAspect;
    camera.updateProjectionMatrix();
    viewCamera.aspect = newAspect;
    viewCamera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.getDrawingBufferSize(bufferSize);
    frame.setSize(bufferSize.x, bufferSize.y);
    lensMaterial.uniforms.aspect.value = newAspect;
  });

  return {
    scene,
    camera,
    viewScene,
    renderer,
    animate: (time, state) => world.update(time, state),
    setAim(amount) {
      const { fieldOfView, aimFieldOfView } = config.view;
      camera.fov = fieldOfView + (aimFieldOfView - fieldOfView) * amount;
      camera.updateProjectionMatrix();
    },
    render() {
      renderer.setRenderTarget(frame);
      renderer.clear();
      renderer.render(scene, camera);
      renderer.clearDepth();
      renderer.render(viewScene, viewCamera);
      renderer.setRenderTarget(null);
      renderer.render(lensScene, lensCamera);
    },
  };
}
