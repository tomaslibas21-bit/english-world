// The first-time guide of the 3D town (game/coach.ts): its hints in order, each done by doing it or by "Toliau",
// skipped with "Praleisti", remembered so it never comes back; and the one-time tip about running.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { coach } from "../src/game/coach";
import { useStore } from "../src/state/store";
import { radio } from "../src/radio";

const hud = () => useStore.getState().hud.coach;
const fresh = () => {
  useStore.getState().updateProgress((p) => { delete p.coach; });
  useStore.setState({ toasts: [] });
  useStore.getState().setHud({ coach: null });
};

describe("the first-time guide", () => {
  beforeEach(() => { vi.useFakeTimers(); fresh(); radio.store.setState({ available: false }); });

  it("shows walk, run, jump, talk and the pictures' switch in order, the radio's hint only where there is a radio", () => {
    coach.begin();
    const seen: string[] = [];
    while (hud()) { seen.push(hud()!.step); expect(hud()!.of).toBe(5); coach.next(); }
    expect(seen).toEqual(["walk", "run", "jump", "talk", "scenes"]);
    expect(useStore.getState().progress.coach?.done).toBe(true);
    fresh();
    radio.store.setState({ available: true });
    coach.begin();
    const withRadio: string[] = [];
    while (hud()) { withRadio.push(hud()!.step); coach.next(); }
    expect(withRadio).toEqual(["walk", "run", "jump", "talk", "radio", "scenes"]);
  });

  it("a hint ticks itself off when the learner does it, and only its own doing counts", () => {
    coach.begin();
    coach.did("jump"); coach.did("run", 5);
    expect(hud()).toMatchObject({ step: "walk", ok: false });
    coach.did("walk", 3);
    expect(hud()!.ok).toBe(false);
    coach.did("walk", 5);
    expect(hud()).toMatchObject({ step: "walk", ok: true });
    vi.advanceTimersByTime(1200);
    expect(hud()).toMatchObject({ step: "run", n: 2, ok: false });
    coach.did("run", 0.5); coach.did("run", 0.8);
    vi.advanceTimersByTime(1200);
    expect(hud()!.step).toBe("jump");
    coach.did("jump");
    vi.advanceTimersByTime(1200);
    expect(hud()!.step).toBe("talk");
    coach.did("talk");
    vi.advanceTimersByTime(1200);
    expect(hud()!.step).toBe("scenes");
    coach.finish();
    expect(hud()).toBeNull();
  });

  it("skipped or finished, it is remembered and never comes back", () => {
    coach.begin();
    expect(hud()!.step).toBe("walk");
    coach.finish();
    expect(hud()).toBeNull();
    expect(useStore.getState().progress.coach?.done).toBe(true);
    coach.begin();
    expect(hud()).toBeNull();
  });

  it("the tip about running: once, after a long stretch at a walk, not during the guide and not after its own hint about running", () => {
    const tips = () => useStore.getState().toasts.map((t) => t.title);
    // skipped at the first hint: the tip is still to come
    coach.begin();
    coach.finish();
    for (let i = 0; i < 300; i++) coach.stroll(1 / 60, false, false);
    expect(tips()).toEqual([]);
    coach.stroll(1 / 60, true, false); // they stopped: the count starts again
    for (let i = 0; i < 300; i++) coach.stroll(1 / 60, false, false);
    expect(tips()).toEqual([]);
    for (let i = 0; i < 80; i++) coach.stroll(1 / 60, false, false);
    expect(tips()).toEqual(["Laikyk Shift – bėgsi."]);
    for (let i = 0; i < 2000; i++) coach.stroll(1 / 60, false, false);
    expect(tips().length).toBe(1);
    // on a phone, the stick's own words
    fresh();
    coach.begin(); coach.finish();
    for (let i = 0; i < 400; i++) coach.stroll(1 / 60, false, true);
    expect(tips()).toEqual(["Patrauk vairalazdę iki krašto – bėgsi."]);
    // the guide got as far as running: no tip afterwards; nor while the guide is up
    fresh();
    coach.begin();
    for (let i = 0; i < 1000; i++) coach.stroll(1 / 60, false, false);
    expect(tips()).toEqual([]);
    coach.next(); coach.finish();
    for (let i = 0; i < 1000; i++) coach.stroll(1 / 60, false, false);
    expect(tips()).toEqual([]);
  });
});
