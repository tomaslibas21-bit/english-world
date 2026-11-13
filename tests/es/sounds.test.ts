import { describe, expect, it } from "vitest";
import { TOWN_SOUNDS } from "../../src/game/townSounds";
import { STRINGS } from "../../src/editions/es/ui/strings";

// Puerto Colibrí's own sounds (src/editions/es/game/townSounds.ts; docs/SOUNDS.md): tropical birds and a marimba's
// far-off notes, and a market hall heard from the street. The Sounds setting has its English words.
describe("Puerto Colibrí's sounds", () => {
  it("is the tropical town with a market hall", () => {
    expect(TOWN_SOUNDS).toEqual({ tropical: true, marketOutdoors: true });
  });
  it("the Sounds setting is in English", () => {
    expect(STRINGS["Garsai"]).toBe("Sounds");
    expect(STRINGS["Žingsniai, jūra, miestelio garsai – tyliau už balsus."]).toMatch(/quieter than the voices/);
  });
});
