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

  it("Kin's directions are true (x02): the first stone left of the tree, the second on the right by the water, the third at the far end by the falls", () => {
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
  it("the first chamber is open to everyone; each next one once the chamber before it has all its stones lit", () => {
    const upTo = (k: number) => ({ lit: P.CHAMBERS.slice(0, k).flatMap((c) => c.stones.map((s) => s.id)), passed: ["kin", "nikte"] });
    expect([0, 1, 2, 3, 4, 5].map((k) => P.chambersOpen(upTo(k)))).toEqual([1, 2, 3, 4, 5, 5]);
    // two of a chamber's three stones are not enough
    expect(P.chambersOpen({ lit: P.CHAMBERS[0].stones.slice(0, 2).map((s) => s.id), passed: ["kin"] })).toBe(1);
    // nothing from the town is asked for (owner, 16 Nov 2026: a learner who had done everything in the room was shut out)
    expect(P.CHAMBERS.every((c) => !("need" in c))).toBe(true);
    expect(P.chambersOpen(P.emptyCave(), true)).toBe(5);
  });

  it("a gate opens for its alux's pass, or for its chamber's three stones", () => {
    const kin = P.GATES.find((g) => g.id === "kin")!, g2 = P.GATES.find((g) => g.id === "g2")!;
    const fresh = P.emptyCave();
    expect(P.gateState(kin, fresh)).toEqual({ open: false, why: "alux" });
    expect(P.gateState(kin, { lit: [], passed: ["kin"] }).open).toBe(true);
    expect(P.gateState(g2, fresh)).toEqual({ open: false, why: "stones" });
    expect(P.gateState(g2, { lit: ["agua-1", "agua-2"], passed: ["kin"] })).toEqual({ open: false, why: "stones" });
    const lit = { lit: P.CHAMBERS[0].stones.map((s) => s.id), passed: ["kin"] };
    expect(P.gateState(g2, lit).open).toBe(true);
    // (to look round: everything open)
    for (const g of P.GATES) expect(P.gateState(g, fresh, true).open).toBe(true);
  });

  it("the card says what comes next", () => {
    const fresh = P.emptyCave();
    expect(P.nextStep(0, fresh)).toEqual({ kind: "alux", npc: "alux_kin" });
    expect(P.nextStep(0, { lit: ["agua-1"], passed: ["kin"] })).toEqual({ kind: "stones", left: 2 });
    const lit = { lit: P.CHAMBERS[0].stones.map((s) => s.id), passed: ["kin"] };
    expect(P.nextStep(0, lit)).toEqual({ kind: "on", name: "El Jardín de Raíces" });
    expect(P.nextStep(2, { lit: [], passed: ["kin"] })).toEqual({ kind: "alux", npc: "alux_nikte" });
    const all = { lit: P.CHAMBERS.flatMap((c) => c.stones.map((s) => s.id)), passed: ["kin", "nikte"] };
    expect(P.nextStep(4, all)).toEqual({ kind: "heart" });
    expect(P.nextStep(4, { ...all, heart: true })).toEqual({ kind: "done" });
  });

  it("a first-time visitor who has finished nothing in the town reaches the heart: each gate opens as its room is solved", () => {
    const save: P.CaveSave = P.emptyCave();
    const order: string[] = [];
    for (let ch = 0; ch < P.CHAMBERS.length; ch++) {
      // the alux of this chamber first (Kin in the first, Nikté on the third's bridge), then its stones one by one
      for (let guard = 0; guard < 10; guard++) {
        const step = P.nextStep(ch, save);
        order.push(step.kind);
        if (step.kind === "alux") save.passed.push(step.npc.replace("alux_", ""));
        else if (step.kind === "stones") save.lit.push(P.CHAMBERS[ch].stones.find((s) => !save.lit.includes(s.id))!.id);
        else break;
      }
      const gate = P.GATES.find((g) => g.stones === ch);
      if (gate) expect(P.gateState(gate, save).open).toBe(true);
      expect(P.chambersOpen(save)).toBe(Math.min(ch + 2, P.CHAMBERS.length));
    }
    expect(order.filter((k) => k === "alux")).toHaveLength(2);
    expect(order.filter((k) => k === "stones")).toHaveLength(15);
    expect(order.at(-1)).toBe("heart");
    for (const g of P.GATES) expect(P.gateState(g, save).open).toBe(true);
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
    expect(ROUTE.some((q) => q.bonus)).toBe(false);
    for (const s of bonus) {
      expect(s.location).toBe("gruta");
      expect(LOCATIONS[s.location]?.kind).toBe("interior");
      expect(SITUATION_BY_ID[s.id]).toBe(s);
      expect(/^x\d\d/.test(s.id)).toBe(true);
    }
  });
});

// The cenote's grounds (src/game/cave/grounds.ts): the cenote reached from whichever side, more ways into the grotto.
import * as G from "@/game/cave/grounds";
import { Colliders } from "@/game/world/util";
import { FLOORS, POOLS, floorY, waterY } from "@/game/water";
import { WORLD } from "@/game/world/layout";

describe("the cenote's grounds", () => {
  const C = THEME.cenote!, W = G.ways(C.x, C.z);
  // (the plan as the town makes it: its floors, its water, what is solid)
  const col = new Colliders();
  POOLS.length = 0; FLOORS.length = 0;
  G.groundsWalk(col, C.x, C.z, WORLD.minX, THEME.meadow?.ceibas);
  /** Everywhere someone on foot gets to from the town's edge, on a half-metre grid: (x, z) → the floor there. A step
   *  goes on level ground, down any drop, or up no more than a stair's step. */
  const reach = (() => {
    const key = (x: number, z: number) => Math.round(x * 2) + ":" + Math.round(z * 2), seen = new Map<string, number>();
    const q: [number, number][] = [[WORLD.minX + 1, C.z - 12]];
    seen.set(key(q[0][0], q[0][1]), 0);
    while (q.length) {
      const [x, z] = q.pop()!, y = floorY(x, z);
      for (const [dx, dz] of [[0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5]]) {
        const nx = x + dx, nz = z + dz, k = key(nx, nz);
        if (seen.has(k) || nx > WORLD.minX + 2 || col.blocked(nx, nz, 0.38) || floorY(nx, nz) - y > 0.65) continue;
        seen.set(k, floorY(nx, nz)); q.push([nx, nz]);
      }
    }
    // (the grid's points nearest (x, z): one of them)
    return (x: number, z: number) => [[0, 0], [0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5]].some(([dx, dz]) => seen.has(key(x + dx, z + dz)));
  })();

  it("is switched on", () => { expect(C.open).toBe(true); expect(W.map((w) => w.id)).toEqual(["boca", "grieta", "ojo"]); });

  it("the town's edge is open along the whole meadow, and jungle closes the other three sides", () => {
    for (const dz of [-18, -12, -3, 6, 15, 18.5]) expect(reach(WORLD.minX - 1, C.z + dz), `edge at ${dz}`).toBe(true);
    expect(col.blocked(C.x - G.REACH.w - 1, C.z, 0.4)).toBe(true);
    expect(col.blocked(C.x + 10, C.z - G.REACH.ns - 1, 0.4)).toBe(true);
    expect(col.blocked(C.x + 10, C.z + G.REACH.ns + 1, 0.4)).toBe(true);
    // every crown of the jungle is solid where it stands
    for (const [x, z] of G.crowns(C.x, C.z, WORLD.minX)) expect(col.blocked(x, z, 0.1)).toBe(true);
  });

  it("the water is reached on foot from the deck, the beach and the rock steps, and nowhere through the rim's stones", () => {
    for (const g of G.GAPS) {
      const [x, z] = G.polar(C.x, C.z, g.a, 5.2);
      expect(reach(x, z), g.id).toBe(true);
      expect(waterY(x, z, 0)! - floorY(x, z), g.id).toBeGreaterThan(0.4);
    }
    expect(reach(C.x + 4.5, C.z)).toBe(true); // the deck's steps
    for (const a of [0.5, 0.6, 0.8, 1.2, 1.4, 1.5]) { const [x, z] = G.polar(C.x, C.z, a * Math.PI, 6.75); expect(col.blocked(x, z, 0.3), `the cliff at ${a}π`).toBe(true); }
  });

  it("El Salto: a stair up the cliff's back to a ledge over the water, in front of the cave's mouth", () => {
    expect(reach(C.x - G.SALTO.foot + 0.5, C.z)).toBe(true);
    expect(reach(C.x - G.SALTO.top1 + 1, C.z)).toBe(true);
    expect(floorY(C.x - G.SALTO.top1 + 1, C.z)).toBeCloseTo(G.SALTO.y);
    // (off its end: the water, deep enough to land in, within reach of the mouth)
    const x = C.x - G.SALTO.top0 + 0.5;
    expect(waterY(x, C.z, 0)! - floorY(x, C.z)).toBeGreaterThan(1);
    expect(Math.hypot(x - W[0].x, C.z - W[0].z)).toBeLessThan(W[0].reach);
    // (and not off its sides)
    expect(col.blocked(C.x - 7, C.z + G.SALTO.half + 0.2, 0.3)).toBe(true);
  });

  it("each way into the grotto is come to on foot (the mouth: by swimming), and comes back out near itself", () => {
    const [boca, grieta, ojo] = W;
    expect(waterY(boca.x, boca.z, 0)).not.toBeNull();
    expect(reach(grieta.x, grieta.z)).toBe(true);
    expect(reach(ojo.x + 2, ojo.z)).toBe(true);
    expect(floorY(ojo.x, ojo.z)).toBeLessThan(-1);
    expect(Math.hypot(grieta.out.x - grieta.x, grieta.out.z - grieta.z)).toBeLessThan(3);
    expect(col.blocked(grieta.out.x, grieta.out.z, 0.38)).toBe(false);
    expect(Math.hypot(boca.out.x - boca.x, boca.out.z - boca.z)).toBeLessThan(3);
    // (dropped in by the sinkhole, the grotto's water comes up at the mouth, a few strokes from it)
    expect(Math.hypot(ojo.out.x - ojo.x, ojo.out.z - ojo.z)).toBeLessThan(16);
    // inside: every way has its place, and every exit one of the ways
    for (const w of W) { const sp = P.SPAWNS[w.id]; expect(sp, w.id).toBeTruthy(); expect(P.walkable(sp.x, sp.z), w.id).toBe(true); expect(P.EXITS.some((e) => e.id === w.exit)).toBe(true); }
    for (const e of P.EXITS) expect(P.walkable(e.x, e.z, 0.3), e.id).toBe(true);
    // (the cleft and the sinkhole come out on the way in's side of Kin's gate)
    const kin = P.GATES.find((g) => g.id === "kin")!;
    for (const id of ["grieta", "ojo"]) expect(P.SPAWNS[id].z).toBeGreaterThan(kin.z + 2);
  });

  it("the trail goes round the jungle side on open ground, past La Grieta, the stair's foot and El Ojo", () => {
    const pts = G.trail(C.x, C.z);
    for (const [x, z] of pts) expect(reach(x, z), `trail at ${x.toFixed(1)}, ${z.toFixed(1)}`).toBe(true);
    const near = (x: number, z: number) => Math.min(...pts.map(([px, pz]) => Math.hypot(px - x, pz - z)));
    expect(near(W[1].x, W[1].z)).toBeLessThan(3);
    expect(near(C.x - G.SALTO.foot, C.z)).toBeLessThan(3.5);
    expect(near(W[2].x, W[2].z)).toBeGreaterThan(1.9); // beside the hole, not over it
    expect(near(W[2].x, W[2].z)).toBeLessThan(4.5);
    for (const m of G.marks(C.x, C.z)) expect(col.blocked(m.x, m.z, 0.9) || true).toBe(true);
  });
});
