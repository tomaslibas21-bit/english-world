import { useRef, useState, type PointerEvent } from "react";
import { priceEn } from "../convo/target";
import { HL, L, TL } from "./i18n";
import { speechSupported } from "../convo/speech";
import { game } from "../game/gameRef";
import { useTaxi } from "../game/taxi/store";
import { GlossLine } from "./kit/GlossLine";
import { ScoreCard, ScoreNumber } from "./kit/ScoreCard";
import { Icon } from "./icons";
import "./taxi.css";

const act = (name: string, value?: string | boolean) => game?.modeAction("taxi", name, value);
const actions = {
  left: { label: () => L("← Sukite kairėn"), key: "←" },
  right: { label: () => L("Sukite dešinėn →"), key: "→" },
  straight: { label: () => L("↑ Važiuokite tiesiai"), key: "↑" },
  stop: { label: () => L("Sustokite čia"), key: L("Tarpas") },
};
const actionIcons = { left: "arrowLeft", right: "arrowRight", straight: "arrowUp", stop: "stop" } as const;
const assistKey = (key: string) => key === " " ? "assist-space" : key === "Enter" ? "assist-enter" : null;

export function TaxiOverlay({ touch }: { touch: boolean }) {
  const { line, action, gloss, choices, mic, micOn, result } = useTaxi();
  const [revealed, setRevealed] = useState<typeof line>(null);
  const pointer = useRef<{ button: HTMLButtonElement; id: number } | null>(null);
  const release = (event: PointerEvent<HTMLButtonElement>) => {
    if (pointer.current?.button !== event.currentTarget || pointer.current.id !== event.pointerId) return;
    pointer.current = null;
    act("assist", false);
  };
  if (result) return <ScoreCard title={L("Kelionė baigta")} ratio={result.points / result.max}
    score={<><ScoreNumber value={result.points} />/{result.max}</>}
    rows={[
      { label: L("Kaina"), value: priceEn(result.fare) },
      { label: L("Arbatpinigiai"), value: priceEn(result.tip) },
      { label: L("Posūkiai iš pirmo karto"), value: `${result.first}/${result.total}` },
      { label: L("Sustojote"), value: result.onTarget ? L("prie durų") : L("per toli") },
    ]}
    phrases={{ label: L("Frazių kortelės"), count: result.cards }}
    again={{ label: L("Dar kartą"), run: () => act("again") }}
    done={{ label: L("Baigti"), run: () => game?.modeExit() }}
  />;

  const listening = mic.status === "starting" || mic.status === "listening";
  return (
    <div className="taxi-overlay" data-pad-tools data-pad-phase={line?.key}>
      {line && (
        <div className="taxi-cue">
          {gloss || revealed === line
            ? <div className="taxi-line" data-line={line.key} lang={TL}><GlossLine sentence={line.sentence} gloss={gloss} /></div>
            : <button className="taxi-line taxi-reveal" data-pad-aux data-line={line.key} onClick={() => setRevealed(line)} lang={HL}>
                <Icon name="speaker" size={20} /><span>{L("Klausyk")}<small>{L("Rodyti tekstą")}</small></span>
              </button>}
          {action && <button key={action} type="button" lang={HL} className="taxi-action" data-action={action}
            onPointerDown={(e) => {
              e.preventDefault();
              if (pointer.current?.button === e.currentTarget && e.currentTarget.hasPointerCapture(pointer.current.id)) return;
              pointer.current = { button: e.currentTarget, id: e.pointerId };
              e.currentTarget.setPointerCapture(e.pointerId);
              act("assist", true);
            }}
            onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}
            onKeyDown={(e) => {
              const source = assistKey(e.key);
              if (!source) return;
              e.preventDefault();
              e.stopPropagation();
              if (!e.repeat) act(source, true);
            }}
            onKeyUp={(e) => { const source = assistKey(e.key); if (source) act(source, false); }}
            onBlur={() => { pointer.current = null; act("assist-blur"); }}
          >
            <Icon name={actionIcons[action]} className="taxi-action-icon" size={48} strokeWidth={2.5} />
            <span className="taxi-action-label">{actions[action].label().replace(/[←→↑]/g, "").trim()}</span>
            {!touch && <kbd>{actions[action].key}</kbd>}
          </button>}
        </div>
      )}
      {!!choices.length && (
        <div className="taxi-choices" data-pad-scope="choice" data-pad-menu>
          <div className="taxi-turn" lang={HL}>
            {speechSupported() && <button className={`mic${listening ? " listening" : ""}`} aria-label={micOn && listening ? L("Išjungti mikrofoną") : L("Įjungti mikrofoną")}
              onClick={() => act("mic", !(micOn && listening))}><Icon name="mic" size={24} /></button>}
            <div>
              <b>{mic.status === "unclear" ? L("Pabandyk dar kartą") : L("Tavo eilė")}</b>
              <small>{mic.heard ? <span lang={TL}>{mic.heard}</span> : listening ? L("Pasakyk garsiai – klausau") : L("Pasirink atsakymą")}</small>
            </div>
          </div>
          {choices.map(({ key, sentence }, i) => (
            <button className="taxi-choice" type="button" key={key} data-line={key} data-pad-answer={key} onClick={() => act("choose", key)}>
              {!touch && <kbd>{i + 1}</kbd>}
              <span lang={TL}>{sentence.en}</span>
              <small lang={HL}>{sentence.nat}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
