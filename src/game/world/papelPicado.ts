import type { BufferGeometry, ColorRepresentation } from "three";
import { boxGeo } from "./util";

/** A string of papel picado across a room's upper back wall (at height y, z out from it), sagging, its flags in the
 *  fiesta's colors (`k` turns where the colors start). In the smalls. */
export function papelPicadoWall(S: { add(g: BufferGeometry, color: ColorRepresentation): void }, w: number, y: number, z: number, k: number) {
  const PAPEL = ["#e4007c", "#f6a800", "#00a6a6", "#7ac143", "#ff5a36", "#6d2e9e", "#1f6fd1"], n = Math.round((w - 1) / 0.42);
  S.add(boxGeo(w - 1, 0.02, 0.02, 0, y + 0.02, z), "#f4f1ea");
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n, x = -w / 2 + 0.5 + t * (w - 1);
    S.add(boxGeo(0.34, 0.42, 0.01, x, y - 0.2 - Math.sin(t * Math.PI) * 0.22, z), PAPEL[(i + k) % PAPEL.length]);
  }
}
