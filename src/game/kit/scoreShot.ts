import { type Box3, PerspectiveCamera, Ray, Vector3 } from "three";
import { stageFov, type CameraRig } from "../camera";

// Try three-quarter views first, then work around the subjects if the street is tight.
const ANGLES = [55, -55, 35, -35, 75, -75, 15, -15, 0, 95, -95, 120, -120, 150, -150, 180];
const FRAME_EDGE = 0.85;
const PORTRAIT_CARD_TOP = 0.5; // projected y, with the centre of the viewport at zero

function corners(box: Box3) {
  return [box.min.x, box.max.x].flatMap((x) => [box.min.y, box.max.y].flatMap((y) =>
    [box.min.z, box.max.z].map((z) => new Vector3(x, y, z))));
}

export function scoreShot(
  subject: Box3, heading: number, aspect: number, space: CameraRig["space"],
  blocked: (x: number, z: number) => boolean, beside?: Box3,
): CameraRig["stage"] {
  const portrait = aspect < 0.87;
  const fov = portrait ? 68 : stageFov(aspect);
  const frame = new PerspectiveCamera(fov, aspect, 0.1, 900);
  const sample = new Vector3(), ray = new Ray();
  const learner = subject.getCenter(new Vector3());
  const chest = learner.clone().setY(subject.max.y - 0.5);
  const heights = portrait ? [3.5, 4, 3.1, 4.5] : [3.25, 4, 4.5];
  const distances = portrait ? [10, 11, 12, 9, 14, 16, 19] : [8, 9, 10, 12, 14];
  const groups = beside ? [[subject, beside], [beside]] : [[subject]];
  for (const group of groups) {
    const points = group.map((box) => box === subject ? chest : box.getCenter(new Vector3()));
    const vertices = group.flatMap(corners);
    const look = group[0].getCenter(new Vector3());
    if (group.length === 2) look.lerp(points[1], 0.5);
    let best: CameraRig["stage"] = null;
    let highestBottom = -Infinity;
    for (const distance of distances) {
      for (const height of heights) {
        for (const offset of ANGLES) {
          const yaw = heading + offset * Math.PI / 180;
          const pos = new Vector3(look.x + Math.sin(yaw) * distance, subject.min.y + height, look.z + Math.cos(yaw) * distance);
          if (blocked(pos.x, pos.z) || space?.overSolid(pos.x, pos.z) || space?.inside(pos)) continue;
          if (subject.distanceToPoint(pos) < 5 || (beside && beside.distanceToPoint(sample.copy(pos).setY(beside.min.y)) < 5)) continue;
          if (space && points.some((point) => space.free(point, pos) < 1)) continue;
          if (beside && points.includes(chest)) {
            ray.set(pos, sample.subVectors(chest, pos).normalize());
            const hit = ray.intersectBox(beside, sample);
            if (hit && pos.distanceToSquared(hit) < pos.distanceToSquared(chest)) continue;
          }
          frame.position.copy(pos);
          frame.lookAt(look);
          frame.updateMatrixWorld();
          const projected = vertices.map((v) => v.clone().project(frame));
          if (projected.some(({ x, z }) => Math.abs(x) > FRAME_EDGE || Math.abs(z) > 1)) continue;
          const top = Math.max(...projected.map(({ y }) => y));
          const bottom = Math.min(...projected.map(({ y }) => y));
          if (!portrait) {
            if (top <= FRAME_EDGE && bottom >= -FRAME_EDGE) return { pos, look, rate: 4, fov };
            continue;
          }
          // Shift the entire view upward while keeping the roof and the learner's head inside the frame.
          const shiftY = (FRAME_EDGE - 0.01 - top) / 2;
          const visibleBottom = bottom + 2 * shiftY;
          const shot = { pos, look, rate: 4, fov, shiftY };
          if (visibleBottom >= PORTRAIT_CARD_TOP) return shot;
          if (visibleBottom >= -FRAME_EDGE && visibleBottom > highestBottom) {
            best = shot;
            highestBottom = visibleBottom;
          }
        }
      }
    }
    if (best) return best;
  }
  return null;
}
