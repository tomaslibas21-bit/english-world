import { create } from "zustand";
import type { KitLine, KitMic } from "../kit/dialogue";
import type { Action, taxiScore } from "./route";
import type { PhraseReviewEntry } from "../../ui/kit/phraseLine";

interface TaxiUi {
  line: KitLine | null;
  choices: KitLine[];
  mic: KitMic;
  micOn: boolean;
  gloss: boolean;
  revealed: KitLine | null;
  action: Action | null;
  result: (ReturnType<typeof taxiScore> & { fare: number; tip: number; onTarget: boolean; cards: number; review: readonly PhraseReviewEntry[] }) | null;
}

const empty: TaxiUi = {
  line: null, choices: [], mic: { status: "off", heard: "" }, micOn: true, gloss: true, revealed: null, action: null, result: null,
};
export const useTaxi = create<TaxiUi>(() => empty);
export function resetTaxiUi() { useTaxi.setState(empty); }
