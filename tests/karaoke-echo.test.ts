import { afterEach, describe, expect, it, vi } from "vitest";
import { KaraokePractice, echoCalls, echoGap } from "../src/game/karaoke/practice";
import { KaraokeSession } from "../src/radio/karaokeSession";
import { withSungTranslations } from "../src/radio/lyrics";
import type { SongLine } from "../src/radio/songs";
import type { RadioOutput } from "../src/radio/output";

const row = (i: number, s: number, e: number): SongLine => ({
  i, s, e, sec: i, src: "Say it", lt: "Pasakyk", u: [["Say", "Pasakyk", 1], ["it", "tai", 1]], wt: ["Say", "it"], w: [[s, (s + e) / 2], [(s + e) / 2, e]],
});
const lines = [row(0, 1, 2), row(1, 3, 4)];
async function fixture(mode: "along" | "echo" = "echo", duration = 6, data = lines) {
  let at = 0;
  const output: RadioOutput = {
    play: vi.fn(async (_url, offset) => { at = offset; return true; }), pause: vi.fn(), position: () => at,
    duration: () => duration, setVolume() {}, unlock() {}, onEnded: null, onStopped: null,
  };
  const close = vi.fn();
  const session = new KaraokeSession({
    config: { index: "/songs/index.json", files: null, recordings: null }, output,
    song: () => ({ id: "G01", t: "Home", tl: "Namo", c: "g", n: 1, tp: "", g: "", d: duration, a: "/G01.mp3" }),
    token: () => null, fetchJson: async () => ({ L: data }), level: () => 1, held: false, resumeDelay: 700, close,
  });
  await session.start("G01", mode);
  return { session, output, close, at: (value: number) => { at = value; },
    step(to: number, elapsed = 0.05) { at = to; session.tick(elapsed); } };
}
afterEach(() => { vi.useRealTimers(); });

describe("silent Echo turns", () => {
  it("uses the course's duration/rate rule with both clamps and groups overlapping calls", () => {
    expect(echoGap({ start: 0, targetStart: 0, end: 0.1, rows: [0] })).toBe(2.2);
    expect(echoGap({ start: 0, targetStart: 0, end: 30, rows: [0] })).toBe(10);
    expect(echoGap({ start: 0, targetStart: 0, end: 3, rows: [0] }, 0.8)).toBeCloseTo(5.1125);
    const calls = echoCalls([row(0, 1, 3), row(1, 2.8, 4), row(2, 4, 5)]);
    expect(calls.map((call) => call.rows)).toEqual([[0, 1], [2]]);
    expect(calls[0].end).toBe(4);
  });

  it("waits for actual sung ends, holds the completed call and resumes at that exact media position", async () => {
    const f = await fixture();
    f.step(1.7);
    expect(f.session.store.getState().practice?.turn).toBeNull();
    f.step(2.02);
    expect(f.session.store.getState()).toMatchObject({ status: "paused", practice: { completed: 1, turn: { end: 2 }, remaining: 2.2 } });
    expect(f.session.position()).toBe(2);
    const calls = vi.mocked(f.output.play).mock.calls.length;
    f.session.tick(1);
    expect(f.session.store.getState().practice?.remaining).toBe(1.2);
    expect(f.output.play).toHaveBeenCalledTimes(calls);
    await f.session.continueTurn();
    expect(vi.mocked(f.output.play).mock.lastCall?.[1]).toBe(2);
    expect(f.session.store.getState().status).toBe("playing");
    f.session.close();
  });

  it("freezes the gap on pause, holds and reading, then resumes without counting a replay twice", async () => {
    vi.useFakeTimers();
    const f = await fixture();
    f.step(2);
    f.session.pause(); f.session.tick(9);
    expect(f.session.store.getState()).toMatchObject({ turnPaused: true, practice: { remaining: 2.2 } });
    await f.session.resume(); f.session.tick(0.5);
    expect(f.session.store.getState().practice?.remaining).toBe(1.7);
    f.session.setHeld(true); f.session.tick(9);
    expect(f.session.store.getState().practice?.remaining).toBe(1.7);
    f.session.setHeld(false); f.session.tick(1);
    expect(f.session.store.getState().practice?.remaining).toBe(1.7);
    await vi.advanceTimersByTimeAsync(700);
    f.session.setReading(true); f.session.tick(9);
    expect(f.session.store.getState().practice?.remaining).toBe(1.7);
    await f.session.setReading(false);
    await f.session.replayLine();
    expect(vi.mocked(f.output.play).mock.lastCall?.[1]).toBe(1);
    f.step(2);
    expect(f.session.store.getState().practice?.completed).toBe(1);
    f.session.close();
    await vi.advanceTimersByTimeAsync(10000);
    expect(f.close).toHaveBeenCalledOnce();
  });

  it("gives the last line its full turn even when ended fires at its last word", async () => {
    const f = await fixture("echo", 4);
    f.step(2); await f.session.continueTurn();
    f.at(4);
    f.output.onEnded!();
    expect(f.session.store.getState()).toMatchObject({ status: "paused", practice: { completed: 2, turn: { end: 4 } } });
    f.session.tick(2.3);
    expect(f.session.store.getState()).toMatchObject({ status: "ended", practice: { turn: null, completed: 2 } });
    f.session.close();
  });

  it("finishes after a final turn triggered by the frame loop before the ended event", async () => {
    const f = await fixture("echo", 4);
    f.step(2); await f.session.continueTurn();
    f.step(4);
    expect(f.session.store.getState().practice?.turn?.end).toBe(4);
    await f.session.continueTurn();
    expect(f.session.store.getState().status).toBe("ended");
    f.session.close();
  });

  it("finishes the last turn before playing the original outro and cancels a hidden turn's auto-resume", async () => {
    const f = await fixture();
    f.step(2); await f.session.continueTurn();
    f.step(4);
    f.session.interrupt(); f.session.tick(30);
    expect(f.session.store.getState().practice?.remaining).toBe(2.2);
    await f.session.resume();
    f.session.tick(2.3);
    await Promise.resolve(); await Promise.resolve();
    expect(vi.mocked(f.output.play).mock.lastCall?.[1]).toBe(4);
    f.at(6); f.output.onEnded!();
    expect(f.session.store.getState().status).toBe("ended");
    f.session.close();
  });

  it("counts continuous target rows once and gives seeks and previews no credit", async () => {
    const f = await fixture("along");
    f.step(2);
    expect(f.session.store.getState().practice?.completed).toBe(1);
    await f.session.replayLine(); f.step(2);
    expect(f.session.store.getState().practice?.completed).toBe(1);
    await f.session.seek(3.8); f.step(4.1);
    expect(f.session.store.getState().practice?.completed).toBe(1);
    await f.session.seek(3); f.step(4.1);
    expect(f.session.store.getState().practice?.completed).toBe(2);
    f.session.close();
  });

  it("keeps partial audible coverage across a pause and honors an explicit pause while reading", async () => {
    const f = await fixture("along");
    f.step(1.4); f.session.pause();
    await f.session.resume(); f.step(2);
    expect(f.session.store.getState().practice?.completed).toBe(1);
    f.session.setReading(true);
    f.session.pause();
    const plays = vi.mocked(f.output.play).mock.calls.length;
    await f.session.setReading(false);
    expect(f.output.play).toHaveBeenCalledTimes(plays);
    expect(f.session.store.getState().status).toBe("paused");
    f.session.close();
  });

  it("measures quiet turns in wall time while excluding time spent paused or hidden", async () => {
    vi.useFakeTimers();
    const f = await fixture();
    f.step(2);
    await vi.advanceTimersByTimeAsync(1000);
    f.session.tick();
    expect(f.session.store.getState().practice?.remaining).toBe(1.2);
    f.session.interrupt();
    await vi.advanceTimersByTimeAsync(30000);
    await f.session.resume();
    f.session.tick();
    expect(f.session.store.getState().practice?.remaining).toBe(1.2);
    f.session.close();
  });

  it("plays a bilingual helper before its target, holds overlaps together and counts only target rows", () => {
    const bilingual = withSungTranslations([{ ...row(0, 3, 4), lt: "Say it", en: { s: 1, e: 2, w: [[1, 1.5], [1.5, 2]] } }, row(1, 3.9, 5)]);
    const practice = new KaraokePractice(bilingual, "echo");
    expect(practice.calls).toEqual([{ start: 1, targetStart: 3, end: 5, rows: [1, 2] }]);
    expect(practice.advance(0, 4)).toBeNull();
    expect(practice.snapshot()).toMatchObject({ completed: 1, total: 2 });
    expect(practice.advance(4, 5)).toBe(5);
    expect(practice.snapshot().completed).toBe(2);
    expect(practice.replayAt(5)?.start).toBe(1);
  });
});
