import { useMemo } from "react";
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
import { ScoreCard } from "./kit/ScoreCard";
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

function fitLabel(text: string, width: number, height: number) {
  textMeasure ??= document.createElement("canvas").getContext("2d");
  if (textMeasure) textMeasure.font = `900 100px ${getComputedStyle(document.documentElement).getPropertyValue("--ui")}`;
  const parts = text.split(/\s+/);
  const splits = [[text], ...parts.slice(1).map((_, i) => [parts.slice(0, i + 1).join(" "), parts.slice(i + 1).join(" ")])];
  let fontSize = 0;
  let lines = splits[0];
  for (const split of splits) {
    const longest = Math.max(...split.map((line) => textMeasure?.measureText(line).width ?? line.length * 58));
    const size = Math.min(28, width * 94 / longest, height / (split.length * 1.07));
    if (size > fontSize) { fontSize = size; lines = split; }
  }
  return { lines, fontSize };
}

function GateLabel({ text, anchor }: { text: string; anchor: LabelAnchor }) {
  const { lane, x, y, width, height } = anchor;
  const w = Math.floor(width), h = Math.floor(height);
  const { lines, fontSize } = useMemo(() => fitLabel(text, w, h), [text, w, h]);
  return <div className="road-gate" data-lane={lane} aria-label={text} style={{ left: x, top: y, width, height, fontSize }}>
    {lines.map((line, i) => <span key={i}>{line}</span>)}
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
      <div className="road-top">
        <button className="road-icon" aria-label={words.town} title={words.town} onClick={done}><Icon name="home" size={21} /></button>
        <h1>{words.title}</h1>
        {!touch && <button className="road-icon" aria-label={words.horn} title={words.horn} onClick={() => act("horn")}><Icon name="horn" size={21} /></button>}
      </div>
      <div className="road-meters">
        <span>{words.time} <b>{clockText(remaining)}</b></span>
        <span>{words.streak} <b>{streak}</b></span>
        {ghost && <span className="road-ghost">{words.ghost}</span>}
      </div>
      {prompt ? <div className="road-cue">
        <strong>{prompt.gap ? words.gap : words.hear}</strong>
        {prompt.gap ? <div className="road-gap"><GlossLine sentence={prompt.gap.sentence} gloss /></div>
          : <button className="road-icon road-replay" aria-label={words.replay} title={words.replay} onClick={() => act("replay")}><Icon name="speaker" size={21} /></button>}
      </div> : feedback && <div className={`road-feedback ${feedback.correct ? "correct" : "wrong"}`} aria-live="polite">
        <b>{feedback.correct ? words.right : words.wrong}</b>
        {!feedback.correct && <span><span lang={TL}>{feedback.word.en}</span> · {feedback.word.lt}</span>}
      </div>}
      {remaining >= 147 && <p className="road-hint">{words.hint}</p>}
    </header>
    <GateLabels />
    {!touch && <div className="road-controls">{words.controls}</div>}
  </>;
}

function Result({ result }: { result: RoadResult }) {
  return <div className="road-result">
    <ScoreCard title={words.finish} score={<><small>{words.points}</small> {result.points}</>}
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
        {!!result.missed.length && <section className="road-missed">
          <h3>{words.missed}</h3>
          {result.missed.map((word) => {
            const sit = SITUATION_BY_ID[word.situation];
            return <article key={`${word.situation}|${word.en}`}>
              <strong lang={TL}>{word.en}</strong> <span>· {word.lt}</span>
              {sit && <><small>{words.from}</small><EndDestination sit={sit} label={words.guide} close={() => act("guide")} /></>}
            </article>;
          })}
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
