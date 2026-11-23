import { useEffect, useMemo, useState, type ReactNode } from "react";
import { SITUATION_BY_ID } from "../../content/situations/catalog";
import type { LabelAnchor } from "../../game/road/gates";
import type { RoadResult } from "../../game/road/store";
import type { Prompt, Word } from "../../game/road/words";
import { EndDestination } from "../Conversation";
import { Icon } from "../icons";
import { HL, L, TL } from "../i18n";
import { GlossLine } from "./GlossLine";
import { ScoreCard, ScoreNumber } from "./ScoreCard";
import "./wordGates.css";

const km = new Intl.NumberFormat(HL, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const clockText = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

type CueWords = Record<"title" | "time" | "streak" | "right" | "wrong" | "gap" | "hear" | "hint" | "replay" | "town", string>;
type ScoreWords = Record<"finish" | "points" | "correct" | "bestStreak" | "distance" | "cards" | "again" | "town" | "record" | "missed" | "from" | "guide", string>;

let textMeasure: CanvasRenderingContext2D | null | undefined;

function measureLabel(text: string, font: string) {
  textMeasure ??= document.createElement("canvas").getContext("2d");
  if (textMeasure) {
    textMeasure.font = font;
    textMeasure.textAlign = "center";
  }
  const words = text.split(/\s+/);
  const splits = [[text], ...words.slice(1).map((_, i) => [words.slice(0, i + 1).join(" "), words.slice(i + 1).join(" ")])];
  return splits.map((lines) => ({
    lines,
    em: Math.max(...lines.map((line) => {
      const metrics = textMeasure?.measureText(line);
      return metrics ? Math.max(metrics.width, 2 * (metrics.actualBoundingBoxLeft ?? 0), 2 * (metrics.actualBoundingBoxRight ?? 0)) / 100 : line.length * 0.58;
    })),
  }));
}

function GateLabel({ text, anchor, steer, preferSingleLine }: {
  text: string; anchor: LabelAnchor; steer?: (lane: number) => void; preferSingleLine?: boolean;
}) {
  const { lane, x, y, width, height, opacity, tilt } = anchor;
  const font = useMemo(() => `800 100px ${getComputedStyle(document.documentElement).getPropertyValue("--ui").trim()}`, []);
  const [fontVersion, setFontVersion] = useState(0);
  useEffect(() => {
    if (document.fonts.check(font, text)) return;
    let current = true;
    void document.fonts.load(font, text).then(() => {
      if (current) setFontVersion((version) => version + 1);
    }, () => {});
    return () => { current = false; };
  }, [font, text]);
  const splits = useMemo(() => measureLabel(text, font), [text, font, fontVersion]);
  let fontSize = 0, scale = 1, lines = splits[0].lines;
  for (const split of splits) {
    const fit = width * 0.98 / split.em;
    // A small squeeze can preserve legibility in long words. Leave vertical room for accents.
    const readableFit = Math.max(fit, Math.min(18, fit / 0.88));
    const size = Math.min(32, height / (split.lines.length === 1 ? 1.55 : 2.25), readableFit);
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
  return prompt && <div className="road-gates" lang={prompt.gap ? TL : HL}>
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
        <button className="road-icon" aria-label={L(words.town)} title={L(words.town)} onClick={home}><Icon name="home" size={21} /></button>
        <h1>{L(words.title)}</h1>
        <div className="road-meters">
          <span>{L(words.time)} <b>{clockText(remaining)}</b></span>
          <span>{L(words.streak)} <b>{streak}</b></span>
          {extraMeter}
        </div>
        {extraButton}
      </div>
      {feedback ? <div className={`road-feedback ${feedback.correct ? "correct" : "wrong"}`} aria-live="polite">
        <b>{L(feedback.correct ? words.right : words.wrong)}</b>
        {!feedback.correct && <span><span lang={TL}>{feedback.word.en}</span> · {feedback.word.lt}</span>}
      </div> : prompt && <div className="road-cue">
        <div className="road-question">
          <strong>{L(prompt.gap ? words.gap : words.hear)}</strong>
          {!prompt.gap && <button className="road-icon road-replay" aria-label={L(words.replay)} title={L(words.replay)} onClick={replay}><Icon name="speaker" size={21} /></button>}
        </div>
        {prompt.gap && <div className="road-gap"><GlossLine sentence={prompt.gap.sentence} gloss /></div>}
        {showHint && <p className="road-hint">{L(words.hint)}</p>}
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
    <ScoreCard title={L(words.finish)} ratio={result.right / Math.max(1, result.total)}
      score={<><small>{L(words.points)}</small> <ScoreNumber value={result.points} /></>}
      rows={[
        { label: L(words.correct), value: `${result.right}/${result.total}` },
        { label: L(words.bestStreak), value: result.streak },
        { label: L(words.distance), value: `${km.format(result.distance / 1000)} km` },
      ]}
      phrases={{ label: L(words.cards), count: result.cards }}
      again={{ label: L(words.again), run: actions.again }}
      done={{ label: L(words.town), run: actions.done }}>
        {result.record && <b className="road-record">{L(words.record)}</b>}
        {children}
        {word && <section className="road-missed">
          <h3 id="road-missed-title">{L(words.missed)}</h3>
          <article>
            {result.missed.length === 1 ? <><strong lang={TL}>{word.en}</strong> <span>· {word.lt}</span></> :
              <select aria-labelledby="road-missed-title" value={missedIndex} onChange={e => setMissedIndex(Number(e.target.value))}>
                {result.missed.map((item, i) => <option key={`${item.situation}|${item.en}`} value={i} lang={TL}>{item.en} · {item.lt}</option>)}
              </select>}
            {sit && <><small>{L(words.from)}</small><EndDestination sit={sit} label={L(words.guide)} close={actions.guide} /></>}
          </article>
        </section>}
    </ScoreCard>
  </div>;
}

