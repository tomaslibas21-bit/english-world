// How the game is used, for the course's owner (state/playStats.ts): only active, visible time counts, by mode, with
// the time in conversations and the radio's; openings and days go into the save, which an older save lacks.
import { describe, expect, it } from "vitest";
import {
  IDLE_MS, RADIO_IDLE_MS, TICK_MS, PlayMeter, addOpen, addTime, emptyPlayStats, localDay, readPlayStats,
} from "../src/state/playStats";
import { endpoint } from "../src/state/stats";

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
