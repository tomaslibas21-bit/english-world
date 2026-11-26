// What the player can jump onto or over, from the place's own geometry. The colliders are a ground plan (boxes and
// circles, no heights): a bench stops a walker like a wall does. Here each small collider's footprint is sampled in
// 12.5 cm cells from the meshes that stand in it (the top of whatever starts below 1.3 m, and of what sits on that: a
// seat, a planter's rim, a low wall, a car's hood and the roof over its cabin; awnings, signs and crowns over a thing
// don't count). A collider that is mostly knee-high (tops up to LAND: a bench, a planter) is split, for the player
// only, into pieces with a height: the low ones can be landed on and walked off, the rest of it (a bench's back) stays
// a wall. One that is not, but is mostly low enough to stand on at all (tops up to CLIMB, a car's roof), is split into
// pieces with their heights: one jumps from one to the next (the ground, a car's hood, its roof); what in it is taller
// stays a wall. Narrow barriers and small posts can have a clearance height without offering a place to land.
// How high a jump goes is the jump's own business (movement.ts Hop). Buildings, bounds, people and what the
// camera's field holds solid (a gazebo, a kiosco) keep the ground plan. What stands by someone one talks to keeps
// the lower limit (LAND). Way-finding, passers-by and the camera use the original ground plan.
import * as THREE from "three";
import { collisionRanges } from "./collisionGeometry";
import type { AABB, Colliders } from "./world/util";
import { triOverlapsRect } from "./occlusion";
import { Hop } from "./movement";

/** About knee or bench height (m): what a jump from a standstill lands on with room to spare, and the most that can
 *  be stood on beside someone one talks to. */
export const LAND = 0.62;
/** The highest top anyone can stand on (m): a bus shelter's or a market stall's roof, what the high jump (the third press) reaches
 *  (movement.ts Hop). Whatever is taller is a wall, however one got up beside it. */
export const CLIMB = 2.8;
/** A rise this small is walked up from the ground without a jump (m): a kerb, a terrace's boards. */
export const STEP = 0.12;
/** Up on something, only this much is walked up (m): a hood's gentle slope, not a windshield. */
export const SLOPE = 0.07;
/** In the air, a top this much above the feet is still landed on (m): a car's front is a lip and then the hood, and a
 *  jump that all but gets there gets there. */
export const TOE = 0.05;
/** How near someone one talks to (m) a thing keeps the lower limit. */
const BESIDE = 1.6;
const CELL = 0.125;
/** Triangles that start above this (m) are over the thing, not part of it, unless they sit on it (within SIT of its
 *  top: a car's roof on its windows, and then over what of it is less than GAP under them); tops under FLOOR are the
 *  ground's own. */
const LOW = 1.3, FLOOR = 0.1, SIT = 0.2, GAP = 0.9;
/** The room one needs over a top higher than a bench to stand on it (m): nobody stands on a market stall's table
 *  under its awning (what is knee-high is as it always was, under a shelter's roof too); and how level a top must be
 *  (the normal's upward part: steeper than about 60° is a face, not a top). */
const HEAD = 2.3, STEEP = 0.5;
/** A car's roof (m): what jump after jump reaches without the high jump. Up to here every top is read as
 *  it was before there was a high jump; above it a top must be a place to stand: level, SPAN across one way at least and
 *  PLACE m² in all (a wall's top, a gate's pillar, a van's roof), not a pole's end, an umbrella's tip or the edge of a
 *  price board. */
const FIRST = 1.75, SPAN = 0.5, PLACE = 0.2;
/** How much of a cell's side a triangle may touch without counting (a fraction of the cell). */
const EDGE = 0.1;
/** How far past a collider's edge what is built in it is followed (m): a seat wider than its collider. */
const GROW = 0.5;

/** `wall`: never stood on, a wall to feet below its top (what is too high, or has no room over it under a roof).
 *  A finite wall top is clearance only: a rail, a bollard, or the wall beneath a deck.
 *  `deck`: a roof one can stand on (a shelter's, a stall's): no wall to anyone, walked under and jumped up through,
 *  landed on from above. */
export interface Piece { minX: number; maxX: number; minZ: number; maxZ: number; top: number; wall?: boolean; deck?: boolean }
type Box = Pick<AABB, "minX" | "maxX" | "minZ" | "maxZ">;

export interface LedgeOptions {
  /** Leave this object (and what it holds) out: what moves. */
  skip?: (o: THREE.Object3D) => boolean;
  /** Never split a collider that holds one of these points. */
  keep?: [number, number][];
  /** Never split a collider over a spot this says is solid and tall (the camera's field: a gazebo, a kiosco). */
  tall?: (x: number, z: number) => boolean;
  /** Where the people one talks to stand or sit: what is within arm's reach of them keeps the lower limit (LAND). */
  beside?: [number, number][];
  /** What is thin and looked through (a stall's awning, a palapa's thatch): never a top, only a roof over what stands
   *  under it. */
  thin?: (o: THREE.Object3D) => boolean;
  /** A lower ceiling on climbable scenery in rooms. */
  maxTop?: number;
}

/** What was read of one collider (for the dev tools and the tests): where it is, whether it was split, the lowest and
 *  the highest top one can stand on in it, and how many of its cells are walls. */
export interface Thing { x: number; z: number; w: number; d: number; tag?: string; split: boolean; cap: number; low: number; high: number; walls: number; cells: number; decks: number; vault?: number }

export class Ledges {
  pieces: Piece[] = [];
  /** Every collider looked at, split or not. */
  things: Thing[] = [];
  /** Pieces that come and go (a car that has stopped): asked for at each look-up. */
  dynamic: ((x: number, z: number) => Piece[]) | null = null;
  private buckets = new Map<number, Piece[]>();
  private static readonly B = 4;

  /** The pieces around (x, z). */
  private near(x: number, z: number): Piece[] {
    const fixed = this.buckets.get(Math.floor(x / Ledges.B) * 4096 + Math.floor(z / Ledges.B)) ?? NONE;
    const more = this.dynamic?.(x, z);
    return more?.length ? (fixed.length ? fixed.concat(more) : more) : fixed;
  }

  /** How much higher than feet at `feet` m a top may be and still be got onto: a toe's reach in the air (a jump that
   *  comes within it of a top lands on it), a kerb from the ground, a gentle slope up on something. */
  private static rise(feet: number, air: boolean) { return air ? TOE : feet < 0.2 ? STEP : SLOPE; }

  static restore(pieces: readonly Piece[], things: Thing[]) {
    const led = new Ledges();
    for (const piece of pieces) led.add(piece);
    led.things = things;
    led.ready = true;
    return led;
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
   *  (in the air: than their feet, give or take a toe). */
  resolve(p: { x: number; z: number }, r: number, feet: number, air: boolean) {
    const reach = feet + Ledges.rise(feet, air);
    for (let iter = 0; iter < 2; iter++) for (const b of this.near(p.x, p.z)) {
      if (b.deck || b.top <= reach) continue;
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

  /** Can someone whose feet are `feet` m up go straight from (ax, az) to (bx, bz): no piece standing higher than
   *  their feet in the way (a bench's back between its seat and the lawn behind it)? */
  clear(ax: number, az: number, bx: number, bz: number, feet: number, r = 0.3) {
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 0.1));
    for (let i = 0; i <= n; i++) {
      const x = ax + ((bx - ax) * i) / n, z = az + ((bz - az) * i) / n;
      for (const b of this.near(x, z)) if (!b.deck && b.top > feet + 0.02 && x > b.minX - r && x < b.maxX + r && z > b.minZ - r && z < b.maxZ + r) return false;
    }
    return true;
  }

  /** How high the thing under (x, z) stands that feet at `feet` m are on or over (0: the ground). */
  support(x: number, z: number, feet: number, air: boolean) {
    return this.supportPiece(x, z, feet, air)?.top ?? 0;
  }

  supportPiece(x: number, z: number, feet: number, air: boolean) {
    const reach = feet + Ledges.rise(feet, air), m = 0.2;
    let piece: Piece | undefined;
    for (const b of this.near(x, z)) {
      if (b.wall || b.top > reach || b.top <= (piece?.top ?? 0)) continue;
      if (x > b.minX - m && x < b.maxX + m && z > b.minZ - m && z < b.maxZ + m) piece = b;
    }
    return piece;
  }

  /** Reads the heights of `col`'s small colliders from the meshes under `root` and splits the low ones (marks them
   *  `split`: Colliders.resolve leaves those to this). In slices of a few milliseconds when `slice` is given (it is
   *  called with the rest of the work), so a town is walkable before this is done; until then nothing can be climbed. */
  static build(root: THREE.Object3D, col: Colliders, opts: LedgeOptions = {}, slice?: (next: () => void) => void): Ledges {
    const led = new Ledges();
    // Only eligible scenery enters the height sampler.
    const maxTop = Math.min(opts.maxTop ?? CLIMB, CLIMB);
    const besideTop = Math.min(maxTop, LAND);
    const boxes = col.boxes.filter((b) => {
      if (b.split || b.tag === "building" || b.tag === "edge" || b.tag === "town-edge" || b.tag === "sea" || b.tag === "counter") return false;
      // Slate Cove's rock, walls and stair sides (mh-cave) are shaped by their own colliders and floors: nothing to climb.
      if (b.tag === "cove-edge" || b.tag === "cove-rock" || b.tag === "ring-wall" || b.tag === "ring-edge") return false;
      const w = b.maxX - b.minX, d = b.maxZ - b.minZ;
      return Math.min(w, d) <= 4 && w * d <= 60;
    });
    const circles = col.circles.filter((c) => !c.split && c.r <= 4.5 && !c.npc && c.tag !== "ring-wall");
    /** The roofs the town lists as ones to stand on (a shelter's, a stall's). */
    const listed = (col as { roofs?: Box[] }).roofs ?? [];
    if (!boxes.length && !circles.length && !listed.length) { led.ready = true; return led; }
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const b of listed) { x0 = Math.min(x0, b.minX); x1 = Math.max(x1, b.maxX); z0 = Math.min(z0, b.minZ); z1 = Math.max(z1, b.maxZ); }
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
    // (a listed roof's cells are read too, and nothing there is a candidate's own)
    const ownBefore = own.slice();
    for (const b of listed) mark(b.minX, b.minZ, b.maxX, b.maxZ);
    own.set(ownBefore);
    /** The cells under a listed roof. */
    const roofCell = new Uint8Array(nx * nz);
    for (const b of listed) for (let k = Math.max(0, Math.floor((b.minZ - z0) / CELL)); k <= Math.min(nz - 1, Math.floor((b.maxZ - z0) / CELL)); k++) for (let i = Math.max(0, Math.floor((b.minX - x0) / CELL)); i <= Math.min(nx - 1, Math.floor((b.maxX - x0) / CELL)); i++) {
      // (every cell the roof reaches into, by more than a finger)
      const cx0 = x0 + i * CELL, cz0 = z0 + k * CELL;
      if (cx0 + CELL > b.minX + 0.02 && cx0 < b.maxX - 0.02 && cz0 + CELL > b.minZ + 0.02 && cz0 < b.maxZ - 0.02) roofCell[k * nx + i] = 1;
    }

    /** Triangles that start above LOW: kept until the rest is read, then laid on what they sit on (12 numbers each: the
     *  lowest and the highest point, the corners, whether it is steep). */
    const upper: number[] = [], W = 12;
    /** The highest top in each cell that is level enough to stand on (`tops`: the highest of all), and the lowest thing
     *  over the cell (a thin one: `shade`). */
    const flats = new Map<number, number>(), roofs = new Map<number, number>(), shade = new Map<number, number>();
    /** A roof's own top over each cell, where it is level enough and low enough to stand on (a shelter's roof over its
     *  bench), and the lowest thing over that. */
    const decks = new Map<number, number>(), overDeck = new Map<number, number>();
    let thin = false;
    const T = { ax: 0, ay: 0, az: 0, bx: 0, by: 0, bz: 0, cx: 0, cy: 0, cz: 0, lo: 0, hi: 0, steep: false, i0: 0, i1: 0, k0: 0, k1: 0 };
    /** The cells the triangle in T may touch (false: none). */
    const span = () => {
      T.i0 = Math.max(0, Math.floor((Math.min(T.ax, T.bx, T.cx) - x0) / CELL - (1 - EDGE)) + 1); T.i1 = Math.min(nx - 1, Math.floor((Math.max(T.ax, T.bx, T.cx) - x0) / CELL - EDGE));
      T.k0 = Math.max(0, Math.floor((Math.min(T.az, T.bz, T.cz) - z0) / CELL - (1 - EDGE)) + 1); T.k1 = Math.min(nz - 1, Math.floor((Math.max(T.az, T.bz, T.cz) - z0) / CELL - EDGE));
      return T.i0 <= T.i1 && T.k0 <= T.k1;
    };
    /** Calls `f` for each cell of a candidate's footprint under T's bounds (until it returns true). */
    const cells = (f: (j: number, i: number, k: number) => boolean | void) => {
      for (let K = Math.floor(T.k0 / CO); K <= Math.floor(T.k1 / CO); K++) for (let I = Math.floor(T.i0 / CO); I <= Math.floor(T.i1 / CO); I++) {
        if (!coarse[K * cnx + I]) continue;
        for (let k = Math.max(T.k0, K * CO), ke = Math.min(T.k1, K * CO + CO - 1); k <= ke; k++) for (let i = Math.max(T.i0, I * CO), ie = Math.min(T.i1, I * CO + CO - 1); i <= ie; i++) {
          if (mask[k * nx + i] && f(k * nx + i, i, k)) return true;
        }
      }
      return false;
    };
    const over = (i: number, k: number) => {
      const cx0 = x0 + i * CELL, cz0 = z0 + k * CELL;
      return triOverlapsRect(T.ax, T.az, T.bx, T.bz, T.cx, T.cz, cx0 + EDGE * CELL, cz0 + EDGE * CELL, cx0 + (1 - EDGE) * CELL, cz0 + (1 - EDGE) * CELL);
    };
    /** T's top in a cell written down (a sloping top, a hood or a windshield, has its own height in each cell; a level
     *  one is the same all over). */
    const level = () => T.hi - T.lo < 0.03;
    const put = (j: number, i: number, k: number) => {
      const cur = tops.get(j) ?? 0, curF = flats.get(j) ?? 0;
      if ((T.steep ? cur : curF) >= T.hi) return;
      let t = T.hi;
      if (level()) { if (!over(i, k)) return; }
      else {
        const cx0 = x0 + i * CELL, cz0 = z0 + k * CELL;
        t = triTopInRect(T.ax, T.ay, T.az, T.bx, T.by, T.bz, T.cx, T.cy, T.cz, cx0 + EDGE * CELL, cz0 + EDGE * CELL, cx0 + (1 - EDGE) * CELL, cz0 + (1 - EDGE) * CELL);
      }
      if (t <= FLOOR) return;
      if (t > cur) tops.set(j, t);
      if (!T.steep && t > curF) flats.set(j, t);
    };
    const tri = (ax: number, ay: number, az: number, bx: number, by: number, bz: number, cx: number, cy: number, cz: number) => {
      const lo = Math.min(ay, by, cy), hi = Math.max(ay, by, cy);
      if (hi <= FLOOR || lo >= CLIMB + HEAD + 0.4) return;
      // which way it faces: not what faces down (the underside of a car's body or a table's top is no top to stand
      // on), and whether it is too steep to stand on (a pillar's flank, a sign's face)
      const ux = bx - ax, uy = by - ay, uz = bz - az, vx = cx - ax, vy = cy - ay, vz = cz - az;
      const nxx = uy * vz - uz * vy, nyy = uz * vx - ux * vz, nzz = ux * vy - uy * vx;
      if (nyy < -1e-9 && hi - lo < 0.02) return;
      // (a tall upright face lying exactly on a line between two cells would touch neither's middle, and a box with
      // round measures would have no sides: it is taken a hand's breadth into the cell beyond)
      if (hi >= LOW && nyy * nyy < 1e-12 * (nxx * nxx + nzz * nzz)) {
        const on = (v: number, o: number) => { const f = (v - o) / CELL; return Math.abs(f - Math.round(f)) < 1e-6; };
        if (Math.abs(ax - bx) < 1e-9 && Math.abs(ax - cx) < 1e-9 && on(ax, x0)) { ax += CELL * 0.25; bx = cx = ax; }
        else if (Math.abs(az - bz) < 1e-9 && Math.abs(az - cz) < 1e-9 && on(az, z0)) { az += CELL * 0.25; bz = cz = az; }
      }
      T.ax = ax; T.ay = ay; T.az = az; T.bx = bx; T.by = by; T.bz = bz; T.cx = cx; T.cy = cy; T.cz = cz; T.lo = lo; T.hi = hi;
      T.steep = nyy * nyy < STEEP * STEEP * (nxx * nxx + nyy * nyy + nzz * nzz);
      if (!span()) return;
      // (an awning, a thatch: only the room under it)
      if (thin) { cells((j, i, k) => { if ((shade.get(j) ?? Infinity) > lo && over(i, k)) shade.set(j, lo); }); return; }
      // starting above LOW it is over the thing, or sitting on it (a car's roof on its windows, a box on a crate):
      // settled once all is read
      if (lo >= LOW) { if (cells(() => true)) upper.push(lo, hi, ax, ay, az, bx, by, bz, cx, cy, cz, T.steep ? 1 : 0); }
      else cells(put);
    };
    /** The triangles kept back: one sits on a thing where the thing's top reaches it (within SIT), and, when it does
     *  somewhere, also where the thing is close under it (a car's roof over its body: the windows only meet it at
     *  their ends); round by round, as one may sit on another. What is left is over things: the room over them. */
    const layUpper = () => {
      const n = upper.length / W;
      let left = Array.from({ length: n }, (_, i) => i).sort((a, b) => upper[a * W] - upper[b * W]);
      /** Every triangle kept back (each is asked again, cell by cell, whether it is over the thing there). */
      const roofing = [...left];
      const load = (q: number) => {
        const o = q * W;
        T.lo = upper[o]; T.hi = upper[o + 1]; T.ax = upper[o + 2]; T.ay = upper[o + 3]; T.az = upper[o + 4]; T.bx = upper[o + 5]; T.by = upper[o + 6]; T.bz = upper[o + 7];
        T.cx = upper[o + 8]; T.cy = upper[o + 9]; T.cz = upper[o + 10]; T.steep = upper[o + 11] === 1;
        span();
      };
      for (let round = 0; round < 4 && left.length; round++) {
        const next: number[] = [];
        for (const q of left) {
          load(q);
          if (!cells((j) => (tops.get(j) ?? 0) >= T.lo - SIT)) { next.push(q); continue; }
          // on what it rests on, and on what is close under it (a car's roof over its body); over what is well under
          // it (a bench under a shelter's roof, a table under an awning) it is a roof, and over open ground nothing
          cells((j, i, k) => {
            const cur = tops.get(j) ?? 0;
            if (cur >= T.lo - SIT || (cur > 0 && T.lo - cur < GAP)) put(j, i, k);
            else if ((roofs.get(j) ?? Infinity) > T.lo && over(i, k)) roofs.set(j, T.lo);
          });
        }
        if (next.length === left.length) break;
        left = next;
      }
      for (const q of left) { load(q); cells((j, i, k) => { if ((roofs.get(j) ?? Infinity) > T.lo && over(i, k)) roofs.set(j, T.lo); }); }
      // the roofs one can stand on: a roof's top where it is level enough and no higher than CLIMB (over each cell the
      // highest such), and then the room over it (anything that starts well above it)
      const roofTri = (f: (j: number, i: number, k: number) => void) => { for (const q of roofing) { load(q); cells((j, i, k) => { const r = roofs.get(j); if (r !== undefined && T.lo >= r - 1e-6 && (tops.get(j) ?? 0) < T.hi - 1e-6) f(j, i, k); }); } };
      roofTri((j, i, k) => {
        if (T.steep || T.hi > CLIMB + 0.3) return;
        let t = T.hi;
        if (level()) { if (!over(i, k)) return; }
        else {
          const cx0 = x0 + i * CELL, cz0 = z0 + k * CELL;
          t = triTopInRect(T.ax, T.ay, T.az, T.bx, T.by, T.bz, T.cx, T.cy, T.cz, cx0 + EDGE * CELL, cz0 + EDGE * CELL, cx0 + (1 - EDGE) * CELL, cz0 + (1 - EDGE) * CELL);
        }
        if (t > (decks.get(j) ?? 0)) decks.set(j, t);
      });
      roofTri((j, i, k) => { const d = decks.get(j); if (d !== undefined && T.lo > d + 0.3 && (overDeck.get(j) ?? Infinity) > T.lo && over(i, k)) overDeck.set(j, T.lo); });
    };

    // every solid mesh's triangles (not the instanced props: trees and palms are colliders of their own, left whole)
    const meshes: THREE.Mesh[] = [], thins = new Set<THREE.Mesh>();
    root.updateMatrixWorld(true);
    const walk = (o: THREE.Object3D, under = false) => {
      if (opts.skip?.(o)) return;
      under ||= !!opts.thin?.(o);
      const m = o as THREE.Mesh;
      if (m.isMesh && !(o as THREE.InstancedMesh).isInstancedMesh && !(o as THREE.SkinnedMesh).isSkinnedMesh && m.geometry?.attributes.position && visibleSolid(m.material)) { meshes.push(m); if (under) thins.add(m); }
      for (const c of o.children) walk(c, under);
    };
    walk(root);

    const finish = () => {
      layUpper();
      // a cell's top; a wall (∞) where it is higher than a bench and there is no room to stand under what is over it
      // (an awning, a canopy), or where its top is only the flank of something that goes on up beside it, higher
      // than a car's roof (a fountain's column, a pillar's foot, a van's side: steep, more than a step above anything
      // level in the cell, and the cell next to it higher still)
      /** Cells under a thing's own top: what a roof covers and the thing's rim shuts in all round (a van's or a tall
       *  crate's inside, the middle of a column): there the roof's top is the thing's. A shelter's roof over its
       *  bench shuts nothing in (it is open in front): that stays a roof. */
      const filled = new Map<number, number>();
      const G = Math.round(GROW / CELL);
      const enclose = (ax: number, az: number, bx: number, bz: number) => {
        const i0 = Math.max(0, Math.floor((ax - x0) / CELL) - G), i1 = Math.min(nx - 1, Math.ceil((bx - x0) / CELL) - 1 + G);
        const k0 = Math.max(0, Math.floor((az - z0) / CELL) - G), k1 = Math.min(nz - 1, Math.ceil((bz - z0) / CELL) - 1 + G);
        const w = i1 - i0 + 1, h = k1 - k0 + 1;
        let rmin = Infinity;
        for (let k = k0; k <= k1; k++) for (let i = i0; i <= i1; i++) { const r = roofs.get(k * nx + i); if (r !== undefined && r < rmin) rmin = r; }
        if (rmin === Infinity) return;
        // the rim: what reaches up to that roof; everything else is flooded from the window's border
        const rim = (q: number) => (tops.get((k0 + Math.floor(q / w)) * nx + i0 + (q % w)) ?? 0) >= rmin - SIT;
        const seen = new Uint8Array(w * h), stack: number[] = [];
        for (let k = 0; k < h; k++) for (let i = 0; i < w; i++) if ((i === 0 || k === 0 || i === w - 1 || k === h - 1) && !rim(k * w + i)) { seen[k * w + i] = 1; stack.push(k * w + i); }
        while (stack.length) {
          const q = stack.pop()!, qi = q % w, qk = (q - qi) / w;
          for (const [di, dk] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const ni = qi + di, nk = qk + dk;
            if (ni < 0 || nk < 0 || ni >= w || nk >= h) continue;
            const n = nk * w + ni;
            if (!seen[n] && !rim(n)) { seen[n] = 1; stack.push(n); }
          }
        }
        for (let q = 0; q < w * h; q++) {
          if (seen[q] || rim(q)) continue;
          const j = (k0 + Math.floor(q / w)) * nx + i0 + (q % w);
          if (roofs.get(j) !== undefined) filled.set(j, decks.get(j) ?? Infinity);
        }
      };
      for (const b of boxes) enclose(b.minX, b.minZ, b.maxX, b.maxZ);
      for (const c of circles) enclose(c.x - c.r, c.z - c.r, c.x + c.r, c.z + c.r);
      /** The cells that are the flank of something higher beside them, and how high that is. */
      const flank = new Map<number, number>();
      const cellTop = (i: number, k: number) => {
        if (i < 0 || k < 0 || i >= nx || k >= nz) return 0;
        const j = k * nx + i, own = filled.get(j);
        // (a thing's own top over its shut-in middle: with room over it, a top like any other)
        if (own !== undefined) return own > LAND && Math.min(overDeck.get(j) ?? Infinity, shade.get(j) ?? Infinity) - own < HEAD ? Infinity : own;
        const t = tops.get(j) ?? 0;
        if (t <= 0) return 0;
        if (t > LAND && Math.min(roofs.get(j) ?? Infinity, shade.get(j) ?? Infinity) - t < HEAD) return Infinity;
        if (t <= CLIMB && t - (flats.get(j) ?? 0) > STEP) {
          let up = 0;
          for (let dk = -1; dk <= 1; dk++) for (let di = -1; di <= 1; di++) {
            const a = i + di, b = k + dk;
            if (a >= 0 && b >= 0 && a < nx && b < nz) up = Math.max(up, tops.get(b * nx + a) ?? 0);
          }
          // (a wall as high as what it is the flank of: to someone up on that, no wall; beside what is no higher
          // than a car's roof it is a top, as it always was: a hydrant's side, the sloping foot of a lamp)
          if (up > Math.max(FIRST, t + STEP)) { flank.set(j, up); return Infinity; }
        }
        return t;
      };
      /** The roof one can stand on over a cell (0: none): one the town lists, no higher than CLIMB, with room over
       *  it, and not one the cell's own top reaches (that is the thing's top, not a roof over it). */
      const deckTop = (i: number, k: number) => {
        if (i < 0 || k < 0 || i >= nx || k >= nz || !roofCell[k * nx + i]) return 0;
        const j = k * nx + i;
        // (where the roof lies on its own wall or post, that top is the roof's)
        const own = tops.get(j) ?? 0, d = filled.has(j) ? undefined : decks.get(j) ?? (own >= LOW && own <= CLIMB && roofs.get(j) === undefined ? own : undefined);
        if (d === undefined || d > maxTop || (overDeck.get(j) ?? Infinity) - d < HEAD || (shade.get(j) ?? Infinity) - d < HEAD) return 0;
        return d;
      };
      const split = (inside: (x: number, z: number) => boolean, ax: number, az: number, bx: number, bz: number, cap: number, note: Thing, ledge = false): boolean => {
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
          if (t > 0) { kind[q] = t <= cap ? 1 : 2; top[q] = t; stack.push(q); known++; if (t <= cap) { low++; note.low = Math.min(note.low, t); note.high = Math.max(note.high, t); } else note.walls++; }
          else {
            // nothing built here: open ground beside what is (a collider's margin round a bench), a wall away from it
            let beside = false;
            for (let dk = -1; dk <= 1 && !beside; dk++) for (let di = -1; di <= 1; di++) if (cellTop(i + di, k + dk) > 0) { beside = true; break; }
            kind[q] = beside ? 3 : 2; top[q] = Infinity;
          }
        }
        // (under a roof one can stand on, a collider with nothing low in it is split all the same, into walls as high
        // as the room under that roof: to whoever stands on the roof it is no wall)
        let roofed = 0, insideN = 0;
        for (let k = k0; k <= k1; k++) for (let i = i0; i <= i1; i++) if (inside(x0 + (i + 0.5) * CELL, z0 + (k + 0.5) * CELL)) { insideN++; if (deckTop(i, k) > 0) roofed++; }
        const covered = insideN > 0 && roofed >= insideN * 0.5;
        if (!low && !covered) return false;
        /** The lowest top in the collider itself. */
        const floor = note.low;
        // what is built in the collider, followed out into the ring (the rest of the seat, the back behind it)
        while (stack.length) {
          const q = stack.pop()!, qi = q % w, qk = (q - qi) / w;
          for (let dk = -1; dk <= 1; dk++) for (let di = -1; di <= 1; di++) {
            const ni = qi + di, nk = qk + dk;
            if (ni < 0 || nk < 0 || ni >= w || nk >= h || kind[nk * w + ni]) continue;
            const t = cellTop(i0 + ni, k0 + nk);
            if (t <= 0) continue;
            const n = nk * w + ni;
            kind[n] = t <= cap ? 1 : 2; top[n] = t; known++;
            if (t <= cap) {
              low++;
              // a low top that runs on past the ring is a floor passing under the collider (a pier's deck under its
              // edge, a terrace under its rail), not a thing to jump onto: the collider stays the wall it was
              // (a metre of it or more: a hydrant by a bench is not a floor; and as low as what is lowest in the
              // collider itself: a boardwalk that starts beside the end of a low wall passes under nothing)
              // (unless the town says it is one: a deck's edge that is a ledge, tagged so)
              if (!ledge && t <= floor + 0.05 && (ni === 0 || nk === 0 || ni === w - 1 || nk === h - 1) && !own[(k0 + nk) * nx + i0 + ni] && ++past * CELL >= 1) return false;
            }
            stack.push(n);
          }
        }
        // above a car's roof, only what is a place to stand: the rest (a pole's end, a post's top) is a wall
        if (cap > FIRST) {
          const need = Math.round(SPAN / CELL), done = new Uint8Array(w * h);
          for (let s = 0; s < w * h; s++) {
            if (kind[s] !== 1 || top[s] <= FIRST || done[s]) continue;
            const patch = [s];
            let a0 = w, a1 = -1, b0 = h, b1 = -1;
            done[s] = 1;
            for (let n = 0; n < patch.length; n++) {
              const q = patch[n], qi = q % w, qk = (q - qi) / w;
              a0 = Math.min(a0, qi); a1 = Math.max(a1, qi); b0 = Math.min(b0, qk); b1 = Math.max(b1, qk);
              for (let dk = -1; dk <= 1; dk++) for (let di = -1; di <= 1; di++) {
                const ni = qi + di, nk = qk + dk, m = nk * w + ni;
                if (ni >= 0 && nk >= 0 && ni < w && nk < h && kind[m] === 1 && top[m] > FIRST && !done[m]) { done[m] = 1; patch.push(m); }
              }
            }
            if (Math.max(a1 - a0, b1 - b0) + 1 < need || patch.length * CELL * CELL < PLACE) { for (const q of patch) kind[q] = 2; low -= patch.length; }
          }
          if (!low && !covered) return false;
        }
        note.cells = known;
        if (low < known * 0.5 && !covered) return false;
        // rows of cells of a kind (a top to stand on, a wall, a roof to stand on) joined into pieces, the same rows
        // joined down the collider. A wall under a roof one can stand on is only as high as the room under that roof
        // (to whoever stands on the roof it is no wall); elsewhere a wall has no top.
        type Run = Piece & { i0: number; i1: number };
        const same = (a: number, b: number) => a === b || (Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) < 0.04);
        const deckOf = new Float32Array(w * h);
        for (let k = 0; k < h; k++) for (let i = 0; i < w; i++) {
          const d = deckTop(i0 + i, k0 + k), q = k * w + i;
          // (not a roof right over a top one stands on: there is no room between)
          if (d > 0 && !(kind[q] === 1 && d - top[q] < HEAD)) deckOf[q] = d;
        }
        const rows = (value: (q: number) => number, extra: Partial<Piece>) => {
          let open: Run[] = [];
          for (let k = 0; k <= h; k++) {
            const runs: Run[] = [];
            if (k < h) for (let i = 0; i < w; i++) {
              const t = value(k * w + i);
              if (!(t > 0)) continue;
              const last = runs[runs.length - 1];
              if (last && last.i1 === i - 1 && same(last.top, t)) { last.i1 = i; last.maxX = x0 + (i0 + i + 1) * CELL; last.top = Math.max(last.top, t); }
              else runs.push({ i0: i, i1: i, minX: x0 + (i0 + i) * CELL, maxX: x0 + (i0 + i + 1) * CELL, minZ: z0 + (k0 + k) * CELL, maxZ: z0 + (k0 + k + 1) * CELL, top: t });
            }
            const next: Run[] = [];
            for (const o of open) {
              const r = runs.find((q) => q.i0 === o.i0 && q.i1 === o.i1 && same(q.top, o.top));
              if (r) { o.maxZ = r.maxZ; o.top = Math.max(o.top, r.top); runs.splice(runs.indexOf(r), 1); next.push(o); }
              else led.add({ minX: o.minX, maxX: o.maxX, minZ: o.minZ, maxZ: o.maxZ, top: o.top, ...extra });
            }
            open = [...next, ...runs];
          }
        };
        rows((q) => (kind[q] === 1 ? top[q] : 0), {});
        const wallTop = (q: number) => {
          const f = flank.get((k0 + Math.floor(q / w)) * nx + i0 + (q % w)), d = deckOf[q];
          if (f !== undefined && f <= CLIMB) return d > 0 ? Math.min(f, d - 0.02) : f;
          return d > 0 ? Math.max(0.3, d - 0.25) : Infinity;
        };
        rows((q) => (kind[q] === 2 ? wallTop(q) : 0), { wall: true });
        for (let q = 0; q < w * h; q++) if (deckOf[q] > 0) note.decks++;
        return true;
      };
      /** What is mostly knee-high (a bench, a planter) is as it always was: its seat to land on, the rest of it (its
       *  back, a lamp on it) a wall. What is not gets its heights up to `cap`. */
      const fit = (inside: (x: number, z: number) => boolean, ax: number, az: number, bx: number, bz: number, cap: number, note: Thing, ledge = false): boolean => {
        if (!ledge && cap > LAND && split(inside, ax, az, bx, bz, LAND, note)) { note.cap = LAND; return true; }
        note.low = Infinity; note.high = 0; note.walls = 0;
        return split(inside, ax, az, bx, bz, cap, note, ledge);
      };
      const kept = (inside: (x: number, z: number) => boolean) => !!opts.keep?.some(([x, z]) => inside(x, z));
      // For thin rails the grid can miss the slats or resolve gaps as full-height walls. Use a single
      // conservative barrier at the highest sampled point if the samples cover the length of the rail.
      // Compact posts use the same rule. Builders can supply a height for sparse or instanced geometry.
      const clearance = (inside: (x: number, z: number) => boolean, b: Box, cap: number, hint?: number) => {
        const w = b.maxX - b.minX, d = b.maxZ - b.minZ;
        const i0 = Math.floor((b.minX - x0) / CELL), i1 = Math.floor((b.maxX - x0) / CELL);
        const k0 = Math.floor((b.minZ - z0) / CELL), k1 = Math.floor((b.maxZ - z0) / CELL);
        if (opts.tall?.((b.minX + b.maxX) / 2, (b.minZ + b.maxZ) / 2)) return 0;
        // A known prop may touch a building or its eaves at the edge of its footprint. The building
        // still has its own full-height collider. The proxy only supplies clearance over the prop.
        const limit = Math.min(FIRST, cap);
        if (hint !== undefined) return hint > STEP && hint <= limit ? hint : 0;
        let high = 0;
        const spans = new Set<number>();
        for (let k = k0; k <= k1; k++) for (let i = i0; i <= i1; i++) {
          const x = x0 + (i + 0.5) * CELL, z = z0 + (k + 0.5) * CELL;
          if (!inside(x, z)) continue;
          if (opts.tall?.(x, z) || deckTop(i, k) > 0) return 0;
          const t = cellTop(i, k);
          if (t > limit) return 0;
          high = Math.max(high, t);
          if (t > STEP) spans.add(w >= d ? i : k);
        }
        return spans.size * CELL >= Math.max(w, d) / 4 ? high : 0;
      };
      const addVault = (b: Box, top: number) => led.add({ minX: b.minX, maxX: b.maxX, minZ: b.minZ, maxZ: b.maxZ, top, wall: true });
      const thing = (x: number, z: number, w: number, d: number, cap: number, tag?: string): Thing => {
        const t = { x, z, w, d, tag, split: false, cap, low: Infinity, high: 0, walls: 0, cells: 0, decks: 0 };
        led.things.push(t);
        return t;
      };
      for (const b of boxes) {
        const inside = (x: number, z: number) => x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ;
        // (by someone one talks to: no higher than a bench)
        const cap = opts.beside?.some(([x, z]) => Math.hypot(x - Math.max(b.minX, Math.min(x, b.maxX)), z - Math.max(b.minZ, Math.min(z, b.maxZ))) < BESIDE) ? besideTop : maxTop;
        const note = thing((b.minX + b.maxX) / 2, (b.minZ + b.maxZ) / 2, b.maxX - b.minX, b.maxZ - b.minZ, cap, b.tag);
        if (kept(inside)) continue;
        const ledge = b.tag === "ledge";
        const narrow = Math.min(note.w, note.d) <= 2 * CELL + 1e-6 && Math.max(note.w, note.d) >= 1;
        const top = !ledge && (narrow || b.vault !== undefined) ? clearance(inside, b, cap, b.vault) : 0;
        if (top) { addVault(b, top); note.vault = top; b.split = note.split = true; }
        else if (b.vault === undefined && fit(inside, b.minX, b.minZ, b.maxX, b.maxZ, cap, note, ledge)) b.split = note.split = true;
      }
      for (const c of circles) {
        const inside = (x: number, z: number) => (x - c.x) ** 2 + (z - c.z) ** 2 <= c.r * c.r;
        const cap = opts.beside?.some(([x, z]) => Math.hypot(x - c.x, z - c.z) < c.r + BESIDE) ? besideTop : maxTop;
        const note = thing(c.x, c.z, c.r * 2, c.r * 2, cap);
        if (kept(inside)) continue;
        const b = { minX: c.x - c.r, maxX: c.x + c.r, minZ: c.z - c.r, maxZ: c.z + c.r };
        // A compact ground footprint can also be a taller, broad-topped prop on a post (a mailbox).
        // Keep the normal top sampling for those above a plain jump.
        const top = c.vault !== undefined ? clearance(inside, b, cap, c.vault)
          : c.r <= 0.23 ? clearance(inside, b, Math.min(cap, Hop.PEAK + TOE)) : 0;
        if (top) {
          const mid = c.r / 2, side = Math.sqrt(c.r * c.r - mid * mid);
          // Three strips approximate the circle using the same pieces as box colliders.
          addVault({ ...b, minZ: c.z - mid, maxZ: c.z + mid }, top);
          addVault({ minX: c.x - side, maxX: c.x + side, minZ: b.minZ, maxZ: c.z - mid }, top);
          addVault({ minX: c.x - side, maxX: c.x + side, minZ: c.z + mid, maxZ: b.maxZ }, top);
          note.vault = top; c.split = note.split = true;
        } else if (c.vault === undefined && fit(inside, b.minX, b.minZ, b.maxX, b.maxZ, cap, note)) c.split = note.split = true;
      }
      // the listed roofs themselves: their tops, in rows of cells of a height joined down the roof
      for (const b of listed) {
        const i0 = Math.max(0, Math.floor((b.minX - x0) / CELL)), i1 = Math.min(nx - 1, Math.floor((b.maxX - x0) / CELL));
        const k0 = Math.max(0, Math.floor((b.minZ - z0) / CELL)), k1 = Math.min(nz - 1, Math.floor((b.maxZ - z0) / CELL));
        const close = (a: number, c: number) => Math.abs(a - c) < 0.04;
        type Run = Piece & { i0: number; i1: number };
        let open: Run[] = [];
        for (let k = k0; k <= k1 + 1; k++) {
          const runs: Run[] = [];
          if (k <= k1) for (let i = i0; i <= i1; i++) {
            const t = deckTop(i, k);
            if (!(t > 0)) continue;
            const last = runs[runs.length - 1];
            if (last && last.i1 === i - 1 && close(last.top, t)) { last.i1 = i; last.maxX = x0 + (i + 1) * CELL; last.top = Math.max(last.top, t); }
            else runs.push({ i0: i, i1: i, minX: x0 + i * CELL, maxX: x0 + (i + 1) * CELL, minZ: z0 + k * CELL, maxZ: z0 + (k + 1) * CELL, top: t });
          }
          const next: Run[] = [];
          for (const o of open) {
            const r = runs.find((q) => q.i0 === o.i0 && q.i1 === o.i1 && close(q.top, o.top));
            if (r) { o.maxZ = r.maxZ; o.top = Math.max(o.top, r.top); runs.splice(runs.indexOf(r), 1); next.push(o); }
            else led.add({ minX: o.minX, maxX: o.maxX, minZ: o.minZ, maxZ: o.maxZ, top: o.top, deck: true });
          }
          open = [...next, ...runs];
        }
      }
      led.ready = true;
    };

    const v = new THREE.Vector3();
    let mi = 0, ti = 0, ri = 0;
    const work = () => {
      const t0 = performance.now();
      while (mi < meshes.length) {
        const m = meshes[mi], pos = m.geometry.attributes.position as THREE.BufferAttribute, idx = m.geometry.index;
        thin = thins.has(m);
        const ranges = collisionRanges(m.geometry), a = pos.array as Float32Array, flat = !idx && pos.itemSize === 3 && !(pos as unknown as { isInterleavedBufferAttribute?: boolean }).isInterleavedBufferAttribute && isIdentity(m.matrixWorld);
        const p = [0, 0, 0, 0, 0, 0, 0, 0, 0];
        for (; ri < ranges.length; ri++) {
          const [start, end] = ranges[ri];
          ti = Math.max(ti, start);
          for (; ti + 2 < end; ti += 3) {
            if (flat) { const o = ti * 3; tri(a[o], a[o + 1], a[o + 2], a[o + 3], a[o + 4], a[o + 5], a[o + 6], a[o + 7], a[o + 8]); }
            else {
              for (let k = 0; k < 3; k++) { v.fromBufferAttribute(pos, idx ? idx.getX(ti + k) : ti + k).applyMatrix4(m.matrixWorld); p[k * 3] = v.x; p[k * 3 + 1] = v.y; p[k * 3 + 2] = v.z; }
              tri(p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8]);
            }
            if (slice && (ti & 2047) === 0 && performance.now() - t0 > 5) { ti += 3; slice(work); return; }
          }
        }
        mi++; ti = 0; ri = 0;
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

const _a = new Float64Array(30), _b = new Float64Array(30);
/** The highest point of a triangle over a rectangle of the ground plan (−Infinity: none of it is over it). The
 *  triangle is cut down to the rectangle, side by side; what is left has its highest point at a corner. */
export function triTopInRect(ax: number, ay: number, az: number, bx: number, by: number, bz: number, cx: number, cy: number, cz: number, x0: number, z0: number, x1: number, z1: number) {
  let src = _a, dst = _b, n = 3;
  src[0] = ax; src[1] = ay; src[2] = az; src[3] = bx; src[4] = by; src[5] = bz; src[6] = cx; src[7] = cy; src[8] = cz;
  for (let side = 0; side < 4 && n > 0; side++) {
    // (which coordinate, on which side of which line)
    const c = side < 2 ? 0 : 2, lim = side === 0 ? x0 : side === 1 ? x1 : side === 2 ? z0 : z1, keepAbove = side % 2 === 0;
    let m = 0;
    for (let i = 0; i < n; i++) {
      const p = i * 3, q = ((i + 1) % n) * 3;
      const dp = keepAbove ? src[p + c] - lim : lim - src[p + c], dq = keepAbove ? src[q + c] - lim : lim - src[q + c];
      if (dp >= 0) { dst[m * 3] = src[p]; dst[m * 3 + 1] = src[p + 1]; dst[m * 3 + 2] = src[p + 2]; m++; }
      if ((dp >= 0) !== (dq >= 0)) {
        const t = dp / (dp - dq);
        dst[m * 3] = src[p] + (src[q] - src[p]) * t; dst[m * 3 + 1] = src[p + 1] + (src[q + 1] - src[p + 1]) * t; dst[m * 3 + 2] = src[p + 2] + (src[q + 2] - src[p + 2]) * t; m++;
      }
    }
    n = m;
    const sw = src; src = dst; dst = sw;
  }
  let top = -Infinity;
  for (let i = 0; i < n; i++) top = Math.max(top, src[i * 3 + 1]);
  return top;
}

function visibleSolid(m: THREE.Material | THREE.Material[]) {
  const ms = Array.isArray(m) ? m : [m];
  return ms.some((x) => x && x.visible !== false && !(x.transparent && x.opacity < 0.6));
}

function isIdentity(m: THREE.Matrix4) {
  const e = m.elements;
  return e[0] === 1 && e[5] === 1 && e[10] === 1 && e[15] === 1 && e[1] === 0 && e[2] === 0 && e[3] === 0 && e[4] === 0 && e[6] === 0 && e[7] === 0 && e[8] === 0 && e[9] === 0 && e[11] === 0 && e[12] === 0 && e[13] === 0 && e[14] === 0;
}
