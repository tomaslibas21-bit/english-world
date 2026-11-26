// The town's radio set opens over the town from the dial plate, or from the radio button in a phone's menu.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useStore } from "../state/store";
import { bookLocale, bookWord as w } from "../content/bookCopy";
import { ScenePicker } from "./ScenePicker";
import { SceneRadioControls, WalkingSceneLine } from "./SceneRadio";
import { BookPicker } from "./BookPicker";
import { BookRadioControls, WalkingBookLine } from "./BookRadio";
import { RADIO_NAME, RADIO_SKIN, STATIONS } from "../content/radio";
import { notedLineAt } from "../radio/extras";
import { LYRIC_SIZES, type Station, type TalkStation } from "../radio/playlist";
import { bindRadio, radio, useRadio } from "../radio";
import { lineAt, shortGloss, unitAt } from "../radio/lyrics";
import { spotLineAt, type ReadySpot } from "../radio/spots";
import { Icon } from "./icons";
import "./radio.css";

const SKIN = `radio-skin-${RADIO_SKIN}`;
const SPOT_AD = "Reklama";
/** The set's FM dial. */
const DIAL = { from: 88, to: 108, marks: [88, 92, 96, 100, 104, 108] };
/** A frequency's place across the dial window, which keeps a margin at both ends for the first and last number. */
const onDial = (freq: number) => `${6 + Math.max(0, Math.min(1, (freq - DIAL.from) / (DIAL.to - DIAL.from))) * 88}%`;

/** A folded phone menu carries the radio's lamp while the radio is on. */
export function RadioMenuLamp() {
  const on = useRadio((s) => s.available && s.on);
  return on ? <span className={"radio-lamp " + SKIN} aria-hidden /> : null;
}

export function RadioTool({ phone = false }: { phone?: boolean }) {
  const available = useRadio((s) => s.available);
  const on = useRadio((s) => s.on);
  const open = useRadio((s) => s.open);
  const bars = useRadio((s) => phone && s.on && s.playing);
  useEffect(() => { bindRadio(); }, []);
  if (!available) return null;
  const title = phone ? "Radijas" : on ? "Išjungti radiją (R)" : "Įjungti radiją (R)";
  return (
    <div className={"radio-tool " + SKIN}>
      <button className={"icon-btn radio-btn" + (on ? " on" : "")} onClick={() => phone ? radio.tap() : radio.power()} title={title} aria-label={title}
        aria-pressed={phone ? undefined : on} aria-haspopup={phone ? "dialog" : undefined} aria-expanded={phone ? open : undefined}>
        <Icon name="radio" size={25} />{!phone && <span className="key" aria-hidden>R</span>}
        <span className="radio-lamp" aria-hidden />
        {bars && <span className="radio-eq" aria-hidden><i /><i /><i /></span>}
      </button>
      {!phone && on && !open && <RadioPlate />}
    </div>
  );
}

export function RadioSetLayer() {
  const open = useRadio((s) => s.available && s.open);
  return open ? <RadioSet /> : null;
}

/** While the radio plays: the station's name on a small plate beside the button. A new song's title shows on it for
 *  a few seconds. A tap opens the radio set (the small chevron says so). */
function RadioPlate() {
  const station = useRadio((s) => s.station);
  const song = useRadio((s) => s.song);
  const playing = useRadio((s) => s.playing);
  const [title, setTitle] = useState<string | null>(null);
  const last = useRef<string | null>(null);
  useEffect(() => {
    if (!playing || !song || song.id === last.current) return;
    last.current = song.id;
    setTitle(song.t);
    const t = setTimeout(() => setTitle(null), 5000);
    return () => clearTimeout(t);
  }, [playing, song]);
  const talk = radio.talkStations.find((s) => s.id === station);
  const name = talk?.name ?? STATIONS.find((s) => s.id === station)?.name ?? "";
  const label = talk ? w("stations") : "Stotys ir dainos";
  return (
    <button className={"radio-plate" + (playing ? " playing" : "")} onClick={() => radio.setOpen(true)} title={label} aria-label={`${name}. ${label}`}>
      <span className="radio-eq" aria-hidden><i /><i /><i /></span>
      <span className="radio-plate-text" lang="en" key={title ?? name}>{talk ? name : title ?? name}</span>
      <Icon name="chevronDown" size={15} strokeWidth={2.25} className="radio-plate-more" />
    </button>
  );
}

/** Papel picado: a string of cut-paper flags along the top of Puerto Colibrí's set. */
function Bunting() {
  const flags = ["#f26a4b", "#f6c453", "#e84a7f", "#fff3dc", "#f26a4b", "#3fb8af", "#f6c453", "#e84a7f", "#fff3dc", "#f26a4b", "#f6c453"];
  const w = 30;
  return (
    <svg className="radio-bunting" viewBox={`0 0 ${flags.length * w} 26`} preserveAspectRatio="none" aria-hidden>
      <path d={`M0 2 Q${(flags.length * w) / 2} 7 ${flags.length * w} 2`} fill="none" stroke="#fff3dc" strokeWidth="1.2" />
      {flags.map((c, i) => {
        const x = i * w + 3, y = 3 + Math.sin((i + 0.5) / flags.length * Math.PI) * 3.2;
        return (
          <g key={i} transform={`translate(${x} ${y})`}>
            <path d="M0 0h24v15l-4 4-4-4-4 4-4-4-4 4-4-4z" fill={c} />
            <circle cx="12" cy="7.5" r="2.6" fill="rgba(0,0,0,0.16)" />
            <circle cx="5.5" cy="5" r="1.1" fill="rgba(0,0,0,0.16)" /><circle cx="18.5" cy="5" r="1.1" fill="rgba(0,0,0,0.16)" />
            <circle cx="5.5" cy="11" r="1.1" fill="rgba(0,0,0,0.16)" /><circle cx="18.5" cy="11" r="1.1" fill="rgba(0,0,0,0.16)" />
          </g>
        );
      })}
    </svg>
  );
}

/** "1:05" */
const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
const two = (n: number) => String(n).padStart(2, "0");

/** How far into the song the radio is, while the set is open: the display's counter and the line under it. */
function useElapsed(active: boolean): number {
  const [at, setAt] = useState(() => radio.position());
  useEffect(() => {
    if (!active) return;
    const read = () => setAt(radio.position());
    read();
    const timer = setInterval(read, 500);
    return () => clearInterval(timer);
  }, [active]);
  return at;
}

/** A station's row: what stands before its name (its number among the course's kinds of song; a sign for the mix
 *  and for the favorites), the name, what plays there, and how many songs it has. */
function StationRow({ station, number, count, current, playing }: { station: Station | TalkStation; number: number; count: number; current: boolean; playing: boolean }) {
  const on = useRadio((s) => s.on);
  const ref = useRef<HTMLButtonElement>(null);
  // on a small screen the stations scroll: the one that plays is always in view
  useEffect(() => { if (current) ref.current?.scrollIntoView?.({ block: "nearest" }); }, [current]);
  const talk = station.source === "books" || station.source === "scenes";
  const kind = "kind" in station ? station.kind : undefined;
  const empty = !talk && count === 0; // only the favorites are shown without songs: they say how to get some
  const pick = () => {
    if (empty) return;
    radio.setStation(station.id);
    if (!on) radio.setOn(true);
  };
  return (
    <button ref={ref} data-pad-default={current || undefined} data-station={station.id} role="radio" aria-checked={current} aria-disabled={empty} className={"rs-st" + (current ? " on" : "") + (empty ? " empty" : "") + (kind ? ` rs-st-${kind}` : "")} onClick={pick}>
      <span className="rs-st-n" aria-hidden>
        {current && playing ? <span className="radio-eq"><i /><i /><i /></span>
          : kind === "favorites" ? <Icon name="heart" size={17} strokeWidth={2.25} />
          : kind === "mix" ? <Icon name="shuffle" size={17} strokeWidth={2.25} />
          : talk ? <Icon name={station.source === "scenes" ? "mic" : "bookOpen"} size={17} /> : number}
      </span>
      <span className="rs-st-text">
        <b lang="en">{station.name}</b>
        <small>{empty ? "Paspausk širdelę prie dainos, kuri patinka" : station.lt}</small>
      </span>
      {!empty && <span className="rs-st-count">{talk ? station.freq.toLocaleString(bookLocale) : count}</span>}
    </button>
  );
}

function RadioSet() {
  const s = useRadio((x) => x);
  const ref = useRef<HTMLDivElement>(null);
  const talkStations = radio.talkStations;
  const talk = talkStations.find((station) => station.id === s.station);
  const elapsed = useElapsed(!talk);
  const [bank, setBank] = useState<"music" | "talk">(talk ? "talk" : "music");
  useLayoutEffect(() => {
    const opener = document.activeElement;
    return () => {
      requestAnimationFrame(() => {
        if (document.activeElement !== document.body || useStore.getState().conv.active || useStore.getState().hud.panel) return;
        const controls = [opener, ...document.querySelectorAll(".radio-plate, .toolbar .ride-menu, .radio-btn")];
        const target = controls.find((el): el is HTMLButtonElement =>
          el instanceof HTMLButtonElement && el.isConnected && !el.closest("[inert]") && el.getClientRects().length > 0);
        target?.focus({ preventScroll: true });
      });
    };
  }, []);
  const previousShelf = useRef(false);
  const launcher = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (s.shelfOpen) {
      previousShelf.current = true;
      return;
    }
    const selected = ref.current?.querySelector<HTMLElement>(".rs-st:not(.empty)");
    const back = previousShelf.current && launcher.current?.isConnected ? launcher.current : null;
    (back ?? ref.current?.querySelector<HTMLElement>(".rs-st.on") ?? selected)?.focus({ preventScroll: true });
    previousShelf.current = false;
  }, [bank, s.shelfOpen]);
  // what the heart just did, said for a few seconds
  const [hearted, setHearted] = useState<"added" | "removed" | null>(null);
  const [beat, setBeat] = useState(0);
  useEffect(() => {
    if (!hearted) return;
    const t = setTimeout(() => setHearted(null), 4000);
    return () => clearTimeout(t);
  }, [hearted, beat]);
  useEffect(() => { setHearted(null); }, [s.song?.id]);
  // a tap anywhere else folds it away (the game goes on under it)
  useEffect(() => {
    const away = (e: PointerEvent) => {
      const t = e.target as Element | null;
      if (t && (ref.current?.contains(t) || t.closest(".radio-btn, .book-picker, .book-walking .translate"))) return;
      radio.setOpen(false);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") {
      if (radio.store.getState().shelfOpen) return; // native dialog cancel unwinds one picker level
      e.stopPropagation(); radio.setOpen(false);
    } };
    document.addEventListener("pointerdown", away, true);
    window.addEventListener("keydown", esc, true);
    return () => { document.removeEventListener("pointerdown", away, true); window.removeEventListener("keydown", esc, true); };
  }, []);
  const station = talk ?? STATIONS.find((st) => st.id === s.station) ?? STATIONS[0];
  // the stations on offer: the course's kinds of song that it has, the mix, and the favorites (also while empty)
  const music = STATIONS.filter((st) => st.kind === "favorites" || !s.ready || (s.counts[st.id] ?? 0) > 0);
  const offered: (Station | TalkStation)[] = bank === "talk" ? talkStations : s.musicAvailable ? music : [];
  const note = s.failed ? "Radijas dabar nepasiekiamas. Pabandyk vėliau."
    : s.on && !s.ready ? "Kraunamas dainų sąrašas…"
    : s.needsTap ? "Paspausk bet kur, kad radijas grotų."
    : !s.on ? "Radijas išjungtas."
    : null;
  const always = "kind" in station && station.kind === "mix"; // this station is shuffled whatever the key says
  const shuffleLabel = always ? "Ši stotis visada maišo dainas" : "Maišyti šios stoties dainas";
  const heartLabel = s.liked ? "Pašalinti iš mėgstamų" : "Pridėti prie mėgstamų";
  const length = s.song?.d ?? 0;
  const like = () => { setHearted(s.liked ? "removed" : "added"); setBeat((n) => n + 1); radio.like(); };
  return (
    <>
    <div inert={s.shelfOpen} data-pad-scope="radio" data-bank={bank} data-book-tuned={!!talk || undefined} onClickCapture={(e) => { launcher.current = (e.target as Element).closest("button"); }} className={"radio-set " + SKIN + (s.on ? " on" : "") + (s.playing ? " playing" : "")} ref={ref} role="dialog" aria-label="Radijas">
      {RADIO_SKIN === "colibri" && <Bunting />}
      <div className="rs-top">
        <span className="rs-lamp" aria-hidden />
        <b className="rs-name" lang="en">{RADIO_NAME}</b>
        <button className="rs-x" onClick={() => radio.setOpen(false)} aria-label="Uždaryti" title="Uždaryti"><Icon name="close" size={17} strokeWidth={2.25} /></button>
      </div>
      <div className="rs-main">
        <div className="rs-dial" aria-hidden>
          {DIAL.marks.map((m) => <span key={m} style={{ left: onDial(m) }}>{m}</span>)}
          {offered.map((st) => <i key={st.id} className="rs-tick" style={{ left: onDial(st.freq) }} />)}
          <i className="rs-needle" style={{ left: onDial(station.freq) }} />
        </div>
        {talk?.source === "scenes" ? <SceneRadioControls /> : talk ? <BookRadioControls /> : <>
        {/* the display: the station and the song's place in it, the time, the song, its heart */}
        <div className="rs-display">
          <div className="rs-line" aria-hidden>
            <span className="rs-spectrum"><i /><i /><i /><i /><i /><i /><i /></span>
            <span className="rs-station" lang="en">{station.name}</span>
            {bank === "talk" && <span>{station.freq.toLocaleString(bookLocale)}</span>}
            {s.place && <span className="rs-place">{two(s.place.n)}/{two(s.place.of)}</span>}
            {s.song && <span className="rs-time">{clock(elapsed)}</span>}
          </div>
          <div className="rs-song">
            <div className="rs-now" aria-live="polite">
              {s.song && <b lang="en">{s.song.t}</b>}
              {/* what the heart just did stands for a few seconds over the song's translation and genre, in their place: nothing under it moves */}
              {s.song && (
                <span className={"rs-sub" + (hearted ? " says" : "")}>
                  <span>{[s.song.tl, s.song.g].filter(Boolean).join(" · ")}</span>
                  {hearted && <em className="rs-hearted">{hearted === "added" ? "Pridėta prie mėgstamų – rasi ir kurso „Dainose“." : "Pašalinta iš mėgstamų."}</em>}
                </span>
              )}
              {note && <em>{note}</em>}
              {s.upNext && <em>Toliau – šios vietos daina: <i lang="en">{s.upNext.t}</i></em>}
            </div>
            {s.song && !s.spot && (
              <button className={"rs-heart" + (s.liked ? " on" : "")} onClick={like} aria-pressed={s.liked} aria-label={`${heartLabel}: ${s.song.t}`} title={heartLabel}>
                <span key={beat} className={beat && s.liked ? "rs-heart-pop" : undefined}><Icon name={s.liked ? "heartFull" : "heart"} size={25} /></span>
              </button>
            )}
          </div>
          <i className="rs-progress" aria-hidden><i style={{ width: `${length > 0 ? Math.min(100, (elapsed / length) * 100) : 0}%` }} /></i>
        </div>
        <div className="rs-keys">
          <button className={"rs-key" + (s.shuffle ? " on" : "")} onClick={() => radio.setShuffle(!s.shuffle)} aria-pressed={s.shuffle} aria-disabled={always} aria-label={shuffleLabel} title={shuffleLabel}><Icon name="shuffle" size={22} /></button>
          <button className="rs-key" onClick={() => radio.previous()} disabled={!s.ready} aria-label="Ankstesnė daina" title="Ankstesnė daina"><Icon name="skipBack" size={22} /></button>
          <button className="rs-key rs-knob" onClick={() => radio.toggle()} aria-pressed={s.on} aria-label={s.on ? "Išjungti radiją" : "Įjungti radiją"} title={s.on ? "Išjungti radiją" : "Įjungti radiją"}><Icon name={s.on ? "pause" : "play"} size={26} /></button>
          <button className="rs-key" onClick={() => radio.next()} disabled={!s.ready} aria-label="Kita daina" title="Kita daina"><Icon name="skipNext" size={22} /></button>
          <button className={"rs-key" + (s.lyrics ? " on" : "")} onClick={() => radio.setLyrics(!s.lyrics)} aria-pressed={s.lyrics} aria-label="Rodyti dainos žodžius" title="Rodyti dainos žodžius"><Icon name="lyrics" size={22} /></button>
        </div>
        {/* the lyric strip's own settings: its type size, the whole sentence's translation, the course's notes on the
            line, the line's picture. They are the course's song player's, by its words for them */}
        <div className={"rs-opts" + (s.lyrics ? "" : " off")} role="group" aria-label="Dainos žodžiai">
          <button className="rs-opt rs-opt-size" onClick={() => radio.nextLyricSize()} disabled={!s.lyrics} title="Dainos žodžių dydis" aria-label={`Teksto dydis: ${s.lyricSize + 1} iš ${LYRIC_SIZES.length}`}>
            <span className="rs-opt-sign rs-aa" aria-hidden>A<small>a</small></span>
            <span className="rs-opt-text">Teksto dydis</span>
            <span className="rs-steps" aria-hidden>{LYRIC_SIZES.map((_, k) => <i key={k} className={k <= s.lyricSize ? "on" : undefined} />)}</span>
          </button>
          <button className={"rs-opt" + (s.nat ? " on" : "")} onClick={() => radio.setNat(!s.nat)} disabled={!s.lyrics} aria-pressed={s.nat} title="Visos eilutės vertimas po žodžiais">
            <span className="rs-opt-sign" aria-hidden><Icon name="list" size={19} /></span>
            <span className="rs-opt-text">Sakinio vertimas</span>
          </button>
          <button className={"rs-opt" + (s.notes ? " on" : "")} onClick={() => radio.setNotes(!s.notes)} disabled={!s.lyrics} aria-pressed={s.notes} title="Kas eilutėje gali suklaidinti: žodžiai, posakiai, gramatika">
            <span className="rs-opt-sign" aria-hidden><Icon name="bulb" size={19} /></span>
            <span className="rs-opt-text">Paaiškinimai</span>
          </button>
          <button className={"rs-opt" + (s.pictures ? " on" : "")} onClick={() => radio.setPictures(!s.pictures)} disabled={!s.lyrics} aria-pressed={s.pictures} title="Eilutės paveikslėlis šalia žodžių">
            <span className="rs-opt-sign" aria-hidden><Icon name="frame" size={19} /></span>
            <span className="rs-opt-text">Paveikslėliai</span>
          </button>
        </div>
        </>}
      </div>
      <div className="rs-stations">
        {talkStations.length > 0 && <div className="rs-bank" role="group" aria-label={w("banks")}>{(["music", "talk"] as const).map((key) =>
          <button key={key} disabled={key === "music" && !s.musicAvailable} aria-pressed={bank === key}
            onClick={() => setBank(key)}>{w(key)}</button>)}</div>}
        <div className="rs-rows" role="radiogroup" aria-label="Stotys">
        {offered.map((st, i) => (
          <StationRow key={st.id} station={st} number={i + 1} count={s.counts[st.id] ?? 0} current={st.id === s.station} playing={s.playing} />
        ))}
        </div>
      </div>
    </div>
    {s.shelfOpen && radio.onScenes && <ScenePicker />}
    {s.shelfOpen && radio.onBooks && radio.books && <BookPicker channel={radio.books} />}
    </>
  );
}

/** The line being sung, at the bottom of the town: sung words lit, each unit's gloss under it (with the game's
 *  translations on). A bilingual song's line sung in the learner's language is a row of its own, its words lit the
 *  same way and nothing under them: with the glosses shown, the strip keeps their height and the line sits in its
 *  middle (radio.css). With the radio set's switches on, the whole sentence's translation stands under the words, the
 *  line's picture beside them, and the course's notes on the line under the plate. The strip's type follows the
 *  set's size key: one factor on the strip, which every size in it is a share of. Between lines it shows nothing;
 *  taps go through it to the ground. */
export function LyricStrip({ sidewaysPhone }: { sidewaysPhone: boolean }) {
  const show = useRadio((s) => s.on && s.lyrics && s.playing);
  const spot = useRadio((s) => s.spot);
  const talk = useRadio((s) => radio.talkStations.find((station) => station.id === s.station));
  const showBook = useRadio((s) => s.on && s.showTalkText && s.playing && !s.shelfOpen);
  if (talk?.source === "scenes") return showBook ? <WalkingSceneLine /> : null;
  if (talk) return showBook ? <WalkingBookLine /> : null;
  if (show && spot) return <SpotStrip key={spot.spot.id} recording={spot} />;
  return <SongStrip show={show} sidewaysPhone={sidewaysPhone} />;
}

function SpotStrip({ recording }: { recording: ReadySpot }) {
  const { spot } = recording;
  const station = useRadio((s) => s.station);
  const size = useRadio((s) => s.lyricSize);
  const nat = useRadio((s) => s.nat);
  const [index, setIndex] = useState(0);
  useEffect(() => {
    let frame: number;
    const tick = () => {
      setIndex(spotLineAt(spot, radio.spotDuration(), radio.spotPosition()));
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [spot]);
  const line = spot.lines[index];
  if (!line) return null;
  const label = spot.kind === "ad" ? SPOT_AD : STATIONS.find((s) => s.id === station)?.name ?? RADIO_NAME;
  return <div className={"radio-strip " + SKIN} data-spot={spot.id} style={{ "--rl": LYRIC_SIZES[size] ?? 1 } as React.CSSProperties} aria-hidden>
    <div className="radio-card">
      <div className="radio-words">
        <div className="radio-spot-label">{label}</div>
        <div className="radio-line" key={index}><span className="ru"><span className="rt" lang="en">{line.en}</span></span></div>
        {nat && <div className="radio-nat" lang="lt" key={`n${index}`}>{line.lt}</div>}
      </div>
    </div>
  </div>;
}

function SongStrip({ show, sidewaysPhone }: { show: boolean; sidewaysPhone: boolean }) {
  const timeline = useRadio((s) => s.timeline);
  const size = useRadio((s) => s.lyricSize);
  const nat = useRadio((s) => s.nat);
  const lineNotes = useRadio((s) => (s.notes ? s.lineNotes : null));
  const pictures = useRadio((s) => (s.pictures ? s.linePictures : null));
  const glosses = useStore((s) => s.settings.lt);
  const [at, setAt] = useState<{ line: number; unit: number; notes: number }>({ line: -1, unit: -1, notes: -1 });
  const row = useRef<HTMLDivElement>(null);
  // Between the thumbs there is room for one row. Follow the singing when a long line runs past its edge.
  useLayoutEffect(() => {
    const el = row.current;
    if (!sidewaysPhone || !el) return;
    const unit = el.children[at.unit] as HTMLElement | undefined;
    if (!unit) return;
    const left = unit.offsetLeft, right = left + unit.offsetWidth;
    if (left < el.scrollLeft || right > el.scrollLeft + el.clientWidth) el.scrollLeft = left;
  }, [sidewaysPhone, at.line, at.unit, size, glosses, pictures]);
  useEffect(() => {
    if (!show || !timeline) { setAt({ line: -1, unit: -1, notes: -1 }); return; }
    let frame = 0;
    const tick = () => {
      const t = radio.position();
      const line = lineAt(timeline, t);
      const unit = line < 0 ? -1 : unitAt(timeline.lines[line], t);
      // the line whose notes show: this one, or an earlier one whose notes are still being read
      const notes = lineNotes && line >= 0 ? notedLineAt(lineNotes, timeline.lines, line, t) : -1;
      setAt((was) => (was.line === line && was.unit === unit && was.notes === notes ? was : { line, unit, notes }));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [show, timeline, lineNotes]);
  if (!show || !timeline || at.line < 0) return null;
  const line = timeline.lines[at.line];
  const translation = line.part === "translation";
  const picture = pictures && line.i !== undefined ? pictures[line.i] ?? null : null;
  const notes = lineNotes && at.notes >= 0 ? lineNotes.get(at.notes) ?? null : null;
  // a bilingual song's row in the learner's language is the sentence's translation already: under it the same
  // words keep their room unseen, so that the strip is as tall as for the song's own row
  const sentence = nat ? (translation ? line.src : line.lt) : "";
  return (
    <div className={"radio-strip " + SKIN} style={{ "--rl": LYRIC_SIZES[size] ?? 1 } as React.CSSProperties} aria-hidden>
      <div className={"radio-card" + (picture ? " pictured" : "")}>
        {/* (a picture that doesn't arrive leaves no empty frame) */}
        {picture && <img className="radio-pic" src={picture} alt="" decoding="async" key={picture} onError={(e) => { e.currentTarget.style.display = "none"; }} />}
        <div className="radio-words">
          <div ref={row} className={"radio-line" + (translation ? " translation" : "") + (glosses ? " glossed" : "")} key={at.line}>
            {line.u.map((u, k) => (
              <span className={"ru" + (k < at.unit ? " sung" : k === at.unit ? " now" : "")} key={k}>
                <span className="rt" lang={translation ? "lt" : "en"}>{u[0]}</span>
                {glosses && !translation && <span className="rg" lang="lt">{shortGloss(u[1])}</span>}
              </span>
            ))}
          </div>
          {sentence && <div className={"radio-nat" + (translation ? " unseen" : "")} lang="lt" key={`n${at.line}`}>{sentence}</div>}
        </div>
      </div>
      {notes && (
        <div className="radio-notes" lang="lt" key={`p${at.notes}`}>
          {notes.map((n, k) => <p key={k}>{n.es && <b lang="en">{n.es}</b>}{n.lt}</p>)}
        </div>
      )}
    </div>
  );
}
