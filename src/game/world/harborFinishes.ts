// Cage and crate surface relief, shared by the shore piles and the existing single-mesh working boats.
import * as THREE from "three";
import { visualOnly } from "../collisionGeometry";

type Part = [THREE.BufferGeometry, THREE.ColorRepresentation];

export function trapFinishParts(): Part[] {
  const parts: Part[] = [];
  const add = (g: THREE.BufferGeometry, color: string) => parts.push([visualOnly(g), color]);
  for (const x of [-0.23, 0.23]) {
    for (const side of [-1, 1]) {
      const face = (g: THREE.BufferGeometry, depth: number) => g.rotateY(side === 1 ? 0 : Math.PI).translate(x, 0, side * depth);
      add(face(new THREE.PlaneGeometry(0.35, 0.29).translate(0, 0.23, 0), 0.263), "#344e46");
      for (const offset of [-0.09, 0.09]) add(face(new THREE.PlaneGeometry(0.012, 0.28)
        .translate(offset, 0.23, 0), 0.266), "#9ea487");
      add(face(new THREE.PlaneGeometry(0.34, 0.012).translate(0, 0.22, 0), 0.266), "#9ea487");
    }
    add(new THREE.PlaneGeometry(0.35, 0.44).rotateX(-Math.PI / 2).translate(x, 0.423, 0), "#344e46");
    for (const offset of [-0.09, 0.09]) add(new THREE.PlaneGeometry(0.012, 0.42)
      .rotateX(-Math.PI / 2).translate(x + offset, 0.426, 0), "#9ea487");
    add(new THREE.PlaneGeometry(0.34, 0.012).rotateX(-Math.PI / 2).translate(x, 0.426, 0), "#9ea487");
  }
  return parts;
}

/** The old closed box stays physical; inset dark faces and raised ribs suggest the crate's slotted construction. */
export function crateFinishParts(width: number, depth: number): Part[] {
  const parts: Part[] = [];
  const add = (g: THREE.BufferGeometry, color: string) => parts.push([visualOnly(g), color]);
  for (let side = 0; side < 4; side++) {
    const long = side % 2 === 0, span = long ? width : depth, out = (long ? depth : width) / 2;
    const face = (g: THREE.BufferGeometry, offset = 0.003) => g.translate(0, 0, out + offset).rotateY(side * Math.PI / 2);
    add(face(new THREE.PlaneGeometry(span - 0.08, 0.17).translate(0, 0.14, 0)), "#2c4b56");
    const ribs = long ? 5 : 3;
    for (let i = 0; i < ribs; i++) add(face(new THREE.PlaneGeometry(0.018, 0.15)
      .translate((i - (ribs - 1) / 2) * (span - 0.16) / ribs, 0.14, 0), 0.006), "#8aa39b");
    if (long) add(face(new THREE.PlaneGeometry(0.17, 0.028).translate(0, 0.262, 0), 0.006), "#1b343e");
  }
  add(new THREE.PlaneGeometry(width - 0.1, depth - 0.1).rotateX(-Math.PI / 2).translate(0, 0.303, 0), "#2c4b56");
  for (const side of [-1, 1]) {
    add(new THREE.PlaneGeometry(width - 0.04, 0.025).rotateX(-Math.PI / 2).translate(0, 0.305, side * (depth / 2 - 0.025)), "#a1b4a7");
    add(new THREE.PlaneGeometry(0.025, depth - 0.04).rotateX(-Math.PI / 2).translate(side * (width / 2 - 0.025), 0.305, 0), "#a1b4a7");
  }
  return parts;
}
