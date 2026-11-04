import { describe, it, expect } from "vitest";
import { polarityChoices } from "../src/convo/readings";
import { hasNegation } from "../src/convo/speech";
import { Conversation } from "../src/convo/dialogue";
import { SITUATION_BY_ID } from "../src/content/situations";
import { GLOBAL } from "../src/content/global";
import { NPCS } from "../src/content/npcs";
describe("meaning-safe speech and gym rescheduling", () => {
  it("asks about can/cannot alternatives in either recognition order", () => {
    expect(
      polarityChoices("I can tomorrow", ["I can't tomorrow"]),
    ).toHaveLength(2);
    expect(
      polarityChoices("I can’t tomorrow", ["I can tomorrow"]),
    ).toHaveLength(2);
    expect(hasNegation("I cannot tomorrow")).toBe(true);
    expect(polarityChoices("I'd like a latte", ["I like a latte"])).toEqual([]);
    expect(
      polarityChoices("I can tomorrow", ["I can't come on Friday"]),
    ).toEqual([]);
  });
  for (const seed of [1, 4, 18, 33])
    it("accepts another day after declining tomorrow, seed " + seed, () => {
      const c = new Conversation(SITUATION_BY_ID["s35-gym"], {
        global: GLOBAL,
        npcs: NPCS,
        player: { name: "Tomas", surname: "", gender: "m" },
        visits: 0,
        seed,
        memory: {},
      });
      c.start();
      c.s.breathDone = true;
      c.s.next = null;
      c.s.nextAsk = "same";
      const out = c.input("Another day, please.");
      expect(out.understood).toBe(true);
      expect(
        out.lines.some((l) => /when.*come.*back/i.test(l.sentence.en)),
      ).toBe(true);
      expect(c.s.next).toBeNull();
      const yes = c.input("Friday, please.");
      expect(yes.understood).toBe(true);
      expect(c.s.next).toBe("friday");
    });
});
