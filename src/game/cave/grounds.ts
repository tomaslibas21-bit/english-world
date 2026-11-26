// Cenote Ka'an's grounds (Puerto Colibrí; theme.ts `cenote.open`): the cenote reached from whichever side one comes,
// and more than one way into the grotto under it. The owner: "make it easier to enter through whichever direction …
// it's just like explore something".
//
// - The meadow between the town and the cenote is open all along the town's west edge, not only where the sacbé
//   crosses it; low jungle closes it to the north, the south and the west (something one sees, no wall of air).
// - Down to the water: the deck's steps (as before), a little beach of pale sand at its north-east, rock steps at its
//   south-east, and from the cliff's top at the west, up a stair of stones from the jungle side: El Salto, a ledge to
//   jump from (it lands one in front of the cave's mouth).
// - A trail of pale stones runs round the cenote's jungle side, from the clearing's south round the west to its north.
// - Into the grotto: the cave's mouth, swum into (as before); La Grieta, a cleft in the cliff's outer face at the
//   south-west, walked into; El Ojo, a sinkhole among the roots at the north-west, which drops one into the water one
//   comes up through. Each has its glow, its fireflies and a small glyph stone; near any of them the grotto's own
//   quiet is heard. Leaving the grotto by its water comes out at the mouth, by its crack at La Grieta.
//
// groundsPlan.ts shares the landmark coordinates with the maps and guidance.
import * as THREE from "three";
import type { Colliders } from "../world/util";
import { rand } from "../world/util";
import { groundFace } from "../world/shapes";
import { FLOORS, POOLS, poolBedY, type Pool } from "../water";
import { R, REACH, GAPS, SALTO, OJO, ang, polar, ways, trail, atLedge } from "./groundsPlan";

export { R, REACH, SALTO, GAPS, groundsBounds, polar, ways, trail, inGap, atLedge, type Way } from "./groundsPlan";

type Part = [THREE.BufferGeometry, THREE.ColorRepresentation];

/** The crowns of low jungle that close the grounds (x, z, size, height), and the few that stand inside them; each is in
 *  nobody's way but round it (`groundsWalk` gives them their ground plan). */
export function crowns(x: number, z: number, edge: number): [number, number, number, number][] {
  const r = rand(7321), out: [number, number, number, number][] = [];
  const row = (x0: number, z0: number, x1: number, z1: number, n: number, off = 0) => {
    for (let i = 0; i < n; i++) { const t = (i + off) / n; out.push([x0 + (x1 - x0) * t + (r() - 0.5) * 1.2, z0 + (z1 - z0) * t + (r() - 0.5) * 1.2, 2.9 + r() * 1.1, 0.75 + r() * 0.3]); }
  };
  const n = z - REACH.ns - 2.6, s = z + REACH.ns + 2.6, w = x - REACH.w - 2.6;
  // north and south, from the town's edge out to the west; the west side, into the selva's own band beyond
  row(edge + 1, n, w, n, 11); row(edge - 1, n - 3.4, w, n - 3.4, 10, 0.5);
  row(edge + 1, s, w, s, 11); row(edge - 1, s + 3.4, w, s + 3.4, 10, 0.5);
  row(w, n, w, s, 11, 0.5);
  // inside: one either side of the stair up to El Salto, one behind the cliff's north shoulder
  for (const [a, d, size] of [[0.875, 10.2, 2.3], [1.125, 10.2, 2.3], [1.47, 8.6, 1.9]] as [number, number, number][]) { const [px, pz] = polar(x, z, a * Math.PI, d); out.push([px, pz, size, 0.85]); }
  return out;
}

/** The grounds' plan for whoever walks there (replaces mexican.ts `cenoteWalk` where the theme says `open`): the
 *  water, the floors that are not level (the deck and its steps, the beach and the rock steps down into the water, the
 *  stair up to El Salto and its ledge, the sinkhole's pit), and what is solid: the rim's stones and the cliff but
 *  where a way goes through, the deck's rails, the taquilla, the palms, the crowns of jungle and the grounds' edge. */
export function groundsWalk(col: Colliders, x: number, z: number, edge: number, ceibas: [number, number][] = []) {
  const dx = x + R + 0.4, top = 0.86;
  const pool: Pool = { x, z, r: R - 0.1, y: 0.04, depth: 3.4 };
  POOLS.push(pool);
  // the deck (as it was): up its three steps, along it, down its steps and on under the water
  const x3 = dx + 3.05, x2 = dx + 1.6, x1 = dx - 1.6, x0 = dx - 4.6;
  FLOORS.push({ x0, x1: x3, z0: z - 1.2, z1: z + 1.2, y: (px) => (px > x2 ? (top * (x3 - px)) / (x3 - x2) : px > x1 ? top : top - ((top + 0.75) * (x1 - px)) / (x1 - x0)) });
  for (const s of [-1, 1]) col.addBox(dx, z + s * 1.32, 3.3, 0.2, "edge", "carRim");
  // the beach and the rock steps: the ground goes down to the water's bed between the rim's stones
  for (const g of GAPS) {
    const [mx, mz] = polar(x, z, g.a, 6.6);
    FLOORS.push({ x0: mx - 3.4, x1: mx + 3.4, z0: Math.max(mz - 3.4, g.a < 0 ? -1e9 : z + 1.25), z1: Math.min(mz + 3.4, g.a < 0 ? z - 1.25 : 1e9), y: (px, pz) => {
      const d = Math.hypot(px - x, pz - z);
      // (level as far as the water's edge, as it is drawn; then down to the bed in a step: the water covers it)
      return d < pool.r ? poolBedY(pool, px, pz) : (pool.y - 0.45) * Math.max(0, Math.min(1, (R + 0.55 - d) / (R + 0.55 - pool.r)));
    } });
  }
  // El Salto: the stair of stones up the cliff's back, the ledge on its top; open only at the water's side
  FLOORS.push({ x0: x - SALTO.foot, x1: x - SALTO.top0, z0: z - SALTO.half, z1: z + SALTO.half, y: (px) => (px > x - SALTO.top1 ? SALTO.y : (SALTO.y * (px - (x - SALTO.foot))) / (SALTO.foot - SALTO.top1)) });
  for (const s of [-1, 1]) col.addBox(x - (SALTO.foot + SALTO.top0) / 2, z + s * (SALTO.half + 0.2), SALTO.foot - SALTO.top0, 0.3, "edge");
  // El Ojo's pit
  const ojo = ways(x, z)[2];
  FLOORS.push({ x0: ojo.x - OJO.r, x1: ojo.x + OJO.r, z0: ojo.z - OJO.r, z1: ojo.z + OJO.r, y: (px, pz) => (Math.hypot(px - ojo.x, pz - ojo.z) < OJO.r - 0.1 ? -OJO.deep : 0) });
  // the rim's stones and the cliff all round the water, but at the deck, the two gaps and the ledge
  const ring = R + 0.75, n = Math.round((2 * Math.PI * ring) / 1.15);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    if (Math.abs(ang(a)) < 0.3 || GAPS.some((g) => Math.abs(ang(a - g.a)) < g.half - 0.1) || atLedge(a, 0.27)) continue;
    col.addCircle(x + Math.cos(a) * ring, z + Math.sin(a) * ring, 0.8, "edge");
  }
  // La Grieta's two slabs (one walks up to them, not through)
  { const [sx, sz] = polar(x, z, 0.68 * Math.PI, 7.9); col.addCircle(sx, sz, 1.25); }
  // the taquilla's palapa, the sign's posts, the palms on the clearing (as they were), the ceibas' trunks
  col.addBox(x + R + 4.8 + 0.3, z + 4.6, 3.4, 2.8, "counter");
  for (const s of [-1, 1]) col.addCircle(x + R + 6.2, z - 2.4 + s * 1.35, 0.15);
  for (const [px, pz, r] of [[x + R + 7.5, z + 7.5, 0.3], [x + R + 3.2, z - 5.5, 0.3], [x + R + 8, z - 7, 1.2], [x + R + 7.5, z + 9.5, 1.5], [x + 2.5, z + R + 1.6, 0.3], [x + 0.5, z - R - 1.8, 0.3], [x - 3.5, z + R + 0.8, 0.3]]) col.addCircle(px, pz, r);
  for (const [px, pz] of ceibas) col.addCircle(px, pz, 0.8);
  // the low jungle: each crown, and the grounds' edge behind them
  for (const [px, pz, size] of crowns(x, z, edge)) col.addCircle(px, pz, size * 0.72, "edge");
  const n0 = z - REACH.ns, s0 = z + REACH.ns, w0 = x - REACH.w;
  // (`edge`: never something to jump onto, however low the jungle on it: ledges.ts)
  col.addBox((w0 + edge) / 2 - 1, n0 - 0.8, edge - w0 + 2, 1.6, "edge");
  col.addBox((w0 + edge) / 2 - 1, s0 + 0.8, edge - w0 + 2, 1.6, "edge");
  col.addBox(w0 - 0.8, (n0 + s0) / 2, 1.6, s0 - n0 + 3, "edge");
}

// ------------------------------------------------------------------------------------------------- what is seen

const LIME = ["#d8cfb8", "#c9bfa6", "#b8ad93", "#e2dac6"], PALE = "#e6dcc3";
const box = (w: number, h: number, d: number, x: number, y: number, z: number, rot = 0) => new THREE.BoxGeometry(w, h, d).rotateY(rot).translate(x, y, z);

/** On the walk from Juárez the learner passes south of the first stones, then turns in towards the cleft. */
function grietaTrace(parts: Part[], x: number, z: number, stones: [number, number][]) {
  type Point = [number, number];
  const exit = ways(x, z)[1].out;
  const run: Point[] = [
    [x + 12.4, z + 13.0], [x + 10.8, z + 12.8], [x + 9.0, z + 12.5],
    [x + 7.4, z + 12.05], [x + 5.6, z + 11.8], [x + 3.7, z + 11.35],
    [x + 1.8, z + 10.95], stones[1], stones[2], [exit.x, exit.z],
  ];
  // Each section has a skewed joint and an uneven shoulder of sage beside the crushed stone.
  const sections = run.map(([px, pz], i) => {
    const prev = run[Math.max(0, i - 1)], next = run[Math.min(run.length - 1, i + 1)];
    const dx = next[0] - prev[0], dz = next[1] - prev[1], length = Math.hypot(dx, dz);
    const tx = dx / length, tz = dz / length, half = [0.58, 0.69, 0.60, 0.65][i % 4];
    const at = (side: number, along: number): Point => [px - tz * side + tx * along, pz + tx * side + tz * along];
    return [at(-half, 0.18), at([-0.23, 0.15, -0.34, -0.08][i % 4], -0.16), at(half, i % 2 ? 0.31 : -0.26)];
  });
  // The visible meadow west of town lies at -0.05 m. Keep these faces on the grass and beneath the stepping stones.
  const patch = (outline: Point[], y: number, color: string) => parts.push([groundFace(outline).translate(0, y, 0), color]);
  for (let i = 1; i < sections.length; i++) {
    const [left, middle, right] = sections[i - 1], [endL, endM, endR] = sections[i];
    patch([left, middle, endM, endL], -0.038, i % 3 === 0 ? "#b5b28a" : "#9ea375");
    patch([middle, right, endR, endM], -0.038, i % 3 === 1 ? "#bcb68e" : "#c9be98");
  }
  // Little pockets of leaf litter at the outer elbow. Both sit away from the guide dots and glyph stone.
  for (const [px, pz] of [run[3], run[7]]) {
    for (const [dx, dz, tip] of [[-0.30, 1.0, 0.13], [-0.05, 1.22, -0.11], [0.18, 0.94, 0.04], [0.36, 1.18, -0.16]]) {
      const ax = px + dx, az = pz + dz;
      patch([[ax - 0.19, az - tip], [ax, az + 0.085], [ax + 0.19, az + tip], [ax + 0.04, az - 0.075]], -0.037, "#997052");
    }
  }
  // Shade beneath the palm clump at the clearing and the ceiba outside the final bend.
  for (const [px, pz] of [[x + R + 7.5, z + 9.5], [x - 11, z + 15]]) {
    patch([[px - 1.7, pz], [px - 1.2, pz - 0.8], [px + 0.5, pz - 1.1], [px + 1.6, pz - 0.5],
      [px + 1.9, pz + 0.2], [px + 0.7, pz + 0.8], [px - 0.6, pz + 0.72]], -0.041, "#657857");
  }
}

/** The grounds' own shapes, for the town's merged mesh the cenote is in: the beach's sand, the rock steps, the stair
 *  and the ledge of El Salto with its two posts and rope, La Grieta's slabs and its dark, the sinkhole's ring of
 *  stones and roots, the trail's stones, a small glyph stone at each way in (their glyphs are lit in `groundsGlow`). */
export function groundsShapes(parts: Part[], x: number, z: number) {
  const r = rand(4412), lime = () => LIME[Math.floor(r() * LIME.length)];
  const stone = (px: number, py: number, pz: number, s: number, sy: number, colour = lime()) => parts.push([new THREE.IcosahedronGeometry(s / 2, 0).scale(1 + r() * 0.3, sy, 1 + r() * 0.3).rotateY(r() * Math.PI).translate(px, py, pz), colour]);
  for (const g of GAPS) {
    if (g.id === "playa") {
      // pale sand fanning down to the water (the ground is level: it lies on it, and the water over its last hand)
      const N = 9, rings = [9.1, 8.0, 7.0, 6.2], pos: number[] = [];
      const at = (i: number, k: number): [number, number, number] => { const a = g.a - g.half - 0.04 + (2 * (g.half + 0.04) * i) / N, d = rings[k] + (k === 0 ? Math.sin(i * 1.7) * 0.4 : 0); return [x + Math.cos(a) * d, 0.036, z + Math.sin(a) * d]; };
      for (let k = 0; k + 1 < rings.length; k++) for (let i = 0; i < N; i++) pos.push(...at(i, k), ...at(i + 1, k + 1), ...at(i + 1, k), ...at(i, k), ...at(i, k + 1), ...at(i + 1, k + 1));
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      geo.computeVertexNormals();
      parts.push([geo, "#eadfbf"]);
      // a few shells and a starfish of stone on it
      for (let i = 0; i < 5; i++) { const [px, pz] = polar(x, z, g.a + (r() - 0.5) * 0.5, 7 + r() * 1.6); parts.push([new THREE.SphereGeometry(0.1, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.5, 1.2).rotateY(r() * 3).translate(px, 0.04, pz), ["#fff1e0", "#ffd9c7", "#f6e7c9"][i % 3]]); }
    } else {
      // three wide steps of flat stone down to the water, and one more standing in it
      for (let k = 0; k < 4; k++) {
        const d = [8.7, 7.85, 7.0, 6.05][k], w = 4.2 - k * 0.45, [sx, sz] = polar(x, z, g.a, d), top = [0.2, 0.14, 0.09, 0.075][k];
        parts.push([box(0.82, top, w, sx, top / 2, sz, -g.a), k % 2 ? LIME[1] : LIME[3]]);
      }
    }
    for (const s of [-1, 1]) { const [px, pz] = polar(x, z, g.a + s * (g.half + 0.05), 7.2); stone(px, 0.3, pz, 1.3, 0.6); }
  }
  // El Salto: ten steps of stone up the cliff's back, the ledge, two posts and a rope at its sides, a cairn at its foot
  {
    const { y, half, top0, top1, foot } = SALTO, n = 10, run = (foot - top1) / n;
    for (let i = 0; i < n; i++) parts.push([box(run + 0.06, (y * (i + 1)) / n, half * 2 - 0.2, x - foot + run * (i + 0.5), (y * (i + 1)) / n / 2, z), i % 2 ? LIME[1] : LIME[2]]);
    parts.push([box(top1 - top0 + 0.3, 0.5, half * 2 + 0.3, x - (top1 + top0) / 2, y - 0.25, z), LIME[0]]);
    parts.push([box(top1 - top0 - 0.4, 0.06, half * 2 - 0.5, x - (top1 + top0) / 2, y + 0.005, z), PALE]);
    for (const s of [-1, 1]) {
      for (const px of [x - top1 + 0.2, x - top0 - 0.5]) parts.push([new THREE.CylinderGeometry(0.06, 0.07, 1.0, 6).translate(px, y + 0.5, z + s * (half + 0.02)), "#6b4f36"]);
      parts.push([box(top1 - top0 - 0.7, 0.04, 0.04, x - (top1 + top0) / 2 - 0.15, y + 0.9, z + s * (half + 0.02)), "#c9b48a"]);
      // the stair's sides: rough stones, so it reads as part of the rock
      for (let i = 0; i < 5; i++) stone(x - foot + 0.6 + i * 1.15, (y * (i + 0.6)) / 5 * 0.55, z + s * (half + 0.55), 1.3, 0.9);
    }
    for (let i = 0; i < 3; i++) stone(x - foot - 0.9, 0.2 + i * 0.3, z + half + 0.9, 0.7 - i * 0.18, 0.7);
  }
  // La Grieta: two slabs leaning together against the cliff, the dark between them, ferns at its foot
  {
    const a = 0.68 * Math.PI, [sx, sz] = polar(x, z, a, 8.15), face = Math.PI / 2 - a;
    for (const s of [-1, 1]) {
      const g = new THREE.BoxGeometry(1.5, 4.6, 1.3).rotateZ(s * 0.3).translate(s * 1.02, 2.1, 0).rotateY(face).translate(sx, 0, sz);
      parts.push([g, s > 0 ? LIME[1] : LIME[2]]);
      const [bx, bz] = polar(x, z, a + s * 0.27, 8.3); stone(bx, 0.55, bz, 1.9, 0.75);
    }
    parts.push([new THREE.BoxGeometry(1.5, 0.9, 1.2).translate(0, 4.3, 0).rotateY(face).translate(sx, 0, sz), LIME[0]]);
    const dark = new THREE.BufferGeometry();
    dark.setAttribute("position", new THREE.Float32BufferAttribute([-0.85, 0, 0.62, 0.85, 0, 0.62, 0, 3.5, 0.5], 3));
    dark.computeVertexNormals();
    parts.push([dark.rotateY(face).translate(sx, 0.02, sz), "#0c1a1c"]);
    for (let i = 0; i < 4; i++) { const [fx, fz] = polar(x, z, a + (i - 1.5) * 0.11, 9.2 + (i % 2) * 0.3); for (let k = 0; k < 4; k++) parts.push([new THREE.ConeGeometry(0.08, 0.7, 3).translate(0, 0.35, 0).rotateZ(0.6).rotateY(k * 1.6 + i).translate(fx, 0, fz), ["#4f9a3e", "#3f7d3a"][k % 2]]); }
  }
  // El Ojo: the dark of the hole, a ring of stones round it, roots reaching in
  {
    const o = ways(x, z)[2];
    parts.push([new THREE.CircleGeometry(OJO.r + 0.1, 20).rotateX(-Math.PI / 2).translate(o.x, 0.03, o.z), "#07191c"]);
    for (let i = 0; i < 13; i++) { const a = (i / 13) * Math.PI * 2 + r() * 0.2; stone(o.x + Math.cos(a) * (OJO.r + 0.35), 0.1, o.z + Math.sin(a) * (OJO.r + 0.35), 0.75 + r() * 0.4, 0.45); }
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + 0.4, len = 2.2 + r() * 1.6; parts.push([new THREE.CylinderGeometry(0.05, 0.13, len, 5).rotateZ(Math.PI / 2).translate(len / 2 + OJO.r - 0.5, 0.07, 0).rotateY(a).translate(o.x, 0, o.z), ["#6b5040", "#5a4232"][i % 2]]); }
  }
  // the trail: pale flat stones a step apart
  const pts = trail(x, z);
  grietaTrace(parts, x, z, pts);
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(L / 1.25));
    for (let k = 0; k < n; k++) {
      const t = k / n, px = ax + (bx - ax) * t + (r() - 0.5) * 0.3, pz = az + (bz - az) * t + (r() - 0.5) * 0.3;
      parts.push([new THREE.CylinderGeometry(0.34 + r() * 0.12, 0.38 + r() * 0.12, 0.06, 7).translate(px, 0.035, pz), r() < 0.5 ? PALE : LIME[3]]);
    }
  }
  // a small glyph stone at each way in (and at the foot of El Salto's stair)
  for (const m of marks(x, z)) {
    parts.push([box(0.62, 1.15, 0.3, m.x, 0.58, m.z, m.rot), LIME[1]]);
    parts.push([box(0.78, 0.16, 0.42, m.x, 0.08, m.z, m.rot), LIME[2]]);
    parts.push([box(0.5, 0.5, 0.03, m.x + Math.sin(m.rot) * 0.15, 0.72, m.z + Math.cos(m.rot) * 0.15, m.rot), "#39403c"]);
  }
}

/** The small glyph stones: where each stands and which way its glyph faces (radians, 0: +z). */
export function marks(x: number, z: number): { x: number; z: number; rot: number }[] {
  const out: { x: number; z: number; rot: number }[] = [];
  const add = (a: number, d: number, towards: [number, number]) => { const [px, pz] = polar(x, z, a * Math.PI, d); out.push({ x: px, z: pz, rot: Math.atan2(towards[0] - px, towards[1] - pz) }); };
  const [g, , o] = [ways(x, z)[1], 0, ways(x, z)[2]];
  add(0.61, 9.4, polar(x, z, 0.45 * Math.PI, 13));     // beside La Grieta, facing whoever comes from the clearing
  add(1.37, 12.2, [o.x + 4, o.z + 6]);                  // by El Ojo
  add(0.955, 14.4, polar(x, z, 0.8 * Math.PI, 18));     // at the foot of El Salto's stair
  void g;
  return out;
}

const GLYPHS = (() => {
  let tex: THREE.CanvasTexture | null = null;
  return () => {
    if (tex) return tex;
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const q = c.getContext("2d")!;
    q.strokeStyle = "#fff"; q.fillStyle = "#fff"; q.lineWidth = 8; q.lineJoin = "round"; q.lineCap = "round";
    q.beginPath(); q.roundRect(14, 14, 100, 100, 26); q.stroke();
    q.lineWidth = 7; q.beginPath(); q.roundRect(32, 30, 44, 48, 16); q.stroke();
    q.beginPath(); q.arc(54, 50, 7, 0, Math.PI * 2); q.fill();
    q.beginPath(); q.moveTo(38, 66); q.quadraticCurveTo(54, 74, 70, 66); q.stroke();
    for (let k = 0; k < 3; k++) { q.beginPath(); q.arc(90, 38 + k * 16, 5, 0, Math.PI * 2); q.fill(); }
    q.beginPath(); q.moveTo(36, 96); q.lineTo(96, 96); q.stroke();
    tex = new THREE.CanvasTexture(c);
    return tex;
  };
})();

/** What moves and glows at the ways in (three small meshes in the town's group, out of the picture beyond 80 m): a
 *  glow in the cave's mouth, in the cleft and up out of the sinkhole; fireflies at each; the glyph stones' glyphs. */
export function groundsGlow(x: number, z: number): THREE.Group {
  const g = new THREE.Group(), u = { uTime: { value: 0 } };
  g.name = "gruta-lure";
  const W = ways(x, z), mouth = { x: x - R + 0.56, z };
  // ---- the glows: a half round in the cave's mouth (as before), a narrow one in the cleft, a disc in the sinkhole
  const pos: number[] = [], uv: number[] = [];
  const quad = (c: [number, number, number], ux: [number, number, number], uy: [number, number, number], w: number, h: number) => {
    const P = (a: number, b: number) => [c[0] + ux[0] * a * w + uy[0] * b * h, c[1] + ux[1] * a * w + uy[1] * b * h, c[2] + ux[2] * a * w + uy[2] * b * h];
    pos.push(...P(-1, 0), ...P(1, 0), ...P(1, 1), ...P(-1, 0), ...P(1, 1), ...P(-1, 1));
    uv.push(-1, 0, 1, 0, 1, 1, -1, 0, 1, 1, -1, 1);
  };
  quad([mouth.x, 0.05, mouth.z], [0, 0, 1], [0, 1, 0], 2.0, 1.75);
  { const a = 0.68 * Math.PI, [sx, sz] = polar(x, z, a, 8.9); quad([sx, 0.05, sz], [-Math.sin(a), 0, Math.cos(a)], [0, 1, 0], 0.75, 3.3); }
  for (const sgn of [1, -1]) quad([W[2].x, 0.06, W[2].z], [1, 0, 0], [0, 0, sgn], 1.5, 1.5);
  const gg = new THREE.BufferGeometry();
  gg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  gg.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  const glow = new THREE.Mesh(gg, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: u, side: THREE.DoubleSide,
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `varying vec2 vUv; uniform float uTime; void main(){
      float d = length(vec2(vUv.x, vUv.y * 0.92));
      float a = smoothstep(1.0, 0.05, d) * (0.95 + 0.25 * sin(uTime * 1.3 + vUv.y * 5.0));
      float ray = 0.5 + 0.5 * sin(vUv.x * 14.0 + sin(uTime * 0.7) * 1.5);
      a *= 0.75 + 0.5 * ray * smoothstep(1.0, 0.0, vUv.y);
      gl_FragColor = vec4(vec3(0.25, 1.0, 0.9) * a, 1.0); }`,
  }));
  glow.frustumCulled = false;
  // ---- fireflies: most at the mouth, a dozen at the cleft, a column of them rising out of the sinkhole
  const fp: number[] = [], fs: number[] = [];
  const fly = (px: number, py: number, pz: number, rise: number) => { fp.push(px, py, pz); fs.push(Math.random() * 6.28, rise); };
  for (let i = 0; i < 22; i++) fly(mouth.x + 0.4 + Math.random() * 3.4, 0.3 + Math.random() * 1.7, mouth.z + (Math.random() - 0.5) * 3.6, 0);
  for (let i = 0; i < 14; i++) { const [px, pz] = polar(x, z, 0.68 * Math.PI + (Math.random() - 0.5) * 0.24, 8.9 + Math.random() * 2.4); fly(px, 0.4 + Math.random() * 2.2, pz, 0); }
  for (let i = 0; i < 16; i++) { const a = Math.random() * 6.28, d = Math.random() * 1.3; fly(W[2].x + Math.cos(a) * d, 0.2, W[2].z + Math.sin(a) * d, 1); }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute("position", new THREE.Float32BufferAttribute(fp, 3));
  pg.setAttribute("aSeed", new THREE.Float32BufferAttribute(fs, 2));
  const flies = new THREE.Points(pg, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: u,
    vertexShader: `attribute vec2 aSeed; uniform float uTime; varying float vA; void main(){ float t = uTime * 0.7 + aSeed.x;
      vec3 p = position + vec3(sin(t) * 0.6, sin(t * 1.3 + 1.0) * 0.3, cos(t * 0.8) * 0.6);
      // (out of the sinkhole they rise, a few metres, and come round again)
      float f = fract(uTime * 0.11 + aSeed.x);
      p.y += aSeed.y * f * 4.2;
      vA = 0.5 + 0.5 * sin(t * 2.3 + aSeed.x * 4.0); vA *= vA * mix(1.0, sin(f * 3.1416), aSeed.y);
      vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = min(210.0 / max(1.0, -mv.z), 48.0); }`,
    fragmentShader: "varying float vA; void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; float s = max(0.0, 1.0 - d); gl_FragColor = vec4(vec3(0.95, 1.0, 0.55) * s * s * vA, 1.0); }",
  }));
  flies.frustumCulled = false;
  // ---- the glyph stones' glyphs: pale blue, breathing, like the ones below
  const mp: number[] = [], mu: number[] = [];
  for (const m of marks(x, z)) {
    const cx = Math.cos(m.rot), sx = Math.sin(m.rot), ox = m.x + sx * 0.17, oz = m.z + cx * 0.17, h = 0.23;
    const P = (a: number, b: number) => [ox + cx * a * h, 0.72 + b * h, oz - sx * a * h];
    mp.push(...P(-1, -1), ...P(1, -1), ...P(1, 1), ...P(-1, -1), ...P(1, 1), ...P(-1, 1));
    mu.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1);
  }
  const mg = new THREE.BufferGeometry();
  mg.setAttribute("position", new THREE.Float32BufferAttribute(mp, 3));
  mg.setAttribute("uv", new THREE.Float32BufferAttribute(mu, 2));
  const glyphs = new THREE.Mesh(mg, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { ...u, uMap: { value: GLYPHS() } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: "varying vec2 vUv; uniform float uTime; uniform sampler2D uMap; void main(){ float a = texture2D(uMap, vUv).a; gl_FragColor = vec4(vec3(0.42, 0.95, 1.0) * a * (0.8 + 0.3 * sin(uTime * 1.5)), 1.0); }",
  }));
  glyphs.frustumCulled = false;
  g.add(glow, flies, glyphs);
  g.userData.tick = (t: number, px: number, pz: number) => { u.uTime.value = t; g.visible = (px - x) ** 2 + (pz - z) ** 2 < 80 * 80; };
  // (nothing here stands in the camera's way or is jumped onto)
  g.userData.thin = true;
  return g;
}
