import { useLayoutEffect, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import { game, type NametagLayout } from "../../game/gameRef";
import { useStreet } from "../../game/street/StreetLife";
import { STREET_WORDS as words } from "../../game/street/words";
import { GlossLine } from "../kit/GlossLine";
import { PhraseSave } from "../kit/PhraseSave";
import { createBubblePlacement } from "./bubblePlacement";
import "./street.css";

const MENU_BLOCKERS = ".toolbar-drawer, .toolbar-tools";
const BLOCKERS = ".objective-card, .phone-ring, .street-card, .directions-card, .photo-chip, .minimap, " +
  ".toolbar, .radio-tool, .joy, .jump-btn, .act-btn, .prompt, [data-pad-hint][data-pad-positioned], " + MENU_BLOCKERS;

function hasBlocker(nodes: NodeList) {
  for (const node of nodes) {
    if (node instanceof Element && (node.matches(BLOCKERS) || node.querySelector(BLOCKERS))) return true;
  }
  return false;
}

function readBlockers(tagCount: number) {
  const elements = Array.from(document.querySelectorAll<HTMLElement>(BLOCKERS), (el) => ({
    el, menu: el.matches(MENU_BLOCKERS) ? el.closest(".toolbar") : null,
  }));
  return { elements, ...createBubblePlacement(elements.length + tagCount) };
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
    const town = game;
    const tags: NametagLayout = { scaleX: 1, scaleY: 1 };
    const tagLayer = town?.watchNametagLayout?.(tags);
    let cache = readBlockers(tagLayer?.childElementCount ?? 0);
    const visibleBox = { visibilityProperty: true };
    // Mounts and removals change capacity. The menu's open state and tag layout stay live.
    const observer = new MutationObserver((records) => {
      if (records.some(({ target, addedNodes, removedNodes }) => target === tagLayer || hasBlocker(addedNodes) || hasBlocker(removedNodes))) {
        cache = readBlockers(tagLayer?.childElementCount ?? 0);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    const findPlacement = () => {
      const bubble = useStreet.getState().bubble;
      const anchor = bubble && bubble.key === key ? bubble.anchor : null;
      if (!anchor || (tagLayer && !tags.boxes)) return;
      const screen = hud.getBoundingClientRect();
      const { width, height } = group.getBoundingClientRect();
      const screenWidth = hud.offsetWidth, screenHeight = hud.offsetHeight;
      if (!width || !height || !screenWidth || !screenHeight || !screen.width || !screen.height) return;
      const scaleX = screen.width / screenWidth, scaleY = screen.height / screenHeight;
      const { elements, blockers, place } = cache;
      let count = 0;
      for (let i = 0; i < elements.length; i++) {
        const { el, menu } = elements[i];
        if (menu && !menu.classList.contains("menu-open")) continue;
        if (!(el.checkVisibility?.(visibleBox) ?? (getComputedStyle(el).visibility === "visible"))) continue;
        const rect = el.getBoundingClientRect();
        if (!rect.width || !rect.height) continue;
        const bounds = blockers[count++];
        bounds.left = (rect.left - screen.left) / scaleX;
        bounds.right = (rect.right - screen.left) / scaleX;
        bounds.top = (rect.top - screen.top) / scaleY;
        bounds.bottom = (rect.bottom - screen.top) / scaleY;
      }
      const tagRect = tags.rect;
      if (tagRect?.width && tagRect.height && tags.boxes && tagLayer?.isConnected &&
        (tagLayer.checkVisibility?.(visibleBox) ?? getComputedStyle(tagLayer).visibility === "visible")) {
        const x = (tagRect.left - screen.left) / scaleX, y = (tagRect.top - screen.top) / scaleY;
        const sx = tags.scaleX / scaleX, sy = tags.scaleY / scaleY;
        for (let i = 0; i < tags.boxes.length; i++) {
          const { tag, x0, x1, y0, y1 } = tags.boxes[i];
          if (tag.parentElement !== tagLayer ||
            !(tag.checkVisibility?.(visibleBox) ?? (tag.style.display !== "none" && tag.style.visibility !== "hidden"))) continue;
          const bounds = blockers[count++];
          // Offset dimensions round to whole CSS pixels. Cover the fractional part of the border box.
          bounds.left = x + (x0 - 0.5) * sx;
          bounds.right = x + (x1 + 0.5) * sx;
          bounds.top = y + (y0 - 0.5) * sy;
          bounds.bottom = y + y1 * sy;
        }
      }
      return place(anchor.x * screenWidth / 100, anchor.y * screenHeight / 100,
        width / scaleX, height / scaleY, screenWidth, screenHeight, count);
    };
    const position = () => {
      const placement = findPlacement();
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
      if (tagLayer) town?.watchNametagLayout?.(null);
      positionRef.current = null;
    };
  }, [key]);

  // Measure before paint when the line's text changes, and keep the existing loop for movement.
  useLayoutEffect(() => { positionRef.current?.(); }, [key, translated]);

  return <>
    {marker && <span aria-hidden="true" className="street-marker" style={{ left: `${marker.x}%`, top: `${marker.y}%` }} />}
    {line && <div ref={bubbleRef} key={key} role="group" className="street-bubble phrase-save-row" data-chatter={id} aria-expanded={translated}>
      <button type="button" className="street-bubble-text" data-pad-aux data-pad-tool="street-bubble" aria-expanded={translated} onClick={translate}>
        <GlossLine sentence={line.sentence} gloss={false} compact />
        {translated && <small className="street-tr" lang="lt">{line.sentence.nat}</small>}
      </button>
      <PhraseSave sentence={line.sentence} situationId="street" sourceLabel={words.overheard} iconOnly />
    </div>}
  </>;
}
