// Puerto Colibrí's conversations have their places (docs/es/TOWN.md "Every conversation's spot"): the checks that need
// no browser. The rooms themselves are drawn on a canvas, so the tour (tools/es-tour.mjs) walks to every spot in Chromium.
// Runs in the vitest project "es" (vite.config.ts), where src/editions/es/ replaces the base files.
import { describe, expect, it } from "vitest";
import { SITUATIONS, SITUATION_BY_ID } from "../../src/content/situations";
import { LOCATIONS } from "../../src/content/locations";
import { NPCS } from "../../src/content/npcs";
import { CAR, OUTDOOR_NPCS, PARKED_CARS, TRAFFIC_LANES } from "../../src/game/world/layout";
import { THEME } from "../../src/game/world/theme";

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
    const [cx, cz, rot] = THEME.parkedCars[0];
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
