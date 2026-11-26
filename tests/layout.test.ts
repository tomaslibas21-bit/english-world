// The town's buildings stand clear of the roads, the passing cars' lanes, the parked cars and each other; the newest
// one, Sproutly's warehouse at the east end of Harbor Road, also keeps its distance from the road's end and sidewalks.
import { Raycaster, Vector3 } from "three";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { Ledges } from "../src/game/ledges";
import { FIRST_GATE } from "../src/game/road/run";
import { point } from "../src/game/road/track";
import { BUILDINGS, FOUNTAIN, PARKED_CARS, PARKING_LOTS, ROADS, SIDEWALK, SPROUTLY_LOT, TRAFFIC_CARS, TRAFFIC_LANES, SEA_Z, WORLD } from "../src/game/world/layout";
import { carFootprint, carModelEntry } from "../src/game/world/carModels";
import { LOCATIONS } from "../src/content/locations";

import { exitToTown } from "../src/game/world/roadExit";
import { backgroundHillPosition, buildTown, HILL_MARGIN } from "../src/game/world/town";
import { Colliders, rand } from "../src/game/world/util";
import { townCanvasDocument } from "../tools/town-canvas-stub";

type Box = { x1: number; x2: number; z1: number; z2: number };
const gap = (a: Box, b: Box) => Math.max(a.x1 - b.x2, b.x1 - a.x2, a.z1 - b.z2, b.z1 - a.z2); // < 0: they overlap
const footprint = (b: (typeof BUILDINGS)[number]): Box => ({ x1: b.x - b.w / 2, x2: b.x + b.w / 2, z1: b.z - b.d / 2, z2: b.z + b.d / 2 });
const road = (r: (typeof ROADS)[number], half: number): Box => r.z1 === r.z2
  ? { x1: r.x1, x2: r.x2, z1: r.z1 - half, z2: r.z1 + half }
  : { x1: r.x1 - half, x2: r.x1 + half, z1: r.z1, z2: r.z2 };
const sizes = TRAFFIC_CARS.map(({ model }) => carModelEntry(model).collisionBox);
const hl = Math.max(...sizes.map((size) => size.length)) / 2, hw = Math.max(...sizes.map((size) => size.width)) / 2;
const lanes = TRAFFIC_LANES.map((l): Box => ({ x1: l.from - hl, x2: l.to + hl, z1: l.z - hw, z2: l.z + hw }));
const cars = PARKED_CARS.map(carFootprint).map(({ minX, maxX, minZ, maxZ }) => ({ x1: minX, x2: maxX, z1: minZ, z2: maxZ }));
const contains = (outer: Box, inner: Box) => outer.x1 <= inner.x1 && outer.x2 >= inner.x2 && outer.z1 <= inner.z1 && outer.z2 >= inner.z2;

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

  it("keeps each parked footprint on asphalt and clear of every traffic lane", () => {
    const streets = ROADS.map((r) => road(r, r.w / 2));
    const withSidewalks = ROADS.map((r) => road(r, r.w / 2 + SIDEWALK));
    const lots = PARKING_LOTS.map(({ x0, x1, z0, z1 }): Box => ({ x1: x0, x2: x1, z1: z0, z2: z1 }));
    for (const [i, car] of cars.entries()) {
      const { model, x, z } = PARKED_CARS[i];
      const label = `${model} at (${x}, ${z})`;
      const onStreet = streets.some((street) => contains(street, car));
      // Sidewalks are painted over the lots, so a footprint in a lot must also clear the sidewalks.
      const inLot = lots.some((lot) => contains(lot, car)) && withSidewalks.every((street) => gap(street, car) >= 0);
      expect(onStreet || inLot, `${label} fits on asphalt`).toBe(true);
      for (const lane of lanes) expect(gap(car, lane), `${label} clears the traffic lane at z ${(lane.z1 + lane.z2) / 2}`).toBeGreaterThanOrEqual(0);
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

// The same deterministic hill sequence used by buildTown, including skipped seaward hills.
describe("background hills leave room for the walking camera", () => {
  it("keeps every hill at least 40 m from the playable ground on all sides", () => {
    const r = rand(7);
    let checked = 0;
    for (let i = 0; i < 26; i++) {
      const a = i / 26 * Math.PI * 1.2 - 0.1;
      const x = 35 + Math.cos(a) * (230 + r() * 60), z = 30 + Math.sin(a) * (170 + r() * 50);
      if (z < SEA_Z + 10) continue;
      const size = 30 + r() * 40;
      const p = backgroundHillPosition(x, z, size * 1.6, size * 1.2);
      const gx = Math.max(WORLD.minX - (p.x + size * 1.6), p.x - size * 1.6 - WORLD.maxX);
      const gz = Math.max(SEA_Z - 2 - (p.z + size * 1.2), p.z - size * 1.2 - WORLD.maxZ);
      const gap = gx > 0 && gz > 0 ? Math.hypot(gx, gz) : Math.max(gx, gz);
      expect(gap, `hill ${i}`).toBeGreaterThanOrEqual(HILL_MARGIN);
      r(); // vertical scale in buildTown
      checked++;
    }
    expect(checked).toBeGreaterThan(20);
  });
});

let town: ReturnType<typeof buildTown>;
beforeAll(() => {
  vi.stubGlobal("document", townCanvasDocument());
  try { town = buildTown(); } finally { vi.unstubAllGlobals(); }
  town.group.updateMatrixWorld(true);
});

it("fits both fountain bowls around the photo target and keeps both jump landings", () => {
  const { x, z } = FOUNTAIN;
  const photo = town.photoSpots.find((p) => p.id === "fountain")!;
  expect(photo).toEqual({ id: "fountain", x, y: 1.65, z });
  const circle = town.colliders.circles.find((c) => c.x === x && c.z === z)!;
  expect(circle.r).toBe(3.7);
  const roof = town.colliders.roofs.find((b) => x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ)!;
  expect(roof).toEqual({ minX: x - 1.25, maxX: x + 1.25, minZ: z - 1.25, maxZ: z + 1.25 });

  const solids = town.group.children.filter((o) => o.name.startsWith("town-solid-"));
  const ray = new Raycaster();
  // Section the built stone on both axes, from outside its collider towards the photo anchor.
  for (const [dx, dz] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
    const radiusAt = (y: number) => {
      ray.set(new Vector3(x + dx * 4, y, z + dz * 4), new Vector3(-dx, 0, -dz));
      return 4 - ray.intersectObjects(solids, false)[0].distance;
    };
    expect(radiusAt(0.03)).toBeCloseTo(3.6, 1);
    expect(radiusAt(photo.y)).toBeCloseTo(0.34, 2);
    expect(radiusAt(2.70)).toBeCloseTo(1.20, 2);
  }
  const surface = (dx: number) => {
    ray.set(new Vector3(x + dx, 3.5, z + 0.03), new Vector3(0, -1, 0));
    return ray.intersectObjects(solids, false)[0];
  };
  const stone = surface(3.25), water = surface(2.2);
  expect(stone.point.y).toBeCloseTo(0.88);
  expect(water.point.y).toBeCloseTo(0.81);
  expect(surface(1.05).point.y).toBeCloseTo(2.75);
  expect(surface(0.45).point.y).toBeCloseTo(3.02);
  // Use the two actual town batches and the fountain's own collider and roof to sample the jump surfaces.
  const col = new Colliders();
  col.circles.push({ ...circle }); col.roofs.push(roof);
  const ledges = Ledges.build(town.group, col, { skip: (o) => o !== town.group && o !== stone.object && o !== water.object });
  // Ledges coalesces rows within 4 cm and keeps their highest sample, including the sloped wet edge.
  for (const [dx, height] of [[2.2, 0.81], [1.05, 2.75]]) {
    const support = ledges.support(x + dx, z, height, true);
    expect(support).toBeGreaterThanOrEqual(height - 1e-6);
    expect(support).toBeLessThan(height + 0.04);
  }
});

it("keeps the west beach backed by green hills and leaves the Main Street crest open", () => {
  const meadow = town.group.getObjectByName("outer-grass")!;
  const preview = town.group.getObjectByName("desert-road-crest")!;
  const hills = town.exitHills!;
  const scenery = [meadow, preview, town.sea, hills];
  const ray = new Raycaster();
  const sight = (eye: Vector3, target: Vector3) => {
    ray.set(eye, target.clone().sub(eye).normalize());
    return ray.intersectObjects(scenery, false).find(({ point }) => point.x < WORLD.minX);
  };

  for (const [x, z] of [[-72, -66], [-92, -64], [-101.5, -60]]) {
    const eye = new Vector3(x, 6, z);
    for (const turn of [-9, 0, 9]) {
      const ridge = sight(eye, new Vector3(x - 100, 4.8, z + turn));
      expect(ridge?.object, `ridgeline from (${x}, ${z}), bearing ${turn}`).toBe(hills);
      expect(sight(eye, new Vector3(x - 100, 11, z + turn))?.object).not.toBe(preview);
    }
  }
  const surface = (x: number, z: number) => sight(new Vector3(x, 20, z), new Vector3(x, -1, z));
  expect(surface(-150, SEA_Z + 3)?.object).toBe(meadow);
  expect(surface(-150, SEA_Z - 3)?.object).toBe(town.sea);

  const world = (distance: number, side = 0, lift = 0) => point(distance, side, lift).applyMatrix4(exitToTown);
  for (const distance of [-20, 0, 4, 16, 40, 104]) {
    const asphalt = world(distance);
    const hit = surface(asphalt.x, asphalt.z);
    expect(hit?.object).toBe(preview);
    expect(hit!.point.y).toBeCloseTo(asphalt.y, 1);
  }
  const marking = world(4, 2);
  expect(surface(marking.x, marking.z)!.point.y - marking.y).toBeCloseTo(0.026, 2);
  const gate = world(FIRST_GATE, 0, 4.22);
  const gateHit = sight(world(-10, 0, 4), gate);
  expect(gateHit?.object).toBe(preview);
  expect(gateHit!.point.distanceTo(gate)).toBeLessThan(1);
});
