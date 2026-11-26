import { useCallback, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { SITUATION_BY_ID } from "../../content/situations/catalog";
import { boardFaces, BOARD_FONT, faceHeight, FACE_WIDTH, WIDE_BOARD_VIEW, type FaceMode } from "../../game/kit/boardFaces";
import type { ResolvedPhrase } from "../../game/kit/phrases";
import type { SayItCue } from "../../game/kit/sayIt";
import { karaoke } from "../../game/road/karaoke";
import { gatePhraseEntry, gatePhraseOptions, gateWordEntry } from "../../game/road/phraseEntries";
import type { PlayWay } from "../../game/road/save";
import type { GateFeedback, RoadResult } from "../../game/road/store";
import type { GateWord, Prompt } from "../../game/road/words";
import { EndDestination } from "../Conversation";
import { Icon } from "../icons";
import { FeedbackBadge } from "./FeedbackBadge";
import { GlossLine } from "./GlossLine";
import { PhraseChooser } from "./PhraseChooser";
import { PhraseReviewRow } from "./PhraseReview";
import { PhraseSave } from "./PhraseSave";
import { SayIt } from "./SayIt";
import { ScoreCard, ScoreNumber } from "./ScoreCard";
import "./wordGates.css";

const km = new Intl.NumberFormat("lt-LT", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const clockText = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

type CueWords = Record<"title" | "time" | "streak" | "right" | "wrong" | "gap" | "hear" | "hint" | "replay" | "town", string>;
type ScoreWords = Record<"finish" | "points" | "correct" | "bestStreak" | "distance" | "cards" | "again" | "town" | "record" | "missed" | "from" | "guide", string>;

let textMeasure: CanvasRenderingContext2D | null | undefined;

const fallbackFont = "Arial, sans-serif";
const boardMedia = () => window.matchMedia(`(min-width: ${WIDE_BOARD_VIEW}px)`);
const wideBoard = () => typeof window !== "undefined" && boardMedia().matches;
const subscribeWidth = (change: () => void) => {
  const query = boardMedia();
  query.addEventListener("change", change);
  return () => query.removeEventListener("change", change);
};

function typeset(text: string, mode: FaceMode, phrase: boolean, preferSingleLine: boolean, minSize: number, maxSize: number) {
  const height = faceHeight(mode);
  const family = globalThis.document?.fonts?.check(`800 32px "${BOARD_FONT}"`, text) ? `"${BOARD_FONT}"` : fallbackFont;
  textMeasure ??= globalThis.document?.createElement("canvas").getContext("2d");
  if (textMeasure) textMeasure.font = `800 100px ${family}`;
  const words = text.split(/\s+/);
  const splits = [[text]];
  for (let first = 1; first < words.length; first++) {
    const start = words.slice(0, first).join(" ");
    splits.push([start, words.slice(first).join(" ")]);
    if (!phrase) continue;
    for (let second = first + 1; second < words.length; second++) {
      splits.push([start, words.slice(first, second).join(" "), words.slice(second).join(" ")]);
    }
  }
  let best = { lines: splits[0], size: 0, scale: 1, lineHeight: 1.06 };
  const metrics = new Map<string, TextMetrics | undefined>();
  for (const lines of splits) {
    // On road boards, a three-line phrase can use tighter leading when the ink clears.
    const compact = mode === "road" && lines.length === 3;
    const minScale = compact ? 0.83 : 0.88;
    let width = 0, halfInkHeight = 0, precedingDescent = 0, lineHeight = compact ? 75 : phrase ? 88 : 106;
    for (const line of lines) {
      if (!metrics.has(line)) metrics.set(line, textMeasure?.measureText(line));
      const m = metrics.get(line);
      const advance = m?.width ?? line.length * 58;
      const ascent = m?.actualBoundingBoxAscent ?? 80, descent = m?.actualBoundingBoxDescent ?? 20;
      width = Math.max(width, advance,
        2 * ((m?.actualBoundingBoxLeft ?? 0) + advance / 2),
        2 * ((m?.actualBoundingBoxRight ?? advance) - advance / 2));
      const baseline = ((m?.fontBoundingBoxAscent ?? 80) - (m?.fontBoundingBoxDescent ?? 20)) / 2;
      halfInkHeight = Math.max(halfInkHeight, ascent - baseline, descent + baseline);
      if (phrase) lineHeight = Math.max(lineHeight, precedingDescent + ascent + 4);
      precedingDescent = descent;
    }
    const fitWidth = (FACE_WIDTH - 4) * 100 / width;
    const inkHeight = Math.max(lineHeight, 2 * halfInkHeight) + (lines.length - 1) * lineHeight;
    const size = Math.min(maxSize, height * 100 / inkHeight, fitWidth / minScale);
    if (size > best.size || (size === best.size && lines.length < best.lines.length)) {
      best = { lines, size, scale: Math.max(minScale, Math.min(1, fitWidth / size)), lineHeight: lineHeight / 100 };
    }
    if (preferSingleLine && lines.length === 1 && size >= 20) break;
  }
  // A portrait sea label has a fixed local face. Preserve the em height on unusually long choices.
  const size = Math.max(minSize, best.size);
  return { ...best, size, scale: best.scale * best.size / size, family };
}

function GateLabel({ mode, id, lane, text, layout, steer }: {
  mode: FaceMode; id: number; lane: number; text: string;
  layout: ReturnType<typeof typeset>; steer?: (lane: number) => void;
}) {
  const ref = useCallback((node: HTMLElement | null) => boardFaces[mode].register(id, lane, node), [mode, id, lane]);
  const style = { width: FACE_WIDTH, height: faceHeight(mode), fontSize: layout.size, fontFamily: layout.family, lineHeight: layout.lineHeight };
  const content = <>
    {layout.lines.map((line, i) => <span key={i} style={{ transform: `scaleX(${layout.scale})` }}>{line}</span>)}
    {["tl", "tr", "bl", "br", "center", "em"].map((probe) => <i key={probe} aria-hidden data-face-probe={probe} />)}
  </>;
  const props = { ref, className: "road-gate", "data-lane": lane, "aria-label": text, style };
  return steer ? <button type="button" {...props} onClick={() => steer(lane)}>{content}</button> : <div {...props}>{content}</div>;
}

export function GateLabels({ mode, prompt, gateId, steer, answeredLane }: {
  mode: FaceMode; prompt: Prompt; gateId: number; steer?: (lane: number) => void; answeredLane?: number;
}) {
  const wide = useSyncExternalStore(subscribeWidth, wideBoard, wideBoard);
  const layouts = useMemo(() => prompt.options.map((text) => typeset(text, mode, !!prompt.phrase, !prompt.phrase && mode === "sea" && wide,
    !prompt.phrase && mode === "sea" && !wide ? 21 : 0, prompt.phrase ? (text.length > 24 ? 25 : 29) : 32)),
    [prompt, mode, wide]);
  return <div className="road-gates" data-gate-id={gateId} lang={prompt.gap || prompt.phrase ? "en" : "lt"}>
    {prompt.options.map((text, lane) => (answeredLane === undefined || lane === answeredLane) &&
      <GateLabel key={lane} mode={mode} id={gateId} lane={lane} text={text} layout={layouts[lane]} steer={steer} />)}
  </div>;
}

const ways = [
  { id: "words", title: "Žodžiai", line: "Išgirsk angliškai, pasirink reikšmę" },
  { id: "phrases", title: "Frazės", line: "Išgirsk lietuviškai, pasirink angliškai" },
] as const;

export function WordGateStart({ way, start, done, town }: {
  way: PlayWay; start(way: PlayWay): void; done(): void; town: string;
}) {
  return <div className="word-gate-start">
    <section data-pad-scope="word-setup" role="dialog" aria-labelledby="word-gate-start-title">
      <h2 id="word-gate-start-title">Kaip žaisime?</h2>
      <div className="word-gate-ways">
        {ways.map(({ id, title, line }) => <button key={id} type="button" data-way={id}
          data-pad-default={id === way || undefined} aria-current={id === way || undefined} autoFocus={id === way} onClick={() => start(id)}>
          <strong>{title}</strong><small>{line}</small>
        </button>)}
      </div>
      <button className="btn soft" data-pad-back onClick={done}>{town}</button>
    </section>
  </div>;
}

export function GateKaraoke({ mode, correction }: { mode: FaceMode; correction?: string }) {
  return <div className="road-karaoke-panel">
    {correction && <FeedbackBadge correct={false}>{correction}</FeedbackBadge>}
    <div ref={karaoke[mode].attach} id={`${mode}-karaoke`} lang="en" className="road-karaoke" aria-live="polite" hidden />
  </div>;
}

function KaraokeSave({ mode, title }: { mode: FaceMode; title: string }) {
  const player = karaoke[mode];
  const line = useSyncExternalStore(player.subscribe, player.snapshot, player.snapshot);
  return line && <PhraseSave {...gatePhraseEntry(line.phrase, title, line.situationId)} describedBy={`${mode}-karaoke`} iconOnly />;
}

function GateFeedbackLine({ feedback, words }: { feedback: GateFeedback; words: CueWords }) {
  const entry = gateWordEntry(feedback.word, words.title);
  const showLine = !feedback.correct || !feedback.phrase;
  return <div className={`road-feedback ${feedback.correct ? "correct" : "wrong"}`} aria-live="polite">
    <div className={showLine ? "phrase-save-row" : undefined}>
      <div>
        <FeedbackBadge correct={feedback.correct}>{feedback.correct ? words.right : words.wrong}</FeedbackBadge>
        {showLine && <div><span lang="en">{entry.sentence.en}</span> · {entry.sentence.nat}</div>}
      </div>
      {showLine && <PhraseSave {...entry} iconOnly />}
    </div>
  </div>;
}

export function WordGateHeader({ game, sayIt, words, prompt, feedback, remaining, streak, showHint, home, replay, extraButton, extraMeter, questionSlot }: {
  game: FaceMode; sayIt?: SayItCue;
  words: CueWords; prompt?: Prompt; feedback?: GateFeedback;
  remaining: number; streak: number; showHint: boolean; home(): void; replay(): void;
  extraButton?: ReactNode; extraMeter?: ReactNode; questionSlot?: ReactNode;
}) {
  const options = useMemo(() => prompt?.phrase ? gatePhraseOptions(prompt, words.title) : [], [prompt, words.title]);
  return <header className="road-header" data-pad-aux>
      <div className="road-dash">
        <button className="road-icon" data-pad-back aria-label={words.town} title={words.town} onClick={home}><Icon name="home" size={21} /></button>
        <h1>{words.title}</h1>
        <div className="road-meters">
          <span>{words.time} <b>{clockText(remaining)}</b></span>
          <span>{words.streak} <b>{streak}</b></span>
          {extraMeter}
        </div>
        {extraButton}
        {!questionSlot && !feedback && sayIt && !!options.length && <PhraseChooser key={prompt?.phrase?.id} entries={options} />}
        <KaraokeSave mode={game} title={words.title} />
      </div>
      {questionSlot ?? (feedback?.correcting ? null : feedback ? <GateFeedbackLine feedback={feedback} words={words} /> : prompt && <div className={`road-cue${prompt.phrase ? " phrase-cue" : ""}`}>
        <div className="road-question">
          <strong>{prompt.phrase?.p ?? (prompt.gap ? words.gap : words.hear)}</strong>
          {!prompt.gap && <button className="road-icon road-replay" aria-label={words.replay} title={words.replay} onClick={replay}><Icon name="speaker" size={21} /></button>}
          <SayIt game={game} cue={sayIt} />
        </div>
        {prompt.gap && <div className="road-gap"><GlossLine sentence={prompt.gap.sentence} gloss /></div>}
        {showHint && <p className="road-hint">{words.hint}</p>}
      </div>)}
    </header>
}

const sameWord = (a: GateWord, b: GateWord) => a.en === b.en && a.situation === b.situation;
const Comeback = () => <small className="road-comeback">Šįkart pataikei!</small>;

function PracticeItems({ items, entries, recovered, label, title, missed, guide }: {
  items: GateWord[]; recovered: GateWord[]; label: string; title: string; missed?: boolean;
  entries?: readonly ResolvedPhrase[];
  guide?: { from: string; label: string; run(): void };
}) {
  const [index, setIndex] = useState(0);
  const item = items[index];
  if (!item) return null;
  const entry = entries?.[index] ?? gateWordEntry(item, title);
  const sit = guide && SITUATION_BY_ID[item.situation];
  const full = entry.sentence.en !== item.en;
  const pair = <div className="road-pair">
    {items.length === 1 ? <><strong lang="en">{item.en}</strong> · {item.lt}</> :
      <select data-pad-adjust aria-label={missed ? undefined : label} aria-labelledby={missed ? "road-missed-title" : undefined}
        value={index} onChange={(e) => setIndex(Number(e.target.value))}
        onKeyDown={(e) => { if (e.key !== "Escape" && e.key !== "Tab") e.stopPropagation(); }}
        onKeyUp={(e) => { if (e.key === " ") e.stopPropagation(); }}>
        {items.map(({ en, lt, situation }, i) => <option key={`${situation}|${en}`} value={i}>{en} · {lt}</option>)}
      </select>}
  </div>;
  return <section className={missed ? "road-missed" : "road-missed road-practice"}>
    {missed && <h3 id="road-missed-title">{label}</h3>}
    <article>
      {full && pair}
      <PhraseReviewRow entry={entry}>{!full ? pair : undefined}</PhraseReviewRow>
      {recovered.some((other) => sameWord(item, other)) && <Comeback />}
      {guide && sit && <><small>{guide.from}</small><EndDestination sit={sit} label={guide.label} close={guide.run} /></>}
    </article>
  </section>;
}

export function WordGateResult({ result, words, actions, children }: {
  result: RoadResult; words: ScoreWords & { title: string };
  actions: { again(): void; done(): void; guide(): void }; children?: ReactNode;
}) {
  const practiced = result.phrases ?? result.recovered.filter((item) => !result.missed.some((other) => sameWord(item, other)));
  return <div className="road-result">
    <ScoreCard title={words.finish} ratio={result.right / result.total} said={result.said}
      score={<><small>{words.points}</small> <ScoreNumber value={result.points} /></>}
      rows={[
        { label: words.correct, value: `${result.right}/${result.total}` },
        { label: words.bestStreak, value: result.streak },
        { label: words.distance, value: `${km.format(result.distance / 1000)} km` },
      ]}
      phrases={{ label: words.cards, count: result.cards }}
      review={result.review}
      again={{ label: words.again, run: actions.again }}
      done={{ label: words.town, run: actions.done }}>
        {result.record && <b className="road-record">{words.record}</b>}
        {children}
        {!!practiced.length && <PracticeItems items={practiced} recovered={result.recovered} title={words.title}
          entries={result.practicedReview} label={result.phrases ? words.cards : words.missed} />}
        {!!result.missed.length && <PracticeItems missed items={result.missed} recovered={result.recovered} title={words.title}
          entries={result.missedReview} label={words.missed} guide={{ from: words.from, label: words.guide, run: actions.guide }} />}
    </ScoreCard>
  </div>;
}

