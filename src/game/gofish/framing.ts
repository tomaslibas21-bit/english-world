import { PerspectiveCamera, Vector3 } from "three";

export const DINING = { x: 1.5, z: -1.5, surface: 0.79 };
export const DINNER_PROPS = "dans-house-dinner-props";
export const DINING_SEATS = {
  dan: { x: 0.83, z: -2.43, rot: 0.16 },
  nora: { x: 2.17, z: -2.43, rot: -0.16 },
  learner: { x: 1.5, z: -0.54, rot: Math.PI },
  spare: { x: -0.19, z: -1.5, rot: Math.PI / 2 },
};
export const GOFISH_PROMPT = { x: 1.5, z: 0.25, rot: Math.PI };
export const SEAT_HEIGHT = 0.5;

export function diningShot() {
  return {
    pos: new Vector3(DINING.x, 2.18, DINING.z + 3.1),
    look: new Vector3(DINING.x, 1.14, DINING.z),
  };
}

export function hostBounds(face: Vector3) {
  // Budget for shoulders, hair and the depth of the head as the hosts look around.
  return [-0.44, 0.44].flatMap((x) => [DINING.surface, face.y + 0.33].flatMap((y) =>
    [-0.34, 0.23].map((z) => new Vector3(face.x + x, y, face.z + z))));
}

/** Fit both seated hosts and the tabletop between the cue and the name tags. */
export function fitDiningView(camera: PerspectiveCamera, width: number, height: number,
  top: number, bottom: number, points: readonly Vector3[]) {
  camera.zoom = 1;
  camera.aspect = width / height;
  camera.clearViewOffset();
  camera.updateMatrixWorld();
  const map = points.map((v) => v.clone().project(camera));
  const x = map.map((v) => v.x), y = map.map((v) => v.y);
  const left = Math.min(...x), right = Math.max(...x), low = Math.min(...y), high = Math.max(...y);
  const sideMargin = Math.min(48, width * 0.1);
  const zoom = Math.min(1.25, (width - 2 * sideMargin) / ((right - left) * width / 2),
    Math.max(32, bottom - top - 24) / ((high - low) * height / 2));
  const offsetX = (left + right) * width * zoom / 4;
  const offsetY = (height - top - bottom) / 2 - (high + low) * height * zoom / 4;
  camera.zoom = zoom;
  camera.setViewOffset(width, height, offsetX, offsetY, width, height);
}
