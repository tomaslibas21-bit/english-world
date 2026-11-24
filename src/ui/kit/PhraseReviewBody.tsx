import { useMemo, useState, type ReactNode } from "react";
import type { PhraseReviewEntry, PhraseReviewLabels, ReviewOptions, reviewLine } from "./PhraseReview";
import "./phraseReview.css";

type ReviewLine = NonNullable<ReturnType<typeof reviewLine>>;

export function ReviewRow({ line, children, targetLang = "en", helperLang = "lt" }: Omit<ReviewOptions, "labels"> & {
  line: ReviewLine; children?: ReactNode;
}) {
  return <div className="phrase-review-row">
    {children ?? <div className="phrase-review-line">
      <div lang={targetLang}>{line.target}</div>
      <small lang={helperLang}>{line.helper}</small>
    </div>}
    {line.save}
  </div>;
}

export default function PhraseReviewBody({ entries, labels, prepare, targetLang = "en", helperLang = "lt", targetOnly }: ReviewOptions & {
  entries: readonly PhraseReviewEntry[]; labels: PhraseReviewLabels; prepare: typeof reviewLine; targetOnly?: boolean;
}) {
  const choices = useMemo(() => {
    const distinct = new Map<string, ReviewLine>();
    for (const entry of entries) {
      const line = prepare(entry, labels);
      if (line && !distinct.has(line.key)) distinct.set(line.key, line);
    }
    return distinct;
  }, [entries, labels, prepare]);
  const [selected, setSelected] = useState("");
  const line = choices.get(selected) ?? choices.values().next().value;
  if (!line) return null;

  return <ReviewRow line={line} targetLang={targetLang} helperLang={helperLang}>
    {choices.size > 1 ? <div className="phrase-review-line">
      <select lang={targetLang} aria-label={labels.phrases} value={line.key} onChange={(event) => setSelected(event.target.value)}
        onKeyDown={(event) => { if (event.key !== "Escape" && event.key !== "Tab") event.stopPropagation(); }}
        onKeyUp={(event) => { if (event.key === " ") event.stopPropagation(); }}>
        {Array.from(choices.values(), ({ key, target }) => <option key={key} value={key}>{target}</option>)}
      </select>
      {!targetOnly && <small lang={helperLang}>{line.helper}</small>}
    </div> : targetOnly ? <div className="phrase-review-line" lang={targetLang}>{line.target}</div> : undefined}
  </ReviewRow>;
}
