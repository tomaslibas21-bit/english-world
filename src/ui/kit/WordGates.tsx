import { useCallback, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { WORD_GATE_UI } from "../../content/road";
import { SITUATION_BY_ID } from "../../content/situations/catalog";
import { boardFaces, BOARD_FONT, faceHeight, FACE_WIDTH, WIDE_BOARD_VIEW, type FaceMode } from "../../game/kit/boardFaces";
import { SayIt } from "./SayIt";
import type { SayItCue } from "../../game/kit/sayIt";
import { karaoke } from "../../game/road/karaoke";
import type { PlayWay } from "../../game/road/save";
import type { RoadResult } from "../../game/road/store";
import type { GateWord, Prompt } from "../../game/road/words";
import { EndDestination } from "../Conversation";
import { Icon } from "../icons";
import { HL, L, TL } from "../i18n";
import { FeedbackBadge } from "./FeedbackBadge";
import { GlossLine } from "./GlossLine";
import { ScoreCard, ScoreNumber } from "./ScoreCard";
import "./wordGates.css";

const km = new Intl.NumberFormat(HL, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
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

function typeset(text: string, mode: FaceMode, preferSingleLine: boolean, minSize: number, maxSize = 32, maxLines = 2) {
  const height = faceHeight(mode);
  const family = globalThis.document?.fonts?.check(`800 32px "${BOARD_FONT}"`, text) ? `"${BOARD_FONT}"` : fallbackFont;
  textMeasure ??= globalThis.document?.createElement("canvas").getContext("2d");
  if (textMeasure) textMeasure.font = `800 100px ${family}`;
  const words = text.split(/\s+/);
  const splits = [[text], ...words.slice(1).map((_, i) => [words.slice(0, i + 1).join(" "), words.slice(i + 1).join(" ")])];
  if (maxLines === 3) {
    for (let first = 1; first < words.length - 1; first++) {
      for (let second = first + 1; second < words.length; second++) {
        splits.push([words.slice(0, first).join(" "), words.slice(first, second).join(" "), words.slice(second).join(" ")]);
      }
    }
  }
  let best = { lines: splits[0], size: 0, scale: 1, lineHeight: 1.06 };
  for (const lines of splits) {
    let width = 0, halfInkHeight = 0, minLeading = 0, previousDescent = -Infinity;
    for (const line of lines) {
      const m = textMeasure?.measureText(line);
      const advance = m?.width ?? line.length * 58;
      width = Math.max(width, advance,
        2 * ((m?.actualBoundingBoxLeft ?? 0) + advance / 2),
        2 * ((m?.actualBoundingBoxRight ?? advance) - advance / 2));
      const baseline = ((m?.fontBoundingBoxAscent ?? 80) - (m?.fontBoundingBoxDescent ?? 20)) / 2;
      const ascent = m?.actualBoundingBoxAscent ?? 80, descent = m?.actualBoundingBoxDescent ?? 20;
      halfInkHeight = Math.max(halfInkHeight, ascent - baseline, descent + baseline);
      minLeading = Math.max(minLeading, previousDescent + ascent);
      previousDescent = descent;
    }
    const fitWidth = (FACE_WIDTH - 4) * 100 / width;
    // Use the measured ink clearance so three lines can fit without shrinking the road phrase as far.
    const compact = mode === "road" && lines.length === 3;
    const leading = lines.length === 3 ? Math.max(compact ? 76 : 90, minLeading + 2) : 106;
    const minScale = compact ? 0.83 : 0.88;
    const inkHeight = Math.max(leading, 2 * halfInkHeight) + (lines.length - 1) * leading;
    const size = Math.min(maxSize, height * 100 / inkHeight, fitWidth / minScale);
    if (size > best.size) best = { lines, size, scale: Math.max(minScale, Math.min(1, fitWidth / size)), lineHeight: leading / 100 };
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

export function GateLabels({ mode, prompt, gateId, steer, answeredLane, stampedLane }: {
  mode: FaceMode; prompt: Prompt; gateId: number; steer?: (lane: number) => void; answeredLane?: number; stampedLane?: number;
}) {
  const wide = useSyncExternalStore(subscribeWidth, wideBoard, wideBoard);
  const layouts = useMemo(() => prompt.options.map((text) => prompt.phrase
    ? typeset(text, mode, false, 0, text.length > 24 ? 25 : 29, 3)
    : typeset(text, mode, mode === "sea" && wide, mode === "sea" && !wide ? 21 : 0)),
    [prompt, mode, wide]);
  return <div className="road-gates" data-gate-id={gateId} lang={prompt.gap || prompt.phrase ? TL : HL}>
    {prompt.options.map((text, lane) => lane !== stampedLane && (answeredLane === undefined || lane === answeredLane) &&
      <GateLabel key={lane} mode={mode} id={gateId} lane={lane} text={text} layout={layouts[lane]} steer={steer} />)}
  </div>;
}

export function WordGateStart({ way, start, done, town }: {
  way: PlayWay; start(way: PlayWay): void; done(): void; town: string;
}) {
  const ways: PlayWay[] = [way, way === "words" ? "phrases" : "words"];
  return <div className="word-gate-start">
    <section role="dialog" aria-labelledby="word-gate-start-title">
      <h2 id="word-gate-start-title">{L(WORD_GATE_UI.heading)}</h2>
      <div className="word-gate-ways">
        {ways.map((id) => <button key={id} type="button" data-way={id}
          aria-current={id === way || undefined} autoFocus={id === way} onClick={() => start(id)}>
          <strong>{L(WORD_GATE_UI[id].title)}</strong><small>{L(WORD_GATE_UI[id].line)}</small>
        </button>)}
      </div>
      <button className="btn soft" onClick={done}>{L(town)}</button>
    </section>
  </div>;
}

export function GateKaraoke({ mode, wrong }: { mode: FaceMode; wrong: string }) {
  return <div ref={karaoke[mode].attach} className="road-karaoke" aria-live="polite" hidden>
    <FeedbackBadge correct={false}>{L(wrong)}</FeedbackBadge>
    <span className="road-karaoke-line" lang={TL} />
  </div>;
}

export function WordGateHeader({ game, sayIt, words, prompt, feedback, remaining, streak, showHint, home, replay, extraButton, extraMeter, questionSlot }: {
  game: string; sayIt?: SayItCue;
  words: CueWords; prompt?: Prompt; feedback?: { correct: boolean; word: GateWord };
  remaining: number; streak: number; showHint: boolean; home(): void; replay(): void;
  extraButton?: ReactNode; extraMeter?: ReactNode; questionSlot?: ReactNode;
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
      {questionSlot ?? (feedback ? <div className={`road-feedback ${feedback.correct ? "correct" : "wrong"}`} aria-live="polite">
        <FeedbackBadge correct={feedback.correct}>{L(feedback.correct ? words.right : words.wrong)}</FeedbackBadge>
        {!feedback.correct && <span><span lang={TL}>{feedback.word.en}</span> · {feedback.word.lt}</span>}
      </div> : prompt && (!prompt.phrase || sayIt) && <div className={`road-cue${prompt.phrase ? " phrase-cue" : ""}`}>
        <div className="road-question">
          <strong>{prompt.phrase?.p ?? L(prompt.gap ? words.gap : words.hear)}</strong>
          {!prompt.gap && <button className="road-icon road-replay" aria-label={L(words.replay)} title={L(words.replay)} onClick={replay}><Icon name="speaker" size={21} /></button>}
          <SayIt game={game} cue={sayIt} />
        </div>
        {prompt.gap && <div className="road-gap"><GlossLine sentence={prompt.gap.sentence} gloss /></div>}
        {showHint && <p className="road-hint">{L(words.hint)}</p>}
      </div>)}
    </header>
}

const sameWord = (a: GateWord, b: GateWord) => a.en === b.en && a.situation === b.situation;
const Comeback = () => <small className="road-comeback">{L(WORD_GATE_UI.recovered)}</small>;

function PracticeItems({ items, recovered, label }: { items: GateWord[]; recovered: GateWord[]; label: string }) {
  const [index, setIndex] = useState(0);
  const item = items[index];
  return <section className="road-missed road-practice">
    <article>
      {items.length === 1 ? <><strong lang={TL}>{item.en}</strong> · {item.lt}</> :
        <select aria-label={label} value={index} onChange={(e) => setIndex(Number(e.target.value))}>
          {items.map(({ en, lt, situation }, i) => <option key={`${situation}|${en}`} value={i}>{en} · {lt}</option>)}
        </select>}
      {recovered.some((other) => sameWord(item, other)) && <Comeback />}
    </article>
  </section>;
}

export function WordGateResult({ result, words, actions, children }: {
  result: RoadResult; words: ScoreWords;
  actions: { again(): void; done(): void; guide(): void }; children?: ReactNode;
}) {
  const [missedIndex, setMissedIndex] = useState(0);
  const word = result.missed[missedIndex];
  const sit = word && SITUATION_BY_ID[word.situation];
  const practiced = result.phrases ?? result.recovered.filter((item) => !result.missed.some((other) => sameWord(item, other)));
  return <div className="road-result">
    <ScoreCard title={L(words.finish)} ratio={result.right / Math.max(1, result.total)} said={result.said}
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
        {!!practiced.length && <PracticeItems items={practiced} recovered={result.recovered} label={L(result.phrases ? words.cards : words.missed)} />}
        {word && <section className="road-missed">
          <h3 id="road-missed-title">{L(words.missed)}</h3>
          <article>
            {result.missed.length === 1 ? <><strong lang={TL}>{word.en}</strong> <span>· {word.lt}</span></> :
              <select aria-labelledby="road-missed-title" value={missedIndex} onChange={e => setMissedIndex(Number(e.target.value))}>
                {result.missed.map((item, i) => <option key={`${item.situation}|${item.en}`} value={i} lang={TL}>{item.en} · {item.lt}</option>)}
              </select>}
            {result.recovered.some((item) => sameWord(item, word)) && <Comeback />}
            {sit && <><small>{L(words.from)}</small><EndDestination sit={sit} label={L(words.guide)} close={actions.guide} /></>}
          </article>
        </section>}
    </ScoreCard>
  </div>;
}

