// Read-only course units. Keep a multiword unit and its complete gloss in one wrapping box.
import { Fragment } from "react";
import type { BookSentence, BookUnit } from "../radio/books";
import type { TalkCue } from "../radio/talkPlayer";
import type { TalkLanguage } from "../radio/talkProgress";

const normalized = (text: string) => text.normalize("NFC").replaceAll("*", "").trim().replace(/\s+/g, " ");

export function readerUnits(sentence: BookSentence): { units: readonly BookUnit[]; aligned: boolean } {
  const aligned = !!sentence.units.length && normalized(sentence.units.map(([text]) => text).join(" ")) === normalized(sentence.target);
  return { units: aligned ? sentence.units : [[sentence.target, "", ""]], aligned };
}

/** A missing, revised or non-target clock leaves emphasis on the complete sentence. */
export function readerWord(sentence: BookSentence, cue: TalkCue | null, at: number, target: string): number {
  if (!cue?.words || cue.sentenceId !== sentence.id || cue.textHash !== sentence.textHash || cue.language !== target ||
      normalized(cue.text) !== normalized(sentence.target) || cue.words.length !== sentence.target.trim().split(/\s+/).length ||
      at < cue.start || at >= cue.end) return -1;
  return cue.words.findIndex((span) => span !== null && at >= span[0] && at < span[1]);
}

export function BookInterlinear({ sentence, language, helper, expanded, word = -1 }: {
  sentence: BookSentence; language: TalkLanguage; helper: TalkLanguage; expanded: boolean; word?: number;
}) {
  const { units } = readerUnits(sentence);
  let tokenIndex = 0;
  return <span className={"il" + (expanded ? " expanded" : "")} lang={language}>
    {units.map(([text, gloss], i) => {
      const fragments = text.match(/\s+|\S+/g) ?? [];
      return <Fragment key={i}>{i > 0 && !expanded ? " " : null}<span className="u">
        <span>{fragments.map((fragment, j) => {
          if (/^\s+$/.test(fragment)) return fragment;
          const current = tokenIndex++;
          return current === word ? <u key={j} data-book-word={current}>{fragment}</u> : <Fragment key={j}>{fragment}</Fragment>;
        })}</span>
        {expanded && <small lang={helper}>{gloss.trim() ? gloss : "\u00a0"}</small>}
      </span></Fragment>;
    })}
  </span>;
}
