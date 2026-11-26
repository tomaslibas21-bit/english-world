import * as THREE from "three";
import type { Part } from "../world/mexican";

/** Shallow limestone carving around, and below, the existing speaking panel. All faces stay inside the stone. */
export function stelaCarvings(): Part[] {
  const parts: Part[] = [];
  const strip = (w: number, h: number, x: number, y: number, ink: string) =>
    parts.push([new THREE.PlaneGeometry(w, h).translate(x, y, 0.211), ink]);
  for (const side of [-1, 1]) strip(0.045, 1.0, side * 0.455, 1.45, "#81958b");
  for (const y of [0.95, 1.95]) strip(0.955, 0.04, 0, y, "#81958b");
  strip(0.94, 0.028, 0, 0.61, "#5b756c");
  for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
    const h = 0.07 + i * 0.06;
    strip(0.14, h, side * (0.35 - i * 0.14), 0.65 + h / 2, "#93a095");
  }
  return parts;
}
