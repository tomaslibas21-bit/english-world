import { useRef, type CSSProperties, type PointerEvent } from "react";
import { game } from "../game/gameRef";
import { useBilliards, type RackBall } from "../game/billiards/store";
import { ballColor } from "../game/billiards/table";
import type { KitLine } from "../game/kit/dialogue";
import { BILLIARDS_NPC } from "../content/billiards-lines";
import { HL, L } from "./i18n";
import { Icon } from "./icons";
import { GlossLine } from "./kit/GlossLine";
import { ScoreCard, ScoreNumber } from "./kit/ScoreCard";
import "./billiards.css";

const mapleHarbor = BILLIARDS_NPC === "tina";
const act = (name: string, value?: string) => game?.modeAction("billiards", name, value);

function BallBadge({ id, down }: RackBall) {
  return <span className={"bl-ball" + (id > 8 ? " striped" : "") + (down ? " down" : "")}
    style={{ "--bl-ball": ballColor(id) } as CSSProperties}><b>{id}</b></span>;
}

function BallRow({ name, balls, active }: { name: string; balls: RackBall[]; active: boolean }) {
  return <div className={"bl-row" + (active ? " current" : "")}>
    <span className="bl-row-name">{name}</span>
    {balls.map((ball) => <BallBadge {...ball} key={ball.id} />)}
    {balls.length > 0 && balls.every((ball) => ball.down) && <BallBadge id={8} down={false} />}
  </div>;
}

function Speech({ line }: { line: KitLine }) {
  return <div className="bl-speech" data-line={line.key}><GlossLine sentence={line.sentence} gloss compact /></div>;
}

function Choice({ line }: { line: KitLine }) {
  return <button className="bl-choice" data-line={line.key} onClick={() => act("choice", line.key)}>
    <GlossLine sentence={line.sentence} gloss compact />
  </button>;
}

function TablePad({ aiming, usable }: { aiming: boolean; usable: boolean }) {
  const gesture = useRef<{ id: number; x: number; y: number; last: number; dragging: boolean } | null>(null);
  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (!usable || gesture.current || e.button !== 0) return;
    gesture.current = { id: e.pointerId, x: e.clientX, y: e.clientY, last: e.clientX, dragging: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    if (Math.hypot(e.clientX - g.x, e.clientY - g.y) > 5) g.dragging = true;
    if (g.dragging && aiming) {
      act("nudge", String((e.clientX - g.last) * 0.15));
      g.last = e.clientX;
    }
  };
  return <div className={"bl-table-pad" + (aiming ? " aiming" : "")}
    onPointerDown={down} onPointerMove={move}
    onPointerUp={(e) => {
      const g = gesture.current;
      if (!g || g.id !== e.pointerId) return;
      gesture.current = null;
      if (!g.dragging) act("tap", `${e.clientX},${e.clientY}`);
    }}
    onLostPointerCapture={(e) => { if (gesture.current?.id === e.pointerId) gesture.current = null; }} />;
}

function PowerBar({ power }: { power: number }) {
  const drag = useRef<{ id: number; start: number; pulled: boolean } | null>(null);
  const pull = (e: PointerEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    act("power", String(Math.max(0, Math.min(1, (e.clientY - rect.top - 9) / Math.max(1, rect.height - 18)))));
  };
  const cancel = (e: PointerEvent<HTMLButtonElement>) => {
    if (drag.current?.id !== e.pointerId) return;
    drag.current = null;
    act("power", "0");
  };
  return <div className="bl-power">
    <span>{L("Jėga")}</span>
    <button className="bl-power-track" aria-label={L("Jėga")} style={{ "--bl-power": power } as CSSProperties}
      onPointerDown={(e) => {
        if (e.button !== 0 || drag.current) return;
        drag.current = { id: e.pointerId, start: e.clientY, pulled: false };
        e.currentTarget.setPointerCapture(e.pointerId);
        pull(e);
      }}
      onPointerMove={(e) => {
        const current = drag.current;
        if (!current || current.id !== e.pointerId) return;
        current.pulled ||= e.clientY - current.start > 3;
        pull(e);
      }}
      onPointerUp={(e) => {
        const current = drag.current;
        if (!current || current.id !== e.pointerId) return;
        drag.current = null;
        if (current.pulled || e.clientY - current.start > 3) { pull(e); act("shoot"); }
        else act("power", "0");
      }}
      onPointerCancel={cancel} onLostPointerCapture={cancel}>
      <i className="bl-power-fill" /><i className="bl-power-knob" />
    </button>
    <output className="bl-power-value">{Math.round(power * 100)}%</output>
  </div>;
}

export function BilliardsOverlay({ touch }: { touch: boolean }) {
  const state = useBilliards();
  const { phase, side, line, choices, selection, pockets, available, call, reveal, correct, result } = state;
  const aiming = phase === "aim" || phase === "break";
  const picking = phase === "call" || phase === "listen";
  const waitingForTina = side === "tina" && phase === "tina";
  const showCall = !!call && (phase === "feedback" || (phase === "listen" || waitingForTina) && reveal);
  const shotOk = phase === "feedback" && correct;
  const scoreTitle = result?.winner === "learner" ? L("Laimėjai!") : result?.winner === "tina" ? (mapleHarbor ? "Laimėjo Tina" : L("Laimėjo Don Memas")) : L("Lygiosios");
  return <div className="billiards" data-phase={phase} lang={HL}>
    <header className="bl-header">
      <section className="bl-status">
        <div className="bl-turn" aria-live="polite"><i />{side === "learner" ? L("Tavo eilė") : (mapleHarbor ? "Tinos eilė" : L("Don Memo eilė"))}</div>
        <div className="bl-rack">
          <BallRow name={L("Tu")} balls={state.balls.learner} active={side === "learner"} />
          <BallRow name={mapleHarbor ? "Tina" : L("Don Memas")} balls={state.balls.tina} active={side === "tina"} />
        </div>
      </section>
      <button className="bl-exit" onClick={() => game?.modeExit()}><Icon name="close" size={15} />{L("Baigti partiją")}</button>
    </header>
    <div className="bl-stage">
      <TablePad aiming={aiming} usable={picking || aiming} />
      {aiming && <PowerBar power={state.power} />}
    </div>
    <section className="bl-panel" aria-live={picking ? "off" : "polite"}>
      {phase === "group" && <>
        <h2>{L("Vienspalviai ar dryžuoti?")}</h2>
        <div className="bl-choices">{choices.map((choice) => <Choice key={choice.key} line={choice} />)}</div>
      </>}
      {picking && <>
        <div className="bl-instruction">
          <h2>{phase === "listen" ? (mapleHarbor ? "Ką paskelbė Tina? Pasirink kamuolį ir kišenę." : L("Ką paskelbė Don Memas? Pasirink kamuolį ir kišenę.")) : L("Paskelbk smūgį: pasirink kamuolį ir kišenę.")}</h2>
          {phase === "listen" && <button className="bl-replay" disabled={state.replaying} onClick={() => act("replay")}>
            <Icon name="speaker" size={15} />{L("Klausyti dar kartą")}
          </button>}
        </div>
        {showCall && <Speech line={call} />}
        <div className="bl-chip-heading">{L("Kamuolys")}</div>
        <div className="bl-ball-chips" role="group" aria-label={L("Kamuolys")}>
          {available.map((id) => <button key={id} className="bl-ball-option" data-ball={id} aria-pressed={id === selection.ball}
            disabled={state.replaying} onClick={() => act("ball", String(id))}><BallBadge id={id} down={false} /></button>)}
        </div>
        <div className="bl-chip-heading">{L("Kišenė")}</div>
        <div className="bl-pocket-chips" role="group" aria-label={L("Kišenė")}>
          {pockets.map(({ id, line }) => <button key={id} data-pocket={id} className="bl-choice" aria-pressed={id === selection.pocket}
            disabled={state.replaying} onClick={() => act("pocket", id)}>
            <GlossLine sentence={{ ...line.sentence, en: line.sentence.en.replace(/\.$/, ""),
              nat: line.sentence.nat.replace(/\.$/, "") }} gloss compact />
          </button>)}
        </div>
        {phase === "call" && call && <button className="bl-confirm" onClick={() => act("confirm")}>
          <span data-mic={state.mic.status}><Icon name="mic" size={15} />{L("Pasakyk arba bakstelėk:")}</span>
          <GlossLine sentence={call.sentence} gloss compact />
        </button>}
      </>}
      {aiming && <>
        {phase === "break" ? <h2>{L("Pradinis smūgis – skelbti nereikia.")}</h2> : call && <Speech line={call} />}
        <div className="bl-aim">
          <button className="bl-nudge" aria-label={L("Taikyti kairiau")} onClick={() => act("nudge", "-0.25")}>◀</button>
          {state.aimHelp && <p>{touch ? L("Vilk pirštu – taikyk. Tada patrauk jėgos juostą ir paleisk.")
            : L("Spausk ar vilk ant stalo – taikyk. Laikyk tarpą arba patrauk jėgos juostą ir paleisk.")}</p>}
          <button className="bl-nudge" aria-label={L("Taikyti dešiniau")} onClick={() => act("nudge", "0.25")}>▶</button>
        </div>
        {!touch && state.aimHelp && <small className="bl-key-help">{L("← → – taikyti, tarpas – smūgis")}</small>}
      </>}
      {phase === "feedback" && <>
        <h2 className={shotOk ? "bl-correct" : undefined}>{shotOk ? L("Teisingai!") : (mapleHarbor ? "Tina paskelbė:" : L("Don Memas paskelbė:"))}</h2>
        {showCall && <Speech line={call} />}
      </>}
      {waitingForTina && (showCall ? <Speech line={call} /> : line && !call && <Speech line={line} />)}
      {(phase === "intro" || phase === "reply") && line && <Speech line={line} />}
      {phase === "reply" && <div className="bl-choices">
        {choices.map((choice) => <Choice key={choice.key} line={choice} />)}
        <button className="bl-replay" onClick={() => act("skip")}>{L("Baigti")}</button>
      </div>}
    </section>
    {phase === "result" && result && <ScoreCard title={scoreTitle} celebrate={result.winner === "learner"}
      ratio={(result.called + result.understood) / Math.max(1, result.shots + result.listens)}
      rows={[
        { label: L("Pataikyti paskelbti smūgiai"), value: <><ScoreNumber value={result.called} />/{result.shots}</> },
        { label: (mapleHarbor ? "Suprasti Tinos skelbimai" : L("Suprasti Don Memo skelbimai")), value: <><ScoreNumber value={result.understood} />/{result.listens}</> },
        { label: L("Įmušti tavo kamuoliai"), value: <><ScoreNumber value={result.sunk} />/4</> },
      ]}
      again={{ label: L("Dar vieną partiją"), run: () => act("again") }}
      done={{ label: L("Baigti"), run: () => game?.modeExit() }}>
      {line?.key === "bl_rematch" && <Speech line={line} />}
    </ScoreCard>}
  </div>;
}
