import { describe, expect, it } from "vitest";
import { GYM_MOVES, GymRound } from "../src/game/gym/round";

const slots = [0, 2, 1, 3, 2, 0, 3, 1, 0, 2];

describe("gym calls", () => {
  it.each([
    { number: 0, order: ["jacks", "toes", "squats", "circles", "run", "reach", "lunges", "pushups", "toes", "jacks"] },
    { number: 1, order: ["squats", "circles", "run", "reach", "lunges", "pushups", "jacks", "toes", "circles", "squats"] },
    { number: 2, order: ["run", "reach", "lunges", "pushups", "jacks", "toes", "squats", "circles", "reach", "run"] },
  ])("rotates the introductions and uses all four slots in round $number", ({ number, order }) => {
    const round = new GymRound(number);
    expect(round.phase).toBe("ready");
    expect(round.start()).toBe(true);
    expect(round.start()).toBe(false);
    expect(round.listen()).toBe(true);
    for (let i = 0; i < order.length; i++) {
      const { id, options } = round.call;
      expect(id).toBe(order[i]);
      expect(options[slots[i]]).toBe(id);
      const start = GYM_MOVES.indexOf(id);
      expect([0, 1, 3, 5].map((offset, j) => options[(slots[i] + j) % 4]))
        .toEqual([0, 1, 3, 5].map((offset) => GYM_MOVES[(start + offset) % 8]));
      expect(new Set(options).size).toBe(4);
      expect(round.helpLevel).toBe(i < 3 ? 0 : i < 6 ? 1 : 2);
      expect(round.pick(id)).toBe(false);
      expect(round.choose()).toBe(true);
      expect(round.pick("unknown")).toBe(false);
      expect(round.pick(id)).toBe(true);
      expect(round.pick(id)).toBe(false);
      expect(round.poseDuration).toBe(i < 3 ? 1.2 : i < 6 ? 1.05 : 0.9);
      expect(round.gap).toBe(i < 3 ? 0.5 : i < 6 ? 0.375 : 0.25);
      expect(round.next()).toBe(i < 9);
    }
    expect(round.phase).toBe("closing");
    round.finish();
    expect(round.phase).toBe("score");
    expect(round.ratio).toBe(1);
    expect(round.score(0)).toEqual({ completed: 10, firstTry: 10, wrong: 0, said: 0 });
  });

  it("retains options and relief through replay and retry, and applies relief once on the next call", () => {
    const round = new GymRound();
    round.start();
    round.listen();
    for (let i = 0; i < 10; i++) {
      const call = round.call;
      round.choose();
      if (i === 4) {
        expect(round.helpLevel).toBe(1);
        const wrong = call.options.find((id) => id !== call.id)!;
        expect(round.pick(wrong)).toBe(true);
        expect(round.phase).toBe("retry");
        expect(round.poseDuration).toBe(1.05);
        expect(round.helpLevel).toBe(0);
        expect(round.pick(call.id)).toBe(false);
        expect(round.score(0)).toEqual({ firstTry: 4, completed: 4, wrong: 1, said: 0 });
        round.listen();
        round.choose();
        expect(round.call).toBe(call);
        round.listen();
        round.choose();
        expect(round.call).toBe(call);
        expect(round.helpLevel).toBe(0);
      }
      if (i === 5) expect(round.helpLevel).toBe(0);
      if (i === 6) expect(round.helpLevel).toBe(2);
      expect(round.pick(call.id)).toBe(true);
      round.next();
    }
    expect(round.score(1)).toEqual({ firstTry: 9, completed: 10, wrong: 1, said: 1 });
    expect(round.ratio).toBe(0.9);
  });

  it("takes a single step of relief even with several misses on a late call", () => {
    const round = new GymRound();
    round.start();
    round.listen();
    while (round.index < 6) { round.choose(); round.pick(round.call.id); round.next(); }
    const other = round.call.options.find((id) => id !== round.call.id)!;
    for (let tries = 0; tries < 3; tries++) {
      round.choose();
      round.pick(other);
      expect(round.helpLevel).toBe(1);
      round.listen();
    }
    round.choose();
    round.pick(round.call.id);
    round.next();
    expect(round.helpLevel).toBe(1);
  });
});
