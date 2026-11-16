// Dev only (not part of the build): surfaces that flicker. Two faces turned the same way in the same plane, overlapping
// (a sign and the map beside it hung at the same distance off a wall, two boxes sharing a face), are drawn in turn as
// the camera moves: the picture shimmers between them ("z-fighting"). This finds every such pair in a group: each
// visible triangle's plane, pairs of triangles in the same plane (within `tol` m) facing the same way, and how much of
// them overlaps. Run it on a room or the town from the browser console or a probe:
// `(await import("/src/dev/zfightAudit.ts")).zfightAudit(group)`; tests/browser/zfight.mjs runs it on every room of
// a town (docs/SIGNS.md).
import * as THREE from "three";

export interface ZFight {
  /** The two meshes (their names; one name twice: two parts of one merged mesh). */
  a: string;
  b: string;
  /** Square metres where they overlap. */
  area: number;
  /** Where (a point of the overlap) and which way the faces look. */
  at: [number, number, number];
  normal: [number, number, number];
  /** The overlapping triangles' extents (min x, y, z, max x, y, z), the first mesh's and the second's. */
  boxA?: number[];
  boxB?: number[];
}

interface Tri { mesh: string; n: THREE.Vector3; d: number; p: THREE.Vector3[]; key: string; pic: boolean }

const r3 = (v: number) => Math.round(v * 1000) / 1000;

/** Every pair of same-facing coplanar triangles that overlap by more than `minArea` m², merged by mesh pair and plane. */
/** `pictures` (default): only pairs where one face shows a picture (a sign, a board, a poster, the map): the merged rooms
 *  have many coincident faces nobody sees (a floor's underside, the insides of walls). */
export function zfightAudit(root: THREE.Object3D, opts: { tol?: number; minArea?: number; skip?: (o: THREE.Object3D) => boolean; pictures?: boolean } = {}): ZFight[] {
  const tol = opts.tol ?? 0.004, minArea = opts.minArea ?? 0.0004, pictures = opts.pictures ?? true;
  root.updateMatrixWorld(true);
  const tris: Tri[] = [];
  const m4 = new THREE.Matrix4(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || opts.skip?.(o)) return;
    for (let p: THREE.Object3D | null = o; p; p = p.parent) if (!p.visible) return;
    const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.Material;
    if (!mat || (mat.transparent && mat.opacity < 0.5) || mat.colorWrite === false) return;
    const g = mesh.geometry as THREE.BufferGeometry, pos = g.attributes.position as THREE.BufferAttribute;
    if (!pos) return;
    const idx = g.index;
    const inst = (mesh as THREE.InstancedMesh).isInstancedMesh ? (mesh as THREE.InstancedMesh) : null;
    const count = inst ? inst.count : 1;
    const n = idx ? idx.count : pos.count;
    for (let k = 0; k < count; k++) {
      if (inst) { inst.getMatrixAt(k, m4); m4.premultiply(mesh.matrixWorld); } else m4.copy(mesh.matrixWorld);
      for (let i = 0; i + 2 < n; i += 3) {
        const i0 = idx ? idx.getX(i) : i, i1 = idx ? idx.getX(i + 1) : i + 1, i2 = idx ? idx.getX(i + 2) : i + 2;
        a.fromBufferAttribute(pos, i0).applyMatrix4(m4); b.fromBufferAttribute(pos, i1).applyMatrix4(m4); c.fromBufferAttribute(pos, i2).applyMatrix4(m4);
        const nn = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a));
        const len = nn.length();
        if (len < 1e-6) continue;
        nn.divideScalar(len);
        const name = (mesh.name || mesh.type) + (inst ? `#${k}` : "");
        tris.push({ pic: !!(mat as THREE.MeshBasicMaterial).map, mesh: name, n: nn, d: nn.dot(a), p: [a.clone(), b.clone(), c.clone()], key: `${Math.round(nn.x * 50)},${Math.round(nn.y * 50)},${Math.round(nn.z * 50)}` });
      }
    }
  });
  // by facing, then by distance along it: a sweep finds the triangles in (nearly) the same plane
  const groups = new Map<string, Tri[]>();
  for (const t of tris) { if (!groups.has(t.key)) groups.set(t.key, []); groups.get(t.key)!.push(t); }
  const found = new Map<string, ZFight>();
  for (const list of groups.values()) {
    list.sort((x, y) => x.d - y.d);
    for (let i = 0; i < list.length; i++) {
      const A = list[i];
      // a 2D frame in A's plane
      const u = new THREE.Vector3(1, 0, 0);
      if (Math.abs(A.n.x) > 0.9) u.set(0, 1, 0);
      u.sub(A.n.clone().multiplyScalar(u.dot(A.n))).normalize();
      const v = new THREE.Vector3().crossVectors(A.n, u);
      const flat = (p: THREE.Vector3): [number, number] => [p.dot(u), p.dot(v)];
      const pa = A.p.map(flat);
      const box = (q: [number, number][]) => [Math.min(...q.map((x) => x[0])), Math.min(...q.map((x) => x[1])), Math.max(...q.map((x) => x[0])), Math.max(...q.map((x) => x[1]))];
      const ba = box(pa);
      for (let j = i + 1; j < list.length && list[j].d - A.d < tol; j++) {
        const B = list[j];
        if (A.n.dot(B.n) < 0.999 || (pictures && !A.pic && !B.pic)) continue;
        const pb = B.p.map(flat), bb = box(pb);
        if (bb[0] >= ba[2] || bb[2] <= ba[0] || bb[1] >= ba[3] || bb[3] <= ba[1]) continue;
        const area = overlap(pa, pb);
        if (area < 1e-6) continue;
        const [m1, m2] = [A.mesh, B.mesh].sort();
        const k = `${m1}|${m2}|${r3(A.n.x)},${r3(A.n.y)},${r3(A.n.z)}|${Math.round(A.d * 50)}`;
        const f = found.get(k) ?? { a: m1, b: m2, area: 0, at: A.p[0].toArray().map(r3) as [number, number, number], normal: A.n.toArray().map(r3) as [number, number, number] };
        f.area += area;
        const grow = (bx: number[] | undefined, t: Tri) => { const o = bx ?? [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity]; for (const q of t.p) { o[0] = Math.min(o[0], r3(q.x)); o[1] = Math.min(o[1], r3(q.y)); o[2] = Math.min(o[2], r3(q.z)); o[3] = Math.max(o[3], r3(q.x)); o[4] = Math.max(o[4], r3(q.y)); o[5] = Math.max(o[5], r3(q.z)); } return o; };
        const [ta, tb] = A.mesh === m1 ? [A, B] : [B, A];
        f.boxA = grow(f.boxA, ta); f.boxB = grow(f.boxB, tb);
        found.set(k, f);
      }
    }
  }
  return [...found.values()].filter((f) => f.area > minArea).map((f) => ({ ...f, area: +f.area.toFixed(4) })).sort((x, y) => y.area - x.area);
}

/** The area two triangles in a plane have in common (convex clipping). */
function overlap(a: [number, number][], b: [number, number][]) {
  const ccw = (q: [number, number][]) => { const s = (q[1][0] - q[0][0]) * (q[2][1] - q[0][1]) - (q[1][1] - q[0][1]) * (q[2][0] - q[0][0]); return s < 0 ? [q[0], q[2], q[1]] : q; };
  let poly: [number, number][] = ccw(a);
  const clip = ccw(b);
  for (let e = 0; e < 3 && poly.length; e++) {
    const [p, q] = [clip[e], clip[(e + 1) % 3]];
    const side = (s: [number, number]) => (q[0] - p[0]) * (s[1] - p[1]) - (q[1] - p[1]) * (s[0] - p[0]);
    const out: [number, number][] = [];
    for (let i = 0; i < poly.length; i++) {
      const s = poly[i], t = poly[(i + 1) % poly.length], fs = side(s), ft = side(t);
      if (fs >= 0) out.push(s);
      if ((fs >= 0) !== (ft >= 0)) { const k = fs / (fs - ft); out.push([s[0] + (t[0] - s[0]) * k, s[1] + (t[1] - s[1]) * k]); }
    }
    poly = out;
  }
  let area = 0;
  for (let i = 0; i < poly.length; i++) { const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % poly.length]; area += x1 * y2 - x2 * y1; }
  return Math.abs(area) / 2;
}
