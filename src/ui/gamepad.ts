import { PAD_LINES } from "../content/gamepad";
import type { PadDebug } from "../game/gamepad";
import type { PopoverElement } from "./Cards";
import "./gamepad.css";

const SCOPE = "[data-pad-scope]";
const ADJUSTABLE = "select[data-pad-adjust]:not([multiple]), input[type=range][data-pad-adjust]";
const CONTROL = "button, a[href], summary, " + ADJUSTABLE;
const BLOCKED = "[inert], [hidden], [aria-hidden=true]";
const UNAVAILABLE = ":disabled, [aria-disabled=true], [data-pad-skip], .bl-power-track, .taxi-action";
const BACK = "[data-pad-back]";
const DEFAULT = "[data-pad-default]";
const AUXILIARY = "button[data-pad-aux], [data-pad-aux] button";
const NOTES = ".objective-notes";
const GRIDS = ".passport-grid, .scn-grid, .lh-grid, .toolbar, .barista-chips, .gofish-hand, .gofish-opponents, .bl-ball-chips, .word-gate-ways, .road-choices, .surf-levels, .lh-tools";
const ANSWERS = "[data-pad-answer], .dym-opt";
const MEETING_ANSWERS = "[data-meeting-answer]";
const FOCUS_OPENS = "[data-pad-focus-opens]";
const PORTAL = ".wpop, .nat-tipbox";
const OPEN_PORTAL = ".wpop[data-pad-placed], .nat-tipbox[data-pad-scope=tooltip]:not([hidden])";

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
  panel: { priority: 80, first: ".scn-card[data-sit], .contact", slot: ".sheet, .phone, .passport" },
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
const HUD_CONTROLS = ".toolbar, .toolbar-drawer:not([inert]), .ride-menu, .joy, .jump-btn, .act-btn, .drive-horn, .prompt, .view-chip, .lh-tools, .photo-chip, .street-bubble";
const TASK_NOTES = ".objective-card, .zone-banner, .coach, .town-toasts .toast, .directions-card, .text-arrival";
const NOTICE_HOSTS = ".hud, .convo, .overlay, .lh";
const NOTICE_ANCHORS = `${ROOTS}, ${NOTES}, ${HUD_CONTROLS}, ${TASK_NOTES}, ${CONTROL}, .sheet, .phone`;

const WORLD_MAP = [["L", "move"], ["R", "look"], ["A", "jump"], ["X", "interact"]] as const;
const MENU_MAP = [["✚/L", "move"], ["A", "choose"], ["B", "back"]] as const;

type Direction = "up" | "down" | "left" | "right";
type Adjustable = HTMLSelectElement | HTMLInputElement;
type Launcher = { target: HTMLElement; from: HTMLElement; at: number };
type OverlayReturn = { root: HTMLElement; anchor: HTMLElement; direction?: Direction };

function control(el: Element | null): el is HTMLElement {
  return !!el && el instanceof HTMLElement && el.matches(CONTROL) && !el.matches(UNAVAILABLE) && !el.closest(BLOCKED) && el.isConnected;
}

function visible(el: HTMLElement) {
  return el.getClientRects().length > 0 && getComputedStyle(el).visibility === "visible";
}

function topPopover(under: HTMLElement | null, portals: Iterable<PopoverElement>) {
  let top: HTMLElement | undefined;
  for (const node of portals) {
    const anchor = node.popoverAnchor;
    if (node.parentElement !== document.body || !node.matches(OPEN_PORTAL) ||
        !anchor?.isConnected || anchor.closest(BLOCKED) || (under && !under.contains(anchor))) continue;
    // Body portals share a stacking level. The later sibling is painted on top.
    if (!top || (top.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING)) top = node;
  }
  return top;
}

function onScreen(el: HTMLElement, viewport: DOMRect, whole = false) {
  if (!visible(el)) return false;
  const box = el.getBoundingClientRect();
  let left = viewport.left, right = viewport.right, top = viewport.top, bottom = viewport.bottom;
  for (let parent = el.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
    const style = getComputedStyle(parent);
    if (style.overflowX === "visible" && style.overflowY === "visible") continue;
    const bounds = parent.getBoundingClientRect();
    if (style.overflowX !== "visible") {
      left = Math.max(left, bounds.left);
      right = Math.min(right, bounds.right);
    }
    if (style.overflowY !== "visible") {
      top = Math.max(top, bounds.top);
      bottom = Math.min(bottom, bounds.bottom);
    }
  }
  return whole ? box.left >= left && box.right <= right && box.top >= top && box.bottom <= bottom
    : box.left < right && box.right > left && box.top < bottom && box.bottom > top;
}

export function textEntry(el: Element | null): boolean {
  const field = el as HTMLElement | null;
  return !!field && (field.isContentEditable || field.tagName === "INPUT" || field.tagName === "TEXTAREA" || field.tagName === "SELECT");
}

function enabledOption(option: HTMLOptionElement) {
  return !option.matches(":disabled, [aria-disabled=true], [hidden]") && !option.closest("optgroup[hidden], optgroup[aria-disabled=true]");
}

function adjust(target: Adjustable, step: number | string) {
  const before = target.value;
  const relative = typeof step === "number";
  if (target instanceof HTMLSelectElement) {
    if (relative) {
      for (let i = target.selectedIndex + step; i >= 0 && i < target.length; i += step) {
        if (!enabledOption(target.options[i])) continue;
        target.selectedIndex = i;
        break;
      }
    } else {
      const option = Array.from(target.options).find((item) => item.value === step && enabledOption(item));
      if (option) target.selectedIndex = option.index;
    }
  } else if (!relative) target.valueAsNumber = Number(step);
  else if (step > 0) target.stepUp();
  else target.stepDown();
  // Native index/step setters bypass React's value tracker. Send the event each existing onChange expects.
  if (target.value !== before) target.dispatchEvent(new Event(target instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
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
  private portalObserver?: MutationObserver;
  private popoverContents?: MutationObserver;
  private readonly roots = new Set<HTMLElement>();
  private readonly popovers = new Set<PopoverElement>();
  private overlayReturn?: OverlayReturn;
  private lastControl = new WeakMap<HTMLElement, HTMLElement>();
  private active: HTMLElement | null = null;
  private activePhase: string | undefined;
  private desktop: HTMLElement | null = null;
  private auxiliary?: { root: HTMLElement; under: HTMLElement | null; phase?: string };
  private focused?: HTMLElement;
  private adjustment?: string;
  private composing = false;
  private openingDrawer = false;
  private launcher?: Launcher;
  private returnTo = new WeakMap<HTMLElement, Launcher>();
  private restore?: HTMLElement;
  private focusOnReturn = false;
  private noticeLayer?: HTMLElement;
  private notice?: HTMLElement;
  private noticeSlot?: HTMLElement;
  private status?: HTMLElement;
  private legend?: HTMLElement;
  private timer?: ReturnType<typeof setTimeout>;
  private announce?: ReturnType<typeof setTimeout>;
  private noticeChanges?: MutationObserver;
  private resize?: ResizeObserver;
  private noticeHosts: HTMLElement[] = [];
  private measured = new Set<Element>();
  private menuMap?: boolean;

  constructor(private debug: PadDebug, private resetInput: (clearFocus?: boolean) => void) {}

  get scope() { return this.active; }
  updateFocus() { this.syncFocus(); }
  clearFocus() {
    const target = this.focused;
    this.clearRing();
    if (target?.matches(ADJUSTABLE) && target === document.activeElement) target.blur();
  }

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
    this.portalObserver = new MutationObserver(this.popoverChanged);
    this.watchPopovers(this.portalObserver);
    document.addEventListener("pointerdown", this.otherInput, true);
    document.addEventListener("keydown", this.otherInput, true);
    document.addEventListener("click", this.rememberClick, true);
    document.addEventListener("focusin", this.syncFocus);
    document.addEventListener("focusout", this.focusOut);
    document.addEventListener("compositionstart", this.compositionStart);
    document.addEventListener("compositionend", this.compositionEnd);
    this.refresh();
    this.show("connected");
  }

  disconnect() {
    if (!this.app) return;
    this.stopWatching();
    this.show("disconnected");
  }

  dispose() {
    this.stopWatching();
    this.removeNotice();
    this.app = undefined;
  }

  private stopWatching() {
    this.observer?.disconnect();
    this.observer = undefined;
    this.portalObserver?.disconnect();
    this.portalObserver = undefined;
    this.popoverContents?.disconnect();
    this.popoverContents = undefined;
    this.roots.clear();
    this.popovers.clear();
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
    const portals = this.portalObserver?.takeRecords();
    if (portals?.length) this.popoverChanged(portals, this.portalObserver!);
    if (this.popoverContents?.takeRecords().length) this.popoverContentChanged();
  };

  private watchPopovers(observer: MutationObserver) {
    observer.disconnect();
    observer.observe(document.body, { childList: true });
    this.popovers.clear();
    for (const node of document.body.children) {
      if (!(node instanceof HTMLElement) || !node.matches(PORTAL)) continue;
      observer.observe(node, { attributeFilter: ["data-pad-placed", "data-pad-scope", "hidden"] });
      if (node.matches(OPEN_PORTAL)) this.popovers.add(node);
    }
  }

  private popoverChanged = (records: MutationRecord[], observer: MutationObserver) => {
    let update = false;
    for (const record of records) {
      if (record.type === "attributes") {
        const node = record.target as PopoverElement;
        if (node.matches(OPEN_PORTAL)) {
          update ||= !this.popovers.has(node);
          this.popovers.add(node);
        } else update = this.popovers.delete(node) || update;
      } else if ([...record.addedNodes, ...record.removedNodes].some((node) =>
        node instanceof HTMLElement && node.matches(PORTAL))) {
        this.watchPopovers(observer);
        update = true;
        break;
      }
    }
    if (update) this.refresh();
  };

  private popoverContentChanged = () => {
    if (this.focused && !this.focused.isConnected) this.clearRing();
    this.syncFocus();
    this.placeNotice();
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
    const popover = topPopover(active, this.popovers);
    if (popover) {
      active = popover;
      rank = surfaces[this.kind(popover)].priority;
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
        this.popoverContents?.disconnect();
        if (active?.matches(".wpop[data-pad-placed]")) {
          this.popoverContents ??= new MutationObserver(this.popoverContentChanged);
          this.popoverContents.observe(active, {
            subtree: true, childList: true, attributeFilter: ["disabled", "aria-disabled"],
          });
        }
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
    this.finishAdjustment();
    this.focused?.removeAttribute("data-pad-focus");
    this.focused = undefined;
  }

  private finishAdjustment() {
    this.focused?.removeAttribute("data-pad-adjusting");
    this.adjustment = undefined;
  }

  private adjustableFocus() {
    const target = this.focused, root = this.active;
    if (target === document.activeElement && root && control(target) &&
        target.matches(ADJUSTABLE) && root.contains(target) && visible(target)) return target as Adjustable;
    if (this.adjustment !== undefined) this.clearRing();
    return null;
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
    } else {
      if (target === this.focused) this.clearRing();
      this.debug.focusTarget = null;
    }
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
    if (!this.active || this.composing) return;
    const widget = this.adjustableFocus();
    if (widget && this.adjustment !== undefined) {
      const previous = widget instanceof HTMLSelectElement ? "up" : "down";
      adjust(widget, direction === previous || direction === "left" ? -1 : 1);
      this.sync();
      return;
    }
    if (!widget && textEntry(document.activeElement)) return;
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
    if (!root || this.composing) return;
    const widget = this.adjustableFocus();
    if (widget) {
      if (this.adjustment === undefined) {
        this.adjustment = widget.value;
        widget.setAttribute("data-pad-adjusting", "");
      } else this.finishAdjustment();
      this.debug.lastAction = "confirm";
      this.resetInput(false);
      return;
    }
    if (textEntry(document.activeElement)) return;
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
    const widget = this.adjustableFocus();
    if (widget && this.adjustment !== undefined) {
      const previous = this.adjustment;
      this.finishAdjustment();
      this.debug.lastAction = "back";
      this.resetInput(false);
      adjust(widget, previous);
      this.sync();
      return;
    }
    const kind = this.kind(root);
    if (kind === "auxiliary") {
      this.debug.lastAction = "back";
      this.leaveAuxiliary(true);
      return;
    }
    if (kind !== "info" && !widget && textEntry(document.activeElement)) {
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

  private closePopover(root: PopoverElement, direction?: Direction) {
    const { popoverAnchor: anchor, popoverClose: close } = root;
    if (!anchor || !close || !this.popovers.has(root)) return false;
    this.overlayReturn = { root, anchor: anchor.closest<HTMLElement>(CONTROL) ?? anchor, direction };
    this.debug.lastAction = "back";
    close();
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
      this.noticeLayer = document.createElement("div");
      this.noticeLayer.className = "pad-hint-layer";
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
      this.noticeLayer.append(this.notice);
      this.menuMap = undefined;
      this.notice.dataset.padHint = key;
      document.body.append(this.noticeLayer);
      this.noticeChanges = new MutationObserver(this.noticeChanged);
      window.addEventListener("resize", this.placeNotice);
      this.app?.addEventListener("scrollend", this.noticeScroll, true);
      this.app?.addEventListener("animationend", this.noticeAnimation);
    }
    this.notice.dataset.padHint = key;
    this.placeNotice();
    clearTimeout(this.announce);
    clearTimeout(this.timer);
    this.announce = setTimeout(() => {
      if (!this.status) return;
      this.status.textContent = PAD_LINES[key].nat;
      this.placeNotice();
    }, 0);
    this.timer = setTimeout(this.removeNotice, key === "connected" ? 3200 : 2400);
  }

  private removeNotice = () => {
    clearTimeout(this.announce);
    clearTimeout(this.timer);
    window.removeEventListener("resize", this.placeNotice);
    this.app?.removeEventListener("scrollend", this.noticeScroll, true);
    this.app?.removeEventListener("animationend", this.noticeAnimation);
    this.noticeChanges?.disconnect();
    this.noticeChanges = undefined;
    this.noticeHosts = [];
    this.resize?.disconnect();
    this.resize = undefined;
    this.measured.clear();
    this.noticeSlot?.remove();
    this.noticeLayer?.remove();
    this.noticeLayer = this.notice = this.noticeSlot = this.status = this.legend = undefined;
  };

  private noticeAnimation = (event: Event) => {
    if (event.target instanceof Element && event.target.matches(`${NOTICE_HOSTS}, .sheet, ${TASK_NOTES}`)) this.placeNotice();
  };

  private noticeScroll = (event: Event) => {
    if (!(event.target instanceof Element)) return;
    const slot = this.noticeSlot;
    if ((slot?.isConnected && event.target.contains(slot)) || event.target.matches(".sheet-body, .yt-scroll, .lh")) {
      this.placeNotice();
    }
  };

  private noticeChanged = (records: MutationRecord[]) => {
    if ((this.noticeSlot?.parentElement && !this.noticeSlot.isConnected) || records.some((record) => {
      if (record.target === this.app || record.target === document.documentElement) return true;
      if (record.type === "attributes") {
        const target = record.target as Element;
        // While unplugged, the notice follows trigger changes through its own short-lived app observer.
        if (record.attributeName === "class" || record.attributeName === "aria-expanded") {
          return !this.portalObserver && target.matches(".il .u[data-i], .nat-star");
        }
        return target.matches(`${NOTICE_ANCHORS}, .toolbar-drawer`) || record.attributeName === "data-pad-scope" ||
          [...this.measured].some((element) => target.contains(element));
      }
      return [...record.addedNodes, ...record.removedNodes].some((node) =>
        node instanceof Element && (node.matches(NOTICE_ANCHORS) || node.querySelector(NOTICE_ANCHORS)));
    })) this.placeNotice();
  };

  private noticeSurface(app: HTMLElement) {
    const hosts = Array.from(app.children).filter((node): node is HTMLElement =>
      node instanceof HTMLElement && node.matches(NOTICE_HOSTS));
    if (hosts.length !== this.noticeHosts.length || hosts.some((host, i) => host !== this.noticeHosts[i]) ||
        !this.measured.size) {
      this.noticeHosts = hosts;
      this.noticeChanges?.disconnect();
      this.noticeChanges?.observe(app, { childList: true });
      this.noticeChanges?.observe(document.documentElement, { attributes: true, attributeFilter: ["style"] });
      // Observe surface commits, leaving canvas, world tags and unrelated app trees out of the notice lifetime.
      for (const host of hosts) this.noticeChanges?.observe(host, {
        subtree: true, childList: true, attributes: true,
        attributeFilter: ["data-pad-scope", "data-pad-phase", "inert", "hidden", "aria-hidden", "disabled", "aria-disabled", "class", "aria-expanded"],
      });
    }
    let active = this.active?.isConnected && !this.active.closest(BLOCKED) ? this.active : null;
    let rank = active ? surfaces[this.kind(active)].priority : 0;
    const root = (node: HTMLElement) => {
      if (!visible(node) || node.closest(BLOCKED)) return;
      const priority = surfaces[this.kind(node)]?.priority ?? 0;
      if (priority >= rank && priority > 0) { active = node; rank = priority; }
    };
    if (!this.observer || !active) {
      for (const host of hosts) {
        if (host.matches(ROOTS)) root(host);
        for (const node of host.querySelectorAll<HTMLElement>(ROOTS)) root(node);
      }
      const portals = document.body.querySelectorAll<PopoverElement>(`:scope > :is(${OPEN_PORTAL})`);
      active = topPopover(active, portals) ?? active;
    }
    return active;
  }

  private watchNoticeSize(elements: Element[]) {
    this.resize ??= new ResizeObserver(this.placeNotice);
    const next = new Set(elements);
    for (const element of this.measured) if (!next.has(element)) this.resize.unobserve(element);
    for (const element of next) if (!this.measured.has(element)) this.resize.observe(element);
    this.measured = next;
  }

  private placeNotice = () => {
    const { notice, noticeLayer, legend, app } = this;
    if (!notice || !noticeLayer || !legend || !app) return;
    const active = this.noticeSurface(app);
    const kind = active ? this.kind(active) : undefined;
    const menu = !!kind;
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

    const safe = noticeLayer.getBoundingClientRect();
    const notes = app.querySelector<HTMLElement>(NOTES);
    const hud = Array.from(app.querySelectorAll<HTMLElement>(HUD_CONTROLS)).filter(visible);
    const task = Array.from(app.querySelectorAll<HTMLElement>(TASK_NOTES)).filter(visible);
    const surface = kind && surfaces[kind];
    const choices: HTMLElement[] = [];
    if (active && surface) {
      const current = document.activeElement;
      if (current instanceof HTMLElement && active.contains(current) && onScreen(current, safe)) choices.push(current);
      const first = Array.from(active.querySelectorAll<HTMLElement>(surface.first ?? CONTROL))
        .find((target) => control(target) && onScreen(target, safe));
      const back = active.querySelector<HTMLElement>(BACK) ?? (surface.back ? app.querySelector<HTMLElement>(surface.back) : null);
      for (const target of [first, back]) if (target && visible(target)) choices.push(target);
    }
    const convo = active?.closest<HTMLElement>(".convo");
    const convoBack = convo?.querySelector<HTMLElement>(".convo-head [data-pad-back]");
    if (convoBack && visible(convoBack)) choices.push(convoBack);
    const panel = kind === "panel" ? active?.querySelector<HTMLElement>(surfaces.panel.slot!) : null;
    const passportDock = panel?.querySelector<HTMLElement>(".passport-pad-dock");
    const margin = convo ?? panel ?? (kind && !["drawer", "toolbar", "auxiliary", "home"].includes(kind) ? active : null);
    const flowSelector = surface && surface.slot;
    const slot = convo?.querySelector<HTMLElement>(".convo-tools") ?? panel ??
      (kind && !["drawer", "toolbar", "auxiliary", "popover", "tooltip", "meeting", "panel"].includes(kind)
        ? flowSelector ? (active?.matches(flowSelector) ? active : app.querySelector<HTMLElement>(flowSelector)) : active
        : null);
    const anchor = notes?.querySelector<HTMLElement>(".objective-card") ??
      app.querySelector<HTMLElement>(".surf-top, .road-header, .taxi-cue, .bl-header");
    // A measured header can also be the insertion host. Its own reservation must never wake the observer.
    const sizeAnchor = anchor && !anchor.contains(slot) ? [anchor] : [];
    this.watchNoticeSize([noticeLayer, ...hud, ...task, ...choices, ...sizeAnchor]);

    const controls = hud.concat(choices);
    const clear = (left: number, top: number, width: number, height: number, boxes: { box: DOMRect; gap: number }[]) =>
      width > 0 && height > 0 && left >= safe.left && top >= safe.top &&
      left + width <= safe.right && top + height <= safe.bottom &&
      !boxes.some(({ box, gap }) => overlaps(left, top, width, height, box, gap));
    const obstacles = (elements: HTMLElement[], gap: number) =>
      elements.filter(visible).map((el) => el.getBoundingClientRect()).filter((box) => box.width > 0 && box.height > 0)
        .map((box) => ({ box, gap }));
    const position = (left: number, top: number) => {
      notice.style.setProperty("--pad-left", `${left - safe.left}px`);
      notice.style.setProperty("--pad-top", `${top - safe.top}px`);
      notice.dataset.padPositioned = "";
    };
    const resetSlot = () => {
      this.noticeSlot?.remove();
      notice.style.removeProperty("--pad-width");
    };
    const flow = (host: HTMLElement, inNotes = false) => {
      const slot = this.noticeSlot ??= document.createElement("div");
      slot.setAttribute("aria-hidden", "true");
      slot.dataset.padSlot = inNotes ? "notes" : "flow";
      if (slot.parentElement !== host) {
        const head = host.querySelector(":scope > :is(header, .sheet-head, .phone-status, .convo-head)");
        host.insertBefore(slot, inNotes ? null : head ? head.nextSibling : host.firstChild);
      }
      notice.style.setProperty("--pad-width", `${slot.getBoundingClientRect().width}px`);
      const { width, height } = notice.getBoundingClientRect();
      slot.style.height = `${height}px`;
      const { left, top } = slot.getBoundingClientRect();
      // The opaque picker or phone already covers the HUD notes where this slot is drawn.
      const surroundingNotes = host === panel || host === passportDock ? [] : task;
      const boxes = [...obstacles(host === passportDock ? choices : controls, 8), ...obstacles(surroundingNotes, inNotes ? 6 : 8)];
      if (clear(left, top, width, height, boxes) && onScreen(slot, safe, true)) {
        position(left, top);
        return true;
      }
      resetSlot();
      return false;
    };
    const fixed = (boxes: { box: DOMRect; gap: number }[]) => {
      const { width, height } = notice.getBoundingClientRect();
      const left = Math.max(12, safe.left), right = Math.min(innerWidth - 12, safe.right);
      const top = Math.max(12, safe.top), bottom = Math.min(innerHeight - 12, safe.bottom);
      const xs = [left, right - width, ...boxes.flatMap(({ box, gap }) => [box.right + gap, box.left - gap - width])];
      const ys = [anchor ? anchor.getBoundingClientRect().bottom + 6 : top, top, bottom - height,
        ...boxes.flatMap(({ box, gap }) => [box.bottom + gap, box.top - gap - height])];
      for (const x of xs) for (const y of ys) {
        if (x < left || y < top || x + width > right || y + height > bottom || !clear(x, y, width, height, boxes)) continue;
        position(x, y);
        return true;
      }
      return false;
    };

    // Reserve a strip of the cover. The live notice stays outside the dialog's scrollable paper.
    if (passportDock) {
      if (!flow(passportDock)) delete notice.dataset.padPositioned;
      return;
    }

    const underNote = notes && (!kind || ["toolbar", "drawer", "street", "phone-ring"].includes(kind)) &&
      matchMedia("(max-width: 600px) and (orientation: portrait)").matches;
    if (underNote && flow(notes, true)) return;

    // An accepted slot stays reserved for this surface. Its own height is never observed.
    const preferFlow = slot && (this.noticeSlot?.parentElement === slot || (kind === "home" && innerWidth <= 600));
    if (slot && preferFlow && flow(slot)) return;
    resetSlot();
    const fixedControls = anchor && !task.includes(anchor) ? controls.concat(anchor) : controls;
    const boxes = [...obstacles(fixedControls, 8), ...obstacles(task, 8)];
    if (fixed(margin && visible(margin) ? [...boxes, ...obstacles([margin], 8)] : boxes)) return;
    if (slot && !preferFlow && flow(slot)) return;
    if (active) {
      const visibleControls = Array.from(active.querySelectorAll<HTMLElement>(`${CONTROL}, input, select, textarea`))
        .filter((element) => onScreen(element, safe));
      if (fixed([...boxes, ...obstacles(visibleControls, 8)])) return;
    }
    delete notice.dataset.padPositioned;
  };
}
