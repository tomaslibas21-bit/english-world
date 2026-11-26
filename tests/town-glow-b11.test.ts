import { BufferGeometry, Color, Group, Mesh, MeshLambertMaterial, Raycaster, Vector3 } from "three";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import * as propFinishes from "../src/game/street/finishes";
import { makeStreetProp } from "../src/game/street/props";
import { collisionRanges } from "../src/game/collisionGeometry";
import { buildTownField, buildTownLedges } from "../src/game/townCollision";
import { buildTown } from "../src/game/world/town";
import { Merger } from "../src/game/world/util";
import { townCanvasDocument } from "../tools/town-canvas-stub";

const THREADS = ["#9f8da8", "#5a5264", "#d7d0be", "#93836f"];
const SALON = ["#9a6578", "#e1c6bb", "#c68f99", "#ead7ce", "#b77f8c"];
let original: ReturnType<typeof buildTown>, town: ReturnType<typeof buildTown>;
const signature = (r: number, g: number, b: number) => `${Math.fround(r)},${Math.fround(g)},${Math.fround(b)}`;

function bounds(g: BufferGeometry) {
  g.computeBoundingBox();
  return [g.boundingBox!.min.toArray(), g.boundingBox!.max.toArray()];
}

function surface(root: Group, x: number, y: number, z: number, dx: number, dy: number, dz: number) {
  const hit = new Raycaster(new Vector3(x, y, z), new Vector3(dx, dy, dz), 0, 3).intersectObject(root, true).find(({ object }) => {
    const material = (object as Mesh).material;
    return (Array.isArray(material) ? material : [material]).some((m) => !m.transparent || m.opacity >= 0.6);
  });
  expect(hit, `surface from ${x},${y},${z}`).toBeDefined();
  const mesh = hit!.object as Mesh, color = mesh.geometry.getAttribute("color");
  const c = color ? new Color().fromBufferAttribute(color, hit!.face!.a) : (mesh.material as MeshLambertMaterial).color;
  return { point: hit!.point, hex: `#${c.getHexString()}` };
}

function finish(palette: string[]) {
  const keys = new Set(palette.map((hex) => {
    const c = new Color(hex); return signature(c.r, c.g, c.b);
  }));
  let triangles = 0;
  const found = new Set<string>(), points: Vector3[] = [];
  town.group.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const g = object.geometry, p = g.getAttribute("position"), c = g.getAttribute("color");
    if (!p || !c) return;
    const ranges = collisionRanges(g);
    for (let i = 0, n = g.index?.count ?? p.count; i < n; i += 3) {
      const a = g.index?.getX(i) ?? i, key = signature(c.getX(a), c.getY(a), c.getZ(a));
      if (!keys.has(key)) continue;
      found.add(key); triangles++;
      expect(ranges.some(([start, end]) => i >= start && i < end)).toBe(false);
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
    if (key.startsWith("glow-b11-")) { geometry.dispose(); return; }
    add.call(this, key, material, geometry, cast, receive);
  });
  try {
    original = buildTown();
    omit.mockRestore();
    town = buildTown();
  } finally { omit.mockRestore(); vi.unstubAllGlobals(); }
  original.group.updateMatrixWorld(true); town.group.updateMatrixWorld(true);
}, 20_000);

afterEach(() => vi.restoreAllMocks());

describe("Maple Harbor glow B11", () => {
  it.each([["guitar", 1], ["small_guitar", 0.73]] as const)("finishes %s inside its old bounds and single prop mesh", (id, scale) => {
    const omit = vi.spyOn(propFinishes, "guitarFinishParts").mockReturnValue([]);
    const before = makeStreetProp(id);
    omit.mockRestore();
    const prop = makeStreetProp(id), base = before.children[0] as Mesh, mesh = prop.children[0] as Mesh;
    prop.updateMatrixWorld(true);
    expect(prop.children).toHaveLength(1); expect(mesh.material).toBe(base.material);
    expect(mesh.geometry.groups).toHaveLength(0);
    expect(mesh.geometry.getAttribute("position").count - base.geometry.getAttribute("position").count).toBe(128 * 3);
    expect(bounds(mesh.geometry)).toEqual(bounds(base.geometry));
    expect(propFinishes.guitarFinishParts().reduce((n, [g]) => n + (g.index?.count ?? g.getAttribute("position").count) / 3, 0)).toBeLessThanOrEqual(144);
    const face = (x: number, y: number) => surface(prop, x * scale, y * scale, 0.5, 0, 0, -1);
    const ring = face(-0.05, 0.1);
    expect(ring.hex).toBe("#d8b97e"); expect(ring.point.z).toBeCloseTo(0.212 * scale * 0.6, 5);
    expect(face(-0.23, 0).hex).toBe("#71503b");
    expect(face(0.25, -0.02).hex).toBe("#c8bda2");
    expect(face(0.46, 0.036).hex).toBe("#d8b97e");
  });

  it("adds wallet stitches and a snap while retaining its resting face, XZ envelope and one mesh", () => {
    const omit = vi.spyOn(propFinishes, "walletFinishParts").mockReturnValue([]);
    const before = makeStreetProp("wallet");
    omit.mockRestore();
    const prop = makeStreetProp("wallet"), base = before.children[0] as Mesh, mesh = prop.children[0] as Mesh;
    prop.updateMatrixWorld(true);
    expect(prop.children).toHaveLength(1); expect(mesh.material).toBe(base.material); expect(mesh.geometry.groups).toHaveLength(0);
    expect(mesh.geometry.getAttribute("position").count - base.geometry.getAttribute("position").count).toBe(18 * 3);
    expect(propFinishes.walletFinishParts().reduce((n, [g]) => n + (g.index?.count ?? g.getAttribute("position").count) / 3, 0)).toBeLessThanOrEqual(24);
    const a = bounds(base.geometry), b = bounds(mesh.geometry);
    expect(b[0]).toEqual(a[0]); expect(b[1][0]).toBe(a[1][0]); expect(b[1][2]).toBe(a[1][2]);
    expect(b[1][1] - a[1][1]).toBeLessThanOrEqual(0.005);
    expect(surface(prop, 0, 0.4, 0.052, 0, -1, 0).hex).toBe("#d4b492");
    const snap = surface(prop, 0.06, 0.4, 0.002, 0, -1, 0);
    expect(snap.hex).toBe("#c6aa72"); expect(snap.point.y).toBeCloseTo(0.02325, 5);
    expect(surface(prop, -0.04, 0.4, 0, 0, -1, 0).hex).toBe("#ac6a53");
  });

  it("finishes both Threads cases behind the glass and keeps their mannequin heads and folded shirts", () => {
    const display = finish(THREADS);
    expect(display.triangles).toBe(120); expect(display.triangles).toBeLessThanOrEqual(128);
    for (const x of [-28.5, -19.5]) {
      expect(surface(town.group, x, 0.22, -1, 0, 0, 1).hex).toBe("#9f8da8");
      for (const u of [-0.65, 0.2]) {
        expect(surface(town.group, x - u, 1.64, -1, 0, 0, 1).hex).toBe("#d7d0be");
        expect(surface(town.group, x - u, 1.67, -1, 0, 0, 1).hex).toBe("#93836f");
        expect(surface(town.group, x - u, 2.05, -1, 0, 0, 1).hex).toBe("#ece6dc");
      }
      for (let i = 0; i < 4; i++) expect(surface(town.group, x - 0.85, 0.832 + i * 0.047, -1, 0, 0, 1).hex).toBe("#d7d0be");
      const pane = new Raycaster(new Vector3(x, 1.5, -1), new Vector3(0, 0, 1), 0, 3)
        .intersectObject(town.group, true).find(({ object }) => {
          const m = (object as Mesh).material;
          return !Array.isArray(m) && m.transparent;
        });
      expect(pane).toBeDefined(); expect(pane!.point.z).toBeCloseTo(0.03);
    }
    for (const p of display.points) expect([-28.5, -19.5].some((x) =>
      Math.abs(p.x - x) < 1.231 && p.z > -0.01 && p.z < 0.154 && p.y > 0.059 && p.y < 1.832)).toBe(true);
  });

  it("panels only the salon's blank bay and keeps the original doorway, window and sign views clear", () => {
    const front = finish(SALON);
    expect(front.triangles).toBe(40); expect(front.triangles).toBeLessThanOrEqual(48);
    for (const x of [-7.9375, -6.1125]) {
      expect(surface(town.group, x + 0.16, 1.6, -1, 0, 0, 1).hex).toBe("#c68f99");
      expect(surface(town.group, x, 1.51, -1, 0, 0, 1).hex).toBe("#b77f8c");
      expect(surface(town.group, x + 0.8175, 1.51, -1, 0, 0, 1).hex).toBe("#ead7ce");
    }
    expect(surface(town.group, -7, 0.23, -1, 0, 0, 1).hex).toBe("#9a6578");
    expect(surface(town.group, -7, 0.402, -1, 0, 0, 1).hex).toBe("#e1c6bb");
    for (const [x, y] of [[-12.5, 1.55], [-10, 1.7], [-10, 0.23], [-10, 4.8]]) {
      const a = surface(original.group, x, y, -1, 0, 0, 1), b = surface(town.group, x, y, -1, 0, 0, 1);
      expect(b.hex).toBe(a.hex); expect(b.point.toArray()).toEqual(a.point.toArray());
    }
    for (const p of front.points) {
      expect(p.x).toBeGreaterThan(-14.801); expect(p.x).toBeLessThan(-5.199);
      expect(p.y).toBeGreaterThan(0.079); expect(p.y).toBeLessThan(2.271);
      expect(p.z).toBeGreaterThan(0.337); expect(p.z).toBeLessThan(0.483);
      if (p.y > 0.45) expect(p.x).toBeGreaterThan(-8.786);
    }
    const door = town.doors.find((d) => d.loc === "salon");
    expect(door).toMatchObject({ x: -10, z: 0.5, outX: -10 });
    expect(door!.outZ).toBeCloseTo(-1.7);
  });

  it("adds no town meshes or shadow buckets and preserves physical and interaction data", () => {
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
    expect(inventory(town.group)).toEqual({ ...before, triangles: before.triangles + 160 });
    expect(town.colliders.boxes).toStrictEqual(original.colliders.boxes);
    expect(town.colliders.circles).toStrictEqual(original.colliders.circles);
    expect(town.colliders.roofs).toStrictEqual(original.colliders.roofs);
    expect(town.doors).toStrictEqual(original.doors); expect(town.photoSpots).toStrictEqual(original.photoSpots);
    expect(town.seats).toStrictEqual(original.seats);
  });

  it("keeps camera fields, ledges and collider split flags identical", () => {
    const a = buildTownField(original), b = buildTownField(town);
    expect(b.lo).toEqual(a.lo); expect(b.hi).toEqual(a.hi); expect(b.base).toEqual(a.base);
    const before = buildTownLedges(original, a), after = buildTownLedges(town, b);
    expect(after.pieces).toStrictEqual(before.pieces); expect(after.things).toStrictEqual(before.things);
    expect(town.colliders.boxes).toStrictEqual(original.colliders.boxes);
    expect(town.colliders.circles).toStrictEqual(original.colliders.circles);
  }, 20_000);
});
