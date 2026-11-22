import { Box3, MathUtils, PerspectiveCamera, Vector3, type Group } from "three";
import type { Shot } from "../talkShot";
import { CUP_AT, CUP_SERVED } from "./props";

export const COUNTER_SEAT = new Vector3(-1.12, 0, -1.95);
export const MIA_ASIDE = new Vector3(2.32, 0, -1.06);

/** Just outside the learner's left shoulder, looking down the clear lane beside the machine. */
export function counterShot(player: Vector3, playerHeight: number): Shot {
  const pos = player.clone().add(new Vector3(-0.86, playerHeight + 0.26, -0.26));
  const look = COUNTER_SEAT.clone();
  look.y = pos.y - Math.tan(26 * Math.PI / 180) * Math.hypot(pos.x - look.x, pos.z - look.z);
  return { pos, look };
}

interface CounterFrame { face: Vector3; edges: Vector3[] }
export interface CounterLens { zoom: number; offsetX: number; offsetY: number }

function headEdges(at: Vector3, height: number) {
  return [-0.24, 0.24].flatMap((x) => [0.82, 1.07].map((y) => new Vector3(at.x + x, height * y, at.z)));
}

export function counterDetails(customerHeight: number, miaHeight: number): CounterFrame {
  return {
    face: COUNTER_SEAT.clone().setY(customerHeight * 0.91),
    edges: [
      ...headEdges(COUNTER_SEAT, customerHeight), ...headEdges(MIA_ASIDE, miaHeight),
      CUP_AT.clone().add(new Vector3(-0.55, 0, 0)),
      CUP_AT.clone().add(new Vector3(0.22, 0, -0.14)),
      CUP_AT.clone().add(new Vector3(0.22, 0.48, 0.14)),
      CUP_SERVED,
    ],
  };
}

/** Include the customer, cup and any food at both ends of the slide. */
export function servingDetails(customerHeight: number, serving: Group): CounterFrame {
  const edges = headEdges(COUNTER_SEAT, customerHeight);
  const box = new Box3().setFromObject(serving);
  const travel = CUP_SERVED.clone().sub(CUP_AT);
  for (const x of [box.min.x, box.max.x]) {
    for (const y of [box.min.y, box.max.y]) {
      for (const z of [box.min.z, box.max.z]) {
        const corner = new Vector3(x, y, z);
        edges.push(corner, corner.clone().add(travel));
      }
    }
  }
  return { face: COUNTER_SEAT.clone().setY(customerHeight * 0.91), edges };
}

/** Anchor the face and keep the action above the controls on the same camera axis. */
export function fitCounterView(camera: PerspectiveCamera, width: number, height: number, freeBottom: number,
  details: CounterFrame, from?: CounterLens, progress = 1): CounterLens {
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
  const x = width * (width <= 600 ? 0.61 : 0.49);
  const y = header + (floor - header) * 0.39;
  const zoom = Math.min(1.65, Math.max(1, x - 18) / left, Math.max(1, width - x - 18) / right, (y - header) / top, (floor - y) / bottom);
  const offsetX = (1 + face.x * zoom) * width / 2 - x;
  const offsetY = (1 - face.y * zoom) * height / 2 - y;
  camera.zoom = MathUtils.lerp(from?.zoom ?? zoom, zoom, progress);
  camera.setViewOffset(width, height, MathUtils.lerp(from?.offsetX ?? offsetX, offsetX, progress),
    MathUtils.lerp(from?.offsetY ?? offsetY, offsetY, progress), width, height);
  return { zoom, offsetX, offsetY };
}
