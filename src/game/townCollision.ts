import { Box3, type Object3D } from "three";
import type { Ambient } from "./ambient";
import { Ledges, type Piece } from "./ledges";
import { OcclusionField } from "./occlusion";
import type { Rides } from "./rides/Rides";
import { OUTDOOR_NPCS, WORLD } from "./world/layout";
import { THEME } from "./world/theme";
import type { Town } from "./world/town";

// The cenote opens up more of the west for walking, with its own margin for the camera.
export const TOWN_WEST = THEME.cenote?.open ? 50 : 0;
export const TOWN_FIELD_BOUNDS = {
  minX: WORLD.minX - 24 - TOWN_WEST / 2, maxX: WORLD.maxX + 24,
  minZ: WORLD.minZ - 24, maxZ: WORLD.maxZ + 24,
};

function moves(town: Town, o: Object3D) {
  return o.userData.v !== undefined || !!o.userData.gull || !!o.userData.boat || o === town.parkedCars.group;
}

export function townCameraSkip(town: Town) {
  // Thin scenery is transparent to the camera and still counts as overhead cover for ledges.
  return (o: Object3D) => moves(town, o) || !!o.userData.thin;
}

export function buildTownField(town: Town) {
  const field = OcclusionField.fromObject(town.group, TOWN_FIELD_BOUNDS, { skip: townCameraSkip(town) });
  field.fillFootprints(town.colliders.boxes, town.colliders.circles);
  return field;
}

export function buildTownLedges(town: Town, field: OcclusionField, slice?: (next: () => void) => void) {
  return Ledges.build(town.group, town.colliders, {
    skip: (o) => moves(town, o),
    thin: (o) => !!(o.userData.thin || o.userData.roofOnly),
    keep: town.seats.filter((s) => s.table).map((s) => [s.x, s.z]),
    tall: (x, z) => field.overSolid(x, z),
    beside: OUTDOOR_NPCS.flatMap((n): [number, number][] =>
      n.ax !== undefined && n.az !== undefined ? [[n.x, n.z], [n.ax, n.az]] : [[n.x, n.z]]),
  }, slice);
}

/** The sliced scan adds its pieces after the scenery hulls. Ride boats use moving collision boxes. */
export function sceneryBoatPieces(town: Town) {
  const hull = new Box3(), pieces: Piece[] = [];
  for (const o of town.group.children) if (o.userData.boat && !o.userData.rideBoat) {
    hull.setFromObject(o);
    pieces.push({ minX: hull.min.x, maxX: hull.max.x, minZ: hull.min.z, maxZ: hull.max.z, top: Infinity });
  }
  return pieces;
}

/** Resolve the traffic first, followed by the driveable cars, each at its current position. */
export function townLedgeDynamics(
  traffic: Pick<Ambient, "carPieces">,
  rides: Pick<Rides, "townCarPieces">,
): NonNullable<Ledges["dynamic"]> {
  return (x, z) => {
    const moving = traffic.carPieces(x, z);
    const parked = rides.townCarPieces(x, z);
    return parked.length ? moving.concat(parked) : moving;
  };
}
