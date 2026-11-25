import { afterEach, describe, expect, it, vi } from "vitest";
import { GamepadInput, PadButton, PadDirection, type PadHost, type PadScope } from "../src/game/gamepad";
import { attachPad, effectiveStick, type PadLink } from "../src/game/padLink";

const runtime = { GamepadInput };
const load = async () => runtime;
let link: PadLink | undefined;

function controller(index = 0, id = "pad", mapping: GamepadMappingType = "standard") {
  return {
    index, id, mapping, connected: true, timestamp: 0,
    axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 16 }, () => ({ pressed: false, touched: false, value: 0 })),
  };
}

type TestPad = ReturnType<typeof controller>;
type Snapshot = (TestPad | null | undefined)[];

function browser(initial: Snapshot = []) {
  const win = new EventTarget() as EventTarget & Pick<Window, "__pad">;
  const doc = Object.assign(new EventTarget(), { hidden: false, activeElement: null, hasFocus: () => true });
  let pads = initial;
  const poll = vi.fn(() => pads);
  vi.stubGlobal("window", win);
  vi.stubGlobal("document", doc);
  vi.stubGlobal("navigator", { getGamepads: poll });
  return {
    win, doc, poll,
    snapshot: (value: Snapshot) => { pads = value; },
    event: (type: "gamepadconnected" | "gamepaddisconnected", gamepad: TestPad) => {
      win.dispatchEvent(Object.assign(new Event(type), { gamepad }));
    },
    attach: (host?: PadHost, importPad = load) => link = attachPad(host, importPad),
  };
}

afterEach(() => {
  link?.dispose();
  link = undefined;
  vi.unstubAllGlobals();
});

describe("pad attachment", () => {
  it("takes one discovery read, idles, and samples only snapshots of the first standard owner", async () => {
    const b = browser();
    const loadPad = vi.fn(load);
    const pad = b.attach({ scope: () => "foot" }, loadPad);
    const debug = b.win.__pad;
    expect(debug).toEqual({ connected: false, lastAction: null, focusTarget: null });
    for (let i = 0; i < 60; i++) pad.tick(0.016);
    expect(b.poll).toHaveBeenCalledOnce();
    expect(loadPad).not.toHaveBeenCalled();

    const other = controller(1, "nonstandard", ""), first = controller(3), second = controller(4);
    b.snapshot([null, other, , first, second]);
    const eventPad = controller(4);
    b.event("gamepadconnected", eventPad);
    b.event("gamepadconnected", eventPad);
    await Promise.resolve();
    expect(loadPad).toHaveBeenCalledOnce();
    b.poll.mockClear();
    for (let i = 0; i < 20; i++) pad.tick(0.016);
    expect(b.poll).toHaveBeenCalledTimes(20);
    expect(b.win.__pad).toBe(debug);
    expect(debug?.connected).toBe(true);

    const stale = controller(3, "old pad");
    b.event("gamepaddisconnected", stale);
    b.event("gamepaddisconnected", eventPad);
    b.snapshot([null, other, null, { ...first, axes: [1, 0, 0, 0] }, second]);
    pad.tick(0.016);
    expect(pad.input?.x).toBe(1);
    expect(first.axes[0]).toBe(0);

    // A missing owner cancels immediately. The same poll finds the next pad.
    second.axes[0] = 1;
    b.snapshot([null, other, null, null, second]);
    b.poll.mockClear();
    pad.tick(0.016);
    expect(b.poll).toHaveBeenCalledOnce();
    expect(debug).toEqual({ connected: false, lastAction: "disconnect", focusTarget: null });
    pad.tick(0.016);
    expect(pad.input?.x).toBe(0);
    second.axes[0] = 0;
    pad.tick(0.016);
    second.axes[0] = -1;
    pad.tick(0.016);
    expect(pad.input?.x).toBe(-1);
  });

  it("drops pending imports on disconnect, same-slot reconnect, and host replacement", async () => {
    const first = controller(), b = browser([first]);
    const pending: ((value: typeof runtime) => void)[] = [];
    const delayed = () => new Promise<typeof runtime>((resolve) => pending.push(resolve));
    const old = b.attach({ scope: () => "foot", jump: vi.fn() }, delayed);
    const debug = b.win.__pad;
    b.snapshot([]);
    b.event("gamepaddisconnected", first);
    const replacement = controller();
    replacement.buttons[0].pressed = true;
    b.snapshot([replacement]);
    b.event("gamepadconnected", replacement);
    pending[0](runtime);
    await Promise.resolve();
    old.tick(0.05);
    expect(old.input).toBeUndefined();
    expect(debug?.connected).toBe(false);

    const jump = vi.fn(), current = b.attach({ scope: () => "foot", jump });
    pending[1](runtime);
    await Promise.resolve();
    old.dispose();
    current.tick(0.05);
    current.tick(0.05);
    expect(b.win.__pad).toBe(debug);
    expect(debug?.connected).toBe(true);
    expect(old.input).toBeUndefined();
    expect(jump).not.toHaveBeenCalled();
    replacement.buttons[0].pressed = false;
    current.tick(0.05);
    replacement.buttons[0].pressed = true;
    current.tick(0.05);
    expect(jump).toHaveBeenCalledOnce();
  });

  it("recovers from absent and throwing APIs on focus and stops polling after loss", async () => {
    const b = browser(), first = controller();
    vi.stubGlobal("navigator", {});
    const pad = b.attach({ scope: () => "foot" });
    pad.tick(0.05);
    vi.stubGlobal("navigator", { getGamepads: b.poll });
    b.poll.mockImplementationOnce(() => { throw new Error("unavailable"); });
    b.win.dispatchEvent(new Event("focus"));
    pad.tick(0.05);
    expect(b.poll).toHaveBeenCalledOnce();
    b.snapshot([first]);
    b.win.dispatchEvent(new Event("focus"));
    await Promise.resolve();
    pad.tick(0.05);
    expect(b.win.__pad?.connected).toBe(true);
    b.poll.mockImplementationOnce(() => { throw new Error("lost"); });
    pad.tick(0.05);
    expect(pad.input).toBeUndefined();
    b.poll.mockClear();
    pad.tick(0.05);
    pad.dispose();
    b.win.dispatchEvent(new Event("focus"));
    b.doc.dispatchEvent(new Event("visibilitychange"));
    b.event("gamepadconnected", first);
    expect(b.poll).not.toHaveBeenCalled();
  });
});

describe("pad samples", () => {
  it("keeps touch, driving triggers, and the idle keyboard fallback independent", async () => {
    const first = controller(), b = browser([first]), manual = vi.fn();
    const pad = b.attach({ scope: () => "car", manual });
    const touch = { x: 0, y: 0 };
    const tick = () => pad.tick(0.05);
    const source = () => effectiveStick(touch, pad.input, true);
    await Promise.resolve();
    tick();
    expect(source()).toBe(touch);
    expect(manual).not.toHaveBeenCalled();
    first.buttons[7].value = 0.54;
    tick();
    expect(pad.input?.throttle).toBeCloseTo(0.5);
    expect(source()).toBe(pad.input);
    touch.x = 0.3;
    expect(source()).toBe(touch);
    first.buttons[6].value = 0.15;
    tick();
    expect(pad.input).toMatchObject({ brake: true, throttle: 0 });
    first.buttons[6].value = 0.10;
    tick();
    expect(pad.input?.brake).toBe(true);
    first.buttons[6].value = 0.08;
    tick();
    expect(pad.input?.brake).toBe(false);
    touch.x = 0;
    expect(source()).toBe(pad.input);
    b.snapshot([]);
    b.event("gamepaddisconnected", first);
    expect(source()).toBe(touch);
    expect(touch).toEqual({ x: 0, y: 0 });
  });

  it("rearms each control after blur, visibility, and scope changes", async () => {
    const first = controller(), b = browser([first]), jump = vi.fn(), orbit = vi.fn();
    let scope: ReturnType<PadHost["scope"]> = "foot";
    const pad = b.attach({ scope: () => scope, jump, canLook: () => true, orbit });
    const tick = () => pad.tick(1);
    const held = () => {
      first.axes = [1, -1, 0, -1];
      first.buttons[0].pressed = true;
    };
    held();
    await Promise.resolve();
    tick();
    expect(pad.input).toMatchObject({ x: 0, y: 0, ry: 0 });
    expect(jump).not.toHaveBeenCalled();

    // Short or invalid samples are neutral. The diagonal caps at unit magnitude.
    first.axes = [NaN, Infinity];
    first.buttons = [];
    tick();
    first.buttons = controller().buttons;
    held();
    tick();
    tick();
    expect(jump).toHaveBeenCalledOnce();
    expect(orbit).toHaveBeenLastCalledWith(0, -15);
    expect(Math.hypot(pad.input!.x, pad.input!.y)).toBeCloseTo(1);
    expect(pad.input?.running).toBe(true);
    first.axes = [0, -0.89];
    tick();
    expect(pad.input?.running).toBe(true);
    first.axes[1] = -0.83;
    tick();
    expect(pad.input?.running).toBe(false);

    b.win.dispatchEvent(new Event("blur"));
    b.poll.mockClear();
    expect(pad.input?.y).toBe(0);
    tick();
    expect(b.poll).not.toHaveBeenCalled();
    b.win.dispatchEvent(new Event("focus"));
    tick();
    expect(pad.input?.y).toBe(0);
    b.doc.hidden = true;
    b.doc.dispatchEvent(new Event("visibilitychange"));
    b.doc.hidden = false;
    b.doc.dispatchEvent(new Event("visibilitychange"));
    scope = null;
    tick();
    scope = "foot";
    held();
    tick();
    expect(pad.input).toMatchObject({ x: 0, y: 0, ry: 0 });
    expect(jump).toHaveBeenCalledOnce();
  });

  it("consumes simultaneous edges at a scope change and cancels mode-held actions", async () => {
    const first = controller(), b = browser([first]), jump = vi.fn();
    const mode: PadScope = { padDriving: true, padTick: vi.fn(), padCancel: vi.fn() };
    let scope: ReturnType<PadHost["scope"]> = "foot";
    const interact = vi.fn(() => { scope = mode; return true; });
    const pad = b.attach({ scope: () => scope, jump, interact });
    await Promise.resolve();
    pad.tick(0.05);
    first.buttons[0].pressed = first.buttons[2].pressed = true;
    pad.tick(0.05);
    expect(interact).toHaveBeenCalledOnce();
    expect(jump).not.toHaveBeenCalled();
    pad.tick(0.05);
    expect(mode.padTick).toHaveBeenLastCalledWith(pad.input, 0, 0, 0.05, 0, 0);
    first.buttons[0].pressed = first.buttons[2].pressed = false;
    pad.tick(0.05);
    first.buttons[0].pressed = true;
    pad.tick(0.05);
    expect(mode.padTick).toHaveBeenLastCalledWith(pad.input, PadButton.A, 0, 0.05, 0, PadButton.A);
    scope = null;
    pad.tick(0.05);
    expect(mode.padCancel).toHaveBeenCalledExactlyOnceWith(PadButton.A);
  });

  it("cancels held actions across phases of the same mode and window blur without delivering a release", async () => {
    const first = controller(), b = browser([first]);
    let phase = "aim";
    const tick = vi.fn<NonNullable<PadScope["padTick"]>>((_input, pressed) => {
      if (pressed & PadButton.X) phase = "next";
    });
    const cancel = vi.fn();
    const mode: PadScope = { get padPhase() { return phase; }, padTick: tick, padCancel: cancel };
    const pad = b.attach({ scope: () => mode });
    await Promise.resolve();

    const sample = () => pad.tick(0.016);
    const a = first.buttons[0], x = first.buttons[2];
    sample();
    a.pressed = true;
    first.axes[0] = 0.9;
    sample();
    x.pressed = true;
    sample();
    expect(cancel).toHaveBeenCalledExactlyOnceWith(PadButton.A | PadButton.X);
    expect(pad.input?.x).toBe(0);

    sample();
    expect(tick.mock.lastCall?.slice(1)).toEqual([0, 0, 0.016, 0, 0]);
    a.pressed = x.pressed = false;
    first.axes[0] = 0;
    sample();
    a.pressed = true;
    sample();
    b.win.dispatchEvent(new Event("blur"));
    expect(cancel).toHaveBeenLastCalledWith(PadButton.A);
    const calls = tick.mock.calls.length;
    sample();
    expect(tick).toHaveBeenCalledTimes(calls);
    b.win.dispatchEvent(new Event("focus"));
    sample();
    expect(tick.mock.lastCall?.[1]).toBe(0);
    a.pressed = false;
    sample();
    expect(tick.mock.calls.every(([, , released]) => !released)).toBe(true);

    a.pressed = true;
    sample();
    a.pressed = false;
    sample();
    expect(tick.mock.lastCall?.[2]).toBe(PadButton.A);
  });

  it("captures a drawer opened by touch and rearms movement after it closes", async () => {
    const first = controller(), b = browser([first]);
    let open = false;
    let changed!: MutationCallback;
    const disconnect = vi.fn();
    vi.stubGlobal("MutationObserver", class {
      constructor(callback: MutationCallback) { changed = callback; }
      observe() {}
      disconnect = disconnect;
    });
    const menu = { matches: () => open, closest: () => null, isConnected: true };
    const querySelectorAll = vi.fn(() => open ? [menu] : []);
    Object.assign(b.doc, { body: { querySelectorAll } });
    const drawerRendered = () => changed(
      [{ type: "attributes", target: menu } as unknown as MutationRecord], {} as MutationObserver,
    );
    const pad = b.attach({ scope: () => "foot" });
    await Promise.resolve();
    pad.tick(0.05);
    first.axes[1] = -1;
    pad.tick(0.05);
    expect(querySelectorAll).toHaveBeenCalledOnce();
    expect(pad.input?.y).toBe(1);
    open = true;
    drawerRendered();
    expect(pad.input?.y).toBe(0);
    pad.tick(0.05);
    open = false;
    drawerRendered();
    pad.tick(0.05);
    expect(pad.input?.y).toBe(0);
    first.axes[1] = 0;
    pad.tick(0.05);
    first.axes[1] = -1;
    pad.tick(0.05);
    expect(pad.input?.y).toBe(1);
    pad.dispose();
    expect(disconnect).toHaveBeenCalledOnce();
  });

  it("repeats directions on the sample clock and gives the D-pad priority", () => {
    const nav = new PadDirection();
    expect(nav.step(0, -1, 0, 0, 0.05)).toBe(0);
    nav.step(0, 0, 0, 0, 0.05);
    expect(nav.step(0, -1, 0, 0, 0.05)).toBe(PadButton.Up);
    for (let i = 0; i < 6; i++) expect(nav.step(0, -1, 0, 0, 0.05)).toBe(0);
    expect(nav.step(0, -1, 0, 0, 0.05)).toBe(PadButton.Up);
    expect(nav.step(0, -1, PadButton.Left, 0, 0.05)).toBe(0);
    expect(nav.step(0, -1, PadButton.Left, PadButton.Left, 0.05)).toBe(PadButton.Left);
  });
});
