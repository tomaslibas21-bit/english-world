import * as THREE from "three";

/** Three pale veins inside the existing pad's seven-sided outline, in its original XY frame. */
export function lilyPadVeins(radius: number) {
  const positions: number[] = [];
  for (const angle of [1.35, 3.05, 4.75]) {
    const c = Math.cos(angle), s = Math.sin(angle), width = radius * 0.018;
    const point = (r: number, side: number) => [r * c - side * s * width, r * s + side * c * width, 0.0015];
    const a = point(radius * 0.14, -1), b = point(radius * 0.78, -1), d = point(radius * 0.14, 1), e = point(radius * 0.78, 1);
    positions.push(...a, ...b, ...e, ...a, ...e, ...d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.computeVertexNormals();
  return g;
}

/** An open six-petal water lily inside the original small cone flower's envelope. */
export function lilyBloom() {
  const positions: number[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = i * Math.PI / 3;
    const point = (r: number, a: number, y: number) => [Math.sin(a) * r, y, Math.cos(a) * r];
    const root = [0, -0.015, 0], left = point(0.055, angle - 0.38, 0.055);
    const tip = point(0.105, angle, 0.10), right = point(0.055, angle + 0.38, 0.055);
    positions.push(...root, ...left, ...tip, ...root, ...tip, ...right);
  }
  const petals = new THREE.BufferGeometry();
  petals.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  petals.computeVertexNormals();
  return { petals, center: new THREE.TetrahedronGeometry(0.028).translate(0, 0.105, 0) };
}
