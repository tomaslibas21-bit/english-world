import { describe, expect, it } from "vitest";
import { RADIO_SPOTS, type RadioSpot } from "../src/content/radioSpots";
import { SpotSchedule, spotLineAt } from "../src/radio/spots";

const ready = (spot: RadioSpot) => ({ spot, url: spot.id, duration: 6 });
const active = RADIO_SPOTS.filter(({ kind }, i, all) => all.filter((s) => s.kind === kind).indexOf(all[i]) < 2);

describe("radio spot schedule", () => {
  it("passes straight through every song when no clips are ready", () => {
    const schedule = new SpotSchedule();
    for (let i = 0; i < 10; i++) expect(schedule.songEnded(RADIO_SPOTS, () => null)).toBeNull();
  });

  it.each([[0.25, 2], [0.75, 3]])("plays after song two, then alternates every %s draw", (random, interval) => {
    const schedule = new SpotSchedule(() => random);
    const end = () => schedule.songEnded(active, ready);
    expect(end()).toBeNull();
    expect(end()?.spot.kind).toBe("jingle");
    for (const kind of ["ad", "jingle", "ad"]) {
      for (let i = 1; i < interval; i++) expect(end()).toBeNull();
      expect(end()?.spot.kind).toBe(kind);
    }
  });

  it("uses each ready spot once per kind's bag", () => {
    const schedule = new SpotSchedule(() => 0.25);
    const play = () => { expect(schedule.songEnded(active, ready)).toBeNull(); return schedule.songEnded(active, ready)!.spot; };
    const [firstJingle, firstAd, secondJingle, secondAd] = Array.from({ length: 4 }, play);
    expect(firstJingle.id).not.toBe(secondJingle.id);
    expect(firstAd.id).not.toBe(secondAd.id);
    expect(play().id).toBe(firstJingle.id);
  });

  it("shares the duration in proportion to line lengths", () => {
    const spot: RadioSpot = { id: "test", kind: "ad", lines: [{ en: "A", lt: "A" }, { en: "BBBB", lt: "B" }] };
    expect(spotLineAt(spot, 10, 1.99)).toBe(0);
    expect(spotLineAt(spot, 10, 2)).toBe(1);
    expect(spotLineAt(spot, 10, 10)).toBe(1);
  });
});
