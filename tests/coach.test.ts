// The town's guide (game/coach.ts): a hint when its thing first matters, one at a time, each shown once and
// remembered; done by doing it, by "Gerai" or by itself after a while; "Daugiau nerodyti" ends them all.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { coach, COACH_STEPS } from "../src/game/coach";
import { useStore, type HudState } from "../src/state/store";
import { radio } from "../src/radio";

const hud = () => useStore.getState().hud.coach;
const prompt = (kind: NonNullable<HudState["prompt"]>["kind"] | null) =>
  useStore.getState().setHud({ prompt: kind ? { label: "x", kind } : null });
const fresh = () => {
  useStore.getState().updateProgress((p) => { delete p.coach; });
  useStore.setState({ toasts: [] });
  useStore.getState().setHud({ coach: null, prompt: null, ride: null, walking: false, panel: null, zoneBanner: null, phoneCard: null });
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

  it("keeps a hint that was ticked off while a place banner was up", () => {
    coach.begin();
    useStore.getState().setHud({ zoneBanner: { title: "Maple Harbor" } });
    coach.did("walk", 8);
    vi.advanceTimersByTime(2600);
    expect(hud()).toMatchObject({ step: "walk", ok: true });
    useStore.getState().setHud({ zoneBanner: null });
    vi.advanceTimersByTime(1099);
    expect(hud()?.ok).toBe(true);
    vi.advanceTimersByTime(1);
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

  it.each([false, true])("replaces a passed car with talk, with cleared prompt = %s", (cleared) => {
    coach.begin(); coach.next();
    prompt("drive");
    expect(hud()).toEqual({ step: "car", ok: false });
    vi.advanceTimersByTime(7000);
    if (cleared) {
      prompt(null);
      expect(hud()).toBeNull();
    }
    prompt("talk");
    expect(hud()).toEqual({ step: "talk", ok: false });
    vi.advanceTimersByTime(24999); // Past the discarded car cue's deadline.
    expect(hud()?.step).toBe("talk");
    vi.advanceTimersByTime(1);
    expect(hud()).toBeNull();
  });

  it("drops a passed car when the talk cue was already seen", () => {
    const st = useStore.getState();
    st.updateProgress((p) => { p.coach = { seen: { talk: true } }; });
    coach.begin(); coach.next();
    prompt("drive");
    expect(hud()?.step).toBe("car");
    prompt("talk");
    expect(hud()).toBeNull();
    prompt("drive");
    expect(hud()).toBeNull();
    expect(useStore.getState().progress.coach?.seen).toMatchObject({ car: true, talk: true });
  });

  it.each([null, "out", "together"] as const)("acknowledges genuine boarding with the prompt transition %s", (transition) => {
    const st = useStore.getState();
    coach.begin(); coach.next();
    prompt("drive");
    vi.advanceTimersByTime(8000);
    if (transition === "together") {
      st.setHud({ ride: "car", prompt: null });
    } else {
      prompt(null); // boardRide clears this before updateHud reports the ride.
      expect(hud()).toBeNull();
      vi.advanceTimersByTime(120);
      if (transition) prompt(transition);
      st.setHud({ ride: "car" });
    }
    expect(hud()).toEqual({ step: "car", ok: true });
    prompt("out");
    vi.advanceTimersByTime(1099);
    expect(hud()).toEqual({ step: "car", ok: true });
    vi.advanceTimersByTime(1);
    expect(hud()).toBeNull();
  });

  it("keeps a car offer for 25 uncovered seconds and cancels a pending tick when coaching ends", () => {
    const st = useStore.getState();
    coach.begin(); coach.next();
    prompt("drive");
    vi.advanceTimersByTime(10000);
    st.setHud({ phoneCard: "lizzie" });
    vi.advanceTimersByTime(20000);
    expect(hud()).toEqual({ step: "car", ok: false });
    st.setHud({ phoneCard: null });
    vi.advanceTimersByTime(14999);
    expect(hud()?.step).toBe("car");
    vi.advanceTimersByTime(1);
    expect(hud()).toBeNull();
    prompt(null);
    st.updateProgress((p) => { delete p.coach?.seen?.car; });
    prompt("drive");
    prompt(null);
    coach.finish();
    st.setHud({ ride: "car" });
    expect(hud()).toBeNull();
  });

  it("acknowledges surf and water on their own ride signals", () => {
    const st = useStore.getState();
    coach.begin(); coach.next();
    prompt("surf");
    st.setHud({ ride: "surf", prompt: null });
    expect(hud()).toEqual({ step: "surf", ok: true });
    vi.advanceTimersByTime(1100);
    expect(coach.cue("water")).toBe(true);
    st.setHud({ ride: "swim" });
    expect(hud()).toEqual({ step: "water", ok: true });
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

  // Owner, 18 Nov 2026: the 3D game opens straight in the town; the list of situations opens from its button.
  it("a later visit opens in the town: once, where the list of situations is", () => {
    // the first visit (after the flight): how to walk, nothing about the list
    coach.begin();
    expect(hud()).toMatchObject({ step: "walk" });
    coach.next();
    // the next visit opens where the learner left off
    useStore.getState().setHud({ panel: null });
    coach.begin(true);
    expect(hud()).toMatchObject({ step: "list", ok: false });
    // opening the list ticks it off
    useStore.getState().setHud({ panel: "scenarios" });
    expect(hud()).toMatchObject({ step: "list", ok: true });
    vi.advanceTimersByTime(1200);
    expect(hud()).toBeNull();
    useStore.getState().setHud({ panel: null });
    coach.begin(true);
    expect(hud()).toBeNull();
  });

  it("whoever opens the list by themselves is never told where it is", () => {
    coach.begin(); coach.next();
    useStore.getState().setHud({ panel: "scenarios" });
    useStore.getState().setHud({ panel: null });
    expect(useStore.getState().progress.coach?.seen?.list).toBe(true);
    coach.begin(true);
    expect(hud()).toBeNull();
  });

  it.each([{ walking: true }, { ride: "car" }, { ride: "boat" }] as const)("retires the returning list cue on %j", (movement) => {
    const st = useStore.getState();
    st.updateProgress((p) => { p.coach = { seen: { walk: true } }; });
    coach.begin(true);
    expect(hud()).toEqual({ step: "list", ok: false });
    st.setHud(movement);
    expect(hud()).toBeNull();
    expect(useStore.getState().progress.coach?.seen?.list).toBe(true);
    st.setHud({ walking: false, ride: null });
    coach.begin(true);
    expect(hud()).toBeNull();
  });

  it("retires a list cue offered during a walk and leaves no timer", () => {
    const st = useStore.getState();
    st.updateProgress((p) => { p.coach = { seen: { walk: true } }; });
    st.setHud({ walking: true });
    coach.begin(true);
    expect(hud()).toBeNull();
    expect(useStore.getState().progress.coach?.seen?.list).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("acknowledges the list if the learner opens it while starting to walk", () => {
    const st = useStore.getState();
    st.updateProgress((p) => { p.coach = { seen: { walk: true } }; });
    coach.begin(true);
    st.setHud({ panel: "scenarios", walking: true });
    expect(hud()).toEqual({ step: "list", ok: true });
    vi.advanceTimersByTime(1100);
    expect(hud()).toBeNull();
  });

  it("a learner who finished the guide of before (every visit opened with the list then) is told once too", () => {
    useStore.getState().updateProgress((p) => { p.coach = { done: true, run: true }; });
    coach.begin(true);
    expect(hud()).toMatchObject({ step: "list" });
    coach.next();
    coach.begin(true);
    expect(hud()).toBeNull();
    // and nothing else comes up for them
    prompt("talk"); coach.did("walk", 300);
    expect(hud()).toBeNull();
  });
});
