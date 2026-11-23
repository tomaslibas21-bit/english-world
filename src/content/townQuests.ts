// The quest cast and their outdoor positions belong to the town edition.
import { ASK_WAY_NPC, ASK_WAY_SITUATION } from "./ask-way-lines";
import { PHOTO_WALK_NPC, PHOTO_WALK_SITUATION, PHOTO_THINGS } from "./photo-walk-lines";
import type { NpcDef } from "./npcs";

export const QUEST_PEOPLE: NpcDef[] = [
  {
    id: PHOTO_WALK_NPC, name: "Hana", role: { en: "tourist", lt: "turistė" }, gender: "f", voice: "af_bella",
    look: {
      skin: "#d9a47e", hair: { style: "long", color: "#1f1a17" }, top: "#c99623", bottom: "#263548",
      shoes: "#f8f7ee", acc: ["camera", "rainJacket"],
    },
  },
  {
    id: ASK_WAY_NPC, name: "Earl", role: { en: "local", lt: "vietinis gyventojas" }, gender: "m", voice: "am_michael",
    look: {
      skin: "#efd0b8", hair: { style: "short", color: "#f4efe5" }, top: "#e3c4a4", bottom: "#433e37",
      acc: ["cardigan", "plaid", "flatCap", "foldedPaper"], accColor: "#77543e", height: 0.96, face: { lines: true },
    },
  },
];

export const QUEST_PEOPLE_SPOTS = [
  { npc: PHOTO_WALK_NPC, x: -52.4, z: -14.75, rot: 0, ax: -51.3, az: -13.4 },
  { npc: ASK_WAY_NPC, x: 9.6, z: -16.1, rot: 0, ax: 10.1, az: -13.95 },
];

export const isTownQuest = (id: string) => id === PHOTO_WALK_SITUATION || id === ASK_WAY_SITUATION;

export type PhotoThingId = typeof PHOTO_THINGS[number]["id"];
type Point = Readonly<{ x: number; y: number; z: number }>;
export type PhotoSpot = Point & { id: PhotoThingId };
export type AddPhotoSpot = (id: PhotoThingId, x: number, y: number, z: number, anchor?: Point) => void;
