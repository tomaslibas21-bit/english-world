import * as THREE from "three";
import type { Part } from "./mexican";

/** The cantina's original seat envelope and height, with a worn leather face and an open brass foot ring. */
export function cantinaStoolParts(): Part[] {
  const seat = new THREE.CylinderGeometry(0.24, 0.24, 0.09, 12);
  // Keep the side and bottom; replace only the top's twelve triangles with a center and a coplanar rim.
  seat.setIndex(Array.from(seat.index!.array).filter((_, i) => i < 72 || i >= 108));
  seat.clearGroups();
  return [
    [seat.translate(0, 0.695, 0), "#86463b"],
    [new THREE.CircleGeometry(0.205, 12).rotateX(-Math.PI / 2).translate(0, 0.74, 0), "#b06d52"],
    [new THREE.RingGeometry(0.205, 0.24, 12).rotateX(-Math.PI / 2).translate(0, 0.74, 0), "#bf9566"],
    [new THREE.TorusGeometry(0.145, 0.012, 4, 12).rotateX(Math.PI / 2).translate(0, 0.34, 0), "#c7a262"],
  ];
}
