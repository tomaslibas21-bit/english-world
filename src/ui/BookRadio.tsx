import { useState, useSyncExternalStore } from "react";
import { BOOK_STATION, RADIO_SKIN } from "../content/radio";
import { bookLocale, bookPercent, bookWord as w } from "../content/bookCopy";
import { radio, useRadio } from "../radio";
import { type BookItem } from "../radio/books";
import type { TalkSnapshot } from "../radio/talkPlayer";
import { Icon } from "./icons";
import { Jacket } from "./BookPicker";

/** The walking HUD subscribes to cue changes. Only the open set needs the time counter. */
function useTalk<T>(pick: (state: Readonly<TalkSnapshot>) => T) {
  const player = radio.books!.player;
  const snapshot = () => pick(player.getSnapshot());
  return useSyncExternalStore(player.subscribe, snapshot, snapshot);
}

function SpokenLine({ folded = false }: { folded?: boolean }) {
  const cue = useTalk((s) => s.cue);
  const item = useTalk((s) => s.item) as BookItem | null;
  const mode = useTalk((s) => s.prefs.mode);
  if (!cue || !item || (folded && mode !== "target")) return null;
  let translation = "";
  if (mode === "target") {
    for (const paragraph of item.paragraphs) {
      if (paragraph.kind === "break") continue;
      const sentence = paragraph.sentences.find((row) => row.id === cue.sentenceId);
      if (sentence) { translation = sentence.helper; break; }
    }
  }
  return <Line key={`${item.selection.itemKey}/${cue.sentenceId}`} text={cue.text} language={cue.language}
    helper={item.languages.helper} translation={translation} folded={folded} />;
}

function Line({ text, language, helper, translation, folded }: {
  text: string; language: "en" | "lt" | "es"; helper: string; translation: string; folded: boolean;
}) {
  const [revealed, reveal] = useState(false);
  return <>
    {!folded && <div className="walk-meta"><b lang="en"><Icon name="speaker" size={15} />{BOOK_STATION.name}</b><span>{w(language)}</span></div>}
    <div className="spoken" data-helper={language === helper || undefined}>
      <p lang={language}>{text}</p>
      {revealed && <p className="walk-translation" lang={helper}>{translation}</p>}
    </div>
    {translation && <button className="translate" aria-expanded={revealed} onClick={() => reveal(!revealed)}>{w(revealed ? "hideTranslation" : "showTranslation")}</button>}
  </>;
}

export function WalkingBookLine() {
  return <section className={`radio-strip book-walking radio-skin-${RADIO_SKIN}`} aria-label={BOOK_STATION.name}><SpokenLine /></section>;
}

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

export function BookRadioControls() {
  const s = useTalk((state) => state);
  const showText = useRadio((state) => state.showTalkText);
  const item = s.item as BookItem | null;
  const duration = item?.tracks[s.prefs.mode]?.duration ?? 0;
  const fraction = duration ? s.position / duration : 0;
  const note = s.status === "loading" ? w("finding") : s.status === "error" ? w("audioError") : s.status === "ended" ? w("finished") : null;
  const chapter = item?.chapter;
  const books = radio.books!;
  const link = chapter ? books.source.links(chapter).audio(s.prefs.mode) : s.selection && books.source.links({
    section: s.selection.itemKey.startsWith("story/") ? "stories" : "knygos", id: s.selection.chapterId,
  }).audio(s.prefs.mode);
  const firstParagraph = s.status === "error" && item?.paragraphs.find((row) => row.kind !== "break");
  const accessibleLine = s.cue ?? (firstParagraph && firstParagraph.sentences[0]);
  const toggleLabel = w(s.playIntent ? "pause" : "play");
  return <>
    <div className="rs-display">
      <div className="rs-line">
        <span className="rs-spectrum" aria-hidden><i /><i /><i /><i /><i /><i /><i /></span>
        <span className="rs-station" lang="en">{BOOK_STATION.name}</span>
        <span>{BOOK_STATION.freq.toLocaleString(bookLocale)}</span>
        {item && <span className="rs-time">{clock(s.position)}</span>}
      </div>
      <div className="rs-song">
        <div className="rs-now">
          <b lang={item?.languages.target}>{item?.book?.title ?? chapter?.title ?? w("browse")}</b>
          {item?.book && chapter && <span className="rs-sub">{chapter.number ? w("chapter", { n: chapter.number }) : w("introduction")} · <span lang={item.languages.target}>{chapter.title}</span></span>}
          {note && <em>{note}</em>}
          {s.status === "error" && accessibleLine && <span className="rs-sub" lang={"language" in accessibleLine ? accessibleLine.language : item?.languages.target}>
            {"text" in accessibleLine ? accessibleLine.text : accessibleLine.target}
          </span>}
        </div>
        <button className="rs-heart book-glass-cover" onClick={() => radio.browse()} aria-label={w("browse")}>
          {item?.book ? <Jacket urls={item.book.cover} size={160} /> : <Icon name="bookOpen" />}
        </button>
      </div>
      <i className="rs-progress" role="progressbar" aria-label={chapter?.title ?? BOOK_STATION.name} aria-valuenow={Math.round(fraction * 100)}
        aria-valuetext={bookPercent(fraction)}><i style={{ width: `${fraction * 100}%` }} /></i>
    </div>
    <div className="rs-keys">
      <button className="rs-key" data-book-browse aria-label={w("browse")} title={w("browse")} onClick={() => radio.browse()}><Icon name="bookOpen" size={22} /></button>
      <button className="rs-key" aria-label={w("previous")} title={w("previous")} disabled={!s.cue} onClick={() => radio.previous()}><Icon name="skipBack" size={22} /></button>
      <button className="rs-key rs-knob" aria-label={toggleLabel} title={toggleLabel} aria-pressed={s.playIntent}
        onClick={() => s.playIntent ? radio.pause() : radio.play()}><Icon name={s.playIntent ? "pause" : "play"} size={26} /></button>
      <button className="rs-key" aria-label={w("next")} title={w("next")} disabled={!s.cue} onClick={() => radio.next()}><Icon name="skipNext" size={22} /></button>
      <button className={"rs-key" + (showText ? " on" : "")} aria-label={w("showText")} title={w("showText")} aria-pressed={showText}
        onClick={() => radio.setTalkText(!showText)}><Icon name="lyrics" size={22} /></button>
    </div>
    {!showText && s.cue && s.prefs.mode === "target" && <div className="book-folded"><SpokenLine folded /></div>}
    {s.status === "error" && <div className="rs-opts book-errors">
      <button className="rs-opt" onClick={() => radio.play()}>{w("retry")}</button>
      {link && <a className="rs-opt" href={link} referrerPolicy="no-referrer" onClick={() => books.player.pause()}>{w("course")}</a>}
    </div>}
  </>;
}
