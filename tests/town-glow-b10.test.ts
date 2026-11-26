import { Color, Group, Mesh, MeshLambertMaterial, Raycaster, Vector3 } from "three";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { collisionRanges } from "../src/game/collisionGeometry";
import { buildTownField, buildTownLedges } from "../src/game/townCollision";
import { buildTown } from "../src/game/world/town";
import { Merger } from "../src/game/world/util";
import { townCanvasDocument } from "../tools/town-canvas-stub";

const PALETTE = {
  bale: ["#d7bb7e", "#b69b62", "#e4cb91", "#c4a66c"],
  standing: ["#c5a97c", "#8b785c", "#998465", "#5e6e69"],
  barrel: ["#af835c", "#b58e66", "#876c50", "#637367"],
  hydrant: ["#bd594a", "#9eaca7", "#d3c6a8", "#596b62"],
};
const BALES = [20, 32].flatMap((x, i) => {
  const z = i === 0 ? -43.9 : -44.1;
  return [{ x: x - 0.55, y: 0, z, rot: 0.06 }, { x: x + 0.55, y: 0, z, rot: -0.05 }, { x, y: 0.5, z, rot: 0.2 }];
});
const STANDING = [[15.9, -33.4], [16.2, -29.3]];
const HYDRANTS = [[-68, -1.5], [-2, -1.5], [44, -14.5], [-78, 43], [66, 43]];
type Finish = { triangles: number; points: Vector3[]; meshes: Set<Mesh> };
let original: ReturnType<typeof buildTown>, town: ReturnType<typeof buildTown>;
let records: Map<string, Finish>;
const signature = (r: number, g: number, b: number) => `${Math.fround(r)},${Math.fround(g)},${Math.fround(b)}`;

function read(root: Group) {
  const keys = new Map(Object.values(PALETTE).flat().map((hex) => {
    const c = new Color(hex); return [signature(c.r, c.g, c.b), hex] as const;
  }));
  const result = new Map<string, Finish>();
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const g = object.geometry, p = g.getAttribute("position"), c = g.getAttribute("color");
    if (!p || !c) return;
    const ranges = collisionRanges(g);
    for (let i = 0, n = g.index?.count ?? p.count; i < n; i += 3) {
      const a = g.index?.getX(i) ?? i, hex = keys.get(signature(c.getX(a), c.getY(a), c.getZ(a)));
      if (!hex) continue;
      expect(ranges.some(([start, end]) => i >= start && i < end), `${hex} is appearance only`).toBe(false);
      let entry = result.get(hex);
      if (!entry) result.set(hex, entry = { triangles: 0, points: [], meshes: new Set() });
      entry.triangles++; entry.meshes.add(object);
      for (let j = 0; j < 3; j++) entry.points.push(new Vector3().fromBufferAttribute(p, g.index?.getX(i + j) ?? i + j).applyMatrix4(object.matrixWorld));
    }
  });
  return result;
}

function finish(palette: string[]) {
  const out: Finish = { triangles: 0, points: [], meshes: new Set() };
  for (const hex of palette) {
    const entry = records.get(hex);
    expect(entry, `${hex} is rendered`).toBeDefined();
    out.triangles += entry!.triangles; out.points.push(...entry!.points);
    entry!.meshes.forEach((mesh) => out.meshes.add(mesh));
  }
  for (const mesh of out.meshes) {
    expect(mesh.name.startsWith("town-solid-")).toBe(true);
    expect(mesh.material).toBeInstanceOf(MeshLambertMaterial);
    expect(mesh.material).toMatchObject({ vertexColors: true, transparent: false, map: null });
  }
  return out;
}

function surface(x: number, y: number, z: number, dx = 0, dy = -1, dz = 0) {
  const hit = new Raycaster(new Vector3(x, y, z), new Vector3(dx, dy, dz), 0, 2).intersectObject(town.group, true)[0];
  expect(hit, `surface from ${x},${y},${z}`).toBeDefined();
  const mesh = hit.object as Mesh, color = mesh.geometry.getAttribute("color");
  const c = color ? new Color().fromBufferAttribute(color, hit.face!.a) : (mesh.material as MeshLambertMaterial).color;
  return { point: hit.point, hex: `#${c.getHexString()}` };
}

beforeAll(() => {
  vi.stubGlobal("document", townCanvasDocument());
  const add = Merger.prototype.addVisual;
  const omit = vi.spyOn(Merger.prototype, "addVisual").mockImplementation(function (this: Merger, key, material, geometry, cast, receive) {
    if (key.startsWith("glow-b10-")) { geometry.dispose(); return; }
    add.call(this, key, material, geometry, cast, receive);
  });
  try {
    original = buildTown();
    omit.mockRestore();
    town = buildTown();
  } finally { omit.mockRestore(); vi.unstubAllGlobals(); }
  original.group.updateMatrixWorld(true); town.group.updateMatrixWorld(true);
  records = read(town.group);
}, 20_000);

describe("Maple Harbor glow B10", () => {
  it("gives all six stacked bales straw faces and grain while leaving their raised bindings visible", () => {
    const straw = finish(PALETTE.bale);
    expect(straw.triangles).toBe(46 * 6); expect(straw.triangles).toBeLessThanOrEqual(48 * 6);
    for (const b of BALES) {
      const probe = (u: number, y: number, side: number) => {
        const cs = Math.cos(b.rot), sn = Math.sin(b.rot), depth = side * 0.7;
        return surface(b.x + cs * u + sn * depth, b.y + y, b.z - sn * u + cs * depth, -sn * side, 0, -cs * side);
      };
      for (const side of [-1, 1]) {
        expect(probe(0, 0.25, side).hex).toBe("#d7bb7e");
        expect(probe(0, 0.15, side).hex).toBe("#b69b62");
        expect(probe(0.28, 0.25, side).hex).toBe("#b08f45");
      }
    }
    for (const p of straw.points) expect(BALES.some((b) => {
      const dx = p.x - b.x, dz = p.z - b.z;
      return Math.abs(dx * Math.cos(b.rot) - dz * Math.sin(b.rot)) < 0.503
        && Math.abs(dx * Math.sin(b.rot) + dz * Math.cos(b.rot)) < 0.282
        && p.y >= b.y + 0.049 && p.y < b.y + 0.503;
    })).toBe(true);
  });

  it("finishes both standing tables below the retained condiments and inside their circular footprint", () => {
    const tables = finish(PALETTE.standing);
    expect(tables.triangles).toBe(128); expect(tables.triangles).toBeLessThanOrEqual(144);
    for (const [x, z] of STANDING) {
      const top = surface(x + 0.25, 1.4, z);
      expect(top.hex).toBe("#c5a97c"); expect(top.point.y).toBeCloseTo(1.088);
      expect(surface(x + 0.4, 1.4, z).hex).toBe("#8b785c");
      expect(surface(x + 0.25, 1.4, z + 0.13).hex).toBe("#998465");
      expect(surface(x + 0.12, 1.4, z - 0.08).hex).toBe("#c8392f");
      expect(surface(x - 0.14, 1.4, z).hex).toBe("#e9e2d2");
      expect(town.colliders.circles).toContainEqual({ x, z, r: 0.44 });
    }
    for (const p of tables.points) expect(STANDING.some(([x, z]) =>
      Math.hypot(p.x - x, p.z - z) < 0.421 && p.y > 0.039 && p.y < 1.092)).toBe(true);
  });

  it("adds tapered staves to every curb barrel without covering the original iron hoops or moving the mums", () => {
    const barrels = original.colliders.circles.filter((c) => c.r === 0.38);
    expect(barrels.length).toBeGreaterThan(8); expect(barrels.length).toBeLessThanOrEqual(16);
    const wood = finish(PALETTE.barrel);
    expect(wood.triangles).toBe(60 * barrels.length); expect(wood.triangles).toBeLessThanOrEqual(64 * 16);
    const sn = Math.sin(Math.PI / 10), cs = Math.cos(Math.PI / 10);
    for (const { x, z } of barrels) {
      expect(surface(x + sn * 0.7, 0.25, z + cs * 0.7, -sn, 0, -cs).hex).toBe("#b58e66");
      expect(surface(x + sn * 0.7, 0.4, z + cs * 0.7, -sn, 0, -cs).hex).toBe("#3d4a44");
      expect(town.colliders.circles).toContainEqual({ x, z, r: 0.38 });
    }
    for (const p of wood.points) expect(barrels.some(({ x, z }) =>
      Math.hypot(p.x - x, p.z - z) < 0.38 && p.y > 0.159 && p.y < 0.504)).toBe(true);
  });

  it("makes all five hydrants recognizable with hose caps inside their unchanged blocking radii", () => {
    const hardware = finish(PALETTE.hydrant);
    expect(hardware.triangles).toBe(118 * 5); expect(hardware.triangles).toBeLessThanOrEqual(128 * 5);
    for (const [x, z] of HYDRANTS) {
      expect(surface(x, 0.5, z - 0.7, 0, 0, 1).hex).toBe("#d3c6a8");
      expect(surface(x + 0.7, 0.5, z, -1, 0, 0).hex).toBe("#9eaca7");
      expect(surface(x - 0.7, 0.5, z, 1, 0, 0).hex).toBe("#9eaca7");
      const nut = surface(x, 1.2, z);
      expect(nut.hex).toBe("#d3c6a8"); expect(nut.point.y).toBeCloseTo(0.92);
      expect(surface(x, 0.72, z - 0.7, 0, 0, 1).hex).toBe("#d63b2f");
      expect(town.colliders.circles).toContainEqual({ x, z, r: 0.22 });
    }
    for (const p of hardware.points) expect(HYDRANTS.some(([x, z]) =>
      Math.hypot(p.x - x, p.z - z) < 0.22 && p.y > 0.059 && p.y < 0.921)).toBe(true);
  });

  it("adds no town meshes or shadow buckets and retains colliders, seats, signs and interaction anchors", () => {
    const inventory = (root: Group) => {
      let meshes = 0, casting = 0, triangles = 0;
      root.traverse((o) => {
        if (!(o instanceof Mesh)) return;
        meshes++; casting += +o.castShadow;
        triangles += (o.geometry.index?.count ?? o.geometry.getAttribute("position").count) / 3;
      });
      return { meshes, casting, triangles };
    };
    const barrels = original.colliders.circles.filter((c) => c.r === 0.38).length;
    const before = inventory(original.group);
    expect(inventory(town.group)).toEqual({ ...before, triangles: before.triangles + 276 + 128 + 60 * barrels + 590 });
    expect(town.colliders.boxes).toStrictEqual(original.colliders.boxes);
    expect(town.colliders.circles).toStrictEqual(original.colliders.circles);
    expect(town.colliders.roofs).toStrictEqual(original.colliders.roofs);
    expect(town.doors).toStrictEqual(original.doors); expect(town.photoSpots).toStrictEqual(original.photoSpots);
    expect(town.seats).toStrictEqual(original.seats);
    const printed = (root: Group) => {
      const out: unknown[] = [];
      root.traverse((o) => {
        if (!(o instanceof Mesh)) return;
        const materials = Array.isArray(o.material) ? o.material : [o.material];
        if (!materials.some((m) => "map" in m && m.map)) return;
        out.push([o.name, o.position.toArray(), o.rotation.toArray(), Array.from(o.geometry.getAttribute("position").array)]);
      });
      return out;
    };
    expect(printed(town.group)).toEqual(printed(original.group));
  });

  it("leaves the outdoor camera field, ledges and collider split flags identical to the committed layout", () => {
    const a = buildTownField(original), b = buildTownField(town);
    expect(b.lo).toEqual(a.lo); expect(b.hi).toEqual(a.hi); expect(b.base).toEqual(a.base);
    const before = buildTownLedges(original, a), after = buildTownLedges(town, b);
    expect(after.pieces).toStrictEqual(before.pieces); expect(after.things).toStrictEqual(before.things);
    expect(town.colliders.boxes).toStrictEqual(original.colliders.boxes);
    expect(town.colliders.circles).toStrictEqual(original.colliders.circles);
  }, 20_000);
});
