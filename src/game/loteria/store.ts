import { create } from "zustand";
import type { LoteriaCard, LoteriaRound } from "../../editions/es/content/loteria";
import type { SayItCue } from "../kit/sayIt";
import type { KitLine, KitMic } from "../kit/dialogue";
import type { Sentence } from "../../convo/compose";
import type { PhraseReviewEntry } from "../../ui/kit/phraseLine";

export type Phase = "opening" | "calling" | "waiting" | "reading" | "finishing" | "score" | "leaving";
export type Tip = "tipMark" | "tipLate" | "tipNotYet";
export type CardLabel = { name: string; gloss: string; sentence?: Sentence };

export function loteriaNames(cards: readonly LoteriaCard[], labels: LoteriaUi["labels"]): { sentence: Sentence }[] {
  return cards.flatMap(({ id }) => {
    const sentence = labels[id]?.sentence;
    return sentence ? [{ sentence }] : [];
  });
}
export interface LoteriaUi {
  kind: LoteriaRound;
  next: LoteriaRound;
  phase: Phase;
  board: readonly LoteriaCard[];
  labels: Record<string, CardLabel>;
  covered: readonly number[];
  called: readonly LoteriaCard[];
  current?: LoteriaCard;
  faceDown: boolean;
  verse: KitLine | null;
  caller: KitLine | null;
  neighbor: KitLine | null;
  focus: number;
  glow: number;
  bounce: { index: number; count: number } | null;
  tip: Tip | null;
  ready: boolean;
  shoutSentence: Sentence | null;
  winningCells: readonly number[];
  replay: boolean;
  sayIt?: SayItCue;
  choices: KitLine[];
  read: readonly LoteriaCard[];
  mic: KitMic;
  micOn: boolean;
  result: { winner: "learner" | "neighbor"; calls: number; covered: number; heard: number; phrases: number; said?: number; review: readonly PhraseReviewEntry[] } | null;
}

const empty: LoteriaUi = {
  kind: "linea", next: "esquinas", phase: "opening", board: [], labels: {}, covered: [], called: [], faceDown: false,
  verse: null, caller: null, neighbor: null, focus: 0, glow: -1, bounce: null, tip: null,
  ready: false, shoutSentence: null, winningCells: [], replay: false, sayIt: undefined,
  choices: [], read: [], mic: { status: "off", heard: "" }, micOn: false, result: null,
};

export const useLoteria = create<LoteriaUi>(() => empty);
export const loteriaUi = useLoteria.setState;
export function resetLoteriaUi() { loteriaUi(empty); }
