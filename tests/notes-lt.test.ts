// The word notes behind the "*" and the dotted underline are in Lithuanian, the learner's language (owner, 15 Nov 2026:
// "the explanations with the asterisk are awkwardly in English"): every English note in the conversations has its
// Lithuanian in src/content/notes-lt.ts, the Lithuanian reads as Lithuanian and keeps the gloss words it cites, and
// compose puts it on the units.
import { describe, expect, it } from "vitest";
import { SITUATIONS } from "../src/content/situations";
import * as GLOBAL from "../src/content/global";
import { NOTES_LT, learnerNote } from "../src/content/notes-lt";
import { compose } from "../src/convo/compose";
import { t } from "../src/content/dsl";

/** Every note written on a sentence in the conversations and the shared lines, with one sentence that has it. */
function authoredNotes(): Map<string, string> {
  const seen = new Set<object>(), notes = new Map<string, string>();
  const walk = (o: any) => {
    if (!o || typeof o !== "object" || seen.has(o)) return;
    seen.add(o);
    if (typeof o.en === "string" && typeof o.lt === "string" && typeof o.nat === "string" && o.flags)
      for (const n of Object.values(o.flags)) if (!notes.has(String(n))) notes.set(String(n), o.en);
    for (const v of Object.values(o)) walk(v);
  };
  for (const s of SITUATIONS) walk(s);
  walk(GLOBAL);
  return notes;
}
const notes = authoredNotes();
// compose.ts writes this one itself (a partitive "some" before an entity)
const GENERATED = ["Partitive: the Lithuanian genitive ending carries “some”."];

describe("the word notes in Lithuanian", () => {
  it("every note in the conversations has its Lithuanian", () => {
    const missing = [...notes.keys(), ...GENERATED].filter((n) => !NOTES_LT[n]?.trim());
    expect(missing, `no Lithuanian in src/content/notes-lt.ts for:\n${missing.map((n) => `  ${n}  (${notes.get(n)})`).join("\n")}`).toEqual([]);
  });

  it("no Lithuanian for a note nothing uses any more", () => {
    const used = new Set([...notes.keys(), ...GENERATED]);
    expect(Object.keys(NOTES_LT).filter((n) => !used.has(n))).toEqual([]);
  });

  it("each reads as Lithuanian: English only cited, in quotes or in brackets („'s“ (is))", () => {
    const english = /(?<!\p{L})(the|is|are|of|and|with|has|have|carries|sits|needs|word|no|it|this|that|in|on)(?!\p{L})/iu;
    const prose = (lt: string) => lt.replace(/„[^“]*“/g, "").replace(/\([^)]*\)/g, "").replace(/\[[^\]]*\]/g, "");
    const bad = Object.entries(NOTES_LT).filter(([, lt]) => english.test(prose(lt)));
    expect(bad.map(([en, lt]) => `${en} → ${lt}`)).toEqual([]);
  });

  it("each keeps the Lithuanian words its note cites (the forms from the gloss)", () => {
    const bad: string[] = [];
    for (const [en, lt] of Object.entries(NOTES_LT)) {
      const cited = en.replace(/“[^”]*”/g, "").match(/[\p{L}-]*[ąčęėįšųūž][\p{L}-]*/giu) ?? [];
      const low = lt.toLowerCase();
      for (const w of cited) if (!low.includes(w.toLowerCase())) bad.push(`${w}: ${en} → ${lt}`);
    }
    expect(bad).toEqual([]);
  });

  it("compose puts the Lithuanian on the units; a note without one stays as written", () => {
    const s = compose(t("Do | you | have | a | room?", "Ar | jūs | turite | — | kambarį?", "Ar turite kambarį?", { flags: { 0: "Question “Do” = the particle ar." } }), {}, { look: () => undefined });
    expect(s.units[0].flag).toBe(NOTES_LT["Question “Do” = the particle ar."]);
    expect(s.units[0].flag).not.toContain("particle");
    expect(learnerNote("A note of its own.")).toBe("A note of its own.");
    expect(learnerNote(undefined)).toBeUndefined();
  });
});
