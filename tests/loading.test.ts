import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { LOADING_ART } from "../src/ui/loadingArt";
import { loadingMarkup, loadingScreen } from "../tools/loading-screen";

// The loading screen is put into index.html when the page is built, and the game's script reuses that markup
// (src/ui/Loading.tsx): the page must keep its marker, and the logo must be a self-contained, still-able picture.
describe("the loading screen", () => {
  const page = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const css = readFileSync(new URL("../public/loading.css", import.meta.url), "utf8");

  it("index.html has one place for the logo, inside #root", () => {
    expect(page.match(/<!--loading-->/g)).toHaveLength(1);
    expect(page).toContain('<div id="root"><!--loading--></div>');
  });

  it("the built page shows the logo before any script", () => {
    const out = loadingScreen("Kraunama", LOADING_ART).transformIndexHtml(page);
    expect(out).not.toContain("<!--loading-->");
    expect(out).toContain(loadingMarkup("Kraunama", LOADING_ART));
    expect(out.indexOf('class="ew-logo"')).toBeLessThan(out.indexOf("<script"));
    expect(() => loadingScreen("x", LOADING_ART).transformIndexHtml("<html></html>")).toThrow();
  });

  it("is Maple Harbor's: the lighthouse, not the other town's hummingbird", () => {
    expect(LOADING_ART).toContain("mh-beam");
    expect(LOADING_ART).not.toContain("pc-");
  });

  it("the logo is a picture, a wordmark and the flags, with nothing to fetch or run", () => {
    for (const part of ["ew-logo-art", "ew-logo-word", "ew-logo-hint", "ew-flag"]) expect(LOADING_ART).toContain(part);
    expect(LOADING_ART).not.toMatch(/<script|<img|<image|url\(\s*['"]?(?!#)|<use[^>]+href="(?!#)|<text|font-family/);
    const ids = [...LOADING_ART.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
    for (const ref of LOADING_ART.matchAll(/(?:url\(#|href="#)([\w-]+)/g)) expect(ids).toContain(ref[1]);
  });

  it("every animation starts from --ew-t, so a redrawn logo carries on, and stands still on request", () => {
    const rules = (css + LOADING_ART).match(/[^{}]*\{[^{}]*animation:[^{}]*\}/g) ?? [];
    expect(rules.length).toBeGreaterThan(8);
    for (const r of rules) if (!/animation:\s*none/.test(r)) expect(r, r).toContain("var(--ew-t, 0s)");
    expect(css).toMatch(/prefers-reduced-motion: reduce\) \{\s*\.ew-logo, \.ew-logo \* \{ animation: none !important; \}/);
  });
});
