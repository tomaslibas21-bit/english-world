import type { NametagLayout, NametagSize, PlacedNametag, TagBox } from "../../game/gameRef";
import { createBubblePlacement } from "./bubblePlacement";

const HUD_BLOCKERS = ".objective-card, .phone-ring, .street-card, .directions-card, .photo-chip, .minimap, " +
  ".toolbar, .toolbar .radio-tool, .joy, .jump-btn, .act-btn, .prompt, .toolbar-drawer, .toolbar.folds .toolbar-tools";
const VISIBLE_BOX = { visibilityProperty: true };
const GEOMETRY_ATTRIBUTES = ["class", "style", "hidden"];
const HUD_DECORATIONS = ".street-marker, .reaction-bubble, .radio-strip, .fade";
const MOTION_EVENTS = ["animationstart", "transitionrun"];

function affectsBlockers(el: Element) {
  return el.matches(HUD_BLOCKERS) || !!el.querySelector(HUD_BLOCKERS);
}

function readBlockers(hud: HTMLElement) {
  return Array.from(hud.querySelectorAll<HTMLElement>(HUD_BLOCKERS), (el) => ({
    el, visible: false, left: 0, right: 0, top: 0, bottom: 0,
  }));
}

export function createChatterLayout(group: HTMLElement, hud: HTMLElement, layer: HTMLElement,
  getAnchor: () => { x: number; y: number } | null) {
  const layout: NametagLayout = { scaleX: 1, scaleY: 1, size, blocker, position, dispose };
  const chatter: TagBox = { x0: 0, x1: 0, y0: 0, y1: 0 };
  let elements = readBlockers(hud);
  let tagCount = layer.childElementCount;
  let scratch = createBubblePlacement(elements.length + tagCount);
  let sizes = new WeakMap<HTMLElement, NametagSize>();
  let geometryDirty = true, groupDirty = true;
  let blockersDirty = true, blockersChanged = false;
  const blockerBoxes = new Set<Element>();
  const frameBoxes = new Set<Element>();
  const motion: { animation: Animation; frame: boolean }[] = [];
  let motionDirty = true, prepared = false;
  let screen: DOMRectReadOnly | undefined;
  let screenWidth = 0, screenHeight = 0, layerWidth = 0, layerHeight = 0;
  let screenScaleX = 1, screenScaleY = 1;
  let layerX = 0, layerY = 0, layerScaleX = 1, layerScaleY = 1;
  let width = 0, height = 0;
  let x = 0, y = 0, positioned = false;

  function invalidateFrame() {
    geometryDirty = groupDirty = blockersDirty = true;
  }

  function invalidate() {
    invalidateFrame();
    motionDirty = true;
    sizes = new WeakMap();
  }

  const geometryChanges = new MutationObserver((records) => {
    invalidate();
    if (records.some((record) => record.type === "childList")) {
      tagCount = layer.childElementCount;
      growScratch();
      watchSizes();
      watchTagText();
    }
  });
  for (const box of [hud, layer]) {
    for (let el: HTMLElement | null = box; el; el = el.parentElement) frameBoxes.add(el);
  }
  for (const el of frameBoxes) geometryChanges.observe(el, {
    attributeFilter: GEOMETRY_ATTRIBUTES, childList: el === layer,
  });
  const viewport = window.visualViewport;
  window.addEventListener("resize", invalidate);
  viewport?.addEventListener("resize", invalidate);
  window.addEventListener("scroll", invalidateFrame, true);
  viewport?.addEventListener("scroll", invalidateFrame);
  document.fonts.addEventListener("loadingdone", invalidate);

  const resized = typeof ResizeObserver === "undefined" ? null : new ResizeObserver((entries) => {
    for (const entry of entries) {
      const border = entry.borderBoxSize[0];
      if (!border) continue;
      const { inlineSize, blockSize } = border;
      if (entry.target === hud) {
        if (screenWidth !== Math.round(inlineSize) || screenHeight !== Math.round(blockSize)) invalidateFrame();
      } else if (entry.target === layer) {
        if (layerWidth !== Math.round(inlineSize) || layerHeight !== Math.round(blockSize)) geometryDirty = true;
      } else if (entry.target === group) {
        width = inlineSize;
        height = blockSize;
        groupDirty = false;
      } else if (frameBoxes.has(entry.target)) {
        invalidateFrame();
      } else if (blockerBoxes.has(entry.target)) {
        // A flex or grid neighbor can move when this box resizes.
        blockersDirty = true;
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
    for (const el of frameBoxes) resized.observe(el, { box: "border-box" });
    for (const el of blockerBoxes) resized.observe(el, { box: "border-box" });
    resized.observe(group, { box: "border-box" });
    for (const tag of layer.children) resized.observe(tag, { box: "border-box" });
  }

  function growScratch() {
    if (scratch.blockers.length <= elements.length + tagCount) scratch = createBubblePlacement(elements.length + tagCount);
  }

  function watchBlockers() {
    const next = new Set<Element>();
    for (const { el } of elements) {
      for (let box: HTMLElement | null = el; box && box !== hud; box = box.parentElement) next.add(box);
    }
    for (const el of blockerBoxes) {
      if (!next.has(el)) {
        resized?.unobserve(el);
        blockerBoxes.delete(el);
      }
    }
    for (const el of next) {
      if (blockerBoxes.has(el)) continue;
      blockerBoxes.add(el);
      resized?.observe(el, { box: "border-box" });
    }
  }

  watchSizes();
  watchBlockers();

  const hudChanges = new MutationObserver((records) => {
    let childrenChanged = false;
    for (const { target, type, attributeName, addedNodes, removedNodes } of records) {
      if (group.contains(target)) groupDirty = true;
      else {
        // Child content and adjacent controls can change positions without changing border-box sizes.
        blockersDirty = true;
        if (type === "childList") {
          if (target === hud) childrenChanged = true;
          motionDirty = true;
          for (const nodes of [addedNodes, removedNodes]) {
            for (const node of nodes) {
              if (node instanceof Element && (blockerBoxes.has(node) || affectsBlockers(node))) blockersChanged = true;
            }
          }
        } else if (type === "attributes" && target instanceof Element) {
          motionDirty = true;
          if (attributeName === "class" && (blockerBoxes.has(target) || affectsBlockers(target))) blockersChanged = true;
        }
      }
    }
    if (childrenChanged) watchHud();
  });

  function watchHud() {
    hudChanges.disconnect();
    hudChanges.observe(hud, { childList: true });
    // Watch each branch so that writes to moving overlays stay out of the observer.
    for (const child of hud.children) {
      if (child === group) {
        // The frame handoff writes the group's style. Text and translation can change its size.
        hudChanges.observe(group, { attributeFilter: ["class", "hidden", "aria-expanded"], childList: true, subtree: true, characterData: true });
      } else if (!child.matches(HUD_DECORATIONS)) {
        hudChanges.observe(child, {
          attributeFilter: GEOMETRY_ATTRIBUTES, childList: true, characterData: true, subtree: !child.matches(".joy"),
        });
      }
    }
  }
  watchHud();

  function motionStarted(event: Event) {
    const el = event.target;
    if (!(el instanceof Element)) return;
    if (frameBoxes.has(el)) invalidateFrame();
    else if (blockerBoxes.has(el)) blockersDirty = true;
    else return;
    motionDirty = true;
  }
  for (const type of MOTION_EVENTS) document.addEventListener(type, motionStarted, true);

  function watchMotion(boxes: Set<Element>, frame: boolean) {
    for (const el of boxes) {
      for (const animation of el.getAnimations?.() ?? []) {
        if (animation.pending || animation.playState === "running") motion.push({ animation, frame });
      }
    }
  }

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

  function prepare() {
    if (prepared) return;
    prepared = true;
    if (blockersChanged) {
      blockersChanged = false;
      elements = readBlockers(hud);
      watchBlockers();
      growScratch();
    }
    if (motionDirty) {
      motionDirty = false;
      // A style change can cancel motion before the next frame.
      for (const { frame } of motion) {
        if (frame) invalidateFrame();
        else blockersDirty = true;
      }
      motion.length = 0;
      watchMotion(frameBoxes, true);
      watchMotion(blockerBoxes, false);
    }
    // Sample through delays and the final frame of motion, using the game's existing frame.
    for (let i = motion.length - 1; i >= 0; i--) {
      const { animation, frame } = motion[i];
      if (frame) invalidateFrame();
      else blockersDirty = true;
      if (!animation.pending && animation.playState !== "running") {
        motion[i] = motion[motion.length - 1];
        motion.length--;
      }
    }
    measure();
  }

  function blocker() {
    if (!positioned || !getAnchor()) return;
    prepare();
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
    prepare();
    if (!screen || !width || !height) return;
    if (blockersDirty) {
      blockersDirty = false;
      for (const bounds of elements) {
        const { el } = bounds;
        bounds.visible = false;
        if (!(el.checkVisibility?.(VISIBLE_BOX) ?? getComputedStyle(el).visibility === "visible")) continue;
        const rect = el.getBoundingClientRect();
        if (!rect.width || !rect.height) continue;
        bounds.visible = true;
        bounds.left = (rect.left - screen.left) / screenScaleX;
        bounds.right = (rect.right - screen.left) / screenScaleX;
        bounds.top = (rect.top - screen.top) / screenScaleY;
        bounds.bottom = (rect.bottom - screen.top) / screenScaleY;
      }
    }
    const { blockers, place } = scratch;
    let count = 0;
    // Placement expands the scratch boxes in place. Keep the cached coordinates in HUD space.
    for (const cached of elements) {
      if (!cached.visible) continue;
      const bounds = blockers[count++];
      bounds.left = cached.left;
      bounds.right = cached.right;
      bounds.top = cached.top;
      bounds.bottom = cached.bottom;
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
    prepared = false;
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
    window.removeEventListener("scroll", invalidateFrame, true);
    viewport?.removeEventListener("scroll", invalidateFrame);
    document.fonts.removeEventListener("loadingdone", invalidate);
    for (const type of MOTION_EVENTS) document.removeEventListener(type, motionStarted, true);
    layout.boxes = layout.rect = undefined;
    group.style.visibility = "hidden";
  }

  return layout;
}
