import type { GamepadInput, PadDebug, PadHost, PadScalars } from "./gamepad";

type Stick = { x: number; y: number };

export function effectiveStick(touch: Stick, pad: Readonly<PadScalars> | undefined, driving = false) {
  return !touch.x && !touch.y && pad && (pad.x || pad.y || (driving && pad.throttle)) ? pad : touch;
}

const debug: PadDebug = { connected: false, lastAction: null, focusTarget: null };
declare global {
  interface Window { __pad?: Readonly<PadDebug> }
}

function snapshot() {
  try { return navigator.getGamepads?.(); }
  catch { return undefined; }
}

function standard(pad: Gamepad | null | undefined, index = pad?.index): pad is Gamepad {
  return !!pad?.connected && pad.mapping === "standard" && pad.index === index
    && Number.isInteger(index) && pad.index >= 0;
}

let detach: (() => void) | undefined;

export function attachPad(host?: PadHost, load: () => Promise<{ GamepadInput: typeof GamepadInput }> = () => import("./gamepad")) {
  detach?.();
  window.__pad = debug;
  let runtime: GamepadInput | undefined;
  let index = -1, id = "", generation = 0;
  let blurred = document.hasFocus?.() === false, paused = blurred || document.hidden;

  function take(pad: Gamepad) {
    index = pad.index;
    id = pad.id;
    const token = ++generation;
    if (runtime) return;
    void load().then(({ GamepadInput }) => {
      if (token === generation) runtime = new GamepadInput(debug, host);
    }, () => {
      if (token === generation) index = -1;
    });
  }

  function release() {
    ++generation;
    index = -1;
    if (runtime) runtime.disconnect();
    else debug.lastAction = "disconnect";
  }

  function discover(pads: ReturnType<typeof snapshot>, except = -1, eventPad?: Gamepad) {
    if (index !== -1) return;
    for (let i = 0; pads && i < pads.length; i++) {
      const pad = pads[i];
      if (i !== except && standard(pad, i)) { take(pad); return; }
    }
    if (standard(eventPad)) take(eventPad);
  }

  function connected({ gamepad }: GamepadEvent) {
    if (index === -1 && standard(gamepad)) discover(snapshot(), -1, gamepad);
  }

  function disconnected({ gamepad }: GamepadEvent) {
    if (gamepad.index !== index || gamepad.id !== id) return;
    const lost = index;
    release();
    if (!paused) discover(snapshot(), lost);
  }

  function resume(pads: ReturnType<typeof snapshot>) {
    const pad = pads?.[index];
    if (index !== -1 && (!standard(pad, index) || pad.id !== id)) release();
    discover(pads);
  }

  function visibility(event: Event) {
    if (event.type === "blur") blurred = true;
    else if (event.type === "focus" || (!document.hidden && document.hasFocus?.())) blurred = false;
    if (blurred || document.hidden) {
      if (paused) return;
      paused = true;
      runtime?.cancel();
    } else {
      paused = false;
      resume(snapshot());
    }
  }

  window.addEventListener("gamepadconnected", connected);
  window.addEventListener("gamepaddisconnected", disconnected);
  window.addEventListener("blur", visibility);
  window.addEventListener("focus", visibility);
  document.addEventListener("visibilitychange", visibility);

  function dispose() {
    if (detach !== dispose) return;
    detach = undefined;
    ++generation;
    index = -1;
    window.removeEventListener("gamepadconnected", connected);
    window.removeEventListener("gamepaddisconnected", disconnected);
    window.removeEventListener("blur", visibility);
    window.removeEventListener("focus", visibility);
    document.removeEventListener("visibilitychange", visibility);
    runtime?.dispose();
    runtime = undefined;
    debug.lastAction = null;
  }

  detach = dispose;
  discover(snapshot());
  return {
    get input() { return index === -1 ? undefined : runtime; },
    tick(dt: number) {
      if (index === -1 || !runtime || paused) return;
      const pads = snapshot(), pad = pads?.[index];
      if (standard(pad, index) && pad.id === id) runtime.sample(pad, dt);
      else { release(); discover(pads); }
    },
    cancel() { if (index !== -1) runtime?.cancel(); },
    dispose,
  };
}

export type PadLink = ReturnType<typeof attachPad>;
