// Puerto Colibrí's convertibles, its lancha and Cenote Ka'an (src/editions/es/game/world/rides.ts, mexican.ts
// cenoteWalk): the checks that need no browser. The engine's own are tests/rides.test.ts; the real game,
// tests/browser/rides.mjs. Runs in the vitest project "es".
import { describe, expect, it } from "vitest";
import { townDrivable } from "../../src/game/rides/ground";
import { CAR, BOAT } from "../../src/game/rides/drive";
import { RIDES } from "../../src/game/world/rides";
import { RIDE_LINES, RIDE_BACK_LINES, RIDE_NAMES } from "../../src/content/rides";
import { PARKED_CARS, TAXI, TRAFFIC_LANES, OUTDOOR_NPCS, CHAT_SPOTS, WORLD } from "../../src/game/world/layout";
import { THEME } from "../../src/game/world/theme";
import { cenoteWalk } from "../../src/game/world/mexican";
import { Colliders } from "../../src/game/world/util";
import { SHORE, SWIM, BAY, POOLS, FLOORS, floorY, waterY } from "../../src/game/water";

describe("Puerto Colibrí's convertibles and lancha", () => {
  const ground = townDrivable(RIDES.lots);
  it("three convertibles at the curb, clear of the parked cars, the topes, the traffic and everyone's spot", () => {
    expect(RIDES.cars.length).toBeGreaterThanOrEqual(2);
    expect(RIDES.cars.length).toBeLessThanOrEqual(3);
    for (const c of RIDES.cars) {
      const fx = Math.sin(c.rot), fz = Math.cos(c.rot);
      for (const k of [-1.2, 0, 1.2]) expect(ground.has(c.x + fx * k, c.z + fz * k), `${c.id} on the street`).toBe(true);
      for (const [x, z] of [...PARKED_CARS, [TAXI.x, TAXI.z]]) expect(Math.hypot(c.x - x, c.z - z), c.id).toBeGreaterThan(6);
      for (const n of OUTDOOR_NPCS) expect(Math.hypot(c.x - n.x, c.z - n.z), `${c.id}, ${n.npc}`).toBeGreaterThan(5);
      for (const [ax, az, bx, bz] of CHAT_SPOTS) for (const [x, z] of [[ax, az], [bx, bz]]) expect(Math.hypot(c.x - x, c.z - z), c.id).toBeGreaterThan(3.5);
      for (const [x1, z1, x2, z2] of THEME.topes?.at ?? []) expect(Math.hypot(c.x - (x1 + x2) / 2, c.z - (z1 + z2) / 2), `${c.id}, a tope`).toBeGreaterThan(8);
      const ez = Math.abs(Math.cos(c.rot)) * CAR.half + Math.abs(Math.sin(c.rot)) * CAR.wide;
      for (const l of TRAFFIC_LANES) if (c.x > l.from - 3 && c.x < l.to + 3) expect(Math.abs(c.z - l.z), `${c.id}, the lane at ${l.z}`).toBeGreaterThan(ez + 1.15);
    }
  });
  it("the lancha floats off the beach by El Muelle, within a step of where one wades to, and none of the theme's lies on it", () => {
    expect(RIDES.boats.length).toBe(1);
    const b = RIDES.boats[0], fz = Math.cos(b.rot);
    expect(b.z + BOAT.half * Math.abs(fz)).toBeLessThanOrEqual(SHORE.limit + 0.3);
    expect(b.z + BOAT.half * Math.abs(fz)).toBeGreaterThan(SHORE.limit - 2.2);
    expect(b.x > BAY.x0 && b.x < BAY.x1).toBe(true);
    for (const [x, z] of THEME.lanchas?.afloat ?? []) expect(Math.hypot(b.x - x, b.z - z)).toBeGreaterThan(8);
    // east of the pier's deck (x −41.3 … −18.7), not under it
    expect(b.x).toBeGreaterThan(-18.7 + 2);
  });
  it("its people's words are Spanish with their meaning, and the things have their names", () => {
    for (const l of [...RIDE_LINES, ...RIDE_BACK_LINES]) { expect(l.en).toMatch(/[¡¿áéíóúñ]/); expect(l.lt.length).toBeGreaterThan(3); }
    expect(RIDE_NAMES.boat.en).toBe("Lancha");
  });
});

describe("Cenote Ka'an, walked down into", () => {
  it("the town's edge is open where the sacbé crosses it, and the way in is a floor: up onto the deck, down into the water", () => {
    const c = THEME.cenote!;
    expect(c.walk).toBe(true);
    const col = new Colliders();
    POOLS.length = 0; FLOORS.length = 0;
    cenoteWalk(col, c.x, c.z, WORLD.minX);
    try {
      expect(POOLS.length).toBe(1);
      const pool = POOLS[0];
      // dry on the sacbé, up on the deck, under the water at the foot of the steps, deep in the middle
      expect(floorY(c.x + 12, c.z)).toBe(0);
      expect(floorY(c.x + 6.4, c.z)).toBeCloseTo(0.86);
      expect(floorY(c.x + 6.4 - 4.3, c.z)).toBeLessThan(pool.y - 0.4);
      let last = floorY(c.x + 9.4, c.z);
      for (let x = c.x + 9.4; x > c.x + 1.9; x -= 0.05) { const y = floorY(x, c.z); expect(Math.abs(y - last), `a step at x ${x.toFixed(2)}`).toBeLessThan(0.35); last = y; }
      expect(waterY(c.x, c.z, 3)).toBe(pool.y);
      expect(pool.y - floorY(c.x, c.z)).toBeGreaterThan(SWIM.dive + 0.9);
      // the way along the sacbé and over the deck is open; the water is closed in all round but there
      for (let x = WORLD.minX - 0.5; x > c.x + 5.5; x -= 0.5) expect(col.blocked(x, c.z - 0.3, 0.38), `the sacbé at x ${x}`).toBe(false);
      for (let a = 0.5; a < Math.PI * 2 - 0.5; a += 0.1) expect(col.blocked(c.x + Math.cos(a) * 6.9, c.z + Math.sin(a) * 6.9, 0.38), `the rim at ${a.toFixed(1)}`).toBe(true);
      // nobody stands on the way (the pair that chatted on the sacbé stands beside it)
      for (const [ax, az, bx, bz] of CHAT_SPOTS) for (const [x, z] of [[ax, az], [bx, bz]]) if (x < WORLD.minX) expect(Math.abs(z - (c.z - 0.3)), `a pair at ${x}, ${z}`).toBeGreaterThan(1.6);
    } finally { POOLS.length = 0; FLOORS.length = 0; }
  });
});
