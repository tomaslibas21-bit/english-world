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

