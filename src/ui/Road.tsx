import { useEffect, useMemo, useState } from "react";
import { ROAD_UI } from "../content/road";
import { SITUATION_BY_ID } from "../content/situations/catalog";
import { speechSupported } from "../convo/speech";
import { game } from "../game/gameRef";
import type { LabelAnchor } from "../game/road/gates";
import { useRoad, type RoadResult } from "../game/road/store";
import { EndDestination } from "./Conversation";
import { Icon } from "./icons";
import { HL, L, TL } from "./i18n";
import { GlossLine } from "./kit/GlossLine";
import { ScoreCard, ScoreNumber } from "./kit/ScoreCard";
import "./road.css";

const act = (name: string, value?: string | boolean) => game?.modeAction("road", name, value);
const done = () => game?.modeExit();
const words = Object.fromEntries(Object.entries(ROAD_UI).map(([key, value]) => [key, L(value)])) as Record<keyof typeof ROAD_UI, string>;
const km = new Intl.NumberFormat(HL, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const clockText = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

function LiftLine() {
  const line = useRoad((s) => s.line);
  if (!line) return null;
  return <div className="road-lift-line" data-line={line.key}><GlossLine sentence={line.sentence} gloss /></div>;
}

function LiftOffer({ touch }: { touch: boolean }) {
  const choices = useRoad((s) => s.choices);
  const mic = useRoad((s) => s.mic);
  const micOn = useRoad((s) => s.micOn);
  const listening = mic.status === "starting" || mic.status === "listening";
  return <div className="road-lift">
    <LiftLine />
    {!!choices.length && <div className="road-choices">
      {speechSupported() && <div className="road-mic">
        <button className={`mic${listening ? " listening" : ""}`} type="button" aria-label={micOn && listening ? words.micOff : words.micOn}
          onClick={() => act("mic", !(micOn && listening))}><Icon name="mic" size={23} /></button>
        {mic.heard && <span lang={TL}>{mic.heard}</span>}
      </div>}
      {choices.map(({ key, sentence }, i) => <button className="road-choice" type="button" data-line={key} key={key} onClick={() => act("choose", key)}>
        {!touch && <kbd>{i + 1}</kbd>}
        <span lang={TL}>{sentence.en}</span>
        <small lang={HL}>{sentence.nat}</small>
      </button>)}
    </div>}
  </div>;
}

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
      return metrics ? Math.max(metrics.width, 2 * metrics.actualBoundingBoxLeft, 2 * metrics.actualBoundingBoxRight) / 100 : line.length * 0.58;
    })),
  }));
}

function GateLabel({ text, anchor }: { text: string; anchor: LabelAnchor }) {
  const { lane, x, y, width, height, opacity } = anchor;
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
    }
  }
  return <div className="road-gate" data-lane={lane} aria-label={text} style={{ left: x, top: y, width, height, fontSize, opacity }}>
    {lines.map((line, i) => <span key={i} style={{ width: `${100 / scale}%`, transform: `scaleX(${scale})` }}>{line}</span>)}
  </div>;
}

function GateLabels() {
  const prompt = useRoad((s) => s.prompt);
  const anchors = useRoad((s) => s.anchors);
  return prompt && <div className="road-gates" lang={prompt.gap ? TL : HL}>
    {anchors.map((anchor) => <GateLabel key={anchor.lane} text={prompt.options[anchor.lane]} anchor={anchor} />)}
  </div>;
}

function DriveOverlay({ touch }: { touch: boolean }) {
  const prompt = useRoad((s) => s.prompt);
  const feedback = useRoad((s) => s.feedback);
  const remaining = useRoad((s) => s.remaining);
  const streak = useRoad((s) => s.streak);
  const ghost = useRoad((s) => s.ghost);
  const wind = useRoad((s) => s.wind);
  return <>
    {wind && <div className="drive-wind" aria-hidden />}
    <header className="road-header">
      <div className="road-dash">
        <button className="road-icon" aria-label={words.town} title={words.town} onClick={done}><Icon name="home" size={21} /></button>
        <h1>{words.title}</h1>
        <div className="road-meters">
          <span>{words.time} <b>{clockText(remaining)}</b></span>
          <span>{words.streak} <b>{streak}</b></span>
          {ghost && <span className="road-ghost">{words.ghost}</span>}
        </div>
        {!touch && <button className="road-icon" aria-label={words.horn} title={words.horn} onClick={() => act("horn")}><Icon name="horn" size={21} /></button>}
      </div>
      {feedback ? <div className={`road-feedback ${feedback.correct ? "correct" : "wrong"}`} aria-live="polite">
        <b>{feedback.correct ? words.right : words.wrong}</b>
        {!feedback.correct && <span><span lang={TL}>{feedback.word.en}</span> · {feedback.word.lt}</span>}
      </div> : prompt && <div className="road-cue">
        <div className="road-question">
          <strong>{prompt.gap ? words.gap : words.hear}</strong>
          {!prompt.gap && <button className="road-icon road-replay" aria-label={words.replay} title={words.replay} onClick={() => act("replay")}><Icon name="speaker" size={21} /></button>}
        </div>
        {prompt.gap && <div className="road-gap"><GlossLine sentence={prompt.gap.sentence} gloss /></div>}
        {remaining >= 147 && <p className="road-hint">{words.hint}</p>}
      </div>}
    </header>
    <GateLabels />
    {!touch && <div className="road-controls">{words.controls}</div>}
  </>;
}

function Result({ result }: { result: RoadResult }) {
  const [missedIndex, setMissedIndex] = useState(0);
  const word = result.missed[missedIndex];
  const sit = word && SITUATION_BY_ID[word.situation];
  return <div className="road-result">
    <ScoreCard title={words.finish} ratio={result.right / Math.max(1, result.total)}
      score={<><small>{words.points}</small> <ScoreNumber value={result.points} /></>}
      rows={[
        { label: words.correct, value: `${result.right}/${result.total}` },
        { label: words.bestStreak, value: result.streak },
        { label: words.distance, value: `${km.format(result.distance / 1000)} km` },
      ]}
      phrases={{ label: words.cards, count: result.cards }}
      again={{ label: words.again, run: () => act("again") }}
      done={{ label: words.town, run: done }}>
        {result.record && <b className="road-record">{words.record}</b>}
        <LiftLine />
        {word && <section className="road-missed">
          <h3 id="road-missed-title">{words.missed}</h3>
          <article>
            {result.missed.length === 1 ? <><strong lang={TL}>{word.en}</strong> <span>· {word.lt}</span></> :
              <select aria-labelledby="road-missed-title" value={missedIndex} onChange={(e) => setMissedIndex(Number(e.target.value))}>
                {result.missed.map((item, i) => <option key={`${item.situation}|${item.en}`} value={i} lang={TL}>{item.en} · {item.lt}</option>)}
              </select>}
            {sit && <><small>{words.from}</small><EndDestination sit={sit} label={words.guide} close={() => act("guide")} /></>}
          </article>
        </section>}
    </ScoreCard>
  </div>;
}

export function RoadOverlay({ touch }: { touch: boolean }) {
  const phase = useRoad((s) => s.phase);
  const result = useRoad((s) => s.result);
  return <div className="road-overlay" lang={HL}>
    {phase === "lift" && <LiftOffer touch={touch} />}
    {phase === "drive" && <DriveOverlay touch={touch} />}
    {phase === "result" && result && <Result result={result} />}
    {(phase === "loading" || phase === "unavailable") && <div className="road-lift road-loading">
      <strong>{phase === "loading" ? words.title : words.unavailable}</strong>
      <button className="btn" onClick={done}>{words.town}</button>
    </div>}
  </div>;
}
