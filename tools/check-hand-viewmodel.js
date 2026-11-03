// Browser-side integration checks, invoked by tools/shot.cjs --hands-check.
export async function checkHandViewmodel() {
  const [THREE, { createViewmodel }, { createGameState }, { level0 }, { weaponStats }] = await Promise.all([
    import('/node_modules/.vite/deps/three.js'), import('/src/render/viewmodel.ts'),
    import('/src/game/state.ts'), import('/src/levels/level0.ts'), import('/src/game/weapons.ts'),
  ]);
  const assert = (value, message) => { if (!value) throw new Error(message); };
  const scene = new THREE.Scene(), model = createViewmodel(scene), player = createGameState(level0).players[0];
  const pose = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0 };
  const root = scene.getObjectByName('Weapon viewmodel');
  const weapons = { pistol: 'P9 pistol', shotgun: 'Sawed-off shotgun', machete: 'Machete', bat: 'Spiked baseball bat' };
  const sockets = { pistol: 'Pistol trigger hand', shotgun: 'Shotgun trigger hand', machete: 'Machete hand', bat: 'Bat upper hand' };
  const rest = Object.fromEntries(Object.entries(weapons).map(([id, name]) => {
    const object = scene.getObjectByName(name); object.updateMatrix(); return [id, object.matrix.clone()];
  }));
  for (let i = 0; i < 200 && !scene.getObjectByName('Left hand weapon socket'); i++) await new Promise(resolve => setTimeout(resolve, 25));
  const mount = scene.getObjectByName('Right hand weapon socket');
  assert(mount && scene.getObjectByName('Left hand weapon socket'), 'both hands must finish loading');
  let handCount = 0;
  scene.traverse(object => { if (object.isSkinnedMesh) { handCount++; assert(object.skeleton.bones.length === 36, '36-bone hand rig'); } });
  assert(handCount === 2, 'one persistent pair of hands');
  const update = () => model.update(player, pose, 1 / 60);
  const check = id => {
    const weapon = scene.getObjectByName(weapons[id]);
    assert(weapon.parent === mount, `${id}: weapon must be parented to the hand socket`);
    assert(mount.parent.name === 'palm' && mount.parent.parent.name === 'wrist', 'socket must follow the hand skeleton');
    const actual = root.matrixWorld.clone().invert().multiply(weapon.matrixWorld);
    assert(actual.elements.every((n, i) => Math.abs(n - rest[id].elements[i]) < 1e-5), `${id}: equip must preserve weapon placement and sight line`);
    assert(mount.getWorldPosition(new THREE.Vector3()).distanceTo(scene.getObjectByName(sockets[id]).getWorldPosition(new THREE.Vector3())) < 1e-5, `${id}: palm contact must match the grip`);
    scene.traverse(object => assert(object.matrixWorld.elements.every(Number.isFinite), `${object.name}: invalid transform`));
    assert(model.getMuzzle(new THREE.Vector3()).toArray().every(Number.isFinite), 'finite muzzle');
    for (const [hand, sleeve] of [['Primary hand mesh', 'Primary tactical sleeve and glove gauntlet'], ['Support hand mesh', 'Support tactical sleeve and glove gauntlet']]) {
      const wrist = scene.getObjectByName(hand).getObjectByName('wrist').getWorldPosition(new THREE.Vector3());
      assert(wrist.distanceTo(scene.getObjectByName(sleeve).getWorldPosition(new THREE.Vector3())) < 1e-5, 'sleeve must remain joined to the wrist');
    }
  };
  for (let cycle = 0; cycle < 4; cycle++) for (const id of Object.keys(weapons)) {
    player.weapon = id; player.ammo = 2; player.reloadLeft = 0; player.meleeLeft = 0;
    player.aiming = cycle % 2 === 1; model.update(player, pose, .2); check(id);
    if (id === 'pistol' || id === 'shotgun') {
      const socket = scene.getObjectByName(sockets[id]);
      const target = socket.localToWorld(new THREE.Vector3(...socket.userData.trigger));
      const fingertip = scene.getObjectByName('Primary hand mesh').getObjectByName('index-finger-tip').getWorldPosition(new THREE.Vector3());
      assert(fingertip.distanceTo(target) < .001, `${id}: trigger finger must meet the trigger contact`);
    }
    for (const phase of [.1, .35, .75]) { player.meleeLeft = weaponStats(id).melee.seconds * (1 - phase); update(); check(id); }
    player.meleeLeft = 0;
    if (id === 'pistol' || id === 'shotgun') {
      player.lastShotTick++; update(); check(id);
      for (const ammo of [0, 1]) for (const progress of [.06, .18, .3, .48, .65, .78, .84, .94, .99]) {
        player.ammo = ammo; player.reloadLeft = weaponStats(id).reloadSeconds * (1 - progress); update(); check(id);
      }
    }
  }
  // Bending only the wrist must carry the gun with it, without a viewmodel update.
  player.weapon = 'pistol'; player.reloadLeft = 0; player.meleeLeft = 0; update();
  const before = model.getMuzzle(new THREE.Vector3()).clone();
  mount.parent.parent.rotateY(.2); scene.updateMatrixWorld(true);
  assert(model.getMuzzle(new THREE.Vector3()).distanceTo(before) > .001, 'weapon must inherit actual wrist motion');
  player.weapon = 'bat'; update(); check('bat');
  player.weapon = 'pistol'; update(); check('pistol');
  return { bonesPerHand: 36, hands: handCount, swaps: 16, reloadSamples: 144, attachment: true, triggerContact: true, sightLine: true, wristInheritance: true };
}
