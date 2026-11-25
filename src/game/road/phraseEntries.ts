import type { PhraseReviewEntry } from "../../ui/kit/phraseLine";
import type { GateFeedback } from "./store";
import type { GateWord, Phrase, Prompt, Word } from "./words";

type EntryWord = Omit<GateWord, "situation"> & Partial<Pick<Word, "sentence" | "clip" | "situation">>;

function gateWordEntry(word: EntryWord, title: string, en = word.sentence?.en ?? word.en): PhraseReviewEntry {
  const { lt, clip, sentence, situation } = word;
  return {
    sentence: { en, nat: lt, say: sentence?.say || clip?.say || en, units: sentence?.units ?? [] },
    situationId: situation ?? "",
    sourceLabel: situation ? undefined : title,
  };
}

export function gatePhraseEntry(phrase: Phrase, title: string): PhraseReviewEntry {
  return gateWordEntry({ en: phrase.f, lt: phrase.p }, title);
}

export function gateAnswerEntry(prompt: Prompt, title: string): PhraseReviewEntry {
  const { word } = prompt;
  return prompt.gap ? gapWordEntry(word, word.en, title) : gateWordEntry(word, title, word.en);
}

function gapWordEntry({ lt, situation }: EntryWord, label: string, title: string): PhraseReviewEntry {
  // A gap's recording may be the full example. The card uses the isolated text.
  return gateWordEntry({ en: label, lt, situation }, title);
}

export function gateGapEntry(prompt: Prompt): PhraseReviewEntry | undefined {
  return prompt.gap && { sentence: prompt.gap.full, situationId: prompt.word.situation };
}

export function gateOptions(prompt: Prompt, title: string): PhraseReviewEntry[] {
  return prompt.options.flatMap((label, lane) => {
    const word = lane === prompt.right ? prompt.word : prompt.optionWords?.get(label);
    return word ? [prompt.gap ? gapWordEntry(word, label, title) : gateWordEntry(word, title)] : [];
  });
}

export function gateFeedback(prompt: Prompt, title: string, correct: boolean): GateFeedback {
  return {
    correct, entry: gateAnswerEntry(prompt, title), saveWord: !prompt.phrase,
    options: prompt.phrase ? undefined : gateOptions(prompt, title), gapEntry: gateGapEntry(prompt),
  };
}
