import { describe, it, expect } from "vitest";
import { polarityChoices } from "../src/convo/readings";
import { hasNegation } from "../src/convo/speech";
import { Conversation } from "../src/convo/dialogue";
import { SITUATION_BY_ID } from "../src/content/situations";
import { GLOBAL } from "../src/content/global";
import { NPCS } from "../src/content/npcs";

function afterWorkout() {
  const c = new Conversation(SITUATION_BY_ID["s35-gym"], {
    global: GLOBAL, npcs: NPCS, player: { name: "Tomas", surname: "", gender: "m" }, visits: 0, seed: 1, memory: {},
  });
  c.start();
  Object.assign(c.s, {
    introduced: true, plan: "monthly", signed: true, paid: true, changeDone: true,
    warm: "bike", machineOk: true, setsDone: true, repDone: true, spotDone: true,
    breathDone: true, next: null, nextAsk: "same",
  });
  c.step = "next";
  return c;
}

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

  for (const [reply, day] of [
    ["See you tomorrow.", "tomorrow"],
    ["See you soon.", "soon"],
    ["I can't tomorrow. How about Friday?", "friday"],
    ["I can't come on Thursday. How about Friday?", "friday"],
    ["How about Friday? I can't come on Thursday.", "friday"],
  ]) it(`completes rescheduling with ${reply}`, () => {
    const c = afterWorkout();
    c.input("Another day, please.");
    const out = c.input(reply);
    expect(out.understood).toBe(true);
    expect(c.s.next).toBe(day);
    expect(c.pending?.id).toBe("closing");
    expect(c.completed).toBe(true);
    expect(out.lines.some(l => l.lineId === "offer_thursday" || l.lineId === "when_short")).toBe(false);
    c.input("Thanks.");
    expect(c.ended).toBe(true);
    expect(c.s.next).toBe(day);
  });

  it("still offers Thursday for a standalone tomorrow refusal after asking for another day", () => {
    const c = afterWorkout();
    c.input("Another day, please.");
    const out = c.input("I can't tomorrow.");
    expect(out.lines.some(l => l.lineId === "offer_thursday")).toBe(true);
    expect(c.pending?.id).toBe("thursday_q");
    expect(c.s.next).toBeNull();
    c.input("Friday, please.");
    expect(c.s.next).toBe("friday");
    expect(c.completed).toBe(true);
  });

  it("asks again after rejecting a weekday without committing a date", () => {
    const c = afterWorkout();
    c.input("Another day, please.");
    const out = c.input("I can't come on Thursday.");
    expect(out.understood).toBe(true);
    expect(out.lines.some(l => l.lineId === "when_short")).toBe(true);
    expect(c.s.next).toBeNull();
    c.input("Friday, please.");
    expect(c.s.next).toBe("friday");
    expect(c.completed).toBe(true);
  });

  for (const reply of ["Another day, please. How about Friday?", "Could we do a different day? Friday, please."])
    it(`takes the date supplied in the same answer: ${reply}`, () => {
      const c = afterWorkout();
      const out = c.input(reply);
      expect(out.understood).toBe(true);
      expect(c.s.next).toBe("friday");
      expect(c.pending?.id).toBe("closing");
      expect(c.completed).toBe(true);
      expect(out.lines.some(l => l.lineId === "when_short")).toBe(false);
    });

  for (const refusal of ["I can't tomorrow.", "I can't come on Thursday."])
    for (const reply of [`${refusal} How about Friday?`, `How about Friday? ${refusal}`])
      it(`keeps the explicit Friday proposal after the Thursday offer: ${reply}`, () => {
        const c = afterWorkout();
        c.input("I can't tomorrow.");
        expect(c.pending?.id).toBe("thursday_q");
        const out = c.input(reply);
        expect(out.understood).toBe(true);
        expect(c.s.next).toBe("friday");
        expect(c.pending?.id).toBe("closing");
        expect(c.completed).toBe(true);
        expect(out.lines.some(l => l.lineId === "book_later_ok")).toBe(false);
      });

  it("accepts a Friday proposal after a short refusal of the Thursday offer", () => {
    const c = afterWorkout();
    c.input("I can't tomorrow.");
    const out = c.input("No, sorry, I can't. How about Friday?");
    expect(out.understood).toBe(true);
    expect(c.s.next).toBe("friday");
    expect(c.completed).toBe(true);
    expect(out.lines.some(l => l.lineId === "book_later_ok")).toBe(false);
  });

  for (const reply of ["Thursday doesn't work for me.", "No, sorry, I can't."])
    it(`still declines Thursday when there is no positive date proposal: ${reply}`, () => {
      const c = afterWorkout();
      c.input("I can't tomorrow.");
      const out = c.input(reply);
      expect(out.understood).toBe(true);
      expect(c.s.next).toBe("later");
      expect(c.pending?.id).toBe("closing");
      expect(c.completed).toBe(true);
      expect(out.lines.some(l => l.lineId === "book_later_ok")).toBe(true);
    });
});
