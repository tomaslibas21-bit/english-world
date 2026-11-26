// The surf lesson's shapes (the boards in the water, and the ones in a surf school's rack: world/mexican.ts).
import * as THREE from "three";
import { EDITION } from "../../edition";
import { groundFace } from "../world/shapes";

export type Part = [THREE.BufferGeometry, THREE.ColorRepresentation];
const box = (w: number, h: number, d: number, x: number, y: number, z: number) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);

/** A surfboard lying flat round (0, 0), its nose towards +z, `len` m long and `wid` wide: the deck in `deck`, a
 *  stringer down its middle in `stripe`, three fins under the tail. */
export function surfboardParts(len: number, wid: number, deck: THREE.ColorRepresentation, stripe: THREE.ColorRepresentation, thick = 0.07): Part[] {
  const s = new THREE.Shape(), h = len / 2, w = wid / 2;
  s.moveTo(-w * 0.42, -h); s.lineTo(w * 0.42, -h);
  s.quadraticCurveTo(w * 0.98, -h * 0.72, w, -h * 0.05);
  s.quadraticCurveTo(w * 0.92, h * 0.62, 0, h);
  s.quadraticCurveTo(-w * 0.92, h * 0.62, -w, -h * 0.05);
  s.quadraticCurveTo(-w * 0.98, -h * 0.72, -w * 0.42, -h);
  const flat = (shape: THREE.Shape, depth: number, y: number) => {
    // the outline drawn in (x, z): ExtrudeGeometry stands it along +z, so it is laid down, the nose to +z
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 5 }).rotateX(Math.PI / 2).translate(0, y + depth, 0);
    g.scale(1, 1, -1);
    // (the mirror turned the faces inside out)
    const idx = g.index;
    if (idx) for (let i = 0; i < idx.count; i += 3) { const a = idx.getX(i); idx.setX(i, idx.getX(i + 2)); idx.setX(i + 2, a); }
    else { const p = g.attributes.position; for (let i = 0; i < p.count; i += 3) for (const k of [0, 1, 2]) { const a = p.getComponent(i, k); p.setComponent(i, k, p.getComponent(i + 2, k)); p.setComponent(i + 2, k, a); } }
    g.computeVertexNormals();
    return g;
  };
  const parts: Part[] = [[flat(s, thick, 0), deck]];
  parts.push([box(wid * 0.07, 0.012, len * 0.9, 0, thick + 0.006, 0), stripe]);
  parts.push([box(wid * 0.72, 0.012, len * 0.06, 0, thick + 0.006, -h * 0.55), stripe]);
  if (EDITION.id === "es") {
    // La Ola's sun and two painted waves, below the middle so the board-choice caption leaves them visible.
    const x = -wid * 0.21, z = -len * 0.09, top = thick + 0.0015;
    parts.push([new THREE.CircleGeometry(wid * 0.10, 8).rotateX(-Math.PI / 2).translate(x, top, z), stripe]);
    for (const offset of [0.15, 0.20]) {
      const width = wid * 0.24, rise = len * 0.012, stroke = len * 0.006, cz = -len * offset;
      const outline: [number, number][] = [[-0.5, 0], [-1 / 6, 1], [1 / 6, 0], [0.5, 1],
        [0.5, 1 + stroke / rise], [1 / 6, stroke / rise], [-1 / 6, 1 + stroke / rise], [-0.5, stroke / rise]]
        .map(([u, v]) => [x + u * width, cz + v * rise]);
      parts.push([groundFace(outline).translate(0, top, 0), stripe]);
    }
  }
  for (const [x, z] of [[0, -h * 0.86], [-w * 0.55, -h * 0.72], [w * 0.55, -h * 0.72]]) parts.push([new THREE.ConeGeometry(0.07, 0.16, 4).scale(0.3, 1, 1).rotateX(Math.PI).translate(x, -0.08, z), stripe]);
  return parts;
}

/** The boards one can be handed: a long foam one (beginners), a short one, a paddleboard. */
export const BOARDS = {
  long: { len: 2.75, wid: 0.58, thick: 0.09, deck: "#ffd23f", stripe: "#e4572e" },
  short: { len: 1.95, wid: 0.5, thick: 0.065, deck: "#fdfcf7", stripe: "#1f6fd1" },
  sup: { len: 3.15, wid: 0.8, thick: 0.11, deck: "#2ec4b6", stripe: "#fdfcf7" },
} as const;
export type BoardKind = keyof typeof BOARDS;
