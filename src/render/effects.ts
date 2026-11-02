import * as THREE from 'three';
import { config } from '../config';
import type { Player } from '../game/state';
import type { Viewmodel } from './viewmodel';

const SPARK_COUNT = 7;
const SPARK_SECONDS = 0.22;
const SPARK_SPEED = 3.5;
const SPARK_GRAVITY = 9;
const TRAIL_LENGTH = 0.7;

// A jacketed round, as a half outline spun around its length. Base at the bottom, nose up.
const BULLET_OUTLINE: [number, number][] = [
  [0, -0.021],
  [0.0105, -0.021],
  [0.0115, -0.008],
  [0.0112, 0.004],
  [0.009, 0.013],
  [0.0045, 0.02],
  [0, 0.022],
];

interface Bullet {
  group: THREE.Group;
  trail: THREE.Mesh;
  travelled: number;
  direction: THREE.Vector3;
  end: THREE.Vector3;
  remaining: number;
  hit: boolean;
  // True when what it hits is a zombie, which bleeds instead of throwing sparks.
  blood: boolean;
}

// A thin cone behind the bullet, brightest at the bullet and fading to nothing.
function trailGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.CylinderGeometry(0.009, 0.0015, 1, 8, 1, true);
  geometry.translate(0, -0.5, 0);
  const positions = geometry.attributes.position;
  const colors = new Float32Array(positions.count * 3);
  for (let i = 0; i < positions.count; i++) {
    const glow = 1 + positions.getY(i);
    colors.set([glow, glow * 0.62, glow * 0.3], i * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

interface Spark {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
}

export interface Effects {
  // Call once per frame, after the camera and the viewmodel have been updated.
  update(player: Player, frameSeconds: number): void;
}

// The things a shot leaves in the world: a flying bullet and a burst of sparks where it lands.
export function createEffects(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  viewmodel: Viewmodel,
): Effects {
  const bulletGeometry = new THREE.LatheGeometry(
    BULLET_OUTLINE.map(([radius, height]) => new THREE.Vector2(radius, height)),
    14,
  );
  const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xd9925a });
  const glowGeometry = trailGeometry();
  const glowMaterial = new THREE.MeshBasicMaterial({
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const sparkGeometry = new THREE.BoxGeometry(0.025, 0.025, 0.025);
  const sparkMaterial = new THREE.MeshBasicMaterial({ color: 0xffd27a });
  const bloodMaterial = new THREE.MeshBasicMaterial({ color: 0x6e0d0d });
  const up = new THREE.Vector3(0, 1, 0);

  const bullets: Bullet[] = [];
  const sparks: Spark[] = [];

  let seenShotTick = -1;
  const muzzle = new THREE.Vector3();

  function fireBullet(end: THREE.Vector3, hit: boolean, blood: boolean): void {
    const direction = end.clone().sub(muzzle);
    const remaining = direction.length();
    direction.normalize();
    const group = new THREE.Group();
    group.position.copy(muzzle);
    group.quaternion.setFromUnitVectors(up, direction);
    const trail = new THREE.Mesh(glowGeometry, glowMaterial);
    trail.frustumCulled = false;
    trail.scale.y = 0.001;
    group.add(new THREE.Mesh(bulletGeometry, bulletMaterial), trail);
    scene.add(group);
    bullets.push({ group, trail, travelled: 0, direction, end, remaining, hit, blood });
  }

  function burst(at: THREE.Vector3, blood: boolean): void {
    for (let i = 0; i < SPARK_COUNT; i++) {
      const mesh = new THREE.Mesh(sparkGeometry, blood ? bloodMaterial : sparkMaterial);
      mesh.position.copy(at);
      scene.add(mesh);
      const velocity = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.2,
        Math.random() - 0.5,
      )
        .normalize()
        .multiplyScalar(SPARK_SPEED);
      sparks.push({ mesh, velocity, life: SPARK_SECONDS });
    }
  }

  return {
    update(player, frameSeconds) {
      if (player.lastShotTick !== seenShotTick) {
        seenShotTick = player.lastShotTick;
        if (seenShotTick >= 0) {
          // The muzzle is known in camera space, so move it into the world.
          camera.updateMatrixWorld();
          camera.localToWorld(viewmodel.getMuzzle(muzzle));
          const end = player.lastShotEnd;
          fireBullet(new THREE.Vector3(end.x, end.y, end.z), player.lastShotHit, player.lastShotZombie);
        }
      }

      for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        const travel = config.pistol.bulletSpeed * frameSeconds;
        if (travel >= bullet.remaining) {
          if (bullet.hit) burst(bullet.end, bullet.blood);
          scene.remove(bullet.group);
          bullets.splice(i, 1);
        } else {
          bullet.group.position.addScaledVector(bullet.direction, travel);
          bullet.remaining -= travel;
          bullet.travelled += travel;
          bullet.trail.scale.y = Math.min(bullet.travelled, TRAIL_LENGTH);
        }
      }

      for (let i = sparks.length - 1; i >= 0; i--) {
        const spark = sparks[i];
        spark.life -= frameSeconds;
        if (spark.life <= 0) {
          scene.remove(spark.mesh);
          sparks.splice(i, 1);
          continue;
        }
        spark.velocity.y -= SPARK_GRAVITY * frameSeconds;
        spark.mesh.position.addScaledVector(spark.velocity, frameSeconds);
        spark.mesh.scale.setScalar(spark.life / SPARK_SECONDS);
      }
    },
  };
}
