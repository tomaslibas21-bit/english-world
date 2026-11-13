// "¡Que tenga buen día!": México and the neutral text say it without "un", Spain with it (without it sounds Latin
// American there); the learner's goodbye is understood either way, in every Spanish (s72's NLU tests; the owner, 14 Nov 2026).
import { describe, expect, it } from "vitest";
import { SITUATIONS } from "@/content/situations";
import { GLOBAL_LINES } from "@/content/global";

describe("¡Que tenga (un) buen día!", () => {
  it("Spain's goodbye says „un buen día“", () => {
    const spain = (GLOBAL_LINES.g_bye_day as any[])[0].spain.en as string;
    expect(spain).toMatch(/\bun \| buen día/);
    const s72 = SITUATIONS.find((s) => s.id === "s72-cafe")!;
    expect(JSON.stringify(s72.lines)).toContain("¡Que | tengas | un | buen día!");
  });
});
