import { Box3, Color, Group, Mesh, MeshLambertMaterial, Raycaster, Vector3 } from "three";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { collisionRanges } from "../src/game/collisionGeometry";
import { DINNER_PROPS } from "../src/game/gofish/framing";
import { buildTownField, buildTownLedges } from "../src/game/townCollision";
import { getInterior, type Interior } from "../src/game/world/interiors";
import { buildTown } from "../src/game/world/town";
import { Merger } from "../src/game/world/util";
import { townCanvasDocument } from "../tools/town-canvas-stub";

const PALETTE = {
  bin: ["#526b5d", "#68816e", "#1d2e29", "#263f35"],
  post: ["#a76d55", "#c7b89b", "#dad1bc"],
  cover: ["#66796d", "#52665b", "#5f7168", "#b5a77b"],
  sofa: ["#bf725d", "#b46653", "#d7baa1", "#cbb99a", "#9c8870"],
};
const BINS = [[-45, -15], [8, -15], [-30, -1], [26, -1], [-14, 43]];
type Finish = { triangles: number; points: Vector3[]; meshes: Set<Mesh> };
let before: ReturnType<typeof buildTown>, town: ReturnType<typeof buildTown>, hall: Interior, house: Interior;
const records = new Map<Group, Map<string, Finish>>();
const signature = (r: number, g: number, b: number) => `${Math.fround(r)},${Math.fround(g)},${Math.fround(b)}`;

function read(root: Group) {
  const keys = new Map(Object.values(PALETTE).flat().map((hex) => {
    const c = new Color(hex);
    return [signature(c.r, c.g, c.b), hex] as const;
  }));
  const colors = new Map<string, Finish>();
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const g = object.geometry, p = g.getAttribute("position"), c = g.getAttribute("color");
    if (!p || !c) return;
    const ranges = collisionRanges(g);
    for (let i = 0, n = g.index?.count ?? p.count; i < n; i += 3) {
      const a = g.index?.getX(i) ?? i, hex = keys.get(signature(c.getX(a), c.getY(a), c.getZ(a)));
      if (!hex) continue;
      expect(ranges.some(([start, end]) => i >= start && i < end), `${hex} stays outside collision sampling`).toBe(false);
      let item = colors.get(hex);
      if (!item) colors.set(hex, item = { triangles: 0, points: [], meshes: new Set() });
      item.triangles++; item.meshes.add(object);
      for (let j = 0; j < 3; j++) item.points.push(new Vector3().fromBufferAttribute(p, g.index?.getX(i + j) ?? i + j).applyMatrix4(object.matrixWorld));
    }
  });
  return colors;
}

function finish(root: Group, palette: string[], prefix: string) {
  const result: Finish = { triangles: 0, points: [], meshes: new Set() };
  for (const hex of palette) {
    const item = records.get(root)!.get(hex);
    expect(item, `${hex} is rendered`).toBeDefined();
    result.triangles += item!.triangles; result.points.push(...item!.points);
    item!.meshes.forEach((mesh) => result.meshes.add(mesh));
  }
  for (const mesh of result.meshes) {
    expect(mesh.name.startsWith(prefix)).toBe(true);
    expect(mesh.material).toBeInstanceOf(MeshLambertMaterial);
    expect(mesh.material).toMatchObject({ vertexColors: true, transparent: false, map: null });
  }
  return result;
}

function surface(root: Group, x: number, y: number, z: number, dx = 0, dy = -1, dz = 0) {
  const hit = new Raycaster(new Vector3(x, y, z), new Vector3(dx, dy, dz), 0, 3).intersectObject(root, true)[0];
  expect(hit, `surface at ${x},${y},${z}`).toBeDefined();
  const mesh = hit.object as Mesh, attr = mesh.geometry.getAttribute("color");
  const c = attr ? new Color().fromBufferAttribute(attr, hit.face!.a) : (mesh.material as MeshLambertMaterial).color;
  return { hit, hex: `#${c.getHexString()}` };
}

beforeAll(() => {
  vi.stubGlobal("document", townCanvasDocument());
  const addVisual = Merger.prototype.addVisual;
  const omit = vi.spyOn(Merger.prototype, "addVisual").mockImplementation(function (this: Merger, key, material, geometry, cast, receive) {
    if (key.startsWith("glow-b8-")) { geometry.dispose(); return; }
    addVisual.call(this, key, material, geometry, cast, receive);
  });
  try {
    before = buildTown();
    omit.mockRestore();
    town = buildTown();
    hall = getInterior("pool-hall")!;
    house = getInterior("dans-house")!;
  } finally { omit.mockRestore(); vi.unstubAllGlobals(); }
  for (const root of [town.group, hall.group, house.group]) {
    root.updateMatrixWorld(true);
    records.set(root, read(root));
  }
}, 20_000);

describe("Maple Harbor glow B8", () => {
  it("opens the look of all five bins without extending their blocking radius or moving a photo target", () => {
    const bins = finish(town.group, PALETTE.bin, "town-solid-");
    expect(bins.triangles).toBe(450);
    expect(bins.triangles).toBeLessThanOrEqual(500);
    for (const p of bins.points) expect(BINS.some(([x, z]) => Math.hypot(p.x - x, p.z - z) < 0.32 && p.y >= 0.1199 && p.y <= 0.91)).toBe(true);
    for (const [x, z] of BINS) {
      const mouth = surface(town.group, x, 1.2, z);
      expect(mouth.hex).toBe("#1d2e29"); expect(mouth.hit.point.y).toBeCloseTo(0.909);
      expect(surface(town.group, x + 0.19, 1.2, z + 0.03).hex).toBe("#68816e");
      const a = Math.PI / 10, sx = Math.sin(a), sz = Math.cos(a);
      expect(surface(town.group, x + sx * 0.6, 0.46, z + sz * 0.6, -sx, 0, -sz).hex).toBe("#263f35");
      expect(town.colliders.circles).toEqual(expect.arrayContaining([expect.objectContaining({ x, z, r: 0.32 })]));
      expect(town.photoSpots).toContainEqual({ id: "trash_can", x, y: 0.5, z });
    }
  });

  it("adds brick courses below the postal windows while retaining the doorway and original blue sill", () => {
    const wall = finish(town.group, PALETTE.post, "town-solid-");
    expect(wall.triangles).toBe(80); expect(wall.triangles).toBeLessThanOrEqual(96);
    const bounds = new Box3().setFromPoints(wall.points);
    expect(bounds.min.y).toBeGreaterThan(0.5); expect(bounds.max.y).toBeCloseTo(3.16);
    expect(bounds.min.x).toBeGreaterThanOrEqual(22.499); expect(bounds.max.x).toBeLessThanOrEqual(37.501);
    expect(surface(town.group, 26, 0.6, -1, 0, 0, 1).hex).toBe("#a76d55");
    expect(surface(town.group, 26, 1.075, -1, 0, 0, 1).hex).toBe("#dad1bc");
    expect(surface(town.group, 30, 0.25, -1, 0, 0, 1).hex).toBe("#2c4f8f");
    expect(surface(town.group, 30, 0.75, -1, 0, 0, 1).hex).toBe("#5f8fb0");
    for (const x of [25.22, 34.97]) expect(surface(town.group, x, 1.9, -1, 0, 0, 1).hex).toBe("#9ccbe6");
  });

  it("drapes the spare table with a hem while preserving its model, collider and Tina's approach", () => {
    const cover = finish(hall.group, PALETTE.cover, "room-solid-");
    expect(cover.triangles).toBe(72); expect(cover.triangles).toBeLessThanOrEqual(96);
    for (const p of cover.points) {
      expect(Math.abs(p.x - 3.7)).toBeLessThan(0.971);
      expect(Math.abs(p.z - 2.63)).toBeLessThan(0.545);
      expect(p.y).toBeGreaterThan(0.689); expect(p.y).toBeLessThan(0.934);
    }
    const top = surface(hall.group, 3.7, 1.3, 2.63);
    expect(top.hex).toBe("#66796d"); expect(top.hit.point.y).toBeCloseTo(0.93);
    const hem = new Box3().setFromPoints(records.get(hall.group)!.get("#b5a77b")!.points);
    expect(hem.min.y).toBeCloseTo(0.695); expect(hem.max.y).toBeCloseTo(0.932);
    const spare = hall.group.getObjectByName("pool-hall-spare")!;
    expect(spare.position.toArray()).toEqual([3.7, 0, 2.63]);
    expect(spare.scale.toArray()).toEqual([0.79, 0.94, 0.83]); expect(spare.rotation.y).toBe(Math.PI / 2);
    expect(hall.colliders.boxes).toEqual(expect.arrayContaining([expect.objectContaining({
      minX: 3.7 - 1.89 / 2, maxX: 3.7 + 1.89 / 2, minZ: 2.63 - 1.04 / 2, maxZ: 2.63 + 1.04 / 2,
    })]));
    expect(hall.npcs.find((n) => n.npc === "tina")).toMatchObject({ ax: 1.55, az: 1.28 });
  });

  it("pads the living-room sofa and drapes its arm without moving its frame or the dining props", () => {
    const cushions = finish(house.group, PALETTE.sofa, "room-solid-");
    expect(cushions.triangles).toBe(192); expect(cushions.triangles).toBeLessThanOrEqual(224);
    for (const p of cushions.points) {
      expect(p.x).toBeGreaterThan(-6.231); expect(p.x).toBeLessThan(-3.77);
      expect(Math.abs(p.z - 2.5)).toBeLessThan(0.46); expect(p.y).toBeLessThan(1.021);
    }
    const seat = surface(house.group, -5.5, 1.3, 2.57);
    expect(seat.hex).toBe("#bf725d"); expect(seat.hit.point.y).toBeCloseTo(0.645);
    expect(surface(house.group, -5.35, 0.83, 2.9, 0, 0, -1).hex).toBe("#b46653");
    const cloth = surface(house.group, -6.1, 1.3, 2.52);
    expect(cloth.hex).toBe("#cbb99a"); expect(cloth.hit.point.y).toBeCloseTo(0.827);
    expect(house.colliders.boxes).toEqual(expect.arrayContaining([expect.objectContaining({
      minX: -5 - 2.4 / 2, maxX: -5 + 2.4 / 2, minZ: 2.5 - 0.9 / 2, maxZ: 2.5 + 0.9 / 2,
    })]));
    expect(house.group.getObjectByName(DINNER_PROPS)).toBeDefined();
  });

  it("shares existing opaque batches, including unchanged furniture in both rooms", () => {
    const count = (root: Group) => {
      let meshes = 0, casting = 0, triangles = 0;
      root.traverse((o) => {
        if (!(o instanceof Mesh)) return;
        meshes++; casting += +o.castShadow;
        triangles += (o.geometry.index?.count ?? o.geometry.getAttribute("position").count) / 3;
      });
      return { meshes, casting, triangles };
    };
    const old = count(before.group);
    expect(count(town.group)).toEqual({ ...old, triangles: old.triangles + 530 });
    for (const [room, palette, original] of [[hall, PALETTE.cover, "#503123"], [house, PALETTE.sofa, "#b5452f"]] as const) {
      const c = new Color(original), added = finish(room.group, [...palette], "room-solid-");
      expect(room.group.children.filter((o) => o.name.startsWith("room-solid-"))).toHaveLength(2);
      for (const mesh of added.meshes) {
        const attr = mesh.geometry.getAttribute("color");
        let sharesOriginal = false;
        for (let i = 0; i < attr.count && !sharesOriginal; i++) sharesOriginal =
          Math.abs(attr.getX(i) - c.r) < 1e-5 && Math.abs(attr.getY(i) - c.g) < 1e-5 && Math.abs(attr.getZ(i) - c.b) < 1e-5;
        expect(sharesOriginal).toBe(true);
      }
    }
  });

  it("keeps outdoor camera fields, ledges, colliders, doors and photo anchors identical", () => {
    expect(town.doors).toStrictEqual(before.doors); expect(town.photoSpots).toStrictEqual(before.photoSpots);
    const a = buildTownField(before), b = buildTownField(town);
    expect(b.lo).toEqual(a.lo); expect(b.hi).toEqual(a.hi); expect(b.base).toEqual(a.base);
    const old = buildTownLedges(before, a), current = buildTownLedges(town, b);
    expect(current.pieces).toStrictEqual(old.pieces); expect(current.things).toStrictEqual(old.things);
    expect(town.colliders.boxes).toStrictEqual(before.colliders.boxes);
    expect(town.colliders.circles).toStrictEqual(before.colliders.circles);
  }, 20_000);
});
