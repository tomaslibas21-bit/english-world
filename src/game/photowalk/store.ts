import { create } from "zustand";
import type { ASK_WAY_PLACES } from "../../content/ask-way-lines";
import type { PhotoThingId } from "../../content/townQuests";
import type { KitLine, KitMic } from "../kit/dialogue";

export type Destination = typeof ASK_WAY_PLACES[number];
export type Quiz = {
  id: PhotoThingId;
  choices: PhotoThingId[];
  misses: PhotoThingId[];
  wrong: boolean;
  got: boolean;
};
export type QuestUI = {
  near: PhotoThingId | null;
  camera: boolean;
  screen: "book" | "quiz" | "finale" | null;
  quiz: Quiz | null;
  line: KitLine | null;
  choices: KitLine[];
  mic: KitMic;
  visit: boolean;
  directions: Destination | null;
  replaying: boolean;
  arrival: number;
};

export const MIC_OFF: KitMic = { status: "off", heard: "" };
export const EMPTY_QUEST_UI: QuestUI = {
  near: null, camera: false, screen: null, quiz: null, line: null, choices: [],
  mic: MIC_OFF, visit: false, directions: null, replaying: false, arrival: 0,
};
export const useTownQuests = create<QuestUI>(() => EMPTY_QUEST_UI);
