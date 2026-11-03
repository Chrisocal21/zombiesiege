import * as THREE from 'three';
import { paintTexture } from './materials';
import { handSocket, triggerContact } from './handSockets';
import { box, softBox, profile, barrelPart } from './weaponGeometry';

interface ShotgunMaterials {
  steel: THREE.MeshStandardMaterial;
  dark: THREE.MeshStandardMaterial;
  edge: THREE.MeshStandardMaterial;
  rubber: THREE.MeshStandardMaterial;
}

const smooth = (t: number) => { t = THREE.MathUtils.clamp(t, 0, 1); return t * t * (3 - 2 * t); };

// The same bevels and metal finish as the P9, with a broad, low break-action receiver
// and two bored barrels instead of a pistol slide. All positions use weapon space.
export function createShotgun(materials: ShotgunMaterials) {
  const { dark, edge, rubber } = materials;
  const steel = materials.steel.clone();
  steel.color.set('#62676b'); steel.roughness = 0.44;
  const root = new THREE.Group(); root.name = 'Sawed-off shotgun'; root.visible = false;
  const grain = paintTexture(512, 1229, (ctx, size, random) => {
    ctx.fillStyle = '#603b27'; ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 650; i++) {
      const x = random() * size;
      ctx.strokeStyle = i % 4 ? `rgba(34,18,10,${0.06 + random() * 0.18})` : 'rgba(197,142,86,.16)';
      ctx.lineWidth = 0.5 + random() * 2;
      ctx.beginPath(); ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + 14, size * .3, x - 16, size * .7, x + (random() - .5) * 18, size); ctx.stroke();
    }
  });
  const wood = new THREE.MeshStandardMaterial({ color: '#ebcfb3', map: grain, bumpMap: grain,
    bumpScale: 0.00015, roughness: 0.57, metalness: 0.02 });
  const checkering = paintTexture(256, 1231, (ctx, size) => {
    ctx.fillStyle = '#6b4228'; ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#322116'; ctx.lineWidth = 1.5;
    for (let i = -size; i < size * 2; i += 11) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + size, size);
      ctx.moveTo(i, 0); ctx.lineTo(i - size, size); ctx.stroke();
    }
  });
  const checkedWood = new THREE.MeshStandardMaterial({ color: '#c4a17c', map: checkering,
    bumpMap: checkering, bumpScale: 0.0003, roughness: 0.76 });
  const brass = new THREE.MeshStandardMaterial({ color: '#bc9857', metalness: 0.82, roughness: 0.3 });
  const hull = new THREE.MeshStandardMaterial({ color: '#822c24', roughness: 0.72 });

  // Swept receiver, standing breech, and the thin joint around the action body.
  profile(root, [[-.076,.013,.006],[-.078,.049,.008],[-.060,.064,.006],
    [.018,.064,.004],[.038,.045,.005],[.034,.013,.006],[-.018,.006,.006]], .058, .004, steel);
  softBox(root, [.052,.035,.005], .002, dark, [0,.041,-.017]);
  for (const x of [-.014, .014]) {
    barrelPart(root, .0105, .0012, edge, [x,.046,-.020]);
    barrelPart(root, .0018, .0016, dark, [x,.046,-.021]);
  }
  // Recessed side plates and slotted screw heads catch the light like the pistol's pins.
  for (const side of [-1, 1]) {
    softBox(root, [.0014,.026,.070], .001, dark, [side * .029,.033,.022]);
    softBox(root, [.0018,.023,.066], .001, steel, [side * .0297,.033,.022]);
    for (const z of [-.006,.050]) {
      const screw = new THREE.Mesh(new THREE.CylinderGeometry(.0027,.0027,.002,20), edge);
      screw.rotation.z = Math.PI / 2; screw.position.set(side * .031,.033,z); root.add(screw);
      box(root,[.0005,.0007,.0038],dark,[side * .0322,.033,z]).rotation.x = .4;
    }
  }
  softBox(root,[.040,.023,.0014],.001,steel,[0,.034,.0768]);
  for (const x of [-.014,.014]) {
    barrelPart(root,.0032,.0012,edge,[x,.034,.078]);
    barrelPart(root,.0014,.0014,dark,[x,.034,.0788]);
  }
  const hingePin = new THREE.Mesh(new THREE.CylinderGeometry(.006,.006,.063,28), edge);
  hingePin.rotation.z = Math.PI / 2; hingePin.position.set(0,.012,-.026); root.add(hingePin);
  // Tang, sliding safety, and an offset opening lever. The centre remains a sight groove.
  softBox(root,[.014,.003,.045],.001,steel,[0,.053,.084]).rotation.x = .18;
  softBox(root,[.009,.004,.013],.001,dark,[0,.056,.089]);
  for (const z of [.085,.089,.093]) box(root,[.0092,.0007,.001],edge,[0,.058,z]);
  const lever = new THREE.Group(); lever.position.set(0,.066,.038); root.add(lever);
  barrelPart(lever,.004,.003,edge,[0,0,0]);
  softBox(lever,[.009,.003,.029],.002,dark,[.009,0,.009]).rotation.y = -.5;
  softBox(lever,[.014,.004,.014],.003,steel,[.016,0,.023]);

  // A swept bird's-head stock, following the short curved wood grips in the references.
  // Its neck runs behind the receiver rather than dropping into a vertical pistol grip.
  profile(root,[[-.061,.060,.004],[-.110,.053,.009],[-.158,.030,.012],
    [-.202,-.014,.012],[-.209,-.035,.010],[-.190,-.050,.012],[-.168,-.040,.010],
    [-.139,-.010,.009],[-.109,.005,.008],[-.080,.008,.005]],.038,.005,wood);
  for (const side of [-1,1]) {
    const panel = profile(root,[[-.107,.038,.004],[-.148,.020,.006],[-.183,-.013,.006],
      [-.186,-.033,.006],[-.171,-.028,.006],[-.138,.004,.006],[-.108,.017,.004]],.0015,.0004,checkedWood);
    panel.position.x = side * .019;
  }
  const heel = softBox(root,[.040,.030,.005],.002,rubber,[0,-.034,.204]); heel.rotation.x = -.3;

  // A real opening around the trigger, with an exposed curved blade inside it.
  const guard = profile(root,[[-.024,.010,.003],[.046,.010,.005],[.047,-.024,.008],
    [.032,-.031,.007],[-.016,-.031,.006],[-.026,-.018,.005]],.008,.0018,dark,
    [[-.017,.003,.003],[.037,.003,.003],[.038,-.020,.006],[-.012,-.024,.004]]);
  const trigger = profile(root,[[.001,.003,.001],[.007,.002,.001],[.004,-.009,.003],
    [.010,-.018,.001],[.006,-.020,.001],[0,-.010,.003]],.005,.0008,edge);
  guard.position.z = trigger.position.z = .065;

  // The fore-end and barrels share a hinge, so the wood follows the opening action.
  const barrels = new THREE.Group(); barrels.name = 'Shotgun break action';
  barrels.position.set(0,.012,-.026); root.add(barrels);
  const tubeGeometry = new THREE.LatheGeometry([
    new THREE.Vector2(.0102,.025),new THREE.Vector2(.0102,-.239),
    new THREE.Vector2(.0106,-.244),new THREE.Vector2(.0128,-.244),
    new THREE.Vector2(.0134,-.241),new THREE.Vector2(.0140,.025),
    new THREE.Vector2(.0102,.025),
  ],48);
  tubeGeometry.rotateX(Math.PI / 2);
  for (const x of [-.014,.014]) {
    const tube = new THREE.Mesh(tubeGeometry,steel); tube.position.set(x,.034,0); barrels.add(tube);
    // A darker inner wall gives the bores depth instead of painted-on black disks.
    const bore = new THREE.Mesh(new THREE.CylinderGeometry(.0101,.0101,.255,40,1,true),dark);
    bore.rotation.x = Math.PI / 2; bore.position.set(x,.034,-.107); barrels.add(bore);
    const crown = new THREE.Mesh(new THREE.TorusGeometry(.0115,.0008,8,48),edge);
    crown.position.set(x,.034,-.244); barrels.add(crown);
    const chamber = new THREE.Mesh(new THREE.TorusGeometry(.0125,.0013,8,40),edge);
    chamber.position.set(x,.034,.0255); barrels.add(chamber);
  }
  softBox(barrels,[.009,.006,.263],.001,steel,[0,.046,-.109]);
  softBox(barrels,[.004,.001,.244],.0003,dark,[0,.0492,-.115]);
  for (let i=0;i<35;i++) box(barrels,[.0085,.0006,.0009],edge,[0,.0497,-.232+i*.0067]);
  // A simple brass bead gives the traditional sight picture of the references.
  const bead = new THREE.Mesh(new THREE.SphereGeometry(.0026,16,10),brass);
  bead.name = 'Shotgun front bead';
  bead.position.set(0,.0569,-.230); barrels.add(bead);
  const beadPost = new THREE.Mesh(new THREE.CylinderGeometry(.0014,.0018,.0058,12),brass);
  beadPost.position.set(0,.0526,-.230); barrels.add(beadPost);
  profile(barrels,[[.039,.036,.004],[.218,.032,.007],[.228,-.003,.006],
    [.212,-.017,.005],[.048,-.020,.006],[.034,-.005,.004]],.049,.005,wood);
  for (const side of [-1,1]) {
    softBox(barrels,[.0012,.022,.139],.0005,checkedWood,[side*.0245,.003,-.133]);
    for (const z of [-.052,-.211]) {
      const screw = new THREE.Mesh(new THREE.CylinderGeometry(.002,.002,.002,16),edge);
      screw.rotation.z = Math.PI / 2; screw.position.set(side*.025,-.001,z); barrels.add(screw);
    }
  }
  softBox(barrels,[.012,.003,.025],.001,dark,[0,-.021,-.087]);

  const inscription = paintTexture(512,1235,(ctx,size)=>{
    ctx.clearRect(0,0,size,size);ctx.fillStyle='#b3b0a4';
    ctx.font='32px sans-serif';ctx.fillText('NORTHLINE',24,205);
    ctx.font='21px sans-serif';ctx.fillText('S / 12     •     COACH',24,241);
  });
  const labelMaterial = new THREE.MeshStandardMaterial({map:inscription,transparent:true,depthWrite:false,roughness:.5});
  for (const side of [-1,1]) {
    const label = new THREE.Mesh(new THREE.PlaneGeometry(.051,.021),labelMaterial);
    label.rotation.y=side*Math.PI/2;label.position.set(side*.0308,.035,.025);root.add(label);
  }

  const shells = [-.014,.014].map(x=>{
    const shell = new THREE.Group();shell.position.set(x,.034,.025);barrels.add(shell);
    barrelPart(shell,.0094,.041,hull,[0,0,-.025]);
    barrelPart(shell,.010,.009,brass,[0,0,-.004]);
    barrelPart(shell,.0109,.0018,brass,[0,0,.0015]);
    barrelPart(shell,.0027,.002,dark,[0,0,.0023]);
    return shell;
  });
  const muzzle = new THREE.Object3D();muzzle.name='Shotgun muzzle';
  muzzle.position.set(-.014,.034,-.247);barrels.add(muzzle);
  // The trigger hand round the stock's neck, its palm on the right side and the thumb up toward
  // the receiver. The support hand cups the fore-end from below, so it rides the hinge.
  const sockets = {
    primary: handSocket(root, 'Shotgun trigger hand', 'right', [.021,.012,.140], [0,-.77,-.64], [0,.64,-.77], .020),
    support: handSocket(barrels, 'Shotgun support hand', 'left', [-.008,-.028,-.130], [.94,-.34,0], [0,0,-1], .022, .026),
  };
  triggerContact(sockets.primary, root, [.003, -.010, .056]);
  const supportTransform = new THREE.Matrix4();
  const offset = new THREE.Matrix4();

  return {
    root, muzzle, supportTransform, sockets,
    update(ammo: number, progress: number, reloading: boolean, pull: number) {
      const stage=(a:number,b:number)=>smooth((progress-a)/(b-a));
      const opening=reloading ? stage(.04,.22)*(1-stage(.78,.96)) : 0;
      barrels.rotation.x=-.72*opening;
      lever.rotation.y=-.42*opening;
      trigger.rotation.x=-.25*pull;
      barrels.updateMatrix();
      // Convert from the closed fore-end to its current hinge position.
      supportTransform.copy(barrels.matrix).multiply(offset.makeTranslation(0,-.012,.026));
      const loading=reloading ? stage(.23,.36)*(1-stage(.70,.84)) : 0;
      const travel=.10*((1-stage(.36,ammo ? .57 : .50))+(ammo ? 0 : stage(.50,.54)*(1-stage(.54,.70))))*loading;
      supportTransform.multiply(offset.makeTranslation(0,0,travel));
      shells.forEach((shell,i)=>{
        const missing=i<2-ammo;
        const insertion=stage(i ? .54 : .36,i ? .70 : ammo ? .57 : .50);
        const extracted=stage(.22,.31);
        shell.visible=!reloading || !missing || progress<.31 || (progress>=(i?.51:.33));
        shell.position.z=.025+(reloading && missing ? (progress<.33 ? extracted*.12 : .10*(1-insertion)) : 0);
      });
      // Alternate muzzle sides as the two shots are spent.
      muzzle.position.x=ammo===0 ? .014 : -.014;
      return loading;
    },
  };
}
