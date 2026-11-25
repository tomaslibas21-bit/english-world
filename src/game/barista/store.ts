import { create } from "zustand";
import type { Pick, Row } from "../../content/barista";
import type { KitLine, KitMic } from "../kit/dialogue";
import type { Step } from "./shift";
import type { Build } from "./tray";
import type { PhraseReviewEntry } from "../../ui/kit/phraseLine";

interface BaristaUi {
  offered: boolean;
  line: KitLine | null;
  hiddenOrder: KitLine[];
  revealed: boolean;
  choices: KitLine[];
  mic: KitMic;
  micOn: boolean;
  customer: number;
  step: Step;
  built: Build;
  highlight: Pick | null;
  repair: boolean;
  correctionSelected: boolean | null;
  menu: Record<Row, { id: string; en: string; lt: string }[]> | null;
  tray: boolean;
  trayReview?: readonly PhraseReviewEntry[];
  ready: boolean;
  row: Row;
  page: number;
  price: number | null;
  result: { served: number; firstTime: number; cards: number; review: readonly PhraseReviewEntry[] } | null;
}

const empty: BaristaUi = {
  offered: false, line: null, hiddenOrder: [], revealed: false, choices: [],
  mic: { status: "off", heard: "" }, micOn: true, customer: 0, step: "intro", built: { extras: [] },
  highlight: null, repair: false, correctionSelected: null, menu: null, tray: false, ready: false, row: "drink", page: 0, price: null, result: null,
};

export const useBarista = create<BaristaUi>(() => empty);
export function resetBaristaUi() { useBarista.setState(empty, true); }
