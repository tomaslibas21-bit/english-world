// The town's buildings stand clear of the roads, the passing cars' lanes, the parked cars and each other; the newest
// one, Sproutly's warehouse at the east end of Harbor Road, also keeps its distance from the road's end and sidewalks.
import { describe, expect, it } from "vitest";
import { BUILDINGS, CAR, PARKED_CARS, ROADS, SIDEWALK, SPROUTLY_LOT, TAXI, TRAFFIC_LANES } from "../src/game/world/layout";
import { LOCATIONS } from "../src/content/locations";

type Box = { x1: number; x2: number; z1: number; z2: number };
const gap = (a: Box, b: Box) => Math.max(a.x1 - b.x2, b.x1 - a.x2, a.z1 - b.z2, b.z1 - a.z2); // < 0: they overlap
const footprint = (b: (typeof BUILDINGS)[number]): Box => ({ x1: b.x - b.w / 2, x2: b.x + b.w / 2, z1: b.z - b.d / 2, z2: b.z + b.d / 2 });
const road = (r: (typeof ROADS)[number], half: number): Box => r.z1 === r.z2
  ? { x1: r.x1, x2: r.x2, z1: r.z1 - half, z2: r.z1 + half }
  : { x1: r.x1 - half, x2: r.x1 + half, z1: r.z1, z2: r.z2 };
const car = (x: number, z: number, rot: number): Box => {
  const along = Math.abs(Math.sin(rot)) > 0.5;
  const hx = (along ? CAR.length : CAR.width) / 2, hz = (along ? CAR.width : CAR.length) / 2;
  return { x1: x - hx, x2: x + hx, z1: z - hz, z2: z + hz };
};
const lanes = TRAFFIC_LANES.map((l): Box => ({ x1: l.from - CAR.length / 2, x2: l.to + CAR.length / 2, z1: l.z - CAR.width / 2, z2: l.z + CAR.width / 2 }));
const cars = [...PARKED_CARS.map(([x, z, r]) => car(x, z, r)), car(TAXI.x, TAXI.z, TAXI.rot)];

describe("town layout", () => {
  it("no building stands on a road, in a traffic lane, on a parked car or on another building (touching is fine)", () => {
    for (const b of BUILDINGS) {
      const f = footprint(b);
      for (const r of ROADS) expect(gap(f, road(r, r.w / 2)), `${b.id} on ${r.name}`).toBeGreaterThanOrEqual(0);
      for (const l of lanes) expect(gap(f, l), `${b.id} in a lane`).toBeGreaterThanOrEqual(0);
      for (const c of cars) expect(gap(f, c), `${b.id} on a parked car`).toBeGreaterThanOrEqual(0);
      for (const o of BUILDINGS) if (o !== b) expect(gap(f, footprint(o)), `${b.id} and ${o.id}`).toBeGreaterThanOrEqual(0);
    }
  });

  it("Sproutly: a warehouse in the harbor district, its door at the end of Harbor Road, clear of the street", () => {
    const b = BUILDINGS.find((x) => x.loc === "sproutly")!;
    expect(b).toBeTruthy();
    expect(LOCATIONS.sproutly.district).toBe("harbor");
    expect(b.sign).toBe(LOCATIONS.sproutly.name);
    const f = footprint(b);
    // every road with its sidewalks (where the lamps and street trees stand) at least 8 m away
    for (const r of ROADS) expect(gap(f, road(r, r.w / 2 + SIDEWALK)), r.name).toBeGreaterThan(8);
    // the passing cars turn back at least 10 m before it
    for (const l of lanes) expect(gap(f, l)).toBeGreaterThan(10);
    // the door faces west down Harbor Road, and the forecourt joins the road's end to the door
    const harbor = ROADS.find((r) => r.name === "Harbor Road")!;
    expect(b.face).toBe("w");
    expect(Math.abs(b.z - (b.doorOffset ?? 0) - harbor.z1)).toBeLessThan(1); // along a west facade the door offset runs north (-z)
    expect(SPROUTLY_LOT.x1).toBe(harbor.x2);
    expect(SPROUTLY_LOT.x2).toBe(b.x - b.w / 2);
    expect(SPROUTLY_LOT.z1).toBeGreaterThanOrEqual(harbor.z1 - harbor.w / 2);
    expect(SPROUTLY_LOT.z2).toBeLessThanOrEqual(harbor.z1 + harbor.w / 2);
  });
});
