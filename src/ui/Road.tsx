import { ROAD_UI as words } from "../content/road";
import { speechSupported } from "../convo/speech";
import { game } from "../game/gameRef";
import { useRoad } from "../game/road/store";
import { Icon } from "./icons";
import { HL, L, TL } from "./i18n";
import { GlossLine } from "./kit/GlossLine";
import { GateLabels, WordGateHeader, WordGateResult } from "./kit/WordGates";
import "./road.css";

const act = (name: string, value?: string | boolean) => game?.modeAction("road", name, value);
const done = () => game?.modeExit();

function LiftLine() {
  const line = useRoad((s) => s.line);
  if (!line) return null;
  return <div className="road-lift-line" data-line={line.key}><GlossLine sentence={line.sentence} gloss /></div>;
}

function LiftOffer({ touch }: { touch: boolean }) {
  const choices = useRoad((s) => s.choices);
  const mic = useRoad((s) => s.mic);
  const micOn = useRoad((s) => s.micOn);
  const listening = mic.status === "starting" || mic.status === "listening";
  return <div className="road-lift">
    <LiftLine />
    {!!choices.length && <div className="road-choices">
      {speechSupported() && <div className="road-mic">
        <button className={`mic${listening ? " listening" : ""}`} type="button" aria-label={L(micOn && listening ? words.micOff : words.micOn)}
          onClick={() => act("mic", !(micOn && listening))}><Icon name="mic" size={23} /></button>
        {mic.heard && <span lang={TL}>{mic.heard}</span>}
      </div>}
      {choices.map(({ key, sentence }, i) => <button className="road-choice" type="button" data-line={key} key={key} onClick={() => act("choose", key)}>
        {!touch && <kbd>{i + 1}</kbd>}
        <span lang={TL}>{sentence.en}</span>
        <small lang={HL}>{sentence.nat}</small>
      </button>)}
    </div>}
  </div>;
}

function DriveOverlay({ touch }: { touch: boolean }) {
  const prompt = useRoad((s) => s.prompt);
  const anchors = useRoad((s) => s.anchors);
  const feedback = useRoad((s) => s.feedback);
  const remaining = useRoad((s) => s.remaining);
  const streak = useRoad((s) => s.streak);
  const ghost = useRoad((s) => s.ghost);
  const wind = useRoad((s) => s.wind);
  return <>
    {wind && <div className="drive-wind" aria-hidden />}
    <WordGateHeader words={words} {...{ prompt, feedback, remaining, streak }} showHint={remaining >= 147}
      home={done} replay={() => act("replay")}
      extraMeter={ghost && <span className="road-ghost">{L(words.ghost)}</span>}
      extraButton={!touch && <button className="road-icon" aria-label={L(words.horn)} title={L(words.horn)} onClick={() => act("horn")}><Icon name="horn" size={21} /></button>} />
    <GateLabels prompt={prompt} anchors={anchors} />
    {!touch && <div className="road-controls">{L(words.controls)}</div>}
  </>;
}

const scoreActions = { again: () => act("again"), done, guide: () => act("guide") };

export function RoadOverlay({ touch }: { touch: boolean }) {
  const phase = useRoad((s) => s.phase);
  const result = useRoad((s) => s.result);
  return <div className="road-overlay" lang={HL}>
    {phase === "lift" && <LiftOffer touch={touch} />}
    {phase === "drive" && <DriveOverlay touch={touch} />}
    {phase === "result" && result && <WordGateResult result={result} words={words} actions={scoreActions}><LiftLine /></WordGateResult>}
    {(phase === "loading" || phase === "unavailable") && <div className="road-lift road-loading">
      <strong>{L(phase === "loading" ? words.title : words.unavailable)}</strong>
      <button className="btn" onClick={done}>{L(words.town)}</button>
    </div>}
  </div>;
}
