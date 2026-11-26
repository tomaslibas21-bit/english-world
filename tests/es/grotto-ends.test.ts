import { describe, expect, it } from "vitest";
import { Mesh, MeshBasicMaterial, Raycaster, Vector3 } from "three";
import * as P from "@/game/cave/plan";
import { groundsShapes, groundsWalk } from "@/game/cave/grounds";
import { groundsBounds, preferredCaveEntry, trail, ways } from "@/game/cave/groundsPlan";
import { caveGateGrid, caveGateTarget, caveQuestTarget, firstClosedGate } from "@/game/cave/routing";
import { NavGrid } from "@/game/nav";
import { Colliders } from "@/game/world/util";
import { WORLD } from "@/game/world/layout";
import { THEME } from "@/game/world/theme";
import { caveBounds, groundBounds, mapPoint, mapWindow, townBounds, townMapBounds } from "@/ui/worldMap";
import { floorY, FLOORS, POOLS, waterY } from "@/game/water";

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
  it("puts a continuous dry trace under the next steps at the portrait capture and around the cleft", () => {
    const parts: Parameters<typeof groundsShapes>[0] = [], col = new Colliders();
    const floors = FLOORS.length, pools = POOLS.length;
    const material = new MeshBasicMaterial();
    try {
      groundsWalk(col, cenote.x, cenote.z, WORLD.minX, THEME.meadow?.ceibas);
      groundsShapes(parts, cenote.x, cenote.z);
      const traceColors = new Set(["#9ea375", "#b5b28a", "#bcb68e", "#c9be98"]);
      const trace = parts.filter(([, color]) => traceColors.has(String(color))).map(([g]) => new Mesh(g, material));
      const litter = parts.filter(([, color]) => color === "#997052");
      const shade = parts.filter(([, color]) => color === "#657857");
      expect(litter.length).toBeGreaterThanOrEqual(2);
      expect(shade.length).toBeGreaterThan(0);
      const triangles = [...trace.map(mesh => mesh.geometry), ...[...litter, ...shade].map(([g]) => g)]
        .reduce((sum, g) => sum + (g.index?.count ?? g.attributes.position.count) / 3, 0);
      expect(triangles).toBeLessThanOrEqual(110);
      const ray = new Raycaster(new Vector3(), new Vector3(0, -1, 0));
      const crossed = new Set<number>();
      const sample = (x: number, z: number) => {
        expect(waterY(x, z, 0)).toBeNull();
        expect(col.blocked(x, z, 0.45)).toBe(false);
        ray.ray.origin.set(x, 1, z);
        const hit = ray.intersectObjects(trace, false)[0];
        expect(hit, `paint underfoot at (${x}, ${z})`).toBeDefined();
        expect(Math.abs(hit.point.y - floorY(x, z))).toBeLessThan(0.05);
        return hit.object.id;
      };
      // From the frozen guide walk, check the whole corridor between the feet and the first stones ahead.
      for (let step = 0; step <= 16; step++) crossed.add(sample(-127 - step * 0.25, 6.5 - step * 0.055));
      expect(crossed.size).toBeGreaterThanOrEqual(2);
      for (const [x, z] of trail(cenote.x, cenote.z).slice(1, 3)) sample(x, z);
      sample(grieta.out.x + 0.35, grieta.out.z + 0.12);
    } finally {
      FLOORS.length = floors; POOLS.length = pools;
      for (const [g] of parts) g.dispose();
      material.dispose();
    }
  });

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
