// The surf lesson on the screen (src/game/surf/): what the instructor says, with its word line and its meaning as the
// game's translation settings give them (every time: 22 Nov 2026), and beside it a picture of what it asks for, where
// the edition has pictures. Then
// the learner's turn, as in every conversation: the lines they may answer with and the microphone that listens for
// them (a tap answers too), or, when she asked for a move, that move and its key in large letters right under her
// line. On a phone the arrows sit under the right thumb. The balance in a ride; the score; the level's
// choice at the start and the score card at the end.
import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { useStore } from "../state/store";
import { useSurf, type SurfLine, type SurfUi } from "../game/surf/store";
import { arrowFor, type Do, type SurfArrow } from "../game/surf/logic";
import { speechSupported } from "../convo/speech";
import { game } from "../game/gameRef";
import { Interlinear } from "./Interlinear";
import { Icon } from "./icons";
import { L, Lx, TL } from "./i18n";
import { EDITION } from "../edition";
import "./surf.css";

/** A line of Spanish with nothing under it but the same words: no second translation for it. */
const bare = (t: string) => t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const sameAsGloss = (s: SurfLine["s"]) => bare(s.units.map((u) => u.lt).join(" ")) === bare(s.nat ?? "");

/** One of her lines, with the help every conversation gives (the game's own setting „Vertimas po žodžiais“): the word
 *  line under the Spanish and the meaning under that, every time she says it (owner, 22 Nov 2026: lines that had lost
 *  their translation after a few hearings read as untranslated). With the setting off, the Spanish alone; a tap on a
 *  word still gives its meaning. */
function Line({ line, lt }: { line: SurfLine; lt: boolean }) {
  return <Interlinear s={line.s} lt={lt} ipa={false} nat={lt && !sameAsGloss(line.s)} />;
}

/** One of the learner's answers inside its button: the Spanish, each word with its meaning under it, and the whole
 *  meaning where it says more than the words (no popovers: the tap is the answer). */
function Answer({ s, lt }: { s: SurfLine["s"]; lt: boolean }) {
  return (
    <>
      <span className="surf-choice-text il surf-il" lang={TL}>
        {s.units.map((u, i) => (
          <span className="u" key={i}>
            <span className="en">{u.en}</span>
            {lt && <span className={"lt" + (u.lt.startsWith("—") ? " dash" : "")} lang={EDITION.helper}>{u.lt}</span>}
          </span>
        ))}
      </span>
      {(!lt || !sameAsGloss(s)) && s.nat && <small lang={EDITION.helper}>{s.nat}</small>}
    </>
  );
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

const MOVE_NAMES: Record<Do, string> = {
  paddle: L("Irkluok"), duck: L("Nerk po banga"), turn: L("Suk lentą"), up: L("Stokis"), left: L("Svirk į kairę"),
  right: L("Svirk į dešinę"), down: L("Tūpk"), fwd: L("Svorį pirmyn"), jump: L("Šok"), steady: L("Laikykis ramiai"),
};
const ARROW_GLYPHS: Record<SurfArrow, string> = { up: "↑", down: "↓", left: "←", right: "→" };
const DIRECTIONS = ["up", "left", "down", "right"] as const;
/** The pad's arrows by name, for a screen reader. */
const ARROW_NAMES: Record<SurfArrow, string> = { up: L("Rodyklė aukštyn"), down: L("Rodyklė žemyn"), left: L("Rodyklė kairėn"), right: L("Rodyklė dešinėn") };

function ArrowKey({ dir }: { dir: SurfArrow }) {
  const lit = useSurf((s) => s.keyFlash === dir);
  return <kbd className={"surf-key" + (lit ? " lit" : "")}>{ARROW_GLYPHS[dir]}</kbd>;
}

/** Four arrows under the thumb. Each finger holds its own arrow until it lifts or slides off. */
function SurfPad({ todo }: { todo: SurfUi["todo"] }) {
  const held = useRef(new Map<SurfArrow, number>());
  const [pressed, setPressed] = useState<SurfArrow[]>([]);
  const asked = todo?.show ? arrowFor(todo.do) : [];
  useEffect(() => {
    const clear = () => {
      for (const dir of held.current.keys()) game?.surfArrow(dir, false);
      held.current.clear();
      setPressed([]);
    };
    const hidden = () => { if (document.hidden) clear(); };
    window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("blur", clear);
      document.removeEventListener("visibilitychange", hidden);
      clear();
    };
  }, []);
  function down(dir: SurfArrow, e: PointerEvent<HTMLButtonElement>) {
    if (e.button !== 0 || held.current.has(dir)) return;
    e.preventDefault();
    // Touch takes pointer capture by default. Let sliding off a key release it like a mouse would.
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    held.current.set(dir, e.pointerId);
    setPressed([...held.current.keys()]);
    game?.surfArrow(dir, true);
    navigator.vibrate?.(8);
  }
  function up(dir: SurfArrow, id: number) {
    if (held.current.get(dir) !== id) return;
    held.current.delete(dir);
    setPressed([...held.current.keys()]);
    game?.surfArrow(dir, false);
  }
  return (
    <div className={"surf-pad" + (todo?.show && todo.do === "steady" ? " still" : "")} onContextMenu={(e) => e.preventDefault()}>
      {DIRECTIONS.map((dir) => (
        <button type="button" key={dir} data-dir={dir} aria-label={ARROW_NAMES[dir]} aria-pressed={pressed.includes(dir)}
          className={asked.includes(dir) ? "ask" : undefined}
          onPointerDown={(e) => down(dir, e)} onPointerUp={(e) => up(dir, e.pointerId)}
          onPointerCancel={(e) => up(dir, e.pointerId)} onPointerLeave={(e) => up(dir, e.pointerId)}
          onClick={(e) => {
            // Assistive controls can activate a button without a pointer.
            if (e.detail === 0) { game?.surfArrow(dir, true); game?.surfArrow(dir, false); }
          }}><span aria-hidden>{ARROW_GLYPHS[dir]}</span></button>
      ))}
    </div>
  );
}

function Strokes({ of, left }: { of: number; left: number }) {
  return <span className="surf-strokes" aria-hidden>{Array.from({ length: of }, (_, i) => <i key={i} className={i < of - left ? "done" : ""} />)}</span>;
}

/** Her move and its arrows, with a dot per stroke and a bar when the wave won't wait. */
function Move({ todo, touch }: { todo: SurfUi["todo"]; touch: boolean }) {
  // The last stroke clears the move in the same frame. Give its filled dot a moment on screen too.
  const [lastStroke, setLastStroke] = useState(0);
  useEffect(() => {
    if (todo) setLastStroke(todo.do === "paddle" && todo.left === 1 ? todo.of ?? 0 : 0);
    else if (lastStroke) {
      const t = setTimeout(() => setLastStroke(0), 230);
      return () => clearTimeout(t);
    }
  }, [todo, lastStroke]);
  if (!todo) return lastStroke ? <div className="surf-finished"><Strokes of={lastStroke} left={0} /></div> : null;
  if (!todo.show) return null;
  const still = todo.do === "steady";
  const what = <b>{MOVE_NAMES[todo.do]}</b>;
  const key = <span className="surf-keys-now">{arrowFor(todo.do).map((dir) => <ArrowKey key={dir} dir={dir} />)}</span>;
  const body = (
    <>
      <span className="surf-move-text">
        {still ? Lx("{what} – nieko nespausk", { what })
          : touch ? Lx("{what} – bakstelėk {key}", { what, key }) : Lx("{what} – spausk {key}", { what, key })}
      </span>
      {todo.of != null && todo.left != null && <Strokes of={todo.of} left={todo.left} />}
      {todo.time != null && <span className="surf-time" aria-hidden><i style={{ width: `${Math.round(todo.time * 100)}%` }} /></span>}
    </>
  );
  if (touch || still) return <div className={"surf-move" + (still ? " still" : "")} lang={EDITION.helper} role="status">{body}</div>;
  return <button className="surf-move" lang={EDITION.helper} onPointerDown={(e) => { e.preventDefault(); game?.surfAct(todo.do); }}>{body}</button>;
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
  // the translations follow the game's settings, as in every conversation: her lines (lt), the learner's (sayLt)
  const lt = useStore((st) => st.settings.lt !== false);
  const sayLt = useStore((st) => st.settings.sayLt !== false);
  if (!s.active) return null;
  const sc = s.score;
  const riding = s.phase === "ride";
  const pic = s.line?.pic;
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
              <Line line={s.line} lt={lt} />
              {riding && <div className="surf-balance" role="meter" aria-label={L("Pusiausvyra")} aria-valuemin={0} aria-valuemax={1} aria-valuenow={s.balance}><i style={{ width: `${Math.round(s.balance * 100)}%` }} /></div>}
            </div>
            <button className="surf-again" onClick={() => game?.surfRepeat()} title={L("Pakartoti")} aria-label={L("Pakartoti")} lang={EDITION.helper}><Icon name="speaker" size={19} /></button>
          </div>
          {/* her line asks for a move: the move and its key, large, right under it */}
          <Move todo={s.todo} touch={touch} />
        </div>
      )}
      {/* the learner's turn to speak: the microphone listens for one of these lines; a tap answers too */}
      {s.choice && !s.over && (
        <div className="surf-choices">
          <Mic mic={s.mic} on={s.micOn} />
          {s.choice.options.map((o, i) => (
            <button key={o.cue} className="surf-choice" onClick={() => game?.surfChoose(o.cue)}>
              {!touch && <kbd>{i + 1}</kbd>}
              <Answer s={o.s} lt={sayLt} />
            </button>
          ))}
        </div>
      )}
      {/* what the learner has just said, until she answers */}
      {s.said && !s.choice && !s.over && <div className="surf-said" lang={TL}><Icon name="check" size={18} strokeWidth={2.6} /> <span className="surf-said-words"><span>{s.said.s.en}</span>{sayLt && s.said.s.nat && <small lang={EDITION.helper}>{s.said.s.nat}</small>}</span></div>}
      {touch && !s.over && <SurfPad todo={s.todo} />}
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
          <div>{Lx("Judesiai {arrows}", { arrows: DIRECTIONS.map((dir) => <ArrowKey key={dir} dir={dir} />) })}</div>
          {Lx("Atsakyk balsu arba {n} · mikrofonas {m} · baigti {esc}", { n: <><kbd>1</kbd><kbd>2</kbd><kbd>3</kbd></>, m: <kbd>M</kbd>, esc: <kbd>Esc</kbd> })}
        </div>
      )}
    </div>
  );
}
