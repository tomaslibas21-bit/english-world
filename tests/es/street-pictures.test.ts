// The street moments' pictures (batch 5 media, 24 Nov 2026): one 1200×400 WebP per moment in public/scenes-es/street/,
// the file StreetCard falls back to when there is no picture for the cast (street/<moment>.webp).
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { STREET_MOMENTS } from "../../src/editions/es/content/street";

const DIR = join(import.meta.dirname, "../../public/scenes-es/street");

describe("street moment pictures", () => {
  it("has a small 3:1 WebP for every moment", () => {
    expect(STREET_MOMENTS.length).toBe(24);
    for (const m of STREET_MOMENTS) {
      const p = join(DIR, `${m.id}.webp`);
      expect(existsSync(p), m.id).toBe(true);
      expect(statSync(p).size, m.id).toBeLessThan(120_000);
      const b = readFileSync(p);
      expect(b.toString("ascii", 8, 12), m.id).toBe("WEBP");
    }
  });
});
