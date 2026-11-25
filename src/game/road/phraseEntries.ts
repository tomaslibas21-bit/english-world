import type { PhraseReviewEntry } from "../../ui/kit/phraseLine";
import type { GateWord, Phrase, Prompt, Word } from "./words";

type EntryWord = Omit<GateWord, "situation"> & Partial<Pick<Word, "sentence" | "clip" | "situation">>;

export function gateWordEntry(word: EntryWord, title: string): PhraseReviewEntry {
  const { en, lt, clip, sentence, situation } = word;
  return {
    sentence: sentence ? (sentence.nat === lt ? sentence : { ...sentence, nat: lt })
      : { en, nat: lt, say: clip?.say ?? en, units: [] },
    situationId: situation ?? "",
    sourceLabel: situation ? undefined : title,
  };
}

export function gatePhraseEntry(phrase: Phrase, title: string): PhraseReviewEntry {
  return gateWordEntry({ en: phrase.f, lt: phrase.p }, title);
}

export function gateAnswerEntry(prompt: Prompt, title: string): PhraseReviewEntry {
  const entry = gateWordEntry(prompt.word, title);
  return prompt.gap ? { ...entry, sentence: prompt.gap.full } : entry;
}

export function gateOptions(prompt: Prompt, title: string, revealed = false): PhraseReviewEntry[] {
  return prompt.options.flatMap((label, lane) => {
    if (lane === prompt.right) return prompt.gap && !revealed ? [] : [gateAnswerEntry(prompt, title)];
    const word = prompt.optionWords?.get(label);
    return word ? [gateWordEntry(word, title)] : [];
  });
}
