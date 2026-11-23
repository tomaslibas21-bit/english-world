// How the game is used, for the course's owner (state/playStats.ts): only active, visible time counts, by mode, with
// the time in conversations and the radio's; openings and days go into the save, which an older save lacks.
import { describe, expect, it, vi } from "vitest";
import {
  IDLE_MS, RADIO_IDLE_MS, TICK_MS, PlayMeter, addCount, addOpen, addTime, addView, emptyPlayStats, localDay, readPlayStats, startPlayStats,
} from "../src/state/playStats";
import { endpoint } from "../src/state/stats";
import { useStore } from "../src/state/store";

it("sends one anonymous game:left per unfinished run and includes it in the hide or close flush", () => {
  const page = new EventTarget();
  const doc = Object.assign(new EventTarget(), { visibilityState: "visible" });
  const fetch = vi.fn(async (_url: string, _init: RequestInit) => new Response(null, { status: 204 }));
  vi.useFakeTimers();
  vi.stubGlobal("window", page);
  vi.stubGlobal("document", doc);
  vi.stubGlobal("location", { pathname: "/" });
  vi.stubGlobal("navigator", {});
  vi.stubGlobal("localStorage", { getItem: () => JSON.stringify({ url: "https://stats.test", key: "public" }), setItem() {} });
  vi.stubGlobal("fetch", fetch);
  const events = () => fetch.mock.calls.flatMap(([, init]) => JSON.parse(String(init.body)))
    .filter((row) => row.name === "game:left").map((row) => row.props);
  const state = useStore.getState;
  const begin = (sitId: string, of: number) => state().setConv((c) => ({
    sitId, active: true, completed: false, run: c.run + 1, stepProgress: { step: 1, of },
  }));
  try {
    startPlayStats();
    useStore.setState({ screen: "play", settings: { ...state().settings, play: "light" } });
    begin("first", 7);
    state().setConv({ stepProgress: { step: 3, of: 7 }, stepId: "pending-question" });
    state().setConv({ active: false });
    vi.advanceTimersByTime(10_000);
    const first = { section: "light", sit: "first", step: 3, of: 7 };
    expect(events()).toEqual([first]);

    begin("finished", 5);
    state().setConv({ completed: true });
    page.dispatchEvent(new Event("pagehide"));
    state().setConv({ active: false });
    expect(events()).toEqual([first]);

    begin("hidden", 4);
    doc.visibilityState = "hidden";
    doc.dispatchEvent(new Event("visibilitychange"));
    const hidden = { section: "light", sit: "hidden", step: 1, of: 4 };
    expect(events()).toEqual([first, hidden]);
    page.dispatchEvent(new Event("pagehide"));
    state().setConv({ active: false });

    begin("closed", 8);
    state().setConv({ stepProgress: { step: 6, of: 8 } });
    page.dispatchEvent(new Event("pagehide"));
    expect(events()).toEqual([first, hidden, { section: "light", sit: "closed", step: 6, of: 8 }]);
  } finally {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  }
});

function clock(start = Date.UTC(2026, 10, 14, 10)) {
  let t = start;
  return { now: () => t, go: (ms: number) => { t += ms; } };
}

/** Ticks every TICK_MS for `ms`. */
function play(m: PlayMeter, c: ReturnType<typeof clock>, ms: number, input = false) {
  for (let done = 0; done < ms; done += TICK_MS) { c.go(TICK_MS); if (input) m.input(); m.tick(); }
}

describe("the play meter", () => {
  it("counts nothing before the learner is in a mode (the title screen, loading)", () => {
    const c = clock(), m = new PlayMeter(c.now);
    m.input();
    play(m, c, 60_000, true);
    expect(m.hasPending()).toBe(false);
  });

  it("counts active time in the mode being played, and stops two minutes after the last input", () => {
    const c = clock(), m = new PlayMeter(c.now);
    m.mode = "town";
    m.input();
    play(m, c, 60_000, true);
    play(m, c, 10 * 60_000);
    const p = m.take();
    // one minute of play, then two more until the learner counts as away
    expect(p.town.sec).toBeCloseTo((60_000 + IDLE_MS) / 1000, 0);
    expect(p.light.sec).toBe(0);
    expect(m.take().town.sec).toBe(0);
  });

  it("a hidden tab never counts, nor does a long gap between ticks (a sleeping computer)", () => {
    const c = clock(), m = new PlayMeter(c.now);
    m.mode = "light";
    m.input();
    m.setVisible(false);
    play(m, c, 60_000, true);
    expect(m.hasPending()).toBe(false);
    m.setVisible(true);
    m.input();
    c.go(3 * 60 * 60_000);
    m.input();
    m.tick();
    expect(m.take().light.sec).toBe(TICK_MS / 1000);
  });

  it("counts the time in conversations apart, and the radio while it sounds", () => {
    const c = clock(), m = new PlayMeter(c.now);
    m.mode = "town";
    play(m, c, 30_000, true);
    m.talking = true;
    play(m, c, 60_000, true);
    m.talking = false;
    m.radio = true;
    play(m, c, 30_000, true);
    // the radio goes on longer than the play without input, then stops too
    play(m, c, 20 * 60_000);
    const p = m.take();
    expect(p.town.sec).toBeCloseTo(120 + IDLE_MS / 1000, 0);
    expect(p.town.talk).toBeCloseTo(60, 0);
    expect(p.radio).toBeCloseTo(30 + RADIO_IDLE_MS / 1000, 0);
  });
});

describe("the save's counts", () => {
  it("an older save has none; a damaged one counts from zero", () => {
    expect(readPlayStats({})).toEqual(emptyPlayStats());
    const s = readPlayStats({ play: { opens: "x", days: ["2026-11-14", 3, "bad"], town: { sec: -1, opens: 2 }, radio: 12 } as never });
    expect(s.opens).toBe(0);
    expect(s.days).toEqual(["2026-11-14"]);
    expect(s.town).toEqual({ sec: 0, talk: 0, opens: 2, started: 0, finished: 0 });
    expect(s.radio).toBe(12);
  });

  it("openings, days and minutes add up", () => {
    const day1 = new Date(2026, 10, 13, 20).getTime(), day2 = new Date(2026, 10, 14, 9).getTime();
    let s = addOpen(emptyPlayStats(), day1, null, true);
    s = addOpen(s, day1, "town", false);
    s = addTime(s, { town: { sec: 300, talk: 120 }, light: { sec: 0, talk: 0 }, radio: 90 }, day1);
    s = addOpen(s, day2, null, true);
    s = addOpen(s, day2, "light", false);
    s = addTime(s, { town: { sec: 0, talk: 0 }, light: { sec: 240.04, talk: 200 }, radio: 0 }, day2);
    s = addTime(s, { town: { sec: 0, talk: 0 }, light: { sec: 60, talk: 0 }, radio: 0 }, day2);
    expect(s).toMatchObject({
      opens: 2, first: day1, last: day2, radio: 90,
      days: [localDay(day1), localDay(day2)],
      town: { sec: 300, talk: 120, opens: 1 },
      light: { sec: 300, talk: 200, opens: 1 },
    });
  });
});

describe("the anonymous counts", () => {
  it("go nowhere without the course's address (the game's own dev server, tests)", () => {
    expect(endpoint()).toBeNull();
  });
});

describe("the picture/3D choices, rides and lessons", () => {
  it("an older save has none, and a damaged one keeps only plain names and counts", () => {
    const s = readPlayStats({ play: { opens: 2 } as never });
    expect(s.view).toEqual({ pictures: 0, threeD: 0, talks: 0 });
    expect(s.rides).toEqual({});
    expect(s.games).toEqual({});
    const d = readPlayStats({ play: { rides: { car: 3, "<b>": 1, boat: -2, x: "7" }, games: [1], view: { pictures: 2, threeD: "a" } } as never });
    expect(d.rides).toEqual({ car: 3 });
    expect(d.games).toEqual({});
    expect(d.view).toEqual({ pictures: 2, threeD: 0, talks: 0 });
  });

  it("counts each ride, lesson and choice, and the day it happened", () => {
    const t = Date.UTC(2026, 10, 16, 12);
    let s = emptyPlayStats();
    s = addCount(s, "rides", "car", t);
    s = addCount(s, "rides", "car", t);
    s = addCount(s, "rides", "boat", t);
    s = addCount(s, "games", "surf", t);
    s = addView(addView(s, true), false);
    const back = readPlayStats({ play: JSON.parse(JSON.stringify(s)) });
    expect(back.rides).toEqual({ car: 2, boat: 1 });
    expect(back.games).toEqual({ surf: 1 });
    expect(back.view).toEqual({ pictures: 1, threeD: 1, talks: 0 });
    expect(back.days).toEqual([localDay(t)]);
    expect(back.last).toBe(t);
  });
});
