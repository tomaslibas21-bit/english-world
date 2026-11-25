// The town's ground for a car: its asphalt (layout.ts ROADS and the lots the town's plan adds, world/rides.ts) and
// everything else open and dry.
import { ROADS, WORLD } from "../world/layout";
import { exitCoordinates, keepOnExit } from "../world/roadExit";
import { BAY, floorY, poolAt, sandY, SEA_LEVEL, SHORE, waterY } from "../water";
import type { CarWaterPlan } from "../world/rides";
import { Drivable, CAR, type Rect } from "./drive";

/** The streets as rectangles. */
export const roadRects = (): Rect[] => ROADS.map((r) => (r.z1 === r.z2
  ? { x0: Math.min(r.x1, r.x2), x1: Math.max(r.x1, r.x2), z0: r.z1 - r.w / 2, z1: r.z1 + r.w / 2 }
  : { x0: r.x1 - r.w / 2, x1: r.x1 + r.w / 2, z0: Math.min(r.z1, r.z2), z1: Math.max(r.z1, r.z2) }));

/** The asphalt: the streets and `lots`. A car may pick up speed on it; where it ends is a kerb. */
export const townAsphalt = (lots: Rect[]) => new Drivable([...roadRects(), ...lots]);

/** Where a car may be at all (since 15 Nov 2026: anywhere in the town that is open and dry; what stands there, the
 *  ground plan keeps it out of): the town's own ground, a car's half width in from its edges, and no nearer the sea
 *  than the dry sand. */
export const townGround = () => new Drivable([{ x0: WORLD.minX + CAR.wide + 0.4, x1: WORLD.maxX - CAR.wide - 0.4, z0: SHORE.top + CAR.wide + 0.5, z1: WORLD.maxZ - CAR.wide - 0.4 }]);

/** Occupied car envelope for shore recovery. The town's solid colliders still bound these rectangles. */
export function townCarWaterGround({ mainland, extraRects }: CarWaterPlan) {
  const inset = CAR.wide + 0.4;
  return new Drivable([
    { x0: mainland.x0 + inset, x1: mainland.x1 - inset, z0: BAY.z0, z1: mainland.z1 - inset },
    ...extraRects,
  ]);
}

/** A dry mainland point, including the open west grounds. Check clearance and slope separately for the whole pair. */
export function isTownCarDryMainland(ground: Drivable, x: number, z: number, time: number) {
  if (!ground.has(x, z) || poolAt(x, z)) return false;
  const live = waterY(x, z, time);
  return live === null || Math.min(sandY(x, z), floorY(x, z)) >= Math.max(SEA_LEVEL, live);
}

/** Only a car admitted by the road nose trigger may leave the normal ground through this opening. */
export function settleRoadExit(ground: Drivable, point: { x: number; z: number }, radius: number, admitted: boolean) {
  if (admitted && exitCoordinates(point.x, point.z).s >= -33) keepOnExit(point, radius);
  else ground.nearest(point.x, point.z, point);
}
