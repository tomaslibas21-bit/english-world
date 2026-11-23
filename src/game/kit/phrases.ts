import type { Sentence } from "../../convo/compose";
import { sentenceInput, useCards } from "../../state/cards";

export function keepPhrases(situation: string, lines: Iterable<Sentence>, sourceLabel?: string) {
  const cards = useCards.getState();
  for (const sentence of lines) cards.add({ ...sentenceInput(sentence, situation), sourceLabel });
}
