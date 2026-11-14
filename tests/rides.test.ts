// What one can drive and swimming, without a browser: the car's and the boat's arithmetic (rides/drive.ts), the
// streets a car stays on, the plan of this town's convertibles and boat (world/rides.ts), and the water past the
// wading limit (water.ts). In the real game: tests/browser/rides.mjs.
import { describe, expect, it } from "vitest";
import { Drivable, Motion, CAR, BOAT, controlsFrom, pushOutOfBox, aheadIn } from "../src/game/rides/drive";
import { townDrivable } from "../src/game/rides/ground";
import { convertibleGeometry, motorboatGeometry, CAR_SIZE, BOAT_SIZE } from "../src/game/rides/shapes";
import { RIDES } from "../src/game/world/rides";
import { RIDE_LINES, RIDE_BACK_LINES, RIDE_NAMES } from "../src/content/rides";
import { PARKED_CARS, TAXI, TRAFFIC_LANES, WORLD, OUTDOOR_NPCS } from "../src/game/world/layout";
import { SHORE, SEA_LEVEL, SWIM, BAY, DEEP, DECKS, POOLS, FLOORS, sandY, seaBedY, floorY, waterY, bayHold, poolBedY } from "../src/game/water";

const PI = Math.PI, go = { throttle: 1, steer: 0, brake: false };
const run = (m: Motion, s: number, c = go, each?: () => void) => { for (let i = 0; i < Math.round(s * 60); i++) { m.step(1 / 60, c); each?.(); } };

describe("the hands on the wheel", () => {
  it("up is go, down is brake and reverse, the sides steer and still roll on", () => {
    expect(controlsFrom(0, 1)).toMatchObject({ throttle: 1, steer: 0 });
    expect(controlsFrom(0, -1).throttle).toBe(-1);
    const left = controlsFrom(-1, 0);
    expect(left.steer).toBe(-1);
    expect(left.throttle).toBeGreaterThan(0.4);
    expect(controlsFrom(0.05, 0.05)).toMatchObject({ throttle: 0, steer: 0 });
    expect(controlsFrom(0, 1, true).brake).toBe(true);
  });
});

describe("the car", () => {
  it("picks up to its top speed and no more, and the brake stops it within a few metres", () => {
    const m = new Motion(CAR, "car");
    run(m, 6);
    expect(m.speed).toBeGreaterThan(CAR.max * 0.9);
    expect(m.speed).toBeLessThanOrEqual(CAR.max + 1e-6);
    expect(m.z).toBeGreaterThan(40); // heading 0 is +Z
    const z0 = m.z;
    run(m, 1.5, { throttle: 0, steer: 0, brake: true });
    expect(m.speed).toBe(0);
    expect(m.z - z0).toBeLessThan(8);
  });
  it("turns right with the wheel to the right (a smaller heading), in a circle a street has room for", () => {
    const m = new Motion(CAR, "car");
    run(m, 1.2);
    run(m, 1.5, { throttle: 0.4, steer: 1, brake: false });
    expect(m.heading).toBeLessThan(-0.5);
    // facing +Z, one's right is −X
    expect(m.x).toBeLessThan(-0.5);
    const l = new Motion(CAR, "car");
    run(l, 1.2); run(l, 1.5, { throttle: 0.4, steer: -1, brake: false });
    expect(l.heading).toBeGreaterThan(0.5);
    // the tightest turn at a crawl: under five metres
    expect(CAR.base / Math.tan(CAR.lockSlow)).toBeLessThan(5);
  });
  it("down the stick brakes first, then backs up slowly", () => {
    const m = new Motion(CAR, "car");
    run(m, 2);
    run(m, 0.3, { throttle: -1, steer: 0, brake: false });
    expect(m.speed).toBeGreaterThanOrEqual(0);
    run(m, 4, { throttle: -1, steer: 0, brake: false });
    expect(m.speed).toBeCloseTo(-CAR.back, 1);
  });
  it("rolls to a stop by itself when let go", () => {
    const m = new Motion(CAR, "car");
    run(m, 3); run(m, 12, { throttle: 0, steer: 0, brake: false });
    expect(m.speed).toBe(0);
  });
  it("never reaches someone on foot ahead: flat out, it stops short of them, softly when it sees them in time", () => {
    for (const d of [8, 14, 30, 60]) {
      const m = new Motion(CAR, "car"), person = d;
      let hardest = 0, last = 0;
      for (let i = 0; i < 900; i++) {
        const gap = person - m.z;
        m.step(1 / 60, go, gap > 0 && gap < 26 ? gap : Infinity);
        if (last > 1.5) hardest = Math.max(hardest, (last - m.speed) * 60);
        last = m.speed;
        expect(person - m.z - CAR.half, `from ${d} m`).toBeGreaterThan(1);
      }
      expect(m.speed).toBeLessThan(0.05);
      // (seen from 26 m at any speed: no harder than the yield's own braking, with a little to spare)
      if (d >= 30) expect(hardest).toBeLessThan(CAR.yield * 1.7);
    }
  });
  it("stays on the streets: driven at a kerb, it slides along it", () => {
    const road = new Drivable([{ x0: -5, x1: 5, z0: -100, z1: 100 }], CAR.wide - 0.12), m = new Motion(CAR, "car");
    m.set(0, 0, 0.5);
    for (let i = 0; i < 600; i++) { m.step(1 / 60, go); m.settle((p) => { road.nearest(p.x, p.z, p); }); expect(Math.abs(m.x)).toBeLessThan(5 - CAR.wide + 0.5); }
    expect(m.z).toBeGreaterThan(30);
    expect(Math.abs(m.heading)).toBeLessThan(0.2);
  });
  it("is stopped by what stands in its way, and backs off it", () => {
    const m = new Motion(CAR, "car");
    const wall = (p: { x: number; z: number }, r: number) => { pushOutOfBox(p, r, 0, 20, 0, 1, 6); };
    for (let i = 0; i < 400; i++) { m.step(1 / 60, go); m.settle(wall); }
    expect(m.z + CAR.half).toBeLessThan(19.2);
    expect(m.speed).toBeLessThan(1);
    for (let i = 0; i < 200; i++) { m.step(1 / 60, { throttle: -1, steer: 0, brake: false }); m.settle(wall); }
    expect(m.z).toBeLessThan(10);
  });
});

describe("the boat", () => {
  it("is slower than the car, glides on when let go, and turns even when barely moving", () => {
    const m = new Motion(BOAT, "boat");
    run(m, 8);
    expect(m.speed).toBeGreaterThan(BOAT.max * 0.9);
    expect(m.speed).toBeLessThanOrEqual(BOAT.max + 1e-6);
    run(m, 2, { throttle: 0, steer: 0, brake: false });
    expect(m.speed).toBeGreaterThan(1);
    const t = new Motion(BOAT, "boat");
    run(t, 2, { throttle: 0, steer: 1, brake: false });
    expect(t.heading).toBeLessThan(-0.4);
  });
});

describe("boxes and strips", () => {
  it("a point is pushed out of a turned box by the nearest way", () => {
    const p = { x: 0.2, z: 0 };
    expect(pushOutOfBox(p, 0.5, 0, 0, PI / 2, 2, 1)).toBe(true); // a box lying along X
    expect(Math.abs(p.z)).toBeCloseTo(1.5);
    const q = { x: 5, z: 0 };
    expect(pushOutOfBox(q, 0.5, 0, 0, PI / 2, 2, 1)).toBe(false);
    const e = { x: 2.2, z: 0 };
    pushOutOfBox(e, 0.5, 0, 0, PI / 2, 2, 1);
    expect(e.x).toBeCloseTo(2.5);
  });
  it("who is ahead: in the strip and within reach, not behind or to the side", () => {
    expect(aheadIn(0, 0, 0, 1, 0.5, 10, 20, 1.5)).toBeCloseTo(10);
    expect(aheadIn(0, 0, 0, 1, 2, 10, 20, 1.5)).toBe(Infinity);
    expect(aheadIn(0, 0, 0, 1, 0, -3, 20, 1.5)).toBe(Infinity);
    expect(aheadIn(0, 0, 0, 1, 0, 25, 20, 1.5)).toBe(Infinity);
  });
});

describe("this town's convertibles and boat", () => {
  const ground = townDrivable(RIDES.lots);
  it("two or three convertibles, each at a curb on the street, along it, with one or two people", () => {
    expect(RIDES.cars.length).toBeGreaterThanOrEqual(2);
    expect(RIDES.cars.length).toBeLessThanOrEqual(3);
    for (const c of RIDES.cars) {
      const fx = Math.sin(c.rot), fz = Math.cos(c.rot);
      for (const k of [-1.2, 0, 1.2]) expect(ground.has(c.x + fx * k, c.z + fz * k), `${c.id} on the street`).toBe(true);
      expect([1, 2]).toContain(c.people);
      // at the curb: a metre or so from the street's edge on its right
      const rx = -Math.cos(c.rot), rz = Math.sin(c.rot);
      expect(ground.has(c.x + rx * 1.6, c.z + rz * 1.6), `${c.id} at the curb`).toBe(false);
    }
  });
  it("clear of the parked cars, the taxi, the traffic's lanes and the people one talks to", () => {
    for (const c of RIDES.cars) {
      for (const [x, z] of [...PARKED_CARS, [TAXI.x, TAXI.z]]) expect(Math.hypot(c.x - x, c.z - z), c.id).toBeGreaterThan(6);
      for (const n of OUTDOOR_NPCS) expect(Math.hypot(c.x - n.x, c.z - n.z), `${c.id}, ${n.npc}`).toBeGreaterThan(5);
      const ez = Math.abs(Math.cos(c.rot)) * CAR.half + Math.abs(Math.sin(c.rot)) * CAR.wide;
      for (const l of TRAFFIC_LANES) if (c.x > l.from - 3 && c.x < l.to + 3) expect(Math.abs(c.z - l.z), `${c.id}, the lane at ${l.z}`).toBeGreaterThan(ez + 1.15);
    }
  });
  it("the boat floats past the wading limit, in the bay, clear of the pier's boards and the rocks", () => {
    expect(RIDES.boats.length).toBeGreaterThanOrEqual(1);
    for (const b of RIDES.boats) {
      const fx = Math.sin(b.rot), fz = Math.cos(b.rot);
      for (const k of [-BOAT.half, 0, BOAT.half]) {
        const x = b.x + fx * k, z = b.z + fz * k;
        expect(z, b.id).toBeLessThanOrEqual(SHORE.limit + 0.3);
        expect(x > BAY.x0 && x < BAY.x1 && z > BAY.z0, b.id).toBe(true);
        for (const [rx, rz, r] of RIDES.rocks) expect(Math.hypot(x - rx, z - rz)).toBeGreaterThan(r + 1);
      }
      // within a step of where one stands: the pier's boards or the wading limit
      const fromDeck = b.x > -18.7 && b.x < -18.7 + 2.4 && b.z < -72 && b.z > -88.4;
      const fromShallows = Math.abs(b.z - BOAT.half * Math.abs(fz) - SHORE.limit) < 2.3 || b.z + BOAT.half * Math.abs(fz) > SHORE.limit - 2.3;
      expect(fromDeck || fromShallows, `${b.id} can be reached`).toBe(true);
    }
    expect(BAY.x0).toBeGreaterThan(WORLD.minX);
    expect(BAY.x1).toBeLessThan(WORLD.maxX);
  });
  it("is one mesh each, the size of the town's other cars", () => {
    const car = convertibleGeometry("#22b8b0"), boat = motorboatGeometry("#2f6db5");
    for (const [g, size] of [[car, CAR_SIZE], [boat, BOAT_SIZE]] as const) {
      g.computeBoundingBox();
      const b = g.boundingBox!;
      expect(b.max.z - b.min.z).toBeGreaterThan(size.length - 0.5);
      expect(b.max.z - b.min.z).toBeLessThan(size.length + 0.5);
      expect(b.max.x - b.min.x).toBeLessThan(size.width + 0.35);
      expect(g.attributes.color).toBeTruthy();
    }
    expect(car.attributes.position.count / 3).toBeLessThan(2600);
    expect(boat.attributes.position.count / 3).toBeLessThan(1200);
    expect(CAR.half * 2).toBeCloseTo(CAR_SIZE.length, 0);
  });
  it("its people have something friendly to say, with its meaning", () => {
    for (const l of [...RIDE_LINES, ...RIDE_BACK_LINES]) { expect(l.en.length).toBeGreaterThan(3); expect(l.lt.length).toBeGreaterThan(3); expect(l.en.length).toBeLessThan(40); }
    expect(RIDE_LINES.length).toBeGreaterThanOrEqual(3);
    expect(RIDE_NAMES.car.en && RIDE_NAMES.boat.en).toBeTruthy();
  });
});

describe("the water past the wading limit", () => {
  it("as far as one wades the floor is the sand it always was; beyond, it falls away to swimming depth", () => {
    for (let z = SHORE.top + 2; z > SHORE.limit; z -= 0.3) expect(floorY(12, z)).toBe(sandY(12, z));
    expect(seaBedY(12, SHORE.limit)).toBeCloseTo(sandY(12, SHORE.limit), 9);
    let last = seaBedY(12, SHORE.limit);
    for (let z = SHORE.limit - 0.1; z > BAY.z0; z -= 0.1) {
      const y = seaBedY(12, z);
      expect(y).toBeLessThanOrEqual(last + 1e-9); // on down, never back up
      expect(last - y).toBeLessThan(0.08);        // and never a step
      last = y;
    }
    expect(last).toBeGreaterThanOrEqual(DEEP.floor);
    // deep enough to swim a stride past the limit, and to dive within a dozen metres of it
    expect(SEA_LEVEL - seaBedY(12, SHORE.limit - 2.5)).toBeGreaterThan(SWIM.depth);
    expect(SEA_LEVEL - seaBedY(12, SHORE.limit - 12)).toBeGreaterThan(SWIM.dive + 0.9);
    expect(SWIM.out).toBeLessThan(SWIM.depth);
  });
  it("there is water over the sea and none over dry land", () => {
    expect(waterY(0, SHORE.limit - 10, 0)).toBeCloseTo(SEA_LEVEL, 0);
    expect(waterY(0, 0, 0)).toBeNull();
  });
  it("the bay's edge takes a step away softly, and lets one back", () => {
    expect(bayHold(-100, -0.1, BAY.z0, -1)).toBe(-0.1);
    expect(bayHold(BAY.z0 + 1, -0.1, BAY.z0, -1)).toBeGreaterThan(-0.05);
    expect(bayHold(BAY.z0, -0.1, BAY.z0, -1)).toBeCloseTo(0, 9);
    expect(bayHold(BAY.z0, 0.1, BAY.z0, -1)).toBe(0.1);
    let z = BAY.z0 + 6;
    for (let i = 0; i < 2000; i++) z += bayHold(z, -3.6 / 60, BAY.z0, -1);
    expect(z).toBeGreaterThanOrEqual(BAY.z0);
    expect(bayHold(BAY.x1 - 1, 0.1, BAY.x1, 1)).toBeLessThan(0.05);
  });
  it("a pool away from the sea: still water, a bed that goes down from its rim, steps as its own floor", () => {
    expect(POOLS.length + FLOORS.length).toBe(0);
    POOLS.push({ x: 300, z: 300, r: 6, y: 0.04, depth: 3.4 });
    FLOORS.push({ x0: 303, x1: 308, z0: 299, z1: 301, y: (x) => (x - 303) * 0.2 });
    try {
      expect(waterY(300, 300, 5)).toBe(0.04);
      expect(waterY(300, 310, 5)).toBeNull();
      expect(floorY(300, 300)).toBeCloseTo(0.04 - 3.4);
      expect(poolBedY(POOLS[0], 305.9, 300)).toBeGreaterThan(-0.7);
      expect(floorY(305, 300)).toBeCloseTo(0.4); // the steps, though inside the pool's circle
      expect(0.04 - floorY(300, 300)).toBeGreaterThan(SWIM.dive + 0.9);
    } finally { POOLS.length = 0; FLOORS.length = 0; }
    expect(DECKS.length).toBe(0);
  });
});
