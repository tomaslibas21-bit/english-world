// The way to the objective, marked on the ground (src/game/guidance.ts): small arrowheads that lie still, fewer than
// the discs there were, fading in before the player and out with distance, a brightening travelling along them.
import { describe, expect, it } from "vitest";
import { ASK_WAY_PLACES } from "../src/content/ask-way-lines";
import { Game } from "../src/game/Game";
import { directionsTarget, Guidance, wayMarks, WAY } from "../src/game/guidance";

/** A way of 60 m: 30 m east, then 30 m north (towards -z). */
const way = (from = 0): [number, number][] => [[from, 0], [30, 0], [30, -30]];

describe("the route to a door requested from Queta", () => {
  const [post, cafe] = ASK_WAY_PLACES;
  const route = { kind: "point", directions: post };

  it("uses the active walk's endpoint while the airport stays saved", () => {
    const airport = { kind: "door", id: "airport", x: 0, z: 8 };
    expect(directionsTarget(way(), route, post) ?? airport).toEqual({ kind: "point", x: 30, z: -30 });
    expect(directionsTarget(null, null, post) ?? airport).toBe(airport); // Manual steering.
    expect(directionsTarget([], route, post) ?? airport).toBe(airport); // Arrival.
  });

  it("releases the marker on close or replacement, including another request for the same door", () => {
    expect(directionsTarget(way(), route, null)).toBeNull();
    expect(directionsTarget(way(), route, cafe)).toBeNull();
    expect(directionsTarget(way(), route, { ...post })).toBeNull();
    expect(directionsTarget([[2, 5]], { kind: "point", directions: cafe }, cafe)).toEqual({ kind: "point", x: 2, z: 5 });
  });

  it("leaves named points, cave and pool walks, and phone errands to the saved guide", () => {
    const exit = { kind: "exit", id: "grieta", onward: "pool-hall" as const };
    const office = { kind: "point", id: "office", x: 15, z: 8 };
    for (const target of [{ kind: "point", id: post.location }, { kind: "cave-entry", id: "grieta" }, exit, office]) {
      expect(directionsTarget(way(), target, post)).toBeNull();
    }
    expect(directionsTarget(way(), route, null) ?? office).toBe(office);
  });

  it("hides only the detour beam and restores the saved beacon for travel outdoors or in the cave", () => {
    const guidance = new Guidance();
    const game: Game = Object.assign(Object.create(Game.prototype), { guidance });
    const airport = { kind: "door", id: "airport", x: 0, z: 8 } as const;
    const detour = directionsTarget(way(), route, post)!;
    const caveExit = { kind: "exit", id: "grieta", x: 4, z: 6 } as const;
    const beacon = guidance["beacon"];
    const beam = guidance["beam"];
    const gem = guidance["gem"];
    const ring = guidance["ring"];

    const check = (x: number, z: number, gemHeight: number, beamVisible: boolean) => {
      expect(beacon.visible).toBe(true);
      expect(beacon.position.toArray()).toEqual([x, 0, z]);
      expect([beam.visible, ring.visible, gem.visible]).toEqual([beamVisible, true, true]);
      expect(gem.position.y).toBe(gemHeight);
      expect(ring.position.toArray()).toEqual([0, 0.04, 0]);
    };

    game["showBeacon"](airport);
    check(0, 8, 3.8, true);
    game["showBeacon"](detour, true);
    check(30, -30, 3.8, false);
    guidance.update(0);
    check(30, -30, 3.8, false);
    game["showBeacon"](airport, false);
    check(0, 8, 3.8, true);

    game["showBeacon"](detour, true);
    Object.assign(game, { cave: {} });
    game["showBeacon"](caveExit, false);
    check(4, 6, 1.8, false);
    Object.assign(game, { cave: undefined });
    game["showBeacon"](airport);
    check(0, 8, 3.8, true);
  });
});

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
