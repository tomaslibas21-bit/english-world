// What one can drive: a convertible with its top down and a small open motorboat. Each is one vertex-coloured
// geometry (forward = +Z, the wheels or the keel on y = 0), so each is one draw call, like the town's other cars.
import * as THREE from "three";
import { colourMerge } from "../world/util";

type Part = [THREE.BufferGeometry, THREE.ColorRepresentation];

/** A side profile (z forward, y up) extruded across `width`, centred on x = 0. */
function profile(points: [number, number][], width: number) {
  const s = new THREE.Shape();
  s.moveTo(points[0][0], points[0][1]);
  for (const [z, y] of points.slice(1)) s.lineTo(z, y);
  s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth: width, bevelEnabled: false }).rotateY(-Math.PI / 2).translate(width / 2, 0, 0);
}
const box = (w: number, h: number, d: number, x: number, y: number, z: number) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);

/** Where people sit in the convertible (the car's own coordinates; +X is the driver's side, the left, as in both
 *  towns): the hips' place on the ground plan, how high the seat is over `floor`, and how far they lean back. */
export const CAR_SEATS = { floor: 0.22, seat: 0.3, recline: 0.3, driver: [0.43, -0.34] as [number, number], passenger: [-0.43, -0.34] as [number, number] };
/** The cabin's rim (the doors' tops) and the car's length and width (m). */
export const CAR_SIZE = { length: 4.34, width: 1.9, door: 0.9 };

/** A convertible, the top folded down behind the back seat: a long hood, a raked windshield in a chrome frame, two
 *  seats in front and a bench behind, a wheel, whitewall tires. `paint` the body, `inside` the seats. */
export function convertibleGeometry(paint: string, inside = "#f3e6cf") {
  const parts: Part[] = [];
  const add = (g: THREE.BufferGeometry, c: THREE.ColorRepresentation) => parts.push([g, c]);
  const shade = new THREE.Color(paint).multiplyScalar(0.74), chrome = "#dfe4e8", dark = "#2b2d31", glass = "#a9d3e6";
  const seat = new THREE.Color(inside), seatShade = seat.clone().multiplyScalar(0.86);
  // the hood, long and low, down to the grille; the trunk; the floor between them
  add(profile([[0.72, 0.3], [2.15, 0.3], [2.17, 0.6], [2.05, 0.82], [0.72, 0.92]], 1.9), paint);
  add(profile([[-2.15, 0.3], [-1.22, 0.3], [-1.22, 0.93], [-1.9, 0.9], [-2.17, 0.74]], 1.9), paint);
  add(box(1.9, 0.14, 1.96, 0, 0.37, -0.25), shade);
  add(box(1.7, 0.02, 1.94, 0, 0.45, -0.25), "#3a3c41"); // the carpet
  for (const s of [-1, 1]) {
    // the doors and the sills, a line of chrome along their tops, a darker line along the body
    add(box(0.11, 0.5, 1.96, s * 0.895, 0.67, -0.25), paint);
    add(box(0.13, 0.03, 1.96, s * 0.895, 0.93, -0.25), chrome);
    add(box(0.02, 0.05, 4.1, s * 0.955, 0.6, 0), shade);
    add(box(0.03, 0.04, 0.2, s * 0.96, 0.74, -0.1), chrome); // the handle
    // the windshield's pillars, and a mirror on each
    add(profile([[0.74, 0.92], [0.66, 0.92], [0.4, 1.36], [0.48, 1.36]], 0.06).translate(s * 0.87, 0, 0), chrome);
    add(box(0.16, 0.09, 0.07, s * 1.0, 1.02, 0.66), chrome);
  }
  // the windshield, raked back, its top bar
  add(profile([[0.72, 0.93], [0.68, 0.93], [0.43, 1.34], [0.47, 1.34]], 1.68), glass);
  add(box(1.8, 0.05, 0.06, 0, 1.36, 0.44), chrome);
  // the dashboard, the wheel on its column
  add(box(1.7, 0.16, 0.26, 0, 0.84, 0.6), dark);
  add(new THREE.TorusGeometry(0.17, 0.022, 5, 14).rotateX(-0.42).translate(0.43, 0.98, 0.36), dark);
  add(new THREE.CylinderGeometry(0.025, 0.025, 0.24, 5).rotateX(Math.PI / 2 - 0.42).translate(0.43, 0.94, 0.46), "#55585e");
  // two seats in front (cushion and back), a bench behind, the folded top on the deck behind it
  for (const x of [-0.43, 0.43]) {
    add(box(0.66, 0.12, 0.6, x, 0.5, -0.24), seat);
    add(box(0.66, 0.52, 0.13, x, 0.78, -0.6).rotateX(0), seatShade);
    add(box(0.5, 0.05, 0.14, x, 1.05, -0.6), seat);
  }
  add(box(1.66, 0.12, 0.4, 0, 0.5, -0.92), seat);
  add(box(1.66, 0.42, 0.1, 0, 0.74, -1.16), seatShade);
  add(box(1.72, 0.16, 0.36, 0, 1.0, -1.38), "#33353a");
  add(box(1.76, 0.03, 0.4, 0, 1.09, -1.38), "#45484e");
  // chrome bumpers, the grille, round headlights, tail lights, a plate at each end
  for (const z of [-2.2, 2.2]) add(box(1.98, 0.14, 0.12, 0, 0.4, z), chrome);
  add(box(1.0, 0.18, 0.05, 0, 0.62, 2.16), "#8d949b");
  for (let i = 0; i < 5; i++) add(box(0.03, 0.18, 0.06, -0.4 + i * 0.2, 0.62, 2.165), chrome);
  for (const x of [-0.7, 0.7]) {
    add(new THREE.CylinderGeometry(0.15, 0.15, 0.06, 10).rotateX(Math.PI / 2).translate(x, 0.66, 2.14), chrome);
    add(new THREE.CylinderGeometry(0.115, 0.115, 0.07, 10).rotateX(Math.PI / 2).translate(x, 0.66, 2.15), "#fff6cf");
    add(box(0.3, 0.16, 0.06, x, 0.74, -2.15), "#d8343a");
  }
  for (const z of [-2.265, 2.265]) add(box(0.46, 0.14, 0.02, 0, 0.42, z), "#f6f3ea");
  // the wheels: a tire, a white wall, a chrome cap
  for (const [x, z] of [[-0.88, 1.36], [0.88, 1.36], [-0.88, -1.36], [0.88, -1.36]]) {
    add(new THREE.CylinderGeometry(0.37, 0.37, 0.26, 14).rotateZ(Math.PI / 2).translate(x, 0.37, z), "#222326");
    add(new THREE.CylinderGeometry(0.27, 0.27, 0.28, 12).rotateZ(Math.PI / 2).translate(x, 0.37, z), "#f2f0ea");
    add(new THREE.CylinderGeometry(0.16, 0.16, 0.3, 10).rotateZ(Math.PI / 2).translate(x, 0.37, z), chrome);
  }
  return colourMerge(parts);
}

/** Where one sits in the boat (its own coordinates) and where its waterline is (m over its keel). */
export const BOAT_SEATS = { floor: 0.2, seat: 0.3, helm: [0, -1.05] as [number, number], water: 0.34 };
export const BOAT_SIZE = { length: 5.2, width: 1.74, rim: 0.78 };

/** A small open motorboat: a white hull with a pointed bow, a stripe in `stripe` under its rim, two thwarts, an
 *  outboard motor with its tiller, a little light on a pole. */
export function motorboatGeometry(stripe: string, hull = "#f4f6f8") {
  const parts: Part[] = [];
  const add = (g: THREE.BufferGeometry, c: THREE.ColorRepresentation) => parts.push([g, c]);
  const outline = (inset: number) => {
    const s = new THREE.Shape(), w = 0.87 - inset, bow = 2.75 - inset * 1.6, st = -2.3 + inset;
    // (drawn with the bow at -y: standing the outline up along y turns the shape's -y into +z, the bow's side)
    s.moveTo(-w, -st); s.lineTo(w, -st); s.lineTo(w, -0.7); s.quadraticCurveTo(w * 0.95, -1.9, 0, -bow);
    s.quadraticCurveTo(-w * 0.95, -1.9, -w, -0.7); s.lineTo(-w, -st);
    return s;
  };
  // (an outline seen from above, stood up along y)
  const ext = (s: THREE.Shape, depth: number, y: number) => new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 5 }).rotateX(-Math.PI / 2).translate(0, y, 0);
  const ring = (a: number, b: number) => { const s = outline(a); s.holes.push(new THREE.Path(outline(b).getPoints(5))); return s; };
  add(ext(outline(0.05), 0.2, 0), hull);
  add(ext(ring(0, 0.09), 0.5, 0.2), hull);
  add(ext(ring(-0.012, 0.08), 0.1, 0.56), stripe);
  add(ext(ring(-0.02, 0.1), 0.08, 0.7), "#c9a27a"); // the wooden rim
  add(ext(outline(0.09), 0.02, 0.2), "#b9cdd6"); // the floor
  for (const z of [-1.05, 0.55]) add(box(1.58, 0.06, 0.34, 0, 0.5, z), "#b8895a");
  add(profile([[1.5, 0.2], [2.3, 0.2], [2.3, 0.62], [1.5, 0.62]], 0.9).scale(1, 1, 1), "#c9a27a"); // the bow's locker
  // the outboard: its cowl, its leg down to the propeller, the tiller forward to the helm
  add(box(0.36, 0.44, 0.42, 0, 1.04, -2.42), "#2f3136");
  add(box(0.36, 0.08, 0.42, 0, 1.28, -2.42), stripe);
  add(box(0.1, 0.86, 0.12, 0, 0.42, -2.5), "#55595e");
  add(box(0.05, 0.05, 0.62, 0.05, 0.98, -1.92), "#55595e");
  // a little pole with a light, a cleat on the bow, a coil of rope
  add(new THREE.CylinderGeometry(0.02, 0.02, 0.7, 5).translate(0, 1.0, 2.2), "#dfe4e8");
  add(new THREE.SphereGeometry(0.06, 6, 5).translate(0, 1.38, 2.2), "#fff2b0");
  add(new THREE.TorusGeometry(0.16, 0.045, 5, 10).rotateX(Math.PI / 2).translate(-0.3, 0.66, 1.75), "#d9c9a3");
  return colourMerge(parts);
}

/** The buoys along the bay's edge, all in one geometry (the water's surface at y = 0): an orange float with a white
 *  band, a short mast and a ball on top, each turned and tipped a little its own way. */
export function buoysGeometry(spots: [number, number][]) {
  const parts: Part[] = [];
  spots.forEach(([x, z], i) => {
    const tip = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(Math.sin(i * 2.3) * 0.09, i * 1.7, Math.cos(i * 3.1) * 0.09)).setPosition(x, 0, z);
    const add = (g: THREE.BufferGeometry, c: THREE.ColorRepresentation) => parts.push([g.applyMatrix4(tip), c]);
    add(new THREE.CylinderGeometry(0.5, 0.62, 0.5, 7, 1, true).translate(0, 0.05, 0), "#f0642c");
    add(new THREE.CylinderGeometry(0.42, 0.5, 0.16, 7, 1, true).translate(0, 0.38, 0), "#f6f3ea");
    add(new THREE.CylinderGeometry(0.2, 0.42, 0.42, 7).translate(0, 0.67, 0), "#f0642c");
    add(new THREE.CylinderGeometry(0.035, 0.035, 0.6, 4, 1, true).translate(0, 1.15, 0), "#dfe4e8");
    add(new THREE.OctahedronGeometry(0.14).translate(0, 1.5, 0), "#f6f3ea");
  });
  return colourMerge(parts);
}

/** Music over a parked convertible: two notes that drift up and fade (drawn on a small canvas once). */
export function noteTexture() {
  const c = document.createElement("canvas");
  c.width = 64; c.height = 64;
  const x = c.getContext("2d")!;
  x.fillStyle = "#ffffff";
  x.beginPath(); x.ellipse(22, 46, 11, 8, -0.4, 0, Math.PI * 2); x.fill();
  x.fillRect(30, 10, 5, 37);
  x.beginPath(); x.moveTo(30, 10); x.quadraticCurveTo(52, 14, 50, 32); x.quadraticCurveTo(46, 22, 35, 22); x.closePath(); x.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
