import { useMemo } from "react";
import { RADIO_NAME } from "../content/radio";
import type { RadioPhrase } from "./Radio";
import { resolvePhrase, type PhraseReviewEntry } from "./kit/phraseLine";
import PhraseReview from "./kit/PhraseReview";
import "./radioPhrases.css";

export default function RadioPhrases({ phrases }: { phrases: readonly RadioPhrase[] }) {
  const entries = useMemo(() => {
    const entries: PhraseReviewEntry[] = [];
    for (const phrase of phrases) {
      const sentence = resolvePhrase(phrase);
      if (sentence) entries.push({ sentence, situationId: "radio", sourceLabel: RADIO_NAME });
    }
    return entries;
  }, [phrases]);

  return <div id="radio-phrases" className="rs-phrase-panel"><PhraseReview entries={entries} /></div>;
}
