// Small prop details join the existing vertex-coloured geometry; hand attachments and moment timing stay authored.
import * as THREE from "three";

type Part = [THREE.BufferGeometry, THREE.ColorRepresentation];

/** Applied before the guitar builder's normal scale, for both full and small instruments. */
export function guitarFinishParts(): Part[] {
  const parts: Part[] = [
    [new THREE.RingGeometry(0.055, 0.072, 16).translate(-0.05, 0.035, 0.212), "#d8b97e"],
    [new THREE.RingGeometry(0.051, 0.055, 16).translate(-0.05, 0.035, 0.216), "#896944"],
    [new THREE.BoxGeometry(0.036, 0.12, 0.014).translate(-0.23, 0.01, 0.205), "#71503b"],
  ];
  for (const x of [0.15, 0.2, 0.25, 0.3, 0.35, 0.4]) parts.push([
    new THREE.PlaneGeometry(0.006, 0.052).translate(x, 0, 0.104), "#c8bda2",
  ]);
  for (const y of [-0.013, 0.031]) parts.push([
    new THREE.PlaneGeometry(0.3, 0.002).translate(0.26, y, 0.111), "#c8bda2",
  ]);
  for (const x of [0.43, 0.46, 0.49]) for (const y of [-0.036, 0.036]) parts.push([
    new THREE.CircleGeometry(0.008, 6).translate(x, y, 0.109), "#d8b97e",
  ]);
  return parts;
}

/** Fine stitching and a flat snap add at most 4.5 mm above the old lid; the resting face and XZ bounds stay put. */
export function walletFinishParts(): Part[] {
  const parts: Part[] = [];
  const top = (g: THREE.BufferGeometry, color: string, x: number, y: number, z: number) =>
    parts.push([g.rotateX(-Math.PI / 2).translate(x, y, z), color]);
  for (const z of [-0.052, 0.052]) top(new THREE.PlaneGeometry(0.186, 0.0018), "#d4b492", 0, 0.0445, z);
  for (const x of [-0.093, 0.093]) top(new THREE.PlaneGeometry(0.0018, 0.096), "#d4b492", x, 0.0445, 0);
  parts.push([new THREE.PlaneGeometry(0.196, 0.012).rotateY(Math.PI).translate(0, 0.036, -0.064), "#a87b5d"]);
  top(new THREE.PlaneGeometry(0.027, 0.034), "#8c604b", 0.06, 0.0448, 0.002);
  top(new THREE.CircleGeometry(0.008, 6), "#c6aa72", 0.06, 0.0465, 0.002);
  return parts;
}
