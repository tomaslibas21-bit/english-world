import { useLayoutEffect, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import { game } from "../../game/gameRef";
import { useStreet } from "../../game/street/StreetLife";
import { STREET_WORDS } from "../../game/street/words";
import { HL } from "../i18n";
import { GlossLine } from "../kit/GlossLine";
import { PhraseSave } from "../kit/PhraseSave";
import { createChatterLayout } from "./chatterLayout";
import "./street.css";

export default function StreetBubbles() {
  const [key, id, line, translated, translate] = useStreet(useShallow(({ bubble }) =>
    [bubble?.key, bubble?.id, bubble?.line, bubble?.translated, bubble?.translate] as const));
  const bubbleRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const group = bubbleRef.current, hud = group?.parentElement;
    if (!group || !hud) return;
    return game?.watchNametagLayout?.((layer) => createChatterLayout(group, hud, layer, () => {
      const bubble = useStreet.getState().bubble;
      return bubble && bubble.key === key ? bubble.anchor : null;
    }));
  }, [key]);

  return line ? (
    <div ref={bubbleRef} key={key} role="group" className="street-bubble phrase-save-row" data-chatter={id} aria-expanded={translated}>
      <button type="button" className="street-bubble-text" data-pad-tool="street-bubble" aria-expanded={translated} onClick={translate}>
        <span className="street-bubble-copy">
          <GlossLine sentence={line.sentence} gloss={false} compact />
          {translated && <small className="street-tr" lang={HL}>{line.sentence.nat}</small>}
        </span>
      </button>
      <PhraseSave sentence={line.sentence} situationId="street" sourceLabel={STREET_WORDS.overheard} />
    </div>
  ) : null;
}
