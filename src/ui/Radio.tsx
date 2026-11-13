// The town's radio in the HUD (src/radio/): its button in the toolbar, the card with the stations and the buttons,
// and the lyric strip, the line being sung with each word's gloss under it.
import { useEffect, useRef, useState } from "react";
import { useStore } from "../state/store";
import { STATIONS } from "../content/radio";
import { bindRadio, radio, useRadio } from "../radio";
import { lineAt, shortGloss, unitAt } from "../radio/lyrics";
import { Icon } from "./icons";
import { L, Lx, TL } from "./i18n";
import { EDITION } from "../edition";
import "./radio.css";

/** The toolbar's button, with the card it opens. Nothing where the build has no songs. */
export function RadioTool() {
  const available = useRadio((s) => s.available);
  const on = useRadio((s) => s.on);
  const playing = useRadio((s) => s.playing);
  const open = useRadio((s) => s.open);
  useEffect(() => { bindRadio(); }, []);
  if (!available) return null;
  const title = L("Radijas (R)");
  return (
    <>
      <button className={"icon-btn radio-btn" + (on ? " on" : "")} onClick={() => radio.press()} title={title} aria-label={title} aria-expanded={open} aria-pressed={on}>
        <Icon name="radio" size={25} /><span className="key" aria-hidden>R</span>
        {playing && <span className="radio-eq" aria-hidden><i /><i /><i /></span>}
      </button>
      {open && <RadioCard />}
    </>
  );
}

function RadioCard() {
  const s = useRadio((x) => x);
  const ref = useRef<HTMLDivElement>(null);
  // a tap anywhere else closes it (the game goes on under it)
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
  const note = s.failed ? L("Radijas dabar nepasiekiamas. Pabandyk vėliau.")
    : s.on && !s.ready ? L("Kraunamas dainų sąrašas…")
    : s.needsTap ? L("Paspausk „Groti“, kad radijas grotų.")
    : null;
  return (
    <div className="radio-card" ref={ref} role="dialog" aria-label={L("Radijas")}>
      <div className="radio-head">
        <span className="radio-title"><Icon name="radio" size={18} /> {L("Radijas")}</span>
        <button className="radio-x" onClick={() => radio.setOpen(false)} aria-label={L("Uždaryti")} title={L("Uždaryti")}><Icon name="close" size={18} strokeWidth={2.25} /></button>
      </div>
      <div className="radio-stations" role="radiogroup" aria-label={L("Stotis")}>
        {STATIONS.map((st) => (
          <button key={st.id} role="radio" aria-checked={st.id === s.station} className={"radio-station" + (st.id === s.station ? " on" : "")} onClick={() => radio.setStation(st.id)}>
            <b lang={TL}>{st.name}</b><small>{L(st.lt)}</small>
          </button>
        ))}
      </div>
      <div className="radio-now" aria-live="polite">
        {s.song
          ? <><b lang={TL}>{s.song.t}</b>{s.song.tl && <span>{s.song.tl}</span>}{s.song.g && <small lang={TL}>{s.song.g}</small>}</>
          : <span>{note ?? L("Paspausk „Groti“.")}</span>}
        {s.song && note && <em>{note}</em>}
        {s.upNext && <em>{Lx("Toliau – šios vietos daina: {song}", { song: <i lang={TL}>{s.upNext.t}</i> })}</em>}
      </div>
      <div className="radio-keys">
        <button className={"radio-key" + (s.shuffle ? " on" : "")} onClick={() => radio.setShuffle(!s.shuffle)} aria-pressed={s.shuffle} aria-label={L("Maišyti dainas")} title={L("Maišyti dainas")}><Icon name="shuffle" size={22} /></button>
        <button className="radio-key" onClick={() => radio.previous()} disabled={!s.ready} aria-label={L("Ankstesnė daina")} title={L("Ankstesnė daina")}><Icon name="skipBack" size={22} /></button>
        <button className="radio-key main" onClick={() => radio.toggle()} aria-label={s.on ? L("Pauzė") : L("Groti")} title={s.on ? L("Pauzė") : L("Groti")}><Icon name={s.on ? "pause" : "play"} size={26} /></button>
        <button className="radio-key" onClick={() => radio.next()} disabled={!s.ready} aria-label={L("Kita daina")} title={L("Kita daina")}><Icon name="skipNext" size={22} /></button>
        <button className={"radio-key" + (s.lyrics ? " on" : "")} onClick={() => radio.setLyrics(!s.lyrics)} aria-pressed={s.lyrics} aria-label={L("Rodyti dainos žodžius")} title={L("Rodyti dainos žodžius")}><Icon name="lyrics" size={22} /></button>
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
    <div className="radio-strip" aria-hidden>
      <div className="radio-line" key={at.line}>
        {line.u.map((u, k) => (
          <span className={"ru" + (k < at.unit ? " sung" : k === at.unit ? " now" : "")} key={k}>
            <span className="rt" lang={TL}>{u[0]}</span>
            {glosses && <span className="rg" lang={EDITION.helper}>{shortGloss(u[1])}</span>}
          </span>
        ))}
      </div>
    </div>
  );
}
