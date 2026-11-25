import { PAD_LINES } from "../content/gamepad";
import type { PadDebug } from "../game/gamepad";
import { padPopovers } from "./padPopover";
import "./gamepad.css";

const SCOPE = "[data-pad-scope]";
const CONTROL = "button, a[href], summary";
const BLOCKED = "[inert], [hidden], [aria-hidden=true]";
const UNAVAILABLE = ":disabled, [aria-disabled=true], [data-pad-skip], .bl-power-track, .taxi-action";
const BACK = "[data-pad-back]";
const DEFAULT = "[data-pad-default]";
const AUXILIARY = "button[data-pad-aux], [data-pad-aux] button";
const NOTES = ".objective-notes";
const GRIDS = ".scn-grid, .lh-grid, .toolbar, .barista-chips, .gofish-hand, .gofish-opponents, .bl-ball-chips, .word-gate-ways, .road-choices, .surf-levels, .lh-tools";
const ANSWERS = "[data-pad-answer], .dym-opt";
const MEETING_ANSWERS = "[data-meeting-answer]";
const FOCUS_OPENS = "[data-pad-focus-opens]";

interface Surface {
  priority: number;
  first?: string;
  back?: string;
  slot?: string;
}

const surfaces: Record<string, Surface> = {
  popover: { priority: 110 },
  tooltip: { priority: 110 },
  intro: { priority: 100, first: DEFAULT },
  thread: { priority: 90, first: ".text-replies button, .text-bubble", slot: ".text-thread" },
  panel: { priority: 80, first: ".scn-card[data-sit], .contact", slot: ".sheet, .phone" },
  info: { priority: 78, first: DEFAULT },
  ended: { priority: 75, first: ".ended-destination button, .ended-main button, button[class$='-cta'], .sit-actions button", back: ".convo [data-pad-back]" },
  convo: { priority: 70, first: ANSWERS + ", .guide .chip" },
  score: { priority: 65, first: DEFAULT },
  "photo-confirm": { priority: 65, first: DEFAULT, slot: ".photo-book" },
  "surf-picker": { priority: 60, first: ".surf-level" },
  "surf-choices": { priority: 60, first: ".surf-choice", back: ".surf-x" },
  taxi: { priority: 60, first: ".taxi-choice", back: ".mode-hud .mode-exit", slot: ".taxi-choices" },
  meeting: { priority: 60, first: MEETING_ANSWERS },
  "road-offer": { priority: 60, first: ".road-choice" },
  "road-status": { priority: 60 },
  "sea-status": { priority: 60 },
  "word-setup": { priority: 60, first: DEFAULT },
  "barista-offer": { priority: 60 },
  "gofish-offer": { priority: 60, first: "button:not([data-pad-back])" },
  barista: { priority: 60, first: ".barista-choice, .barista-chip, .barista-give button, .barista-listen-actions button", slot: ".barista-header" },
  gofish: { priority: 60, first: ".gofish-card, .gofish-choice, .gofish-fish, [data-target]", slot: ".gofish-header" },
  billiards: { priority: 60, first: ".bl-ball-option, .bl-choice", slot: ".bl-header" },
  photo: { priority: 60, first: "[data-choice], .photo-choices [data-line], .photo-quiz > button" },
  radio: { priority: 50, back: ".rs-x", slot: ".radio-set" },
  "phone-ring": { priority: 50, first: ".phone-ring-actions .btn:not(.soft)", back: ".phone-ring-actions .soft" },
  street: { priority: 50, first: ".street-choice", back: ".street-head button" },
  drawer: { priority: 20, first: "[data-pad-tool=scenarios]" },
  toolbar: { priority: 20, first: "[data-pad-tool=scenarios]" },
  auxiliary: { priority: 20 },
  home: { priority: 10, first: ".lh-card[data-sit]", slot: ".lh-in" },
};
const EXTRA_SCOPES = ".radio-set, .phone-ring, .street-card";
const ROOTS = SCOPE + ", " + EXTRA_SCOPES;
const HUD_CONTROLS = ".toolbar, .joy, .jump-btn, .act-btn, .drive-horn, .prompt, .view-chip";

const WORLD_MAP = [["L", "move"], ["R", "look"], ["A", "jump"], ["X", "interact"]] as const;
const MENU_MAP = [["✚/L", "move"], ["A", "choose"], ["B", "back"]] as const;

type Direction = "up" | "down" | "left" | "right";
type Launcher = { target: HTMLElement; from: HTMLElement; at: number };
type OverlayReturn = { root: HTMLElement; anchor: HTMLElement; direction?: Direction };

function control(el: Element | null): el is HTMLElement {
  return !!el && el instanceof HTMLElement && el.matches(CONTROL) && !el.matches(UNAVAILABLE) && !el.closest(BLOCKED) && el.isConnected;
}

function visible(el: HTMLElement) {
  return el.getClientRects().length > 0 && getComputedStyle(el).visibility === "visible";
}

export function textEntry(el: Element | null): boolean {
  const field = el as HTMLElement | null;
  return !!field && (field.isContentEditable || field.tagName === "INPUT" || field.tagName === "TEXTAREA" || field.tagName === "SELECT");
}

function gridNeighbor(current: HTMLElement, controls: HTMLElement[], direction: Direction, grid: Element) {
  const from = current.getBoundingClientRect();
  const vertical = direction === "up" || direction === "down";
  const sign = direction === "up" || direction === "left" ? -1 : 1;
  let best: HTMLElement | undefined, distance = Infinity;
  for (const item of controls) {
    if (item === current || item.closest(GRIDS) !== grid) continue;
    const to = item.getBoundingClientRect();
    const x = (to.left + to.right - from.left - from.right) / 2;
    const y = (to.top + to.bottom - from.top - from.bottom) / 2;
    const forward = (vertical ? y : x) * sign;
    if (forward <= 2 || Math.abs(vertical ? x : y) > forward * 1.25) continue;
    const d = Math.hypot(x, y);
    if (d < distance || (d === distance && best && (item.compareDocumentPosition(best) & Node.DOCUMENT_POSITION_FOLLOWING))) {
      best = item;
      distance = d;
    }
  }
  return best;
}

function trayNeighbor(current: HTMLElement, controls: HTMLElement[], direction: Direction) {
  const row = current.closest("[data-row]");
  const tray = row?.parentElement;
  const from = current.getBoundingClientRect();
  const sign = direction === "up" ? -1 : 1;
  let best: HTMLElement | undefined, vertical = Infinity, horizontal = Infinity;
  for (const item of controls) {
    if (!tray?.contains(item) || item.closest("[data-row]") === row) continue;
    const to = item.getBoundingClientRect();
    const y = (to.top + to.bottom - from.top - from.bottom) * sign;
    const x = Math.abs(to.left + to.right - from.left - from.right);
    if (y > 4 && (y < vertical || (y === vertical && x < horizontal))) {
      best = item;
      vertical = y;
      horizontal = x;
    }
  }
  return best;
}

function overlaps(left: number, top: number, width: number, height: number, box: DOMRect, gap = 8) {
  return left < box.right + gap && left + width > box.left - gap &&
    top < box.bottom + gap && top + height > box.top - gap;
}

function scrollNear(target: HTMLElement, scope: HTMLElement) {
  let needX = true, needY = true;
  for (let parent = target.parentElement; parent; parent = parent.parentElement) {
    const style = getComputedStyle(parent);
    const x: boolean = needX && /auto|scroll/.test(style.overflowX) && parent.scrollWidth > parent.clientWidth;
    const y: boolean = needY && /auto|scroll/.test(style.overflowY) && parent.scrollHeight > parent.clientHeight;
    if (x || y) {
      const box = target.getBoundingClientRect(), bounds = parent.getBoundingClientRect();
      const left = bounds.left + parent.clientLeft + 4, top = bounds.top + parent.clientTop + 4;
      const right = left + parent.clientWidth - 8, bottom = top + parent.clientHeight - 8;
      let dx = 0, dy = 0;
      if (x && box.left < left) dx = box.left - left;
      else if (x && box.right > right) dx = box.right - right;
      if (y && box.top < top) dy = box.top - top;
      else if (y && box.bottom > bottom) dy = box.bottom - bottom;
      if (dx || dy) parent.scrollBy({ left: dx, top: dy, behavior: "instant" });
      needX &&= !x;
      needY &&= !y;
    }
    if (parent === scope || (!needX && !needY)) break;
  }
}

function label(target: HTMLElement) {
  const data = target.dataset;
  return target.id || data.sit || data.line || data.padAnswer || data.meetingAnswer || data.chip || data.thread || data.ball || data.pocket ||
    data.word || data.target || data.choice || data.way || data.padTool || target.classList[0] || target.localName;
}

function focusKey(root: HTMLElement, target: HTMLElement) {
  const key = label(target);
  const { sit, padAnswer, meetingAnswer, padTool } = target.dataset;
  // The featured card and its copy in the chapter list share the same situation key.
  if (sit || padAnswer || meetingAnswer || padTool) return key;
  let index = 0, count = 0;
  for (const item of root.querySelectorAll<HTMLElement>(CONTROL)) if (label(item) === key) {
    count++;
    if (item === target) index = count;
  }
  return count > 1 ? `${key}#${index}` : key;
}

export class GamepadView {
  private app?: HTMLElement;
  private observer?: MutationObserver;
  private readonly roots = new Set<HTMLElement>();
  private readonly popovers = new Set<HTMLElement>();
  private popoversChanged = false;
  private overlayReturn?: OverlayReturn;
  private lastControl = new WeakMap<HTMLElement, HTMLElement>();
  private active: HTMLElement | null = null;
  private activePhase: string | undefined;
  private desktop: HTMLElement | null = null;
  private auxiliary?: { root: HTMLElement; under: HTMLElement | null; phase?: string };
  private focused?: HTMLElement;
  private composing = false;
  private openingDrawer = false;
  private launcher?: Launcher;
  private returnTo = new WeakMap<HTMLElement, Launcher>();
  private restore?: HTMLElement;
  private focusOnReturn = false;
  private notice?: HTMLElement;
  private status?: HTMLElement;
  private legend?: HTMLElement;
  private timer?: ReturnType<typeof setTimeout>;
  private announce?: ReturnType<typeof setTimeout>;
  private resize?: ResizeObserver;
  private resizeAnchor?: Element;
  private menuMap?: boolean;

  constructor(private debug: PadDebug, private resetInput: () => void) {}

  get scope() { return this.active; }
  updateFocus() { this.syncFocus(); }
  clearFocus() { this.clearRing(); }

  connect() {
    const app = document.getElementById?.("root");
    if (!app) return;
    this.app = app;
    this.collect(app);
    this.observer = new MutationObserver(this.changed);
    this.observer.observe(app, {
      subtree: true, childList: true, attributes: true,
      attributeFilter: ["data-pad-scope", "data-pad-phase", "disabled", "aria-disabled", "inert"],
    });
    for (const node of document.body.children) {
      if (node instanceof HTMLElement && padPopovers.has(node)) this.watchPopover(node);
    }
    document.addEventListener("pointerdown", this.otherInput, true);
    document.addEventListener("padpopover", this.popoverChanged);
    document.addEventListener("keydown", this.otherInput, true);
    document.addEventListener("click", this.rememberClick, true);
    document.addEventListener("focusin", this.syncFocus);
    document.addEventListener("focusout", this.focusOut);
    document.addEventListener("compositionstart", this.compositionStart);
    document.addEventListener("compositionend", this.compositionEnd);
    window.addEventListener("resize", this.placeNotice);
    this.refresh();
    this.show("connected");
  }

  disconnect() {
    if (!this.app) return;
    this.show("disconnected");
    this.stopWatching();
  }

  dispose() {
    this.stopWatching();
    this.removeNotice();
    this.app = undefined;
  }

  private stopWatching() {
    this.observer?.disconnect();
    this.observer = undefined;
    this.roots.clear();
    this.popovers.clear();
    this.popoversChanged = false;
    this.overlayReturn = undefined;
    this.lastControl = new WeakMap();
    this.returnTo = new WeakMap();
    this.active = this.desktop = null;
    this.auxiliary = undefined;
    this.activePhase = undefined;
    this.launcher = this.restore = undefined;
    this.composing = this.openingDrawer = this.focusOnReturn = false;
    this.clearRing();
    this.debug.focusTarget = null;
    document.removeEventListener("pointerdown", this.otherInput, true);
    document.removeEventListener("padpopover", this.popoverChanged);
    document.removeEventListener("keydown", this.otherInput, true);
    document.removeEventListener("click", this.rememberClick, true);
    document.removeEventListener("focusin", this.syncFocus);
    document.removeEventListener("focusout", this.focusOut);
    document.removeEventListener("compositionstart", this.compositionStart);
    document.removeEventListener("compositionend", this.compositionEnd);
  }

  /** Drain synchronous DOM commits before an action. The observer owns updates between samples. */
  sync = () => {
    const changes = this.observer?.takeRecords();
    if (changes?.length) this.changed(changes);
    if (this.popoversChanged) this.refresh();
  };

  private watchPopover(node: HTMLElement) {
    this.popovers.add(node);
    if (this.kind(node) === "popover") this.observer?.observe(node, {
      subtree: true, childList: true, attributes: true, attributeFilter: ["disabled", "aria-disabled"],
    });
  }

  private popoverChanged = (event: Event) => {
    const node = (event as CustomEvent<HTMLElement>).detail;
    if (padPopovers.has(node)) this.watchPopover(node);
    else this.popovers.delete(node);
    if (this.popoversChanged) return;
    this.popoversChanged = true;
    queueMicrotask(this.sync);
  };

  private collect(node: Node) {
    if (!(node instanceof HTMLElement)) return false;
    let found = node.matches(ROOTS);
    if (found) this.roots.add(node);
    for (const root of node.querySelectorAll<HTMLElement>(ROOTS)) { this.roots.add(root); found = true; }
    return found;
  }

  private changed = (records: MutationRecord[]) => {
    let update = false;
    for (const record of records) {
      if (record.type === "attributes") {
        const target = record.target as HTMLElement;
        if (record.attributeName === "disabled" || record.attributeName === "aria-disabled") {
          if (target === document.activeElement) this.syncFocus();
          continue;
        }
        if (record.attributeName === "inert") { update = true; continue; }
        if (target.matches(ROOTS)) {
          this.roots.add(target);
          update ||= record.attributeName === "data-pad-scope" || target === this.active || target === this.auxiliary?.under;
        } else update = this.roots.delete(target) || update;
        continue;
      }
      for (const node of record.addedNodes) update = this.collect(node) || update;
      for (const node of record.removedNodes) {
        if (!(node instanceof HTMLElement)) continue;
        if (this.auxiliary && !this.auxiliary.root.isConnected) update = true;
        if (this.desktop && !this.desktop.isConnected && node.contains(this.desktop)) {
          this.desktop = null;
          update = true;
        }
        for (const root of this.roots) {
          if (!root.isConnected && node.contains(root)) { this.roots.delete(root); update = true; }
        }
        if (node === this.focused || (this.focused && node.contains(this.focused))) this.clearRing();
      }
    }
    if (update) this.refresh();
    else if (this.debug.focusTarget && !control(document.activeElement)) this.debug.focusTarget = null;
  };

  private kind(root: HTMLElement) {
    if (root === this.auxiliary?.root) return "auxiliary";
    return root.dataset.padScope ?? (root === this.desktop ? "toolbar" :
      root.matches(".radio-set") ? "radio" : root.matches(".phone-ring") ? "phone-ring" : "street");
  }

  private refresh() {
    this.popoversChanged = false;
    const previous = this.active;
    let active = this.desktop?.isConnected && !this.desktop.closest(BLOCKED) ? this.desktop : null;
    let rank = active ? surfaces.toolbar.priority : 0;
    for (const node of this.roots) {
      if (!node.isConnected || node.closest(BLOCKED)) continue;
      const priority = surfaces[this.kind(node)]?.priority ?? 0;
      if (priority > rank || (priority === rank && active && (active.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING))) {
        active = node;
        rank = priority;
      }
    }
    const under = active;
    for (const node of this.popovers) {
      const popup = padPopovers.get(node);
      if (!popup?.anchor.isConnected || !node.isConnected || popup.anchor.closest(BLOCKED) ||
          (under && !under.contains(popup.anchor))) continue;
      // Body portals share a stacking level. The later sibling is painted on top.
      if (active === under || (active && (active.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING))) {
        active = node;
        rank = surfaces[this.kind(node)].priority;
      }
    }
    const auxiliary = this.auxiliary;
    if (auxiliary) {
      if (auxiliary.root.isConnected && !auxiliary.root.closest(BLOCKED) &&
          auxiliary.under === active && auxiliary.phase === active?.dataset.padPhase) active = auxiliary.root;
      else this.auxiliary = undefined;
    }
    const phase = active?.dataset.padPhase;
    if (previous !== active || phase !== this.activePhase) {
      this.active = active;
      this.activePhase = phase;
      this.resetInput();
      if (previous !== active) {
        this.clearRing();
        const launch = this.launcher;
        if (launch && active && rank > surfaces[this.kind(launch.from)].priority && performance.now() - launch.at < 800) {
          this.returnTo.set(active, launch);
        }
        this.launcher = undefined;
      }
    }
    if (this.overlayReturn && this.overlayReturn.root === previous && active !== previous) {
      const { anchor, direction } = this.overlayReturn;
      this.overlayReturn = undefined;
      if (active && !textEntry(document.activeElement)) {
        const controls = this.candidates();
        const target = [anchor, document.activeElement, this.lastControl.get(active)].find(
          (item): item is HTMLElement => !!item && controls.includes(item as HTMLElement),
        ) ?? controls[0];
        if (target && (!direction || !this.moveFocus(direction, target))) this.focus(target, true);
      }
    } else if (this.openingDrawer && active?.dataset.padScope === "drawer") {
      this.openingDrawer = false;
      const target = this.restore ?? this.candidates()[0];
      this.restore = undefined;
      if (target && control(target) && visible(target)) this.focus(target);
    } else if (this.focusOnReturn && previous !== active) {
      this.focusOnReturn = false;
      let target = this.restore;
      this.restore = undefined;
      if (!target?.isConnected && target?.dataset.thread) {
        target = active?.querySelector<HTMLElement>(`button[data-thread="${CSS.escape(target.dataset.thread)}"]`) ?? undefined;
      }
      if (!active && (target?.closest(".toolbar-drawer[inert]") || target?.matches(AUXILIARY))) {
        this.restore = target;
        if (!this.openDrawer()) this.restore = undefined;
      }
      if (!this.openingDrawer && target && control(target) && visible(target)) this.focus(target);
    }
    this.syncFocus();
    this.placeNotice();
  }

  private clearRing() {
    this.focused?.removeAttribute("data-pad-focus");
    this.focused = undefined;
  }

  private otherInput = (event: Event) => {
    if (!event.isTrusted) return;
    this.clearRing();
    this.launcher = undefined;
    this.overlayReturn = undefined;
    if (event.type !== "pointerdown" || !(event.target instanceof Element) || !this.active) return;
    if (this.active === this.auxiliary?.root && !this.controlRoot(this.active, event.target.closest(CONTROL))) {
      this.leaveAuxiliary();
    } else if (this.active === this.desktop && !this.desktop.contains(event.target) &&
               !this.controlRoot(this.desktop, event.target.closest(CONTROL))) {
      this.desktop = null;
      this.refresh();
    }
  };
  private rememberClick = (event: Event) => {
    if (!event.isTrusted || !this.active || !(event.target instanceof Element)) return;
    const target = event.target.closest(CONTROL);
    if (control(target) && this.controlRoot(this.active, target) && !target.matches(BACK)) {
      this.launcher = { target, from: this.active, at: performance.now() };
    }
  };
  private compositionStart = () => { this.composing = true; };
  private compositionEnd = () => { this.composing = false; };
  private focusOut = () => {
    this.clearRing();
    this.debug.focusTarget = null;
  };
  private syncFocus = () => {
    const target = document.activeElement;
    const root = this.active;
    const owner = root && this.controlRoot(root, target);
    if (root && owner && control(target) && visible(target)) {
      this.lastControl.set(root, target);
      this.debug.focusTarget = focusKey(owner, target);
    } else this.debug.focusTarget = null;
  };

  private hudTools(root: HTMLElement) {
    return root === this.desktop || root.dataset.padScope === "drawer";
  }

  private controlRoot(root: HTMLElement, target: Element | null) {
    if (!target) return null;
    if (root.contains(target)) return root === this.auxiliary?.root && !target.matches(AUXILIARY) ? null : root;
    const hud = this.hudTools(root) && root.closest<HTMLElement>(".hud");
    return hud && hud.contains(target) && target.matches(AUXILIARY) ? hud : null;
  }

  private auxiliaryControls(hud: HTMLElement) {
    return Array.from(hud.querySelectorAll<HTMLElement>(AUXILIARY)).filter((target) => control(target) && visible(target));
  }

  private candidates() {
    const root = this.active!;
    const kind = this.kind(root);
    const first = kind === "home" || kind === "meeting" ? undefined : surfaces[kind].first;
    const priority: HTMLElement[] = [], rest: HTMLElement[] = [], back: HTMLElement[] = [];
    const selector = kind === "popover" ? "button" : kind === "auxiliary" ? AUXILIARY : CONTROL;
    for (const target of root.querySelectorAll(selector)) {
      if (!control(target) || !visible(target)) continue;
      (first && target.matches(first) ? priority : target.matches(BACK) ? back : rest).push(target);
    }
    const hud = this.hudTools(root) && root.closest<HTMLElement>(".hud");
    const extra = hud ? this.auxiliaryControls(hud).filter((target) => !root.contains(target)) : [];
    return priority.concat(rest, back, extra);
  }

  private focus(target: HTMLElement, restoring = false) {
    const previous = document.activeElement;
    // Keep native focus. Suppress the delegated React focus opener only during restoration.
    const quiet = restoring && target.matches(FOCUS_OPENS);
    if (quiet) target.addEventListener("focusin", this.stopFocusOpen);
    target.focus({ preventScroll: true });
    if (quiet) target.removeEventListener("focusin", this.stopFocusOpen);
    if (document.activeElement !== target) return false;
    this.clearRing();
    this.focused = target;
    target.setAttribute("data-pad-focus", "");
    const root = this.active;
    const owner = root && this.controlRoot(root, target);
    if (root && owner) {
      scrollNear(target, owner);
      if (previous !== target && root.dataset.padScope === "drawer") {
        (owner === root ? target : root).dispatchEvent(new Event("padfocus", { bubbles: true }));
      }
    }
    this.syncFocus();
    return true;
  }

  private stopFocusOpen = (event: Event) => event.stopPropagation();

  navigate(direction: Direction) {
    if (!this.active || this.composing || textEntry(document.activeElement)) return;
    if (this.kind(this.active) === "tooltip") {
      this.closePopover(this.active, direction);
      return;
    }
    this.moveFocus(direction, document.activeElement);
  }

  private moveFocus(direction: Direction, current: Element | null) {
    const controls = this.candidates();
    const index = controls.indexOf(current as HTMLElement), step = direction === "up" || direction === "left" ? -1 : 1;
    let next: HTMLElement | undefined = controls[index + step];
    if (index < 0) {
      const first = surfaces[this.kind(this.active!)].first;
      next = (first && controls.find((item) => item.matches(first))) || controls[0];
    }
    const grid = index >= 0 ? controls[index].closest(GRIDS) : null;
    if (grid) {
      const columns = getComputedStyle(grid).gridTemplateColumns;
      if (!columns || columns === "none" || columns.includes(" ")) {
        const neighbor = gridNeighbor(controls[index], controls, direction, grid);
        // At the edge of a grid, the ordered list can lead into the next group.
        next = neighbor ?? (grid.matches(".barista-chips") && (direction === "up" || direction === "down")
          ? trayNeighbor(controls[index], controls, direction)
          : next?.closest(GRIDS) !== grid ? next : undefined);
      }
    }
    if (!next || !this.focus(next)) return false;
    this.debug.lastAction = "focus";
    return true;
  }

  confirm() {
    const root = this.active;
    if (!root || this.composing || textEntry(document.activeElement)) return;
    const current = document.activeElement;
    const kind = this.kind(root);
    const target = this.controlRoot(root, current) && control(current) && (kind !== "popover" || current.matches("button")) ? current :
      kind === "intro" ? root.querySelector<HTMLElement>(DEFAULT) : kind === "popover" ? this.candidates()[0] :
      kind === "meeting" ? this.candidates().find((item) => item.matches(MEETING_ANSWERS)) : null;
    if (!target || !control(target) || !visible(target) || !this.focus(target)) return;
    this.sync();
    if (this.active !== root || !this.controlRoot(root, target) || !control(target) || !visible(target)) return;
    if (!target.matches(BACK)) this.launcher = { target, from: root, at: performance.now() };
    this.debug.lastAction = "confirm";
    target.click();
    this.sync();
  }

  back(fallback?: () => void) {
    const root = this.active;
    if (!root || this.composing) return;
    if (this.closePopover(root)) return;
    const kind = this.kind(root);
    if (kind === "auxiliary") {
      this.debug.lastAction = "back";
      this.leaveAuxiliary(true);
      return;
    }
    if (kind !== "info" && textEntry(document.activeElement)) {
      // Keep the draft and the existing typing state when recognition gave the field focus.
      const field = document.activeElement;
      if (!root.contains(field) || !field?.matches(".typebox input")) return;
      const controls = this.candidates();
      const target = controls.find((item) => item.matches(ANSWERS)) ??
        controls.find((item) => item.matches(".guide .chip, .guide-examples button, .audio-recovery .link-btn, .guide-toggle"));
      if (target && this.focus(target)) { this.debug.lastAction = "back"; this.resetInput(); this.syncFocus(); }
      return;
    }
    const target = kind === "drawer" ? this.menuButton() :
      root.querySelector(BACK) ?? (surfaces[kind].back ? this.app?.querySelector(surfaces[kind].back!) : null);
    if (kind === "toolbar") {
      if (this.controlRoot(root, document.activeElement)) (document.activeElement as HTMLElement).blur();
      this.desktop = null;
      this.debug.lastAction = "back";
      this.refresh();
    } else if (control(target ?? null) && visible(target as HTMLElement)) {
      const current = document.activeElement;
      if (kind === "drawer" && current instanceof HTMLElement && !root.contains(current) &&
          this.controlRoot(root, current)) current.blur();
      const infoLauncher = kind === "info" && root.parentElement?.querySelector<HTMLElement>(FOCUS_OPENS);
      if (infoLauncher) this.overlayReturn = { root, anchor: infoLauncher };
      this.restore = kind === "drawer" ? target as HTMLElement : infoLauncher ? undefined : this.returnTo.get(root)?.target;
      this.focusOnReturn = !!this.restore;
      this.returnTo.delete(root);
      this.debug.lastAction = "back";
      (target as HTMLElement).click();
      this.sync();
    } else if (fallback && ["barista-offer", "road-offer", "taxi"].includes(kind)) {
      this.debug.lastAction = "back";
      fallback();
    }
  }

  private closePopover(root: HTMLElement, direction?: Direction) {
    const popup = padPopovers.get(root);
    if (!popup) return false;
    this.overlayReturn = { root, anchor: popup.anchor.closest<HTMLElement>(CONTROL) ?? popup.anchor, direction };
    this.debug.lastAction = "back";
    popup.close();
    this.sync();
    return true;
  }

  private menuButton() {
    return this.app?.querySelector<HTMLButtonElement>(".toolbar .ride-menu") ?? null;
  }

  private openDrawer() {
    const menu = this.menuButton();
    if (!control(menu) || !visible(menu) || menu.getAttribute("aria-expanded") !== "false") return false;
    this.openingDrawer = true;
    menu.click();
    this.sync();
    return true;
  }

  private openAuxiliary() {
    const root = this.app?.querySelector<HTMLElement>(".hud");
    if (!root || !this.auxiliaryControls(root).length) return false;
    const under = this.active;
    this.auxiliary = { root, under, phase: under?.dataset.padPhase };
    this.refresh();
    const target = this.candidates()[0];
    if (target && this.focus(target)) this.debug.lastAction = "focus";
    return true;
  }

  leaveAuxiliary(restore = false) {
    const auxiliary = this.auxiliary;
    if (!auxiliary) return;
    if (this.controlRoot(auxiliary.root, document.activeElement)) (document.activeElement as HTMLElement).blur();
    this.auxiliary = undefined;
    this.refresh();
    if (restore && this.active && this.active === auxiliary.under) {
      const target = this.lastControl.get(this.active);
      if (target && control(target) && visible(target)) this.focus(target);
    }
  }

  menu() {
    if (!this.app || this.composing || textEntry(document.activeElement)) return false;
    if (this.active) {
      const kind = this.kind(this.active);
      if (kind === "drawer" || kind === "toolbar" || kind === "auxiliary") { this.back(); return true; }
      if (kind === "surf-choices" || kind === "taxi") return this.openAuxiliary();
      if (kind === "home") {
        const target = this.candidates().find((item) => item.closest(".lh-tools"));
        if (target && this.focus(target)) this.debug.lastAction = "focus";
        return true;
      }
      return false;
    }
    if (this.openDrawer()) { this.debug.lastAction = "focus"; return true; }
    const toolbar = this.app.querySelector<HTMLElement>("[data-pad-toolbar]");
    if (!toolbar || !visible(toolbar)) return this.openAuxiliary();
    this.desktop = toolbar;
    this.refresh();
    const target = this.candidates()[0];
    if (target && this.focus(target)) this.debug.lastAction = "focus";
    return true;
  }

  photo() {
    if (!this.app || this.app.querySelector(".prompt, .act-btn")) return false;
    const shutter = this.app.querySelector<HTMLButtonElement>(".photo-chip");
    if (!control(shutter) || !visible(shutter)) return false;
    shutter.click();
    return true;
  }

  private show(key: "connected" | "disconnected") {
    if (!this.notice) {
      this.notice = document.createElement("div");
      this.notice.lang = "lt";
      this.notice.setAttribute("role", "status");
      this.notice.setAttribute("aria-live", "polite");
      this.notice.setAttribute("aria-atomic", "true");
      this.status = document.createElement("strong");
      this.legend = document.createElement("div");
      this.legend.className = "pad-hint-map";
      this.legend.setAttribute("aria-hidden", "true");
      this.notice.append(this.status, this.legend);
      this.menuMap = undefined;
    }
    this.notice.dataset.padHint = key;
    this.placeNotice();
    clearTimeout(this.announce);
    this.announce = setTimeout(() => {
      if (!this.status) return;
      this.status.textContent = PAD_LINES[key].nat;
      this.placeNotice();
    }, 0);
    clearTimeout(this.timer);
    this.timer = setTimeout(this.removeNotice, key === "connected" ? 3200 : 2400);
  }

  private removeNotice = () => {
    clearTimeout(this.announce);
    clearTimeout(this.timer);
    this.resize?.disconnect();
    this.resizeAnchor = undefined;
    this.notice?.remove();
    this.notice = this.status = this.legend = undefined;
    if (!this.observer) window.removeEventListener("resize", this.placeNotice);
  };

  private placeNotice = () => {
    const { notice, legend, app } = this;
    if (!notice || !legend || !app) return;
    // A disconnected notice keeps its last map and remains in the current view until expiry.
    const menu = this.observer ? !!this.active : this.menuMap ?? false;
    if (this.menuMap !== menu) {
      this.menuMap = menu;
      const items = (menu ? MENU_MAP : WORLD_MAP).map(([glyph, key]) => {
        const item = document.createElement("span");
        const cap = document.createElement("b");
        cap.textContent = glyph;
        item.append(cap, PAD_LINES[key].nat);
        return item;
      });
      if (menu) {
        const cap = document.createElement("b");
        cap.textContent = "☰";
        items.push(cap);
      }
      legend.replaceChildren(...items);
    }
    const active = this.active;
    const kind = active ? this.kind(active) : null;
    const notes = (!kind || kind === "toolbar" || kind === "drawer" || kind === "street" || kind === "phone-ring")
      ? app.querySelector<HTMLElement>(NOTES) : null;
    const desktop = innerWidth >= 901 && innerHeight > 520;
    let slot: HTMLElement | null = null;
    if (!this.observer && notice.isConnected) return;
    if (notes && matchMedia("(max-width: 600px) and (orientation: portrait)").matches) slot = notes;
    else if (active && kind) {
      if (kind === "convo" || kind === "ended" || kind === "intro" || kind === "info") {
        const convo = active.closest(".convo");
        if (!desktop && convo && convo.getBoundingClientRect().top < 100) slot = convo.querySelector(".convo-tools");
      } else if (kind === "panel") {
        const sheet = active.querySelector<HTMLElement>(surfaces.panel.slot!);
        if (!desktop || !sheet || sheet.getBoundingClientRect().left < 292) slot = sheet;
      } else if (!desktop && !["drawer", "toolbar", "auxiliary", "popover", "tooltip", "meeting"].includes(kind)) {
        const selector = surfaces[kind].slot;
        slot = selector ? active.matches(selector) ? active : app.querySelector<HTMLElement>(selector) : active;
      }
    }
    let anchor: Element | null = null;
    if (!slot && notes) anchor = notes.querySelector(".objective-card");
    if (!slot && !anchor && (!active || kind === "auxiliary")) {
      anchor = app.querySelector(".surf-top, .road-header, .taxi-cue, .bl-header");
    }
    if (anchor !== this.resizeAnchor) {
      this.resize?.disconnect();
      this.resizeAnchor = anchor ?? undefined;
      if (anchor) {
        this.resize ??= new ResizeObserver(this.placeNotice);
        this.resize.observe(anchor);
      }
    }
    const hud = Array.from(app.querySelectorAll<HTMLElement>(HUD_CONTROLS)).filter(visible);
    const choices: HTMLElement[] = [];
    if (active && kind) {
      const surface = surfaces[kind];
      const first = surface.first && active.querySelector<HTMLElement>(`:is(${surface.first}):not(:disabled, [aria-disabled=true])`);
      const back = active.querySelector<HTMLElement>(BACK) ??
        (surface.back ? app.querySelector<HTMLElement>(surface.back) : null);
      for (const target of [first, back]) if (target && visible(target)) choices.push(target);
      const convo = active.closest<HTMLElement>(".convo");
      if (!slot && convo) choices.push(convo);
      if (kind === "popover" || kind === "tooltip" || kind === "meeting") choices.push(active);
    }
    if (slot) {
      notice.dataset.padPlacement = slot === notes ? "notes" : "flow";
      if (notice.parentElement !== slot) {
        if (slot === notes) this.moveNotice(slot, null);
        else {
          const head = slot.querySelector(":scope > :is(header, .sheet-head, .phone-status)");
          this.moveNotice(slot, head ? head.nextSibling : slot.firstChild);
        }
      }
      const { left, top, width, height, bottom } = notice.getBoundingClientRect();
      if (top >= 0 && bottom <= innerHeight &&
          !hud.some((item) => overlaps(left, top, width, height, item.getBoundingClientRect())) &&
          !choices.some((item) => overlaps(left, top, width, height, item.getBoundingClientRect(), 0))) return;
    }
    notice.dataset.padPlacement = "fixed";
    if (notice.parentElement !== document.body) this.moveNotice(document.body, null);
    notice.style.removeProperty("--pad-left");
    notice.style.removeProperty("--pad-top");
    const { left, top, width, height } = notice.getBoundingClientRect();
    const after = anchor?.getBoundingClientRect();
    const y = after ? after.bottom + 6 : top;
    const occupied = [...hud, ...choices].map((item) => item.getBoundingClientRect());
    if (after) occupied.push(after);
    // Try the HUD anchor first, then the corners and the open space around the current controls.
    const xs = [left, innerWidth - left - width, ...occupied.map((box) => box.right + 8)];
    const ys = [y, top, ...occupied.map((box) => box.bottom + 8)];
    for (const x of xs) {
      for (const y of ys) {
        if (x < left || y < top || x + width > innerWidth - 12 || y + height > innerHeight - 12 ||
            occupied.some((box) => overlaps(x, y, width, height, box, box === after ? 6 : 8))) continue;
        notice.style.setProperty("--pad-left", `${x}px`);
        notice.style.setProperty("--pad-top", `${y}px`);
        return;
      }
    }
    if (slot) {
      notice.dataset.padPlacement = slot === notes ? "notes" : "flow";
      this.moveNotice(slot, null);
    }
  };

  private moveNotice(slot: HTMLElement, before: Node | null) {
    const notice = this.notice!;
    if (notice.isConnected && typeof slot.moveBefore === "function") slot.moveBefore(notice, before);
    else slot.insertBefore(notice, before);
  }
}
