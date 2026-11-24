import { useLayoutEffect, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import { useStreet } from "../../game/street/StreetLife";
import { STREET_WORDS as words } from "../../game/street/words";
import { GlossLine } from "../kit/GlossLine";
import { PhraseSave } from "../kit/PhraseSave";
import { createBubblePlacement } from "./bubblePlacement";
import "./street.css";

const MENU_BLOCKERS = ".toolbar-drawer, .toolbar-tools";
const BLOCKERS = ".objective-card, .phone-ring, .street-card, .directions-card, .photo-chip, .minimap, " +
  ".toolbar, .radio-tool, .joy, .jump-btn, .act-btn, .prompt, .nametag, " + MENU_BLOCKERS;

function hasBlocker(nodes: NodeList) {
  for (const node of nodes) {
    if (node instanceof Element && (node.matches(BLOCKERS) || node.querySelector(BLOCKERS))) return true;
  }
  return false;
}

function readBlockers() {
  const elements = Array.from(document.querySelectorAll<HTMLElement>(BLOCKERS), (el) => ({
    el, menu: el.matches(MENU_BLOCKERS) ? el.closest(".toolbar") : null,
    tagStyle: el.classList.contains("nametag") ? el.style : null,
  }));
  return { elements, ...createBubblePlacement(elements.length) };
}

export function StreetBubbles() {
  const [key, id, line, translated, translate] = useStreet(useShallow(({ bubble }) =>
    [bubble?.key, bubble?.id, bubble?.line, bubble?.translated, bubble?.translate] as const));
  const marker = useStreet((s) => s.marker);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef<(() => void) | null>(null);

  useLayoutEffect(() => {
    const group = bubbleRef.current, hud = group?.parentElement;
    if (!group || !hud) return;
    let cache = readBlockers();
    const visibleBox = { visibilityProperty: true };
    // Only mounts/removals change membership. Inline tag styles and the menu's open state stay live.
    const observer = new MutationObserver((records) => {
      if (records.some(({ addedNodes, removedNodes }) => hasBlocker(addedNodes) || hasBlocker(removedNodes))) cache = readBlockers();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    const position = () => {
      const bubble = useStreet.getState().bubble;
      const anchor = bubble && bubble.key === key ? bubble.anchor : null;
      let placement;
      if (anchor) {
        const screen = hud.getBoundingClientRect();
        const { width, height } = group.getBoundingClientRect();
        const { elements, blockers, place } = cache;
        let count = 0;
        for (let i = 0; i < elements.length; i++) {
          const { el, menu, tagStyle } = elements[i];
          if (tagStyle?.display === "none" || (menu && !menu.classList.contains("menu-open"))) continue;
          if (!(el.checkVisibility?.(visibleBox) ?? (getComputedStyle(el).visibility === "visible"))) continue;
          const rect = el.getBoundingClientRect();
          if (!rect.width || !rect.height) continue;
          const bounds = blockers[count++];
          bounds.left = rect.left - screen.left;
          bounds.right = rect.right - screen.left;
          bounds.top = rect.top - screen.top;
          bounds.bottom = rect.bottom - screen.top;
        }
        if (width && height) placement = place(anchor.x * screen.width / 100, anchor.y * screen.height / 100,
          width, height, screen.width, screen.height, count);
      }
      if (placement) {
        const { x, y, tail } = placement;
        group.style.transform = `translate(${x}px, ${y}px)`;
        group.style.setProperty("--street-tail-x", `${tail.x}px`);
        group.style.setProperty("--street-tail-y", `${tail.y}px`);
        group.style.setProperty("--street-tail-angle", `${tail.angle}deg`);
      } else group.style.removeProperty("transform");
      group.style.visibility = placement ? "visible" : "hidden";
    };
    const update = () => {
      position();
      frame = requestAnimationFrame(update);
    };
    positionRef.current = position;
    let frame = requestAnimationFrame(update);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      positionRef.current = null;
    };
  }, [key]);

  // Measure before paint when the line's text changes, and keep the existing loop for movement.
  useLayoutEffect(() => { positionRef.current?.(); }, [key, translated]);

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
