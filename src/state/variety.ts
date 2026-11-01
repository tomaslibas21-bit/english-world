// The Spanish edition's choice of Spanish: Mexican (the default) or neutral Latin American, for the lines that have a
// neutral twin (docs/es/STYLE.md). Kept apart from the settings, so the English edition's saved settings stay as they
// are; the English edition never reads it.
import { setVariety } from "../convo/compose";
import { EDITION } from "../edition";

export type Variety = "default" | "neutral";
const KEY = `${EDITION.storage}-variety`;

export function loadVariety(): Variety {
  try { return localStorage.getItem(KEY) === "neutral" ? "neutral" : "default"; } catch { return "default"; }
}

/** Choose, remember and apply (the next line said or shown uses it). */
export function chooseVariety(v: Variety) {
  setVariety(v);
  try { localStorage.setItem(KEY, v); } catch { /* storage unavailable: the choice lasts this session */ }
}

/** At start: the learner's last choice. */
export function initVariety() {
  if (EDITION.id !== "en" && typeof window !== "undefined") setVariety(loadVariety());
}
