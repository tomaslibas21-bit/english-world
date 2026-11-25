import type { GamepadInput, PadDebug, PadHost, PadScalars } from "./gamepad";

type Stick = { x: number; y: number };

export function effectiveStick(touch: Stick, pad: Readonly<PadScalars> | undefined, driving: boolean) {
  return !touch.x && !touch.y && pad && (pad.x || pad.y || (driving && pad.throttle)) ? pad : touch;
}

const debug: PadDebug = { connected: false, lastAction: null, focusTarget: null };
const diagnostics: Readonly<PadDebug> = Object.freeze({
  get connected() { return debug.connected; },
  get lastAction() { return debug.lastAction; },
  get focusTarget() { return debug.focusTarget; },
});
declare global {
  interface Window { __pad?: Readonly<PadDebug> }
}

function snapshot() {
  try { return navigator.getGamepads?.(); }
  catch { return undefined; }
}

function isStandard(pad: Gamepad | null | undefined): pad is Gamepad {
  return !!pad?.connected && pad.mapping === "standard";
}

let detach: (() => void) | undefined;

export function attachPad(host?: PadHost, load: () => Promise<{ GamepadInput: typeof GamepadInput }> = () => import("./gamepad")) {
  detach?.();
  window.__pad = diagnostics;
  let runtime: GamepadInput | undefined;
  let index = -1, generation = 0;
  let blurred = false, paused = document.hidden;

  function take(pad: Gamepad) {
    index = pad.index;
    const token = ++generation;
    if (runtime) return;
    void load().then(({ GamepadInput }) => {
      if (token !== generation) return;
      runtime = new GamepadInput(debug, host);
    }, () => {
      if (token === generation) index = -1;
    });
  }

  function clear() {
    ++generation;
    index = -1;
    runtime?.disconnect();
  }

  function discover(pads: ReturnType<typeof snapshot>, except = -1, eventPad?: Gamepad) {
    if (index !== -1 || detach !== dispose) return;
    for (let i = 0; pads && i < pads.length; i++) {
      const pad = pads[i];
      if (i !== except && isStandard(pad) && pad.index === i) { take(pad); return; }
    }
    if (isStandard(eventPad)) take(eventPad);
  }

  function connected(event: GamepadEvent) {
    if (index === -1 && isStandard(event.gamepad)) discover(snapshot(), -1, event.gamepad);
  }

  function disconnected(event: GamepadEvent) {
    if (event.gamepad.index !== index) return;
    const lost = index;
    clear();
    if (!paused) discover(snapshot(), lost);
  }

  function visibility(event: Event) {
    if (event.type === "blur") blurred = true;
    else if (event.type === "focus" || (!document.hidden && document.hasFocus?.())) blurred = false;
    const suspend = blurred || document.hidden;
    if (suspend === paused) return;
    paused = suspend;
    if (paused) { runtime?.cancel(); return; }
    const pads = snapshot();
    const pad = pads?.[index];
    if (index !== -1 && (!isStandard(pad) || pad.index !== index)) clear();
    discover(pads);
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
  }

  detach = dispose;
  discover(snapshot());
  return {
    get input() { return index === -1 ? undefined : runtime; },
    tick(dt: number) {
      if (index === -1 || !runtime || paused) return;
      const pads = snapshot(), pad = pads?.[index];
      if (isStandard(pad) && pad.index === index) runtime.sample(pad, dt);
      else {
        clear();
        discover(pads);
      }
    },
    cancel() { if (index !== -1) runtime?.cancel(); },
    dispose,
  };
}

export type PadLink = ReturnType<typeof attachPad>;
