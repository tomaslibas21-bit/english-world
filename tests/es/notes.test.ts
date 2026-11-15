// Puerto Colibrí's word notes reach the units as written (English for Spanish Master English; the Lithuanian layer
// translates its own): Maple Harbor's Lithuanian notes (src/content/notes-lt.ts) don't touch them.
import { describe, expect, it } from "vitest";
import { compose } from "@/convo/compose";
import { t } from "@/content/dsl";
import { NOTES_LT } from "@/content/notes-lt";

describe("Puerto Colibrí's word notes", () => {
  it("stay as written", () => {
    expect(Object.keys(NOTES_LT)).toEqual([]);
    const s = compose(t("¿Tiene | habitación?", "Do you have | a room?", "Do you have a room?", { flags: { 0: "Question “Do” = the particle ar." } }), {}, { look: () => undefined });
    expect(s.units[0].flag).toBe("Question “Do” = the particle ar.");
  });
});
