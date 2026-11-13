// Puerto Colibrí's beach people (characters v2, theme.ts `beachwear`): dressed for the beach, family-friendly, and only
// where the theme says.
import { describe, expect, it } from "vitest";
import { beachLook, walkerLook } from "../../src/game/ambient";
import { THEME } from "../../src/game/world/theme";
import { rand } from "../../src/game/world/util";
import { Character } from "../../src/game/characters/Character";
import * as THREE from "three";

describe("beachwear", () => {
  it("the theme has it: south of the malecón's line, and a share of the passers-by", () => {
    expect(THEME.beachwear).not.toBeNull();
    expect(THEME.beachwear!.z).toBeLessThan(-60);
    expect(THEME.beachwear!.walkers).toBeGreaterThan(0.1);
    expect(THEME.beachwear!.walkers).toBeLessThan(0.5);
  });

  it("a swimsuit is always under a sarong or an open shirt, swim trunks always with a T-shirt or a tank, everyone in sandals", () => {
    const r = rand(77), rb = rand(78);
    const seen = new Set<string>();
    for (let i = 0; i < 600; i++) {
      const female = i % 2 === 0, l = beachLook(walkerLook(female, r), female, rb), acc = l.acc ?? [];
      expect(l.flipflops).toBe(true);
      expect(l.female).toBe(female);
      if (l.swim === "suit") { expect(female).toBe(true); expect(acc.includes("sarong") || acc.includes("coverup")).toBe(true); }
      if (l.swim === "trunks") { expect(female).toBe(false); expect(l.top).toMatch(/^#/); }
      if (acc.includes("sarong")) expect(l.skirt).toBe(true);
      // (no one keeps a town hat or a cap under a sun hat)
      expect(acc.filter((a) => ["sunhat", "strawhat", "bucket", "cap", "hat"].includes(a)).length).toBeLessThanOrEqual(1);
      for (const k of [l.swim ?? "", l.sleeves ?? "", ...acc]) seen.add(k);
    }
    // every piece turns up
    for (const k of ["suit", "trunks", "short", "none", "sarong", "coverup", "sunhat", "bucket", "strawhat"]) expect(seen.has(k), k).toBe(true);
  });

  it("every beach look builds as one mesh, sitting back on a lounger too", () => {
    const r = rand(5), rb = rand(6);
    for (let i = 0; i < 40; i++) {
      const female = i % 2 === 0, c = new Character(beachLook(walkerLook(female, r), female, rb));
      if (i % 3 === 0) { c.seatY = 0.36; c.recline = 0.9; c.setAnim("sit"); }
      for (let k = 0; k < 10; k++) c.update(1 / 30);
      let n = 0;
      c.root.traverse((o) => { if ((o as THREE.SkinnedMesh).isSkinnedMesh) n++; });
      expect(n).toBe(1);
      c.dispose();
    }
  });
});
