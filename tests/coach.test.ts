// The town's guide (game/coach.ts): a hint when its thing first matters, one at a time, each shown once and
// remembered; done by doing it, by "Gerai" or by itself after a while; "Daugiau nerodyti" ends them all.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { coach, COACH_STEPS } from "../src/game/coach";
import { useStore } from "../src/state/store";
import { radio } from "../src/radio";

const hud = () => useStore.getState().hud.coach;
const prompt = (kind: "talk" | "drive" | "boat" | "enter" | null) => useStore.getState().setHud({ prompt: kind ? { label: "x", kind } : null });
const fresh = () => {
  useStore.getState().updateProgress((p) => { delete p.coach; });
  useStore.setState({ toasts: [] });
  useStore.getState().setHud({ coach: null, prompt: null, ride: null });
};

describe("the town's guide", () => {
  beforeEach(() => { vi.useFakeTimers(); fresh(); radio.store.setState({ available: false }); });

  it("opens with how to walk, and nothing else until something matters", () => {
    coach.begin();
    expect(hud()).toMatchObject({ step: "walk", ok: false });
    coach.next();
    expect(hud()).toBeNull();
    // the next visit: not again
    coach.begin();
    expect(hud()).toBeNull();
    expect(useStore.getState().progress.coach?.seen).toEqual({ walk: true });
    expect(useStore.getState().progress.coach?.done).toBeUndefined();
  });

  it("a hint ticks itself off when the learner does it, and only its own doing counts", () => {
    coach.begin();
    coach.did("run", 5);
    expect(hud()).toMatchObject({ step: "walk", ok: false });
    coach.did("walk", 3);
    expect(hud()!.ok).toBe(false);
    coach.did("walk", 5);
    expect(hud()).toMatchObject({ step: "walk", ok: true });
    vi.advanceTimersByTime(1200);
    expect(hud()).toBeNull();
  });

  it("standing by somebody, by a car, by a boat: each one's hint, once, and one at a time", () => {
    coach.begin();
    prompt("talk"); // (how to walk is still up: not yet)
    expect(hud()!.step).toBe("walk");
    coach.next(); // "Gerai": what matters right now comes up
    expect(hud()!.step).toBe("talk");
    coach.did("talk");
    vi.advanceTimersByTime(1200);
    expect(hud()).toBeNull();
    prompt(null); prompt("talk");
    expect(hud()).toBeNull();
    prompt("enter");
    expect(hud()).toBeNull();
    prompt("drive");
    expect(hud()!.step).toBe("car");
    useStore.getState().setHud({ ride: "car" }); // they take the wheel
    expect(hud()).toMatchObject({ step: "car", ok: true });
    vi.advanceTimersByTime(1200);
    useStore.getState().setHud({ ride: null });
    prompt("boat");
    expect(hud()!.step).toBe("boat");
    // nothing done about it: it goes by itself
    vi.advanceTimersByTime(26000);
    expect(hud()).toBeNull();
    prompt(null); prompt("boat");
    expect(hud()).toBeNull();
  });

  it("the sea's hint at the water's edge; none for what the learner already did by themselves", () => {
    coach.begin(); coach.next();
    useStore.getState().setHud({ ride: "swim" }); // swam before the hint ever came up
    expect(coach.cue("water")).toBe(false);
    coach.did("jump");
    coach.did("walk", 30);
    expect(hud()).toBeNull();
    fresh();
    coach.begin(); coach.next();
    expect(coach.cue("water")).toBe(true);
    expect(hud()!.step).toBe("water");
  });

  it("after a stretch on foot: jumping, and later the radio where there is one", () => {
    radio.store.setState({ available: true });
    coach.begin(); coach.next();
    coach.did("walk", 20);
    expect(hud()).toBeNull();
    coach.did("walk", 6);
    expect(hud()!.step).toBe("jump");
    coach.did("jump");
    vi.advanceTimersByTime(1200);
    coach.did("walk", 60);
    expect(hud()).toBeNull();
    coach.did("walk", 40);
    expect(hud()!.step).toBe("radio");
    coach.did("radio");
    vi.advanceTimersByTime(1200);
    expect(hud()).toBeNull();
    // without a radio, no hint about it
    fresh();
    radio.store.setState({ available: false });
    coach.begin(); coach.next();
    coach.did("walk", 26); coach.next();
    coach.did("walk", 200);
    expect(hud()).toBeNull();
  });

  it("the hint about running: once, after a long stretch at a walk, never while another hint is up", () => {
    coach.begin();
    for (let i = 0; i < 1000; i++) coach.stroll(1 / 60, false);
    expect(hud()!.step).toBe("walk");
    coach.next();
    for (let i = 0; i < 300; i++) coach.stroll(1 / 60, false);
    expect(hud()).toBeNull();
    coach.stroll(1 / 60, true); // they stopped: the count starts again
    for (let i = 0; i < 300; i++) coach.stroll(1 / 60, false);
    expect(hud()).toBeNull();
    for (let i = 0; i < 80; i++) coach.stroll(1 / 60, false);
    expect(hud()!.step).toBe("run");
    coach.did("run", 2);
    vi.advanceTimersByTime(1200);
    for (let i = 0; i < 2000; i++) coach.stroll(1 / 60, false);
    expect(hud()).toBeNull();
    expect(useStore.getState().progress.coach?.run).toBe(true);
  });

  it("\"Daugiau nerodyti\" ends them all, as a guide finished before this one does", () => {
    coach.begin();
    coach.finish();
    expect(hud()).toBeNull();
    expect(useStore.getState().progress.coach?.done).toBe(true);
    coach.begin();
    prompt("talk"); prompt("drive");
    coach.did("walk", 300);
    for (let i = 0; i < 1000; i++) coach.stroll(1 / 60, false);
    expect(hud()).toBeNull();
    for (const s of COACH_STEPS) expect(coach.cue(s)).toBe(false);
  });
});
