import { create } from "zustand";
import type { KitLine, KitMic } from "../kit/dialogue";
import type { SayItCue } from "../kit/sayIt";
import type { GateWord, Prompt } from "./words";
import type { PlayWay } from "./save";
import type { PhraseReviewEntry } from "../../ui/kit/phraseLine";

export type RoadResult = {
  points: number; right: number; total: number; streak: number; distance: number;
  record: boolean; cards: number; missed: GateWord[]; recovered: GateWord[]; phrases?: GateWord[]; said?: number;
  review?: readonly PhraseReviewEntry[];
  missedEntries?: readonly PhraseReviewEntry[];
  practiceEntries?: readonly PhraseReviewEntry[];
};

export type GateFeedback = {
  correct: boolean; entry: PhraseReviewEntry; saveWord: boolean;
  options?: readonly PhraseReviewEntry[]; gapEntry?: PhraseReviewEntry;
};

type RoadUi = {
  loadingCabinet: boolean;
  phase: "briefing" | "loading" | "lift" | "drive" | "result" | "unavailable";
  way: PlayWay;
  line: KitLine | null; choices: KitLine[]; mic: KitMic; micOn: boolean;
  prompt?: Prompt; gateId?: number; stampedLane?: number; sayIt?: SayItCue; ghost: boolean;
  remaining: number; streak: number;
  feedback?: GateFeedback;
  result?: RoadResult;
};

const initial: RoadUi = {
  loadingCabinet: false, phase: "loading", way: "words", line: null, choices: [], mic: { status: "off", heard: "" }, micOn: true,
  ghost: false, remaining: 150, streak: 0,
};

export const useRoad = create<RoadUi>(() => initial);
export function resetRoadUi() { useRoad.setState(initial, true); }
