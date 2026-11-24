import { useState, type KeyboardEvent } from "react";
import { PHRASE_CARD_UI } from "../../content/phrase-card-ui";
import { Icon } from "../icons";
import PhraseReview, { type PhraseReviewEntry } from "./PhraseReview";
import "./phraseChooser.css";

/** A shared chooser for options whose buttons need to keep their original size and behavior. */
export function PhraseChooser({ entries, bilingual = false }: { entries: readonly PhraseReviewEntry[]; bilingual?: boolean }) {
  const [open, setOpen] = useState(false);
  const label = PHRASE_CARD_UI.phrases;
  const key = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape" && event.currentTarget.hasAttribute("open")) {
      event.stopPropagation();
      event.currentTarget.removeAttribute("open");
      event.currentTarget.querySelector("summary")?.focus();
    } else if (event.key === " " || event.key === "Enter") event.stopPropagation();
  };
  return entries.length > 0 && <details className="phrase-chooser" onToggle={(event) => setOpen(event.currentTarget.open)}
    onKeyDown={key} onKeyUp={(event) => { if (event.key === " ") event.stopPropagation(); }}>
    <summary className="btn soft" title={label} aria-label={label}><Icon name="bookOpen" size={19} /></summary>
    {open && <div className="phrase-chooser-panel"><PhraseReview entries={entries} targetOnly={!bilingual} /></div>}
  </details>;
}
