import { PerspectiveCamera, Vector3 } from "three";
import type { CameraRig } from "../camera";

// Try three-quarter views first, then work around the subjects if the street is tight.
const ANGLES = [55, -55, 35, -35, 75, -75, 15, -15, 0, 95, -95, 120, -120, 150, -150, 180];

export function scoreShot(
  subject: Vector3, heading: number, aspect: number, space: CameraRig["space"],
  blocked: (x: number, z: number) => boolean, beside?: Vector3,
): CameraRig["stage"] {
  // Leave room around both subjects, including on a portrait screen with the narrower follow lens during the fade.
  const frame = new PerspectiveCamera(50, aspect);
  const projected = new Vector3();
  const subjects = beside ? [subject, beside] : [subject];
  const groups = beside ? [subjects, [subject], [beside]] : [subjects];
  for (const points of groups) {
    const look = points[0].clone();
    if (points.length === 2) look.lerp(points[1], 0.5);
    for (const height of [2, 2.9]) {
      for (const distance of [6.5, 7.5, 5.5, 9]) {
        for (const offset of ANGLES) {
          const yaw = heading + offset * Math.PI / 180;
          const pos = new Vector3(look.x + Math.sin(yaw) * distance, look.y + height, look.z + Math.cos(yaw) * distance);
          if (blocked(pos.x, pos.z) || space?.overSolid(pos.x, pos.z) || space?.inside(pos)) continue;
          if (subjects.some((point) => pos.distanceToSquared(point) < 25)) continue;
          if (space && points.some((point) => space.free(point, pos) < 1)) continue;
          frame.position.copy(pos);
          frame.lookAt(look);
          frame.updateMatrixWorld();
          if (points.some((point) => Math.abs(projected.copy(point).project(frame).x) > 0.8)) continue;
          return { pos, look, rate: 4 };
        }
      }
    }
  }
  return null;
}
