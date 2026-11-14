// Puerto Colibrí's grotto under Cenote Ka'an (src/game/cave): its plan holds together and its rules are the owner's:
// the first chamber for everyone, one more per ten conversations finished; the stones speak what the learner knows.
import { describe, expect, it } from "vitest";
import * as P from "@/game/cave/plan";
import { SITUATIONS, SITUATION_BY_ID } from "@/content/situations";
import { ROUTE } from "@/content/route";
import { NPCS } from "@/content/npcs";
import { LOCATIONS } from "@/content/locations";
import { THEME } from "@/game/world/theme";

describe("the grotto's plan", () => {
  it("is switched on at Cenote Ka'an", () => { expect(THEME.cenote?.grotto).toBe(true); });

  it("everything stands where one can walk: the way in, the stones, the aluxes, the gates", () => {
    expect(P.walkable(P.ENTRY.x, P.ENTRY.z)).toBe(true);
    expect(P.walkable(P.EXIT.x, P.EXIT.z)).toBe(true);
    for (const c of P.CHAMBERS) for (const s of c.stones) {
      // (a stone stands on the floor, with room in front of its glyph to stand and listen)
      expect(P.inside(s.x, s.z), s.id).toBeGreaterThan(1);
      expect(P.poolAt(s.x, s.z, 0.8), s.id).toBeNull();
      expect(P.walkable(s.x + Math.sin(s.rot) * 1.4, s.z + Math.cos(s.rot) * 1.4), s.id + " front").toBe(true);
      expect(P.chamberAt(s.x, s.z), s.id).toBe(c.n - 1);
    }
    for (const a of P.ALUXES) { expect(P.walkable(a.ax, a.az), a.npc).toBe(true); expect(NPCS[a.npc], a.npc).toBeTruthy(); }
    for (const g of P.GATES) expect(P.inside(g.x, g.z), g.id).toBeGreaterThan(0.5);
  });

  it("one can walk from the way in to the heart: every chamber is joined to the next", () => {
    // flood the ground plan from the way in on a half-metre grid
    const key = (x: number, z: number) => Math.round(x * 2) + ":" + Math.round(z * 2), seen = new Set<string>([key(P.ENTRY.x, P.ENTRY.z)]), q: [number, number][] = [[P.ENTRY.x, P.ENTRY.z]];
    while (q.length) {
      const [x, z] = q.pop()!;
      for (const [dx, dz] of [[0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5]]) {
        const nx = x + dx, nz = z + dz, k = key(nx, nz);
        if (seen.has(k) || !P.walkable(nx, nz, 0.4)) continue;
        seen.add(k); q.push([nx, nz]);
      }
    }
    const reached = (x: number, z: number) => [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1.5, 0], [-1.5, 0], [0, 1.5], [0, -1.5]].some(([dx, dz]) => seen.has(key(Math.round((x + dx) * 2) / 2, Math.round((z + dz) * 2) / 2)));
    for (const c of P.CHAMBERS) for (const s of c.stones) expect(reached(s.x + Math.sin(s.rot) * 1.4, s.z + Math.cos(s.rot) * 1.4), s.id).toBe(true);
    // the island under the Yaxché, across its lake
    expect(reached(P.ISLAND.x + P.ISLAND.r - 1, P.ISLAND.z)).toBe(true);
    // the river is crossed only by the bridge
    expect(P.walkable(-14, -101.3)).toBe(false);
    expect(P.walkable(3, -101.5)).toBe(false);
    expect(P.walkable(-6, -101.4)).toBe(true);
  });

  it("Kin's directions are true (x01): the first stone left of the tree, the second on the right by the water, the third at the far end by the falls", () => {
    const [s1, s2, s3] = P.CHAMBERS[0].stones, tree = P.TREES[0], lagoon = P.POOLS.find((p) => !p.ford && p.rx > 5 && p.z > -40)!;
    // (coming in one walks towards −z: one's left is −x)
    expect(s1.x).toBeLessThan(tree.x - 3);
    expect(Math.abs(s1.z - tree.z)).toBeLessThan(4);
    expect(s2.x).toBeGreaterThan(3);
    expect(Math.hypot((s2.x - lagoon.x) / lagoon.rx, (s2.z - lagoon.z) / lagoon.rz)).toBeLessThan(1.6);
    expect(s3.z).toBeLessThan(P.CHAMBERS[0].z - P.CHAMBERS[0].rz * 0.7);
    expect(Math.hypot(s3.x - P.FALLS[0].x, s3.z - P.FALLS[0].z)).toBeLessThan(6);
  });

  it("the roof is over everyone's head, and higher in the halls", () => {
    for (const c of P.CHAMBERS) expect(P.roofY(c.x, c.z)).toBeGreaterThan(9);
    for (const g of P.GATES) expect(P.roofY(g.x, g.z)).toBeGreaterThan(3.2);
  });
});

describe("the grotto's rules", () => {
  it("the first chamber is open to everyone, one more for every ten conversations finished", () => {
    expect(P.CHAMBERS.map((c) => c.need)).toEqual([0, 10, 20, 30, 40]);
    expect([0, 9, 10, 19, 20, 35, 40, 50].map((n) => P.chambersOpen(n))).toEqual([1, 1, 2, 2, 3, 4, 5, 5]);
    expect(Math.max(...P.CHAMBERS.map((c) => c.need))).toBeLessThanOrEqual(ROUTE.length);
  });

  it("a gate opens for its alux's pass, or for its chamber's three stones and enough of the town", () => {
    const kin = P.GATES.find((g) => g.id === "kin")!, g2 = P.GATES.find((g) => g.id === "g2")!;
    const fresh = P.emptyCave();
    expect(P.gateState(kin, fresh, 50)).toEqual({ open: false, why: "alux" });
    expect(P.gateState(kin, { lit: [], passed: ["kin"] }, 0).open).toBe(true);
    expect(P.gateState(g2, fresh, 50)).toEqual({ open: false, why: "stones" });
    const lit = { lit: P.CHAMBERS[0].stones.map((s) => s.id), passed: ["kin"] };
    expect(P.gateState(g2, lit, 3)).toEqual({ open: false, why: "town", need: 10 });
    expect(P.gateState(g2, lit, 10).open).toBe(true);
    // (to look round: everything open)
    for (const g of P.GATES) expect(P.gateState(g, fresh, 0, true).open).toBe(true);
  });

  it("the card says what comes next", () => {
    const fresh = P.emptyCave();
    expect(P.nextStep(0, fresh, 0)).toEqual({ kind: "alux", npc: "alux_kin" });
    expect(P.nextStep(0, { lit: ["agua-1"], passed: ["kin"] }, 0)).toEqual({ kind: "stones", left: 2 });
    const lit = { lit: P.CHAMBERS[0].stones.map((s) => s.id), passed: ["kin"] };
    expect(P.nextStep(0, lit, 4)).toEqual({ kind: "town", need: 10, have: 4, name: "El Jardín de Raíces" });
    expect(P.nextStep(0, lit, 12)).toEqual({ kind: "on", name: "El Jardín de Raíces" });
    expect(P.nextStep(2, { lit: [], passed: ["kin"] }, 30)).toEqual({ kind: "alux", npc: "alux_nikte" });
    const all = { lit: P.CHAMBERS.flatMap((c) => c.stones.map((s) => s.id)), passed: ["kin", "nikte"] };
    expect(P.nextStep(4, all, 50)).toEqual({ kind: "heart" });
    expect(P.nextStep(4, { ...all, heart: true }, 50)).toEqual({ kind: "done" });
  });

  it("the stones speak the learner's own phrases first, the newest first, then the greetings; only what has a recording", () => {
    const book = [
      { en: "Quisiera un café, por favor.", lt: "I'd like a coffee, please.", count: 1, last: 10 },
      { en: "¿Cuánto cuesta?", lt: "How much is it?", count: 3, last: 30 },
      { en: "¿Cuánto cuesta?", lt: "How much is it?", count: 1, last: 5 },
      { en: "Una frase larguísima que nadie podría repetir de memoria sin leerla otra vez despacio.", lt: "…", count: 1, last: 99 },
      { en: "Sin grabación.", lt: "No recording.", count: 1, last: 98 },
    ];
    const starters = [{ en: "¡Hola!", lt: "Hi!" }, { en: "¡Muchas gracias!", lt: "Thank you very much!" }, { en: "¡Adiós!", lt: "Goodbye!" }];
    const got = P.pickPhrases(book, starters, 4, (en) => en !== "Sin grabación.");
    expect(got.map((p) => p.en)).toEqual(["¿Cuánto cuesta?", "Quisiera un café, por favor.", "¡Hola!", "¡Muchas gracias!"]);
    expect(P.pickPhrases([], starters, 15, () => true)).toHaveLength(3);
  });

  it("three meanings to choose from, the right one among them", () => {
    const right = { en: "¡Hola!", lt: "Hi!" }, others = [{ en: "a", lt: "A" }, { en: "b", lt: "B" }, { en: "c", lt: "Hi!" }, { en: "d", lt: "D" }];
    let seed = 1;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 20; i++) {
      const { options, answer } = P.meaningChoices(right, others, rnd);
      expect(options).toHaveLength(3);
      expect(new Set(options).size).toBe(3);
      expect(options[answer]).toBe("Hi!");
    }
  });

  it("said back: the same words but for accents, capitals and a little word", () => {
    expect(P.saidBack("hola como estas", "¡Hola! ¿Cómo estás?")).toBe(true);
    expect(P.saidBack("Muchas gracias.", "¡Muchas gracias!")).toBe(true);
    expect(P.saidBack("eh quisiera un café por favor", "Quisiera un café, por favor.")).toBe(true);
    expect(P.saidBack("gracias", "¡Muchas gracias!")).toBe(false);
    expect(P.saidBack("quiero un té", "Quisiera un café, por favor.")).toBe(false);
    expect(P.saidBack("", "¡Hola!")).toBe(false);
  });

  it("a stone is louder the nearer it is, and heard on the side it stands", () => {
    // looking towards −z (yaw π): +x is to the right
    const near = P.heard(0, 0, Math.PI, 2, -3), far = P.heard(0, 0, Math.PI, 12, -20), left = P.heard(0, 0, Math.PI, -8, -2);
    expect(near.gain).toBeGreaterThan(far.gain);
    expect(far.gain).toBeGreaterThan(0.05);
    expect(near.pan).toBeGreaterThan(0.2);
    expect(left.pan).toBeLessThan(-0.6);
    expect(P.heard(0, 0, Math.PI, 0, -60).gain).toBe(0);
    // turned round, the sides change
    expect(P.heard(0, 0, 0, -8, 2).pan).toBeGreaterThan(0.6);
  });
});

describe("the aluxes' conversations are off the route", () => {
  it("they are conversations like any other, but no task and not counted", () => {
    const bonus = SITUATIONS.filter((s) => s.bonus);
    expect(bonus.map((s) => s.id).sort()).toEqual(P.ALUXES.map((a) => SITUATIONS.find((s) => s.npc === a.npc)?.id).sort());
    expect(ROUTE).toHaveLength(SITUATIONS.length - bonus.length);
    expect(ROUTE).toHaveLength(50);
    for (const s of bonus) {
      expect(s.location).toBe("gruta");
      expect(LOCATIONS[s.location]?.kind).toBe("interior");
      expect(SITUATION_BY_ID[s.id]).toBe(s);
      expect(/^x\d\d/.test(s.id)).toBe(true);
    }
  });
});
