export const PadButton = {
  A: 1 << 0, B: 1 << 1, X: 1 << 2, LT: 1 << 6, RT: 1 << 7, Menu: 1 << 9,
  Up: 1 << 12, Down: 1 << 13, Left: 1 << 14, Right: 1 << 15,
} as const;
const BUTTONS = PadButton.A | PadButton.B | PadButton.X | PadButton.LT | PadButton.RT | PadButton.Menu
  | PadButton.Up | PadButton.Down | PadButton.Left | PadButton.Right;

export interface PadDebug {
  connected: boolean;
  lastAction: "walk" | "look" | "jump" | "interact" | "throttle" | "brake" | "focus" | "confirm" | "back" | "disconnect" | null;
  focusTarget: string | null;
}

export interface PadScalars {
  x: number;
  y: number;
  rx: number;
  ry: number;
  throttle: number;
  brake: boolean;
}

/** A stable scope can opt into continuous driving, button handling or both. */
export interface PadScope {
  readonly padDriving?: boolean;
  padTick?(input: Readonly<PadScalars>, pressed: number, released: number, dt: number): void;
  padCancel?(held: number): void;
}

export interface PadHost {
  scope?(): "foot" | "car" | "boat" | PadScope | null;
  canLook?(): boolean;
  orbit?(dx: number, dy: number): void;
  manual?(brake: boolean): void;
  jump?(): void;
  interact?(): void;
  connection?(connected: boolean | null): void;
}

function axis(pad: Gamepad, index: number) {
  const n = pad.axes[index];
  return Number.isFinite(n) ? n : 0;
}

function scale(x: number, y: number, dead: number) {
  const length = Math.hypot(x, y);
  return length > dead ? (Math.min(1, length) - dead) / (1 - dead) / length : 0;
}

function trigger(pad: Gamepad, index: number) {
  const n = pad.buttons[index]?.value;
  return Number.isFinite(n) ? Math.min(1, n) : 0;
}

type Scope = ReturnType<NonNullable<PadHost["scope"]>>;

export class GamepadInput implements PadScalars {
  x = 0; y = 0; rx = 0; ry = 0;
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

  constructor(private debug: PadDebug, private host?: PadHost) {}

  disconnect() {
    if (!this.connected) return;
    this.cancel();
    this.connected = this.debug.connected = false;
    this.debug.lastAction = "disconnect";
    this.host?.connection?.(false);
  }

  dispose() {
    this.cancel();
    this.connected = this.debug.connected = false;
    this.debug.lastAction = null;
    this.host?.connection?.(null);
  }

  cancel() {
    const scope = this.scope, held = this.held;
    this.revision++;
    this.scope = null;
    this.x = this.y = this.rx = this.ry = this.throttle = 0;
    this.brake = false;
    this.held = this.previous = 0;
    this.buttonsReady = this.leftReady = this.rightReady = this.ltReady = this.rtReady = false;
    this.debug.focusTarget = null;
    if (scope && typeof scope === "object" && held) scope.padCancel?.(held);
  }

  private readScope(): Scope {
    const field = document.activeElement as HTMLElement | null;
    if (field && (field.isContentEditable || field.tagName === "INPUT" || field.tagName === "TEXTAREA" || field.tagName === "SELECT")) return null;
    return this.host?.scope?.() ?? null;
  }

  private stillIn(scope: Scope, revision: number) {
    if (revision !== this.revision) return false;
    if (this.readScope() === scope) return true;
    this.cancel();
    return false;
  }

  sample(pad: Gamepad, dt: number) {
    if (!this.connected) {
      this.connected = this.debug.connected = true;
      const revision = this.revision;
      this.host?.connection?.(true);
      if (revision !== this.revision) return;
    }
    const scope = this.readScope();
    if (this.scope !== scope) {
      this.cancel();
      this.scope = scope;
    }
    if (!scope) return;
    const revision = this.revision;
    const custom = typeof scope === "object" ? scope : null;
    const driving = scope === "car" || scope === "boat" || !!custom?.padDriving;
    const canLook = (!custom || driving) && !!this.host?.canLook?.();
    const wasMoving = this.x || this.y || this.throttle;
    const wasLooking = this.rx || this.ry;
    const wasThrottle = this.throttle;
    const wasBrake = this.brake;

    const x = axis(pad, 0), y = axis(pad, 1), leftScale = scale(x, y, 0.18);
    this.leftReady ||= leftScale === 0;
    this.x = this.leftReady && leftScale ? x * leftScale : 0;
    this.y = this.leftReady && leftScale ? -y * leftScale : 0;

    const rx = axis(pad, 2), ry = axis(pad, 3), rightScale = scale(rx, ry, 0.20);
    this.rightReady = canLook && (this.rightReady || rightScale === 0);
    this.rx = this.rightReady && rightScale ? rx * rightScale : 0;
    this.ry = this.rightReady && rightScale ? ry * rightScale : 0;

    const lt = trigger(pad, 6), rt = trigger(pad, 7);
    this.ltReady ||= lt <= 0.08;
    this.rtReady ||= rt <= 0.08;
    this.brake = driving && this.ltReady && (wasBrake ? lt > 0.08 : lt >= 0.15);
    this.throttle = driving && this.rtReady && !this.brake && rt > 0.08 ? (rt - 0.08) / 0.92 : 0;

    let buttons = 0;
    for (let i = 0; i < 16 && i < pad.buttons.length; i++) {
      const bit = 1 << i;
      if ((BUTTONS & bit) && pad.buttons[i]?.pressed) buttons |= bit;
    }
    const pressed = this.buttonsReady ? buttons & ~this.previous : 0;
    const released = this.held & ~buttons;
    this.previous = buttons;
    this.buttonsReady = true;
    this.held = (this.held | pressed) & buttons;

    if (scope === "foot" || driving) {
      const moving = this.x || this.y || this.throttle;
      if (moving || this.brake) this.host?.manual?.(this.brake);
      if ((!wasMoving && moving) || (!wasThrottle && this.throttle)) this.debug.lastAction = driving ? "throttle" : "walk";
      if (!wasBrake && this.brake) this.debug.lastAction = "brake";
    }
    if (custom) {
      if (custom.padTick) {
        custom.padTick(this, pressed, released, dt);
        if (!this.stillIn(scope, revision)) return;
      }
    } else {
      if ((pressed & PadButton.X) && this.host?.interact) {
        this.debug.lastAction = "interact";
        this.host.interact();
        if (!this.stillIn(scope, revision)) return;
      }
      if (scope === "foot" && (pressed & PadButton.A) && this.host?.jump) {
        this.debug.lastAction = "jump";
        this.host.jump();
        if (!this.stillIn(scope, revision)) return;
      }
    }
    if ((this.rx || this.ry) && dt > 0 && this.host?.orbit) {
      if (!wasLooking) this.debug.lastAction = "look";
      this.host.orbit(this.rx * 400 * dt, this.ry * 300 * dt);
    }
  }
}
