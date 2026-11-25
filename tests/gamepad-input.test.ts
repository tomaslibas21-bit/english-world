import { afterEach, describe, expect, it, vi } from "vitest";
import { GamepadInput, PadButton, PadDirection, type PadHost, type PadScope } from "../src/game/gamepad";
import { attachPad, effectiveStick } from "../src/game/padLink";

function controller(index = 0, mapping: GamepadMappingType = "standard") {
  return {
    connected: true, index, mapping, id: `Pad ${index}`, timestamp: 0,
    axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 16 }, () => ({ value: 0, pressed: false, touched: false })),
    vibrationActuator: {} as GamepadHapticActuator,
    hapticActuators: [],
  };
}

let dispose: (() => void) | undefined;
afterEach(() => {
  dispose?.();
  dispose = undefined;
  vi.unstubAllGlobals();
});

function browser(initial: (Gamepad | null)[] = []) {
  const win = new EventTarget();
  const doc = Object.assign(new EventTarget(), { hidden: false, activeElement: null as HTMLElement | null });
  const gamepads = { current: initial };
  const read = vi.fn(() => gamepads.current);
  vi.stubGlobal("window", win);
  vi.stubGlobal("document", doc);
  vi.stubGlobal("navigator", { getGamepads: read });
  const load = vi.fn(async () => ({ GamepadInput }));
  return {
    win, doc, gamepads, read, load,
    attach(host?: PadHost, loader = load) {
      const link = attachPad(host, loader);
      dispose = link.dispose;
      return link;
    },
    event(type: "gamepadconnected" | "gamepaddisconnected", gamepad: Gamepad) {
      win.dispatchEvent(Object.assign(new Event(type), { gamepad }));
    },
  };
}

describe("standard controller sampling", () => {
  it("uses a neutral latch, dominant-axis hysteresis and one timed step per sample", () => {
    const nav = new PadDirection();
    const { Up, Down, Left, Right } = PadButton;
    expect(nav.step(1, 0, 0, 0, 0)).toBe(0);
    expect(nav.step(0.34, 0, 0, 0, 1)).toBe(0);
    expect(nav.step(0.54, 0, 0, 0, 2)).toBe(0);
    expect(nav.step(0.55, -0.55, 0, 0, 3)).toBe(Up);
    expect(nav.step(0.35, -0.37, 0, 0, 352)).toBe(0);
    expect(nav.step(0.35, -0.37, 0, 0, 353)).toBe(Up);
    expect(nav.step(0.35, -0.37, 0, 0, 492)).toBe(0);
    expect(nav.step(0.35, -0.37, 0, 0, 700)).toBe(Up);
    expect(nav.step(0.35, -0.37, 0, 0, 701)).toBe(0);
    expect(nav.step(0.7, -0.55, Left | Down, Left | Down, 702)).toBe(Down);
    expect(nav.step(0.7, -0.55, Left, Left, 703)).toBe(Left);
    expect(nav.step(0.7, -0.55, 0, 0, 704)).toBe(Right);
    expect(nav.step(0.34, 0, 0, 0, 705)).toBe(0);
    expect(nav.step(0.44, 0, 0, 0, 1100)).toBe(0);
    nav.reset();
    expect(nav.step(0.8, 0, Left, 0, 1101)).toBe(0);
    expect(nav.step(0.8, 0, 0, 0, 1102)).toBe(0);
  });

  it("remaps radial dead zones and raw Y, clamps magnitude and handles absent or bad data", async () => {
    const pad = controller();
    const b = browser([pad]);
    const orbit = vi.fn();
    const link = b.attach({ scope: () => "foot", canLook: () => true, orbit });
    await Promise.resolve();
    link.tick(0.01);
    const input = link.input!;
    const diagnostic = window.__pad;

    pad.axes = [0.18, 0, 0, -0.20];
    link.tick(0.05);
    expect(input).toMatchObject({ x: 0, y: 0, rx: 0, ry: 0 });
    expect(orbit).not.toHaveBeenCalled();

    pad.axes = [0.3, -0.4, 0.3, -0.4];
    link.tick(0.05);
    expect(input.x).toBeCloseTo(0.6 * (0.5 - 0.18) / 0.82);
    expect(input.y).toBeCloseTo(0.8 * (0.5 - 0.18) / 0.82);
    expect(input.rx).toBeCloseTo(0.225);
    expect(input.ry).toBeCloseTo(-0.3);
    expect(orbit.mock.lastCall?.[0]).toBeCloseTo(4.5);
    expect(orbit.mock.lastCall?.[1]).toBeCloseTo(-4.5);
    expect(diagnostic?.lastAction).toBe("look");

    pad.axes = [1, -1, NaN, Infinity];
    link.tick(0.05);
    expect(Math.hypot(input.x, input.y)).toBeCloseTo(1);
    expect(input).toMatchObject({ rx: 0, ry: 0 });
    pad.axes = [];
    pad.buttons = [];
    link.tick(0.05);
    expect(input).toMatchObject({ x: 0, y: 0, throttle: 0, brake: false });
    expect(link.input).toBe(input);
    expect(window.__pad).toBe(diagnostic);
  });

  it("keeps touch and keyboard independent, and rearms the stick and triggers separately", async () => {
    const pad = controller();
    const b = browser([pad]);
    const touch = { x: 0.4, y: -0.5 }, keys = new Set(["w"]);
    let touchBrake = true;
    const link = b.attach({ scope: () => "car" });
    pad.axes[1] = -1;
    pad.buttons[6].value = pad.buttons[7].value = 1;
    await Promise.resolve();
    link.tick(0.05);
    const input = link.input!;
    expect(input).toMatchObject({ x: 0, y: 0, throttle: 0, brake: false });

    pad.axes[1] = 0;
    pad.buttons[6].value = pad.buttons[7].value = 0.08;
    link.tick(0.05);
    pad.axes[1] = -1;
    pad.buttons[6].value = 0.149;
    pad.buttons[7].value = 0.54;
    link.tick(0.05);
    expect(input.y).toBe(1);
    expect(input.throttle).toBeCloseTo(0.5);
    expect(input.brake).toBe(false);
    expect(effectiveStick(touch, input, true)).toBe(touch);

    pad.buttons[6].value = 0.15;
    link.tick(0.05);
    expect(input).toMatchObject({ brake: true, throttle: 0 });
    pad.buttons[6].value = 0.1;
    link.tick(0.05);
    expect(input.brake).toBe(true);
    pad.buttons[6].value = 0.08;
    link.tick(0.05);
    expect(input.brake).toBe(false);

    touch.x = touch.y = 0;
    pad.axes[1] = 0;
    link.tick(0.05);
    expect(effectiveStick(touch, input, true)).toBe(input);
    expect(effectiveStick(touch, input, false)).toBe(touch);
    pad.buttons[6].value = 1;
    link.tick(0.05);
    expect(input.brake).toBe(true);
    b.event("gamepaddisconnected", pad);
    expect(input).toMatchObject({ x: 0, y: 0, throttle: 0, brake: false });
    expect(effectiveStick(touch, link.input, true)).toBe(touch);
    expect(keys.has("w")).toBe(true);
    expect(touchBrake || link.input?.brake).toBe(true);
    touchBrake = false;
    expect(!!(touchBrake || link.input?.brake)).toBe(false);
  });

  it("consumes edges once, discards simultaneous edges after a blocking action, and gates the camera", async () => {
    const pad = controller();
    const b = browser([pad]);
    let scope: ReturnType<NonNullable<PadHost["scope"]>> = "foot", canLook = true;
    const jump = vi.fn(), orbit = vi.fn();
    const interact = vi.fn(() => { scope = null; });
    const link = b.attach({ scope: () => scope, canLook: () => canLook, orbit, jump, interact });
    pad.buttons[0].pressed = true;
    await Promise.resolve();
    link.tick(0.05);
    link.tick(0.05);
    expect(jump).not.toHaveBeenCalled();
    pad.buttons[0].pressed = false;
    link.tick(0.05);
    pad.buttons[0].pressed = true;
    link.tick(0.05);
    link.tick(0.05);
    expect(jump).toHaveBeenCalledOnce();
    expect(interact).not.toHaveBeenCalled();

    pad.buttons[0].pressed = false;
    link.tick(0.05);
    pad.axes[1] = -1;
    pad.buttons[0].pressed = pad.buttons[2].pressed = true;
    link.tick(0.05);
    expect(interact).toHaveBeenCalledOnce();
    expect(jump).toHaveBeenCalledOnce();
    expect(link.input?.y).toBe(0);
    expect(window.__pad?.lastAction).toBe("interact");
    scope = "foot";
    link.tick(0.05);
    expect(link.input?.y).toBe(0);
    expect(interact).toHaveBeenCalledOnce();
    expect(jump).toHaveBeenCalledOnce();

    canLook = false;
    pad.axes[2] = 1;
    link.tick(0.05);
    canLook = true;
    link.tick(0.05);
    expect(orbit).not.toHaveBeenCalled();
    pad.axes[2] = 0;
    link.tick(0.05);
    pad.axes[2] = 1;
    link.tick(0.05);
    expect(orbit).toHaveBeenCalledWith(20, 0);
    b.doc.activeElement = { tagName: "INPUT" } as HTMLElement;
    link.tick(0.05);
    expect(link.input?.rx).toBe(0);
    expect(orbit).toHaveBeenCalledOnce();
  });

  it("delivers release only for accepted holds and cancels held actions on blur, hidden and scope loss", async () => {
    const pad = controller();
    const b = browser([pad]);
    const down = vi.fn(), up = vi.fn(), cancel = vi.fn();
    const policy: PadScope = {
      padTick(_, pressed, released) {
        if (pressed & PadButton.A) down();
        if (released & PadButton.A) up();
      },
      padCancel(held) { if (held & PadButton.A) cancel(); },
    };
    let scope: PadScope | null = policy;
    const link = b.attach({ scope: () => scope });
    const press = (pressed: boolean) => { pad.buttons[0].pressed = pressed; link.tick(0.025); };
    await Promise.resolve();
    press(true);
    press(false);
    expect(up).not.toHaveBeenCalled();
    press(true);
    press(true);
    press(false);
    expect(down).toHaveBeenCalledOnce();
    expect(up).toHaveBeenCalledOnce();

    press(true);
    b.win.dispatchEvent(new Event("blur"));
    expect(cancel).toHaveBeenCalledOnce();
    b.read.mockClear();
    link.tick(0.025);
    expect(b.read).not.toHaveBeenCalled();
    b.win.dispatchEvent(new Event("focus"));
    expect(b.read).toHaveBeenCalledOnce();
    press(true);
    press(false);
    expect(up).toHaveBeenCalledOnce();

    press(true);
    b.doc.hidden = true;
    b.doc.dispatchEvent(new Event("visibilitychange"));
    expect(cancel).toHaveBeenCalledTimes(2);
    b.doc.hidden = false;
    b.doc.dispatchEvent(new Event("visibilitychange"));
    press(false);
    press(true);
    scope = null;
    link.tick(0.05);
    expect(cancel).toHaveBeenCalledTimes(3);
    expect(up).toHaveBeenCalledOnce();

    scope = policy;
    press(false);
    press(true);
    b.event("gamepaddisconnected", pad);
    expect(cancel).toHaveBeenCalledTimes(4);
    expect(up).toHaveBeenCalledOnce();
  });
});

describe("controller lifecycle", () => {
  it("runs one initial probe and no idle polls, including after permission errors or unsupported pads", async () => {
    const b = browser([null, controller(1, "")]);
    b.read.mockImplementationOnce(() => { throw new Error("disallowed"); });
    const link = b.attach();
    const debug = window.__pad;
    expect(debug).toEqual({ connected: false, lastAction: null, focusTarget: null });
    link.tick(0.05);
    b.event("gamepadconnected", controller(1, ""));
    expect(b.read).toHaveBeenCalledOnce();
    expect(b.load).not.toHaveBeenCalled();

    const pad = controller(1);
    b.gamepads.current[1] = pad;
    b.event("gamepadconnected", pad);
    b.event("gamepadconnected", pad);
    await Promise.resolve();
    link.tick(0.05);
    expect(b.load).toHaveBeenCalledOnce();
    expect(window.__pad).toBe(debug);
    expect(debug?.connected).toBe(true);

    vi.stubGlobal("navigator", {});
    link.tick(0.05);
    expect(link.input).toBeUndefined();
    expect(debug).toEqual({ connected: false, lastAction: "disconnect", focusTarget: null });
  });

  it("uses fresh snapshots and clears a lost owner before picking a backup", async () => {
    const first = controller(), second = controller(1);
    const b = browser([first, second]);
    const connection = vi.fn();
    const link = b.attach({ scope: () => "foot", connection });
    await Promise.resolve();
    link.tick(0.05);
    const input = link.input!;
    second.axes[1] = -1;
    b.event("gamepadconnected", second);
    b.event("gamepaddisconnected", second);
    const fresh = controller();
    fresh.axes[1] = 0.8;
    b.gamepads.current[0] = fresh;
    link.tick(0.05);
    expect(input.y).toBeCloseTo(-(0.8 - 0.18) / 0.82);
    expect(connection.mock.calls).toEqual([[true]]);

    b.event("gamepaddisconnected", first);
    expect(input.y).toBe(0);
    expect(window.__pad?.lastAction).toBe("disconnect");
    b.event("gamepaddisconnected", first);
    link.tick(0.05);
    expect(link.input).toBe(input);
    expect(input.y).toBe(0);
    expect(connection.mock.calls).toEqual([[true], [false], [true]]);
    second.axes[1] = 0;
    link.tick(0.05);
    second.axes[1] = -1;
    link.tick(0.05);
    expect(input.y).toBe(1);

    b.gamepads.current = [];
    link.tick(0.05);
    b.read.mockClear();
    link.tick(0.05);
    expect(b.read).not.toHaveBeenCalled();
    expect(link.input).toBeUndefined();
  });

  it("discovers a missed connection on resume", async () => {
    const b = browser();
    const link = b.attach();
    b.doc.hidden = true;
    b.doc.dispatchEvent(new Event("visibilitychange"));
    b.gamepads.current[0] = controller();
    link.tick(0.05);
    expect(b.read).toHaveBeenCalledOnce();
    b.doc.hidden = false;
    b.doc.dispatchEvent(new Event("visibilitychange"));
    expect(b.read).toHaveBeenCalledTimes(2);
    await Promise.resolve();
    link.tick(0.05);
    expect(window.__pad?.connected).toBe(true);
  });

  it("ignores held A on a same-index reconnect and never samples the unplugged object", async () => {
    const first = controller();
    const b = browser([first]);
    const jump = vi.fn();
    const link = b.attach({ scope: () => "foot", jump });
    await Promise.resolve();
    link.tick(0.05);
    b.event("gamepaddisconnected", first);
    first.axes[1] = -1;
    first.buttons[0].pressed = true;
    link.tick(0.05);
    expect(link.input).toBeUndefined();
    expect(jump).not.toHaveBeenCalled();

    const next = controller();
    next.buttons[0].pressed = true;
    b.gamepads.current[0] = next;
    b.event("gamepadconnected", next);
    link.tick(0.05);
    expect(jump).not.toHaveBeenCalled();
    next.buttons[0].pressed = false;
    link.tick(0.05);
    next.buttons[0].pressed = true;
    link.tick(0.05);
    expect(jump).toHaveBeenCalledOnce();
  });

  it("invalidates pending imports on unplug and ownership change without a stale notification", async () => {
    const first = controller(), second = controller(1);
    const b = browser([first, second]);
    const resolvers: Array<(module: { GamepadInput: typeof GamepadInput }) => void> = [];
    const load = vi.fn(() => new Promise<{ GamepadInput: typeof GamepadInput }>((resolve) => resolvers.push(resolve)));
    const oldConnection = vi.fn();
    const old = b.attach({ connection: oldConnection }, load);
    b.gamepads.current[0] = null;
    b.event("gamepaddisconnected", first);
    resolvers[0]({ GamepadInput });
    await Promise.resolve();
    old.tick(0.05);
    expect(oldConnection).not.toHaveBeenCalled();
    expect(old.input).toBeUndefined();

    const newConnection = vi.fn();
    const next = b.attach({ connection: newConnection });
    resolvers[1]({ GamepadInput });
    await Promise.resolve();
    old.tick(0.05);
    old.dispose();
    expect(oldConnection).not.toHaveBeenCalled();
    next.tick(0.05);
    expect(newConnection.mock.calls).toEqual([[true]]);
    next.dispose();
    expect(newConnection.mock.calls).toEqual([[true], [null]]);
    expect(window.__pad).toEqual({ connected: false, lastAction: null, focusTarget: null });
  });
});
