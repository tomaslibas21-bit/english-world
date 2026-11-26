import * as THREE from "three";
import type { Part } from "./mexican";

/** Flush fittings inside the original city bus envelope; its lamps and amber route sign remain in front. */
export function cityBusFrontParts(): Part[] {
  const parts: Part[] = [];
  const panel = (w: number, h: number, x: number, y: number, z: number, ink: string, angle = 0) =>
    parts.push([new THREE.PlaneGeometry(w, h).rotateZ(angle).translate(x, y, z), ink]);
  panel(0.026, 1.08, 0, 1.95, 4.836, "#34545d");
  for (const side of [-1, 1]) {
    panel(0.64, 0.032, side * 0.53, 1.54, 4.839, "#293f46", side * 0.16);
    panel(0.42, 0.22, side * 0.85, 0.8, 4.804, "#34545d");
    panel(0.12, 0.06, side * 0.94, 1.14, 4.806, "#e9a34e");
  }
  panel(0.9, 0.19, 0, 0.98, 4.804, "#34545d");
  for (const y of [0.925, 0.98, 1.035]) panel(0.75, 0.012, 0, y, 4.807, "#8dada7");
  panel(0.18, 0.055, 0, 1.18, 4.806, "#c4c9b9");
  return parts;
}
