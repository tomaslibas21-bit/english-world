import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { KIND, KEEPSAKES, keepsakeFor } from "../src/content/keepsakes";
import { SITUATIONS } from "../src/content/situations";

describe("conversation keepsakes", () => {
  it("maps every real situation id to a kind", () => {
    expect(Object.keys(KEEPSAKES).sort()).toEqual(SITUATIONS.map((sit) => sit.id).sort());
    for (const kind of Object.values(KEEPSAKES)) expect(KIND).toHaveProperty(kind);
    expect(keepsakeFor("unmapped")).toBe("receipt");
  });

  it("matches every English and Lithuanian pocket name in the copy ledger", () => {
    const ledger = readFileSync(new URL("../docs/plans/WORDS-backpack.md", import.meta.url), "utf8");
    const pocketSection = ledger.split("## Pocket names")[1].split("\n## ")[0];
    const rows = pocketSection.split("\n").filter((line) => line.startsWith("|")).slice(2);
    expect(rows.sort()).toEqual(Object.values(KIND).map(({ en, nominative }) => `| ${en} | ${nominative} |`).sort());
  });

  it("defines both Lithuanian forms and a shape for every kind", () => {
    expect(Object.keys(KIND)).toHaveLength(22);
    expect(keepsakeFor("x01-pool-hall")).toBe("cue_chalk");
    expect(keepsakeFor("x06-bram")).toBe("slate_pebble");
    expect(keepsakeFor("x07-fern")).toBe("slate_pebble");
    expect(keepsakeFor("x08-old-oak")).toBe("oak_leaf");
    for (const { nominative, accusative, shape } of Object.values(KIND)) {
      expect(nominative.trim()).not.toBe("");
      expect(accusative.trim()).not.toBe("");
      expect(shape.length).toBeGreaterThan(0);
    }
  });
});
