import { describe, expect, it } from "vitest";
import { existsSync, statSync } from "node:fs";
import { BIRDSONG, LOOPS, STEPS, nearLevel, surfLevel, surfaceAt, type Surface } from "../src/game/soundscape";

// The world's sounds (src/game/soundscape.ts, audio.ts): what is underfoot, how loud a place's loop is where the
// player stands, and the recordings they need.
describe("the world's sounds", () => {
  const park = { x1: 76, z1: -50, x2: 124, z2: -14 };
  const at = (o: Partial<Parameters<typeof surfaceAt>[0]>) => surfaceAt({ indoor: false, raised: false, x: 0, z: 0, beachZ: -64, park, ...o });

  it("knows what is underfoot", () => {
    expect(at({})).toBe("stone");
    expect(at({ z: -66 })).toBe("sand");
    expect(at({ z: -66, raised: true })).toBe("wood");      // the pier's boards over the sand
    expect(at({ x: 100, z: -30 })).toBe("grass");
    expect(at({ x: 100, z: -30, raised: true })).toBe("wood"); // a bench in the park
    expect(at({ indoor: true })).toBe("tile");
    expect(at({ indoor: true, warm: true, z: -66 })).toBe("wood");
  });

  it("every surface has its own quiet step", () => {
    const surfaces: Surface[] = ["stone", "sand", "grass", "wood", "tile"];
    expect(Object.keys(STEPS).sort()).toEqual([...surfaces].sort());
    for (const s of surfaces) {
      expect(STEPS[s].vol, s).toBeLessThanOrEqual(0.09);   // never louder than the step the game had
      expect(STEPS[s].len, s).toBeLessThanOrEqual(0.16);
    }
    expect(new Set(surfaces.map((s) => `${STEPS[s].f}/${STEPS[s].q}`)).size).toBe(surfaces.length);
  });

  it("the surf rises towards the water and is gone inland", () => {
    expect(surfLevel(-2)).toBe(1);
    expect(surfLevel(0)).toBe(1);
    expect(surfLevel(10)).toBeGreaterThan(surfLevel(20));
    expect(surfLevel(20)).toBeGreaterThan(0);
    expect(surfLevel(38)).toBe(0);
    expect(surfLevel(80)).toBe(0);
  });

  it("a place's murmur is full at its door and gone a street away", () => {
    expect(nearLevel(0)).toBe(1);
    expect(nearLevel(13)).toBeCloseTo(0.5, 5);
    expect(nearLevel(26)).toBe(0);
    expect(nearLevel(60)).toBe(0);
  });

  it("the recordings are there, small, and loop inside themselves", () => {
    for (const clip of [...Object.values(LOOPS), BIRDSONG]) {
      const file = new URL(`../public/sfx/${clip.file}`, import.meta.url);
      expect(existsSync(file), clip.file).toBe(true);
      expect(statSync(file).size, clip.file).toBeLessThan(100_000);
      expect(clip.gain, clip.file).toBeLessThanOrEqual(0.5);
    }
    for (const loop of Object.values(LOOPS)) {
      expect(loop.start).toBeGreaterThanOrEqual(0.1);          // a margin for the decoder's padding
      expect(loop.end - loop.start).toBeGreaterThan(6);
    }
  });
});
