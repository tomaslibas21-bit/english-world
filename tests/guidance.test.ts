// The way to the objective, marked on the ground (src/game/guidance.ts): small arrowheads that lie still, fewer than
// the discs there were, fading in before the player and out with distance, a brightening travelling along them.
import { describe, expect, it } from "vitest";
import { wayMarks, WAY } from "../src/game/guidance";

/** A way of 60 m: 30 m east, then 30 m north (towards -z). */
const way = (from = 0): [number, number][] => [[from, 0], [30, 0], [30, -30]];

describe("the way's marks", () => {
  it("lie along the way, a mark every 2.2 m, each pointing on, the last one short of the destination", () => {
    const m = wayMarks(way(), 0);
    expect(m.length).toBeGreaterThan(8);
    for (let i = 1; i < m.length; i++) expect(Math.hypot(m[i].x - m[i - 1].x, m[i].z - m[i - 1].z)).toBeLessThanOrEqual(WAY.spacing + 1e-6);
    // on the first stretch they point east (a heading of π/2), round the corner north (π)
    const east = m.filter((k) => k.z === 0 && k.x < 29), north = m.filter((k) => k.x === 30 && k.z < -1);
    expect(east.length).toBeGreaterThan(5);
    for (const k of east) expect(k.rot).toBeCloseTo(Math.PI / 2, 5);
    for (const k of north) expect(Math.abs(k.rot)).toBeCloseTo(Math.PI, 5);
    // fewer than the discs there were (one every 1.3 m all the way)
    expect(m.length).toBeLessThan(60 / 1.3 / 2);
    const short = wayMarks([[0, 0], [10, 0]], 0);
    expect(Math.max(...short.map((k) => k.x))).toBeLessThanOrEqual(10 - WAY.spacing * 0.5);
  });

  it("stay where they are as the player walks on (they are counted from the destination)", () => {
    const a = wayMarks(way(0), 3), b = wayMarks(way(1.3), 3);
    const at = (k: { x: number; z: number }) => `${k.x.toFixed(3)},${k.z.toFixed(3)}`;
    const before = new Set(a.map(at));
    // every mark of the next 30 m is one that was there (the nearest have faded out behind the player, and far off
    // one more has come into sight)
    const next = b.filter((k) => (k.z === 0 ? k.x - 1.3 : 30 - 1.3 - k.z) < 30);
    expect(next.length).toBeGreaterThan(5);
    for (const k of next) expect(before.has(at(k))).toBe(true);
  });

  it("fade in over the first metres before the player, are all there in the middle, and are gone far off", () => {
    const m = wayMarks(way(), 0);
    const dist = (k: { x: number; z: number }) => (k.z === 0 ? k.x : 30 - k.z);
    for (const k of m) {
      const d = dist(k);
      expect(d).toBeGreaterThanOrEqual(WAY.from);
      expect(d).toBeLessThan(WAY.gone);
      expect(k.alpha).toBeGreaterThan(0);
      expect(k.alpha).toBeLessThanOrEqual(1);
    }
    const near = m.filter((k) => dist(k) < 3), mid = m.filter((k) => dist(k) > 6 && dist(k) < 20), far = m.filter((k) => dist(k) > 34);
    expect(Math.max(...near.map((k) => k.alpha), 0)).toBeLessThan(0.5);
    expect(Math.min(...mid.map((k) => k.alpha))).toBeGreaterThanOrEqual(0.54);
    expect(Math.max(...far.map((k) => k.alpha), 0)).toBeLessThan(0.35);
  });

  it("a brightening travels along them towards the destination", () => {
    // where the brightest mark of the middle stretch is, a second later: further on
    const brightest = (t: number) => {
      const m = wayMarks([[0, 0], [60, 0]], t).filter((k) => k.x > 6 && k.x < 19);
      return m.reduce((a, b) => (b.alpha > a.alpha ? b : a)).x;
    };
    const x0 = brightest(1.3), x1 = brightest(2.3);
    expect(x1).toBeGreaterThan(x0);
    expect(x1 - x0).toBeLessThan(7);
  });

  it("no way, no marks", () => {
    expect(wayMarks([], 0)).toEqual([]);
    expect(wayMarks([[1, 1]], 0)).toEqual([]);
  });
});
