import * as THREE from 'three';

type Vec = [number, number, number];

// An attach point on a weapon: where a palm goes, and how it lies. It is a child of the weapon
// part the hand holds, so the hand follows that part as it moves.
//
// Its frame: +x is the way the fingers point from the wrist, +y is toward the thumb (along the
// handle, which runs under the knuckles), and +z is x cross y. Hands are mirror images, so a
// right palm faces -z and a left palm faces +z. The origin is the middle of the palm, on the
// skin. `radius` is how thick the handle is under the fingers, which they wrap.
export interface HandSocket extends THREE.Object3D {
  userData: { radius: number; hand: 'right' | 'left' };
}

export function handSocket(parent: THREE.Object3D, name: string, hand: 'right' | 'left', at: Vec, fingers: Vec, thumb: Vec, radius: number): HandSocket {
  const x = new THREE.Vector3(...fingers).normalize();
  const towardThumb = new THREE.Vector3(...thumb);
  const y = towardThumb.addScaledVector(x, -towardThumb.dot(x)).normalize();
  const z = x.clone().cross(y);
  const socket = new THREE.Object3D() as HandSocket;
  socket.name = name;
  socket.position.set(...at);
  socket.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
  socket.userData = { radius, hand };
  parent.add(socket);
  return socket;
}

// Development aid: ?sockets shows each attach point's axes (x red, y green, z blue) and its handle.
export function showSockets(sockets: HandSocket[]): void {
  for (const socket of sockets) {
    socket.add(new THREE.AxesHelper(0.03));
    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(socket.userData.radius, socket.userData.radius, 0.05, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: '#ffd400', wireframe: true }),
    );
    // The handle runs along y, its centre a radius in from the palm, on the palm's side.
    handle.position.z = (socket.userData.hand === 'right' ? -1 : 1) * socket.userData.radius;
    socket.add(handle);
  }
}
