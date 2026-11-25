import { CHAMBERS } from "../world/slateCave";
export { CHAMBERS, GATES, KEEPERS } from "../world/slateCave";
export interface Stone { id: string; x: number; z: number; /** Its glyph faces this way (radians, 0: +z). */ rot: number }
export interface Chamber {
  id: string; n: number;
  label: Readonly<{ en: string; lt: string }>;
  x: number; z: number; rx: number; rz: number;
  /** How high its roof is in the middle (m). */
  ceil: number;
  stones: Stone[];
}
export interface Gate {
  id: string; x: number; z: number; rot: number; w: number;
  label: Chamber["label"];
  keeper?: string; stones?: number; tide?: number; pass?: string; to?: number; bridge?: boolean;
}
export interface Passage { ax: number; az: number; bx: number; bz: number; w: number }
export interface Pool { x: number; z: number; rx: number; rz: number; dryStrip?: number; /** One wades through it (a ford); else its rim keeps one out. */ ford?: boolean;
  /** Water that is only drawn (under a bridge's deck): nothing of the ground plan. */ deck?: boolean }

/** The ways between the chambers (and the way in), as wide as given (m). */
export const PASSAGES: Passage[] = [
  { ax: 0, az: 11.5, bx: 0, bz: -10, w: 6.6 },         // dry entry passage
  { ax: -6, az: -40, bx: -12, bz: -53, w: 5.2 },       // 1 → 2
  { ax: -14, az: -75, bx: -9, bz: -89, w: 5.2 },       // 2 → 3
  { ax: 0, az: -113, bx: 9, bz: -126, w: 5.2 },        // 3 → 4
  { ax: 13, az: -148, bx: 8, bz: -162, w: 5.4 },       // 4 → 5
  { ax: 2.4, az: -0.4, bx: 9.8, bz: -2.3, w: 3.3 },    // the cleft off the way in: to the side exit
];

/** Water that glows: the lagoon of the first hall, pools, the river (a chain of pools: its bridge is its ford), the
 *  heart's lake (its stepping stones are its ford). */
export const POOLS: Pool[] = [
  { x: 0, z: 8.6, rx: 3.6, rz: 5.2, ford: true, dryStrip: 1.65 },
  { x: 10.2, z: -22.5, rx: 5.6, rz: 7.2 },
  { x: 5.6, z: -38.2, rx: 2.6, rz: 2.0 },
  { x: -22.5, z: -67.5, rx: 3.4, rz: 2.6 },
  { x: -10.4, z: -57.6, rx: 2.4, rz: 3.0 },
  // the river across the third chamber, wall to wall, and the water under the bridge of roots (BRIDGE)
  { x: -15.8, z: -101.2, rx: 8.2, rz: 2.4 }, { x: 4.8, z: -101.6, rx: 9.2, rz: 2.5 }, { x: -6, z: -101.4, rx: 3, rz: 2.0, deck: true },
  { x: 20.2, z: -142.8, rx: 3.0, rz: 2.4 },
  // the heart's lake round the island (the island is the tree's, in the middle)
  { x: 6, z: -180, rx: 11.2, rz: 9.2, ford: true },
];
/** The bridge of roots over the river (its deck: x from … to, z from … to). */
export const BRIDGE = { x0: -7.5, x1: -4.5, z0: -104.6, z1: -98.2 };
/** The island in the heart's lake, and the great trees (the first hall's tree and the old tree on its island). */
export const ISLAND = { x: 6, z: -180, r: 4.3 };
export const TREES = [{ x: 0, z: -25, r: 1.15, h: 13.5 }, { x: 6, z: -180, r: 1.5, h: 10.5 }];
/** The opening above the first hall's tree. */
export const EYE = { x: 0, z: -25, r: 4.2 };
/** The falls (where their water lands, how wide, how high they start). */
export const FALLS = [{ x: 5.6, z: -41.2, w: 2.6, h: 8.5, rot: 0 }, { x: -27.2, z: -66.5, w: 1.6, h: 6.5, rot: Math.PI / 2 }, { x: 6, z: -193.6, w: 3.2, h: 11, rot: 0 }];
/** The pale footpath through the chambers. */
export const PATH: [number, number][] = [
  [0, 3.2], [0, -7.6], [-0.4, -14], [-2.6, -21], [-3.4, -29], [-5.2, -36], [-6, -40], [-9, -46.5], [-12, -53], [-14.5, -60], [-15, -68],
  [-14, -75], [-11.5, -82], [-9, -89], [-6.5, -95], [-6, -101.4], [-5, -107], [0, -113], [4.5, -119.5], [9, -126], [13, -134], [14, -142],
  [13, -148], [10.5, -155], [8, -162], [6.4, -168],
];

export const ENTRY = { x: 0, z: 2.2, rot: Math.PI };
export const EXIT = { x: 0, z: 6.4 };
export const EXITS = [
  { id: "main", x: EXIT.x, z: EXIT.z, reach: 2.6, push: 1.5, dir: [0, 1] },
  { id: "cleft", x: 9.2, z: -2.2, reach: 2.4, push: 1, dir: [1, -0.25] },
] as const;
export const SPAWNS = { main: ENTRY, cleft: { x: 1.2, z: -0.7, rot: Math.PI } };
export const EYE2 = { x: 0, z: 9.2, r: 1.8 };
export const BOUNDS = { minX: -34, maxX: 34, minZ: -198, maxZ: 16 };

// ------------------------------------------------------------------------------------------------- the ground plan

const segDist = (x: number, z: number, p: Passage) => {
  const dx = p.bx - p.ax, dz = p.bz - p.az, t = Math.max(0, Math.min(1, ((x - p.ax) * dx + (z - p.az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - p.ax - dx * t, z - p.az - dz * t);
};
/** How far inside the cave (x, z) is (m; negative: in the rock): the chambers' ovals and the passages between them. */
export function inside(x: number, z: number) {
  let best = -99;
  for (const c of CHAMBERS) {
    if (Math.abs(z - c.z) > c.rz + 2 || Math.abs(x - c.x) > c.rx + 2) continue;
    const k = Math.hypot((x - c.x) / c.rx, (z - c.z) / c.rz);
    best = Math.max(best, (1 - k) * Math.min(c.rx, c.rz));
  }
  for (const p of PASSAGES) best = Math.max(best, p.w / 2 - segDist(x, z, p));
  return best;
}
/** The chamber (x, z) is in or nearest to (its index). */
export function chamberAt(x: number, z: number) {
  let best = 0, bd = Infinity;
  for (let i = 0; i < CHAMBERS.length; i++) {
    const c = CHAMBERS[i];
    const d = Math.hypot((x - c.x) / c.rx, (z - c.z) / c.rz);
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}
/** The roof over (x, z) (m): low at the walls, high in the middle of a chamber, a passage's own height. */
export function roofY(x: number, z: number) {
  const d = Math.max(0, inside(x, z));
  let top = 5.2;
  for (const c of CHAMBERS) {
    const k = Math.hypot((x - c.x) / c.rx, (z - c.z) / c.rz);
    if (k < 1) top = Math.max(top, 5.2 + (c.ceil - 5.2) * (1 - k * k) ** 0.8);
  }
  const lip = Math.min(1, d / 4.5);
  return 3.9 + (top - 3.9) * lip * (2 - lip) + 0.5 * Math.sin(x * 0.7 + z * 0.33) * Math.cos(z * 0.52 - x * 0.21);
}
/** The pool at (x, z), if any (`grow`: metres added to its rim). */
export function poolContains(p: Pool, x: number, z: number, grow = 0) {
  return Math.abs(x - p.x) >= (p.dryStrip ?? 0) && ((x - p.x) / (p.rx + grow)) ** 2 + ((z - p.z) / (p.rz + grow)) ** 2 < 1;
}
export function poolAt(x: number, z: number, grow = 0): Pool | null {
  for (const p of POOLS) if (!p.deck && poolContains(p, x, z, grow)) return p;
  return null;
}
/** What is underfoot (m): the cave's floor, ankle-deep under a ford's water, the island a little proud of its lake. */
export function floorY(x: number, z: number) {
  if (Math.hypot(x - ISLAND.x, z - ISLAND.z) < ISLAND.r) return 0.12;
  const p = poolAt(x, z);
  if (!p?.ford) return 0;
  const k = Math.hypot((x - p.x) / p.rx, (z - p.z) / p.rz);
  return -0.2 * Math.min(1, (1 - k) * 5);
}
/** One can stand at (x, z) with `r` m to spare: inside the rock's walls, out of the deep pools, off the trees. */
export function walkable(x: number, z: number, r = 0.38) {
  if (inside(x, z) < r) return false;
  const p = poolAt(x, z, r * 0.6);
  if (p && !p.ford && !(x > BRIDGE.x0 + r * 0.5 && x < BRIDGE.x1 - r * 0.5 && z > BRIDGE.z0 && z < BRIDGE.z1)) return false;
  for (const t of TREES) if (Math.hypot(x - t.x, z - t.z) < t.r + r) return false;
  return true;
}

