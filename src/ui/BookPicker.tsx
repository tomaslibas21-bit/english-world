import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { BOOK_STATION, RADIO_SKIN } from "../content/radio";
import { bookLocale, bookPercent, bookWord as w, chapterCount } from "../content/bookCopy";
import { audio } from "../game/audio";
import { radio } from "../radio";
import type { BookChannel, BookSource } from "../radio/bookChannel";
import type { BookChapter, CoverUrls } from "../radio/books";
import { TALK_LANGUAGES } from "../radio/talkProgress";
import { useStore } from "../state/store";
import { useBookMedia, useBookState } from "./bookHooks";
import { Icon } from "./icons";
import { chapterPlace, continueEntry, coverButtonId, loadShelf, pickerFocus, type ShelfEntry } from "./bookShelf";
import "./books.css";

const chapterLabel = (row: BookChapter) => row.number === 0 ? w("introduction") : w("chapter", { n: row.number });
const ribbon = (fraction: number) => ({ "--place": `${fraction * 100}%` } as CSSProperties);
function chooseSound() {
  if (!radio.store.getState().held && useStore.getState().settings.volume > 0) audio.sfx("soft", 0.3);
}

export function Jacket({ urls, size, story = false }: { urls: CoverUrls; size: 160 | 320; story?: boolean }) {
  const src = urls[size] ?? urls[160];
  const [failed, setFailed] = useState<string>();
  const height = story ? 214 : 241;
  if (!src || src === failed) return <span className="jacket cloth-spine" aria-hidden style={{ aspectRatio: `160 / ${height}` }} />;
  return <img className="jacket" src={src} alt="" draggable={false} width={size} height={height * size / 160}
    onError={() => setFailed(src)} />;
}

function Cover({ entry, source, size, visible = true }: { entry: ShelfEntry; source: BookSource; size: 160 | 320; visible?: boolean }) {
  const [story, setStory] = useState<{ id: string; urls: CoverUrls }>();
  useEffect(() => {
    if (entry.kind !== "stories" || !visible) return;
    let mounted = true;
    void source.storyCover(entry.id).then((urls) => { if (mounted) setStory({ id: entry.id, urls }); }, () => {});
    return () => { mounted = false; };
  }, [entry.id, entry.kind, source, visible]);
  const urls = entry.kind === "books" ? entry.cover : story?.id === entry.id ? story.urls : {};
  return <Jacket urls={visible ? urls : {}} size={size} story={entry.kind === "stories"} />;
}

function Hero({ entry, channel }: { entry: ShelfEntry; channel: BookChannel }) {
  const languages = TALK_LANGUAGES[channel.source.profile];
  return <>
    <div className="hero-jacket"><Cover entry={entry} source={channel.source} size={320} /></div>
    <div className="hero-type">
      <p className="label">{[entry.level, entry.kind === "books" && chapterCount(entry.chapters.length)].filter(Boolean).join(" · ")}</p>
      <h2 lang={languages.target}>{entry.title}</h2>
      <p className="translation" lang={languages.helper}>{entry.helperTitle}</p>
      {entry.author && <p className="author">{entry.author}</p>}
    </div>
  </>;
}

function Introduction({ source, chapter }: { source: BookSource; chapter: BookChapter }) {
  const [expanded, expand] = useState(false);
  const [paragraphs, setParagraphs] = useState<string[]>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!expanded || paragraphs) return;
    const request = new AbortController();
    setFailed(false);
    // A reading note is independent of the player. Parse in an inert template and render only text.
    void source.introduction(chapter, request.signal).then((html) => {
      if (request.signal.aborted) return;
      const template = document.createElement("template");
      template.innerHTML = html;
      setParagraphs(Array.from(template.content.querySelectorAll("p, li"), (p) => p.textContent ?? "").filter(Boolean));
    }, () => { if (!request.signal.aborted) setFailed(true); });
    return () => request.abort();
  }, [expanded, paragraphs, source, chapter, attempt]);
  if (paragraphs?.length === 0) return null;
  return <details className="intro" onToggle={(event) => expand(event.currentTarget.open)}>
    <summary><span className="row-symbol"><Icon name="bookOpen" /></span>{w("introduction")}<Icon name="chevronDown" /></summary>
    <div>{paragraphs ? paragraphs.map((p, index) => <p key={index}>{p}</p>) : failed ?
      <button className="quiet" onClick={() => setAttempt(attempt + 1)}>{w("retry")}</button> : w("finding")}</div>
  </details>;
}

export function BookDetail({ channel, entry, listen }: { channel: BookChannel; entry: ShelfEntry; listen: (row: BookChapter) => void }) {
  const place = chapterPlace(entry, channel.progress.getSnapshot());
  const playing = useBookState(channel, (state) => state.status === "playing" ? state.selection : null);
  return <div className="detail-layout">
    <article className="detail-hero"><Hero entry={entry} channel={channel} /></article>
    <div className="contents scroll">
      <div className="contents-title"><h3>{w(entry.kind === "stories" ? "stories" : "chapters")}</h3>
        {entry.kind === "books" && <span className="chapter-total">{entry.chapters.length}</span>}</div>
      {entry.kind === "books" && channel.source.profile === "em-lt" && entry.chapters[0]?.number === 1 &&
        <Introduction key={entry.id} chapter={entry.chapters[0]} source={channel.source} />}
      {entry.chapters.map((row) => {
        const mark = place.marks[row.id];
        const current = place.current?.id === row.id;
        const sounding = current && playing?.itemKey === row.selection.itemKey && playing.chapterId === row.id;
        return <button key={row.id} id={`chapter-${row.id}`} className={"chapter" + (current ? " current" : "")}
          data-pad-default={row === place.chapter || undefined} disabled={!row.hasAudio} aria-current={current || undefined}
          onClick={() => listen(row)}>
          <span className="num">{entry.kind === "stories" ? <Icon name="bookOpen" /> : row.number === 0 ? w("introduction") : String(row.number).padStart(2, "0")}</span>
          <span className="chapter-copy"><span className="chapter-name" lang={TALK_LANGUAGES[channel.source.profile].target}>{row.title}</span>
            {(mark?.complete || current) && <span className="status"><Icon name={mark?.complete ? "check" : sounding ? "speaker" : "bookOpen"} />
              {mark?.complete ? w("finished") : w(sounding ? "current" : "stoppedHere")}</span>}</span>
          <Icon name="chevronRight" />
        </button>;
      })}
    </div>
    <footer className="detail-foot"><button className="primary" disabled={!place.chapter} onClick={() => place.chapter && listen(place.chapter)}>
      <Icon name="play" />{w(place.action)}</button></footer>
  </div>;
}

function ResumeCard({ resume, channel, listen }: {
  resume: NonNullable<ReturnType<typeof continueEntry>>; channel: BookChannel; listen: (row: BookChapter) => void;
}) {
  return <button className="resume" data-pad-default onClick={() => listen(resume.chapter)}>
    <span className="resume-art"><Cover entry={resume.entry} source={channel.source} size={160} /></span>
    <span className="resume-type">
      <span className="resume-label"><Icon name="play" />{w("resume")}</span>
      <span className="target-title" lang={TALK_LANGUAGES[channel.source.profile].target}>{resume.entry.title}</span>
      {resume.entry.kind === "books" && <span className="resume-chapter">
        {chapterLabel(resume.chapter)} · <span lang={TALK_LANGUAGES[channel.source.profile].target}>{resume.chapter.title}</span>
      </span>}
      <span className="bookmark-line"><span className="stitch" style={ribbon(resume.fraction)} />
        <span role="img" aria-label={w("complete", { percent: bookPercent(resume.fraction) })}>{bookPercent(resume.fraction)}</span>
      </span>
    </span>
  </button>;
}

const wideQuery = "(min-width: 651px), (min-width: 600px) and (max-height: 500px)";

export function BookPicker({ channel, covered = false }: { channel: BookChannel; covered?: boolean }) {
  const [entries, setEntries] = useState<ShelfEntry[]>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [collection, setCollection] = useState<ShelfEntry["kind"]>("books");
  const [selectedId, select] = useState("");
  const [detail, setDetail] = useState(false);
  const [visible, setVisible] = useState<Set<string>>(() => new Set());
  const dialog = useRef<HTMLDialogElement>(null);
  const pane = useRef<HTMLDivElement>(null);
  const returnTo = useRef("");
  const returnChapter = useRef("");
  const scrollTop = useRef(0);
  const textSize = useStore((state) => state.settings.textSize);
  const large = textSize >= 1.3;
  const wide = useBookMedia(wideQuery);
  const landscape = useBookMedia("(min-width: 600px) and (max-height: 500px)");
  const list = useMemo(() => entries?.filter((entry) => entry.kind === collection) ?? [], [entries, collection]);
  const selected = list.find((entry) => entry.id === selectedId) ?? list[0];
  const progress = useSyncExternalStore(channel.progress.subscribe, channel.progress.getSnapshot, channel.progress.getSnapshot);
  const resume = useMemo(() => continueEntry(entries ?? [], progress), [entries, progress]);
  const langs = TALK_LANGUAGES[channel.source.profile];

  useLayoutEffect(() => {
    const el = dialog.current!;
    el.showModal();
    return () => el.close();
  }, []);
  useEffect(() => {
    const request = new AbortController();
    setFailed(false);
    void loadShelf(channel.source, request.signal, (result) => { setEntries(result.entries); setFailed(result.failed); });
    return () => request.abort();
  }, [channel, attempt]);

  // Keep the catalog, resume, preview and glass under ten mounted jackets in total.
  useEffect(() => {
    const root = pane.current;
    if (!root || detail || list.length <= 2) return;
    const cards = Array.from(root.querySelectorAll<HTMLElement>("[data-book]"));
    const visibleCards = new Set<Element>();
    const observer = new IntersectionObserver((changes) => {
      for (const change of changes) {
        if (change.isIntersecting) visibleCards.add(change.target);
        else visibleCards.delete(change.target);
      }
      setVisible(new Set(cards.filter((card) => visibleCards.has(card)).slice(0, (wide ? 8 : 6) - Number(!!resume)).map((card) => card.dataset.book!)));
    }, { root });
    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [list, detail, !!resume, wide]);

  useLayoutEffect(() => {
    if (covered) return;
    const root = dialog.current!;
    if (!detail && pane.current) pane.current.scrollTop = scrollTop.current;
    pickerFocus(root, detail ? returnChapter.current : returnTo.current)?.focus({ preventScroll: true });
    if (detail) root.querySelector("[data-pad-default]")?.scrollIntoView({ block: "nearest", behavior: "instant" });
  }, [detail, entries, failed, covered]);

  const back = () => { if (detail) setDetail(false); else radio.closeShelf(); };
  const inspect = (entry: ShelfEntry) => {
    select(entry.id);
    scrollTop.current = pane.current?.scrollTop ?? 0;
    returnTo.current = coverButtonId(entry.id);
    setDetail(true);
    chooseSound();
  };
  const listen = (row: BookChapter) => {
    returnChapter.current = detail ? `chapter-${row.id}` : "";
    chooseSound();
    radio.read(row.selection);
  };
  const resumeCard = resume && <ResumeCard resume={resume} channel={channel} listen={listen} />;
  return <dialog ref={dialog} inert={covered} className={`book-picker radio-skin-${RADIO_SKIN}`} data-large={large || undefined}
    data-default-size={textSize === 1 || undefined} data-sparse={entries && (detail ? selected && selected.chapters.length <= 2 : list.length <= 2) || undefined}
    data-pad-phase={detail ? "detail" : collection} data-pad-scope={detail ? "book-detail" : "book-shelf"} aria-label={detail ? selected?.title : w("library")}
    onCancel={(event) => { event.preventDefault(); back(); }}
    onClick={(event) => { if (event.target === event.currentTarget) back(); }}
    onKeyDown={(event) => { if (event.key.toLowerCase() !== "r") event.stopPropagation(); }}>
    <section className={"book-sheet " + (detail ? "detail" : "shelf")}>
      <header className="mast">
        <button className="round back" data-pad-back aria-label={w("back")} onClick={back}><Icon name="arrowLeft" /></button>
        <span className="brand" lang="en"><Icon name="bookOpen" />{BOOK_STATION.name}</span>
        <span className="frequency">{BOOK_STATION.freq.toLocaleString(bookLocale)} <small>{w("mhz")}</small></span>
      </header>
      {detail && selected ? <BookDetail entry={selected} channel={channel} listen={listen} /> :
        <div className="shelf-body">
          <div className="catalog-pane scroll" ref={pane}>
            <h1>{w("library")}</h1>
            {!landscape && resumeCard}
            <nav className="tabs" aria-label={w("collections")}>{(["books", "stories"] as const).map((kind) =>
              <button key={kind} aria-pressed={collection === kind} onClick={() => {
                if (collection === kind) return;
                setCollection(kind); select(""); setVisible(new Set()); scrollTop.current = 0; returnTo.current = "";
              }}>{w(kind)}</button>)}</nav>
            {!entries ? <div className="shelf-message" role="status">
              {w(failed ? "catalogError" : "opening")}
              {failed && <button className="quiet" data-pad-default onClick={() => setAttempt(attempt + 1)}>{w("retry")}</button>}
            </div> : !list.length ? <p className="shelf-message">{w("empty")}</p> :
              <div className={"catalog-grid" + (collection === "stories" ? " story-grid" : "")}>
                {list.map((entry, index) => {
                  const place = chapterPlace(entry, progress);
                  return <button className="catalog-card" key={entry.id} data-book={entry.id} data-cover-expected={entry.kind === "books" && !!entry.cover[160] || undefined} id={coverButtonId(entry.id)}
                    data-pad-default={(!resume && index === 0) || undefined} aria-current={selected === entry || undefined}
                    onClick={(event) => { if (!wide || landscape || event.detail === 0) inspect(entry); else { select(entry.id); chooseSound(); } }}>
                    <span className="cover-well"><Cover entry={entry} source={channel.source} size={160} visible={list.length <= 2 || visible.has(entry.id)} /></span>
                    <span className="catalog-type"><span className="target-title" lang={langs.target}>{entry.title}</span>
                      <span className="translation" lang={langs.helper}>{entry.helperTitle}</span>
                      <span className="author">{entry.author || entry.level}</span>
                      {place.started && <span className="progress-mark" role="img" aria-label={w("finishedCount", { done: place.done, total: entry.chapters.length })}
                        style={ribbon((place.done + (place.current ? place.fraction : 0)) / entry.chapters.length)}><i /></span>}
                    </span><Icon name="chevronRight" />
                  </button>;
                })}
              </div>}
          </div>
          {wide && selected && <aside className="rail scroll" aria-label={w(landscape && resume ? "resume" : "selected")}>
            {landscape && resume ? resumeCard : <>
              <div className="rail-hero"><Hero channel={channel} entry={selected} /></div>
              <button className="rail-action" onClick={() => inspect(selected)}><Icon name="chevronRight" />{w(selected.kind === "stories" ? "stories" : "chapters")}</button>
            </>}
          </aside>}
        </div>}
    </section>
  </dialog>;
}
