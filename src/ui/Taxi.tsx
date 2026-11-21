import { useState } from "react";
import { TAXI_UI as words } from "../content/taxi";
import { speechSupported } from "../convo/speech";
import { game } from "../game/gameRef";
import { useTaxi } from "../game/taxi/store";
import { GlossLine } from "./kit/GlossLine";
import { ScoreCard } from "./kit/ScoreCard";
import { Icon } from "./icons";
import "./taxi.css";

const cash = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const act = (name: string, value?: string | boolean) => game?.modeAction("taxi", name, value);
const actionIcons = { left: "arrowLeft", right: "arrowRight", straight: "arrowUp", stop: "stop" } as const;

export function TaxiOverlay({ touch }: { touch: boolean }) {
  const { line, action, gloss, choices, mic, micOn, result } = useTaxi();
  const [revealed, setRevealed] = useState<typeof line>(null);
  if (result) return <ScoreCard title={words.title} score={`${result.points}/${result.max}`}
    rows={[
      { label: words.fare, value: cash(result.fare) },
      { label: words.tip, value: cash(result.tip) },
      { label: words.turns, value: `${result.first}/${result.total}` },
      { label: words.stop, value: result.onTarget ? words.atDoor : words.tooFar },
    ]}
    phrases={{ label: words.cards, count: result.cards }}
    again={{ label: words.again, run: () => act("again") }}
    done={{ label: words.done, run: () => game?.modeExit() }}
  />;

  const listening = mic.status === "starting" || mic.status === "listening";
  return (
    <div className="taxi-overlay">
      {line && (
        <div className="taxi-cue">
          {gloss || revealed === line
            ? <div className="taxi-line" data-line={line.key} lang="en"><GlossLine sentence={line.sentence} gloss={gloss} /></div>
            : <button className="taxi-line taxi-reveal" data-line={line.key} onClick={() => setRevealed(line)} lang="lt">
                <Icon name="speaker" size={20} /><span>{words.hear}<small>{words.show}</small></span>
              </button>}
          {action && <button key={action} type="button" lang="lt" className="taxi-action" data-action={action}
            onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); act("assist", true); }}
            onPointerUp={() => act("assist", false)} onPointerCancel={() => act("assist", false)}
            onLostPointerCapture={() => act("assist", false)}
            onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); e.stopPropagation(); act("assist", true); } }}
            onKeyUp={(e) => { if (e.key === " " || e.key === "Enter") act("assist", false); }}
            onBlur={() => act("assist", false)}
          >
            <Icon name={actionIcons[action]} className="taxi-action-icon" size={48} strokeWidth={2.5} />
            <span>{words.actions[action].label}</span>
            {!touch && <kbd>{words.actions[action].key}</kbd>}
          </button>}
        </div>
      )}
      {!!choices.length && (
        <div className="taxi-choices">
          <div className="taxi-turn" lang="lt">
            {speechSupported() && <button className={`mic${listening ? " listening" : ""}`} aria-label={micOn && listening ? words.micOff : words.micOn}
              onClick={() => act("mic", !(micOn && listening))}><Icon name="mic" size={24} /></button>}
            <div>
              <b>{mic.status === "unclear" ? words.retry : words.turn}</b>
              <small>{mic.heard ? <span lang="en">„{mic.heard}“</span> : listening ? words.listen : words.answer}</small>
            </div>
          </div>
          {choices.map(({ key, sentence }, i) => (
            <button className="taxi-choice" type="button" key={key} data-line={key} onClick={() => act("choose", key)}>
              {!touch && <kbd>{i + 1}</kbd>}
              <span lang="en">{sentence.en}</span>
              <small lang="lt">{sentence.nat}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
