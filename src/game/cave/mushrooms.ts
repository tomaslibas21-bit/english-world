import { Color } from "three";

const RIM = new Color("#d3cab0"), FLECK = new Color("#e8f2d6");

/** Paint the existing 7×4 hemisphere facets: a shaded lower rim and three small pale cap flecks. */
export function finishMushroomCap(color: Color, triangle: number) {
  // The pole has seven faces; each of the three following rings has fourteen.
  if (triangle >= 35) color.lerp(RIM, 0.35).multiplyScalar(0.8);
  else if (triangle === 8 || triangle === 12 || triangle === 29) color.lerp(FLECK, 0.72);
}
