import type { Sentence } from "../../convo/compose";
import { PHRASE_CARD_UI } from "../../content/phrase-card-ui";
import { cardKey, sentenceInput, useCards, type CardInput } from "../../state/cards";
import { Icon } from "../icons";
import "./phraseSave.css";

export type PhraseSource = Pick<CardInput, "situationId" | "sourceLabel">;
export type PhraseSaveLabels = { add: string; inCards: string };

export type PhraseSaveProps = PhraseSource & {
  sentence: Sentence;
  onSaved?: () => void;
  popover?: "primary" | "soft";
  labels?: PhraseSaveLabels;
};

export function PhraseSave({ sentence, situationId, sourceLabel, onSaved, popover, labels }: PhraseSaveProps) {
  const key = cardKey(sentence.en);
  const saved = useCards((cards) => cards.keys.has(key));
  const words = labels ?? PHRASE_CARD_UI;
  const icon = saved ? <Icon name="check" size={16} strokeWidth={2.25} /> : <Icon name="plus" size={16} />;
  const label = popover ? (saved ? PHRASE_CARD_UI.wholeInCards : PHRASE_CARD_UI.whole) : (saved ? words.inCards : words.add);
  if (popover && saved) return <span className="wpop-in">{icon}{" " + label}</span>;

  return <button type="button" className={popover === "primary" ? "btn small" : popover ? "btn small soft" : "btn soft"}
    data-phrase-save={popover ? undefined : ""}
    onKeyDown={(event) => { if (event.key === " " || event.key === "Enter") event.stopPropagation(); }}
    onClick={(event) => {
      event.stopPropagation();
      const cards = useCards.getState();
      const alreadySaved = cards.keys.has(key);
      if (cards.add({ ...sentenceInput(sentence, situationId), sourceLabel }) && !alreadySaved) onSaved?.();
    }}>{icon}{" " + label}</button>;
}
