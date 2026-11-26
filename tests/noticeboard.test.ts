import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DailyBoard, postedId } from "../src/game/noticeboard/posting";
import { items } from "../src/content/phrases/phrase-game.mh.json";
import { localDay } from "../src/state/playStats";

describe("Maple Harbor's daily posting", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 26, 23, 59, 59));
    vi.stubGlobal("window", new EventTarget());
    vi.stubGlobal("document", Object.assign(new EventTarget(), { hidden: false }));
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it("follows the reviewed strip forward and backward from local November 26", () => {
    const days = Array.from({ length: 14 }, (_, n) => postedId(localDay(+new Date(2026, 10, 26 + n))));
    expect(days).toEqual([1, 5, 36, 10, 29, 3, 8, 4, 18, 9, 22, 20, 26, 30].map(n => "mh-" + String(n).padStart(3, "0")));
    expect(postedId("2026-12-10")).toBe(days[0]);
    expect(postedId("2026-11-25")).toBe(days[13]);
    // A late local time can already be tomorrow in UTC.
    expect(postedId(localDay(+new Date(2026, 10, 26, 23, 59)))).toBe(days[0]);
  });

  it.each([[2, 8], [10, 1]])("advances on the local midnight following the US clock change (%i, %i)", async (month, date) => {
    vi.setSystemTime(new Date(2026, month, date));
    const board = new DailyBoard(vi.fn(), async () => items);
    board.setNearby(true);
    const tomorrow = new Date(2026, month, date + 1);
    await vi.advanceTimersByTimeAsync(+tomorrow - Date.now() - 1);
    expect(board.snapshot().day).toBe(localDay(+new Date(2026, month, date)));
    await vi.advanceTimersByTimeAsync(1);
    expect(board.snapshot().day).toBe(localDay(+tomorrow));
    board.setNearby(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("loads once on approach and pins a still-loading paper across midnight and focus", async () => {
    let finish!: (rows: typeof items) => void;
    const load = vi.fn(() => new Promise<typeof items>(resolve => { finish = resolve; }));
    const paint = vi.fn();
    const board = new DailyBoard(paint, load);
    expect(load).not.toHaveBeenCalled();
    board.setNearby(true);
    board.open();
    await vi.advanceTimersByTimeAsync(2000);
    window.dispatchEvent(new Event("focus"));
    finish(items);
    await vi.advanceTimersByTimeAsync(0);
    expect(board.snapshot().row).toMatchObject({ f: "Is it far?", p: "Ar toli?", src: "TOM-102#S027" });
    board.close();
    expect(board.snapshot().row?.id).toBe("mh-005");
    board.setNearby(false);
    board.setNearby(true);
    board.open();
    expect(load).toHaveBeenCalledTimes(1);
    expect(paint.mock.calls).toEqual([["Is it far?"], ["Can I pay by card?"]]);
    board.setNearby(false);
  });

  it("keeps a missing slot empty and catches up after the tab was hidden", async () => {
    const board = new DailyBoard(vi.fn(), async () => items.filter(row => row.id !== "mh-001"));
    board.setNearby(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(board.snapshot()).toEqual({ day: "2026-11-26", loading: false, row: undefined });
    Object.assign(document, { hidden: true });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(2000);
    Object.assign(document, { hidden: false });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(board.snapshot().row?.id).toBe("mh-005");
    board.setNearby(false);
  });
});
