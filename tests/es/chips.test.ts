// The answer chips (src/ui/chip-label.ts): an entity the learner can pick shows its natural English name, never its
// word-by-word gloss in Spanish order ("food Yucatán", "suit for bathing"), in every Spanish.
import { describe, expect, it } from "vitest";
import { SITUATIONS } from "@/content/situations";
import { setVariety } from "@/convo/compose";
import { chipLabel } from "@/ui/chip-label";

describe("answer chips", () => {
  it("say the natural English name, not the gloss in Spanish order", () => {
    const bad: string[] = [];
    for (const v of ["default", "neutral", "spain"] as const) {
      setVariety(v);
      for (const sit of SITUATIONS) for (const [type, list] of Object.entries(sit.entities ?? {})) for (const e of list) {
        const label = chipLabel(e);
        const units = e.lt.split(" | ");
        // a chip with a gloss of several words shows the entity's natural name (attrs.nat), whatever order the gloss has
        if (!e.chip && units.length > 1 && (typeof e.attrs?.nat !== "string" || label !== e.attrs.nat)) bad.push(`${v} ${sit.id} ${type}/${e.id}: "${label}"`);
        if (!label.trim()) bad.push(`${v} ${sit.id} ${type}/${e.id}: empty`);
      }
    }
    setVariety("default");
    expect(bad).toEqual([]);
  });

  it("s69: Doña Carmen's “¿Algo típico de aquí?” is answered with local food", () => {
    const e = SITUATIONS.find((s) => s.id === "s69-local")!.entities!.cuisine?.find((x) => x.id === "yucateca") ??
      Object.values(SITUATIONS.find((s) => s.id === "s69-local")!.entities!).flat().find((x) => x.id === "yucateca")!;
    expect(chipLabel(e)).toBe("local food");
    // "comida local", not "comida yucateca": usable anywhere (owner, 14 Nov 2026)
    expect(e.en).toBe("comida | local");
    expect(e.lt).toBe("food | local");
  });
});
