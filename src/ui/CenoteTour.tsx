import { useState } from "react";
import { speechSupported } from "../convo/speech";
import { useCenoteTour } from "../game/cenoteTour/store";
import { game } from "../game/gameRef";
import { HL, L, TL } from "./i18n";
import { Icon } from "./icons";
import { GlossLine } from "./kit/GlossLine";
import "./cenoteTour.css";

const act = (name: string, value: string | boolean) => game?.modeAction("cenote-tour", name, value);

export default function CenoteTour({ touch }: { touch: boolean }) {
  const { line, choices, mic, micOn, answer } = useCenoteTour();
  const [natural, setNatural] = useState(false);
  if (!line) return null;
  const listening = mic.status === "starting" || mic.status === "listening";
  return (
    <section className="cenote-tour-card" onKeyDown={(event) => {
      if (event.key === "Enter" || event.key === " ") event.stopPropagation();
    }}>
      <div className="cenote-tour-heading">
        <b data-speaker="ines" lang={TL}>Inés</b>
        <div>
          <button type="button" title={L("Natūralus vertimas")} aria-label={L("Natūralus vertimas")} aria-pressed={natural}
            data-action="natural" onClick={() => setNatural(!natural)}><Icon name="bookOpen" size={20} /></button>
          {!!choices.length && speechSupported() && <button type="button" data-action="mic" data-listening={listening}
            aria-label={listening ? L("Išjungti mikrofoną") : L("Įjungti mikrofoną")} aria-pressed={listening}
            onClick={() => act("mic", !listening || !micOn)}><Icon name="mic" size={20} /></button>}
        </div>
      </div>
      <div data-line={line.key} data-speaker="ines" className="cenote-tour-line" aria-live="polite">
        <GlossLine sentence={line.sentence} compact={natural} gloss interactive={false} />
      </div>
      {answer && <div data-line={answer.key} data-speaker="learner" className="cenote-tour-answer">
        <GlossLine sentence={answer.sentence} compact={natural} gloss interactive={false} />
      </div>}
      {!!choices.length && <div className="cenote-tour-choices">
        {choices.map(({ key, sentence }, i) => <button type="button" key={key} data-action="choose" data-line={key}
          onClick={() => act("choose", key)}>
          {!touch && <kbd>{i + 1}</kbd>}
          <span><GlossLine sentence={sentence} compact gloss /></span>
        </button>)}
      </div>}
      {mic.status === "unclear" && !!choices.length && <small role="status" lang={HL}>{L("Pabandyk dar kartą")} {mic.heard && <span lang={TL}>{mic.heard}</span>}</small>}
    </section>
  );
}
