import type { Sentence } from "../../convo/compose";
import { cardKey, sentenceInput, useCards } from "../../state/cards";

export type ResolvedPhrase = { sentence: Sentence; situationId: string; sourceLabel?: string };

/** A run's exposed lines, in the order the learner encountered them. */
export class PhraseRun {
  private readonly seen = new Map<string, ResolvedPhrase>();

  constructor(private readonly situationId: string, private readonly sourceLabel?: string) {}

  add(sentence: Sentence, situationId = this.situationId, sourceLabel = this.sourceLabel) {
    const key = cardKey(sentence.en);
    if (key && !this.seen.has(key)) this.seen.set(key, { sentence, situationId, sourceLabel });
  }

  lines(lines: Iterable<{ sentence: Sentence }>) {
    for (const { sentence } of lines) this.add(sentence);
  }

  entries() { return [...this.seen.values()]; }
}

export function keepPhrases(situation: string, lines: Iterable<Sentence>, sourceLabel?: string) {
  const cards = useCards.getState();
  for (const sentence of lines) cards.add({ ...sentenceInput(sentence, situation), sourceLabel });
}
