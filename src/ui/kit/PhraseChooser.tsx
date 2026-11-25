import { useState } from "react";
import { PHRASE_CARD_UI } from "../../content/phrase-card-ui";
import { Icon } from "../icons";
import PhraseReview, { type PhraseReviewProps } from "./PhraseReview";
import "./phraseChooser.css";

export function PhraseChooser({ entries, targetOnly = true, ...languages }: PhraseReviewProps) {
  const [open, setOpen] = useState(false);
  const label = PHRASE_CARD_UI.phrases;
  return entries.length > 0 && <details className="phrase-chooser" open={open}
    onToggle={(event) => setOpen(event.currentTarget.open)}
    onKeyDown={(event) => {
      if (event.key === "Escape" && open) {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.querySelector("summary")?.focus();
        setOpen(false);
      } else if (event.key === " " || event.key === "Enter") event.stopPropagation();
    }}
    onKeyUp={(event) => { if (event.key === " ") event.stopPropagation(); }}>
    <summary className="btn soft" title={label} aria-label={label}><Icon name="bookOpen" size={19} /></summary>
    {open && <div className="phrase-chooser-panel"><PhraseReview entries={entries} targetOnly={targetOnly} {...languages} /></div>}
  </details>;
}
