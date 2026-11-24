import { picturesOn, useStore } from "../state/store";

type Box = { x0: number; x1: number; y0: number; y1: number };

export interface TalkLayout {
  width: number;
  height: number;
  picture: Box;
  obstacles: Box[];
  shiftX: number;
  shiftY: number;
}

const FACE_INSET = 10;
const HUD_GAP = 6;
const PANEL = ".convo";
const CHIP = ".view-chip";
const HUD_CARDS = ".toast, .objective-card, .phone-ring, .text-arrival, .street-card, .directions-card, .photo-chip, .minimap, .toolbar .icon-btn, .toolbar-tooltip, .zone-banner, .coach, .prompt, .ride-strip, .radio-strip";
const ISLANDS = `${CHIP} button, ${CHIP} .vc-tip, ${HUD_CARDS}`;
const GROUPS = `${CHIP}, .hud, .toasts`;
const WATCHED = `${PANEL}, ${ISLANDS}, ${GROUPS}`;

const clip = (a: Box, b: Box): Box => ({
  x0: Math.max(a.x0, b.x0), x1: Math.min(a.x1, b.x1),
  y0: Math.max(a.y0, b.y0), y1: Math.min(a.y1, b.y1),
});
const area = (r: Box) => Math.max(0, r.x1 - r.x0) * Math.max(0, r.y1 - r.y0);
const inset = (r: Box, m: number): Box => ({ x0: r.x0 + m, x1: r.x1 - m, y0: r.y0 + m, y1: r.y1 - m });

function spaceBeside(frame: Box, cover: Box) {
  let best: Box | null = null;
  let size = 0;
  for (const r of [
    { ...frame, y1: cover.y0 }, { ...frame, x1: cover.x0 },
    { ...frame, x0: cover.x1 }, { ...frame, y0: cover.y1 },
  ]) {
    const usable = area(inset(r, FACE_INSET));
    if (usable > size) { best = r; size = usable; }
  }
  return best;
}

function painted(el: Element, entering = false) {
  const style = getComputedStyle(el);
  if (style.visibility !== "visible" || style.display === "none") return false;
  for (let node: Element | null = el; node; node = node.parentElement) {
    const s = node === el ? style : getComputedStyle(node);
    if ((!(entering && node === el) && Number(s.opacity) === 0) || /opacity\(0(?:\.0+)?%?\)/.test(s.filter)) return false;
  }
  return true;
}

function measure(canvas: HTMLCanvasElement, panel: Element | null, islands: Element[]): TalkLayout | null {
  const c = canvas.getBoundingClientRect();
  if (!c.width || !c.height || !panel) return null;
  const local = (r: DOMRect, dx = 0, dy = 0): Box => ({
    x0: r.left - c.left - dx, x1: r.right - c.left - dx,
    y0: r.top - c.top - dy, y1: r.bottom - c.top - dy,
  });
  const viewport = window.visualViewport;
  const x = viewport?.offsetLeft ?? 0, y = viewport?.offsetTop ?? 0;
  const frame = clip({ x0: 0, x1: c.width, y0: 0, y1: c.height }, {
    x0: x - c.left, x1: Math.min(innerWidth, x + (viewport?.width ?? innerWidth)) - c.left,
    y0: y - c.top, y1: Math.min(innerHeight, y + (viewport?.height ?? innerHeight)) - c.top,
  });
  if (!area(inset(frame, FACE_INSET))) return null;

  // The panel slides in with a translation. Reserve its dock before the animation paints it there.
  const entering = panel.getAnimations().some((a) => a instanceof CSSAnimation);
  if (!painted(panel, entering)) return null;
  const transform = getComputedStyle(panel).transform;
  const slide = entering && transform !== "none" ? new DOMMatrixReadOnly(transform) : null;
  const cover = clip(frame, local(panel.getBoundingClientRect(), slide?.m41, slide?.m42));
  const open = area(cover) ? spaceBeside(frame, cover) : frame;
  if (!open) return null;
  const picture = inset(open, FACE_INSET);
  const obstacles: Box[] = [];
  for (const el of islands) {
    if (!painted(el)) continue;
    const box = local(el.getBoundingClientRect());
    if (area(clip(box, open))) obstacles.push(clip(open, inset(box, -HUD_GAP)));
  }

  // Leave the normal composition alone for corner controls. If a card crosses the face target, center in the space beside it.
  let aim = open;
  for (const obstacle of obstacles) {
    const cx = (aim.x0 + aim.x1) / 2, cy = aim.y0 + (aim.y1 - aim.y0) * 0.46;
    if (area(clip(obstacle, { x0: cx - 20, x1: cx + 20, y0: cy - 20, y1: cy + 20 }))) {
      const cover = clip(aim, obstacle);
      if (area(cover)) aim = spaceBeside(aim, cover) ?? aim;
    }
  }
  return {
    width: c.width, height: c.height, picture, obstacles,
    shiftX: c.width / 2 - (aim.x0 + aim.x1) / 2,
    shiftY: c.height / 2 - (aim.y0 + (aim.y1 - aim.y0) * 0.46),
  };
}

const close = (a: number, b: number) => Math.abs(a - b) <= 1;
const sameBox = (a: Box, b: Box) => close(a.x0, b.x0) && close(a.x1, b.x1) && close(a.y0, b.y0) && close(a.y1, b.y1);
function sameLayout(a: TalkLayout | null, b: TalkLayout | null) {
  return a && b ? close(a.width, b.width) && close(a.height, b.height) && sameBox(a.picture, b.picture)
    && a.obstacles.length === b.obstacles.length && a.obstacles.every((box, i) => sameBox(box, b.obstacles[i])) : a === b;
}

/** Watch only the overlay siblings of this town canvas and the relevant controls inside them. */
export function watchTalkLayout(canvas: HTMLCanvasElement, valid: () => boolean, hasArt: boolean, apply: (layout: TalkLayout | null) => void) {
  const root = canvas.parentElement!.parentElement!;
  let frame: number | null = null, stopped = false;
  let last: TalkLayout | null = null;
  let pictures = hasArt && picturesOn(useStore.getState().settings);
  let observed = new Set<Element>();
  const dirty = () => {
    if (!stopped && frame === null) frame = requestAnimationFrame(read);
  };
  const resize = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(dirty);
  const mutations = new MutationObserver(dirty);
  mutations.observe(root, { childList: true });

  function read() {
    frame = null;
    if (stopped) return;
    if (!valid()) { dispose(); return; }
    const panel = root.querySelector(PANEL);
    const islands = Array.from(root.querySelectorAll(ISLANDS));
    const groups = Array.from(root.querySelectorAll(GROUPS));
    const next = new Set([canvas, ...(panel ? [panel] : []), ...islands, ...groups]);
    if (next.size !== observed.size || [...next].some((el) => !observed.has(el))) {
      mutations.disconnect();
      mutations.observe(root, { childList: true });
      for (const el of observed) if (!next.has(el)) resize?.unobserve(el);
      for (const el of next) {
        if (!observed.has(el)) resize?.observe(el);
        if (el === canvas) continue;
        if (el.matches(".hud")) mutations.observe(el, { childList: true, subtree: true });
        else mutations.observe(el, { attributes: true, attributeFilter: ["class", "style", "hidden"], childList: el.matches(GROUPS) });
      }
      observed = next;
    }
    const layout = measure(canvas, panel, islands);
    const nowPictures = hasArt && picturesOn(useStore.getState().settings);
    const returning = pictures && !nowPictures;
    pictures = nowPictures;
    if (returning || !sameLayout(last, layout)) { last = layout; apply(layout); }
  }

  const onOverlayEvent = (e: Event) => {
    if (!(e.target instanceof Element)) return;
    if (e.type.startsWith("pointer") || e.type.startsWith("focus")) {
      if (e.target.closest(CHIP)) dirty();
    } else if (e.target.matches(WATCHED)) dirty();
  };
  const events = ["animationstart", "animationend", "animationcancel", "transitionstart", "transitionend", "transitioncancel", "pointerover", "pointerout", "focusin", "focusout"];
  for (const event of events) root.addEventListener(event, onOverlayEvent);
  const viewport = window.visualViewport;
  viewport?.addEventListener("scroll", dirty);
  const unsubscribe = useStore.subscribe((s, prev) => {
    if (!s.conv.active || s.conv.run !== prev.conv.run) { dispose(); return; }
    const a = s.settings, b = prev.settings;
    if (s.hud.panel !== prev.hud.panel || a.textSize !== b.textSize || a.lt !== b.lt || a.ltNatural !== b.ltNatural
      || a.ipa !== b.ipa || a.sayLt !== b.sayLt || a.sayIpa !== b.sayIpa || picturesOn(a) !== picturesOn(b)) dirty();
  });
  function dispose() {
    if (stopped) return;
    stopped = true;
    if (frame !== null) cancelAnimationFrame(frame);
    mutations.disconnect();
    resize?.disconnect();
    for (const event of events) root.removeEventListener(event, onOverlayEvent);
    viewport?.removeEventListener("scroll", dirty);
    unsubscribe();
  }
  dirty();
  return { dirty, dispose };
}
