import { BufferGeometry, Color, Group, Mesh, MeshLambertMaterial, Raycaster, Vector3 } from "three";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import * as rideFinishes from "../src/game/rides/finishes";
import { BOAT_SEATS, CAR_SEATS, convertibleGeometry, motorboatGeometry } from "../src/game/rides/shapes";
import { collisionRanges } from "../src/game/collisionGeometry";
import { buildTownField, buildTownLedges } from "../src/game/townCollision";
import { buildTown } from "../src/game/world/town";
import { Merger } from "../src/game/world/util";
import { townCanvasDocument } from "../tools/town-canvas-stub";

const POLICE = ["#536f7d", "#809697", "#c6beac", "#7c9197"];
const RENTAL = ["#b79a71", "#cfb377", "#7b826c", "#ac946c", "#c3a25a"];
let original: ReturnType<typeof buildTown>, town: ReturnType<typeof buildTown>;
const signature = (r: number, g: number, b: number) => `${Math.fround(r)},${Math.fround(g)},${Math.fround(b)}`;

function bounds(g: BufferGeometry) {
  g.computeBoundingBox();
  return [g.boundingBox!.min.toArray(), g.boundingBox!.max.toArray()];
}

function probe(root: Group, x: number, y: number, z: number, dx: number, dy: number, dz: number) {
  const ray = new Raycaster(new Vector3(x, y, z), new Vector3(dx, dy, dz), 0, 3);
  const hit = ray.intersectObject(root, true).find(({ object }) => {
    const material = (object as Mesh).material;
    return (Array.isArray(material) ? material : [material]).some((m) => !m.transparent || m.opacity >= 0.6);
  });
  expect(hit).toBeDefined();
  const mesh = hit!.object as Mesh, c = mesh.geometry.getAttribute("color");
  const color = c ? new Color().fromBufferAttribute(c, hit!.face!.a) : (mesh.material as MeshLambertMaterial).color;
  return { point: hit!.point, hex: `#${color.getHexString()}` };
}

function vehicleProbe(geometry: BufferGeometry, x: number, y: number, z: number, dx: number, dy: number, dz: number) {
  const root = new Group();
  root.add(new Mesh(geometry, new MeshLambertMaterial({ vertexColors: true })));
  root.updateMatrixWorld(true);
  return probe(root, x, y, z, dx, dy, dz);
}

function worldFinish(palette: string[]) {
  const keys = new Set(palette.map((hex) => {
    const c = new Color(hex); return signature(c.r, c.g, c.b);
  }));
  let triangles = 0;
  const points: Vector3[] = [], found = new Set<string>();
  town.group.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const g = object.geometry, p = g.getAttribute("position"), c = g.getAttribute("color");
    if (!p || !c) return;
    const physical = collisionRanges(g);
    for (let i = 0, n = g.index?.count ?? p.count; i < n; i += 3) {
      const a = g.index?.getX(i) ?? i, key = signature(c.getX(a), c.getY(a), c.getZ(a));
      if (!keys.has(key)) continue;
      found.add(key); triangles++;
      expect(physical.some(([start, end]) => i >= start && i < end)).toBe(false);
      expect(object.name.startsWith("town-solid-")).toBe(true);
      expect(object.material).toMatchObject({ vertexColors: true, transparent: false, map: null });
      for (let j = 0; j < 3; j++) points.push(new Vector3().fromBufferAttribute(p, g.index?.getX(i + j) ?? i + j).applyMatrix4(object.matrixWorld));
    }
  });
  expect(found.size).toBe(palette.length);
  return { triangles, points };
}

beforeAll(() => {
  vi.stubGlobal("document", townCanvasDocument());
  const add = Merger.prototype.addVisual;
  const omit = vi.spyOn(Merger.prototype, "addVisual").mockImplementation(function (this: Merger, key, material, geometry, cast, receive) {
    if (key.startsWith("glow-b9-")) { geometry.dispose(); return; }
    add.call(this, key, material, geometry, cast, receive);
  });
  try {
    original = buildTown();
    omit.mockRestore();
    town = buildTown();
  } finally { omit.mockRestore(); vi.unstubAllGlobals(); }
  town.group.updateMatrixWorld(true);
}, 20_000);

afterEach(() => vi.restoreAllMocks());

describe("Maple Harbor glow B9", () => {
  it("finishes the convertible cockpit in one geometry with identical bounds and wheel vertices", () => {
    const omit = vi.spyOn(rideFinishes, "convertibleFinishParts").mockReturnValue([]);
    const before = convertibleGeometry("#22b8b0");
    omit.mockRestore();
    const car = convertibleGeometry("#22b8b0");
    expect(car.getAttribute("position").count - before.getAttribute("position").count).toBe(50 * 3);
    expect(rideFinishes.convertibleFinishParts().reduce((n, [g]) => n + (g.index?.count ?? g.getAttribute("position").count) / 3, 0)).toBeLessThanOrEqual(64);
    expect(bounds(car)).toEqual(bounds(before));
    expect(car.groups).toHaveLength(0);
    expect(car.getAttribute("color").count).toBe(car.getAttribute("position").count);
    const wheels = (g: BufferGeometry) => {
      const [start, end] = g.userData.crashWheels as [number, number], p = g.getAttribute("position");
      return Array.from({ length: end - start }, (_, i) => [p.getX(start + i), p.getY(start + i), p.getZ(start + i)]);
    };
    expect(wheels(car)).toEqual(wheels(before));
    expect(car.userData.crashWheels[0] - before.userData.crashWheels[0]).toBe(150);
    expect(vehicleProbe(car, -0.38, 0.8, -0.8, 0, 0, 1).hex).toBe("#ab9d83");
    const cushion = vehicleProbe(car, -0.38, 0.7, -0.24, 0, -1, 0);
    expect(cushion.hex).toBe("#d8c7a7"); expect(cushion.point.y).toBeCloseTo(0.562);
    expect(CAR_SEATS).toEqual({ floor: 0.22, seat: 0.3, recline: 0.3, driver: [0.43, -0.34], passenger: [-0.43, -0.34] });
  });

  it("finishes the motorboat thwarts and locker without changing its hull envelope, helm or waterline", () => {
    const omit = vi.spyOn(rideFinishes, "motorboatFinishParts").mockReturnValue([]);
    const before = motorboatGeometry("#2f6db5");
    omit.mockRestore();
    const boat = motorboatGeometry("#2f6db5");
    expect(boat.getAttribute("position").count - before.getAttribute("position").count).toBe(74 * 3);
    expect(rideFinishes.motorboatFinishParts().reduce((n, [g]) => n + (g.index?.count ?? g.getAttribute("position").count) / 3, 0)).toBeLessThanOrEqual(88);
    expect(bounds(boat)).toEqual(bounds(before)); expect(boat.groups).toHaveLength(0);
    expect(boat.getAttribute("color").count).toBe(boat.getAttribute("position").count);
    const thwart = vehicleProbe(boat, 0.1, 0.8, -0.99, 0, -1, 0);
    expect(thwart.hex).toBe("#d1a77c"); expect(thwart.point.y).toBeCloseTo(0.533);
    const lid = vehicleProbe(boat, 0, 1, 1.9, 0, -1, 0);
    expect(lid.hex).toBe("#bb9569"); expect(lid.point.y).toBeCloseTo(0.623);
    expect(vehicleProbe(boat, -0.82, 1, -1.75, 0, -1, 0).hex).toBe("#7e8b87");
    expect(BOAT_SEATS).toEqual({ floor: 0.2, seat: 0.3, helm: [0, -1.05], water: 0.34 });
  });

  it("frames the police opening and threshold while retaining the exposed glass and original push bar", () => {
    const portal = worldFinish(POLICE);
    expect(portal.triangles).toBe(16); expect(portal.triangles).toBeLessThanOrEqual(32);
    for (const p of portal.points) {
      expect(Math.abs(p.x - 58)).toBeLessThan(1.101);
      expect(p.z).toBeGreaterThan(-19); expect(p.z).toBeLessThan(-17.74);
      expect(p.y).toBeGreaterThan(0); expect(p.y).toBeLessThan(2.671);
    }
    expect(probe(town.group, 59.02, 1.5, -17, 0, 0, -1).hex).toBe("#536f7d");
    expect(probe(town.group, 58, 0.78, -17, 0, 0, -1).hex).toBe("#7c9197");
    const handle = probe(town.group, 58, 1.05, -17, 0, 0, -1);
    expect(handle.hex).toBe("#c9ced3"); expect(handle.point.z).toBeGreaterThan(-19 + 0.138);
    const tile = probe(town.group, 58.5, 1, -18.3, 0, -1, 0);
    expect(tile.hex).toBe("#809697"); expect(tile.point.y).toBeCloseTo(0.043);
    expect(town.doors.find((d) => d.loc === "police")).toMatchObject({ x: 58, z: -19, outX: 58, outZ: -16.8 });
  });

  it("gives both rental cases a warm base and key teeth while keeping their central glazing clear", () => {
    const display = worldFinish(RENTAL);
    expect(display.triangles).toBe(72); expect(display.triangles).toBeLessThanOrEqual(80);
    for (const x of [78.5, 89]) {
      expect(probe(town.group, x, 0.22, -1, 0, 0, 1).hex).toBe("#b79a71");
      expect(probe(town.group, x + 1.275, 1.5, -1, 0, 0, 1).hex).toBe("#ac946c");
      // The rental faces north: its local +x key board lies to the west of the case center.
      expect(probe(town.group, x - 0.65, 1.587, -1, 0, 0, 1).hex).toBe("#c3a25a");
      const pane = new Raycaster(new Vector3(x, 1.5, -1), new Vector3(0, 0, 1), 0, 3)
        .intersectObject(town.group, true).find(({ object }) => {
          const material = (object as Mesh).material;
          return !Array.isArray(material) && material.transparent;
        });
      expect(pane).toBeDefined(); expect(pane!.point.z).toBeCloseTo(0.03);
    }
    for (const p of display.points) expect([78.5, 89].some((x) =>
      Math.abs(p.x - x) < 1.311 && p.z >= -0.011 && p.z < 0.5 && p.y > 0 && p.y < 2.66)).toBe(true);
  });

  it("adds no town meshes or shadow buckets and preserves the existing physical layout", () => {
    const inventory = (root: Group) => {
      let meshes = 0, casting = 0, triangles = 0;
      root.traverse((o) => {
        if (!(o instanceof Mesh)) return;
        meshes++; casting += +o.castShadow;
        triangles += (o.geometry.index?.count ?? o.geometry.getAttribute("position").count) / 3;
      });
      return { meshes, casting, triangles };
    };
    const before = inventory(original.group);
    expect(inventory(town.group)).toEqual({ ...before, triangles: before.triangles + 88 });
    expect(town.colliders.boxes).toStrictEqual(original.colliders.boxes);
    expect(town.colliders.circles).toStrictEqual(original.colliders.circles);
    expect(town.doors).toStrictEqual(original.doors); expect(town.photoSpots).toStrictEqual(original.photoSpots);
  });

  it("retains identical outdoor camera fields, ledges and collider split flags", () => {
    const a = buildTownField(original), b = buildTownField(town);
    expect(b.lo).toEqual(a.lo); expect(b.hi).toEqual(a.hi); expect(b.base).toEqual(a.base);
    const before = buildTownLedges(original, a), after = buildTownLedges(town, b);
    expect(after.pieces).toStrictEqual(before.pieces); expect(after.things).toStrictEqual(before.things);
    expect(town.colliders.boxes).toStrictEqual(original.colliders.boxes);
    expect(town.colliders.circles).toStrictEqual(original.colliders.circles);
  }, 20_000);
});
