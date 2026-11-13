import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { LOADING_ART } from "../../src/ui/loadingArt";

// The Spanish edition's loading screen is Puerto Colibrí's own logo (src/editions/es/ui/loadingArt.ts): the
// hummingbird, the town's name and the papel picado, held to the same rules as Maple Harbor's (tests/loading.test.ts).
describe("Puerto Colibrí's loading screen", () => {
  const css = readFileSync(new URL("../../public/loading.css", import.meta.url), "utf8");

  it("is the hummingbird's, not the lighthouse's", () => {
    expect(LOADING_ART).toContain("pc-wing");
    expect(LOADING_ART).not.toContain("mh-");
  });

  it("is a picture, a wordmark and the flags, with nothing to fetch or run", () => {
    for (const part of ["ew-logo-art", "ew-logo-word", "ew-logo-hint", "ew-flag"]) expect(LOADING_ART).toContain(part);
    expect(LOADING_ART).not.toMatch(/<script|<img|<image|url\(\s*['"]?(?!#)|<use[^>]+href="(?!#)|<text|font-family/);
    const ids = [...LOADING_ART.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
    for (const ref of LOADING_ART.matchAll(/(?:url\(#|href="#)([\w-]+)/g)) expect(ids).toContain(ref[1]);
  });

  it("every animation starts from --ew-t and stands still on request", () => {
    const rules = LOADING_ART.match(/[^{}]*\{[^{}]*animation:[^{}]*\}/g) ?? [];
    expect(rules.length).toBeGreaterThan(4);
    for (const r of rules) expect(r, r).toContain("var(--ew-t, 0s)");
    expect(css).toContain(".ew-logo, .ew-logo * { animation: none !important; }");
    // the still pose: wings held open
    expect(LOADING_ART).toMatch(/prefers-reduced-motion: reduce\) \{ \.pc-wing-near/);
  });
});
