import { PerspectiveCamera, Vector3 } from "three";
import { covers, shoulderShots, type Shot } from "../talkShot";
import { CUP_AT } from "./props";

export const COUNTER_SEAT = new Vector3(-1.12, 0, -1.95);
export const MIA_ASIDE = new Vector3(0, 0, -4.4);
const FOCUS = new Vector3(-1.15, 1.32, -2.63);
const SHOULDER_ANGLES = [44, 47, 50];
const PITCH = Math.tan(27.5 * Math.PI / 180);

export function counterShot(player: Vector3, playerHeight: number, miaHeight: number): Shot {
  const learner = { x: player.x, y: player.y, z: player.z, top: player.y + playerHeight + 0.16, r: 0.4 };
  const mia = { x: MIA_ASIDE.x, y: 0, z: MIA_ASIDE.z, top: miaHeight + 0.12, r: 0.32 };
  const serving = [
    CUP_AT, ...[-0.16, 0.16].map((x) => CUP_AT.clone().add(new Vector3(x, 0.24, 0))),
    COUNTER_SEAT.clone().setY(1.65), COUNTER_SEAT.clone().setY(1.12),
  ];
  const miaFace = MIA_ASIDE.clone().setY(miaHeight * 0.91);
  let fallback: Shot | undefined;
  for (const shot of shoulderShots(player, COUNTER_SEAT, FOCUS, 4.2, 4.45, -1, SHOULDER_ANGLES)) {
    if (shot.pos.x >= player.x || shot.pos.z < -5.85 || shot.pos.z > player.z - 0.45) continue;
    shot.pos.y = FOCUS.y + PITCH * Math.hypot(shot.pos.x - FOCUS.x, shot.pos.z - FOCUS.z);
    fallback ??= shot;
    if ([...serving, miaFace].some((point) => covers(shot.pos, point, learner))) continue;
    if (serving.some((point) => covers(shot.pos, point, mia))) continue;
    return shot;
  }
  return fallback!;
}

export function counterDetails(customerHeight: number, miaHeight: number) {
  const heads = [[COUNTER_SEAT, customerHeight], [MIA_ASIDE, miaHeight]] as const;
  return {
    face: COUNTER_SEAT.clone().setY(customerHeight * 0.91),
    edges: [
      ...heads.flatMap(([at, height]) => [-0.24, 0.24].flatMap((x) => [0.82, 1.07].map((y) =>
        new Vector3(at.x + x, height * y, at.z)))),
      CUP_AT.clone().add(new Vector3(-0.55, 0, 0)),
      CUP_AT.clone().add(new Vector3(0.22, 0, -0.14)),
      CUP_AT.clone().add(new Vector3(0.22, 0.48, 0.14)),
    ],
  };
}

/** Keep the customer in the upper middle and fit Mia and the serving area around them. */
export function fitCounterView(camera: PerspectiveCamera, width: number, height: number, freeBottom: number, details: ReturnType<typeof counterDetails>) {
  if (width <= 0 || height <= 0) return;
  camera.zoom = 1;
  camera.aspect = width / height;
  camera.clearViewOffset();
  camera.updateMatrixWorld();

  const face = details.face.clone().project(camera);
  const projected = new Vector3();
  let left = 1, right = 1, top = 1, bottom = 1;
  for (const point of details.edges) {
    projected.copy(point).project(camera);
    const x = (projected.x - face.x) * width / 2;
    const y = (face.y - projected.y) * height / 2;
    left = Math.max(left, -x);
    right = Math.max(right, x);
    top = Math.max(top, -y);
    bottom = Math.max(bottom, y);
  }

  const header = Math.min(62, freeBottom * 0.24);
  const floor = Math.max(header + 2, freeBottom - 22);
  const x = width * 0.54, y = Math.min(floor - 1, Math.max(header + 14, freeBottom * 0.43));
  const zoom = Math.min(1.28, Math.max(1, x - 18) / left, Math.max(1, width - x - 18) / right, (y - header) / top, (floor - y) / bottom);
  camera.zoom = zoom;
  camera.setViewOffset(width, height, (1 + face.x * zoom) * width / 2 - x, (1 - face.y * zoom) * height / 2 - y, width, height);
}
