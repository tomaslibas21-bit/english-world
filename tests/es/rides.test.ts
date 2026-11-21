// Puerto Colibrí's convertibles, its lancha and Cenote Ka'an (src/editions/es/game/world/rides.ts, mexican.ts
// cenoteWalk): the checks that need no browser. The engine's own are tests/rides.test.ts; the real game,
// tests/browser/rides.mjs. Runs in the vitest project "es".
import { describe, expect, it } from "vitest";
import { townAsphalt } from "../../src/game/rides/ground";
import { CAR, BOAT } from "../../src/game/rides/drive";
import { RIDES } from "../../src/game/world/rides";
import { RIDE_OWNERS, RIDE_SHOUTS, RIDE_NAMES } from "../../src/content/rides";
import { rideVoice, shoutVoice } from "../../src/content/voices";
import { RIDERS, SCENES, castingProblems, roleOf, styleFor, voiceFor, whoOf } from "../../tools/es-voices/casting-es";
import { PARKED_CARS, TRAFFIC_LANES, OUTDOOR_NPCS, CHAT_SPOTS, WORLD } from "../../src/game/world/layout";
import { THEME } from "../../src/game/world/theme";
import { cenoteWalk } from "../../src/game/world/mexican";
import { Colliders } from "../../src/game/world/util";
import { SHORE, SWIM, BAY, POOLS, FLOORS, floorY, waterY } from "../../src/game/water";

describe("Puerto Colibrí's convertibles and lancha", () => {
  const ground = townAsphalt(RIDES.lots);
  it("three convertibles at the curb, clear of the parked cars, the topes, the traffic and everyone's spot", () => {
    expect(RIDES.cars.length).toBeGreaterThanOrEqual(2);
    expect(RIDES.cars.length).toBeLessThanOrEqual(3);
    for (const c of RIDES.cars) {
      const fx = Math.sin(c.rot), fz = Math.cos(c.rot);
      for (const k of [-1.2, 0, 1.2]) expect(ground.has(c.x + fx * k, c.z + fz * k), `${c.id} on the street`).toBe(true);
      for (const { x, z } of PARKED_CARS) expect(Math.hypot(c.x - x, c.z - z), c.id).toBeGreaterThan(6);
      for (const n of OUTDOOR_NPCS) expect(Math.hypot(c.x - n.x, c.z - n.z), `${c.id}, ${n.npc}`).toBeGreaterThan(5);
      for (const [ax, az, bx, bz] of CHAT_SPOTS) for (const [x, z] of [[ax, az], [bx, bz]]) expect(Math.hypot(c.x - x, c.z - z), c.id).toBeGreaterThan(3.5);
      for (const [x1, z1, x2, z2] of THEME.topes?.at ?? []) expect(Math.hypot(c.x - (x1 + x2) / 2, c.z - (z1 + z2) / 2), `${c.id}, a tope`).toBeGreaterThan(8);
      const ez = Math.abs(Math.cos(c.rot)) * CAR.half + Math.abs(Math.sin(c.rot)) * CAR.wide;
      for (const l of TRAFFIC_LANES) if (c.x > l.from - 3 && c.x < l.to + 3) expect(Math.abs(c.z - l.z), `${c.id}, the lane at ${l.z}`).toBeGreaterThan(ez + 1.15);
    }
  });
  it("two lanchas lie in the shallows, each down a flight of the malecón's steps and a few steps off the dry sand; none of the theme's lies on them", () => {
    expect(RIDES.boats.length).toBe(2);
    for (const b of RIDES.boats) {
      // the stern within reach of the dry sand's edge; east of the pier's deck (x −41.3 … −18.7)
      expect(b.z + BOAT.half * Math.abs(Math.cos(b.rot)), b.id).toBeGreaterThan(SHORE.top - BOAT.reach);
      expect(b.x, b.id).toBeGreaterThan(-18.7 + 4);
      expect(b.x > BAY.x0 && b.x < BAY.x1).toBe(true);
      // the steps down from the malecón at x −12 and x 12
      expect(Math.min(Math.abs(b.x + 12), Math.abs(b.x - 12)), b.id).toBeLessThan(1.5);
      for (const [x, z] of [...(THEME.lanchas?.afloat ?? []), ...(THEME.lanchas?.beached ?? [])]) expect(Math.hypot(b.x - x, b.z - z), b.id).toBeGreaterThan(6);
    }
    expect(Math.hypot(RIDES.boats[0].x - RIDES.boats[1].x, RIDES.boats[0].z - RIDES.boats[1].z)).toBeGreaterThan(6);
  });
  it("everyone in a convertible has their own voice and lines, in Spanish that every country says, with their meaning", () => {
    const voices = new Set<string>(), said = new Set<string>();
    for (const c of RIDES.cars) {
      const who = RIDE_OWNERS[c.id];
      expect(who?.length, c.id).toBeGreaterThanOrEqual(c.people);
      for (const o of who) {
        const v = rideVoice(o.id, o.female);
        expect(v).toMatch(/^es[np]?_ride_/);
        expect(voices.has(v), v).toBe(false);
        voices.add(v);
        expect(o.take.length).toBeGreaterThanOrEqual(4);
        expect(o.back.length).toBeGreaterThanOrEqual(2);
        for (const l of [...o.take, ...o.back]) {
          expect(l.en, l.en).toMatch(/[¡¿áéíóúñ]|\b(te|las|un|una|todo|sin|con)\b/i);
          expect(l.lt.length).toBeGreaterThan(3);
          // (no word that belongs to one country only: the three sets share the text)
          expect(l.en, l.en).not.toMatch(/\b(carro|coche|auto|manej|conduc|vale|órale|chido|padre|guay|vosotros|aguas)\b/i);
          expect(said.has(l.en), l.en).toBe(false);
          said.add(l.en);
        }
      }
    }
    expect(RIDE_SHOUTS.length).toBeGreaterThanOrEqual(5);
    for (const l of RIDE_SHOUTS) { expect(l.en).toMatch(/^¡.*!$/); expect(l.lt.length).toBeGreaterThan(3); }
    expect(RIDE_NAMES.boat.en).toBe("Lancha");
  });
  it("the topes are the car's speed bumps, each across a street", () => {
    expect(RIDES.bumps.length).toBe(THEME.topes?.at.length ?? 0);
    expect(RIDES.bumps.length).toBeGreaterThanOrEqual(3);
    for (const [x1, z1, x2, z2] of RIDES.bumps) { expect(ground.has((x1 + x2) / 2, (z1 + z2) / 2)).toBe(true); expect(Math.hypot(x2 - x1, z2 - z1)).toBeGreaterThan(6); }
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
  it("the owners and the passers-by who call after a car are cast in all three Spanishes, with their settings", () => {
    expect(castingProblems()).toEqual([]);
    const ids = new Set<string>();
    for (const who of Object.values(RIDE_OWNERS)) for (const o of who) ids.add(whoOf(rideVoice(o.id, o.female))!);
    for (const female of [true, false]) for (const n of [0, 1]) ids.add(whoOf(shoutVoice(female, n))!);
    expect(ids.size).toBe(8);
    for (const id of ids) {
      expect(RIDERS[id], id).toBeTruthy();
      expect(roleOf(id)?.voice, id).toMatch(/^es-419-/);
      expect(voiceFor(id, "spain"), id).toMatch(/^es-ES-|^es-es-/);
      const sit = id.startsWith("shout") ? "rides:shout" : "rides";
      expect(styleFor(id, [sit]).scene).toBe(SCENES[sit].setting);
    }
  });
});
