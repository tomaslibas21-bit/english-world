// Puerto Colibrí's conversations have their places (docs/es/TOWN.md "Every conversation's spot"): the checks that need
// no browser. The rooms themselves are drawn on a canvas, so the tour (tools/es-tour.mjs) walks to every spot in Chromium.
// Runs in the vitest project "es" (vite.config.ts), where src/editions/es/ replaces the base files.
import { describe, expect, it } from "vitest";
import { SITUATIONS, SITUATION_BY_ID } from "../../src/content/situations";
import { LOCATIONS, NAME_MEANING, placeLtNamed } from "../../src/content/locations";
import { NPCS } from "../../src/content/npcs";
import { BUILDINGS, CAR, CHAT_SPOTS, FOUNTAIN, OUTDOOR_NPCS, PARK, PARKED_CARS, ROADS, SIDEWALK, SQUARE, STALLS, TRAFFIC_LANES, WORLD } from "../../src/game/world/layout";
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

describe("graphics round 2: the zócalo dressed, its people, the letters, the coaches", () => {
  const stalls = [...STALLS.map((s) => ({ x: s.x, z: s.z, rot: 0 })), ...(THEME.tianguis?.stalls ?? [])];
  const rect = (s: { x: number; z: number; rot: number }, r: { x: number; z0: number; z1: number }) => {
    const c = Math.cos(s.rot), n = Math.sin(s.rot);
    const pts = [[-r.x, r.z0], [r.x, r.z0], [-r.x, r.z1], [r.x, r.z1]].map(([lx, lz]) => [s.x + lx * c + lz * n, s.z - lx * n + lz * c]);
    return { x0: Math.min(...pts.map((p) => p[0])), x1: Math.max(...pts.map((p) => p[0])), z0: Math.min(...pts.map((p) => p[1])), z1: Math.max(...pts.map((p) => p[1])) };
  };
  const gap = (b: { x0: number; x1: number; z0: number; z1: number }, x: number, z: number) => Math.hypot(Math.max(b.x0 - x, 0, x - b.x1), Math.max(b.z0 - z, 0, z - b.z1));
  const tables = stalls.map((s) => rect(s, STALL_SIZE.table)), lonas = stalls.map((s) => rect(s, STALL_SIZE.lona));
  const people: [string, number, number][] = [
    ...OUTDOOR_NPCS.map((n) => [n.npc, n.x, n.z] as [string, number, number]),
    ...OUTDOOR_NPCS.filter((n) => n.ax !== undefined).map((n) => [n.npc + "'s talk spot", n.ax!, n.az!] as [string, number, number]),
    ...CHAT_SPOTS.flatMap(([ax, az, bx, bz]) => [["a chatting pair", ax, az], ["a chatting pair", bx, bz]] as [string, number, number][]),
  ];
  const z = THEME.zocalo!;

  it("the laureles, bancas and lamps stand on the square, clear of everyone, the stalls and the pigeons' ring", () => {
    expect(z).toBeTruthy();
    // (a banca's footprint: town.ts's collider for it; a laurel's trunk and a lamp post: their colliders' radius)
    const bancas = z.bancas.map(([x, bz, rot]) => ({ x0: x - (Math.abs(Math.cos(rot)) * 1.9 + 0.3) / 2, x1: x + (Math.abs(Math.cos(rot)) * 1.9 + 0.3) / 2, z0: bz - (Math.abs(Math.sin(rot)) * 1.9 + 0.3) / 2, z1: bz + (Math.abs(Math.sin(rot)) * 1.9 + 0.3) / 2 }));
    const posts: [string, number, number, number][] = [...z.laureles.map(([x, y]) => ["a laurel", x, y, 0.65] as [string, number, number, number]), ...z.lamps.map(([x, y]) => ["a lamp", x, y, 0.24] as [string, number, number, number])];
    for (const b of bancas) {
      expect(b.x0 > SQUARE.x1 && b.x1 < SQUARE.x2 && b.z0 > SQUARE.z1 && b.z1 < SQUARE.z2).toBe(true);
      for (const [who, x, y] of people) expect(gap(b, x, y), `a banca and ${who}`).toBeGreaterThan(0.8);
      for (const l of lonas) expect(b.x1 < l.x0 || l.x1 < b.x0 || b.z1 < l.z0 || l.z1 < b.z0).toBe(true);
    }
    for (const [what, x, y, r] of posts) {
      expect(x > SQUARE.x1 && x < SQUARE.x2 && y > SQUARE.z1 && y < SQUARE.z2, what).toBe(true);
      expect(Math.hypot(x - FOUNTAIN.x, y - FOUNTAIN.z), `${what} and the pigeons' ring`).toBeGreaterThan(9.5 + r);
      for (const [who, px, pz] of people) expect(Math.hypot(x - px, y - pz), `${what} at ${x},${y} and ${who}`).toBeGreaterThan(r + 1.2);
      for (const l of lonas) expect(gap(l, x, y), `${what} and a stall`).toBeGreaterThan(r + 0.4);
      for (const b of bancas) expect(gap(b, x, y), `${what} and a banca`).toBeGreaterThan(r + 0.3);
      if (THEME.foodCart) expect(Math.hypot(x - THEME.foodCart.x, y - THEME.foodCart.z)).toBeGreaterThan(r + 1.5);
    }
  });

  it("each vendor stands behind a stall's table, facing the customers, clear of the other tables and everyone", () => {
    for (const [x, y, rot] of THEME.vendors) {
      const i = stalls.findIndex((s) => Math.hypot(s.x - x, s.z - y) < 1.6 && Math.abs(s.rot - rot) < 1e-6);
      expect(i, `a stall for the vendor at ${x},${y}`).toBeGreaterThanOrEqual(0);
      const s = stalls[i], back = -(Math.sin(s.rot) * (x - s.x) + Math.cos(s.rot) * (y - s.z));
      expect(back, "behind the table").toBeGreaterThan(-STALL_SIZE.table.z0);
      expect(back, "under the lona").toBeLessThan(-STALL_SIZE.lona.z0);
      for (const [k, t] of tables.entries()) if (k !== i) expect(gap(t, x, y)).toBeGreaterThan(0.6);
      for (const [who, px, pz] of people) expect(Math.hypot(x - px, y - pz), `a vendor and ${who}`).toBeGreaterThan(1.2);
    }
  });

  it("the new chatting pairs, the sitters' seats and the letters keep clear of each other and of everyone", () => {
    const L = THEME.letras!;
    expect(L).toBeTruthy();
    // the letters' plinth: about 0.86 m a letter and its gap, along x from L.x, 0.9 deep
    const len = [...L.text].reduce((a, ch) => a + (ch === " " ? 0.43 : ch === "I" || ch === "Í" ? 0.6 : 0.89), 0) * (L.h / 1.45);
    const plinth = { x0: L.x - 0.3, x1: L.x + len + 0.3, z0: L.z - 0.45, z1: L.z + 0.45 };
    for (const [who, x, y] of people) expect(gap(plinth, x, y), `the letters and ${who}`).toBeGreaterThan(0.8);
    for (const [x, y] of THEME.sitters) expect(gap(plinth, x, y), "the letters and a sitter's seat").toBeGreaterThan(0.8);
    for (const [ax, az, bx, bz] of THEME.chatSpots) {
      expect(Math.hypot(ax - bx, az - bz), "face to face").toBeLessThan(1.6);
      for (const [who, x, y] of people) if (Math.hypot(ax - x, az - y) > 0.01 && Math.hypot(bx - x, bz - y) > 0.01) expect(Math.min(Math.hypot(ax - x, az - y), Math.hypot(bx - x, bz - y)), `a new pair and ${who}`).toBeGreaterThan(2);
    }
  });

  it("the coaches at the bus terminal keep clear of the passing cars' lane", () => {
    const bt = THEME.busTerminal!;
    expect(bt.buses.length).toBeGreaterThan(0);
    const oak = TRAFFIC_LANES.filter((l) => Math.abs(l.z - 38) < 3);
    for (const bus of bt.buses) for (const l of oak) {
      // a coach 2.5 m wide at the curb (z 42.5 - 1.08), the cars 1.9 m wide in their lane
      expect(Math.abs(42.5 - 1.08 - l.z), `the coach at x ${bus.x} and the lane at z ${l.z}`).toBeGreaterThanOrEqual(1.25 + CAR.width / 2 - 0.001);
    }
  });
});

describe("graphics round 3: the town's new things keep clear of everyone", () => {
  const people: [string, number, number][] = [
    ...OUTDOOR_NPCS.map((n) => [n.npc, n.x, n.z] as [string, number, number]),
    ...OUTDOOR_NPCS.filter((n) => n.ax !== undefined).map((n) => [n.npc + "'s talk spot", n.ax!, n.az!] as [string, number, number]),
    ...CHAT_SPOTS.flatMap(([ax, az, bx, bz]) => [["a chatting pair", ax, az], ["a chatting pair", bx, bz]] as [string, number, number][]),
    ...THEME.sitters.map(([x, z]) => ["a sitter", x, z] as [string, number, number]),
    ...THEME.vendors.map(([x, z]) => ["a vendor", x, z] as [string, number, number]),
  ];
  // each new thing's footprint (x0, x1, z0, z1), from mexican.ts's colliders for it
  const box = (x: number, z: number, hx: number, hz: number) => ({ x0: x - hx, x1: x + hx, z0: z - hz, z1: z + hz });
  const turned = (x: number, z: number, rot: number, a: number, b: number) => (Math.abs(Math.sin(rot)) > 0.5 ? box(x, z, b, a) : box(x, z, a, b));
  const gap = (b: { x0: number; x1: number; z0: number; z1: number }, x: number, z: number) => Math.hypot(Math.max(b.x0 - x, 0, x - b.x1), Math.max(b.z0 - z, 0, z - b.z1));
  const sw = THEME.sidewalks!, things: [string, { x0: number; x1: number; z0: number; z1: number }][] = [
    ...sw.macetas.flatMap(([x, z, h]) => [["a maceta", box(x - h, z, 0.35, 0.35)], ["a maceta", box(x + h, z, 0.35, 0.35)]] as [string, ReturnType<typeof box>][]),
    ["the fruit cart", turned(sw.fruitCart![0], sw.fruitCart![1], sw.fruitCart![2], 0.75, 1.1)],
    ["the water trike", turned(sw.trike![0], sw.trike![1], sw.trike![2], 0.6, 1.1)],
    ...THEME.terrace.map(([x0, x1, z0, z1]) => ["El Muelle's terrace", { x0, x1, z0, z1 }] as [string, ReturnType<typeof box>]),
    ["the coconut cart", turned(THEME.beach!.cocos![0], THEME.beach!.cocos![1], THEME.beach!.cocos![2], 0.8, 0.7)],
    ["the atrial cross", box(THEME.atrialCross![0], THEME.atrialCross![1], 0.8, 0.8)],
    ["the mirador", turned(THEME.mirador!.x, THEME.mirador!.z, THEME.mirador!.rot, 2.0, 1.5)],
    ...THEME.cables!.poles.map(([x, z]) => ["a pole", box(x, z, 0.18, 0.18)] as [string, ReturnType<typeof box>]),
    ...THEME.taxis.map(([x, z, rot]) => ["a taxi", turned(x, z, rot, CAR.width / 2 + 0.1, CAR.length / 2 + 0.1)] as [string, ReturnType<typeof box>]),
    // (graphics round 5) the centro's bins, bolardos and the bolero's stand
    ...THEME.adoquin!.bins.map(([x, z]) => ["a bin", box(x, z, 0.3, 0.3)] as [string, ReturnType<typeof box>]),
    ...THEME.adoquin!.bolardos.map(([x0, z0, x1, z1]) => ["bolardos", { x0: Math.min(x0, x1) - 0.15, x1: Math.max(x0, x1) + 0.15, z0: Math.min(z0, z1) - 0.15, z1: Math.max(z0, z1) + 0.15 }] as [string, ReturnType<typeof box>]),
    ["the bolero's stand", turned(THEME.adoquin!.bolero![0], THEME.adoquin!.bolero![1], THEME.adoquin!.bolero![2], 0.5, 0.95)],
  ];

  it("everyone's spot, talk spot, chatting pair, sitter and vendor stays at least 1 m from them", () => {
    for (const [what, b] of things) for (const [who, x, z] of people) expect(gap(b, x, z), `${what} and ${who}`).toBeGreaterThan(1);
  });

  it("they keep off each other and out of the cars' lanes", () => {
    for (const [i, [a, p]] of things.entries()) for (const [k, [b, q]] of things.entries()) if (k > i && !(a === "a maceta" && b === "a maceta"))
      expect(p.x1 < q.x0 || q.x1 < p.x0 || p.z1 < q.z0 || q.z1 < p.z0, `${a} and ${b}`).toBe(true);
    for (const [what, b] of things) for (const l of TRAFFIC_LANES) if (b.x1 > l.from && b.x0 < l.to)
      expect(b.z1 < l.z - CAR.width / 2 - 0.2 || b.z0 > l.z + CAR.width / 2 + 0.2, `${what} and the lane at z ${l.z}`).toBe(true);
  });

  it("the overhead lines' poles stand on calle Hidalgo's north sidewalk, clear of its corners", () => {
    for (const [x, z] of THEME.cables!.poles) {
      expect(z > 33.5 - 3.2 && z < 33.5, `the pole at ${x}`).toBe(true);
      for (const cx of [-70, 0, 70]) expect(Math.abs(x - cx), `the pole at ${x} and the corner at ${cx}`).toBeGreaterThan(6);
    }
    for (const [i] of THEME.cables!.drops) expect(i).toBeLessThan(THEME.cables!.poles.length);
  });
});

describe("graphics round 4: the town's new things keep clear of everyone", () => {
  const people: [string, number, number][] = [
    ...OUTDOOR_NPCS.map((n) => [n.npc, n.x, n.z] as [string, number, number]),
    ...OUTDOOR_NPCS.filter((n) => n.ax !== undefined).map((n) => [n.npc + "'s talk spot", n.ax!, n.az!] as [string, number, number]),
    ...CHAT_SPOTS.flatMap(([ax, az, bx, bz]) => [["a chatting pair", ax, az], ["a chatting pair", bx, bz]] as [string, number, number][]),
    ...THEME.vendors.map(([x, z]) => ["a vendor", x, z] as [string, number, number]),
  ];
  const gap = (b: { x0: number; x1: number; z0: number; z1: number }, x: number, z: number) => Math.hypot(Math.max(b.x0 - x, 0, x - b.x1), Math.max(b.z0 - z, 0, z - b.z1));
  const stalls = [...STALLS.map((s) => ({ x: s.x, z: s.z, rot: 0 })), ...(THEME.tianguis?.stalls ?? [])];

  it("the church's atrium wall stands clear of everyone, the stalls and the atrial cross, the cross inside it", () => {
    const a = THEME.atrio!, c = THEME.church!;
    expect(a && c && c.face === "w").toBeTruthy();
    // (facing west: out from the facade is -x, the atrium's left side towards -z)
    const front = c.x - a.depth, walls = [
      { x0: front, x1: front + 0.34, z0: c.z - a.left, z1: c.z + a.right },
      { x0: front, x1: c.x, z0: c.z - a.left, z1: c.z - a.left + 0.34 },
      { x0: front, x1: c.x, z0: c.z + a.right - 0.34, z1: c.z + a.right },
    ];
    for (const w of walls) {
      for (const [who, x, z] of people) expect(gap(w, x, z), `the atrium wall and ${who}`).toBeGreaterThan(1);
      for (const s of stalls) {
        const t = { x0: s.x - (Math.abs(Math.cos(s.rot)) * 2.1 + Math.abs(Math.sin(s.rot)) * 0.9), x1: s.x + (Math.abs(Math.cos(s.rot)) * 2.1 + Math.abs(Math.sin(s.rot)) * 0.9),
          z0: s.z - (Math.abs(Math.sin(s.rot)) * 2.1 + Math.abs(Math.cos(s.rot)) * 0.9), z1: s.z + (Math.abs(Math.sin(s.rot)) * 2.1 + Math.abs(Math.cos(s.rot)) * 0.9) };
        expect(w.x1 < t.x0 || t.x1 < w.x0 || w.z1 < t.z0 || t.z1 < w.z0, `the atrium wall and the stall at ${s.x},${s.z}`).toBe(true);
      }
      const [cx, cz] = THEME.atrialCross!;
      expect(gap(w, cx, cz), "the atrium wall and the cross's base").toBeGreaterThan(0.75 + 0.2);
    }
    const [cx, cz] = THEME.atrialCross!;
    expect(cx > front + 0.34 + 0.75 && cx < c.x && cz > c.z - a.left + 0.34 + 0.75 && cz < c.z + a.right, "the cross inside the atrium").toBe(true);
    // the gate before the door, wide enough to walk through
    expect(a.gate * 2).toBeGreaterThan(2.5);
  });

  it("the beach's sitters sit on a palapa's lounger, the terminal's on a bench, each traveller's suitcase by them", () => {
    const loungers = THEME.palapas.flatMap(([x, z]) => [[x - 0.95, z - 1.1], [x + 0.95, z - 1.1]]);
    const beach = THEME.sitters.filter(([, z]) => z < -69);
    expect(beach.length).toBeGreaterThan(0);
    for (const [x, z] of beach) expect(loungers.some(([lx, lz]) => Math.hypot(lx - x, lz - z) < 0.05), `a lounger at ${x},${z}`).toBe(true);
    const bt = THEME.busTerminal!.front!;
    for (const [x, z] of bt.cases) {
      for (const [who, px, pz] of people) expect(Math.hypot(x - px, z - pz), `a suitcase and ${who}`).toBeGreaterThan(1);
      for (const [sx, sz] of THEME.sitters) expect(Math.hypot(x - sx, z - sz), "a suitcase and a sitter's knees").toBeGreaterThan(0.6);
    }
  });

  it("the meadow's scrub keeps off the cenote, the mirador and the end of avenida Juárez", () => {
    const m = THEME.meadow!, cen = THEME.cenote!, mi = THEME.mirador!;
    expect(m.clear.some(([x, z, r]) => Math.hypot(x - cen.x, z - cen.z) < 1 && r >= 12)).toBe(true);
    expect(m.clear.some(([x, z, r]) => Math.hypot(x - mi.x, z - mi.z) < 1 && r >= 4)).toBe(true);
  });
});

describe("world-v2: street palms, ceibas and people on the meadows", () => {
  const juarez = ROADS.find((r) => r.name === "Main Street")!;
  const atCurb = (z: number) => { const off = Math.abs(z - juarez.z1) - juarez.w / 2; return off > 0.4 && off < 1.2; };
  // (the airport's stretch of the avenue had its palms before, further from the curb)
  const street = THEME.palms.filter(([x, z]) => atCurb(z) && x < 100);
  const pairs = THEME.chatSpots.slice(-4);
  const people: [string, number, number][] = [
    ...OUTDOOR_NPCS.map((n) => [n.npc, n.x, n.z] as [string, number, number]),
    ...OUTDOOR_NPCS.filter((n) => n.ax !== undefined).map((n) => [n.npc + "'s talk spot", n.ax!, n.az!] as [string, number, number]),
    ...CHAT_SPOTS.flatMap(([ax, az, bx, bz]) => [["a chatting pair", ax, az], ["a chatting pair", bx, bz]] as [string, number, number][]),
    ...THEME.sitters.map(([x, z]) => ["a sitter", x, z] as [string, number, number]),
    ...THEME.vendors.map(([x, z]) => ["a vendor", x, z] as [string, number, number]),
  ];
  const onRoad = (x: number, z: number, pad: number) => ROADS.some((r) => (r.z1 === r.z2
    ? x > r.x1 && x < r.x2 && Math.abs(z - r.z1) < r.w / 2 + pad : z > r.z1 && z < r.z2 && Math.abs(x - r.x1) < r.w / 2 + pad));

  it("the street palms line both sides of avenida Juárez at the curb, clear of the corners and never before a door", () => {
    expect(street.length).toBeGreaterThanOrEqual(12);
    for (const side of [-1, 1]) expect(street.filter(([, z]) => Math.sign(z - juarez.z1) === side).length).toBeGreaterThanOrEqual(5);
    for (const [x, z] of street) {
      for (const r of ROADS.filter((q) => q.x1 === q.x2)) expect(Math.abs(x - r.x1), `the palm at ${x} and the corner of ${r.name}`).toBeGreaterThan(r.w / 2 + SIDEWALK);
      // the doors that open onto the avenue, each in the middle of its front, on the palm's side of the street
      const fronts = BUILDINGS.filter((b) => b.loc && (z < juarez.z1 ? b.face === "s" && b.z + b.d / 2 > -20 && b.z < juarez.z1 : b.face === "n" && b.z - b.d / 2 < 2 && b.z > juarez.z1));
      expect(fronts.length).toBeGreaterThan(3);
      for (const b of fronts) expect(Math.abs(x - b.x), `the palm at ${x} and ${b.id}'s door`).toBeGreaterThan(3);
    }
  });

  it("every palm and both ceibas keep clear of everyone, the stalls and the cars' lanes", () => {
    const trees: [string, number, number, number][] = [...THEME.palms.map(([x, z]) => ["a palm", x, z, 0.4] as [string, number, number, number]), ...THEME.ceibas.map(([x, z, sc]) => ["a ceiba", x, z, 0.95 * sc] as [string, number, number, number])];
    for (const [what, x, z, r] of trees) {
      for (const [who, px, pz] of people) expect(Math.hypot(px - x, pz - z), `${what} at ${x}, ${z} and ${who}`).toBeGreaterThan(r + 1);
      for (const st of STALLS) expect(Math.abs(st.x - x) > STALL_SIZE.lona.x + r + 0.3 || Math.abs(st.z - z) > STALL_SIZE.lona.z1 + r + 0.3, `${what} at ${x}, ${z} and a stall`).toBe(true);
      for (const l of TRAFFIC_LANES) if (x > l.from && x < l.to) expect(Math.abs(z - l.z), `${what} at ${x}, ${z} and the lane at z ${l.z}`).toBeGreaterThan(CAR.width / 2 + r + 0.2);
    }
  });

  it("the ceibas stand on grass: one in the park, one on the lawn at the west end of the avenue, off every street and sidewalk", () => {
    expect(THEME.ceibas.length).toBe(2);
    for (const [x, z, sc] of THEME.ceibas) {
      expect(onRoad(x, z, SIDEWALK + 0.95 * sc), `the ceiba at ${x}, ${z}`).toBe(false);
      expect(x > WORLD.minX + 2 && x < WORLD.maxX - 2, `the ceiba at ${x}`).toBe(true);
      for (const b of BUILDINGS) expect(Math.abs(x - b.x) > b.w / 2 + 2 || Math.abs(z - b.z) > b.d / 2 + 2, `the ceiba at ${x}, ${z} and ${b.id}`).toBe(true);
    }
    expect(THEME.ceibas.some(([x, z]) => x > PARK.x1 && x < PARK.x2 && z > PARK.z1 && z < PARK.z2)).toBe(true);
  });

  it("the pairs on the meadows stand off the streets, a step apart, facing each other, clear of everyone else", () => {
    expect(pairs.length).toBe(4);
    for (const [ax, az, bx, bz] of pairs) {
      const d = Math.hypot(ax - bx, az - bz);
      expect(d > 0.8 && d < 1.5, `the pair at ${ax}, ${az}`).toBe(true);
      for (const [x, z] of [[ax, az], [bx, bz]]) {
        expect(onRoad(x, z, SIDEWALK), `the pair at ${x}, ${z}`).toBe(false);
        for (const [who, px, pz] of people) if (!(px === ax && pz === az) && !(px === bx && pz === bz)) expect(Math.hypot(px - x, pz - z), `the pair at ${x}, ${z} and ${who}`).toBeGreaterThan(1.5);
        for (const [tx, tz] of [...THEME.palms, ...THEME.ceibas]) expect(Math.hypot(tx - x, tz - z), `the pair at ${x}, ${z} and a tree`).toBeGreaterThan(1.5);
      }
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
