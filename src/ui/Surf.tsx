// The surf lesson on the screen (src/game/surf/): what the instructor says, shown with as much help as the learner
// still needs for that line (its glosses and its meaning at first, then the Spanish alone, then only her voice), and
// beside it a picture of what it asks for, where the edition has pictures (it goes when only her voice is left); the
// answers to tap when she asks something; the balance in a ride; the score; the level's choice at the start and the
// score card at the end. What the keys and the buttons do is said in the learner's language; what she asks for never.
import { useEffect, useRef, useState } from "react";
import { useStore } from "../state/store";
import { useSurf, type SurfLine } from "../game/surf/store";
import { game } from "../game/gameRef";
import { Interlinear } from "./Interlinear";
import { Icon } from "./icons";
import "./surf.css";

/** One of her lines or one of the answers, with the help it gets. */
function Line({ line, support }: { line: SurfLine; support: 0 | 1 | 2 }) {
  // (a line of a word or two whose glosses already say it all gets no second translation under them)
  const bare = (t: string) => t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const same = bare(line.s.units.map((u) => u.lt).join(" ")) === bare(line.s.nat ?? "");
  return <Interlinear s={line.s} lt={support === 0} ipa={false} nat={support === 0 && !same} />;
}

/** The picture of what her line asks for, in a small frame: the new one slides in over the one before it (no blank
 *  between two commands); still, with reduced motion (surf.css). Her words say the same, so it is hidden from a
 *  screen reader. */
function Picture({ src }: { src: string }) {
  const last = useRef(src);
  const [under, setUnder] = useState<string | null>(null);
  useEffect(() => {
    if (last.current === src) return;
    setUnder(last.current);
    last.current = src;
    const t = setTimeout(() => setUnder(null), 320);
    return () => clearTimeout(t);
  }, [src]);
  return (
    <div className="surf-pic" aria-hidden>
      {under && under !== src && <img src={under} alt="" draggable={false} />}
      <img key={src} className="new" src={src} alt="" draggable={false} />
    </div>
  );
}

/** The level's choice, as the lesson is started at the school's boards. */
export function SurfPicker() {
  const picking = useSurf((s) => s.picking);
  const best = useSurf((s) => s.best);
  if (!picking) return null;
  return (
    <div className="surf-pick" role="dialog" aria-label="Banglenčių pamoka">
      <div className="surf-pick-card">
        <h2><span aria-hidden>🏄</span> Banglenčių pamoka</h2>
        <p>Instruktorė sako, ką daryti. Daryk, ką supranti.</p>
        <div className="surf-levels">
          <button className="surf-level" onClick={() => game?.surfStart("beginner")}>
            <b>Pradedantiems</b>
            <span>Putos, minkšta lenta, daugiau laiko.</span>
          </button>
          <button className="surf-level adv" onClick={() => game?.surfStart("advanced")}>
            <b>Pažengusiems</b>
            <span>Žalios bangos, posūkiai, eilė prie bangos.</span>
          </button>
        </div>
        {best.waves > 0 && <p className="surf-best">{`Iš viso: bangų – ${best.waves}, sekundžių ant bangos – ${best.seconds}`}</p>}
        <button className="surf-later" onClick={() => game?.surfStop()}>Ne dabar</button>
      </div>
    </div>
  );
}

export function SurfOverlay() {
  const s = useSurf();
  const touch = useStore((st) => st.hud.showTouch);
  const slow = useStore((st) => !!st.settings.slowVoice);
  const [shown, setShown] = useState(false);
  // (her next line is heard first again)
  useEffect(() => { setShown(false); }, [s.line?.cue, s.line?.s.en]);
  if (!s.active) return null;
  const sc = s.score;
  const hidden = s.support === 2 && !shown;
  const riding = s.phase === "ride";
  // the picture is help too: it stays while the words lose their translation, and goes when only her voice is left
  // (a tap brings the words and the picture back)
  const pic = hidden ? undefined : s.line?.pic;
  return (
    <div className={"surf" + (touch ? " touch" : "")}>
      <div className="surf-top">
        <button className="surf-x" onClick={() => game?.surfStop()} aria-label="Baigti pamoką" title="Baigti pamoką"><Icon name="close" size={20} strokeWidth={2.4} /></button>
        <button className={"surf-slow" + (slow ? " on" : "")} aria-pressed={slow} onClick={() => useStore.getState().setSettings({ slowVoice: !slow })}>Lėčiau</button>
        <div className="surf-score" aria-label="Rezultatas">
          <span title="Bangos"><i aria-hidden>🌊</i>{sc.waves}</span>
          <span title="Sekundės ant bangos"><i aria-hidden>⏱</i>{sc.seconds}</span>
          <span title="Komandos laiku"><i aria-hidden>✓</i>{sc.followed}/{sc.asked}</span>
        </div>
      </div>
      {s.line && !s.over && (
        <div className={"surf-card" + (pic ? " has-pic" : "") + (s.mark ? " " + s.mark : "") + (s.asked ? " asked" : "")} lang="en">
          {pic && <Picture src={pic} />}
          <div className="surf-words">
            {hidden
              ? <button className="surf-listen" onClick={() => setShown(true)} lang="lt"><Icon name="speaker" size={22} /> <span>Klausyk</span><small>Rodyti tekstą</small></button>
              : <Line line={s.line} support={s.support === 2 ? 1 : s.support} />}
            {riding && <div className="surf-balance" role="meter" aria-label="Pusiausvyra" aria-valuemin={0} aria-valuemax={1} aria-valuenow={s.balance}><i style={{ width: `${Math.round(s.balance * 100)}%` }} /></div>}
          </div>
        </div>
      )}
      {s.choice && !s.over && (
        <div className="surf-choices">
          {s.choice.options.map((o, i) => (
            <button key={o.cue} className="surf-choice" onClick={() => game?.surfChoose(o.cue)}>
              {!touch && <kbd>{i + 1}</kbd>}
              <span className="surf-choice-text" lang="en">{o.s.en}</span>
              {s.support === 0 && <small lang="lt">{o.s.nat}</small>}
            </button>
          ))}
        </div>
      )}
      {s.over && (
        <div className="surf-pick">
          <div className="surf-pick-card">
            <h2><span aria-hidden>🏄</span> Pamoka baigta</h2>
            <div className="surf-result">
              <div><b>{sc.waves}</b><span>Bangos</span></div>
              <div><b>{sc.seconds}</b><span>Sekundės ant bangos</span></div>
              <div><b>{sc.followed}/{sc.asked}</b><span>Komandos laiku</span></div>
            </div>
            <p className="surf-best">{`Iš viso: bangų – ${s.best.waves + sc.waves}, sekundžių ant bangos – ${s.best.seconds + sc.seconds}`}</p>
            <p>Frazės, kurias girdėjai, jau tavo kortelėse.</p>
            <div className="surf-levels">
              <button className="surf-level" onClick={() => game?.surfAgain("beginner")}><b>Dar viena pamoka</b><span>Pradedantiems</span></button>
              <button className="surf-level adv" onClick={() => game?.surfAgain("advanced")}><b>Dar viena pamoka</b><span>Pažengusiems</span></button>
            </div>
            <button className="surf-later" onClick={() => game?.surfStop()}>Į krantą</button>
          </div>
        </div>
      )}
      {/* a phone has no keys to list: what its buttons do in this part of the lesson, for the first waves */}
      {touch && !s.over && !s.choice && s.best.waves < 3 && (s.phase === "out" || s.phase === "wait" || s.phase === "catch" || s.phase === "ride") && (
        <div className="surf-hint" lang="lt">
          {s.phase === "out" ? "„Irkluoti“ – yriai · svirtis žemyn – nerti" : s.phase === "wait" ? "Svirtis į šoną – pasukti lentą" : s.phase === "catch" ? "„Irkluoti“ – yriai · ↑ – atsistoti" : "Svirtis – svirti ir tūpti · ↑ – triukas"}
        </div>
      )}
      {!touch && !s.over && (
        <div className="help-strip surf-keys">
          {s.phase === "ride"
            ? <>Svirk <kbd>←</kbd><kbd>→</kbd><kbd>↑</kbd><kbd>↓</kbd> · triukas <kbd>Tarpas</kbd> · baigti <kbd>Esc</kbd></>
            : <>Irkluok <kbd>E</kbd> arba <kbd>←</kbd><kbd>→</kbd> · suk lentą <kbd>←</kbd><kbd>→</kbd> · nerk <kbd>↓</kbd> · stokis <kbd>Tarpas</kbd> · baigti <kbd>Esc</kbd></>}
        </div>
      )}
    </div>
  );
}
