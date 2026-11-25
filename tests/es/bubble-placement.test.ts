import { describe, expect, it } from "vitest";
import { createBubblePlacement } from "../../src/ui/street/bubblePlacement";

// A short upright phone (390×664): the top HUD down to 300 px, the controls from 420 px (the speaker stands behind
// them); a 200 px bubble can't fit.
function shortPhone() {
  const { blockers, place } = createBubblePlacement(4);
  const set = (i: number, left: number, right: number, top: number, bottom: number) =>
    Object.assign(blockers[i], { left, right, top, bottom });
  set(0, 0, 390, 0, 300);
  set(1, 0, 390, 420, 664);
  return place;
}

describe("street bubble placement", () => {
  it("places a bubble that fits at its full height, with the tail pointing at the speaker", () => {
    const { blockers, place } = createBubblePlacement(2);
    Object.assign(blockers[0], { left: 0, right: 390, top: 0, bottom: 100 });
    const at = place(200, 400, 150, 60, 390, 664, 1);
    expect(at).toBeDefined();
    expect(at!.height).toBe(60);
    expect(at!.y + at!.height).toBeLessThanOrEqual(400);
    // Above the head, the tail points straight down at it.
    expect(Math.abs(at!.tail.angle)).toBeLessThan(1);
  });

  it("hides a bubble that can't fit when it may not shrink", () => {
    expect(shortPhone()(195, 440, 200, 200, 390, 664, 2)).toBeUndefined();
  });

  it("shrinks to the tallest free height, at least the minimum, when it may", () => {
    const at = shortPhone()(195, 440, 200, 200, 390, 664, 2, 44);
    expect(at).toBeDefined();
    // The gap is 120 px less the 9 px clearance on each side.
    expect(at!.height).toBeGreaterThanOrEqual(100);
    expect(at!.height).toBeLessThanOrEqual(102);
    expect(at!.y).toBeGreaterThanOrEqual(309 - 1);
    expect(at!.y + at!.height).toBeLessThanOrEqual(411 + 1);
  });

  it("gives up below the minimum height", () => {
    expect(shortPhone()(195, 440, 200, 200, 390, 664, 2, 150)).toBeUndefined();
  });
});
