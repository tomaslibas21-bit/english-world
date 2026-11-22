// Coordinates shared by the cenote geometry, maps and guidance.
import { THEME } from "../world/theme";

/** The cenote's water is `R` across its half (mexican.ts `cenote`). */
export const R = 6;
/** How far the grounds reach from the cenote's middle (m): north and south, and west; east they reach the town. */
export const REACH = { ns: 19.5, w: 20.5 };
/** The grounds' rectangle west of the town's edge (where one may walk: the dev audits ask). */
export const groundsBounds = (x: number, z: number, edge: number) => ({ minX: x - REACH.w, maxX: edge, minZ: z - REACH.ns, maxZ: z + REACH.ns });
/** The gaps in the rim of stones on the town's side (the angle of each from the cenote's middle, 0: east, and its half
 *  width, radians): the beach at the north-east, the rock steps at the south-east. */
export const GAPS = [{ id: "playa", a: -0.27 * Math.PI, half: 0.46 }, { id: "escalones", a: 0.27 * Math.PI, half: 0.46 }] as const;
/** El Salto: the ledge on the cliff's top at the west (its height, m), the stair of stones up to it from behind. */
export const SALTO = { y: 4.6, half: 1.5, top0: 5.3, top1: 8.2, foot: 13.4 };
/** The sinkhole's pit (m). */
export const OJO = { r: 1.45, deep: 1.5 };

export const ang = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
/** A point `d` m from (x, z) towards angle `a` (0: east, π/2: south). */
export const polar = (x: number, z: number, a: number, d: number): [number, number] => [x + Math.cos(a) * d, z + Math.sin(a) * d];

export interface Way {
  id: "boca" | "grieta" | "ojo";
  /** Where it is in the town, and from how near it is offered. */
  x: number; z: number; reach: number;
  /** The cave's mouth is swum up to; the sinkhole is stepped into (it drops one in). */
  swim?: boolean; drop?: boolean;
  /** Where coming back out of the grotto puts one, and which of its exits leads here. */
  out: { x: number; z: number; rot: number }; exit: "agua" | "grieta";
}

/** The ways into the grotto from the cenote at (x, z). */
export function ways(x: number, z: number): Way[] {
  const [gx, gz] = polar(x, z, 0.68 * Math.PI, 9.7), [ox, oz] = polar(x, z, 1.3 * Math.PI, 13);
  const facing = (fx: number, fz: number, tx: number, tz: number) => Math.atan2(tx - fx, tz - fz);
  return [
    { id: "boca", x: x - R + 1.25, z, reach: 2.3, swim: true, out: { x: x - R + 2.9, z, rot: Math.PI / 2 }, exit: "agua" },
    { id: "grieta", x: gx, z: gz, reach: 2.4, out: { x: gx + (gx - x) * 0.12, z: gz + (gz - z) * 0.12, rot: facing(x, z, gx, gz) }, exit: "grieta" },
    // (out of the grotto by its water: the cave's mouth, a few strokes from the sinkhole)
    { id: "ojo", x: ox, z: oz, reach: 3, drop: true, out: { x: x - R + 2.9, z, rot: Math.PI / 2 }, exit: "agua" },
  ];
}

/** The trail round the cenote's jungle side, as points (from the clearing's south, round the west, to its north). */
export function trail(x: number, z: number): [number, number][] {
  return ([[0.34, 10.4], [0.5, 10.4], [0.62, 10.6], [0.74, 11.2], [0.86, 13.6], [1.0, 15.6], [1.14, 15], [1.26, 15.4], [1.39, 13.2], [1.5, 10.8], [1.64, 10.2]] as [number, number][])
    .map(([a, d]) => polar(x, z, a * Math.PI, d));
}

/** Is the rim open at angle `a` (a gap to walk down through)? And the cliff's top at the ledge (`ledge`)? */
export const inGap = (a: number) => GAPS.some((g) => Math.abs(ang(a - g.a)) < g.half);
export const atLedge = (a: number, half = 0.34) => Math.abs(ang(a - Math.PI)) < half;

export const CAVE_ZONE = "gruta";
/** The ways into the grotto from the town: the cave's mouth, swum up to (and on into); with the cenote's grounds open
 *  (theme `cenote.open`, grounds.ts) also La Grieta, walked into, and El Ojo, which drops one in. */
export function caveWays(): Way[] {
  const c = THEME.cenote;
  if (!c?.grotto) return [];
  return c.open ? ways(c.x, c.z) : [{ id: "boca", x: c.x - R + 1.25, z: c.z, reach: 2.3, swim: true, out: { x: c.x - R + 2.9, z: c.z, rot: Math.PI / 2 }, exit: "agua" }];
}

/** The cleft provides a dry route both ways. The mouth is available in editions with only the swimming entry. */
export function preferredCaveEntry(): Way | undefined {
  const entrances = caveWays();
  return entrances.find((way) => way.id === "grieta") ?? entrances[0];
}
