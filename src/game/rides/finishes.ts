// Appearance only: these parts remain inside the existing vehicle bounds and join its single coloured geometry.
import * as THREE from "three";

type Part = [THREE.BufferGeometry, THREE.ColorRepresentation];

export function convertibleFinishParts(): Part[] {
  const parts: Part[] = [];
  const panel = (g: THREE.BufferGeometry, color: string) => parts.push([g, color]);
  for (const x of [-0.43, 0.43]) {
    panel(new THREE.PlaneGeometry(0.5, 0.34).rotateY(Math.PI).translate(x, 0.8, -0.668), "#ab9d83");
    panel(new THREE.PlaneGeometry(0.52, 0.43).rotateX(-Math.PI / 2).translate(x, 0.562, -0.24), "#d8c7a7");
    panel(new THREE.PlaneGeometry(0.4, 0.024).rotateY(Math.PI).translate(x, 1.05, -0.674), "#c5b591");
    for (const offset of [-0.17, 0, 0.17]) {
      panel(new THREE.PlaneGeometry(0.011, 0.29).rotateY(Math.PI).translate(x + offset, 0.8, -0.671), "#c5b591");
      panel(new THREE.PlaneGeometry(0.011, 0.39).rotateX(-Math.PI / 2).translate(x + offset, 0.564, -0.24), "#c5b591");
    }
  }
  panel(new THREE.BoxGeometry(0.12, 0.12, 0.52).translate(0, 0.53, -0.12), "#776b59");
  panel(new THREE.PlaneGeometry(1.44, 0.07).rotateY(Math.PI).translate(0, 0.84, 0.466), "#596a65");
  return parts;
}

export function motorboatFinishParts(): Part[] {
  const parts: Part[] = [];
  const panel = (g: THREE.BufferGeometry, color: string) => parts.push([g, color]);
  for (const z of [-1.05, 0.55]) {
    panel(new THREE.PlaneGeometry(1.48, 0.26).rotateX(-Math.PI / 2).translate(0, 0.533, z), "#d1a77c");
    for (const side of [-1, 1]) {
      panel(new THREE.PlaneGeometry(0.014, 0.24).rotateX(-Math.PI / 2).translate(side * 0.47, 0.535, z), "#896647");
      panel(new THREE.PlaneGeometry(1.48, 0.022).rotateY(side === 1 ? 0 : Math.PI)
        .translate(0, 0.5, z + side * 0.173), "#a07a54");
    }
  }
  panel(new THREE.PlaneGeometry(0.82, 0.68).rotateX(-Math.PI / 2).translate(0, 0.623, 1.9), "#bb9569");
  for (const z of [1.68, 2.12]) panel(new THREE.PlaneGeometry(0.78, 0.012).rotateX(-Math.PI / 2).translate(0, 0.625, z), "#896647");
  for (const side of [-1, 1]) {
    panel(new THREE.BoxGeometry(0.04, 0.04, 0.05).translate(side * 0.82, 0.796, -1.75), "#7e8b87");
    panel(new THREE.BoxGeometry(0.12, 0.025, 0.03).translate(side * 0.82, 0.824, -1.75), "#7e8b87");
  }
  return parts;
}
