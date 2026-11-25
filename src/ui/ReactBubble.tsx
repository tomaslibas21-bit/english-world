import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { game } from "../game/gameRef";
import type { ReactionLine } from "../game/life/reacts";
import { STREET_WORDS } from "../game/street/words";
import { HL, L, TL } from "./i18n";
import { resolvePhrase } from "./kit/phraseLine";
import { PhraseSave } from "./kit/PhraseSave";
import "./reactBubble.css";

const TRANSLATION = L("Vertimas");
const INSET = 12;
const TAIL_HEIGHT = 7;
const TOP_HUD = ".objective-card, .minimap, .toolbar .ride-menu, .toolbar.menu-open .toolbar-drawer, .text-arrival";
const TOUCH_CONTROLS = ".joy, .jump-btn, .act-btn, .drive-horn, .prompt.touch";

function visibleRects(hud: Element | null, selector: string) {
  return hud ? Array.from(hud.querySelectorAll(selector), (el) => el.getBoundingClientRect()).filter((rect) => rect.width && rect.height) : [];
}

function bubblePlacement(anchor: { x: number; y: number }, w: number, h: number, width: number, bottom: number, hud: DOMRect[]) {
  const clampX = (left: number) => Math.max(INSET, Math.min(width - w - INSET, left));
  const preferred = clampX(anchor.x - w / 2);
  // Try the speaker's column first. If it is full, try beside the cards and controls.
  const lanes = [preferred, ...hud.flatMap((rect) => [clampX(rect.left - w - INSET), clampX(rect.right + INSET)])];
  lanes.sort((a, b) => Math.abs(a - preferred) - Math.abs(b - preferred));
  const over = anchor.y - h - TAIL_HEIGHT - 1;
  const under = anchor.y + TAIL_HEIGHT + 1;
  const maxY = bottom - h - INSET - TAIL_HEIGHT;
  let fallback: { x: number; y: number; below: boolean } | undefined;
  for (const x of lanes) {
    let top = INSET;
    for (const rect of hud) if (x < rect.right && x + w > rect.left) top = Math.max(top, rect.bottom + INSET);
    if (top > maxY) continue;
    if (over >= top) return { x, y: Math.min(over, maxY), below: false };
    const y = Math.max(top + TAIL_HEIGHT, under);
    if (y <= maxY + TAIL_HEIGHT) return { x, y, below: true };
    fallback ??= { x, y: top + TAIL_HEIGHT, below: true };
  }
  return fallback;
}

export function ReactBubble({ line }: { line: ReactionLine }) {
  const [translation, showTranslation] = useState(false);
  const sentence = useMemo(() => resolvePhrase({ targetText: line.text, helperText: line.lt }), [line]);
  const bubble = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = bubble.current!;
    const hud = el.closest(".hud");
    let frame: number;
    const update = () => {
      const p = game?.reactPosition?.(line.id);
      if (p && p.opacity > 0) {
        const { clientWidth: width, clientHeight: height } = document.documentElement;
        let bottom = height;
        if (hud?.classList.contains("has-touch")) {
          for (const rect of visibleRects(hud, TOUCH_CONTROLS)) bottom = Math.min(bottom, rect.top);
        }
        const { width: w, height: h } = el.getBoundingClientRect();
        const placement = bubblePlacement(p, w, h, width, bottom, visibleRects(hud, TOP_HUD));
        if (placement) {
          const { x, y, below } = placement;
          el.style.transform = `translate(${x}px, ${y}px)`;
          el.style.setProperty("--tail", `${Math.max(INSET, Math.min(w - INSET, p.x - x))}px`);
          el.toggleAttribute("data-below", below);
          el.style.opacity = String(p.opacity);
          el.style.visibility = "visible";
        } else el.style.visibility = "hidden";
      } else el.style.visibility = "hidden";
      frame = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(frame);
  }, [line.id]);
  return <div className="reaction-bubble" ref={bubble} role="status" aria-live="polite" data-reaction={line.kind}>
    <div className="reaction-copy">
      <span lang={TL}>{line.text}</span>
      {(translation || line.id === 1) && <small lang={HL}>{translation ? line.lt : STREET_WORDS.translation}</small>}
    </div>
    <button type="button" className="reaction-translation" aria-label={TRANSLATION} aria-expanded={translation} onMouseDown={(e) => e.preventDefault()} onClick={() => {
      if (!translation) { showTranslation(true); game?.extendReaction?.(line.id); }
    }} />
    {sentence && <PhraseSave sentence={sentence} situationId="street" sourceLabel={STREET_WORDS.overheard} />}
  </div>;
}
