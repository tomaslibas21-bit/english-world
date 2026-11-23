// The lift pulls off the shared roadbed. The authored path faces west in these coordinates.
import { Vector3 } from "three";
import { ROAD_EDITION } from "../../content/road";
import { ASPHALT_END, exitToTown, roadHeight } from "../world/roadExit";

export function turnoutPoint(x: number, y: number, z: number) {
  return new Vector3(-z, y, x - ASPHALT_END).applyMatrix4(exitToTown);
}

export const turnoutHeight = (x: number) => roadHeight(ASPHALT_END - x);
export const turnoutYaw = (heading: number) => heading + ROAD_EDITION.edge.outward + Math.PI / 2;
