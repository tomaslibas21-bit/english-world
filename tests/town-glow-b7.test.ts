import { Box3, Color, Group, Mesh, MeshLambertMaterial, Raycaster, Vector3 } from "three";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { collisionRanges } from "../src/game/collisionGeometry";
import { buildTownField, buildTownLedges } from "../src/game/townCollision";
import { FOUNTAIN } from "../src/game/world/layout";
import { buildTown } from "../src/game/world/town";
import { Merger } from "../src/game/world/util";
import { townCanvasDocument } from "../tools/town-canvas-stub";

const COLORS = {
  bench: ["#bc9264", "#ab8058", "#36423d"],
  bank: ["#89948d", "#d8ccb2", "#a3a79c", "#7c877f"],
  pocket: ["#98754f", "#86a8ac", "#715b43", "#b99b61", "#d4c6a4", "#8b9185"],
  planter: ["#ad845e", "#725e48", "#cb9c4b", "#b76e53", "#d7be82", "#9a6872"],
};
const BENCHES = [[18, -23.2, Math.PI], [30, -22.6, Math.PI], [40, -30, -Math.PI / 2]];
type Finish = { triangles: number; points: Vector3[]; meshes: Set<Mesh> };
let baseline: ReturnType<typeof buildTown>, town: ReturnType<typeof buildTown>;
let colors: Map<string, Finish>;
const signature = (r: number, g: number, b: number) => `${Math.fround(r)},${Math.fround(g)},${Math.fround(b)}`;

function readFinishes(root: Group) {
  const palette = new Map(Object.values(COLORS).flat().map((hex) => {
    const c = new Color(hex);
    return [signature(c.r, c.g, c.b), hex] as const;
  }));
  const found = new Map<string, Finish>();
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const g = object.geometry, p = g.getAttribute("position"), c = g.getAttribute("color");
    if (!p || !c) return;
    const ranges = collisionRanges(g);
    for (let i = 0, count = g.index?.count ?? p.count; i < count; i += 3) {
      const a = g.index?.getX(i) ?? i, hex = palette.get(signature(c.getX(a), c.getY(a), c.getZ(a)));
      if (!hex) continue;
      expect(ranges.some(([start, end]) => i >= start && i < end), `${hex} retains the original collision surface`).toBe(false);
      let finish = found.get(hex);
      if (!finish) found.set(hex, finish = { triangles: 0, points: [], meshes: new Set() });
      finish.triangles++;
      finish.meshes.add(object);
      for (let j = 0; j < 3; j++) finish.points.push(new Vector3().fromBufferAttribute(p, g.index?.getX(i + j) ?? i + j).applyMatrix4(object.matrixWorld));
    }
  });
  return found;
}

function finish(palette: string[]) {
  const out: Finish = { triangles: 0, points: [], meshes: new Set() };
  for (const hex of palette) {
    const item = colors.get(hex);
    expect(item, `${hex} is rendered`).toBeDefined();
    out.triangles += item!.triangles;
    out.points.push(...item!.points);
    item!.meshes.forEach((mesh) => out.meshes.add(mesh));
  }
  for (const mesh of out.meshes) {
    expect(mesh.name.startsWith("town-solid-")).toBe(true);
    expect(mesh.material).toBeInstanceOf(MeshLambertMaterial);
    expect(mesh.material).toMatchObject({ vertexColors: true, transparent: false, map: null });
  }
  return out;
}

function surface(x: number, y: number, z: number, dx = 0, dy = -1, dz = 0, far = 3) {
  const ray = new Raycaster(new Vector3(x, y, z), new Vector3(dx, dy, dz), 0, far);
  const hit = ray.intersectObject(town.group, true)[0];
  expect(hit, `surface at (${x},${y},${z})`).toBeDefined();
  const mesh = hit.object as Mesh, color = mesh.geometry.getAttribute("color");
  const c = color ? new Color().fromBufferAttribute(color, hit.face!.a) : (mesh.material as MeshLambertMaterial).color;
  return { hit, hex: `#${c.getHexString()}` };
}

beforeAll(() => {
  vi.stubGlobal("document", townCanvasDocument());
  const addVisual = Merger.prototype.addVisual;
  const omit = vi.spyOn(Merger.prototype, "addVisual").mockImplementation(function (this: Merger, key, material, geometry, cast, receive) {
    if (key.startsWith("glow-b7-")) { geometry.dispose(); return; }
    addVisual.call(this, key, material, geometry, cast, receive);
  });
  try {
    baseline = buildTown();
    omit.mockRestore();
    town = buildTown();
  } finally { omit.mockRestore(); vi.unstubAllGlobals(); }
  baseline.group.updateMatrixWorld(true);
  town.group.updateMatrixWorld(true);
  colors = readFinishes(town.group);
}, 20_000);

describe("Maple Harbor glow B7", () => {
  it("adds slatted, supported square benches with the original seats and footprints", () => {
    const wood = finish(COLORS.bench);
    expect(wood.triangles).toBe(270);
    expect(wood.triangles).toBeLessThanOrEqual(288);
    for (const p of wood.points) expect(BENCHES.some(([x, z, r]) => {
      const lx = Math.cos(r) * (p.x - x) - Math.sin(r) * (p.z - z);
      const lz = Math.sin(r) * (p.x - x) + Math.cos(r) * (p.z - z);
      return Math.abs(lx) <= 0.9 && Math.abs(lz) <= 0.27 && p.y >= -1e-6 && p.y <= 1.05;
    })).toBe(true);
    for (const [x, z, r] of BENCHES) {
      const at = (lx: number, lz: number) => [x + Math.cos(r) * lx + Math.sin(r) * lz, z - Math.sin(r) * lx + Math.cos(r) * lz];
      const [sx, sz] = at(0.3, -0.15), seat = surface(sx, 1.3, sz);
      expect(seat.hex).toBe("#bc9264");
      expect(seat.hit.point.y).toBeCloseTo(0.552);
      const [ax, az] = at(0.82, -0.1), arm = surface(ax, 1.3, az);
      expect(arm.hex).toBe("#36423d");
      expect(arm.hit.point.y).toBeCloseTo(0.7475);
      const [bx, bz] = at(0, -0.6);
      expect(surface(bx, 0.8, bz, Math.sin(r), 0, Math.cos(r)).hex).toBe("#ab8058");
    }
    expect(town.seats).toContainEqual({ x: 30, z: -22.6, rot: Math.PI * 2, y: 0.55 });
    expect(town.seats).toContainEqual({ x: 40, z: -30, rot: Math.PI / 2, y: 0.55 });
  });

  it("separates the bank's column bases and capitals while keeping the glass doorway clear", () => {
    const stone = finish(COLORS.bank);
    expect(stone.triangles).toBe(180);
    expect(stone.triangles).toBeLessThanOrEqual(200);
    const feet = colors.get("#89948d")!.points;
    for (const side of [-1, 1]) {
      const bounds = new Box3().setFromPoints(feet.filter((p) => Math.sign(p.x - 13) === side));
      const center = bounds.getCenter(new Vector3());
      expect(center.z).toBeCloseTo(-0.1);
      expect(surface(center.x, 0.1, -2, 0, 0, 1).hex).toBe("#89948d");
      expect(surface(center.x, 4.82, -2, 0, 0, 1).hex).toBe("#d8ccb2");
    }
    expect(surface(16, 0.25, -1, 0, 0, 1).hex).toBe("#a3a79c");
    expect(surface(13, 0.25, -1, 0, 0, 1).hex).toBe("#1f4f8a"); // The original low blue plinth remains in the gap.
    expect(surface(13, 0.75, -1, 0, 0, 1).hex).toBe("#5f8fb0");
    expect(new Box3().setFromPoints(stone.points).max.y).toBeCloseTo(4.9);
  });

  it("finishes the Corner Pocket door in front of its glass but behind its push bar", () => {
    const entry = finish(COLORS.pocket);
    expect(entry.triangles).toBe(26);
    expect(entry.triangles).toBeLessThanOrEqual(48);
    const door = town.doors.find((d) => d.loc === "pool-hall")!;
    expect(door).toMatchObject({ x: -12.5, z: 28.5, outX: -12.5, outZ: 30.7 });
    expect(surface(door.x + 0.45, 0.5, 30, 0, 0, -1).hex).toBe("#98754f");
    expect(surface(door.x + 0.3, 1.7, 30, 0, 0, -1).hex).toBe("#86a8ac");
    const bar = surface(door.x, 1.05, 30, 0, 0, -1);
    expect(bar.hex).toBe("#c9ced3");
    expect(bar.hit.point.z).toBeGreaterThan(door.z + 0.168);
    const flag = surface(door.x + 0.525, 1, door.z + 1.76);
    expect(flag.hex).toBe("#8b9185");
    expect(flag.hit.point.y).toBeCloseTo(0.028);
    expect(surface(door.x, 1, door.z + 0.7).hex).toBe("#7a4b36");
    const flags = finish(["#8b9185"]);
    for (const p of flags.points) {
      expect(Math.abs(p.x - door.x)).toBeLessThan(1.15);
      expect(p.z - door.z).toBeGreaterThan(1.25);
      expect(p.z - door.z).toBeLessThan(2.24);
    }
  });

  it("gives the four planters cedar boards and rounder, muted flowers within the planting envelope", () => {
    const flowers = finish(COLORS.planter);
    expect(flowers.triangles).toBe(736);
    expect(flowers.triangles).toBeLessThanOrEqual(768);
    const centers = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => ({ x: FOUNTAIN.x + sx * 5.6, z: FOUNTAIN.z + sz * 5.6, sx, sz })));
    for (const p of flowers.points) expect(centers.some(({ x, z }) =>
      Math.abs(p.x - x) <= 0.72 && Math.abs(p.z - z) <= 0.72 && p.y >= 0 && p.y <= 1.12)).toBe(true);
    for (const { x, z, sx } of centers) {
      expect(surface(x, 0.25, z + 1, 0, 0, -1).hex).toBe("#ad845e");
      const seed = sx + 2, px = x - 0.18 + Math.cos(seed) * 0.22, pz = z - 0.12 + Math.sin(seed) * 0.22;
      expect(COLORS.planter.slice(2)).toContain(surface(px, 1.3, pz).hex);
      expect(town.colliders.boxes).toEqual(expect.arrayContaining([expect.objectContaining({
        minX: x - 0.525, maxX: x + 0.525, minZ: z - 0.525, maxZ: z + 0.525,
      })]));
    }
  });

  it("absorbs every finish without another mesh, shadow bucket, texture or light", () => {
    const inventory = (root: Group) => {
      let meshes = 0, triangles = 0, casting = 0, lights = 0;
      const textures = new Set();
      root.traverse((o) => {
        if ((o as unknown as { isLight?: boolean }).isLight) lights++;
        if (!(o instanceof Mesh)) return;
        meshes++; casting += +o.castShadow;
        triangles += (o.geometry.index?.count ?? o.geometry.getAttribute("position").count) / 3;
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
          const map = (m as MeshLambertMaterial).map;
          if (map) textures.add(map);
        }
      });
      return { meshes, triangles, casting, textures: textures.size, lights };
    };
    const before = inventory(baseline.group), after = inventory(town.group);
    expect(after).toEqual({ ...before, triangles: before.triangles + 1212 });
    expect(town.colliders.boxes).toStrictEqual(baseline.colliders.boxes);
    expect(town.colliders.circles).toStrictEqual(baseline.colliders.circles);
    expect(town.doors).toStrictEqual(baseline.doors);
    expect(town.photoSpots).toStrictEqual(baseline.photoSpots);
  });

  it("retains the exact camera field, jump pieces and collider split flags", () => {
    const a = buildTownField(baseline), b = buildTownField(town);
    expect(b.lo).toEqual(a.lo);
    expect(b.hi).toEqual(a.hi);
    expect(b.base).toEqual(a.base);
    const before = buildTownLedges(baseline, a), after = buildTownLedges(town, b);
    expect(after.pieces).toStrictEqual(before.pieces);
    expect(after.things).toStrictEqual(before.things);
    expect(town.colliders.boxes).toStrictEqual(baseline.colliders.boxes);
    expect(town.colliders.circles).toStrictEqual(baseline.colliders.circles);
  }, 20_000);
});
