import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { KARAOKE_UI as words } from "../content/karaokeCopy";
import { game } from "../game/gameRef";
import { lineGap, type EchoCall, type WordGap } from "../game/karaoke/practice";
import type { KaraokeSession, KaraokeState } from "../radio/karaokeSession";
import { karaokeReading, karaokeWordAt, karaokeWordTiming, type Timeline } from "../radio/lyrics";
import type { SongLine } from "../radio/songs";
import { Confetti } from "./Confetti";

export type KaraokeAction = (name: string, value?: string | boolean) => void;
const action: KaraokeAction = (name, value) => game?.modeAction("karaoke", name, value);

export function karaokeStatus(take: KaraokeState) {
  if (take.status === "loading") return words.preparing;
  if (take.status === "error") return take.issue === "timing" ? words.timingError : words.audioError;
  if (take.held) return words.held;
  return "";
}

export function karaokeDialogKeys(event: KeyboardEvent<HTMLElement>, act: KaraokeAction) {
  event.stopPropagation();
  if (event.key === "Escape") { event.preventDefault(); act("back"); }
  if (event.key !== "Tab") return;
  const controls = [...event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled), select:not(:disabled), input:not(:disabled)")];
  const first = controls[0], last = controls.at(-1);
  // Reveal focuses the readable sentence. Its following meaning control remains next in native Tab order.
  if (!controls.includes(document.activeElement as HTMLElement) && document.activeElement !== event.currentTarget
    && event.currentTarget.contains(document.activeElement)) return;
  if (!controls.includes(document.activeElement as HTMLElement)) { event.preventDefault(); (event.shiftKey ? last : first)?.focus(); }
  else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
}

interface LyricFrame { current: number; next: number; word: number; atEnd: boolean }
function lyricFrame(session: KaraokeSession, timeline: Timeline | null, turn?: EchoCall | null): LyricFrame {
  if (!timeline) return { current: -1, next: -1, word: -1, atEnd: false };
  const time = session.position();
  const reading = turn ? { current: turn.rows[0], next: -1 } : karaokeReading(timeline, time);
  const word = reading.current >= 0 && !turn ? karaokeWordAt(timeline.lines[reading.current], time) : -1;
  return { ...reading, word, atEnd: reading.current >= 0 && time >= timeline.lines[reading.current].e };
}

function useLyricFrame(session: KaraokeSession, timeline: Timeline | null, turn: EchoCall | null | undefined, playing: boolean) {
  // A seek/pause is a store update, not another playing frame. Read its settled clock in that render too.
  const frame = lyricFrame(session, timeline, turn);
  const [, setFrame] = useState<LyricFrame>(frame);
  useEffect(() => {
    if (!timeline || !playing) return;
    let request = 0;
    const read = () => {
      const next = lyricFrame(session, timeline, turn);
      setFrame((previous) => previous.current === next.current && previous.next === next.next && previous.word === next.word && previous.atEnd === next.atEnd
        ? previous : next);
      request = requestAnimationFrame(read);
    };
    read();
    return () => cancelAnimationFrame(request);
  }, [session, timeline, turn, playing]);
  return frame;
}

const compactQuery = "(max-width: 600px), (max-height: 520px)";
const compact = () => typeof window !== "undefined" && window.matchMedia(compactQuery).matches;
function watchCompact(notify: () => void) {
  const query = window.matchMedia(compactQuery);
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
}

/** Word spans are decorative. A stable sentence remains available in reading order. */
export function KaraokeLyricLine({ line, word, meaning, gap, heard = [] }: { line: SongLine; word: number; meaning: boolean; gap?: { gap: WordGap; hidden: boolean }; heard?: readonly number[] }) {
  const timed = karaokeWordTiming(line);
  const spans = timed && line.u.every((unit) => Number.isInteger(unit[2]) && unit[2] > 0)
    && line.u.reduce((sum, unit) => sum + unit[2], 0) === line.wt.length;
  let offset = 0;
  return <div className="karaoke-current-line" data-line={line.i} data-word={word}>
    <p className="karaoke-accessible" lang="en"><LyricText line={line} gap={gap?.hidden ? gap.gap : undefined} /></p>
    <div className="karaoke-units" aria-hidden>
      {spans ? line.u.map((unit, index) => {
        const from = offset;
        offset += unit[2];
        return <span className="karaoke-unit" key={index}>
          <span className="karaoke-unit-words" lang="en">{line.wt.slice(from, offset).map((text, w) =>
            <span className={"karaoke-word" + (from + w === word ? " now" : "") + (heard.includes(from + w) ? " heard" : "")} key={from + w}>{w > 0 && " "}{gap?.gap.word === from + w
              ? <>{gap.gap.prefix}<span className={"karaoke-word-slot" + (gap.hidden ? " karaoke-blank" : " karaoke-revealed")}
                style={{ width: `${Math.max(2, Array.from(gap.gap.answer).length)}ch` }}>{gap.hidden ? "\u00a0" : gap.gap.answer}</span>{gap.gap.suffix}</> : text}</span>)}</span>
          {meaning && !gap?.hidden && line.part !== "translation" && <small lang="lt">{unit[1]}</small>}
        </span>;
      }) : <span lang="en"><LyricText line={line} gap={gap?.hidden ? gap.gap : undefined} /></span>}
    </div>
    {meaning && !gap?.hidden && line.part !== "translation" && <>
      <dl className={spans ? "karaoke-accessible" : "karaoke-gloss-fallback"}>
        {line.u.map((unit, index) => <div key={index}><dt lang="en">{unit[0]}</dt><dd lang="lt">{unit[1]}</dd></div>)}
      </dl>
      {line.lt && <p className="karaoke-natural" lang="lt">{line.lt}</p>}
    </>}
  </div>;
}

function LyricText({ line, gap }: { line: SongLine; gap?: WordGap }) {
  if (!gap) return line.src;
  return <>{line.wt.slice(0, gap.word).join(" ")}{gap.word > 0 && " "}{gap.prefix}<span lang="lt">{words.missing}</span>{gap.suffix}
    {gap.word < line.wt.length - 1 && " "}{line.wt.slice(gap.word + 1).join(" ")}</>;
}

/** Kept separate so no unmasked source or helper sentence can sneak into a challenge preview. */
export function KaraokeNextLine({ take, row, seconds }: { take: KaraokeState; row: number; seconds: number }) {
  const line = take.timeline?.lines[row];
  if (!line) return null;
  const target = take.timeline?.lines[row + 1];
  if (line.part === "translation" && target && lineGap(target, row + 1, take.practice, seconds)?.hidden) return null;
  const gap = lineGap(line, row, take.practice, seconds);
  return <p className="karaoke-next" aria-label={words.next} lang="en"><LyricText line={line} gap={gap?.hidden ? gap.gap : undefined} /></p>;
}

export function KaraokeSpeed({ take, act }: { take: KaraokeState; act: KaraokeAction }) {
  const label = (rate: number) => `${new Intl.NumberFormat("lt", { maximumFractionDigits: 1 }).format(rate)}×`;
  return <div className="karaoke-rate">
    <label className="karaoke-speed">{words.speed}<select data-pad-adjust aria-label={words.speed} value={take.rate ?? 1}
      disabled={!take.canSlow || take.status === "loading"} aria-describedby={!take.canSlow ? "karaoke-normal-only" : undefined}
      onChange={(event) => act("rate", event.target.value)}>
      <option value="1">{label(1)}</option>{take.canSlow && <option value="0.8">{label(0.8)}</option>}
    </select></label>
    {!take.canSlow && <small id="karaoke-normal-only">{words.normalOnly}</small>}
  </div>;
}

export function KaraokeMic({ take, act }: { take: KaraokeState; act: KaraokeAction }) {
  const mic = take.microphone;
  if (!take.practice?.turn || !mic) return null;
  const busy = ["starting", "listening", "stopping", "waiting"].includes(mic.phase);
  if (!mic.available && !busy && !mic.matches.length && mic.phase !== "unavailable") return null;
  return <div className="karaoke-microphone">
    {mic.available && !mic.used && <>
      <button type="button" disabled={take.held} aria-describedby="karaoke-mic-privacy" onFocus={() => act("microphone-focus", true)}
        onBlur={() => act("microphone-focus", false)} onClick={() => act("microphone")}>{words.microphone}</button>
      <p id="karaoke-mic-privacy">{words.privacy}</p>
    </>}
    {busy && <p role="status">{mic.phase === "starting" || mic.phase === "listening" ? words.listening : words.held}</p>}
    {(mic.phase === "starting" || mic.phase === "listening") && <button type="button" data-pad-back onClick={() => act("microphone-stop")}>{words.stopMicrophone}</button>}
    {mic.matches.length > 0 && <p className="karaoke-heard" role="status">{words.heard}</p>}
    {mic.phase === "unavailable" && <p role="status">{words.microphoneOff}</p>}
  </div>;
}

export function KaraokeFinish({ take, act }: { take: KaraokeState; act: KaraokeAction }) {
  const heading = useRef<HTMLHeadingElement>(null);
  const [celebrate, setCelebrate] = useState(false);
  useEffect(() => { if (!take.held) setCelebrate(true); }, [take.held]);
  useLayoutEffect(() => { heading.current?.focus(); }, []);
  const tally = words.tally.replace("{done}", String(take.practice?.completed ?? 0)).replace("{total}", String(take.practice?.total ?? 0));
  return <div className="karaoke-finish">
    <h2 ref={heading} tabIndex={-1}>{words.applause}</h2>
    <p lang="en">{take.song?.t}</p>
    <p className="karaoke-tally">{tally}</p>
    <div className="karaoke-stage-actions">
      <button type="button" className="karaoke-primary" data-pad-default data-pad-back onClick={() => act("back")}>{words.another}</button>
      <button type="button" onClick={() => act("leave")}>{words.leave}</button>
    </div>
    {celebrate && <Confetti from={heading} />}
  </div>;
}

export function KaraokeStage({ session, take }: { session: KaraokeSession; take: KaraokeState }) {
  const surface = useRef<HTMLElement>(null);
  const header = useRef<HTMLElement>(null);
  const footer = useRef<HTMLDivElement>(null);
  const leave = useRef<HTMLButtonElement>(null);
  const meaningButton = useRef<HTMLButtonElement>(null);
  const reading = useRef<HTMLDivElement>(null), revealFocus = useRef(false);
  const small = useSyncExternalStore(watchCompact, compact, () => false);
  const turn = take.practice?.turn;
  const frame = useLyricFrame(session, take.timeline, turn, take.status === "playing");
  const indices = turn ? turn.rows : frame.current < 0 ? [] : [frame.current];
  const token = indices.join(",");
  const [meaningFor, setMeaningFor] = useState<string | null>(null);
  const lines = indices.flatMap((index) => take.timeline?.lines[index] ? [take.timeline.lines[index]] : []);
  const seconds = session.position();
  const gaps = lines.map((line, index) => lineGap(line, indices[index], take.practice, seconds));
  const hidden = gaps.some((gap) => gap?.hidden);
  const micBusy = !!take.microphone && ["starting", "listening", "stopping", "waiting"].includes(take.microphone.phase);
  const meaning = !micBusy && !hidden && token !== "" && meaningFor === token && take.status !== "ended";
  const canReadMeaning = !micBusy && !hidden && lines.some((line) => line.part !== "translation" && (line.lt || line.u.some((unit) => unit[1])));
  useLayoutEffect(() => {
    if (revealFocus.current && !hidden) { revealFocus.current = false; reading.current?.focus({ preventScroll: true }); }
  }, [hidden]);
  useLayoutEffect(() => { leave.current?.focus(); }, []);
  useLayoutEffect(() => {
    const root = surface.current;
    if (!root) return;
    const measure = () => {
      if (header.current) root.style.setProperty("--kk-header-bottom", `${header.current.getBoundingClientRect().bottom + 12}px`);
      if (footer.current) root.style.setProperty("--kk-controls-bottom", `${footer.current.getBoundingClientRect().height + 24}px`);
    };
    const observer = new ResizeObserver(measure);
    if (header.current) observer.observe(header.current);
    if (footer.current) observer.observe(footer.current);
    measure();
    return () => observer.disconnect();
  }, [take.status === "ended"]);
  useEffect(() => {
    void session.setReading(small && meaning);
    return () => { void session.setReading(false); };
  }, [session, small, meaning]);
  const toggleMeaning = () => {
    void session.setReading(small && !meaning);
    setMeaningFor(meaning ? null : token);
    if (meaning) meaningButton.current?.focus({ preventScroll: true });
  };
  const running = take.status === "playing" || (!!turn && !take.turnPaused);
  const keys = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape" && meaning) { event.preventDefault(); event.stopPropagation(); toggleMeaning(); return; }
    if (event.key === " " && event.target === event.currentTarget) {
      event.preventDefault(); action(running ? "pause" : "resume");
    }
    karaokeDialogKeys(event, action);
  };
  return <section ref={surface} className="karaoke-performance" role="dialog" aria-modal="true" aria-labelledby="karaoke-song-title"
    data-pad-scope="karaoke-stage" onKeyDown={keys} tabIndex={-1} lang="lt" data-echo={!!turn}>
    <header ref={header} className="karaoke-stage-head">
      <div><span>{words.sign}</span><h1 id="karaoke-song-title" lang="en">{take.song?.t}</h1></div>
      {take.status !== "ended" && <button ref={leave} type="button" onClick={() => action("leave")}>{words.leave}</button>}
    </header>
    {take.status === "ended" ? <KaraokeFinish take={take} act={action} /> : <>
      {lines.length > 0 && <section className={"karaoke-reader" + (meaning && small ? " karaoke-meaning-sheet" : "")} aria-label={words.lyrics}>
        {turn && <div className="karaoke-turn"><span role="status">{words.yourTurn}</span><span aria-hidden>{Math.ceil(take.practice!.remaining)}</span></div>}
        <div ref={reading} className="karaoke-reading" tabIndex={-1} onClick={() => { if (canReadMeaning) toggleMeaning(); }}>
          {lines.map((line, index) => <KaraokeLyricLine key={`${line.i}-${index}`} line={line} word={turn || index > 0 ? -1 : frame.word} meaning={meaning} gap={gaps[index]}
            heard={take.microphone?.matches.filter((match) => match.row === indices[index]).map((match) => match.word)} />)}
        </div>
        <KaraokeMic take={take} act={action} />
        {hidden && <button type="button" className="karaoke-reveal karaoke-primary" onClick={() => { revealFocus.current = true; action("reveal"); }}>{words.reveal}</button>}
        {frame.next >= 0 && !turn && !meaning && !hidden && <KaraokeNextLine take={take} row={frame.next} seconds={seconds} />}
        {canReadMeaning && <button ref={meaningButton} type="button" className="karaoke-meaning-toggle" aria-expanded={meaning}
          data-pad-back={meaning || undefined} onClick={toggleMeaning}>{meaning ? words.hideMeaning : words.showMeaning}</button>}
      </section>}
      <div ref={footer} className="karaoke-stage-bottom">
        <p className="karaoke-status" role="status">{karaokeStatus(take)}</p>
        <div className="karaoke-stage-actions">
          <KaraokeSpeed take={take} act={action} />
          <button type="button" data-pad-back={!meaning || undefined} onClick={() => action("back")}>{words.another}</button>
          {lines.length > 0 && <button type="button" disabled={take.status === "loading" || take.held} onClick={() => action("replay")}>{words.replay}</button>}
          {turn && <button type="button" className="karaoke-primary" data-pad-default disabled={take.held} onClick={() => action("continue")}>{words.continue}</button>}
          <button type="button" data-pad-default={!turn || undefined} disabled={take.held || take.status === "loading"} onClick={() => action(take.status === "error" ? "retry" : running ? "pause" : "resume")}>
            {take.status === "error" ? words.retry : running ? words.pause : words.resume}
          </button>
        </div>
      </div>
    </>}
  </section>;
}
