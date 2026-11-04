import * as THREE from 'three';
import { batch, kit, matsFor, type V } from './vehicleKit';
import { labelTexture } from './streetTextures';

// Saloons, estates, vans and the ambulance, built the way the El Cajon is: shaped side panels cut
// away for the wheels, a crowned hood and roof, glass set in surrounds with mouldings, lamps with
// lenses, bumpers that wrap the ends, and an interior that shows through the glass. Every model
// faces +z with the ground at y 0 and is sized to its level box.
export interface SedanSpec { length: number; width: number; height: number; color: string; estate: boolean }
export interface VanSpec { length: number; width: number; height: number; color: string; ambulance: boolean }

// Where the wheels go: the axle positions and radius, for the caller to fit tyres.
export interface Fit { axles: [number, number]; radius: number; track: number }

const lerp = THREE.MathUtils.lerp;
const clamp = THREE.MathUtils.clamp;

// Pulls a quad's corners toward its middle by a margin, for the glass inside a window's surround.
function inset(points: V[], margin: number, fixX?: (y: number, z: number) => number): V[] {
  const c: V = [0, 0, 0];
  for (const p of points) { c[0] += p[0] / points.length; c[1] += p[1] / points.length; c[2] += p[2] / points.length; }
  const scale = [0, 1, 2].map((a) => {
    const extent = Math.max(...points.map((p) => Math.abs(p[a] - c[a])));
    return extent < 1e-4 ? 1 : Math.max(0.3, 1 - margin / extent);
  });
  return points.map((p) => {
    const q: V = [c[0] + (p[0] - c[0]) * scale[0], c[1] + (p[1] - c[1]) * scale[1], c[2] + (p[2] - c[2]) * scale[2]];
    if (fixX) q[0] = Math.sign(p[0]) * fixX(q[1], q[2]);
    return q;
  });
}

export function createSedan(spec: SedanSpec): { body: THREE.Group; fit: Fit } {
  const { length: L, width: W, height: H, estate } = spec;
  const m = matsFor(spec.color);
  const body = new THREE.Group();
  body.name = estate ? 'Estate car' : 'Saloon';
  const k = kit(body, m);
  const hw = W / 2;
  const R = estate ? 0.32 : 0.31;
  const axles: [number, number] = [-0.285 * L, 0.315 * L];
  const y0 = 0.2, arch = R + 0.055;
  const yb = 0.625 * H, yRoof = H - 0.035;
  const zN = L / 2, zT = -L / 2;
  const cowl = 0.15 * L;
  const zWT = cowl - 0.64 * (yRoof - yb);
  const zb = estate ? -0.465 * L : -0.275 * L;
  const zRT = zb + (estate ? 0.1 : 0.58) * (yRoof - yb);
  const zB = (zWT + zRT) / 2 + 0.02;
  const roofHalf = 0.83 * hw;

  const taper = (z: number) => Math.abs(z) / (L / 2);
  const topY = (z: number) => {
    if (z > cowl) return yb - 0.055 * H * ((z - cowl) / (zN - cowl)) ** 1.4;
    if (z < zb) return yb - (estate ? 0.0 : 0.03) * H * ((zb - z) / (zb - zT)) ** 1.5;
    return yb;
  };
  const half = (y: number, z: number) => {
    const h = clamp((y - y0) / (yb - y0), 0, 1);
    return hw * (0.935 + 0.065 * Math.sin(h * Math.PI * 0.9) - 0.02 * h - 0.05 * taper(z) ** 5);
  };
  const xAt = (y: number, z: number) => lerp(half(yb, z), roofHalf, clamp((y - yb) / (yRoof - yb), 0, 1)) - 0.004;
  const sidePoint = (s: number, y: number, z: number, offset = 0): V => [s * (half(y, z) + offset), y, z];

  for (const s of [-1, 1]) {
    // The side, with the wheel openings cut into its lower edge.
    k.surface(m.paint, 160, 14, (u, v) => {
      const z = lerp(zT, zN, u);
      let bottom = y0;
      for (const axle of axles) {
        const d = z - axle;
        if (Math.abs(d) < arch) bottom = Math.max(bottom, R + Math.sqrt(arch * arch - d * d));
      }
      return sidePoint(s, lerp(bottom, topY(z), v), z);
    }, [s, 0, 0]);
    for (const axle of axles) {
      const edge: V[] = [], inside: V[] = [];
      for (let i = 0; i <= 36; i++) {
        const a = i / 36 * Math.PI;
        const y = R + Math.sin(a) * arch, z = axle + Math.cos(a) * arch;
        edge.push(sidePoint(s, y, z, 0.004));
        inside.push([s * (half(y, z) - 0.05), y - 0.01, z]);
      }
      k.line(m.black, edge, 0.011);
      for (let i = 0; i < edge.length - 1; i++) k.patch(m.black, [edge[i], edge[i + 1], inside[i + 1], inside[i]], [s, -1, 0]);
    }
    // The greenhouse: a windscreen pillar to the roof, two door windows, and the pillars between.
    const corner = (z: number, y: number): V => [s * xAt(y, z), y, z];
    const doors = [
      [corner(cowl, yb), corner(zWT, yRoof), corner(zB + 0.035, yRoof), corner(zB + 0.035, yb)],
      [corner(zB - 0.035, yb), corner(zB - 0.035, yRoof), corner(zRT, yRoof), corner(zb, yb)],
    ];
    for (const quad of doors) k.windowPane(quad, inset(quad, 0.05, (y, z) => xAt(y, z) - 0.01), [s, 0.2, 0]);
    // The pillar between the doors.
    k.patch(m.paint, [corner(zB - 0.035, yb), corner(zB + 0.035, yb), corner(zB + 0.035, yRoof), corner(zB - 0.035, yRoof)], [s, 0.2, 0]);
    // Belt moulding, sill, door shut lines, handles and the mirror.
    k.line(m.chrome, [zT + 0.1, zb, zB, cowl, zN - 0.1].map((z) => sidePoint(s, topY(z) - 0.012, z, 0.004)), 0.004);
    k.line(m.black, [zT + 0.4, zb, zB, cowl + 0.1, zN - 0.5].map((z) => sidePoint(s, y0 + 0.07, z, 0.006)), 0.02);
    for (const z of [cowl + 0.03, zB, zb + 0.12]) {
      const seam: V[] = [];
      for (let i = 0; i <= 10; i++) seam.push(sidePoint(s, lerp(y0 + 0.06, yb - 0.01, i / 10), z, 0.004));
      k.line(m.black, seam, 0.003);
    }
    for (const z of [zB + 0.32, zB - 0.34]) {
      k.box(m.black, [0.012, 0.03, 0.16], sidePoint(s, yb - 0.1, z, 0.006), 0.006);
      k.box(m.chrome, [0.02, 0.016, 0.13], sidePoint(s, yb - 0.1, z, 0.014), 0.005);
    }
    k.rod(m.black, [s * (hw * 0.93), yb + 0.08, cowl - 0.02], [s * (hw + 0.1), yb + 0.14, cowl + 0.03], 0.01);
    k.box(m.paint, [0.1, 0.1, 0.17], [s * (hw + 0.12), yb + 0.15, cowl + 0.04], 0.04);
    k.box(m.black, [0.02, 0.085, 0.15], [s * (hw + 0.115), yb + 0.15, cowl + 0.0], 0.008);
    // Fuel flap on the rear wing, and marker lamps.
    k.box(m.paint, [0.012, 0.12, 0.13], sidePoint(s, yb - 0.1, zb - 0.28, 0.004), 0.01);
    k.box(m.amber, [0.012, 0.05, 0.1], sidePoint(s, yb - 0.17, zN - 0.2, 0.006), 0.004);
  }
  // The hood and the rear deck, crowned and closed to the fender tops.
  const deck = (z0: number, z1: number, rows: number) => k.surface(m.paint, 16, rows, (u, v) => {
    const z = lerp(z0, z1, v), edge = half(topY(z), z) - 0.004, x = (u * 2 - 1) * edge;
    return [x, topY(z) + 0.02 * (1 - (Math.abs(x) / edge) ** 2), z];
  }, [0, 1, 0]);
  deck(cowl, zN, 28);
  deck(zT, zb, 22);
  for (const s of [-1, 1]) k.line(m.black, [cowl + 0.02, lerp(cowl, zN, 0.5), zN - 0.1].map((z) => [s * (half(topY(z), z) - 0.12), topY(z) + 0.016, z] as V), 0.0025);
  // Windscreen and rear window.
  const wsOuter: V[] = [[-xAt(yb, cowl), yb, cowl], [xAt(yb, cowl), yb, cowl], [roofHalf, yRoof, zWT], [-roofHalf, yRoof, zWT]];
  k.windowPane(wsOuter, inset(wsOuter, 0.05), [0, 0.6, 1]);
  const rwOuter: V[] = [[xAt(yb, zb), yb, zb], [-xAt(yb, zb), yb, zb], [-roofHalf, yRoof, zRT], [roofHalf, yRoof, zRT]];
  k.windowPane(rwOuter, inset(rwOuter, 0.05), [0, 0.5, -1]);
  // The roof, with a gentle crown.
  k.surface(m.paint, 20, 20, (u, v) => {
    const z = lerp(zWT, zRT, v), x = (u * 2 - 1) * roofHalf;
    return [x, yRoof + 0.03 * (1 - (Math.abs(x) / roofHalf) ** 2), z];
  }, [0, 1, 0]);
  for (const s of [-1, 1]) k.rod(m.black, [s * roofHalf * 0.9, yRoof + 0.015, zWT + 0.02], [s * roofHalf * 0.9, yRoof + 0.015, zRT - 0.02], 0.004);
  // Wipers and the scuttle.
  for (const x of [-0.45, 0.2]) k.rod(m.black, [x - 0.28, yb + 0.03, cowl + 0.015], [x + 0.28, yb + 0.1, cowl - 0.02], 0.006);
  k.box(m.black, [W * 0.8, 0.03, 0.1], [0, yb + 0.005, cowl + 0.07], 0.01);

  // The nose: a painted panel, black grille with a frame, rectangular lamps, a wrap-round bumper.
  const noseY = topY(zN);
  k.box(m.paint, [hw * 1.9, noseY - 0.5, 0.08], [0, (noseY + 0.5) / 2, zN - 0.05], 0.03);
  k.box(m.black, [hw * 0.74, 0.17, 0.03], [0, 0.66, zN - 0.002], 0.012);
  k.box(m.chrome, [hw * 0.78, 0.014, 0.034], [0, 0.755, zN + 0.002], 0.005);
  k.box(m.chrome, [hw * 0.78, 0.012, 0.034], [0, 0.575, zN + 0.002], 0.005);
  for (let i = 1; i < 7; i++) k.box(m.chrome, [0.005, 0.15, 0.025], [(i - 3.5) * (hw * 0.74 / 7), 0.665, zN + 0.004], 0.002);
  for (const s of [-1, 1]) {
    k.box(m.chrome, [0.36, 0.16, 0.04], [s * (hw * 0.76), 0.68, zN - 0.012], 0.025);
    k.box(m.lens, [0.33, 0.13, 0.04], [s * (hw * 0.76), 0.68, zN + 0.01], 0.02);
    k.box(m.amber, [0.14, 0.05, 0.03], [s * (hw * 0.78), 0.5, zN - 0.045], 0.01);
  }
  k.box(m.plate, [0.5, 0.12, 0.014], [0, 0.46, zN + 0.008], 0.003);
  const bumper = (z: number, sign: 1 | -1) => {
    k.surface(m.black, 56, 12, (u, v) => {
      const x = (u * 2 - 1) * hw * 0.99, a = v * Math.PI * 2;
      const zz = sign * (Math.abs(z) - 0.09 * (Math.abs(x) / (hw * 0.99)) ** 6);
      return [x, 0.4 + Math.cos(a) * 0.085, zz + sign * Math.sin(a) * 0.055];
    }, [0, 0, sign]);
    k.box(m.chrome, [hw * 1.9, 0.012, 0.012], [0, 0.46, sign * (Math.abs(z) + 0.052)], 0.004);
  };
  bumper(zN - 0.02, 1);
  // The tail: wide lamps with amber and reverse lenses, a plate, a chrome strip.
  const tailY = topY(zT);
  k.box(m.paint, [hw * 1.88, tailY - 0.48, 0.08], [0, (tailY + 0.48) / 2, zT + 0.05], 0.03);
  for (const s of [-1, 1]) {
    k.box(m.chrome, [0.52, 0.16, 0.03], [s * (hw * 0.7), tailY - 0.14, zT + 0.002], 0.02);
    k.box(m.red, [0.34, 0.13, 0.034], [s * (hw * 0.7 + 0.08), tailY - 0.14, zT - 0.012], 0.014);
    k.box(m.amber, [0.1, 0.13, 0.034], [s * (hw * 0.7 - 0.14), tailY - 0.14, zT - 0.012], 0.014);
    k.box(m.white, [0.07, 0.05, 0.034], [s * (hw * 0.7 - 0.24), tailY - 0.14, zT - 0.012], 0.008);
  }
  k.box(m.black, [hw * 0.8, 0.07, 0.014], [0, tailY - 0.14, zT - 0.004], 0.005);
  k.box(m.plate, [0.5, 0.12, 0.014], [0, 0.56, zT - 0.012], 0.003);
  bumper(zT + 0.02, -1);
  // Exhaust.
  const pipe = k.add(new THREE.CylinderGeometry(0.03, 0.034, 0.25, 16, 1, true), m.chrome, [-hw * 0.55, 0.23, zT + 0.05]);
  pipe.rotation.x = Math.PI / 2;
  // Under-body and the floor, so there is no see-through gap.
  k.box(m.black, [W * 0.82, 0.1, L * 0.93], [0, y0 + 0.04, 0], 0.02);

  // The interior seen through the glass: a dash, a wheel, two front seats and a rear bench.
  const seatY = 0.5, backY = seatY + 0.2;
  k.box(m.dash, [W * 0.82, 0.2, 0.4], [0, yb - 0.1, cowl - 0.18], 0.05);
  k.box(m.dash, [W * 0.84, 0.05, 0.3], [0, yb - 0.03, cowl - 0.1], 0.02);
  for (const s of [-1, 1]) {
    k.box(m.cloth, [0.5, 0.13, 0.5], [s * 0.38, seatY, zWT - 0.12], 0.05);
    const back = k.box(m.cloth, [0.5, 0.5, 0.11], [s * 0.38, backY + 0.1, zWT - 0.4], 0.04);
    back.rotation.x = -0.18;
    k.box(m.cloth, [0.22, 0.14, 0.09], [s * 0.38, backY + 0.46, zWT - 0.47], 0.03);
  }
  const wheel = k.add(new THREE.TorusGeometry(0.17, 0.014, 6, 28), m.black, [0.38, yb - 0.1, cowl - 0.36]);
  wheel.rotation.x = Math.PI / 2 - 0.6;
  k.rod(m.dash, [0.38, yb - 0.2, cowl - 0.3], [0.38, yb - 0.11, cowl - 0.4], 0.025);
  k.box(m.cloth, [W * 0.82, 0.13, 0.5], [0, seatY, zB - 0.45], 0.05);
  const rear = k.box(m.cloth, [W * 0.82, 0.5, 0.1], [0, backY + 0.1, zb + 0.3 + (estate ? 0.2 : 0)], 0.04);
  rear.rotation.x = -0.14;
  k.box(m.dash, [W * 0.84, 0.04, estate ? 1.3 : 0.5], [0, yb - 0.02, zRT - 0.15 - (estate ? 0.5 : 0)], 0.01);
  batch(body);
  return { body, fit: { axles, radius: R, track: hw - 0.08 } };
}

export function createVan(spec: VanSpec): { body: THREE.Group; fit: Fit } {
  const { length: L, width: W, height: H, ambulance } = spec;
  const m = matsFor(spec.color);
  const body = new THREE.Group();
  body.name = ambulance ? 'Hospital ambulance' : 'Cargo van';
  const k = kit(body, m);
  const hw = W / 2;
  const R = 0.35;
  const axles: [number, number] = [-0.27 * L, 0.31 * L];
  const y0 = 0.28, arch = R + 0.06;
  const yRoof = H - 0.03, yS = yRoof - 0.1;
  const yb = 0.5 * H;
  const zN = L / 2, zT = -L / 2;
  const cowl = 0.27 * L;
  const zWT = cowl - 0.5 * (yRoof - yb);
  const zB = -0.03 * L;
  const roofHalf = 0.93 * hw * 0.97;

  const taper = (z: number) => Math.abs(z) / (L / 2);
  const half = (y: number, z: number) => {
    const h = clamp((y - y0) / (yS - y0), 0, 1);
    return hw * (0.965 + 0.035 * Math.sin(h * Math.PI * 0.9) - 0.035 * h ** 3 - 0.05 * taper(z) ** 6);
  };
  const xAt = (y: number, z: number) => y <= yS ? half(y, z) - 0.004 : lerp(half(yS, z), roofHalf, clamp((y - yS) / (yRoof - yS), 0, 1)) - 0.004;
  const sidePoint = (s: number, y: number, z: number, offset = 0): V => [s * (half(y, z) + offset), y, z];
  const hoodY = (z: number) => yb - 0.075 * H * ((z - cowl) / (zN - cowl)) ** 1.35;
  const archBottom = (z: number) => {
    let bottom = y0;
    for (const axle of axles) {
      const d = z - axle;
      if (Math.abs(d) < arch) bottom = Math.max(bottom, R + Math.sqrt(arch * arch - d * d));
    }
    return bottom;
  };

  for (const s of [-1, 1]) {
    // The cab side, up to the door glass, and the long cargo side to the roof edge.
    k.surface(m.paint, 70, 14, (u, v) => {
      const z = lerp(zB, zN, u);
      return sidePoint(s, lerp(archBottom(z), z > cowl ? hoodY(z) : yb, v), z);
    }, [s, 0, 0]);
    k.surface(m.paint, 90, 24, (u, v) => {
      const z = lerp(zT, zB, u);
      return sidePoint(s, lerp(archBottom(z), yS, v), z);
    }, [s, 0, 0]);
    // The cargo shoulder rolls over to the roof.
    k.surface(m.paint, 40, 5, (u, v) => {
      const z = lerp(zT, zB, u);
      return [s * lerp(half(yS, z) - 0.004, roofHalf, v ** 1.2), lerp(yS, yRoof, Math.sin(v * Math.PI / 2)), z];
    }, [s, 1, 0]);
    for (const axle of axles) {
      const edge: V[] = [], inside: V[] = [];
      for (let i = 0; i <= 36; i++) {
        const a = i / 36 * Math.PI;
        const y = R + Math.sin(a) * arch, z = axle + Math.cos(a) * arch;
        edge.push(sidePoint(s, y, z, 0.004));
        inside.push([s * (half(y, z) - 0.07), y - 0.01, z]);
      }
      k.line(m.black, edge, 0.013);
      for (let i = 0; i < edge.length - 1; i++) k.patch(m.black, [edge[i], edge[i + 1], inside[i + 1], inside[i]], [s, -1, 0]);
    }
    // The door glass, with its pillars, and the mirror on its arm.
    const corner = (z: number, y: number): V => [s * xAt(y, z), y, z];
    const quad = [corner(cowl, yb), corner(zWT, yRoof), corner(zB + 0.04, yRoof), corner(zB + 0.04, yb)];
    k.windowPane(quad, inset(quad, 0.06, (y, z) => xAt(y, z) - 0.01), [s, 0.2, 0]);
    const doorSeam: V[] = [];
    for (let i = 0; i <= 12; i++) doorSeam.push(sidePoint(s, lerp(y0 + 0.08, yb, i / 12), cowl - 0.03, 0.004));
    k.line(m.black, doorSeam, 0.003);
    k.line(m.black, [[cowl - 0.03, y0 + 0.08], [cowl - 0.03 - 0.03, y0 + 0.08], [zB + 0.04, y0 + 0.08], [zB + 0.04, yb]].map(([z, y]) => sidePoint(s, y, z, 0.004)), 0.003);
    k.box(m.chrome, [0.02, 0.025, 0.2], sidePoint(s, yb - 0.14, zB + 0.28, 0.012), 0.008);
    k.rod(m.black, [s * (hw * 0.96), yb + 0.2, cowl - 0.1], [s * (hw + 0.17), yb + 0.3, cowl - 0.06], 0.014);
    k.box(m.black, [0.1, 0.34, 0.15], [s * (hw + 0.19), yb + 0.33, cowl - 0.05], 0.04);
    k.box(m.windowMetal, [0.02, 0.29, 0.12], [s * (hw + 0.14), yb + 0.33, cowl - 0.05], 0.01);
    // The sliding cargo door: shut lines, a rail and a handle.
    const frame: V[] = [[zB - 0.1, y0 + 0.12], [zB - 0.1, yS - 0.14], [zT + 1.25, yS - 0.14], [zT + 1.25, y0 + 0.12], [zB - 0.1, y0 + 0.12]].map(([z, y]) => sidePoint(s, y, z, 0.004));
    k.line(m.black, frame, 0.0035);
    k.line(m.black, [zB - 0.1, zT + 0.5].map((z) => sidePoint(s, yS - 0.22, z, 0.006)), 0.012);
    k.box(m.chrome, [0.022, 0.04, 0.2], sidePoint(s, 0.95 * H * 0.5, zB - 0.35, 0.013), 0.01);
    // Lower rub strip, and the rear lamp, tall and narrow.
    k.line(m.black, [zT + 0.1, zN - 0.5].map((z) => sidePoint(s, y0 + 0.2, z, 0.007)), 0.03);
    k.box(m.red, [0.04, 0.62, 0.13], [s * (hw - 0.02), 0.95, zT + 0.04], 0.02);
    k.box(m.amber, [0.04, 0.12, 0.13], [s * (hw - 0.02), 1.42, zT + 0.04], 0.02);
  }
  // Hood, windscreen, roof.
  k.surface(m.paint, 18, 22, (u, v) => {
    const z = lerp(cowl, zN, v), edge = half(hoodY(z), z) - 0.004, x = (u * 2 - 1) * edge;
    return [x, hoodY(z) + 0.02 * (1 - (Math.abs(x) / edge) ** 2), z];
  }, [0, 1, 0]);
  const wsOuter: V[] = [[-xAt(yb, cowl), yb, cowl], [xAt(yb, cowl), yb, cowl], [roofHalf, yRoof, zWT], [-roofHalf, yRoof, zWT]];
  k.windowPane(wsOuter, inset(wsOuter, 0.06), [0, 0.6, 1]);
  k.surface(m.paint, 18, 40, (u, v) => {
    const z = lerp(zWT, zT, v), x = (u * 2 - 1) * roofHalf;
    return [x, yRoof + 0.025 * (1 - (Math.abs(x) / roofHalf) ** 2), z];
  }, [0, 1, 0]);
  for (const x of [-0.5, 0, 0.5].map((f) => f * roofHalf)) k.box(m.paint, [0.05, 0.016, L * 0.62], [x, yRoof + 0.03, zT + L * 0.34], 0.007);
  for (const x of [-0.2, 0.55]) k.rod(m.black, [x - 0.3, yb + 0.03, cowl + 0.02], [x + 0.3, yb + 0.12, cowl - 0.05], 0.007);
  k.box(m.black, [W * 0.84, 0.035, 0.12], [0, yb + 0.005, cowl + 0.09], 0.01);

  // The nose: grille, big rectangular lamps, a deep bumper with a step.
  const nose = hoodY(zN);
  k.box(m.paint, [hw * 1.9, nose - 0.5, 0.1], [0, (nose + 0.5) / 2, zN - 0.06], 0.04);
  k.box(m.black, [hw * 0.82, 0.26, 0.04], [0, 0.78, zN - 0.002], 0.015);
  for (let i = 0; i < 5; i++) k.box(m.chrome, [hw * 0.8, 0.014, 0.036], [0, 0.68 + i * 0.05, zN + 0.004], 0.004);
  k.box(m.chrome, [0.16, 0.12, 0.04], [0, 0.8, zN + 0.012], 0.01);
  for (const s of [-1, 1]) {
    k.box(m.chrome, [0.44, 0.2, 0.05], [s * (hw * 0.74), 0.82, zN - 0.012], 0.03);
    k.box(m.lens, [0.4, 0.17, 0.05], [s * (hw * 0.74), 0.82, zN + 0.012], 0.025);
    k.box(m.amber, [0.17, 0.07, 0.04], [s * (hw * 0.78), 0.56, zN - 0.04], 0.012);
  }
  k.box(m.black, [W * 0.98, 0.22, 0.2], [0, 0.45, zN - 0.07], 0.07);
  k.box(m.white, [W * 0.98, 0.012, 0.012], [0, 0.56, zN + 0.036], 0.004);
  k.box(m.plate, [0.5, 0.12, 0.014], [0, 0.45, zN + 0.036], 0.003);
  // The rear: twin doors with windows, hinges and a step bumper.
  const rear = zT;
  k.box(m.paint, [hw * 1.9, yS - 0.5, 0.06], [0, (yS + 0.5) / 2, rear + 0.03], 0.03);
  k.box(m.black, [0.012, yS - 0.5, 0.02], [0, (yS + 0.5) / 2, rear - 0.004], 0.003);
  for (const s of [-1, 1]) {
    const win: V[] = [[s * 0.06, 1.1, rear - 0.012], [s * (hw * 0.86), 1.1, rear - 0.012], [s * (hw * 0.86), yS - 0.2, rear - 0.012], [s * 0.06, yS - 0.2, rear - 0.012]];
    k.windowPane(win, inset(win, 0.04), [0, 0, -1]);
    k.box(m.chrome, [0.05, 0.02, 0.02], [s * 0.12, yS - 0.8, rear - 0.016], 0.006);
    for (const y of [0.7, 1.9]) k.box(m.black, [0.1, 0.07, 0.03], [s * (hw * 0.93), y, rear - 0.01], 0.01);
  }
  k.box(m.black, [W * 0.96, 0.16, 0.28], [0, 0.42, rear - 0.07], 0.05);
  k.box(m.plate, [0.5, 0.12, 0.014], [0, 0.78, rear - 0.016], 0.003);
  const pipe = k.add(new THREE.CylinderGeometry(0.035, 0.04, 0.3, 16, 1, true), m.chrome, [-hw * 0.5, 0.26, rear + 0.1]);
  pipe.rotation.x = Math.PI / 2;
  k.box(m.black, [W * 0.85, 0.12, L * 0.92], [0, y0 + 0.05, 0], 0.02);
  // The cab: dash, wheel, seats.
  k.box(m.dash, [W * 0.84, 0.3, 0.5], [0, yb - 0.15, cowl - 0.2], 0.07);
  for (const s of [-1, 1]) {
    k.box(m.cloth, [0.55, 0.14, 0.52], [s * 0.45, 0.78, zB + 0.55], 0.05);
    const back = k.box(m.cloth, [0.55, 0.7, 0.12], [s * 0.45, 1.15, zB + 0.2], 0.05);
    back.rotation.x = -0.12;
  }
  const wheel = k.add(new THREE.TorusGeometry(0.2, 0.016, 6, 28), m.black, [0.45, yb - 0.1, cowl - 0.45]);
  wheel.rotation.x = Math.PI / 2 - 0.9;
  k.box(m.dash, [W * 0.84, 0.05, 0.4], [0, yb - 0.02, cowl - 0.15], 0.02);
  k.box(m.dash, [W * 0.9, 0.04, 0.9], [0, 0.55, zB - 0.6], 0.01);

  if (ambulance) {
    const teal = new THREE.MeshStandardMaterial({ color: '#287b79', roughness: 0.5, metalness: 0.15 });
    const red = new THREE.MeshStandardMaterial({ color: '#b8232a', roughness: 0.5, metalness: 0.15 });
    const lettering = new THREE.MeshStandardMaterial({ map: labelTexture([{ text: 'AMBULANCE', size: 86, color: '#edf2df' }, { text: 'NORTHLINE GENERAL HOSPITAL', size: 30, color: '#dce5d5' }], '#245f61', 1024, 256), roughness: 0.6 });
    const blue = new THREE.MeshPhysicalMaterial({ color: '#2a76b0', emissive: '#16507c', emissiveIntensity: 0.5, roughness: 0.2, clearcoat: 1 });
    for (const s of [-1, 1]) {
      // A broad stripe along the side, and a band lower down, following the curve of the panel.
      const strip = (mat: THREE.Material, y1: number, y2: number, z1: number, z2: number, off: number) =>
        k.surface(mat, 24, 2, (u, v) => sidePoint(s, lerp(y1, y2, v), lerp(z1, z2, u), off), [s, 0, 0]);
      strip(teal, 1.02, 1.22, zT + 0.15, zB - 0.1, 0.007);
      strip(red, 0.86, 0.9, zT + 0.15, zB - 0.1, 0.007);
      strip(teal, 0.98, 1.14, zB + 0.04, zN - 0.5, 0.007);
      const panel = k.add(new THREE.PlaneGeometry(L * 0.46, 0.62), lettering, [s * (half(1.55, zT + L * 0.28) + 0.009), 1.62, zT + L * 0.3]);
      panel.rotation.y = s * Math.PI / 2;
      // A white cross on a red field on the cargo box.
      const cross = (dx: number, dy: number, w: number, h: number) => k.box(m.white, [0.006, h, w], [s * (half(1.6, zT + 0.8) + 0.008), 1.62 + dy, zT + 0.8 + dx], 0.002);
      cross(0, 0, 0.5, 0.14); cross(0, 0, 0.14, 0.5);
    }
    // Roof light bar and blue lenses, a siren on the hood.
    k.box(m.white, [W * 0.72, 0.09, 0.3], [0, yRoof + 0.07, zWT - 0.1], 0.03);
    for (const s of [-1, 1]) {
      k.box(blue, [W * 0.3, 0.1, 0.27], [s * W * 0.19, yRoof + 0.12, zWT - 0.1], 0.04);
      k.box(blue, [0.05, 0.08, 0.2], [s * (hw - 0.05), yRoof + 0.07, zWT - 0.1], 0.02);
    }
    k.box(red, [W * 0.84, 0.02, 0.012], [0, 0.68, rear - 0.018], 0.004);
    k.box(red, [W * 0.84, 0.02, 0.012], [0, 0.98, rear - 0.018], 0.004);
  }
  batch(body);
  return { body, fit: { axles, radius: R, track: hw - 0.12 } };
}
