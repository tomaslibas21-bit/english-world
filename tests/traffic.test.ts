// The passing cars (src/game/ambient.ts) never overlap each other, the parked cars or the taxi: the lanes keep clear
// of the curbside parking, and a car keeps its distance from the one ahead, also when the player stops the traffic.
import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { Ambient } from "../src/game/ambient";
import { CAR, PARKED_CARS, TAXI, TRAFFIC_LANES, ROADS } from "../src/game/world/layout";
import type { NavGrid } from "../src/game/nav";

type Box = { x1: number; x2: number; z1: number; z2: number };
/** A car's footprint; heading π/2 or −π/2 lies along x, 0 or π along z. */
const footprint = (x: number, z: number, rot: number): Box => {
  const along = Math.abs(Math.sin(rot)) > 0.5;
  const hx = (along ? CAR.length : CAR.width) / 2, hz = (along ? CAR.width : CAR.length) / 2;
  return { x1: x - hx, x2: x + hx, z1: z - hz, z2: z + hz };
};
const overlap = (a: Box, b: Box) => Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1) > 0 && Math.min(a.z2, b.z2) - Math.max(a.z1, b.z1) > 0;
const STILL = [...PARKED_CARS.map(([x, z, r]) => footprint(x, z, r)), footprint(TAXI.x, TAXI.z, TAXI.rot)];

/** Walkers stay put (no paths): only the cars move. */
const nav = { nearestFree: () => -1, center: () => [0, 0], path: () => null } as unknown as NavGrid;

describe("traffic", () => {
  it("each lane lies on its street, and lanes don't touch each other or anything parked", () => {
    for (const l of TRAFFIC_LANES) {
      const road = ROADS.find((r) => r.z1 === r.z2 && Math.abs(l.z - r.z1) < r.w / 2);
      expect(road, `lane at z ${l.z}`).toBeTruthy();
      expect(Math.abs(l.z - road!.z1) + CAR.width / 2).toBeLessThanOrEqual(road!.w / 2);
      const band: Box = { x1: l.from - CAR.length / 2, x2: l.to + CAR.length / 2, z1: l.z - CAR.width / 2, z2: l.z + CAR.width / 2 };
      for (const s of STILL) expect(overlap(band, s), `lane z ${l.z} runs into a car at ${s.x1 + CAR.length / 2}, ${(s.z1 + s.z2) / 2}`).toBe(false);
      for (const o of TRAFFIC_LANES) if (o !== l) expect(Math.abs(o.z - l.z)).toBeGreaterThan(CAR.width);
    }
  });

  for (const quality of ["high", "low"] as const) {
    it(`moving cars never overlap (${quality} quality, 10 minutes, the player stopping a lane now and then)`, () => {
      const amb = new Ambient(nav, [[0, 0]], quality);
      const cars = (amb as any).cars as { x: number; lane: number; dir: 1 | -1; hidden: number; mesh: THREE.Mesh }[];
      const player = new THREE.Vector3(0, 0, -200);
      let worst = Infinity;
      for (let step = 0; step < 12000; step++) {
        // every 40 s the player stands in a different lane for 15 s
        const k = Math.floor(step / 800), inLane = step % 800 < 300;
        const lane = TRAFFIC_LANES[k % TRAFFIC_LANES.length];
        player.set(inLane ? -40 + (k % 5) * 30 : 0, 0, inLane ? lane.z : -200);
        amb.update(0.05, player);
        const live = cars.filter((c) => c.hidden <= 0 && c.mesh.visible && c.mesh.scale.x > 0.05);
        for (const c of live) {
          const b = footprint(c.x, c.lane, Math.PI / 2);
          for (const s of STILL) expect(overlap(b, s), `car at ${c.x.toFixed(1)}, ${c.lane} inside a parked car`).toBe(false);
          for (const o of live) if (o !== c && o.lane === c.lane) worst = Math.min(worst, Math.abs(o.x - c.x) - CAR.length);
        }
      }
      // bumper to bumper, cars in a lane always keep a gap
      expect(worst).toBeGreaterThan(0.5);
    });
  }
});
