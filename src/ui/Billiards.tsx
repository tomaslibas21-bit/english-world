import { memo, useRef, type CSSProperties, type PointerEvent } from "react";
import { game } from "../game/gameRef";
import { useBilliards, type RackBall } from "../game/billiards/store";
import { ballColor } from "../game/billiards/table";
import type { KitLine } from "../game/kit/dialogue";
import { Icon } from "./icons";
import { FeedbackBadge } from "./kit/FeedbackBadge";
import { GlossLine } from "./kit/GlossLine";
import { SayIt } from "./kit/SayIt";
import { ScoreCard, ScoreNumber } from "./kit/ScoreCard";
import "./billiards.css";

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

function CallLabel({ mic }: { mic?: string }) {
  return <span className="bl-confirm-label" data-mic={mic}><Icon name="mic" size={15} />Pasakyk arba bakstelėk:</span>;
}

const CallReservation = memo(function CallReservation({ options }: { options: KitLine[] }) {
  return <div className="bl-confirm-measure" aria-hidden="true" inert>
    <CallLabel />
    <div className="bl-confirm-sizer">
      {options.map(({ key, sentence }) => <GlossLine key={key} sentence={sentence} gloss compact />)}
    </div>
  </div>;
});

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
    <span>Jėga</span>
    <button className="bl-power-track" aria-label="Jėga" style={{ "--bl-power": power } as CSSProperties}
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
  const { phase, side, line, choices, selection, pockets, available, call, sayIt, reveal, correct, result } = state;
  const aiming = phase === "aim" || phase === "break";
  const picking = phase === "call" || phase === "listen";
  const waitingForTina = side === "tina" && phase === "tina";
  const showCall = !!call && (phase === "feedback" || (phase === "listen" || waitingForTina) && reveal);
  const shotOk = phase === "feedback" && correct;
  const scoreTitle = result?.winner === "learner" ? "Laimėjai!" : result?.winner === "tina" ? "Laimėjo Tina" : "Lygiosios";
  return <div className="billiards" data-phase={phase} lang="lt">
    <header className="bl-header">
      <section className="bl-status">
        <div className="bl-turn" aria-live="polite"><i />{side === "learner" ? "Tavo eilė" : "Tinos eilė"}</div>
        <div className="bl-rack">
          <BallRow name="Tu" balls={state.balls.learner} active={side === "learner"} />
          <BallRow name="Tina" balls={state.balls.tina} active={side === "tina"} />
        </div>
      </section>
      <button className="bl-exit" onClick={() => game?.modeExit()}><Icon name="close" size={15} />Baigti partiją</button>
    </header>
    <div className="bl-stage">
      <TablePad aiming={aiming} usable={picking || aiming} />
      {aiming && <PowerBar power={state.power} />}
    </div>
    <section className="bl-panel" aria-live={picking ? "off" : "polite"}>
      {phase === "group" && <>
        <h2>Vienspalviai ar dryžuoti?</h2>
        <div className="bl-choices">{choices.map((choice) => <Choice key={choice.key} line={choice} />)}</div>
      </>}
      {picking && <>
        <div className="bl-instruction">
          <h2>{phase === "listen" ? "Ką paskelbė Tina? Pasirink kamuolį ir kišenę." : "Paskelbk smūgį: pasirink kamuolį ir kišenę."}</h2>
          {phase === "listen" && <div className="bl-listen-actions"><button className="bl-replay" disabled={state.replaying} onClick={() => act("replay")}>
            <Icon name="speaker" size={15} />Klausyti dar kartą
          </button><SayIt game="billiards" cue={state.replaying ? null : sayIt} /></div>}
        </div>
        {showCall && <Speech line={call} />}
        <div className="bl-chip-heading">Kamuolys</div>
        <div className="bl-ball-chips" role="group" aria-label="Kamuolys">
          {[...available].sort((a, b) => a - b).map((id) => <button key={id} className="bl-ball-option" data-ball={id} aria-pressed={id === selection.ball}
            disabled={state.replaying} onClick={() => act("ball", String(id))}><BallBadge id={id} down={false} /></button>)}
        </div>
        <div className="bl-chip-heading">Kišenė</div>
        <div className="bl-pocket-chips" role="group" aria-label="Kišenė">
          {pockets.map(({ id, line }) => <button key={id} data-pocket={id} className="bl-choice" aria-pressed={id === selection.pocket}
            disabled={state.replaying} onClick={() => act("pocket", id)}>
            <GlossLine sentence={{ ...line.sentence, en: line.sentence.en.replace(/\.$/, ""),
              nat: line.sentence.nat.replace(/\.$/, "") }} gloss compact />
          </button>)}
        </div>
        {phase === "call" && <div className="bl-confirm-row">
          <CallReservation options={state.callOptions} />
          {call && <button className="bl-confirm" onClick={() => act("confirm")}>
            <CallLabel mic={state.mic.status} />
            <GlossLine sentence={call.sentence} gloss compact />
          </button>}
        </div>}
      </>}
      {aiming && <>
        {phase === "break" ? <h2>Pradinis smūgis – skelbti nereikia.</h2> : call && <Speech line={call} />}
        <div className="bl-aim">
          <button className="bl-nudge" aria-label="Taikyti kairiau" onClick={() => act("nudge", "-0.25")}>◀</button>
          {state.aimHelp && <p>{touch ? "Vilk pirštu – taikyk. Tada patrauk jėgos juostą ir paleisk."
            : "Spausk ar vilk ant stalo – taikyk. Laikyk tarpą arba patrauk jėgos juostą ir paleisk."}</p>}
          <button className="bl-nudge" aria-label="Taikyti dešiniau" onClick={() => act("nudge", "0.25")}>▶</button>
        </div>
        {!touch && state.aimHelp && <small className="bl-key-help">← → – taikyti, tarpas – smūgis</small>}
      </>}
      {phase === "feedback" && <>
        <h2><FeedbackBadge correct={!!shotOk}>{shotOk ? "Teisingai!" : "Tina paskelbė:"}</FeedbackBadge></h2>
        {showCall && <Speech line={call} />}
      </>}
      {waitingForTina && (showCall ? <Speech line={call} /> : line && !call && <Speech line={line} />)}
      {(phase === "intro" || phase === "reply") && line && <Speech line={line} />}
      {phase === "reply" && <div className="bl-choices">
        {choices.map((choice) => <Choice key={choice.key} line={choice} />)}
        <button className="bl-replay" onClick={() => act("skip")}>Baigti</button>
      </div>}
    </section>
    {phase === "result" && result && <ScoreCard title={scoreTitle} celebrate={result.winner === "learner"} said={result.said}
      ratio={(result.called + result.understood) / Math.max(1, result.shots + result.listens)}
      rows={[
        { label: "Pataikyti paskelbti smūgiai", value: <><ScoreNumber value={result.called} />/{result.shots}</> },
        { label: "Suprasti Tinos skelbimai", value: <><ScoreNumber value={result.understood} />/{result.listens}</> },
        { label: "Įmušti tavo kamuoliai", value: <><ScoreNumber value={result.sunk} />/4</> },
      ]}
      again={{ label: "Dar vieną partiją", run: () => act("again") }}
      done={{ label: "Baigti", run: () => game?.modeExit() }}>
      {line?.key === "bl_rematch" && <Speech line={line} />}
    </ScoreCard>}
  </div>;
}
