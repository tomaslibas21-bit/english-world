import { lazy, Suspense, type ReactNode } from "react";
import { PHRASE_CARD_UI } from "../../content/phrase-card-ui";
import { cardKey } from "../../state/cards";
import { resolvePhrase, phraseHelper, type PhraseLine } from "./phraseLine";
import { PhraseSave, type PhraseSaveLabels, type PhraseSource } from "./PhraseSave";

export type PhraseReviewEntry = PhraseLine & PhraseSource;
export type PhraseReviewLabels = PhraseSaveLabels & { phrases: string };

export interface ReviewOptions {
  labels?: PhraseReviewLabels;
  targetLang?: string;
  helperLang?: string;
}

const ReviewBody = lazy(() => import("./PhraseReviewBody"));
const ReviewRow = /* @__PURE__ */ lazy(() => import("./PhraseReviewBody").then(({ ReviewRow }) => ({ default: ReviewRow })));

// Keep card-store dependencies on the caller side of the lazy boundary. The body handles selection and layout.
export function reviewLine(entry: PhraseReviewEntry, labels?: PhraseSaveLabels, stableLabel?: boolean) {
  const sentence = resolvePhrase(entry);
  if (!sentence) return null;
  return {
    key: cardKey(sentence.en), target: sentence.en, helper: phraseHelper(sentence),
    save: <PhraseSave sentence={sentence} situationId={entry.situationId} sourceLabel={entry.sourceLabel} labels={labels}
      stableLabel={stableLabel} />,
  };
}

/** Supply children when the caller already renders its selected phrase or chooser. */
export function PhraseReviewRow({ entry, children, labels, ...languages }: ReviewOptions & {
  entry: PhraseReviewEntry; children?: ReactNode;
}) {
  const line = reviewLine(entry, labels);
  if (!line) return children ?? null;
  return <Suspense fallback={children ?? null}><ReviewRow line={line} {...languages}>{children}</ReviewRow></Suspense>;
}

export default function PhraseReview({ entries, labels = PHRASE_CARD_UI, ...options }: ReviewOptions & {
  entries: readonly PhraseReviewEntry[]; targetOnly?: boolean; compact?: boolean;
}) {
  return entries.length > 0 && <Suspense fallback={null}>
    <ReviewBody entries={entries} labels={labels} prepare={reviewLine} {...options} />
  </Suspense>;
}
