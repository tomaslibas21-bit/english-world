import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { bookLocale, bookWord as w } from "./bookCopy";
import { BOOK_STATION, RADIO_SKIN } from "../content/radio";
import { radio } from "../radio";
import type { BookChannel } from "../radio/bookChannel";
import type { BookItem, BookSentence } from "../radio/books";
import type { TalkSnapshot } from "../radio/talkPlayer";
import { useStore } from "../state/store";
import { BookInterlinear, readerWord } from "./BookInterlinear";
import { useBookState, usePageVisible } from "./bookHooks";
import { ReaderFollow } from "./bookReaderFollow";
import { Icon } from "./icons";
import { TL } from "./i18n";
import "./books.css";

const time = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

function useReaderClock(channel: BookChannel, state: Readonly<TalkSnapshot>, sentences: Map<string, BookSentence>, visible: boolean) {
  const [clock, setClock] = useState({ word: -1, seconds: Math.floor(state.position) });
  useEffect(() => {
    let frame = 0;
    const read = () => {
      const s = channel.player.getSnapshot();
      const at = visible ? channel.output.position() ?? s.position : s.position;
      const sentence = s.cue && sentences.get(s.cue.sentenceId);
      const item = s.item as BookItem | null;
      const word = sentence && item ? readerWord(sentence, s.cue, at, item.languages.target) : -1;
      const seconds = Math.floor(at);
      setClock((before) => before.word === word && before.seconds === seconds ? before : { word, seconds });
      if (visible && s.status === "playing") frame = requestAnimationFrame(read);
    };
    read();
    return () => cancelAnimationFrame(frame);
  }, [channel, state.cue, state.status, state.position, sentences, visible]);
  return clock;
}

export function BookCourseLink({ channel, state }: { channel: BookChannel; state: Readonly<TalkSnapshot> }) {
  const item = state.item as BookItem | null;
  const chapter = item?.chapter ?? (state.selection ? {
    id: state.selection.chapterId,
    section: state.selection.itemKey.startsWith("story/") ? "stories" as const : "knygos" as const,
  } : null);
  if (!chapter) return null;
  return <a className="quiet" href={channel.source.links(chapter).audio(state.prefs.mode)} referrerPolicy="no-referrer"
    onClick={() => channel.player.pause()}><Icon name="arrowRight" size={17} /><span>{w("course")}</span></a>;
}

const ReaderSentence = memo(function ReaderSentence({ sentence, item, mode, active, audible, word, expanded, translation, number, tabbable, canSeek, setRoving, seek }: {
  sentence: BookSentence; item: BookItem; mode: TalkSnapshot["prefs"]["mode"]; active: boolean; audible?: string;
  word: number; expanded: boolean; translation: boolean; number: number; tabbable: boolean; canSeek: boolean;
  setRoving: (id: string) => void; seek: (id: string) => void;
}) {
  const helperOnly = mode === "helper";
  const targetId = `reader-${sentence.id}-target`, helperId = `reader-${sentence.id}-helper`;
  const showHelper = helperOnly || mode === "paired" || translation;
  return <div className={"pair" + (active ? " active" : "")} data-current={active || undefined} data-reader-pair={sentence.id}>
    <button className="sentence" data-reader-line={sentence.id} tabIndex={tabbable ? 0 : -1} aria-disabled={!canSeek}
      aria-label={w("seek", { n: number })} aria-describedby={helperOnly ? helperId : showHelper ? `${targetId} ${helperId}` : targetId}
      aria-current={active || undefined} onFocus={() => setRoving(sentence.id)} onClick={() => canSeek && seek(sentence.id)}>
      {!helperOnly && <span id={targetId} className={"target-leg" + (audible === item.languages.target ? " audible" : "")}>
        <BookInterlinear sentence={sentence} language={item.languages.target} helper={item.languages.helper} expanded={expanded} word={word} />
      </span>}
      {showHelper && <span id={helperId} lang={item.languages.helper}
        className={(helperOnly ? "helper-primary" : "natural") + (audible === item.languages.helper ? " audible" : "")}>{sentence.helper}</span>}
    </button>
  </div>;
});

export function ReaderPage({ item, state, word, roving, setRoving, seek, expanded, translation }: {
  item: BookItem; state: Readonly<TalkSnapshot>; word: number; roving: string;
  setRoving: (id: string) => void; seek: (id: string) => void; expanded: boolean; translation: boolean;
}) {
  const first = item.paragraphs.find((row) => row.kind !== "break")?.sentences[0]?.id;
  const activeId = state.cue?.sentenceId ?? first;
  const track = item.tracks[state.prefs.mode];
  const seekable = useMemo(() => new Set(track?.cues.map((cue) => cue.sentenceId)), [track]);
  const helperTitle = state.prefs.mode === "helper" && item.chapter.helperTitle;
  let number = 0;
  return <article>
    <header className="page-head">
      {item.book && <p className="label" lang={item.languages.target}>{item.book.title}</p>}
      <h1 lang={helperTitle ? item.languages.helper : item.languages.target}>
        {helperTitle || item.chapter.title}
      </h1>
      {item.chapter.helperTitle && state.prefs.mode !== "helper" && <p className="translation" lang={item.languages.helper}>{item.chapter.helperTitle}</p>}
    </header>
    <div className="reader-lines" onKeyDown={(event) => {
      if (!["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
      const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>(".sentence"));
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      if (index < 0) return;
      event.preventDefault();
      const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 :
        Math.max(0, Math.min(buttons.length - 1, index + (event.key === "ArrowUp" ? -1 : 1)));
      buttons[next].focus();
    }}>
      {item.paragraphs.map((paragraph, p) => paragraph.kind === "break" ? <div className="paragraph-break" data-paragraph-break key={p} /> :
        <div className={"reader-paragraph" + (p > 0 ? " para-start" : "")} key={p}>
          {paragraph.sentences.map((sentence) => {
            const active = sentence.id === activeId;
            return <ReaderSentence key={sentence.id} sentence={sentence} item={item} mode={state.prefs.mode} active={active}
              audible={active ? state.cue?.language : undefined} word={active ? word : -1} expanded={active && expanded}
              translation={translation} number={++number} tabbable={sentence.id === (roving || activeId)}
              canSeek={seekable.has(sentence.id)} setRoving={setRoving} seek={seek} />;
          })}
        </div>)}
    </div>
  </article>;
}

export function BookReader({ channel, covered = false }: { channel: BookChannel; covered?: boolean }) {
  const state = useBookState(channel, (s) => s);
  const item = state.item as BookItem | null;
  const dialog = useRef<HTMLDialogElement>(null);
  const pane = useRef<HTMLDivElement>(null);
  const [follow] = useState(() => new ReaderFollow());
  const [following, setFollowing] = useState(true);
  const [roving, setRoving] = useState("");
  const [translation, setTranslation] = useState(false);
  const textSize = useStore((s) => s.settings.textSize);
  const pageVisible = usePageVisible();
  const visible = pageVisible && !covered;
  const sentences = useMemo(() => new Map(item?.paragraphs.flatMap((row) => row.kind === "break" ? [] : row.sentences.map((s) => [s.id, s] as const))), [item]);
  const { word, seconds } = useReaderClock(channel, state, sentences, visible);
  const current = state.cue?.sentenceId ?? sentences.keys().next().value;
  const track = item?.tracks[state.prefs.mode];
  const seek = useCallback((id: string) => channel.player.seekSentence(id), [channel]);
  const play = () => {
    if (!radio.onBooks && state.selection) radio.read(state.selection);
    else if (state.playIntent) radio.pause();
    else radio.play();
  };

  useLayoutEffect(() => {
    const el = dialog.current!;
    const opener = document.activeElement as HTMLElement | null;
    el.showModal();
    el.querySelector<HTMLElement>("[data-pad-default]")?.focus({ preventScroll: true });
    return () => {
      el.close();
      if (opener?.isConnected && !opener.closest("[inert]")) opener.focus({ preventScroll: true });
    };
  }, []);
  useLayoutEffect(() => {
    const root = dialog.current;
    if (!covered && root && !root.contains(document.activeElement)) {
      root.querySelector<HTMLElement>("[data-book-settings]")?.focus({ preventScroll: true });
    }
  }, [covered]);
  useEffect(() => {
    setTranslation(false);
  }, [current, state.prefs.mode]);
  useLayoutEffect(() => {
    follow.rejoin();
    setFollowing(true);
    setRoving("");
  }, [item?.selection.chapterId, follow]);
  useLayoutEffect(() => {
    const root = pane.current;
    if (!root || !visible) return;
    const align = () => {
      const line = root.querySelector<HTMLElement>("[data-current]");
      if (line) follow.move(root, line);
    };
    align();
    const observer = new ResizeObserver(align);
    observer.observe(root);
    const line = root.querySelector("[data-current]");
    if (line) observer.observe(line);
    return () => observer.disconnect();
  }, [current, item, textSize, state.prefs.mode, state.prefs.interlinear, translation, visible, follow]);
  const suspend = () => { follow.suspend(); setFollowing(false); };
  const rejoin = () => {
    follow.rejoin();
    setFollowing(true);
    const line = pane.current?.querySelector<HTMLElement>("[data-current]");
    if (line && pane.current) {
      follow.move(pane.current, line);
      line.querySelector<HTMLButtonElement>(".sentence")?.focus({ preventScroll: true });
    }
  };
  return <dialog ref={dialog} inert={covered} className={`book-picker book-reader radio-skin-${RADIO_SKIN}`} data-pad-scope="book-reader"
    aria-label={item?.chapter.title ?? w("reader")} onCancel={(event) => { event.preventDefault(); radio.closeReader(); }}
    onClick={(event) => { if (event.target === event.currentTarget) radio.closeReader(); }}
    onKeyDown={(event) => { if (event.key.toLowerCase() !== "r") event.stopPropagation(); }}>
    <section className="book-sheet reader">
      <div className="reader-rail">
        <header className="mast">
          <button className="round back" data-pad-back aria-label={w("back")} onClick={() => radio.closeReader()}><Icon name="arrowLeft" /></button>
          <span className="brand" lang={TL}><Icon name="bookOpen" />{BOOK_STATION.name}</span>
          <span className="frequency">{BOOK_STATION.freq.toLocaleString(bookLocale)} <small>{w("mhz")}</small></span>
        </header>
        <div className="rail-chapter" lang={item?.languages.target}>{item?.chapter.title}</div>
      </div>
      <div className="reading scroll" ref={pane} onWheel={suspend} onTouchMove={suspend}
        onScroll={() => pane.current && setFollowing(follow.scrolled(pane.current.scrollTop))}
        onKeyDown={(event) => { if (["PageUp", "PageDown", "Home", "End"].includes(event.key)) suspend(); }}>
        {state.status === "loading" && <p className="reader-message" role="status">{w("finding")}</p>}
        {state.status === "error" && <div className="reader-message" role="status"><p>{w("audioError")}</p>
          {!channel.output.unavailable && <button className="quiet" onClick={play}>{w("retry")}</button>}</div>}
        {item && <ReaderPage item={item} state={state} word={word} roving={roving} setRoving={setRoving}
          seek={seek} expanded={state.prefs.interlinear} translation={translation} />}
      </div>
      <footer className="player">
        {!following && <button className="rejoin quiet" onClick={rejoin}><Icon name="arrowDown" />{w("rejoin")}</button>}
        <div className="timeline" aria-hidden><span>{time(seconds)}</span><span className="track"><i style={{ width: `${track ? Math.min(100, state.position / track.duration * 100) : 0}%` }} /></span><span>{time(track?.duration ?? 0)}</span></div>
        <div className="transport">
          <button className="round" disabled={!state.cue} aria-label={w("previous")} title={w("previous")} onClick={() => channel.player.stepSentence(-1)}><Icon name="skipBack" /></button>
          <button className="play-key round" disabled={!!channel.output.unavailable} data-pad-default aria-label={w(state.playIntent ? "pause" : "play")} aria-pressed={state.playIntent}
            onClick={play}><Icon name={state.playIntent ? "pause" : "play"} /></button>
          <button className="round" disabled={!state.cue} aria-label={w("next")} title={w("next")} onClick={() => channel.player.stepSentence(1)}><Icon name="skipNext" /></button>
        </div>
        <div className="reader-tools">
          {state.prefs.mode !== "helper" && <button className="meanings" aria-expanded={state.prefs.interlinear}
            onClick={() => channel.player.setInterlinear(!state.prefs.interlinear)}><Icon name="bookOpen" />{w("meanings")}<Icon name="chevronDown" /></button>}
          {state.prefs.mode === "target" && <button className="quiet" aria-expanded={translation}
            onClick={() => setTranslation(!translation)}>{w(translation ? "hideTranslation" : "showTranslation")}</button>}
        </div>
        <div className="reader-links">
          <button className="quiet" data-book-settings onClick={() => radio.openSettings()}><Icon name="settings" /><span>{w("settings")}</span></button>
          <BookCourseLink channel={channel} state={state} />
        </div>
      </footer>
    </section>
  </dialog>;
}
