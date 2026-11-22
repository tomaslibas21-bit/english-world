import * as THREE from "three";
import { boxGeo, cylGeo } from "./util";
import type { IslandPoint } from "./island";

type Add = (g: THREE.BufferGeometry, color: string, o?: { flat?: boolean; emissive?: string; cast?: boolean }) => void;

const iron = "#283c43";
const brickRed = "#bc4039";
const radius = (y: number) => 2.6 - ((y - 1) / 16) * 0.7;

/** Each stripe is a section of the taper, sharing the exact edge of the course below. */
export function addIslandTower(add: Add, light: Add, { x, z }: IslandPoint) {
  let bottom = 1;
  for (const [top, color] of [[4.15, "#fff5df"], [6.9, brickRed], [11, "#fff5df"],
    [13.8, brickRed], [16.8, "#fff5df"]] as const) {
    add(new THREE.CylinderGeometry(radius(top), radius(bottom), top - bottom, 16, 1, true)
      .translate(x, (top + bottom) / 2, z), color);
    bottom = top;
  }
  // The fluted glass lens sits inside the open lantern frame, visible through every bay.
  const profile = [[0.47, 17.23], [0.67, 17.46], [0.86, 17.68], [0.76, 17.75],
    [1.03, 17.91], [0.92, 17.98], [1.05, 18.12], [0.82, 18.2], [0.89, 18.32],
    [0.62, 18.54], [0.43, 18.8]];
  light(new THREE.LatheGeometry(profile.map(([r, h]) => new THREE.Vector2(r, h)), 12).translate(x, 0, z), "#ffe3a2");
  add(new THREE.ConeGeometry(2.12, 1.85, 8).translate(x, 20, z), brickRed);
  return new THREE.CylinderGeometry(1.52, 1.52, 1.72, 8, 1, true).translate(x, 18.18, z);
}

/** The tower's stone foot, gallery balcony and the iron frame around the lantern glass. */
export function addLighthouse(add: Add, { x, z }: IslandPoint) {
  add(cylGeo(2.95, 3.3, 1.9, x, 0.75, z, 16), "#929592", { flat: true });
  add(cylGeo(2.99, 3.05, 0.22, x, 1.62, z, 16), "#b6b6a9");
  add(cylGeo(2.75, 1.99, 0.66, x, 16.74, z, 16), iron);
  add(cylGeo(2.82, 2.82, 0.19, x, 17.07, z, 16), iron);
  for (let i = 0; i < 16; i++) {
    const a = i * Math.PI / 8;
    add(cylGeo(0.063, 0.072, 0.93, x + Math.cos(a) * 2.66, 17.61, z + Math.sin(a) * 2.66, 5), iron);
  }
  for (const h of [17.58, 18.07]) {
    add(new THREE.TorusGeometry(2.66, h > 18 ? 0.084 : 0.052, 5, 16).rotateX(Math.PI / 2).translate(x, h, z), iron);
  }
  add(cylGeo(1.65, 1.72, 0.21, x, 17.24, z, 8), "#466066");
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    add(cylGeo(0.085, 0.085, 1.8, x + Math.sin(a) * 1.52, 18.15, z + Math.cos(a) * 1.52, 6), iron);
  }
  add(cylGeo(2.12, 1.69, 0.22, x, 19.03, z, 8), iron);
  add(new THREE.SphereGeometry(0.24, 8, 6).translate(x, 21.03, z), "#ae8450");
  add(new THREE.ConeGeometry(0.08, 0.72, 6).translate(x, 21.52, z), iron);
  // the door and three small windows on the town's side (south), following the tower's taper
  add(boxGeo(1.1, 2.1, 0.3, x, 2.75, z + radius(2.75) - 0.02), "#7a2e2e");
  add(boxGeo(1.4, 0.2, 0.5, x, 3.9, z + radius(3.9)), "#3a3d42");
  add(boxGeo(1.6, 0.25, 1.2, x, 1.75, z + 3.0), "#9a9da1");
  for (const y of [7.2, 12.4, 15.2]) { add(boxGeo(0.55, 0.85, 0.2, x, y, z + radius(y) - 0.02), "#2b3a48", { emissive: "#1b3a4c", cast: false }); add(boxGeo(0.75, 0.1, 0.3, x, y - 0.48, z + radius(y)), "#d9d4c7", { cast: false }); }
  add(boxGeo(0.1, 0.12, 0.1, x + 0.37, 2.66, z + radius(2.66) + 0.15), "#ce9b52");
  // (no beam: tried as two faint turning cones of light, in daylight it read as a pale tube in the sky)
}
