// Grid navigation (A*) for click-to-walk, auto-walk and the guidance trail.
import type { Colliders } from "./world/util";

export class NavGrid {
  cols: number; rows: number;
  blocked: Uint8Array;
  /** Walking cost multiplier per cell (roads cost more, so paths use sidewalks and crosswalks). */
  cost: Float32Array;
  constructor(public minX: number, public minZ: number, maxX: number, maxZ: number, public cell: number, col: Colliders, radius = 0.45) {
    this.cols = Math.ceil((maxX - minX) / cell);
    this.rows = Math.ceil((maxZ - minZ) / cell);
    this.blocked = new Uint8Array(this.cols * this.rows);
    this.cost = new Float32Array(this.cols * this.rows).fill(1);
    const mark = (x0: number, z0: number, x1: number, z1: number) => {
      const c0 = Math.max(0, Math.floor((x0 - minX) / cell)), c1 = Math.min(this.cols - 1, Math.floor((x1 - minX) / cell));
      const r0 = Math.max(0, Math.floor((z0 - minZ) / cell)), r1 = Math.min(this.rows - 1, Math.floor((z1 - minZ) / cell));
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) this.blocked[r * this.cols + c] = 1;
    };
    for (const b of col.boxes) mark(b.minX - radius, b.minZ - radius, b.maxX + radius, b.maxZ + radius);
    for (const c of col.circles) mark(c.x - c.r - radius, c.z - c.r - radius, c.x + c.r + radius, c.z + c.r + radius);
  }
  /** Set the cost of all cells inside a rectangle. */
  setCost(x0: number, z0: number, x1: number, z1: number, c: number) {
    const c0 = Math.max(0, Math.floor((x0 - this.minX) / this.cell)), c1 = Math.min(this.cols - 1, Math.floor((x1 - this.minX) / this.cell));
    const r0 = Math.max(0, Math.floor((z0 - this.minZ) / this.cell)), r1 = Math.min(this.rows - 1, Math.floor((z1 - this.minZ) / this.cell));
    for (let r = r0; r <= r1; r++) for (let k = c0; k <= c1; k++) this.cost[r * this.cols + k] = c;
  }
  idx(x: number, z: number) {
    const c = Math.floor((x - this.minX) / this.cell), r = Math.floor((z - this.minZ) / this.cell);
    if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) return -1;
    return r * this.cols + c;
  }
  center(i: number): [number, number] {
    const c = i % this.cols, r = Math.floor(i / this.cols);
    return [this.minX + (c + 0.5) * this.cell, this.minZ + (r + 0.5) * this.cell];
  }
  free(i: number) { return i >= 0 && !this.blocked[i]; }
  /** Nearest free cell to (x,z) within a few rings. */
  nearestFree(x: number, z: number): number {
    const i = this.idx(x, z);
    if (this.free(i)) return i;
    const c0 = Math.floor((x - this.minX) / this.cell), r0 = Math.floor((z - this.minZ) / this.cell);
    for (let ring = 1; ring < 12; ring++) {
      let best = -1, bd = Infinity;
      for (let dr = -ring; dr <= ring; dr++) for (let dc = -ring; dc <= ring; dc++) {
        if (Math.max(Math.abs(dr), Math.abs(dc)) !== ring) continue;
        const c = c0 + dc, r = r0 + dr;
        if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) continue;
        const k = r * this.cols + c;
        if (!this.blocked[k]) { const d = dr * dr + dc * dc; if (d < bd) { bd = d; best = k; } }
      }
      if (best >= 0) return best;
    }
    return -1;
  }
  lineFree(ax: number, az: number, bx: number, bz: number): boolean {
    const d = Math.hypot(bx - ax, bz - az);
    const steps = Math.ceil(d / (this.cell * 0.5));
    const ia = this.idx(ax, az), ib = this.idx(bx, bz);
    const maxCost = Math.max(ia >= 0 ? this.cost[ia] : 1, ib >= 0 ? this.cost[ib] : 1);
    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      const i = this.idx(ax + (bx - ax) * t, az + (bz - az) * t);
      if (!this.free(i) || this.cost[i] > maxCost + 0.01) return false;
    }
    return true;
  }
  // reusable search buffers (a generation stamp avoids clearing them for every search)
  private gCost?: Float32Array; private came?: Int32Array; private stamp?: Uint32Array; private closedAt?: Uint32Array;
  private heapI?: Int32Array; private heapF?: Float32Array; private gen = 0;

  /** A* path from a to b as world points (smoothed). Returns null if unreachable. */
  path(ax: number, az: number, bx: number, bz: number): [number, number][] | null {
    const start = this.nearestFree(ax, az), goal = this.nearestFree(bx, bz);
    if (start < 0 || goal < 0) return null;
    const n = this.cols * this.rows;
    if (!this.gCost) {
      this.gCost = new Float32Array(n); this.came = new Int32Array(n); this.stamp = new Uint32Array(n); this.closedAt = new Uint32Array(n);
      this.heapI = new Int32Array(n * 4); this.heapF = new Float32Array(n * 4);
    }
    const g = this.gCost, came = this.came!, stamp = this.stamp!, closedAt = this.closedAt!, HI = this.heapI!, HF = this.heapF!;
    const gen = ++this.gen;
    let size = 0;
    const push = (i: number, f: number) => {
      if (size >= HI.length) return;
      let k = size++;
      while (k > 0) { const p = (k - 1) >> 1; if (HF[p] <= f) break; HI[k] = HI[p]; HF[k] = HF[p]; k = p; }
      HI[k] = i; HF[k] = f;
    };
    const pop = () => {
      const top = HI[0];
      const li = HI[--size], lf = HF[size];
      let k = 0;
      for (;;) {
        const l = 2 * k + 1, r = l + 1;
        if (l >= size) break;
        const m = r < size && HF[r] < HF[l] ? r : l;
        if (HF[m] >= lf) break;
        HI[k] = HI[m]; HF[k] = HF[m]; k = m;
      }
      HI[k] = li; HF[k] = lf;
      return top;
    };
    const [gx, gz] = this.center(goal);
    const cols = this.cols, cell = this.cell;
    const h = (i: number) => { const x = this.minX + ((i % cols) + 0.5) * cell, z = this.minZ + (Math.floor(i / cols) + 0.5) * cell; const dx = Math.abs(x - gx), dz = Math.abs(z - gz); return dx + dz + (Math.SQRT2 - 2) * Math.min(dx, dz); };
    stamp[start] = gen; g[start] = 0; came[start] = -1; push(start, h(start));
    const DC = [1, -1, 0, 0, 1, 1, -1, -1], DR = [0, 0, 1, -1, 1, -1, 1, -1], DK = [1, 1, 1, 1, Math.SQRT2, Math.SQRT2, Math.SQRT2, Math.SQRT2];
    let found = false, guard = 0;
    while (size > 0 && guard++ < 200000) {
      const cur = pop();
      if (closedAt[cur] === gen) continue;
      if (cur === goal) { found = true; break; }
      closedAt[cur] = gen;
      const c = cur % cols, r = Math.floor(cur / cols);
      for (let d = 0; d < 8; d++) {
        const dc = DC[d], dr = DR[d];
        const nc = c + dc, nr = r + dr;
        if (nc < 0 || nr < 0 || nc >= cols || nr >= this.rows) continue;
        const k = nr * cols + nc;
        if (this.blocked[k] || closedAt[k] === gen) continue;
        if (dc && dr && (this.blocked[r * cols + nc] || this.blocked[nr * cols + c])) continue; // no corner cutting
        const ng = g[cur] + DK[d] * cell * this.cost[k];
        if (stamp[k] !== gen || ng < g[k]) { stamp[k] = gen; g[k] = ng; came[k] = cur; push(k, ng + h(k)); }
      }
    }
    if (!found) return null;
    const cells: number[] = [];
    for (let k = goal; k >= 0; k = came[k]) { cells.push(k); if (k === start) break; }
    cells.reverse();
    const pts = cells.map((k) => this.center(k));
    pts[pts.length - 1] = [bx, bz];
    pts.unshift([ax, az]);
    // string pulling
    const out: [number, number][] = [pts[0]];
    let anchor = 0;
    for (let i = 2; i < pts.length; i++) {
      if (!this.lineFree(pts[anchor][0], pts[anchor][1], pts[i][0], pts[i][1])) { out.push(pts[i - 1]); anchor = i - 1; }
    }
    out.push(pts[pts.length - 1]);
    return out;
  }
}
