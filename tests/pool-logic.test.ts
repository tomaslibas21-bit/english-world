import { describe, expect, it } from "vitest";
import { flightPosition, hitWindow, nextFlight, POOL_SECONDS, PoolRound, SPLASH_SECONDS, type Flight } from "@/game/pool/logic";

const toLearner = () => new PoolRound(false, 0, () => 0.5);

function atWindow(round: PoolRound, touch = false) {
  round.update(hitWindow(round.flight, touch).start + 0.01);
}

describe("pool rally", () => {
  it("gives touch a longer window, with a shorter one on a fast descending ball", () => {
    const normal: Flight = { from: "diego", to: "learner", height: "normal", seconds: 2.55, mine: false };
    expect(hitWindow(normal, true).end - hitWindow(normal, true).start).toBeCloseTo(0.75);
    expect(hitWindow(normal, false).end - hitWindow(normal, false).start).toBeCloseTo(0.6);
    expect(hitWindow({ ...normal, height: "fast" }, true).start).toBeGreaterThan(hitWindow(normal, true).start);
    expect(flightPosition(normal, 0)).toEqual({ travel: 0, lift: 0 });
    expect(flightPosition(normal, normal.seconds)).toEqual({ travel: 1, lift: 0 });
    expect(flightPosition(normal, 2).lift).toBeLessThan(flightPosition(normal, 0.9).lift);
  });

  it("allows a retry after an early press and only counts an in-window learner hit", () => {
    const round = toLearner();
    expect(round.flight.to).toBe("learner");
    expect(round.press().kind).toBe("early");
    expect(round.streak).toBe(0);
    atWindow(round);
    expect(round.canHit).toBe(true);
    expect(round.press()).toEqual({ kind: "hit", by: "learner", record: false });
    expect(round.learnerHits).toBe(1);
    expect(round.flight.to).not.toBe("learner");
    expect(round.canHit).toBe(false);
  });

  it("keeps the kids' passes going after a wrong press", () => {
    const round = toLearner();
    atWindow(round);
    round.press();
    expect(round.press().kind).toBe("wrong");
    expect(round.drops).toBe(0);
    expect(round.streak).toBe(1);
    expect(round.update(round.flight.seconds)?.kind).toBe("hit");
    expect(round.streak).toBe(2);
  });

  it("splashes after a late press and resets the streak before a new serve", () => {
    const round = toLearner();
    atWindow(round);
    round.press();
    round.update(round.flight.seconds);
    round.update(round.flight.seconds);
    expect(round.canHit).toBe(false);
    expect(round.press().kind).toBe("late");
    expect(round.update(SPLASH_SECONDS)).toEqual({ kind: "drop", late: true });
    expect(round.streak).toBe(0);
    expect(round.best).toBe(2);
    expect(round.drops).toBe(1);
    expect(round.press().kind).toBe("ignored");
    expect(round.update(2)?.kind).toBe("serve");
  });

  it("announces a record only once and only beyond the saved best and four hits", () => {
    function records(savedBest: number) {
      const round = new PoolRound(false, savedBest, () => 0.9);
      const records = [];
      for (let n = 1; n <= 12; n++) {
        const event = round.update(round.flight.seconds);
        if (event?.kind === "hit" && event.record) records.push(n);
      }
      return records;
    }
    expect(records(0)).toEqual([5]);
    expect(records(6)).toEqual([7]);
    expect(records(12)).toEqual([]);
  });

  it("ends on the third drop or at 90 seconds", () => {
    const drops = toLearner();
    for (let n = 1; n <= 3; n++) {
      drops.update(drops.flight.seconds);
      expect(drops.update(SPLASH_SECONDS)).toEqual({ kind: "drop", late: false });
      expect(drops.drops).toBe(n);
      if (n < 3) expect(drops.update(2)?.kind).toBe("serve");
    }
    expect(drops.phase).toBe("ended");
    expect(drops.update(2)).toBeNull();
    const time = new PoolRound(false, 0, () => 0.9);
    for (let i = 0; i < POOL_SECONDS * 20; i++) time.update(0.05);
    time.update(0.00001);
    expect(time.phase).toBe("ended");
    expect(time.elapsed).toBe(POOL_SECONDS);
    expect(time.drops).toBe(0);
  });

  it("calls the learner about two fifths of the time and leaves them out of the idle rally", () => {
    let seed = 29;
    const random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 2 ** 32);
    let flight = nextFlight("vale", random, true);
    let learnerCalls = 0;
    for (let i = 0; i < 2000; i++) {
      expect(flight.from).not.toBe(flight.to);
      if (flight.to === "learner") learnerCalls++;
      flight = nextFlight(flight.to, random, true);
    }
    expect(learnerCalls / 2000).toBeCloseTo(0.4, 1);
    for (let i = 0; i < 40; i++) {
      flight = nextFlight(flight.to, random, false);
      expect(flight.to).not.toBe("learner");
    }
  });
});
