// The island's ground plan, shared by the renderer, foot travel, boat physics and maps.
import { RIDES } from "./rides";

export type IslandPoint = { x: number; z: number };
export type Jetty = { x0: number; x1: number; z0: number; z1: number; y: number };

export interface IslandPlan {
  name: string;
  lt: string;
  center: IslandPoint;
  /** A convex ring in counterclockwise order in x/z coordinates. */
  outline: IslandPoint[];
  y: number;
  jetty: Jetty;
  /** A clear berth to restore a boat to when resuming a saved visit on the island. */
  berth: IslandPoint & { rot: number };
  cottage: IslandPoint & { w: number; d: number };
  bench: IslandPoint;
  keeper: IslandPoint & { approach: IslandPoint; says: string; repeat: string };
}

// Other editions' rides data need not declare an island.
export const LIGHTHOUSE_ISLAND = (RIDES as typeof RIDES & { island?: IslandPlan }).island;
export const TOWER_FOOT = 3.25;

function coast(island: IslandPlan, x: number, z: number) {
  let nearest = Infinity, nx = 0, nz = 0;
  const ring = island.outline;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length];
    const dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz);
    const distance = (dx * (z - a.z) - dz * (x - a.x)) / len;
    if (distance < nearest) { nearest = distance; nx = dz / len; nz = -dx / len; }
  }
  return { distance: nearest, nx, nz };
}

/** The height of dry ground or boards, or undefined over open water. */
export function islandGroundY(island: IslandPlan, x: number, z: number): number | undefined {
  const d = island.jetty;
  if (x >= d.x0 && x <= d.x1 && z >= d.z0 && z <= d.z1) return d.y;
  const ring = island.outline;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length];
    if ((b.x - a.x) * (z - a.z) < (b.z - a.z) * (x - a.x)) return undefined;
  }
  return island.y;
}

/** Clear the full rocky shoreline, with room for a hull section or a swimmer's shoulders. */
export function clearIslandCoast(island: IslandPlan, p: IslandPoint, radius: number) {
  if (Math.abs(p.x - island.center.x) > 24 || Math.abs(p.z - island.center.z) > 18) return;
  const { distance, nx, nz } = coast(island, p.x, p.z);
  if (distance < -radius) return;
  p.x += nx * (distance + radius);
  p.z += nz * (distance + radius);
}

/** Where a stopped boat can set its rider down. Reach is measured from the hull, like boarding. */
export function jettyStop(jetty: Jetty, x: number, z: number, reach: (x: number, z: number) => number) {
  const inset = 0.75;
  const px = Math.max(jetty.x0 + inset, Math.min(x, jetty.x1 - inset));
  const pz = Math.max(jetty.z0 + inset, Math.min(z, jetty.z1 - inset));
  return reach(px, pz) < 1.6 ? { x: px, y: jetty.y, z: pz } : null;
}
