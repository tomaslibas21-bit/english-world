import { Vector3, type PerspectiveCamera } from "three";

/** Fit world points in the unobstructed part of a full-viewport stage. */
export function fitStageArea(camera: PerspectiveCamera, width: number, height: number,
  area: Pick<DOMRectReadOnly, "left" | "top" | "width" | "height">, points: readonly Vector3[]) {
  camera.zoom = 1;
  camera.clearViewOffset();
  camera.updateMatrixWorld();

  const projected = points.map((p) => p.clone().project(camera));
  const xs = projected.map(({ x }) => (x + 1) * width / 2);
  const ys = projected.map(({ y }) => (1 - y) * height / 2);
  const left = Math.min(...xs), right = Math.max(...xs), top = Math.min(...ys), bottom = Math.max(...ys);
  const padding = 12;
  const zoom = Math.min(1.35, Math.max(1, area.width - 2 * padding) / Math.max(1, right - left),
    Math.max(1, area.height - 2 * padding) / Math.max(1, bottom - top));
  const x = width / 2 + ((left + right) / 2 - width / 2) * zoom;
  const y = height / 2 + ((top + bottom) / 2 - height / 2) * zoom;

  camera.zoom = zoom;
  camera.setViewOffset(width, height, x - (area.left + area.width / 2), y - (area.top + area.height / 2), width, height);
}

export function stageHeadBounds(at: Vector3) {
  return [-0.27, 0.27].flatMap((x) => [-0.21, 0.28].map((y) => at.clone().add(new Vector3(x, y, 0))));
}
