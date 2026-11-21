// The surf lesson on the screen (src/game/surf/): what the instructor says, shown with as much help as the learner
// still needs for that line (its glosses and its meaning at first, then the Spanish alone, then only her voice), and
// beside it a picture of what it asks for, where the edition has pictures (it goes when only her voice is left). Then
// the learner's turn, as in every conversation: the lines they may answer with and the microphone that listens for
// them (a tap answers too), or, when she asked for a move, that move and its key in large letters right under her
// line ("Stokis – spausk ↑"; on a phone it is the button to tap). The balance in a ride; the score; the level's
// choice at the start and the score card at the end.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useStore } from "../state/store";
import { useSurf, type SurfLine, type SurfUi } from "../game/surf/store";
import type { Do } from "../game/surf/logic";
import { speechSupported } from "../convo/speech";
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

const K = ({ children }: { children: ReactNode }) => <kbd className="surf-key">{children}</kbd>;
/** What a move is called in the learner's language, and the key that makes it. */
function move(what: Do): { name: string; keys: ReactNode } {
  switch (what) {
    case "paddle": return { name: L("Irkluok"), keys: <K>E</K> };
    case "duck": return { name: L("Nerk po banga"), keys: <K>↓</K> };
    case "turn": return { name: L("Suk lentą"), keys: <><K>←</K><K>→</K></> };
    case "up": return { name: L("Stokis"), keys: <K>↑</K> };
    case "left": return { name: L("Svirk į kairę"), keys: <K>←</K> };
    case "right": return { name: L("Svirk į dešinę"), keys: <K>→</K> };
    case "down": return { name: L("Tūpk"), keys: <K>↓</K> };
    case "fwd": return { name: L("Svorį pirmyn"), keys: <K>↑</K> };
    case "jump": return { name: L("Šok"), keys: <K>{L("Tarpas")}</K> };
    case "steady": return { name: L("Laikykis ramiai"), keys: null };
  }
}

/** The move she asks for, right under her line: its name and its key in large letters; on a phone, the button that
 *  makes it. The strokes still to paddle as dots; where the wave won't wait, the time left as a bar. */
function Move({ todo, touch }: { todo: NonNullable<SurfUi["todo"]>; touch: boolean }) {
  const m = move(todo.do);
  const still = todo.do === "steady";
  const body = (
    <>
      <span className="surf-move-text">
        {still ? Lx("{what} – nieko nespausk", { what: <b>{m.name}</b> })
          : touch ? Lx("{what} – bakstelėk", { what: <b>{m.name}</b> })
            : Lx("{what} – spausk {key}", { what: <b>{m.name}</b>, key: <span className="surf-keys-now">{m.keys}</span> })}
      </span>
      {todo.of != null && todo.left != null && <span className="surf-strokes" aria-hidden>{Array.from({ length: todo.of }, (_, i) => <i key={i} className={i < todo.of! - todo.left! ? "done" : ""} />)}</span>}
      {todo.time != null && <span className="surf-time" aria-hidden><i style={{ width: `${Math.round(todo.time * 100)}%` }} /></span>}
    </>
  );
  // (a move made by not moving has nothing to tap)
  if (still) return <div className="surf-move still" lang={EDITION.helper} role="status">{body}</div>;
  return <button className={"surf-move" + (touch ? " tap" : "")} lang={EDITION.helper} onPointerDown={(e) => { e.preventDefault(); game?.surfAct(todo.do); }}>{body}</button>;
}

/** The learner's turn to speak: what the microphone is doing, and its button (answering aloud on or off). */
function Mic({ mic, on }: { mic: SurfUi["mic"]; on: boolean }) {
  const live = mic.status === "listening" || mic.status === "starting";
  // (between two tries it is still the microphone's turn)
  const busy = live || mic.status === "unclear";
  const can = speechSupported();
  let title = L("Tavo eilė"), sub: ReactNode = L("Pasirink atsakymą");
  if (can && !on) sub = L("Pasirink atsakymą arba įjunk mikrofoną");
  if (can && on) switch (mic.status) {
    case "starting": sub = L("Jungiamas mikrofonas…"); break;
    case "listening": sub = mic.heard ? <span className="heard" lang={TL}>{Lx("„{heard}“", { heard: mic.heard })}</span> : L("Pasakyk garsiai – klausau"); break;
    case "unclear": title = L("Pabandyk dar kartą"); sub = <span className="heard" lang={TL}>{Lx("Išgirdau „{heard}“", { heard: mic.heard })}</span>; break;
    case "nothing": title = L("Nieko negirdėjau"); sub = L("Spausk mikrofoną arba pasirink atsakymą"); break;
    case "denied": title = L("Leisk naudoti mikrofoną"); sub = L("Arba pasirink atsakymą"); break;
    case "error": title = L("Klausymas nepavyko"); sub = L("Spausk mikrofoną arba pasirink atsakymą"); break;
    default: sub = mic.heard ? <span className="heard" lang={TL}>{Lx("Išgirdau „{heard}“", { heard: mic.heard })}</span> : L("Spausk mikrofoną arba pasirink atsakymą");
  }
  return (
    <div className="surf-turn" lang={EDITION.helper}>
      {can && (
        <button className={"mic surf-mic" + (live ? " listening" : "") + (on ? "" : " muted")} aria-pressed={on && live}
          title={on && busy ? L("Išjungti mikrofoną") : L("Įjungti mikrofoną")} aria-label={on && busy ? L("Išjungti mikrofoną") : L("Įjungti mikrofoną")}
          onClick={() => game?.surfMic(!(on && busy))}>
          <Icon name="mic" size={26} />
        </button>
      )}
      <div className="mic-status"><b>{title}</b><span className="sub">{sub}</span></div>
    </div>
  );
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
        <p>{L("Pokalbis ant bangų: instruktorė sako, tu atsakai balsu ir darai, ko ji prašo.")}</p>
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

export function SurfOverlay({ toolbar }: { toolbar: ReactNode }) {
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
        <button className="surf-x" onClick={() => game?.surfStop()} aria-label={L("Baigti pamoką")} title={L("Baigti pamoką")}><Icon name="close" size={20} strokeWidth={2.4} /></button>
        <button className={"surf-slow" + (slow ? " on" : "")} aria-pressed={slow} onClick={() => useStore.getState().setSettings({ slowVoice: !slow })}>{L("Lėčiau")}</button>
        <div className="surf-score" aria-label={L("Rezultatas")}>
          <span title={L("Bangos")}><i aria-hidden>🌊</i>{sc.waves}</span>
          <span title={L("Sekundės ant bangos")}><i aria-hidden>⏱</i>{sc.seconds}</span>
          <span title={L("Komandos laiku")}><i aria-hidden>✓</i>{sc.followed}/{sc.asked}</span>
        </div>
        {!s.over && toolbar}
      </div>
      {s.line && !s.over && (
        <div className="surf-say">
          <div className={"surf-card" + (pic ? " has-pic" : "") + (s.mark ? " " + s.mark : "") + (s.asked ? " asked" : "")} lang={TL}>
            {pic && <Picture src={pic} />}
            <div className="surf-words">
              {hidden
                ? <button className="surf-listen" onClick={() => setShown(true)} lang={EDITION.helper}><Icon name="speaker" size={22} /> <span>{L("Klausyk")}</span><small>{L("Rodyti tekstą")}</small></button>
                : <Line line={s.line} support={s.support === 2 ? 1 : s.support} />}
              {riding && <div className="surf-balance" role="meter" aria-label={L("Pusiausvyra")} aria-valuemin={0} aria-valuemax={1} aria-valuenow={s.balance}><i style={{ width: `${Math.round(s.balance * 100)}%` }} /></div>}
            </div>
            <button className="surf-again" onClick={() => game?.surfRepeat()} title={L("Pakartoti")} aria-label={L("Pakartoti")} lang={EDITION.helper}><Icon name="speaker" size={19} /></button>
          </div>
          {/* her line asks for a move: the move and its key, large, right under it */}
          {s.todo?.show && <Move todo={s.todo} touch={touch} />}
        </div>
      )}
      {/* the learner's turn to speak: the microphone listens for one of these lines; a tap answers too */}
      {s.choice && !s.over && (
        <div className="surf-choices">
          <Mic mic={s.mic} on={s.micOn} />
          {s.choice.options.map((o, i) => (
            <button key={o.cue} className="surf-choice" onClick={() => game?.surfChoose(o.cue)}>
              {!touch && <kbd>{i + 1}</kbd>}
              <span className="surf-choice-text" lang={TL}>{o.s.en}</span>
              <small lang={EDITION.helper}>{o.s.nat}</small>
            </button>
          ))}
        </div>
      )}
      {/* what the learner has just said, until she answers */}
      {s.said && !s.choice && !s.over && <div className="surf-said" lang={TL}><Icon name="check" size={18} strokeWidth={2.6} /> <span>{s.said.s.en}</span></div>}
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
      {!touch && !s.over && (
        <div className="help-strip surf-keys">
          {Lx("Atsakyk balsu arba {n} · mikrofonas {m} · baigti {esc}", { n: <><kbd>1</kbd><kbd>2</kbd><kbd>3</kbd></>, m: <kbd>M</kbd>, esc: <kbd>Esc</kbd> })}
        </div>
      )}
    </div>
  );
}
