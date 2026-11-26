// The grotto under Cenote Ka'an as it is seen (plan.ts is its plan): rock, glowing water, the light through the
// cenote's eye, roots, mushrooms, crystals, the two great trees, the glyph stones and the gates. Cheap on a phone by
// design:
// - the rock, the trees and everything else that stands still is five meshes (one per chamber: the far ones are left
//   out of the picture) whose light is worked out once, here, into the vertices' colours (a warm shaft against the
//   water's turquoise): the material is unlit;
// - all the water is one mesh with a small shader, all the light shafts one, all the glyphs one, the falls one;
// - the fireflies, the motes in the light, the glow-worms, the mist and the soft halos round what glows are one set of
//   points moved by the graphics card (nothing per frame on the processor but the clock);
// - fog closes the view after a few dozen metres, so little is ever drawn.
import * as THREE from "three";
import { Colliders, rand } from "../world/util";
import { groundFace } from "../world/shapes";
import { lilyBloom, lilyPadVeins } from "./lilies";
import { finishMushroomCap } from "./mushrooms";
import * as P from "./plan";

const FOG = "#05232c";
const ROCK = ["#aea791", "#9d9680", "#bbb39b", "#928b76"], MOSS = ["#71876a", "#667d62", "#7d9172"];
const WOOD = ["#6b4a33", "#5a3d2a", "#7a5840"];
type V3 = [number, number, number];
interface Lamp { x: number; y: number; z: number; c: THREE.Color; reach: number; power: number }

/** The ground plan's colliders: the usual boxes and circles (the stones, the pillars, a shut gate), and the rock's own
 *  walls, the pools' rims and the trees from the plan. */
export class CaveColliders extends Colliders {
  override resolve(p: THREE.Vector3, r: number, jumper = false) {
    super.resolve(p, r, jumper);
    // (back inside what one can stand on: a few small steps up the slope of "how far inside")
    for (let i = 0; i < 4 && !P.walkable(p.x, p.z, r); i++) {
      const e = 0.25, f = (x: number, z: number) => this.room(x, z, r);
      const gx = f(p.x + e, p.z) - f(p.x - e, p.z), gz = f(p.x, p.z + e) - f(p.x, p.z - e), g = Math.hypot(gx, gz);
      if (g < 1e-6) break;
      const push = Math.min(0.5, Math.max(0.03, -f(p.x, p.z) + 0.01));
      p.x += (gx / g) * push; p.z += (gz / g) * push;
    }
    super.resolve(p, r, jumper);
  }
  /** How much room there is at (x, z) for someone `r` wide (m; negative: none). */
  private room(x: number, z: number, r: number) {
    let v = P.inside(x, z) - r;
    for (const q of P.POOLS) {
      if (q.ford || q.deck) continue;
      if (x > P.BRIDGE.x0 && x < P.BRIDGE.x1 && z > P.BRIDGE.z0 && z < P.BRIDGE.z1) continue;
      const k = Math.hypot((x - q.x) / (q.rx + r * 0.6), (z - q.z) / (q.rz + r * 0.6));
      v = Math.min(v, (k - 1) * Math.min(q.rx, q.rz));
    }
    for (const t of P.TREES) v = Math.min(v, Math.hypot(x - t.x, z - t.z) - t.r - r);
    return v;
  }
  override blocked(x: number, z: number, r: number) { return super.blocked(x, z, r) || !P.walkable(x, z, r); }
}

/** Collects triangles per chamber, lighting each as it comes (the lamps of the place: the eye's light, the water, what
 *  glows), flat: one colour a face. */
class Sink {
  pos: number[][] = P.CHAMBERS.map(() => []);
  col: number[][] = P.CHAMBERS.map(() => []);
  lamps: Lamp[] = [];
  private a = new THREE.Vector3(); private b = new THREE.Vector3(); private c = new THREE.Vector3();
  private n = new THREE.Vector3(); private m = new THREE.Vector3(); private l = new THREE.Vector3();
  private col0 = new THREE.Color();
  /** One triangle in colour `albedo`; `glow` 0–1: how much of that colour shines by itself. `flip`: towards this point. */
  tri(a: V3, b: V3, c: V3, albedo: THREE.Color, glow = 0, towards?: V3) {
    this.a.set(...a); this.b.set(...b); this.c.set(...c);
    this.n.subVectors(this.b, this.a).cross(this.l.subVectors(this.c, this.a)).normalize();
    this.m.copy(this.a).add(this.b).add(this.c).multiplyScalar(1 / 3);
    if (towards && this.n.dot(this.l.set(towards[0] - this.m.x, towards[1] - this.m.y, towards[2] - this.m.z)) < 0) { this.n.negate(); const t = b; b = c; c = t; }
    // the place's own dim light: the water's blue-green from below, darker overhead
    let r = 0.07 + 0.025 * this.n.y, g = 0.15 + 0.045 * this.n.y, bl = 0.2 + 0.04 * this.n.y;
    for (const L of this.lamps) {
      const dx = L.x - this.m.x, dy = L.y - this.m.y, dz = L.z - this.m.z, d2 = dx * dx + dy * dy + dz * dz;
      if (d2 > L.reach * L.reach) continue;
      const d = Math.sqrt(d2), f = 1 - d / L.reach, lam = 0.22 + 0.78 * Math.max(0, (this.n.x * dx + this.n.y * dy + this.n.z * dz) / (d || 1));
      const k = L.power * f * f * lam;
      r += L.c.r * k; g += L.c.g * k; bl += L.c.b * k;
    }
    const i = P.chamberAt(this.m.x, this.m.z), col = this.col0.copy(albedo);
    const R = col.r * (r * (1 - glow) + glow * 1.15), G = col.g * (g * (1 - glow) + glow * 1.15), B = col.b * (bl * (1 - glow) + glow * 1.15);
    this.pos[i].push(...a, ...b, ...c);
    for (let k = 0; k < 3; k++) this.col[i].push(R, G, B);
  }
  /** A whole shape. */
  geo(g0: THREE.BufferGeometry, colour: THREE.ColorRepresentation, glow = 0, vary = 0, paint?: (color: THREE.Color, triangle: number) => void) {
    const g = g0.index ? g0.toNonIndexed() : g0, p = g.attributes.position.array as ArrayLike<number>, c0 = new THREE.Color(colour), c = new THREE.Color();
    for (let i = 0; i < p.length; i += 9) {
      // (`vary`: each face a little lighter or darker than the next, as bark and rough stone are)
      c.copy(c0);
      if (vary) c.offsetHSL(0, 0, (Math.sin(i * 12.9898 + p[i] * 78.233 + p[i + 2] * 37.7) * 0.5) * vary);
      paint?.(c, i / 9);
      this.tri([p[i], p[i + 1], p[i + 2]], [p[i + 3], p[i + 4], p[i + 5]], [p[i + 6], p[i + 7], p[i + 8]], c, glow);
    }
    g.dispose(); if (g !== g0) g0.dispose();
  }
  meshes(mat: THREE.Material) {
    return this.pos.map((pos, i) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute("color", new THREE.Float32BufferAttribute(this.col[i], 3));
      g.computeBoundingSphere();
      const m = new THREE.Mesh(g, mat);
      m.name = "cave-" + P.CHAMBERS[i].id;
      m.matrixAutoUpdate = false;
      return m;
    });
  }
}

/** The points that move by themselves: fireflies (kind 0), motes in the light (1), halos (2), glow-worms (3), mist (4). */
class Sparks {
  pos: number[] = []; seed: number[] = []; col: number[] = []; size: number[] = [];
  add(kind: number, x: number, y: number, z: number, colour: THREE.ColorRepresentation, size: number, reach: number, r: () => number) {
    const c = new THREE.Color(colour);
    this.pos.push(x, y, z); this.seed.push(r() * 6.283, 0.6 + r() * 0.8, reach, kind); this.col.push(c.r, c.g, c.b); this.size.push(size);
    return this.size.length - 1;
  }
}

const GLSL_FOG = `float fogF(float d) { return exp(-uFog * uFog * d * d); }`;

export interface CaveView {
  group: THREE.Group;
  colliders: CaveColliders;
  /** Every frame: `at` where the player is, `h`: the picture's height in pixels (the points' size). */
  update(t: number, dt: number, cam: THREE.PerspectiveCamera, at: THREE.Vector3, h: number): void;
  /** Opens or shuts a gate (its veil fades; its colliders come and go). */
  setGate(id: string, open: boolean, now?: boolean): void;
  /** A stone's glyph lit (gold) or waiting (pale blue); `calling`: the one speaking now beats brighter. */
  setStone(id: string, lit: boolean): void;
  setCalling(id: string | null): void;
  /** A burst of sparks at a stone, a gate or the tree (something has just happened there). */
  burst(x: number, y: number, z: number, colour: string): void;
  /** The Yaxché in flower (the heart found). */
  setHeart(on: boolean, now?: boolean): void;
  /** What keeps the camera inside the rock (camera.ts `space`). */
  space: { free(a: THREE.Vector3, b: THREE.Vector3): number; inside(p: THREE.Vector3): boolean; overSolid(x: number, z: number): boolean };
  fog: THREE.FogExp2;
}

/** A canvas of sixteen glyphs (4 × 4), white on nothing: blocks of rounded shapes in the Maya way (not real writing). */
function glyphAtlas() {
  const N = 4, S = 128, c = document.createElement("canvas");
  c.width = c.height = N * S;
  const x = c.getContext("2d")!, r = rand(1492);
  x.strokeStyle = "#fff"; x.fillStyle = "#fff"; x.lineJoin = "round"; x.lineCap = "round";
  const rr = (px: number, py: number, w: number, h: number, rad: number) => { x.beginPath(); x.roundRect(px, py, w, h, rad); };
  for (let i = 0; i < N * N; i++) {
    const ox = (i % N) * S, oy = Math.floor(i / N) * S;
    x.save(); x.translate(ox, oy);
    // the cartouche
    x.lineWidth = 7; rr(12, 12, S - 24, S - 24, 26); x.stroke();
    // a main sign and its affixes: a face-like block, bars and dots (a number), a curl
    const kind = i % 4;
    x.lineWidth = 6;
    rr(30, 28, 44, 50, 16); x.stroke();
    x.beginPath(); x.arc(52, 48, 6 + r() * 4, 0, Math.PI * 2); x.fill();
    x.beginPath(); x.moveTo(36, 66); x.quadraticCurveTo(52, 60 + r() * 14, 68, 66); x.stroke();
    if (kind === 0) { for (let k = 0; k < 3; k++) { x.beginPath(); x.arc(88, 36 + k * 16, 5, 0, Math.PI * 2); x.fill(); } }
    else if (kind === 1) { x.lineWidth = 8; for (let k = 0; k < 2; k++) { x.beginPath(); x.moveTo(82, 34 + k * 16); x.lineTo(98, 34 + k * 16); x.stroke(); } x.beginPath(); x.arc(90, 70, 6, 0, Math.PI * 2); x.fill(); }
    else if (kind === 2) { x.beginPath(); x.arc(90, 52, 13, -1, 4.2); x.stroke(); x.beginPath(); x.arc(90, 52, 4, 0, Math.PI * 2); x.fill(); }
    else { rr(80, 30, 20, 44, 9); x.stroke(); x.beginPath(); x.moveTo(84, 52); x.lineTo(96, 52); x.stroke(); }
    x.lineWidth = 6;
    const n = 1 + Math.floor(r() * 3);
    for (let k = 0; k < n; k++) { x.beginPath(); x.arc(40 + k * 18, 96, 6, 0, Math.PI * 2); x.fill(); }
    x.beginPath(); x.moveTo(34 + n * 18, 96); x.lineTo(98, 96); x.stroke();
    x.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 4;
  return t;
}

export function buildCave(): CaveView {
  const group = new THREE.Group();
  group.name = "gruta";
  const col = new CaveColliders(), sink = new Sink(), sparks = new Sparks(), r = rand(20261115);
  const C = (s: string) => new THREE.Color(s);
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const fog = new THREE.FogExp2(FOG, 0.0185);

  // ---- the lamps the rock's light is worked out from
  const lamp = (x: number, y: number, z: number, c: string, reach: number, power: number) => sink.lamps.push({ x, y, z, c: C(c), reach, power });
  lamp(P.EYE.x + 1, 9, P.EYE.z + 0.6, "#fff1cf", 19, 2.3);         // the day through the cenote's eye
  lamp(P.EYE.x + 1.6, 1.5, P.EYE.z + 1, "#ffe6ac", 11, 1.5);
  lamp(P.EYE2.x, 6.5, P.EYE2.z, "#fff1cf", 11, 1.5);              // El Ojo, the sinkhole, over the water one came through
  lamp(P.EXITS[1].x + 0.9, 1.7, P.EXITS[1].z - 0.2, "#fff4d8", 6.5, 1.6); // the cleft's slit of daylight
  for (const q of P.POOLS) lamp(q.x, 0.4, q.z, "#6fe6e2", Math.max(q.rx, q.rz) * 2.2 + 5, 1.05);
  for (const f of P.FALLS) lamp(f.x, 3, f.z + (f.rot ? 0 : 1.2), "#bff6ff", 11, 0.9);
  lamp(P.TREES[1].x, 6, P.TREES[1].z, "#ffd2c0", 20, 0.85);        // the Yaxché's own light
  lamp(P.TREES[1].x, 15, P.TREES[1].z, "#d8f6ff", 16, 0.6);

  // ---- the floor: a grid over the plan (dipping under the water), mossy by the pools, pale along the sacbé
  const nearPath = (x: number, z: number) => {
    let d = Infinity;
    for (let i = 0; i + 1 < P.SACBE.length; i++) {
      const [ax, az] = P.SACBE[i], [bx, bz] = P.SACBE[i + 1], dx = bx - ax, dz = bz - az;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
      d = Math.min(d, Math.hypot(x - ax - dx * t, z - az - dz * t));
    }
    return d;
  };
  const floorAt = (x: number, z: number): V3 => {
    const q = P.POOLS.find((o) => ((x - o.x) / o.rx) ** 2 + ((z - o.z) / o.rz) ** 2 < 1);
    const inIsland = Math.hypot(x - P.ISLAND.x, z - P.ISLAND.z) < P.ISLAND.r + 0.6;
    let y = P.floorY(x, z);
    if (q && !inIsland) y = Math.min(y, -0.25 - 0.5 * Math.max(0, 1 - Math.hypot((x - q.x) / q.rx, (z - q.z) / q.rz)));
    // (under the island's mound the floor lies well below it: the mound's top is the ground there. At the same height
    // the two fought for every pixel: a pale flickering patch round the Yaxché's foot, 18 Nov 2026)
    if (inIsland) y = -0.42;
    return [x, y, z];
  };
  const FLOOR_A = C("#7b7868"), FLOOR_B = C("#96907c"), SAND = C("#d6cdae"), PATH = C("#efe7d2"), PATH2 = C("#e4dbc4"), GREEN = C("#6a8266");
  const G = 1.4;
  for (let x = P.BOUNDS.minX; x < P.BOUNDS.maxX; x += G) for (let z = P.BOUNDS.minZ; z < P.BOUNDS.maxZ; z += G) {
    const cx = x + G / 2, cz = z + G / 2;
    if (P.inside(cx, cz) < -1.6) continue;
    const d = nearPath(cx, cz), pool = P.poolAt(cx, cz, 1.6), wall = P.inside(cx, cz);
    // (the rock's own patches, soft-edged; moss by the walls; pale sand at the water; the sacbé's old white)
    const patch = 0.5 + 0.5 * Math.sin(cx * 0.31 + Math.sin(cz * 0.23) * 1.7) * Math.cos(cz * 0.27 - cx * 0.11);
    const c = (d < 1.25 ? ((Math.round(cx / G) + Math.round(cz / G)) % 2 ? PATH : PATH2) : pool ? SAND : wall < 1.6 && r() < 0.25 ? GREEN : FLOOR_A.clone().lerp(FLOOR_B, patch)).clone();
    c.offsetHSL(0, 0, (r() - 0.5) * 0.035);
    const a = floorAt(x, z), b = floorAt(x + G, z), e = floorAt(x + G, z + G), f = floorAt(x, z + G);
    sink.tri(a, f, b, c); sink.tri(b, f, e, c);
  }
  // Worn limestone at Kin's entrance follows the existing sacbé before it reaches the first hall.
  // Bake a little reflected daylight into the wear so the white road survives the dark approach.
  for (let segment = 0; segment < 2; segment++) {
    const [ax, az] = P.SACBE[segment], [bx, bz] = P.SACBE[segment + 1];
    const dx = bx - ax, dz = bz - az, length = Math.hypot(dx, dz);
    const nx = -dz / length, nz = dx / length, count = Math.ceil(length / 1.8);
    const at = (t: number, across: number): [number, number] => [ax + dx * t + nx * across, az + dz * t + nz * across];
    for (let k = 0; k < count; k++) {
      const start = (k + 0.025) / count, end = (k + 0.975) / count, middle = (start + end) / 2;
      const width = k % 2 ? 2.58 : 2.68;
      const slab = groundFace([
        at(start, -width * 0.46), at(middle, -width * 0.5), at(end, -width * 0.45),
        at(end, width * 0.47), at(middle, width * 0.5), at(start, width * 0.48),
      ]).translate(0, 0.012, 0);
      sink.geo(slab, (k + segment) % 2 ? "#d2c9af" : "#dad2b9", 0.12);
    }
  }
  // the sacbé's edge stones
  for (let i = 0; i + 1 < P.SACBE.length; i++) {
    const [ax, az] = P.SACBE[i], [bx, bz] = P.SACBE[i + 1], L = Math.hypot(bx - ax, bz - az), n = Math.floor(L / 1.1);
    const nx = -(bz - az) / L, nz = (bx - ax) / L;
    for (let k = 0; k < n; k++) for (const s of [-1, 1]) {
      const t = (k + r() * 0.5) / n, ex = ax + (bx - ax) * t + nx * s * 1.42, ez = az + (bz - az) * t + nz * s * 1.42;
      if (!P.walkable(ex, ez, 0.1) || P.poolAt(ex, ez, 0.3)) continue;
      sink.geo(new THREE.DodecahedronGeometry(0.19 + r() * 0.12, 0).scale(1.3, 0.55, 1).rotateY(r() * 3).translate(ex, 0.05, ez), pick(ROCK));
    }
  }

  // ---- the walls: the plan's outline (how far inside = 0, a little ragged), drawn up to the roof, leaning in
  const rough = (x: number, z: number) => P.inside(x, z) + 0.34 * Math.sin(x * 0.9 + z * 0.37) * Math.cos(z * 0.8 - x * 0.31);
  const W = 1.3, cut = (ax: number, az: number, av: number, bx: number, bz: number, bv: number): [number, number] => { const t = av / (av - bv); return [ax + (bx - ax) * t, az + (bz - az) * t]; };
  for (let x = P.BOUNDS.minX; x < P.BOUNDS.maxX; x += W) for (let z = P.BOUNDS.minZ; z < P.BOUNDS.maxZ; z += W) {
    const v = [rough(x, z), rough(x + W, z), rough(x + W, z + W), rough(x, z + W)];
    const pts: [number, number][] = [], xs = [x, x + W, x + W, x], zs = [z, z, z + W, z + W];
    for (let k = 0; k < 4; k++) { const j = (k + 1) % 4; if (v[k] > 0 !== v[j] > 0) pts.push(cut(xs[k], zs[k], v[k], xs[j], zs[j], v[j])); }
    if (pts.length < 2) continue;
    const [p0, p1] = pts, mx = (p0[0] + p1[0]) / 2, mz = (p0[1] + p1[1]) / 2;
    // each end of the piece is drawn up the same way whichever piece it belongs to (no gap between neighbours):
    // towards the inside (up the slope of "how far inside"), bulging and leaning by where it is
    const column = ([px, pz]: [number, number]): V3[] => {
      const e = 0.4, gx = P.inside(px + e, pz) - P.inside(px - e, pz), gz = P.inside(px, pz + e) - P.inside(px, pz - e), gl = Math.hypot(gx, gz) || 1;
      const ix = gx / gl, iz = gz / gl, top = P.roofY(px + ix * 0.7, pz + iz * 0.7) + 0.6;
      const n1 = 0.5 + 0.5 * Math.sin(px * 1.7 + pz * 2.3), n2 = 0.5 + 0.5 * Math.sin(px * 2.9 - pz * 1.3 + 1.7);
      const out = [0.3, -0.25 - 0.5 * n1, -0.15 + 0.45 * n2, 0.75 + 0.3 * n1];
      return [-0.4, top * 0.3, top * 0.66, top].map((y, k) => [px + ix * out[k], y, pz + iz * out[k]] as V3);
    };
    const A = column(p0), B = column(p1);
    const e = 0.4, ix = P.inside(mx + e, mz) - P.inside(mx - e, mz), iz = P.inside(mx, mz + e) - P.inside(mx, mz - e);
    const colour = (k: number) => (k === 0 && r() < 0.22 ? C(pick(MOSS)) : C(pick(ROCK))).offsetHSL(0, 0, (r() - 0.5) * 0.07);
    for (let k = 0; k + 1 < A.length; k++) {
      const inward: V3 = [mx + ix * 20, (A[k][1] + A[k + 1][1]) / 2, mz + iz * 20];
      sink.tri(A[k], B[k], B[k + 1], colour(k), 0, inward); sink.tri(A[k], B[k + 1], A[k + 1], colour(k), 0, inward);
    }
  }

  // ---- the roof: a grid at the roof's height, open at the cenote's eye; stalactites hang from it
  const R = 2.1, inEye = (x: number, z: number) => Math.hypot(x - P.EYE.x, z - P.EYE.z) < P.EYE.r;
  const roofAt = (x: number, z: number): V3 => [x, P.roofY(x, z) + 0.55 * Math.sin(x * 1.9 + z * 0.7) * Math.cos(z * 1.6 - x * 0.4), z];
  for (let x = P.BOUNDS.minX; x < P.BOUNDS.maxX; x += R) for (let z = P.BOUNDS.minZ; z < P.BOUNDS.maxZ; z += R) {
    const cx = x + R / 2, cz = z + R / 2;
    if (P.inside(cx, cz) < -2.2 || inEye(cx, cz)) continue;
    const a = roofAt(x, z), b = roofAt(x + R, z), e = roofAt(x + R, z + R), f = roofAt(x, z + R), down: V3 = [cx, 0, cz];
    const c = C(pick(ROCK)).offsetHSL(0, 0, -0.05 + (r() - 0.5) * 0.08), c2 = c.clone().offsetHSL(0, 0, (r() - 0.5) * 0.05);
    // (El Ojo's hole: left open, the colours drawn all the same, so everything after is where it was)
    if (Math.hypot(cx - P.EYE2.x, cz - P.EYE2.z) < P.EYE2.r) continue;
    sink.tri(a, b, f, c, 0, down); sink.tri(b, e, f, c2, 0, down);
  }
  for (let i = 0; i < 520; i++) {
    const x = P.BOUNDS.minX + r() * (P.BOUNDS.maxX - P.BOUNDS.minX), z = P.BOUNDS.minZ + r() * (P.BOUNDS.maxZ - P.BOUNDS.minZ), d = P.inside(x, z);
    if (d < 0.6 || Math.hypot(x - P.EYE.x, z - P.EYE.z) < P.EYE.r + 0.8) continue;
    const top = P.roofY(x, z), len = (0.5 + r() * r() * 3.4) * Math.min(1, top / 9), w = 0.16 + len * 0.1;
    sink.geo(new THREE.ConeGeometry(w, len, 5, 1, true).rotateX(Math.PI).rotateY(r() * 3).translate(x, top - len / 2 + 0.15, z), pick(ROCK));
    // some drip onto a stalagmite below, by the walls
    if (d < 1.5 && r() < 0.5 && !P.poolAt(x, z, 0.6)) {
      const h = 0.5 + r() * 1.1;
      sink.geo(new THREE.ConeGeometry(0.2 + h * 0.14, h, 5).translate(x, h / 2 - 0.05, z), pick(ROCK));
      col.addCircle(x, z, 0.3);
    }
  }
  // the eye: the rock's chimney up to the day, the day itself, roots and vines down through it
  {
    const { x, z, r: er } = P.EYE, y0 = P.roofY(x, z) - 0.6, N = 14;
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2, j = () => er + 0.25 + r() * 0.5;
      const A: V3 = [x + Math.cos(a0) * j(), y0, z + Math.sin(a0) * j()], B: V3 = [x + Math.cos(a1) * j(), y0, z + Math.sin(a1) * j()];
      const D: V3 = [x + Math.cos(a0) * (er - 0.5), y0 + 5.5, z + Math.sin(a0) * (er - 0.5)], E: V3 = [x + Math.cos(a1) * (er - 0.5), y0 + 5.5, z + Math.sin(a1) * (er - 0.5)];
      const c = C(pick(ROCK)).offsetHSL(0, 0.04, 0.1);
      sink.tri(A, B, E, c, 0.25, [x, y0 + 2, z]); sink.tri(A, E, D, c, 0.25, [x, y0 + 2, z]);
      // green at the lip: the selva looks in
      sink.geo(new THREE.IcosahedronGeometry(0.9 + r() * 0.7, 0).scale(1, 0.7, 1).translate(D[0] + Math.cos(a0) * 0.5, y0 + 5.6, D[2] + Math.sin(a0) * 0.5), pick(["#6fbf4f", "#57a845", "#8fd45e"]), 0.55);
    }
    const sky = new THREE.Mesh(new THREE.CircleGeometry(er + 1.5, 20).rotateX(Math.PI / 2).translate(x, y0 + 6, z), new THREE.MeshBasicMaterial({ color: "#eafcff", fog: false, toneMapped: false }));
    sky.name = "cave-eye";
    group.add(sky);
    for (let i = 0; i < 26; i++) {
      const a = r() * Math.PI * 2, rr = er - 0.2 - r() * 0.9, len = 2 + r() * r() * 8.5, vine = i % 4 === 0;
      const vx = x + Math.cos(a) * rr, vz = z + Math.sin(a) * rr;
      sink.geo(new THREE.CylinderGeometry(vine ? 0.035 : 0.022, vine ? 0.05 : 0.035, len, 4).translate(vx, y0 + 4.5 - len / 2, vz), vine ? "#3f7d3a" : pick(WOOD));
      if (vine) for (let k = 0; k < 5; k++) sink.geo(new THREE.OctahedronGeometry(0.14, 0).scale(1.5, 0.6, 1).translate(vx + (r() - 0.5) * 0.2, y0 + 4.2 - (len * (k + 0.5)) / 5, vz + (r() - 0.5) * 0.2), pick(MOSS), 0.2);
    }
  }

  // ---- the two great trees: buttressed trunk, roots over the floor, boughs; the Yaxché's flowers are lit later
  const tree = (t: (typeof P.TREES)[number], crown: boolean) => {
    // (the trunk, the buttresses and the roots start a little under the ground: no cap or edge lying in its plane)
    const { x, z, r: tr, h } = t, base = P.floorY(x, z) - 0.06;
    sink.geo(new THREE.CylinderGeometry(tr * 0.62, tr, h, 9, 6).translate(x, base + h / 2, z), "#8f7f66", 0.06, 0.12);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + r() * 0.5, len = 2.6 + r() * 3.2;
      // a buttress, and the root it runs out into
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 2.1, 0, 0.16, 0, 3.2, 0, 0, 0, 0, 0, 3.2, 0, 2.1, 0, -0.16, 2.1, 0, 0.16, 2.1, 0, -0.16, 0, 3.2, 0], 3));
      sink.geo(g.translate(tr * 0.75, 0, 0).rotateY(a).translate(x, base, z), "#857560", 0.06, 0.1);
      const ex = x + Math.cos(a) * (tr + len), ez = z - Math.sin(a) * (tr + len);
      if (!P.poolAt(ex, ez, 0.2) || t === P.TREES[1]) sink.geo(new THREE.CylinderGeometry(0.07, 0.26, len, 5).rotateZ(Math.PI / 2).translate(tr + len / 2 + 1.2, 0.09, 0).rotateY(a).translate(x, base, z), "#7d6a55", 0.05, 0.1);
    }
    // (the Yaxché spreads its boughs wide and low over its lake; the ceiba reaches up for the eye's light)
    const wide = t === P.TREES[1], nb = wide ? 9 : 6;
    for (let i = 0; i < nb; i++) {
      const a = (i / nb) * Math.PI * 2 + r(), len = wide ? 5 + r() * 3 : 3.5 + r() * 2.5, up = wide ? 0.2 + r() * 0.25 : 0.5 + r() * 0.35;
      sink.geo(new THREE.CylinderGeometry(0.12, 0.3, len, 5).translate(0, len / 2, 0).rotateZ(-(Math.PI / 2 - up)).rotateY(a).translate(x, base + h - 2.2 - r() * 1.5, z), "#84745e");
      if (crown) {
        const bx = x + Math.cos(a) * Math.cos(up) * len, bz = z - Math.sin(a) * Math.cos(up) * len, by = base + h - 2.5 + Math.sin(up) * len;
        for (let k = 0; k < (wide ? 5 : 3); k++) sink.geo(new THREE.IcosahedronGeometry((wide ? 1.5 : 1.0) + r() * 0.8, 0).scale(1, 0.55, 1).translate(bx + (r() - 0.5) * (wide ? 3.6 : 1.6), by + r() * 0.8, bz + (r() - 0.5) * (wide ? 3.6 : 1.6)), pick(["#4f9a3e", "#62b04a", "#3f8a3a", "#7cc65a"]), 0.3, 0.1);
      }
    }
  };
  tree(P.TREES[0], true);
  tree(P.TREES[1], true);
  // the Yaxché's flowers: strands of them hanging from its boughs down over the lake, pale and faintly lit until the
  // heart is found, then in bloom (setHeart); a few petals of light always adrift round it
  const flowers: number[] = [];
  {
    const t = P.TREES[1];
    for (let i = 0; i < 58; i++) {
      const a = r() * 6.283, d = 2.3 + r() * 7, x = t.x + Math.cos(a) * d, z = t.z + Math.sin(a) * d;
      const top = 7 + r() * 2.4, len = 2 + r() * 3.4, n = 4 + Math.floor(r() * 4);
      sink.geo(new THREE.CylinderGeometry(0.012, 0.012, len, 3).translate(x, top - len / 2, z), "#7f9f6a", 0.4);
      for (let m = 0; m < n; m++) {
        const y = top - len * (0.2 + 0.8 * (m / (n - 1))), fx = x + (r() - 0.5) * 0.12, fz = z + (r() - 0.5) * 0.12;
        sink.geo(new THREE.OctahedronGeometry(0.085, 0).scale(1, 1.35, 1).translate(fx, y, fz), "#f4efe6", 0.95);
        flowers.push(sparks.add(2, fx, y, fz, "#000000", 0.5 + r() * 0.4, 0, r));
      }
    }
    for (let i = 0; i < 60; i++) { const a = r() * 6.283, d = 1 + Math.sqrt(r()) * 9; sparks.add(1, t.x + Math.cos(a) * d, 0.4 + r() * 2, t.z + Math.sin(a) * d, pick(["#ffd7ee", "#fff3c4", "#bff8ff"]), 0.1 + r() * 0.1, 5 + r() * 4, r); }
  }
  // rock columns where a stalactite has met its stalagmite: a few in every hall, off the sacbé
  for (const c of P.CHAMBERS) for (let i = 0, made = 0; i < 40 && made < 4; i++) {
    const a = r() * Math.PI * 2, k = 0.45 + r() * 0.4, x = c.x + Math.cos(a) * c.rx * k, z = c.z + Math.sin(a) * c.rz * k;
    if (P.inside(x, z) < 2.4 || nearPath(x, z) < 3.2 || P.poolAt(x, z, 1.6) || !P.walkable(x, z, 1.2) || inEye(x, z) || c.stones.some((q) => Math.hypot(q.x - x, q.z - z) < 3.5)
      || P.TREES.some((t) => Math.hypot(t.x - x, t.z - z) < 8)) continue;
    const top = P.roofY(x, z) + 0.3, w = 0.55 + r() * 0.35, waist = 0.42 + r() * 0.2;
    sink.geo(new THREE.CylinderGeometry(w * 0.34, w, top * waist, 6, 2).translate(x, top * waist / 2 - 0.05, z), pick(ROCK), 0, 0.08);
    sink.geo(new THREE.CylinderGeometry(w * 1.25, w * 0.34, top * (1 - waist), 6, 2).translate(x, top * waist + top * (1 - waist) / 2, z), pick(ROCK), 0, 0.08);
    for (let m = 0; m < 3; m++) { const b = r() * 6.283, h = 0.4 + r() * 0.8; sink.geo(new THREE.ConeGeometry(0.16 + h * 0.12, h, 5).translate(x + Math.cos(b) * (w + 0.3), h / 2 - 0.05, z + Math.sin(b) * (w + 0.3)), pick(ROCK)); }
    col.addCircle(x, z, w + 0.25);
    made++;
  }
  // the island's mound under the Yaxché, mossy
  // (its top is the whole of where one stands, floorY's 0.12 as far as ISLAND.r, and a hand more; its foot reaches under
  // the lake's water, past where the floor comes up again)
  sink.geo(new THREE.CylinderGeometry(P.ISLAND.r + 0.15, P.ISLAND.r + 1.05, 0.6, 18).translate(P.ISLAND.x, -0.18, P.ISLAND.z), "#6d9a55");
  for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; sink.geo(new THREE.DodecahedronGeometry(0.45, 0).scale(1.2, 0.5, 1).translate(P.ISLAND.x + Math.cos(a) * (P.ISLAND.r + 1.6 + (i % 2) * 1.5), -0.02, P.ISLAND.z + Math.sin(a) * (P.ISLAND.r + 1.6 + (i % 2) * 1.5)), pick(ROCK)); }

  // ---- hanging roots: curtains of thin ones in every chamber, pillars of them in the garden; mushrooms that glow
  const root = (x: number, z: number, len: number, w: number) => {
    const top = P.roofY(x, z), n = 3;
    let px = x, pz = z;
    for (let k = 0; k < n; k++) {
      const qx = x + (r() - 0.5) * 0.5, qz = z + (r() - 0.5) * 0.5, y0 = top - (len * k) / n, y1 = top - (len * (k + 1)) / n;
      const g = new THREE.CylinderGeometry(w * (1 - k / (n + 1)), w * (1 - (k + 1) / (n + 1)), Math.hypot(y0 - y1, qx - px, qz - pz), 5, 1, true);
      g.translate(0, -(y0 - y1) / 2, 0);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), new THREE.Vector3(qx - px, y1 - y0, qz - pz).normalize()));
      sink.geo(g.translate(px, y0, pz), pick(WOOD));
      px = qx; pz = qz;
    }
  };
  for (let i = 0; i < 230; i++) {
    const ci = i % P.CHAMBERS.length, c = P.CHAMBERS[ci], a = r() * Math.PI * 2, k = Math.sqrt(r()) * 0.92;
    const x = c.x + Math.cos(a) * c.rx * k, z = c.z + Math.sin(a) * c.rz * k;
    if (P.inside(x, z) < 0.8 || inEye(x, z)) continue;
    if (ci !== 1 && r() < 0.55) continue; // the garden has the most
    const top = P.roofY(x, z);
    root(x, z, Math.min(top - 2.6, 1.5 + r() * r() * (top - 3.5)), 0.03 + r() * 0.05);
  }
  const mush = (x: number, z: number, s: number, colour: string, y = 0) => {
    sink.geo(new THREE.CylinderGeometry(0.035 * s, 0.05 * s, 0.3 * s, 5).translate(x, y + 0.15 * s, z), "#e9f3e2", 0.5);
    sink.geo(new THREE.SphereGeometry(0.2 * s, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.7, 1).translate(x, y + 0.28 * s, z), colour, 1, 0.12, finishMushroomCap);
  };
  const GLOWS = ["#58f0ff", "#7dffb0", "#c79bff", "#ff9bd6", "#ffe37a"];
  const pillars: [number, number][] = [[-20.5, -57.2], [-11.8, -62.8], [-17.2, -68.4], [-22.4, -70.2], [-9.4, -66.6], [-14.2, -55.6]];
  for (const [x, z] of pillars) {
    const top = P.roofY(x, z);
    for (let k = 0; k < 5; k++) { const a = r() * 6.28, o = 0.12 + r() * 0.22; sink.geo(new THREE.CylinderGeometry(0.13 + r() * 0.1, 0.2 + r() * 0.12, top + 0.4, 5).translate(x + Math.cos(a) * o, top / 2, z + Math.sin(a) * o), pick(["#8a6c50", "#7a5e45", "#977a5c"]), 0.1, 0.1); }
    col.addCircle(x, z, 0.55);
    for (let k = 0; k < 4; k++) { const a = r() * 6.28; mush(x + Math.cos(a) * 0.5, z + Math.sin(a) * 0.5, 0.5 + r() * 0.5, pick(GLOWS), 0.6 + r() * 2.2); }
    sparks.add(2, x, 1.6, z, pick(GLOWS), 3.2, 0, r);
    lamp(x, 1.5, z, pick(GLOWS), 6, 0.5);
  }
  // mushrooms in clumps on the floor of every chamber (most in the garden), each clump with its halo
  for (let i = 0; i < 64; i++) {
    const ci = i < 30 ? 1 : i % P.CHAMBERS.length, c = P.CHAMBERS[ci], a = r() * Math.PI * 2, k = 0.35 + r() * 0.6;
    const x = c.x + Math.cos(a) * c.rx * k, z = c.z + Math.sin(a) * c.rz * k;
    if (!P.walkable(x, z, 0.5) || nearPath(x, z) < 1.8) continue;
    const colour = pick(GLOWS), n = 3 + Math.floor(r() * 4);
    for (let m = 0; m < n; m++) mush(x + (r() - 0.5) * 0.9, z + (r() - 0.5) * 0.9, 0.6 + r() * 1.1, colour);
    sparks.add(2, x, 0.35, z, colour, 2.4, 0, r);
  }
  // ferns and stones by the water
  for (const q of P.POOLS) for (let i = 0; i < 9; i++) {
    const a = r() * Math.PI * 2, x = q.x + Math.cos(a) * (q.rx + 0.5 + r() * 0.5), z = q.z + Math.sin(a) * (q.rz + 0.5 + r() * 0.5);
    if (P.inside(x, z) < 0.3 || (x > P.BRIDGE.x0 - 0.6 && x < P.BRIDGE.x1 + 0.6 && z > P.BRIDGE.z0 && z < P.BRIDGE.z1)) continue;
    if (i % 3 === 0) sink.geo(new THREE.DodecahedronGeometry(0.3 + r() * 0.3, 0).scale(1.2, 0.6, 1).rotateY(r() * 3).translate(x, 0.08, z), pick(ROCK));
    else for (let k = 0; k < 5; k++) sink.geo(new THREE.ConeGeometry(0.09, 0.7 + r() * 0.5, 3).translate(0, 0.35, 0).rotateZ(0.5 + r() * 0.5).rotateY((k / 5) * 6.28 + r()).translate(x, 0, z), pick(MOSS), 0.15);
  }

  // water lilies on the still pools: a pad or two, a flower that glows a little
  for (const q of P.POOLS) {
    if (q.deck || q.rx < 2.5) continue;
    const n = Math.round(3 + q.rx * 0.7);
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2, k = 0.25 + r() * 0.62, x = q.x + Math.cos(a) * q.rx * k, z = q.z + Math.sin(a) * q.rz * k;
      // (not where one wades across, nor under the bridge, nor on the island)
      if (q.ford && (nearPath(x, z) < 2.4 || Math.hypot(x - P.ISLAND.x, z - P.ISLAND.z) < P.ISLAND.r + 2.2 || Math.abs(x - q.x) < 1.6)) continue;
      const s2 = 0.32 + r() * 0.22;
      const angle = r() * 6.28;
      sink.geo(new THREE.CircleGeometry(s2, 7, 0.5, Math.PI * 2 - 0.9).rotateX(-Math.PI / 2).rotateY(angle).translate(x, -0.03, z), pick(["#3f9a62", "#4fae6a", "#2f8a58"]), 0.35);
      sink.geo(lilyPadVeins(s2).rotateX(-Math.PI / 2).rotateY(angle).translate(x, -0.03, z), "#87b889", 0.35);
      if (i % 2 === 0) {
        const colour = pick(["#ffd7ee", "#fff3c4", "#ffffff", "#ffc2dd"]);
        const bloom = lilyBloom();
        sink.geo(bloom.petals.translate(x + 0.1, 0, z), colour, 1);
        sink.geo(bloom.center.translate(x + 0.1, 0, z), "#edc66c", 0.8);
        sparks.add(2, x + 0.1, 0.12, z, colour, 0.9, 0, r);
      }
    }
  }
  // blue butterflies in the eye's light, round the ceiba (sparks that wander like the fireflies, bigger and blue)
  for (let i = 0; i < 16; i++) { const a = r() * 6.283, d = 1.5 + r() * 5; sparks.add(0, P.EYE.x + 1 + Math.cos(a) * d, 1 + r() * 4.5, P.EYE.z + 0.6 + Math.sin(a) * d, pick(["#6fc8ff", "#8fe0ff", "#5aa8ff"]), 0.34, 1.2 + r(), r); }
  // lianas in an arch over the bridge of roots, a few flowers on them
  for (let i = 0; i < 9; i++) {
    const t = i / 8, x = P.BRIDGE.x0 - 0.3 + (P.BRIDGE.x1 - P.BRIDGE.x0 + 0.6) * (i % 2), z = P.BRIDGE.z1 - (P.BRIDGE.z1 - P.BRIDGE.z0) * t;
    const top = P.roofY(x, z), len = top - 2.3 - 1.6 * Math.sin(t * Math.PI);
    sink.geo(new THREE.CylinderGeometry(0.03, 0.045, len, 4).translate(x, top - len / 2, z), pick(WOOD), 0.05);
    for (let m = 0; m < 3; m++) { const y = top - len * (0.45 + m * 0.25); sink.geo(new THREE.OctahedronGeometry(0.13, 0).scale(1.5, 0.6, 1).translate(x + (r() - 0.5) * 0.2, y, z + (r() - 0.5) * 0.2), pick(MOSS), 0.25); }
    sparks.add(2, x, top - len + 0.1, z, pick(GLOWS), 1.4, 0, r);
    sink.geo(new THREE.OctahedronGeometry(0.1, 0).translate(x, top - len, z), "#ffe9f4", 1);
  }

  // ---- the chamber of the stars: crystals, the wall of old glyphs
  const crystal = (x: number, z: number, s: number, colour: string) => {
    const n = 3 + Math.floor(r() * 3);
    for (let k = 0; k < n; k++) {
      const h = s * (0.7 + r() * 1.3), w = s * (0.14 + r() * 0.1), a = r() * 6.28, lean = r() * 0.5;
      const g = new THREE.CylinderGeometry(w * 0.15, w, h, 6).translate(0, h / 2, 0).rotateZ(lean).rotateY(a).translate(x + Math.cos(a) * 0.15 * k, 0, z + Math.sin(a) * 0.15 * k);
      sink.geo(g, colour, 0.8, 0.3);
    }
    sparks.add(2, x, s * 0.7, z, colour, 2.6 + s, 0, r);
    lamp(x, 1, z, colour, 7, 0.7);
  };
  {
    const c = P.CHAMBERS[3];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + r() * 0.2, k = i % 3 === 0 ? 0.45 + r() * 0.2 : 0.86, x = c.x + Math.cos(a) * c.rx * k, z = c.z + Math.sin(a) * c.rz * k;
      if (!P.walkable(x, z, 0.4) || nearPath(x, z) < 3.4) continue;
      crystal(x, z, 0.7 + r() * 0.8, pick(["#b58cff", "#7ad7ff", "#f3a6e6", "#9affd9"]));
      col.addCircle(x, z, 0.5);
    }
    for (let i = 0; i < 90; i++) {
      const a = r() * Math.PI * 2, k = Math.sqrt(r()) * 0.95, x = c.x + Math.cos(a) * c.rx * k, z = c.z + Math.sin(a) * c.rz * k;
      sparks.add(3, x, P.roofY(x, z) - 0.25, z, pick(["#9ff3ff", "#d9fbff", "#b9c8ff"]), 0.34, 0, r);
    }
    // and their threads hanging down from the roof, beaded with light (a night sky one walks under)
    for (let i = 0; i < 70; i++) {
      const a = r() * Math.PI * 2, k = Math.sqrt(r()) * 0.9, x = c.x + Math.cos(a) * c.rx * k, z = c.z + Math.sin(a) * c.rz * k;
      if (P.inside(x, z) < 1.2 || nearPath(x, z) < 1.2) continue;
      const top = P.roofY(x, z), len = Math.min(top - 2.9, 2.5 + r() * 6), colour = pick(["#9ff3ff", "#d9fbff", "#b9c8ff", "#c8b6ff"]);
      sink.geo(new THREE.CylinderGeometry(0.008, 0.008, len, 3).translate(x, top - len / 2, z), "#9fdfe6", 0.6);
      for (let m = 0; m < 5; m++) sparks.add(3, x, top - len * (0.25 + 0.75 * (m / 4)) , z, colour, 0.22 + r() * 0.12, 0, r);
    }
  }

  // ---- the glyph stones: a stela each on its base, a dark panel where its glyph shines
  const stones: { id: string; x: number; z: number; halo: number; quad: number }[] = [];
  const gPos: number[] = [], gUv: number[] = [], gTint: number[] = [], gPhase: number[] = [];
  const quad = (x: number, y: number, z: number, rot: number, w: number, h: number, cell: number, tint: THREE.Color, phase: number) => {
    const cx = Math.cos(rot), sx = Math.sin(rot), u0 = (cell % 4) / 4, v0 = 1 - (Math.floor(cell / 4) + 1) / 4, q = gPos.length / 3;
    const P4: [number, number, number, number][] = [[-w / 2, -h / 2, u0, v0], [w / 2, -h / 2, u0 + 0.25, v0], [w / 2, h / 2, u0 + 0.25, v0 + 0.25], [-w / 2, h / 2, u0, v0 + 0.25]];
    for (const i of [0, 1, 2, 0, 2, 3]) { const [px, py, u, v] = P4[i]; gPos.push(x + px * cx, y + py, z - px * sx); gUv.push(u, v); gTint.push(tint.r, tint.g, tint.b); gPhase.push(phase); }
    return q;
  };
  const WAIT = C("#5fe6ff"), LIT = C("#ffd15c");
  let cell = 0;
  for (const c of P.CHAMBERS) for (const s of c.stones) {
    const fx = Math.sin(s.rot), fz = Math.cos(s.rot);
    sink.geo(new THREE.BoxGeometry(1.5, 0.3, 1.0).rotateY(s.rot).translate(s.x, 0.15, s.z), ROCK[1]);
    sink.geo(new THREE.BoxGeometry(1.0, 1.9, 0.42).rotateY(s.rot).translate(s.x, 1.25, s.z), ROCK[2]);
    sink.geo(new THREE.CylinderGeometry(0.5, 0.5, 0.42, 10, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI / 2).rotateY(s.rot).translate(s.x, 2.2, s.z), ROCK[2]);
    sink.geo(new THREE.BoxGeometry(0.8, 0.8, 0.04).rotateY(s.rot).translate(s.x + fx * 0.2, 1.45, s.z + fz * 0.2), "#3a3f3c");
    const qd = quad(s.x + fx * 0.235, 1.45, s.z + fz * 0.235, s.rot, 0.74, 0.74, cell++ % 16, WAIT, r() * 6.28);
    const halo = sparks.add(2, s.x + fx * 0.3, 1.45, s.z + fz * 0.3, "#3fd9ff", 3.4, 0, r);
    stones.push({ id: s.id, x: s.x, z: s.z, halo, quad: qd });
    col.addCircle(s.x, s.z, 0.62);
  }
  // the wall of glyphs in the chamber of the stars: three rows of them on a great slab, faintly lit
  {
    const wx = 26.6, wz = -139.5, rot = -Math.PI / 2;
    sink.geo(new THREE.BoxGeometry(7.2, 4.6, 0.5).rotateY(rot).translate(wx + 0.3, 2.5, wz), ROCK[0]);
    for (let row = 0; row < 3; row++) for (let k = 0; k < 6; k++) quad(wx, 1.1 + row * 1.25, wz + (k - 2.5) * 1.1, rot, 0.95, 0.95, (row * 6 + k * 3 + 5) % 16, C("#2f8fa6"), r() * 6.28);
    sparks.add(2, wx - 0.6, 2.6, wz, "#58d8f0", 8, 0, r);
  }

  // ---- the gates: two pillars and a lintel in the rock's stone, a veil of light across (one mesh each: gone once open)
  const veilMat = (open: { value: number }) => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uOpen: open, uFog: { value: fog.density } },
    vertexShader: `varying vec2 vUv; varying float vD; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying vec2 vUv; varying float vD; uniform float uTime; uniform float uOpen; uniform float uFog; ${GLSL_FOG}
      void main(){
        float strand = sin(vUv.x * 46.0 + sin(vUv.y * 5.0 + uTime * 0.8) * 2.2);
        float flow = 0.5 + 0.5 * sin(vUv.y * 9.0 - uTime * 1.7 + vUv.x * 7.0);
        float edge = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x) * smoothstep(0.0, 0.05, vUv.y);
        float a = (0.16 + 0.42 * smoothstep(0.1, 1.0, strand) * flow + 0.18 * flow) * edge * (1.0 - uOpen) * smoothstep(1.2, 5.0, vD);
        gl_FragColor = vec4(vec3(0.2, 0.85, 0.8) * a * fogF(vD), 1.0);
      }`,
  });
  const gates = new Map<string, { g: P.Gate; veil: THREE.Mesh; open: { value: number }; want: number; rings: { x: number; z: number; r: number }[] }>();
  const veils: THREE.ShaderMaterial[] = [];
  /** The gates' pillars: the camera keeps clear of them too. */
  const posts: [number, number][] = [];
  for (const g of P.GATES) {
    const cx = Math.cos(g.rot), sx = Math.sin(g.rot), half = g.w / 2, H = 4.3;
    const bridge = g.id === "nikte";
    if (!bridge) {
      for (const s of [-1, 1]) {
        const px = g.x + cx * s * (half + 0.2), pz = g.z - sx * s * (half + 0.2);
        sink.geo(new THREE.BoxGeometry(0.95, H, 0.95).rotateY(g.rot).translate(px, H / 2, pz), ROCK[0]);
        sink.geo(new THREE.BoxGeometry(1.25, 0.35, 1.25).rotateY(g.rot).translate(px, 0.17, pz), ROCK[3]);
        sink.geo(new THREE.BoxGeometry(1.2, 0.3, 1.2).rotateY(g.rot).translate(px, H - 0.5, pz), ROCK[3]);
        col.addCircle(px, pz, 0.7);
        posts.push([px, pz]);
        quad(px + sx * 0.49, 2.2, pz + cx * 0.49, g.rot, 0.62, 0.62, (cell++ * 5) % 16, C("#2f9fb4"), r() * 6.28);
      }
      // (no lintel: the follow camera goes through behind the player, under the rock's own roof)
    }
    const open = { value: 0 }, m = veilMat(open);
    veils.push(m);
    const veil = new THREE.Mesh(new THREE.PlaneGeometry(g.w + (bridge ? 0 : 0.2), bridge ? 2.6 : H), m);
    veil.position.set(g.x, (bridge ? 2.6 : H) / 2 + 0.02, g.z);
    veil.rotation.y = g.rot;
    veil.name = "gate-" + g.id;
    veil.renderOrder = 4;
    group.add(veil);
    const rings: { x: number; z: number; r: number }[] = [];
    for (let o = -half + 0.35; o <= half - 0.35 + 1e-6; o += 0.7) rings.push({ x: g.x + cx * o, z: g.z - sx * o, r: 0.5 });
    // The quest toggles the physical rings and the navigation grid together.
    gates.set(g.id, { g, veil, open, want: 0, rings });
  }
  // the bridge of roots over the river: a deck of woven roots, low rails
  {
    const { x0, x1, z0, z1 } = P.BRIDGE, mx = (x0 + x1) / 2;
    for (let z = z1; z > z0; z -= 0.42) sink.geo(new THREE.CylinderGeometry(0.11, 0.13, x1 - x0 + r() * 0.3, 5).rotateZ(Math.PI / 2).translate(mx + (r() - 0.5) * 0.1, 0.0, z), pick(["#8a6c50", "#7a5e45", "#977a5c"]), 0.16);
    for (const s of [-1, 1]) {
      sink.geo(new THREE.CylinderGeometry(0.09, 0.09, z1 - z0, 5).rotateX(Math.PI / 2).translate(mx + s * (x1 - x0) / 2, 0.75, (z0 + z1) / 2), "#8a6c50", 0.16);
      for (let z = z1; z >= z0; z -= 1.6) sink.geo(new THREE.CylinderGeometry(0.07, 0.09, 0.8, 5).translate(mx + s * (x1 - x0) / 2, 0.38, z), "#7a5e45", 0.16);
      for (let k = 0; k < 4; k++) mush(mx + s * (x1 - x0) / 2, z1 - 0.8 - k * 1.5, 0.5, pick(GLOWS), 0.72);
    }
  }
  // Kin's little house by the way in: a hut of leaves a child could not stand up in, its doorway lit from inside
  {
    const hx = 2.55, hz = -6.4;
    sink.geo(new THREE.ConeGeometry(0.8, 0.95, 6).translate(hx, 1.1, hz), "#b9a15a", 0.1, 0.1);
    sink.geo(new THREE.CylinderGeometry(0.58, 0.62, 0.66, 8).translate(hx, 0.33, hz), "#8a6a4a", 0.05, 0.1);
    sink.geo(new THREE.BoxGeometry(0.28, 0.42, 0.05).rotateY(-0.5).translate(hx - 0.3, 0.24, hz + 0.52), "#ffd27a", 1);
    col.addCircle(hx, hz, 0.7);
    sparks.add(2, hx - 0.4, 0.5, hz + 0.7, "#ffd27a", 2.2, 0, r);
  }

  // ---- the water: every pool in one mesh, glowing from inside
  {
    const pos: number[] = [], ctr: number[] = [];
    for (const q of P.POOLS) {
      const N = 30;
      for (let i = 0; i < N; i++) {
        const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2;
        pos.push(q.x, -0.05, q.z, q.x + Math.cos(a1) * q.rx, -0.05, q.z + Math.sin(a1) * q.rz, q.x + Math.cos(a0) * q.rx, -0.05, q.z + Math.sin(a0) * q.rz);
        ctr.push(0, 1, 1);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("aRim", new THREE.Float32BufferAttribute(ctr, 1));
    const water = new THREE.Mesh(g, new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uFog: { value: fog.density }, uFogColor: { value: C(FOG) } },
      vertexShader: `attribute float aRim; varying float vRim; varying vec3 vW; varying float vD;
        void main(){ vRim = aRim; vW = (modelMatrix * vec4(position, 1.0)).xyz; vec4 mv = viewMatrix * vec4(vW, 1.0); vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying float vRim; varying vec3 vW; varying float vD; uniform float uTime; uniform float uFog; uniform vec3 uFogColor; ${GLSL_FOG}
        void main(){
          // the light playing under the surface, slow rings, a brighter heart, a pale line at the rim
          float ca = sin(vW.x * 1.9 + uTime * 0.8 + sin(vW.z * 1.4 - uTime * 0.5) * 1.7) * sin(vW.z * 2.1 - uTime * 0.7 + sin(vW.x * 1.2 + uTime * 0.4) * 1.5);
          float ring = 0.5 + 0.5 * sin(vRim * 18.0 - uTime * 1.2);
          vec3 deep = vec3(0.02, 0.42, 0.50), bright = vec3(0.30, 1.0, 0.90);
          vec3 c = mix(bright, deep, smoothstep(0.0, 1.0, vRim) * 0.75);
          c += vec3(0.25, 0.5, 0.45) * smoothstep(0.35, 1.0, ca) * (1.0 - vRim * 0.5) + vec3(0.05, 0.12, 0.12) * ring * (1.0 - vRim);
          c = mix(c, vec3(0.75, 1.0, 0.96), smoothstep(0.93, 1.0, vRim) * 0.55);
          gl_FragColor = vec4(mix(uFogColor, c, fogF(vD)), 1.0);
          #include <colorspace_fragment>
        }`,
    }));
    water.name = "cave-water";
    water.frustumCulled = false;
    group.add(water);
    group.userData.water = water;
  }

  // ---- the falls: a ribbon each, streaked and moving, mist where they land
  {
    const pos: number[] = [], uv: number[] = [];
    for (const f of P.FALLS) {
      const cx = Math.cos(f.rot), sx = Math.sin(f.rot), N = 6;
      for (let k = 0; k < N; k++) {
        const y0 = f.h * (k / N), y1 = f.h * ((k + 1) / N), o0 = 0.5 * (1 - k / N) ** 2 + 0.25, o1 = 0.5 * (1 - (k + 1) / N) ** 2 + 0.25;
        const at = (s: number, y: number, o: number): V3 => [f.x + cx * s * f.w / 2 + sx * o, y, f.z - sx * s * f.w / 2 + cx * o];
        const A = at(-1, y0, o0), B = at(1, y0, o0), D = at(1, y1, o1), E = at(-1, y1, o1);
        pos.push(...A, ...B, ...D, ...A, ...D, ...E);
        uv.push(0, y0 / f.h, 1, y0 / f.h, 1, y1 / f.h, 0, y0 / f.h, 1, y1 / f.h, 0, y1 / f.h);
      }
      for (let i = 0; i < 16; i++) sparks.add(4, f.x + (r() - 0.5) * f.w + sx * 0.6, 0.2, f.z + (r() - 0.5) * 0.8 + cx * 0.8, "#dffcff", 1.6 + r() * 1.4, 1.6 + r(), r);
      // the rock it comes out of
      for (let i = 0; i < 5; i++) sink.geo(new THREE.DodecahedronGeometry(0.7 + r() * 0.5, 0).translate(f.x + (r() - 0.5) * (f.w + 1.4) * cx + sx * 0.1, f.h + 0.2 + r() * 0.5, f.z + (r() - 0.5) * (f.w + 1.4) * sx + cx * 0.1), pick(ROCK));
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    const falls = new THREE.Mesh(g, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: { uTime: { value: 0 }, uFog: { value: fog.density }, uFogColor: { value: C(FOG) } },
      vertexShader: `varying vec2 vUv; varying float vD; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying vec2 vUv; varying float vD; uniform float uTime; uniform float uFog; uniform vec3 uFogColor; ${GLSL_FOG}
        void main(){
          float s = 0.5 + 0.5 * sin(vUv.x * 31.0 + sin(vUv.y * 9.0 + uTime * 5.0) * 1.3);
          float run = 0.5 + 0.5 * sin(vUv.y * 17.0 + uTime * 8.0 + vUv.x * 11.0);
          float edge = smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x);
          float a = (0.42 + 0.5 * s * run) * edge * (0.75 + 0.25 * vUv.y);
          vec3 c = mix(vec3(0.55, 0.95, 0.95), vec3(1.0), s * run);
          gl_FragColor = vec4(mix(uFogColor, c, fogF(vD)), a);
          #include <colorspace_fragment>
        }`,
    }));
    falls.name = "cave-falls";
    falls.frustumCulled = false;
    falls.renderOrder = 3;
    group.add(falls);
    group.userData.falls = falls;
  }

  // ---- the light shafts: the great one under the eye, thin ones beside it, a few through cracks further in
  {
    const pos: number[] = [], al: number[] = [];
    const shaft = (x: number, z: number, top: number, r0: number, r1: number, lean: [number, number], a: number) => {
      const N = 10;
      for (let i = 0; i < N; i++) {
        const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2;
        const T = (an: number): V3 => [x + Math.cos(an) * r0, top, z + Math.sin(an) * r0], B = (an: number): V3 => [x + lean[0] + Math.cos(an) * r1, 0, z + lean[1] + Math.sin(an) * r1];
        pos.push(...T(a0), ...B(a0), ...B(a1), ...T(a0), ...B(a1), ...T(a1));
        al.push(a, 0, 0, a, 0, a);
      }
    };
    const ey = P.roofY(P.EYE.x, P.EYE.z) + 4;
    shaft(P.EYE.x, P.EYE.z, ey, P.EYE.r * 0.82, P.EYE.r * 1.5, [1.6, 1.0], 0.34);
    shaft(P.EYE.x, P.EYE.z, ey, P.EYE.r * 0.5, P.EYE.r * 0.9, [1.6, 1.0], 0.3);
    for (let i = 0; i < 6; i++) { const a = r() * 6.28, d = 1 + r() * 2.4; shaft(P.EYE.x + Math.cos(a) * d, P.EYE.z + Math.sin(a) * d, ey, 0.25, 0.5 + r() * 0.5, [1.6 + Math.cos(a) * 1.5, 1 + Math.sin(a) * 1.5], 0.42); }
    for (const [x, z] of [[-13, -99], [2, -105], [-2, -96], [8, -172], [3, -184], [11, -181], [6, -176], [-17, -62], [15, -139]] as [number, number][]) shaft(x, z, P.roofY(x, z) + 0.6, 0.18, 0.5 + r() * 0.4, [0.8 + r(), 0.5], 0.4);
    // El Ojo's own light, down onto the water one comes up through
    shaft(P.EYE2.x, P.EYE2.z, P.roofY(P.EYE2.x, P.EYE2.z) + 3, P.EYE2.r * 0.8, P.EYE2.r * 1.5, [0.4, -0.5], 0.36);
    // motes drifting in the great shaft
    for (let i = 0; i < 90; i++) { const a = r() * 6.28, d = Math.sqrt(r()) * 4.5; sparks.add(1, P.EYE.x + 1 + Math.cos(a) * d, 0.3 + r() * 2, P.EYE.z + 0.6 + Math.sin(a) * d, "#fff6d8", 0.09 + r() * 0.08, 9 + r() * 4, r); }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("aA", new THREE.Float32BufferAttribute(al, 1));
    const shafts = new THREE.Mesh(g, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uFog: { value: fog.density } },
      vertexShader: `attribute float aA; varying float vA; varying vec3 vW; varying float vD; void main(){ vA = aA; vW = position; vec4 mv = modelViewMatrix * vec4(position, 1.0); vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying float vA; varying vec3 vW; varying float vD; uniform float uTime; uniform float uFog; ${GLSL_FOG}
        void main(){
          float sh = 0.8 + 0.2 * sin(vW.x * 1.7 + vW.z * 1.3 + uTime * 0.6) * sin(vW.y * 0.9 - uTime * 0.35);
          gl_FragColor = vec4(vec3(1.0, 0.93, 0.74) * vA * sh * fogF(vD) * 0.55, 1.0);
        }`,
    }));
    shafts.name = "cave-shafts";
    shafts.frustumCulled = false;
    shafts.renderOrder = 5;
    group.add(shafts);
    group.userData.shafts = shafts;
  }

  // ---- fireflies everywhere (most in the garden and round the heart), the Yaxché's flowers (lit when it blooms)
  for (let i = 0; i < 420; i++) {
    const ci = i < 120 ? 1 : i < 210 ? 4 : i % P.CHAMBERS.length, c = P.CHAMBERS[ci], a = r() * Math.PI * 2, k = Math.sqrt(r()) * 0.9;
    const x = c.x + Math.cos(a) * c.rx * k, z = c.z + Math.sin(a) * c.rz * k;
    if (P.inside(x, z) < 1) continue;
    sparks.add(0, x, 0.5 + r() * 3.2, z, pick(["#f6ff8a", "#d9ff7a", "#fff0a0", "#a8ffd0"]), 0.26 + r() * 0.16, 0.7 + r() * 1.1, r);
  }
  // ---- the two other ways in and out (grounds.ts), drawn from numbers of their own
  {
    const q = rand(9041);
    // El Ojo from below: its chimney of rock up to the day, roots down through it
    const { x, z, r: er } = P.EYE2, y0 = P.roofY(x, z) - 0.5, N = 10;
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2;
      const A: V3 = [x + Math.cos(a0) * (er + 0.4), y0, z + Math.sin(a0) * (er + 0.4)], B: V3 = [x + Math.cos(a1) * (er + 0.4), y0, z + Math.sin(a1) * (er + 0.4)];
      const D: V3 = [x + Math.cos(a0) * (er - 0.3), y0 + 4.2, z + Math.sin(a0) * (er - 0.3)], E: V3 = [x + Math.cos(a1) * (er - 0.3), y0 + 4.2, z + Math.sin(a1) * (er - 0.3)];
      const c = C(ROCK[Math.floor(q() * ROCK.length)]).offsetHSL(0, 0.04, 0.1);
      sink.tri(A, B, E, c, 0.3, [x, y0 + 2, z]); sink.tri(A, E, D, c, 0.3, [x, y0 + 2, z]);
    }
    sink.geo(new THREE.CircleGeometry(er + 0.6, 14).rotateX(Math.PI / 2).translate(x, y0 + 4.3, z), "#f2fdff", 1);
    for (let i = 0; i < 9; i++) { const a = q() * 6.283, len = 1.5 + q() * 3.4; sink.geo(new THREE.CylinderGeometry(0.02, 0.035, len, 4).translate(x + Math.cos(a) * (er - 0.25), y0 + 3.6 - len / 2, z + Math.sin(a) * (er - 0.25)), WOOD[i % 3]); }
    for (let i = 0; i < 26; i++) { const a = q() * 6.283, d = Math.sqrt(q()) * 2; sparks.add(1, x + Math.cos(a) * d, 0.2 + q() * 1.5, z + Math.sin(a) * d, "#fff6d8", 0.08 + q() * 0.07, 4 + q() * 1.5, q); }
    // the cleft's end: a slit of daylight between two leaning slabs, ferns in its light
    const e = P.EXITS[1], ex = e.x + 1.15, ez = e.z - 0.25;
    sink.geo(new THREE.BoxGeometry(0.06, 3.3, 0.62).rotateY(-0.25).translate(ex, 1.65, ez), "#f6fff4", 1);
    for (const sgn of [-1, 1]) sink.geo(new THREE.BoxGeometry(1.0, 4.4, 0.9).rotateX(sgn * 0.2).rotateY(-0.25).translate(ex + 0.25, 2.1, ez + sgn * 0.75), ROCK[sgn > 0 ? 1 : 3]);
    for (let i = 0; i < 4; i++) for (let k = 0; k < 4; k++) sink.geo(new THREE.ConeGeometry(0.08, 0.6 + q() * 0.3, 3).translate(0, 0.3, 0).rotateZ(0.6).rotateY(k * 1.6 + i).translate(e.x - 0.6 + i * 0.5, 0, e.z + (i % 2 ? 0.75 : -0.85)), MOSS[k % 3], 0.2);
    sparks.add(2, ex - 0.3, 1.6, ez, "#fff6d8", 3.4, 0, q);
  }
  const BURST = 40, burstAt = sparks.size.length;
  for (let i = 0; i < BURST; i++) sparks.add(5, 0, -99, 0, "#ffffff", 0.3, 0, r);

  // ---- put together
  const rockMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
  const rocks = sink.meshes(rockMat);
  for (const m of rocks) group.add(m);

  const gg = new THREE.BufferGeometry();
  gg.setAttribute("position", new THREE.Float32BufferAttribute(gPos, 3));
  gg.setAttribute("uv", new THREE.Float32BufferAttribute(gUv, 2));
  gg.setAttribute("aTint", new THREE.Float32BufferAttribute(gTint, 3));
  gg.setAttribute("aPhase", new THREE.Float32BufferAttribute(gPhase, 1));
  const glyphs = new THREE.Mesh(gg, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uMap: { value: glyphAtlas() }, uFog: { value: fog.density } },
    vertexShader: `attribute vec3 aTint; attribute float aPhase; varying vec2 vUv; varying vec3 vTint; varying float vPh; varying float vD;
      void main(){ vUv = uv; vTint = aTint; vPh = aPhase; vec4 mv = modelViewMatrix * vec4(position, 1.0); vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying vec2 vUv; varying vec3 vTint; varying float vPh; varying float vD; uniform float uTime; uniform sampler2D uMap; uniform float uFog; ${GLSL_FOG}
      void main(){ float a = texture2D(uMap, vUv).a; float pulse = 0.72 + 0.28 * sin(uTime * 1.5 + vPh); gl_FragColor = vec4(vTint * a * pulse * fogF(vD) * 1.25, 1.0); }`,
  }));
  glyphs.name = "cave-glyphs";
  glyphs.frustumCulled = false;
  glyphs.renderOrder = 4;
  group.add(glyphs);

  const sg = new THREE.BufferGeometry();
  const sPos = new THREE.Float32BufferAttribute(sparks.pos, 3), sCol = new THREE.Float32BufferAttribute(sparks.col, 3), sSize = new THREE.Float32BufferAttribute(sparks.size, 1), sSeed = new THREE.Float32BufferAttribute(sparks.seed, 4);
  sg.setAttribute("position", sPos); sg.setAttribute("aColor", sCol); sg.setAttribute("aSize", sSize); sg.setAttribute("aSeed", sSeed);
  const pointsU = { uTime: { value: 0 }, uScale: { value: 600 }, uFog: { value: fog.density }, uBurst: { value: -99 } };
  const points = new THREE.Points(sg, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: pointsU,
    vertexShader: `attribute vec3 aColor; attribute float aSize; attribute vec4 aSeed; uniform float uTime; uniform float uScale; uniform float uFog; uniform float uBurst;
      varying vec3 vC; varying float vA; ${GLSL_FOG}
      void main(){
        vec3 p = position; float ph = aSeed.x, sp = aSeed.y, reach = aSeed.z, kind = aSeed.w, t = uTime * sp + ph, a = 1.0, size = aSize;
        if (kind < 0.5) {            // a firefly: wanders, blinks
          p += vec3(sin(t * 0.7) + 0.5 * sin(t * 1.3 + ph), 0.6 * sin(t * 0.9 + 1.7), cos(t * 0.6 + ph * 2.0) + 0.5 * cos(t * 1.1)) * reach;
          a = 0.5 + 0.5 * sin(t * 2.1 + ph * 5.0); a = a * a;
        } else if (kind < 1.5) {     // a mote in the light: rises slowly, comes round again
          float f = fract(uTime * 0.035 * sp + ph);
          p += vec3(sin(t * 0.3) * 0.5, f * reach, cos(t * 0.26) * 0.5);
          a = sin(f * 3.1416) * 0.8;
        } else if (kind < 2.5) {     // a halo round something that glows: breathes
          a = 0.3 + 0.07 * sin(t * 1.3);
        } else if (kind < 3.5) {     // a glow-worm on the roof: twinkles
          a = 0.45 + 0.55 * sin(t * 1.7 + ph * 9.0); a = a * a;
        } else if (kind < 4.5) {     // mist where a fall lands: rises, spreads, fades
          float f = fract(uTime * 0.22 * sp + ph);
          p += vec3(sin(ph * 7.0) * f * 1.4, f * reach, cos(ph * 5.0) * f * 1.4);
          size *= 0.6 + f * 1.6; a = (1.0 - f) * 0.2;
        } else {                     // a burst's spark: flies out from where it began and falls
          float f = clamp((uTime - uBurst) / 1.5, 0.0, 1.0);
          vec3 dir = normalize(vec3(sin(ph * 3.0), 0.5 + 0.9 * fract(ph * 1.7), cos(ph * 5.0)));
          p += dir * f * 3.6 * sp - vec3(0.0, f * f * 2.2, 0.0);
          a = (1.0 - f) * step(0.001, f); size *= 1.0 + f;
        }
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vC = aColor; vA = a * fogF(-mv.z);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = min(size * uScale / max(0.5, -mv.z), 300.0);
      }`,
    fragmentShader: `varying vec3 vC; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; float s = max(0.0, 1.0 - d); gl_FragColor = vec4(vC * s * s * vA, 1.0); }`,
  }));
  points.name = "cave-sparks";
  points.frustumCulled = false;
  points.renderOrder = 6;
  group.add(points);

  // the people's shadows on the floor (the fine quality's real shadows; the simple one has its own blobs): the rock is
  // unlit, so a sheet that only takes shadows goes with whoever is down here
  const shade = new THREE.Mesh(new THREE.PlaneGeometry(30, 30).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ opacity: 0.34, depthWrite: false }));
  shade.receiveShadow = true;
  shade.renderOrder = 2;
  shade.name = "cave-shade";
  group.add(shade);
  paintFlowers0();

  // ---- what changes
  const view: CaveView = {
    group, colliders: col, fog,
    space: {
      free(a, b) {
        const n = 14;
        for (let i = 1; i <= n; i++) {
          const t = i / n, x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t, z = a.z + (b.z - a.z) * t;
          if (P.inside(x, z) < 0.55 || y > P.roofY(x, z) - 0.5 || (y < 4.6 && posts.some(([px, pz]) => (px - x) ** 2 + (pz - z) ** 2 < 1.1))) return (i - 1) / n;
        }
        return 1;
      },
      inside: (q) => P.inside(q.x, q.z) < 0.4 || q.y > P.roofY(q.x, q.z) - 0.35 || (q.y < 4.6 && posts.some(([px, pz]) => (px - q.x) ** 2 + (pz - q.z) ** 2 < 0.8)),
      overSolid: () => false,
    },
    update(t, dt, cam, at, h) {
      const mats = [group.userData.water, group.userData.falls, group.userData.shafts, glyphs] as THREE.Mesh[];
      for (const m of mats) (m.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
      for (const m of veils) m.uniforms.uTime.value = t;
      pointsU.uTime.value = t;
      pointsU.uScale.value = h / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)));
      shade.position.set(at.x, 0.025, at.z);
      // the chambers out of sight in the fog are left out of the picture
      const here = P.chamberAt(at.x, at.z);
      rocks.forEach((m, i) => { m.visible = Math.abs(i - here) <= 1; });
      for (const g of gates.values()) {
        if (g.open.value !== g.want) g.open.value = g.want > g.open.value ? Math.min(g.want, g.open.value + dt / 1.4) : Math.max(g.want, g.open.value - dt / 0.6);
        g.veil.visible = g.open.value < 0.999 && Math.abs(P.chamberAt(g.g.x, g.g.z) - here) <= 1;
      }
      if (heart.k !== heart.want) {
        heart.k = Math.min(heart.want, heart.k + dt / 3);
        paintFlowers();
      }
    },
    setGate(id, open, now) {
      const g = gates.get(id);
      if (!g) return;
      g.want = open ? 1 : 0;
      if (now) g.open.value = g.want;
      col.circles = col.circles.filter((c) => !g.rings.includes(c));
      if (!open) col.circles.push(...g.rings);
    },
    setStone(id, lit) {
      const s = stones.find((q) => q.id === id);
      if (!s) return;
      const c = lit ? LIT : WAIT, tint = gg.attributes.aTint as THREE.BufferAttribute;
      for (let i = 0; i < 6; i++) tint.setXYZ(s.quad + i, c.r * (lit ? 1.25 : 1), c.g * (lit ? 1.25 : 1), c.b * (lit ? 1.25 : 1));
      tint.needsUpdate = true;
      const h = lit ? C("#ffb93a") : C("#3fd9ff");
      sCol.setXYZ(s.halo, h.r, h.g, h.b); sCol.needsUpdate = true;
      sSize.setX(s.halo, lit ? 5 : 3.4); sSize.needsUpdate = true;
    },
    setCalling(id) {
      for (const s of stones) {
        const on = s.id === id, ph = gg.attributes.aPhase as THREE.BufferAttribute;
        // (the one speaking: its halo wider)
        if ((sSize.getX(s.halo) > 5.5) !== on && sSize.getX(s.halo) !== 5) { sSize.setX(s.halo, on ? 6.5 : 3.4); sSize.needsUpdate = true; }
        void ph;
      }
    },
    burst(x, y, z, colour) {
      const c = C(colour);
      for (let i = 0; i < BURST; i++) { sPos.setXYZ(burstAt + i, x, y, z); sCol.setXYZ(burstAt + i, c.r, c.g, c.b); }
      sPos.needsUpdate = true; sCol.needsUpdate = true;
      pointsU.uBurst.value = pointsU.uTime.value;
    },
    setHeart(on, now) {
      heart.want = on ? 1 : 0;
      if (now || !on) { heart.k = heart.want; paintFlowers(); }
    },
  };
  const heart = { k: 0, want: 0 };
  function paintFlowers0() { queueMicrotask(() => paintFlowers()); }
  const BLOOM = [C("#ffd7ee"), C("#fff3c4"), C("#bff8ff"), C("#ffc2dd")];
  function paintFlowers() {
    flowers.forEach((idx, i) => {
      // (the bloom runs out along the strands from the trunk's side; before it, a faint cold light)
      const k = Math.max(0, Math.min(1, heart.k * 1.6 - (i / flowers.length) * 0.6)), c = BLOOM[i % BLOOM.length];
      sCol.setXYZ(idx, 0.1 + (c.r * 1.9 - 0.1) * k, 0.3 + (c.g * 1.9 - 0.3) * k, 0.36 + (c.b * 1.9 - 0.36) * k);
    });
    sCol.needsUpdate = true;
  }
  return view;
}
