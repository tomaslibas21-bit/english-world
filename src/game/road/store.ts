import { create } from "zustand";
import type { KitLine, KitMic } from "../kit/dialogue";
import type { ResolvedPhrase } from "../kit/phrases";
import type { SayItCue } from "../kit/sayIt";
import type { PlayWay } from "./save";
import type { GateWord, Prompt } from "./words";

export type GateFeedback = { correct: boolean; word: GateWord; phrase?: boolean };

export type RoadResult = {
  points: number; right: number; total: number; streak: number; distance: number;
  record: boolean; cards: number; missed: GateWord[]; recovered: GateWord[]; phrases?: GateWord[]; said?: number;
  review?: ResolvedPhrase[];
  missedReview?: ResolvedPhrase[];
  practicedReview?: ResolvedPhrase[];
};

type RoadUi = {
  phase: "briefing" | "loading" | "lift" | "drive" | "result" | "unavailable";
  way: PlayWay;
  line: KitLine | null; choices: KitLine[]; mic: KitMic; micOn: boolean;
  prompt?: Prompt; gateId?: number; sayIt?: SayItCue; ghost: boolean;
  remaining: number; streak: number; wind: boolean;
  feedback?: GateFeedback;
  result?: RoadResult;
};

const initial: RoadUi = {
  phase: "loading", way: "words", line: null, choices: [], mic: { status: "off", heard: "" }, micOn: true,
  ghost: false, remaining: 150, streak: 0, wind: false,
};

export const useRoad = create<RoadUi>(() => initial);
export function resetRoadUi() { useRoad.setState(initial, true); }
