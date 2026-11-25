export const PadButton = {
  A: 1 << 0, B: 1 << 1, X: 1 << 2, LB: 1 << 4, RB: 1 << 5, LT: 1 << 6, RT: 1 << 7, Menu: 1 << 9,
  Up: 1 << 12, Down: 1 << 13, Left: 1 << 14, Right: 1 << 15,
} as const;
const DIRECTIONS = PadButton.Up | PadButton.Down | PadButton.Left | PadButton.Right;
const BUTTONS = PadButton.A | PadButton.B | PadButton.X | PadButton.LB | PadButton.RB | PadButton.LT | PadButton.RT
  | PadButton.Menu | DIRECTIONS;

export interface PadDebug {
  connected: boolean;
  lastAction: "walk" | "look" | "jump" | "interact" | "horn" | "throttle" | "brake" | "focus" | "confirm" | "back" | "disconnect" | null;
  focusTarget: string | null;
}

export interface PadScalars {
  readonly x: number;
  readonly y: number;
  readonly rx: number;
  readonly ry: number;
  readonly running: boolean;
  readonly throttle: number;
  readonly brake: boolean;
}

export interface PadScope {
  readonly padDriving?: boolean;
  readonly padNavigate?: boolean;
  padTick?(input: PadScalars, pressed: number, released: number, dt: number, direction: number, held: number): PadDebug["lastAction"] | void;
  padCancel?(held: number): void;
}

type Scope = "foot" | "car" | "boat" | PadScope | null;

export interface PadHost {
  scope(): Scope;
  canLook?(): boolean;
  orbit?(dx: number, dy: number): void;
  manual?(brake: boolean): void;
  jump?(): void;
  interact?(): boolean;
  horn?(): void;
}

function axis(pad: Gamepad, index: number) {
  const n = pad.axes?.[index];
  return Number.isFinite(n) ? Math.max(-1, Math.min(1, n)) : 0;
}

function scale(length: number, dead: number) {
  return length > dead ? (Math.min(1, length) - dead) / (1 - dead) / length : 0;
}

function trigger(button: GamepadButton | undefined) {
  const n = button?.value ?? 0;
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0;
}

/** The D-pad takes priority over the stick. Time advances only on the host's existing clock. */
export class PadDirection {
  private ready = false;
  private stick = 0;
  private held = 0;
  private remaining = 0;

  reset() { this.ready = false; this.held = this.stick = this.remaining = 0; }

  step(x: number, rawY: number, buttons: number, armed: number, dt: number) {
    const magnitude = Math.max(Math.abs(x), Math.abs(rawY));
    if (magnitude < 0.35) { this.ready = true; this.stick = 0; }
    else if (this.ready && magnitude >= 0.55) {
      this.stick = Math.abs(rawY) >= Math.abs(x) ? (rawY < 0 ? PadButton.Up : PadButton.Down)
        : (x < 0 ? PadButton.Left : PadButton.Right);
    }
    const dpad = buttons & DIRECTIONS, allowed = dpad & armed;
    const direction = dpad ? allowed & -allowed : this.stick;
    if (direction !== this.held) {
      this.held = direction;
      this.remaining = 0.35;
      return direction;
    }
    if (!direction || (this.remaining -= dt) > 0.000001) return 0;
    this.remaining += 0.14;
    return direction;
  }
}

const CAPTURE = '[role="dialog"], dialog[open], .nat-tipbox, .toolbar .ride-menu[aria-expanded="true"]';
const INACTIVE = '[hidden], [inert], [aria-hidden="true"]';

export class GamepadInput implements PadScalars {
  x = 0; y = 0; rx = 0; ry = 0;
  running = false;
  throttle = 0;
  brake = false;
  private connected = false;
  private scope: Scope = null;
  private revision = 0;
  private previous = 0;
  private held = 0;
  private buttonsReady = false;
  private leftReady = false;
  private rightReady = false;
  private ltReady = false;
  private rtReady = false;
  private readonly nav = new PadDirection();
  private observer?: MutationObserver;
  private surface: Element | null = null;
  private typing = false;

  constructor(private debug: PadDebug, private host?: PadHost) {}

  private refreshSurface() {
    const surfaces = document.body.querySelectorAll(CAPTURE);
    let surface: Element | null = null;
    for (let i = surfaces.length - 1; i >= 0; i--) {
      if (!surfaces[i].closest(INACTIVE)) { surface = surfaces[i]; break; }
    }
    if (surface === this.surface) return;
    this.surface = surface;
    this.cancel();
  }

  private readFocus(target: EventTarget | null) {
    const el = target as HTMLElement | null;
    const typing = !!el && (el.isContentEditable || el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT");
    if (typing === this.typing) return;
    this.typing = typing;
    this.cancel();
  }

  private focus = (event: FocusEvent) => this.readFocus(event.type === "focusin" ? event.target : event.relatedTarget);

  private watchSurface() {
    this.readFocus(document.activeElement);
    document.addEventListener("focusin", this.focus);
    document.addEventListener("focusout", this.focus);
    if (!document.body || typeof MutationObserver === "undefined") return;
    this.refreshSurface();
    this.observer = new MutationObserver(this.surfaceChanged);
    this.observer.observe(document.body, {
      subtree: true, childList: true, attributes: true,
      attributeFilter: ["aria-expanded", "hidden", "inert", "aria-hidden", "role", "open"],
    });
  }

  private surfaceChanged = (records: MutationRecord[]) => {
    for (const record of records) {
      if (record.type === "attributes") {
        const el = record.target as Element;
        if (el === this.surface || el.matches(CAPTURE) ||
            (this.surface && el.contains(this.surface)) || el.querySelector(CAPTURE)) {
          this.refreshSurface();
          return;
        }
        continue;
      }
      if (this.surface && !this.surface.isConnected) { this.refreshSurface(); return; }
      for (const node of record.addedNodes) {
        if (node.nodeType !== 1) continue;
        const el = node as Element;
        if (el.matches(CAPTURE) || el.querySelector(CAPTURE)) { this.refreshSurface(); return; }
      }
    }
  };

  disconnect() {
    this.debug.lastAction = "disconnect";
    if (!this.connected) return;
    this.connected = this.debug.connected = false;
    this.observer?.disconnect();
    this.observer = undefined;
    document.removeEventListener("focusin", this.focus);
    document.removeEventListener("focusout", this.focus);
    this.surface = null;
    this.typing = false;
    this.cancel();
  }

  dispose() {
    this.disconnect();
    this.debug.lastAction = null;
  }

  cancel() {
    const scope = this.scope, held = this.held;
    this.revision++;
    this.scope = null;
    this.x = this.y = this.rx = this.ry = this.throttle = 0;
    this.running = this.brake = false;
    this.held = this.previous = 0;
    this.buttonsReady = this.leftReady = this.rightReady = this.ltReady = this.rtReady = false;
    this.nav.reset();
    this.debug.focusTarget = null;
    if (typeof scope === "object") scope?.padCancel?.(held);
  }

  private readScope(): Scope {
    return this.surface || this.typing ? null : this.host?.scope() ?? null;
  }

  private stillIn(scope: Scope, revision: number) {
    if (revision !== this.revision) return false;
    if (this.observer) this.surfaceChanged(this.observer.takeRecords());
    if (revision !== this.revision) return false;
    if (this.readScope() === scope) return true;
    this.cancel();
    return false;
  }

  sample(pad: Gamepad, elapsed: number) {
    if (!this.connected) {
      this.connected = this.debug.connected = true;
      this.watchSurface();
    }
    const scope = this.readScope();
    if (scope !== this.scope) { this.cancel(); this.scope = scope; }
    if (!scope) return;

    const revision = this.revision;
    const mode = typeof scope === "object" ? scope : null;
    const driving = scope === "car" || scope === "boat" || !!mode?.padDriving;
    const dt = Math.max(0, Math.min(0.05, elapsed || 0));
    const moving = this.x || this.y || this.throttle;
    const looking = this.rx || this.ry;
    const braking = this.brake;
    const x = axis(pad, 0), y = axis(pad, 1), length = Math.hypot(x, y);
    const left = scale(length, 0.18);
    this.leftReady ||= left === 0;
    this.x = this.leftReady && left ? x * left : 0;
    this.y = this.leftReady && left ? -y * left : 0;
    const magnitude = this.leftReady ? length * left : 0;
    this.running = magnitude > 0.90 || (this.running && magnitude > 0.80);

    const rx = axis(pad, 2), ry = axis(pad, 3), right = scale(Math.hypot(rx, ry), 0.20);
    this.rightReady = !!this.host?.canLook?.() && (this.rightReady || right === 0);
    this.rx = this.rightReady && right ? rx * right : 0;
    this.ry = this.rightReady && right ? ry * right : 0;

    const controls = pad.buttons;
    const lt = trigger(controls?.[6]), rt = trigger(controls?.[7]);
    this.ltReady ||= lt <= 0.08;
    this.rtReady ||= rt <= 0.08;
    this.brake = driving && this.ltReady && (braking ? lt > 0.08 : lt >= 0.15);
    this.throttle = driving && this.rtReady && !this.brake && rt > 0.08 ? (rt - 0.08) / 0.92 : 0;
    let buttons = 0;
    for (let i = 0; controls && i < 16 && i < controls.length; i++) {
      const bit = 1 << i;
      if ((BUTTONS & bit) && controls[i]?.pressed === true) buttons |= bit;
    }
    const pressed = this.buttonsReady ? buttons & ~this.previous : 0;
    const released = this.held & ~buttons;
    this.previous = buttons;
    this.buttonsReady = true;
    this.held = (this.held | pressed) & buttons;

    if (this.x || this.y || this.throttle || this.brake) {
      this.host?.manual?.(this.brake);
      if (!moving && (this.x || this.y || this.throttle)) this.debug.lastAction = driving ? "throttle" : "walk";
      if (!braking && this.brake) this.debug.lastAction = "brake";
    }
    if (mode) {
      const direction = mode.padNavigate ? this.nav.step(x, y, buttons, this.held, dt) : 0;
      const action = mode.padTick?.(this, pressed, released, dt, direction, this.held);
      if (this.connected && action) this.debug.lastAction = action;
      if ((pressed || released || direction) && !this.stillIn(scope, revision)) return;
    } else {
      if (pressed & PadButton.X) {
        if (this.host?.interact?.() && this.connected) this.debug.lastAction = "interact";
        if (!this.stillIn(scope, revision)) return;
      }
      if (scope === "foot" && (pressed & PadButton.A)) {
        this.host?.jump?.();
        if (this.connected) this.debug.lastAction = "jump";
        if (!this.stillIn(scope, revision)) return;
      }
      if (scope === "car" && (pressed & PadButton.RB)) {
        this.host?.horn?.();
        if (this.connected) this.debug.lastAction = "horn";
      }
    }
    if ((this.rx || this.ry) && dt > 0) {
      if (!looking) this.debug.lastAction = "look";
      this.host?.orbit?.(this.rx * 400 * dt, this.ry * 300 * dt);
    }
  }
}
