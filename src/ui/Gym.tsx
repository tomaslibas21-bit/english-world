import { useLayoutEffect, useRef, type KeyboardEvent, type SyntheticEvent } from "react";
import { GYM_MOVE_LABELS, GYM_SAY_IT_MESSAGES, GYM_UI as words, learnerLang, type GyMoveId } from "../content/gym";
import { game } from "../game/gameRef";
import { GYM_KEYS } from "../game/gym/round";
import { useGym, type GymView } from "../game/gym/store";
import { Icon } from "./icons";
import { Interlinear } from "./Interlinear";
import { FeedbackBadge } from "./kit/FeedbackBadge";
import { GlossLine } from "./kit/GlossLine";
import { SayIt } from "./kit/SayIt";
import { ScoreCard } from "./kit/ScoreCard";
import "./gym.css";

const act = (action: string, move?: GyMoveId) => game?.modeAction("gym", action, move);
const stop = (event: SyntheticEvent) => event.stopPropagation();

function keepButtonKeys(event: KeyboardEvent<HTMLElement>) {
  if ((event.key === "Enter" || event.key === " ") && event.target instanceof HTMLButtonElement) {
    event.stopPropagation();
    if (event.repeat) event.preventDefault();
  }
}

const figures: Record<GyMoveId, { head: [number, number]; limbs: string; marks?: string }> = {
  jacks: { head: [24, 12], limbs: "M24 18v12M10 6l7 11 7 4 7-4 7-11M24 30 13 42H9m15-12 11 12h4" },
  toes: { head: [34, 25], limbs: "M28 23l-10-5-4 14 3 10h5m-4-24 3 14 2 10h6m0-20-1 11-3 7m5-16 3 10-3 7" },
  squats: { head: [26, 12], limbs: "m24 18-7 10 14 1-4 13h7m-17-14 9 5-7 9h5m-2-23 9 1 10-1m-18 3 8 2 9-1" },
  circles: { head: [24, 12], limbs: "M24 18v13m0-10-14 2m14-2 14 2M24 31l-5 11h-4m9-11 5 11h4", marks: "M10 17a6 6 0 0 0-2 11m30-11a6 6 0 0 1 2 11" },
  run: { head: [29, 9], limbs: "m26 15-6 13 13-4 5 9m-18-5-5 10-7-2m17-19 7 3 4-5m-12 3-9 5-4-4", marks: "M6 11h9m-11 5h5" },
  reach: { head: [24, 17], limbs: "M24 23v10m0-8-5-4-2-15m7 19 5-4 2-15m-7 27-3 10h-3m6-10 3 10h3" },
  lunges: { head: [22, 10], limbs: "m22 16-1 10 14 1 1 14h6M21 26l-6 12-9 2-2 3m18-25 4 6-4 3m-1-9-4 6 3 3" },
  pushups: { head: [39, 19], limbs: "m33 22-12 4-12 6-2 6m14-12-12 3-4 6m28-13 4 6-5 10h5m-7-14 2 6-5 8h4", marks: "M5 42h36" },
};

function MoveGlyph({ move }: { move: GyMoveId }) {
  const { head, limbs, marks } = figures[move];
  return <svg className="gym-glyph" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.6"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <circle cx={head[0]} cy={head[1]} r="3.5" />
    <path d={limbs} />
    {marks && <path className="gym-motion-mark" d={marks} />}
  </svg>;
}

function GymRoundView({ view, touch }: { view: GymView; touch: boolean }) {
  const viewport = useRef<HTMLDivElement>(null);
  const header = useRef<HTMLElement>(null);
  const dock = useRef<HTMLDivElement>(null);
  const { phase, caption, line, feedback, picked, highlight, index, total, options, observeFrame } = view;
  useLayoutEffect(() => {
    if (viewport.current) return observeFrame(viewport.current, header.current, dock.current);
  }, [observeFrame]);

  const call = options.length > 0;
  const choose = phase === "choose";
  return (
    <div className="gym-overlay" ref={viewport} data-phase={phase} data-touch={touch || undefined} lang={learnerLang}
      onPointerDown={stop} onPointerUp={stop} onClick={stop} onKeyDown={keepButtonKeys}>
      <header className="gym-header" ref={header}>
        {phase !== "score" && <div className="gym-header-bar">
          {call && <strong className="gym-progress gym-paper">{words.progress(index, total)}</strong>}
          <button className="gym-exit gym-paper" type="button" data-gym-action="exit" onClick={() => act("exit")}>{words.exit}</button>
        </div>}
        <div className="gym-cue-lane" data-call={call || undefined} aria-live="polite">
          {caption && <div className="gym-cue gym-paper" data-line={caption.line.key} data-gym-target={caption.line.sentence.en}
            data-gym-gloss={caption.detail === "full" ? caption.line.sentence.nat : undefined}>
            {view.revealed ? <Interlinear s={caption.line.sentence} lt ipa={false} nat />
              : <GlossLine sentence={caption.line.sentence} gloss={caption.detail === "full"} />}
          </div>}
          {line && <div className="gym-cue" data-line={line.key}>
            {feedback ? <FeedbackBadge correct={feedback === "right"}><GlossLine sentence={line.sentence} compact gloss /></FeedbackBadge>
              : <div className="gym-paper gym-opening-line"><GlossLine sentence={line.sentence} gloss /></div>}
          </div>}
        </div>
      </header>

      <div className="gym-bottom" ref={dock}>
        {phase === "ready" && <section className="gym-ready gym-paper">
          <h2>{words.readyTitle}</h2>
          <p>{touch ? words.readyTouch : words.readyKeys}</p>
          <button className="btn" type="button" data-gym-action="start" onClick={() => act("start")}>{words.start}</button>
        </section>}
        {call && <div className="gym-dock gym-paper">
          <div className="gym-choices" role="group" aria-label={words.choices}>
            {options.map((move, slot) => {
              const [number, arrow, glyph] = GYM_KEYS[slot];
              return <button key={slot} type="button" aria-label={GYM_MOVE_LABELS[move]} aria-keyshortcuts={`${number} ${arrow}`}
                data-slot={number} data-move={move} data-hint={highlight === move || undefined}
                data-result={picked === move ? feedback : undefined} disabled={!choose} onClick={() => act("pick", move)}>
                <MoveGlyph move={move} />
                <kbd className="gym-keys" aria-hidden="true">{number} / {glyph}</kbd>
              </button>;
            })}
          </div>
          <div className="gym-actions">
            <button type="button" data-gym-action="replay" disabled={!choose} onClick={() => act("replay")}>
              <Icon name="speaker" size={17} /> {words.replay}
            </button>
            <button type="button" data-gym-action="reveal" aria-pressed={view.revealed}
              disabled={view.revealed || (!choose && phase !== "listen")} onClick={() => act("reveal")}>
              {words.reveal}
            </button>
            <div className="gym-mic"><SayIt game="gym" cue={view.sayIt} messages={GYM_SAY_IT_MESSAGES} /></div>
          </div>
        </div>}
        {phase === "score" && <div className="gym-result">
          <ScoreCard title={words.scoreTitle} ratio={view.ratio} said={view.score.said} rows={[
            { label: words.completed, value: `${view.score.completed}/${total}` },
            { label: words.firstTry, value: `${view.score.firstTry}/${total}` },
          ]} again={{ label: words.again, run: () => act("again") }} done={{ label: words.done, run: () => act("done") }} />
        </div>}
      </div>
    </div>
  );
}

export default function GymOverlay({ touch }: { touch: boolean }) {
  const view = useGym((state) => state.view);
  return view && <GymRoundView view={view} touch={touch} />;
}
