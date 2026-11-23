import { create } from "zustand";
import type { SayItCue } from "../kit/sayIt";
import type { RoadResult } from "../road/store";
import type { Prompt, Word } from "../road/words";
import { SEA_SECONDS } from "./course";

type SeaUi = {
  phase: "town" | "drive" | "turn" | "result" | "unavailable";
  prompt?: Prompt;
  sayIt?: SayItCue;
  gateId?: number;
  answeredLane?: number;
  remaining: number;
  streak: number;
  feedback?: { correct: boolean; word: Word };
  result?: RoadResult;
};

const initial: SeaUi = { phase: "town", remaining: SEA_SECONDS, streak: 0 };
export const useSea = create<SeaUi>(() => initial);
export function resetSeaUi() { useSea.setState(initial, true); }
