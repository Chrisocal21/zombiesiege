import * as THREE from 'three';
import type { SupplyKind } from '../game/items';
import type { GameState } from '../game/state';
import { medkitModel } from './props';

// Bandages, first aid kits and water lying where a zombie fell: small props that turn slowly, with a
// soft light column so they can be seen across a dark floor.
function build(item: SupplyKind): THREE.Group {
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
    // The real first aid bag, a little smaller in its holder since the holder is scaled up below.
    const bag = medkitModel();
    bag.scale.setScalar(1 / 1.6 * 1.1);
    prop.add(bag);
  } else if (item === 'silencer') {
    // A matte black tube, lying on its side, with a threaded collar at one end.
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 18), paint('#1b1d20', 0.55));
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.03, 14), paint('#5a5f66', 0.35));
    collar.position.y = 0.115;
    const lying = new THREE.Group();
    lying.add(tube, collar);
    lying.rotation.z = Math.PI / 2;
    prop.add(lying);
  } else {
    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.2, 16), new THREE.MeshStandardMaterial({ color: '#7cc4ff', transparent: true, opacity: 0.7, roughness: 0.2 }));
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.04, 12), paint('#1f6fbf'));
    cap.position.y = 0.12;
    prop.add(bottle, cap);
  }
  prop.scale.setScalar(1.6);
  prop.position.y = 0.18;
  const color = item === 'bandage' ? '#fff3d6' : item === 'medkit' ? '#ff6a5c' : item === 'silencer' ? '#d8dde4' : '#6ab8ff';
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
  const views = new Map<number, { group: THREE.Group; item: SupplyKind }>();
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
