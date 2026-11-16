// Puerto Colibrí's grotto on the screen (src/game/cave): the small card that stands in for the map down there
// (which chamber, how many of its stones are lit, what opens next), and the card of the glyph stone the learner is
// at: the stone says its phrase; they pick what it means, or say it back.
import { useEffect } from "react";
import { useStore } from "../state/store";
import { game } from "../game/gameRef";
import { Icon } from "./icons";
import { L, TL } from "./i18n";
import { EDITION } from "../edition";

/** Which chamber one is in and what comes next. */
export function CaveCard() {
  const cave = useStore((s) => s.hud.cave);
  const talking = useStore((s) => s.conv.active);
  const panel = useStore((s) => s.hud.panel);
  const glyph = useStore((s) => s.hud.glyph);
  if (!cave || talking || panel || glyph) return null;
  return (
    <div className="cave-card" role="status">
      <div className="cave-top">
        <b lang={TL}>{cave.name}</b>
        <span className="cave-n">{cave.n} / {cave.of}</span>
      </div>
      <small lang={EDITION.helper}>{cave.lt}</small>
      <div className="cave-stones" aria-label={L("Uždegta akmenų: {lit} iš {n}", { lit: cave.lit, n: cave.stones })}>
        {Array.from({ length: cave.stones }, (_, i) => <i key={i} className={i < cave.lit ? "on" : ""} />)}
        <span className="cave-rooms" aria-label={L("Atvirų salių: {open} iš {n}", { open: cave.open, n: cave.of })}>
          {Array.from({ length: cave.of }, (_, i) => <u key={i} className={i < cave.open ? (i + 1 === cave.n ? "here" : "open") : ""} />)}
        </span>
      </div>
      <p>{cave.next}</p>
    </div>
  );
}

/** At a glyph stone. */
export function GlyphCard() {
  const g = useStore((s) => s.hud.glyph);
  const lt = useStore((s) => s.settings.lt);
  const cave = game?.cave;
  useEffect(() => {
    if (!g) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") { cave?.close(); return; }
      if (g.solved) return;
      if (["1", "2", "3"].includes(e.key) && Number(e.key) <= g.options.length) { e.preventDefault(); cave?.pick(Number(e.key) - 1); }
      else if (e.key.toLowerCase() === "r" || e.key === " ") { e.preventDefault(); cave?.say(); }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [g, cave]);
  if (!g || !cave) return null;
  const listening = g.mic === "listening";
  return (
    <div className="glyph-veil" onClick={(e) => { if (e.target === e.currentTarget) cave.close(); }}>
      <div className={"glyph-card" + (g.solved ? " solved" : "")} role="dialog" aria-label={L("Kalbantis akmuo")}>
        <button className="glyph-x" onClick={() => cave.close()} title={L("Uždaryti")} aria-label={L("Uždaryti")}><Icon name="close" size={20} /></button>
        <div className="glyph-head">
          <span className="glyph-rune" aria-hidden><i /><i /><i /></span>
          <h2>{g.solved ? L("Akmuo užsidegė!") : L("Akmuo kalba. Ką jis sako?")}</h2>
        </div>
        <div className="glyph-say">
          <button className="glyph-play" onClick={() => cave.say()} title={L("Klausyti dar kartą")} aria-label={L("Klausyti dar kartą")}><Icon name="speaker" size={26} /></button>
          {g.shown
            ? <div className="glyph-text" lang={TL}>{g.solved && lt && g.gloss && glossOk(g.text, g.gloss)
              // (lit: the words with their meanings under them, as in the conversations)
              ? <span className="glyph-words">{g.text.split(/\s+/).map((w, i) => <span key={i} className="glyph-w"><b>{w}</b><i lang={EDITION.helper}>{g.gloss!.split(" | ")[i]}</i></span>)}</span>
              : g.text}{g.solved && lt && <small lang={EDITION.helper}>{g.lt}</small>}</div>
            : <button className="glyph-show" onClick={() => cave.showWords()}><span aria-hidden>· · ·</span> {L("Rodyti žodžius")}</button>}
        </div>
        {!g.solved && (
          <>
            <p className="glyph-q">{L("Pasirink, ką tai reiškia:")}</p>
            <div className="glyph-opts">
              {g.options.map((o, i) => (
                <button key={i} className={"glyph-opt" + (g.wrong.includes(i) ? " wrong" : "")} disabled={g.wrong.includes(i)} lang={EDITION.helper} onClick={() => cave.pick(i)}>
                  <kbd>{i + 1}</kbd><span>{o}</span>
                </button>
              ))}
            </div>
            {g.mic !== "unsupported" && (
              <div className="glyph-mic">
                <span className="glyph-or">{L("arba")}</span>
                <button className={"btn small" + (listening ? "" : " soft")} onClick={() => cave.listen()}>
                  <Icon name={listening ? "stop" : "mic"} size={18} /> {listening ? L("Klausau…") : L("Pasakyk tai balsu")}
                </button>
                {g.heard && <span className={"glyph-heard" + (g.mic === "missed" ? " miss" : "")} lang={TL}>{L("„{line}“", { line: g.heard })}</span>}
                {g.mic === "missed" && !g.heard && <span className="glyph-heard miss">{L("Neišgirdau. Bandyk dar kartą.")}</span>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** A gloss with one unit per word of the line. */
const glossOk = (text: string, gloss: string) => text.split(/\s+/).length === gloss.split(" | ").length;
