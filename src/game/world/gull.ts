import * as THREE from "three";
import { boxGeo } from "./util";

type Parts = [THREE.BufferGeometry, THREE.ColorRepresentation][];

export function addGull(parts: Parts, x: number, y: number, z: number, rot: number, flight: boolean, wings?: [Parts, Parts]) {
  const add = (g: THREE.BufferGeometry, color: string, into = parts) => into.push([g.rotateY(rot).translate(x, y, z), color]);
  add(new THREE.SphereGeometry(0.22, 7, 4).scale(0.65, 0.68, 1.48).translate(0, 0.18, 0), "#e5e3da");
  add(new THREE.SphereGeometry(0.13, 7, 4).translate(0, 0.27, 0.22), "#fcf7e8");
  add(new THREE.ConeGeometry(0.058, 0.19, 4).rotateX(Math.PI / 2).translate(0, 0.245, 0.40), "#dba03b");
  for (const s of [-1, 1]) {
    const into = wings?.[s < 0 ? 0 : 1] ?? parts;
    const wing = flight ? 0.81 : 0.2;
    add(new THREE.SphereGeometry(1, 6, 3).scale(wing, 0.055, 0.18)
      .rotateY(s * 0.20).translate(s * (wing + 0.06) * 0.71, 0.18, -0.06), "#a9b6bd", into);
    add(new THREE.SphereGeometry(1, 5, 3).scale(0.14, 0.043, 0.09)
      .translate(s * (flight ? 1.23 : 0.18), 0.179, -0.18), "#455259", into);
    if (!flight) add(boxGeo(0.035, 0.14, 0.035, s * 0.06, 0.07, 0.055), "#dba03b");
  }
}
