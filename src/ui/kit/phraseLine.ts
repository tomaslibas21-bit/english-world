import type { Sentence } from "../../convo/compose";
import { cardKey } from "../../state/cards";
import { glossLine } from "../natTip";

export type PhraseSource = { situationId: string; sourceLabel?: string; speakerId?: string };
export type PhraseLine = { sentence: Sentence } | { targetText: string; helperText: string; actualSay?: string };
export type PhraseReviewEntry = PhraseSource & { sentence: Sentence };

export function phraseHelper(sentence: Sentence): string {
  return (sentence.nat || glossLine(sentence.units)).trim();
}

export function resolvePhrase(line: PhraseLine): Sentence | null {
  const sentence = "sentence" in line ? line.sentence : {
    en: line.targetText, nat: line.helperText, say: line.actualSay || line.targetText, units: [],
  };
  return cardKey(sentence.en) && phraseHelper(sentence) ? sentence : null;
}

export function distinctPhrases(entries: readonly PhraseReviewEntry[]): Map<string, PhraseReviewEntry> {
  const distinct = new Map<string, PhraseReviewEntry>();
  for (const entry of entries) {
    const key = cardKey(entry.sentence.en);
    if (key && !distinct.has(key) && phraseHelper(entry.sentence)) distinct.set(key, entry);
  }
  return distinct;
}
