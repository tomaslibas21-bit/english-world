import type { Sentence } from "../../convo/compose";
import { cardKey, sentenceInput, useCards } from "../../state/cards";
import { phraseHelper, type PhraseReviewEntry } from "../../ui/kit/phraseLine";

export function phraseEntries(situationId: string, lines: readonly { sentence: Sentence }[]): PhraseReviewEntry[] {
  return lines.map(({ sentence }) => ({ situationId, sentence }));
}

/** A run owns its review from the first visible cue to the result. */
export class PhraseRun {
  private readonly seen = new Map<string, PhraseReviewEntry>();
  private result?: readonly PhraseReviewEntry[];

  constructor(private readonly situationId: string) {}

  add(sentence: Sentence, situationId = this.situationId, sourceLabel?: string) {
    if (this.result) return;
    const key = cardKey(sentence.en);
    if (key && !this.seen.has(key) && phraseHelper(sentence)) {
      this.seen.set(key, { sentence, situationId, sourceLabel });
    }
  }

  lines(lines: readonly { sentence: Sentence }[]) {
    for (const { sentence } of lines) this.add(sentence);
  }

  entries(entries: readonly PhraseReviewEntry[]) {
    for (const { sentence, situationId, sourceLabel } of entries) this.add(sentence, situationId, sourceLabel);
  }

  finish(): readonly PhraseReviewEntry[] {
    return this.result ??= Object.freeze([...this.seen.values()]);
  }
}

export function keepPhrases(situation: string, lines: Iterable<Sentence>, sourceLabel?: string) {
  const cards = useCards.getState();
  for (const sentence of lines) cards.add({ ...sentenceInput(sentence, situation), sourceLabel });
}
