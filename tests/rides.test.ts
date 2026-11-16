// What one can drive and swimming, without a browser: the car's and the boat's arithmetic (rides/drive.ts), the
// streets a car stays on, the plan of this town's convertibles and boat (world/rides.ts), and the water past the
// wading limit (water.ts). In the real game: tests/browser/rides.mjs.
import { describe, expect, it } from "vitest";
import { Drivable, Motion, CAR, BOAT, BAY_EDGE, CAR_DRIFT, BOAT_DRIFT, bayTurn, shoreSpeed, controlsFrom, pushOutOfBox, aheadIn, aheadOnArc, startles } from "../src/game/rides/drive";
import { townAsphalt, townGround } from "../src/game/rides/ground";
import { convertibleGeometry, motorboatGeometry, buoysGeometry, CAR_SIZE, BOAT_SIZE } from "../src/game/rides/shapes";
import { RIDES } from "../src/game/world/rides";
import { SHALLOWS } from "../src/game/rides/Rides";
import { RIDE_OWNERS, RIDE_SHOUTS, RIDE_NAMES } from "../src/content/rides";
import { rideVoice, shoutVoice } from "../src/content/voices";
import { roleFor, VOICES } from "../tools/casting";
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
  it("gets to its town pace at once, picks up to its top speed on a held course and no more; the brake stops it in a few metres", () => {
    const m = new Motion(CAR, "car");
    run(m, 2.2);
    expect(m.speed).toBeGreaterThan(CAR.town * 0.8);
    expect(m.speed).toBeLessThanOrEqual(CAR.town + 0.6);
    run(m, 7);
    expect(m.speed).toBeGreaterThan(CAR.max * 0.92);
    expect(m.speed).toBeLessThanOrEqual(CAR.max + 1e-6);
    expect(m.z).toBeGreaterThan(60); // heading 0 is +Z
    const z0 = m.z;
    run(m, 1.5, { throttle: 0, steer: 0, brake: true });
    expect(m.speed).toBe(0);
    expect(m.z - z0).toBeLessThan(10);
  });
  it("a sharp turn or the brake brings it back to its town pace; off the asphalt it goes gently", () => {
    const m = new Motion(CAR, "car");
    run(m, 9);
    expect(m.top).toBeCloseTo(CAR.max, 3);
    run(m, 1.2, { throttle: 1, steer: 1, brake: false });
    expect(m.top).toBeLessThan(CAR.town + 0.5);
    expect(m.speed).toBeLessThan(CAR.town + 2.5);
    // a gentle bend keeps it
    const b = new Motion(CAR, "car");
    run(b, 9); run(b, 1.5, { throttle: 1, steer: 0.25, brake: false });
    expect(b.top).toBeCloseTo(CAR.max, 3);
    // off the asphalt (a sidewalk, a square, grass, sand)
    const o = new Motion(CAR, "car");
    for (let i = 0; i < 600; i++) o.step(1 / 60, go, Infinity, false);
    expect(o.speed).toBeGreaterThan(CAR.rough * 0.9);
    expect(o.speed).toBeLessThanOrEqual(CAR.rough + 1e-6);
    // and coming off it at speed, it is eased down, not stopped
    const q = new Motion(CAR, "car");
    run(q, 9);
    q.step(1 / 60, go, Infinity, false);
    expect(q.speed).toBeGreaterThan(CAR.max - 1);
    for (let i = 0; i < 180; i++) q.step(1 / 60, go, Infinity, false);
    expect(q.speed).toBeLessThanOrEqual(CAR.rough + 0.1);
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
        m.step(1 / 60, go, gap > 0 && gap < 34 ? gap : Infinity);
        if (last > 1.5) hardest = Math.max(hardest, (last - m.speed) * 60);
        last = m.speed;
        expect(person - m.z - CAR.half, `from ${d} m`).toBeGreaterThan(1);
      }
      expect(m.speed).toBeLessThan(0.05);
      // (seen from 34 m at any speed: no harder than the yield's own braking, with a little to spare)
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

describe("holding the road, and getting out of tight places", () => {
  const fast = () => { const m = new Motion(CAR, "car"); run(m, 6); return m; };
  it("the brake is the brake, in a turn too: no slide is started by hand, it stops where it is pointed", () => {
    const m = fast();
    expect(m.speed).toBeGreaterThan(CAR.max * 0.95);
    run(m, 1.4, { throttle: 0, steer: 0, brake: true });
    expect(m.speed).toBeLessThan(0.5);
    const d = fast();
    let most = 0, slid = false;
    run(d, 1.4, { throttle: 1, steer: 1, brake: true }, () => { if (d.pace > 3) most = Math.max(most, Math.abs(d.drifted)); slid ||= d.drift; });
    expect(slid).toBe(false);
    expect(d.pace).toBeLessThan(0.5);
    expect(most).toBeLessThanOrEqual(CAR_DRIFT.angle + 0.02);
    expect(d.boost).toBe(0);
  });
  it("it goes where it is pointed: its course on its nose in a turn at town pace, and going straight at any pace", () => {
    const m = new Motion(CAR, "car");
    let most = 0;
    run(m, 4, { throttle: 0.9, steer: 1, brake: false }, () => { most = Math.max(most, Math.abs(m.drifted)); });
    expect(m.pace).toBeLessThan(CAR_DRIFT.looseFrom);
    expect(most).toBeLessThan(CAR_DRIFT.catch);
    expect(Math.abs(fast().slip)).toBeLessThan(1e-6);
  });
  it("only really fast with the wheel hard over does it slide a little: a few degrees, never a spin, caught at once when the wheel is eased", () => {
    const m = fast();
    let most = 0;
    run(m, 1.2, { throttle: 1, steer: 1, brake: false }, () => { most = Math.max(most, Math.abs(m.drifted)); });
    expect(most).toBeGreaterThan(CAR_DRIFT.catch);
    expect(most).toBeLessThanOrEqual(CAR_DRIFT.angle + 0.02);
    expect(m.drift).toBe(false);
    // (it still goes round the bend as the wheel says: to the right is a smaller heading)
    expect(m.heading).toBeLessThan(-0.6);
    // the wheel eased: on its nose again within half a second, and no kick comes of it
    run(m, 0.5, { throttle: 1, steer: 0, brake: false });
    expect(Math.abs(m.drifted)).toBeLessThan(0.03);
    expect(m.boost).toBe(0);
    // a gentle turn at the same pace does not slide at all
    const g = fast();
    let soft = 0;
    run(g, 1.2, { throttle: 1, steer: 0.5, brake: false }, () => { soft = Math.max(soft, Math.abs(g.drifted)); });
    expect(soft).toBeLessThan(CAR_DRIFT.catch);
  });
  it("nearly stopped it comes round on the spot under power: right round in under three seconds, in a few metres", () => {
    const m = new Motion(CAR, "car");
    let far = 0, t = 0;
    for (; t < 4 && Math.abs(Math.atan2(Math.sin(m.heading), Math.cos(m.heading))) < 3.0; t += 1 / 60) {
      // (a light foot, as one drives in a tight place)
      m.step(1 / 60, { throttle: 0.4, steer: 1, brake: false });
      far = Math.max(far, Math.hypot(m.x, m.z));
    }
    expect(t).toBeLessThan(3);
    expect(far).toBeLessThan(7);
    // and at a standstill, in the first half second, it has already swung a good way round without going anywhere
    const p = new Motion(CAR, "car");
    run(p, 0.5, { throttle: 0.4, steer: 1, brake: false });
    expect(-p.heading).toBeGreaterThan(0.5);
    expect(Math.hypot(p.x, p.z)).toBeLessThan(1);
    // backing up it turns the other way, as a car's tail does
    const b = new Motion(CAR, "car");
    run(b, 0.6, { throttle: -1, steer: 1, brake: false });
    expect(b.heading).toBeGreaterThan(0.3);
    // the turning circle at a walk is tight
    expect(CAR.base / Math.tan(CAR.lockSlow)).toBeLessThan(3);
  });
  it("it backs up briskly", () => {
    const m = new Motion(CAR, "car");
    run(m, 1.5, { throttle: -1, steer: 0, brake: false });
    expect(m.speed).toBeLessThan(-5.5);
    expect(m.speed).toBeGreaterThanOrEqual(-CAR.back - 1e-6);
  });
  it("against a wall it loses what went into the wall and keeps the rest: it slides along it", () => {
    const m = fast();
    m.heading = 0.5; // going 29° into a wall along z, on its right-hand side… as the game's headings turn: towards +X
    const v0 = m.speed;
    // a wall: nothing may be at x > 1
    for (let i = 0; i < 60; i++) { m.step(1 / 60, go); m.settle((p, r) => { if (p.x > 1 - r) p.x = 1 - r; }); }
    expect(m.pace).toBeGreaterThan(v0 * 0.6);
    expect(Math.abs(Math.sin(m.heading))).toBeLessThan(0.2);
    // head on, it stops
    const h = fast();
    h.heading = PI / 2;
    for (let i = 0; i < 20; i++) { h.step(1 / 60, { throttle: 0, steer: 0, brake: false }); h.settle((p, r) => { if (p.x > 1 - r) p.x = 1 - r; }); }
    expect(h.pace).toBeLessThan(1);
  });
  it("the boat keeps its own small slide in a hard turn at speed; its brake only slows it", () => {
    const m = new Motion(BOAT, "boat");
    run(m, 8);
    let most = 0;
    run(m, 1.5, { throttle: 1, steer: 1, brake: false }, () => { most = Math.max(most, Math.abs(m.drifted)); });
    expect(most).toBeGreaterThan(0.1);
    expect(most).toBeLessThanOrEqual(BOAT_DRIFT.angle + 0.02);
    const b = new Motion(BOAT, "boat");
    run(b, 8);
    const v0 = b.pace;
    run(b, 1, { throttle: 1, steer: 1, brake: true });
    expect(b.drift).toBe(false);
    expect(b.pace).toBeLessThan(v0 - 3);
  });
  it("who starts at a car: only someone it is really coming at; nobody on the sidewalk while it keeps to the street", () => {
    const hl = CAR.half, hw = CAR.wide, v = 12;
    // on the street, right in its way or a short step from its side, ahead of it: they jump
    expect(startles(5, 0, v, hl, hw, true, true)).toBe(true);
    expect(startles(5, hw + 0.6, v, hl, hw, true, true)).toBe(true);
    // on the sidewalk beside the street it drives along (2 m and more from its side): left in peace, however fast
    expect(startles(5, hw + 2, 15, hl, hw, false, true)).toBe(false);
    expect(startles(3, hw + 0.6, 15, hl, hw, false, true)).toBe(false);
    // …unless it is heading straight at them over the kerb
    expect(startles(4, 0.3, v, hl, hw, false, true)).toBe(true);
    // the car itself on the sidewalk or a square, coming at them: they jump; well to its side they do not
    expect(startles(4, 0.5, 6, hl, hw, false, false)).toBe(true);
    expect(startles(4, hw + 1.5, 6, hl, hw, false, false)).toBe(false);
    // beside it, behind it or far ahead: nobody
    expect(startles(-1, 0.5, v, hl, hw, true, true)).toBe(false);
    expect(startles(hl + 1 + v * 0.45 + 1, 0, v, hl, hw, true, true)).toBe(false);
  });
});

describe("the boat", () => {
  it("is slower than the car, glides on when let go, and turns even when barely moving", () => {
    const m = new Motion(BOAT, "boat");
    run(m, 2.6);
    expect(m.speed).toBeLessThanOrEqual(BOAT.town + 0.5);
    run(m, 12);
    expect(m.speed).toBeGreaterThan(BOAT.max * 0.9);
    expect(m.speed).toBeLessThanOrEqual(BOAT.max + 1e-6);
    run(m, 2, { throttle: 0, steer: 0, brake: false });
    expect(m.speed).toBeGreaterThan(1);
    const t = new Motion(BOAT, "boat");
    run(t, 2, { throttle: 0, steer: 1, brake: false });
    expect(t.heading).toBeLessThan(-0.4);
    // (under power it comes round faster than adrift, even at a standstill: its bow on the shallows)
    const a = new Motion(BOAT, "boat"), d = new Motion(BOAT, "boat");
    a.step(1 / 60, { throttle: 1, steer: 1, brake: false }); a.speed = 0;
    for (let i = 0; i < 60; i++) { a.step(1 / 60, { throttle: 1, steer: 1, brake: false }); a.speed = 0; d.step(1 / 60, { throttle: 0, steer: 1, brake: false }); }
    expect(-a.heading).toBeGreaterThan(-d.heading * 1.5);
  });
  it("making for the bay's edge its bow comes round by itself; away from it, or heading in, it is left alone", () => {
    const north = { left: 6, nx: 0, nz: -1 }, east = { left: 6, nx: 1, nz: 0 };
    const m = new Motion(BOAT, "boat");
    // out to sea a little east of north: round by the east (a smaller heading from north is… towards the east)
    m.set(0, 0, PI - 0.3); m.speed = 9;
    const t = bayTurn(m, [north]);
    expect(Math.abs(t)).toBeGreaterThan(0.3);
    expect(Math.sign(t)).toBe(-1);
    // heading back in, or far from the edge: nothing
    m.set(0, 0, 0.2); m.speed = 9;
    expect(bayTurn(m, [north])).toBe(0);
    m.set(0, 0, PI); m.speed = 9;
    expect(bayTurn(m, [{ ...north, left: BAY_EDGE.band + 1 }])).toBe(0);
    // dead on: it still comes round (to starboard), and keeps to that way
    m.set(0, 0, PI); m.speed = 9;
    expect(bayTurn(m, [north])).toBeLessThan(0);
    // in a corner the two edges turn it one way round, not against each other: it gets out
    m.set(0, 0, (3 * PI) / 4); m.speed = 9;
    let h = m.heading;
    for (let i = 0; i < 240; i++) { h += bayTurn(m, [north, east]) / 60; m.heading = h; }
    const outN = -Math.cos(m.heading), outE = Math.sin(m.heading);
    expect(Math.max(outN, outE)).toBeLessThan(0.75);
    expect(Math.min(outN, outE)).toBeLessThan(0.06);
    // backing out over the edge: the stern comes round too
    m.set(0, 0, 0.3); m.speed = -2;
    expect(bayTurn(m, [north])).not.toBe(0);
  });
  it("running in to the beach it eases off: full speed with water ahead, a crawl on the shallows", () => {
    expect(shoreSpeed(BAY_EDGE.shore)).toBeGreaterThanOrEqual(BOAT.max);
    expect(shoreSpeed(0)).toBeLessThan(1);
    expect(shoreSpeed(-2)).toBe(shoreSpeed(0));
    for (let d = 0; d < 14; d += 0.5) expect(shoreSpeed(d + 0.5)).toBeGreaterThan(shoreSpeed(d));
  });
  it("the bay's edge is a line of buoys in one mesh", () => {
    const g = buoysGeometry([[0, 0], [15, 0], [30, 0]]);
    g.computeBoundingBox();
    expect(g.boundingBox!.max.x - g.boundingBox!.min.x).toBeGreaterThan(30);
    expect(g.boundingBox!.max.y).toBeGreaterThan(1.3);
    expect(g.attributes.position.count / 3 / 3).toBeLessThan(90);
    expect(g.attributes.color).toBeTruthy();
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
  it("who is on its way with the wheel turned: along the arc, not straight ahead", () => {
    // straight: the strip
    expect(aheadOnArc(0, 0, 0, 1, 0, 0.5, 10, 20, 1.5)).toBeCloseTo(10);
    // a turn to the right of radius 5 (facing +Z, the right is −X): someone straight ahead at 6 m is off it…
    expect(aheadOnArc(0, 0, 0, 1, 1 / 5, 0, 6, 20, 1.2)).toBe(Infinity);
    // …someone a quarter turn round is on it, a quarter of the circle away
    expect(aheadOnArc(0, 0, 0, 1, 1 / 5, -5, 5, 20, 1.2)).toBeCloseTo((PI / 2) * 5, 1);
    // the same to the left; behind is never ahead
    expect(aheadOnArc(0, 0, 0, 1, -1 / 5, 5, 5, 20, 1.2)).toBeCloseTo((PI / 2) * 5, 1);
    expect(aheadOnArc(0, 0, 0, 1, 1 / 5, -0.3, -2, 20, 1.2)).toBe(Infinity);
    // right in front of the bumper it still counts, turned wheel or not
    expect(aheadOnArc(0, 0, 0, 1, 1 / 5, 0, 2.5, 20, 1.5)).toBeLessThan(3);
    // a car's wheel: straight at a standstill is no curve; turned right, to the right; backing up, the other way
    const m = new Motion(CAR, "car");
    expect(m.curve()).toBe(0);
    m.steer = 1;
    expect(m.curve()).toBeGreaterThan(0.2);
    expect(m.curve(-1)).toBeCloseTo(-m.curve());
    m.speed = CAR.max;
    expect(m.curve()).toBeLessThan(0.08);
  });
  it("past someone straight ahead whom its wheel takes it round: at a careful pace, not a stop", () => {
    const m = new Motion(CAR, "car");
    m.speed = 9;
    for (let i = 0; i < 90; i++) m.step(1 / 60, { throttle: 1, steer: 0, brake: false }, Infinity, true, 4);
    expect(m.speed).toBeGreaterThan(CAR.careful - 0.3);
    expect(m.speed).toBeLessThan(CAR.careful + 0.6);
    // someone on its way: a stop
    for (let i = 0; i < 90; i++) m.step(1 / 60, { throttle: 1, steer: 0, brake: false }, 3, true, 3);
    expect(Math.abs(m.speed)).toBeLessThan(0.3);
  });
});

describe("this town's convertibles and boat", () => {
  const ground = townAsphalt(RIDES.lots);
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
  it("the boats float in the bay's shallows, clear of the rocks, and each is walked up to and taken from the sand", () => {
    expect(RIDES.boats.length).toBeGreaterThanOrEqual(2);
    for (const b of RIDES.boats) {
      const fx = Math.sin(b.rot), fz = Math.cos(b.rot);
      for (const k of [-(BOAT.half - BOAT.wide), 0, BOAT.half - BOAT.wide]) {
        const x = b.x + fx * k, z = b.z + fz * k;
        // (afloat: no further in than the shallows a boat may lie in)
        expect(z, b.id).toBeLessThanOrEqual(SHALLOWS + 1e-6);
        expect(x > BAY.x0 && x < BAY.x1 && z > BAY.z0, b.id).toBe(true);
        for (const [rx, rz, r] of RIDES.rocks) expect(Math.hypot(x - rx, z - rz)).toBeGreaterThan(r + 1);
      }
      // within reach of where one walks: the dry sand at the water's edge (the pier is filled by its restaurant)
      expect(b.z + BOAT.half * Math.abs(fz), `${b.id} can be walked up to`).toBeGreaterThan(SHORE.top - BOAT.reach);
      // and not under the pier's deck (x −41.3 … −18.7)
      expect(b.x - BOAT.wide, b.id).toBeGreaterThan(-18.7);
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
  it("the boat's pointed bow is in front (+z, where its locker and light are), its flat stern by the outboard", () => {
    // (the owner, 16 Nov: the player sat facing the flat end, the hull having been stood up back to front)
    const pos = motorboatGeometry("#2f6db5").attributes.position;
    let front = -Infinity, back = Infinity;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      if (y > 0.15 || Math.abs(x) < 0.6) continue; // the hull's bottom, away from its middle line
      front = Math.max(front, z); back = Math.min(back, z);
    }
    expect(back).toBeLessThan(-2.1); // full width right to the stern's flat end
    expect(front).toBeLessThan(2.0); // narrowing well before the bow's point
  });
  it("every seat has someone of their own in it: a voice and a few lines nobody else says", () => {
    const voices = new Set<string>(), said = new Set<string>();
    for (const c of RIDES.cars) {
      const who = RIDE_OWNERS[c.id];
      expect(who?.length, c.id).toBeGreaterThanOrEqual(c.people);
      for (const o of who) {
        const v = rideVoice(o.id, o.female);
        expect(voices.has(v), v).toBe(false);
        voices.add(v);
        expect(o.take.length, o.id).toBeGreaterThanOrEqual(4);
        expect(o.back.length, o.id).toBeGreaterThanOrEqual(2);
        for (const l of [...o.take, ...o.back]) {
          expect(l.en.length).toBeGreaterThan(3); expect(l.lt.length).toBeGreaterThan(3); expect(l.en.length).toBeLessThan(48);
          expect(said.has(l.en), l.en).toBe(false);
          said.add(l.en);
        }
      }
    }
    expect(RIDE_NAMES.car.en && RIDE_NAMES.boat.en).toBeTruthy();
  });
  it("the owners and the passers-by who call after a car are cast: a voice of the right gender, a manner", () => {
    const g = (voice: string) => VOICES.find((v) => v.name === voice)?.g;
    for (const who of Object.values(RIDE_OWNERS)) for (const o of who) {
      const r = roleFor(rideVoice(o.id, o.female, true));
      expect(r, o.id).toBeTruthy();
      expect(g(r!.voice), o.id).toBe(o.female ? "f" : "m");
      expect(r!.style.length).toBeGreaterThan(10);
    }
    const calling = new Set<string>();
    for (const female of [true, false]) for (const n of [0, 1, 2, 3]) {
      const id = shoutVoice(female, n, true), r = roleFor(id);
      expect(r, id).toBeTruthy();
      expect(g(r!.voice), id).toBe(female ? "f" : "m");
      calling.add(id);
    }
    // (two voices a gender; with the first voices, the passers-by's own)
    expect(calling.size).toBe(4);
    expect(shoutVoice(true, 0, false)).not.toMatch(/^g_/);
  });
  it("passers-by have a few things to call after a car, none of them unkind", () => {
    expect(RIDE_SHOUTS.length).toBeGreaterThanOrEqual(5);
    for (const l of RIDE_SHOUTS) { expect(l.en.length).toBeLessThan(32); expect(l.lt.length).toBeGreaterThan(3); expect(l.en).not.toMatch(/idiot|stupid|crazy|damn|hell/i); }
  });
  it("a car goes anywhere in the town that is open and dry: the square, a sidewalk, the grass; never into the sea", () => {
    const all = townGround();
    expect(all.has(28, -30)).toBe(true);   // the square
    expect(all.has(0, -14)).toBe(true);    // a sidewalk on Main Street
    expect(all.has(100, -30)).toBe(true);  // the park
    expect(all.has(0, SHORE.top + 3)).toBe(true); // dry sand
    expect(all.has(0, SHORE.top)).toBe(false);
    expect(all.has(0, SHORE.limit)).toBe(false);
    expect(all.has(WORLD.minX - 1, 0)).toBe(false);
    expect(all.has(WORLD.maxX, 0)).toBe(false);
    // the asphalt: where it may pick up speed
    expect(ground.has(0, -8)).toBe(true);
    expect(ground.has(28, -30)).toBe(false);
    for (const [x1, z1, x2, z2] of RIDES.bumps) { expect(ground.has((x1 + x2) / 2, (z1 + z2) / 2)).toBe(true); expect(Math.hypot(x2 - x1, z2 - z1)).toBeGreaterThan(5); }
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
