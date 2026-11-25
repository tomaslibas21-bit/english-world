import { Euler, Material, Mesh, PerspectiveCamera, Points, Quaternion, Raycaster, Vector3 } from "three";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NPCS } from "@/content/npcs";
import { Ambient } from "@/game/ambient";
import { SALTO, ways } from "@/game/cave/groundsPlan";
import { createCharacter } from "@/game/characters";
import { NavGrid } from "@/game/nav";
import { CAR_WATER, carFootprintOverlapsBox, carWaterClearanceY, createCarWaterProbe, probeCarWater,
  sampleCarWater, supportedCarWaterHeight, sweepCarFootprintBox, wetDriveSettings } from "@/game/rides/carWater";
import { CarWaterEffects } from "@/game/rides/carWaterEffects";
import { BOAT, CAR, Motion, aheadOnArc, pushOutOfBox, type Drivable } from "@/game/rides/drive";
import { isTownCarDryMainland, settleRoadExit, townAsphalt, townCarWaterGround, townGround } from "@/game/rides/ground";
import { Rides } from "@/game/rides/Rides";
import { CarWaterClearance, type CarWaterAdapter } from "@/game/rides/carWaterRecovery";
import { CONVERTIBLE_BUMPER, convertibleGeometry } from "@/game/rides/shapes";
import { BAY, DECKS, FLOORS, POOLS, SEA_LEVEL, SHORE, Splashes, floorY, poolAt, poolBedY, sandY, seaBedY, waterY } from "@/game/water";
import { carModelEntry } from "@/game/world/carModels";
import { OUTDOOR_NPCS, SEA_Z, TRAFFIC_LANES, WORLD } from "@/game/world/layout";
import { MALECON } from "@/game/world/mexican";
import { POOL_KIDS } from "@/game/world/pool";
import { PoolRound } from "@/game/pool/logic";
import { RIDES, type CarWaterPlan, type CarWaterSite } from "@/game/world/rides";
import { THEME } from "@/game/world/theme";
import { Colliders, type AABB } from "@/game/world/util";
import { buildTownFixture } from "./town-fixture";

const W = CAR_WATER;
const go = { throttle: 1, steer: 0, brake: false };
type Point = { x: number; z: number };
type Size = { half: number; wide: number };
const tires = (p: ReturnType<typeof createCarWaterProbe>) => [p.frontLeft, p.frontRight, p.rearLeft, p.rearRight];
const read = (x: number, z: number, heading = 0, time = 0, spec: Size = CAR) => {
  const probe = createCarWaterProbe();
  probeCarWater({ x, z, heading, spec }, time, "dry", probe);
  return probe;
};

it("retains both hysteresis thresholds and latches float until the caller resets it", () => {
  const out = createCarWaterProbe();
  const pose = { x: 300, z: 300, heading: 0, spec: CAR };
  let depth = 0;
  POOLS.push({ x: 300, z: 300, r: 6, y: 0, depth: 3 });
  FLOORS.push({ x0: 297, x1: 303, z0: 297, z1: 303, y: () => -depth });
  try {
    for (const [d, band] of [
      [0.049, "dry"], [0.05, "shallow"], [0.025, "shallow"], [0.024, "dry"],
      [0.34, "body-deep"], [0.28, "body-deep"], [0.279, "shallow"], [0.339, "shallow"],
      [0.849, "body-deep"], [0.85, "float"], [0, "float"],
    ] as const) {
      depth = d;
      probeCarWater(pose, 0, out.band, out);
      expect(out.band, "depth " + d).toBe(band);
    }
    expect(out.maxTireDepth).toBe(0);
    probeCarWater(pose, 0, "dry", out);
    expect(out.band).toBe("dry");
  } finally {
    POOLS.pop();
    FLOORS.pop();
  }
});

describe.each([60, 20])("town car motion at %i Hz", hz => {
  const dt = 1 / hz;

  it.each([
    ["shallow", 1, 4.2], ["shallow", -1, 2.6],
    ["body-deep", 1, 2.1], ["body-deep", -1, 1.4],
  ] as const)("holds the %s cap for throttle %s and sheds excess pace including slip", (band, throttle, cap) => {
    for (const initial of [0, throttle > 0 ? 10 : 5]) {
      const m = new Motion(CAR, "car");
      m.speed = throttle * initial;
      m.slip = initial ? 2.4 : 0;
      for (let i = 0; i < 3 * hz; i++) {
        const { x, z, pace } = m;
        m.step(dt, { throttle, steer: 0.35, brake: false }, Infinity, false, Infinity, wetDriveSettings(band));
        expect(m.pace).toBeLessThanOrEqual(Math.max(cap, pace - 18 * dt) + 1e-9);
        expect(Math.hypot(m.x - x, m.z - z) / dt).toBeCloseTo(m.pace, 9);
        expect(Math.sign(m.speed)).toBe(throttle);
      }
      expect(m.pace).toBeCloseTo(cap, 2);
    }
  });

  it("reduces the wheel target and measured yaw, including prior full lock", () => {
    const controls = { ...go, steer: 1 };
    for (const [band, gain] of [["shallow", 0.85], ["body-deep", 0.45]] as const) {
      for (const steer of [0, 1]) {
        const dry = new Motion(CAR, "car"), wet = new Motion(CAR, "car");
        dry.speed = wet.speed = 1.6;
        dry.steer = wet.steer = steer;
        dry.step(dt, controls);
        wet.step(dt, controls, Infinity, true, Infinity, wetDriveSettings(band));
        expect(wet.steer).toBeCloseTo(dry.steer * gain, 10);
        expect(wet.yaw).toBeGreaterThan(0);
        expect(wet.yaw).toBeLessThan(dry.yaw);
        expect(wet.heading).toBeCloseTo(-wet.yaw * dt, 10);
      }
    }
  });

  it("keeps lower car, road, brake and pedestrian limits and applies the optional power dip", () => {
    const wet = wetDriveSettings("body-deep")!;
    const small = Object.freeze({ ...CAR, max: 1.15, town: 0.9, back: 0.65 });
    for (const [throttle, cap] of [[1, 1.15], [-1, 0.65]]) {
      const slow = new Motion(small, "car");
      for (let i = 0; i < 5 * hz; i++) slow.step(dt, { ...go, throttle }, Infinity, true, Infinity, wet);
      expect(slow.speed).toBeCloseTo(throttle * cap, 8);
    }
    for (const sign of [-1, 1]) {
      const m = new Motion(CAR, "car");
      m.speed = sign * 1.3;
      m.slip = 0.8;
      const pace = m.pace;
      m.step(dt, { ...go, throttle: sign, brake: true }, Infinity, false, Infinity, wet);
      expect(m.pace).toBeLessThanOrEqual(pace - CAR.brake * dt + 1e-9);
      for (let i = 0; i < hz; i++) m.step(dt, { ...go, throttle: sign, brake: true }, Infinity, false, Infinity, wet);
      expect(m.pace).toBe(0);
    }
    const m = new Motion(CAR, "car"), reach = CAR.half + CAR.clear;
    for (let i = 0; i < 2 * hz; i++) m.step(dt, go, reach + 0.05, true, Infinity, wet);
    expect(m.pace).toBeCloseTo(1);
    for (let i = 0; i < hz; i++) m.step(dt, go, reach, true, Infinity, wet);
    expect(m.pace).toBe(0);
    for (let i = 0; i < 3 * hz; i++) m.step(dt, go, Infinity, false, 4, { ...wet, forward: 20 });
    expect(m.pace).toBeCloseTo(CAR.careful);
    for (let i = 0; i < 3 * hz; i++) m.step(dt, go, Infinity, false, Infinity, { ...wet, forward: 20 });
    expect(m.pace).toBeCloseTo(CAR.rough);

    const normal = new Motion(CAR, "car"), dipping = new Motion(CAR, "car");
    normal.step(dt, go, Infinity, true, Infinity, wet);
    dipping.step(dt, go, Infinity, true, Infinity, { ...wet, power: W.sputter.missPower });
    expect(dipping.speed).toBeCloseTo(normal.speed * 0.85, 10);
  });

  it("matches stock motion for dry cars and boats through throttle, turn, braking and reverse", () => {
    for (const [spec, kind] of [[CAR, "car"], [BOAT, "boat"]] as const) {
      const stock = new Motion(spec, kind), test = new Motion(Object.freeze({ ...spec }), kind);
      const wet = wetDriveSettings(kind === "car" ? "dry" : "body-deep");
      for (let i = 0; i < 9 * hz; i++) {
        const controls = { throttle: i < 7 * hz ? 1 : -1, steer: i < 4 * hz ? 0 : 0.8, brake: i >= 6 * hz && i < 7 * hz };
        const road = i < 5 * hz;
        stock.step(dt, controls, Infinity, road);
        test.step(dt, controls, Infinity, road, Infinity, wet);
        expect(test).toEqual(stock);
      }
    }
  });
});

it("rechecks the signed cap when a turn changes the direction of a near-sideways car", () => {
  const m = new Motion(CAR, "car");
  m.speed = 0.01;
  m.slip = 3;
  m.steer = 0.85;
  m.step(0.05, { ...go, throttle: 0.03, steer: 1 }, Infinity, true, Infinity, wetDriveSettings("shallow"));
  expect(m.speed).toBeLessThan(0);
  expect(m.pace).toBeLessThanOrEqual(2.6 + 1e-9);
  expect(Math.hypot(m.x, m.z) / 0.05).toBeCloseTo(m.pace, 10);
});

function at({ x, z, rot }: CarWaterSite, side: number, along: number) {
  const s = Math.sin(rot), c = Math.cos(rot);
  return { x: x + c * side + s * along, z: z - s * side + c * along };
}

function circleHitsBox(p: Point, radius: number, b: AABB) {
  return Math.hypot(Math.max(0, b.minX - p.x, p.x - b.maxX), Math.max(0, b.minZ - p.z, p.z - b.maxZ)) < radius;
}

function bodyHitsCircle(p: CarWaterSite, size: Size, c: Point & { r: number }) {
  const q = { x: c.x, z: c.z };
  return pushOutOfBox(q, c.r, p.x, p.z, p.rot, size.half, size.wide);
}

function solidHits(col: Colliders, p: CarWaterSite, size: Size) {
  return [
    ...col.boxes.filter(b => b.tag !== "sea" && carFootprintOverlapsBox(p.x, p.z, p.rot, size.half, size.wide, b)),
    ...col.circles.filter(c => bodyHitsCircle(p, size, c)),
  ];
}

function footAt(p: CarWaterSite, wide: number, side: number) {
  return at(p, side * (wide + W.footOffset), 0);
}

function footHits(col: Colliders, p: Point) {
  return [
    ...col.boxes.filter(b => b.tag !== "sea" && circleHitsBox(p, W.footRadius, b)),
    ...col.circles.filter(c => Math.hypot(c.x - p.x, c.z - p.z) < c.r + W.footRadius),
  ];
}

describe("Puerto Colibrí's built water approaches", () => {
  let fixture: ReturnType<typeof buildTownFixture>;
  let plan: CarWaterPlan, ground: Drivable, col: Colliders, convertible: Size, largest: Size;
  beforeAll(async () => {
    expect(THEME.cenote).toMatchObject({ x: -136, z: -6, open: true, walk: true });
    expect(RIDES.cars.map(c => c.id)).toEqual(["park", "east", "west"]);
    expect(RIDES.boats.map(b => b.id)).toEqual(["muelle", "playa"]);
    plan = await RIDES.loadCarWater!();
    ground = townCarWaterGround(plan);
    fixture = buildTownFixture();
    col = fixture.town.colliders;
    const geometry = convertibleGeometry(RIDES.cars[0].paint);
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    convertible = { half: Math.max(box.max.z, -box.min.z), wide: Math.max(box.max.x, -box.min.x) };
    geometry.dispose();
    const fleet = fixture.town.parkedCars.placements.map(s => carModelEntry(s.model).collisionBox);
    largest = { half: Math.max(...fleet.map(s => s.length)) / 2, wide: Math.max(...fleet.map(s => s.width)) / 2 };
    expect(largest.half).toBeCloseTo(2.74275, 5);
    expect(largest.wide).toBeCloseTo(1.12, 5);
  }, 20_000);
  afterAll(() => fixture?.restore());

  it("reads independent sea depth rows and uses still depth through rising and falling swell", () => {
    expect([SEA_Z, SEA_LEVEL, SHORE.top, SHORE.edge, SHORE.limit, BAY.z0]).toEqual([-72, -0.25, -70.1, -74, -77.4, -146]);
    const zs = [-72, -73, -75, -77.4, -79];
    for (const [x, depths] of [[84, [0.164, 0.314, 0.359, 0.413, 0.789]], [128, [0, 0.152, 0.335, 0.389, 0.766]]] as const) {
      for (const [i, z] of zs.entries()) {
        const sample = read(x, z, Math.PI, 2).centre;
        expect(sample.depth, [x, z].join(",")).toBeCloseTo(depths[i], 3);
        expect(sample.floor).toBe(z < SHORE.limit ? seaBedY(x, z) : sandY(x, z));
        expect(sample.stillSurface).toBe(-0.25);
        expect(sample.liveSurface).toBe(waterY(x, z, 2));
      }
    }
    let min = Infinity, max = 0;
    for (let t = 0; t < 30; t += 0.1) {
      const probe = read(84, -75, Math.PI, t);
      expect(probe.band).toBe("body-deep");
      min = Math.min(min, probe.centre.liveDepth);
      max = Math.max(max, probe.centre.liveDepth);
    }
    expect(min).toBeLessThan(0.34);
    expect(max).toBeGreaterThan(0.34);
    expect(read(-96, -81, Math.PI).band).toBe("float");
    for (const [z, band] of [[-63, "dry"], [-76.4, "body-deep"]] as const) {
      expect(solidHits(col, { x: 84, z, rot: Math.PI / 2 }, largest)).toEqual([]);
      expect(read(84, z, Math.PI / 2, 0, largest).band).toBe(band);
    }
  });

  it("reads Hotel Mar Azul's treads, lip, bench and deep floor in the real rectangular basin", () => {
    const x = -104.65, out = createCarWaterProbe().centre;
    expect(poolAt(x, -27)).toBeNull();
    const pool = poolAt(x, -27.001);
    expect(pool).toMatchObject({ bounds: { x0: -109, x1: -103, z0: -37, z1: -27 }, y: -0.12 });
    for (const [z, depth] of [[-27.4, 0.161], [-28, 0.583], [-28.5, 0.935], [-30.4, 0.76], [-34.5, 1.85]]) {
      sampleCarWater(x, z, 110, out);
      expect(out.depth, "hotel z=" + z).toBeCloseTo(depth, 3);
      expect(out.stillSurface).toBe(-0.12);
      expect(out.liveDepth).toBe(out.depth);
    }
    const treads = [-27.01, -27.4, -28, -28.5].map(z => floorY(x, z));
    treads.forEach((y, i) => { if (i) expect(y).toBeLessThan(treads[i - 1]); });
    expect(floorY(-108, -30.4)).toBeCloseTo(-1.16);
    expect(isTownCarDryMainland(ground, x, -26.9, 0)).toBe(true);
    expect(isTownCarDryMainland(ground, x, -27.4, 0)).toBe(false);
  });

  it("honors the actual cenote floor overrides, deck, gaps and grotto grounds", () => {
    const pool = poolAt(-136, -6)!;
    expect(pool).toMatchObject({ x: -136, z: -6, r: 5.9, y: 0.04, depth: 3.4 });
    expect(read(-136, -6).centre.depth).toBeCloseTo(3.4);
    expect(floorY(-129.6, -6)).toBeCloseTo(0.86, 10);
    const overBowl = read(-130.25, -6).centre;
    expect(overBowl).toMatchObject({ stillSurface: 0.04, liveSurface: 0.04, depth: 0, liveDepth: 0 });
    expect(overBowl.floor).toBeCloseTo(0.86, 10);
    expect(poolBedY(pool, -130.25, -6)).toBeLessThan(-0.4);
    expect(read(-132.9, -6).centre.depth).toBeLessThan(0.12);
    expect(floorY(-142.9, -6)).toBe(SALTO.y);
    const [, grieta, ojo] = ways(-136, -6);
    expect(floorY(ojo.x, ojo.z)).toBe(-1.5);
    expect(col.blocked(grieta.x, grieta.z, 0.65)).toBe(true);
    expect(col.blocked(-129.6, -4.68, 0.25)).toBe(true);
    for (const p of plan.areas[2].approaches) {
      let firstWet: ReturnType<typeof read> | undefined;
      for (let d = 0; d <= 10 && !firstWet; d += 0.02) {
        const q = at(p, 0, d), probe = read(q.x, q.z, p.rot);
        if (probe.band !== "dry") firstWet = probe;
      }
      expect(firstWet).toBeDefined();
      expect(firstWet!.centre.depth).toBe(0);
      expect(firstWet!.maxTireDepth).toBeGreaterThan(0.45);
      expect(firstWet!.pitch).toBe(0.14);
    }
  });

  it("detects a reversed axle drop, one oblique tire and the same-frame accepted pose", () => {
    const z = -77.9;
    const forward = read(84, z, Math.PI), rear = read(84, z, 0);
    expect(forward.centre.depth).toBeLessThan(0.85);
    expect(forward.frontAxleDepth).toBeGreaterThan(0.85);
    expect(rear.rearAxleDepth).toBeGreaterThan(0.85);
    expect(rear.frontAxleDepth).toBeLessThan(0.85);
    expect(rear.band).toBe("float");

    const oblique = read(84, -77.35, Math.PI / 2, 0, largest);
    expect(oblique.frontLeft.x).toBeCloseTo(84 + 1.36 * largest.half / 2.15, 10);
    expect(oblique.frontLeft.z).toBeCloseTo(-77.35 - 0.88 * largest.wide / 0.95, 10);
    const p = read(84, -77.8, Math.PI * 0.77, 0, largest);
    expect(tires(p).filter(t => t.depth >= 0.85)).toHaveLength(1);
    expect(p.band).toBe("body-deep");

    const accepted = new Motion(CAR, "car"), out = createCarWaterProbe(), sample = out.frontLeft;
    accepted.set(24, -64.1, Math.PI);
    accepted.speed = 8;
    accepted.step(0.05, go);
    const guess = accepted.z;
    const v = new Vector3();
    accepted.settle((q, radius) => {
      col.resolve(v.set(q.x, 0, q.z), radius, false, false, true);
      q.x = v.x; q.z = v.z;
    });
    expect(accepted.z).toBeGreaterThan(guess);
    probeCarWater(accepted, 0.05, "dry", out);
    expect(out.centre.z).toBe(accepted.z);
    expect(out.frontLeft).toBe(sample);
    expect(sample.floor).toBe(floorY(sample.x, sample.z));
  });

  it("opens the sea and the west seam while preserving stock ground, asphalt, and the actual perimeter", () => {
    const dry = townGround(), asphalt = townAsphalt(RIDES.lots);
    expect(ground.rects).toEqual([
      { x0: -110.65, x1: 180.65, z0: -146, z1: 94.65 },
      { x0: -155.15, x1: -109, z0: -24.15, z1: 12.15 },
    ]);
    expect(dry.nearest(84, -80).x).toBe(84);
    expect(dry.nearest(84, -80).z).toBeCloseTo(-68.65, 10);
    expect(asphalt.has(128, -55)).toBe(true);
    expect(asphalt.has(128, -64)).toBe(false);
    expect(asphalt.has(-116, -20)).toBe(false);
    expect(dry.has(-116, -20)).toBe(false);
    expect(isTownCarDryMainland(ground, -116, -20, 0)).toBe(true);
    expect(isTownCarDryMainland(ground, -30, -76, 0)).toBe(false);
    expect(isTownCarDryMainland(ground, -113, -66.5, 0)).toBe(false);
    for (const [x, z] of [[-111, -80], [0, -146.01], [180.66, 0], [0, 94.66], [-155.16, 6], [-116, -24.16], [-116, 12.16], [-113, -66.5]]) {
      expect(ground.has(x, z), [x, z].join(",")).toBe(false);
    }
    for (const dir of [-1, 1]) {
      const m = new Motion({ ...CAR, ...largest }, "car");
      m.set(dir < 0 ? -109.5 : -117.5, 6, dir * Math.PI / 2);
      const start = m.x, v = new Vector3();
      for (let i = 0; i < 180 && Math.abs(m.x - start) < 8; i++) {
        m.step(1 / 60, go, Infinity, false);
        expect(m.settle((q, radius) => {
          settleRoadExit(ground, q, radius, false);
          col.resolve(v.set(q.x, 0, q.z), radius, false, false, true);
          q.x = v.x; q.z = v.z;
        })).toBe(0);
        expect(solidHits(col, { x: m.x, z: m.z, rot: m.heading }, largest)).toEqual([]);
      }
      expect((m.x - start) * dir).toBeGreaterThanOrEqual(8);
      expect(m.z).toBeCloseTo(6, 10);
    }
    for (const g of [dry, ground]) {
      const point = { x: 0, z: 100 };
      settleRoadExit(g, point, CAR.wide, false);
      expect(point.z).toBeCloseTo(94.65, 10);
      point.z = 100;
      settleRoadExit(g, point, CAR.wide, true);
      expect(point).toEqual({ x: 0, z: 100 });
    }
  });

  it("skips actual sea boxes only and retains the ledges, pool walls, malecón, pier and west jungle", () => {
    const pushed = (x: number, z: number, jumper = false, openEdge = false, ignoreSea = false, radius = 0.12) => {
      const p = new Vector3(x, 0, z);
      col.resolve(p, radius, jumper, openEdge, ignoreSea);
      return Math.hypot(p.x - x, p.z - z);
    };
    const defaults = new Vector3(84, 0, -73);
    col.resolve(defaults, 0.12);
    expect(defaults.z).toBeGreaterThan(-72);
    for (const z of [-73, -103.99]) {
      expect(pushed(84, z)).toBeGreaterThan(0.1);
      expect(pushed(84, z, false, false, true)).toBe(0);
      expect(pushed(84, z, true)).toBe(0);
    }
    const split = col.boxes.find(b => b.tag === "car" && b.split)!;
    const sx = (split.minX + split.maxX) / 2, sz = (split.minZ + split.maxZ) / 2;
    expect(pushed(sx, sz)).toBeGreaterThan(0.1);
    expect(pushed(sx, sz, false, false, true)).toBeCloseTo(pushed(sx, sz));
    expect(pushed(sx, sz, true)).toBe(0);
    expect(pushed(0, 96.1, false, false, true)).toBeGreaterThan(0.1);
    expect(pushed(0, 96.1, false, true, true)).toBe(0);

    const west = col.boxes.filter(b => b.minX === -114 && b.maxX === -112);
    expect(west.map(b => [b.minZ, b.maxZ])).toEqual([[-110, -67.5], [-65.5, -25.5], [13.5, 110]]);
    const jungle = col.boxes.filter(b => b.tag === "edge" && b.minX < -150 && b.maxZ - b.minZ >= 1.59);
    expect(jungle).toHaveLength(3);
    for (const b of [...west, ...jungle]) {
      expect(pushed((b.maxX + b.minX) / 2, (b.maxZ + b.minZ) / 2, false, true, true)).toBeGreaterThan(0.12);
    }
    for (const [x, z] of [
      [182.03, 0], [24, MALECON.z], [-32.15, -70], [-27.85, -70], [-32.15, -74.5], [-27.85, -74.5],
      [-41.2, -80], [-18.8, -80], [-30, -88.2], [-36, -72.2], [-24, -72.2],
      [-109, -33], [-103, -33], [-106, -37], [-108, -27], [-103.25, -27], [-106.5, -24.5], [-103, -24.5],
      [-111.5, -31], [-100.5, -31], [-106, -40.9],
    ]) {
      expect(pushed(x, z, false, false, true), [x, z].join(",")).toBeGreaterThan(0.12);
    }
    const c = col.circles.find(c => c.x < -132 && c.x > -141 && c.z < -10 && c.z > -14 && c.r === 0.8)!;
    expect(pushed(c.x + 0.05, c.z, false, true, true)).toBeGreaterThan(0.12);
  });

  it("sweeps both stock footprints along the real approaches with independent door clearance", () => {
    const [coast, hotel, cenote] = plan.areas;
    const routes = [
      ...coast.approaches.map(p => ({ p, metres: 26 })),
      ...hotel.approaches.map(p => ({ p, metres: 14 })),
      ...cenote.approaches.map(p => ({ p, metres: 11 })),
    ];
    for (const size of [convertible, largest]) for (const { p, metres } of routes) {
      const steps = Math.ceil(metres / 0.2), blockedDoors = new Set<number>();
      for (let i = 0; i <= steps; i++) {
        const q = { ...at(p, 0, metres * i / steps), rot: p.rot };
        const label = [q.x.toFixed(3), q.z.toFixed(3), size.half].join(", ");
        expect(ground.has(q.x, q.z), label).toBe(true);
        expect(solidHits(col, q, size), label).toEqual([]);
        for (const side of [-1, 1]) {
          const hit = footHits(col, footAt(q, size.wide, side));
          if (i === 0) expect(hit, "start door at " + label).toEqual([]);
          if (hit.length) blockedDoors.add(side);
        }
      }
      if ([84, -96, -104.65].includes(p.x)) expect([...blockedDoors].sort()).toEqual([-1, 1]);
    }
    expect(solidHits(col, { x: 24, z: -66.3, rot: Math.PI }, largest).length).toBeGreaterThan(0);
    // The lengthwise deep-end pose reaches the basin's back wall with the longest parked car.
    expect(solidHits(col, { x: -106, z: -34.5, rot: Math.PI }, largest))
      .toEqual(expect.arrayContaining([expect.objectContaining({ tag: "edge", minZ: -37.14, maxZ: -36.86 })]));
    const transverse = { x: -106, z: -34.5, rot: Math.PI / 2 };
    expect(solidHits(col, transverse, largest)).toEqual([]);
    expect(read(transverse.x, transverse.z, transverse.rot, 0, largest).band).toBe("float");
    for (const n of OUTDOOR_NPCS.filter(n => POOL_KIDS.some(id => id === n.npc))) {
      expect(bodyHitsCircle(transverse, largest, { ...n, r: 0.42 }), n.npc).toBe(false);
    }
  });

  it("sweeps El Muelle's full bumper corners before the motion circles reach the rail", () => {
    const start = { x: -30, z: -70, heading: 0.42 };
    const probe = read(start.x, start.z, start.heading);
    expect([probe.centre, ...tires(probe)].every(p => p.floor === 0.3 && p.depth === 0 && p.liveDepth === 0)).toBe(true);
    expect(THEME.terrace).toEqual([[-40.6, -32.7, -71.6, -68.6], [-27.3, -19.4, -71.6, -68.6]]);
    const rail = col.boxes.find(b => b.tag === "ledge" && Math.abs(b.minX + 27.95) < 1e-9 && b.minZ < start.z && b.maxZ > start.z)!;
    const end = { x: -29.74, z: -69.51, heading: 0.42 };
    expect(end.x + CAR.wide + Math.abs(Math.sin(end.heading)) * (CAR.half - CAR.wide)).toBeLessThan(rail.minX);
    const contact = sweepCarFootprintBox(start, end, 2.26, 0.99, rail);
    expect(contact).toBeGreaterThan(0);
    expect(contact).toBeLessThanOrEqual(1);
    const turning = { ...start, x: -29.72, heading: 0 };
    expect(sweepCarFootprintBox(turning, { ...turning, heading: 0.72 }, 2.26, 0.99, rail)).toBeGreaterThan(0);
    expect(sweepCarFootprintBox(start, { ...start, x: -30.2 }, convertible.half, convertible.wide, rail)).toBeNull();
    const back = read(-30, -90.5, Math.PI);
    expect(back.band).toBe("float");
    expect(back.centre.floor).toBeLessThan(-2);
  });

  it("uses pitched and rolled contacts and each local waterline through stops, motion and a resumed frame", () => {
    const cases = [
      { x: -30, z: -70, heading: 0.42, pitch: 0, roll: 0, time: 0, wet: false },
      { x: -30, z: -90.5, heading: Math.PI, pitch: 0, roll: 0.06, time: 0.05, wet: true },
      { x: 84, z: -76.4, heading: Math.PI / 2, pitch: -0.14, roll: 0.125, time: 2.1, wet: true },
      { x: 84.4, z: -76.5, heading: Math.PI / 2 + 0.15, pitch: 0.10, roll: -0.15, time: 2.15, wet: true },
      { x: 84.4, z: -76.5, heading: Math.PI / 2 + 0.15, pitch: 0.10, roll: -0.15, time: 6.05, wet: true },
      { x: -142.9, z: -6, heading: Math.PI / 2, pitch: 0.14, roll: 0.08, time: 6.1, wet: true },
      { x: -104.65, z: -28.1, heading: Math.PI, pitch: 0.14, roll: 0.1, time: 6.15, wet: true },
    ];
    for (const p of cases) {
      const { x, z, pitch, roll, time, wet, heading } = p;
      const rotation = new Quaternion().setFromEuler(new Euler(pitch, heading, roll, "YXZ"));
      const y = -3;
      const face = new Vector3(0.43, 1.25, -0.34).applyQuaternion(rotation).add(new Vector3(x, y, z));
      const height = supportedCarWaterHeight({ x, z, spec: CAR }, rotation, time, y, wet, face);
      const contacts = [[CAR.wide, CAR.half], [0.88, 1.36]].flatMap(([wide, half]) => [-1, 1].flatMap(side =>
        [-1, 1].map(end => new Vector3(side * wide, 0, end * half).applyQuaternion(rotation).add(new Vector3(x, height, z)))));
      const support = contacts.map(q => q.y - Math.max(floorY(q.x, q.z), wet ? (waterY(q.x, q.z, time) ?? -Infinity) - 0.42 : -Infinity));
      for (const clearance of support) expect(clearance).toBeGreaterThanOrEqual(-1e-9);
      expect(height).toBeGreaterThanOrEqual(floorY(x, z));
      const faceSurface = waterY(face.x, face.z, time);
      if (faceSurface !== null) expect(face.y + (height - y) - faceSurface).toBeGreaterThanOrEqual(0.15 - 1e-9);
      const camera = { x: x + 0.15, z: z - 3, y: -3 };
      const cameraSurface = waterY(camera.x, camera.z, time);
      if (cameraSurface !== null) expect(carWaterClearanceY(camera, time, W.cameraClear)).toBeCloseTo(cameraSurface + 0.35, 10);
      if (z === -70) expect(height).toBe(0.3);
      if (z === -90.5) expect(height).toBeGreaterThanOrEqual(0.3);
      if (x === -142.9) expect(height).toBeGreaterThanOrEqual(4.6);
    }
    const offshore = { x: -96, z: -81, spec: CAR }, rotation = new Quaternion();
    const lowFace = { x: -95.4, z: -80.6, y: -0.8 }, time = 7;
    const hullHeight = supportedCarWaterHeight(offshore, rotation, time, -0.9, true);
    const height = supportedCarWaterHeight(offshore, rotation, time, -0.9, true, lowFace);
    expect(height).toBeGreaterThan(hullHeight);
    expect(lowFace.y + height + 0.9 - waterY(lowFace.x, lowFace.z, time)!).toBeCloseTo(0.15, 10);
  });

  it.each([60, 20])("crosses the old clamp, slows by band and backs to dry under the isolated solver at %i Hz", hz => {
    const dt = 1 / hz, asphalt = townAsphalt(RIDES.lots), v = new Vector3();
    for (const size of [CAR, largest]) for (const x of [84, 128, -96]) {
      const m = new Motion({ ...CAR, ...size }, "car");
      const probe = createCarWaterProbe();
      const integrate = (i: number, throttle: number) => {
        const initialPace = m.pace, settings = wetDriveSettings(probe.band);
        m.step(dt, { ...go, throttle }, Infinity, asphalt.has(m.x, m.z), Infinity, settings);
        if (settings) expect(m.pace).toBeLessThanOrEqual(Math.max(throttle > 0 ? settings.forward : settings.reverse, initialPace - W.decel * dt) + 1e-9);
        m.settle((q, radius) => {
          settleRoadExit(ground, q, radius, false);
          col.resolve(v.set(q.x, 0, q.z), radius, false, false, true);
          q.x = v.x; q.z = v.z;
        });
        probeCarWater(m, i * dt, probe.band, probe);
      };
      m.set(x, -55, Math.PI);
      const bands: string[] = ["dry"];
      let dryPace = 0;
      for (let i = 1; i <= 12 * hz && probe.band !== "float"; i++) {
        integrate(i, 1);
        expect(m.x).toBeCloseTo(x, 8);
        if (probe.band === "dry") dryPace = Math.max(dryPace, m.pace);
        if (probe.band !== bands.at(-1)) bands.push(probe.band);
      }
      expect(bands, "coast x=" + x).toEqual(["dry", "shallow", "body-deep", "float"]);
      expect(dryPace).toBeGreaterThan(6);
      expect(m.z).toBeLessThan(SHORE.limit);

      m.set(x, -72.8, Math.PI);
      probeCarWater(m, 0, "dry", probe);
      expect(probe.band).not.toBe("float");
      expect(probe.band).not.toBe("dry");
      for (let i = 1; i <= 4 * hz && probe.band !== "dry"; i++) integrate(i, -1);
      expect(probe.band).toBe("dry");
      expect(m.speed).toBeLessThan(0);
      expect(m.z).toBeGreaterThan(-72.8);
    }
  });

  it("checks distinct off-lane dry pairs, runtime lanchas, yielding occupants and moving traffic", () => {
    const { town } = fixture;
    const originalCircles = col.circles.length;
    const nav = new NavGrid(-156.5, WORLD.minZ, WORLD.maxX, WORLD.maxZ, 1, col);
    const places: [number, number][] = town.doors.filter(d => d.loc !== "airport").map(d => [d.outX, d.outZ]);
    places.push([22, -20], [40, -46], [16, -36], [-12, -62], [30, -63], [-30, -61], [96, -30], [-6, 46], [62, 44], [-42, 44], [118, 2]);
    const ambient = new Ambient(nav, places, "low", town.seats, col);
    const player = createCharacter(NPCS.vale.look);
    const people = OUTDOOR_NPCS;
    const boats = town.group.children.filter(o => o.userData.rideBoat);
    const noop = () => {};
    const rides = new Rides({
      cam: new PerspectiveCamera(), colliders: col, nav, ambient, player, quality: "low", people: () => people,
      say: noop, thud: noop, stuck: noop, aground: noop, waiting: noop, freed: noop, rescue: noop,
      splash: noop, fan: noop, outdoors: () => true, allowsCrashes: () => false,
    }, RIDES, boats);
    try {
      const coastBoats = rides.list.filter(r => r.kind === "boat");
      expect(coastBoats).toHaveLength(8);
      const beached = coastBoats.filter(r => r.beach);
      expect(beached).toHaveLength(3);
      const sandCircles = beached.flatMap(r => r.beach!.circles);
      expect(sandCircles.every(c => col.circles.includes(c))).toBe(true);
      const oldRoute = { x: 24, z: -70.4, rot: Math.PI };
      expect(beached.filter(r => r.beach!.circles.some(c => bodyHitsCircle(oldRoute, largest, c))).map(r => r.id))
        .toEqual(["lancha-beached-2"]);
      for (const p of plan.areas[0].approaches) for (let d = 0; d <= 26; d += 0.2) {
        const pose = { ...at(p, 0, d), rot: p.rot };
        expect(rides.sea.circles.some(c => bodyHitsCircle(pose, largest, c))).toBe(false);
        expect(sandCircles.some(c => bodyHitsCircle(pose, largest, c))).toBe(false);
        for (const { id, m } of coastBoats) {
          const dx = pose.x - m.x, dz = pose.z - m.z, { half, wide } = m.spec;
          const hull = { minX: -wide, maxX: wide, minZ: -half, maxZ: half };
          const localX = dx * m.fz - dz * m.fx, localZ = dx * m.fx + dz * m.fz;
          expect(carFootprintOverlapsBox(localX, localZ, pose.rot - m.heading, largest.half, largest.wide, hull), id).toBe(false);
          for (const side of [-1, 1]) {
            const foot = footAt(pose, largest.wide, side);
            expect(pushOutOfBox(foot, W.footRadius, m.x, m.z, m.heading, half, wide), id).toBe(false);
          }
        }
      }
      // The two people beside the western alternate gap and the children at the pool still set real yield limits.
      expect(ambient.personAhead(-72, -64, 0, -1, 10, 1.5)).toBeCloseTo(3.2);
      const kids = people.filter(n => POOL_KIDS.some(id => id === n.npc));
      expect(kids.map(n => n.npc).sort()).toEqual([...POOL_KIDS].sort());
      const pilot = new Motion({ ...CAR, ...largest }, "car"), hotel = plan.areas[1].approaches[0];
      pilot.set(hotel.x, hotel.z, hotel.rot);
      const probe = createCarWaterProbe();
      for (let i = 0; i < 8 * 60; i++) {
        const gap = Math.min(...kids.map(n => aheadOnArc(pilot.x, pilot.z, pilot.fx, pilot.fz, 0, n.x, n.z, 34, 1.35)));
        pilot.step(1 / 60, go, gap, false, Infinity, wetDriveSettings(probe.band));
        probeCarWater(pilot, i / 60, probe.band, probe);
        for (const n of kids) expect(bodyHitsCircle({ x: pilot.x, z: pilot.z, rot: pilot.heading }, largest, { ...n, r: 0.35 })).toBe(false);
      }
      expect(pilot.z).toBeLessThan(hotel.z - 4);
      expect(pilot.z).toBeGreaterThan(-28);
      expect(pilot.pace).toBeLessThan(0.01);
      expect(probe.band).not.toBe("float");

      const landings = plan.areas.flatMap(a => a.landings);
      const feet = (p: CarWaterSite) => [-1, 1].map(side => footAt(p, largest.wide, side));
      for (const [i, p] of landings.entries()) {
        expect(solidHits(col, p, largest)).toEqual([]);
        for (const foot of feet(p)) {
          expect(footHits(col, foot)).toEqual([]);
          expect(isTownCarDryMainland(ground, foot.x, foot.z, 0)).toBe(true);
        }
        for (const side of [-1, 0, 1]) for (const along of [-1, 0, 1]) {
          const q = at(p, side * largest.wide, along * largest.half);
          expect(isTownCarDryMainland(ground, q.x, q.z, 0)).toBe(true);
        }
        for (const q of landings.slice(0, i)) expect(Math.hypot(q.x - p.x, q.z - p.z)).toBeGreaterThan(2 * (largest.half + W.footRadius));
        for (const l of TRAFFIC_LANES) {
          const lane = { minX: l.from - 3, maxX: l.to + 3, minZ: l.z - 1.25, maxZ: l.z + 1.25 };
          expect(carFootprintOverlapsBox(p.x, p.z, p.rot, largest.half, largest.wide, lane)).toBe(false);
          expect(feet(p).some(foot => circleHitsBox(foot, W.footRadius, lane))).toBe(false);
        }
      }

      const frame = 1 / 60, trafficStart = ambient.traffic.map(c => c.x);
      const parked = town.parkedCars.fleet.cars.find(c => c.spot.model === "garbage")!;
      const car = rides.createModeCar({ ...parked.spot, id: "water-test-parked" }, parked.root, noop);
      player.root.position.set(car.m.x, 0, car.m.z + car.m.spec.wide + 0.8);
      expect(rides.board(car, false)).toBe(true);
      for (let i = 0; i < 60; i++) rides.update(frame, i * frame, null);
      expect(rides.phase).toBe("on");
      expect(player.root.visible).toBe(false);
      rides.resetPosition(car, { x: 128, z: -64, rot: Math.PI });
      for (let i = 60; i < 240; i++) {
        ambient.update(frame, player.root.position);
        rides.update(frame, i * frame, go);
        if (i % 6 !== 0) continue;
        const live = [...people, ...ambient.walkerRoots.map(w => w.position)];
        for (const p of landings) {
          for (const q of live) {
            const label = [p.x, p.z, q.x, q.z].join(", ");
            expect(bodyHitsCircle(p, largest, { x: q.x, z: q.z, r: 0.35 }), label).toBe(false);
            expect(feet(p).every(f => Math.hypot(q.x - f.x, q.z - f.z) >= 0.35 + W.footRadius), label).toBe(true);
          }
          for (const c of ambient.traffic) {
            const box = { minX: c.x - c.half.x, maxX: c.x + c.half.x, minZ: c.lane - c.half.z, maxZ: c.lane + c.half.z };
            expect(carFootprintOverlapsBox(p.x, p.z, p.rot, largest.half, largest.wide, box)).toBe(false);
            expect(feet(p).some(f => circleHitsBox(f, W.footRadius, box))).toBe(false);
          }
        }
      }
      expect(ambient.traffic.every((c, i) => c.mesh.position.z === c.lane && Math.abs(c.x - trafficStart[i]) > 1)).toBe(true);
      expect(car.m.z).toBeLessThan(-65);
      expect(car.m.z).toBeGreaterThanOrEqual(-68.65);
      expect(car.mesh.position.y).toBeLessThan(0.1);
      rides.removeModeCar(car);
    } finally {
      rides.disposeCrashes();
      rides.disposeParkingKeys();
      player.dispose?.();
      col.circles.length = originalCircles;
    }
  }, 20_000);
});

function occupiedTown(hz: number, plan: typeof RIDES = RIDES, effects?: Pick<CarWaterAdapter, "drops" | "splash" | "wash"> & { drops: Splashes }) {
  const fixture = buildTownFixture({ movableParking: true });
  const { town } = fixture, col = town.colliders, dt = 1 / hz;
  const nav = new NavGrid(-156.5, WORLD.minZ, WORLD.maxX, WORLD.maxZ, 1, col);
  const places: [number, number][] = town.doors.filter(d => d.loc !== "airport").map(d => [d.outX, d.outZ]);
  places.push([22, -20], [40, -46], [16, -36], [-12, -62], [30, -63], [-30, -61], [96, -30], [-6, 46], [62, 44], [-42, 44], [118, 2]);
  const ambient = new Ambient(nav, places, "low", town.seats, col);
  const player = createCharacter(NPCS.vale.look);
  const cam = new PerspectiveCamera();
  const people = OUTDOOR_NPCS.slice();
  const fades: string[] = [], snaps: { car: Vector3; foot: Vector3; covered: boolean }[] = [];
  let now = 0, time = 0, left = 0, eligible = true, saved: { x: number; y: number; z: number; rot: number } | undefined;
  const noop = () => {};
  const rides = new Rides({
    cam, colliders: col, nav, ambient, player, quality: "low", people: () => people,
    say: noop, thud: noop, stuck: noop, aground: noop, waiting: noop, freed: noop, rescue: noop,
    splash: noop, fan: noop, outdoors: () => true, carWaterClock: () => now,
  }, plan, town.group.children.filter(o => o.userData.rideBoat));
  const fleet = town.parkedCars.fleet;
  const cars = fleet.cars.map((entry, index) => {
    const r = rides.createModeCar({ ...entry.spot, id: "parked-" + index }, entry.root, () => fleet.take(entry));
    r.crashParking = {
      visual: () => entry.visual, solo: () => entry.taken && !entry.driven,
      take: () => fleet.take(entry, false), untake: () => fleet.untake(entry),
    };
    return r;
  });
  let car = cars[0];
  rides.onLeft = () => { left++; };
  const adapter: CarWaterAdapter = {
    ...effects,
    eligible: () => eligible,
    peopleClear: (clear, reserve) => people.every(n => clear(n.x, n.z, 0.45)
      && (!reserve || n.ax === undefined || n.az === undefined || clear(n.ax, n.az, 0.55))),
    arrest: noop,
    foot: f => {
      player.root.position.set(f.x, f.y, f.z);
      player.root.rotation.set(0, f.rot, 0);
      player.swim = f.swim * 0.6;
      player.dive = 0;
    },
    snap: () => snaps.push({ car: car.mesh.position.clone(), foot: player.root.position.clone(), covered: fades.at(-1) === "opaque" }),
    fade: phase => fades.push(phase),
    save: () => { const f = rides.water?.safeSave(); if (f) saved = { ...f }; },
  };
  const inspect = () => rides.water!.inspect();
  const present = () => {
    player.update(0);
    rides.water?.learnerFace(player, time);
    cam.position.set(player.root.position.x + 0.15, -4, player.root.position.z - 3);
    rides.water?.cameraFloor(cam.position, time);
    rides.water?.presented();
  };
  const frame = (controls: typeof go | null = null, ms = 1000 / hz, resume = false) => {
    now += ms; time += dt;
    const handled = rides.water?.tick(dt, time, resume);
    if (!handled || rides.water?.returning || !rides.riding) rides.update(dt, time, handled ? null : controls);
    effects?.drops.update(dt, time, null, 0);
    player.update(dt);
    ambient.update(dt, player.root.position, cam.position);
    present();
  };
  const board = async (r = car, load = true) => {
    car = r;
    const { x, z, rot } = car.home, foot = footAt({ x, z, rot }, car.m.spec.wide, 1);
    player.root.position.set(foot.x, floorY(foot.x, foot.z), foot.z);
    expect(rides.board(car, false)).toBe(true);
    rides.prefetchWater(car, adapter);
    if (load) await expect.poll(() => !!rides.water).toBe(true);
    for (let i = 0; i < hz * 1.5; i++) frame();
    expect(rides.phase).toBe("on");
  };
  const stage = (x: number, z: number, rot: number) => rides.resetPosition(car, { x, z, rot });
  const dryPair = () => {
    const { x, z, heading } = car.m, p = { x, z, rot: heading };
    const f = player.root.position;
    expect(solidHits(col, p, car.m.spec)).toEqual([]);
    expect(footHits(col, f)).toEqual([]);
    expect(waterY(x, z, time)).toBeNull();
    expect(waterY(f.x, f.z, time)).toBeNull();
    expect(f.y).toBeCloseTo(floorY(f.x, f.z), 8);
    expect(rides.near(f.x, f.z)).toBe(car);
  };
  const supported = () => {
    const { mesh, m } = car;
    const p = player.root.position;
    if (!inspect().active) return;
    for (const [wide, half] of [[m.spec.wide, m.spec.half], [0.88 * m.spec.wide / 0.95, 1.36 * m.spec.half / 2.15]]) {
      for (const end of [-1, 1]) for (const side of [-1, 1]) {
        const q = new Vector3(side * wide, 0, end * half).applyQuaternion(mesh.quaternion).add(mesh.position);
        expect(q.y).toBeGreaterThanOrEqual(floorY(q.x, q.z) - 1e-6);
        expect(q.y).toBeGreaterThanOrEqual((waterY(q.x, q.z, time) ?? -Infinity) - 0.42 - 1e-6);
      }
    }
    expect(Math.abs(mesh.rotation.x)).toBeLessThanOrEqual(W.maxPitch);
    const head = player.headPosition?.(new Vector3()) ?? p.clone().add(new Vector3(0, 1.3, 0));
    expect(head.y).toBeGreaterThanOrEqual((waterY(head.x, head.z, time) ?? -Infinity) + 0.15 - 1e-5);
    expect(cam.position.y).toBeGreaterThanOrEqual((waterY(cam.position.x, cam.position.z, time) ?? -Infinity) + 0.35 - 1e-5);
  };
  return {
    rides, player, cars, ambient, col, people, board, frame, stage, inspect, supported, dryPair, fades, snaps, adapter, present,
    get car() { return car; }, get now() { return now; }, get time() { return time; }, get left() { return left; }, get saved() { return saved; },
    disable: () => { eligible = false; },
    close: () => { rides.disposeWater(); rides.disposeCrashes(); rides.disposeParkingKeys(); player.dispose?.(); fixture.restore(); },
  };
}

it("gets out and boards the same convertible on the dry grounds west of town", async () => {
  const f = occupiedTown(60);
  try {
    const car = f.rides.find("park")!;
    await f.board(car);
    f.stage(-109.5, 6, -Math.PI / 2);
    for (let i = 0; i < 180 && car.m.x > -116.3; i++) f.frame(go);
    expect(car.m.x).toBeLessThanOrEqual(-116.3);
    for (let i = 0; i < 60 && car.m.pace > 0.02; i++) f.frame({ ...go, throttle: 0, brake: true });
    expect(car.m.pace).toBeLessThanOrEqual(0.02);
    expect(car.m.z).toBeCloseTo(6, 5);
    expect(f.rides.drivable.has(car.m.x, car.m.z)).toBe(false);
    expect(f.inspect()).toMatchObject({ enabled: true, band: "dry", active: false });

    const preferred = f.rides.carExit(car)?.clone();
    expect(preferred?.z).toBeGreaterThan(car.m.z);
    // The landing point is clear, but a short wall crosses the path out of this door.
    f.col.addBox(car.m.x, car.m.z + car.m.spec.wide + 0.21, 1.5, 0.1, "door-test");
    expect(footHits(f.col, preferred!)).toEqual([]);
    expect(f.rides.carExit(car)?.z).toBeLessThan(car.m.z);
    f.col.boxes.pop();

    const parked = { x: car.m.x, z: car.m.z, heading: car.m.heading };
    const mesh = car.mesh;
    expect(f.rides.leave()).toBe(true);
    f.frame();
    expect(f.rides.phase).toBe("out");
    expect(f.player.root.visible).toBe(true);
    for (let i = 0; i < 90 && f.rides.riding; i++) f.frame();
    expect(f.rides.riding).toBeNull();
    expect(f.left).toBe(1);
    expect(car.m).toMatchObject(parked);
    expect(f.inspect()).toMatchObject({ active: false, reason: null, assistedOnFoot: false });
    expect(f.fades.every(phase => phase === "clear")).toBe(true);
    expect(f.snaps).toEqual([]);

    const foot = f.player.root.position;
    const reach = Math.hypot(Math.max(0, Math.abs(foot.x - parked.x) - car.m.spec.half),
      Math.max(0, Math.abs(foot.z - parked.z) - car.m.spec.wide));
    f.dryPair();
    expect([foot.x, foot.y, foot.z].every(Number.isFinite)).toBe(true);
    expect(foot.distanceTo(preferred!)).toBeLessThan(1e-8);
    expect(reach).toBeGreaterThanOrEqual(0.35);
    expect(reach).toBeLessThanOrEqual(1.45);
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4, x = foot.x + W.footRadius * Math.cos(a), z = foot.z + W.footRadius * Math.sin(a);
      expect(waterY(x, z, f.time)).toBeNull();
      expect(floorY(x, z)).toBeCloseTo(foot.y, 8);
    }

    const near = f.rides.near(foot.x, foot.z)!;
    expect(near).toBe(car);
    expect(f.rides.board(near, false)).toBe(true);
    f.rides.prefetchWater(near, f.adapter);
    for (let i = 0; i < 90 && f.rides.phase !== "on"; i++) f.frame();
    expect(f.rides.phase).toBe("on");
    for (let i = 0; i < 180 && parked.x - car.m.x < 2; i++) {
      f.frame(go);
      expect(f.inspect()).toMatchObject({ band: "dry", active: false });
      expect(waterY(car.m.x, car.m.z, f.time)).toBeNull();
    }
    expect(parked.x - car.m.x).toBeGreaterThanOrEqual(2);
    expect(f.rides.riding).toBe(car);
    expect(car.mesh).toBe(mesh);

    const west = (await RIDES.loadCarWater!()).westGrounds!;
    f.stage(west.minX - 0.8, 6, -Math.PI / 2);
    expect(f.rides.carExit(car)).toBeNull();
    expect(f.rides.leave()).toBe(false);
    expect(f.rides.riding).toBe(car);
  } finally { f.close(); }
}, 20_000);

describe.each([60, 20])("live paired recovery at %i Hz", hz => {
  it("drives the uninterrupted coast with the stock fleet and tows back at a bounded pace", async () => {
    const f = occupiedTown(hz);
    try {
      await f.board(f.rides.find("east"));
      f.stage(128, -55, Math.PI);
      const original = f.car.mesh.uuid;
      const boatStart = f.rides.list.filter(r => r.kind === "boat").map(r => [r, r.m.x, r.m.z] as const);
      const bands = new Set<string>();
      for (let i = 0; i < 12 * hz && !f.rides.water!.returning; i++) {
        f.frame(go);
        f.supported();
        bands.add(f.inspect().band);
      }
      expect([...bands]).toEqual(["dry", "shallow", "body-deep", "float"]);
      expect(f.car.m.z).toBeLessThan(SHORE.limit);
      const started = f.now, expected = f.inspect().spares;
      expect(expected).toHaveLength(2);
      let visibleTow = 0;
      for (let i = 0; i <= 3.5 * hz && f.inspect().active; i++) {
        const { x, z } = f.car.m;
        f.frame({ ...go, brake: true });
        f.supported();
        if (!f.inspect().fallback) {
          const span = Math.hypot(f.car.m.x - x, f.car.m.z - z);
          expect(span * hz).toBeLessThanOrEqual(8.001);
          visibleTow += span;
        }
      }
      expect(f.inspect().active).toBe(false);
      expect(f.inspect().landing).toBe("trail");
      expect(visibleTow).toBeGreaterThan(5);
      expect(f.now - started).toBeLessThanOrEqual(3500);
      expect(f.rides.riding).toBe(f.car);
      expect(f.car.m.pace).toBe(0);
      expect(f.car.mesh.uuid).toBe(original);
      expect(boatStart.every(([r, x, z]) => r.m.x === x && r.m.z === z)).toBe(true);
      expect(f.ambient.traffic.every(c => c.mesh.position.z === c.lane)).toBe(true);
    } finally { f.close(); }
  }, 20_000);

  it("rearms after a voluntary reverse without towing or detaching", async () => {
    const f = occupiedTown(hz);
    try {
      await f.board(f.rides.find("east"));
      f.stage(84, -72.8, Math.PI);
      for (let i = 0; i < 4 * hz; i++) {
        f.frame({ ...go, throttle: -1 });
        f.supported();
        if (i > 0 && !f.inspect().active) break;
      }
      expect(f.inspect().band).toBe("dry");
      expect(f.inspect().active).toBe(false);
      expect(f.inspect().reason).toBeNull();
      expect(f.rides.riding).toBe(f.car);
      expect(f.car.m.z).toBeGreaterThan(-72.8);
    } finally { f.close(); }
  });

  it.each(["roofed", "open"])("presents a %s wet exit outside on the first frame, preserves the ride and reboards", async model => {
    const f = occupiedTown(hz);
    try {
      await f.board(model === "roofed" ? f.cars[0] : f.rides.find("east"));
      f.stage(128, -75, Math.PI);
      f.frame(go);
      expect(f.inspect().active).toBe(true);
      const brakes = { ...go, brake: true }, original = f.car.mesh.uuid;
      f.car.m.speed = 2;
      expect(f.rides.leave()).toBe(true);
      expect(f.rides.riding).toBeNull();
      expect(f.player.root.visible).toBe(true);
      expect(f.left).toBe(1);
      expect(Math.abs(f.player.root.position.x - f.car.m.x)).toBeGreaterThan(f.car.m.spec.wide);
      f.supported();
      for (let i = 0; f.inspect().active && i <= hz * 3.5; i++) {
        expect(f.rides.leave()).toBe(false);
        f.frame(brakes);
        f.supported();
      }
      f.dryPair();
      expect(f.car.mesh.uuid).toBe(original);
      expect(f.left).toBe(1);
      expect(f.saved).toBeDefined();
      const restart = f.saved!;
      const home = { ...f.car.home };
      f.rides.resetPosition(f.car, home);
      f.player.root.position.set(restart.x, restart.y, restart.z);
      expect(f.rides.near(restart.x, restart.z)).toBe(f.car);
      f.dryPair();
      await f.board(f.car);
      expect(f.player.root.visible).toBe(model === "open");
    } finally { f.close(); }
  }, 20_000);
});

it("uses only the first valid boarding to index the fleet and guards an inland basin while loading or unready", async () => {
  const plan = await RIDES.loadCarWater!();
  let resolve!: (plan: CarWaterPlan) => void;
  const pending = new Promise<CarWaterPlan>(r => { resolve = r; });
  const load = vi.fn(() => pending);
  const f = occupiedTown(20, { ...RIDES, loadCarWater: load });
  try {
    const car = f.rides.find("east")!;
    f.rides.prefetchWater(car, f.adapter);
    await Promise.resolve();
    expect(load).not.toHaveBeenCalled();
    expect(f.rides.water).toBeUndefined();
    expect(Reflect.get(f.rides, "waterFleet")).toBeUndefined();
    await f.board(car, false);
    expect(load).toHaveBeenCalledTimes(1);
    f.stage(-104.65, -20, Math.PI);
    for (let i = 0; i < 4 * 20; i++) f.frame(go);
    expect(f.car.m.z).toBeGreaterThan(-27 + f.car.m.spec.half - 0.1);
    expect(read(f.car.m.x, f.car.m.z, f.car.m.heading).band).toBe("dry");
    f.rides.abandon();
    f.rides.prefetchWater(car, f.adapter);
    resolve(plan);
    await pending;
    await new Promise(r => setTimeout(r, 10));
    expect(f.rides.water).toBeUndefined();
    expect(Reflect.get(f.rides, "waterFleet")).toBeUndefined();
    expect(load).toHaveBeenCalledTimes(1);
    await f.board(car);
    expect(load).toHaveBeenCalledTimes(2);
    expect(Reflect.get(f.rides, "waterFleet")).toHaveLength(f.cars.length);
    expect(f.inspect().enabled).toBe(true);
  } finally { f.close(); }

  // A plan with no usable mainland leases must protect an otherwise accessible basin.
  const short = occupiedTown(20, {
    ...RIDES, loadCarWater: async () => ({ ...plan, areas: [], mainland: { ...plan.mainland, z1: -60 } }),
  });
  try {
    await short.board(short.rides.find("east"));
    expect(short.inspect().enabled).toBe(false);
    short.stage(-104.65, -20, Math.PI);
    for (let i = 0; i < 4 * 20; i++) short.frame(go);
    expect(short.car.m.z).toBeGreaterThan(-27 + short.car.m.spec.half - 0.1);
    expect(short.inspect().active).toBe(false);
  } finally { short.close(); }
}, 20_000);

it("keeps the PC pier rails solid through bumper yaw and lands after an unsupported back-lip trial", async () => {
  const f = occupiedTown(60);
  try {
    await f.board(f.rides.find("east"));
    f.stage(-30, -70, 0.42);
    for (let i = 0; i < 52; i++) {
      f.frame(go);
      expect(f.inspect().band).toBe("dry");
      expect(f.car.mesh.position.y).toBeGreaterThanOrEqual(0.3);
      expect(solidHits(f.col, { x: f.car.m.x, z: f.car.m.z, rot: f.car.m.heading }, { half: 2.26, wide: 0.99 })).toEqual([]);
    }
    expect(f.car.m.x).toBeLessThan(-29.5);
    f.stage(-30, -90.5, Math.PI);
    f.frame();
    expect(f.inspect().phase).toBe("float");
    f.supported();
    f.frame(null, 3600, true);
    expect(f.inspect().active).toBe(false);
    expect(f.inspect().fallback).toBe(true);
    expect(f.car.m.pace).toBe(0);
  } finally { f.close(); }
});

describe.each([60, 20])("PC basin support and deadlines at %i Hz", hz => {
  it("enters the cenote from the open grounds and blocks the hotel straight run on real children", async () => {
    const f = occupiedTown(hz);
    try {
      await f.board(f.cars.find(c => c.model === "garbage"));
      f.stage(-104.65, -20, Math.PI);
      for (let i = 0; i < 3.5 * hz; i++) {
        f.frame(go);
        f.supported();
      }
      expect(f.car.m.z).toBeGreaterThan(-28);
      expect(f.car.m.z).toBeLessThan(-24);
      expect(f.car.m.pace).toBeLessThan(0.1);
      expect(f.inspect().reason).toBeNull();
      f.stage(-106, -34.5, Math.PI / 2);
      f.frame();
      expect(f.inspect().band).toBe("float");
      f.supported();
      f.frame(null, 3601, true);
      expect(f.inspect().active).toBe(false);
      expect(f.inspect().fallback).toBe(true);
      expect(f.car.m.pace).toBe(0);
      expect(waterY(f.car.m.x, f.car.m.z, 0)).toBeNull();

      f.stage(-128.726, -14.251, -0.72257);
      for (let i = 0; i < 3 * hz && !f.rides.water!.returning; i++) {
        f.frame(go);
        f.supported();
      }
      expect(f.inspect().region).toBe("cenote");
      expect(f.car.m.x).toBeLessThan(-130);
      expect(f.inspect().band).toBe("float");
      expect(f.inspect().wheelDepths.some(d => d >= 0.85)).toBe(true);
      f.frame(null, 3601, true);
      expect(f.rides.riding).toBe(f.car);
      expect(f.inspect().active).toBe(false);
      expect(waterY(f.car.m.x, f.car.m.z, 0)).toBeNull();
    } finally { f.close(); }
  }, 20_000);

  it.each([1, 2])("revalidates both pairs and hands back on the first frame after losing %i reservations", async count => {
    const f = occupiedTown(hz);
    try {
      await f.board(f.rides.find("east"));
      f.stage(84, -63, Math.PI);
      f.frame();
      const spares = f.inspect().spares;
      expect(spares).toHaveLength(2);
      expect(Math.hypot(spares[1].x - spares[0].x, spares[1].z - spares[0].z)).toBeGreaterThan(9);
      f.stage(-96, -81, Math.PI);
      f.frame();
      const started = f.now;
      expect(f.inspect().phase).toBe("float");
      const reserved = f.inspect().spares;
      const brakes = { ...go, brake: true };
      f.frame(brakes);
      expect(f.rides.leave()).toBe(true);
      expect(f.rides.leave()).toBe(false);
      expect(f.left).toBe(1);
      for (const p of reserved.slice(0, count)) f.col.addBox(p.x, p.z, 2, 2, "blocked-reserve");
      expect(f.inspect().active).toBe(true);
      f.frame(brakes, 3600, true);
      expect(f.inspect().active).toBe(false);
      expect(f.now).toBeGreaterThan(started + 3500);
      f.dryPair();
      expect(f.car.m.pace).toBe(0);
      expect(f.left).toBe(1);
      expect(f.ambient.waterReservations).toHaveLength(0);
      expect(f.snaps.at(-1)?.covered).toBe(true);
      expect(f.snaps.at(-1)?.foot).toEqual(f.player.root.position);
      expect(f.fades.at(-1)).toBe("opaque");
      if (count === 1) {
        expect(f.car.m.x).toBeCloseTo(reserved[1].x);
        expect(f.car.m.z).toBeCloseTo(reserved[1].z);
      }
      f.frame();
      expect(f.fades.at(-1)).toBe("reveal");
    } finally { f.close(); }
  }, 20_000);
});

it("rebuilds a fresh first town pose at the checked restart neighborhood while preserving the old dent and fleet entry", async () => {
  const f = occupiedTown(60);
  try {
    await f.board();
    const car = f.car;
    f.stage(125, -51.4, Math.PI / 2 + 0.45);
    for (let i = 0; i < 240 && !f.rides.crashes.info(car); i++) f.frame(go);
    const damage = f.rides.crashes.info(car);
    expect(damage?.dentCount).toBeGreaterThan(0);
    const oldUUID = car.mesh.uuid;
    f.stage(128, -75, Math.PI);
    const footprint = Reflect.get(f.rides, "modeCars").get(car);
    const ledges = footprint.surfaces;
    expect(ledges.length).toBeGreaterThan(0);
    f.frame();
    expect(f.rides.leave()).toBe(true);
    expect(footprint.surfaces).toBe(ledges);
    f.frame(null, 3601, true);
    f.dryPair();
    expect(footprint.surfaces).not.toBe(ledges);
    expect(car.mesh.uuid).toBe(oldUUID);
    expect(f.rides.crashes.info(car)).toEqual(damage);
    expect(f.rides.modeCarPieces(128, -75)).toHaveLength(0);
    const parked = f.rides.modeCarPieces(car.m.x, car.m.z);
    expect(parked.length).toBeGreaterThan(0);
    expect(parked.every(p => f.rides.carUnder(p) === car)).toBe(true);

    const saved = f.saved!;
    expect(saved).toBeDefined();
    const reload = occupiedTown(60);
    try {
      const restored = reload.rides.find(car.id)!;
      reload.player.root.position.set(saved.x, floorY(saved.x, saved.z), saved.z);
      expect(reload.rides.find(car.id)?.mesh.uuid).not.toBe(oldUUID);
      expect(reload.rides.riding).toBeNull();
      expect(reload.rides.water).toBeUndefined();
      expect(reload.player.root.visible).toBe(true);
      expect(waterY(saved.x, saved.z, 0)).toBeNull();
      expect(footHits(reload.col, saved)).toEqual([]);
      expect(reload.rides.near(saved.x, saved.z)).toBe(restored);
      expect(Math.hypot(saved.x - restored.home.x, saved.z - restored.home.z)).toBeLessThan(4);
      await reload.board(restored);
      expect(reload.rides.riding).toBe(restored);
    } finally { reload.close(); }
  } finally { f.close(); }
}, 20_000);

it("lets a deliberate handoff own its destination and settles the old car before disposal", async () => {
  const f = occupiedTown(60);
  try {
    await f.board(f.rides.find("east"));
    f.stage(-96, -81, Math.PI);
    f.frame(go);
    expect(f.inspect().band).toBe("float");
    expect(f.rides.leave()).toBe(true);
    const transferTo = new Vector3(130, 0, 20);
    f.player.root.position.copy(transferTo);
    f.disable();
    f.rides.abandon();
    expect(f.player.root.position).toEqual(transferTo);
    expect(waterY(f.car.m.x, f.car.m.z, 0)).toBeNull();
    expect(f.car.m.pace).toBe(0);
    expect(f.ambient.waterReservations).toHaveLength(0);
    expect(f.inspect().active).toBe(false);
    expect(f.fades.at(-1)).toBe("clear");
    f.rides.disposeWater();
    expect(f.rides.water).toBeUndefined();
    expect(Reflect.get(f.rides, "waterFleet")).toBeUndefined();
  } finally { f.close(); }
}, 20_000);

it("checks the real restart door and neighborhood of every stock curb and parked car", async () => {
  const f = occupiedTown(60);
  try {
    const plan = await RIDES.loadCarWater!();
    const clearance = new CarWaterClearance(plan, {
      rides: f.rides.list, parked: f.cars, fixedHulls: f.rides.sea.circles,
      colliders: f.col, ambient: f.ambient, peopleClear: f.adapter.peopleClear,
    });
    for (const r of [...f.rides.list, ...f.cars]) {
      if (r.kind !== "car") continue;
      const foot = { x: 0, y: 0, z: 0, rot: 0, swim: 0 };
      expect(clearance.restartFoot(r, foot), r.id).toBe(true);
      expect(footHits(f.col, foot), r.id).toEqual([]);
      expect(waterY(foot.x, foot.z, 0), r.id).toBeNull();
      expect(f.rides.near(foot.x, foot.z), r.id).toBe(r);
    }
  } finally { f.close(); }
});

it("keeps a supported deck dry and uses the wet-door exit when its edge falls into water", async () => {
  const f = occupiedTown(60);
  try {
    await f.board(f.rides.find("east"));
    DECKS.push({ x0: 124.5, x1: 131.5, z0: -77.5, z1: -75.3, y: 0.71 });
    f.stage(128, -76.4, Math.PI / 2);
    f.frame();
    expect(f.inspect().band).toBe("dry");
    expect(f.car.mesh.position.y).toBeCloseTo(0.71, 5);
    expect(f.rides.leave()).toBe(true);
    expect(f.inspect().reason).toBe("exit");
    expect(f.rides.riding).toBeNull();
    expect(f.player.root.visible).toBe(true);
    expect(Math.abs(f.player.root.position.z - f.car.m.z)).toBeGreaterThan(f.car.m.spec.wide);
    f.present();
    f.supported();
    f.frame(null, 3601, true);
    f.dryPair();
    expect(f.inspect().active).toBe(false);
    expect(f.left).toBe(1);
  } finally { f.close(); }
});

it("returns at the wet deadline under a continuous held brake and crosses the real malecón opening", async () => {
  const f = occupiedTown(60);
  try {
    await f.board(f.rides.find("east"));
    f.stage(84, -55, Math.PI);
    for (let i = 0; i < 7 * 60 && f.inspect().band === "dry"; i++) f.frame(go);
    expect(f.inspect().band).toBe("shallow");
    expect(f.car.m.x).toBeCloseTo(84, 6);
    expect(f.car.m.z).toBeLessThan(-68.65);
    const wet = f.now - f.inspect().wetAge * 1000, brakes = { ...go, brake: true };
    for (let i = 0; i <= 7 * 60 && f.inspect().active; i++) {
      f.frame(brakes);
      f.supported();
    }
    expect(f.inspect().reason).toBe("wet-limit");
    expect(f.inspect().active).toBe(false);
    expect(f.now - wet).toBeLessThanOrEqual(7000);
    expect(f.rides.riding).toBe(f.car);
    expect(f.car.m.pace).toBe(0);
  } finally { f.close(); }
});

it("leaves a rejected load dry and retries on a fresh eligible boarding only", async () => {
  let attempts = 0;
  const f = occupiedTown(20, {
    ...RIDES, loadCarWater: () => ++attempts === 1 ? Promise.reject(new Error("fixture load")) : RIDES.loadCarWater!(),
  });
  try {
    const boat = f.rides.find("muelle")!;
    expect(f.rides.waterEligible(boat)).toBe(false);
    expect(f.rides.board(boat, false)).toBe(true);
    f.rides.prefetchWater(boat, f.adapter);
    expect(attempts).toBe(0);
    f.rides.abandon();
    await f.board(f.rides.find("east"), false);
    await expect.poll(() => attempts).toBe(1);
    expect(f.rides.water).toBeUndefined();
    expect(Reflect.get(f.rides, "waterFleet")).toBeUndefined();
    f.stage(-104.65, -20, Math.PI);
    for (let i = 0; i < 4 * 20; i++) f.frame(go);
    expect(read(f.car.m.x, f.car.m.z, f.car.m.heading).band).toBe("dry");
    f.rides.abandon();
    await f.board(f.rides.find("east"));
    expect(attempts).toBe(2);
    expect(f.inspect().enabled).toBe(true);
  } finally { f.close(); }
});

describe.each([60, 20])("PC car water effects at %i Hz", hz => {
  it("draws displaced fans, both indexed tracks and a raised two-sided bow on the muted coast run", async () => {
    const drops = new Splashes(), cueTimes: number[] = [];
    const splash = vi.fn((_strength: number) => { cueTimes.push(f.time); }), wash = vi.fn<() => void>();
    const f = occupiedTown(hz, RIDES, { drops, splash, wash });
    try {
      expect(f.rides.water).toBeUndefined();
      expect(drops.inspectCarDrops()).toMatchObject({ carDrops: 0, pointDrawCount: 0, ringVisible: false });
      await f.board(f.rides.find("east"));
      expect(f.inspect()).toMatchObject({ sprayEvents: 0, foamId: null, foamDrawCount: 0 });
      f.stage(128, -55, Math.PI);
      const sprays: NonNullable<ReturnType<typeof f.inspect>["lastSpray"]>[] = [];
      const bands = new Set<string>(), miss = new Set<number>();
      const camera = new PerspectiveCamera(48, 390 / 844, 0.1, 100);
      let trails = false, bow = false, peak = 0, pointId = "";
      for (let i = 0; i < 12 * hz && !f.rides.water!.returning; i++) {
        f.frame(go);
        const w = f.inspect(), { m } = f.car, wetFx = drops.inspectCarDrops()!;
        bands.add(w.band);
        peak = Math.max(peak, wetFx.carDrops);
        pointId ||= wetFx.pointsId;
        expect(wetFx.pointsId).toBe(pointId);
        expect(wetFx.carDrops).toBeLessThanOrEqual(96);
        expect(wetFx.totalDrops).toBeLessThanOrEqual(420);
        if (w.sprayEvents > sprays.length) {
          const fan = w.lastSpray!, tire = w.samples[fan.tire + 1];
          expect(fan).toMatchObject({ x: tire.x, z: tire.z, y: tire.liveSurface, kind: 1 });
          expect(tire.depth).toBeGreaterThanOrEqual(sprays.length ? W.shallowLeave : W.shallowEnter);
          expect(Math.hypot(fan.x - m.x, fan.z - m.z)).toBeGreaterThan(1.3);
          expect(fan.drops).toBe(fan.strength === 0.55 ? 10 : 7);
          expect(wetFx.pointsVisible).toBe(true);
          expect(wetFx.particles.some(p => p.kind === 1 && p.y > fan.y && Math.hypot(p.x - fan.x, p.z - fan.z) < 0.3)).toBe(true);
          sprays.push(fan);
        }
        if (w.band === "body-deep") miss.add(f.rides.revs);
        if (!w.foamVisible) continue;
        const foam = f.rides.group.getObjectByName("car-water-foam") as Mesh;
        const { geometry, material } = foam;
        expect(foam.uuid).toBe(w.foamId);
        expect(foam.castShadow).toBe(false);
        expect(material).toMatchObject({ type: "MeshBasicMaterial", vertexColors: true, depthWrite: false });
        expect(geometry.drawRange).toEqual({ start: w.foamDrawStart, count: w.foamDrawCount });
        const { position, color } = geometry.attributes;
        expect(geometry.index?.count).toBe(192);
        const perSide = new Set<number>();
        for (let at = w.foamDrawStart; at < w.foamDrawStart + w.foamDrawCount; at += 3) {
          const a = geometry.index!.getX(at), b = geometry.index!.getX(at + 1), c = geometry.index!.getX(at + 2);
          const crossY = (position.getZ(b) - position.getZ(a)) * (position.getX(c) - position.getX(a))
            - (position.getX(b) - position.getX(a)) * (position.getZ(c) - position.getZ(a));
          expect(crossY).toBeGreaterThan(0);
          if (a < 9) continue;
          for (const j of [a, b, c]) {
            const x = position.getX(j), z = position.getZ(j);
            expect(position.getY(j)).toBeCloseTo(waterY(x, z, f.time)! + 0.035, 5);
            expect(color.getW(j)).toBeGreaterThanOrEqual(0);
            const dx = x - m.x, dz = z - m.z;
            expect(dx * m.fx + dz * m.fz).toBeLessThan(-1);
            perSide.add(Math.sign(dx * m.fz - dz * m.fx));
          }
        }
        if (!trails && w.band === "shallow" && perSide.size === 2) {
          trails = true;
          expect(w.leftTrack.length).toBeGreaterThan(1);
          expect(w.rightTrack.length).toBeGreaterThan(1);
          expect(Math.max(w.leftTrack.length, w.rightTrack.length)).toBeLessThanOrEqual(8);
        }
        if (!bow && w.bowVertices === 9) {
          bow = true;
          expect(trails).toBe(true);
          expect(w.band).toBe("body-deep");
          expect(w.foamDrawStart).toBe(0);
          camera.position.set(m.x - m.fx * 8.5, 3, m.z - m.fz * 8.5);
          camera.lookAt(m.x, 0.5, m.z);
          camera.updateMatrixWorld();
          const centre = new Vector3().fromBufferAttribute(position, 4);
          const fore = Math.max(m.spec.half, CONVERTIBLE_BUMPER.offset + CONVERTIBLE_BUMPER.depth / 2) + 0.12;
          expect((centre.x - m.x) * m.fx + (centre.z - m.z) * m.fz).toBeCloseTo(fore, 4);
          expect(centre.y - waterY(centre.x, centre.z, f.time)!).toBeCloseTo(0.10, 5);
          foam.updateWorldMatrix(true, false);
          const ray = new Raycaster(centre.clone().add(new Vector3(0, 1, 0)), new Vector3(0, -1, 0));
          expect(ray.intersectObject(foam).length).toBeGreaterThan(0);
          for (const vertex of [1, 7]) {
            const p = new Vector3().fromBufferAttribute(position, vertex);
            const side = (p.x - m.x) * m.fz - (p.z - m.z) * m.fx;
            expect(Math.abs(side)).toBeCloseTo(m.spec.wide + 0.45, 4);
            expect((p.x - m.x) * m.fx + (p.z - m.z) * m.fz).toBeCloseTo(fore - 0.85, 4);
            const projected = p.project(camera);
            expect(Math.abs(projected.x)).toBeLessThan(1);
            expect(Math.abs(projected.y)).toBeLessThan(1);
          }
        }
      }
      expect([...bands]).toEqual(["dry", "shallow", "body-deep", "float"]);
      expect(bow && trails).toBe(true);
      expect(peak).toBeGreaterThan(30);
      expect(miss).toEqual(new Set([0.06, 0.36]));
      expect(splash.mock.calls[0]).toEqual([0.35]);
      expect(splash.mock.calls.slice(1).flat().some(k => k === 0.22 || k === 0.30)).toBe(true);
      for (let i = 1; i < cueTimes.length; i++) expect(cueTimes[i] - cueTimes[i - 1]).toBeGreaterThanOrEqual(0.65 - 1e-7);
      expect(wash).toHaveBeenCalledTimes(1);
      const crossover = sprays.findIndex(fan => fan.strength === 0.55);
      expect(crossover).toBeGreaterThan(0);
      expect(sprays[crossover].time - sprays[crossover - 1].time).toBeLessThan(0.10 + 1 / hz + 1e-5);
      for (const strength of [0.20, 0.55]) {
        const matches = sprays.filter(fan => fan.strength === strength);
        expect(matches.length).toBeGreaterThan(3);
        expect(new Set(matches.map(fan => fan.side))).toEqual(new Set([-1, 1]));
        const step = strength === 0.20 ? 0.14 : 0.10;
        for (let i = 1; i < matches.length; i++) expect(Math.abs(matches[i].time - matches[i - 1].time - step)).toBeLessThan(1 / hz + 1e-5);
      }

      const seatedCoughs = new Set<number>();
      for (let i = 0; f.inspect().active && i < 3.5 * hz; i++) {
        f.frame();
        const w = f.inspect();
        if (w.coughBeat) seatedCoughs.add(f.rides.revs);
      }
      expect(seatedCoughs).toEqual(new Set([0.28, 0.16]));
      expect(f.inspect()).toMatchObject({ active: false, drainEmissions: 36, coughEvents: 2 });
      for (let i = 0; i < hz; i++) f.frame();
      expect(f.inspect()).toMatchObject({ carDrops: 0, foamVisible: false, foamDrawCount: 0, pointDrawCount: 0 });
    } finally { f.close(); }
  }, 20_000);

  it("streams four drops at a time from the actual exited car and preserves ordinary drops on teardown", async () => {
    const drops = new Splashes(), drop = vi.spyOn(drops, "carDrop");
    const f = occupiedTown(hz, RIDES, { drops });
    try {
      await f.board();
      f.stage(128, -75, Math.PI);
      f.car.m.speed = 2;
      f.frame(go);
      const foam = f.rides.group.getObjectByName("car-water-foam") as Mesh;
      const id = f.car.mesh.uuid;
      expect(f.rides.leave()).toBe(true);
      expect(f.rides.riding).toBeNull();
      const before = f.now;
      f.frame(null, 500, true);
      expect(f.now - before).toBeLessThan(3500);
      f.dryPair();
      expect(f.inspect()).toMatchObject({ active: false, fallback: true, foamDrawCount: 0, drainObject: id, drainEmissions: 4, drainLive: 4 });
      const { m, mesh } = f.car;
      for (const [x, y, z, vx, vz] of drop.mock.calls) {
        const along = (x - m.x) * m.fx + (z - m.z) * m.fz;
        const side = (x - m.x) * m.fz - (z - m.z) * m.fx;
        expect(Math.abs(along + 0.25 * m.spec.half / W.referenceHalf)).toBeCloseTo(0.04);
        expect(Math.abs(side)).toBeCloseTo(m.spec.wide + 0.03);
        expect(y).toBeCloseTo(mesh.position.y + 0.44);
        expect((vx * m.fz - vz * m.fx) * Math.sign(side)).toBeCloseTo(0.2);
      }
      for (const p of drops.inspectCarDrops()!.particles) expect(p.vy).toBeCloseTo(-1.1 - 9.5 / hz);
      f.player.root.position.x += 3;
      const nod = new Map<number, number>();
      for (let i = 0; i < Math.ceil(hz * 0.66); i++) {
        f.frame();
        const w = f.inspect();
        expect(f.rides.revs).toBe(0);
        if (w.coughBeat) nod.set(w.coughBeat, Math.max(nod.get(w.coughBeat) ?? 0, mesh.rotation.x));
        for (const p of drops.inspectCarDrops()!.particles) expect(p.y).toBeGreaterThan(floorY(p.x, p.z));
      }
      expect(nod.get(1)).toBeGreaterThan(0.01);
      expect(nod.get(2)).toBeGreaterThan(0.007);
      expect(drop).toHaveBeenCalledTimes(36);
      expect(f.inspect()).toMatchObject({ drainEmissions: 36, coughEvents: 2, pointsVisible: true });
      expect(f.car.mesh.uuid).toBe(id);
      drops.burst(-106, -0.12, -30, 0, 0, 0.9);
      drops.update(0, f.time, { x: -106, y: -0.12, z: -30 }, 1);
      const releaseGeometry = vi.fn(), releaseMaterial = vi.fn();
      if (foam) {
        foam.geometry.addEventListener("dispose", releaseGeometry);
        (foam.material as Material).addEventListener("dispose", releaseMaterial);
      }
      f.rides.disposeWater();
      expect(drops.inspectCarDrops()).toMatchObject({ carDrops: 0, drainLive: 0, totalDrops: 12, ringVisible: true });
      expect(f.rides.group.getObjectByName("car-water-foam")).toBeUndefined();
      expect(releaseGeometry).toHaveBeenCalledTimes(1);
      expect(releaseMaterial).toHaveBeenCalledTimes(1);
    } finally { f.close(); }
  }, 20_000);
});

it("uses only the wet cenote side, switches leading and trailing axles on reverse, and clears on a dry board or a jump", () => {
  const drops = new Splashes();
  const f = occupiedTown(60, RIDES, { drops });
  const { m } = f.car;
  const fx = new CarWaterEffects({ effectRoot: f.rides.group, drops }, f.col.boxes.filter(b => b.carRim || b.deckRail));
  const p = createCarWaterProbe(), dt = 1 / 60;
  let time = 0;
  const frame = (speed: number) => {
    time += dt;
    m.speed = speed;
    m.x += m.fx * speed * dt; m.z += m.fz * speed * dt;
    probeCarWater(m, time, p.band === "float" ? "dry" : p.band, p);
    fx.drive(f.car, p, time, dt);
    drops.update(dt, time, null, 0);
    return CarWaterEffects.inspect(fx, time);
  };
  try {
    // Use the built northeast approach and an oblique heading, with exactly one side wet.
    let gap: Point & { heading: number } | undefined;
    for (const heading of [-0.4, -1.1, -0.2, -1.3]) {
      for (let i = 0; i < 40 && !gap; i++) {
        const x = -132 + 0.05 * i, z = -10.2 - 0.05 * i;
        const a = read(x, z, heading, 0, m.spec);
        const b = read(x + 0.08 * Math.sin(heading), z + 0.08 * Math.cos(heading), heading, 0, m.spec);
        if ([a, b].every(probe => probe.band === "shallow" && tires(probe).filter(t => t.depth >= W.shallowEnter).length === 1)) {
          gap = { x, z, heading };
        }
      }
    }
    expect(gap).toBeDefined();
    m.set(gap!.x, gap!.z, gap!.heading);
    const first = frame(0).lastSpray;
    expect(first).not.toBeNull();
    expect(first!.y).toBe(0.04);
    expect(p.maxTireDepth).toBeGreaterThan(0.34);
    expect(Math.min(p.frontLeft.depth, p.rearLeft.depth)).toBe(0);
    expect(Math.min(p.frontRight.depth, p.rearRight.depth)).toBe(0);
    expect(tires(p).filter(t => t.depth >= W.shallowEnter).length).toBe(1);
    for (let i = 0; i < 8; i++) {
      const w = frame(0.5);
      expect(w.lastSpray?.side).toBe(first!.side);
      expect(w.bowVertices).toBe(0);
    }

    m.set(84, -75.9, Math.PI / 2);
    for (let i = 0; i < 18; i++) frame(2.1);
    let w = frame(2.1);
    expect(w).toMatchObject({ bowVertices: 9, foamDrawStart: 0 });
    expect(w.lastSpray!.tire).toBeLessThan(2);
    expect(w.leftTrack.at(-1)).toMatchObject({ x: p.rearLeft.x, z: p.rearLeft.z });
    expect(w.rightTrack.at(-1)).toMatchObject({ x: p.rearRight.x, z: p.rearRight.z });
    const index = (f.rides.group.getObjectByName("car-water-foam") as Mesh).geometry.index;
    w = frame(-1.4);
    expect(w.wakeSegments).toBe(0);
    for (let i = 0; i < 20; i++) w = frame(-1.4);
    expect(w.lastSpray!.tire).toBeGreaterThanOrEqual(2);
    expect(w.wakeSegments).toBeGreaterThan(0);
    expect(w.leftTrack.at(-1)).toMatchObject({ x: p.frontLeft.x, z: p.frontLeft.z });
    expect(w.rightTrack.at(-1)).toMatchObject({ x: p.frontRight.x, z: p.frontRight.z });
    const foam = f.rides.group.getObjectByName("car-water-foam") as Mesh;
    expect(foam.geometry.index).toBe(index);

    m.set(-30, -70, 0);
    w = frame(0);
    expect(floorY(m.x, m.z)).toBe(0.30);
    expect(waterY(m.x, m.z, time)).not.toBeNull();
    expect(w).toMatchObject({ wakeSegments: 0, bowVertices: 0, foamDrawCount: 0, leftTrack: [], rightTrack: [] });
    expect(drops.inspectCarDrops()).toMatchObject({ carDrops: 0, pointDrawCount: 0 });
  } finally { fx.dispose(); f.close(); }
});

it("uses the hotel water sheet and shares one capped batch with wading, ball misses and the boat ring", () => {
  const fixture = buildTownFixture();
  const drops = new Splashes();
  const points = drops.group.getObjectByName("water-drops") as Points;
  const ring = drops.group.getObjectByName("water-ring") as Mesh;
  const at = { x: -104.65, y: -0.12, z: -27.8 };
  const miss = () => {
    const round = new PoolRound(true, 0, () => 0);
    for (let i = 0; i < 1000; i++) if (round.update(1 / 60)?.kind === "drop") {
      drops.burst(-106, -0.12, -29.85, 0, 0, 0.9);
      return;
    }
    throw new Error("The pool round did not miss a learner pass");
  };
  try {
    expect(waterY(at.x, at.z, 2)).toBe(at.y);
    expect(floorY(at.x, at.z)).toBeGreaterThan(-1);
    expect(floorY(-104.65, -30.25)).toBe(-0.88);
    expect(floorY(-106, -36)).toBe(-1.97);
    expect(points.material).toMatchObject({ depthWrite: true, depthTest: true });
    expect(ring.material).toMatchObject({ depthWrite: false, depthTest: true });
    expect(drops.group.children).toHaveLength(2);
    expect(points.geometry.attributes.position.count).toBe(420);
    expect(drops.inspectCarDrops()).toMatchObject({ totalDrops: 0, pointDrawCount: 0 });
    drops.boatRing(0, 1, { x: -30, z: -92, heading: 0, pace: 3, slip: 0 }, { match: true });
    expect(drops.inspectCarDrops()).toMatchObject({ carDrops: 0, pointDrawCount: 0, ringVisible: true });

    miss();
    drops.update(0, 2, at, 1);
    expect(drops.inspectCarDrops()).toMatchObject({ carDrops: 0, totalDrops: 12, pointDrawCount: 12, ringVisible: true });
    expect(points.visible).toBe(true);

    drops.carDrop(-104.65, 0.32, -30.25, 0, 0);
    drops.carDrop(-30, 0.74, -70, 0, 0);
    drops.carDrop(-106, 0.32, -36, 0, 0);
    drops.carDrop(-112, 0.32, -32, 0, 0);
    drops.update(0, 2, at, 1);
    expect(drops.inspectCarDrops()!.particles.map(p => p.vy)).toEqual(Array(4).fill(expect.closeTo(-1.1, 6)));
    for (let i = 1; i <= 8; i++) {
      drops.update(0.05, 2 + 0.05 * i, at, 1);
      for (const p of drops.inspectCarDrops()!.particles) {
        expect(p.y).toBeGreaterThan(Math.max(floorY(p.x, p.z), waterY(p.x, p.z, 2 + 0.05 * i) ?? -Infinity));
      }
    }
    expect(drops.inspectCarDrops()).toMatchObject({ carDrops: 0, drainLive: 0, ringVisible: true });

    for (let i = 0; i < 22; i++) {
      drops.carFan(at.x, at.y, at.z, 0, -1, 0.55);
      drops.carDrop(-106, 0.32, -36, 0, 0);
    }
    drops.update(0, 3, at, 1);
    expect(drops.inspectCarDrops()).toMatchObject({ carDrops: 96, capacity: 420, pointsVisible: true, ringVisible: true });
    for (let i = 0; i < 34; i++) drops.burst(-106, -0.12, -29.85, 0, 0, 1);
    drops.update(0, 3, at, 1);
    expect(drops.inspectCarDrops()).toMatchObject({ carDrops: 0, totalDrops: 420, pointDrawCount: 420, ringVisible: true });
    drops.carFan(at.x, at.y, at.z, 0, -1, 0.20);
    drops.clearCarDrops();
    expect(drops.inspectCarDrops()).toMatchObject({ carDrops: 0, totalDrops: 413, ringVisible: true });
    drops.clearDrops();
    drops.boatRing(0, 4, { x: -30, z: -92, heading: 0, pace: 3, slip: 0 }, { match: true });
    expect(drops.inspectCarDrops()).toMatchObject({ pointDrawCount: 0, ringVisible: true });
    expect(ring.position.z).toBe(-92.6);
  } finally { fixture.restore(); }
});

it("leaves real wheel ribbons in the hotel steps without crossing the coping", () => {
  const drops = new Splashes();
  const f = occupiedTown(60, RIDES, { drops });
  const ride = f.rides.find("east")!, m = ride.m, probe = createCarWaterProbe();
  const fx = new CarWaterEffects({ effectRoot: f.rides.group, drops }, f.col.boxes.filter(b => b.carRim || b.deckRail));
  const dt = 1 / 60;
  try {
    m.set(-104.65, -26.55, Math.PI);
    m.speed = -0.65;
    const hotel = poolAt(-106, -32);
    let seen = false;
    for (let i = 0; i < 28; i++) {
      const time = i * dt;
      m.z += 0.65 * dt;
      probeCarWater(m, time, probe.band, probe);
      fx.drive(ride, probe, time, dt);
      drops.update(dt, time, null, 0);
      const w = CarWaterEffects.inspect(fx, time), batch = drops.inspectCarDrops()!;
      if (w.lastSpray) expect(w.lastSpray.y).toBe(-0.12);
      for (const p of batch.particles) expect(p.x).toBeLessThan(-103);
      if (!w.foamVisible) continue;
      const foam = f.rides.group.getObjectByName("car-water-foam") as Mesh;
      const { geometry } = foam, { start, count } = geometry.drawRange;
      seen ||= w.leftTrack.length > 1 && w.rightTrack.length > 1 && batch.pointsVisible;
      expect(probe.band).toBe("shallow");
      expect(start).toBe(24);
      for (let j = start; j < start + count; j++) {
        const i = geometry.index!.getX(j), { position } = geometry.attributes;
        const x = position.getX(i), z = position.getZ(i);
        expect(poolAt(x, z)).toBe(hotel);
        expect(floorY(x, z)).toBeLessThan(-0.12);
        expect(position.getY(i)).toBeCloseTo(-0.12 + 0.035, 6);
      }
    }
    expect(seen).toBe(true);
  } finally { fx.dispose(); f.close(); }
});
