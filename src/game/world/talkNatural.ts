import { Vector3, type Object3D } from "three";
import type { AnchorKind } from "../talkNatural/contract";

const ROOM_POINTS: Record<string, Partial<Record<AnchorKind, [number, number, number]>>> = {
  "sunny-cup": { menu: [-3.6, 2.75, -5.8], handoff: [-1.2, 1.08, -3.2] },
  station: { handoff: [-6, 1.08, -6], machine: [-1.55, 1.3, -8.37] },
};

/** Room geometry is static during a conversation. Resolve the local props once to world space. */
export function talkRoomAnchors(zone: string, room: Object3D) {
  const anchors: Partial<Record<AnchorKind, Vector3>> = {};
  const points = ROOM_POINTS[zone];
  if (points) {
    for (const kind of Object.keys(points) as AnchorKind[]) {
      anchors[kind] = room.localToWorld(new Vector3(...points[kind]!));
    }
  }
  const map = zone === "visitor-center" && room.userData.mapSpot;
  if (map) anchors.map = room.localToWorld(new Vector3(map.x, map.y, map.z));
  return anchors;
}

export function talkCounterHeight(anchors: ReturnType<typeof talkRoomAnchors>, actor: Vector3) {
  const counter = anchors.handoff;
  return counter && Math.hypot(counter.x - actor.x, counter.z - actor.z) < 1.5 ? counter.y : undefined;
}
