import { PAD_LINES } from "@/content/gamepad";
import { EDITION } from "../edition";
import type { PadDebug } from "../game/gamepad";
import type { PopoverElement } from "./Cards";
import "./gamepad.css";

const ADJUST = "input[type=range][data-pad-adjust], select[data-pad-adjust]:not([multiple])";
/** A read-only region that scrolls (Barista's revealed order, the Lotería's called cards): focusable while it overflows. */
const SCROLL = "[data-pad-scroll]";
const CONTROL = `button, a[href], summary, ${ADJUST}, ${SCROLL}`;
const BLOCKED = "[hidden], [inert], [aria-hidden=true]";
const DISABLED = ":disabled, [aria-disabled=true], [data-pad-skip], .taxi-action, .bl-power-track";
const BACK = "[data-pad-back]";
const DEFAULT = "[data-pad-default]";
const CLOSE = `${BACK}, .rs-x, .glyph-x, .quest-close, .street-head button, .surf-later, .barista-exit, .problem-actions button[type=button]`;
const NOT_DEFAULT = `${CLOSE}, [data-pad-no-default]`;
const ANSWER = "[data-pad-answer]";
const TOOLBAR = "[data-pad-toolbar]";
const OPENER = ".toolbar .ride-menu";
const PORTAL = ".wpop, .nat-tipbox";
const GRID = "[data-pad-grid], .scn-grid, .lh-grid, .lh-tools, .map-canvas, .guide-chips, .barista-chips, .surf-levels, .word-gate-ways";
const AUX = "[data-pad-tool], .objective-card button, .cave-card button, .directions-card button, .text-arrival button";
const MODE_TOOLS = "[data-pad-tools]";
const AUXILIARY = "[data-pad-aux], [data-pad-aux] button";
const TYPING = 'textarea, input:not([type=range]), select:not([data-pad-adjust]), [contenteditable]:not([contenteditable=false])';

type Direction = "up" | "down" | "left" | "right";
type Widget = HTMLInputElement | HTMLSelectElement;
type State = "connected" | "disconnected";

interface Policy {
  rank: number;
  first?: string;
  back?: string;
  flow?: string;
}

/** A mode can use the same policy with a scoped root and marked defaults, answers, grids and Back. */
const POLICIES: Record<string, Policy> = {
  intro: { rank: 100, first: DEFAULT },
  info: { rank: 105 },
  thread: { rank: 108, first: `${ANSWER}, .text-bubble`, flow: ".text-thread" },
  panel: { rank: 107, first: "button[data-sit], button.contact, [role=tab]", flow: ".sheet, .phone" },
  glyph: { rank: 90, first: ".glyph-opt, .glyph-play", back: ".glyph-x" },
  modal: { rank: 90, first: "[data-choice], .photo-choices [data-line], .surf-level", back: CLOSE },
  "photo-confirm": { rank: 105 },
  "word-setup": { rank: 90, first: DEFAULT, back: CLOSE },
  "native-modal": { rank: 120, first: "summary", back: CLOSE },
  ended: { rank: 75, first: ".ended-destination button, .ended-main .btn, button[class$='-cta']", back: ".convo-head [data-pad-back]" },
  meeting: { rank: 74, first: ANSWER },
  convo: { rank: 70, first: `${ANSWER}, .guide .chip` },
  score: { rank: 65, flow: ".mode-score-card" },
  choice: { rank: 60, first: ".barista-choice, [data-line].taxi-choice, .road-choice, .surf-choice", back: CLOSE },
  radio: { rank: 55, first: ".rs-knob", back: ".rs-x" },
  "phone-ring": { rank: 50, first: DEFAULT },
  street: { rank: 50, first: ".street-choice, .street-line", back: ".street-head button" },
  drawer: { rank: 20, first: "[data-pad-tool=scenarios]" },
  toolbar: { rank: 20, first: "[data-pad-tool=scenarios]" },
  home: { rank: 10, first: ".lh-card[data-sit]", flow: ".lh-in" },
  // the first visit's flight: a fresh A skips it as a click or any key does (the world stays still throughout)
  flight: { rank: 130, first: "button.flight" },
  popover: { rank: 110 },
  tooltip: { rank: 110 },
};

const EXISTING: Record<string, string> = {
  "dialog[open]": "native-modal",
};
const ROOTS = ["[data-pad-scope]", TOOLBAR, ...Object.keys(EXISTING)].join(", ");

function kind(root: HTMLElement) {
  if (root.dataset.padScope) return root.dataset.padScope;
  if (root.matches(TOOLBAR)) return "toolbar";
  if (root.matches(PORTAL)) return root.matches(".wpop") ? "popover" : "tooltip";
  for (const selector in EXISTING) if (root.matches(selector)) return EXISTING[selector];
  return "choice";
}

function policy(root: HTMLElement) { return POLICIES[kind(root)] ?? POLICIES.choice; }
function phaseOf(root: HTMLElement | null) { return root?.dataset.padPhase ?? root?.dataset.phase; }

function visible(el: HTMLElement) {
  return el.isConnected && !el.closest(BLOCKED) && el.getClientRects().length > 0 &&
    getComputedStyle(el).visibility === "visible";
}

function available(el: Element | null): el is HTMLElement {
  return el instanceof HTMLElement && el.matches(CONTROL) && !el.closest(DISABLED) && visible(el);
}

/** Clips the box to scrollports. A partly seen control can still receive a full ring after scrolling. */
function visibleBox(el: HTMLElement) {
  const box = el.getBoundingClientRect();
  let left = Math.max(0, box.left), top = Math.max(0, box.top);
  let right = Math.min(innerWidth, box.right), bottom = Math.min(innerHeight, box.bottom);
  for (let parent = el.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
    const { overflowX, overflowY } = getComputedStyle(parent);
    if (overflowX === "visible" && overflowY === "visible") continue;
    const clip = parent.getBoundingClientRect();
    if (overflowX !== "visible") { left = Math.max(left, clip.left); right = Math.min(right, clip.right); }
    if (overflowY !== "visible") { top = Math.max(top, clip.top); bottom = Math.min(bottom, clip.bottom); }
  }
  return right > left && bottom > top ? DOMRect.fromRect({ x: left, y: top, width: right - left, height: bottom - top }) : null;
}

function hit(el: HTMLElement, box: DOMRect) {
  const top = document.elementFromPoint((box.left + box.right) / 2, (box.top + box.bottom) / 2);
  return el.contains(top);
}

function scrollNear(target: HTMLElement) {
  for (let parent = target.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
    const { overflowX, overflowY } = getComputedStyle(parent);
    const x = /auto|scroll/.test(overflowX) && parent.scrollWidth > parent.clientWidth;
    const y = /auto|scroll/.test(overflowY) && parent.scrollHeight > parent.clientHeight;
    if (!x && !y) continue;
    const box = target.getBoundingClientRect(), bounds = parent.getBoundingClientRect();
    const left = bounds.left + parent.clientLeft + 4, top = bounds.top + parent.clientTop + 4;
    const right = left + parent.clientWidth - 8, bottom = top + parent.clientHeight - 8;
    const dx = !x ? 0 : box.left < left ? box.left - left : Math.max(0, box.right - right);
    const dy = !y ? 0 : box.top < top ? box.top - top : Math.max(0, box.bottom - bottom);
    if (dx || dy) parent.scrollBy({ left: dx, top: dy, behavior: "instant" });
  }
}

function neighbor(from: HTMLElement, items: HTMLElement[], direction: Direction) {
  const box = from.getBoundingClientRect();
  const vertical = direction === "up" || direction === "down";
  const sign = direction === "up" || direction === "left" ? -1 : 1;
  let best: HTMLElement | undefined, distance = Infinity;
  for (const item of items) {
    if (item === from) continue;
    const to = item.getBoundingClientRect();
    const x = (to.left + to.right - box.left - box.right) / 2;
    const y = (to.top + to.bottom - box.top - box.bottom) / 2;
    const forward = (vertical ? y : x) * sign, across = Math.abs(vertical ? x : y);
    if (forward < 2 || across > forward * 1.4) continue;
    const d = forward ** 2 + across ** 2 * 2;
    if (d < distance) { best = item; distance = d; }
  }
  return best;
}

function identity(target: HTMLElement) {
  const d = target.dataset;
  return target.id || d.sit || d.line || d.meetingAnswer || d.padAnswer || d.padTool || d.thread || d.card || d.chip || d.ball ||
    d.pocket || d.word || d.target || d.choice || d.way || target.classList[0] || target.localName;
}

function focusId(root: HTMLElement, target: HTMLElement) {
  const key = identity(target);
  if (target.id || target.matches("[data-sit], [data-thread], [data-pad-tool]")) return key;
  let index = 0, count = 0;
  for (const item of root.querySelectorAll<HTMLElement>(CONTROL)) {
    if (identity(item) !== key) continue;
    count++;
    if (item === target) index = count;
  }
  return count > 1 ? `${key}#${index}` : key;
}

function setWidget(target: Widget, value: number | string) {
  const before = target.value;
  if (target instanceof HTMLSelectElement) {
    if (typeof value === "string") {
      const original = Array.from(target.options).find((option) => option.value === value);
      if (original) target.selectedIndex = original.index;
    } else {
      for (let i = target.selectedIndex + value; i >= 0 && i < target.length; i += value) {
        if (target.options[i].closest(":disabled, [hidden], [aria-disabled=true]")) continue;
        target.selectedIndex = i;
        break;
      }
    }
  } else if (typeof value === "string") target.valueAsNumber = Number(value);
  else if (value > 0) target.stepUp();
  else target.stepDown();
  // Native step/index setters leave React's value tracker ready to process the existing change handler.
  if (target.value !== before) {
    target.dispatchEvent(new Event(target instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
  }
}

type Origin = { target: HTMLElement; owner: HTMLElement | null; parent: HTMLElement | null; key: string; at: number };
type Restore = { from: HTMLElement; origin?: Origin; direction?: Direction };
const openingFocus = (event: Event) => event.stopPropagation();

export class GamepadView {
  private app: HTMLElement | null = null;
  private observer?: MutationObserver;
  private roots = new Set<HTMLElement>();
  private portals = new Set<PopoverElement>();
  private active: HTMLElement | null = null;
  private phase?: string;
  private connected = false;
  private desktop = false;
  private opening = false;
  private focused?: HTMLElement;
  private bubble?: HTMLElement;
  private composing = false;
  private lastField = false;
  private launch?: Origin;
  private returns = new WeakMap<HTMLElement, Origin>();
  private last = new WeakMap<HTMLElement, HTMLElement>();
  private pending?: Restore;
  private toolbarReturn?: string;
  private auxiliary?: { root: HTMLElement; under: HTMLElement | null; phase?: string; underPhase?: string };
  private edit?: { target: Widget; value: string };
  private notice: PadNotice;

  constructor(private debug: PadDebug, private reset: () => void, avatar?: () => DOMRect | undefined) {
    this.notice = new PadNotice(() => this.active, avatar);
  }

  get scope() { return this.active; }
  get editingText() { return this.lastField || this.composing; }

  connect(app: HTMLElement) {
    this.app = app;
    this.connected = true;
    // (controls offered only to a controller, such as Billiards' header microphone, show while one is connected)
    document.documentElement.setAttribute("data-pad-connected", "");
    if (!this.observer) {
      this.collect(app);
      this.observer = new MutationObserver(this.changed);
      this.observer.observe(app, {
        subtree: true, childList: true,
        attributeFilter: ["data-pad-scope", "data-pad-toolbar", "data-pad-tools", "data-pad-phase", "data-phase", "inert", "hidden", "aria-hidden", "disabled", "aria-disabled", "open"],
      });
      this.observer.observe(document.body, { childList: true });
      for (const node of document.body.children) this.addPortal(node);
      window.addEventListener("resize", this.resized);
    }
    document.addEventListener("pointerdown", this.physical, true);
    document.addEventListener("keydown", this.physical, true);
    document.addEventListener("click", this.clicked, true);
    document.addEventListener("focusin", this.focusedIn);
    document.addEventListener("focusout", this.focusedOut);
    document.addEventListener("compositionstart", this.compositionStarted);
    document.addEventListener("compositionend", this.compositionEnded);
    this.lastField = !!document.activeElement?.closest(TYPING);
    this.refresh();
    this.notice.show(app, "connected", this.noticeExpired);
  }

  disconnect() {
    if (!this.connected) return;
    this.stopInput();
    this.refresh();
    this.notice.show(this.app!, "disconnected", this.noticeExpired);
  }

  dispose() {
    this.stopInput();
    this.notice.remove();
    this.unwatch();
    this.app = null;
  }

  cancel() {
    const target = this.focused;
    this.clearRing();
    if (target?.matches(ADJUST) && target === document.activeElement) target.blur();
  }

  private stopInput() {
    document.documentElement.removeAttribute("data-pad-connected");
    this.connected = this.desktop = this.opening = this.composing = this.lastField = false;
    this.pending = this.launch = undefined;
    this.toolbarReturn = undefined;
    this.auxiliary = undefined;
    this.bubble = undefined;
    this.returns = new WeakMap();
    this.last = new WeakMap();
    this.cancel();
    document.removeEventListener("pointerdown", this.physical, true);
    document.removeEventListener("keydown", this.physical, true);
    document.removeEventListener("click", this.clicked, true);
    document.removeEventListener("focusin", this.focusedIn);
    document.removeEventListener("focusout", this.focusedOut);
    document.removeEventListener("compositionstart", this.compositionStarted);
    document.removeEventListener("compositionend", this.compositionEnded);
  }

  private unwatch() {
    this.observer?.disconnect();
    this.observer = undefined;
    this.roots.clear();
    this.portals.clear();
    this.active = null;
    window.removeEventListener("resize", this.resized);
  }

  private noticeExpired = () => { if (!this.connected) this.unwatch(); };
  private resized = () => this.refresh();

  /** Only called on action edges, never by the sampler's steady-state path. */
  sync() {
    const records = this.observer?.takeRecords();
    if (records?.length) this.changed(records);
    if (this.bubble && !visible(this.bubble)) this.leaveTools();
  }

  private collect(node: HTMLElement) {
    let found = node.matches(ROOTS);
    if (found) this.roots.add(node);
    if (node.childElementCount) for (const root of node.querySelectorAll<HTMLElement>(ROOTS)) {
      this.roots.add(root);
      found = true;
    }
    return found;
  }

  private addPortal(node: Element) {
    if (!(node instanceof HTMLElement) || !node.matches(PORTAL)) return false;
    this.portals.add(node);
    this.observer?.observe(node, {
      subtree: true, childList: true, attributeFilter: ["data-pad-placed", "hidden", "disabled", "aria-disabled"],
    });
    return true;
  }

  private changed = (records: MutationRecord[]) => {
    let refresh = false, layout = false, focus = false;
    const showing = this.notice.visible;
    for (const record of records) {
      const target = record.target;
      if (!(target instanceof HTMLElement)) continue;
      // The notice's own slot and card: their inserts, removals and attributes are its layout, not a UI change.
      if (this.notice.owns(target) || (record.type === "childList" && this.notice.only(record))) continue;
      if (this.focused) focus ||= target === this.focused || target.contains(this.focused);
      if (record.type === "attributes") {
        if (this.portals.has(target)) refresh = true;
        else if (target.matches(ROOTS)) {
          this.roots.add(target);
          refresh = true;
        } else if (this.roots.delete(target) || (this.active && target.contains(this.active))) refresh = true;
        if (showing) layout ||= target.matches(NOTICE_ANCHORS) || !!this.active?.contains(target);
        continue;
      }
      for (const added of record.addedNodes) {
        if (!(added instanceof HTMLElement)) continue;
        if (target === document.body) refresh = this.addPortal(added) || refresh;
        else refresh = this.collect(added) || refresh;
        if (showing) layout ||= added.matches(NOTICE_ANCHORS) || !!added.querySelector(NOTICE_ANCHORS);
      }
      for (const removed of record.removedNodes) {
        if (!(removed instanceof HTMLElement)) continue;
        refresh = this.portals.delete(removed) || refresh;
        for (const root of this.roots) {
          if (!root.isConnected && removed.contains(root)) { this.roots.delete(root); refresh = true; }
        }
        if (showing) layout ||= removed.matches(NOTICE_ANCHORS) || !!removed.querySelector(NOTICE_ANCHORS);
      }
      if (showing) layout ||= this.portals.has(target) || !!this.active?.contains(target);
    }
    if (this.bubble && !this.bubble.isConnected) {
      this.bubble = undefined;
      this.leaveTools();
    }
    if (this.auxiliary && !this.auxiliary.root.isConnected) refresh = true;
    if (this.focused && (!this.focused.isConnected || (focus && !available(this.focused)))) this.clearRing();
    if (refresh) this.refresh();
    else if (layout) this.notice.layout();
  };

  private refresh() {
    const previous = this.active;
    let active: HTMLElement | null = null, rank = 0;
    for (const node of this.roots) {
      // (React can keep an element and drop its marker: the walking toolbar becomes the folding one in a ride)
      if (!node.matches(ROOTS)) { this.roots.delete(node); continue; }
      if (node.matches(PORTAL) || (node.matches(TOOLBAR) && !this.desktop)) continue;
      // A native modal that holds a scope of ours (the stone's card in its <dialog>) leaves the choice to that scope.
      if (!node.dataset.padScope && node.matches("dialog[open]") && node.querySelector("[data-pad-scope]")) continue;
      const priority = policy(node).rank;
      if (priority < rank || !visible(node)) continue;
      if (priority === rank && active &&
          !(active.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
      active = node;
      rank = priority;
    }
    const tools = this.auxiliary;
    if (tools && tools.under === active && tools.underPhase === phaseOf(active) && tools.phase === phaseOf(tools.root) &&
        tools.root.matches(MODE_TOOLS) && visible(tools.root)) {
      active = tools.root;
    } else this.auxiliary = undefined;
    const under = active;
    for (const node of this.portals) {
      const anchor = node.popoverAnchor;
      if (!node.hasAttribute("data-pad-placed") || !anchor?.isConnected || !visible(node) ||
          anchor.closest(BLOCKED) || (under && !under.contains(anchor))) continue;
      if (active === under || (active!.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING)) active = node;
    }
    const phase = phaseOf(active);
    if (active !== previous || phase !== this.phase) {
      this.active = active;
      this.phase = phase;
      if (this.connected) this.reset();
      if (active !== previous) {
        this.clearRing();
        const launch = this.launch;
        if (!this.pending && active && launch && active !== launch.parent && performance.now() - launch.at < 1500 &&
            (!launch.owner || policy(active).rank > policy(launch.owner).rank || !visible(launch.owner))) {
          // A scenario can mount its intro and conversation together. The conversation owns that return.
          const convo = kind(active) === "intro" ? active.closest<HTMLElement>(".convo") : null;
          this.returns.set(convo && convo !== launch.parent ? convo : active, launch);
          this.launch = undefined;
        }
      }
    }
    if (this.connected && this.pending && this.pending.from !== active) {
      const restore = this.pending;
      this.pending = undefined;
      this.restore(restore);
    } else if (this.connected && this.opening && active?.dataset.padScope === "drawer") {
      this.opening = false;
      const key = this.toolbarReturn;
      this.toolbarReturn = undefined;
      const target = this.toolbarTarget(active, key);
      if (!target || !this.focus(active, target)) this.focusFirst(active);
    }
    this.notice.layout();
  }

  private clearRing() {
    this.endEdit();
    this.focused?.removeAttribute("data-pad-focus");
    this.focused = undefined;
    this.debug.focusTarget = null;
  }

  private endEdit() {
    this.edit?.target.removeAttribute("data-pad-adjusting");
    this.edit = undefined;
  }

  private physical = (event: Event) => {
    if (!event.isTrusted) return;
    this.clearRing();
    this.launch = this.pending = undefined;
    if (this.auxiliary?.root === this.active) this.leaveAuxiliary(false);
    if (this.desktop && this.active?.matches(TOOLBAR)) {
      this.desktop = false;
      this.refresh();
    }
  };

  private origin(target: HTMLElement, owner: HTMLElement | null = this.active): Origin {
    return { target, owner, parent: owner?.closest(".convo, .overlay") ?? owner, key: identity(target), at: performance.now() };
  }

  private clicked = (event: Event) => {
    if (!event.isTrusted || !(event.target instanceof Element)) return;
    const target = event.target.closest(CONTROL);
    if (available(target) && !target.matches(BACK)) this.launch = this.origin(target);
  };

  private compositionStarted = () => { this.composing = true; };
  private compositionEnded = () => { this.composing = false; };

  private focusedIn = (event: FocusEvent) => {
    this.readField(event.target);
    if (this.active && available(document.activeElement) && this.owns(this.active, document.activeElement)) {
      this.last.set(this.active, document.activeElement);
    }
  };

  private focusedOut = (event: FocusEvent) => {
    this.clearRing();
    this.readField(event.relatedTarget);
  };

  private readField(target: EventTarget | null) {
    const field = target instanceof HTMLElement && !!target.closest(TYPING);
    if (field === this.lastField) return;
    this.lastField = field;
    this.composing = false;
    this.reset();
  }

  private isTools(root: HTMLElement) { return root.matches(`${TOOLBAR}, [data-pad-scope=drawer]`); }

  private owns(root: HTMLElement, item: HTMLElement) {
    if (root.matches(PORTAL)) return root.contains(item);
    if (root.matches(MODE_TOOLS)) return root.contains(item) && item.matches(AUXILIARY);
    if (root.dataset.padScope === "convo" && item.closest(".view-chip")) return true;
    const nearest = item.closest(ROOTS);
    if (nearest === root) return true;
    if (!this.isTools(root) || !root.closest(".hud")?.contains(item)) return false;
    if (item.closest(".toolbar") === root.closest(".toolbar") && !item.closest(".ride-menu")) return true;
    return !nearest && item.matches(AUX);
  }

  private controls(root: HTMLElement) {
    const host = this.isTools(root) ? root.closest(".hud") ?? root : root;
    const controls = Array.from(host.querySelectorAll<HTMLElement>(CONTROL));
    if (root.dataset.padScope === "convo") {
      const view = this.app?.querySelector<HTMLElement>(".view-chip button");
      if (view) controls.push(view);
    }
    return controls.filter((el) => {
      if (!this.owns(root, el) || !available(el)) return false;
      if (el.matches(SCROLL) && el.scrollHeight <= el.clientHeight + 1 && el.scrollWidth <= el.clientWidth + 1) return false;
      const box = visibleBox(el);
      return !box || hit(el, box);
    });
  }

  private focus(root: HTMLElement, target: HTMLElement, owns = true) {
    if (!available(target) || (owns && !this.owns(root, target))) return false;
    scrollNear(target);
    const box = visibleBox(target);
    if (!box || !hit(target, box)) return false;
    // The native focus-opener stays active for physical keyboard focus. Pad users open it with A.
    const quiet = target.hasAttribute("data-pad-focus-opens");
    if (quiet) target.addEventListener("focusin", openingFocus);
    target.focus({ preventScroll: true });
    if (quiet) target.removeEventListener("focusin", openingFocus);
    if (document.activeElement !== target) return false;
    if (this.focused !== target) this.clearRing();
    this.focused = target;
    this.bubble = target.matches(".street-bubble") ? target : undefined;
    target.setAttribute("data-pad-focus", "");
    this.last.set(root, target);
    this.debug.focusTarget = focusId(root, target);
    // (a board that keeps its own cursor, the Lotería's, follows the controller's focus, and only the controller's)
    target.dispatchEvent(new Event("padfocus", { bubbles: true }));
    if (kind(root) === "drawer") root.closest(".toolbar")?.dispatchEvent(new Event("padnavigate"));
    return true;
  }

  private default(root: HTMLElement, items: HTMLElement[]) {
    const safe = items.filter((item) => !item.matches(NOT_DEFAULT));
    const selector = policy(root).first;
    return items.find((item) => item.matches(DEFAULT)) ?? (selector && safe.find((item) => item.matches(selector))) ??
      safe.find((item) => item.matches(ANSWER)) ?? safe[0];
  }

  private focusFirst(root: HTMLElement) {
    const items = this.controls(root);
    for (const target of [this.default(root, items), ...items]) {
      if (target && this.focus(root, target)) return true;
    }
    return false;
  }

  private restore({ origin, direction }: Restore) {
    const root = this.active;
    const target = origin?.target;
    let launcher = origin;
    while (!root && launcher?.owner) {
      if (this.isTools(launcher.owner) && this.openToolbar(launcher.key)) return;
      launcher = this.returns.get(launcher.owner);
    }
    if (!root && target && available(target) && target.matches(OPENER)) {
      this.focus(target, target, false);
      return;
    }
    if (!root || this.editingText) return;
    const items = this.controls(root);
    const anchor = target && items.includes(target) ? target :
      origin ? items.find((item) => identity(item) === origin.key) : undefined;
    const last = this.last.get(root);
    const fallback = anchor ?? (last && items.includes(last) ? last : this.default(root, items));
    if (direction && fallback && this.move(root, items, fallback, direction)) return;
    if (fallback) this.focus(root, fallback);
  }

  private move(root: HTMLElement, items: HTMLElement[], current: Element | null, direction: Direction) {
    const index = items.indexOf(current as HTMLElement);
    if (index < 0) {
      const target = this.default(root, items) ?? items.find((item) => !item.hasAttribute("data-pad-no-default"));
      return !!target && this.focus(root, target);
    }
    const backwards = direction === "up" || direction === "left";
    const step = backwards ? -1 : 1;
    const grid = this.isTools(root) ? root : items[index].closest(GRID);
    if (grid?.matches('[data-pad-grid="loteria"]')) {
      const cells = Array.from(grid.querySelectorAll<HTMLElement>(".loteria-cell[data-card]"));
      const cell = cells.indexOf(items[index]);
      const horizontal = direction === "left" || direction === "right";
      const row = Math.floor(cell / 4);
      for (let i = cell + (horizontal ? step : step * 4); i >= 0 && i < cells.length; i += horizontal ? step : step * 4) {
        if (horizontal && Math.floor(i / 4) !== row) break;
        if (items.includes(cells[i]) && this.focus(root, cells[i])) return true;
      }
      if (horizontal) return false;
      for (let i = index + step; i >= 0 && i < items.length; i += step) {
        if (!grid.contains(items[i]) && this.focus(root, items[i])) return true;
      }
      return false;
    }
    const geometric = grid && neighbor(items[index], this.isTools(root) ? items : items.filter((item) => item.closest(GRID) === grid), direction);
    if (geometric && this.focus(root, geometric)) return true;
    const adjacent = items[index + step];
    if (grid && !this.isTools(root) && adjacent?.closest(GRID) === grid &&
        (direction === "left" || direction === "right")) return false;
    // DOM order bridges separate grids and lets a one-column list reach its ancillary actions.
    for (let i = index + step; i >= 0 && i < items.length; i += step) {
      if (this.focus(root, items[i])) return true;
    }
    return false;
  }

  navigate(direction: Direction) {
    const root = this.active;
    if (!root || this.editingText) return;
    if (document.activeElement?.matches(ADJUST) && document.activeElement !== this.focused) return;
    if (this.edit && this.owns(root, this.edit.target) && available(this.edit.target)) {
      const previous = this.edit.target instanceof HTMLSelectElement ? "up" : "down";
      setWidget(this.edit.target, direction === "left" || direction === previous ? -1 : 1);
      this.notice.layout();
    } else if (kind(root) === "tooltip") {
      this.closePortal(root, direction);
    } else if (this.scroll(direction)) {
      this.debug.lastAction = "focus";
    } else if (this.move(root, this.controls(root), document.activeElement, direction)) {
      this.debug.lastAction = "focus";
      this.notice.layout();
    }
  }

  /** A focused scrolling region moves its own text along the pressed axis; at its end the D-pad leaves it again. */
  private scroll(direction: Direction) {
    const region = this.focused;
    if (!region?.matches(SCROLL) || region !== document.activeElement) return false;
    const vertical = direction === "up" || direction === "down", sign = direction === "up" || direction === "left" ? -1 : 1;
    const before = vertical ? region.scrollTop : region.scrollLeft;
    const room = vertical ? region.scrollHeight - region.clientHeight : region.scrollWidth - region.clientWidth;
    if (room <= 1 || (sign < 0 ? before <= 0 : before >= room - 1)) return false;
    const by = Math.max(24, (vertical ? region.clientHeight : region.clientWidth) * 0.6) * sign;
    region.scrollBy(vertical ? { top: by } : { left: by });
    return true;
  }

  confirm() {
    const root = this.active;
    if (!root || this.editingText) return;
    const items = this.controls(root), current = document.activeElement;
    const target = current instanceof HTMLElement && items.includes(current) &&
      (current === this.focused || !current.matches(NOT_DEFAULT)) ? current : this.default(root, items);
    if (!target || !this.focus(root, target)) return;
    this.sync();
    if (this.active !== root || !this.owns(root, target) || !available(target)) return;
    const box = visibleBox(target);
    if (!box || !hit(target, box)) return;
    this.debug.lastAction = "confirm";
    if (target.matches(ADJUST)) {
      if (this.edit) this.endEdit();
      else {
        this.edit = { target: target as Widget, value: (target as Widget).value };
        target.setAttribute("data-pad-adjusting", "");
      }
      return;
    }
    if (target.matches(CLOSE)) this.prepareReturn(root, target);
    else this.launch = this.origin(target);
    target.click();
    this.sync();
    this.notice.layout();
  }

  back(fallback?: (surface: string) => boolean) {
    const root = this.active;
    if (!root || this.composing) return;
    if (this.closePortal(root)) return;
    if (this.edit) {
      const { target, value } = this.edit;
      this.endEdit();
      if (available(target) && this.owns(root, target)) setWidget(target, value);
      this.debug.lastAction = "back";
      return;
    }
    if (this.lastField && kind(root) === "convo") {
      const items = this.controls(root);
      const target = items.find((item) => item.matches(`${ANSWER}, .guide .chip`)) ??
        items.find((item) => item.matches(".guide-toggle, .audio-recovery .link-btn, .type-toggle"));
      if (target && this.focus(root, target)) this.debug.lastAction = "back";
      return;
    }
    if (this.lastField && kind(root) !== "info" && kind(root) !== "native-modal") return;
    if (this.auxiliary?.root === root) {
      this.leaveAuxiliary();
      this.debug.lastAction = "back";
      return;
    }
    let target: Element | null | undefined;
    if (kind(root) === "drawer") {
      // Back from the phone's drawer folds it and returns to play, as Maple Harbor does (not to its opener)
      const focused = this.focused;
      this.leaveTools();
      this.clearRing();
      if (focused && focused === document.activeElement) focused.blur();
      this.pending = this.launch = undefined;
      this.debug.lastAction = "back";
      this.sync();
      return;
    } else {
      const selector = policy(root).back;
      target = this.controls(root).find((item) => item.matches(BACK));
      if (!target && selector) target = root.querySelector(selector) ?? root.closest(".convo")?.querySelector(selector);
    }
    if (kind(root) === "toolbar") {
      this.leaveTools();
      this.debug.lastAction = "back";
    } else if (target && available(target)) {
      scrollNear(target);
      const box = visibleBox(target);
      if (!box || !hit(target, box)) return;
      this.prepareReturn(root, target);
      this.debug.lastAction = "back";
      target.click();
      this.sync();
    } else if (fallback) {
      this.prepareReturn(root);
      if (fallback(kind(root))) this.debug.lastAction = "back";
      else this.pending = undefined;
    }
  }

  private leaveTools() {
    const root = this.active;
    if (!root || !this.isTools(root)) return;
    this.bubble = undefined;
    if (kind(root) === "drawer") {
      const menu = this.menuButton();
      if (available(menu) && menu.getAttribute("aria-expanded") === "true") menu.click();
    } else {
      this.desktop = false;
      const target = this.focused;
      this.clearRing();
      if (target === document.activeElement) target?.blur();
      this.refresh();
    }
  }

  private leaveAuxiliary(restoreFocus = true) {
    const tools = this.auxiliary;
    if (!tools) return;
    this.auxiliary = undefined;
    const target = document.activeElement;
    if (target instanceof HTMLElement && this.owns(tools.root, target)) target.blur();
    this.refresh();
    if (restoreFocus && this.active) this.restore({ from: tools.root });
  }

  private prepareReturn(root: HTMLElement, target?: HTMLElement) {
    const name = kind(root);
    const parent = name === "ended" ? root.closest<HTMLElement>(".convo") ?? root : root;
    let origin = this.returns.get(parent);
    if (name === "drawer" && target) origin = this.origin(target, null);
    if (name === "info") {
      const launcher = root.parentElement?.querySelector<HTMLElement>("[data-pad-focus-opens]");
      if (launcher) origin = this.origin(launcher, root.closest(".convo"));
    }
    this.pending = { from: root, origin };
    this.returns.delete(parent);
    this.launch = undefined;
  }

  private closePortal(root: PopoverElement, direction?: Direction) {
    const anchor = root.popoverAnchor;
    if (!anchor || !root.popoverClose) return false;
    const owner = this.auxiliary?.root.contains(anchor) ? this.auxiliary.root : anchor.closest<HTMLElement>(ROOTS);
    const target = anchor.closest<HTMLElement>(CONTROL) ?? anchor;
    this.pending = { from: root, origin: this.origin(target, owner), direction };
    this.launch = undefined;
    this.debug.lastAction = "back";
    root.popoverClose();
    this.sync();
    return true;
  }

  private menuButton() { return this.app?.querySelector<HTMLButtonElement>(OPENER) ?? null; }

  private openToolbar(restoreKey?: string) {
    const menu = this.menuButton();
    if (available(menu) && menu.getAttribute("aria-expanded") === "false") {
      this.opening = true;
      this.toolbarReturn = restoreKey;
      menu.click();
      this.sync();
      return true;
    }
    const toolbar = this.app?.querySelector<HTMLElement>(TOOLBAR);
    if (!toolbar || !visible(toolbar)) return false;
    this.desktop = true;
    this.refresh();
    const target = this.toolbarTarget(toolbar, restoreKey);
    if (!target || !this.focus(toolbar, target)) this.focusFirst(toolbar);
    return true;
  }

  private toolbarTarget(root: HTMLElement, key?: string) {
    const items = this.controls(root);
    return key ? items.find((item) => identity(item) === key) :
      items.find((item) => item.matches(".photo-chip[data-near], .cave-guide [data-guide]")) ??
      items.find((item) => item.matches(".cave-toggle"));
  }

  menu(playable: boolean) {
    if (this.editingText) return false;
    const root = this.active;
    if (root && this.auxiliary?.root === root) { this.leaveAuxiliary(); return true; }
    const tools = root ? root.hasAttribute("data-pad-menu") && root.closest<HTMLElement>(MODE_TOOLS) :
      playable ? this.app?.querySelector<HTMLElement>(MODE_TOOLS) : null;
    if (tools && this.controls(tools).length) {
      this.auxiliary = { root: tools, under: root, phase: phaseOf(tools), underPhase: phaseOf(root) };
      this.refresh();
      this.focusFirst(tools);
      return true;
    }
    if (!root) return playable && this.openToolbar();
    if (this.isTools(root)) { this.back(); return true; }
    if (kind(root) === "home") {
      const tool = this.controls(root).find((item) => item.closest(".lh-tools"));
      if (tool) this.focus(root, tool);
      return true;
    }
    return false;
  }

  interact() {
    const chip = this.app?.querySelector<HTMLButtonElement>(".photo-chip[data-near]");
    if (!available(chip || null) || !chip) return false;
    const box = visibleBox(chip);
    if (!box || !hit(chip, box)) return false;
    chip.click();
    return true;
  }
}

const WORLD_MAP = [["L", "move"], ["R", "look"], ["A", "jump"], ["X", "interact"]] as const;
const MENU_MAP = [["✚/L", "move"], ["A", "choose"], ["B", "back"]] as const;
const MENU_GLYPH = "☰";
const NOTES = ".objective-card, .zone-banner, .coach, .town-toasts, .directions-card, .text-arrival, .cave-card";
const OBSTACLES = ".toolbar, .toolbar-drawer:not([inert]), .joy, .jump-btn, .act-btn, .drive-horn, .prompt, .photo-chip, .view-chip, .lh-tools, .street-bubble, .minimap, .radio-strip, .ride-keys, .toasts, .lc-center, .phone-ring, .surf-pad";
const NOTICE_ANCHORS = `${NOTES}, ${OBSTACLES}, ${ROOTS}`;
type Obstacle = { box: DOMRect; gap: number };
const sameBox = (a: DOMRect, b: DOMRect | null | undefined) => !!b && a.left === b.left && a.top === b.top && a.right === b.right && a.bottom === b.bottom;
/** The narrower card for a crowded phone screen (CSS px). */
const COMPACT = 160;

class PadNotice {
  private app?: HTMLElement;
  private node?: HTMLElement;
  private title?: HTMLElement;
  private legend?: HTMLElement;
  private slot?: HTMLElement;
  private timer?: ReturnType<typeof setTimeout>;
  private resize?: ResizeObserver;
  private measured = new Set<Element>();
  private menu?: boolean;
  private state?: State;
  private fontChange?: MutationObserver;
  /** The last in-flow attempt that did not fit: not retried until the host or the viewport changes size. */
  private noFlow?: { host: HTMLElement; key: string };

  constructor(private surface: () => HTMLElement | null, private avatar?: () => DOMRect | undefined) {}

  get visible() { return !!this.node; }

  /** The card or its in-flow slot. */
  owns(node: Node) { return !!node && (node === this.node || node === this.slot); }

  /** A child-list record that only moved the card's own nodes. */
  only(record: MutationRecord) {
    const { addedNodes: added, removedNodes: removed } = record;
    if (!added.length && !removed.length) return false;
    for (let i = 0; i < added.length; i++) if (!this.owns(added[i])) return false;
    for (let i = 0; i < removed.length; i++) if (!this.owns(removed[i])) return false;
    return true;
  }

  show(app: HTMLElement, state: State, done: () => void) {
    this.app = app;
    clearTimeout(this.timer);
    if (!this.node) {
      const node = this.node = document.createElement("div");
      node.lang = EDITION.helper;
      node.setAttribute("role", "status");
      node.setAttribute("aria-live", "polite");
      node.setAttribute("aria-atomic", "true");
      this.title = document.createElement("strong");
      this.legend = document.createElement("div");
      this.legend.className = "pad-hint-map";
      this.legend.setAttribute("aria-hidden", "true");
      node.append(this.title, this.legend);
      document.body.append(node);
      this.resize = new ResizeObserver(this.layout);
      this.fontChange = new MutationObserver(this.layout);
      this.fontChange.observe(document.documentElement, { attributeFilter: ["style"] });
      document.fonts?.addEventListener("loadingdone", this.layout);
      app.addEventListener("scrollend", this.layout, true);
      app.addEventListener("transitionend", this.layoutEvent);
      app.addEventListener("animationend", this.layoutEvent);
      window.visualViewport?.addEventListener("resize", this.layout);
    }
    this.state = state;
    this.node.dataset.padHint = state;
    this.layout();
    const title = this.title!;
    queueMicrotask(() => {
      if (this.title === title && this.state === state && title.textContent !== PAD_LINES[state].nat) {
        title.textContent = PAD_LINES[state].nat;
        this.layout();
      }
    });
    this.timer = setTimeout(() => { this.remove(); done(); }, state === "connected" ? 3200 : 2400);
  }

  remove() {
    clearTimeout(this.timer);
    this.resize?.disconnect();
    this.fontChange?.disconnect();
    this.measured.clear();
    this.slot?.remove();
    this.node?.remove();
    this.app?.removeEventListener("scrollend", this.layout, true);
    this.app?.removeEventListener("transitionend", this.layoutEvent);
    this.app?.removeEventListener("animationend", this.layoutEvent);
    document.fonts?.removeEventListener("loadingdone", this.layout);
    window.visualViewport?.removeEventListener("resize", this.layout);
    this.node = this.title = this.legend = this.slot = this.app = undefined;
    this.menu = this.state = this.noFlow = undefined;
  }

  private layoutEvent = (event: Event) => {
    if (event.target instanceof HTMLElement && event.target.matches(NOTICE_ANCHORS)) this.layout();
  };

  private observe(elements: HTMLElement[]) {
    const next = new Set<Element>(elements);
    for (const el of this.measured) if (!next.has(el)) this.resize?.unobserve(el);
    for (const el of next) if (!this.measured.has(el)) this.resize?.observe(el);
    this.measured = next;
  }

  private updateMap(menu: boolean) {
    if (this.menu === menu) return;
    this.menu = menu;
    const legend = this.legend!;
    legend.replaceChildren();
    for (const [glyph, key] of menu ? MENU_MAP : WORLD_MAP) {
      const item = document.createElement("span"), cap = document.createElement("b");
      cap.textContent = glyph;
      item.append(cap, PAD_LINES[key].nat);
      legend.append(item);
    }
    if (menu) {
      const cap = document.createElement("b");
      cap.textContent = MENU_GLYPH;
      legend.append(cap);
    }
  }

  layout = () => {
    const { node, app } = this;
    if (!node || !app) return;
    const active = this.surface();
    const name = active ? kind(active) : "";
    this.updateMap(!!active);
    const portrait = matchMedia("(max-width:600px) and (orientation:portrait)").matches;
    const world = !name || ["toolbar", "drawer", "street", "phone-ring"].includes(name);
    const notes = Array.from(app.querySelectorAll<HTMLElement>(NOTES)).filter(visible);
    const hud = Array.from(app.querySelectorAll<HTMLElement>(OBSTACLES)).filter(visible);
    const anchor = (active as PopoverElement | null)?.popoverAnchor;
    const context = anchor ?? active;
    const convo = context?.closest<HTMLElement>(".convo");
    const panel = context?.closest<HTMLElement>(".overlay")?.querySelector<HTMLElement>(".sheet, .phone");
    const flow = active && policy(active).flow;
    const slotHost = convo?.querySelector<HTMLElement>(".convo-tools") ?? panel ??
      (flow && active ? active.matches(flow) ? active : active.querySelector<HTMLElement>(flow) : null);
    const margin = convo ?? panel ?? (!world && name !== "home" ? active : null);
    node.style.removeProperty("max-width");
    const status = node.getBoundingClientRect();
    const inset = portrait ? 8 : 12;
    // The device's own safe area (notch, home bar) on each side, then the 8 px phone / 12 px desktop margin.
    const safe = getComputedStyle(node);
    const edge = (side: string) => inset + (parseFloat(safe.getPropertyValue(`--pad-safe-${side}`)) || 0);
    const top = edge("top"), right = edge("right"), bottom = edge("bottom"), left = edge("left");
    const width = Math.min(document.documentElement.clientWidth, window.visualViewport?.width ?? innerWidth);
    const height = Math.min(innerHeight, window.visualViewport?.height ?? innerHeight);
    const av = !panel && this.avatar?.();
    const obstacles = (elements: HTMLElement[], gap = 8) => elements.flatMap((el) => {
      const box = visibleBox(el);
      return box ? [{ box, gap }] : [];
    });
    const cover = [...obstacles(hud), ...obstacles(notes, world && portrait ? 6 : 8)];
    if (av) cover.push({ box: av, gap: 8 });
    const visibleChoices = () => {
      const parent = convo ?? panel ?? active;
      if (!parent) return [];
      const selector = `${CONTROL}, input, textarea`;
      const items = Array.from(parent.querySelectorAll<HTMLElement>(selector));
      if (active && !parent.contains(active)) items.push(...active.querySelectorAll<HTMLElement>(selector));
      return items.filter(visible);
    };
    const separate = anchor && active && active !== margin ? [active] : [];
    this.observe([...notes, ...hud, node, ...separate, ...(margin && margin !== slotHost && !margin.contains(slotHost) ? [margin] : [])]);
    const fits = (x: number, y: number, w: number, h: number, boxes: Obstacle[]) =>
      w > 0 && h > 0 && x >= left && y >= top && x + w <= width - right && y + h <= height - bottom &&
      boxes.every(({ box, gap }) => x >= box.right + gap || x + w <= box.left - gap ||
        y >= box.bottom + gap || y + h <= box.top - gap);
    const place = (x: number, y: number, placement: string) => {
      // Unchanged geometry writes nothing (no style churn for the observers to see).
      const l = `${x}px`, t = `${y}px`;
      if (node.style.left !== l) node.style.left = l;
      if (node.style.top !== t) node.style.top = t;
      if (node.dataset.padPlacement !== placement) node.dataset.padPlacement = placement;
      if (!node.hasAttribute("data-pad-positioned")) node.setAttribute("data-pad-positioned", "");
    };
    const size = { w: status.width, h: status.height };
    const fixed = (boxes: Obstacle[], preferred?: { left: number; top: number }) => {
      const { w, h } = size;
      if (preferred && fits(preferred.left, preferred.top, w, h, boxes)) {
        place(preferred.left, preferred.top, "notes");
        return true;
      }
      const xs = [left, width - right - w, ...boxes.flatMap(({ box, gap }) => [box.right + gap, box.left - gap - w])];
      const ys = portrait ? [top, height - bottom - h] : [height - bottom - h, top];
      ys.push(...boxes.flatMap(({ box, gap }) => [box.bottom + gap, box.top - gap - h]));
      for (const y of ys) for (const x of xs) if (fits(x, y, w, h, boxes)) {
        place(x, y, "fixed");
        return true;
      }
      return false;
    };
    const below = world && portrait && notes.length ? {
      left: Math.max(left, Math.min(...notes.map((el) => el.getBoundingClientRect().left))),
      top: Math.max(...notes.map((el) => el.getBoundingClientRect().bottom)) + 6,
    } : undefined;
    const margins = margin && visible(margin) ? [margin, ...separate] : separate;
    const clearSurface = cover.concat(obstacles(margins));
    if (!this.slot?.isConnected && name !== "home" && fixed(clearSurface, below)) return;
    const flowKey = slotHost ? `${width}x${height}:${slotHost.clientWidth}:${status.width}x${status.height}` : "";
    const retry = !this.noFlow || this.noFlow.host !== slotHost || this.noFlow.key !== flowKey;
    if (slotHost && visible(slotHost) && (retry || this.slot?.parentElement === slotHost)) {
      const slot = this.useSlot(slotHost);
      const width = Math.min(status.width, slot.getBoundingClientRect().width);
      node.style.maxWidth = `${width}px`;
      const height = node.getBoundingClientRect().height;
      const tall = `${height}px`;
      if (slot.style.height !== tall) slot.style.height = tall;
      const box = visibleBox(slot);
      const choices = obstacles(visibleChoices(), 2).concat(obstacles(separate));
      if (box && fits(box.left, box.top, width, height, panel ? choices : cover.concat(choices))) {
        this.noFlow = undefined;
        place(box.left, box.top, "flow");
        return;
      }
      this.noFlow = { host: slotHost, key: flowKey };
    }
    this.slot?.remove();
    node.style.removeProperty("max-width");
    if (fixed(name === "home" ? cover.concat(obstacles(visibleChoices())) : clearSurface, below)) return;
    if (active && fixed(cover.concat(obstacles(visibleChoices())))) return;
    // A crowded phone screen (street chatter, the task card, the thumb controls) may have no room for the full width:
    // the same card, narrower, with its map on two lines, before waiting for room.
    if (portrait && world) {
      node.style.maxWidth = `${COMPACT}px`;
      const compact = node.getBoundingClientRect();
      size.w = compact.width;
      size.h = compact.height;
      if (fixed(clearSurface, below)) return;
      node.style.removeProperty("max-width");
      // Still no room (130 % text with the task card open): the short-lived notice may sit over the task card's text,
      // never over its buttons, the other controls or the avatar (owner, 25 Nov 2026).
      const task = notes.filter((el) => el.matches(".objective-card"));
      if (task.length) {
        const overTask = cover.filter(({ box }) => !task.some((el) => sameBox(box, visibleBox(el))))
          .concat(obstacles(task.flatMap((el) => Array.from(el.querySelectorAll<HTMLElement>("button, a[href]")).filter(visible)), 6));
        size.w = status.width;
        size.h = status.height;
        if (fixed(overTask)) return;
        node.style.maxWidth = `${COMPACT}px`;
        const narrow = node.getBoundingClientRect();
        size.w = narrow.width;
        size.h = narrow.height;
        if (fixed(overTask)) return;
        node.style.removeProperty("max-width");
      }
    }
    // Keep the live region available during transient animations even when no safe box fits yet.
    node.removeAttribute("data-pad-positioned");
  };

  private useSlot(host: HTMLElement) {
    let slot = this.slot;
    if (!slot) {
      slot = this.slot = document.createElement("div");
      slot.dataset.padSlot = "";
      slot.setAttribute("aria-hidden", "true");
    }
    if (slot.parentElement !== host) {
      const heading = host.querySelector(":scope > :is(.sheet-head, .phone-status, .text-thread-head, .convo-head, header, h2)");
      host.insertBefore(slot, heading ? heading.nextSibling : host.firstChild);
    }
    return slot;
  }
}
