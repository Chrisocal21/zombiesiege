import * as THREE from 'three';
import { paintTexture } from './materials';
import { handSocket } from './handSockets';
import { softBox } from './weaponGeometry';

function bladePart(shape: THREE.Shape, depth: number, material: THREE.Material | THREE.Material[]): THREE.Mesh {
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, steps: 1, curveSegments: 12,
    bevelEnabled: true, bevelThickness: .0006, bevelSize: .0006, bevelSegments: 2 });
  if (!Array.isArray(material)) geometry.groups.forEach(group => group.materialIndex = 0);
  geometry.translate(0, 0, -depth / 2);
  return new THREE.Mesh(geometry, material);
}

// Tools share the firing hand's grip space; the blade and bat extend up from the fist.
export function createMeleeWeapons(steel: THREE.MeshStandardMaterial, rubber: THREE.MeshStandardMaterial) {
  const edge = new THREE.MeshStandardMaterial({ color: '#bbc4c9', metalness: .92, roughness: .26 });
  const dark = steel.clone(); dark.color.set('#30383c'); dark.roughness = .48;
  const machete = new THREE.Group(); machete.name = 'Machete'; machete.visible = false;
  machete.position.set(0, 0, .05); machete.rotation.x = -.22;

  const blade = new THREE.Shape();
  blade.moveTo(.013, .025); blade.lineTo(.017, .112);
  for (let i = 0; i < 13; i++) {
    const y = .114 + i * .012;
    blade.lineTo(.018, y); blade.lineTo(.014, y + .004); blade.lineTo(.019, y + .008);
  }
  blade.lineTo(.019, .305); blade.quadraticCurveTo(.021, .349, .004, .385);
  blade.quadraticCurveTo(-.031, .365, -.037, .320);
  blade.lineTo(-.030, .078); blade.quadraticCurveTo(-.029, .040, -.024, .025); blade.closePath();
  for (const y of [.13,.19,.25]) {
    const hole = new THREE.Path(); hole.absarc(.006,y,.0032,0,Math.PI*2,true); blade.holes.push(hole);
  }
  const bladeMesh = bladePart(blade,.0028,[dark,edge]); bladeMesh.name = 'Machete blade'; machete.add(bladeMesh);
  bladeMesh.castShadow = bladeMesh.receiveShadow = true;
  const bevel = new THREE.Shape();
  bevel.moveTo(-.024,.032); bevel.lineTo(-.030,.078); bevel.lineTo(-.037,.320);
  bevel.quadraticCurveTo(-.031,.365,.004,.385); bevel.quadraticCurveTo(-.021,.354,-.027,.314);
  bevel.lineTo(-.022,.076); bevel.lineTo(-.018,.032); bevel.closePath();
  const cuttingEdge = bladePart(bevel,.0003,edge); cuttingEdge.position.z=.0021; machete.add(cuttingEdge);
  softBox(machete,[.029,.104,.027],.006,rubber,[0,-.032,0]);
  softBox(machete,[.045,.009,.035],.003,dark,[0,.022,0]);
  softBox(machete,[.031,.012,.029],.003,dark,[0,-.086,0]);
  for (const y of [-.065,-.039,-.013]) {
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(.0025,.0025,.029,16),edge);
    pin.rotation.x=Math.PI/2;pin.position.set(0,y,0);machete.add(pin);
  }
  for(let i=0;i<8;i++) softBox(machete,[.0294,.0013,.024],.0005,dark,[0,-.075+i*.011,0]);
  const lanyard = new THREE.Mesh(new THREE.TorusGeometry(.004,.0011,8,20),edge);
  lanyard.position.set(0,-.096,0);machete.add(lanyard);

  const bat = new THREE.Group(); bat.name = 'Spiked baseball bat'; bat.visible = false;
  bat.position.set(0,0,.05);bat.rotation.x=-.22;
  const grain = paintTexture(512,1451,(ctx,size,random)=>{
    ctx.fillStyle='#8b6040';ctx.fillRect(0,0,size,size);
    for(let i=0;i<500;i++) {
      const x=random()*size;ctx.strokeStyle=`rgba(38,20,10,${.07+random()*.19})`;ctx.lineWidth=.5+random()*1.3;
      ctx.beginPath();ctx.moveTo(x,0);ctx.bezierCurveTo(x+18,size*.3,x-12,size*.7,x+9,size);ctx.stroke();
    }
    for(let i=0;i<80;i++) {
      ctx.strokeStyle='rgba(220,183,126,.12)';ctx.lineWidth=1;
      const x=random()*size,y=random()*size;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+2,y+12+random()*30);ctx.stroke();
    }
  });
  const wood = new THREE.MeshStandardMaterial({ color:'#d4b594',map:grain,bumpMap:grain,bumpScale:.00022,roughness:.72 });
  const profile = [[0,-.163],[.017,-.163],[.021,-.156],[.020,-.146],[.011,-.137],
    [.010,-.11],[.011,.02],[.014,.10],[.023,.19],[.032,.27],[.034,.35],[.031,.386],[.021,.399],[0,.402]];
  const timber = new THREE.Mesh(new THREE.LatheGeometry(profile.map(([r,y])=>new THREE.Vector2(r,y)),40),wood);
  timber.name = 'Wooden bat';bat.add(timber);
  const wrap = new THREE.Mesh(new THREE.CylinderGeometry(.0118,.0115,.172,28),rubber);
  wrap.position.y=-.045;bat.add(wrap);
  const tapeGeometry=new THREE.TorusGeometry(.0118,.001,6,28);
  for(let i=0;i<17;i++) {
    const tape=new THREE.Mesh(tapeGeometry,dark);tape.rotation.set(Math.PI/2,0,.10);
    tape.position.y=-.126+i*.01;bat.add(tape);
  }
  const oxidized = new THREE.MeshStandardMaterial({color:'#62594b',metalness:.68,roughness:.57});
  const shaftGeometry=new THREE.CylinderGeometry(.0012,.0022,.035,10);
  const tipGeometry=new THREE.ConeGeometry(.0019,.012,10);
  const washerGeometry=new THREE.CylinderGeometry(.004,.004,.0015,14);
  const up=new THREE.Vector3(0,1,0);
  for(let row=0;row<4;row++)for(let j=0;j<4;j++) {
    const angle=j*Math.PI/2+row*.51;
    const y=.231+row*.047, radius=.029+Math.min(row,2)*.002;
    const direction=new THREE.Vector3(Math.sin(angle),row%2?.13:-.10,Math.cos(angle)).normalize();
    const at=new THREE.Vector3(Math.sin(angle)*radius,y,Math.cos(angle)*radius);
    const turn=new THREE.Quaternion().setFromUnitVectors(up,direction);
    const shaft=new THREE.Mesh(shaftGeometry,(row+j)%3?edge:oxidized);
    shaft.quaternion.copy(turn);shaft.position.copy(at).addScaledVector(direction,.017);bat.add(shaft);
    const point=new THREE.Mesh(tipGeometry,edge);point.quaternion.copy(turn);
    point.position.copy(at).addScaledVector(direction,.0405);bat.add(point);
    const washer=new THREE.Mesh(washerGeometry,oxidized);washer.quaternion.copy(turn);washer.position.copy(at);bat.add(washer);
  }
  // A fist round each handle, palm on the right side. Two hands stack on the bat's tape, the
  // left nearer the knob.
  const sockets = {
    machete: handSocket(machete, 'Machete hand', 'right', [.0155,-.035,.002], [0,0,-1], [0,1,0], .0145),
    batRight: handSocket(bat, 'Bat upper hand', 'right', [.0125,-.035,0], [0,0,-1], [0,1,0], .012),
    batLeft: handSocket(bat, 'Bat lower hand', 'left', [-.0125,-.100,0], [0,0,-1], [0,1,0], .012),
  };
  return {machete,bat,sockets};
}
