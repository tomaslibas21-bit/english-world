import { useMemo } from "react";
import { ROAD_EDITION, ROAD_UI as words } from "../content/road";
import { speechSupported } from "../convo/speech";
import { game } from "../game/gameRef";
import { phraseEntries } from "../game/kit/phrases";
import { useRoad } from "../game/road/store";
import { Icon } from "./icons";
import { HL, L, TL } from "./i18n";
import { GlossLine } from "./kit/GlossLine";
import { PhraseChooser } from "./kit/PhraseChooser";
import { PhraseSave } from "./kit/PhraseSave";
import { GateKaraoke, GateLabels, WordGateHeader, WordGateResult, WordGateStart } from "./kit/WordGates";
import "./road.css";

const act = (name: string, value?: string | boolean) => game?.modeAction("road", name, value);
const done = () => game?.modeExit();
const liftSource = { situationId: ROAD_EDITION.driver.situation };

function LiftLine() {
  const line = useRoad((s) => s.line);
  if (!line) return null;
  return <div className="road-lift-line phrase-save-row" data-line={line.key}><GlossLine sentence={line.sentence} gloss source={liftSource} /><PhraseSave sentence={line.sentence} {...liftSource} /></div>;
}

function LiftOffer({ touch }: { touch: boolean }) {
  const choices = useRoad((s) => s.choices);
  const mic = useRoad((s) => s.mic);
  const micOn = useRoad((s) => s.micOn);
  const entries = useMemo(() => phraseEntries(liftSource.situationId, choices), [choices]);
  const listening = mic.status === "starting" || mic.status === "listening";
  return <div className="road-lift">
    <LiftLine />
    {!!choices.length && <div className="road-choices">
      <PhraseChooser entries={entries} targetOnly={false} />
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
  const sayIt = useRoad((s) => s.sayIt);
  const gateId = useRoad((s) => s.gateId);
  const stampedLane = useRoad((s) => s.stampedLane);
  const feedback = useRoad((s) => s.feedback);
  const remaining = useRoad((s) => s.remaining);
  const streak = useRoad((s) => s.streak);
  const ghost = useRoad((s) => s.ghost);
  const wind = useRoad((s) => s.wind);
  const way = useRoad((s) => s.way);
  return <>
    {wind && <div className="drive-wind" aria-hidden />}
    <WordGateHeader game="road" words={words} {...{ prompt, sayIt, feedback, remaining, streak }} showHint={remaining >= 147}
      home={done} replay={() => act("replay")}
      extraMeter={ghost && <span className="road-ghost">{L(words.ghost)}</span>}
      extraButton={!touch && <button className="road-icon" aria-label={L(words.horn)} title={L(words.horn)} onClick={() => act("horn")}><Icon name="horn" size={21} /></button>} />
    {prompt && gateId !== undefined && <GateLabels key={gateId} mode="road" prompt={prompt} gateId={gateId} stampedLane={stampedLane} />}
    {way === "phrases" && <GateKaraoke mode="road" wrong={words.wrong} />}
    {!touch && <div className="road-controls">{L(words.controls)}</div>}
  </>;
}

const scoreActions = { again: () => act("again"), done, guide: () => act("guide") };

export function RoadOverlay({ touch }: { touch: boolean }) {
  const phase = useRoad((s) => s.phase);
  const result = useRoad((s) => s.result);
  const way = useRoad((s) => s.way);
  return <div className="road-overlay" lang={HL}>
    {phase === "briefing" && <WordGateStart way={way} start={(choice) => act("start", choice)} done={done} town={words.town} />}
    {phase === "lift" && <LiftOffer touch={touch} />}
    {phase === "drive" && <DriveOverlay touch={touch} />}
    {phase === "result" && result && <WordGateResult result={result} words={words} actions={scoreActions}><LiftLine /></WordGateResult>}
    {(phase === "loading" || phase === "unavailable") && <div className="road-lift road-loading">
      <strong>{L(phase === "loading" ? words.title : words.unavailable)}</strong>
      <button className="btn" onClick={done}>{L(words.town)}</button>
    </div>}
  </div>;
}
