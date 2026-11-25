import { useEffect, useRef, type PointerEvent, type ReactNode } from "react";
import { SURF_UI as S } from "../content/surf-ui";
import { speechSupported } from "../convo/speech";
import { MIC_FEEDBACK } from "../content/microphone";
import { game } from "../game/gameRef";
import { ARROW_BITS, DIRECTIONS, arrowFor, type SurfArrow } from "../game/surf/controls";
import type { Level } from "../game/surf/logic";
import { useSurf, type SurfLine, type SurfUi } from "../game/surf/store";
import { useStore } from "../state/store";
import { Interlinear } from "./Interlinear";
import { Icon } from "./icons";
import { FeedbackBadge } from "./kit/FeedbackBadge";
import { ScoreCard, ScoreNumber } from "./kit/ScoreCard";
import { natMatchesGloss } from "./natTip";
import "./surf.css";

const GLYPHS: Record<SurfArrow, string> = { up: "↑", left: "←", down: "↓", right: "→" };

function Answer({ s, lt }: { s: SurfLine["s"]; lt: boolean }) {
  return <>
    <span className="surf-choice-text surf-il" lang="en">
      {s.units.map((u, i) => <span className="u" key={i}>
        <span className="en">{u.en}</span>
        {lt && <span className={"lt" + (u.lt.startsWith("—") ? " dash" : "")} lang="lt">{u.lt}</span>}
      </span>)}
    </span>
    {lt && s.nat && !natMatchesGloss(s) && <small lang="lt">{s.nat}</small>}
  </>;
}

function SurfPad({ todo, pressed }: { todo: SurfUi["todo"]; pressed: number }) {
  const held = useRef(new Map<SurfArrow, number>());
  const asked = todo?.show ? arrowFor(todo.do) : undefined;

  useEffect(() => {
    function clear() {
      held.current.clear();
      game?.modeAction("surf", "clear");
    }
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
    if (e.button !== 0 || (held.current.has(dir) && (pressed & ARROW_BITS[dir]))) return;
    e.preventDefault();
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    held.current.set(dir, e.pointerId);
    game?.modeAction("surf", "arrow:" + dir, true);
  }

  function up(dir: SurfArrow, pointer: number) {
    if (held.current.get(dir) !== pointer) return;
    held.current.delete(dir);
    game?.modeAction("surf", "arrow:" + dir, false);
  }

  return <div className={"surf-pad" + (todo?.show && todo.do === "steady" ? " still" : "")}
    role="group" aria-label={S.control.pad.lt} onContextMenu={(e) => e.preventDefault()}>
    {DIRECTIONS.map((dir) => <button type="button" key={dir} data-dir={dir} aria-label={S.control[dir].lt}
      aria-pressed={!!(pressed & ARROW_BITS[dir])} className={asked?.includes(dir) ? "ask" : undefined}
      onPointerDown={(e) => down(dir, e)}
      onPointerUp={(e) => up(dir, e.pointerId)} onPointerCancel={(e) => up(dir, e.pointerId)}
      onPointerLeave={(e) => up(dir, e.pointerId)}
      onClick={(e) => {
        if (e.detail !== 0) return;
        game?.modeAction("surf", "arrow:" + dir, true);
        game?.modeAction("surf", "arrow:" + dir, false);
      }}><span aria-hidden>{GLYPHS[dir]}</span></button>)}
  </div>;
}

function Strokes({ of, left }: { of: number; left: number }) {
  return <span className="surf-strokes" aria-hidden>{Array.from({ length: of }, (_, i) => <i key={i} className={i < of - left ? "done" : ""} />)}</span>;
}

function Move({ todo, touch, flash }: { todo: SurfUi["todo"]; touch: boolean; flash: SurfArrow | null }) {
  if (!todo?.show) return null;
  const still = todo.do === "steady", name = S.move[todo.do].lt;
  const control = still ? (touch ? S.control.steadyTouch : S.control.steadyKeys)
    : touch ? S.control.touch : S.control.keys;
  const [prefix, suffix] = control.lt.replace("{what}", name).split("{key}");
  const idle = still || touch;
  const body = <>
    <span className="surf-move-text">{prefix}
      {!still && <span className="surf-keys-now">{arrowFor(todo.do).map((dir) =>
        <kbd key={dir} className={"surf-key" + (flash === dir ? " lit" : "")}>{GLYPHS[dir]}</kbd>)}</span>}{suffix}
    </span>
    {todo.of != null && todo.left != null && <Strokes of={todo.of} left={todo.left} />}
    {todo.time != null && <span className="surf-time" aria-hidden><i style={{ width: `${todo.time * 100}%` }} /></span>}
  </>;
  if (idle) return <div className={"surf-move" + (still ? " still" : "")} lang="lt">{body}</div>;
  return <button type="button" className="surf-move" lang="lt" onClick={() => game?.modeAction("surf", "act", todo.do)}>{body}</button>;
}

function Mic({ mic, on, touch }: { mic: SurfUi["mic"]; on: boolean; touch: boolean }) {
  const M = S.mic, can = speechSupported();
  const live = mic.status === "listening" || mic.status === "starting";
  const busy = live || mic.status === "unclear";
  const retry = touch ? M.restartTouch.lt : M.restartKeys.lt;
  let title: string = M.turn.lt, sub: ReactNode = M.choose.lt;
  const heard = (pattern: string) => {
    const [before, after] = pattern.split("{heard}");
    return <span className="heard">{before}<span lang="en">{mic.heard}</span>{after}</span>;
  };
  if (can && !on) sub = M.off.lt;
  if (can && on) switch (mic.status) {
    case "starting": sub = M.starting.lt; break;
    case "listening": sub = mic.heard ? heard(M.liveHeard.lt) : M.listening.lt; break;
    case "unclear": title = S.control.retry.lt; sub = heard(M.heard.lt); break;
    case "nothing": title = MIC_FEEDBACK.nothing; sub = retry; break;
    case "denied": title = MIC_FEEDBACK.denied; sub = M.deniedHelp.lt; break;
    case "error": title = MIC_FEEDBACK.error; sub = retry; break;
    default: sub = mic.heard ? heard(M.heard.lt) : retry;
  }
  const label = (on && busy ? M.disable : M.enable).lt;
  return <div className="surf-turn" lang="lt">
    {can && <button type="button" className={"mic surf-mic" + (live ? " listening" : "") + (on ? "" : " muted")}
      aria-pressed={on && live} title={label} aria-label={label} onClick={() => game?.modeAction("surf", "mic", !(on && busy))}>
      <Icon name="mic" size={26} />
    </button>}
    <div className="mic-status"><b>{title}</b><span className="sub">{sub}</span></div>
  </div>;
}

const total = (waves: number, seconds: number) => S.results.best.lt.replace("{waves}", String(waves)).replace("{seconds}", String(seconds));

function Levels({ replay = false, onLevel }: { replay?: boolean; onLevel(level: Level): void }) {
  return <>
    <button type="button" className={"surf-level" + (replay ? " btn" : "")} onClick={() => onLevel("beginner")}>
      <b>{replay ? S.results.repeat.lt : S.picker.beginner.lt}</b>
      <span>{replay ? S.picker.beginner.lt : S.picker.beginnerHelp.lt}</span>
    </button>
    <button type="button" className={"surf-level adv" + (replay ? " btn" : "")} onClick={() => onLevel("advanced")}>
      <b>{replay ? S.results.repeat.lt : S.picker.advanced.lt}</b>
      <span>{replay ? S.picker.advanced.lt : S.picker.advancedHelp.lt}</span>
    </button>
  </>;
}

export function SurfPicker() {
  const best = useSurf((s) => s.best);
  return <div className="surf-pick" role="dialog" aria-label={S.lesson.lt} lang="lt">
    <div className="surf-pick-card">
      <h2>{S.lesson.lt}</h2>
      <p>{S.picker.intro.lt}</p>
      <div className="surf-levels"><Levels onLevel={(level) => game?.modeStart("surf", level)} /></div>
      {best.waves > 0 && <p className="surf-best">{total(best.waves, best.seconds)}</p>}
      <button type="button" className="surf-later" onClick={() => game?.modeExit()}>{S.picker.later.lt}</button>
    </div>
  </div>;
}

export function SurfOverlay({ toolbar }: { toolbar: ReactNode }) {
  const s = useSurf();
  const touch = useStore((st) => st.hud.showTouch);
  const panel = useStore((st) => st.hud.panel);
  const slow = useStore((st) => !!st.settings.slowVoice);
  const lt = useStore((st) => st.settings.lt !== false);
  const sayLt = useStore((st) => st.settings.lt !== false && st.settings.sayLt !== false);
  const score = s.score, R = S.results, C = S.control;
  const tally = R.tally.lt.replace("{followed}", String(score.followed)).replace("{asked}", String(score.asked));

  return <div className={"surf" + (touch ? " touch" : "")} lang="lt" onKeyDown={(e) => {
    if ((e.key === "Enter" || e.key === " ") && (e.target as HTMLElement).matches("button:focus-visible")) e.stopPropagation();
  }}>
    <div className="surf-top">
      <button type="button" className="surf-x" onClick={() => game?.modeExit()} aria-label={C.exit.lt} title={C.exit.lt}><Icon name="close" size={20} strokeWidth={2.4} /></button>
      <button type="button" className={"surf-slow" + (slow ? " on" : "")} aria-pressed={slow}
        onClick={() => useStore.getState().setSettings({ slowVoice: !slow })}>{C.slow.lt}</button>
      <div className="surf-score" aria-label={R.score.lt}>
        <span title={R.waves.lt}><i aria-hidden>🌊</i>{score.waves}</span>
        <span title={R.seconds.lt}><i aria-hidden>⏱</i>{score.seconds}</span>
        <span title={R.commands.lt}><i aria-hidden>✓</i>{tally}</span>
      </div>
      {!s.over && toolbar}
    </div>
    {s.line && !s.over && <div className="surf-say">
      <div className={"surf-card" + (s.line.pic ? " has-pic" : "") + (s.mark ? " " + s.mark : "") + (s.asked ? " asked" : "")}>
        {s.line.pic && <div className="surf-pic" aria-hidden><img key={s.line.pic} className="new" src={s.line.pic} alt="" draggable={false} /></div>}
        <div className="surf-words">
          <div className="surf-cue-line">
            <div className="surf-feedback" aria-live="polite">
              {s.mark && <FeedbackBadge correct={s.mark === "ok"} label={(s.mark === "ok" ? C.good : C.retry).lt} />}
            </div>
            <Interlinear s={s.line.s} lt={lt} ipa={false} nat={lt && !natMatchesGloss(s.line.s)} />
          </div>
          {s.phase === "ride" && <div className="surf-balance" role="meter" aria-label={C.balance.lt}
            aria-valuemin={0} aria-valuemax={1} aria-valuenow={s.balance}><i style={{ width: `${s.balance * 100}%` }} /></div>}
        </div>
        <button type="button" className="surf-again" onClick={() => game?.modeAction("surf", "repeat")}
          title={C.replay.lt} aria-label={C.replay.lt}><Icon name="speaker" size={19} /></button>
      </div>
      <Move todo={s.todo} touch={touch} flash={s.keyFlash} />
      {s.finishedStrokes > 0 && <div className="surf-finished"><Strokes of={s.finishedStrokes} left={0} /></div>}
    </div>}
    {s.choice && !s.over && <div className="surf-choices">
      <Mic mic={s.mic} on={s.micOn} touch={touch} />
      {s.choice.options.map((o, i) => <button type="button" key={o.cue} className="surf-choice" onClick={() => game?.modeAction("surf", "choose", o.cue)}>
        {!touch && <kbd>{i + 1}</kbd>}
        <Answer s={o.s} lt={sayLt} />
      </button>)}
    </div>}
    {s.said && !s.choice && !s.over && <div className="surf-said">
      <Icon name="check" size={18} strokeWidth={2.6} />
      <span className="surf-said-words"><span lang="en">{s.said.s.en}</span>
        {sayLt && <small>{s.said.s.nat || s.said.s.units.map((u) => u.lt).join(" ")}</small>}
      </span>
    </div>}
    {touch && !s.over && !panel && <SurfPad todo={s.todo} pressed={s.pressed} />}
    {s.over && <ScoreCard title={R.done.lt} rows={[
      { label: R.waves.lt, value: <ScoreNumber value={score.waves} /> },
      { label: R.seconds.lt, value: <ScoreNumber value={score.seconds} /> },
      { label: R.commands.lt, value: <><ScoreNumber value={score.followed} />/{score.asked}</> },
    ]} actions={<>
      <Levels replay onLevel={(level) => game?.surfAgain?.(level)} />
      <button type="button" className="btn soft surf-later" onClick={() => game?.modeExit()}>{R.shore.lt}</button>
    </>}>
      <p className="surf-best">{total(s.best.waves + score.waves, s.best.seconds + score.seconds)}</p>
      <p>{R.saved.lt}</p>
    </ScoreCard>}
    {!touch && !s.over && <div className="help-strip surf-keys">
      <div>{C.moveHelp.lt.replace("{arrows}", "↑ ← ↓ →")}</div>
      {C.keysHelp.lt.replace("{n}", "1 2 3").replace("{m}", "M").replace("{esc}", "Esc")}
    </div>}
  </div>;
}
