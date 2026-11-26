import type { KeyboardEvent } from "react";
import type { Sentence } from "../../convo/compose";
import { PHRASE_CARD_UI } from "../../content/phrase-card-ui";
import { cardKey, sentenceInput, useCards } from "../../state/cards";
import { Icon } from "../icons";
import type { PhraseSource } from "./phraseLine";
import "./phraseSave.css";

export type PhraseSaveProps = PhraseSource & {
  sentence: Sentence;
  onSaved?: (persisted: boolean) => void;
  showLabel?: boolean;
  popover?: "primary" | "soft";
  className?: string;
  labels?: { add: string; inCards: string };
};

function keepActivation(event: KeyboardEvent) {
  if (event.key === " " || event.key === "Enter") event.stopPropagation();
}

export function PhraseSave({ sentence, situationId, sourceLabel, onSaved, popover, showLabel = false, className, labels = PHRASE_CARD_UI }: PhraseSaveProps) {
  const key = cardKey(sentence.en);
  const saved = useCards((cards) => cards.keys.has(key));
  const fresh = popover ? PHRASE_CARD_UI.whole : labels.add;
  const checked = popover ? PHRASE_CARD_UI.wholeInCards : labels.inCards;
  const label = saved ? checked : fresh;
  const style = popover === "primary" ? "btn small" : popover ? "btn small soft" : "btn soft";
  return <button type="button" className={className ? `${style} ${className}` : style}
    data-phrase-save="" data-saved={saved} data-icon-only={popover || showLabel ? undefined : ""}
    data-other-label={popover ? (saved ? fresh : checked) : undefined} aria-label={label} aria-pressed={saved}
    title={popover ? undefined : label} onKeyDown={keepActivation} onKeyUp={keepActivation}
    onClick={(event) => {
      event.stopPropagation();
      useCards.getState().add({ ...sentenceInput(sentence, situationId), sourceLabel }, onSaved);
    }}>
    <Icon name={saved ? "check" : "plus"} size={18} strokeWidth={saved ? 2.25 : 1.75} />
    {(popover || showLabel) && <bdi>{label}</bdi>}
  </button>;
}
