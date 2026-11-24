import { Box3, type Object3D } from "three";
import { Ledges, type Piece } from "./ledges";
import { OcclusionField } from "./occlusion";
import { OUTDOOR_NPCS, WORLD } from "./world/layout";
import type { Town } from "./world/town";

export const TOWN_FIELD_BOUNDS = {
  minX: WORLD.minX - 24, maxX: WORLD.maxX + 24, minZ: WORLD.minZ - 24, maxZ: WORLD.maxZ + 24,
};

function skipsLedges(town: Town, o: Object3D) {
  return o.userData.v !== undefined || !!o.userData.gull || !!o.userData.boat || o === town.parkedCars.group;
}

export function townCameraSkip(town: Town) {
  return (o: Object3D) => skipsLedges(town, o) || !!o.userData.thin;
}

export function buildTownField(town: Town) {
  const field = OcclusionField.fromObject(town.group, TOWN_FIELD_BOUNDS, { skip: townCameraSkip(town) });
  field.fillFootprints(town.colliders.boxes, town.colliders.circles);
  return field;
}

export function buildTownLedges(town: Town, field: OcclusionField, slice?: (next: () => void) => void) {
  return Ledges.build(town.group, town.colliders, {
    skip: (o) => skipsLedges(town, o),
    thin: (o) => !!o.userData.thin,
    keep: town.seats.filter((s) => s.table).map((s) => [s.x, s.z]),
    tall: (x, z) => field.overSolid(x, z),
    beside: OUTDOOR_NPCS.flatMap((n): [number, number][] =>
      n.ax !== undefined && n.az !== undefined ? [[n.x, n.z], [n.ax, n.az]] : [[n.x, n.z]]),
  }, slice);
}

/** Rides move their own hulls. Scenery hulls precede the pieces added by the sliced build. */
export function sceneryBoatPieces(town: Town) {
  const hull = new Box3(), pieces: Piece[] = [];
  for (const o of town.group.children) if (o.userData.boat && !o.userData.rideBoat) {
    hull.setFromObject(o);
    pieces.push({ minX: hull.min.x, maxX: hull.max.x, minZ: hull.min.z, maxZ: hull.max.z, top: Infinity });
  }
  return pieces;
}
