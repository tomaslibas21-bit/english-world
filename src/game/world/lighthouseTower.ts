import * as THREE from "three";
import { boxGeo, cylGeo } from "./util";
import type { IslandPoint } from "./island";

type Add = (g: THREE.BufferGeometry, color: string, o?: { flat?: boolean; emissive?: string; cast?: boolean }) => void;

/** The lighthouse made a lighthouse: a stone foot, a door and windows towards the town, the gallery with its rail,
 *  the lantern's glazing bars, a finial. */
export function addLighthouse(add: Add, { x, z }: IslandPoint) {
  add(cylGeo(2.95, 3.3, 1.9, x, 0.75, z, 16), "#9a9da1", { flat: true });
  add(cylGeo(2.5, 2.05, 0.5, x, 16.8, z, 16), "#3a3d42");
  add(cylGeo(2.62, 2.62, 0.14, x, 17.1, z, 16), "#3a3d42");
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; add(cylGeo(0.035, 0.035, 0.85, x + Math.cos(a) * 2.5, 17.55, z + Math.sin(a) * 2.5, 4), "#3a3d42", { cast: false }); }
  add(new THREE.TorusGeometry(2.5, 0.045, 4, 16).rotateX(Math.PI / 2).translate(x, 17.98, z), "#3a3d42", { cast: false });
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; add(boxGeo(0.09, 2.0, 0.09, x + Math.cos(a) * 1.52, 18, z + Math.sin(a) * 1.52), "#3a3d42", { cast: false }); }
  add(cylGeo(1.62, 1.62, 0.16, x, 19.02, z, 12), "#8a2a22");
  add(new THREE.SphereGeometry(0.26, 8, 6).translate(x, 21.1, z), "#8a2a22");
  add(cylGeo(0.02, 0.02, 1.0, x, 21.7, z, 4), "#3a3d42", { cast: false });
  // the door and three small windows on the town's side (south), following the tower's taper
  const rad = (y: number) => 2.6 - ((y - 1) / 16) * 0.7;
  add(boxGeo(1.1, 2.1, 0.3, x, 2.75, z + rad(2.75) - 0.02), "#7a2e2e");
  add(boxGeo(1.4, 0.2, 0.5, x, 3.9, z + rad(3.9)), "#3a3d42");
  add(boxGeo(1.6, 0.25, 1.2, x, 1.75, z + 3.0), "#9a9da1");
  for (const y of [7.2, 12.4, 15.2]) { add(boxGeo(0.55, 0.85, 0.2, x, y, z + rad(y) - 0.02), "#2b3a48", { emissive: "#1b3a4c", cast: false }); add(boxGeo(0.75, 0.1, 0.3, x, y - 0.48, z + rad(y)), "#d9d4c7", { cast: false }); }
  // (no beam: tried as two faint turning cones of light, in daylight it read as a pale tube in the sky)
}
