import { picturesOn, useStore } from "../state/store";

type Box = { x0: number; x1: number; y0: number; y1: number };

export interface TalkLayout {
  width: number;
  height: number;
  viewportHeight: number;
  picture: Box;
  obstacles: Box[];
  shiftX: number;
  shiftY: number;
}

const FACE_INSET = 10;
const HUD_GAP = 6;
const PANEL = ".convo";
const CHIP = ".view-chip";
const GROUPS = ".view-chip, .hud, .toasts";
const ISLANDS = ".view-chip button, .view-chip img, .view-chip .vc-tip, .toast, .objective-card, .phone-ring, .text-arrival, .street-card, .directions-card, .photo-chip, .minimap, .toolbar .icon-btn, .toolbar-tooltip, .zone-banner, .coach, .prompt, .ride-strip, .radio-strip";
const WATCHED = `${PANEL}, ${GROUPS}, ${ISLANDS}`;

const clip = (a: Box, b: Box): Box => ({
  x0: Math.max(a.x0, b.x0), x1: Math.min(a.x1, b.x1),
  y0: Math.max(a.y0, b.y0), y1: Math.min(a.y1, b.y1),
});
const area = (box: Box) => Math.max(0, box.x1 - box.x0) * Math.max(0, box.y1 - box.y0);
const inset = (box: Box, gap: number): Box => ({
  x0: box.x0 + gap, x1: box.x1 - gap, y0: box.y0 + gap, y1: box.y1 - gap,
});

function spaceBeside(frame: Box, cover: Box, padding = FACE_INSET) {
  let best: Box | null = null, size = 0;
  for (const box of [
    { ...frame, y1: cover.y0 }, { ...frame, x1: cover.x0 },
    { ...frame, x0: cover.x1 }, { ...frame, y0: cover.y1 },
  ]) {
    const usable = area(inset(box, padding));
    if (usable > size) { best = box; size = usable; }
  }
  return best;
}

function shown(el: Element, entering = false) {
  for (let node: Element | null = el; node; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (style.display === "none" || style.visibility !== "visible" || /opacity\(0(?:\.0+)?%?\)/.test(style.filter)) return false;
    if (!(entering && node === el) && Number(style.opacity) === 0) return false;
  }
  return true;
}

function measure(canvas: HTMLCanvasElement, safeArea: Element, panel: Element, islands: Element[]): TalkLayout | null {
  const c = canvas.getBoundingClientRect();
  if (!c.width || !c.height) return null;
  const local = (r: DOMRect, dx = 0, dy = 0): Box => ({
    x0: r.left - c.left - dx, x1: r.right - c.left - dx,
    y0: r.top - c.top - dy, y1: r.bottom - c.top - dy,
  });
  const viewport = window.visualViewport;
  const x = viewport?.offsetLeft ?? 0, y = viewport?.offsetTop ?? 0;
  const view = clip({ x0: 0, x1: c.width, y0: 0, y1: c.height }, {
    x0: x - c.left, x1: Math.min(innerWidth, x + (viewport?.width ?? innerWidth)) - c.left,
    y0: y - c.top, y1: Math.min(innerHeight, y + (viewport?.height ?? innerHeight)) - c.top,
  });
  const safe = local(safeArea.getBoundingClientRect());
  const frame = area(safe) ? clip(view, safe) : view;
  if (!area(inset(frame, FACE_INSET))) return null;

  // Reserve the panel's dock while its entrance translation is still playing.
  const entering = panel.getAnimations().some((anim) => anim instanceof CSSAnimation
    && (anim.animationName === "slidein" || anim.animationName === "slideup"));
  if (!shown(panel, entering)) return null;
  const transform = getComputedStyle(panel).transform;
  const slide = entering && transform !== "none" ? new DOMMatrixReadOnly(transform) : null;
  const cover = clip(frame, local(panel.getBoundingClientRect(), slide?.m41, slide?.m42));
  const open = area(cover) ? spaceBeside(frame, cover) : frame;
  if (!open) return null;

  const obstacles: Box[] = [];
  for (const el of islands) {
    if (!shown(el)) continue;
    let box = local(el.getBoundingClientRect());
    if (el instanceof HTMLImageElement) {
      if (!el.complete || !el.naturalWidth) continue;
      const button = el.closest("button");
      if (button) box = clip(box, local(button.getBoundingClientRect()));
    }
    if (area(clip(box, open))) obstacles.push(clip(open, inset(box, -HUD_GAP)));
  }

  // Corner controls leave the usual centre available. A painted island at the centre moves the aim beside it.
  let aim = open;
  for (const obstacle of obstacles) {
    const x = (aim.x0 + aim.x1) / 2, y = aim.y0 + (aim.y1 - aim.y0) * 0.46;
    if (area(clip(obstacle, { x0: x - 20, x1: x + 20, y0: y - 20, y1: y + 20 }))) {
      aim = spaceBeside(aim, clip(aim, obstacle)) ?? aim;
    }
  }
  return {
    width: c.width, height: c.height, viewportHeight: innerHeight, picture: inset(open, FACE_INSET), obstacles,
    shiftX: c.width / 2 - (aim.x0 + aim.x1) / 2,
    shiftY: c.height / 2 - (aim.y0 + (aim.y1 - aim.y0) * 0.46),
  };
}

const close = (a: number, b: number) => Math.abs(a - b) <= 1;
const sameBox = (a: Box, b: Box) => close(a.x0, b.x0) && close(a.x1, b.x1) && close(a.y0, b.y0) && close(a.y1, b.y1);
function sameLayout(a: TalkLayout | null, b: TalkLayout | null) {
  return a && b ? close(a.width, b.width) && close(a.height, b.height) && close(a.viewportHeight, b.viewportHeight)
    && close(a.shiftX, b.shiftX) && close(a.shiftY, b.shiftY) && sameBox(a.picture, b.picture)
    && a.obstacles.length === b.obstacles.length && a.obstacles.every((box, i) => sameBox(box, b.obstacles[i])) : a === b;
}

export function watchTalkLayout(canvas: HTMLCanvasElement, valid: () => boolean, hasArt: boolean, apply: (layout: TalkLayout | null) => void) {
  const root = canvas.closest("#root") ?? canvas.parentElement?.parentElement ?? document.body;
  const viewport = window.visualViewport;
  const fonts = document.fonts;
  // A non-painted node resolves CSS env() in the same viewport coordinates as the panel.
  const safeArea = document.createElement("div");
  safeArea.style.cssText = "position:fixed;visibility:hidden;pointer-events:none;"
    + "inset:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)";
  root.appendChild(safeArea);
  let frame: number | null = null, stopped = false, refresh = false;
  let last: TalkLayout | null | undefined, panel: Element | null = null;
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
    const mounted = root.querySelector(PANEL);
    const islands = Array.from(root.querySelectorAll(ISLANDS));
    const next = new Set([canvas, safeArea, ...(mounted ? [mounted] : []), ...islands, ...root.querySelectorAll(GROUPS)]);
    if (next.size !== observed.size || [...next].some((el) => !observed.has(el))) {
      mutations.disconnect();
      mutations.observe(root, { childList: true });
      for (const el of observed) if (!next.has(el)) resize?.unobserve(el);
      for (const el of next) {
        if (!observed.has(el)) resize?.observe(el);
        if (el === canvas) continue;
        mutations.observe(el, {
          attributes: true, attributeFilter: ["class", "style", "hidden"],
          childList: el.matches(GROUPS), subtree: el.matches(".hud"),
        });
      }
      observed = next;
    }
    const layout = mounted && measure(canvas, safeArea, mounted, islands);
    const nowPictures = hasArt && picturesOn(useStore.getState().settings);
    const changed = refresh || mounted !== panel || (pictures && !nowPictures) || last === undefined || !sameLayout(last, layout);
    panel = mounted;
    pictures = nowPictures;
    refresh = false;
    if (changed) { last = layout; apply(layout); }
  }

  const onOverlayEvent = (event: Event) => {
    if (!(event.target instanceof Element)) return;
    if (event.type.startsWith("pointer") || event.type.startsWith("focus")) {
      if (event.target.closest(CHIP)) dirty();
    } else if (event.target.matches(WATCHED)) dirty();
  };
  const events = ["animationstart", "animationend", "animationcancel", "transitionstart", "transitionend", "transitioncancel",
    "pointerover", "pointerout", "focusin", "focusout", "load"];
  for (const event of events) root.addEventListener(event, onOverlayEvent, true);
  viewport?.addEventListener("resize", dirty);
  viewport?.addEventListener("scroll", dirty);
  fonts?.addEventListener("loadingdone", dirty);
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
    for (const event of events) root.removeEventListener(event, onOverlayEvent, true);
    viewport?.removeEventListener("resize", dirty);
    viewport?.removeEventListener("scroll", dirty);
    fonts?.removeEventListener("loadingdone", dirty);
    safeArea.remove();
    unsubscribe();
  }
  dirty();
  return { dirty, refit: () => { refresh = true; dirty(); }, dispose };
}
