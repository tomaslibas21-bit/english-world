import { create } from "zustand";
import type { GyMoveId } from "../../content/gym";
import type { GyLineId } from "../../content/gym-lines";
import type { Sentence } from "../../convo/compose";
import type { HelpLevel } from "../kit/help";
import type { SayItCue } from "../kit/sayIt";
import type { GymPhase, GymScore } from "./round";

export type GymLine = { key: GyLineId; sentence: Sentence };
export type GymCaption = { line: GymLine; detail: "target" | "full" };
type ObserveFrame = (viewport: HTMLElement, header: HTMLElement | null, dock: HTMLElement | null) => () => void;

export interface GymView {
  phase: GymPhase;
  index: number;
  total: number;
  callId: GyMoveId | null;
  options: readonly GyMoveId[];
  caption: GymCaption | null;
  line: GymLine | null;
  feedback: "right" | "retry" | null;
  picked: GyMoveId | null;
  highlight: GyMoveId | null;
  helpLevel: HelpLevel;
  audible: boolean;
  fallback: boolean;
  revealed: boolean;
  score: GymScore;
  ratio: number;
  sayIt: SayItCue | null;
  micStatus: ReturnType<SayItCue["getSnapshot"]> | null;
  observeFrame: ObserveFrame;
}

export const useGym = create<{ view: GymView | null }>(() => ({ view: null }));
