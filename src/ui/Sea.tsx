import { useCallback } from "react";
import { SEA_UI as words } from "../content/sea";
import { useStore } from "../state/store";
import { game } from "../game/gameRef";
import { showCrossingTitle, useSea, type CrossingTitle } from "../game/sea/store";
import { SEA_SECONDS } from "../game/sea/course";
import { HL, L } from "./i18n";
import { GateKaraoke, GateLabels, WordGateHeader, WordGateResult, WordGateStart } from "./kit/WordGates";
import "./sea.css";

const act = (name: string, value?: string) => game?.modeAction("sea", name, value);
const done = () => game?.modeExit();
const steer = (lane: number) => act("steer", String(lane));
const scoreActions = { again: () => act("again"), done, guide: () => act("guide") };

function SeaCrossingTitle({ crossing }: { crossing: CrossingTitle }) {
  const ref = useCallback((node: HTMLElement | null) => {
    crossing.node = node ?? undefined;
    showCrossingTitle(crossing, crossing.opacity);
  }, [crossing]);
  return <div ref={ref} className="sea-crossing-title" aria-hidden="true">{L(words.title)}</div>;
}

export function SeaOverlay({ touch }: { touch: boolean }) {
  const { phase, way, remaining, streak, prompt, sayIt, feedback, gateId, answeredLane, result, crossing } = useSea();
  const panel = useStore(state => state.hud.panel);
  if (panel && phase !== "guide") return null;
  const showHint = phase === "drive" && remaining >= SEA_SECONDS - 3;
  return <div className="sea-overlay" data-pad-tools={phase === "drive" || undefined} data-guiding={phase === "guide" || undefined} inert={phase === "guide"} lang={HL}>
    {phase === "briefing" && <WordGateStart way={way} start={(choice) => act("start", choice)} done={done} town={words.town} />}
    {(phase === "drive" || phase === "turn") && <>
      <WordGateHeader game="sea" words={words} {...{ prompt, sayIt, feedback, remaining, streak, showHint }} questionSlot={crossing && <SeaCrossingTitle crossing={crossing} />} home={done} replay={() => act("replay")} />
      {prompt && gateId !== undefined && <GateLabels key={gateId} mode="sea" prompt={prompt} gateId={gateId} steer={answeredLane === undefined ? steer : undefined} answeredLane={answeredLane} />}
      {way === "phrases" && phase === "drive" && <GateKaraoke mode="sea" />}
      {showHint && <p className="road-controls">{L(touch ? words.touchControls : words.controls)}</p>}
    </>}
    {(phase === "result" || phase === "guide") && result && <WordGateResult result={result} words={words} actions={scoreActions} />}
    {(phase === "loading" || phase === "unavailable") && <div className="sea-unavailable" data-pad-scope="choice">
      <strong>{L(phase === "loading" ? words.title : words.unavailable)}</strong>
      <button className="btn" data-pad-default data-pad-back onClick={done}>{L(words.town)}</button>
    </div>}
  </div>;
}
