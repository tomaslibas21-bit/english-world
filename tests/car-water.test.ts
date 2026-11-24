import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FrontSide, Group, PerspectiveCamera, Raycaster, Vector2, Vector3, type Mesh, type MeshBasicMaterial, type Points } from "three";
import { Game } from "../src/game/Game";
import { Gait, Hop, Steer } from "../src/game/movement";
import { CarWaterEffects, coughBeat, drainMotor, drainPitch, sputterMiss } from "../src/game/rides/carWaterEffects";
import { CarWaterClearance, CarWaterRecovery, type CarWaterHost } from "../src/game/rides/carWaterRecovery";
import { Rides, type Ride, type RideHost } from "../src/game/rides/Rides";
import type { GameCharacter } from "../src/game/characters";
import type { NavGrid } from "../src/game/nav";
import { CAR_WATER, createCarWaterProbe, probeCarWater, sampleCarWater, wetDriveSettings } from "../src/game/rides/carWater";
import { BOAT, CAR, Motion, pushOutOfBox } from "../src/game/rides/drive";
import { settleRoadExit, townAsphalt, townCarWaterGround, townGround } from "../src/game/rides/ground";
import { BAY, DECKS, FLOORS, POOLS, SEA_LEVEL, SHORE, Splashes, floorY, sandY, waterY } from "../src/game/water";
import { carModelEntry } from "../src/game/world/carModels";
import { SEA_Z, TRAFFIC_LANES, WORLD } from "../src/game/world/layout";
import { exitCoordinates, exitHalf, exitToTown } from "../src/game/world/roadExit";
import { RIDES } from "../src/game/world/rides";
import { buildTown } from "../src/game/world/town";
import { Colliders, type AABB } from "../src/game/world/util";
import { useStore } from "../src/state/store";

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

function recoveryFixture(town = buildTestTown(), occupied: { x: number; z: number; radius: number }[] = [],
  { carId = RIDES.cars[0].id, startTime = 0, onArrest, onDetach, ...effects }: Pick<CarWaterHost, "drops" | "effectRoot" | "splash" | "wash">
    & { carId?: string; startTime?: number; onArrest?: CarWaterHost["arrest"]; onDetach?: CarWaterHost["detach"] } = {}) {
  const makeRide = (id: string, x: number, z: number, rot: number, spec = CAR, kind: Ride["kind"] = "car"): Ride => {
    const m = new Motion(spec, kind), mesh = new Group();
    m.set(x, z, rot);
    mesh.position.set(x, floorY(x, z), z);
    mesh.rotation.set(0, rot, 0, "YXZ");
    return { id, kind, m, mesh, home: { x, z, rot }, owners: [], chat: null, awayT: 0, thanked: false, phase: 0, tint: "",
      sus: { y: 0, vy: 0, p: 0, vp: 0, road: [], side: [] } };
  };
  const parked = town.parkedCars.placements.map((v, i) => {
    const b = carModelEntry(v.model).collisionBox;
    return makeRide(`parked-${i}`, v.x, v.z, v.rot, { ...CAR, wide: b.width / 2, half: b.length / 2 });
  });
  const rides = RIDES.cars.map((v) => makeRide(v.id, v.x, v.z, v.rot));
  for (const v of RIDES.boats) rides.push(makeRide(v.id, v.x, v.z, v.rot, { ...CAR, wide: BOAT.wide, half: BOAT.half }, "boat"));
  for (const o of town.group.children) {
    const b = o.userData.rideBoat;
    if (b) rides.push(makeRide(b.id, o.position.x, o.position.z, o.rotation.y, { ...CAR, half: b.half, wide: b.wide }, "boat"));
  }
  const car = [...rides, ...parked].find((r) => r.id === carId)!, player = new Group();
  const damage = new WeakMap([[car, { side: "front", depth: 0.32 }]]);
  const originalDamage = damage.get(car);
  let clock = 1000, time = startTime, riding: Ride | null = car, eligible = true, detaches = 0, handbacks = 0, covered = false;
  let opacity = 0, reveal = false, swimPose = 0;
  let handback: { opacity: number; snap: boolean; reserved: number; x: number; z: number } | undefined;
  const fadeEvents: Parameters<CarWaterHost["fade"]>[0][] = [];
  const saves: { x: number; z: number }[] = [];
  let leases: Parameters<CarWaterHost["reserve"]>[0] = [];
  const clearance = new CarWaterClearance({
    dry: townGround(), colliders: town.colliders, parked, rides, fixedHulls: [],
    ambient: { carWaterTrafficClear: () => true, carWaterPeopleClear: () => true },
    peopleClear: (clear) => occupied.every(({ x, z, radius }) => clear(x, z, radius)),
  });
  const foot: CarWaterHost["foot"] = (p) => {
    player.position.set(p.x, p.y, p.z);
    player.rotation.y = p.rot;
    swimPose = p.swim;
  };
  const present = (r: Ride, pitch = 0, roll = 0, lift = 0) => {
    water.pose(r, time, lift, pitch, roll, false);
    if (riding === r) player.position.set(0.43, 0.22, -0.34).applyEuler(r.mesh.rotation).add(r.mesh.position);
  };
  const water: CarWaterRecovery = new CarWaterRecovery(RIDES.carWater, {
    ...effects,
    eligible: (r) => eligible && r === car,
    driver: (r) => riding === r,
    reserve: (boxes) => { leases = boxes.slice(); },
    clearance,
    arrest: (r) => { const { m } = r; m.set(m.x, m.z, m.heading); onArrest?.(r); },
    place: (r, released, snap) => {
      present(r);
      if (released) {
        handbacks++;
        handback = { opacity, snap, reserved: leases.length, x: r.mesh.position.x, z: r.mesh.position.z };
      }
    },
    detach: (r, p) => {
      if (riding !== r) return;
      riding = null;
      detaches++;
      onDetach?.(r, p);
      foot(p, false);
    },
    foot,
    fade: (stage) => {
      fadeEvents.push(stage);
      if (stage === "cover") covered = true;
      if (stage === "opaque") opacity = 1;
      if (stage === "reveal") { covered = false; reveal = true; }
    },
    clearFade: () => { covered = reveal = false; opacity = 0; },
    save: () => {
      const p = water.safeSave();
      if (p) saves.push({ x: p.x, z: p.z });
    },
  }, () => clock);
  const f = {
    town, car, player, parked, rides, clearance, water, occupied, damage, originalDamage, fadeEvents, saves,
    get riding() { return riding; }, get detaches() { return detaches; },
    get swimPose() { return swimPose; },
    get handbacks() { return handbacks; }, get covered() { return covered; },
    get handback() { return handback; }, get opacity() { return opacity; },
    get leases() { return leases; }, get now() { return clock; }, get time() { return time; },
    begin: () => water.begin(car),
    present: (pitch = 0, roll = 0, lift = 0) => present(car, pitch, roll, lift),
    loseDriver: () => { riding = null; },
    handoff: () => { eligible = false; water.transfer(); },
    step(ms = 1000 / 60) {
      if (reveal) { opacity = 0; reveal = false; }
      clock += ms;
      time += Math.min(ms / 1000, 0.05);
      return water.tick(Math.min(ms / 1000, 0.05), time);
    },
    at(x: number, z: number, heading = Math.PI) {
      car.m.set(x, z, heading);
      if (!water.accepted(car, time)) present(car);
    },
    approach(z: number) {
      for (let at = -64; at > z && !water.returning; at -= 0.2) { f.step(); f.at(shore.x, at); }
      if (!water.returning) { f.step(); f.at(shore.x, z); }
    },
    exit: () => water.requestExit(car, null, time),
    run(ms: number) { for (let i = 0; i < Math.ceil(ms / (1000 / 60)); i++) f.step(); },
    dry() {
      expect(water.inspect().active).toBe(false);
      expect(car.m.pace).toBe(0);
      expect(car.m.steer).toBe(0);
      if (waterY(car.m.x, car.m.z, time) !== null) expect(floorY(car.m.x, car.m.z)).toBeGreaterThan(SEA_LEVEL + 0.265);
      expect(damage.get(car)).toBe(originalDamage);
      if (!riding) {
        const p = player.position;
        expect(p.y).toBeCloseTo(floorY(p.x, p.z));
        const dx = p.x - car.m.x, dz = p.z - car.m.z, s = car.m.fx, c = car.m.fz;
        const reach = Math.hypot(Math.max(0, Math.abs(dx * c - dz * s) - car.m.spec.wide), Math.max(0, Math.abs(dx * s + dz * c) - car.m.spec.half));
        expect(reach).toBeGreaterThanOrEqual(0.35);
        expect(reach).toBeLessThanOrEqual(1.45);
      }
    },
  };
  return f;
}

function expectSupported({ car: { mesh, m }, time }: ReturnType<typeof recoveryFixture>) {
  const { wide, half } = m.spec;
  const tireSide = 0.88 * wide / 0.95, tireAlong = 1.36 * half / 2.15;
  const samples = [[0, 0]];
  for (const s of [-1, 1]) for (const e of [-1, 1]) {
    samples.push([s * wide, e * half], [s * tireSide, e * tireAlong]);
  }
  for (const [side, along] of samples) {
    const { x, y, z } = mesh.localToWorld(new Vector3(side, 0, along));
    expect(y, `floor clearance at (${x}, ${z}), t=${time}, contact (${side}, ${along})`).toBeGreaterThanOrEqual(floorY(x, z) - 1e-8);
    const live = waterY(x, z, time);
    if (live !== null) expect(live - y).toBeLessThanOrEqual(0.42 + 1e-8);
  }
  expect(Math.abs(mesh.rotation.x)).toBeLessThanOrEqual(0.14 + 1e-8);
}

describe.each([60, 20])("beach support at %i Hz", (hz) => {
  const step = 1 / hz, ms = 1000 / hz;

  it.each([
    { x: 24, carId: RIDES.cars[0].id, assisted: false },
    { x: 76, carId: "parked-0", assisted: false },
    { x: -96, carId: RIDES.cars[0].id, assisted: false },
    { x: 24, carId: RIDES.cars[0].id, assisted: true },
  ])("supports the unblocked trip at x=$x through trail handback (assisted=$assisted)", ({ x, carId, assisted }) => {
    const root = new Group(), drops = new Splashes(), drop = vi.spyOn(drops, "carDrop");
    const f = recoveryFixture(undefined, [], { effectRoot: root, drops, carId });
    const { m, mesh } = f.car, asphalt = townAsphalt(RIDES.lots), ground = wetGround();
    const prev = new Vector3(), collision = new Vector3();
    const settle = (p: { x: number; z: number }, rad: number) => {
      settleRoadExit(ground, p, rad, false);
      f.town.colliders.resolve(collision.set(p.x, 0, p.z), rad, false, false, true);
      p.x = collision.x; p.z = collision.z;
    };
    f.begin(); f.at(x, -55);
    const frame = () => {
      f.step(ms);
      drops.update(step, f.time, null, 0);
    };
    for (let i = 0; i < hz * 7 && !f.water.returning; i++) {
      frame();
      m.step(step, go, Infinity, asphalt.has(m.x, m.z), Infinity, f.water.settings(go));
      expect(m.settle(settle)).toBe(0);
      if (!f.water.accepted(f.car, f.time, 1)) f.present();
      expectSupported(f);
    }
    expect(f.water.inspect()).toMatchObject({ reason: "depth", phase: "float" });
    const startZ = m.z, startTime = f.time, bob: number[] = [], coughs = new Set<number>();
    let noseLift = 0, towAge = 0, settleAge = 0, pitch = mesh.rotation.x;
    prev.copy(mesh.position);
    for (let i = 0; i < hz * 3.5 && f.water.returning; i++) {
      frame();
      const state = f.water.inspect();
      if (assisted && state.age >= 0.12 && f.riding) expect(f.exit()).toBe(true);
      expectSupported(f);
      const { x, y, z } = mesh.position;
      expect(Math.hypot(x - prev.x, z - prev.z), `${state.phase} at ${state.age}s (${state.fallbackReason})`).toBeLessThanOrEqual(8 * step + 0.001);
      expect(Math.abs(y - prev.y)).toBeLessThan(3.1 * step + 0.007);
      expect(Math.abs(mesh.rotation.x - pitch)).toBeLessThan(1.4 * step + 0.007);
      expect(mesh.rotation.x).toBeGreaterThanOrEqual(-0.09 - 1e-8);
      prev.copy(mesh.position);
      pitch = mesh.rotation.x;
      if (state.phase === "float" && state.age < 0.50) {
        expect(z).toBeCloseTo(startZ, 8);
        bob.push(y - waterY(x, z, f.time)!);
        noseLift = Math.max(noseLift, -pitch);
      }
      if (state.phase === "tow") towAge ||= state.age;
      if (state.phase === "settle" && !settleAge) {
        settleAge = state.age;
        expect(z - startZ).toBeGreaterThan(4);
        expect(waterY(x, z, f.time)).toBeNull();
        expect(state.drainLive).toBeGreaterThanOrEqual(4);
        expect(drop.mock.calls).toHaveLength(4);
        for (const side of [-1, 1]) {
          const stream = drop.mock.calls.filter(([px]) => Math.sign(px - x) === side);
          expect(stream).toHaveLength(2);
          for (const [px, py, , vx] of stream) {
            expect(Math.abs(px - x)).toBeCloseTo(m.spec.wide + 0.03, 6);
            expect(py).toBeCloseTo(y + 0.44, 6);
            expect(vx * side).toBeCloseTo(0.2, 6);
          }
        }
        const points = drops.group.getObjectByName("water-drops") as Points;
        const { start } = points.geometry.drawRange;
        const drawn = points.geometry.attributes.position;
        for (let i = 0; i < 4; i++) expect(drawn.getY(start + i)).toBeLessThan(y + 0.44);
      }
      if (state.coughBeat) coughs.add(state.motorSignalRevs);
    }
    expect(towAge).toBeGreaterThanOrEqual(0.50);
    expect(towAge).toBeLessThanOrEqual(0.50 + step + 1e-8);
    expect(settleAge).toBeGreaterThanOrEqual(2.35);
    expect(settleAge).toBeLessThanOrEqual(2.35 + step + 1e-8);
    expect(f.time - startTime - settleAge).toBeGreaterThanOrEqual(0.65 - 1e-8);
    expect(f.time - startTime - settleAge).toBeLessThanOrEqual(0.65 + step + 1e-8);
    expect(noseLift).toBeGreaterThan(0.055);
    expect(Math.max(...bob) - Math.min(...bob)).toBeGreaterThan(0.035);
    f.dry();
    expect(f.riding).toBe(assisted ? null : f.car);
    expect(f.handbacks).toBe(1);
    expect([...coughs]).toEqual([0.28, 0.16]);
    expect(f.water.inspect()).toMatchObject({ landing: "trail", fallback: false, drainEmissions: 36, coughEvents: 2 });
    for (let i = 0; i < hz; i++) frame();
    expect(f.water.inspect()).toMatchObject({ carDrops: 0, foamDrawCount: 0, pointDrawCount: 0 });
  });

  it.each([
    { x: 24, z: -72.20350423824208, startTime: 17.062, heading: Math.PI, assisted: false },
    { x: 76, z: -71.87360285757198, startTime: 4.55, heading: Math.PI, assisted: false, carId: "parked-0" },
    { x: 76, z: -72.19208411989892, startTime: 5.025, heading: Math.PI, assisted: true },
    { x: -96, z: -73.23729796422296, startTime: 33.98, heading: 0.42, assisted: false },
  ])("supports stopped shallows at ($x, $z) on both sides of the live waterline", ({ x, z, startTime, heading, assisted, carId }) => {
    const f = recoveryFixture(undefined, [], { startTime, carId });
    const clearance = () => waterY(x, z, f.time)! - floorY(x, z);
    expect(clearance()).toBeGreaterThan(0);
    expect(clearance()).toBeLessThan(0.002);
    f.begin(); f.at(x, z, heading);
    expect(f.water.inspect().active).toBe(true);
    f.present(0, 0.11, -0.04);
    expectSupported(f);
    if (assisted) expect(f.exit()).toBe(true);
    let exposed = false;
    for (let i = 0; i < hz * 4 && !f.handbacks; i++) {
      f.step(ms);
      if (!f.water.returning && !f.handbacks) f.at(x, z, heading);
      expectSupported(f);
      exposed ||= clearance() < 0;
    }
    expect(exposed).toBe(true);
    expect(f.water.inspect().reason).toBe(assisted ? "exit" : "wet-limit");
    if (assisted) f.dry();
    else expect(f.water.returning).toBe(true);
    expectSupported(f);
  });

  it("supports the west beach tow after a deep assisted exit", () => {
    const f = recoveryFixture(undefined, [], { startTime: 4.9 });
    f.begin();
    for (let z = -64; z > -82 && !f.water.returning; z -= 0.2) {
      f.step(ms); f.at(-96, z);
      expectSupported(f);
    }
    expect(f.water.inspect()).toMatchObject({ phase: "float", reason: "depth" });
    while (f.water.inspect().age < 0.12) { f.step(ms); expectSupported(f); }
    expect(f.exit()).toBe(true);
    expect(f.riding).toBeNull();
    let crossedShallows = false;
    for (let i = 0; i < hz * 3.5 && f.water.returning; i++) {
      f.step(ms);
      expectSupported(f);
      crossedShallows ||= f.car.m.x === -96 && f.car.m.z >= -74.79766597394219 && f.water.inspect().phase === "tow";
    }
    expect(crossedShallows).toBe(true);
    f.dry();
    expect(f.handbacks).toBe(1);
  });
});

describe.each([60, 20])("paired mainland handback at %i Hz", (hz) => {
  const ms = 1000 / hz;

  it.each([false, true])("holds the blocked pair until an opaque handback (assisted: %s)", (assisted) => {
    const f = recoveryFixture(undefined, [], { drops: new Splashes() });
    f.begin();
    f.at(-30, -90.5);
    const wetAt = f.now, deadline = wetAt + 3500;
    expect(f.water.inspect()).toMatchObject({ phase: "float", reason: "depth" });
    if (assisted) {
      expect(f.exit()).toBe(true);
      expect(f.riding).toBeNull();
      expect(f.water.assistedOnFoot).toBe(true);
    }
    const before = f.car.mesh.position.clone();
    let heldFoot: Vector3 | undefined;
    for (let i = 0; i < 3.5 * hz && f.water.returning; i++) {
      const previous = f.car.mesh.position.clone();
      expect(f.step(ms)).toBe(true);
      const state = f.water.inspect();
      if (state.secondsLeft === null) {
        expect(Math.abs(f.car.m.z - before.z)).toBeGreaterThan(5);
        break;
      }
      expect(f.now + 1000 * state.secondsLeft).toBeCloseTo(deadline, 6);
      expect(Math.hypot(f.car.m.x - previous.x, f.car.m.z - previous.z)).toBeLessThanOrEqual(8 / hz + 0.001);
      expect(f.car.m.z).toBe(before.z);
      if (state.phase === "fade") {
        expect(f.covered).toBe(true);
        if (assisted) {
          heldFoot ??= f.player.position.clone();
          expect(f.player.position.x).toBe(heldFoot.x);
          expect(f.player.position.z).toBe(heldFoot.z);
          expect(f.exit()).toBe(true);
        }
      }
    }
    f.dry();
    expect(f.now).toBeLessThanOrEqual(deadline);
    expect(f.now - wetAt).toBeLessThanOrEqual(7000);
    expect(f.fadeEvents).toEqual(["cover", "opaque", "reveal"]);
    expect(f.opacity).toBe(1);
    expect(f.handback).toEqual({ opacity: 1, snap: true, reserved: 2, x: f.car.m.x, z: f.car.m.z });
    expect(f.handbacks).toBe(1);
    expect(f.leases).toHaveLength(0);
    expect(f.water.owns(f.car)).toBe(false);
    expect(f.water.suppressInput).toBe(false);
    expect(f.water.assistedOnFoot).toBe(false);
    expect(f.riding).toBe(assisted ? null : f.car);
    expect(f.detaches).toBe(assisted ? 1 : 0);
    expect(f.saves).toHaveLength(1);
    expect(waterY(f.saves[0].x, f.saves[0].z, f.time)).toBeNull();
    expect(f.water.inspect()).toMatchObject({ landing: "spare", fallbackReason: "no-corridor", reason: "depth", drainEmissions: 4 });
    const landed = f.car.mesh.position.clone(), foot = f.player.position.clone();
    for (let i = 0; i < Math.ceil(0.75 * hz); i++) {
      expect(f.step(ms)).toBe(false);
      expect(f.opacity).toBe(0);
      expect(f.car.mesh.position).toEqual(landed);
      expect(f.player.position).toEqual(foot);
      f.dry();
    }
    expect(f.water.inspect().drainEmissions).toBe(36);
  });

  it("rejects the obstructed primary and lands on the distinct alternate on the first resumed frame", () => {
    const f = recoveryFixture();
    f.begin();
    f.at(-96, -81);
    expect(f.exit()).toBe(true);
    expect(f.water.assistedOnFoot).toBe(true);
    f.step(ms);
    const [primary, alternate] = f.water.inspect().spares;
    expect(Math.hypot(primary.x - alternate.x, primary.z - alternate.z)).toBeGreaterThanOrEqual(18);
    f.town.colliders.addBox(primary.x, primary.z, 2, 2);
    expect(f.step(3601)).toBe(true);
    expect(f.fadeEvents).toEqual(["opaque", "reveal"]);
    expect(f.opacity).toBe(1);
    expect(f.handback).toEqual({ opacity: 1, snap: true, reserved: 2, x: alternate.x, z: alternate.z });
    expect(f.water.inspect()).toMatchObject({ active: false, reason: "depth", landing: "spare", fallbackReason: "no-corridor" });
    f.dry();
    for (let i = 0; i < Math.ceil(0.75 * hz); i++) {
      expect(f.step(ms)).toBe(false);
      expect(f.car.m).toMatchObject({ x: alternate.x, z: alternate.z });
      const { x, y, z } = alternate.foot;
      expect(f.player.position).toMatchObject({ x, y, z });
      f.dry();
    }
  });
});

describe("occupied town car rescue", () => {
  it("publishes the seated exit on arrest and accepts it without a HUD tick", () => {
    const noOp = () => {};
    const game: Game = Object.create(Game.prototype);
    const f = recoveryFixture(undefined, [], {
      onArrest: () => game["resetCarWaterDrive"](),
      onDetach: (_, { x, y, z, rot }) => game["leftRide"](x, y, z, rot),
    });
    Object.assign(game, {
      rides: { get riding() { return f.riding; }, phase: "on", water: f.water, leave: f.exit },
      player: { root: f.player }, modes: { active: null, engaged: false }, ambient: { riding: true },
      hop: new Hop(), gait: new Gait(), steer: new Steer(), helmSteer: new Steer(),
      rig: { clearTaxiShot: noOp, dist: 5 }, rideBack: 0, dust: { clear: noOp }, wading: { depth: 0 },
      keys: new Set([" "]), joy: { x: 0.5, y: 0 }, brake: true, vel: new Vector3(), moveVel: new Vector3(),
    });
    const { hud } = useStore.getState();
    useStore.setState({ hud: { ...hud, panel: null, ride: "car", prompt: null } });
    try {
      f.begin();
      f.at(-96, -81);
      expect(f.water.inspect()).toMatchObject({ phase: "float", reason: "depth" });
      expect(f.riding).toBe(f.car);
      expect(f.player.visible).toBe(true);
      expect(game["nearest"]).toEqual({ kind: "out", label: "Išlipti", id: f.car.id });
      expect(useStore.getState().hud).toMatchObject({ ride: "car", prompt: { kind: "out", label: "Išlipti" } });
      expect(game["brake"]).toBe(true);
      useStore.getState().setHud({ panel: "map" });
      game.interact();
      expect(f.riding).toBe(f.car);
      useStore.getState().setHud({ panel: null });
      game.interact();
      expect(f.riding).toBeNull();
      expect(f.swimPose).toBe(1);
      expect(game["swimming"]).toBe(false);
      expect(game["diveK"]).toBe(0);
      expect(game["nearest"]).toBeNull();
      expect(useStore.getState().hud).toMatchObject({ ride: null, prompt: null });
      expect(game["carWaterInputHeld"]()).toBe(true);
      game.setJoystick(0, 0);
      expect(game["carWaterInputHeld"]()).toBe(true);
      game["keys"].delete(" ");
      expect(game["carWaterInputHeld"]()).toBe(false);
      game.interact();
      expect(f.detaches).toBe(1);
    } finally {
      useStore.setState({ hud });
    }
  });

  it.each([0, 1, 2])("steps out offshore with %i obstructed side sweeps", (blockedSides) => {
    const f = recoveryFixture();
    const x = -96, z = -81, { half, wide } = f.car.m.spec;
    const landwardEnd = z + half + 0.48;
    expect(waterY(x, landwardEnd, f.time)! - floorY(x, landwardEnd)).toBeLessThan(0.58);
    for (let i = 0; i < blockedSides; i++) {
      const side = i === 0 ? -1 : 1;
      f.town.colliders.addCircle(x + side * (wide + 1.1), z, 0.08);
      expect(f.clearance.foot(f.car, x + side * (wide + 0.48), z, 0.07)).toBe(true);
      expect(f.clearance.foot(f.car, x + side * (wide + 0.8), z)).toBe(false);
    }
    f.begin();
    f.at(x, z);
    const hazard = f.water.inspect();
    expect(hazard).toMatchObject({ phase: "float", reason: "depth", assistedOnFoot: false });
    expect(f.exit()).toBe(true);
    expect(f.riding).toBeNull();
    expect(f.water.assistedOnFoot).toBe(true);
    const p = f.player.position;
    const tread = blockedSides < 2;
    const checkFoot = (offset: number) => {
      if (tread) {
        expect(p.z).toBeCloseTo(z, 10);
        expect(Math.abs(p.x - x)).toBeCloseTo(wide + offset, 10);
        if (blockedSides === 1) expect(p.x).toBeGreaterThan(x);
      } else {
        expect(p.x).toBeCloseTo(x, 10);
        expect(p.z).toBeCloseTo(z + half + offset, 10);
      }
      const floor = floorY(p.x, p.z), surface = waterY(p.x, p.z, f.time)!;
      if (tread) {
        expect(surface - floor).toBeGreaterThan(0.58);
        expect(f.swimPose).toBeGreaterThan(0.8);
        expect(p.y).toBeCloseTo(Math.max(floor, surface - 0.78), 10);
      } else {
        expect(surface - floor).toBeGreaterThan(0);
        expect(surface - floor).toBeLessThanOrEqual(0.58);
        expect(f.swimPose).toBe(0);
        expect(p.y).toBeCloseTo(floor, 10);
      }
    };
    checkFoot(0.48);
    f.step();
    checkFoot(0.48 + (0.8 - 0.48) * dt / 0.22);
    expect(f.exit()).toBe(true);
    expect(f.detaches).toBe(1);
    const repeat = f.water.inspect();
    expect(repeat.episode).toBe(hazard.episode);
    expect(repeat.reason).toBe(hazard.reason);
    expect(repeat.secondsLeft! + dt).toBeCloseTo(hazard.secondsLeft!, 10);
    f.run(220);
    checkFoot(0.8);
  });

  it("supports the rolled footprint on the town pier and an oblique reverse frame in the wash", () => {
    const f = recoveryFixture(), { m, mesh } = f.car;
    f.begin(); f.at(-30, -70, 0.42);
    expect(floorY(m.x, m.z)).toBe(0.30);
    expect(f.water.inspect()).toMatchObject({ band: "dry", active: false });
    f.present(0, -0.11, -0.04);
    expectSupported(f);
    expect(mesh.position.y).toBeCloseTo(0.30 + m.spec.wide * Math.sin(0.11), 8);

    f.at(-96, -73.23729796422296, 0.42);
    m.speed = -1.4;
    f.step();
    const reverse = { throttle: -1, steer: 0, brake: false };
    m.step(dt, reverse, Infinity, false, Infinity, f.water.settings(reverse));
    expect(m.speed).toBeLessThan(0);
    expect(f.water.accepted(f.car, f.time, -1)).toBe(false);
    f.present(0, 0.11, -0.04);
    expectSupported(f);
  });

  it("has a checked restart step beside each stock Maple Harbor car", () => {
    const f = recoveryFixture();
    for (const r of [...f.parked, ...f.rides.filter((q) => q.kind === "car")]) {
      const foot = { x: 0, y: 0, z: 0, rot: 0, swim: 0 };
      expect(f.clearance.restartFoot(r, foot), r.id).toBe(true);
      expect(foot.y).toBeCloseTo(floorY(foot.x, foot.z));
      expect(waterY(foot.x, foot.z, 0)).toBeNull();
    }
  });

  it("keeps wet driving closed when only one protected pair fits", () => {
    const f = recoveryFixture();
    const { x, z } = RIDES.carWater.landings[0], colliders = f.town.colliders;
    const before = colliders.boxes.length;
    // Leave an 8 m square around the primary and obstruct all other mainland candidates.
    colliders.addBox(x, z - 104, 400, 200);
    colliders.addBox(x, z + 104, 400, 200);
    colliders.addBox(x - 104, z, 200, 8);
    colliders.addBox(x + 104, z, 200, 8);
    f.begin();
    expect(f.water.inspect()).toMatchObject({ phase: "acquiring", enabled: false });
    expect(f.water.inspect().spares).toMatchObject([{ x, z }]);
    expect(f.water.open(f.car)).toBe(false);
    colliders.boxes.splice(before);
    f.water.fleetChanged();
    expect(f.water.open(f.car)).toBe(true);
    expect(f.leases).toHaveLength(2);
  });

  it("arms with the real fleet after the first pads are occupied, replaces a blocked lease and releases both on disposal", () => {
    const occupied: { x: number; z: number; radius: number }[] = RIDES.carWater.landings.slice(0, 2).map((p) => ({ ...p, radius: 1.4 }));
    const f = recoveryFixture(buildTestTown(), occupied);
    f.begin(); f.run(400);
    expect(f.water.open(f.car)).toBe(true);
    expect(f.leases).toHaveLength(2);
    const before = f.water.inspect().spares;
    expect(before[0].x).toBe(-96);
    expect(before.map(({ x }) => x)).not.toContain(24);
    occupied.push({ ...before[0], radius: 2 });
    f.run(400);
    const after = f.water.inspect().spares;
    expect(after).toHaveLength(2);
    expect(after).toContainEqual(before[1]);
    expect(after).not.toContainEqual(before[0]);
    f.water.dispose();
    f.begin(); f.run(400);
    expect(f.leases).toHaveLength(0);
    expect(f.water.inspect()).toMatchObject({ phase: "idle", id: null, active: false });
  });

  it("floats, tows a seated car along the dry approach, keeps its face up and hands back the same car", () => {
    const f = recoveryFixture();
    f.begin(); f.approach(-78.2);
    expect(f.water.inspect()).toMatchObject({ phase: "float", reason: "depth", band: "float" });
    const pos = f.car.mesh.position;
    expect(pos.y).toBeGreaterThanOrEqual(waterY(pos.x, pos.z, f.time)! - 0.42);
    f.run(400);
    expect(f.car.mesh.rotation.x).toBeLessThan(-0.04);
    const camera = { x: pos.x + 5, y: -4, z: pos.z };
    f.water.cameraFloor(camera, f.time);
    expect(camera.y).toBeCloseTo(waterY(camera.x, camera.z, f.time)! + 0.35);
    let z = f.car.m.z;
    const coughs = new Set<number>();
    let rose = false;
    for (let i = 0; i < 170; i++) {
      f.step();
      expect(Math.abs(f.car.m.z - z)).toBeLessThanOrEqual(8 * dt + 0.001);
      z = f.car.m.z;
      const state = f.water.inspect();
      if (state.phase !== "settle") continue;
      if (f.car.mesh.rotation.x < -0.02) rose = true;
      if (state.coughBeat) {
        expect(rose).toBe(true);
        expect(f.car.mesh.rotation.x).toBeGreaterThanOrEqual(0);
        coughs.add(state.motorSignalRevs);
      }
    }
    f.dry();
    expect(f.riding).toBe(f.car);
    expect(f.water.inspect().landing).toBe("trail");
    expect(f.detaches).toBe(0);
    expect(f.handbacks).toBe(1);
    expect([...coughs]).toEqual([0.28, 0.16]);
    expect(f.water.inspect().coughEvents).toBe(2);
  });

  it.each([["shallow", -71], ["deep", -85]])("lets a real %s exit work immediately, survives a lost driver and lands beside the same car after a suspended frame", (_, z) => {
    const f = recoveryFixture();
    f.begin(); f.at(shore.x, z as number);
    expect(f.exit()).toBe(true);
    expect(f.exit()).toBe(true);
    expect(f.riding).toBeNull();
    expect(f.detaches).toBe(1);
    expect(f.water.inspect().assistedOnFoot).toBe(true);
    expect(f.player.position.y + 1.0).toBeGreaterThan((waterY(f.player.position.x, f.player.position.z, f.time) ?? -2) + 0.15);
    const saved = f.water.safeSave()!;
    expect(saved).toBeDefined();
    const { home } = f.car;
    expect(Math.hypot(saved.x - home.x, saved.z - home.z)).toBeCloseTo(f.car.m.spec.wide + 0.8);
    expect(waterY(saved.x, saved.z, 0)).toBeNull();
    f.loseDriver();
    f.step(60_000);
    f.dry();
    expect(f.detaches).toBe(1);
    expect(f.water.inspect()).toMatchObject({ landing: "spare", fallback: true });
    expect(f.covered).toBe(false);
  });

  it("finishes immediately on an invalid accepted pose or returning from a hidden tab", () => {
    const f = recoveryFixture();
    f.begin(); f.at(24, -71);
    f.water.tick(0, f.time, true);
    f.dry();
    expect(f.water.inspect().reason).toBe("suspended");
    f.step();
    f.at(Number.NaN, -80);
    f.dry();
    expect(f.water.inspect().reason).toBe("invalid");
    expect(f.riding).toBe(f.car);
    expect(f.handbacks).toBe(2);
  });

  it("uses the alternate at a clock deadline when the primary becomes occupied and there is no approach history", () => {
    const f = recoveryFixture();
    f.begin();
    const [primary, alternate] = f.water.inspect().spares;
    f.at(24, -128);
    f.loseDriver();
    f.occupied.push({ ...primary, radius: 2.5 });
    f.step(3501);
    f.dry();
    expect(f.car.m.x).toBe(alternate.x);
    expect(f.car.m.z).toBe(alternate.z);
    expect(f.handbacks).toBe(1);
    expect(f.detaches).toBe(0);
  });

  it("replenishes between live tow steps when a parked car, a town convertible and a boat occupy separate spares", () => {
    const f = recoveryFixture();
    f.begin(); f.approach(-78.2);
    f.run(850);
    expect(f.water.inspect().phase).toBe("tow");
    const deadline = f.now + 1000 * f.water.inspect().secondsLeft!;
    const [parked] = f.parked;
    const normal = f.rides.find((r) => r !== f.car && r.kind === "car")!;
    const boat = f.rides.find((r) => r.kind === "boat")!;
    for (const ride of [parked, normal, boat]) {
      const [keep, blocked] = f.water.inspect().spares;
      ride.m.set(blocked.x, blocked.z, blocked.heading);
      const z = f.car.m.z;
      expect(f.step()).toBe(true);
      const state = f.water.inspect();
      expect(state.phase).toBe("tow");
      expect(f.car.m.z - z).toBeGreaterThan(0);
      expect(f.car.m.z - z).toBeLessThanOrEqual(8 * dt + 0.001);
      expect(f.now + 1000 * state.secondsLeft!).toBeCloseTo(deadline, 6);
      expect(f.leases).toHaveLength(2);
      expect(state.spares).toContainEqual(keep);
      expect(state.spares).not.toContainEqual(blocked);
    }
    f.step(3601);
    f.dry();
    expect(f.water.inspect()).toMatchObject({ reason: "depth", landing: "spare", fallbackReason: "corridor-unfinished" });
    expect(f.water.suppressInput).toBe(false);
    expect(f.handbacks).toBe(1);
  });

  it("completes the bounded mainland search when external solids invalidate both leases before resume", () => {
    const f = recoveryFixture();
    f.begin();
    f.at(-30, -90.5);
    expect(f.exit()).toBe(true);
    const colliders = f.town.colliders;
    for (const pad of RIDES.carWater.landings) colliders.addBox(pad.x, pad.z, 2, 2);
    // Cover the west end of the first search row, including all of the first 48 poses.
    colliders.addBox(-58, SHORE.top + 6, 112, 10);
    expect(f.step(3601)).toBe(true);
    f.dry();
    expect(f.car.m.x).toBeGreaterThan(0);
    expect(f.clearance.car(f.car, f.car.m, 0, true)).toBe(true);
    const { x, z } = f.player.position;
    expect(f.clearance.foot(f.car, x, z, 0, true)).toBe(true);
    expect(f.handbacks).toBe(1);
    expect(f.leases).toHaveLength(0);
  });

  it("bobs against the actual pier walls and takes a paired fade instead of traversing them", () => {
    const f = recoveryFixture();
    f.begin();
    // Recreate a discontinuous drop on the far side of the real boardwalk rail.
    POOLS.push({ x: -34, z: -69, r: 0.38, y: 0.08, depth: 1.4 });
    f.at(-30, -69, 0);
    expect(f.clearance.car(f.car, f.car.m)).toBe(true);
    for (let x = -30; x > -33.6; x -= 0.2) { f.step(); f.at(x, -69, 0); }
    f.at(-34, -69, 0);
    expect(f.clearance.car(f.car, f.car.m)).toBe(true);
    expect(f.exit()).toBe(true);
    f.run(2050);
    expect(f.car.m.x).toBe(-34);
    expect(f.car.m.z).toBe(-69);
    f.run(1300);
    f.dry();
    expect(f.water.inspect().landing).toBe("spare");
  });

  it("clears an in-progress recovery fade when an intentional destination takes over", () => {
    const f = recoveryFixture();
    f.begin(); f.at(-30, -90.5); expect(f.exit()).toBe(true);
    f.run(2250);
    expect(f.water.inspect().phase).toBe("fade");
    expect(f.covered).toBe(true);
    f.player.position.set(130, 1, 22);
    f.handoff();
    expect(f.step(3601)).toBe(false);
    expect(f.fadeEvents).toEqual(["cover"]);
    expect(f.opacity).toBe(0);
    expect(f.covered).toBe(false);
    expect(f.player.position.toArray()).toEqual([130, 1, 22]);
    expect(f.water.inspect()).toMatchObject({ active: false, landing: "spare" });
    expect(f.handbacks).toBe(1);
    expect(f.leases).toHaveLength(0);
  });

  it("counts continuous shallow contact while stopped and braking and does not restart when exit is requested late", () => {
    const f = recoveryFixture();
    f.begin(); f.at(shore.x, -71);
    f.run(3450);
    expect(f.water.inspect().phase).toBe("driving");
    f.run(70);
    expect(f.water.inspect().reason).toBe("wet-limit");
    f.run(2100);
    const before = f.water.inspect().age;
    expect(f.exit()).toBe(true);
    expect(f.water.inspect().age).toBe(before);
    f.run(1250);
    f.dry();
    expect(f.riding).toBeNull();
    expect(f.detaches).toBe(1);
  });

  it("ends after a fully dry voluntary retreat, rearms on new contact and hands the next destination to the new owner", () => {
    const f = recoveryFixture();
    f.begin();
    f.at(shore.x, -71); f.run(500);
    f.at(shore.x, -64); f.run(220);
    f.at(shore.x, -64);
    expect(f.water.inspect().active).toBe(true);
    f.run(50); f.at(shore.x, -64);
    expect(f.water.inspect().active).toBe(false);
    expect(f.leases).toHaveLength(0);
    expect(f.car.m.z).toBe(-64);
    f.step(); f.at(shore.x, -84); expect(f.exit()).toBe(true);
    f.player.position.set(130, 1, 22);
    f.handoff(); f.step(10_000);
    expect(f.player.position.toArray()).toEqual([130, 1, 22]);
    expect(f.leases).toHaveLength(0);
    expect(f.water.inspect().phase).toBe("idle");
    expect(f.handbacks).toBe(1);
  });
});

it("opens only a boarded real fleet car, unhides its driver at an exterior step and repairs its box and ledges on handback", async () => {
  const town = buildTestTown();
  const window = {};
  vi.stubGlobal("window", window);
  let now = 1000, time = 0;
  vi.stubGlobal("performance", { now: () => now });
  const player: GameCharacter = {
    root: new Group(), rightHand: new Group(), height: 1.75, anim: "idle",
    setAnim(anim) { this.anim = anim; }, update() {}, talk() {},
  };
  const ambient = {
    rideBoxes: [], waterReservations: [], pushOutOfCars: () => null, gapToBox: () => Infinity, personAhead: () => Infinity,
    carAhead: (_x: number, _z: number, _fx: number, _fz: number, _reach: number, _half: number, _curv: number, out: { gap: number; speed: number }) =>
      Object.assign(out, { gap: Infinity, speed: 0 }),
    carWaterTrafficClear: () => true, carWaterPeopleClear: () => true, waterReserved: () => false, startle: () => null,
  } as unknown as RideHost["ambient"];
  const noOp = () => {};
  const rides = new Rides({
    cam: new PerspectiveCamera(), player, quality: "low", colliders: town.colliders, nav: { cell: 0.5, idx: () => -1 } as unknown as NavGrid, ambient,
    people: () => [], say: noOp, thud: noOp, stuck: noOp, aground: noOp, waiting: noOp, freed: noOp, rescue: noOp, splash: noOp, fan: noOp,
    outdoors: () => true,
  }, { ...RIDES, cars: [] }, []);
  const parked = town.parkedCars.fleet.cars.map((entry, index) => rides.createModeCar({ ...entry.spot, id: `fleet-${index}` }, entry.root, noOp));
  const car = parked.find((r) => rides.roofed(r))!;
  const simulate = (n: number, throttle = 0) => {
    for (let i = 0; i < n; i++) {
      now += 1000 * dt; time += dt;
      rides.water?.tick(dt, time);
      rides.update(dt, time, { throttle, steer: 0, brake: false });
    }
  };
  let leaves = 0;
  rides.onLeft = (x, y, z, rot) => {
    leaves++;
    player.root.position.set(x, y, z);
    player.root.rotation.y = rot;
  };
  rides.resetPosition(car, shore);
  player.root.position.set(shore.x - car.m.spec.wide - 0.8, 0, shore.z);
  expect(rides.board(car, false)).toBe(true);
  expect(rides.drivable.has(shore.x, -75)).toBe(false);
  expect(rides.water).toBeUndefined();
  simulate(40);
  expect(player.root.visible).toBe(false);
  const adapter: Parameters<Rides["prefetchWater"]>[1] = {
    eligible: (r) => rides.townCar(r), peopleClear: () => true, arrest: noOp, snap: noOp, fade: noOp,
    foot: (p) => { player.root.position.set(p.x, p.y, p.z); player.swim = p.swim; },
  };
  rides.prefetchWater(car, adapter);
  await vi.waitFor(() => expect(rides.water?.open(car)).toBe(true));
  expect(rides.water!.ground.has(shore.x, BAY.z0)).toBe(true);
  for (let i = 0; i < 600 && !rides.water!.wet; i++) simulate(1, 1);
  expect(car.m.z).toBeLessThan(SHORE.top + CAR.wide + 0.5);
  expect(car.m.pace).toBeGreaterThan(1.2);
  const [primary, alternate] = rides.water!.inspect().spares;
  const temporary = rides.createModeCar({ ...town.parkedCars.fleet.cars[0].spot, id: "temporary", x: primary.x, z: primary.z, rot: primary.heading }, new Group());
  const [replacement] = rides.water!.inspect().spares;
  expect(replacement).not.toEqual(primary);
  expect(rides.water!.inspect().spares).toContainEqual(alternate);
  expect(rides.townCar(temporary)).toBe(false);
  rides.removeModeCar(temporary);
  town.colliders.addBox(replacement.x, replacement.z, 2, 2);
  simulate(1);
  expect(rides.water!.inspect().spares).toContainEqual(primary);
  expect(rides.leave()).toBe(true);
  expect(rides.riding).toBeNull();
  expect(leaves).toBe(1);
  expect(player.root.visible).toBe(true);
  expect(rides.board(car, false)).toBe(false);
  now += 20_000;
  rides.water!.tick(dt, time);
  expect(rides.water!.inspect().active).toBe(false);
  expect(leaves).toBe(1);
  expect(rides.near(player.root.position.x, player.root.position.z)).toBe(car);
  expect(ambient.rideBoxes).toContainEqual(expect.objectContaining({ x: car.m.x, z: car.m.z, heading: car.m.heading }));
  expect(rides.townCarPieces(car.m.x, car.m.z).length).toBeGreaterThan(0);
  expect(rides.board(car, false)).toBe(true);
  rides.prefetchWater(car, adapter);
  simulate(40);
  rides.resetPosition(car, { x: 24, z: -124, rot: 0 });
  simulate(1);
  expect(rides.water!.inspect().reason).toBe("depth");
  expect(player.root.visible).toBe(false);
  rides.riding = null;
  now += 20_000;
  rides.water!.tick(dt, time);
  expect(leaves).toBe(2);
  expect(player.root.visible).toBe(true);
  expect(rides.near(player.root.position.x, player.root.position.z)).toBe(car);
  rides.disposeWater();
  expect(window).not.toHaveProperty("__carWater");
});

function effectsFixture(hz: number) {
  const step = 1 / hz, root = new Group(), drops = new Splashes();
  const ring = drops.group.getObjectByName("water-ring")!;
  const points = drops.group.getObjectByName("water-drops") as Points;
  const fan = vi.spyOn(drops, "carFan"), splash = vi.fn(), wash = vi.fn();
  const effects = new CarWaterEffects({ drops, splash, wash }, root);
  const m = new Motion(CAR, "car"), probe = createCarWaterProbe();
  m.set(300, 300, 0);
  let time = 0, depth = 0.2, oneSide = false;
  POOLS.push({ x: 300, z: 300, r: 20, y: 0.04, depth: 2 });
  FLOORS.push({ x0: 285, x1: 315, z0: 285, z1: 315, y: (x) => oneSide && x >= 300 ? 0.2 : 0.04 - depth });
  const f = {
    step, m, root, drops, ring, points, effects, fan, splash, wash, probe,
    get time() { return time; },
    get foam() { return root.getObjectByName("car-water-foam") as Mesh<Points["geometry"], MeshBasicMaterial>; },
    depth(value: number, rightOnly = false) { depth = value; oneSide = rightOnly; },
    frame(speed: number) {
      m.speed = speed;
      m.x += speed * m.fx * step; m.z += speed * m.fz * step;
      time += step;
      probeCarWater(m, time, probe.band, probe);
      effects.drive(m, probe, time, step);
      drops.update(step, time, null, 0);
    },
    run(seconds: number, speed: number) { for (let i = 0; i < Math.round(seconds * hz); i++) f.frame(speed); },
  };
  return f;
}

describe.each([60, 20])("town car effects at %i Hz", (hz) => {
  it("starts on the contacting wheel, alternates moving fans and builds one top-facing wake and crest", () => {
    const f = effectsFixture(hz);
    f.depth(0); f.frame(0);
    expect(f.foam).toBeUndefined();
    expect(f.effects.inspect()).toMatchObject({ carDrops: 0, pointDrawCount: 0, ringVisible: false });
    f.depth(0.2, true); f.frame(0);
    const right = f.probe.frontRight;
    expect(f.fan.mock.calls[0]).toEqual([right.x, right.liveSurface, right.z, -1, 0, 0.2]);
    expect(f.splash.mock.calls).toEqual([[0.35]]);
    expect(f.effects.inspect()).toMatchObject({ carDrops: 7, pointsVisible: true, pointDrawCount: 7, foamVisible: false });
    f.run(0.35, 0);
    expect(f.fan).toHaveBeenCalledTimes(1);

    f.depth(0.2);
    const shallowTimes: number[] = [], splashTimes = [2 * f.step];
    const run = (seconds: number, pace: number, times: number[]) => {
      for (let i = 0; i < Math.round(seconds * hz); i++) {
        const before = f.fan.mock.calls.length, sounds = f.splash.mock.calls.length;
        f.frame(pace);
        if (f.splash.mock.calls.length > sounds) splashTimes.push(f.time);
        if (f.fan.mock.calls.length > before) {
          expect(f.fan.mock.calls.length - before).toBe(1);
          times.push(f.time);
          const [x, y, z, dx, , k] = f.fan.mock.lastCall!;
          const tire = dx > 0 ? f.probe.frontLeft : f.probe.frontRight;
          expect([x, y, z]).toEqual([tire.x, tire.liveSurface, tire.z]);
          expect(k).toBe(f.probe.band === "shallow" ? 0.2 : 0.55);
        }
      }
    };
    run(1.05, 4.2, shallowTimes);
    expect(shallowTimes.length).toBeGreaterThanOrEqual(7);
    for (let i = 1; i < shallowTimes.length; i++) expect(Math.abs(shallowTimes[i] - shallowTimes[0] - i * 0.14)).toBeLessThanOrEqual(f.step + 1e-7);
    expect(f.fan.mock.calls.slice(0, 6).map((call) => call[3])).toEqual([-1, 1, -1, 1, -1, 1]);
    const mesh = f.foam, geometry = mesh.geometry, position = geometry.attributes.position, index = geometry.index!;
    const color = geometry.attributes.color;
    expect(f.root.children).toEqual([mesh]);
    expect(mesh.material).toMatchObject({ isMeshBasicMaterial: true, side: FrontSide, vertexColors: true, depthWrite: false });
    expect(mesh.castShadow || mesh.receiveShadow).toBe(false);
    expect(f.effects.inspect()).toMatchObject({ bowVertices: 0, ringVisible: false, foamVisible: true, foamDrawStart: 24 });
    expect(f.effects.inspect().wakeSegments).toBeGreaterThanOrEqual(10);
    expect(f.effects.inspect().wakeSegments).toBeLessThanOrEqual(14);
    for (let i = 9; i < 9 + 6 * f.effects.inspect().wakeSegments; i++) {
      expect(position.getY(i)).toBeCloseTo(waterY(position.getX(i), position.getZ(i), f.time)! + 0.035, 6);
    }

    f.depth(0.48);
    const deepTimes: number[] = [];
    run(0.65, 2.1, deepTimes);
    expect(deepTimes.length).toBeGreaterThanOrEqual(6);
    for (let i = 1; i < deepTimes.length; i++) expect(Math.abs(deepTimes[i] - deepTimes[0] - i * 0.10)).toBeLessThanOrEqual(f.step + 1e-7);
    for (let i = 1; i < splashTimes.length; i++) expect(splashTimes[i] - splashTimes[i - 1]).toBeGreaterThanOrEqual(0.65 - 1e-7);
    expect(f.wash).toHaveBeenCalledTimes(1);
    expect(mesh.geometry.attributes.position).toBe(position);
    expect(mesh.geometry.attributes.color).toBe(color);
    expect(mesh.geometry.index).toBe(index);
    expect(geometry.drawRange).toMatchObject({ start: 0 });
    expect(f.effects.inspect()).toMatchObject({ bowVertices: 9, ringVisible: false, pointsVisible: true });
    expect(position.getZ(4)).toBeCloseTo(f.m.z + CAR.half + 0.12, 4);
    expect(position.getY(4)).toBeCloseTo(waterY(f.m.x, position.getZ(4), f.time)! + 0.10, 6);
    expect(position.getZ(4) - position.getZ(1)).toBeCloseTo(0.85, 4);
    expect(position.getX(1)).toBeCloseTo(f.m.x - CAR.wide - 0.45, 4);
    expect(position.getX(7)).toBeCloseTo(f.m.x + CAR.wide + 0.45, 4);
    expect(position.getZ(3) - position.getZ(5)).toBeCloseTo(0.18, 4);
    for (const arm of [1, 7]) {
      expect(position.getZ(arm - 1) - position.getZ(arm + 1)).toBeCloseTo(0.24, 4);
      expect(color.getW(arm)).toBeCloseTo(color.getW(4) * 0.80, 6);
    }

    // Compare the drawable objects at one fixed pose and camera. Raycasting from above checks the bow winding.
    const camera = new PerspectiveCamera(45, 390 / 844, 0.1, 60), nose = new Vector3().fromBufferAttribute(position, 4);
    camera.position.set(f.m.x, 8, f.m.z + 7);
    camera.lookAt(f.m.x, 0, f.m.z);
    camera.updateMatrixWorld();
    const screen = nose.clone().project(camera), ray = new Raycaster();
    ray.setFromCamera(new Vector2(screen.x, screen.y), camera);
    expect(ray.intersectObject(mesh)[0]?.point.distanceTo(nose)).toBeLessThan(0.002);
    const drawable = () => [mesh, f.points].filter((object) => object.visible && object.geometry.drawRange.count > 0).length;
    expect(drawable()).toBe(2);
    mesh.visible = f.points.visible = false;
    expect(drawable()).toBe(0);
    expect(nose.clone().project(camera).equals(screen)).toBe(true);
    mesh.visible = f.points.visible = true;

    const fans = f.fan.mock.calls.length;
    f.run(0.25, 0);
    expect(f.fan).toHaveBeenCalledTimes(fans);
    expect(f.effects.inspect()).toMatchObject({ bowVertices: 0, foamVisible: true });
    const tailAlpha = () => {
      let alpha = 0;
      for (let i = geometry.drawRange.start; i < geometry.drawRange.start + geometry.drawRange.count; i++) {
        alpha = Math.max(alpha, color.getW(index.getX(i)));
      }
      return alpha;
    };
    const alpha = tailAlpha();
    f.run(0.25, 0);
    expect(tailAlpha()).toBeGreaterThan(0);
    expect(tailAlpha()).toBeLessThan(alpha);
    f.run(0.40, 0);
    expect(f.effects.inspect()).toMatchObject({ wakeSegments: 0, bowVertices: 0, carDrops: 0, foamVisible: false, foamDrawCount: 0, pointsVisible: false, pointDrawCount: 0 });
  });

  it("switches axles in reverse, clears teleports, and excludes a boardwalk between stations", () => {
    const f = effectsFixture(hz);
    f.depth(0.48); f.run(0.50, 2.1);
    expect(f.effects.inspect().wakeSegments).toBeGreaterThan(0);
    f.frame(-1.4);
    expect(f.effects.inspect()).toMatchObject({ wakeSegments: 0, bowVertices: 9 });
    const position = f.foam.geometry.attributes.position;
    expect(position.getZ(4)).toBeCloseTo(f.m.z - CAR.half - 0.12, 4);
    const nose = new Vector3().fromBufferAttribute(position, 4);
    const above = new Raycaster(nose.clone().add(new Vector3(0, 2, 0)), new Vector3(0, -1, 0));
    expect(above.intersectObject(f.foam)[0]?.point.distanceTo(nose)).toBeLessThan(0.002);
    let sprays = 0;
    for (let i = 0; i < Math.round(hz * 0.35); i++) {
      const before = f.fan.mock.calls.length;
      f.frame(-1.4);
      if (f.fan.mock.calls.length === before) continue;
      const [x, , z, dx, , k] = f.fan.mock.lastCall!;
      const lead = dx > 0 ? f.probe.rearLeft : f.probe.rearRight;
      expect([x, z, k]).toEqual([lead.x, lead.z, 0.55]);
      sprays++;
    }
    expect(sprays).toBeGreaterThanOrEqual(3);
    expect(f.effects.inspect().wakeSegments).toBeGreaterThan(0);

    const deckZ = f.probe.frontLeft.z + 0.06;
    DECKS.push({ x0: 298, x1: 302, z0: deckZ - 0.01, z1: deckZ + 0.01, y: 0.3 });
    f.frame(-1.4);
    const geometry = f.foam.geometry, { start, count } = geometry.drawRange;
    expect(count).toBeGreaterThan(24);
    for (let i = start; i < start + count; i += 3) {
      const a = position.getZ(geometry.index!.getX(i)), b = position.getZ(geometry.index!.getX(i + 1)), c = position.getZ(geometry.index!.getX(i + 2));
      expect(Math.min(a, b, c) < deckZ + 0.01 && Math.max(a, b, c) > deckZ - 0.01).toBe(false);
    }
    f.m.set(300, 330, 0); f.frame(0);
    expect(f.effects.inspect()).toMatchObject({ wakeSegments: 0, bowVertices: 0, carDrops: 0, foamDrawCount: 0, pointDrawCount: 0 });
  });

  it("keeps one 420-slot batch and enforces 96 car dots across bands, draining and unrelated recycling", () => {
    const f = effectsFixture(hz);
    let peak = 0;
    for (let i = 0; i < 2 * hz; i++) {
      f.depth(i % 2 ? 0.48 : 0.2); f.frame(i % 2 ? 2.1 : 4.2);
      peak = Math.max(peak, f.effects.inspect().carDrops);
    }
    expect(peak).toBeGreaterThan(35);
    expect(peak).toBeLessThanOrEqual(96);
    expect(f.wash).toHaveBeenCalledTimes(1);
    expect(f.points.geometry.attributes.position.count).toBe(420);
    for (let i = 0; i < 20; i++) {
      f.drops.carFan(300, 0.04, 300, 1, 0, 0.55);
      f.drops.carDrop(300, 0.48, 300, 0.2, 0);
    }
    f.drops.update(0, f.time, null, 0);
    expect(f.effects.inspect()).toMatchObject({ carDrops: 96, pointsVisible: true });
    for (let i = 0; i < 40; i++) f.drops.burst(300, 0.04, 300, 0, 0, 1);
    f.drops.update(0, f.time, null, 0);
    expect(f.effects.inspect()).toMatchObject({ carDrops: 0, drainLive: 0, pointDrawCount: 420 });
    f.drops.carDrop(300, 0.48, 300, 0.2, 0);
    f.effects.cancel();
    f.drops.update(0, f.time, { x: 300, y: 0.04, z: 300 }, 1);
    expect(f.effects.inspect()).toMatchObject({ carDrops: 0, drainLive: 0, pointsVisible: false, ringVisible: true });
    expect(f.points.visible).toBe(true);
  });

  it("emits both falling sill streams on fallback and keeps them on the car after assisted exit", () => {
    const root = new Group(), drops = new Splashes();
    const drop = vi.spyOn(drops, "carDrop");
    const f = recoveryFixture(undefined, [], { effectRoot: root, drops });
    const frame = (ms = 1000 / hz) => {
      f.step(ms);
      drops.update(Math.min(ms / 1000, 0.05), f.time, null, 0);
    };
    f.begin();
    const m = f.car.m;
    m.set(24, -75.7, Math.PI / 2);
    for (let i = 0; i < hz / 2; i++) {
      frame();
      m.speed = 2.1; m.x += 2.1 / hz;
      f.water.accepted(f.car, f.time, 1);
    }
    drops.update(0, f.time, null, 0);
    expect(f.water.inspect()).toMatchObject({ band: "body-deep", bowVertices: 9, washEvents: 1, pointsVisible: true, sputterEvents: 2 });
    expect(f.exit()).toBe(true);
    expect(f.riding).toBeNull();
    frame(5000);
    f.dry();
    expect(f.water.inspect()).toMatchObject({ fallback: true, wakeSegments: 0, bowVertices: 0, foamDrawCount: 0, carDrops: 4, drainLive: 4, drainEmissions: 4 });
    const scale = m.spec.half / 2.15, across = m.spec.wide + 0.03;
    for (const [x, y, z, vx, vz] of drop.mock.calls) {
      const along = (x - m.x) * m.fx + (z - m.z) * m.fz;
      const side = (x - m.x) * m.fz - (z - m.z) * m.fx;
      expect(Math.abs(along + 0.25 * scale)).toBeCloseTo(0.04);
      expect(Math.abs(side)).toBeCloseTo(across);
      expect(y).toBeCloseTo(f.car.mesh.position.y + 0.44);
      expect((vx * m.fz - vz * m.fx) * Math.sign(side)).toBeCloseTo(0.2);
    }
    const points = drops.group.getObjectByName("water-drops") as Points;
    const first = points.geometry.drawRange.start, position = points.geometry.attributes.position;
    expect(position.getY(first)).toBeCloseTo(drop.mock.calls[0][1] - (1.1 + 9.5 * 0.05) * 0.05, 6);
    f.player.position.x += 3;
    for (let i = 0; i < Math.ceil(hz * 0.65); i++) frame();
    expect(drop).toHaveBeenCalledTimes(36);
    expect(f.water.inspect()).toMatchObject({ active: false, drainEmissions: 36, pointsVisible: true });
    f.handoff();
    expect(root.children[0]?.visible).toBe(false);
    expect(f.water.inspect()).toMatchObject({ carDrops: 0, drainLive: 0, pointDrawCount: 0, pointsVisible: false });
    drops.update(0, f.time, { x: 24, y: -0.2, z: -74 }, 1);
    expect(f.water.inspect().ringVisible).toBe(true);
    f.water.dispose();
    expect(root.children).toHaveLength(0);
    expect(drops.group.children).toHaveLength(2);
  });
});

it("signals paired under-load misses and a raised nose followed by two synchronized dry coughs", () => {
  for (const time of [0, 0.05, 0.24, 0.30, 0.91, 1.16]) expect(sputterMiss(time)).toBe(true);
  for (const time of [0.12, 0.23, 0.35, 0.89, 1.05]) expect(sputterMiss(time)).toBe(false);
  expect(drainPitch(0.06)).toBeCloseTo(-0.045);
  for (const time of [0, 0.06, 0.23, 0.35, 0.47, 0.65, 2]) {
    expect(coughBeat(time)).toBe(0);
    expect(drainMotor(time)).toBe(0);
  }
  for (const [time, beat, revs, pitch] of [[0.17, 1, 0.28, 0.018], [0.41, 2, 0.16, 0.013]]) {
    expect(coughBeat(time)).toBe(beat);
    expect(drainMotor(time)).toBe(revs);
    expect(drainPitch(time)).toBeCloseTo(pitch);
  }
});

it("retires falling drops at local dry support or pool surface with the same gravity", () => {
  const drops = new Splashes();
  const points = drops.group.getObjectByName("water-drops") as Points;
  FLOORS.push({ x0: 30, x1: 40, z0: 0, z1: 10, y: () => 1.5 });
  POOLS.push({ x: 42, z: 5, r: 1, y: 1.5, depth: 3 });
  for (const x of [35, 42, 45]) drops.carDrop(x, 1.94, 5, 0.2, 0);
  const position = points.geometry.attributes.position;
  drops.update(0, 0, null, 0);
  expect(position.getY(0)).toBeCloseTo(1.94, 6);
  drops.update(0.05, 0.05, null, 0);
  expect(position.getX(0)).toBeCloseTo(35.01, 5);
  expect(position.getY(0)).toBeCloseTo(1.94 - (1.1 + 9.5 * 0.05) * 0.05, 6);
  for (let i = 2; i <= 6; i++) drops.update(0.05, i * 0.05, null, 0);
  expect(drops.inspectCarDrops()).toMatchObject({ carDrops: 1, drainLive: 1, pointDrawStart: 2, pointDrawCount: 1 });
  drops.update(0.4, 0.7, null, 0);
  expect(drops.inspectCarDrops()).toMatchObject({ carDrops: 0, drainLive: 0, pointDrawCount: 0, pointsVisible: false });
});
