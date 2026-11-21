import { describe, expect, it } from "vitest";
import { KIND, KEEPSAKES, keepsakeFor } from "../src/content/keepsakes";
import { SITUATIONS } from "../src/content/situations";

describe("conversation keepsakes", () => {
  it("maps every real situation id to a kind", () => {
    expect(Object.keys(KEEPSAKES).sort()).toEqual(SITUATIONS.map((sit) => sit.id).sort());
    for (const kind of Object.values(KEEPSAKES)) expect(KIND).toHaveProperty(kind);
    expect(keepsakeFor("unmapped")).toBe("receipt");
  });

  it("defines both Lithuanian forms and a shape for every kind", () => {
    expect(Object.keys(KIND)).toHaveLength(19);
    for (const { nominative, accusative, shape } of Object.values(KIND)) {
      expect(nominative.trim()).not.toBe("");
      expect(accusative.trim()).not.toBe("");
      expect(shape.length).toBeGreaterThan(0);
    }
  });
});
