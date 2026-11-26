// Hint examples (src/convo/suggest.ts groupLookup): an id that names items in two lists of a conversation is taken from
// the hint group's own slot list. s84's "coffee" is a drink („café“) and an activity („tomar un café“); s63's "jamaica"
// is a country and a drink („agua de jamaica“). The course's phrase cards are made from these same sentences.
import { describe, expect, it } from "vitest";
import { SITUATION_BY_ID } from "@/content/situations";
import { modelAnswers, playerVars, type AnswerOpts } from "@/convo/suggest";

const OPTS: AnswerOpts = { formal: false, gender: "m", npcGender: "f", vars: playerVars(null) };

describe("hint examples", () => {
  it("take a slot's item from the group's own list (s84 coffee to do, s63 jamaica to drink)", () => {
    const date = SITUATION_BY_ID["s84-date"];
    const plan = modelAnswers(date, date.hints!.again_plan, undefined, OPTS, 1)[0];
    expect(plan.en).toBe("¿Te gustaría tomar un café el sábado?");
    expect(plan.nat).toBe("Would you like to have a coffee on Saturday?");
    const party = SITUATION_BY_ID["s63-party"];
    const drinks = modelAnswers(party, party.hints!.drink, "jamaica", OPTS, 3).map((s) => s.en);
    expect(drinks).toContain("Un agua de jamaica, por favor.");
    expect(drinks.join(" ")).not.toMatch(/(^|[¿¡ ])Jamaica,/);
  });
});
