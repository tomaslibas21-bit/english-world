// Puerto Colibrí's ruins, walked into (18 Nov 2026; src/game/world/mexican.ts RUINS, ruinsWalk): the plan holds
// together (the gateway has a cell of the way-finding grid to walk through, the stairs rise evenly to the landing, the
// people stand on the lawn with a way to each from the beach's end), and the people's chats are short and off the route.
import { describe, expect, it } from "vitest";
import { RUINS, ruinsBounds, ruinsStairY, ruinsWalk } from "@/game/world/mexican";
import { Colliders } from "@/game/world/util";
import { NavGrid } from "@/game/nav";
import { WORLD } from "@/game/world/layout";
import { FLOORS, floorY } from "@/game/water";
import { THEME } from "@/game/world/theme";
import { SITUATION_BY_ID } from "@/content/situations";
import { ROUTE } from "@/content/route";
import { NPCS } from "@/content/npcs";
import { LOCATIONS } from "@/content/locations";

const CHATS = ["x06-custodio", "x07-pintora", "x08-rosario"];
const R = THEME.ruins!;

/** The precinct's ground plan with the town's west edge as town.ts lays it (open at the gateway only). */
function plan() {
  FLOORS.length = 0;
  const col = new Colliders();
  ruinsWalk(col, R.x, R.z);
  const g0 = R.z + RUINS.gate - RUINS.gateHalf, g1 = R.z + RUINS.gate + RUINS.gateHalf;
  col.addBox(WORLD.minX - 1, (g0 - 110) / 2, 2, g0 + 110);
  col.addBox(WORLD.minX - 1, (g1 + 20) / 2, 2, 20 - g1);
  return { col, nav: new NavGrid(WORLD.minX - 50, WORLD.minZ, WORLD.maxX, WORLD.maxZ, 1, col) };
}

describe("the ruins' plan", () => {
  it("is switched on, with the cenote's opening of the town's west edge", () => {
    expect(R.walk).toBe(true);
    expect(THEME.cenote?.walk).toBe(true);
  });

  it("the stairs rise evenly from the lawn to the landing", () => {
    const S = RUINS.stairs;
    expect(ruinsStairY(S.foot)).toBe(0);
    expect(ruinsStairY(S.top)).toBeCloseTo(S.rise, 6);
    expect(ruinsStairY(S.foot + 2)).toBe(0);
    expect(ruinsStairY(S.top - 2)).toBe(S.rise);
    let last = -1;
    for (let dz = S.foot; dz >= S.top; dz -= 0.1) { const y = ruinsStairY(dz); expect(y).toBeGreaterThanOrEqual(last); expect(y - Math.max(0, last)).toBeLessThan(0.12); last = y; }
    plan();
    // (the floors the town lists: the stairs' middle and the landing, as high as they are built)
    expect(floorY(R.x, R.z + (S.foot + S.top) / 2)).toBeCloseTo(S.rise / 2, 2);
    expect(floorY(R.x + RUINS.landing.half - 0.3, R.z + (RUINS.landing.back + S.top) / 2)).toBe(S.rise);
    expect(floorY(R.x + 5, R.z + 10)).toBe(0);
  });

  it("from the beach's end there is a way in through the gateway to each of the people, to the foot of the stairs and up to the landing", () => {
    const { nav } = plan();
    const from: [number, number] = [WORLD.minX + 5, R.z + RUINS.gate];
    const people = THEME.outdoorNpcs.filter((n) => ["custodio", "pintora", "rosario"].includes(n.npc));
    expect(people.map((p) => p.npc).sort()).toEqual(["custodio", "pintora", "rosario"]);
    const b = ruinsBounds(R.x, R.z, WORLD.minX);
    for (const p of people) {
      // on the lawn, the place to stand and talk a step or two before them, in the direction they face
      expect(p.x > R.x + RUINS.w && p.x < R.x + RUINS.e && p.z > R.z + RUINS.n && p.z < R.z + RUINS.s, p.npc).toBe(true);
      expect(Math.hypot(p.ax! - p.x, p.az! - p.z), p.npc).toBeGreaterThan(1.4);
      expect(Math.hypot(p.ax! - p.x, p.az! - p.z), p.npc).toBeLessThan(2.2);
      expect(Math.hypot(Math.sin(p.rot) - (p.ax! - p.x) / 1.8, Math.cos(p.rot) - (p.az! - p.z) / 1.8), p.npc + " faces the spot").toBeLessThan(0.1);
      const path = nav.path(from[0], from[1], p.ax!, p.az!);
      expect(path, p.npc + ": a way").not.toBeNull();
      expect(path!.every(([x, z]) => x > b.minX && x < b.maxX + 6 && z > b.minZ && z < b.maxZ), p.npc + ": inside the walls all the way").toBe(true);
    }
    expect(nav.path(from[0], from[1], R.x, R.z + RUINS.stairs.foot + 1)).not.toBeNull();
    expect(nav.path(from[0], from[1], R.x, R.z + RUINS.stairs.top + 0.04)).not.toBeNull();
  });

  it("there is no other way out: every wall is an edge, and the walls close round the lawn", () => {
    const { col } = plan();
    // (with the gateway shut, nothing beyond the walls is reached from the lawn: not the selva, the sea or the town)
    col.addBox(R.x + RUINS.e + 0.7, R.z + RUINS.gate, 1.4, RUINS.gateHalf * 2);
    const nav = new NavGrid(WORLD.minX - 50, WORLD.minZ, WORLD.maxX, WORLD.maxZ, 1, col);
    expect(nav.path(R.x, R.z + 9, R.x - 6, R.z + 12), "the lawn itself").not.toBeNull();
    for (const [x, z] of [[R.x + RUINS.w - 4, R.z + 10], [R.x, R.z + RUINS.s + 4], [R.x - 6, R.z - 6], [R.x + 6, R.z - 9], [WORLD.minX + 5, R.z + RUINS.gate]]) expect(nav.path(R.x, R.z + 9, x, z), `${x},${z}`).toBeNull();
    const edges = col.boxes.filter((bx) => bx.tag === "edge");
    expect(edges.length).toBeGreaterThanOrEqual(10);
    // (what one jumps onto is not an edge: the platform, the bench)
    expect(col.boxes.some((bx) => !bx.tag && Math.abs((bx.minX + bx.maxX) / 2 - (R.x + RUINS.platform.x)) < 0.01)).toBe(true);
  });
});

describe("the people of the ruins", () => {
  it("each has a short chat off the route, at the ruins", () => {
    expect(LOCATIONS.ruinas.kind).toBe("outdoor");
    for (const id of CHATS) {
      const s = SITUATION_BY_ID[id];
      expect(s, id).toBeTruthy();
      expect(s.bonus, id).toBe(true);
      expect(ROUTE.some((r) => r.id === id), id).toBe(false);
      expect(s.location, id).toBe("ruinas");
      expect(NPCS[s.npc], id).toBeTruthy();
      expect(THEME.outdoorNpcs.some((n) => n.npc === s.npc), id).toBe(true);
      // short: two things to do, a handful of lines of theirs, a few of the learner's
      expect(s.steps.length, id).toBe(2);
      expect(Object.keys(s.lines).length, id).toBeLessThanOrEqual(20);
      expect(Object.values(s.hints ?? {}).flatMap((g) => g.items).length, id).toBeLessThanOrEqual(10);
    }
  });

  it("the keeper and the weaver say usted, the young painter tú", () => {
    expect(NPCS.custodio.informal).toBeFalsy();
    expect(NPCS.rosario.informal).toBeFalsy();
    expect(NPCS.pintora.informal).toBe(true);
    expect(NPCS.pintora.gender).toBe("f");
    expect(NPCS.rosario.gender).toBe("f");
    expect(NPCS.custodio.gender).toBe("m");
  });
});
