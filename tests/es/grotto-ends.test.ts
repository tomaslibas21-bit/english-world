import { describe, expect, it } from "vitest";
import * as P from "@/game/cave/plan";
import { groundsWalk } from "@/game/cave/grounds";
import { groundsBounds, preferredCaveEntry, trail, ways } from "@/game/cave/groundsPlan";
import { caveGateGrid, caveGateTarget, caveQuestTarget, firstClosedGate } from "@/game/cave/routing";
import { NavGrid } from "@/game/nav";
import { Colliders } from "@/game/world/util";
import { WORLD } from "@/game/world/layout";
import { THEME } from "@/game/world/theme";
import { caveBounds, groundBounds, mapPoint, mapWindow, townBounds, townMapBounds } from "@/ui/worldMap";
import { FLOORS, POOLS } from "@/game/water";

const fresh = P.emptyCave();
const [kin, nikte] = P.ALUXES;
const cleft = P.EXITS[1];
const juarez = { x: -101, z: -7.4 };
const cenote = THEME.cenote!;
const [mouth, grieta, ojo] = ways(cenote.x, cenote.z);
const toChamber = (n: number): P.CaveSave => ({
  passed: ["kin"],
  lit: P.CHAMBERS.slice(0, n).flatMap((c) => c.stones.map((s) => s.id)),
});

describe("grotto maps", () => {
  it("extends only the side that needs room, then projects the old town and the grounds into one image", () => {
    const grounds = groundsBounds(cenote.x, cenote.z, WORLD.minX);
    expect(townMapBounds(groundBounds)).toBe(groundBounds);
    expect(townBounds).toEqual({ ...groundBounds, minX: grounds.minX });
    expect(mapPoint(townBounds, townBounds.minX, townBounds.minZ)).toEqual([0, 0]);
    expect(mapPoint(townBounds, townBounds.maxX, townBounds.maxZ)).toEqual([1, 1]);
    for (const [x, z] of [...trail(cenote.x, cenote.z), ...[mouth, grieta, ojo].map(({ x, z }) => [x, z])]) {
      expect(mapPoint(townBounds, x, z).every((v) => v > 0 && v < 1)).toBe(true);
    }
    expect(mapPoint(mapWindow(grieta.x, grieta.z, 90), grieta.x, grieta.z)).toEqual([0.5, 0.5]);
  });

  it("fits all five chambers, both exits and their gates inside the round minimap", () => {
    for (const { x, z } of [...P.CHAMBERS, ...P.GATES, ...P.EXITS, P.CHAMBERS[4].stones[2]]) {
      const [u, v] = mapPoint(caveBounds, x, z);
      expect(Math.hypot(u - 0.5, v - 0.5)).toBeLessThan(0.48);
    }
  });
});

describe("grotto guidance", () => {
  it("can walk from avenida Juárez to a point on dry ground within reach of La Grieta", () => {
    expect(preferredCaveEntry()).toEqual(grieta);
    const col = new Colliders();
    const floors = FLOORS.length, pools = POOLS.length;
    try {
      groundsWalk(col, cenote.x, cenote.z, WORLD.minX, THEME.meadow?.ceibas);
      const nav = new NavGrid(WORLD.minX - 50, WORLD.minZ, WORLD.maxX, WORLD.maxZ, 1, col);
      const { x, z } = grieta.out;
      expect(nav.free(nav.idx(x, z))).toBe(true);
      expect(Math.hypot(x - grieta.x, z - grieta.z)).toBeLessThan(grieta.reach);
      const path = nav.path(juarez.x, juarez.z, x, z);
      expect(path?.at(-1)).toEqual([x, z]);
    } finally {
      FLOORS.length = floors;
      POOLS.length = pools;
    }
  });

  it("points to the first prerequisite on the way in and to the near side of a closed gate on the way out", () => {
    const onEntry = P.SPAWNS.grieta;
    const toNikte = { x: nikte.ax, z: nikte.az };
    expect(caveGateTarget(onEntry, toNikte, fresh)?.id).toBe("alux_kin");
    expect(caveGateTarget(onEntry, toNikte, toChamber(0))?.id).toMatch(/^agua-/);
    expect(caveGateTarget(onEntry, toNikte, toChamber(1))?.id).toMatch(/^raices-/);
    expect(caveGateTarget(onEntry, toNikte, toChamber(2))).toBeNull();
    expect(caveGateTarget(toNikte, cleft, fresh)).toMatchObject({ kind: "point", id: "g3" });
    expect(caveGateTarget(toNikte, cleft, toChamber(2))).toBeNull();
  });

  it("guides the quest to Kin, an unlit stone, then across its chamber gate", () => {
    expect(caveQuestTarget(P.SPAWNS.grieta, fresh)).toMatchObject({ kind: "npc", id: kin.npc, x: kin.ax, z: kin.az });
    const here = { x: -7, z: -24 };
    expect(caveQuestTarget(here, { passed: ["kin"], lit: ["agua-1"] })).toMatchObject({ kind: "glyph", id: "agua-2" });
    const open = toChamber(1);
    const next = caveQuestTarget(here, open)!;
    expect(next).toMatchObject({ kind: "point", id: "g2" });
    expect(P.chamberAt(next.x, next.z)).toBe(1);
    expect(firstClosedGate(here, next, open)).toBeUndefined();
    const allLit = toChamber(5);
    expect(caveQuestTarget(here, { ...allLit, heart: true, tree: true }, false, (id) => id === "agua-3")?.id).toBe("agua-3");
  });

  it("keeps each closed gate out of A* in both directions and restores the path on opening", () => {
    const b = P.BOUNDS;
    const nav = new NavGrid(b.minX, b.minZ, b.maxX, b.maxZ, 0.5, new Colliders(), 0.35);
    for (let i = 0; i < nav.blocked.length; i++) {
      const [x, z] = nav.center(i);
      if (!P.walkable(x, z, 0.4)) nav.blocked[i] = 1;
    }
    const sync = caveGateGrid(nav);
    for (const gate of P.GATES) {
      const dx = Math.sin(gate.rot) * 2.75, dz = Math.cos(gate.rot) * 2.75;
      const before = [gate.x + dx, gate.z + dz] as const, after = [gate.x - dx, gate.z - dz] as const;
      sync({
        passed: P.ALUXES.map((a) => a.gate).filter((id) => id !== gate.alux),
        lit: P.CHAMBERS.flatMap((c, i) => i === gate.stones ? [] : c.stones.map((s) => s.id)),
      }, false);
      expect(nav.path(...before, ...after), gate.id).toBeNull();
      expect(nav.path(...after, ...before), gate.id).toBeNull();
      sync(fresh, true);
      expect(nav.path(...before, ...after), gate.id).not.toBeNull();
    }
  });
});
