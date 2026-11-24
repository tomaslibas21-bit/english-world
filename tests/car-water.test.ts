import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Vector3 } from "three";
import { CAR_WATER, createCarWaterProbe, probeCarWater, sampleCarWater, wetDriveSettings } from "../src/game/rides/carWater";
import { BOAT, CAR, Motion, pushOutOfBox } from "../src/game/rides/drive";
import { settleRoadExit, townAsphalt, townCarWaterGround, townGround } from "../src/game/rides/ground";
import { BAY, DECKS, FLOORS, POOLS, SEA_LEVEL, SHORE, floorY, sandY, waterY } from "../src/game/water";
import { carModelEntry } from "../src/game/world/carModels";
import { SEA_Z, TRAFFIC_LANES, WORLD } from "../src/game/world/layout";
import { exitCoordinates, exitHalf, exitToTown } from "../src/game/world/roadExit";
import { RIDES } from "../src/game/world/rides";
import { buildTown } from "../src/game/world/town";
import { Colliders, type AABB } from "../src/game/world/util";

const dt = 1 / 60;
const go = { throttle: 1, steer: 0, brake: false };
const shore = RIDES.carWater.approach;
const wetGround = () => townCarWaterGround(RIDES.carWater);

let savedDecks: typeof DECKS, savedFloors: typeof FLOORS, savedPools: typeof POOLS;
beforeEach(() => { savedDecks = DECKS.slice(); savedFloors = FLOORS.slice(); savedPools = POOLS.slice(); });
afterEach(() => {
  DECKS.splice(0, DECKS.length, ...savedDecks);
  FLOORS.splice(0, FLOORS.length, ...savedFloors);
  POOLS.splice(0, POOLS.length, ...savedPools);
  vi.unstubAllGlobals();
});

describe("car water samples", () => {
  const read = (x: number, z: number, heading = Math.PI, time = 0) => {
    const out = createCarWaterProbe();
    probeCarWater({ x, z, heading, spec: CAR }, time, "dry", out);
    return out;
  };

  it("reads dry land, the painted pond, and the real beach profile", () => {
    for (const [x, z] of [[shore.x, shore.z], [108, -36]]) {
      const out = read(x, z);
      expect(out.band).toBe("dry");
      expect(out.centre).toMatchObject({ floor: 0, stillSurface: null, liveSurface: null, depth: 0, liveDepth: 0 });
    }
    const slope = read(24, -70.6);
    expect(slope.centre.floor).toBe(sandY(24, -70.6));
    expect(slope.centre.depth).toBe(0);
    expect(slope.frontLeft.depth).toBeGreaterThan(0.05);
    expect(slope.band).toBe("shallow");
    expect(slope.pitch).toBeCloseTo(Math.atan2(slope.rearLeft.floor + slope.rearRight.floor - slope.frontLeft.floor - slope.frontRight.floor, 4 * 1.36));
    expect(slope.pitch).toBeGreaterThan(0);
    for (const [z, metres] of [[-72, 0.13], [-73, 0.31], [-75, 0.36], [SHORE.limit, 0.41], [-79, 0.79]]) {
      const { centre } = read(24, z);
      expect(centre.depth).toBeCloseTo(metres, 2);
      expect(centre.depth).toBeCloseTo(SEA_LEVEL - floorY(24, z), 12);
      expect(centre.liveSurface).toBe(waterY(24, z, 0));
      expect(centre.liveSurface).not.toBe(SEA_LEVEL);
      expect(centre.liveDepth).toBeCloseTo(Math.max(0, centre.liveSurface! - centre.floor), 12);
    }
  });

  it("scales and rotates all tire coordinates for a different body", () => {
    const out = createCarWaterProbe();
    probeCarWater({ x: 10, z: 20, heading: Math.PI / 2, spec: { half: 2.15 * 1.5, wide: 0.95 * 1.25 } }, 0, "dry", out);
    const wheels = [out.frontLeft, out.frontRight, out.rearLeft, out.rearRight];
    const expected = [[12.04, 18.9], [12.04, 21.1], [7.96, 18.9], [7.96, 21.1]];
    wheels.forEach(({ x, z }, i) => { expect(x).toBeCloseTo(expected[i][0], 10); expect(z).toBeCloseTo(expected[i][1], 10); });
  });

  it("keeps dry boards under each sample and latches at a sheer edge with both wheels on an axle", () => {
    DECKS.push({ x0: -40, x1: -20, z0: -88, z1: -72, y: 0.30 });
    const deck = read(-30, -86);
    expect(deck.band).toBe("dry");
    expect(deck.centre).toMatchObject({ floor: 0.30, liveSurface: waterY(-30, -86, 0), depth: 0, liveDepth: 0 });
    const edge = read(-30, -87);
    expect(edge.centre.depth).toBe(0);
    expect(edge.frontLeft.depth).toBeGreaterThan(0.85);
    expect(edge.frontRight.depth).toBeGreaterThan(0.85);
    expect(edge.rearLeft.depth + edge.rearRight.depth).toBe(0);
    expect(edge.band).toBe("float");
    expect(edge.pitch).toBe(CAR_WATER.maxPitch);

    const rearFirst = read(-30, -87, 0);
    expect(rearFirst.centre.depth).toBe(0);
    expect(rearFirst.frontLeft.depth + rearFirst.frontRight.depth).toBe(0);
    expect(Math.min(rearFirst.rearLeft.depth, rearFirst.rearRight.depth)).toBeGreaterThan(0.85);
    expect(rearFirst.band).toBe("float");
    expect(rearFirst.pitch).toBe(-CAR_WATER.maxPitch);

    const mixed = read(-39.5, -83);
    expect(mixed.centre.depth).toBe(0);
    expect(mixed.frontLeft.depth).toBeGreaterThan(0.85);
    expect(mixed.rearLeft.depth).toBeGreaterThan(0.85);
    expect(mixed.frontRight.depth + mixed.rearRight.depth).toBe(0);
    expect(mixed.band).toBe("shallow");
  });

  it("uses the live surface for clearance while dry boards suppress wet contact even at a crest", () => {
    const x = 24, z = -83;
    DECKS.push({ x0: 22, x1: 26, z0: -85, z1: -81, y: SEA_LEVEL + 0.01 });
    const out = createCarWaterProbe(), sample = out.centre;
    let crest = -Infinity;
    for (let t = 0; t < 30; t += 0.1) {
      sampleCarWater(x, z, t, sample);
      crest = Math.max(crest, sample.liveSurface!);
      expect(sample.liveDepth).toBe(0);
      expect(sample.depth).toBe(0);
    }
    expect(crest).toBeGreaterThan(sample.floor + 0.1);
  });

  it("resamples a settled pose immediately across a discontinuity and leaves float latched", () => {
    DECKS.push({ x0: -40, x1: -20, z0: -88, z1: -72, y: 0.3 });
    const m = new Motion(CAR, "car"), out = createCarWaterProbe(), front = out.frontLeft;
    m.set(-30, -86.65, Math.PI);
    probeCarWater(m, 0, out.band, out);
    expect(out.band).toBe("float"); // the front tires have already crossed the edge
    m.set(-30, -86.63, Math.PI);
    probeCarWater(m, 0, "dry", out);
    expect(out.band).toBe("dry");
    m.step(dt, go);
    m.settle((p) => { p.z -= 0.03; });
    probeCarWater(m, dt, out.band, out);
    expect(out.frontLeft).toBe(front);
    expect(out.centre.depth).toBe(0);
    expect(out.band).toBe("float");
    m.set(24, -64, 0);
    probeCarWater(m, 2 * dt, out.band, out);
    expect(out.band).toBe("float");
    expect(out.maxTireDepth).toBe(0);
  });

  it("reads the pool's surface, bed, steps and deck in floor order", () => {
    POOLS.push({ x: 300, z: 300, r: 6, y: 0.04, depth: 3.4 });
    FLOORS.push({ x0: 299, x1: 305, z0: 298, z1: 302, y: (x) => x < 301 ? 0.4 : -0.36 });
    DECKS.push({ x0: 302.5, x1: 303.5, z0: 299.5, z1: 300.5, y: 0.30 });
    expect(read(300, 300, 0, 8).band).toBe("dry");
    const stair = read(302, 300, 0, 8);
    expect(stair.centre).toMatchObject({ floor: -0.36, stillSurface: 0.04, liveSurface: 0.04 });
    expect(stair.centre.depth).toBeCloseTo(0.4);
    expect(stair.centre.liveDepth).toBe(stair.centre.depth);
    expect(stair.band).toBe("body-deep");
    expect(read(303, 300).centre).toMatchObject({ floor: 0.30, depth: 0 });
    expect(read(297, 300).band).toBe("float");
    expect(read(300, 310).centre.stillSurface).toBeNull();
  });

  it("uses both hysteresis thresholds and lets live waves cross them without a band change", () => {
    let depth = 0;
    POOLS.push({ x: 300, z: 300, r: 6, y: 0, depth: 3 });
    FLOORS.push({ x0: 297, x1: 303, z0: 297, z1: 303, y: () => -depth });
    const out = createCarWaterProbe();
    const pose = { x: 300, z: 300, heading: 0, spec: CAR };
    for (const [d, band] of [
      [0.049, "dry"], [0.05, "shallow"], [0.025, "shallow"], [0.024, "dry"],
      [0.34, "body-deep"], [0.28, "body-deep"], [0.279, "shallow"], [0.339, "shallow"],
      [0.849, "body-deep"], [0.85, "float"], [0, "float"],
    ] as const) {
      depth = d;
      probeCarWater(pose, 0, out.band, out);
      expect(out.band).toBe(band);
    }
    for (const [z, band, threshold] of [[-70.5, "shallow", 0.05], [-75, "body-deep", 0.34], [-77.5, "body-deep", 0.85]] as const) {
      let min = Infinity, max = 0;
      let previous = "dry" as typeof out.band;
      for (let t = 0; t < 30; t += 0.1) {
        probeCarWater({ ...pose, x: 24, z, heading: Math.PI }, t, previous, out);
        expect(out.band).toBe(band);
        previous = out.band;
        const live = (threshold === 0.34 ? out.centre : out.frontLeft).liveDepth;
        min = Math.min(min, live); max = Math.max(max, live);
      }
      expect(min).toBeLessThan(threshold);
      expect(max).toBeGreaterThan(threshold);
    }
  });
});

describe("opt-in car motion", () => {
  it.each([
    ["shallow", 1, 4.2], ["shallow", -1, 2.6],
    ["body-deep", 1, 2.1], ["body-deep", -1, 1.4],
  ] as const)("holds the %s cap with throttle %s, including initial slip", (band, throttle, cap) => {
    const wet = wetDriveSettings(band);
    const controls = { ...go, throttle, steer: 0.35 };
    for (const initial of [0, throttle > 0 ? 10 : 5]) {
      const m = new Motion(CAR, "car");
      m.speed = throttle * initial;
      m.slip = initial ? 2.4 : 0;
      for (let frame = 0; frame < 180; frame++) {
        const { x, z, pace } = m;
        m.step(dt, controls, Infinity, false, Infinity, wet);
        expect(m.pace).toBeLessThanOrEqual(Math.max(cap, pace - 18 * dt) + 1e-9);
        expect(Math.hypot(m.x - x, m.z - z) / dt).toBeCloseTo(m.pace, 9);
        expect(Math.sign(m.speed)).toBe(throttle);
      }
      expect(m.pace).toBeCloseTo(cap, 2);
    }
  });

  it("reduces both the steering target and the measured yaw at the same speed and input", () => {
    const c = { ...go, steer: 0.8 }, speed = 1.6;
    for (const [band, gain] of [["shallow", 0.85], ["body-deep", 0.45]] as const) {
      const dry = new Motion(CAR, "car"), wet = new Motion(CAR, "car");
      dry.speed = wet.speed = speed;
      dry.step(dt, c);
      wet.step(dt, c, Infinity, true, Infinity, wetDriveSettings(band));
      expect(wet.steer).toBeCloseTo(dry.steer * gain, 10);
      expect(wet.yaw).toBeGreaterThan(0);
      expect(wet.yaw).toBeLessThan(dry.yaw);
      expect(Math.abs(wet.heading)).toBeLessThan(Math.abs(dry.heading));
      expect(wet.heading).toBeCloseTo(-wet.yaw * dt, 10);
    }
  });

  it("honors the reverse cap when a near-lateral car turns across its velocity", () => {
    const m = new Motion(CAR, "car");
    m.speed = 0.01;
    m.slip = 3;
    m.steer = 0.85;
    m.step(0.05, { ...go, throttle: 0.03, steer: 1 }, Infinity, true, Infinity, wetDriveSettings("shallow"));
    expect(m.speed).toBeLessThan(0);
    expect(m.pace).toBeLessThanOrEqual(2.6 + 1e-9);
    expect(Math.hypot(m.x, m.z) / 0.05).toBeCloseTo(m.pace, 10);
  });

  it("keeps smaller model caps, full braking and pedestrian gap and care limits", () => {
    const settings = wetDriveSettings("body-deep");
    const slow = Object.freeze({ ...CAR, max: 1.15, town: 0.9, back: 0.65 });
    for (const [throttle, cap] of [[1, 1.15], [-1, 0.65]]) {
      const m = new Motion(slow, "car");
      m.slip = 0.3;
      for (let frame = 0; frame < 300; frame++) {
        m.step(dt, { ...go, throttle }, Infinity, true, Infinity, settings);
        expect(m.pace).toBeLessThanOrEqual(cap + 1e-9);
        if (throttle > 0) expect(m.pace).toBeLessThanOrEqual(m.top + 1e-9);
      }
      expect(m.speed).toBeCloseTo(throttle * cap, 8);
    }
    for (const sign of [1, -1]) {
      const m = new Motion(CAR, "car");
      m.speed = sign * 1.3;
      m.step(dt, { ...go, throttle: sign, brake: true }, Infinity, true, Infinity, settings);
      expect(m.speed).toBeCloseTo(sign * (1.3 - CAR.brake * dt), 10);
    }
    const m = new Motion(CAR, "car");
    for (let i = 0; i < 120; i++) m.step(dt, go, CAR.half + CAR.clear + 0.05, true, Infinity, settings);
    expect(m.pace).toBeCloseTo(1);
    for (let i = 0; i < 120; i++) m.step(dt, go, CAR.half + CAR.clear, true, Infinity, settings);
    expect(m.pace).toBe(0);
    const fastWater = { ...settings!, forward: 8 };
    for (let i = 0; i < 120; i++) m.step(dt, go, Infinity, true, 4, fastWater);
    expect(m.pace).toBeCloseTo(CAR.careful);
  });

  it("allows a power dip without sacrificing capped progress", () => {
    const nominal = wetDriveSettings("body-deep")!;
    const miss = { ...nominal, power: CAR_WATER.sputter.missPower };
    const normal = new Motion(CAR, "car"), dipping = new Motion(CAR, "car");
    normal.step(dt, go, Infinity, true, Infinity, nominal);
    dipping.step(dt, go, Infinity, true, Infinity, miss);
    expect(dipping.speed).toBeGreaterThan(0);
    expect(dipping.speed).toBeCloseTo(normal.speed * miss.power);
    for (let i = 0; i < 180; i++) dipping.step(dt, go, Infinity, true, Infinity, miss);
    expect(dipping.speed).toBeCloseTo(nominal.forward);
  });

  it("matches regular road motion on dry and ignores the settings on boats", () => {
    for (const [spec, kind] of [[CAR, "car"], [BOAT, "boat"]] as const) {
      const ordinary = new Motion(spec, kind), optIn = new Motion(Object.freeze({ ...spec }), kind);
      const settings = wetDriveSettings(kind === "car" ? "dry" : "body-deep");
      for (let frame = 0; frame < 640; frame++) {
        const c = { throttle: frame < 500 ? 1 : -1, steer: frame < 320 ? 0 : 0.8, brake: frame >= 460 && frame < 500 };
        const road = frame < 410 || frame > 580;
        ordinary.step(dt, c, Infinity, road);
        optIn.step(dt, c, Infinity, road, Infinity, settings);
        expect(optIn).toEqual(ordinary);
        if (frame === 319) expect(optIn.pace).toBeGreaterThan(spec.town);
      }
    }
  });
});

describe("driving envelope and collision permissions", () => {
  it("extends north to the current bay and keeps the dry mainland edges", () => {
    const dry = townGround(), wet = wetGround();
    expect(wet.rects).toEqual([{ ...dry.rects[0], z0: BAY.z0 }]);
    for (const z of [SHORE.top, SHORE.limit, WORLD.minZ, BAY.z0]) {
      expect(wet.has(shore.x, z)).toBe(true);
      expect(dry.has(shore.x, z)).toBe(false);
    }
    for (const [x, z] of [[shore.x, BAY.z0 - 0.01], [WORLD.minX, -85], [WORLD.maxX, -85], [0, WORLD.maxZ]]) {
      expect(wet.has(x, z)).toBe(false);
    }
    expect(wet.nearest(shore.x, BAY.z0 - 10)).toEqual({ x: shore.x, z: BAY.z0 });
  });

  it("honors the road strip only when admitted and continues to clamp its sides", () => {
    const rad = CAR.wide;
    const point = new Vector3(exitHalf(0) + 2, 0, 0).applyMatrix4(exitToTown);
    const admitted = point.clone();
    settleRoadExit(wetGround(), admitted, rad, true);
    const exit = exitCoordinates(admitted.x, admitted.z);
    expect(exit.s).toBeCloseTo(0, 10);
    expect(exit.x).toBeCloseTo(exitHalf(0) - rad, 10);
    settleRoadExit(wetGround(), point, rad, false);
    expect(point.x).toBeCloseTo(WORLD.minX + rad + 0.4, 10);
  });

  it("keeps sea, split geometry and the town edge independently selectable", () => {
    const c = new Colliders();
    c.addBox(0, 0, 2, 2, "sea");
    c.addBox(10, 0, 2, 2, "town-edge");
    c.addBox(20, 0, 2, 2, "building");
    c.boxes[2].split = true;
    c.addBox(30, 0, 2, 2);
    c.addCircle(40, 0, 1);
    c.addCircle(50, 0, 1);
    c.circles[0].split = true;
    const moved = (x: number, jumper?: boolean, openTownEdge?: boolean, ignoreSea?: boolean) => {
      const p = new Vector3(x + 0.5, 7, 0);
      c.resolve(p, 0.5, jumper, openTownEdge, ignoreSea);
      expect(p.y).toBe(7);
      return p.x !== x + 0.5;
    };
    const tags = [0, 10, 20, 30, 40, 50];
    expect(tags.map((x) => moved(x))).toEqual([true, true, true, true, true, true]);
    expect(tags.map((x) => moved(x, false, false, true))).toEqual([false, true, true, true, true, true]);
    expect(tags.map((x) => moved(x, false, true))).toEqual([true, false, true, true, true, true]);
    expect(tags.map((x) => moved(x, true))).toEqual([false, true, false, true, false, true]);
    expect(tags.map((x) => moved(x, false, true, true))).toEqual([false, false, true, true, true, true]);
  });
});

function buildTestTown() {
  const draw = () => {};
  const gradient = () => ({ addColorStop: draw });
  const canvas = new Proxy({
    measureText: (text: string) => ({ width: text.length * 9 }), createLinearGradient: gradient, createRadialGradient: gradient,
  }, { get: (target, key) => Reflect.get(target, key) ?? draw });
  vi.stubGlobal("document", { createElement: () => ({ getContext: () => canvas }) });
  return buildTown();
}

function footprint(x: number, z: number, rot: number, half: number, wide: number): AABB {
  const s = Math.abs(Math.sin(rot)), c = Math.abs(Math.cos(rot));
  const w = c * wide + s * half, h = c * half + s * wide;
  return { minX: x - w, maxX: x + w, minZ: z - h, maxZ: z + h };
}

function pointBoxDistance(x: number, z: number, b: AABB) {
  return Math.hypot(Math.max(b.minX - x, x - b.maxX, 0), Math.max(b.minZ - z, z - b.maxZ, 0));
}

function boxDistance(a: AABB, b: AABB) {
  return Math.hypot(Math.max(a.minX - b.maxX, b.minX - a.maxX, 0), Math.max(a.minZ - b.maxZ, b.minZ - a.maxZ, 0));
}

it("clears Maple Harbor's real geometry on the shore approach and at all three paired landings", () => {
  const { colliders, parkedCars, group } = buildTestTown();
  const sizes = parkedCars.placements.map(({ model }) => carModelEntry(model).collisionBox);
  const half = Math.max(CAR.half, ...sizes.map((s) => s.length / 2));
  const wide = Math.max(CAR.wide, ...sizes.map((s) => s.width / 2));
  const fleet = [
    ...RIDES.cars.map((p) => footprint(p.x, p.z, p.rot, CAR.half, CAR.wide)),
    ...parkedCars.placements.map((p, i) => footprint(p.x, p.z, p.rot, sizes[i].length / 2, sizes[i].width / 2)),
  ];
  const boatBoxes = RIDES.boats.map((p) => footprint(p.x, p.z, p.rot, BOAT.half, BOAT.wide));
  for (const o of group.children) {
    if (!o.userData.rideBoat) continue;
    const { half, wide } = o.userData.rideBoat;
    boatBoxes.push(footprint(o.position.x, o.position.z, o.rotation.y, half, wide));
  }
  const solid = [...colliders.boxes.filter((b) => b.tag !== "sea"), ...fleet, ...boatBoxes];
  const rectClearance = (area: AABB) => Math.min(...solid.map((b) => boxDistance(area, b)),
    ...colliders.circles.map(({ x, z, r }) => pointBoxDistance(x, z, area) - r));
  const pointClearance = (x: number, z: number) => Math.min(...solid.map((b) => pointBoxDistance(x, z, b)),
    ...colliders.circles.map((c) => Math.hypot(x - c.x, z - c.z) - c.r));

  const atSea = new Vector3(shore.x, 0, SEA_Z - 1);
  const dryContact = atSea.clone();
  colliders.resolve(dryContact, wide);
  expect(dryContact.z).toBeCloseTo(SEA_Z + wide);
  colliders.resolve(atSea, wide, false, false, true);
  expect(atSea.z).toBe(SEA_Z - 1);
  const north = new Vector3(shore.x, 0, WORLD.minZ);
  colliders.resolve(north, wide);
  expect(north.z).not.toBe(WORLD.minZ);
  north.z = WORLD.minZ;
  colliders.resolve(north, wide, false, false, true);
  expect(north.z).toBe(WORLD.minZ);
  for (const [x, z] of [[-41.2, -80], [-18.8, -80], [-30, -88.2], [-32.15, -67.5]]) {
    const p = new Vector3(x, 0, z);
    colliders.resolve(p, wide, false, false, true);
    expect(Math.hypot(p.x - x, p.z - z)).toBeGreaterThan(0.5);
  }
  const out = createCarWaterProbe();
  probeCarWater({ x: -30, z: -70, heading: 0, spec: CAR }, 0, "dry", out);
  expect(out.centre.floor).toBe(0.30);
  expect(out.band).toBe("dry");
  probeCarWater({ x: 91.5, z: -83.1, heading: Math.PI / 2, spec: CAR }, 0, "dry", out);
  expect(out.centre.floor).toBe(0.78);
  expect(out.band).toBe("dry");

  const hull = Object.freeze({ ...RIDES.boats[0], half: BOAT.half, wide: BOAT.wide });
  const beside = { x: hull.x + hull.wide + wide / 2, z: hull.z };
  expect(pushOutOfBox(beside, wide, hull.x, hull.z, hull.rot, hull.half, hull.wide)).toBe(true);
  expect(beside.x).toBeCloseTo(hull.x + hull.wide + wide, 10);
  expect(pushOutOfBox(beside, wide - 1e-9, hull.x, hull.z, hull.rot, hull.half, hull.wide)).toBe(false);

  const m = new Motion({ ...CAR, half, wide }, "car"), asphalt = townAsphalt(RIDES.lots), ground = wetGround();
  m.set(shore.x, shore.z, shore.rot);
  probeCarWater(m, 0, "dry", out);
  const bands = [{ band: out.band, z: m.z }];
  const p = new Vector3();
  const settle = (q: { x: number; z: number }, rad: number) => {
    settleRoadExit(ground, q, rad, false);
    colliders.resolve(p.set(q.x, 0, q.z), rad, false, false, true);
    q.x = p.x; q.z = p.z;
  };
  for (let i = 1; i <= 600 && out.band !== "float"; i++) {
    m.step(dt, go, Infinity, asphalt.has(m.x, m.z), Infinity, wetDriveSettings(out.band));
    expect(m.settle(settle)).toBe(0);
    probeCarWater(m, i * dt, out.band, out);
    if (out.band !== bands[bands.length - 1].band) bands.push({ band: out.band, z: m.z });
  }
  expect(bands.map(({ band }) => band)).toEqual(["dry", "shallow", "body-deep", "float"]);
  expect(m.z).toBeLessThan(SHORE.limit);
  const sweep = footprint(shore.x, shore.z, shore.rot, half, wide);
  // Sweep the largest outline as far as the centre alone would latch, including cars with shorter wheelbases.
  const sweepEnd = SHORE.limit - 3;
  sampleCarWater(shore.x, sweepEnd, 0, out.centre);
  expect(out.centre.depth).toBeGreaterThan(CAR_WATER.floatEnter);
  sweep.minZ = sweepEnd - half;
  expect(rectClearance(sweep)).toBeGreaterThan(0);

  const dry = townGround(), radius = CAR_WATER.footRadius;
  const checkDry = (x: number, z: number) => {
    expect(dry.has(x, z)).toBe(true);
    const y = floorY(x, z);
    expect(y).toBe(0);
    if (waterY(x, z, 0) !== null) expect(y).toBeGreaterThan(SEA_LEVEL + 0.265);
  };
  for (const { x, z, rot } of RIDES.carWater.landings) {
    expect(rot).toBe(0); // the full rectangle and both side steps are axis-aligned here
    const area = footprint(x, z, rot, half, wide);
    expect(rectClearance(area), `car at ${x}, ${z}`).toBeGreaterThan(0);
    for (const l of TRAFFIC_LANES) if (x >= l.from - half && x <= l.to + half) expect(Math.abs(z - l.z)).toBeGreaterThan(half + 1.15);
    for (let ix = 0; ix <= 10; ix++) for (let iz = 0; iz <= 24; iz++) {
      checkDry(area.minX + 2 * wide * ix / 10, area.minZ + 2 * half * iz / 24);
    }
    for (const side of [-1, 1]) {
      const footX = x + side * (wide + CAR_WATER.footOffset);
      expect(pointClearance(footX, z), `foot circle at ${footX}, ${z}`).toBeGreaterThan(radius);
      const doorX = x + side * wide;
      expect(rectClearance({ minX: Math.min(footX, doorX) - radius, maxX: Math.max(footX, doorX) + radius,
        minZ: z - radius, maxZ: z + radius })).toBeGreaterThan(0);
      checkDry(footX, z);
      for (let i = 0; i < 16; i++) {
        const a = i * Math.PI / 8;
        checkDry(footX + Math.sin(a) * radius, z + Math.cos(a) * radius);
      }
    }
  }
});
