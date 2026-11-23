// Puerto Colibrí: hint examples with the learner's name show and play the edition's example learner, with a note
// in the learner's own language (the owner, 17 Nov 2026), and every hint example has a recording.
import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { exampleVars, ownNameNote } from "../../src/convo/suggest";
import { audioKey } from "../../src/audio-key";
import { LOTERIA_SITUATION } from "../../src/editions/es/content/loteria";
import { enumerateEs } from "../../tools/es-voices/lines-es";

describe("the example learner on hint cards", () => {
  it("is the edition's example learner, with a note in English for Spanish Master English", () => {
    expect(exampleVars()).toEqual({ name: "Ryan", surname: "Miller", letters: "Miller" });
    expect(ownNameNote("A | nombre | de | {$name}.")).toBe("Say your own name.");
    expect(ownNameNote("Es | {$letters}.")).toBe("Spell your own last name.");
    expect(ownNameNote("Soy | {$name} | {$surname}.")).toBe("Say your own first and last name.");
  });
});

describe("every hint example has a recording", () => {
  it("no hint example falls to the browser voice", () => {
    const manifest = JSON.parse(fs.readFileSync("public/audio-es/manifest.json", "utf8"));
    const res: any = enumerateEs({ fuzzRuns: 0 });
    // The pool, lotería and pool-hall chats are awaiting recordings.
    const PENDING = ["x09-alberca", LOTERIA_SITUATION, "x11-billar"];
    const missing = (res.utts as any[]).filter((u) => u.where.includes(":hint:") && !PENDING.some((p) => u.where.startsWith(p + ":")) && /[\p{L}0-9]/u.test(u.say) && !(audioKey(u.voice, u.speed, u.say) in manifest));
    expect(missing.map((u) => `${u.where} ${u.voice}: ${u.say}`)).toEqual([]);
  }, 600_000);
});
