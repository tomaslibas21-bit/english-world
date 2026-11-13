// The town's radio in the HUD (src/radio/): the power button in the toolbar, the small dial plate beside it while it
// plays, the radio set that opens from the plate, and the lyric strip. docs/RADIO.md, "Look and feel".
import { useEffect, useRef, useState } from "react";
import { useStore } from "../state/store";
import { RADIO_SKIN, STATIONS } from "../content/radio";
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
 *  a few seconds. A tap opens the radio set. */
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

function RadioSet() {
  const s = useRadio((x) => x);
  const ref = useRef<HTMLDivElement>(null);
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
  const note = s.failed ? "Radijas dabar nepasiekiamas. Pabandyk vėliau."
    : s.on && !s.ready ? "Kraunamas dainų sąrašas…"
    : s.needsTap ? "Paspausk bet kur, kad radijas grotų."
    : !s.on ? "Radijas išjungtas."
    : null;
  return (
    <div className={"radio-set " + SKIN + (s.on ? " on" : "")} ref={ref} role="dialog" aria-label="Radijas">
      {RADIO_SKIN === "colibri" && <Bunting />}
      <div className="rs-top">
        <span className="rs-lamp" aria-hidden />
        <b className="rs-name" lang="en">{station.name}</b>
        <span className="rs-freq" aria-hidden>{station.freq.toFixed(1)} FM</span>
        <button className="rs-x" onClick={() => radio.setOpen(false)} aria-label="Uždaryti" title="Uždaryti"><Icon name="close" size={17} strokeWidth={2.25} /></button>
      </div>
      <div className="rs-dial" aria-hidden>
        {DIAL.marks.map((m) => <span key={m} style={{ left: onDial(m) }}>{m}</span>)}
        <i className="rs-needle" style={{ left: onDial(station.freq) }} />
      </div>
      <div className="rs-presets" role="radiogroup" aria-label="Stotis">
        {STATIONS.map((st) => (
          <button key={st.id} role="radio" aria-checked={st.id === s.station} className={"rs-preset" + (st.id === s.station ? " on" : "")} onClick={() => radio.setStation(st.id)}>
            <b lang="en">{st.name}</b><small>{st.lt}</small>
          </button>
        ))}
      </div>
      <div className="rs-now" aria-live="polite">
        {s.song && <><b lang="en">{s.song.t}</b><span>{[s.song.tl, s.song.g].filter(Boolean).join(" · ")}</span></>}
        {note && <em>{note}</em>}
        {s.upNext && <em>Toliau – šios vietos daina: <i lang="en">{s.upNext.t}</i></em>}
      </div>
      <div className="rs-keys">
        <button className={"rs-key" + (s.shuffle ? " on" : "")} onClick={() => radio.setShuffle(!s.shuffle)} aria-pressed={s.shuffle} aria-label="Maišyti dainas" title="Maišyti dainas"><Icon name="shuffle" size={22} /></button>
        <button className="rs-key" onClick={() => radio.previous()} disabled={!s.ready} aria-label="Ankstesnė daina" title="Ankstesnė daina"><Icon name="skipBack" size={22} /></button>
        <button className="rs-key rs-knob" onClick={() => radio.toggle()} aria-pressed={s.on} aria-label={s.on ? "Išjungti radiją" : "Įjungti radiją"} title={s.on ? "Išjungti radiją" : "Įjungti radiją"}><Icon name={s.on ? "pause" : "play"} size={26} /></button>
        <button className="rs-key" onClick={() => radio.next()} disabled={!s.ready} aria-label="Kita daina" title="Kita daina"><Icon name="skipNext" size={22} /></button>
        <button className={"rs-key" + (s.lyrics ? " on" : "")} onClick={() => radio.setLyrics(!s.lyrics)} aria-pressed={s.lyrics} aria-label="Rodyti dainos žodžius" title="Rodyti dainos žodžius"><Icon name="lyrics" size={22} /></button>
      </div>
    </div>
  );
}

/** The line being sung, at the bottom of the town: sung words lit, each unit's gloss under it (with the game's
 *  translations on). Between lines it shows nothing; taps go through it to the ground. */
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
  return (
    <div className={"radio-strip " + SKIN} aria-hidden>
      <div className="radio-line" key={at.line}>
        {line.u.map((u, k) => (
          <span className={"ru" + (k < at.unit ? " sung" : k === at.unit ? " now" : "")} key={k}>
            <span className="rt" lang="en">{u[0]}</span>
            {glosses && <span className="rg" lang="lt">{shortGloss(u[1])}</span>}
          </span>
        ))}
      </div>
    </div>
  );
}
