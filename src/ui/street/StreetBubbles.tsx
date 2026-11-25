import { useLayoutEffect, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import { useStreet } from "../../game/street/StreetLife";
import { HL } from "../i18n";
import { GlossLine } from "../kit/GlossLine";
import { PORTRAIT_PHONE } from "../useScreen";
import { placeBubble } from "./bubblePlacement";
import "./street.css";

const OPEN_TASK = ".objective-card:not(.collapsed)";
const TOP_CONTROLS = ".minimap, .toolbar .ride-menu, .toolbar .ride-menu .due-badge";
const HUD_BLOCKERS = ".objective-card, .phone-ring, .street-card, .directions-card, .photo-chip, .minimap, " +
  ".toolbar, .toolbar.menu-open .toolbar-drawer, .toolbar.menu-open .toolbar-tools, .toolbar .radio-tool, .toolbar .due-badge, " +
  ".joy, .jump-btn, .act-btn, .prompt";

export function StreetBubbles() {
  const [key, id, line, translated, translate] = useStreet(useShallow(({ bubble }) =>
    [bubble?.key, bubble?.id, bubble?.line, bubble?.translated, bubble?.translate] as const));
  const marker = useStreet((s) => s.marker);
  const bubbleRef = useRef<HTMLButtonElement>(null);
  const copyRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const button = bubbleRef.current, copy = copyRef.current, hud = button?.parentElement;
    if (!button || !copy || !hud) return;
    const portrait = window.matchMedia(PORTRAIT_PHONE);
    let frame: number;
    const update = () => {
      const bubble = useStreet.getState().bubble;
      const anchor = bubble && bubble.key === key ? bubble.anchor : null;
      let placement;
      if (anchor) {
        const screen = hud.getBoundingClientRect();
        const { width, height } = button.getBoundingClientRect();
        const shortPortrait = portrait.matches && screen.height <= 760;
        let taskBottom = 0, controlsBottom = 0;
        const blockers = [];
        for (const el of hud.querySelectorAll(HUD_BLOCKERS)) {
          const rect = el.getBoundingClientRect();
          if (!rect.width || !rect.height || getComputedStyle(el).visibility !== "visible") continue;
          const bottom = rect.bottom - screen.top;
          blockers.push({ left: rect.left - screen.left, right: rect.right - screen.left,
            top: rect.top - screen.top, bottom });
          if (shortPortrait) {
            if (el.matches(OPEN_TASK)) taskBottom = bottom;
            if (el.matches(TOP_CONTROLS)) controlsBottom = Math.max(controlsBottom, bottom);
          }
        }
        const head = { x: anchor.x * screen.width / 100, y: anchor.y * screen.height / 100 };
        if (width && height) {
          const fullHeight = height + Math.max(0, copy.scrollHeight - copy.clientHeight);
          if (taskBottom > 0) {
            // Reserve the top HUD across the screen before looking for space beside it.
            const top = { left: 0, right: screen.width, top: 0, bottom: Math.max(taskBottom, controlsBottom) };
            placement = placeBubble(head, width, fullHeight, screen.width, screen.height, [...blockers, top], 44);
          }
          placement ??= placeBubble(head, width, fullHeight, screen.width, screen.height, blockers, taskBottom > 0 ? 44 : fullHeight);
          if (placement && placement.height < fullHeight) button.style.setProperty("--street-bubble-max-height", `${placement.height}px`);
          else button.style.removeProperty("--street-bubble-max-height");
        }
      }
      if (placement) {
        const { x, y, tail } = placement;
        button.style.transform = `translate(${x}px, ${y}px)`;
        button.style.setProperty("--street-tail-x", `${tail.x}px`);
        button.style.setProperty("--street-tail-y", `${tail.y}px`);
        button.style.setProperty("--street-tail-angle", `${tail.angle}deg`);
      } else button.style.removeProperty("transform");
      button.style.visibility = placement ? "visible" : "hidden";
      frame = requestAnimationFrame(update);
    };
    // Measure before showing a new line or translation. Keep tracking live HUD changes while it plays.
    update();
    return () => cancelAnimationFrame(frame);
  }, [key, translated]);

  return <>
    {marker && <span aria-hidden="true" className="street-marker" style={{ left: `${marker.x}%`, top: `${marker.y}%` }} />}
    {line && <button ref={bubbleRef} type="button" key={key} className="street-bubble" data-chatter={id}
      aria-expanded={translated} onClick={translate}>
      <span className="street-bubble-copy" ref={copyRef}>
        <GlossLine sentence={line.sentence} gloss={false} compact />
        {translated && <small className="street-tr" lang={HL}>{line.sentence.nat}</small>}
      </span>
    </button>}
  </>;
}
