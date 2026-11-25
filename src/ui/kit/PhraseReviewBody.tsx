import { useState } from "react";
import type { ReviewLine } from "./PhraseReview";
import "./phraseReview.css";

export default function PhraseReviewBody({ lines, label, targetOnly, targetLang, helperLang }: {
  lines: ReviewLine[]; label: string; targetOnly?: boolean; targetLang: string; helperLang: string;
}) {
  const [selected, setSelected] = useState("");
  const line = lines.find(({ key }) => key === selected) ?? lines[0];

  return <div className="phrase-review-row phrase-save-row">
    <div className="phrase-review-line">
      {lines.length === 1 ? <div lang={targetLang}>{line.target}</div> : <div className="phrase-review-picker">
        <select lang={targetLang} aria-label={label} value={line.key} onChange={(event) => setSelected(event.target.value)}
          onKeyDown={(event) => { if (event.key !== "Escape" && event.key !== "Tab") event.stopPropagation(); }}
          onKeyUp={(event) => { if (event.key === " ") event.stopPropagation(); }}>
          {lines.map(({ key, target }) => <option key={key} value={key}>{target}</option>)}
        </select>
        <div className="phrase-review-value" lang={targetLang} aria-hidden="true">{line.target}</div>
      </div>}
      {!targetOnly && <small lang={helperLang}>{line.helper}</small>}
    </div>
    {line.save}
  </div>;
}
