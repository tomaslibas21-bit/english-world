import { useMemo, useState, type ReactNode } from "react";
import { SITUATION_BY_ID } from "../../content/situations/catalog";
import type { LabelAnchor } from "../../game/road/gates";
import type { RoadResult } from "../../game/road/store";
import type { Prompt, Word } from "../../game/road/words";
import { EndDestination } from "../Conversation";
import { Icon } from "../icons";
import { GlossLine } from "./GlossLine";
import { ScoreCard, ScoreNumber } from "./ScoreCard";
import "./wordGates.css";

const km = new Intl.NumberFormat("lt-LT", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const clockText = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

type CueWords = Record<"title" | "time" | "streak" | "right" | "wrong" | "gap" | "hear" | "hint" | "replay" | "town", string>;
type ScoreWords = Record<"finish" | "points" | "correct" | "bestStreak" | "distance" | "cards" | "again" | "town" | "record" | "missed" | "from" | "guide", string>;

let textMeasure: CanvasRenderingContext2D | null | undefined;

function measureLabel(text: string) {
  textMeasure ??= document.createElement("canvas").getContext("2d");
  if (textMeasure) textMeasure.font = `800 100px ${getComputedStyle(document.documentElement).getPropertyValue("--ui")}`;
  const words = text.split(/\s+/);
  const splits = [[text], ...words.slice(1).map((_, i) => [words.slice(0, i + 1).join(" "), words.slice(i + 1).join(" ")])];
  return splits.map((lines) => ({
    lines,
    em: Math.max(...lines.map((line) => (textMeasure?.measureText(line).width ?? line.length * 58) / 100)),
  }));
}

function GateLabel({ text, anchor, steer, preferSingleLine }: {
  text: string; anchor: LabelAnchor; steer?: (lane: number) => void; preferSingleLine?: boolean;
}) {
  const { lane, x, y, width, height, opacity, tilt } = anchor;
  const splits = useMemo(() => measureLabel(text), [text]);
  let fontSize = 0, scale = 1, lines = splits[0].lines;
  for (const split of splits) {
    const fit = width * 0.98 / split.em;
    // Keep tall letterforms for long words using at most a modest width squeeze.
    const readableFit = Math.max(fit, Math.min(18, fit / 0.88));
    const size = Math.min(32, height / (split.lines.length === 1 ? 1.55 : 2.16), readableFit);
    if (size > fontSize) {
      fontSize = size;
      scale = Math.min(1, fit / size);
      lines = split.lines;
      if (preferSingleLine && lines.length === 1 && fontSize >= 20) break;
    }
  }
  const transform = tilt === undefined ? undefined : `translate(-50%, -50%) rotate(${tilt}rad)`;
  const style = { left: x, top: y, width, height, fontSize, opacity, transform };
  const content = lines.map((line, i) => <span key={i} style={{ width: `${100 / scale}%`, transform: `scaleX(${scale})` }}>{line}</span>);
  const props = { className: "road-gate", "data-lane": lane, "aria-label": text, style };
  return steer ? <button type="button" {...props} onClick={() => steer(lane)}>{content}</button>
    : <div {...props}>{content}</div>;
}

export function GateLabels({ prompt, anchors, steer, preferSingleLine }: {
  prompt?: Prompt; anchors: LabelAnchor[]; steer?: (lane: number) => void; preferSingleLine?: boolean;
}) {
  return prompt && <div className="road-gates" lang={prompt.gap ? "en" : "lt"}>
    {anchors.map((anchor) => <GateLabel key={anchor.lane} text={prompt.options[anchor.lane]} anchor={anchor} steer={steer} preferSingleLine={preferSingleLine} />)}
  </div>;
}

export function WordGateHeader({ words, prompt, feedback, remaining, streak, showHint, home, replay, extraButton, extraMeter }: {
  words: CueWords; prompt?: Prompt; feedback?: { correct: boolean; word: Word };
  remaining: number; streak: number; showHint: boolean; home(): void; replay(): void;
  extraButton?: ReactNode; extraMeter?: ReactNode;
}) {
  return <header className="road-header">
      <div className="road-dash">
        <button className="road-icon" aria-label={words.town} title={words.town} onClick={home}><Icon name="home" size={21} /></button>
        <h1>{words.title}</h1>
        <div className="road-meters">
          <span>{words.time} <b>{clockText(remaining)}</b></span>
          <span>{words.streak} <b>{streak}</b></span>
          {extraMeter}
        </div>
        {extraButton}
      </div>
      {feedback ? <div className={`road-feedback ${feedback.correct ? "correct" : "wrong"}`} aria-live="polite">
        <b>{feedback.correct ? words.right : words.wrong}</b>
        {!feedback.correct && <span><span lang="en">{feedback.word.en}</span> · {feedback.word.lt}</span>}
      </div> : prompt && <div className="road-cue">
        <div className="road-question">
          <strong>{prompt.gap ? words.gap : words.hear}</strong>
          {!prompt.gap && <button className="road-icon road-replay" aria-label={words.replay} title={words.replay} onClick={replay}><Icon name="speaker" size={21} /></button>}
        </div>
        {prompt.gap && <div className="road-gap"><GlossLine sentence={prompt.gap.sentence} gloss /></div>}
        {showHint && <p className="road-hint">{words.hint}</p>}
      </div>}
    </header>
}

export function WordGateResult({ result, words, actions, children }: {
  result: RoadResult; words: ScoreWords;
  actions: { again(): void; done(): void; guide(): void }; children?: ReactNode;
}) {
  const [missedIndex, setMissedIndex] = useState(0);
  const word = result.missed[missedIndex];
  const sit = word && SITUATION_BY_ID[word.situation];
  return <div className="road-result">
    <ScoreCard title={words.finish} ratio={result.right / result.total}
      score={<><small>{words.points}</small> <ScoreNumber value={result.points} /></>}
      rows={[
        { label: words.correct, value: `${result.right}/${result.total}` },
        { label: words.bestStreak, value: result.streak },
        { label: words.distance, value: `${km.format(result.distance / 1000)} km` },
      ]}
      phrases={{ label: words.cards, count: result.cards }}
      again={{ label: words.again, run: actions.again }}
      done={{ label: words.town, run: actions.done }}>
        {result.record && <b className="road-record">{words.record}</b>}
        {children}
        {word && <section className="road-missed">
          <h3 id="road-missed-title">{words.missed}</h3>
          <article>
            {result.missed.length === 1 ? <><strong lang="en">{word.en}</strong> · {word.lt}</> :
              <select aria-labelledby="road-missed-title" value={missedIndex} onChange={e => setMissedIndex(Number(e.target.value))}>
                {result.missed.map((item, i) => <option key={`${item.situation}|${item.en}`} value={i}>{item.en} · {item.lt}</option>)}
              </select>}
            {sit && <><small>{words.from}</small><EndDestination sit={sit} label={words.guide} close={actions.guide} /></>}
          </article>
        </section>}
    </ScoreCard>
  </div>;
}

