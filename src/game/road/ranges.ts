import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { rand } from "../world/util";

// The mesas beside the desert road, three rows deep on each side. They stand still in the world while you drive, so
// the near buttes slide past quickly, the wide mesas slowly and the far wall hardly at all. One stretch of them
// (PERIOD metres) is built once and drawn twice in a single instanced call; a small shader gives them their own haze,
// so they stay visible far beyond the fog that closes the road.

export const PERIOD = 768;
const BASE = -7;
// Where the faces take their light from: the bright evening sky ahead, to the left.
const LIGHT = new THREE.Vector3(-0.42, 0.62, -0.66).normalize();

type Row = { count: number; near: number; far: number; width: [number, number]; height: [number, number] };
const ROWS: Row[] = [
  { count: 7, near: 44, far: 88, width: [9, 20], height: [9, 23] },
  { count: 6, near: 135, far: 225, width: [34, 66], height: [26, 48] },
  { count: 5, near: 300, far: 390, width: [80, 130], height: [42, 78] },
];

function mesa(r: () => number, width: number, height: number) {
  const sides = 6 + Math.floor(r() * 3);
  const parts: THREE.BufferGeometry[] = [];
  const tier = (top: number, bottom: number, y0: number, y1: number) =>
    parts.push(new THREE.CylinderGeometry(top, bottom, y1 - y0, sides, 1).translate(0, (y0 + y1) / 2, 0));
  const shoulder = height * (0.34 + r() * 0.14);
  tier(width * 0.78, width * 1.22, BASE, shoulder);         // the talus slope
  tier(width * 0.66, width * 0.74, shoulder, height);       // the cliff
  if (r() < 0.55) {                                         // a second, smaller table on top
    const cap = new THREE.CylinderGeometry(width * 0.27, width * 0.33, height * 0.24, sides - 1, 1);
    parts.push(cap.translate((r() - 0.5) * width * 0.5, height * 1.12, (r() - 0.5) * width * 0.4));
  }
  const merged = mergeGeometries(parts.map((g) => g.toNonIndexed()), false)!;
  parts.forEach((g) => g.dispose());
  // Longer along the road than across it, so nothing reaches the asphalt.
  return merged.rotateY(r() * Math.PI).scale(1, 1, 1.15 + r() * 0.9);
}

function build() {
  const r = rand(9041);
  const all: THREE.BufferGeometry[] = [];
  for (const side of [-1, 1]) for (const row of ROWS) for (let i = 0; i < row.count; i++) {
    const width = THREE.MathUtils.lerp(row.width[0], row.width[1], r());
    const height = THREE.MathUtils.lerp(row.height[0], row.height[1], r());
    const g = mesa(r, width, height);
    const s = (i + 0.15 + r() * 0.7) * PERIOD / row.count + (side > 0 ? PERIOD / row.count / 2 : 0);
    g.translate(side * (row.near + width * 1.22 + r() * (row.far - row.near)), 0, -(s % PERIOD));
    const count = g.attributes.position.count, tone = new Float32Array(count).fill(r());
    g.setAttribute("tone", new THREE.BufferAttribute(tone, 1));
    all.push(g);
  }
  const geometry = mergeGeometries(all, false)!;
  all.forEach((g) => g.dispose());
  geometry.deleteAttribute("uv");
  // Flat faces: one shade for each triangle.
  const p = geometry.attributes.position, shade = new Float32Array(p.count);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
    const lit = b.sub(a).cross(c.sub(a)).normalize().dot(LIGHT) * 0.5 + 0.5;
    shade[i] = shade[i + 1] = shade[i + 2] = lit;
  }
  geometry.setAttribute("shade", new THREE.BufferAttribute(shade, 1));
  geometry.deleteAttribute("normal");
  return geometry;
}

const vertex = /* glsl */ `
attribute float shade;
attribute float tone;
varying float vShade;
varying float vTone;
varying float vFar;
varying float vHeight;
void main() {
  vec4 p = vec4(position, 1.0);
  #ifdef USE_INSTANCING
    p = instanceMatrix * p;
  #endif
  vec4 world = modelMatrix * p;
  vec4 eye = viewMatrix * world;
  vShade = shade; vTone = tone; vHeight = world.y; vFar = length(eye.xyz);
  gl_Position = projectionMatrix * eye;
}`;

const fragment = /* glsl */ `
uniform vec3 lit, shadow, haze, tint;
uniform float opacity;
varying float vShade;
varying float vTone;
varying float vFar;
varying float vHeight;
void main() {
  vec3 rock = mix(shadow, lit, smoothstep(0.18, 0.86, vShade)) * (0.90 + 0.20 * vTone);
  rock *= 1.0 + 0.05 * sin(vHeight * 1.15 + vTone * 9.0);      // the strata
  rock *= tint;
  float air = smoothstep(130.0, 900.0, vFar) * 0.84;
  float mist = smoothstep(90.0, 300.0, vFar) * (1.0 - smoothstep(-2.0, 11.0, vHeight));
  gl_FragColor = vec4(mix(rock, haze, max(air, mist)), opacity);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export class Ranges {
  readonly mesh: THREE.InstancedMesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private placed = NaN;
  private matrix = new THREE.Matrix4();

  constructor(rock: [string, string]) {
    const material = new THREE.ShaderMaterial({
      vertexShader: vertex, fragmentShader: fragment, fog: false, transparent: true,
      uniforms: {
        opacity: { value: 1 }, lit: { value: new THREE.Color(rock[0]) }, shadow: { value: new THREE.Color(rock[1]) },
        haze: { value: new THREE.Color() }, tint: { value: new THREE.Color() },
      },
    });
    this.mesh = new THREE.InstancedMesh(build(), material, 2);
    this.mesh.frustumCulled = false;
    this.update(0);
  }

  /** The haze they fade into and the colour of the evening light (white at noon). */
  light(haze: THREE.Color, light: THREE.Color) {
    const u = this.mesh.material.uniforms;
    u.haze.value.copy(haze);
    const peak = Math.max(light.r, light.g, light.b, 1e-3);
    u.tint.value.copy(light).multiplyScalar(1 / peak);
  }

  update(distance: number) {
    // Swap a stretch only once it is well behind the camera.
    const first = Math.floor((distance - 70) / PERIOD);
    if (first === this.placed) return;
    this.placed = first;
    for (let i = 0; i < 2; i++) this.mesh.setMatrixAt(i, this.matrix.makeTranslation(0, 0, -(first + i) * PERIOD));
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.mesh.dispose();
  }
}
