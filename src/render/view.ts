import { outfitPreviewRect } from './ui';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { settings } from '../client/settings';
import { config } from '../config';
import type { GameState } from '../game/state';
import type { Level } from '../levels/types';
import { buildWorld, type World } from './world';

const NIGHT = 0x0c1119;

export interface View {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  // The weapon and hand live in their own scene, drawn on top of the world, so they never poke through walls.
  viewScene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  // Zooms the world view: 0 is the normal view, 1 is fully aimed.
  setAim(amount: number): void;
  // Draws the world, then the weapon on top unless asked to leave it out (the title screen).
  render(showWeapon?: boolean): void;
  renderOutfitPreview(): void;
  // Call once per frame with the running time in seconds and the game state.
  animate(time: number, state: GameState): void;
  // The light on the player's shoulder.
  setFlashlight(on: boolean): void;
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
  uniform vec2 resolution;
  uniform float time;
  uniform float bloom;
  uniform float bodycam;
  uniform float reducedFlashing;
  varying vec2 vUv;
  void main() {
    vec2 offset = (vUv - 0.5) * vec2(aspect, 1.0);
    float cornerDistance = (aspect * aspect + 1.0) / 4.0;
    // Dividing keeps the corners of the frame on screen, so there is no black edge.
    offset *= (1.0 + strength * dot(offset, offset)) / (1.0 + strength * cornerDistance);
    vec2 uv = offset / vec2(aspect, 1.0) + 0.5;
    vec3 color = texture2D(frame, uv).rgb;
    vec2 fringe = (uv - 0.5) * bodycam * 0.0014;
    color.r = texture2D(frame, uv + fringe).r;
    color.b = texture2D(frame, uv - fringe).b;
    // Small highlight diffusion. Thresholding keeps dark surfaces crisp.
    vec3 glow = vec3(0.0);
    for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) {
      vec3 sampleColor = texture2D(frame, uv + vec2(float(x), float(y)) * 4.0 / resolution).rgb;
      glow += max(sampleColor - vec3(0.72), vec3(0.0));
    }
    color += glow * (0.12 * bloom);
    float vignette = (1.0 - smoothstep(0.15, 0.85, distance(vUv, vec2(0.5))));
    color *= mix(0.86 - bodycam * 0.10, 1.0, vignette);
    float grain = fract(sin(dot(gl_FragCoord.xy + fract(time), vec2(12.9898,78.233))) * 43758.5453);
    color += (grain - 0.5) * (0.003 + bodycam * 0.003) * (1.0 - reducedFlashing);
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
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
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.autoClear = false;
  renderer.info.autoReset = false;
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(NIGHT);
  scene.fog = new THREE.Fog(NIGHT, 18, 85);

  // Moonlight is the only thing that casts shadows over the whole street, and the slab over the
  // garage stops it reaching inside. The lamps add pools of colour, and the hemisphere keeps the
  // shadows from going pitch black.
  const sky = new THREE.HemisphereLight(0x6f86b8, 0x242a33, 0.65);
  scene.add(sky);
  const moon = new THREE.DirectionalLight(0xaec4ff, 1.8);
  const moonTarget = new THREE.Vector3(0, 0, 20);
  moon.target.position.copy(moonTarget);
  moon.position.copy(moonTarget).add(new THREE.Vector3(-0.3, 0.88, 0.2).multiplyScalar(55));
  moon.castShadow = true;
  moon.shadow.mapSize.set(4096, 4096);
  moon.shadow.camera.left = -42;
  moon.shadow.camera.right = 42;
  moon.shadow.camera.top = 42;
  moon.shadow.camera.bottom = -42;
  moon.shadow.camera.near = 1;
  moon.shadow.camera.far = 120;
  moon.shadow.bias = -0.0003;
  moon.shadow.normalBias = 0.04;
  scene.add(moon, moon.target);
  // A studio-style environment gives the metal something to reflect.
  const environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04);
  // Each floor has its own world, built the first time it is needed. Only the current one shows.
  const worlds = new Map<string, { root: THREE.Group; world: World }>();
  const worldFor = (floor: Level) => {
    let entry = worlds.get(floor.name);
    if (!entry) {
      const root = new THREE.Group();
      scene.add(root);
      entry = { root, world: buildWorld(root, floor, environment.texture) };
      worlds.set(floor.name, entry);
    }
    return entry;
  };
  let current = worldFor(level);
  let currentName = level.name;

  const aspect = window.innerWidth / window.innerHeight;
  const camera = new THREE.PerspectiveCamera(config.view.fieldOfView, aspect, 0.1, 130);
  const spawn = level.streetSpawns[0];
  camera.position.set(spawn.x, spawn.y + config.player.eyeHeight, spawn.z);
  scene.add(camera);

  // The flashlight rides on the right shoulder, a little below the eyes, and casts shadows. It
  // stays in the scene with its brightness at nothing when off, so switching it does not make the
  // renderer rebuild every material, and its shadow is only drawn while it is on.
  const flashlight = new THREE.SpotLight(0xfff1dc, 0, 30, 0.42, 0.55, 1.5);
  flashlight.position.set(0.18, -0.22, 0.05);
  flashlight.target.position.set(0.05, -0.35, -6);
  flashlight.castShadow = true;
  flashlight.shadow.mapSize.set(1024, 1024);
  flashlight.shadow.camera.near = 0.3;
  flashlight.shadow.bias = -0.0006;
  flashlight.shadow.autoUpdate = false;
  camera.add(flashlight, flashlight.target);
  const night = new THREE.Color(NIGHT);
  const floorAir = new THREE.Color();
  const fog = scene.fog as THREE.Fog;

  // The view camera never moves. The weapon is placed relative to it, which is the same as
  // being attached to the player's camera, but it has its own close near plane.
  const viewScene = new THREE.Scene();
  const viewCamera = new THREE.PerspectiveCamera(config.view.fieldOfView, aspect, 0.02, 10);
  viewScene.add(new THREE.HemisphereLight(0xc4d2ee, 0x2a2e36, 0.9));
  const key = new THREE.DirectionalLight(0xdde8ff, 2.2);
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
  scene.environmentIntensity = 0.2;

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
      resolution: { value: bufferSize },
      time: { value: 0 },
      bloom: { value: 1 },
      bodycam: { value: 0 },
      reducedFlashing: { value: 1 },
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

  let bodycamAmount = 0;
  return {
    scene,
    camera,
    viewScene,
    renderer,
    animate(time, state) {
      if (state.level.name !== currentName) {
        currentName = state.level.name;
        // A new floor: hide the old one and show the new.
        const next = worldFor(state.level);
        current.root.visible = false;
        next.root.visible = true;
        current = next;
      }
      current.world.update(time, state);
      lensMaterial.uniforms.time.value = time;
      // Each floor's air. A floor with its power out is murky and dark, clearing a circuit at a time.
      const air = state.level.atmosphere;
      let power = 1;
      if (state.level.objective?.kind === 'breakers') {
        const thrown = state.objective.thrown;
        power = thrown.length ? thrown.filter((tick) => tick >= 0).length / thrown.length : 1;
      }
      const dark = air && state.level.objective?.kind === 'breakers' ? 1 - power : air ? 1 : 0;
      fog.color.copy(night).lerp(floorAir.set(air?.fog ?? NIGHT), dark);
      fog.near = 18 + ((air?.fogNear ?? 18) - 18) * dark;
      fog.far = 85 + ((air?.fogFar ?? 85) - 85) * dark;
      (scene.background as THREE.Color).copy(fog.color);
      sky.intensity = 0.65 * (air?.ambient ?? 1) * (0.08 + 0.92 * power);
    },
    setFlashlight(on) {
      flashlight.intensity = on ? 38 : 0;
      flashlight.shadow.autoUpdate = on;
    },
    setAim(amount) {
      // The aimed view keeps the same proportion to the chosen field of view.
      const fieldOfView = settings.fieldOfView;
      const baseFieldOfView = settings.cameraStyle === 'bodycam' ? Math.min(115, fieldOfView + 15) : fieldOfView;
      const aimFieldOfView = fieldOfView * (config.view.aimFieldOfView / config.view.fieldOfView);
      camera.fov = baseFieldOfView + (aimFieldOfView - baseFieldOfView) * amount;
      bodycamAmount = settings.cameraStyle === 'bodycam' ? 1 - amount * 0.8 : 0;
      camera.updateProjectionMatrix();
    },
    renderOutfitPreview() {
      const rect = outfitPreviewRect(window.innerWidth, window.innerHeight);
      renderer.setScissorTest(true);
      renderer.setScissor(rect.x, window.innerHeight - rect.y - rect.h, rect.w, rect.h);
      renderer.setViewport(rect.x, window.innerHeight - rect.y - rect.h, rect.w, rect.h);
      renderer.setClearColor('#17252d', 1); renderer.clear();
      viewCamera.aspect = rect.w / rect.h; viewCamera.updateProjectionMatrix();
      renderer.render(viewScene, viewCamera);
      viewCamera.aspect = window.innerWidth / window.innerHeight; viewCamera.updateProjectionMatrix();
      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
    },
    render(showWeapon = true) {
      renderer.info.reset();
      lensMaterial.uniforms.strength.value = settings.fisheye === 0 ? 0 : Math.min(0.5, settings.fisheye + (showWeapon ? bodycamAmount * 0.16 : 0));
      lensMaterial.uniforms.bodycam.value = showWeapon ? bodycamAmount : 0;
      lensMaterial.uniforms.reducedFlashing.value = settings.reducedFlashing ? 1 : 0;
      lensMaterial.uniforms.bloom.value = settings.bloom ? 1 : 0;
      renderer.setRenderTarget(frame);
      renderer.clear();
      renderer.render(scene, camera);
      if (showWeapon) {
        renderer.clearDepth();
        renderer.render(viewScene, viewCamera);
      }
      renderer.setRenderTarget(null);
      renderer.render(lensScene, lensCamera);
    },
  };
}
