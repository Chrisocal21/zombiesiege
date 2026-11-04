import * as THREE from 'three';
import { config } from '../config';
import { settings } from '../client/settings';
import { raycastBoxHit } from '../game/hitscan';
import type { Player } from '../game/state';
import type { Level, Surface } from '../levels/types';
import { glowTexture, paintTexture } from './materials';
import type { Viewmodel } from './viewmodel';

interface Flight {
  mesh: THREE.Mesh;
  end: THREE.Vector3;
  velocity: THREE.Vector3;
  left: number;
  hit: boolean;
  blood: boolean;
  normal: THREE.Vector3;
  surface: Surface;
}
interface Particle {
  object: THREE.Mesh | THREE.Sprite;
  velocity: THREE.Vector3;
  spin: THREE.Vector3;
  life: number;
  total: number;
  gravity: number;
  floor: number;
  bounce: boolean;
}
export interface Effects { update(player: Player, frameSeconds: number, level: Level): void; }

// All effects are cosmetic: the deterministic hitscan remains authoritative.
export function createEffects(scene: THREE.Scene, camera: THREE.PerspectiveCamera, viewmodel: Viewmodel): Effects {
  const brass = new THREE.MeshStandardMaterial({ color: '#c19a4e', metalness: 0.85, roughness: 0.29 });
  const shellGeometry = new THREE.CylinderGeometry(0.005, 0.0055, 0.022, 10);
  const debrisGeometry = new THREE.IcosahedronGeometry(0.022, 0);
  const sparkGeometry = new THREE.CylinderGeometry(0.004, 0.001, 0.1, 4);
  const dustMaterial = new THREE.MeshStandardMaterial({ color: '#8d8881', roughness: 1 });
  const woodMaterial = new THREE.MeshStandardMaterial({ color: '#a48255', roughness: 1 });
  const sparkMaterial = new THREE.MeshBasicMaterial({ color: '#ffd9a0' });
  const bloodMaterial = new THREE.MeshStandardMaterial({ color: '#641d1b', roughness: 0.6 });
  const smokeMap = glowTexture();
  const tracerGeometry = new THREE.CylinderGeometry(0.003, 0.001, 0.24, 6);
  const tracerMaterial = new THREE.MeshBasicMaterial({ color: '#ebca8b', transparent: true, opacity: 0.6, depthWrite: false });
  const scarMap = paintTexture(128, 711, (ctx, size, random) => {
    ctx.clearRect(0, 0, size, size);
    ctx.translate(size / 2, size / 2);
    for (let i = 0; i < 20; i++) {
      ctx.rotate(random() * 0.8);
      ctx.fillStyle = `rgba(13,12,10,${0.1 + random() * 0.2})`;
      ctx.beginPath(); ctx.ellipse(0, 0, 7 + random() * 16, 6 + random() * 14, 0, 0, Math.PI * 2); ctx.fill();
    }
  });
  const scarMaterial = new THREE.MeshBasicMaterial({ map: scarMap, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
  const scarGeometry = new THREE.PlaneGeometry(0.18, 0.18);
  const scars: THREE.Mesh[] = [];
  const particles: Particle[] = [];
  const flights: Flight[] = [];
  const muzzle = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  let seenShotTick = -1;
  let seenMeleeHitTick = -1;
  const shotLight = new THREE.PointLight('#ffb968', 0, 4, 2); scene.add(shotLight);
  let flashLeft = 0;

  // The weapon uses a fixed lens while ADS/bodycam change the world lens. Match the
  // screen-space muzzle before placing cosmetic particles in the world scene.
  function weaponToWorld(point: THREE.Vector3): THREE.Vector3 {
    const ratio = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / Math.tan(THREE.MathUtils.degToRad(config.view.fieldOfView / 2));
    point.x *= ratio; point.y *= ratio;
    return camera.localToWorld(point);
  }

  function addParticle(object: THREE.Mesh | THREE.Sprite, at: THREE.Vector3, velocity: THREE.Vector3, life: number, gravity: number, floor = -100, bounce = false): void {
    object.position.copy(at); scene.add(object);
    particles.push({ object, velocity, spin: new THREE.Vector3(Math.random() * 12, Math.random() * 15, Math.random() * 10), life, total: life, gravity, floor, bounce });
    if (particles.length > 160) removeParticle(0);
  }
  function removeParticle(i: number): void {
    const p = particles[i]; scene.remove(p.object);
    if (p.object instanceof THREE.Sprite) (p.object.material as THREE.SpriteMaterial).dispose();
    particles.splice(i, 1);
  }
  function smoke(at: THREE.Vector3, scale: number, color: string, opacity: number): void {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeMap, color, transparent: true, opacity, depthWrite: false, rotation: Math.random() * 6 }));
    sprite.scale.setScalar(scale);
    sprite.userData.opacity = opacity; sprite.userData.size = scale;
    addParticle(sprite, at, new THREE.Vector3((Math.random() - 0.5) * 0.13, 0.16, 0), 0.65, -0.06);
  }
  function impact(flight: Pick<Flight, 'blood' | 'surface' | 'normal' | 'end'>): void {
    const metal = ['car', 'van', 'container', 'barrel', 'gate'].includes(flight.surface);
    const wood = ['crate', 'board', 'cartons'].includes(flight.surface);
    for (let i = 0; i < (flight.blood ? 9 : 11); i++) {
      const material = flight.blood ? bloodMaterial : metal && !settings.reducedFlashing ? sparkMaterial : wood ? woodMaterial : dustMaterial;
      const debris = new THREE.Mesh(metal ? sparkGeometry : debrisGeometry, material);
      debris.scale.setScalar(flight.blood ? 0.5 + Math.random() : 0.3 + Math.random());
      const velocity = flight.normal.clone().multiplyScalar(0.8 + Math.random() * 1.2)
        .add(new THREE.Vector3((Math.random() - 0.5) * 2.5, Math.random() * 2, (Math.random() - 0.5) * 2.5));
      addParticle(debris, flight.end, velocity, metal ? 0.2 : 0.45, 9);
    }
    if (!flight.blood) {
      smoke(flight.end, 0.26, wood ? '#a48b67' : '#b0aaa0', 0.22);
      if (flight.normal.lengthSq() > 0.5) {
        const scar = new THREE.Mesh(scarGeometry, scarMaterial);
        scar.position.copy(flight.end).addScaledVector(flight.normal, 0.012);
        scar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), flight.normal);
        scar.rotateZ(Math.random() * Math.PI * 2); scene.add(scar); scars.push(scar);
        if (scars.length > 64) scene.remove(scars.shift()!);
      }
    }
  }
  return {
    update(player, dt, level) {
      if (player.lastMeleeHitTick !== seenMeleeHitTick) {
        seenMeleeHitTick = player.lastMeleeHitTick;
        const at = new THREE.Vector3(player.lastMeleeEnd.x, player.lastMeleeEnd.y, player.lastMeleeEnd.z);
        if (seenMeleeHitTick >= 0 && player.lastMeleeContact === 'zombie') {
          impact({ blood: true, surface: 'wall', end: at, normal: new THREE.Vector3(player.x-at.x,0,player.z-at.z).normalize() });
        } else if (seenMeleeHitTick >= 0 && player.lastMeleeContact === 'wall') smoke(at,.12,'#b0aaa0',.12);
      }
      tracerMaterial.opacity = settings.reducedFlashing ? 0 : 0.6;
      if (player.lastShotTick !== seenShotTick) {
        seenShotTick = player.lastShotTick;
        if (seenShotTick < 0) {
          while (particles.length) removeParticle(0);
          for (const f of flights) scene.remove(f.mesh); flights.length = 0;
          for (const scar of scars) scene.remove(scar); scars.length = 0;
        } else {
          camera.updateMatrixWorld(); weaponToWorld(viewmodel.getMuzzle(muzzle));
          const end = new THREE.Vector3(player.lastShotEnd.x, player.lastShotEnd.y, player.lastShotEnd.z);
          const velocity = end.clone().sub(muzzle).normalize();
          const cameraRay = end.clone().sub(camera.position).normalize();
          const hit = player.lastShotZombie ? null : raycastBoxHit(level, camera.position, cameraRay, config.pistol.range + 0.1, true);
          const mesh = new THREE.Mesh(tracerGeometry, tracerMaterial); mesh.position.copy(muzzle);
          mesh.quaternion.setFromUnitVectors(up, velocity); scene.add(mesh);
          flights.push({ mesh, end, velocity: velocity.multiplyScalar(config.pistol.bulletSpeed), left: end.distanceTo(muzzle) / config.pistol.bulletSpeed,
            hit: player.lastShotHit, blood: player.lastShotZombie, normal: hit ? new THREE.Vector3(hit.normal.x, hit.normal.y, hit.normal.z) : new THREE.Vector3(0, 1, 0), surface: hit?.box.surface ?? 'wall' });
          // A break-action shotgun keeps its hulls in the chambers until it is opened.
          if (player.weapon === 'pistol' || player.weapon === 'ak') {
            const eject = weaponToWorld(viewmodel.getEjection(new THREE.Vector3()));
            const shell = new THREE.Mesh(shellGeometry, brass);
            const ejectVelocity = new THREE.Vector3(1.5 + Math.random(), 1.5 + Math.random(), 0.3).applyQuaternion(camera.quaternion);
            const ground = raycastBoxHit(level, eject, new THREE.Vector3(0, -1, 0), 20);
            const floor = ground ? eject.y - ground.distance + 0.008 : 0;
            addParticle(shell, eject, ejectVelocity, 2.8, 9.8, floor, true);
          }
          smoke(muzzle, 0.11, '#a8b3b8', 0.14);
          shotLight.position.copy(muzzle); flashLeft = 0.045;
        }
      }
      flashLeft = Math.max(0, flashLeft - dt); shotLight.intensity = settings.reducedFlashing ? 0 : flashLeft / 0.045 * 8;
      for (let i = flights.length - 1; i >= 0; i--) {
        const f = flights[i]; f.left -= dt;
        if (f.left <= 0) { if (f.hit) impact(f); scene.remove(f.mesh); flights.splice(i, 1); }
        else f.mesh.position.addScaledVector(f.velocity, dt);
      }
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]; p.life -= dt;
        if (p.life <= 0) { removeParticle(i); continue; }
        p.velocity.y -= p.gravity * dt; p.object.position.addScaledVector(p.velocity, dt);
        if (p.bounce && p.object.position.y < p.floor) {
          p.object.position.y = p.floor; p.velocity.y = Math.abs(p.velocity.y) * 0.27;
          p.velocity.x *= 0.62; p.velocity.z *= 0.62; p.spin.multiplyScalar(0.6);
        }
        if (p.object instanceof THREE.Sprite) {
          p.object.material.opacity = p.object.userData.opacity * p.life / p.total;
          p.object.scale.setScalar(p.object.userData.size * (1 + (1 - p.life / p.total) * 2));
        } else {
          p.object.rotation.x += p.spin.x * dt; p.object.rotation.z += p.spin.z * dt;
          if (p.life < 0.3) p.object.scale.multiplyScalar(Math.exp(-dt * 8));
        }
      }
    },
  };
}
