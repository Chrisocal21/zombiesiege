import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { config } from '../config';
import type { GameState } from '../game/state';
import type { Level } from '../levels/types';
import { asphaltMaterial, hazardMaterial, labelTexture, shutterMaterial, streetDecalTexture } from './streetTextures';

const STEEL = new THREE.MeshStandardMaterial({ color: 0x5f646b, roughness: 0.5, metalness: 0.8 });
const DARK_STEEL = new THREE.MeshStandardMaterial({ color: 0x1f2226, roughness: 0.55, metalness: 0.6 });

// How many of the street lamps carry a real light. The rest only glow, which is far cheaper.
const REAL_STREET_LIGHTS = 3;

function glowSprite(map: THREE.Texture, color: number, scale: number, opacity: number): THREE.Sprite {
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map, color, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity }),
  );
  sprite.scale.setScalar(scale);
  return sprite;
}

// The street outside: paving and road paint over the slab, lamp posts, the sign over the ramp,
// handrails along it, and fire hydrants.
export function buildStreet(scene: THREE.Scene, level: Level, glowMap: THREE.Texture): void {
  const street = level.ramp.rise;
  const { ramp } = level;

  // Paint over the slab.
  const x0 = -34;
  const z0 = 10.5;
  const width = 68;
  const depth = 37.5;
  const decal = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshStandardMaterial({
      map: streetDecalTexture(x0, z0, width, depth, ramp),
      transparent: true,
      roughness: 0.92,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    }),
  );
  decal.rotation.x = -Math.PI / 2;
  decal.position.set(x0 + width / 2, street + 0.003, z0 + depth / 2);
  decal.receiveShadow = true;
  scene.add(decal);

  // The ramp itself, one smooth slope. The rules walk it as small steps, so this sits right on them.
  const slope = new THREE.BufferGeometry();
  const left = ramp.x - ramp.width / 2;
  const right = ramp.x + ramp.width / 2;
  slope.setAttribute(
    'position',
    new THREE.BufferAttribute(
      new Float32Array([left, 0, ramp.zBottom, right, 0, ramp.zBottom, right, street, ramp.zTop, left, street, ramp.zTop]),
      3,
    ),
  );
  const length = Math.hypot(ramp.zTop - ramp.zBottom, street);
  slope.setAttribute(
    'uv',
    new THREE.BufferAttribute(new Float32Array([0, 0, ramp.width / 3, 0, ramp.width / 3, length / 3, 0, length / 3]), 2),
  );
  slope.setIndex([0, 2, 1, 0, 3, 2]);
  slope.computeVertexNormals();
  const slopeMaterial = asphaltMaterial();
  const ramps = new THREE.Mesh(slope, slopeMaterial);
  ramps.receiveShadow = true;
  scene.add(ramps);
  // Painted edge lines and cross ribs, so the slope reads as a ramp.
  const rise = street / (ramp.zTop - ramp.zBottom);
  const tilt = Math.atan(rise);
  const paint = new THREE.MeshStandardMaterial({ color: 0xd8b02a, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2 });
  for (const side of [-1, 1]) {
    const line = new THREE.Mesh(new THREE.PlaneGeometry(0.14, length), paint);
    line.rotation.x = -Math.PI / 2 + tilt;
    line.position.set(ramp.x + side * (ramp.width / 2 - 0.25), street / 2 + 0.015, (ramp.zBottom + ramp.zTop) / 2);
    scene.add(line);
  }
  const rib = new THREE.MeshStandardMaterial({ color: 0x1c1d20, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2 });
  for (let z = ramp.zBottom + 1.5; z < ramp.zTop; z += 1.5) {
    const groove = new THREE.Mesh(new THREE.PlaneGeometry(ramp.width, 0.08), rib);
    groove.rotation.x = -Math.PI / 2 + tilt;
    groove.position.set(ramp.x, (street * (z - ramp.zBottom)) / (ramp.zTop - ramp.zBottom) + 0.015, z);
    scene.add(groove);
  }

  // Lamp posts, each with a pool of light on the ground.
  level.streetLamps.forEach((lamp, index) => {
    const group = new THREE.Group();
    group.position.set(lamp.x, lamp.y, lamp.z);
    // The arm reaches toward the middle of the road.
    group.rotation.y = lamp.z > 40 ? 0 : Math.PI;

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 7, 10), DARK_STEEL);
    pole.position.y = 3.5;
    pole.castShadow = true;
    group.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 1.6), DARK_STEEL);
    arm.position.set(0, 7, -0.7);
    group.add(arm);
    const head = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.12, 0.7, 2, 0.04), DARK_STEEL);
    head.position.set(0, 6.95, -1.4);
    group.add(head);
    const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.02, 0.58), new THREE.MeshBasicMaterial({ color: 0xffc27a }));
    bulb.position.set(0, 6.88, -1.4);
    group.add(bulb);
    const glow = glowSprite(glowMap, 0xffb060, 3.4, 0.75);
    glow.position.set(0, 6.8, -1.4);
    group.add(glow);

    const pool = new THREE.Mesh(
      new THREE.PlaneGeometry(11, 11),
      new THREE.MeshBasicMaterial({ map: glowMap, color: 0xff9a4a, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.2 }),
    );
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(0, 0.02, -1.4);
    group.add(pool);

    if (index < REAL_STREET_LIGHTS) {
      const light = new THREE.PointLight(0xffa860, 150, 30, 2);
      light.position.set(0, 6.4, -1.4);
      group.add(light);
    }
    scene.add(group);
  });

  // The sign over the top of the ramp, held on two posts.
  const signZ = ramp.zTop + 0.8;
  const reach = ramp.width / 2 + 1.1;
  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(new RoundedBoxGeometry(0.3, 5.4, 0.3, 2, 0.03), STEEL);
    post.position.set(ramp.x + side * reach, street + 2.7, signZ);
    post.castShadow = true;
    scene.add(post);
  }
  const sign = new THREE.Mesh(
    new RoundedBoxGeometry(2 * reach + 0.4, 1.7, 0.18, 2, 0.04),
    new THREE.MeshStandardMaterial({ color: 0x14261b, roughness: 0.5, metalness: 0.3 }),
  );
  sign.position.set(ramp.x, street + 4.6, signZ);
  sign.castShadow = true;
  scene.add(sign);
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(2 * reach, 1.5),
    new THREE.MeshBasicMaterial({
      map: labelTexture(
        [
          { text: 'PARKING  B1', size: 120, color: '#ffffff' },
          { text: 'LOADING DOCK  ▼', size: 60, color: '#ffd24a' },
        ],
        '#0f3a24',
        1024,
        256,
        '#ffffff',
      ),
    }),
  );
  face.position.set(ramp.x, street + 4.6, signZ + 0.1);
  scene.add(face);
  const signGlow = glowSprite(glowMap, 0x9affc0, 9, 0.16);
  signGlow.position.set(ramp.x, street + 4.6, signZ + 0.6);
  scene.add(signGlow);

  // Handrails along both edges of the ramp.
  const railLength = ramp.zTop - ramp.zBottom;
  for (const side of [-1, 1]) {
    const x = ramp.x + side * (ramp.width / 2 + 0.25);
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, railLength, 8), STEEL);
    rail.rotation.x = Math.PI / 2;
    rail.position.set(x, street + 1.0, (ramp.zBottom + ramp.zTop) / 2);
    rail.castShadow = true;
    scene.add(rail);
    for (let z = ramp.zBottom + 0.5; z <= ramp.zTop; z += 2) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 8), STEEL);
      post.position.set(x, street + 0.5, z);
      scene.add(post);
    }
  }

  // Fire hydrants.
  const hydrantMaterial = new THREE.MeshStandardMaterial({ color: 0xa81f1f, roughness: 0.5, metalness: 0.3 });
  for (const [x, z] of [[-6, 34.8], [16, 34.8], [-22, 47.3]]) {
    const hydrant = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.17, 0.62, 12), hydrantMaterial);
    body.position.y = 0.31;
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), hydrantMaterial);
    cap.position.y = 0.62;
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.4, 8), hydrantMaterial);
    nozzle.rotation.z = Math.PI / 2;
    nozzle.position.y = 0.42;
    for (const part of [body, cap, nozzle]) part.castShadow = true;
    hydrant.add(body, cap, nozzle);
    hydrant.position.set(x, street, z);
    scene.add(hydrant);
  }
}

// The gate across the foot of the ramp, and the control that closes it.
export function buildGate(scene: THREE.Scene, level: Level, glowMap: THREE.Texture): (state: GameState, time: number) => void {
  const gate = level.gate;
  const facing = Math.atan2(gate.normal.x, gate.normal.z);
  const group = new THREE.Group();
  group.position.set(gate.position.x + gate.normal.x * 0.25, 0, gate.position.z + gate.normal.z * 0.25);
  group.rotation.y = facing;
  scene.add(group);

  const frameMaterial = new THREE.MeshStandardMaterial({ color: 0xb59a2e, roughness: 0.55, metalness: 0.35 });
  for (const side of [-1, 1]) {
    const jamb = new THREE.Mesh(new RoundedBoxGeometry(0.3, gate.height + 0.3, 0.2, 2, 0.03), frameMaterial);
    jamb.position.set(side * (gate.width / 2 + 0.15), (gate.height + 0.3) / 2, 0.1);
    jamb.castShadow = true;
    group.add(jamb);
  }
  const housing = new THREE.Mesh(new RoundedBoxGeometry(gate.width + 0.6, 0.4, 0.3, 2, 0.04), DARK_STEEL);
  housing.position.set(0, gate.height + 0.15, 0.12);
  housing.castShadow = true;
  group.add(housing);
  const stripe = hazardMaterial();
  stripe.map!.wrapS = stripe.map!.wrapT = THREE.RepeatWrapping;
  stripe.map!.repeat.set(gate.width * 1.2, 0.3);
  const stripeBar = new THREE.Mesh(new THREE.BoxGeometry(gate.width + 0.6, 0.12, 0.02), stripe);
  stripeBar.position.set(0, gate.height + 0.15, 0.28);
  group.add(stripeBar);

  // The shutter slides down out of the beam above the opening.
  const shutterMat = shutterMaterial();
  shutterMat.map!.wrapS = shutterMat.map!.wrapT = THREE.RepeatWrapping;
  shutterMat.map!.repeat.set(gate.width / 1.5, gate.height / 1.5);
  shutterMat.bumpMap = shutterMat.map;
  const shutter = new THREE.Group();
  const slab = new THREE.Mesh(new THREE.BoxGeometry(gate.width, gate.height, 0.08), shutterMat);
  slab.position.y = gate.height / 2;
  slab.castShadow = slab.receiveShadow = true;
  shutter.add(slab);
  const foot = new THREE.Mesh(new RoundedBoxGeometry(gate.width, 0.18, 0.14, 2, 0.02), hazardMaterial());
  foot.position.y = 0.09;
  shutter.add(foot);
  // The shutter slides inside the wall, on its center line, so raised it is hidden in the beam.
  shutter.position.z = -0.25;
  group.add(shutter);
  const hidden = gate.height + 0.3;

  // The control panel on the wall beside the gate.
  const panel = new THREE.Group();
  panel.position.set(gate.panel.x, gate.panel.y, gate.panel.z + 0.38);
  panel.rotation.y = facing;
  const box = new THREE.Mesh(new RoundedBoxGeometry(0.4, 0.55, 0.14, 2, 0.03), DARK_STEEL);
  box.castShadow = true;
  panel.add(box);
  const lamp = new THREE.MeshBasicMaterial({ color: 0x38e070 });
  const indicator = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.02), lamp);
  indicator.position.set(0, 0.12, 0.075);
  panel.add(indicator);
  const lever = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.2, 0.06, 2, 0.02), new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.4 }));
  lever.position.set(0, -0.08, 0.1);
  panel.add(lever);
  const glow = glowSprite(glowMap, 0x38e070, 0.9, 0.6);
  glow.position.set(0, 0.12, 0.2);
  panel.add(glow);
  scene.add(panel);

  return (state, time) => {
    const closeTicks = config.doors.gateSeconds * config.ticksPerSecond;
    const progress = state.gate.closed ? Math.min(1, (state.tick - state.gate.closedTick) / closeTicks) : 0;
    const eased = 1 - (1 - progress) * (1 - progress);
    shutter.position.y = hidden * (1 - eased);
    // Green and pulsing while the gate is open and waiting, red once it is shut.
    if (state.gate.closed) {
      lamp.color.setHex(0xe03a2a);
      glow.material.color.setHex(0xe03a2a);
      glow.material.opacity = 0.35;
      lever.rotation.x = 0.8;
    } else {
      const pulse = 0.55 + 0.45 * Math.sin(time * 4);
      lamp.color.setRGB(0.22 * pulse, 0.88 * pulse, 0.44 * pulse);
      glow.material.color.setHex(0x38e070);
      glow.material.opacity = 0.25 + 0.4 * pulse;
      lever.rotation.x = -0.5;
    }
  };
}
