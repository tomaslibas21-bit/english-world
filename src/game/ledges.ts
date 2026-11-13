// What the player can jump onto or over, from the place's own geometry. The colliders are a ground plan (boxes and
// circles, no heights): a bench stops a walker like a wall does. Here each small collider's footprint is sampled in
// 12.5 cm cells from the meshes that stand in it (the top of whatever starts below 1.3 m: a seat, a planter's rim, a low
// wall; roofs, awnings and crowns over it don't count). A collider that is mostly low (tops up to LAND, about knee or
// bench height) is split, for the player only, into pieces with a height: the low ones can be landed on and walked off,
// the rest of it (a bench's back, a pillar on a wall) stays a wall. Everything else is left exactly as it is: buildings,
// counters, tables, cars, the invisible bounds and the sea have no low cells or too few; people are colliders of their
// own with nothing built in them; café tables and what the camera's field holds solid (a gazebo, a kiosco) are left out
// by name. Way-finding, the passers-by and the camera keep the original ground plan.
import * as THREE from "three";
import type { Colliders } from "./world/util";
import { triOverlapsRect } from "./occlusion";

/** The highest top one can land on (m): about knee or bench height. */
export const LAND = 0.62;
/** A rise this small is walked up without a jump (m). */
export const STEP = 0.12;
const CELL = 0.125;
/** Triangles that start above this (m) are over the thing, not part of it; tops under FLOOR are the ground's own. */
const LOW = 1.3, FLOOR = 0.1;
/** How much of a cell's side a triangle may touch without counting (a fraction of the cell). */
const EDGE = 0.1;
/** How far past a collider's edge what is built in it is followed (m): a seat wider than its collider. */
const GROW = 0.5;

export interface Piece { minX: number; maxX: number; minZ: number; maxZ: number; top: number }
type Box = { minX: number; maxX: number; minZ: number; maxZ: number; tag?: string; split?: boolean };
type Circle = { x: number; z: number; r: number; split?: boolean };

export interface LedgeOptions {
  /** Leave this object (and what it holds) out: what moves. */
  skip?: (o: THREE.Object3D) => boolean;
  /** Never split a collider that holds one of these points (café tables' seats). */
  keep?: [number, number][];
  /** Never split a collider over a spot this says is solid and tall (the camera's field: a gazebo, a kiosco). */
  tall?: (x: number, z: number) => boolean;
}

export class Ledges {
  pieces: Piece[] = [];
  private buckets = new Map<number, Piece[]>();
  private static readonly B = 4;

  /** The pieces around (x, z). */
  private near(x: number, z: number): Piece[] {
    return this.buckets.get(Math.floor(x / Ledges.B) * 4096 + Math.floor(z / Ledges.B)) ?? NONE;
  }

  add(p: Piece) {
    this.pieces.push(p);
    const B = Ledges.B;
    // (in every bucket within reach of it, so one look-up finds whatever the player can touch)
    for (let i = Math.floor((p.minX - 1) / B); i <= Math.floor((p.maxX + 1) / B); i++) for (let k = Math.floor((p.minZ - 1) / B); k <= Math.floor((p.maxZ + 1) / B); k++) {
      const key = i * 4096 + k;
      let l = this.buckets.get(key);
      if (!l) this.buckets.set(key, (l = []));
      l.push(p);
    }
  }

  /** Pushes a circle of radius `r` whose feet are `feet` m up out of every piece that stands higher than they can step
   *  (in the air: than their feet). */
  resolve(p: { x: number; z: number }, r: number, feet: number, air: boolean) {
    const reach = feet + (air ? 0.02 : STEP);
    for (let iter = 0; iter < 2; iter++) for (const b of this.near(p.x, p.z)) {
      if (b.top <= reach) continue;
      const cx = Math.max(b.minX, Math.min(p.x, b.maxX)), cz = Math.max(b.minZ, Math.min(p.z, b.maxZ));
      const dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 > 1e-9) { const d = Math.sqrt(d2); p.x = cx + (dx / d) * r; p.z = cz + (dz / d) * r; }
      else {
        const left = p.x - b.minX, right = b.maxX - p.x, top = p.z - b.minZ, bottom = b.maxZ - p.z, m = Math.min(left, right, top, bottom);
        if (m === left) p.x = b.minX - r; else if (m === right) p.x = b.maxX + r; else if (m === top) p.z = b.minZ - r; else p.z = b.maxZ + r;
      }
    }
  }

  /** How high the thing under (x, z) stands that feet at `feet` m are on or over (0: the ground). */
  support(x: number, z: number, feet: number, air: boolean) {
    const reach = feet + (air ? 0.02 : STEP), m = 0.2;
    let top = 0;
    for (const b of this.near(x, z)) {
      if (b.top > reach || b.top <= top) continue;
      if (x > b.minX - m && x < b.maxX + m && z > b.minZ - m && z < b.maxZ + m) top = b.top;
    }
    return top;
  }

  /** Reads the heights of `col`'s small colliders from the meshes under `root` and splits the low ones (marks them
   *  `split`: Colliders.resolve leaves those to this). In slices of a few milliseconds when `slice` is given (it is
   *  called with the rest of the work), so a town is walkable before this is done; until then nothing can be climbed. */
  static build(root: THREE.Object3D, col: Colliders, opts: LedgeOptions = {}, slice?: (next: () => void) => void): Ledges {
    const led = new Ledges();
    const boxes = (col.boxes as Box[]).filter((b) => b.tag !== "building" && b.tag !== "car" && Math.min(b.maxX - b.minX, b.maxZ - b.minZ) <= 4 && (b.maxX - b.minX) * (b.maxZ - b.minZ) <= 60);
    const circles = (col.circles as Circle[]).filter((c) => c.r <= 2 && !(c as { npc?: string }).npc);
    if (!boxes.length && !circles.length) return led;
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const b of boxes) { x0 = Math.min(x0, b.minX); x1 = Math.max(x1, b.maxX); z0 = Math.min(z0, b.minZ); z1 = Math.max(z1, b.maxZ); }
    for (const c of circles) { x0 = Math.min(x0, c.x - c.r); x1 = Math.max(x1, c.x + c.r); z0 = Math.min(z0, c.z - c.r); z1 = Math.max(z1, c.z + c.r); }
    x0 = Math.floor(x0) - 2; z0 = Math.floor(z0) - 2;
    const nx = Math.ceil((x1 + 2 - x0) / CELL), nz = Math.ceil((z1 + 2 - z0) / CELL);
    // the cells in a candidate's footprint (and one round it), and a coarse grid of where they are, to pass over the
    // town's other triangles quickly
    const mask = new Uint8Array(nx * nz), CO = 32, cnx = Math.ceil(nx / CO), coarse = new Uint8Array(cnx * Math.ceil(nz / CO));
    const tops = new Map<number, number>();
    /** The cells inside any candidate's own footprint. */
    const own = new Uint8Array(nx * nz);
    const mark = (ax: number, az: number, bx: number, bz: number) => {
      const g = Math.round(GROW / CELL) + 1;
      const i0 = Math.max(0, Math.floor((ax - x0) / CELL) - g), i1 = Math.min(nx - 1, Math.floor((bx - x0) / CELL) + g);
      const k0 = Math.max(0, Math.floor((az - z0) / CELL) - g), k1 = Math.min(nz - 1, Math.floor((bz - z0) / CELL) + g);
      for (let k = k0; k <= k1; k++) for (let i = i0; i <= i1; i++) {
        mask[k * nx + i] = 1; coarse[Math.floor(k / CO) * cnx + Math.floor(i / CO)] = 1;
        if (i >= i0 + g && i <= i1 - g && k >= k0 + g && k <= k1 - g) own[k * nx + i] = 1;
      }
    };
    for (const b of boxes) mark(b.minX, b.minZ, b.maxX, b.maxZ);
    for (const c of circles) mark(c.x - c.r, c.z - c.r, c.x + c.r, c.z + c.r);

    const tri = (ax: number, ay: number, az: number, bx: number, by: number, bz: number, cx: number, cy: number, cz: number) => {
      const lo = Math.min(ay, by, cy), hi = Math.max(ay, by, cy);
      if (lo >= LOW || hi <= FLOOR) return;
      // (not what faces down: the underside of a car's body or a table's top is no top to stand on)
      if ((bz - az) * (cx - ax) - (bx - ax) * (cz - az) < -1e-9 && hi - lo < 0.02) return;
      const i0 = Math.max(0, Math.floor((Math.min(ax, bx, cx) - x0) / CELL - (1 - EDGE)) + 1), i1 = Math.min(nx - 1, Math.floor((Math.max(ax, bx, cx) - x0) / CELL - EDGE));
      const k0 = Math.max(0, Math.floor((Math.min(az, bz, cz) - z0) / CELL - (1 - EDGE)) + 1), k1 = Math.min(nz - 1, Math.floor((Math.max(az, bz, cz) - z0) / CELL - EDGE));
      if (i0 > i1 || k0 > k1) return;
      for (let K = Math.floor(k0 / CO); K <= Math.floor(k1 / CO); K++) for (let I = Math.floor(i0 / CO); I <= Math.floor(i1 / CO); I++) {
        if (!coarse[K * cnx + I]) continue;
        for (let k = Math.max(k0, K * CO), ke = Math.min(k1, K * CO + CO - 1); k <= ke; k++) for (let i = Math.max(i0, I * CO), ie = Math.min(i1, I * CO + CO - 1); i <= ie; i++) {
          const j = k * nx + i;
          if (!mask[j] || (tops.get(j) ?? 0) >= hi) continue;
          const cx0 = x0 + i * CELL, cz0 = z0 + k * CELL;
          if (triOverlapsRect(ax, az, bx, bz, cx, cz, cx0 + EDGE * CELL, cz0 + EDGE * CELL, cx0 + (1 - EDGE) * CELL, cz0 + (1 - EDGE) * CELL)) tops.set(j, hi);
        }
      }
    };

    // every solid mesh's triangles (not the instanced props: trees and palms are colliders of their own, left whole)
    const meshes: THREE.Mesh[] = [];
    root.updateMatrixWorld(true);
    const walk = (o: THREE.Object3D) => {
      if (opts.skip?.(o)) return;
      const m = o as THREE.Mesh;
      if (m.isMesh && !(o as THREE.InstancedMesh).isInstancedMesh && !(o as THREE.SkinnedMesh).isSkinnedMesh && m.geometry?.attributes.position && visibleSolid(m.material)) meshes.push(m);
      for (const c of o.children) walk(c);
    };
    walk(root);

    const finish = () => {
      const cellTop = (i: number, k: number) => (i < 0 || k < 0 || i >= nx || k >= nz ? 0 : tops.get(k * nx + i) ?? 0);
      const G = Math.round(GROW / CELL);
      const split = (inside: (x: number, z: number) => boolean, ax: number, az: number, bx: number, bz: number): boolean => {
        // the collider's cells and a ring of GROW m round it: a bench's seat is often wider than its collider
        const i0 = Math.max(0, Math.floor((ax - x0) / CELL) - G), i1 = Math.min(nx - 1, Math.ceil((bx - x0) / CELL) - 1 + G);
        const k0 = Math.max(0, Math.floor((az - z0) / CELL) - G), k1 = Math.min(nz - 1, Math.ceil((bz - z0) / CELL) - 1 + G);
        const w = i1 - i0 + 1, h = k1 - k0 + 1;
        // 0 nothing, 1 a low top, 2 a wall, 3 open ground inside the collider; `tops` as read
        const kind = new Uint8Array(w * h), top = new Float32Array(w * h), stack: number[] = [];
        let known = 0, low = 0, past = 0;
        for (let k = k0; k <= k1; k++) for (let i = i0; i <= i1; i++) {
          const x = x0 + (i + 0.5) * CELL, z = z0 + (k + 0.5) * CELL;
          if (!inside(x, z)) continue;
          if (opts.tall?.(x, z)) return false;
          const t = cellTop(i, k), q = (k - k0) * w + (i - i0);
          if (t > 0) { kind[q] = t <= LAND ? 1 : 2; top[q] = t; stack.push(q); known++; if (t <= LAND) low++; }
          else {
            // nothing built here: open ground beside what is (a collider's margin round a bench), a wall away from it
            let beside = false;
            for (let dk = -1; dk <= 1 && !beside; dk++) for (let di = -1; di <= 1; di++) if (cellTop(i + di, k + dk) > 0) { beside = true; break; }
            kind[q] = beside ? 3 : 2; top[q] = Infinity;
          }
        }
        if (!low) return false;
        // what is built in the collider, followed out into the ring (the rest of the seat, the back behind it)
        while (stack.length) {
          const q = stack.pop()!, qi = q % w, qk = (q - qi) / w;
          for (let dk = -1; dk <= 1; dk++) for (let di = -1; di <= 1; di++) {
            const ni = qi + di, nk = qk + dk;
            if (ni < 0 || nk < 0 || ni >= w || nk >= h || kind[nk * w + ni]) continue;
            const t = cellTop(i0 + ni, k0 + nk);
            if (t <= 0) continue;
            const n = nk * w + ni;
            kind[n] = t <= LAND ? 1 : 2; top[n] = t; known++;
            if (t <= LAND) {
              low++;
              // a low top that runs on past the ring is a floor passing under the collider (a pier's deck under its
              // edge, a terrace under its rail), not a thing to jump onto: the collider stays the wall it was
              // (a metre of it or more: a hydrant by a bench is not a floor)
              if ((ni === 0 || nk === 0 || ni === w - 1 || nk === h - 1) && !own[(k0 + nk) * nx + i0 + ni] && ++past * CELL >= 1) return false;
            }
            stack.push(n);
          }
        }
        if (low < known * 0.5) return false;
        // rows of cells of a kind (a low top, or a wall) joined into pieces, the same rows joined down the collider
        type Run = Piece & { i0: number; i1: number };
        const same = (a: number, b: number) => a === b || (Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) < 0.04);
        let open: Run[] = [];
        for (let k = 0; k <= h; k++) {
          const runs: Run[] = [];
          if (k < h) for (let i = 0; i < w; i++) {
            const c = kind[k * w + i];
            if (c !== 1 && c !== 2) continue;
            const t = c === 1 ? top[k * w + i] : Infinity;
            const last = runs[runs.length - 1];
            if (last && last.i1 === i - 1 && same(last.top, t)) { last.i1 = i; last.maxX = x0 + (i0 + i + 1) * CELL; last.top = Math.max(last.top, t); }
            else runs.push({ i0: i, i1: i, minX: x0 + (i0 + i) * CELL, maxX: x0 + (i0 + i + 1) * CELL, minZ: z0 + (k0 + k) * CELL, maxZ: z0 + (k0 + k + 1) * CELL, top: t });
          }
          const next: Run[] = [];
          for (const o of open) {
            const r = runs.find((q) => q.i0 === o.i0 && q.i1 === o.i1 && same(q.top, o.top));
            if (r) { o.maxZ = r.maxZ; o.top = Math.max(o.top, r.top); runs.splice(runs.indexOf(r), 1); next.push(o); }
            else led.add({ minX: o.minX, maxX: o.maxX, minZ: o.minZ, maxZ: o.maxZ, top: o.top });
          }
          open = [...next, ...runs];
        }
        return true;
      };
      const kept = (inside: (x: number, z: number) => boolean) => !!opts.keep?.some(([x, z]) => inside(x, z));
      for (const b of boxes) {
        const inside = (x: number, z: number) => x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ;
        if (!kept(inside) && split(inside, b.minX, b.minZ, b.maxX, b.maxZ)) b.split = true;
      }
      for (const c of circles) {
        const inside = (x: number, z: number) => (x - c.x) ** 2 + (z - c.z) ** 2 <= c.r * c.r;
        if (!kept(inside) && split(inside, c.x - c.r, c.z - c.r, c.x + c.r, c.z + c.r)) c.split = true;
      }
      led.ready = true;
    };

    const v = new THREE.Vector3();
    let mi = 0, ti = 0;
    const work = () => {
      const t0 = performance.now();
      while (mi < meshes.length) {
        const mesh = meshes[mi], pos = mesh.geometry.attributes.position as THREE.BufferAttribute, idx = mesh.geometry.index;
        const n = idx ? idx.count : pos.count, a = pos.array as Float32Array, flat = !idx && pos.itemSize === 3 && !(pos as unknown as { isInterleavedBufferAttribute?: boolean }).isInterleavedBufferAttribute && isIdentity(mesh.matrixWorld);
        const p = [0, 0, 0, 0, 0, 0, 0, 0, 0];
        for (; ti + 2 < n; ti += 3) {
          if (flat) { const o = ti * 3; tri(a[o], a[o + 1], a[o + 2], a[o + 3], a[o + 4], a[o + 5], a[o + 6], a[o + 7], a[o + 8]); }
          else {
            for (let k = 0; k < 3; k++) { v.fromBufferAttribute(pos, idx ? idx.getX(ti + k) : ti + k).applyMatrix4(mesh.matrixWorld); p[k * 3] = v.x; p[k * 3 + 1] = v.y; p[k * 3 + 2] = v.z; }
            tri(p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8]);
          }
          if (slice && (ti & 2047) === 0 && performance.now() - t0 > 5) { ti += 3; slice(work); return; }
        }
        mi++; ti = 0;
      }
      finish();
    };
    if (slice) slice(work); else work();
    return led;
  }

  /** The heights have been read (false while a sliced build is still at work). */
  ready = false;
}

const NONE: Piece[] = [];

function visibleSolid(m: THREE.Material | THREE.Material[]) {
  const ms = Array.isArray(m) ? m : [m];
  return ms.some((x) => x && x.visible !== false && !(x.transparent && x.opacity < 0.6));
}

function isIdentity(m: THREE.Matrix4) {
  const e = m.elements;
  return e[0] === 1 && e[5] === 1 && e[10] === 1 && e[15] === 1 && e[1] === 0 && e[2] === 0 && e[3] === 0 && e[4] === 0 && e[6] === 0 && e[7] === 0 && e[8] === 0 && e[9] === 0 && e[11] === 0 && e[12] === 0 && e[13] === 0 && e[14] === 0;
}
