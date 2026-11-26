import { BufferGeometry, Color, Group, Mesh, MeshLambertMaterial, Object3D, Raycaster, Vector3 } from "three";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { collisionRanges } from "../src/game/collisionGeometry";
import { buildTownField, buildTownLedges, townCameraSkip } from "../src/game/townCollision";
import * as harborFinishes from "../src/game/world/harborFinishes";
import { buildTown } from "../src/game/world/town";
import { Merger } from "../src/game/world/util";
import { townCanvasDocument } from "../tools/town-canvas-stub";

const BENCHES = [[-75, -17.5, 0], [-48, -17.5, 0], [-6, -17.5, 0], [60, -40, 0], [-64, 2, Math.PI],
  [40, 2, Math.PI], [-84, 44.5, 0], [100.6, 29.1, 0]];
const CHAIRS = [[18, -67.6], [52, -67.3], [-70, -67.8], [88, -67.2]].flatMap(([x, z]) =>
  [[x - 0.62, z, Math.PI + 0.14], [x + 0.62, z + 0.05, Math.PI - 0.16]]);
const PALETTE = {
  bench: ["#b18d66", "#a8b8aa"], chair: ["#58695e", "#c4c3a2"],
  trap: ["#344e46", "#9ea487"], crate: ["#2c4b56", "#8aa39b", "#1b343e", "#a1b4a7"],
};
type Finish = { triangles: number; points: Vector3[]; perMesh: Map<Mesh, number> };
let original: ReturnType<typeof buildTown>, town: ReturnType<typeof buildTown>;
let records: Map<string, Finish>;
const signature = (r: number, g: number, b: number) => `${Math.fround(r)},${Math.fround(g)},${Math.fround(b)}`;

function read(root: Group) {
  const keys = new Map(Object.values(PALETTE).flat().map((hex) => {
    const c = new Color(hex); return [signature(c.r, c.g, c.b), hex] as const;
  }));
  const result = new Map<string, Finish>(), skip = townCameraSkip(town);
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const g = object.geometry, p = g.getAttribute("position"), c = g.getAttribute("color");
    if (!p || !c) return;
    const ranges = collisionRanges(g);
    for (let i = 0, n = g.index?.count ?? p.count; i < n; i += 3) {
      const a = g.index?.getX(i) ?? i, hex = keys.get(signature(c.getX(a), c.getY(a), c.getZ(a)));
      if (!hex) continue;
      if (object.userData.boat) expect(skip(object)).toBe(true);
      else {
        expect(object.name.startsWith("town-solid-")).toBe(true);
        expect(ranges.some(([start, end]) => i >= start && i < end)).toBe(false);
      }
      expect(object.material).toMatchObject({ vertexColors: true, transparent: false, map: null });
      let entry = result.get(hex);
      if (!entry) result.set(hex, entry = { triangles: 0, points: [], perMesh: new Map() });
      entry.triangles++; entry.perMesh.set(object, (entry.perMesh.get(object) ?? 0) + 1);
      for (let j = 0; j < 3; j++) entry.points.push(new Vector3().fromBufferAttribute(p, g.index?.getX(i + j) ?? i + j).applyMatrix4(object.matrixWorld));
    }
  });
  return result;
}

function finish(palette: string[]) {
  const out: Finish = { triangles: 0, points: [], perMesh: new Map() };
  for (const hex of palette) {
    const item = records.get(hex);
    expect(item, `${hex} is rendered`).toBeDefined();
    out.triangles += item!.triangles; out.points.push(...item!.points);
    item!.perMesh.forEach((n, mesh) => out.perMesh.set(mesh, (out.perMesh.get(mesh) ?? 0) + n));
  }
  return out;
}

function surface(root: Object3D, origin: Vector3, direction: Vector3) {
  const hit = new Raycaster(origin, direction, 0, 3).intersectObject(root, true)[0];
  expect(hit, `surface from ${origin.toArray()}`).toBeDefined();
  const mesh = hit.object as Mesh, c = mesh.geometry.getAttribute("color");
  const color = c ? new Color().fromBufferAttribute(c, hit.face!.a) : (mesh.material as MeshLambertMaterial).color;
  return { hex: `#${color.getHexString()}`, point: hit.point };
}

function localSurface(x: number, z: number, rotation: number, origin: Vector3, direction: Vector3) {
  const yaw = new Vector3(0, 1, 0);
  return surface(town.group, origin.applyAxisAngle(yaw, rotation).add(new Vector3(x, 0, z)), direction.applyAxisAngle(yaw, rotation));
}

function boatSurface(mesh: Mesh, origin: Vector3, direction: Vector3) {
  return surface(mesh, origin.applyMatrix4(mesh.matrixWorld), direction.transformDirection(mesh.matrixWorld));
}

function bounds(g: BufferGeometry) {
  g.computeBoundingBox(); return [g.boundingBox!.min.toArray(), g.boundingBox!.max.toArray()];
}

beforeAll(() => {
  vi.stubGlobal("document", townCanvasDocument());
  const add = Merger.prototype.addVisual;
  const omit = vi.spyOn(Merger.prototype, "addVisual").mockImplementation(function (this: Merger, key, material, geometry, cast, receive) {
    if (key.startsWith("glow-b12-")) { geometry.dispose(); return; }
    add.call(this, key, material, geometry, cast, receive);
  });
  const traps = vi.spyOn(harborFinishes, "trapFinishParts").mockReturnValue([]);
  const crates = vi.spyOn(harborFinishes, "crateFinishParts").mockReturnValue([]);
  try {
    original = buildTown();
    omit.mockRestore(); traps.mockRestore(); crates.mockRestore();
    town = buildTown();
  } finally { omit.mockRestore(); traps.mockRestore(); crates.mockRestore(); vi.unstubAllGlobals(); }
  original.group.updateMatrixWorld(true); town.group.updateMatrixWorld(true);
  records = read(town.group);
}, 20_000);

afterEach(() => vi.restoreAllMocks());

describe("Maple Harbor glow B12", () => {
  it("slats all eight street benches while retaining both seats and the existing supports", () => {
    const wood = finish(PALETTE.bench);
    expect(wood.triangles).toBe(46 * 8); expect(wood.triangles).toBeLessThanOrEqual(56 * 8);
    for (const [x, z, rot] of BENCHES) {
      for (const side of [-1, 1]) {
        expect(localSurface(x, z, rot, new Vector3(0.3, 0.75, -0.22 + side * 0.5), new Vector3(0, 0, -side)).hex).toBe("#b18d66");
        expect(localSurface(x, z, rot, new Vector3(0.72, 0.75, -0.22 + side * 0.5), new Vector3(0, 0, -side)).hex).toBe("#a8b8aa");
      }
      const seat = localSurface(x, z, rot, new Vector3(0.2, 1.4, 0.1), new Vector3(0, -1, 0));
      expect(seat.hex).toBe("#b18d66"); expect(seat.point.y).toBeCloseTo(0.552, 5);
      for (const u of [-0.45, 0.45]) expect(town.seats.some((s) => Math.abs(s.x - x - Math.cos(rot) * u) < 1e-6
        && Math.abs(s.z - z + Math.sin(rot) * u) < 1e-6 && s.y === 0.55)).toBe(true);
    }
    for (const p of wood.points) expect(BENCHES.some(([x, z, rot]) => {
      const dx = p.x - x, dz = p.z - z;
      return Math.abs(dx * Math.cos(rot) - dz * Math.sin(rot)) < 0.871
        && Math.abs(dx * Math.sin(rot) + dz * Math.cos(rot)) < 0.267 && p.y > 0.551 && p.y < 1.044;
    })).toBe(true);
  });

  it("follows both faces of the shore chairs' tilted backs and keeps the painted arms and old footprints", () => {
    const joints = finish(PALETTE.chair);
    expect(joints.triangles).toBe(40 * 8); expect(joints.triangles).toBeLessThanOrEqual(48 * 8);
    for (const [x, z, rot] of CHAIRS) {
      for (const side of [-1, 1]) {
        const n = new Vector3(0, -Math.sin(0.32), Math.cos(0.32)).multiplyScalar(side);
        expect(localSurface(x, z, rot, new Vector3(0, 0.78, -0.42).addScaledVector(n, 0.15), n.clone().negate()).hex).toBe("#58695e");
      }
      expect(localSurface(x, z, rot, new Vector3(0.38, 1.4, 0.12), new Vector3(0, -1, 0)).hex).toBe("#c4c3a2");
      expect(town.colliders.circles.some((c) => Math.abs(c.x - x) < 1e-6 && Math.abs(c.z - z) < 1e-6 && c.r === 0.42)).toBe(true);
    }
    for (const p of joints.points) expect(CHAIRS.some(([x, z, rot]) => {
      const dx = p.x - x, dz = p.z - z, depth = dx * Math.sin(rot) + dz * Math.cos(rot);
      return Math.abs(dx * Math.cos(rot) - dz * Math.sin(rot)) < 0.4 && depth > -0.59 && depth < 0.28 && p.y > 0.35 && p.y < 1.19;
    })).toBe(true);
  });

  it("gives the fifteen shore and ten boat traps cage faces beneath their original straps", () => {
    const cages = finish(PALETTE.trap);
    expect(cages.triangles).toBe(48 * 25); expect(cages.triangles).toBeLessThanOrEqual(56 * 25);
    let shore = 0, boats = 0;
    cages.perMesh.forEach((n, mesh) => { if (mesh.userData.boat) { expect(n).toBe(240); boats++; } else shore += n; });
    expect(shore).toBe(720); expect(boats).toBe(2);
    const parts = harborFinishes.trapFinishParts();
    expect(parts.reduce((n, [g]) => n + (g.index?.count ?? g.getAttribute("position").count) / 3, 0)).toBeLessThanOrEqual(56);
    for (const [g] of parts) expect(collisionRanges(g)).toEqual([]);
    for (const mesh of town.group.children.filter((o): o is Mesh => o instanceof Mesh && o.name === "lobster-boat")) {
      expect(boatSurface(mesh, new Vector3(0.73, 0.88, -3.4), new Vector3(0, 0, 1)).hex).toBe("#344e46");
      const lid = boatSurface(mesh, new Vector3(0.28, 1.8, -2.32), new Vector3(0, -1, 0));
      expect(lid.hex).toBe("#344e46"); expect(mesh.worldToLocal(lid.point).y).toBeCloseTo(1.503, 5);
      expect(boatSurface(mesh, new Vector3(0.5, 0.88, -3.4), new Vector3(0, 0, 1)).hex).toBe("#3d4a44");
    }
  });

  it("slots all five fish crates and keeps the stack spacing and boat crate envelope", () => {
    const crates = finish(PALETTE.crate);
    expect(crates.triangles).toBe(54 * 5); expect(crates.triangles).toBeLessThanOrEqual(64 * 5);
    let shore = 0, boats = 0;
    crates.perMesh.forEach((n, mesh) => { if (mesh.userData.boat) { expect(n).toBe(54); boats++; } else shore += n; });
    expect(shore).toBe(162); expect(boats).toBe(2);
    for (const [w, d] of [[0.72, 0.5], [0.6, 0.42]]) {
      const parts = harborFinishes.crateFinishParts(w, d);
      expect(parts.reduce((n, [g]) => n + (g.index?.count ?? g.getAttribute("position").count) / 3, 0)).toBeLessThanOrEqual(64);
      for (const [g] of parts) expect(collisionRanges(g)).toEqual([]);
    }
    const lid = surface(town.group, new Vector3(-21.42, 1.4, -69.1), new Vector3(0, -1, 0));
    expect(lid.hex).toBe("#2c4b56"); expect(lid.point.y).toBeCloseTo(0.943, 5);
    expect(localSurface(-21.42, -69.1, 0.1, new Vector3(0, 0.902, 0.7), new Vector3(0, 0, -1)).hex).toBe("#1b343e");
    for (const mesh of town.group.children.filter((o): o is Mesh => o instanceof Mesh && o.name === "lobster-boat")) {
      const top = boatSurface(mesh, new Vector3(0.6, 1.4, -1), new Vector3(0, -1, 0));
      expect(top.hex).toBe("#2c4b56"); expect(mesh.worldToLocal(top.point).y).toBeCloseTo(0.953, 5);
    }
  });

  it("keeps both lobster boats as one mesh with exact old bounds, hull data, helm points and moorings", () => {
    const boats = (root: Group) => root.children.filter((o): o is Mesh => o instanceof Mesh && o.name === "lobster-boat");
    const before = boats(original.group), after = boats(town.group);
    expect(before).toHaveLength(2); expect(after).toHaveLength(2);
    for (let i = 0; i < after.length; i++) {
      const a = before[i], b = after[i];
      expect(b.children).toHaveLength(0); expect(b.geometry.groups).toHaveLength(0);
      expect(bounds(b.geometry)).toEqual(bounds(a.geometry));
      expect(b.geometry.getAttribute("position").count - a.geometry.getAttribute("position").count).toBe(294 * 3);
      expect(b.userData).toStrictEqual(a.userData); expect(b.position.toArray()).toEqual(a.position.toArray());
      expect(b.rotation.toArray()).toEqual(a.rotation.toArray()); expect(b.castShadow).toBe(a.castShadow);
      expect(b.material).toMatchObject({ vertexColors: true, flatShading: true });
    }
  });

  it("adds no town meshes or shadow buckets and retains seats, anchors and colliders", () => {
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
    expect(inventory(town.group)).toEqual({ ...before, triangles: before.triangles + 2158 });
    expect(town.colliders.boxes).toStrictEqual(original.colliders.boxes);
    expect(town.colliders.circles).toStrictEqual(original.colliders.circles); expect(town.colliders.roofs).toStrictEqual(original.colliders.roofs);
    expect(town.seats).toStrictEqual(original.seats); expect(town.doors).toStrictEqual(original.doors);
    expect(town.photoSpots).toStrictEqual(original.photoSpots);
  });

  it("retains the committed camera field, ledges and collider split flags", () => {
    const a = buildTownField(original), b = buildTownField(town);
    expect(b.lo).toEqual(a.lo); expect(b.hi).toEqual(a.hi); expect(b.base).toEqual(a.base);
    const before = buildTownLedges(original, a), after = buildTownLedges(town, b);
    expect(after.pieces).toStrictEqual(before.pieces); expect(after.things).toStrictEqual(before.things);
    expect(town.colliders.boxes).toStrictEqual(original.colliders.boxes); expect(town.colliders.circles).toStrictEqual(original.colliders.circles);
  }, 20_000);
});
