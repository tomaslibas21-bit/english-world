// The Spanish the game starts in before the learner chooses: Mexican on its own, the build's VITE_DEFAULT_VARIETY
// inside Spanish Master English (tools/export-sme.ts: neutral, the course's decks start there too).
import { afterEach, describe, expect, test, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("the default Spanish", () => {
  test("the game on its own: Mexican", async () => {
    const { DEFAULT_VARIETY, loadVariety } = await import("../../src/state/variety");
    expect(DEFAULT_VARIETY).toBe("default");
    expect(loadVariety()).toBe("default");
  });

  test("a build with VITE_DEFAULT_VARIETY=neutral (the course's) starts in neutral; an unknown value is ignored", async () => {
    vi.stubEnv("VITE_DEFAULT_VARIETY", "neutral");
    vi.resetModules();
    const a = await import("../../src/state/variety");
    expect(a.DEFAULT_VARIETY).toBe("neutral");
    expect(a.loadVariety()).toBe("neutral");
    vi.stubEnv("VITE_DEFAULT_VARIETY", "castellano");
    vi.resetModules();
    const b = await import("../../src/state/variety");
    expect(b.DEFAULT_VARIETY).toBe("default");
  });

  test("a stored choice wins over the default", async () => {
    vi.stubEnv("VITE_DEFAULT_VARIETY", "neutral");
    vi.resetModules();
    const store = new Map([["puerto-colibri-variety", "spain"]]);
    vi.stubGlobal("localStorage", { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v) });
    try {
      const { loadVariety } = await import("../../src/state/variety");
      expect(loadVariety()).toBe("spain");
      store.set("puerto-colibri-variety", "nonsense");
      expect(loadVariety()).toBe("neutral");
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
