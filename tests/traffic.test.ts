// The passing cars (src/game/ambient.ts) never overlap each other, the parked cars or the taxi: the lanes keep clear
// of the curbside parking, and a car keeps its distance from the one ahead, also when the player stops the traffic.
import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { Ambient } from "../src/game/ambient";
import { PARKED_CARS, TRAFFIC_LANES, ROADS, TAXI } from "../src/game/world/layout";
import { carFootprint, carModelEntry } from "../src/game/world/carModels";
import { RIDES } from "../src/game/world/rides";
import { CAR } from "../src/game/rides/drive";
import type { NavGrid } from "../src/game/nav";

type Box = ReturnType<typeof carFootprint>;
const overlap = (a: Box, b: Box) => Math.min(a.maxX, b.maxX) > Math.max(a.minX, b.minX) && Math.min(a.maxZ, b.maxZ) > Math.max(a.minZ, b.minZ);
const STILL = PARKED_CARS.map(carFootprint);
const taxiBox = carModelEntry(TAXI.model).collisionBox;
const rideBoxes = [
  ...RIDES.cars.map(({ x, z, rot }) => ({ x, z, heading: rot, hl: CAR.half, hw: CAR.wide })),
  { x: TAXI.x, z: TAXI.z, heading: TAXI.rot, hl: taxiBox.length / 2, hw: taxiBox.width / 2 },
];

/** Walkers stay put (no paths): only the cars move. */
const nav = { nearestFree: () => -1, center: () => [0, 0], path: () => null } as unknown as NavGrid;

describe("traffic", () => {
  it("each lane lies on its street, and lanes don't touch each other or anything parked", () => {
    for (const [i, parked] of STILL.entries()) {
      for (const other of STILL.slice(i + 1)) expect(overlap(parked, other)).toBe(false);
    }
    const cars = new Ambient(nav, [[0, 0]], "high").traffic;
    for (const { lane, from, to, half } of cars) {
      const road = ROADS.find((r) => r.z1 === r.z2 && Math.abs(lane - r.z1) < r.w / 2);
      expect(road, `lane at z ${lane}`).toBeTruthy();
      expect(Math.abs(lane - road!.z1) + half.z).toBeLessThanOrEqual(road!.w / 2);
      const band: Box = { minX: from - half.x, maxX: to + half.x, minZ: lane - half.z, maxZ: lane + half.z };
      for (const s of STILL) expect(overlap(band, s), `lane z ${lane} runs into a car at ${(s.minX + s.maxX) / 2}, ${(s.minZ + s.maxZ) / 2}`).toBe(false);
      for (const other of cars) if (other.lane !== lane) expect(Math.abs(other.lane - lane)).toBeGreaterThan(half.z + other.half.z);
    }
  });

  for (const quality of ["high", "low"] as const) {
    it(`moving cars never overlap (${quality} quality, 10 minutes, the player stopping a lane now and then)`, () => {
      const amb = new Ambient(nav, [[0, 0]], quality);
      amb.rideBoxes = rideBoxes;
      const cars = amb.traffic;
      const eastbound = cars.find((car) => car.dir === 1 && car.lane === TRAFFIC_LANES[0].z)!;
      const player = new THREE.Vector3(0, 0, -200);
      let worst = Infinity;
      let overlapAt: { x: number; z: number } | undefined;
      let reachedEnd = false;
      for (let step = 0; step < 12000; step++) {
        // every 40 s the player stands in a different lane for 15 s
        const k = Math.floor(step / 800), inLane = step % 800 < 300;
        const lane = TRAFFIC_LANES[k % TRAFFIC_LANES.length];
        player.set(inLane ? -40 + (k % 5) * 30 : 0, 0, inLane ? lane.z : -200);
        amb.update(0.05, player);
        reachedEnd ||= eastbound.hidden > 0;
        const live = cars.filter((c) => c.hidden <= 0 && c.mesh.visible && c.mesh.scale.x > 0.05);
        for (const c of live) {
          const b = { minX: c.x - c.half.x, maxX: c.x + c.half.x, minZ: c.lane - c.half.z, maxZ: c.lane + c.half.z };
          if (!overlapAt && STILL.some((s) => overlap(b, s))) overlapAt = { x: c.x, z: c.lane };
          for (const o of live) if (o !== c && o.lane === c.lane) worst = Math.min(worst, Math.abs(o.x - c.x) - c.half.x - o.half.x);
        }
      }
      expect(overlapAt, "there is no moving car inside a parked car").toBeUndefined();
      expect(reachedEnd, "eastbound traffic can reach the lane end with the taxi at the stand").toBe(true);
      // bumper to bumper, cars in a lane always keep a gap
      expect(worst).toBeGreaterThan(0.5);
    });
  }

  it("a car that has stopped for the player is climbed like a parked one, waits while they are on it, and drives on", () => {
    const amb = new Ambient(nav, [[0, 0]], "high");
    const cars = amb.traffic;
    const car = cars.find((c) => c.model === "sedan")!;
    const player = new THREE.Vector3(0, 0, -200);
    const run = (s: number) => { for (let i = 0; i < s / 0.05; i++) amb.update(0.05, player); };
    run(2);
    // on the move it is a wall, and has no pieces to stand on
    expect(car.speed).toBeGreaterThan(3);
    expect(amb.carPieces(car.x, car.lane).length).toBe(0);
    const inIt = new THREE.Vector3(car.x + 0.5, 0, car.lane);
    amb.resolvePlayer(inIt, 0.38);
    expect(Math.abs(inIt.z - car.lane)).toBeGreaterThan(1.3);
    // the player stands in its lane: it stops short of them
    player.set(car.x + car.dir * 9, 0, car.lane);
    run(6);
    expect(car.speed).toBeLessThan(0.02);
    expect((player.x - car.x) * car.dir).toBeGreaterThan(3);
    // now it has its hood, its roof and its trunk, and is no wall
    const pieces = amb.carPieces(player.x, player.z);
    const top = (dx: number) => {
      const x = car.x + car.dir * dx;
      return Math.max(0, ...pieces.filter((q) => x > q.minX && x < q.maxX && car.lane > q.minZ && car.lane < q.maxZ).map((q) => q.top));
    };
    expect(top(1.6)).toBeGreaterThan(0.84);  // the hood (it faces the way it drives)
    expect(top(1.6)).toBeLessThan(1);
    expect(top(-0.2)).toBeCloseTo(1.56, 1);  // the roof
    expect(top(-1.7)).toBeGreaterThan(0.88); // the trunk
    const at = new THREE.Vector3(car.x + 0.5, 0, car.lane);
    amb.resolvePlayer(at, 0.38);
    expect(at.z).toBe(car.lane);
    // up on its roof, out of its way: it waits, as long as they like
    const x0 = car.x;
    player.set(car.x - 0.2 * car.dir, 1.56, car.lane);
    run(12);
    expect(car.x).toBeCloseTo(x0, 2);
    expect(car.speed).toBe(0);
    // standing beside it (not on it, not ahead of it) it waits a few seconds, then drives on
    player.set(car.x, 0, car.lane + 1.6);
    run(2);
    expect(car.x).toBeCloseTo(x0, 2);
    run(6);
    expect((car.x - x0) * car.dir).toBeGreaterThan(3);
    // and well away from it, it is a wall on the move again
    player.set(0, 0, -200);
    run(1);
    expect(amb.carPieces(car.x, car.lane).length).toBe(0);
  });
});
