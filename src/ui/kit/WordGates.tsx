import { useCallback, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { WORD_GATE_UI } from "../../content/road";
import { SITUATION_BY_ID } from "../../content/situations/catalog";
import { boardFaces, BOARD_FONT, faceHeight, FACE_WIDTH, WIDE_BOARD_VIEW, type FaceMode } from "../../game/kit/boardFaces";
import { SayIt } from "./SayIt";
import type { SayItCue } from "../../game/kit/sayIt";
import { karaoke } from "../../game/road/karaoke";
import { gateOptions, gatePhraseEntry } from "../../game/road/phraseEntries";
import type { PlayWay } from "../../game/road/save";
import type { GateFeedback, RoadResult } from "../../game/road/store";
import type { GateWord, Prompt } from "../../game/road/words";
import { EndDestination } from "../Conversation";
import { Interlinear } from "../Interlinear";
import { Icon } from "../icons";
import { HL, L, TL } from "../i18n";
import { FeedbackBadge } from "./FeedbackBadge";
import { fitGateLabel } from "./gateLabelFit";
import { GlossLine } from "./GlossLine";
import { PhraseChooser } from "./PhraseChooser";
import { PhraseSave } from "./PhraseSave";
import { phraseHelper, type PhraseReviewEntry } from "./phraseLine";
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

function typeset(text: string, mode: FaceMode, options: Parameters<typeof fitGateLabel>[3]) {
  const family = globalThis.document?.fonts?.check(`800 32px "${BOARD_FONT}"`, text) ? `"${BOARD_FONT}"` : fallbackFont;
  textMeasure ??= globalThis.document?.createElement("canvas").getContext("2d");
  if (textMeasure) textMeasure.font = `800 100px ${family}`;
  return { ...fitGateLabel(text, mode, (line) => textMeasure?.measureText(line), options), family };
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
  const layouts = useMemo(() => prompt.options.map((text) => typeset(text, mode, prompt.phrase
    ? { maxSize: text.length > 24 ? 25 : 29, maxLines: 3 }
    : { preferSingleLine: mode === "sea" && wide, minSize: mode === "sea" && !wide ? 21 : 0 })),
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

function KaraokeSave({ mode, title }: { mode: FaceMode; title: string }) {
  const player = karaoke[mode];
  const phrase = useSyncExternalStore(player.subscribe, player.snapshot, player.snapshot);
  return phrase && <PhraseSave {...gatePhraseEntry(phrase, title)} />;
}

export function WordGateHeader({ game, sayIt, words, prompt, feedback, remaining, streak, showHint, home, replay, extraButton, extraMeter, questionSlot }: {
  game: FaceMode; sayIt?: SayItCue;
  words: CueWords; prompt?: Prompt; feedback?: GateFeedback;
  remaining: number; streak: number; showHint: boolean; home(): void; replay(): void;
  extraButton?: ReactNode; extraMeter?: ReactNode; questionSlot?: ReactNode;
}) {
  const title = L(words.title);
  const showTargets = !!prompt && (!!prompt.phrase || (!!prompt.gap && !feedback));
  const entries = useMemo(() => prompt && showTargets ? gateOptions(prompt, title) : undefined, [prompt, showTargets, title]);
  return <header className="road-header">
      <div className="road-dash">
        <button className="road-icon" aria-label={L(words.town)} title={L(words.town)} onClick={home}><Icon name="home" size={21} /></button>
        <h1>{L(words.title)}</h1>
        <div className="road-meters">
          <span>{L(words.time)} <b>{clockText(remaining)}</b></span>
          <span>{L(words.streak)} <b>{streak}</b></span>
          {extraMeter}
        </div>
        {!questionSlot && (entries || feedback?.options) && <PhraseChooser entries={entries ?? feedback?.options ?? []} targetOnly={!!entries} />}
        <KaraokeSave mode={game} title={title} />
        {extraButton}
      </div>
      {questionSlot ?? (feedback ? <div className={`road-feedback ${feedback.correct ? "correct" : "wrong"}`} aria-live="polite">
        <FeedbackBadge correct={feedback.correct}>{L(feedback.correct ? words.right : words.wrong)}</FeedbackBadge>
        {(feedback.saveWord || !feedback.correct) && <span className="road-feedback-word">
          <span lang={TL}>{feedback.entry.sentence.en}</span> · {phraseHelper(feedback.entry.sentence)}
        </span>}
        {feedback.saveWord && <PhraseSave {...feedback.entry} />}
        {feedback.gapEntry && <div className="road-gap-review phrase-save-row">
          <div><strong lang={TL}>{feedback.gapEntry.sentence.en}</strong><small lang={HL}>{phraseHelper(feedback.gapEntry.sentence)}</small></div>
          <PhraseSave {...feedback.gapEntry} />
        </div>}
      </div> : prompt && (!prompt.phrase || sayIt) && <div className={`road-cue${prompt.phrase ? " phrase-cue" : ""}`}>
        <div className="road-question">
          <strong>{prompt.phrase?.p ?? L(prompt.gap ? words.gap : words.hear)}</strong>
          {!prompt.gap && <button className="road-icon road-replay" aria-label={L(words.replay)} title={L(words.replay)} onClick={replay}><Icon name="speaker" size={21} /></button>}
          <SayIt game={game} cue={sayIt} />
        </div>
        {prompt.gap && <div className="road-gap">
          <Interlinear s={prompt.gap.sentence} lt ipa={false} partial={TL === "es"} source={{ situationId: prompt.gap.word.situation }} />
        </div>}
        {showHint && <p className="road-hint">{L(words.hint)}</p>}
      </div>)}
    </header>
}

const sameWord = (a: GateWord, b: GateWord) => a.en === b.en && a.situation === b.situation;
const Comeback = () => <small className="road-comeback">{L(WORD_GATE_UI.recovered)}</small>;

function PracticeSelection({ items, index, choose, entries, label, labelledBy }: {
  items: GateWord[]; index: number; choose(index: number): void;
  entries?: readonly PhraseReviewEntry[]; label?: string; labelledBy?: string;
}) {
  const pair = (i: number) => {
    const entry = entries?.[i];
    return entry ? { en: entry.sentence.en, lt: phraseHelper(entry.sentence) } : items[i];
  };
  const { en, lt } = pair(index);
  const entry = entries?.[index];
  const text = <><strong lang={TL}>{en}</strong> <span lang={HL}>· {lt}</span></>;
  return <div className="phrase-save-row">
    {items.length === 1 ? <div>{text}</div> : <div className="road-practice-picker">
      <select aria-label={label} aria-labelledby={labelledBy} value={index} onChange={(event) => choose(Number(event.target.value))}
        onKeyDown={(event) => { if (event.key !== "Escape" && event.key !== "Tab") event.stopPropagation(); }}>
        {items.map(({ en, situation }, i) => {
          const option = pair(i);
          return <option key={`${situation}|${en}`} value={i}>{option.en} · {option.lt}</option>;
        })}
      </select>
      <div className="road-practice-value" aria-hidden="true">{text}</div>
    </div>}
    {entry && <PhraseSave {...entry} />}
  </div>;
}

function PracticeItems({ items, recovered, label, entries }: { items: GateWord[]; recovered: GateWord[]; label: string; entries?: readonly PhraseReviewEntry[] }) {
  const [index, setIndex] = useState(0);
  return <section className="road-missed road-practice">
    <article>
      <PracticeSelection items={items} index={index} choose={setIndex} label={label} entries={entries} />
      {recovered.some((other) => sameWord(items[index], other)) && <Comeback />}
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
    <ScoreCard title={L(words.finish)} ratio={result.right / Math.max(1, result.total)} said={result.said} review={result.review}
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
        {!!practiced.length && <PracticeItems items={practiced} recovered={result.recovered} entries={result.practiceEntries} label={L(result.phrases ? words.cards : words.missed)} />}
        {word && <section className="road-missed">
          <h3 id="road-missed-title">{L(words.missed)}</h3>
          <article>
            <PracticeSelection items={result.missed} index={missedIndex} choose={setMissedIndex}
              labelledBy="road-missed-title" entries={result.missedEntries} />
            {result.recovered.some((item) => sameWord(item, word)) && <Comeback />}
            {sit && <><small>{L(words.from)}</small><EndDestination sit={sit} label={L(words.guide)} close={actions.guide} /></>}
          </article>
        </section>}
    </ScoreCard>
  </div>;
}

