import { SEA_UI as words } from "../content/sea";
import { game } from "../game/gameRef";
import { useSea } from "../game/sea/store";
import { SEA_SECONDS } from "../game/sea/course";
import { GateLabels, WordGateHeader, WordGateResult } from "./kit/WordGates";
import "./sea.css";

const act = (name: string, value?: string) => game?.modeAction("sea", name, value);
const done = () => game?.modeExit();
const steer = (lane: number) => act("steer", String(lane));
const scoreActions = { again: () => act("again"), done, guide: () => act("guide") };

export function SeaOverlay({ touch }: { touch: boolean }) {
  const { phase, remaining, streak, prompt, sayIt, feedback, anchors, wideLabels, result } = useSea();
  const showHint = phase === "drive" && remaining >= SEA_SECONDS - 3;
  return <div className="sea-overlay" lang="lt">
    {(phase === "drive" || phase === "turn") && <>
      <WordGateHeader game="sea" words={words} {...{ prompt, sayIt, feedback, remaining, streak, showHint }} home={done} replay={() => act("replay")} />
      <GateLabels prompt={prompt} anchors={anchors} steer={feedback ? undefined : steer} preferSingleLine={wideLabels} />
      {showHint && <p className="road-controls">{touch ? words.touchControls : words.controls}</p>}
    </>}
    {phase === "result" && result && <WordGateResult result={result} words={words} actions={scoreActions} />}
    {phase === "unavailable" && <div className="sea-unavailable">
      <strong>{words.unavailable}</strong>
      <button className="btn" onClick={done}>{words.town}</button>
    </div>}
  </div>;
}
