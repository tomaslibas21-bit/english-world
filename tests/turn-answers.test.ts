// The learner's turn always has something to say (Conversation.tsx turnAnswers): a last name they already said
// fills the next step's model answer, and where nothing complete can be made the frames with "…" stand in.
import { describe, expect, it } from "vitest";
import { SITUATIONS } from "../src/content/situations";
import { answerFrames, modelAnswers, playerVars } from "../src/convo/suggest";

const hotel = SITUATIONS.find((s) => s.id === "s68-hotel")!;
const opts = (vars: Record<string, string | undefined>) => ({ formal: true, gender: "m" as const, npcGender: "f" as const, vars });

describe("the learner's turn is never empty", () => {
  it("a profile without a last name has no complete answer for the hotel's spelling step", () => {
    expect(modelAnswers(hotel, hotel.hints.spell, undefined, opts(playerVars({ name: "Tomas", surname: "" })), 3)).toEqual([]);
  });
  it("the last name said a step before spells out in the next one", () => {
    const vars = playerVars({ name: "Tomas", surname: "" }, { name: "livas" });
    expect(vars.surname).toBe("Livas");
    const ex = modelAnswers(hotel, hotel.hints.spell, undefined, opts(vars), 3);
    expect(ex.length).toBeGreaterThan(0);
    expect(ex[0].en).toContain("L-I-V-A-S");
  });
  it("the learner's own first name is not taken for a last name, and the profile's last name comes first", () => {
    expect(playerVars({ name: "Tomas", surname: "" }, { name: "Tomas" }).surname).toBeUndefined();
    expect(playerVars({ name: "Tomas", surname: "Petraitis" }, { name: "Livas" }).surname).toBe("Petraitis");
  });
  it("with nothing known, the frames show where the learner's own words go", () => {
    const fr = answerFrames(hotel, hotel.hints.name, undefined, opts(playerVars({ name: "Tomas", surname: "" })), 3);
    expect(fr.length).toBeGreaterThan(0);
    expect(fr.every((f) => f.s.en.includes("…"))).toBe(true);
  });
  it("every conversation's hint group has a model answer or a frame", () => {
    const vars = playerVars({ name: "Tomas", surname: "" });
    for (const sit of SITUATIONS) for (const [id, g] of Object.entries(sit.hints)) {
      const o = opts(vars);
      const n = modelAnswers(sit, g, undefined, o, 3).length || answerFrames(sit, g, undefined, o, 3).length;
      expect(n, `${sit.id} ${id}`).toBeGreaterThan(0);
    }
  });
});
