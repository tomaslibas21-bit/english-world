// The town's radio in the HUD (src/radio/): the power button in the toolbar, the small dial plate beside it while it
// plays, the radio set that opens from the plate (the display with the heart, the keys, the stations), and the lyric
// strip. docs/RADIO.md, "Look and feel".
import { useEffect, useRef, useState } from "react";
import { useStore } from "../state/store";
import { RADIO_NAME, RADIO_SKIN, STATIONS } from "../content/radio";
import type { Station } from "../radio/playlist";
import { bindRadio, radio, useRadio } from "../radio";
import { lineAt, shortGloss, unitAt } from "../radio/lyrics";
import { Icon } from "./icons";
import "./radio.css";

const SKIN = `radio-skin-${RADIO_SKIN}`;
/** The set's FM dial. */
const DIAL = { from: 88, to: 108, marks: [88, 92, 96, 100, 104, 108] };
/** A frequency's place across the dial window, which keeps a margin at both ends for the first and last number. */
const onDial = (freq: number) => `${6 + Math.max(0, Math.min(1, (freq - DIAL.from) / (DIAL.to - DIAL.from))) * 88}%`;

/** The toolbar's power button, the dial plate, and the radio set. Nothing where the build has no songs. */
export function RadioTool() {
  const available = useRadio((s) => s.available);
  const on = useRadio((s) => s.on);
  const open = useRadio((s) => s.open);
  useEffect(() => { bindRadio(); }, []);
  if (!available) return null;
  const title = on ? "Išjungti radiją (R)" : "Įjungti radiją (R)";
  return (
    <div className={"radio-tool " + SKIN}>
      <button className={"icon-btn radio-btn" + (on ? " on" : "")} onClick={() => radio.power()} title={title} aria-label={title} aria-pressed={on}>
        <Icon name="radio" size={25} /><span className="key" aria-hidden>R</span>
        <span className="radio-lamp" aria-hidden />
      </button>
      {on && !open && <RadioPlate />}
      {open && <RadioSet />}
    </div>
  );
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
  const name = STATIONS.find((s) => s.id === station)?.name ?? "";
  return (
    <button className={"radio-plate" + (playing ? " playing" : "")} onClick={() => radio.setOpen(true)} title="Stotys ir dainos" aria-label={`${name}. Stotys ir dainos`}>
      <span className="radio-eq" aria-hidden><i /><i /><i /></span>
      <span className="radio-plate-text" lang="en" key={title ?? name}>{title ?? name}</span>
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
function useElapsed(): number {
  const [at, setAt] = useState(() => radio.position());
  useEffect(() => {
    const read = () => setAt(radio.position());
    read();
    const timer = setInterval(read, 500);
    return () => clearInterval(timer);
  }, []);
  return at;
}

/** A station's row: what stands before its name (its number among the course's kinds of song; a sign for the mix
 *  and for the favorites), the name, what plays there, and how many songs it has. */
function StationRow({ station, number, count, current, playing }: { station: Station; number: number; count: number; current: boolean; playing: boolean }) {
  const on = useRadio((s) => s.on);
  const ref = useRef<HTMLButtonElement>(null);
  // on a small screen the stations scroll: the one that plays is always in view
  useEffect(() => { if (current) ref.current?.scrollIntoView?.({ block: "nearest" }); }, [current]);
  const empty = count === 0; // only the favorites are shown without songs: they say how to get some
  const pick = () => {
    if (empty) return;
    radio.setStation(station.id);
    if (!on) radio.setOn(true);
  };
  return (
    <button ref={ref} role="radio" aria-checked={current} aria-disabled={empty} className={"rs-st" + (current ? " on" : "") + (empty ? " empty" : "") + (station.kind ? ` rs-st-${station.kind}` : "")} onClick={pick}>
      <span className="rs-st-n" aria-hidden>
        {current && playing ? <span className="radio-eq"><i /><i /><i /></span>
          : station.kind === "favorites" ? <Icon name="heart" size={17} strokeWidth={2.25} />
          : station.kind === "mix" ? <Icon name="shuffle" size={17} strokeWidth={2.25} />
          : number}
      </span>
      <span className="rs-st-text">
        <b lang="en">{station.name}</b>
        <small>{empty ? "Paspausk širdelę prie dainos, kuri patinka" : station.lt}</small>
      </span>
      {!empty && <span className="rs-st-count">{count}</span>}
    </button>
  );
}

function RadioSet() {
  const s = useRadio((x) => x);
  const ref = useRef<HTMLDivElement>(null);
  const elapsed = useElapsed();
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
      if (t && (ref.current?.contains(t) || t.closest(".radio-btn"))) return;
      radio.setOpen(false);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); radio.setOpen(false); } };
    document.addEventListener("pointerdown", away, true);
    window.addEventListener("keydown", esc, true);
    return () => { document.removeEventListener("pointerdown", away, true); window.removeEventListener("keydown", esc, true); };
  }, []);
  const station = STATIONS.find((st) => st.id === s.station) ?? STATIONS[0];
  // the stations on offer: the course's kinds of song that it has, the mix, and the favorites (also while empty)
  const offered = STATIONS.filter((st) => st.kind === "favorites" || !s.ready || (s.counts[st.id] ?? 0) > 0);
  const note = s.failed ? "Radijas dabar nepasiekiamas. Pabandyk vėliau."
    : s.on && !s.ready ? "Kraunamas dainų sąrašas…"
    : s.needsTap ? "Paspausk bet kur, kad radijas grotų."
    : !s.on ? "Radijas išjungtas."
    : null;
  const always = station.kind === "mix"; // this station is shuffled whatever the key says
  const shuffleLabel = always ? "Ši stotis visada maišo dainas" : "Maišyti šios stoties dainas";
  const heartLabel = s.liked ? "Pašalinti iš mėgstamų" : "Pridėti prie mėgstamų";
  const length = s.song?.d ?? 0;
  const like = () => { setHearted(s.liked ? "removed" : "added"); setBeat((n) => n + 1); radio.like(); };
  return (
    <div className={"radio-set " + SKIN + (s.on ? " on" : "") + (s.playing ? " playing" : "")} ref={ref} role="dialog" aria-label="Radijas">
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
        {/* the display: the station and the song's place in it, the time, the song, its heart */}
        <div className="rs-display">
          <div className="rs-line" aria-hidden>
            <span className="rs-spectrum"><i /><i /><i /><i /><i /><i /><i /></span>
            <span className="rs-station" lang="en">{station.name}</span>
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
            {s.song && (
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
      </div>
      <div className="rs-stations" role="radiogroup" aria-label="Stotys">
        {offered.map((st, i) => (
          <StationRow key={st.id} station={st} number={i + 1} count={s.counts[st.id] ?? 0} current={st.id === s.station} playing={s.playing} />
        ))}
      </div>
    </div>
  );
}

/** The line being sung, at the bottom of the town: sung words lit, each unit's gloss under it (with the game's
 *  translations on). A bilingual song's line sung in the learner's language is a row of its own, its words lit the
 *  same way and nothing under them: with the glosses shown, the strip keeps their height and the line sits in its
 *  middle (radio.css). Between lines it shows nothing; taps go through it to the ground. */
export function LyricStrip() {
  const show = useRadio((s) => s.on && s.lyrics && s.playing);
  const timeline = useRadio((s) => s.timeline);
  const glosses = useStore((s) => s.settings.lt);
  const [at, setAt] = useState<{ line: number; unit: number }>({ line: -1, unit: -1 });
  useEffect(() => {
    if (!show || !timeline) { setAt({ line: -1, unit: -1 }); return; }
    let frame = 0;
    const tick = () => {
      const t = radio.position();
      const line = lineAt(timeline, t);
      const unit = line < 0 ? -1 : unitAt(timeline.lines[line], t);
      setAt((was) => (was.line === line && was.unit === unit ? was : { line, unit }));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [show, timeline]);
  if (!show || !timeline || at.line < 0) return null;
  const line = timeline.lines[at.line];
  const translation = line.part === "translation";
  return (
    <div className={"radio-strip " + SKIN} aria-hidden>
      <div className={"radio-line" + (translation ? " translation" : "") + (glosses ? " glossed" : "")} key={at.line}>
        {line.u.map((u, k) => (
          <span className={"ru" + (k < at.unit ? " sung" : k === at.unit ? " now" : "")} key={k}>
            <span className="rt" lang={translation ? "lt" : "en"}>{u[0]}</span>
            {glosses && !translation && <span className="rg" lang="lt">{shortGloss(u[1])}</span>}
          </span>
        ))}
      </div>
    </div>
  );
}
