import { useState } from "react";
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

export function TaxiOverlay({ touch }: { touch: boolean }) {
  const { line, action, gloss, choices, mic, micOn, result } = useTaxi();
  const [revealed, setRevealed] = useState<typeof line>(null);
  if (result) return <ScoreCard title={L("Kelionė baigta")} ratio={result.points / result.max}
    score={<><ScoreNumber value={result.points} />/{result.max}</>}
    rows={[
      { label: L("Posūkiai iš pirmo karto"), value: `${result.first}/${result.total}` },
      { label: L("Sklandus sustojimas prie durų"), value: `${Number(result.cleanStop)}/1` },
      { label: L("Kelionė be susidūrimų"), value: `${Number(result.crashes === 0)}/1` },
      { label: L("Kaina"), value: priceEn(result.fare) },
      { label: L("Arbatpinigiai"), value: priceEn(result.tip) },
      { label: L("Sustojote"), value: result.onTarget ? L("prie durų") : L("per toli") },
    ]}
    phrases={{ label: L("Frazių kortelės"), count: result.cards }}
    again={{ label: L("Dar kartą"), run: () => act("again") }}
    done={{ label: L("Baigti"), run: () => game?.modeExit() }}
  />;

  const listening = mic.status === "starting" || mic.status === "listening";
  return (
    <div className="taxi-overlay">
      {line && (
        <div className="taxi-cue">
          {gloss || revealed === line
            ? <div className="taxi-line" data-line={line.key} lang={TL}><GlossLine sentence={line.sentence} gloss={gloss} /></div>
            : <button className="taxi-line taxi-reveal" data-line={line.key} onClick={() => setRevealed(line)} lang={HL}>
                <Icon name="speaker" size={20} /><span>{L("Klausyk")}<small>{L("Rodyti tekstą")}</small></span>
              </button>}
          {action && <button key={action} type="button" lang={HL} className="taxi-action" data-action={action}
            onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); act("assist", true); }}
            onPointerUp={() => act("assist", false)} onPointerCancel={() => act("assist", false)}
            onLostPointerCapture={() => act("assist", false)}
            onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); e.stopPropagation(); act("assist", true); } }}
            onKeyUp={(e) => { if (e.key === " " || e.key === "Enter") act("assist", false); }}
            onBlur={() => act("assist", false)}
          >
            <Icon name={actionIcons[action]} className="taxi-action-icon" size={48} strokeWidth={2.5} />
            <span className="taxi-action-label">{actions[action].label().replace(/[←→↑]/g, "").trim()}</span>
            {!touch && <kbd>{actions[action].key}</kbd>}
          </button>}
        </div>
      )}
      {!!choices.length && (
        <div className="taxi-choices">
          <div className="taxi-turn" lang={HL}>
            {speechSupported() && <button className={`mic${listening ? " listening" : ""}`} aria-label={micOn && listening ? L("Išjungti mikrofoną") : L("Įjungti mikrofoną")}
              onClick={() => act("mic", !(micOn && listening))}><Icon name="mic" size={24} /></button>}
            <div>
              <b>{mic.status === "unclear" ? L("Pabandyk dar kartą") : L("Tavo eilė")}</b>
              <small>{mic.heard ? <span lang={TL}>{mic.heard}</span> : listening ? L("Pasakyk garsiai – klausau") : L("Pasirink atsakymą")}</small>
            </div>
          </div>
          {choices.map(({ key, sentence }, i) => (
            <button className="taxi-choice" type="button" key={key} data-line={key} onClick={() => act("choose", key)}>
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
