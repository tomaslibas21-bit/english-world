// Dev only (not part of the build): where can a player who jumps get to? Since a jump lands on things (ledges.ts) and
// goes higher with a flip (movement.ts Hop), this floods the town from where the player stands with
// every move they have, taken generously (the best jump from anywhere, any landing within reach), and answers what
// must stay true: nobody stands higher than CLIMB (no roof), nobody gets out of the town or past the wading limit,
// and nobody is stuck: from every new place a plain jump (or, noted, a jump with a flip) leads back.
// Run it from the browser console or a probe:
// `(await import("/src/dev/climbAudit.ts")).climbAudit(colliders, ledges, bounds, [x, z])`.
import type { Colliders } from "../game/world/util";
import { Ledges, CLIMB, STEP, SLOPE, TOE } from "../game/ledges";
import { Hop } from "../game/movement";
import { floorY, SHORE } from "../game/water";

export interface FreshGround { x0: number; z0: number; x1: number; z1: number; area: number; out: "jump" | "flip" | "stuck" }
export interface ClimbReport {
  /** Square metres one can stand on in all, and of those on something (a bench, a car, a wall's top). */
  reached: number;
  raised: number;
  /** The highest place one can stand (m). */
  maxHeight: number;
  /** Cells reached beyond the bounds or past the wading limit (must be 0). */
  outside: number;
  /** Ground reached only by jumping (a fenced yard, a fountain's basin): where, how big, and how one gets back out. */
  fresh: FreshGround[];
  /** The raised places by height (m, to 0.1): square metres of each. */
  heights: Record<string, number>;
}

export function climbAudit(col: Colliders, led: Ledges, bounds: { minX: number; maxX: number; minZ: number; maxZ: number }, start: [number, number], c = 0.25): ClimbReport {
  const pad = 8, x0 = bounds.minX - pad, z0 = bounds.minZ - pad;
  const nx = Math.ceil((bounds.maxX + pad - x0) / c), nz = Math.ceil((bounds.maxZ + pad - z0) / c), N = nx * nz;
  const WALL = 1e9;
  // each cell: how high one stands there (the ground, a deck, a piece's top), or a wall
  const h = new Float32Array(N), onPiece = new Uint8Array(N);
  for (let k = 0; k < nz; k++) for (let i = 0; i < nx; i++) {
    const x = x0 + (i + 0.5) * c, z = z0 + (k + 0.5) * c;
    h[k * nx + i] = z < SHORE.limit ? WALL : floorY(x, z);
  }
  const each = (ax: number, az: number, bx: number, bz: number, f: (j: number, x: number, z: number) => void) => {
    const i0 = Math.max(0, Math.floor((ax - x0) / c)), i1 = Math.min(nx - 1, Math.floor((bx - x0) / c));
    const k0 = Math.max(0, Math.floor((az - z0) / c)), k1 = Math.min(nz - 1, Math.floor((bz - z0) / c));
    for (let k = k0; k <= k1; k++) for (let i = i0; i <= i1; i++) f(k * nx + i, x0 + (i + 0.5) * c, z0 + (k + 0.5) * c);
  };
  // the ground plan's walls (what was not split; the sea is open to the player as far as the limit), taken a little
  // thinner than the player is (generous)
  const r = 0.3;
  for (const b of col.boxes) if (!b.split && b.tag !== "sea") each(b.minX - r, b.minZ - r, b.maxX + r, b.maxZ + r, (j, x, z) => {
    const dx = x - Math.max(b.minX, Math.min(x, b.maxX)), dz = z - Math.max(b.minZ, Math.min(z, b.maxZ));
    if (dx * dx + dz * dz < r * r) h[j] = WALL;
  });
  for (const o of col.circles) if (!o.split) each(o.x - o.r - r, o.z - o.r - r, o.x + o.r + r, o.z + o.r + r, (j, x, z) => { if ((x - o.x) ** 2 + (z - o.z) ** 2 < (o.r + r) ** 2) h[j] = WALL; });
  // the pieces: their tops (a cell's highest), or walls
  for (const p of led.pieces) each(p.minX, p.minZ, p.maxX, p.maxZ, (j, x, z) => {
    if (x < p.minX || x > p.maxX || z < p.minZ || z > p.maxZ || h[j] === WALL) return;
    if (p.top === Infinity) { h[j] = WALL; return; }
    if (!onPiece[j] || p.top > h[j]) h[j] = p.top;
    onPiece[j] = 1;
  });
  const at = (x: number, z: number) => Math.floor((z - z0) / c) * nx + Math.floor((x - x0) / c);
  const NB = [-1, 1, -nx, nx, -nx - 1, -nx + 1, nx - 1, nx + 1];

  /** Everywhere reached from `from` with jumps that gain up to `gain` m (`far`: and land up to that many metres off,
   *  over whatever is lower than the jump goes). */
  const flood = (from: number, gain: number, far: number, stop?: Uint8Array) => {
    const seen = new Uint8Array(N), queue = new Int32Array(N);
    let head = 0, tail = 0;
    seen[from] = 1; queue[tail++] = from;
    const R = Math.ceil(far / c), air = new Int32Array((2 * R + 1) ** 2), mark = new Int32Array(N);
    let stamp = 0;
    while (head < tail) {
      const a = queue[head++], ha = h[a];
      if (stop?.[a]) return { seen, hit: true };
      const walk = ha < 0.2 ? STEP : SLOPE;
      for (const d of NB) {
        const b = a + d;
        if (b < 0 || b >= N || seen[b] || h[b] === WALL) continue;
        if (Math.abs((b % nx) - (a % nx)) > 1) continue;
        if (h[b] <= ha + Math.max(walk, gain)) { seen[b] = 1; queue[tail++] = b; }
      }
      // from up on something: a jump across to what is no higher than it reaches, over anything lower
      if (far > 0 && gain > 0 && onPiece[a]) {
        const top = ha + gain, ai = a % nx, ak = (a - ai) / nx;
        let ah = 0, at2 = 0;
        stamp++;
        air[at2++] = a; mark[a] = stamp;
        while (ah < at2) {
          const q = air[ah++];
          for (const d of NB) {
            const b = q + d;
            if (b < 0 || b >= N || mark[b] === stamp || h[b] === WALL || h[b] > top) continue;
            const bi = b % nx, bk = (b - bi) / nx;
            if (Math.abs(bi - (q % nx)) > 1 || (bi - ai) ** 2 + (bk - ak) ** 2 > R * R) continue;
            mark[b] = stamp; air[at2++] = b;
            if (!seen[b]) { seen[b] = 1; queue[tail++] = b; }
          }
        }
      }
    }
    return { seen, hit: false };
  };

  const s = at(start[0], start[1]);
  const best = Hop.PEAK + Hop.FLIP_LIFT + TOE;
  // with every move, and with none (walking only: the pieces are in the way)
  const all = flood(s, best, 6).seen;
  const plain = (() => {
    const seen = new Uint8Array(N), queue = new Int32Array(N);
    let head = 0, tail = 0;
    seen[s] = 1; queue[tail++] = s;
    while (head < tail) {
      const a = queue[head++];
      for (const d of NB) {
        const b = a + d;
        if (b < 0 || b >= N || seen[b] || h[b] === WALL || onPiece[b] || Math.abs((b % nx) - (a % nx)) > 1) continue;
        seen[b] = 1; queue[tail++] = b;
      }
    }
    return seen;
  })();

  const rep: ClimbReport = { reached: 0, raised: 0, maxHeight: 0, outside: 0, fresh: [], heights: {} };
  const freshCell = new Uint8Array(N);
  for (let j = 0; j < N; j++) {
    if (!all[j]) continue;
    const i = j % nx, k = (j - i) / nx, x = x0 + (i + 0.5) * c, z = z0 + (k + 0.5) * c;
    rep.reached += c * c;
    if (x < bounds.minX || x > bounds.maxX || z < bounds.minZ || z > bounds.maxZ || z < SHORE.limit) rep.outside++;
    if (onPiece[j]) {
      rep.raised += c * c;
      rep.maxHeight = Math.max(rep.maxHeight, h[j]);
      const key = (Math.round(h[j] * 10) / 10).toFixed(1);
      rep.heights[key] = (rep.heights[key] ?? 0) + c * c;
    } else if (!plain[j]) freshCell[j] = 1;
  }
  // the new ground in patches, and the way back out of each: a plain jump, a jump with a flip, or none
  const done = new Uint8Array(N);
  for (let j = 0; j < N; j++) {
    if (!freshCell[j] || done[j]) continue;
    const stack = [j];
    done[j] = 1;
    const f: FreshGround = { x0: Infinity, z0: Infinity, x1: -Infinity, z1: -Infinity, area: 0, out: "stuck" };
    while (stack.length) {
      const a = stack.pop()!, i = a % nx, k = (a - i) / nx;
      f.area += c * c;
      f.x0 = Math.min(f.x0, x0 + i * c); f.x1 = Math.max(f.x1, x0 + (i + 1) * c); f.z0 = Math.min(f.z0, z0 + k * c); f.z1 = Math.max(f.z1, z0 + (k + 1) * c);
      for (const d of NB) { const b = a + d; if (b >= 0 && b < N && freshCell[b] && !done[b] && Math.abs((b % nx) - i) <= 1) { done[b] = 1; stack.push(b); } }
    }
    if (f.area < 0.5) continue;
    f.out = flood(j, Hop.PEAK - 0.05, 2, plain).hit ? "jump" : flood(j, Hop.PEAK + Hop.FLIP_LIFT - 0.05, 2.5, plain).hit ? "flip" : "stuck";
    rep.fresh.push(f);
  }
  rep.maxHeight = Math.round(rep.maxHeight * 100) / 100;
  if (rep.maxHeight > CLIMB) console.warn("climbAudit: someone can stand above CLIMB", rep.maxHeight);
  return rep;
}
