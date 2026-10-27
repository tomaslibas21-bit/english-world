// P18 "Up to My Ears" (Tyler at Sproutly): regressions from the max-effort review of 27 Oct 2026 that the
// situation's own NLU tests and sims can't show (what Tyler says back, and the visit memory).
import { describe, expect, it } from "vitest";
import { SITUATION_BY_ID } from "../src/content/situations";
import { GLOBAL } from "../src/content/global";
import { NPCS } from "../src/content/npcs";
import { Conversation } from "../src/convo/dialogue";

function play(turns: string[], set: Record<string, any> = {}, memory: Record<string, any> = {}) {
  const sit = SITUATION_BY_ID["p18-startup"];
  const def = { ...sit, init: (c: any) => { sit.init?.(c); Object.assign(c.s, { twist: null, weightLine: false }, set); } };
  const conv = new Conversation(def, { global: GLOBAL, npcs: NPCS, player: { name: "Tomas", surname: "", gender: "m" }, visits: 1, seed: 1, memory });
  conv.start();
  const said: string[] = [];
  for (const t of turns) said.push(conv.input(t).lines.map((l) => l.sentence.en).join(" "));
  return { conv, said, last: said.at(-1) ?? "" };
}
const MID = ["Good, thanks.", "I'm swamped.", "Slides first.", "No, that's all."];
const PRIO = ["Good, thanks.", "I'm swamped."];

describe("p18-startup review fixes", () => {
  it("a hedge never agrees to stay until midnight", () => {
    for (const t of ["I'm not sure I can stay.", "I don't think I can stay."]) {
      const { conv, last } = play([...MID, t], { twist: "midnight" });
      expect(last).not.toMatch(/Rock star/);
      expect(conv.s.midHow).toBe("cant");
    }
  });
  it("delegating a task is not doing it first", () => {
    const { conv, said } = play([...PRIO, "Kevin could do the party.", "No."]);
    expect(said[2]).not.toMatch(/Could we do the slides first/);
    expect(conv.s.first).toBe("slides");
  });
  it("Tyler never lets the investor slides slip without a push back", () => {
    for (const t of ["The slides can wait.", "I'll do the bugs first and the slides next week.", "I can't do the slides."]) {
      const { last } = play([...PRIO, t]);
      expect(last).toMatch(/Could we do the slides first/);
    }
    const { last } = play([...PRIO, "I'll focus on the bug reports first."]);
    expect(last).not.toMatch(/the rest next week/);
  });
  it("an idiom question is explained, not praised or taken as an answer", () => {
    let r = play(["what do you mean steep learning curve"]);
    expect(r.last).toMatch(/steep hill|a lot to learn/);
    expect(r.last).not.toMatch(/Look at you|learning my language|crushing it/);
    expect(r.conv.s.helloDone).toBeFalsy();
    r = play([...MID, "Calls it a day?"], { twist: "midnight" });
    expect(r.last).toMatch(/stop working for today|finish work for the day/);
    expect(r.conv.s.midDone).toBeFalsy();
    r = play([...MID.slice(0, 3), "No, that's all.", "Let's meet at nine."]);
    expect(r.conv.s.idiomPraised).toBeFalsy();
  });
  it("remembers a twist as soon as it was seen, even when the visit isn't finished", () => {
    const { conv } = play(["Good, thanks.", "Sure, no problem.", "No, I can do it all.", "Slides first.", "No, that's all.", "Sorry, I have to go."], { twist: "midnight" });
    expect(conv.completed).toBe(false);
    expect(conv.memoryOut.sproutlyTwists).toEqual(["midnight"]);
  });
});
