import { useLayoutEffect, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import { useStreet } from "../../game/street/StreetLife";
import { STREET_WORDS as words } from "../../game/street/words";
import { GlossLine } from "../kit/GlossLine";
import { PhraseSave } from "../kit/PhraseSave";
import { placeBubble } from "./bubblePlacement";
import "./street.css";

const HUD_BLOCKERS = ".objective-card, .phone-ring, .street-card, .directions-card, .photo-chip, .minimap, " +
  ".toolbar, .toolbar.menu-open .toolbar-drawer, .toolbar.menu-open .toolbar-tools, .toolbar .radio-tool, " +
  ".joy, .jump-btn, .act-btn, .prompt, .nametag:not([style*='display: none'])";

export function StreetBubbles() {
  const [key, id, line, translated, translate] = useStreet(useShallow(({ bubble }) =>
    [bubble?.key, bubble?.id, bubble?.line, bubble?.translated, bubble?.translate] as const));
  const marker = useStreet((s) => s.marker);
  const bubbleRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const group = bubbleRef.current, hud = group?.parentElement;
    if (!group || !hud) return;
    let frame: number;
    const update = () => {
      const bubble = useStreet.getState().bubble;
      const anchor = bubble && bubble.key === key ? bubble.anchor : null;
      let placement;
      if (anchor) {
        const screen = hud.getBoundingClientRect();
        const { width, height } = group.getBoundingClientRect();
        const blockers = [];
        for (const el of document.querySelectorAll(HUD_BLOCKERS)) {
          const rect = el.getBoundingClientRect();
          if (!rect.width || !rect.height || getComputedStyle(el).visibility !== "visible") continue;
          blockers.push({ left: rect.left - screen.left, right: rect.right - screen.left,
            top: rect.top - screen.top, bottom: rect.bottom - screen.top });
        }
        const head = { x: anchor.x * screen.width / 100, y: anchor.y * screen.height / 100 };
        if (width && height) placement = placeBubble(head, width, height, screen.width, screen.height, blockers);
      }
      if (placement) {
        const { x, y, tail } = placement;
        group.style.transform = `translate(${x}px, ${y}px)`;
        group.style.setProperty("--street-tail-x", `${tail.x}px`);
        group.style.setProperty("--street-tail-y", `${tail.y}px`);
        group.style.setProperty("--street-tail-angle", `${tail.angle}deg`);
      } else group.style.removeProperty("transform");
      group.style.visibility = placement ? "visible" : "hidden";
      frame = requestAnimationFrame(update);
    };
    // Measure before showing a new line or translation. Keep tracking live HUD changes while it plays.
    update();
    return () => cancelAnimationFrame(frame);
  }, [key, translated]);

  return <>
    {marker && <span aria-hidden="true" className="street-marker" style={{ left: `${marker.x}%`, top: `${marker.y}%` }} />}
    {line && <div ref={bubbleRef} key={key} role="group" className="street-bubble phrase-save-row" data-chatter={id} aria-expanded={translated}>
      <button type="button" className="street-bubble-text" aria-expanded={translated} onClick={translate}>
        <GlossLine sentence={line.sentence} gloss={false} compact />
        {translated && <small className="street-tr" lang="lt">{line.sentence.nat}</small>}
      </button>
      <PhraseSave sentence={line.sentence} situationId="street" sourceLabel={words.overheard} iconOnly />
    </div>}
  </>;
}
