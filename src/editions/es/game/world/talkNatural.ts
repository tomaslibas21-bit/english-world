import type { Object3D } from "three";
import { bindTalkRoom, type TalkRoomAnchors } from "@/game/world/talkNatural";

export function talkRoomAnchors(zone: string, room: Object3D): TalkRoomAnchors {
  if (zone === "sunny-cup") return bindTalkRoom(room, { menu: [-3.6, 2.75, -5.8] }, [-2, 1.08, -3.2, 7.12, 1.22]);
  if (zone === "station") return bindTalkRoom(room, { machine: [-1.55, 1.30, -8.37] }, [-6, 1.08, -6, 6.12, 1.22]);
  if (zone === "gas-station") return bindTalkRoom(room, {}, [-3, 1.08, -2.8, 4.12, 1.12]);
  return bindTalkRoom(room, {}, undefined, zone === "visitor-center");
}
