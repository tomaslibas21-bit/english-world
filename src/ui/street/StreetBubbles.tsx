import type { CSSProperties } from "react";
import { useStreet } from "../../game/street/StreetLife";
import { GlossLine } from "../kit/GlossLine";
import "./street.css";

export function StreetBubbles() {
  const bubble = useStreet((s) => s.bubble);
  const marker = useStreet((s) => s.marker);
  return <>
    {marker && <span aria-hidden="true" className="street-marker" style={{ left: `${marker.x}%`, top: `${marker.y}%` }} />}
    {bubble?.anchor && <button type="button" key={bubble.key} className="street-bubble" data-chatter={bubble.id}
      style={{ "--street-x": `${bubble.anchor.x}%`, "--street-y": `${bubble.anchor.y}dvh` } as CSSProperties} aria-expanded={bubble.translated} onClick={bubble.translate}>
      <GlossLine sentence={bubble.line.sentence} gloss={false} compact />
      {bubble.translated && <small className="street-tr" lang="lt">{bubble.line.sentence.nat}</small>}
    </button>}
  </>;
}
