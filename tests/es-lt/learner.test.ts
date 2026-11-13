// Puerto Colibrí for Lithuanians (docs/es/LEARNER-LT.md): the vitest project "es-lt" runs the Spanish edition with the
// Lithuanian learner layer. Every piece of learner text has its Lithuanian, and every conversation's sims compose in
// both learner genders and all three Spanishes without an error (a gloss whose units don't line up throws).
import { describe, expect, it } from "vitest";
import { SITUATIONS } from "@/content/situations";
import * as Situations from "@/content/situations";
import { EDITION } from "@/edition";
import { setVariety } from "@/convo/compose";
import { STRINGS } from "@/ui/strings";
import { learnerItems } from "../../src/editions/es/learner/walk";
import { sharedContent } from "../../src/editions/es/learner/shared";
import { playSim } from "../../tools/sim-play";
import { chipLabel } from "@/ui/chip-label";

const MISSING = (Situations as unknown as { LEARNER_MISSING: Record<string, string[]> }).LEARNER_MISSING;
const ENGLISH = /\b(the|and|you|your|please|thanks|thank you|would|could|I'm|it's|don't)\b/i;

describe("Puerto Colibrí for Lithuanians", () => {
  it("is the Spanish edition with a Lithuanian learner", () => {
    expect(EDITION.id).toBe("es");
    expect(EDITION.helper).toBe("lt");
    // the interface: Lithuanian originals, except those about English or Maple Harbor
    expect(STRINGS["Parašyk angliškai…"]).toBe("Parašyk ispaniškai…");
  });

  it("has Lithuanian for every piece of every conversation's learner text", () => {
    const missing = Object.entries(MISSING).flatMap(([sit, m]) => m.map((x) => `${sit}: ${x}`));
    expect(missing.slice(0, 20)).toEqual([]);
  });

  it("has Lithuanian for the town-wide text (cast, places, global lines)", () => {
    const left = learnerItems(sharedContent()).filter((i) => (i.kind === "text" ? ENGLISH.test(i.en ?? "") : i.kind === "sent" && ENGLISH.test(i.nat ?? "")));
    expect(left.slice(0, 10).map((i) => i.en ?? i.nat)).toEqual([]);
  });

  it("answer chips say the natural Lithuanian name in the nominative, never the gloss in Spanish order", () => {
    const bad: string[] = [];
    for (const sit of SITUATIONS) for (const [type, list] of Object.entries(sit.entities ?? {})) for (const e of list) {
      if (e.chip || e.lt.split(" | ").length < 2) continue;
      const nat = typeof e.attrs?.nat === "string" ? e.attrs.nat.split("/") : [];
      if (nat.length !== 6 || chipLabel(e) !== nat[0].trim()) bad.push(`${sit.id} ${type}/${e.id}: "${chipLabel(e)}"`);
    }
    expect(bad.slice(0, 20)).toEqual([]);
  });

  for (const sit of SITUATIONS) {
    it(`${sit.id}: the sims compose in Lithuanian`, { timeout: 300_000 }, () => {
      for (const variety of ["default", "neutral", "spain"] as const) {
        setVariety(variety);
        for (const sim of sit.sims ?? []) for (const gender of ["m", "f"] as const) playSim(sit, sim, 1, { gender });
      }
      setVariety("default");
    });
  }
});
