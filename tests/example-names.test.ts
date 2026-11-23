// Hint examples with the learner's name show and play a fixed example learner, with a note to say one's own (the
// owner, 17 Nov 2026); what the learner says is still heard with any name. Every hint example has a recording.
import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { SITUATION_BY_ID } from "../src/content/situations";
import { GLOBAL } from "../src/content/global";
import { NPCS } from "../src/content/npcs";
import { Conversation } from "../src/convo/dialogue";
import { exampleVars, ownNameNote } from "../src/convo/suggest";
import { audioKey } from "../src/audio-key";
import { enumerateAll } from "../tools/enumerate";

describe("the example learner on hint cards", () => {
  it("is the fixed example identity, with a note in Lithuanian", () => {
    expect(exampleVars()).toEqual({ name: "Tomas", surname: "Mikalauskas", letters: "Mikalauskas" });
    expect(ownNameNote("It's | under | {$name}.")).toBe("Pasakyk savo vardą.");
    expect(ownNameNote("It's | {$surname}.")).toBe("Pasakyk savo pavardę.");
    expect(ownNameNote("It's | {$letters}.")).toBe("Pasakyk savo pavardę paraidžiui.");
    expect(ownNameNote("This is | {$name} | {$surname}.")).toBe("Pasakyk savo vardą ir pavardę.");
    expect(ownNameNote("Two, | please.")).toBeUndefined();
  });

  for (const name of ["Rūta", "Jonas", "Emily"])
    it(`still takes the learner's own name at the restaurant (${name})`, () => {
      const c = new Conversation(SITUATION_BY_ID["s73-restaurant"], { global: GLOBAL, npcs: NPCS, player: { name, surname: "", gender: "f" }, visits: 0, seed: 3, memory: {} });
      c.start();
      c.input("Hi! I have a reservation for two at seven.");
      c.input(`It's under ${name}.`);
      expect(String(c.s.name ?? "").toLowerCase()).toContain(name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").slice(0, 3));
    });
});

describe("recorded conversation hints", () => {
  it("keeps recordings for the existing conversations", () => {
    const manifest = JSON.parse(fs.readFileSync("public/audio-v2/manifest.json", "utf8"));
    const { utts } = enumerateAll({ v2: true, fuzzRuns: 0 });
    // Conversations that allow optional voice use browser synthesis while their clips are prepared.
    const missing = utts.filter((u) => u.where.includes(":hint:") && !SITUATION_BY_ID[u.where.split(":")[0]]?.optionalVoice &&
      /[a-z0-9]/i.test(u.say) && !(audioKey(u.voice, u.speed, u.say) in manifest));
    expect(missing.map((u) => `${u.where} ${u.voice}: ${u.say}`)).toEqual([]);
  });
});
