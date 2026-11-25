import { useEffect, useState, useSyncExternalStore } from "react";
import { MIC_FEEDBACK } from "../../content/microphone";
import { SAY_IT_UI as words } from "../../content/say-it";
import { speechSupported } from "../../convo/speech";
import type { SayItCue } from "../../game/kit/sayIt";
import { Icon } from "../icons";
import "./sayIt.css";

const seenTips = new Set<string>();
const feedback = { ...MIC_FEEDBACK, hit: words.hit, miss: words.miss };

type SayItMessages = { tip: string; miss: string };

function firstTip(game: string) {
  if (seenTips.has(game)) return false;
  seenTips.add(game);
  try {
    const key = `ew-say-it-tip:${game}`;
    if (localStorage.getItem(key)) return false;
    localStorage.setItem(key, "1");
  } catch { /* storage may be unavailable */ }
  return true;
}

function SayItButton({ game, cue, messages }: { game: string; cue: SayItCue; messages: SayItMessages }) {
  const status = useSyncExternalStore(cue.subscribe, cue.getSnapshot, cue.getSnapshot);
  const [tip, setTip] = useState(false);
  useEffect(() => {
    if (!firstTip(game)) return;
    setTip(true);
    const timer = setTimeout(() => setTip(false), 3000);
    return () => clearTimeout(timer);
  }, [game]);
  const listening = status === "listening";
  const awarded = status === "hit" || status === "credited";
  const message = status === "idle" || listening ? (tip ? messages.tip : null)
    : status === "credited" ? null : status === "miss" ? messages.miss : feedback[status];
  return <span className="say-it" data-status={status}>
    <button type="button" className="say-it-mic" aria-label={listening ? words.micStop : words.mic}
      aria-pressed={listening} aria-disabled={awarded} onClick={cue.toggle}>
      <Icon name={listening ? "stop" : awarded ? "check" : "mic"} size={19} />
      <Icon name="star" size={11} className="say-it-badge" />
      {status === "hit" && <Icon name="star" size={23} className="say-it-sparkle" />}
    </button>
    <span className="say-it-message" role="status">{message}</span>
  </span>;
}

export function SayIt({ game, cue, messages = words }: { game: string; cue?: SayItCue | null; messages?: SayItMessages }) {
  return speechSupported() && cue ? <SayItButton game={game} cue={cue} messages={messages} /> : null;
}
