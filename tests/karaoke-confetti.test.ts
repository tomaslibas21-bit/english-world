import { afterEach, describe, expect, it, vi } from "vitest";
import { freezeConfettiBurst } from "./browser/fixtures/confetti.mjs";

afterEach(() => vi.unstubAllGlobals());
describe("the finish review screenshot", () => {
  it("captures painted pieces even though their origin is zero-size and the original burst has finished", () => {
    const animation = { pause: vi.fn(), currentTime: 2200 };
    const piece = { getBoundingClientRect: () => ({ left: 50, top: 50, right: 58, bottom: 62, width: 8, height: 12 }) };
    const origin = { getBoundingClientRect: () => ({ width: 0, height: 0 }), getAnimations: () => [animation], querySelectorAll: () => [piece] };
    vi.stubGlobal("window", { innerWidth: 390, innerHeight: 844, matchMedia: () => ({ matches: false }) });
    vi.stubGlobal("document", { querySelector: () => origin });
    vi.stubGlobal("getComputedStyle", () => ({ opacity: animation.currentTime === 350 ? "1" : "0" }));
    expect(freezeConfettiBurst()).toBe(true);
    expect(origin.getBoundingClientRect().width).toBe(0);
    expect(animation.pause).toHaveBeenCalledOnce(); expect(animation.currentTime).toBe(350);
  });
  it("waits for real pieces and respects reduced motion", () => {
    vi.stubGlobal("window", { matchMedia: () => ({ matches: false }) });
    vi.stubGlobal("document", { querySelector: () => null });
    expect(freezeConfettiBurst()).toBe(false);
    vi.stubGlobal("window", { matchMedia: () => ({ matches: true }) });
    expect(freezeConfettiBurst()).toBe(false);
  });
});
