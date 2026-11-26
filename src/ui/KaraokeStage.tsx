import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { KARAOKE_UI as words } from "../content/karaokeCopy";
import { game } from "../game/gameRef";
import type { EchoCall } from "../game/karaoke/practice";
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
  if (!controls.includes(document.activeElement as HTMLElement)) { event.preventDefault(); (event.shiftKey ? last : first)?.focus(); }
  else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
}

interface LyricFrame { current: number; next: number; word: number }
function useLyricFrame(session: KaraokeSession, timeline: Timeline | null, turn?: EchoCall | null) {
  const [frame, setFrame] = useState<LyricFrame>({ current: -1, next: -1, word: -1 });
  useEffect(() => {
    if (!timeline) return;
    let request = 0;
    const read = () => {
      const time = session.position();
      const reading = turn ? { current: turn.rows[0], next: -1 } : karaokeReading(timeline, time);
      const word = reading.current >= 0 && !turn ? karaokeWordAt(timeline.lines[reading.current], time) : -1;
      setFrame((previous) => previous.current === reading.current && previous.next === reading.next && previous.word === word
        ? previous : { ...reading, word });
      request = requestAnimationFrame(read);
    };
    read();
    return () => cancelAnimationFrame(request);
  }, [session, timeline, turn]);
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
export function KaraokeLyricLine({ line, word, meaning }: { line: SongLine; word: number; meaning: boolean }) {
  const timed = karaokeWordTiming(line);
  const spans = timed && line.u.every((unit) => Number.isInteger(unit[2]) && unit[2] > 0)
    && line.u.reduce((sum, unit) => sum + unit[2], 0) === line.wt.length;
  let offset = 0;
  return <div className="karaoke-current-line" data-line={line.i} data-word={word}>
    <p className="karaoke-accessible" lang="en">{line.src}</p>
    <div className="karaoke-units" aria-hidden>
      {spans ? line.u.map((unit, index) => {
        const from = offset;
        offset += unit[2];
        return <span className="karaoke-unit" key={index}>
          <span className="karaoke-unit-words" lang="en">{line.wt.slice(from, offset).map((text, w) =>
            <span className={"karaoke-word" + (from + w === word ? " now" : "")} key={from + w}>{w > 0 && " "}{text}</span>)}</span>
          {meaning && line.part !== "translation" && <small lang="lt">{unit[1]}</small>}
        </span>;
      }) : <span lang="en">{line.src}</span>}
    </div>
    {meaning && line.part !== "translation" && <>
      <dl className={spans ? "karaoke-accessible" : "karaoke-gloss-fallback"}>
        {line.u.map((unit, index) => <div key={index}><dt lang="en">{unit[0]}</dt><dd lang="lt">{unit[1]}</dd></div>)}
      </dl>
      {line.lt && <p className="karaoke-natural" lang="lt">{line.lt}</p>}
    </>}
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
  const small = useSyncExternalStore(watchCompact, compact, () => false);
  const turn = take.practice?.turn;
  const frame = useLyricFrame(session, take.timeline, turn);
  const indices = turn ? turn.rows : frame.current < 0 ? [] : [frame.current];
  const token = indices.join(",");
  const [meaningFor, setMeaningFor] = useState<string | null>(null);
  const meaning = token !== "" && meaningFor === token && take.status !== "ended";
  const lines = indices.flatMap((index) => take.timeline?.lines[index] ? [take.timeline.lines[index]] : []);
  const canReadMeaning = lines.some((line) => line.part !== "translation" && (line.lt || line.u.some((unit) => unit[1])));
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
        <div className="karaoke-reading" onClick={() => { if (canReadMeaning) toggleMeaning(); }}>
          {lines.map((line, index) => <KaraokeLyricLine key={`${line.i}-${index}`} line={line} word={turn || index > 0 ? -1 : frame.word} meaning={meaning} />)}
        </div>
        {frame.next >= 0 && !turn && !meaning && <p className="karaoke-next" aria-label={words.next} lang="en">{take.timeline?.lines[frame.next]?.src}</p>}
        {canReadMeaning && <button ref={meaningButton} type="button" className="karaoke-meaning-toggle" aria-expanded={meaning}
          data-pad-back={meaning || undefined} onClick={toggleMeaning}>{meaning ? words.hideMeaning : words.showMeaning}</button>}
      </section>}
      <div ref={footer} className="karaoke-stage-bottom">
        <p className="karaoke-status" role="status">{karaokeStatus(take)}</p>
        <div className="karaoke-stage-actions">
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
