// The Spanish edition's choice of Spanish: Mexican (the default), neutral Latin American, or Spain's, for the lines that
// have a twin (docs/es/STYLE.md). Kept apart from the settings, so the English edition's saved settings stay as they
// are; the English edition never reads it.
import { setVariety, type Variety } from "../convo/compose";
import { EDITION } from "../edition";

export type { Variety };
const KEY = `${EDITION.storage}-variety`;

const known = (v: unknown): v is Variety => v === "default" || v === "neutral" || v === "spain";
/** Before the learner chooses: Mexican, unless the build says otherwise (VITE_DEFAULT_VARIETY; Spanish Master English's
 *  build starts in neutral Latin American Spanish: tools/export-sme.ts). */
const env = import.meta.env?.VITE_DEFAULT_VARIETY as unknown;
export const DEFAULT_VARIETY: Variety = known(env) ? env : "default";

export function loadVariety(): Variety {
  try { const v = localStorage.getItem(KEY); return known(v) ? v : DEFAULT_VARIETY; } catch { return DEFAULT_VARIETY; }
}

/** Whether a Spanish has been chosen and saved: here (the title form, Settings) or in Spanish Master English's Settings,
 *  which writes the same key (src/lib/course/game-variety.ts there). The default is not a choice: until the key holds a
 *  known value, the first-start chooser (src/editions/es/ui/variety-choice.tsx) is shown. */
export function hasVarietyChoice(): boolean {
  try { return known(localStorage.getItem(KEY)); } catch { return false; }
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
