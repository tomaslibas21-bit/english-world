import type { ResolvedPhrase } from "../kit/phrases";
import type { GateWord, Phrase, Prompt } from "./words";

function pair(en: string, lt: string, say = en) {
  return { en, nat: lt, say, units: [{ en, lt }] };
}

export function resolvedGateWord(prompt: Prompt): GateWord {
  const { en, lt, situation } = prompt.word;
  return { en, lt, situation, sentence: prompt.gap?.full ?? pair(en, lt, prompt.phrase ? prompt.phrase.f : prompt.word.clip.say) };
}

export function gateWordEntry(word: GateWord, title?: string): ResolvedPhrase {
  return { sentence: word.sentence ?? pair(word.en, word.lt), situationId: word.situation, sourceLabel: word.situation ? undefined : title };
}

export function gatePhraseEntry(phrase: Phrase, title: string, situationId = ""): ResolvedPhrase {
  return { sentence: pair(phrase.f, phrase.p), situationId, sourceLabel: situationId ? undefined : title };
}

export function gatePhraseOptions(prompt: Prompt, title: string) {
  const { phrase: answer } = prompt;
  if (!answer || !prompt.optionPhrases) return [];
  const pairs = prompt.optionPhrases;
  return prompt.options.flatMap((target) => {
    const phrase = pairs.get(target);
    return phrase ? gatePhraseEntry(phrase, title, phrase.id === answer.id ? prompt.word.situation : "") : [];
  });
}
