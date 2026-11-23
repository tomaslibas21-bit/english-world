import type { NpcDef } from "@/content/npcs";
import { ASK_WAY_NPC, ASK_WAY_SITUATION } from "./ask-way-lines";
import { PHOTO_WALK_NPC, PHOTO_WALK_SITUATION } from "./photo-walk-lines";

export const QUEST_PEOPLE: NpcDef[] = [
  {
    id: PHOTO_WALK_NPC, name: "Renata", role: { en: "Turista", lt: "tourist" }, gender: "f", voice: "ef_dora",
    informal: true, informalSpain: true,
    look: {
      skin: "#c78a63", hair: { style: "wavy", color: "#30201a" }, top: "#fff8ed", bottom: "#36577a",
      shoes: "#faf8f0", acc: ["cardigan", "camera", "shades"], accColor: "#ed675c",
    },
  },
  {
    id: ASK_WAY_NPC, name: "Doña Queta", role: { en: "Vecina de toda la vida", lt: "Local, born and raised" },
    gender: "f", voice: "ef_dora", informal: false, informalSpain: false,
    look: {
      skin: "#a86749", hair: { style: "braid", color: "#aaa5a4", side: -1, tie: "#a34d3d" },
      top: "#f2d8a3", bottom: "#f2d8a3", skirt: true, carry: "bag",
      acc: ["hipil", "rebozo", "strawBag"], accColor: "#b35636", height: 0.94, face: { lines: true },
    },
  },
];

export const QUEST_PEOPLE_SPOTS = [
  { npc: PHOTO_WALK_NPC, x: -52.4, z: -14.75, rot: 0, ax: -51.3, az: -13.4 },
  { npc: ASK_WAY_NPC, x: 9.6, z: -16.1, rot: 0, ax: 10.8, az: -15.05 },
];

export const isTownQuest = (id: string) => id === PHOTO_WALK_SITUATION || id === ASK_WAY_SITUATION;
