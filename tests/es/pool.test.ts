import * as THREE from "three";
import { afterEach, describe, expect, it, vi } from "vitest";
import { keepsakeFor } from "@/content/keepsakes";
import { NPCS } from "@/content/npcs";
import { GLOBAL } from "@/content/global";
import { ROUTE } from "@/content/route";
import { SITUATION_BY_ID } from "@/content/situations";
import { buildNlu, type TurnOut } from "@/convo/dialogue";
import type { ModeHost } from "@/game/kit/host";
import { NavGrid } from "@/game/nav";
import { floorY, POOLS, SWIM, waterY } from "@/game/water";
import { BUILDINGS, OUTDOOR_NPCS, ROADS, SEA_Z, SIDEWALK, WORLD } from "@/game/world/layout";
import { hotelPool } from "@/game/world/mexican";
import { HOTEL_POOL, hotelPoolKidY, POOL_CIRCLE, POOL_ENTRY, POOL_KIDS, POOL_SITUATION, POOL_TALK } from "@/game/world/pool";
import { groundGeometry, outerGeometry } from "@/game/world/town";
import { THEME } from "@/game/world/theme";
import { Colliders } from "@/game/world/util";
import { learnerItems } from "@/editions/es/learner/walk";
import { playSim } from "../../tools/sim-play";

const sit = SITUATION_BY_ID[POOL_SITUATION];

describe("Hotel Mar Azul's pool", () => {
  const poolCount = POOLS.length;
  afterEach(() => { POOLS.length = poolCount; });

  it("puts the deck on the hotel's grounds, clear of roads, sidewalks and the building", () => {
    expect(THEME.hotelPool).toBe(true);
    const hotel = BUILDINGS.find((b) => b.id === "hotel")!;
    const { x, z, deck } = HOTEL_POOL;
    const west = x - deck.halfWidth, east = x + deck.halfWidth;
    const north = z + deck.north, south = z + deck.south;
    expect(west).toBeGreaterThan(WORLD.minX);
    expect(east).toBeLessThan(hotel.x - hotel.w / 2);
    expect(north).toBeGreaterThan(hotel.z - hotel.d / 2);
    expect(south).toBeLessThan(hotel.z + hotel.d / 2);
    for (const road of ROADS) {
      const width = road.w / 2 + SIDEWALK;
      const horizontal = road.z1 === road.z2;
      const x0 = Math.min(road.x1, road.x2) - (horizontal ? 0 : width);
      const x1 = Math.max(road.x1, road.x2) + (horizontal ? 0 : width);
      const z0 = Math.min(road.z1, road.z2) - (horizontal ? width : 0);
      const z1 = Math.max(road.z1, road.z2) + (horizontal ? width : 0);
      expect(east <= x0 || west >= x1 || south <= z0 || north >= z1, road.name).toBe(true);
    }
  });

  it("leaves the water visible through both town ground layers", () => {
    const ground = new THREE.Mesh(groundGeometry());
    ground.position.set((WORLD.minX + WORLD.maxX) / 2, 0, (SEA_Z - 2 + WORLD.maxZ) / 2);
    const grass = new THREE.Mesh(outerGeometry());
    grass.position.set(35, -0.05, SEA_Z + 321);
    for (const mesh of [ground, grass]) {
      mesh.rotation.x = -Math.PI / 2;
      mesh.updateMatrixWorld();
    }
    const down = new THREE.Vector3(0, -1, 0);
    const { x, z } = HOTEL_POOL;
    const ray = new THREE.Raycaster(new THREE.Vector3(x, 2, z), down);
    expect(ray.intersectObjects([ground, grass])).toHaveLength(0);
    ray.set(new THREE.Vector3(x, 2, z + 6), down);
    expect(ray.intersectObjects([ground, grass]).length).toBeGreaterThanOrEqual(2);
    ground.geometry.dispose();
    grass.geometry.dispose();
  });

  it("removes the pool, kids and game when measuring with nopool in dev", async () => {
    vi.stubGlobal("location", new URL("http://localhost/?nopool=1"));
    vi.resetModules();
    try {
      const [{ HOTEL_POOL_ENABLED }, layout, { groundGeometry: disabledGround }, { createPoolMode }] = await Promise.all([
        import("@/game/world/pool"), import("@/game/world/layout"), import("@/game/world/town"), import("@/game/pool/mode"),
      ]);
      expect(HOTEL_POOL_ENABLED).toBe(false);
      expect(layout.OUTDOOR_NPCS.some(({ npc }) => POOL_KIDS.some((kid) => kid === npc))).toBe(false);
      expect(createPoolMode({} as ModeHost)).toBeNull();
      const geometry = disabledGround();
      const terrain = new THREE.Mesh(geometry);
      const { x, z } = HOTEL_POOL;
      const cx = (WORLD.minX + WORLD.maxX) / 2, cz = (SEA_Z - 2 + WORLD.maxZ) / 2;
      const ray = new THREE.Raycaster(new THREE.Vector3(x - cx, cz - z, 2), new THREE.Vector3(0, 0, -1));
      expect(ray.intersectObject(terrain).length).toBeGreaterThan(0);
      geometry.dispose();
    } finally {
      vi.unstubAllGlobals();
      vi.resetModules();
    }
  });

  it("has a walkable entrance and steps, a wading shelf and a swimming end", () => {
    const col = new Colliders();
    const solids: Parameters<typeof hotelPool>[0] = [], flat: typeof solids = [];
    hotelPool(solids, flat, col);
    for (const [geometry] of [...solids, ...flat]) geometry.dispose();
    const { x, z, steps, water } = HOTEL_POOL;
    expect(waterY(POOL_ENTRY.x, POOL_ENTRY.z, 0)).toBeNull();
    const treads = [4.99, 4.6, 4.2, 3.8, 3.3].map((dz) => floorY(x + steps.x, z + dz));
    expect(treads).toEqual([...treads].sort((a, b) => b - a));
    const shelf = water - floorY(POOL_CIRCLE.learner.x, POOL_CIRCLE.learner.z);
    expect(shelf).toBeCloseTo(1.04);
    expect(shelf).toBeLessThan(HOTEL_POOL.swim.out);
    expect(water - floorY(x, z - 3)).toBeGreaterThan(HOTEL_POOL.swim.depth);
    for (const kid of ["vale", "diego"] as const) {
      expect(hotelPoolKidY(kid)).toBe(floorY(POOL_CIRCLE[kid].x, POOL_CIRCLE[kid].z));
      expect(water - hotelPoolKidY(kid)).toBeCloseTo(0.76);
    }
    expect(hotelPoolKidY("santi")).toBeGreaterThan(floorY(POOL_CIRCLE.santi.x, POOL_CIRCLE.santi.z));
    expect(waterY(x, z - 3, 0)).toBe(water);
    expect(water - floorY(x, z - 3)).toBeLessThan(SWIM.dive + 0.7);
    const hotel = BUILDINGS.find((b) => b.id === "hotel")!;
    col.addBox(hotel.x, hotel.z, hotel.w, hotel.d);
    for (const [px, pz, scale] of THEME.ceibas) col.addCircle(px, pz, 0.95 * scale);
    const nav = new NavGrid(WORLD.minX - 50, WORLD.minZ, WORLD.maxX, WORLD.maxZ, 1, col);
    expect(nav.path(POOL_ENTRY.x, POOL_ENTRY.z + 2, POOL_TALK.x, POOL_TALK.z)).not.toBeNull();
    expect(nav.path(POOL_TALK.x, POOL_TALK.z, x, z - 3)).not.toBeNull();
  });
});

describe("Vale's bonus chat", () => {
  it("is registered off the route at the hotel and includes the pool lines for extraction", () => {
    expect(sit).toMatchObject({ bonus: true, chapter: 9, order: 8, location: "hotel", npc: "vale" });
    expect(ROUTE.some(({ id }) => id === sit.id)).toBe(false);
    expect(keepsakeFor(sit.id)).toBe("balloon");
    for (const npc of POOL_KIDS) {
      expect(OUTDOOR_NPCS.some((spot) => spot.npc === npc)).toBe(true);
      expect(NPCS[npc]).toMatchObject({ informal: true, look: { child: true } });
    }
    expect(NPCS.santi.look.swimRing).toBe(true);
    const items = learnerItems(sit);
    expect(items.some((item) => item.kind === "sent" && item.es === "¡Tuya!")).toBe(true);
    expect(items.some((item) => item.kind === "sent" && item.es === "¡Treinta!")).toBe(true);
  });

  const nlu = buildNlu(sit, GLOBAL, NPCS);
  for (const row of sit.tests ?? []) {
    it(`recognizes ${row.say}`, () => {
      const expected = sit.steps.find(({ id }) => id === row.step)?.expects ?? [];
      const parsed = nlu.parse(row.say, expected, expected).best?.segments[0];
      expect(parsed?.intent).toBe(row.intent);
      if (row.slots) expect(parsed?.slots).toMatchObject(row.slots);
    });
  }

  for (const sim of sit.sims ?? []) {
    it(sim.name, () => {
      const run = playSim(sit, sim, 1);
      const outs: TurnOut[] = [run.start, ...run.turns.map(({ out }) => out)];
      const lines = outs.flatMap(({ lines }) => lines.map(({ lineId }) => lineId));
      const events = outs.flatMap(({ events }) => events);
      expect(run.start.lines[0].lineId).toBe("again");
      expect(run.conv.completed).toBe(sim.expect.complete);
      if (sim.expect.state) expect(run.conv.s).toMatchObject(sim.expect.state);
      expect(run.unused).toBe(0);
      expect(run.openAtCompletion).toEqual([]);
      if (sim.expect.complete) {
        expect(lines.at(-1)).toBe("lets_play");
        expect(events.map(({ name }) => name)).toEqual(["pool"]);
        expect(lines.filter((id) => id === "from_us")).toHaveLength(1);
        expect(lines.filter((id) => id === "my_age").length).toBeLessThanOrEqual(1);
        expect(lines.includes("near")).toBe(sim.expect.state?.from === "near");
        expect(lines.includes("far")).toBe(sim.expect.state?.from === "far");
      } else {
        expect(lines.at(-1)).toBe("bye");
        expect(events).toEqual([]);
      }
    });
  }
});
