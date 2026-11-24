import type { Sentence } from "../../convo/compose";
import { cardKey } from "../../state/cards";
import { glossLine } from "../natTip";

export type PhraseLine = { sentence: Sentence } | { targetText: string; helperText: string; actualSay?: string };

export function phraseHelper(sentence: Sentence): string {
  return (sentence.nat || glossLine(sentence.units)).trim();
}

export function resolvePhrase(line: PhraseLine): Sentence | null {
  const sentence = "sentence" in line ? line.sentence : {
    en: line.targetText, nat: line.helperText, say: line.actualSay || line.targetText, units: [],
  };
  const aligned = sentence.units.every((unit) => unit.en.trim() && unit.lt.trim());
  const resolved = aligned ? sentence : { ...sentence, units: [] };
  return cardKey(resolved.en) && phraseHelper(resolved) ? resolved : null;
}
