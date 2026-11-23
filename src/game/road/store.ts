import { create } from "zustand";
import type { KitLine, KitMic } from "../kit/dialogue";
import type { SayItCue } from "../kit/sayIt";
import type { LabelAnchor } from "./gates";
import type { Prompt, Word } from "./words";

export type RoadResult = {
  points: number; right: number; total: number; streak: number; distance: number;
  record: boolean; cards: number; missed: Word[]; said?: number;
};

type RoadUi = {
  phase: "loading" | "lift" | "drive" | "result" | "unavailable";
  line: KitLine | null; choices: KitLine[]; mic: KitMic; micOn: boolean;
  prompt?: Prompt; sayIt?: SayItCue; anchors: LabelAnchor[]; ghost: boolean;
  remaining: number; streak: number; wind: boolean;
  feedback?: { correct: boolean; word: Word };
  result?: RoadResult;
};

const initial: RoadUi = {
  phase: "loading", line: null, choices: [], mic: { status: "off", heard: "" }, micOn: true,
  anchors: [], ghost: false, remaining: 150, streak: 0, wind: false,
};

export const useRoad = create<RoadUi>(() => initial);
export function resetRoadUi() { useRoad.setState(initial, true); }
