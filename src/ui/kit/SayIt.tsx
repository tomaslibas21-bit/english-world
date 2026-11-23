import { useEffect, useState, useSyncExternalStore } from "react";
import { SAY_IT_UI as words } from "../../content/say-it";
import { speechSupported } from "../../convo/speech";
import type { SayItCue } from "../../game/kit/sayIt";
import { Icon } from "../icons";
import "./sayIt.css";

const seenTips = new Set<string>();

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

function SayItButton({ game, cue }: { game: string; cue: SayItCue }) {
  const status = useSyncExternalStore(cue.subscribe, cue.getSnapshot);
  const [tip, setTip] = useState(false);
  useEffect(() => {
    if (!firstTip(game)) return;
    setTip(true);
    const timer = setTimeout(() => setTip(false), 3000);
    return () => clearTimeout(timer);
  }, [game]);
  const listening = status === "listening";
  const message = status === "hit" ? words.hit : status === "miss" ? words.miss : tip && !listening ? words.tip : null;
  return <span className="say-it" data-status={status}>
    <button type="button" className="say-it-mic" aria-label={listening ? words.micStop : words.mic}
      aria-pressed={listening} aria-disabled={cue.awarded} onClick={() => { setTip(false); cue.toggle(); }}>
      <Icon name="mic" size={19} />
      <Icon name="star" size={11} className="say-it-badge" />
      {status === "hit" && <Icon name="star" size={23} className="say-it-sparkle" />}
    </button>
    <span className="say-it-message" role="status">{message}</span>
  </span>;
}

export function SayIt({ game, cue }: { game: string; cue?: SayItCue | null }) {
  return speechSupported() && cue ? <SayItButton game={game} cue={cue} /> : null;
}
