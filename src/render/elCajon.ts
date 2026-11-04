import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// The El Cajon: a 1960s coupe utility, facing +Z, built from sheet-metal patches, stamped panels, glass,
// chrome, upholstery and machined wheels. It is the reference for how detailed and how real a vehicle
// in this game should be: shaped fenders and sills, a crowned hood and roof, window surrounds with
// mouldings, a pleated interior, lamps with lenses, and bumpers that sweep back at the ends.
//
// Dimensions are in metres, the body's own frame: x across, y up with the axles at y -0.286, z along
// the car. Wheels are returned separately and are placed by the caller at WHEEL_CENTERS.
export const CAR = { wheelRearZ: -1.5, wheelFrontZ: 1.5, wheelRadius: 0.39 };
export const EL_CAJON_BED_EXTENSION = 0;
// Where the axle centres are, and how far above the lowest point of the tyres the body's origin sits.
export const AXLE_Y = -0.286;
export const WHEEL_X = 0.8;

export interface ElCajonModel {
  body: THREE.Group;
  wheels: THREE.Mesh[];
}
type V = [number, number, number];

export function createElCajon(): ElCajonModel {
  const bedExtension = EL_CAJON_BED_EXTENSION;
  const bodyOffsetZ = bedExtension / 2;
  const rearEnd = -2.44 - bedExtension;
  const axles = [CAR.wheelRearZ - bodyOffsetZ, CAR.wheelFrontZ - bodyOffsetZ];
  const paint = new THREE.MeshPhysicalMaterial({ color: 0x243e55, metalness: 0.58, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.16 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xe1e5e9, metalness: 0.95, roughness: 0.17 });
  const brushed = new THREE.MeshStandardMaterial({ color: 0x9da5ae, metalness: 0.85, roughness: 0.36 });
  const windowMetal = new THREE.MeshStandardMaterial({ color: 0x68737e, metalness: 0.7, roughness: 0.43 });
  const brakeSteel = new THREE.MeshStandardMaterial({ color: 0x4d535a, metalness: 0.75, roughness: 0.5 });
  const black = new THREE.MeshStandardMaterial({ color: 0x11161b, roughness: 0.78 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x202124, roughness: 0.9 });
  const tan = new THREE.MeshStandardMaterial({ color: 0xa98454, roughness: 0.83 });
  const piping = new THREE.MeshStandardMaterial({ color: 0x735335, roughness: 0.9 });
  const carpet = new THREE.MeshStandardMaterial({ color: 0x3e372b, roughness: 1 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xb1ced6, metalness: 0.05, roughness: 0.07, transparent: true, opacity: 0.26, side: THREE.DoubleSide, depthWrite: false, clearcoat: 1 });
  const red = new THREE.MeshPhysicalMaterial({ color: 0xa9080b, roughness: 0.24, metalness: 0.12, clearcoat: 1 });
  const amber = new THREE.MeshPhysicalMaterial({ color: 0xdc7416, roughness: 0.25, clearcoat: 1 });
  const body = new THREE.Group();
  body.name = 'El Cajon';

  const add = (g: THREE.BufferGeometry, m: THREE.Material, p: V = [0, 0, 0], parent: THREE.Object3D = body) => {
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set(...p);
    parent.add(mesh);
    return mesh;
  };
  const box = (m: THREE.Material, size: V, p: V, radius = 0.008, parent: THREE.Object3D = body) =>
    add(Math.min(...size) < 0.01 ? new THREE.BoxGeometry(...size) :
      new RoundedBoxGeometry(...size, 2, Math.min(radius, ...size.map(x => x * 0.45))), m, p, parent);
  // Orient each patch toward the outside explicitly; connected surfaces share their edges.
  const patch = (m: THREE.Material, points: V[], outward: V, parent: THREE.Object3D = body) => {
    const normal = new THREE.Vector3().crossVectors(
      new THREE.Vector3(...points[1]).sub(new THREE.Vector3(...points[0])),
      new THREE.Vector3(...points[2]).sub(new THREE.Vector3(...points[0])),
    );
    const front = normal.dot(new THREE.Vector3(...outward)) >= 0;
    const indices = points.length === 3 ? (front ? [0, 1, 2] : [0, 2, 1]) :
      (front ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(points.length === 3 ? [0, 0, 1, 0, 0.5, 1] : [0, 0, 1, 0, 1, 1, 0, 1], 2));
    g.setIndex(indices);
    g.computeVertexNormals();
    return add(g, m, [0, 0, 0], parent);
  };
  const surface = (m: THREE.Material, nu: number, nv: number, sample: (u: number, v: number) => V, outward: V) => {
    const p: number[] = [], uv: number[] = [], indices: number[] = [];
    for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) {
      p.push(...sample(i / nu, j / nv));
      uv.push(i / nu, j / nv);
      if (i < nu && j < nv) {
        const a = i * (nv + 1) + j, b = a + nv + 1;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(indices); g.computeVertexNormals();
    // The surface's dominant normal establishes winding for the entire patch.
    const normals = g.attributes.normal;
    const sum = new THREE.Vector3();
    for (let i = 0; i < normals.count; i++) sum.add(new THREE.Vector3().fromBufferAttribute(normals, i));
    if (sum.dot(new THREE.Vector3(...outward)) < 0) {
      for (let i = 0; i < indices.length; i += 3) [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]];
      g.setIndex(indices); g.computeVertexNormals();
    }
    return add(g, m);
  };
  const rod = (m: THREE.Material, a: V, b: V, radius: number, parent: THREE.Object3D = body) => {
    const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b);
    const delta = to.clone().sub(from);
    const mesh = add(new THREE.CylinderGeometry(radius, radius, delta.length(), 8), m, [0, 0, 0], parent);
    mesh.position.copy(from.add(to).multiplyScalar(0.5));
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    return mesh;
  };
  const line = (m: THREE.Material, points: V[], radius: number, parent: THREE.Object3D = body) => {
    const curve = new THREE.CurvePath<THREE.Vector3>();
    for (let i = 0; i < points.length - 1; i++) {
      curve.add(new THREE.LineCurve3(new THREE.Vector3(...points[i]), new THREE.Vector3(...points[i + 1])));
    }
    return add(new THREE.TubeGeometry(curve, Math.max(8, points.length * 3), radius, 6, false), m, [0, 0, 0], parent);
  };
  const ring = (m: THREE.Material, outer: V[], inner: V[], outward: V) => {
    for (let i = 0; i < outer.length; i++) {
      const j = (i + 1) % outer.length;
      patch(m, [outer[i], outer[j], inner[j], inner[i]], outward);
    }
  };
  // Flat, mitered window molding follows the painted surround exactly. A narrow rubber
  // seal meets the glass; the satin strip stays on the frame rather than floating over it.
  const windowMolding = (outer: V[], inner: V[], outward: V) => {
    const offset = new THREE.Vector3(...outward).normalize().multiplyScalar(0.0015);
    const contour = (t: number): V[] => inner.map((p, i) => [
      THREE.MathUtils.lerp(p[0], outer[i][0], t) + offset.x,
      THREE.MathUtils.lerp(p[1], outer[i][1], t) + offset.y,
      THREE.MathUtils.lerp(p[2], outer[i][2], t) + offset.z,
    ]);
    ring(black, contour(0.36), contour(0.34), outward);
    ring(black, contour(0.14), contour(0), outward);
    ring(windowMetal, contour(0.34), contour(0.14), outward);
  };
  const disc = (m: THREE.Material, radius: number, depth: number, p: V, axis: 'x' | 'z' = 'z', parent: THREE.Object3D = body) => {
    const mesh = add(new THREE.CylinderGeometry(radius, radius, depth, radius < 0.02 ? 10 : radius < 0.07 ? 20 : 40), m, p, parent);
    mesh.rotation[axis === 'x' ? 'z' : 'x'] = Math.PI / 2;
    return mesh;
  };
  const torus = (m: THREE.Material, radius: number, thickness: number, p: V, axis: 'x' | 'z' = 'z', parent: THREE.Object3D = body) => {
    const mesh = add(new THREE.TorusGeometry(radius, thickness, 8, 48), m, p, parent);
    if (axis === 'x') mesh.rotation.y = Math.PI / 2;
    return mesh;
  };

  // Body section: rounded shoulder and a concave lower sill, narrowing at the nose and tail.
  const taper = (z: number) => Math.abs(z) / (z < 0 ? -rearEnd : 2.44);
  const top = (z: number) => 0.414 - 0.055 * taper(z) ** 5;
  const width = (y: number, z: number) => {
    const h = THREE.MathUtils.clamp((y + 0.28) / 0.7, 0, 1);
    return 0.9 + 0.09 * Math.sin(h * Math.PI * 0.9) - 0.015 * h - 0.045 * taper(z) ** 6;
  };
  const sidePoint = (s: number, y: number, z: number, offset = 0): V => [s * (width(y, z) + offset), y, z];
  for (const s of [-1, 1]) {
    surface(paint, 208, 18, (u, v) => {
      const z = THREE.MathUtils.lerp(rearEnd, 2.44, u);
      let bottom = -0.28;
      for (const axle of axles) {
        const d = z - axle;
        if (Math.abs(d) < 0.43) bottom = Math.max(bottom, -0.286 + Math.sqrt(0.43 ** 2 - d * d));
      }
      return sidePoint(s, THREE.MathUtils.lerp(bottom, top(z), v), z);
    }, [s, 0, 0]);
    // Fender tops and bed shoulders close all the way to the hood/cargo opening.
    surface(paint, 96, 8, (u, v) => {
      const z = THREE.MathUtils.lerp(rearEnd, 2.44, u);
      const y = top(z) + 0.015 * Math.sin(v * Math.PI);
      return [s * THREE.MathUtils.lerp(0.79, width(top(z), z), v), y, z];
    }, [0, 1, 0]);
    for (const axle of axles) {
      const edge: V[] = [], inside: V[] = [];
      for (let i = 0; i <= 48; i++) {
        const a = i / 48 * Math.PI;
        const y = -0.286 + Math.sin(a) * 0.431, z = axle + Math.cos(a) * 0.431;
        edge.push(sidePoint(s, y, z, 0.006));
        inside.push([s * (width(y, z) - 0.04), y - 0.012, z]);
      }
      line(chrome, edge, 0.009);
      for (let i = 0; i < edge.length - 1; i++) patch(black, [edge[i], edge[i + 1], inside[i + 1], inside[i]], [s, -1, 0]);
    }
    // Thin belt crease, rocker molding, shaped door shut line, lock and recessed handle.
    line(chrome, [-2.3 - bedExtension, -1.8, -0.9, 0, 0.9, 1.8, 2.3].map(z => sidePoint(s, 0.265, z, 0.004)), 0.005);
    line(chrome, [-0.99, -0.7, 0, 0.7, 1.08].map(z => sidePoint(s, -0.235, z, 0.008)), 0.018);
    const doorSeam: V[] = [];
    for (let i = 0; i <= 24; i++) {
      const y = THREE.MathUtils.lerp(0.412, -0.16, i / 24);
      doorSeam.push(sidePoint(s, y, 0.75 - 0.02 * i / 24, 0.005));
    }
    doorSeam.push(sidePoint(s, -0.21, 0.61, 0.005), sidePoint(s, -0.21, -0.46, 0.005), sidePoint(s, -0.14, -0.58, 0.005));
    for (let i = 0; i <= 24; i++) doorSeam.push(sidePoint(s, THREE.MathUtils.lerp(-0.14, 0.405, i / 24), -0.58, 0.005));
    line(black, doorSeam, 0.0035);
    box(black, [0.014, 0.032, 0.17], sidePoint(s, 0.31, -0.34, 0.007), 0.008);
    box(chrome, [0.029, 0.019, 0.14], sidePoint(s, 0.317, -0.34, 0.02), 0.007);
    const lock = disc(chrome, 0.012, 0.007, sidePoint(s, 0.264, -0.34, 0.01), 'x');
    lock.name = 'Door lock';
    box(amber, [0.012, 0.036, 0.105], sidePoint(s, -0.055, 2.21, 0.008), 0.004);
    box(red, [0.012, 0.036, 0.105], sidePoint(s, -0.055, -2.2 - bedExtension, 0.008), 0.004);
  }
  box(black, [1.46, 0.09, 4.56 + bedExtension], [0, -0.27, -bodyOffsetZ], 0.02);
  box(carpet, [1.64, 0.05, 1.48], [0, -0.02, -0.02], 0.01);

  // One continuous, subtly crowned hood. Its perimeter follows the closed fender shoulders.
  const hoodY = (x: number, z: number) => top(z) + 0.009 + 0.024 * (1 - (Math.abs(x) / 0.79) ** 1.5) + 0.018 * ((2.4 - z) / 1.55);
  surface(paint, 32, 52, (u, v) => {
    const x = (u * 2 - 1) * 0.79, z = 0.85 + v * 1.56;
    return [x, hoodY(x, z), z];
  }, [0, 1, 0]);
  // Folded hood edges close the small height change down to the fender shoulder.
  for (const s of [-1, 1]) {
    surface(paint, 48, 2, (u, v) => {
      const z = 0.85 + u * 1.56;
      return [s * 0.79, THREE.MathUtils.lerp(top(z), hoodY(s * 0.79, z), v), z];
    }, [s, 0, 0]);
  }
  surface(paint, 40, 8, (u, v) => {
    const x = (u * 2 - 1) * 0.79;
    return [x, THREE.MathUtils.lerp(hoodY(x, 2.41), 0.295, v), 2.41 + 0.041 * Math.sin(v * Math.PI / 2)];
  }, [0, 1, 1]);
  for (const s of [-1, 1]) {
    surface(paint, 8, 8, (u, v) => {
      const x = s * THREE.MathUtils.lerp(0.79, width(top(2.41), 2.41), u);
      return [x, THREE.MathUtils.lerp(top(2.41), 0.295, v), 2.41 + 0.041 * Math.sin(v * Math.PI / 2)];
    }, [0, 1, 1]);
  }
  for (const s of [-1, 1]) {
    line(black, [0.87, 1.2, 1.8, 2.39].map(z => [s * 0.787, hoodY(s * 0.787, z) + 0.001, z] as V), 0.0025);
    line(paint, [0.88, 1.1, 1.8, 2.32].map(z => [s * 0.38, hoodY(s * 0.38, z) + 0.005, z] as V), 0.004);
  }
  box(paint, [1.6, 0.055, 0.17], [0, 0.425, 0.785], 0.015);
  // Cowl vents sit beneath the wipers, rather than an open black gap.
  for (let i = -15; i <= 15; i++) box(black, [0.008, 0.003, 0.055], [i * 0.037, 0.456, 0.78], 0.001);

  // A stamped roof skin and sheet-metal window surrounds; no tubular frame.
  const roofY = (u: number, v: number) => 1.025 + 0.046 * Math.sin(u * Math.PI) + 0.01 * Math.sin(v * Math.PI);
  surface(paint, 32, 28, (u, v) => {
    const x = (u * 2 - 1) * 0.765, z = -0.55 + v * 0.91;
    return [x, roofY(u, v), z];
  }, [0, 1, 0]);
  // Fold the roof skin down to the straight window headers, closing the crown at both ends.
  for (const end of [0, 1]) surface(paint, 32, 2, (u, v) => [
    (u * 2 - 1) * 0.765, THREE.MathUtils.lerp(end === 0 ? 1.025 : 1.03, roofY(u, end), v),
    end === 0 ? -0.55 : 0.36,
  ], [0, 0, end === 0 ? -1 : 1]);
  for (const s of [-1, 1]) surface(paint, 28, 2, (u, v) => [
    s * 0.765, THREE.MathUtils.lerp(1.025 + u * 0.005, roofY(0, u), v), -0.55 + u * 0.91,
  ], [s, 0, 0]);
  box(tan, [1.41, 0.02, 0.77], [0, 0.998, -0.09], 0.015);
  const windshieldOuter: V[] = [[-0.87, 0.435, 0.85], [0.87, 0.435, 0.85], [0.765, 1.03, 0.36], [-0.765, 1.03, 0.36]];
  const windshieldInner: V[] = [[-0.813, 0.476, 0.821], [0.813, 0.476, 0.821], [0.719, 0.986, 0.394], [-0.719, 0.986, 0.394]];
  ring(paint, windshieldOuter, windshieldInner, [0, 0.6, 1]);
  surface(glass, 30, 18, (u, v) => {
    const half = THREE.MathUtils.lerp(0.813, 0.719, v);
    return [(u * 2 - 1) * half, THREE.MathUtils.lerp(0.476, 0.986, v), THREE.MathUtils.lerp(0.821, 0.394, v) + 0.018 * Math.sin(u * Math.PI) * Math.sin(v * Math.PI)];
  }, [0, 0.6, 1]);
  windowMolding(windshieldOuter, windshieldInner, [0, 0.6, 1]);
  const rearOuter: V[] = [[0.85, 0.43, -0.835], [-0.85, 0.43, -0.835], [-0.765, 1.025, -0.55], [0.765, 1.025, -0.55]];
  const rearInner: V[] = [[0.747, 0.508, -0.798], [-0.747, 0.508, -0.798], [-0.69, 0.965, -0.578], [0.69, 0.965, -0.578]];
  ring(paint, rearOuter, rearInner, [0, 0.3, -1]);
  patch(glass, rearInner, [0, 0.3, -1]);
  windowMolding(rearOuter, rearInner, [0, 0.3, -1]);
  box(paint, [1.64, 0.08, 0.12], [0, 0.435, -0.813], 0.015);
  for (const s of [-1, 1]) {
    const outer: V[] = [[s * 0.87, 0.435, 0.85], [s * 0.765, 1.03, 0.36], [s * 0.765, 1.025, -0.55], [s * 0.915, 0.413, -0.94]];
    const inner: V[] = [[s * 0.85, 0.478, 0.744], [s * 0.768, 0.978, 0.303], [s * 0.768, 0.973, -0.393], [s * 0.855, 0.478, -0.586]];
    ring(paint, outer, inner, [s, 0, 0]);
    patch(glass, inner, [s, 0, 0]);
    windowMolding(outer, inner, [s, 0, 0]);
    // Flat vent-window divider, seated in the window plane.
    patch(windowMetal, [[s * 0.847, 0.478, 0.504], [s * 0.847, 0.478, 0.516],
      [s * 0.792, 0.846, 0.429], [s * 0.792, 0.846, 0.417]], [s, 0, 0]);
    // Close the sail-panel return to the rear window, so the pillar has a solid edge.
    patch(paint, [outer[2], outer[3], [s * 0.85, 0.43, -0.835]], [s, 0, -1]);
    // Close the thin return below the side windows to the door skin.
    patch(paint, [outer[0], outer[3], sidePoint(s, top(-0.94), -0.94), sidePoint(s, top(0.85), 0.85)], [s, 1, 0]);
    rod(chrome, [s * 0.89, 0.442, 0.54], [s * 1.035, 0.493, 0.55], 0.012);
    const mirror = add(new THREE.SphereGeometry(1, 24, 16), chrome, [s * 1.045, 0.515, 0.55]);
    mirror.scale.set(0.085, 0.053, 0.035);
    const mirrorFace = add(new THREE.CircleGeometry(0.064, 32), chrome, [s * 1.045, 0.515, 0.516]);
    mirrorFace.rotation.y = Math.PI;
  }
  for (const s of [-1, 1]) {
    rod(black, [s * 0.34, 0.466, 0.855], [s * 0.55, 0.506, 0.792], 0.005);
    rod(black, [s * 0.55, 0.506, 0.792], [s * 0.15, 0.509, 0.79], 0.006);
  }
  rod(chrome, [0, 0.958, 0.382], [0, 0.897, 0.395], 0.006);
  box(black, [0.185, 0.055, 0.025], [0, 0.875, 0.394], 0.009);

  // Tan upholstered bench: separate bolsters, pleats, piping, and a proper cabin floor.
  box(piping, [1.48, 0.15, 0.49], [0, 0.12, -0.27], 0.045);
  box(tan, [1.47, 0.14, 0.48], [0, 0.235, -0.27], 0.055);
  const back = box(tan, [1.47, 0.43, 0.13], [0, 0.49, -0.51], 0.045);
  back.rotation.x = -0.13;
  for (let i = -6; i <= 6; i++) {
    const x = i * 0.104;
    box(tan, [0.093, 0.018, 0.32], [x, 0.308, -0.25], 0.008);
    const pleat = box(tan, [0.093, 0.31, 0.019], [x, 0.496, -0.433], 0.008);
    pleat.rotation.x = -0.13;
  }
  line(piping, [[-0.7, 0.3, -0.47], [-0.73, 0.3, -0.05], [0, 0.3, -0.025], [0.73, 0.3, -0.05], [0.7, 0.3, -0.47]], 0.004);
  box(black, [0.17, 0.027, 0.075], [0.17, 0.32, -0.19], 0.006);
  box(chrome, [0.033, 0.008, 0.045], [0.17, 0.337, -0.19], 0.003);
  for (const s of [-1, 1]) {
    box(tan, [0.025, 0.34, 1.21], [s * 0.838, 0.21, 0.075], 0.015);
    box(piping, [0.075, 0.055, 0.31], [s * 0.795, 0.255, 0.02], 0.02);
    rod(chrome, [s * 0.785, 0.31, 0.24], [s * 0.785, 0.31, 0.37], 0.008);
    box(black, [0.56, 0.012, 0.43], [s * 0.4, 0.014, 0.28], 0.016);
  }
  box(tan, [1.56, 0.19, 0.14], [0, 0.392, 0.594], 0.027);
  box(black, [1.61, 0.065, 0.27], [0, 0.515, 0.603], 0.025);
  box(brushed, [0.73, 0.13, 0.015], [0.37, 0.42, 0.512], 0.008);
  // Gauge faces and radio sit on the driver-facing (-Z) dashboard.
  for (const x of [0.2, 0.4, 0.6]) {
    disc(black, 0.052, 0.006, [x, 0.423, 0.498]);
    torus(chrome, 0.054, 0.004, [x, 0.423, 0.49]);
    for (let i = 0; i < 9; i++) {
      const a = -0.65 + i * 0.48;
      rod(chrome, [x + Math.cos(a) * 0.038, 0.423 + Math.sin(a) * 0.038, 0.492], [x + Math.cos(a) * 0.044, 0.423 + Math.sin(a) * 0.044, 0.492], 0.0015);
    }
    rod(amber, [x, 0.423, 0.486], [x - 0.025, 0.449, 0.486], 0.0015);
  }
  box(black, [0.2, 0.065, 0.012], [-0.12, 0.405, 0.515], 0.004);
  for (const x of [-0.255, 0.015]) disc(chrome, 0.014, 0.012, [x, 0.403, 0.504]);
  box(piping, [0.42, 0.095, 0.012], [-0.52, 0.412, 0.515], 0.006);
  box(chrome, [0.07, 0.008, 0.01], [-0.52, 0.445, 0.505], 0.002);
  rod(black, [0.415, 0.28, 0.53], [0.415, 0.594, 0.259], 0.025);
  const steeringGroup = new THREE.Group();
  steeringGroup.position.set(0.415, 0.594, 0.259);
  steeringGroup.rotation.x = -0.42;
  body.add(steeringGroup);
  torus(black, 0.153, 0.011, [0, 0, 0], 'z', steeringGroup);
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3 + Math.PI / 2;
    rod(chrome, [0, 0, 0], [Math.cos(a) * 0.142, Math.sin(a) * 0.142, 0], 0.009, steeringGroup);
  }
  disc(chrome, 0.036, 0.019, [0, 0, 0], 'z', steeringGroup);
  rod(chrome, [0.455, 0.495, 0.37], [0.565, 0.46, 0.34], 0.006);

  // Deep stamped cargo bed with ribbed floor, rounded wheel houses and tiedown loops.
  box(paint, [1.6, 0.075, 1.52 + bedExtension], [0, -0.115, -1.64 - bodyOffsetZ], 0.009);
  box(paint, [1.63, 0.5, 0.065], [0, 0.15, -0.866], 0.012);
  for (let i = -6; i <= 6; i++) box(paint, [0.032, 0.013, 1.43 + bedExtension], [i * 0.116, -0.07, -1.64 - bodyOffsetZ], 0.006);
  for (const s of [-1, 1]) {
    box(paint, [0.075, 0.46, 1.5 + bedExtension], [s * 0.805, 0.16, -1.635 - bodyOffsetZ], 0.014);
    box(paint, [0.3, 0.29, 0.84], [s * 0.707, 0.048, -1.5], 0.13);
    line(chrome, [-2.35 - bedExtension, -2, -1.5, -0.98].map(z => [s * 0.836, top(z) + 0.004, z] as V), 0.008);
    for (const z of [-1.01, -2.2 - bedExtension]) torus(brushed, 0.026, 0.004, [s * 0.753, 0.27, z], 'x');
  }

  // Tailgate has a pressed inset, proper edge seams, hardware, and separate lamp housings.
  box(paint, [1.78, 0.605, 0.08], [0, 0.05, -2.411 - bedExtension], 0.025);
  box(paint, [1.43, 0.267, 0.015], [0, 0.058, -2.458 - bedExtension], 0.024);
  for (const s of [-1, 1]) {
    rod(black, [s * 0.759, -0.205, -2.46 - bedExtension], [s * 0.759, 0.348, -2.46 - bedExtension], 0.0035);
    box(chrome, [0.16, 0.277, 0.036], [s * 0.84, 0.065, -2.463 - bedExtension], 0.016);
    box(black, [0.133, 0.25, 0.015], [s * 0.84, 0.065, -2.487 - bedExtension], 0.009);
    box(red, [0.112, 0.229, 0.018], [s * 0.84, 0.074, -2.5 - bedExtension], 0.013);
    for (let i = 0; i < 9; i++) box(red, [0.106, 0.003, 0.004], [s * 0.84, -0.02 + i * 0.023, -2.512 - bedExtension], 0.001);
    box(chrome, [0.15, 0.025, 0.015], [s * 0.59, -0.214, -2.468 - bedExtension], 0.004);
  }
  box(chrome, [0.173, 0.038, 0.022], [0, 0.268, -2.466 - bedExtension], 0.005);

  // Sculpted nose: inset grille and recessed quad lamps below the hood's folded leading edge.
  box(paint, [1.79, 0.43, 0.09], [0, 0.092, 2.405], 0.028);
  box(black, [1.79, 0.267, 0.025], [0, 0.12, 2.461], 0.02);
  box(chrome, [1.8, 0.022, 0.025], [0, 0.268, 2.475], 0.007);
  box(chrome, [1.8, 0.014, 0.025], [0, -0.024, 2.475], 0.006);
  for (let i = 0; i < 8; i++) box(brushed, [1.02, 0.007, 0.018], [0, 0.006 + i * 0.032, 2.481], 0.002);
  for (let i = -12; i <= 12; i++) box(brushed, [0.003, 0.225, 0.015], [i * 0.04, 0.116, 2.48], 0.001);
  const lensCanvas = document.createElement('canvas');
  lensCanvas.width = lensCanvas.height = 128;
  const lensCtx = lensCanvas.getContext('2d')!;
  const lensGradient = lensCtx.createRadialGradient(46, 38, 4, 64, 64, 63);
  lensGradient.addColorStop(0, '#ffffff'); lensGradient.addColorStop(0.55, '#c9d5dc'); lensGradient.addColorStop(1, '#6c7b89');
  lensCtx.fillStyle = lensGradient; lensCtx.fillRect(0, 0, 128, 128);
  lensCtx.strokeStyle = 'rgba(255,255,255,0.38)'; lensCtx.lineWidth = 1;
  for (let i = 8; i < 128; i += 7) { lensCtx.beginPath(); lensCtx.moveTo(i, 0); lensCtx.lineTo(i, 128); lensCtx.stroke(); }
  for (let i = 12; i < 128; i += 15) { lensCtx.beginPath(); lensCtx.moveTo(0, i); lensCtx.lineTo(128, i); lensCtx.stroke(); }
  const lensTexture = new THREE.CanvasTexture(lensCanvas); lensTexture.colorSpace = THREE.SRGBColorSpace;
  const lens = new THREE.MeshPhysicalMaterial({ map: lensTexture, roughness: 0.16, metalness: 0.25, clearcoat: 1 });
  for (const x of [-0.788, -0.586, 0.586, 0.788]) {
    disc(brushed, 0.099, 0.024, [x, 0.125, 2.479]);
    torus(chrome, 0.09, 0.009, [x, 0.125, 2.498]);
    const light = add(new THREE.SphereGeometry(0.082, 32, 16), lens, [x, 0.125, 2.498]);
    light.scale.z = 0.19;
  }
  for (const s of [-1, 1]) {
    box(chrome, [0.191, 0.063, 0.026], [s * 0.748, -0.073, 2.463], 0.009);
    box(amber, [0.162, 0.039, 0.013], [s * 0.748, -0.072, 2.481], 0.005);
  }
  // Rounded chrome bumpers sweep back at the ends, with narrow upright overriders.
  for (const sign of [-1, 1]) {
    const endOffset = sign < 0 ? -bedExtension : 0;
    surface(chrome, 72, 20, (u, v) => {
      const x = (u * 2 - 1) * 0.993, a = v * Math.PI * 2;
      const z = sign * (2.486 - 0.1 * (Math.abs(x) / 0.993) ** 8) + endOffset;
      return [x, -0.184 + Math.cos(a) * 0.068, z + Math.sin(a) * 0.068];
    }, [0, 0, sign]);
    for (const x of [-0.545, 0.545]) {
      box(chrome, [0.05, 0.226, 0.065], [x, -0.145, sign * 2.535 + endOffset], 0.018);
    }
  }
  for (const s of [-1, 1]) {
    const exhaust = add(new THREE.CylinderGeometry(0.032, 0.036, 0.3, 24, 1, true), chrome, [s * 0.65, -0.293, -2.39 - bedExtension]);
    exhaust.rotation.x = Math.PI / 2;
    disc(black, 0.026, 0.006, [s * 0.65, -0.293, -2.543 - bedExtension]);
  }

  // Transparent script badges sit directly on the paint, without a rectangular label.
  const textBadge = (text: string, width: number, height: number, p: V, rotation: number, plate = false) => {
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    if (plate) { ctx.fillStyle = '#15202c'; ctx.fillRect(0, 0, 1024, 256); }
    ctx.fillStyle = plate ? '#dec47d' : '#dce2e9';
    ctx.font = plate ? 'bold 140px monospace' : 'italic 155px Georgia';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 512, 135);
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshStandardMaterial({ map, transparent: !plate, alphaTest: 0.15, metalness: plate ? 0.1 : 0.6, roughness: 0.32 });
    const mesh = add(new THREE.PlaneGeometry(width, height), mat, p); mesh.rotation.y = rotation;
  };
  textBadge('El Cajon', 0.46, 0.115, [-0.43, 0.105, -2.47 - bedExtension], Math.PI);
  box(chrome, [0.29, 0.114, 0.014], [0, -0.182, -2.56 - bedExtension], 0.005);
  textBadge('CAJON', 0.266, 0.09, [0, -0.18, -2.57 - bedExtension], Math.PI, true);
  textBadge('EC', 0.11, 0.055, [0, 0.13, 2.496], 0);
  for (const s of [-1, 1]) textBadge('El Cajon', 0.27, 0.067, sidePoint(s, 0.18, -2.08 - bedExtension, 0.008), s * Math.PI / 2);

  // Rounded tyre carcass, machined alloy rims, separate brake rotors, lug nuts and tread.
  const tyreProfile = [
    [0.245, -0.135], [0.28, -0.148], [0.321, -0.149], [0.354, -0.13],
    [0.374, -0.102], [CAR.wheelRadius, -0.065], [CAR.wheelRadius, 0.065],
    [0.374, 0.102], [0.354, 0.13], [0.321, 0.149], [0.28, 0.148], [0.245, 0.135],
  ].map(([r, x]) => new THREE.Vector2(r, x));
  const tyreGeometry = new THREE.LatheGeometry(tyreProfile, 64); tyreGeometry.rotateZ(Math.PI / 2);
  const wheels = Array.from({ length: 4 }, () => {
    const wheel = new THREE.Mesh(tyreGeometry, rubber);
    // Fine grooves across the running surface give the tyre its own silhouette.
    for (let i = 0; i < 64; i++) {
      const a = i / 64 * Math.PI * 2;
      const tread = box(black, [0.142, 0.006, 0.008], [0, Math.cos(a) * 0.379, Math.sin(a) * 0.379], 0.001, wheel);
      tread.rotation.x = a;
    }
    for (const s of [-1, 1]) {
      disc(black, 0.249, 0.018, [s * 0.12, 0, 0], 'x', wheel);
      disc(brakeSteel, 0.184, 0.008, [s * 0.131, 0, 0], 'x', wheel);
      for (let i = 0; i < 16; i++) {
        const a = i / 16 * Math.PI * 2;
        disc(black, 0.005, 0.002, [s * 0.137, Math.cos(a) * 0.163, Math.sin(a) * 0.163], 'x', wheel);
      }
      torus(chrome, 0.249, 0.013, [s * 0.151, 0, 0], 'x', wheel);
      torus(brushed, 0.224, 0.005, [s * 0.146, 0, 0], 'x', wheel);
      torus(black, 0.313, 0.0025, [s * 0.15, 0, 0], 'x', wheel);
      for (let i = 0; i < 5; i++) {
        const a = i / 5 * Math.PI * 2;
        const point = (r: number, angle: number, depth: number): V => [s * depth, Math.cos(angle) * r, Math.sin(angle) * r];
        const face = [point(0.052, a - 0.26, 0.167), point(0.229, a - 0.09, 0.149), point(0.229, a + 0.09, 0.149), point(0.052, a + 0.26, 0.167)];
        patch(chrome, face, [s, 0, 0], wheel);
        rod(brushed, point(0.064, a, 0.153), point(0.223, a, 0.14), 0.014, wheel);
        disc(chrome, 0.009, 0.012, point(0.064, a + 0.4, 0.174), 'x', wheel);
      }
      disc(chrome, 0.049, 0.022, [s * 0.17, 0, 0], 'x', wheel);
      disc(black, 0.025, 0.003, [s * 0.184, 0, 0], 'x', wheel);
    }
    return wheel;
  });

  // Flatten the nested interior and batch static detail by material. Each material is one draw.
  const batch = (parent: THREE.Object3D) => {
    parent.updateMatrixWorld(true);
    const inverse = parent.matrixWorld.clone().invert();
    const groups = new Map<THREE.Material, THREE.BufferGeometry[]>();
    const originals = new Set<THREE.BufferGeometry>();
    parent.traverse(child => {
      if (child === parent || !(child instanceof THREE.Mesh) || Array.isArray(child.material)) return;
      const matrix = new THREE.Matrix4().multiplyMatrices(inverse, child.matrixWorld);
      const g = child.geometry.clone().applyMatrix4(matrix);
      const list = groups.get(child.material) ?? [];
      list.push(g); groups.set(child.material, list); originals.add(child.geometry);
    });
    parent.clear();
    originals.forEach(g => g.dispose());
    for (const [m, geometries] of groups) {
      const normalized = geometries.map(g => g.index ? g.toNonIndexed() : g);
      const merged = mergeGeometries(normalized);
      if (!merged) throw new Error('Unable to batch El Cajon geometry');
      const mesh = add(merged, m, [0, 0, 0], parent);
      mesh.castShadow = !m.transparent;
      mesh.receiveShadow = !m.transparent;
      new Set([...geometries, ...normalized]).forEach(g => g.dispose());
    }
  };
  batch(body);
  // Shift the completed shell to the center of its longer physics footprint.
  body.children.forEach(child => {
    if (child instanceof THREE.Mesh) child.geometry.translate(0, 0, bodyOffsetZ);
  });
  wheels.forEach(batch);
  wheels.forEach(w => { w.castShadow = true; w.receiveShadow = true; });
  return { body, wheels };
}
