import { lazy, Suspense, useMemo } from "react";
import { PHRASE_CARD_UI } from "../../content/phrase-card-ui";
import { HL, TL } from "../i18n";
import { distinctPhrases, phraseHelper, type PhraseReviewEntry } from "./phraseLine";
import { PhraseSave } from "./PhraseSave";

export type { PhraseReviewEntry } from "./phraseLine";
export type PhraseReviewProps = {
  entries: readonly PhraseReviewEntry[];
  targetOnly?: boolean;
  targetLang?: string;
  helperLang?: string;
};

const ReviewBody = lazy(() => import("./PhraseReviewBody"));

// Keep the card store and its imports on the same side of the lazy boundary as the other save buttons.
function prepare(entries: PhraseReviewProps["entries"]) {
  return [...distinctPhrases(entries)].map(([key, entry]) => ({
    key, target: entry.sentence.en, helper: phraseHelper(entry.sentence), save: <PhraseSave {...entry} />,
  }));
}

export type ReviewLine = ReturnType<typeof prepare>[number];

export default function PhraseReview({ entries, targetOnly, targetLang = TL, helperLang = HL }: PhraseReviewProps) {
  const lines = useMemo(() => prepare(entries), [entries]);
  return lines.length > 0 && <Suspense fallback={null}>
    <ReviewBody lines={lines} label={PHRASE_CARD_UI.phrases} {...{ targetOnly, targetLang, helperLang }} />
  </Suspense>;
}
