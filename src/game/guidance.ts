// Guidance: the way to the current objective, marked on the ground, and a beacon over the destination.
//
// The way is a row of small arrowheads lying on the ground, like marks painted on the pavement: pale, partly seen
// through, each with a soft darker edge so it shows on light stone as on dark asphalt. They lie still (measured back
// from the destination, so walking doesn't slide them), fewer than the bright discs there were (one every 2.2 m), and
// a gentle brightening travels along them towards the destination. They fade in over the first metres in front of
// the player and out with distance: only the next stretch of the way is marked.
import * as THREE from "three";
import type { Destination } from "./photowalk/store";

/** The live route already ends at the exit approach or the requested door. */
export function guideVisualTarget(
  path: [number, number][] | null,
  target: { kind: string; id?: string; directions?: Destination | null } | null,
  directions: Destination | null,
) {
  if (!target?.id || (target.kind !== "exit" && target.kind !== "point")) return null;
  if (target.directions && target.directions !== directions) return null;
  const end = path?.at(-1);
  return end ? { kind: target.kind, x: end[0], z: end[1] } : null;
}
import type { GuideKind } from "./gameRef";

/** One mark of the way: where it lies, which way it points (a heading: 0 towards +z) and how strongly it shows (0–1). */
export interface WayMark { x: number; z: number; rot: number; alpha: number }

/** How far apart the marks lie (m), where they start to show in front of the player and are fully there, and where
 *  they start to fade with distance and are gone (m along the way). */
export const WAY = { spacing: 2.2, from: 1.8, full: 4.5, far: 24, gone: 38 };

/** The marks along `pts` (the way from the player to the destination) at time `t` (s): one every `WAY.spacing`,
 *  counted back from the destination; each one's strength from how far along the way it is from the player, and from
 *  the brightening that travels towards the destination. */
export function wayMarks(pts: [number, number][], t: number, max = 64): WayMark[] {
  const out: WayMark[] = [];
  if (pts.length < 2) return out;
  let total = 0;
  const lens: number[] = [];
  for (let i = 0; i < pts.length - 1; i++) { const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); lens.push(l); total += l; }
  // the first mark's distance from the player, so that the last lies a spacing short of the destination
  let d = (total - WAY.spacing) % WAY.spacing;
  if (d < 0) d += WAY.spacing;
  let seg = 0, before = 0;
  for (; d < total - WAY.spacing * 0.5 && d < WAY.gone && out.length < max; d += WAY.spacing) {
    if (d < WAY.from) continue;
    while (seg < lens.length - 1 && d > before + lens[seg]) { before += lens[seg]; seg++; }
    const [ax, az] = pts[seg], [bx, bz] = pts[seg + 1], k = lens[seg] > 1e-6 ? (d - before) / lens[seg] : 0;
    const near = Math.min(1, (d - WAY.from) / (WAY.full - WAY.from)), far = d <= WAY.far ? 1 : Math.max(0, 1 - (d - WAY.far) / (WAY.gone - WAY.far));
    // the brightening: a soft crest every 13 m, moving on at 4.5 m/s
    const wave = 0.5 + 0.5 * Math.sin(((d - t * 4.5) / 13) * Math.PI * 2);
    const alpha = near * far * (0.55 + 0.45 * wave * wave);
    if (alpha > 0.01) out.push({ x: ax + (bx - ax) * k, z: az + (bz - az) * k, rot: Math.atan2(bx - ax, bz - az), alpha });
  }
  return out;
}

export class Guidance {
  group = new THREE.Group();
  private dots: THREE.InstancedMesh;
  private alpha: THREE.InstancedBufferAttribute;
  private beacon: THREE.Group;
  private beam: THREE.Mesh;
  private gem: THREE.Mesh;
  private ring: THREE.Mesh;
  private pts: [number, number][] = [];
  private t = 0;
  visible = true;

  constructor() {
    // one small square a mark, the arrowhead drawn in it by the shader: its pale fill and a soft darker edge
    const geo = new THREE.PlaneGeometry(0.72, 0.72).rotateX(-Math.PI / 2);
    this.alpha = new THREE.InstancedBufferAttribute(new Float32Array(MARKS), 1);
    geo.setAttribute("aAlpha", this.alpha);
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uFill: { value: new THREE.Color("#ffe9ad") }, uEdge: { value: new THREE.Color("#403323") } },
      vertexShader: `attribute float aAlpha; varying vec2 vUv; varying float vA;
        void main() { vUv = uv; vA = aAlpha; gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform vec3 uFill; uniform vec3 uEdge; varying vec2 vUv; varying float vA;
        float seg(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0)); }
        void main() {
          // an arrowhead pointing up the square (the way on): two strokes from its tip
          // (the square lies with its top towards the way back: turned over here)
          vec2 p = vec2(vUv.x - 0.5, 0.5 - vUv.y);
          float d = min(seg(p, vec2(0.0, 0.2), vec2(-0.25, -0.1)), seg(p, vec2(0.0, 0.2), vec2(0.25, -0.1))) - 0.07;
          float fill = 1.0 - smoothstep(-0.012, 0.012, d);
          float edge = (1.0 - smoothstep(0.0, 0.1, d)) * 0.72;
          float a = max(fill * 0.85, edge) * vA;
          if (a < 0.004) discard;
          gl_FragColor = vec4(mix(uEdge, uFill, fill), a);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    this.dots = new THREE.InstancedMesh(geo, mat, MARKS);
    this.dots.count = 0;
    this.dots.frustumCulled = false;
    this.dots.renderOrder = 1;
    this.group.add(this.dots);
    this.beacon = new THREE.Group();
    this.beam = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.9, 14, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: "#ffd166", transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
    this.beam.position.y = 7;
    this.gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.45, 0), new THREE.MeshBasicMaterial({ color: "#ffb703" }));
    this.gem.position.y = 3.4;
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.05, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: "#ffd166", transparent: true, opacity: 0.8, depthWrite: false }));
    this.ring.position.y = 0.04;
    this.beacon.add(this.beam, this.gem, this.ring);
    this.beacon.visible = false;
    this.group.add(this.beacon);
  }

  setKind(kind: GuideKind) {
    (this.dots.material as THREE.ShaderMaterial).uniforms.uFill.value.set(kind === "cave" ? "#b8eee1" : "#ffe9ad");
  }

  setPath(pts: [number, number][] | null) { this.pts = pts ?? []; }
  /** The beacon over (x, z), its gem at `height`. With `stand` (where to stand to talk to the person under it, across a
   *  counter), a smaller ring lies there instead of round the beacon's foot. */
  setBeacon(x: number | null, z?: number, height = 3.4, stand?: { x: number; z: number }, y = 0) {
    if (x === null || z === undefined) { this.beacon.visible = false; return; }
    this.beacon.visible = true;
    this.beacon.position.set(x, y, z);
    this.gem.position.y = height;
    this.ring.position.set(stand ? stand.x - x : 0, 0.04, stand ? stand.z - z : 0);
    this.ring.scale.setScalar(stand ? 0.6 : 1);
  }

  /** `ground`: how high the ground lies at (x, z) (a pier's boards, the sand by the sea); the street's level without. */
  update(dt: number, ground?: (x: number, z: number) => number) {
    this.t += dt;
    this.gem.rotation.y += dt * 1.5;
    this.gem.position.y += Math.sin(this.t * 2.2) * 0.004;
    (this.beam.material as THREE.MeshBasicMaterial).opacity = 0.16 + Math.sin(this.t * 2) * 0.05;
    if (!this.visible || this.pts.length < 2) { this.dots.count = 0; return; }
    const marks = wayMarks(this.pts, this.t, MARKS);
    marks.forEach((k, i) => {
      _m.makeRotationY(k.rot).setPosition(k.x, Math.max(0, ground?.(k.x, k.z) ?? 0) + 0.05, k.z);
      this.dots.setMatrixAt(i, _m);
      this.alpha.setX(i, k.alpha);
    });
    this.dots.count = marks.length;
    this.dots.instanceMatrix.needsUpdate = true;
    this.alpha.needsUpdate = true;
  }
}

/** The most marks drawn at once. */
const MARKS = 32;
const _m = new THREE.Matrix4();
