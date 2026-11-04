// One low-poly car (forward = +Z, wheels on y = 0): a body with a sloping hood and trunk, a glass cabin under a roof
// with pillars, bumpers, a grille, lights, mirrors and wheels with hubcaps. Vertex-coloured, one geometry, so a car is
// one draw call (parked cars are merged into a single mesh). Used by the parked cars, the taxi and the cars that drive.
import * as THREE from "three";
import { colourMerge } from "./util";

/** A side profile (z forward, y up) extruded across the car's width, centred on x = 0. */
function profile(points: [number, number][], width: number) {
  const s = new THREE.Shape();
  s.moveTo(points[0][0], points[0][1]);
  for (const [z, y] of points.slice(1)) s.lineTo(z, y);
  s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth: width, bevelEnabled: false }).rotateY(-Math.PI / 2).translate(width / 2, 0, 0);
}

export function carParts(color: string, opts: { taxi?: boolean } = {}): [THREE.BufferGeometry, THREE.ColorRepresentation][] {
  const parts: [THREE.BufferGeometry, THREE.ColorRepresentation][] = [];
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, c: THREE.ColorRepresentation) =>
    parts.push([new THREE.BoxGeometry(w, h, d).translate(x, y, z), c]);
  const glass = "#7fa9c4", dark = "#2f3136", trim = new THREE.Color(color).multiplyScalar(0.72);
  // the body: a low hood in front, the trunk behind, the belt line under the windows
  parts.push([profile([[-2.12, 0.3], [2.12, 0.3], [2.14, 0.62], [2.0, 0.84], [1.05, 0.93], [-1.2, 0.96], [-1.98, 0.9], [-2.14, 0.72]], 1.86), color]);
  // the cabin: glass all round, a roof on top, and pillars between the windows
  parts.push([profile([[1.08, 0.9], [0.38, 1.47], [-0.78, 1.49], [-1.26, 0.92]], 1.7), glass]);
  parts.push([profile([[0.44, 1.43], [0.36, 1.54], [-0.78, 1.56], [-0.86, 1.45]], 1.74), color]);
  for (const s of [-1, 1]) {
    // the windscreen's and the back window's pillars, and one between the side windows
    parts.push([profile([[1.1, 0.9], [1.0, 0.9], [0.32, 1.47], [0.42, 1.47]], 0.07).translate(s * 0.84, 0, 0), color]);
    parts.push([profile([[-1.18, 0.92], [-1.3, 0.92], [-0.84, 1.49], [-0.74, 1.49]], 0.07).translate(s * 0.84, 0, 0), color]);
    box(0.07, 0.56, 0.12, s * 0.84, 1.2, -0.22, color);
    box(0.14, 0.09, 0.12, s * 0.99, 1.0, 0.92, color); // mirrors
  }
  box(1.9, 0.18, 0.14, 0, 0.42, 2.14, dark); // bumpers
  box(1.9, 0.18, 0.14, 0, 0.42, -2.14, dark);
  box(0.74, 0.14, 0.04, 0, 0.64, 2.14, dark); // grille
  box(1.88, 0.06, 4.1, 0, 0.62, 0, trim); // a line along the doors
  for (const x of [-0.62, 0.62]) {
    box(0.38, 0.14, 0.05, x, 0.72, 2.13, "#fff4c2"); // headlights
    box(0.34, 0.12, 0.05, x, 0.78, -2.15, "#d8343a"); // tail lights
  }
  for (const [x, z] of [[-0.86, 1.35], [0.86, 1.35], [-0.86, -1.35], [0.86, -1.35]]) {
    parts.push([new THREE.CylinderGeometry(0.37, 0.37, 0.28, 14).rotateZ(Math.PI / 2).translate(x, 0.37, z), "#222326"]);
    parts.push([new THREE.CylinderGeometry(0.2, 0.2, 0.3, 10).rotateZ(Math.PI / 2).translate(x, 0.37, z), "#c9ccd1"]);
  }
  if (opts.taxi) {
    box(0.72, 0.24, 0.32, 0, 1.68, -0.2, "#ffffff"); // the roof light
    for (let i = 0; i < 8; i++) box(1.9, 0.08, 0.24, 0, 0.68, -1.75 + i * 0.5, i % 2 ? "#222222" : color); // the checks
  }
  return parts;
}

/** The car as one vertex-coloured geometry. */
export function carGeometry(color: string, opts: { taxi?: boolean } = {}) {
  return colourMerge(carParts(color, opts));
}

// ---------------------------------------------------------------------------------------------------------------
// A Mexican town's vehicles (the Spanish edition's theme: docs/es/TOWN.md): a vochito, a white-and-green taxi, the
// colectivo van and the city bus. Same conventions as carParts: forward = +Z, wheels on y = 0, vertex-coloured.

type Parts = [THREE.BufferGeometry, THREE.ColorRepresentation][];

function wheels(parts: Parts, pts: [number, number][], r: number, w: number) {
  for (const [x, z] of pts) {
    parts.push([new THREE.CylinderGeometry(r, r, w, 14).rotateZ(Math.PI / 2).translate(x, r, z), "#222326"]);
    parts.push([new THREE.CylinderGeometry(r * 0.52, r * 0.52, w + 0.02, 10).rotateZ(Math.PI / 2).translate(x, r, z), "#c9ccd1"]);
  }
}

/** A "vochito" (the old VW Beetle that Mexico kept making until 2003): the round shell, the fenders over the wheels,
 *  running boards, round headlights on the front fenders, chrome bumpers. A little shorter and narrower than a car. */
export function vochoParts(color: string): Parts {
  const parts: Parts = [];
  const glass = "#7fa9c4", dark = "#2f3136", chrome = "#d8dde2";
  // the shell: a low nose, the windshield, the round roof and the sloping back over the engine
  parts.push([profile([[-1.98, 0.32], [1.96, 0.32], [2.0, 0.55], [1.86, 0.78], [1.45, 0.92], [0.98, 0.98], [0.58, 1.38], [0.1, 1.47], [-0.45, 1.45],
    [-0.98, 1.3], [-1.45, 1.05], [-1.82, 0.78], [-2.0, 0.5]], 1.5), color]);
  // the windows: a band that stands a little out of the shell at the sides, the windshield in front
  parts.push([profile([[1.02, 0.97], [0.6, 1.37], [-0.45, 1.36], [-0.98, 1.2], [-1.12, 1.0]], 1.53), glass]);
  for (const s of [-1, 1]) {
    // the window pillars, in the body colour
    parts.push([new THREE.BoxGeometry(0.05, 0.4, 0.09).rotateX(-0.75).translate(s * 0.765, 1.18, 0.8), color]);
    parts.push([new THREE.BoxGeometry(0.05, 0.38, 0.09).translate(s * 0.765, 1.17, -0.25), color]);
    // fenders over the wheels and the running board between them
    for (const z of [1.25, -1.3]) parts.push([new THREE.CylinderGeometry(0.44, 0.44, 0.3, 8, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateX(Math.PI / 2).rotateY(Math.PI / 2).translate(s * 0.73, 0.4, z), color]);
    parts.push([new THREE.BoxGeometry(0.16, 0.06, 1.5).translate(s * 0.8, 0.32, 0), dark]);
    // a round headlight on each front fender, a small tail light on each back one
    parts.push([new THREE.SphereGeometry(0.11, 6, 4).scale(1, 1, 0.6).translate(s * 0.62, 0.75, 1.62), "#fff4c2"]);
    parts.push([new THREE.BoxGeometry(0.1, 0.16, 0.06).translate(s * 0.68, 0.72, -1.7), "#d8343a"]);
    parts.push([new THREE.BoxGeometry(0.06, 0.08, 0.14).translate(s * 0.8, 1.0, 0.9), dark]); // mirrors
  }
  parts.push([new THREE.BoxGeometry(1.62, 0.1, 0.12).translate(0, 0.42, 2.02), chrome]); // bumpers
  parts.push([new THREE.BoxGeometry(1.62, 0.1, 0.12).translate(0, 0.42, -2.03), chrome]);
  for (let i = 0; i < 4; i++) parts.push([new THREE.BoxGeometry(0.5, 0.025, 0.04).translate(0, 0.86 + i * 0.05, -1.62 - i * 0.04), dark]); // the engine's louvres
  wheels(parts, [[-0.72, 1.25], [0.72, 1.25], [-0.72, -1.3], [0.72, -1.3]], 0.33, 0.24);
  return parts;
}

/** A taxi of the town: the car in `body` with its doors and hood in `trim` (white and green, made up after
 *  Cancún's), a roof light and a door number. */
export function mxTaxiParts(body: string, trim: string): Parts {
  const parts = carParts(body);
  for (const s of [-1, 1]) {
    parts.push([new THREE.BoxGeometry(0.03, 0.3, 2.6).translate(s * 0.945, 0.56, 0.05), trim]); // the doors' band
    parts.push([new THREE.BoxGeometry(0.03, 0.15, 0.24).translate(s * 0.95, 0.78, 0.55), "#ffffff"]); // the number plate on the door
  }
  parts.push([new THREE.BoxGeometry(1.5, 0.03, 1.0).translate(0, 0.89, 1.5), trim]); // the hood
  parts.push([new THREE.BoxGeometry(0.78, 0.22, 0.3).translate(0, 1.67, -0.2), "#ffffff"]); // the roof light
  parts.push([new THREE.BoxGeometry(0.8, 0.07, 0.32).translate(0, 1.6, -0.2), trim]);
  return parts;
}

/** The colectivo: a white van with a stripe along its side and a route board behind the windshield (Quintana Roo's
 *  shared vans that stop anywhere along their road). */
export function colectivoParts(color: string, stripe: string): Parts {
  const parts: Parts = [];
  const glass = "#6f9ab8", dark = "#2f3136";
  parts.push([profile([[-2.6, 0.32], [2.5, 0.32], [2.58, 0.75], [2.45, 1.05], [2.05, 1.3], [1.55, 2.02], [-2.55, 2.06], [-2.62, 1.0]], 1.9), color]);
  // the windshield and the side windows
  parts.push([profile([[2.1, 1.31], [1.6, 1.98], [1.45, 1.98], [1.9, 1.31]], 1.84), glass]);
  for (const s of [-1, 1]) {
    parts.push([new THREE.BoxGeometry(0.03, 0.55, 3.7).translate(s * 0.955, 1.62, -0.6), glass]);
    for (const z of [0.6, -0.65, -1.9]) parts.push([new THREE.BoxGeometry(0.04, 0.57, 0.08).translate(s * 0.96, 1.62, z), color]); // pillars
    parts.push([new THREE.BoxGeometry(0.03, 0.14, 5.0).translate(s * 0.955, 1.08, -0.05), stripe]);
    parts.push([new THREE.BoxGeometry(0.03, 0.05, 5.0).translate(s * 0.955, 0.95, -0.05), "#f2c14e"]);
    parts.push([new THREE.BoxGeometry(0.14, 0.09, 0.12).translate(s * 1.0, 1.4, 1.7), dark]); // mirrors
  }
  parts.push([new THREE.BoxGeometry(0.9, 0.18, 0.04).translate(0, 1.88, 1.66), "#ffffff"]); // the route board
  parts.push([new THREE.BoxGeometry(1.9, 0.2, 0.14).translate(0, 0.42, 2.58), dark]);
  parts.push([new THREE.BoxGeometry(1.9, 0.2, 0.14).translate(0, 0.42, -2.62), dark]);
  for (const x of [-0.65, 0.65]) {
    parts.push([new THREE.BoxGeometry(0.34, 0.14, 0.05).translate(x, 0.8, 2.56), "#fff4c2"]);
    parts.push([new THREE.BoxGeometry(0.2, 0.3, 0.05).translate(x * 1.3, 0.9, -2.63), "#d8343a"]);
  }
  wheels(parts, [[-0.86, 1.65], [0.86, 1.65], [-0.86, -1.75], [0.86, -1.75]], 0.36, 0.26);
  return parts;
}

/** The city bus ("el camión" in Mexico): white over the stripe colour, a band of windows, the doors on the right, the
 *  route number lit in amber over the windshield (drawn with bars, like the bus's own sign). */
export function busParts(color: string, stripe: string, route: number): Parts {
  const parts: Parts = [];
  const glass = "#5f86a3", dark = "#2b2d31", L = 9.6, W = 2.4;
  parts.push([new THREE.BoxGeometry(W, 0.9, L).translate(0, 0.85, 0), stripe]); // the lower body
  parts.push([new THREE.BoxGeometry(W, 1.5, L).translate(0, 2.05, 0), color]);
  parts.push([new THREE.BoxGeometry(W - 0.1, 0.12, L - 0.4).translate(0, 2.86, 0), "#e6e8ea"]); // the roof
  for (const s of [-1, 1]) {
    parts.push([new THREE.BoxGeometry(0.03, 0.85, L - 1.6).translate(s * (W / 2 + 0.01), 2.0, -0.4), glass]);
    for (let z = -L / 2 + 1.2; z < L / 2 - 1; z += 1.3) parts.push([new THREE.BoxGeometry(0.04, 0.87, 0.08).translate(s * (W / 2 + 0.02), 2.0, z), color]);
    parts.push([new THREE.BoxGeometry(0.14, 0.12, 0.14).translate(s * 1.3, 2.3, L / 2 - 0.05), dark]); // mirrors
  }
  // the doors on the right (the curb side going forward), front and middle
  for (const z of [L / 2 - 1.0, -0.6]) parts.push([new THREE.BoxGeometry(0.04, 2.05, 1.0).translate(-(W / 2 + 0.02), 1.32, z), "#3f5e74"]);
  parts.push([new THREE.BoxGeometry(W - 0.2, 1.1, 0.04).translate(0, 1.95, L / 2 + 0.01), glass]); // the windshield
  parts.push([new THREE.BoxGeometry(W - 0.3, 0.32, 0.05).translate(0, 2.68, L / 2 + 0.02), dark]); // the route sign
  // the number in amber bars (a 7: the top bar and the slant)
  const amber = "#ffb627", sx = 0.12;
  const digit = (d: number, x0: number) => {
    const seg: Record<string, [number, number, number, number]> = { // w, h, x, y in the sign
      a: [sx, 0.03, 0, 0.1], b: [0.03, 0.09, sx / 2, 0.05], c: [0.03, 0.09, sx / 2, -0.05], d: [sx, 0.03, 0, -0.1],
      e: [0.03, 0.09, -sx / 2, -0.05], f: [0.03, 0.09, -sx / 2, 0.05], g: [sx, 0.03, 0, 0],
    };
    const on = ["abcdef", "bc", "abged", "abgcd", "fgbc", "afgcd", "afgedc", "abc", "abcdefg", "abcdfg"][d] ?? "";
    for (const k of on) { const [w, h, x, y] = seg[k]; parts.push([new THREE.BoxGeometry(w, h, 0.02).translate(x0 + x, 2.68 + y, L / 2 + 0.06), amber]); }
  };
  const ds = String(route).split("").map(Number);
  ds.forEach((d, i) => digit(d, 0.75 + (i - (ds.length - 1) / 2) * 0.2));
  parts.push([new THREE.BoxGeometry(0.9, 0.03, 0.02).translate(-0.35, 2.66, L / 2 + 0.06), amber]); // the route's name, as a line
  parts.push([new THREE.BoxGeometry(W, 0.28, 0.16).translate(0, 0.45, L / 2 + 0.06), dark]); // bumpers
  parts.push([new THREE.BoxGeometry(W, 0.28, 0.16).translate(0, 0.45, -L / 2 - 0.06), dark]);
  for (const x of [-0.85, 0.85]) {
    parts.push([new THREE.BoxGeometry(0.34, 0.16, 0.05).translate(x, 0.8, L / 2 + 0.02), "#fff4c2"]);
    parts.push([new THREE.BoxGeometry(0.22, 0.4, 0.05).translate(x, 1.0, -L / 2 - 0.02), "#d8343a"]);
  }
  wheels(parts, [[-1.05, 3.1], [1.05, 3.1], [-1.05, -2.9], [1.05, -2.9]], 0.5, 0.32);
  return parts;
}

/** How long each kind of vehicle is (m), for the traffic's gaps. */
export const VEHICLE_LENGTH = { car: 4.2, taxi: 4.2, colectivo: 5.2, bus: 9.6 } as const;

