import type { NametagLayout, NametagSize, PlacedNametag, TagBox } from "../../game/gameRef";
import { createBubblePlacement } from "./bubblePlacement";

const MENU_BLOCKERS = ".toolbar-drawer, .toolbar-tools";
const HUD_BLOCKERS = ".objective-card, .phone-ring, .street-card, .directions-card, .photo-chip, .minimap, " +
  ".toolbar, .toolbar .radio-tool, .joy, .jump-btn, .act-btn, .prompt, " + MENU_BLOCKERS;
const VISIBLE_BOX = { visibilityProperty: true };
const GEOMETRY_ATTRIBUTES = ["class", "style", "hidden"];

function hasBlocker(nodes: NodeList) {
  for (const node of nodes) {
    if (node instanceof Element && (node.matches(HUD_BLOCKERS) || node.querySelector(HUD_BLOCKERS))) return true;
  }
  return false;
}

function readBlockers(hud: HTMLElement, tagCount: number) {
  const elements = Array.from(hud.querySelectorAll<HTMLElement>(HUD_BLOCKERS), (el) => ({
    el, menu: el.matches(MENU_BLOCKERS) ? el.closest(".toolbar") : null,
  }));
  return { elements, ...createBubblePlacement(elements.length + tagCount) };
}

export function createChatterLayout(group: HTMLElement, hud: HTMLElement, layer: HTMLElement,
  getAnchor: () => { x: number; y: number } | null) {
  const layout: NametagLayout = { scaleX: 1, scaleY: 1, size, blocker, position, dispose };
  const chatter: TagBox = { x0: 0, x1: 0, y0: 0, y1: 0 };
  let cache = readBlockers(hud, layer.childElementCount);
  let sizes = new WeakMap<HTMLElement, NametagSize>();
  let geometryDirty = true, groupDirty = true;
  let screen: DOMRectReadOnly | undefined;
  let screenWidth = 0, screenHeight = 0, layerWidth = 0, layerHeight = 0;
  let screenScaleX = 1, screenScaleY = 1;
  let layerX = 0, layerY = 0, layerScaleX = 1, layerScaleY = 1;
  let width = 0, height = 0;
  let x = 0, y = 0, positioned = false;

  function invalidate() {
    geometryDirty = groupDirty = true;
    sizes = new WeakMap();
  }

  const geometryChanges = new MutationObserver((records) => {
    invalidate();
    if (records.some((record) => record.type === "childList")) {
      cache = readBlockers(hud, layer.childElementCount);
      watchSizes();
      watchTagText();
    }
  });
  for (let el: HTMLElement | null = hud; el; el = el.parentElement) {
    geometryChanges.observe(el, { attributeFilter: GEOMETRY_ATTRIBUTES });
  }
  geometryChanges.observe(layer, { attributeFilter: GEOMETRY_ATTRIBUTES, childList: true });
  const viewport = window.visualViewport;
  window.addEventListener("resize", invalidate);
  viewport?.addEventListener("resize", invalidate);
  document.fonts.addEventListener("loadingdone", invalidate);

  const resized = typeof ResizeObserver === "undefined" ? null : new ResizeObserver((entries) => {
    for (const entry of entries) {
      const border = entry.borderBoxSize[0];
      if (!border) continue;
      const { inlineSize, blockSize } = border;
      if (entry.target === hud) {
        if (screenWidth !== Math.round(inlineSize) || screenHeight !== Math.round(blockSize)) geometryDirty = groupDirty = true;
      } else if (entry.target === layer) {
        if (layerWidth !== Math.round(inlineSize) || layerHeight !== Math.round(blockSize)) geometryDirty = true;
      } else if (entry.target === group) {
        width = inlineSize;
        height = blockSize;
        groupDirty = false;
      } else if (inlineSize && blockSize) {
        const measured = sizes.get(entry.target as HTMLElement);
        if (measured) {
          measured[0] = Math.round(inlineSize);
          measured[1] = Math.round(blockSize);
        }
      }
    }
  });
  function watchSizes() {
    if (!resized) return;
    resized.disconnect();
    for (const el of [hud, layer, group, ...layer.children]) resized.observe(el, { box: "border-box" });
  }
  watchSizes();

  const hudChanges = new MutationObserver((records) => {
    let rebuild = false;
    for (const { target, addedNodes, removedNodes } of records) {
      if (group.contains(target)) groupDirty = true;
      else if (!rebuild && (hasBlocker(addedNodes) || hasBlocker(removedNodes))) rebuild = true;
    }
    if (rebuild) cache = readBlockers(hud, layer.childElementCount);
  });
  hudChanges.observe(hud, { childList: true, subtree: true });
  hudChanges.observe(group, { attributeFilter: ["class", "hidden", "aria-expanded"], childList: true, subtree: true, characterData: true });

  const tagChanges = new MutationObserver((records) => {
    let replaced = false;
    for (const { target, type } of records) {
      const el = target instanceof Element ? target : target.parentElement;
      const tag = el?.closest<HTMLElement>(".nametag");
      if (!tag) continue;
      sizes.delete(tag);
      if (target === tag && type === "childList") replaced = true;
    }
    if (replaced) watchTagText();
  });
  function watchTagText() {
    tagChanges.disconnect();
    for (const tag of layer.children) {
      tagChanges.observe(tag, { attributeFilter: ["class"], childList: true, characterData: true, subtree: true });
      // Game writes the tag's style for every camera frame. Observe style inside the tag
      // and let the resize observer report any change to the tag's own border box.
      for (const child of tag.children) {
        tagChanges.observe(child, { attributeFilter: GEOMETRY_ATTRIBUTES, subtree: true });
      }
    }
  }
  watchTagText();

  function size(tag: HTMLElement, previous?: NametagSize) {
    const measured = sizes.get(tag);
    if (measured) return measured;
    const width = tag.offsetWidth, height = tag.offsetHeight;
    const next = (width && height && previous) || [0, 0];
    next[0] = width;
    next[1] = height;
    sizes.set(tag, next);
    return next;
  }

  function measure() {
    if (geometryDirty) {
      geometryDirty = false;
      const bounds = hud.getBoundingClientRect();
      screenWidth = hud.offsetWidth;
      screenHeight = hud.offsetHeight;
      screen = bounds.width && bounds.height && screenWidth && screenHeight ? bounds : undefined;
      if (screen) {
        screenScaleX = screen.width / screenWidth;
        screenScaleY = screen.height / screenHeight;
      }

      const rect = layer.getBoundingClientRect();
      layerWidth = layer.offsetWidth;
      layerHeight = layer.offsetHeight;
      layout.rect = screen && rect.width && rect.height && layerWidth && layerHeight &&
        (layer.checkVisibility?.(VISIBLE_BOX) ?? getComputedStyle(layer).visibility === "visible") ? rect : undefined;
      if (layout.rect && screen) {
        layout.scaleX = rect.width / layerWidth;
        layout.scaleY = rect.height / layerHeight;
        layerX = (rect.left - screen.left) / screenScaleX;
        layerY = (rect.top - screen.top) / screenScaleY;
        layerScaleX = layout.scaleX / screenScaleX;
        layerScaleY = layout.scaleY / screenScaleY;
      }
    }
    if (groupDirty && screen) {
      groupDirty = false;
      const rect = group.getBoundingClientRect();
      width = rect.width / screenScaleX;
      height = rect.height / screenScaleY;
    }
  }

  function blocker() {
    if (!positioned || !getAnchor()) return;
    measure();
    if (!layout.rect || !width || !height) return;
    const tail = 6;
    chatter.x0 = (x - layerX) / layerScaleX - tail;
    chatter.x1 = (x + width - layerX) / layerScaleX + tail;
    chatter.y0 = (y - layerY) / layerScaleY - tail;
    chatter.y1 = (y + height - layerY) / layerScaleY + tail;
    return chatter;
  }

  function findPlacement(boxes: readonly PlacedNametag[]) {
    const anchor = getAnchor();
    if (!anchor) return;
    measure();
    if (!screen || !width || !height) return;
    const { elements, blockers, place } = cache;
    let count = 0;
    // HUD controls can animate while the camera moves.
    for (const { el, menu } of elements) {
      if (menu && !menu.classList.contains("menu-open")) continue;
      if (!(el.checkVisibility?.(VISIBLE_BOX) ?? getComputedStyle(el).visibility === "visible")) continue;
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) continue;
      const bounds = blockers[count++];
      bounds.left = (rect.left - screen.left) / screenScaleX;
      bounds.right = (rect.right - screen.left) / screenScaleX;
      bounds.top = (rect.top - screen.top) / screenScaleY;
      bounds.bottom = (rect.bottom - screen.top) / screenScaleY;
    }
    if (layout.rect) for (const { tag, x0, x1, y0, y1 } of boxes) {
      if (tag.parentElement !== layer || tag.style.display === "none" || tag.style.visibility === "hidden") continue;
      const bounds = blockers[count++];
      // Offset sizes round to whole CSS pixels.
      bounds.left = layerX + (x0 - 0.5) * layerScaleX;
      bounds.right = layerX + (x1 + 0.5) * layerScaleX;
      bounds.top = layerY + (y0 - 0.5) * layerScaleY;
      bounds.bottom = layerY + y1 * layerScaleY;
    }
    return place(anchor.x * screenWidth / 100, anchor.y * screenHeight / 100, width, height, screenWidth, screenHeight, count);
  }

  function position(boxes: readonly PlacedNametag[]) {
    layout.boxes = boxes;
    const placement = findPlacement(boxes);
    if (placement) {
      x = placement.x;
      y = placement.y;
      const { tail } = placement;
      group.style.transform = `translate(${x}px, ${y}px)`;
      group.style.setProperty("--street-tail-x", `${tail.x}px`);
      group.style.setProperty("--street-tail-y", `${tail.y}px`);
      group.style.setProperty("--street-tail-angle", `${tail.angle}deg`);
    }
    positioned = !!placement;
    group.style.visibility = positioned ? "visible" : "hidden";
  }

  function dispose() {
    geometryChanges.disconnect();
    resized?.disconnect();
    hudChanges.disconnect();
    tagChanges.disconnect();
    window.removeEventListener("resize", invalidate);
    viewport?.removeEventListener("resize", invalidate);
    document.fonts.removeEventListener("loadingdone", invalidate);
    layout.boxes = layout.rect = undefined;
    group.style.visibility = "hidden";
  }

  return layout;
}
