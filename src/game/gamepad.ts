import { GamepadView, textEntry } from "../ui/gamepad";
import { PadButton } from "./padButtons";

export { PadButton } from "./padButtons";

const BUTTONS = PadButton.A | PadButton.B | PadButton.X | PadButton.LB | PadButton.RB | PadButton.LT | PadButton.RT | PadButton.Menu
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
  readonly padAction?: boolean;
  /** Lets Menu reach the mode HUD during physical play. */
  readonly padMenu?: boolean;
  readonly padNavigate?: boolean;
  padTick?(input: Readonly<PadScalars>, pressed: number, released: number, dt: number, direction: number, held: number): PadDebug["lastAction"] | void;
  padCancel?(held: number): void;
}

export interface PadHost {
  /** False pauses the controller, null leaves input to the view, and "menu" also allows Menu and Back. */
  scope?(): "foot" | "car" | "boat" | "menu" | PadScope | null | false;
  canLook?(): boolean;
  orbit?(dx: number, dy: number): void;
  manual?(brake: boolean): void;
  jump?(): void;
  /** False means there was no world interaction, so the camera shortcut may take the press. */
  interact?(): void | boolean;
  horn?(): void;
  back?: () => void;
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

const DIRECTIONS = PadButton.Up | PadButton.Down | PadButton.Left | PadButton.Right;

export class PadDirection {
  private ready = false;
  private stick = 0;
  private held = 0;
  private next = 0;

  reset() { this.ready = false; this.held = this.stick = 0; }

  step(x: number, y: number, buttons: number, armed: number, now: number) {
    const magnitude = Math.max(Math.abs(x), Math.abs(y));
    if (magnitude < 0.35) { this.ready = true; this.stick = 0; }
    else if (this.ready && magnitude >= 0.55) {
      this.stick = Math.abs(y) >= Math.abs(x) ? (y < 0 ? PadButton.Up : PadButton.Down)
        : (x < 0 ? PadButton.Left : PadButton.Right);
    }
    // The physical D-pad masks the stick even while its initial held buttons are disarmed.
    const dpad = buttons & DIRECTIONS, allowed = dpad & armed;
    const direction = dpad ? allowed & -allowed : this.stick;
    if (direction !== this.held) {
      this.held = direction;
      this.next = now + 350;
      return direction;
    }
    if (!direction || now < this.next) return 0;
    this.next = now + 140;
    return direction;
  }
}

type Scope = Exclude<ReturnType<NonNullable<PadHost["scope"]>>, false> | "ui";

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
  private readonly nav = new PadDirection();
  private readonly ui: GamepadView;

  constructor(private debug: PadDebug, private host?: PadHost) {
    this.ui = new GamepadView(debug, (clearFocus) => this.cancel(clearFocus));
  }

  disconnect() {
    if (!this.connected) return;
    this.cancel();
    this.connected = this.debug.connected = false;
    this.debug.lastAction = "disconnect";
    this.ui.disconnect();
    this.host?.connection?.(false);
  }

  dispose() {
    this.cancel();
    this.connected = this.debug.connected = false;
    this.debug.lastAction = null;
    this.ui.dispose();
    this.host?.connection?.(null);
  }

  cancel(clearFocus = true) {
    const scope = this.scope, held = this.held;
    this.revision++;
    this.scope = null;
    this.x = this.y = this.rx = this.ry = this.throttle = 0;
    this.brake = false;
    this.held = this.previous = 0;
    this.buttonsReady = this.leftReady = this.rightReady = this.ltReady = this.rtReady = false;
    this.nav.reset();
    this.debug.focusTarget = null;
    if (clearFocus) this.ui.clearFocus();
    if (scope && typeof scope === "object") scope.padCancel?.(held);
  }

  private readScope(): Scope {
    const base = this.host?.scope?.();
    if (base === false) {
      this.ui.leaveAuxiliary();
      return null;
    }
    if (this.ui.scope) return "ui";
    return textEntry(document.activeElement) ? null : base ?? null;
  }

  private stillIn(scope: Scope, revision: number) {
    this.ui.sync();
    if (revision !== this.revision) return false;
    if (this.readScope() === scope) return true;
    this.cancel();
    return false;
  }

  sample(pad: Gamepad, dt: number) {
    if (!this.connected) {
      this.connected = this.debug.connected = true;
      this.ui.connect();
      const revision = this.revision;
      this.host?.connection?.(true);
      if (revision !== this.revision) return;
    }
    const scope = this.readScope();
    if (this.scope !== scope) {
      this.cancel(this.scope === "ui");
      this.scope = scope;
      if (scope === "ui") this.ui.updateFocus();
    }
    if (!scope) return;
    const revision = this.revision;
    const custom = typeof scope === "object" ? scope : null;
    const driving = scope === "car" || scope === "boat" || !!custom?.padDriving;
    const physical = scope !== "ui" && scope !== "menu";
    const canLook = physical && (!custom || driving) && !!this.host?.canLook?.();
    const wasMoving = this.x || this.y || this.throttle;
    const wasLooking = this.rx || this.ry;
    const wasThrottle = this.throttle;
    const wasBrake = this.brake;

    const x = axis(pad, 0), y = axis(pad, 1), leftScale = scale(x, y, 0.18);
    this.leftReady ||= leftScale === 0;
    this.x = physical && this.leftReady && leftScale ? x * leftScale : 0;
    this.y = physical && this.leftReady && leftScale ? -y * leftScale : 0;

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

    if (scope === "ui") {
      const direction = this.nav.step(x, y, buttons, this.held, performance.now());
      if (!(pressed & (PadButton.B | PadButton.Menu | PadButton.A)) && !direction) return;
      if (!this.stillIn(scope, revision)) return;
      // A close or confirm consumes the sample, including a simultaneous direction.
      if (pressed & PadButton.B) this.ui.back(this.host?.back);
      else if (pressed & PadButton.Menu) this.ui.menu();
      else if (pressed & PadButton.A) this.ui.confirm();
      else this.ui.navigate(direction === PadButton.Up ? "up" : direction === PadButton.Down ? "down" :
        direction === PadButton.Left ? "left" : "right");
      return;
    }
    if ((pressed & PadButton.Menu) && (!custom || driving || custom.padMenu)) {
      if (!this.stillIn(scope, revision)) return;
      if (this.ui.menu()) {
        if (revision === this.revision) this.cancel(false);
        return;
      }
    }
    if ((custom || scope === "menu") && (pressed & PadButton.B) && this.host?.back) {
      if (!this.stillIn(scope, revision)) return;
      this.debug.lastAction = "back";
      this.host.back();
      if (this.stillIn(scope, revision)) this.cancel();
      return;
    }
    if (scope === "foot" || driving) {
      const moving = this.x || this.y || this.throttle;
      if (moving || this.brake) this.host?.manual?.(this.brake);
      if ((!wasMoving && moving) || (!wasThrottle && this.throttle)) this.debug.lastAction = driving ? "throttle" : "walk";
      if (!wasBrake && this.brake) this.debug.lastAction = "brake";
    }
    if (driving && (pressed & PadButton.RB) && this.host?.horn) {
      if (!this.stillIn(scope, revision)) return;
      this.host.horn();
    }
    if (custom) {
      if (custom.padTick) {
        const direction = custom.padNavigate ? this.nav.step(x, y, buttons, this.held, performance.now()) : 0;
        if ((pressed || released || direction) && !this.stillIn(scope, revision)) return;
        const action = custom.padTick(this, pressed, released, dt, direction, this.held);
        if (action) this.debug.lastAction = action;
        if ((pressed || released || direction) && !this.stillIn(scope, revision)) return;
      }
    } else if (physical) {
      if ((pressed & PadButton.X) && this.host?.interact) {
        if (!this.stillIn(scope, revision)) return;
        this.debug.lastAction = "interact";
        if (this.host.interact() === false && scope === "foot") this.ui.photo();
        if (!this.stillIn(scope, revision)) return;
      }
      if (scope === "foot" && (pressed & PadButton.A) && this.host?.jump) {
        if (!this.stillIn(scope, revision)) return;
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
