import { Euler, PerspectiveCamera, Quaternion, Vector3 } from "three";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NPCS } from "@/content/npcs";
import { Ambient } from "@/game/ambient";
import { SALTO, ways } from "@/game/cave/groundsPlan";
import { createCharacter } from "@/game/characters";
import { NavGrid } from "@/game/nav";
import { CAR_WATER, carFootprintOverlapsBox, carWaterClearanceY, createCarWaterProbe, probeCarWater,
  sampleCarWater, supportedCarWaterHeight, sweepCarFootprintBox, wetDriveSettings } from "@/game/rides/carWater";
import { BOAT, CAR, Motion, aheadOnArc, pushOutOfBox, type Drivable } from "@/game/rides/drive";
import { isTownCarDryMainland, settleRoadExit, townAsphalt, townCarWaterGround, townGround } from "@/game/rides/ground";
import { Rides } from "@/game/rides/Rides";
import { convertibleGeometry } from "@/game/rides/shapes";
import { BAY, DECKS, FLOORS, POOLS, SEA_LEVEL, SHORE, floorY, poolAt, poolBedY, sandY, seaBedY, waterY } from "@/game/water";
import { carModelEntry } from "@/game/world/carModels";
import { OUTDOOR_NPCS, SEA_Z, TRAFFIC_LANES, WORLD } from "@/game/world/layout";
import { MALECON } from "@/game/world/mexican";
import { POOL_KIDS } from "@/game/world/pool";
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
