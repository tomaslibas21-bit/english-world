import { create } from "zustand";
import type { KitLine, KitMic } from "../kit/dialogue";
import type { ResolvedPhrase } from "../kit/phrases";
import type { Action, taxiScore } from "./route";

interface TaxiUi {
  line: KitLine | null;
  revealed: KitLine | null;
  choices: KitLine[];
  mic: KitMic;
  micOn: boolean;
  gloss: boolean;
  action: Action | null;
  result: (ReturnType<typeof taxiScore> & { fare: number; tip: number; onTarget: boolean; cards: number }) | null;
  review?: ResolvedPhrase[];
}

const empty: TaxiUi = {
  line: null, revealed: null, choices: [], mic: { status: "off", heard: "" }, micOn: true, gloss: true, action: null, result: null, review: undefined,
};
export const useTaxi = create<TaxiUi>(() => empty);
export function resetTaxiUi() { useTaxi.setState(empty); }
