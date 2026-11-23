// The passing cars (src/game/ambient.ts) never overlap each other, the parked cars or the taxi: the lanes keep clear
// of the curbside parking, and a car keeps its distance from the one ahead, also when the player stops the traffic.
import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { Ambient } from "../src/game/ambient";
import { Ledges } from "../src/game/ledges";
import { Hop } from "../src/game/movement";
import { PARKED_CARS, TRAFFIC_CARS, TRAFFIC_LANES, ROADS, TAXI } from "../src/game/world/layout";
import { carFootprint, carModelEntry } from "../src/game/world/carModels";
import { RIDES } from "../src/game/world/rides";
import { CAR } from "../src/game/rides/drive";
import type { NavGrid } from "../src/game/nav";

type Box = ReturnType<typeof carFootprint>;
const overlap = (a: Box, b: Box) => Math.min(a.maxX, b.maxX) > Math.max(a.minX, b.minX) && Math.min(a.maxZ, b.maxZ) > Math.max(a.minZ, b.minZ);
const taxiBox = carModelEntry(TAXI.model).collisionBox;
const convertibles = RIDES.cars.map(({ x, z, rot }) => ({ x, z, heading: rot, hl: CAR.half, hw: CAR.wide }));
const rideBoxes = [
  ...convertibles,
  { x: TAXI.x, z: TAXI.z, heading: TAXI.rot, hl: taxiBox.length / 2, hw: taxiBox.width / 2 },
];
const STILL = [
  ...PARKED_CARS.map(carFootprint),
  ...convertibles.map(({ x, z, heading, hl, hw }) => {
    const s = Math.abs(Math.sin(heading)), c = Math.abs(Math.cos(heading));
    const hx = s * hl + c * hw, hz = c * hl + s * hw;
    return { minX: x - hx, maxX: x + hx, minZ: z - hz, maxZ: z + hz };
  }),
];
const sizes = TRAFFIC_CARS.map(({ model }) => carModelEntry(model).collisionBox);
const hl = Math.max(...sizes.map((size) => size.length)) / 2, hw = Math.max(...sizes.map((size) => size.width)) / 2;

/** Walkers stay put (no paths): only the cars move. */
const nav = { nearestFree: () => -1, center: () => [0, 0], path: () => null } as unknown as NavGrid;

describe("traffic", () => {
  it("each lane lies on its street, and lanes don't touch each other or anything parked", () => {
    for (const [i, parked] of STILL.entries()) {
      for (const other of STILL.slice(i + 1)) expect(overlap(parked, other)).toBe(false);
    }
    for (const l of TRAFFIC_LANES) {
      const road = ROADS.find((r) => r.z1 === r.z2 && Math.abs(l.z - r.z1) < r.w / 2);
      expect(road, `lane at z ${l.z}`).toBeTruthy();
      expect(Math.abs(l.z - road!.z1) + hw).toBeLessThanOrEqual(road!.w / 2);
      const band: Box = { minX: l.from - hl, maxX: l.to + hl, minZ: l.z - hw, maxZ: l.z + hw };
      for (const s of STILL) expect(overlap(band, s), `lane z ${l.z} runs into a car at ${(s.minX + s.maxX) / 2}, ${(s.minZ + s.maxZ) / 2}`).toBe(false);
      for (const o of TRAFFIC_LANES) if (o !== l) expect(Math.abs(o.z - l.z)).toBeGreaterThan(hw * 2);
    }
  });

  for (const quality of ["high", "low"] as const) {
    it(`moving cars never overlap (${quality} quality, 10 minutes, the player stopping a lane now and then)`, () => {
      const amb = new Ambient(nav, [[0, 0]], quality);
      amb.rideBoxes = rideBoxes;
      const cars = amb.traffic;
      const eastbound = cars.find((c) => c.dir === 1 && c.lane === TRAFFIC_LANES[0].z)!;
      let reachedEnd = false;
      const player = new THREE.Vector3(0, 0, -200);
      let worst = Infinity;
      let overlapAt: { x: number; z: number } | undefined;
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
      expect(reachedEnd, "Main Street traffic can exit before the parked taxi").toBe(true);
      // bumper to bumper, cars in a lane always keep a gap
      expect(worst).toBeGreaterThan(0.5);
    });
  }

  it("a car that has stopped for the player is climbed like a parked one, waits while they are on it, and drives on", () => {
    const amb = new Ambient(nav, [[0, 0]], "high");
    const cars = amb.traffic;
    const car = cars.find((c) => c.dir === 1)!;
    const player = new THREE.Vector3(0, 0, -200);
    const run = (s: number) => { for (let i = 0; i < s / 0.05; i++) amb.update(0.05, player); };
    run(2);
    expect(car.speed).toBeGreaterThan(3);
    // the player stands in its lane: it stops short of them
    player.set(car.x + 9, 0, car.lane);
    run(6);
    expect(car.speed).toBeLessThan(0.02);
    expect(player.x - car.x).toBeGreaterThan(3);
    // now it has its hood, its roof and its trunk, and is no wall
    const pieces = amb.carPieces(player.x, player.z);
    const top = (dx: number) => Math.max(0, ...pieces.filter((q) => car.x + dx > q.minX && car.x + dx < q.maxX && car.lane > q.minZ && car.lane < q.maxZ).map((q) => q.top));
    expect(top(1.6)).toBeGreaterThan(0.84);  // the hood (it faces the way it drives)
    expect(top(1.6)).toBeLessThan(1);
    expect(top(-0.2)).toBeCloseTo(1.56, 1);  // the roof
    expect(top(-1.7)).toBeGreaterThan(0.88); // the trunk
    const at = new THREE.Vector3(car.x + 0.5, 0, car.lane);
    amb.resolvePlayer(at, 0.38);
    expect(at.z).toBe(car.lane);
    // up on its roof, out of its way: it waits, as long as they like
    const x0 = car.x;
    player.set(car.x - 0.2, 1.56, car.lane);
    run(12);
    expect(car.x).toBeCloseTo(x0, 2);
    expect(car.speed).toBe(0);
    // standing beside it (not on it, not ahead of it) it waits a few seconds, then drives on
    player.set(car.x, 0, car.lane + 1.6);
    run(2);
    expect(car.x).toBeCloseTo(x0, 2);
    run(6);
    expect(car.x).toBeGreaterThan(x0 + 3);
    // The pieces are only returned for nearby cars.
    player.set(0, 0, -200);
    run(1);
    expect(amb.carPieces(player.x, player.z).length).toBe(0);
  });

  it("lands on the current hood, rides along while jumping, and waits at the end of the lane", () => {
    const amb = new Ambient(nav, [[0, 0]], "low");
    const cars = (amb as any).cars;
    const car = cars.find((c: { dir: number }) => c.dir === 1);
    cars.splice(0, cars.length, car);
    car.x = car.to - 28;
    car.mesh.position.x = car.x;
    const ledges = new Ledges();
    ledges.dynamic = (x, z) => amb.carPieces(x, z);
    const player = new THREE.Vector3(0, 0, -200);
    const dt = 1 / 60;
    amb.update(dt, player);
    const hop = new Hop();
    player.set(car.x + car.speed * 0.5 + 1.6, 0, car.lane);
    expect(ledges.support(player.x, player.z, 1.1, true)).toBe(0);
    // The car moves into place under a descending jumper.
    const away = new THREE.Vector3(0, 0, -200);
    for (let i = 0; i < 30; i++) amb.update(dt, away);
    const hood = ledges.support(player.x, player.z, 1.1, true);
    expect(hood).toBeGreaterThan(0.8);
    expect(hood).toBeLessThan(1.1);
    hop.y = 1.1; hop.air = true; hop.vy = -5;
    while (hop.air) hop.update(dt, hood);
    player.y = hop.ground;
    const offset = player.x - car.x;
    amb.update(dt, player, hop.y);
    expect(car.rider).toBe(true);
    hop.update(0.13, hood);
    expect(hop.start()).toBe(true);
    for (let i = 0; i < 420; i++) {
      hop.update(dt, ledges.support(player.x, player.z, hop.y, hop.air));
      player.y = hop.ground;
      amb.update(dt, player, hop.y);
      expect(player.x - car.x).toBeCloseTo(offset);
    }
    expect(car.x).toBeCloseTo(car.to - 6);
    expect(car.speed).toBe(0);
    expect(car.hidden).toBe(0);
    player.set(0, 0, -200);
    amb.update(dt, player);
    expect(car.rider).toBe(false);
    expect(car.speed).toBeGreaterThan(0);
  });
});
