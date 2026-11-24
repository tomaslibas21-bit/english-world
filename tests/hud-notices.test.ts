import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useStore } from "../src/state/store";
import { taskCardNote } from "../src/ui/Hud";
import { Panels } from "../src/ui/Panels";
import { Toasts } from "../src/ui/Toasts";

vi.hoisted(() => { vi.stubGlobal("location", { search: "" }); });
vi.mock("../src/state/store", async (load) => {
  const store = await load<typeof import("../src/state/store")>();
  type State = ReturnType<typeof store.useStore.getState>;
  return { ...store, useStore: Object.assign((select: (s: State) => unknown) => select(store.useStore.getState()), store.useStore) };
});
afterAll(() => vi.unstubAllGlobals());

describe("task card context", () => {
  it("temporarily folds for short portrait chatter", () => {
    expect(taskCardNote(undefined, false, true)).toBe("chatter");
    expect(taskCardNote(undefined, false, false)).toBe(false);
  });

  it("keeps the directions and phone notice priorities", () => {
    expect(taskCardNote("post-office", true, true)).toBe("post-office");
    expect(taskCardNote(undefined, true, true)).toBe(true);
  });
});

describe("phone notices", () => {
  const state = useStore.getState;
  const fixed = (panelsMounted: boolean) => renderToStaticMarkup(createElement(Toasts, { panelsMounted }));
  const panel = () => renderToStaticMarkup(createElement(Panels));

  beforeEach(() => {
    vi.useFakeTimers();
    useStore.setState(useStore.getInitialState());
    state().setScreen("play");
  });

  afterEach(() => {
    for (const toast of state().toasts) state().dismissToast(toast.id);
    useStore.setState(useStore.getInitialState());
    vi.useRealTimers();
  });

  it.each(["town", "light"] as const)("presents the same stack once when the %s phone mounts", (play) => {
    state().setSettings({ play });
    state().setHud({ panel: "settings" });
    state().toast({ kind: "tip", title: "First", ms: 3000 });
    state().toast({ kind: "stamp", title: "Second", ms: 3000 });
    const original = state().toasts;
    expect(fixed(true)).toMatch(/First.*Second/);

    vi.advanceTimersByTime(1000);
    state().setHud({ panel: "phone" });
    expect(state().toasts).toBe(original);
    expect(fixed(false)).toMatch(/First.*Second/);
    expect(fixed(true)).toBe("");
    expect(panel()).toMatch(/class="phone-status".*<div class="toasts phone-toasts" aria-live="polite">.*First.*Second/);
    expect(panel().match(/aria-live="polite"/g)).toHaveLength(1);

    state().dismissToast(original[0].id);
    expect(panel()).not.toContain("First");
    expect(panel()).toContain("Second");
    state().setHud({ panel: "settings" });
    expect(fixed(true)).toContain("Second");
    state().setHud({ panel: "phone" });
    vi.advanceTimersByTime(1999);
    expect(panel()).toContain("Second");
    vi.advanceTimersByTime(1);
    expect(panel()).toContain('<div class="toasts phone-toasts" aria-live="polite"></div>');
  });

  it("returns an active town notice with its remaining time and keeps the waiting stamp in order", () => {
    state().setSettings({ play: "town" });
    state().toast({ kind: "tip", title: "Active", ms: 3000 });
    state().toast({ kind: "stamp", title: "Waiting", ms: 3000 });
    const [active, waiting] = state().townToasts;

    vi.advanceTimersByTime(1000);
    state().setHud({ panel: "phone" });
    expect(state().toasts).toEqual([active.toast]);
    expect(state().townToasts).toEqual([waiting]);
    expect(panel()).toContain("Active");
    expect(panel()).not.toContain("Waiting");

    vi.advanceTimersByTime(1000);
    state().setHud({ panel: null });
    expect(state().townToasts[0].toast).toBe(active.toast);
    vi.advanceTimersByTime(999);
    expect(state().townToasts[0].toast).toBe(active.toast);
    vi.advanceTimersByTime(1);
    expect(state().townToasts[0].toast).toBe(waiting.toast);
    vi.advanceTimersByTime(3000);
    expect(state().townToasts).toEqual([]);
  });
});
