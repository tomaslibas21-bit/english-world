import { Matrix4, Vector3, type Object3D } from "three";
import type { AnchorKind } from "../talkNatural/contract";

type Point = readonly [number, number, number];
type Surface = readonly [x: number, y: number, z: number, width: number, depth: number];
type Points = Partial<Record<AnchorKind, Point>>;

export function bindTalkRoom(room: Object3D, points: Points = {}, surface?: Surface, hasMap = false): TalkRoomAnchors {
  room.updateWorldMatrix(true, false);
  const world = room.matrixWorld.clone(), inverse = new Matrix4().copy(world).invert();
  const anchors: Partial<Record<AnchorKind, Vector3>> = {};
  for (const kind of Object.keys(points) as AnchorKind[]) {
    anchors[kind] = new Vector3(...points[kind]!).applyMatrix4(world);
  }
  const map = hasMap && room.userData.mapSpot;
  if (map) anchors.map = new Vector3(map.x, map.y, map.z).applyMatrix4(world);
  if (!surface) return anchors;

  const [x, y, z, width, depth] = surface;
  const halfX = width / 2, halfZ = depth / 2;
  const local = new Vector3(), forward = new Vector3();
  const center = new Vector3(x, y, z).applyMatrix4(world);
  const counter = {
    center,
    contains(point: Vector3) {
      local.copy(point).applyMatrix4(inverse);
      return Math.abs(local.x - x) <= halfX && Math.abs(local.z - z) <= halfZ;
    },
    withinReach(root: Vector3) {
      local.copy(root).applyMatrix4(inverse);
      const dx = Math.max(0, Math.abs(local.x - x) - halfX);
      const dz = Math.max(0, Math.abs(local.z - z) - halfZ);
      return dx * dx + dz * dz <= 0.58 ** 2 && Math.abs(local.y - y) < 1.3;
    },
    handoff(head: Vector3, facing: Vector3, out: Vector3) {
      local.copy(head).applyMatrix4(inverse);
      forward.copy(facing).transformDirection(inverse);
      // A little forward from the clerk's side, along the actual top.
      const reach = 0.84;
      out.set(
        Math.max(x - halfX + 0.07, Math.min(x + halfX - 0.07, local.x + reach * forward.x)),
        y,
        Math.max(z - halfZ + 0.07, Math.min(z + halfZ - 0.07, local.z + reach * forward.z)),
      );
      if (Math.hypot(out.x - local.x, out.z - local.z) > 1.05) return false;
      out.applyMatrix4(world);
      return true;
    },
  };
  return { ...anchors, handoff: center, counter };
}

export type TalkRoomAnchors = Partial<Record<AnchorKind, Vector3>> & {
  counter?: {
    center: Vector3;
    contains(point: Vector3): boolean;
    withinReach(root: Vector3): boolean;
    handoff(head: Vector3, facing: Vector3, out: Vector3): boolean;
  };
};

export function talkRoomAnchors(zone: string, room: Object3D): TalkRoomAnchors {
  if (zone === "sunny-cup") return bindTalkRoom(room, { menu: [-3.6, 2.75, -5.8] }, [-2, 1.08, -3.2, 7.12, 1.22]);
  if (zone === "station") return bindTalkRoom(room, { machine: [-1.55, 1.3, -8.37] }, [-6, 1.08, -6, 6.12, 1.22]);
  return bindTalkRoom(room, {}, undefined, zone === "visitor-center");
}
