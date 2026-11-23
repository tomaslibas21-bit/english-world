import { Matrix4, type Camera } from "three";
import { projectFace, type BoardFace, type FaceMode } from "../src/game/kit/boardFaces";

export function projectBoards(mode: FaceMode, faces: BoardFace[], camera: Camera, w: number, h: number) {
  const viewProjection = new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  return faces.flatMap((face) => {
    const projected = projectFace(mode, face, viewProjection, w, h);
    if (!projected || !face.opacity) return [];
    const { points } = projected;
    const left = Math.min(...points.map((p) => p.x)), right = Math.max(...points.map((p) => p.x));
    const top = Math.min(...points.map((p) => p.y)), bottom = Math.max(...points.map((p) => p.y));
    return [{ lane: face.lane, opacity: face.opacity, x: (left + right) / 2, y: (top + bottom) / 2,
      width: right - left, height: bottom - top, center: points[4],
      tilt: Math.atan2(points[1].y - points[0].y, points[1].x - points[0].x) }];
  });
}
