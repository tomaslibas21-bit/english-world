import { Vector3, type PerspectiveCamera } from "three";
import { fitStageArea, stageHeadBounds } from "../kit/stageArea";
import { BETOS_STAND, CALLER_CARD } from "./location";

export const BETO_STAGE_YAW = -2.1;
export const TONA_STAGE_YAW = -2.9;
export const HOLDER_AT = new Vector3(CALLER_CARD.x, CALLER_CARD.y, CALLER_CARD.z);

export function loteriaShot(score = false) {
  if (score) return { pos: new Vector3(18.65, 2.13, -30.7), look: new Vector3(23.6, 1.76, -28.95), rate: 3, fov: 47 };
  // From the caller's end of the tables, with the kiosco beyond him.
  return { pos: new Vector3(22.75, 1.7, -31.5), look: new Vector3(24.45, 1.54, -29.45), rate: 5, fov: 50 };
}

export function loteriaHeadBounds(at: Vector3) {
  return stageHeadBounds(at).flatMap((p) => [-0.25, 0.25].map((z) => p.clone().add(new Vector3(0, 0, z))));
}

export function frameLoteria(camera: PerspectiveCamera, width: number, height: number,
  area: Pick<DOMRectReadOnly, "left" | "top" | "width" | "height">, beto: Vector3, tona: Vector3, score: boolean) {
  const { x, z } = BETOS_STAND;
  // Leave some room on Beto's left so the two heads don't define the centre of the shot.
  const points = [
    ...loteriaHeadBounds(beto), ...loteriaHeadBounds(tona),
    new Vector3(x, beto.y, z - (score ? 2.58 : 0.94)),
    HOLDER_AT.clone().add(new Vector3(0, -0.26, 0.22)),
    HOLDER_AT.clone().add(new Vector3(0, 0.26, -0.22)),
  ];
  if (score) {
    // The lower edge of the caller's table and the string of bulbs above it.
    points.push(new Vector3(x, 0.8, z + 0.67), new Vector3(x, 2.8, -29.4));
  } else if (area.width > 400) {
    // Keep the waist in the wide shot. The phone strip can crop closer to the face.
    points.push(beto.clone().setY(0.87));
  }
  fitStageArea(camera, width, height, area, points);
}
