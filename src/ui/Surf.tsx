// The surf lesson on the screen (src/game/surf/): what the instructor says, shown with as much help as the learner
// still needs for that line (its glosses and its meaning at first, then the Spanish alone, then only her voice); the
// answers to tap when she asks something; the balance in a ride; the score; the level's choice at the start and the
// score card at the end. What the keys and the buttons do is said in the learner's language; what she asks for never.
import { useEffect, useState } from "react";
import { useStore } from "../state/store";
import { useSurf, type SurfLine } from "../game/surf/store";
import { game } from "../game/gameRef";
import { Interlinear } from "./Interlinear";
import { Icon } from "./icons";
import { L, Lx, TL } from "./i18n";
import { EDITION } from "../edition";
import "./surf.css";

/** One of her lines or one of the answers, with the help it gets. */
function Line({ line, support }: { line: SurfLine; support: 0 | 1 | 2 }) {
  // (a line of a word or two whose glosses already say it all gets no second translation under them)
  const bare = (t: string) => t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const same = bare(line.s.units.map((u) => u.lt).join(" ")) === bare(line.s.nat ?? "");
  return <Interlinear s={line.s} lt={support === 0} ipa={false} nat={support === 0 && !same} />;
}

/** The level's choice, as the lesson is started at the school's boards. */
export function SurfPicker() {
  const picking = useSurf((s) => s.picking);
  const best = useSurf((s) => s.best);
  if (!picking) return null;
  return (
    <div className="surf-pick" role="dialog" aria-label={L("Banglenčių pamoka")}>
      <div className="surf-pick-card">
        <h2><span aria-hidden>🏄</span> {L("Banglenčių pamoka")}</h2>
        <p>{L("Instruktorė sako, ką daryti. Daryk, ką supranti.")}</p>
        <div className="surf-levels">
          <button className="surf-level" onClick={() => game?.surfStart("beginner")}>
            <b>{L("Pradedantiems")}</b>
            <span>{L("Putos, minkšta lenta, daugiau laiko.")}</span>
          </button>
          <button className="surf-level adv" onClick={() => game?.surfStart("advanced")}>
            <b>{L("Pažengusiems")}</b>
            <span>{L("Žalios bangos, posūkiai, eilė prie bangos.")}</span>
          </button>
        </div>
        {best.waves > 0 && <p className="surf-best">{L("Iš viso: bangų – {waves}, sekundžių ant bangos – {seconds}", { waves: best.waves, seconds: best.seconds })}</p>}
        <button className="surf-later" onClick={() => game?.surfStop()}>{L("Ne dabar")}</button>
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
  return (
    <div className={"surf" + (touch ? " touch" : "")}>
      <div className="surf-top">
        <button className="surf-x" onClick={() => game?.surfStop()} aria-label={L("Baigti pamoką")} title={L("Baigti pamoką")}><Icon name="close" size={20} strokeWidth={2.4} /></button>
        <button className={"surf-slow" + (slow ? " on" : "")} aria-pressed={slow} onClick={() => useStore.getState().setSettings({ slowVoice: !slow })}>{L("Lėčiau")}</button>
        <div className="surf-score" aria-label={L("Rezultatas")}>
          <span title={L("Bangos")}><i aria-hidden>🌊</i>{sc.waves}</span>
          <span title={L("Sekundės ant bangos")}><i aria-hidden>⏱</i>{sc.seconds}</span>
          <span title={L("Komandos laiku")}><i aria-hidden>✓</i>{sc.followed}/{sc.asked}</span>
        </div>
      </div>
      {s.line && !s.over && (
        <div className={"surf-card" + (s.mark ? " " + s.mark : "") + (s.asked ? " asked" : "")} lang={TL}>
          {hidden
            ? <button className="surf-listen" onClick={() => setShown(true)} lang={EDITION.helper}><Icon name="speaker" size={22} /> <span>{L("Klausyk")}</span><small>{L("Rodyti tekstą")}</small></button>
            : <Line line={s.line} support={s.support === 2 ? 1 : s.support} />}
          {riding && <div className="surf-balance" role="meter" aria-label={L("Pusiausvyra")} aria-valuemin={0} aria-valuemax={1} aria-valuenow={s.balance}><i style={{ width: `${Math.round(s.balance * 100)}%` }} /></div>}
        </div>
      )}
      {s.choice && !s.over && (
        <div className="surf-choices">
          {s.choice.options.map((o, i) => (
            <button key={o.cue} className="surf-choice" onClick={() => game?.surfChoose(o.cue)}>
              {!touch && <kbd>{i + 1}</kbd>}
              <span className="surf-choice-text" lang={TL}>{o.s.en}</span>
              {s.support === 0 && <small lang={EDITION.helper}>{o.s.nat}</small>}
            </button>
          ))}
        </div>
      )}
      {s.over && (
        <div className="surf-pick">
          <div className="surf-pick-card">
            <h2><span aria-hidden>🏄</span> {L("Pamoka baigta")}</h2>
            <div className="surf-result">
              <div><b>{sc.waves}</b><span>{L("Bangos")}</span></div>
              <div><b>{sc.seconds}</b><span>{L("Sekundės ant bangos")}</span></div>
              <div><b>{sc.followed}/{sc.asked}</b><span>{L("Komandos laiku")}</span></div>
            </div>
            <p className="surf-best">{L("Iš viso: bangų – {waves}, sekundžių ant bangos – {seconds}", { waves: s.best.waves + sc.waves, seconds: s.best.seconds + sc.seconds })}</p>
            <p>{L("Frazės, kurias girdėjai, jau tavo kortelėse.")}</p>
            <div className="surf-levels">
              <button className="surf-level" onClick={() => game?.surfAgain("beginner")}><b>{L("Dar viena pamoka")}</b><span>{L("Pradedantiems")}</span></button>
              <button className="surf-level adv" onClick={() => game?.surfAgain("advanced")}><b>{L("Dar viena pamoka")}</b><span>{L("Pažengusiems")}</span></button>
            </div>
            <button className="surf-later" onClick={() => game?.surfStop()}>{L("Į krantą")}</button>
          </div>
        </div>
      )}
      {/* a phone has no keys to list: what its buttons do in this part of the lesson, for the first waves */}
      {touch && !s.over && !s.choice && s.best.waves < 3 && (s.phase === "out" || s.phase === "wait" || s.phase === "catch" || s.phase === "ride") && (
        <div className="surf-hint" lang={EDITION.helper}>
          {s.phase === "out" ? L("„Irkluoti“ – yriai · svirtis žemyn – nerti") : s.phase === "wait" ? L("Svirtis į šoną – pasukti lentą") : s.phase === "catch" ? L("„Irkluoti“ – yriai · ↑ – atsistoti") : L("Svirtis – svirti ir tūpti · ↑ – triukas")}
        </div>
      )}
      {!touch && !s.over && (
        <div className="help-strip surf-keys">
          {s.phase === "ride"
            ? Lx("Svirk {arrows} · triukas {space} · baigti {esc}", { arrows: <><kbd>←</kbd><kbd>→</kbd><kbd>↑</kbd><kbd>↓</kbd></>, space: <kbd>{L("Tarpas")}</kbd>, esc: <kbd>Esc</kbd> })
            : Lx("Irkluok {e} arba {lr} · suk lentą {lr2} · nerk {down} · stokis {space} · baigti {esc}", { e: <kbd>E</kbd>, lr: <><kbd>←</kbd><kbd>→</kbd></>, lr2: <><kbd>←</kbd><kbd>→</kbd></>, down: <kbd>↓</kbd>, space: <kbd>{L("Tarpas")}</kbd>, esc: <kbd>Esc</kbd> })}
        </div>
      )}
    </div>
  );
}
