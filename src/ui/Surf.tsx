// The surf lesson on the screen (src/game/surf/): what the instructor says, shown with as much help as the learner
// still needs for that line (its glosses and its meaning at first, then the Spanish alone, then only her voice), and
// beside it a picture of what it asks for, where the edition has pictures (it goes when only her voice is left). Then
// the learner's turn, as in every conversation: the lines they may answer with and the microphone that listens for
// them (a tap answers too), or, when she asked for a move, that move and its key in large letters right under her
// line ("Stokis – spausk ↑"; on a phone it is the button to tap). The balance in a ride; the score; the level's
// choice at the start and the score card at the end.
import { memo, useEffect, useRef, useState, type ReactNode } from "react";
import { SURF } from "../content/surf";
import { useStore } from "../state/store";
import { useSurf, type SurfUi } from "../game/surf/store";
import type { Do } from "../game/surf/logic";
import { speechSupported } from "../convo/speech";
import { game } from "../game/gameRef";
import { GlossLine } from "./kit/GlossLine";
import PhraseReview from "./kit/PhraseReview";
import { PhraseSave } from "./kit/PhraseSave";
import { Icon } from "./icons";
import "./surf.css";

const SurfSave = memo(PhraseSave);

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
    case "paddle": return { name: "Irkluok", keys: <K>E</K> };
    case "duck": return { name: "Nerk po banga", keys: <K>↓</K> };
    case "turn": return { name: "Suk lentą", keys: <><K>←</K><K>→</K></> };
    case "up": return { name: "Stokis", keys: <K>↑</K> };
    case "left": return { name: "Svirk į kairę", keys: <K>←</K> };
    case "right": return { name: "Svirk į dešinę", keys: <K>→</K> };
    case "down": return { name: "Tūpk", keys: <K>↓</K> };
    case "fwd": return { name: "Svorį pirmyn", keys: <K>↑</K> };
    case "jump": return { name: "Šok", keys: <K>Tarpas</K> };
    case "steady": return { name: "Laikykis ramiai", keys: null };
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
        {still ? <><b>{m.name}</b> – nieko nespausk</>
          : touch ? <><b>{m.name}</b> – bakstelėk</>
            : <><b>{m.name}</b> – spausk <span className="surf-keys-now">{m.keys}</span></>}
      </span>
      {todo.of != null && todo.left != null && <span className="surf-strokes" aria-hidden>{Array.from({ length: todo.of }, (_, i) => <i key={i} className={i < todo.of! - todo.left! ? "done" : ""} />)}</span>}
      {todo.time != null && <span className="surf-time" aria-hidden><i style={{ width: `${Math.round(todo.time * 100)}%` }} /></span>}
    </>
  );
  // (a move made by not moving has nothing to tap)
  if (still) return <div className="surf-move still" lang="lt" role="status">{body}</div>;
  return <button className={"surf-move" + (touch ? " tap" : "")} lang="lt" onPointerDown={(e) => { e.preventDefault(); game?.modeAction("surf", "act", todo.do); }}>{body}</button>;
}

/** The learner's turn to speak: what the microphone is doing, and its button (answering aloud on or off). */
function Mic({ mic, on }: { mic: SurfUi["mic"]; on: boolean }) {
  const live = mic.status === "listening" || mic.status === "starting";
  // (between two tries it is still the microphone's turn)
  const busy = live || mic.status === "unclear";
  const can = speechSupported();
  let title = "Tavo eilė", sub: ReactNode = "Pasirink atsakymą";
  if (can && !on) sub = "Pasirink atsakymą arba įjunk mikrofoną";
  if (can && on) switch (mic.status) {
    case "starting": sub = "Jungiamas mikrofonas…"; break;
    case "listening": sub = mic.heard ? <span className="heard" lang="en">„{mic.heard}“</span> : "Pasakyk garsiai – klausau"; break;
    case "unclear": title = "Pabandyk dar kartą"; sub = <span className="heard" lang="en">Išgirdau „{mic.heard}“</span>; break;
    case "nothing": title = "Nieko negirdėjau"; sub = "Spausk mikrofoną arba pasirink atsakymą"; break;
    case "denied": title = "Leisk naudoti mikrofoną"; sub = "Arba pasirink atsakymą"; break;
    case "error": title = "Klausymas nepavyko"; sub = "Spausk mikrofoną arba pasirink atsakymą"; break;
    default: sub = mic.heard ? <span className="heard" lang="en">Išgirdau „{mic.heard}“</span> : "Spausk mikrofoną arba pasirink atsakymą";
  }
  return (
    <div className="surf-turn" lang="lt">
      {can && (
        <button className={"mic surf-mic" + (live ? " listening" : "") + (on ? "" : " muted")} aria-pressed={on && live}
          title={on && busy ? "Išjungti mikrofoną" : "Įjungti mikrofoną"} aria-label={on && busy ? "Išjungti mikrofoną" : "Įjungti mikrofoną"}
          onClick={() => game?.modeAction("surf", "mic", !(on && busy))}>
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
    <div className="surf-pick" role="dialog" aria-label="Banglenčių pamoka">
      <div className="surf-pick-card">
        <h2><span aria-hidden>🏄</span> Banglenčių pamoka</h2>
        <p>Pokalbis ant bangų: instruktorė sako, tu atsakai balsu ir darai, ko ji prašo.</p>
        <div className="surf-levels">
          <button className="surf-level" onClick={() => game?.modeStart("surf", "beginner")}>
            <b>Pradedantiems</b>
            <span>Putos, minkšta lenta, daugiau laiko.</span>
          </button>
          <button className="surf-level adv" onClick={() => game?.modeStart("surf", "advanced")}>
            <b>Pažengusiems</b>
            <span>Žalios bangos, posūkiai, eilė prie bangos.</span>
          </button>
        </div>
        {best.waves > 0 && <p className="surf-best">{`Iš viso: bangų – ${best.waves}, sekundžių ant bangos – ${best.seconds}`}</p>}
        <button className="surf-later" onClick={() => game?.modeExit()}>Ne dabar</button>
      </div>
    </div>
  );
}

export function SurfOverlay() {
  const s = useSurf();
  const touch = useStore((st) => st.hud.showTouch);
  const slow = useStore((st) => !!st.settings.slowVoice);
  const [shown, setShown] = useState<SurfUi["line"]>(null);
  if (!s.active) return null;
  const sc = s.score;
  const situationId = SURF?.situation;
  const hidden = s.support === 2 && shown !== s.line;
  const riding = s.phase === "ride";
  // the picture is help too: it stays while the words lose their translation, and goes when only her voice is left
  // (a tap brings the words and the picture back)
  const pic = hidden ? undefined : s.line?.pic;
  return (
    <div className={"surf" + (touch ? " touch" : "")}>
      <div className="surf-top">
        <button className="surf-x" onClick={() => game?.modeExit()} aria-label="Baigti pamoką" title="Baigti pamoką"><Icon name="close" size={20} strokeWidth={2.4} /></button>
        <button className={"surf-slow" + (slow ? " on" : "")} aria-pressed={slow} onClick={() => useStore.getState().setSettings({ slowVoice: !slow })}>Lėčiau</button>
        <div className="surf-score" aria-label="Rezultatas">
          <span title="Bangos"><i aria-hidden>🌊</i>{sc.waves}</span>
          <span title="Sekundės ant bangos"><i aria-hidden>⏱</i>{sc.seconds}</span>
          <span title="Komandos laiku"><i aria-hidden>✓</i>{sc.followed}/{sc.asked}</span>
        </div>
      </div>
      {s.line && !s.over && (
        <div className="surf-say">
          <div className={"surf-card" + (pic ? " has-pic" : "") + (s.mark ? " " + s.mark : "") + (s.asked ? " asked" : "")} lang="en">
            {pic && <Picture src={pic} />}
            <div className="surf-words">
              {hidden
                ? <button className="surf-listen" onClick={() => setShown(s.line)} lang="lt"><Icon name="speaker" size={22} /> <span>Klausyk</span><small>Rodyti tekstą</small></button>
                : <div className="phrase-save-row">
                  <GlossLine sentence={s.line.s} gloss={s.support === 0} />
                  {situationId && <SurfSave sentence={s.line.s} situationId={situationId} iconOnly />}
                </div>}
              {riding && <div className="surf-balance" role="meter" aria-label="Pusiausvyra" aria-valuemin={0} aria-valuemax={1} aria-valuenow={s.balance}><i style={{ width: `${Math.round(s.balance * 100)}%` }} /></div>}
            </div>
            <button className="surf-again" onClick={() => game?.modeAction("surf", "repeat")} title="Pakartoti" aria-label="Pakartoti" lang="lt"><Icon name="speaker" size={19} /></button>
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
            <div className="phrase-save-row" key={o.cue}>
              <button className="surf-choice" onClick={() => game?.modeAction("surf", "choose", o.cue)}>
                {!touch && <kbd>{i + 1}</kbd>}
                <span className="surf-choice-text" lang="en">{o.s.en}</span>
                <small lang="lt">{o.s.nat}</small>
              </button>
              {situationId && <SurfSave sentence={o.s} situationId={situationId} iconOnly />}
            </div>
          ))}
        </div>
      )}
      {/* what the learner has just said, until she answers */}
      {s.said && !s.choice && !s.over && <div className="surf-said" lang="en">
        <Icon name="check" size={18} strokeWidth={2.6} /> <span>{s.said.s.en}</span>
        {situationId && <SurfSave sentence={s.said.s} situationId={situationId} iconOnly />}
      </div>}
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
            {!!s.review?.length && <PhraseReview entries={s.review} />}
            <div className="surf-levels">
              <button className="surf-level" onClick={() => game?.modeAction("surf", "again", "beginner")}><b>Dar viena pamoka</b><span>Pradedantiems</span></button>
              <button className="surf-level adv" onClick={() => game?.modeAction("surf", "again", "advanced")}><b>Dar viena pamoka</b><span>Pažengusiems</span></button>
            </div>
            <button className="surf-later" onClick={() => game?.modeExit()}>Į krantą</button>
          </div>
        </div>
      )}
      {!touch && !s.over && (
        <div className="help-strip surf-keys">
          Atsakyk balsu arba <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> · mikrofonas <kbd>M</kbd> · baigti <kbd>Esc</kbd>
        </div>
      )}
    </div>
  );
}
