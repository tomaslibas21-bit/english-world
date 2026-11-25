import { useEffect, useState, useSyncExternalStore } from "react";
import { SAY_IT_UI as words } from "../../content/say-it";
import { speechSupported } from "../../convo/speech";
import type { SayItCue } from "../../game/kit/sayIt";
import { L } from "../i18n";
import { Icon } from "../icons";
import "./sayIt.css";

const seenTips = new Set<string>();
const feedback = {
  hit: words.hit,
  miss: words.miss,
  denied: "Leisk naudoti mikrofoną",
  nothing: "Nieko negirdėjau",
  error: "Klausymas nepavyko",
};

type Feedback = { tip: string; miss: string };

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

function SayItButton({ game, cue, feedback: custom }: { game: string; cue: SayItCue; feedback?: Feedback }) {
  const status = useSyncExternalStore(cue.subscribe, cue.getSnapshot, cue.getSnapshot);
  const [tip, setTip] = useState(false);
  useEffect(() => {
    if (!firstTip(game)) return;
    setTip(true);
    const timer = setTimeout(() => setTip(false), 3000);
    return () => clearTimeout(timer);
  }, [game]);
  const listening = status === "listening";
  const awarded = cue.awarded;
  const credited = awarded && status !== "hit";
  const message = status === "idle" ? (tip ? custom?.tip ?? L(words.tip) : null) : listening ? null
    : status === "miss" ? custom?.miss ?? L(words.miss) : L(feedback[status]);
  return <span className="say-it" data-status={status}>
    <button type="button" className="say-it-mic" data-pad-aux aria-label={listening ? L(words.micStop) : L(words.mic)}
      aria-pressed={listening} aria-disabled={awarded} onClick={() => { setTip(false); cue.toggle(); }}>
      <Icon name={listening ? "stop" : credited ? "check" : "mic"} size={19} className="say-it-symbol" />
      {!listening && !credited && <Icon name="star" size={11} className="say-it-badge" />}
      {status === "hit" && <Icon name="star" size={23} className="say-it-sparkle" />}
    </button>
    <span className="say-it-message" role="status">{message}</span>
  </span>;
}

export function SayIt({ game, cue, feedback }: { game: string; cue?: SayItCue | null; feedback?: Feedback }) {
  return speechSupported() && cue ? <SayItButton game={game} cue={cue} feedback={feedback} /> : null;
}
