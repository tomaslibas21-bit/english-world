// Puerto Colibrí's conversations have their places (docs/es/TOWN.md "Every conversation's spot"): the checks that need
// no browser. The rooms themselves are drawn on a canvas, so the tour (tools/es-tour.mjs) walks to every spot in Chromium.
// Runs in the vitest project "es" (vite.config.ts), where src/editions/es/ replaces the base files.
import { describe, expect, it } from "vitest";
import { SITUATIONS, SITUATION_BY_ID } from "../../src/content/situations";
import { LOCATIONS, NAME_MEANING, placeLtNamed } from "../../src/content/locations";
import { NPCS } from "../../src/content/npcs";
import { CAR, CHAT_SPOTS, FOUNTAIN, OUTDOOR_NPCS, PARKED_CARS, SQUARE, STALLS, TRAFFIC_LANES } from "../../src/game/world/layout";
import { THEME } from "../../src/game/world/theme";
import { STALL_SIZE } from "../../src/game/world/mexican";

const isCall = (id: string) => {
  const s = SITUATION_BY_ID[id];
  return s.mode === "phone" || s.mode === "video" || s.location === "phone";
};

describe("every Spanish conversation's place", () => {
  it("has a place, and its people exist", () => {
    for (const s of SITUATIONS) {
      expect(LOCATIONS[s.location], `${s.id}: ${s.location}`).toBeTruthy();
      for (const id of [s.npc, ...(s.npcs ?? [])]) expect(NPCS[id], `${s.id}: ${id}`).toBeTruthy();
    }
  });

  it("outdoors: the speaker stands in the town (layout.ts OUTDOOR_NPCS with the theme's)", () => {
    for (const s of SITUATIONS.filter((x) => !isCall(x.id) && LOCATIONS[x.location].kind === "outdoor")) {
      expect(OUTDOOR_NPCS.some((n) => n.npc === s.npc), `${s.id}: ${s.npc}`).toBe(true);
    }
  });

  it("s71b: Doña Chela fills the tank at the pump, by the learner's car, not in the shop", () => {
    expect(LOCATIONS["gas-station"].kind).toBe("outdoor");
    const chela = OUTDOOR_NPCS.find((n) => n.npc === "dot")!;
    expect(chela).toBeTruthy();
    expect(THEME.outdoorNpcs.map((n) => n.npc)).toContain("dot");
    // under the canopy (x 103…121, z 1…10), clear of the pumps (x 104, 110, 116 at z 5.5, 1.1 × 0.8)
    for (const p of [chela, { x: chela.ax!, z: chela.az! }]) {
      expect(p.x).toBeGreaterThan(103); expect(p.x).toBeLessThan(121);
      expect(p.z).toBeGreaterThan(1); expect(p.z).toBeLessThan(10);
      for (const px of [104, 110, 116]) expect(Math.abs(p.x - px) > 0.55 + 0.45 || Math.abs(p.z - 5.5) > 0.4 + 0.45, `${p.x},${p.z} on pump ${px}`).toBe(true);
    }
    // the car beside her: one of the parked cars, clear of her, of the player's spot and of the street's lanes
    const [cx, cz, rot] = THEME.spotCars[0];
    expect(PARKED_CARS).toContainEqual([cx, cz, rot]);
    const hx = (Math.abs(Math.sin(rot)) > 0.5 ? CAR.length : CAR.width) / 2 + 0.1, hz = (Math.abs(Math.sin(rot)) > 0.5 ? CAR.width : CAR.length) / 2 + 0.1;
    for (const p of [chela, { x: chela.ax!, z: chela.az! }]) expect(Math.abs(p.x - cx) > hx + 0.4 || Math.abs(p.z - cz) > hz + 0.4).toBe(true);
    for (const l of TRAFFIC_LANES) expect(Math.abs(cz - l.z)).toBeGreaterThan(hz + CAR.width / 2);
    // she faces the learner
    expect(Math.abs(Math.atan2(chela.ax! - chela.x, chela.az! - chela.z) - chela.rot)).toBeLessThan(0.2);
  });

  it("s65b: customs after the baggage desk with Agente Medina", () => {
    expect(SITUATION_BY_ID["s65b-baggage"].npcs).toContain("aduana");
    expect(NPCS.aduana.name).toBe("Agente Medina");
    expect(THEME.roomExtras.customs).toBe(true);
  });

  it("s73: La Cocina de Lucía is Yucatecan, in the trattoria's room", () => {
    expect(SITUATION_BY_ID["s73-restaurant"].location).toBe("trattoria");
    expect(LOCATIONS.trattoria.name).toBe("La Cocina de Lucía");
    expect(THEME.restaurant).toBe("yucateco");
  });

  it("the rooms' signs and boards are all in Spanish (no empty text)", () => {
    for (const [en, es] of Object.entries(THEME.signs)) expect(es.trim(), en).not.toBe("");
    for (const [en, rows] of Object.entries(THEME.boards)) {
      expect(rows.length, en).toBeGreaterThan(1);
      for (const r of rows.slice(1)) expect(r.includes("|"), `${en}: ${r}`).toBe(true);
    }
  });
});

describe("the tianguis on the zócalo (s91a; graphics round 1)", () => {
  // each stall's table and lona in the town's coordinates (mexican.ts tianguisStall: its front towards `rot`)
  const stalls = [...STALLS.map((s) => ({ x: s.x, z: s.z, rot: 0, goods: s.goods })), ...(THEME.tianguis?.stalls ?? [])];
  const rect = (s: { x: number; z: number; rot: number }, r: { x: number; z0: number; z1: number }) => {
    const c = Math.cos(s.rot), n = Math.sin(s.rot);
    const pts = [[-r.x, r.z0], [r.x, r.z0], [-r.x, r.z1], [r.x, r.z1]].map(([lx, lz]) => [s.x + lx * c + lz * n, s.z - lx * n + lz * c]);
    return { x0: Math.min(...pts.map((p) => p[0])), x1: Math.max(...pts.map((p) => p[0])), z0: Math.min(...pts.map((p) => p[1])), z1: Math.max(...pts.map((p) => p[1])) };
  };
  const gap = (b: { x0: number; x1: number; z0: number; z1: number }, x: number, z: number) => Math.hypot(Math.max(b.x0 - x, 0, x - b.x1), Math.max(b.z0 - z, 0, z - b.z1));

  it("has a lona, a sign and goods for every stall", () => {
    expect(THEME.tianguis).toBeTruthy();
    expect(THEME.tianguis!.lonas.length).toBeGreaterThanOrEqual(stalls.length);
    for (const s of stalls) expect(THEME.tianguis!.signs[s.goods]?.[0], s.goods).toBeTruthy();
  });

  it("stands on the square, clear of everyone's spot, the talk spots, the chatting pair, the pigeons and each other", () => {
    const tables = stalls.map((s) => rect(s, STALL_SIZE.table)), lonas = stalls.map((s) => rect(s, STALL_SIZE.lona));
    for (const [i, l] of lonas.entries()) {
      expect(l.x0 > SQUARE.x1 && l.x1 < SQUARE.x2 && l.z0 > SQUARE.z1 && l.z1 < SQUARE.z2, `stall ${i} on the square`).toBe(true);
      // the pigeons peck round the kiosco out to 9.5 m
      expect(gap(l, FOUNTAIN.x, FOUNTAIN.z), `stall ${i} and the kiosco's pigeons`).toBeGreaterThan(9.5);
      for (const [k, o] of lonas.entries()) if (k > i) expect(l.x1 < o.x0 || o.x1 < l.x0 || l.z1 < o.z0 || o.z1 < l.z0, `stalls ${i} and ${k}`).toBe(true);
    }
    for (const t of tables) {
      for (const n of OUTDOOR_NPCS) {
        expect(gap(t, n.x, n.z), `${n.npc} and a table`).toBeGreaterThan(0.4);
        if (n.ax !== undefined) expect(gap(t, n.ax, n.az!), `${n.npc}'s talk spot and a table`).toBeGreaterThan(0.6);
      }
      for (const [ax, az, bx, bz] of CHAT_SPOTS) for (const [x, z] of [[ax, az], [bx, bz]]) expect(gap(t, x, z)).toBeGreaterThan(1);
      if (THEME.foodCart) expect(gap(t, THEME.foodCart.x, THEME.foodCart.z)).toBeGreaterThan(2);
    }
  });
});

describe("the conversation header's place line", () => {
  it("shows the whole Spanish name when its meaning covers both halves", () => {
    expect(placeLtNamed("town-square")).toBe("The main square and its market stalls “Zócalo · Tianguis” – literally “main square · street market”");
    expect(placeLtNamed("bus-stop")).toBe("Bus stop “Parada · Calle Ceiba” – literally “stop · Ceiba Street”");
    expect(placeLtNamed("hotel")).toBe("The hotel “Hotel Mar Azul” – literally “Blue Sea Hotel”");
  });

  it("never puts double quotes inside double quotes", () => {
    for (const [id, m] of Object.entries(NAME_MEANING)) expect(/[“”]/.test(m), id).toBe(false);
  });
});
