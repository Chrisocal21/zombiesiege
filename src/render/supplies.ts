import * as THREE from 'three';
import type { ItemId } from '../game/items';
import type { GameState } from '../game/state';

// Bandages, first aid kits and water lying where a zombie fell: small props that turn slowly, with a
// soft light column so they can be seen across a dark floor.
function build(item: ItemId): THREE.Group {
  const group = new THREE.Group();
  const prop = new THREE.Group();
  group.add(prop);
  const paint = (color: string, rough = 0.7) => new THREE.MeshStandardMaterial({ color, roughness: rough });
  if (item === 'bandage') {
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.1, 18), paint('#e8e2d2', 0.95));
    roll.rotation.x = Math.PI / 2;
    const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.0715, 0.0715, 0.03, 18), paint('#c44'));
    stripe.rotation.x = Math.PI / 2;
    prop.add(roll, stripe);
  } else if (item === 'medkit') {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.12), paint('#f1f1ec'));
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.125), paint('#d8342a'));
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.125), paint('#d8342a'));
    prop.add(box, bar, post);
  } else {
    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.2, 16), new THREE.MeshStandardMaterial({ color: '#7cc4ff', transparent: true, opacity: 0.7, roughness: 0.2 }));
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.04, 12), paint('#1f6fbf'));
    cap.position.y = 0.12;
    prop.add(bottle, cap);
  }
  prop.scale.setScalar(1.6);
  prop.position.y = 0.18;
  const color = item === 'bandage' ? '#fff3d6' : item === 'medkit' ? '#ff6a5c' : '#6ab8ff';
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 0.8, 16, 1, true),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.08, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }),
  );
  beam.position.y = 0.4;
  group.add(beam);
  return group;
}

export interface SupplyViews {
  update(state: GameState, time: number): void;
}

export function createSupplyViews(scene: THREE.Object3D): SupplyViews {
  const views = new Map<number, { group: THREE.Group; item: ItemId }>();
  return {
    update(state, time) {
      const live = new Set<number>();
      for (const supply of state.supplies) {
        live.add(supply.id);
        let view = views.get(supply.id);
        // A new game restarts the ids, so an old view may hold a different item.
        if (view && view.item !== supply.item) { scene.remove(view.group); view = undefined; }
        if (!view) {
          view = { group: build(supply.item), item: supply.item };
          scene.add(view.group);
          views.set(supply.id, view);
        }
        view.group.position.set(supply.x, 0, supply.z);
        const prop = view.group.children[0];
        prop.rotation.y = time * 1.4 + supply.id;
        prop.position.y = 0.18 + Math.sin(time * 2.2 + supply.id) * 0.03;
      }
      for (const [id, view] of views) {
        if (live.has(id)) continue;
        scene.remove(view.group);
        views.delete(id);
      }
    },
  };
}
