// "¡Que tenga buen día!": México says it without "un"; the neutral text and Spain with it (the owner, 14 Nov 2026); the learner's goodbye is understood either way, in every Spanish (s72's NLU tests; the owner, 14 Nov 2026).
import { describe, expect, it } from "vitest";
import { SITUATIONS } from "@/content/situations";
import { GLOBAL_LINES } from "@/content/global";

describe("¡Que tenga (un) buen día!", () => {
  it("the neutral goodbye (and so Spain's) says „un buen día“, México's doesn't", () => {
    const line = (GLOBAL_LINES.g_bye_day as any[])[0];
    expect(line.neutral.en).toMatch(/\bun \| buen día/);
    expect(line.en).not.toMatch(/\bun \| buen día/);
    const s72 = SITUATIONS.find((s) => s.id === "s72-cafe")!;
    expect(JSON.stringify(s72.lines)).toContain("¡Que | tengas | un | buen día!");
  });
});
