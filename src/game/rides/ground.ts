// The town's drivable ground: its streets (layout.ts ROADS) and the lots the town's plan adds (world/rides.ts).
import { ROADS } from "../world/layout";
import { Drivable, CAR, type Rect } from "./drive";

/** The streets as rectangles. */
export const roadRects = (): Rect[] => ROADS.map((r) => (r.z1 === r.z2
  ? { x0: Math.min(r.x1, r.x2), x1: Math.max(r.x1, r.x2), z0: r.z1 - r.w / 2, z1: r.z1 + r.w / 2 }
  : { x0: r.x1 - r.w / 2, x1: r.x1 + r.w / 2, z0: Math.min(r.z1, r.z2), z1: Math.max(r.z1, r.z2) }));

/** Where a car's middle line may be: the streets and `lots`, drawn in by almost half a car's width (its wheels stay
 *  on the asphalt, a tire's breadth of the kerb to spare). */
export const townDrivable = (lots: Rect[]) => new Drivable([...roadRects(), ...lots], CAR.wide - 0.12);
