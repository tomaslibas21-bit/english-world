import { Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { clearIslandCoast, islandGroundY, jettyStop, TOWER_FOOT } from "../src/game/world/island";
import { RIDES } from "../src/game/world/rides";
import { LIGHTHOUSE, SEA_Z, WORLD } from "../src/game/world/layout";
import { buildLighthouseIsland } from "../src/game/world/lighthouseIsland";
import { floorY, SEA_LEVEL, SHORE } from "../src/game/water";
import { Colliders } from "../src/game/world/util";
import { NavGrid, openIslandNav } from "../src/game/nav";
import { BOAT, Motion } from "../src/game/rides/drive";
import { setBlobShadows } from "../src/game/characters";

const island = RIDES.island!;
const d = island.jetty;

describe("lighthouse island", () => {
  it("keeps the island and jetty inside the bay with at least 7 metres of open water", () => {
    expect(island.center).toEqual(LIGHTHOUSE);
    for (const { x, z } of island.outline) {
      expect(x).toBeGreaterThan(WORLD.minX);
      expect(x).toBeLessThan(WORLD.maxX);
      expect(z).toBeGreaterThan(WORLD.minZ);
      expect(z).toBeLessThanOrEqual(SEA_Z - 7);
    }
    expect(d.z1).toBeLessThanOrEqual(SEA_Z - 7);
    expect(d.z0).toBeGreaterThan(WORLD.minZ);
    expect(islandGroundY(island, LIGHTHOUSE.x, SEA_Z - 4)).toBeUndefined();
  });

  it("shares the floor heights above the highest swell and leaves the channel deep", () => {
    expect(floorY(LIGHTHOUSE.x, LIGHTHOUSE.z)).toBe(island.y);
    expect(floorY(d.x0 + 1, (d.z0 + d.z1) / 2)).toBe(d.y);
    expect(island.y).toBeGreaterThan(SEA_LEVEL + 0.265);
    expect(d.y).toBeGreaterThan(island.y);
    expect(floorY(d.x0 - 1, d.z0)).toBeLessThan(SEA_LEVEL - 0.95);
    expect(floorY(LIGHTHOUSE.x, -78)).toBeLessThan(SEA_LEVEL);
  });

  it("clears the wide rocky shoulders along the true outline", () => {
    const shoulder = { x: island.outline[6].x - 2, z: LIGHTHOUSE.z };
    const deep = { x: d.x0 - 4, z: d.z0 };
    expect(islandGroundY(island, shoulder.x, shoulder.z)).toBe(island.y);
    clearIslandCoast(island, shoulder, BOAT.wide);
    expect(islandGroundY(island, shoulder.x, shoulder.z)).toBeUndefined();
    clearIslandCoast(island, deep, BOAT.wide);
    expect(deep).toEqual({ x: d.x0 - 4, z: d.z0 });
  });

  it("stops a boat at the jetty and accepts a step only within reach of the hull", () => {
    const m = new Motion(BOAT, "boat"), z = (d.z0 + d.z1) / 2;
    const sea = new Colliders();
    sea.addBox((d.x0 + d.x1) / 2, z, d.x1 - d.x0, d.z1 - d.z0);
    m.set(d.x0 - 19, z, Math.PI / 2);
    // Bow and stern both face east/west in this approach.
    const reach = (px: number, pz: number) => Math.hypot(
      Math.max(0, Math.abs(px - m.x) - BOAT.half), Math.max(0, Math.abs(pz - m.z) - BOAT.wide));
    expect(jettyStop(d, m.x, m.z, reach)).toBeNull();
    const p = new Vector3();
    for (let i = 0; i < 420; i++) {
      m.step(1 / 60, { throttle: 1, steer: 0, brake: false });
      m.settle((at, radius) => {
        p.x = at.x; p.z = at.z;
        sea.resolve(p, radius);
        at.x = p.x; at.z = p.z;
        clearIslandCoast(island, at, radius);
      });
    }
    expect(m.x).toBeGreaterThan(d.x0 - BOAT.half - 0.35);
    expect(m.x + BOAT.half).toBeLessThan(d.x0 + 0.1);
    const step = jettyStop(d, m.x, m.z, reach);
    expect(step).toEqual({ x: d.x0 + 0.75, z, y: d.y });
    expect(reach(step!.x, step!.z)).toBeLessThan(BOAT.reach);
    m.set(m.x, m.z + 8, m.heading);
    expect(jettyStop(d, m.x, m.z, reach)).toBeNull();
  });

  it("connects the jetty to the keeper on foot while keeping the sea closed", () => {
    const { center, keeper, cottage } = island;
    const col = new Colliders();
    col.addBox(104, -102, 70, 60, "sea");
    col.addCircle(center.x, center.z, TOWER_FOOT);
    col.addBox(cottage.x, cottage.z, cottage.w, cottage.d);
    col.addCircle(keeper.x, keeper.z, 0.28);
    const nav = new NavGrid(75, WORLD.minZ, 130, -65, 1, col);
    openIslandNav(island, nav, col);
    const path = nav.path(d.x0 + 1, -83.15, keeper.approach.x, keeper.approach.z);
    expect(path).not.toBeNull();
    for (const [x, z] of path!) expect(islandGroundY(island, x, z)).toBeDefined();
    expect(nav.free(nav.idx(center.x, center.z))).toBe(false);
    expect(nav.free(nav.idx(center.x, SHORE.limit))).toBe(false);
    expect(nav.path(center.x, -69, keeper.approach.x, keeper.approach.z)).toBeNull();
  });

  it("batches the props and keeper into five visible meshes in phone quality", () => {
    setBlobShadows(true);
    const view = buildLighthouseIsland(island);
    try {
      view.update(5);
      view.keeper.update(0.016);
      let meshes = 0, propMeshes = 0;
      view.group.traverseVisible((o) => {
        if (!("isMesh" in o)) return;
        meshes++;
        if (o.parent === view.group) propMeshes++;
      });
      expect(propMeshes).toBe(3);
      expect(meshes).toBe(5);
    } finally {
      view.dispose();
      setBlobShadows(false);
    }
  });
});
