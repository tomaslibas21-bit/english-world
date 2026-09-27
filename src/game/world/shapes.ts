// Geometry helpers for the trial world styles (see style.ts): bevelled boxes, UV projection,
// soft blob clusters (fluffy trees, bushes, clouds).
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

type V3 = [number, number, number];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a: V3): V3 => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

/** A box (centred on the origin) with chamfered edges and corners: 26 facets, 132 vertices,
 *  non-indexed. With `smooth` the bevel's normals blend from one face to the next, so the edge
 *  reads as rounded; otherwise it is a flat facet that catches the light. */
export function chamferBox(w: number, h: number, d: number, r: number, smooth = true): THREE.BufferGeometry {
  const H: V3 = [w / 2, h / 2, d / 2];
  const A: V3 = [Math.max(H[0] - r, 1e-4), Math.max(H[1] - r, 1e-4), Math.max(H[2] - r, 1e-4)];
  const size: V3 = [w, h, d];
  const pos: number[] = [], nor: number[] = [], uvs: number[] = [];
  const vert = (p: V3, n: V3) => {
    pos.push(p[0], p[1], p[2]); nor.push(n[0], n[1], n[2]);
    const ax = Math.abs(n[0]) >= Math.abs(n[1]) && Math.abs(n[0]) >= Math.abs(n[2]) ? 0 : Math.abs(n[1]) >= Math.abs(n[2]) ? 1 : 2;
    const [u, v] = ax === 0 ? [2, 1] : ax === 1 ? [0, 2] : [0, 1];
    uvs.push(p[u] / size[u] + 0.5, p[v] / size[v] + 0.5);
  };
  const tri = (p: V3[], n: V3[], out: V3) => {
    if (dot(cross(sub(p[1], p[0]), sub(p[2], p[0])), out) >= 0) { vert(p[0], n[0]); vert(p[1], n[1]); vert(p[2], n[2]); }
    else { vert(p[0], n[0]); vert(p[2], n[2]); vert(p[1], n[1]); }
  };
  const quad = (p: V3[], n: V3[], out: V3) => { tri([p[0], p[1], p[2]], [n[0], n[1], n[2]], out); tri([p[0], p[2], p[3]], [n[0], n[2], n[3]], out); };
  const unit = (a: number, s: number): V3 => { const v: V3 = [0, 0, 0]; v[a] = s; return v; };
  // the six faces
  for (let a = 0; a < 3; a++) for (const s of [-1, 1]) {
    const b = (a + 1) % 3, c = (a + 2) % 3;
    const n = unit(a, s);
    const p = (sb: number, sc: number): V3 => { const v: V3 = [0, 0, 0]; v[a] = s * H[a]; v[b] = sb * A[b]; v[c] = sc * A[c]; return v; };
    quad([p(-1, -1), p(1, -1), p(1, 1), p(-1, 1)], [n, n, n, n], n);
  }
  // twelve edge bevels (edge along axis c between faces a and b)
  for (let a = 0; a < 3; a++) {
    const b = (a + 1) % 3, c = (a + 2) % 3;
    for (const sa of [-1, 1]) for (const sb of [-1, 1]) {
      const nA = unit(a, sa), nB = unit(b, sb), nF = norm([nA[0] + nB[0], nA[1] + nB[1], nA[2] + nB[2]]);
      const pA = (sc: number): V3 => { const v: V3 = [0, 0, 0]; v[a] = sa * H[a]; v[b] = sb * A[b]; v[c] = sc * A[c]; return v; };
      const pB = (sc: number): V3 => { const v: V3 = [0, 0, 0]; v[a] = sa * A[a]; v[b] = sb * H[b]; v[c] = sc * A[c]; return v; };
      quad([pA(-1), pA(1), pB(1), pB(-1)], smooth ? [nA, nA, nB, nB] : [nF, nF, nF, nF], nF);
    }
  }
  // eight corners
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    const s: V3 = [sx, sy, sz];
    const pts = [0, 1, 2].map((a) => [0, 1, 2].map((k) => s[k] * (k === a ? H[k] : A[k])) as V3);
    const nF = norm(s);
    tri(pts, smooth ? [unit(0, sx), unit(1, sy), unit(2, sz)] : [nF, nF, nF], nF);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  return g;
}

/** World-space box projection of UVs (1 texture repeat per `scale` metres). Walls get v = height. */
export function boxProjectUV(g: THREE.BufferGeometry, scale: number) {
  const p = g.attributes.position, n = g.attributes.normal;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    let u: number, v: number;
    if (ay >= ax && ay >= az) {
      // floors and roofs: rows run along the longer horizontal direction of the slope
      if (ax > az) { u = p.getZ(i); v = p.getX(i); } else { u = p.getX(i); v = p.getZ(i); }
    } else if (ax >= az) { u = p.getZ(i); v = p.getY(i); }
    else { u = p.getX(i); v = p.getY(i); }
    uv[i * 2] = u / scale; uv[i * 2 + 1] = v / scale;
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
}

/** Several spheres merged into one soft blob (indexed). Each part: [x, y, z, radius, squashY?]. */
export function blobCluster(parts: [number, number, number, number, number?][], wSeg = 14, hSeg = 10): THREE.BufferGeometry {
  const geos = parts.map(([x, y, z, r, sy]) => {
    const g = new THREE.SphereGeometry(r, wSeg, hSeg);
    if (sy) g.scale(1, sy, 1);
    g.translate(x, y, z);
    g.deleteAttribute("uv");
    return g;
  });
  return mergeGeometries(geos, false)!;
}

/** Noise-displaced icosphere (a lumpy natural canopy / bush). Darker towards the bottom (fake AO)
 *  through a vertex colour attribute. */
export function lumpySphere(r: number, detail: number, seed: number, amp = 0.18, shade = 0.55): THREE.BufferGeometry {
  let g: THREE.BufferGeometry = new THREE.IcosahedronGeometry(r, detail);
  g.deleteAttribute("uv");
  g.deleteAttribute("normal");
  // weld (Icosahedron is non-indexed) so displacement keeps the surface closed
  g = weld(g);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = v.clone().normalize();
    const k = Math.sin(n.x * 5.1 + seed) * Math.sin(n.y * 4.3 + seed * 1.7) * Math.sin(n.z * 4.7 + seed * 0.7)
      + 0.5 * Math.sin(n.x * 11.3 + seed * 2.3) * Math.sin(n.z * 9.1 - seed);
    v.addScaledVector(n, k * amp * r);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  const col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const t = THREE.MathUtils.clamp((p.getY(i) / r + 1) / 2, 0, 1);
    const c = shade + (1 - shade) * Math.pow(t, 0.8);
    col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = c;
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return g;
}

/** Merge vertices with the same position (positions only). */
export function weld(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const p = g.attributes.position;
  const map = new Map<string, number>();
  const verts: number[] = [];
  const index: number[] = [];
  for (let i = 0; i < p.count; i++) {
    const k = Math.round(p.getX(i) * 1e4) + "," + Math.round(p.getY(i) * 1e4) + "," + Math.round(p.getZ(i) * 1e4);
    let id = map.get(k);
    if (id === undefined) { id = verts.length / 3; verts.push(p.getX(i), p.getY(i), p.getZ(i)); map.set(k, id); }
    index.push(id);
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  out.setIndex(index);
  return out;
}

/** Paint a whole geometry one colour (adds/overwrites the `color` attribute), multiplied by any
 *  existing shade in it. */
export function paint(g: THREE.BufferGeometry, color: THREE.Color): THREE.BufferGeometry {
  const n = g.attributes.position.count;
  const old = g.getAttribute("color");
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const s = old ? old.getX(i) : 1;
    arr[i * 3] = color.r * s; arr[i * 3 + 1] = color.g * s; arr[i * 3 + 2] = color.b * s;
  }
  g.setAttribute("color", new THREE.BufferAttribute(arr, 3));
  return g;
}
