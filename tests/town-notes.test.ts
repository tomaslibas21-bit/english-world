import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSurf } from "../src/game/surf/store";
import { emptyProgress } from "../src/state/progress";
import { useStore } from "../src/state/store";
import { townNote } from "../src/state/townNotes";

const state = useStore.getState;
const banner = { title: "Maple Harbor" };
const guide = { step: "walk", ok: false } as const;
const shown = () => {
  const first = state().townToasts[0];
  return first?.startedAt != null ? first.toast.title : undefined;
};

beforeEach(() => {
  vi.useFakeTimers();
  useStore.setState(useStore.getInitialState());
  state().setScreen("play");
});

afterEach(() => {
  useSurf.getState().reset();
  useStore.setState(useStore.getInitialState());
  vi.useRealTimers();
});

describe("town toasts", () => {
  it("waits for the banner and guide, gives each toast at least three seconds, and advances on close", () => {
    state().setHud({ zoneBanner: banner, coach: guide });
    state().toast({ kind: "info", title: "first", ms: 500 });
    state().toast({ kind: "tip", title: "second", ms: 500 });
    state().toast({ kind: "stamp", title: "third", ms: 500 });

    expect(townNote(state().hud)).toBe("banner");
    vi.advanceTimersByTime(2600);
    expect(shown()).toBeUndefined();
    state().setHud({ zoneBanner: null });
    expect(townNote(state().hud)).toBe("guide");
    vi.advanceTimersByTime(1000);
    expect(shown()).toBeUndefined();
    state().setHud({ coach: null });
    expect(shown()).toBe("first");
    vi.advanceTimersByTime(2999);
    expect(shown()).toBe("first");
    vi.advanceTimersByTime(1);
    expect(shown()).toBe("second");
    state().dismissToast(state().townToasts[0].toast.id);
    expect(shown()).toBe("third");
    vi.advanceTimersByTime(3000);
    expect(shown()).toBeUndefined();
  });

  it("drops only stale unseen tips and info, with no size limit on waiting rewards", () => {
    state().setHud({ coach: guide });
    state().toast({ kind: "tip", title: "stale tip" });
    state().toast({ kind: "info", title: "stale info" });
    for (const kind of ["stamp", "success", "stamp", "success", "stamp"] as const) state().toast({ kind, title: kind, ms: 1 });
    vi.advanceTimersByTime(20001);
    state().toast({ kind: "info", title: "recent", ms: 1 });
    state().setHud({ coach: null });
    for (const title of ["stamp", "success", "stamp", "success", "stamp"]) {
      expect(shown()).toBe(title);
      vi.advanceTimersByTime(3000);
    }
    expect(shown()).toBe("recent");
  });

  it("resumes a toast for its remaining time after a banner takes priority", () => {
    state().toast({ kind: "tip", title: "interrupted", ms: 1 });
    vi.advanceTimersByTime(1000);
    state().setHud({ zoneBanner: banner });
    vi.advanceTimersByTime(25000);
    expect(shown()).toBeUndefined();
    state().setHud({ zoneBanner: null });
    expect(shown()).toBe("interrupted");
    vi.advanceTimersByTime(1999);
    expect(shown()).toBe("interrupted");
    vi.advanceTimersByTime(1);
    expect(shown()).toBeUndefined();
  });

  it.each(["panel", "conversation", "light", "surf picker", "surf lesson"] as const)("keeps the existing four-toast stack and expiry in %s", (context) => {
    if (context === "panel") state().setHud({ panel: "map" });
    if (context === "conversation") state().setConv({ active: true });
    if (context === "light") state().setSettings({ play: "light" });
    if (context === "surf picker") useSurf.getState().set({ picking: true });
    if (context === "surf lesson") useSurf.getState().set({ active: true });
    state().setHud({ zoneBanner: banner, coach: guide });
    for (let i = 0; i < 5; i++) state().toast({ kind: "info", title: String(i), ms: 500 });
    expect(state().toasts.map(({ title }) => title)).toEqual(["1", "2", "3", "4"]);
    expect(state().townToasts).toEqual([]);
    vi.advanceTimersByTime(500);
    expect(state().toasts).toEqual([]);
  });

  it("keeps an already visible toast up when a panel opens and holds the queue until it closes", () => {
    state().toast({ kind: "info", title: "visible", ms: 3000 });
    state().toast({ kind: "stamp", title: "waiting", ms: 3000 });
    vi.advanceTimersByTime(1000);
    state().setHud({ panel: "map" });
    expect(state().toasts.map(({ title }) => title)).toEqual(["visible"]);
    expect(shown()).toBeUndefined();
    vi.advanceTimersByTime(2000);
    expect(state().toasts).toEqual([]);
    state().setHud({ panel: null });
    expect(shown()).toBe("waiting");
  });

  it("continues the same toast with its remaining time after a panel briefly opens", () => {
    state().toast({ kind: "info", title: "first", ms: 3000 });
    state().toast({ kind: "stamp", title: "second", ms: 3000 });
    vi.advanceTimersByTime(1000);
    state().setHud({ panel: "map" });
    vi.advanceTimersByTime(1000);
    state().setHud({ panel: null });
    expect(shown()).toBe("first");
    vi.advanceTimersByTime(1000);
    expect(shown()).toBe("second");
  });
});

it("counts each drive, boat trip and swim once, starting at zero on an older save", () => {
  useStore.setState({ progress: { ...emptyProgress(), coach: { done: true } } });
  state().setHud({ ride: "car" });
  expect(state().progress.coach).toEqual({ done: true, rides: 1 });
  state().setHud({ ride: "car" });
  state().setHud({ ride: "boat" });
  state().setHud({ ride: "swim" });
  const swimStarted = state().hud.rideStartedAt;
  vi.advanceTimersByTime(2000);
  state().setHud({ ride: "dive" });
  state().setHud({ ride: "swim" });
  expect(state().progress.coach?.rides).toBe(3);
  expect(state().hud.rideStartedAt).toBe(swimStarted);
  state().setHud({ ride: "surf" });
  state().setHud({ ride: null });
  expect(state().hud.rideStartedAt).toBeNull();
  state().setHud({ ride: "car" });
  expect(state().progress.coach?.rides).toBe(4);
});
