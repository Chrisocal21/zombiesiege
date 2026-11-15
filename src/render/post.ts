import * as THREE from 'three';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

// Two effects worked on the finished world frame before the lens pass puts it on screen.
// Ambient occlusion: soft darkening where surfaces meet (under cars, in corners, round crates), worked
// out from the depth of the frame alone at half size, then blurred and multiplied into the frame before
// the weapon is drawn, so the weapon is never darkened by what is behind it.
// Bloom: bright things (lamps, screens, muzzle flashes) bleed light over several sizes of blur.

const QUAD_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const SAMPLES = 12;

const AO_FRAGMENT = /* glsl */ `
  uniform sampler2D depthMap;
  uniform mat4 projection;
  uniform mat4 inverseProjection;
  uniform float far;
  varying vec2 vUv;
  vec3 viewAt(vec2 uv) {
    float depth = texture2D(depthMap, uv).x;
    vec4 clip = vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
    vec4 view = inverseProjection * clip;
    return view.xyz / view.w;
  }
  void main() {
    float depth = texture2D(depthMap, vUv).x;
    if (depth >= 0.9999) { gl_FragColor = vec4(1.0, 1.0, 0.0, 1.0); return; }
    vec3 p = viewAt(vUv);
    float distance = -p.z;
    vec2 texel = 1.0 / vec2(textureSize(depthMap, 0));
    // The surface direction from the nearer neighbour on each axis, so edges do not smear.
    vec3 left = viewAt(vUv - vec2(texel.x, 0.0)), right = viewAt(vUv + vec2(texel.x, 0.0));
    vec3 down = viewAt(vUv - vec2(0.0, texel.y)), up = viewAt(vUv + vec2(0.0, texel.y));
    vec3 dx = abs(left.z - p.z) < abs(right.z - p.z) ? p - left : right - p;
    vec3 dy = abs(down.z - p.z) < abs(up.z - p.z) ? p - down : up - p;
    vec3 normal = normalize(cross(dx, dy));
    // Samples on a spiral of about RADIUS metres round the point, turned by a per-pixel amount.
    const float RADIUS = 0.7;
    vec2 reach = RADIUS * 0.5 * vec2(projection[0][0], projection[1][1]) / distance;
    reach = min(reach, vec2(0.12));
    float turn = 6.2831853 * fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
    float sum = 0.0;
    for (int i = 0; i < ${SAMPLES}; i++) {
      float along = (float(i) + 0.5) / float(${SAMPLES});
      float angle = turn + float(i) * 2.3999632;
      vec2 uv = vUv + vec2(cos(angle), sin(angle)) * sqrt(along) * reach;
      vec3 v = viewAt(uv) - p;
      float length2 = dot(v, v);
      float inRange = 1.0 - smoothstep(RADIUS * RADIUS * 0.5, RADIUS * RADIUS, length2);
      sum += max(0.0, dot(v, normal) - 0.02 - 0.004 * distance) / (length2 + 0.015) * inRange;
    }
    float occlusion = clamp(1.0 - 0.22 * sum / float(${SAMPLES}) * RADIUS * 4.0, 0.0, 1.0);
    // Far off the depth is too coarse to trust and the fog has it anyway.
    occlusion = mix(occlusion, 1.0, smoothstep(26.0, 40.0, distance));
    gl_FragColor = vec4(occlusion, distance / far, 0.0, 1.0);
  }
`;

// Blurs the half-size occlusion across pixels of about the same depth, and multiplies it into the frame.
const APPLY_FRAGMENT = /* glsl */ `
  uniform sampler2D occlusionMap;
  uniform float strength;
  varying vec2 vUv;
  void main() {
    vec2 texel = 1.0 / vec2(textureSize(occlusionMap, 0));
    vec2 centre = texture2D(occlusionMap, vUv).xy;
    float total = 0.0, weight = 0.0;
    for (int x = -2; x <= 2; x++) for (int y = -2; y <= 2; y++) {
      vec2 tap = texture2D(occlusionMap, vUv + vec2(float(x), float(y)) * texel).xy;
      float w = max(0.0, 1.0 - abs(tap.y - centre.y) / (centre.y * 0.06 + 0.0005));
      total += tap.x * w; weight += w;
    }
    float occlusion = weight > 0.0 ? total / weight : centre.x;
    gl_FragColor = vec4(vec3(mix(1.0, occlusion, strength)), 1.0);
  }
`;

export interface Post {
  // Darkens the frame's creases. Call after the world is drawn into the frame and before the weapon.
  occlude(camera: THREE.PerspectiveCamera): void;
  // Adds the glow of bright things to the frame. Call after everything is drawn into it.
  bloom(): void;
  setSize(width: number, height: number): void;
}

export function createPost(renderer: THREE.WebGLRenderer, frame: THREE.WebGLRenderTarget): Post {
  const half = (n: number) => Math.max(1, Math.round(n / 2));
  const occlusion = new THREE.WebGLRenderTarget(half(frame.width), half(frame.height), { type: THREE.HalfFloatType, depthBuffer: false });
  const aoMaterial = new THREE.ShaderMaterial({
    vertexShader: QUAD_VERTEX,
    fragmentShader: AO_FRAGMENT,
    uniforms: {
      depthMap: { value: frame.depthTexture },
      projection: { value: new THREE.Matrix4() },
      inverseProjection: { value: new THREE.Matrix4() },
      far: { value: 130 },
    },
    depthTest: false,
    depthWrite: false,
  });
  const applyMaterial = new THREE.ShaderMaterial({
    vertexShader: QUAD_VERTEX,
    fragmentShader: APPLY_FRAGMENT,
    uniforms: { occlusionMap: { value: occlusion.texture }, strength: { value: 0.85 } },
    depthTest: false,
    depthWrite: false,
    // The frame times the occlusion.
    blending: THREE.CustomBlending,
    blendSrc: THREE.DstColorFactor,
    blendDst: THREE.ZeroFactor,
    blendSrcAlpha: THREE.ZeroFactor,
    blendDstAlpha: THREE.OneFactor,
  });
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), aoMaterial);
  quad.frustumCulled = false;
  scene.add(quad);

  // Strength, radius, threshold: only what is brighter than a lit white wall glows.
  const glow = new UnrealBloomPass(new THREE.Vector2(frame.width, frame.height), 0.32, 0.55, 1.0);

  return {
    occlude(worldCamera) {
      aoMaterial.uniforms.projection.value.copy(worldCamera.projectionMatrix);
      aoMaterial.uniforms.inverseProjection.value.copy(worldCamera.projectionMatrixInverse);
      aoMaterial.uniforms.far.value = worldCamera.far;
      quad.material = aoMaterial;
      renderer.setRenderTarget(occlusion);
      renderer.render(scene, camera);
      quad.material = applyMaterial;
      renderer.setRenderTarget(frame);
      renderer.render(scene, camera);
    },
    bloom() {
      glow.render(renderer, frame, frame, 0, false);
    },
    setSize(width, height) {
      occlusion.setSize(half(width), half(height));
      glow.setSize(width, height);
    },
  };
}
