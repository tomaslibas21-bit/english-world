import { Box3, Color, Group, Mesh, MeshLambertMaterial, Raycaster, Vector3 } from "three";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { getInterior, type Interior } from "../src/game/world/interiors";
import { BUILDINGS, STALLS } from "../src/game/world/layout";
import { buildTown } from "../src/game/world/town";
import { townCanvasDocument } from "../tools/town-canvas-stub";
import { collisionRanges } from "../src/game/collisionGeometry";

const MARKET = ["#768577", "#596c60", "#c69b6e"];
const DINING = ["#914b43", "#f3ebda", "#d8d4c8", "#eee2cb"];
const HARBOR = ["#55747c", "#48636c", "#d0b99b", "#cbd4d2", "#756b59", "#52645f"];
const TRUCK = ["#e4d6ba", "#53645e", "#b6c2bd", "#ead8b6"];
const TABLES = [[-4, -3], [0, -3], [4, -3], [-4, 1], [4, 1], [0, 1.5], [6.5, -0.8]];
type Finish = { triangles: number; bounds: Box3; meshes: Set<Mesh> };
let town: ReturnType<typeof buildTown>, dining: Interior;
let townColors: Map<string, Finish>, diningColors: Map<string, Finish>;

const signature = (r: number, g: number, b: number) => `${Math.fround(r)},${Math.fround(g)},${Math.fround(b)}`;

/** Read the actual baked faces, including their world bounds, rather than testing a parallel decoration recipe. */
function finishes(root: Group, palette: string[]) {
  const keys = new Map(palette.map((hex) => {
    const c = new Color(hex);
    return [signature(c.r, c.g, c.b), hex] as const;
  }));
  const result = new Map<string, Finish>();
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const { geometry } = object, positions = geometry.getAttribute("position"), colors = geometry.getAttribute("color");
    if (!positions || !colors) return;
    const count = geometry.index?.count ?? positions.count;
    for (let i = 0; i < count; i += 3) {
      const a = geometry.index?.getX(i) ?? i;
      const hex = keys.get(signature(colors.getX(a), colors.getY(a), colors.getZ(a)));
      if (!hex) continue;
      expect(collisionRanges(geometry).some(([start, end]) => i >= start && i < end), `${hex} is a visual finish`).toBe(false);
      let entry = result.get(hex);
      if (!entry) result.set(hex, entry = { triangles: 0, bounds: new Box3(), meshes: new Set() });
      entry.triangles++;
      entry.meshes.add(object);
      for (let j = 0; j < 3; j++) {
        const vertex = geometry.index?.getX(i + j) ?? i + j;
        entry.bounds.expandByPoint(new Vector3().fromBufferAttribute(positions, vertex).applyMatrix4(object.matrixWorld));
      }
    }
  });
  return result;
}

function combined(records: Map<string, Finish>, palette: string[]) {
  const out: Finish = { triangles: 0, bounds: new Box3(), meshes: new Set() };
  for (const hex of palette) {
    const entry = records.get(hex);
    expect(entry, `${hex} is present in the built scene`).toBeDefined();
    out.triangles += entry!.triangles;
    out.bounds.union(entry!.bounds);
    entry!.meshes.forEach((mesh) => out.meshes.add(mesh));
  }
  return out;
}

function expectSharedBatch(finish: Finish, prefix: string, originalColor: string) {
  const expected = new Color(originalColor);
  for (const mesh of finish.meshes) {
    expect(mesh.name.startsWith(prefix)).toBe(true);
    expect(mesh.material).toBeInstanceOf(MeshLambertMaterial);
    expect(mesh.material).toMatchObject({ vertexColors: true, transparent: false, map: null });
    // Each decorated mesh must also contain unchanged geometry: a new finish-only mesh would add a draw call.
    const colors = mesh.geometry.getAttribute("color");
    let sharesOriginal = false;
    for (let i = 0; i < colors.count && !sharesOriginal; i++) sharesOriginal =
      Math.abs(colors.getX(i) - expected.r) < 1e-5 && Math.abs(colors.getY(i) - expected.g) < 1e-5 && Math.abs(colors.getZ(i) - expected.b) < 1e-5;
    expect(sharesOriginal, `${mesh.name} shares the original ${originalColor} bucket`).toBe(true);
  }
}

function surface(root: Group, origin: number[], direction: number[], far = 3) {
  const ray = new Raycaster(new Vector3(origin[0], origin[1], origin[2]), new Vector3(direction[0], direction[1], direction[2]), 0, far);
  const hit = ray.intersectObject(root, true)[0];
  expect(hit, `surface from ${origin}`).toBeDefined();
  const mesh = hit.object as Mesh;
  const colors = mesh.geometry.getAttribute("color");
  const color = colors ? new Color().fromBufferAttribute(colors, hit.face!.a) : (mesh.material as MeshLambertMaterial).color;
  return { hit, hex: `#${color.getHexString()}` };
}

beforeAll(() => {
  vi.stubGlobal("document", townCanvasDocument());
  try {
    town = buildTown();
    dining = getInterior("trattoria")!;
  } finally { vi.unstubAllGlobals(); }
  town.group.updateMatrixWorld(true);
  dining.group.updateMatrixWorld(true);
  townColors = finishes(town.group, [...MARKET, ...HARBOR, ...TRUCK]);
  diningColors = finishes(dining.group, DINING);
}, 20_000);

describe("Maple Harbor's second graphics batch", () => {
  it("gives all four stalls framed painted aprons within their original blocking boxes", () => {
    const finish = combined(townColors, MARKET);
    expect(finish.triangles).toBeGreaterThan(0);
    expect(finish.triangles).toBeLessThanOrEqual(160);
    expectSharedBatch(finish, "town-solid-", "#9c6b43");
    for (const { x, z } of STALLS) {
      expect(town.colliders.boxes).toContainEqual({ minX: x - 2.1, maxX: x + 2.1, minZ: z - 0.9, maxZ: z + 0.9, tag: undefined });
      for (const [dx, dz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const { hit, hex } = surface(town.group, [x + dx * 3, 0.46, z + dz * 2], [-dx, 0, -dz]);
        expect(hex).toBe("#768577");
        expect(Math.abs(hit.point.x - x)).toBeLessThan(2.1);
        expect(Math.abs(hit.point.z - z)).toBeLessThan(0.9);
      }
      const cap = surface(town.group, [x + 0.9, 1.3, z + 0.65], [0, -1, 0]);
      expect(cap.hex).toBe("#c69b6e");
      expect(cap.hit.point.y).toBeCloseTo(0.904);
      expect(surface(town.group, [x, 0.55, z + 2], [0, 0, -1]).hex).toBe("#596c60");
    }
  });

  it("sets every Trattoria table without moving a seat, blocking box or candle", () => {
    const finish = combined(diningColors, DINING);
    expect(finish.triangles).toBeGreaterThan(0);
    expect(finish.triangles).toBeLessThanOrEqual(392);
    expectSharedBatch(finish, "room-solid-", "#5a4636");
    for (const [x, z] of TABLES) {
      // Ledges annotates these boxes with split; the authored footprint must remain fixed.
      expect(dining.colliders.boxes).toEqual(expect.arrayContaining([expect.objectContaining({ minX: x - 0.55, maxX: x + 0.55, minZ: z - 0.55, maxZ: z + 0.55, tag: undefined })]));
      for (const side of [-1, 1]) {
        expect(dining.colliders.circles.some((c) => Math.abs(c.x - x) < 1e-6 && Math.abs(c.z - z - side * 0.95) < 1e-6 && c.r === 0.28)).toBe(true);
        const plate = surface(dining.group, [x, 1.1, z + side * 0.32], [0, -1, 0]);
        expect(plate.hex).toBe("#d8d4c8");
        expect(plate.hit.point.y).toBeCloseTo(0.801);
        expect(surface(dining.group, [x + 0.14, 1.1, z + side * 0.32], [0, -1, 0]).hex).toBe("#f3ebda");
        expect(surface(dining.group, [x + 0.25, 1.1, z + side * 0.32], [0, -1, 0]).hex).toBe("#eee2cb");
      }
      const runner = surface(dining.group, [x + 0.4, 1.1, z], [0, -1, 0]);
      expect(runner.hex).toBe("#914b43");
      expect(runner.hit.point.y).toBeCloseTo(0.793);
      expect(surface(dining.group, [x + 0.4, 1.1, z + 0.4], [0, -1, 0]).hex).toBe("#d9c8a7");
      if (x !== 6.5) {
        const candle = surface(dining.group, [x, 1.1, z], [0, -1, 0]);
        expect(candle.hex).toBe("#fff3c4");
        expect(candle.hit.point.y).toBeCloseTo(0.97);
      }
    }
    const service = combined(diningColors, ["#f3ebda", "#d8d4c8", "#eee2cb"]);
    expect(service.bounds.min.y).toBeGreaterThan(0.79);
    expect(service.bounds.max.y).toBeLessThan(0.81);
    expect(dining.npcs).toEqual([{ npc: "marco_host", x: -5.5, z: 3.2, rot: Math.PI / 2 }, { npc: "marco", x: 2, z: -1, rot: Math.PI / 2 }]);
  });

  it("articulates the physical pier wall and dock while keeping windows and the walking deck clear", () => {
    const finish = combined(townColors, HARBOR);
    expect(finish.triangles).toBeGreaterThan(0);
    expect(finish.triangles).toBeLessThanOrEqual(96);
    expectSharedBatch(finish, "town-solid-", "#1d4e6b");
    const building = BUILDINGS.find((b) => b.id === "pier")!;
    expect(town.colliders.boxes).toContainEqual({ minX: -39, maxX: -21, minZ: -86, maxZ: -74, tag: "building" });
    expect(surface(town.group, [-30, 0.69, -87], [0, 0, 1]).hex).toBe("#55747c");
    expect(surface(town.group, [-30, 2.8, -87], [0, 0, 1]).hex).toBe("#55747c");
    expect(surface(town.group, [-40, 0.69, -85], [1, 0, 0]).hex).toBe("#55747c");
    expect(surface(town.group, [-20, 0.69, -85], [-1, 0, 0]).hex).toBe("#55747c");
    expect(surface(town.group, [-30, 3.25, -87], [0, 0, 1]).hex).toBe("#d0b99b");
    // These are the existing seaward ground-floor window centers, in front of all new clapboard joints.
    const count = Math.floor((building.w - 2) / 3);
    for (let i = 0; i < count; i++) {
      const x = building.x - building.w / 2 + 2.5 + i * ((building.w - 2) / count);
      const pane = surface(town.group, [x + 0.22, 1.9, -87], [0, 0, 1]);
      expect(pane.hex).toBe("#9ccbe6");
      expect(pane.hit.point.z).toBeLessThan(-86.03);
    }
    const dock = combined(townColors, ["#756b59", "#52645f"]);
    expect(dock.bounds.min.x).toBeGreaterThan(-41.3);
    expect(dock.bounds.max.x).toBeLessThan(-18.7);
    expect(dock.bounds.min.z).toBeGreaterThan(-88.4);
    expect(dock.bounds.max.y).toBeLessThan(0.3);
    expect(surface(town.group, [-28.75, 0.19, -89], [0, 0, 1]).hex).toBe("#756b59");
    expect(town.colliders.boxes).toContainEqual({ minX: -41, maxX: -19, minZ: -88.2 - 0.15, maxZ: -88.2 + 0.15, tag: "edge" });
  });

  it("frames the lobster hatch above its existing shelf without filling its dark upper opening", () => {
    const finish = combined(townColors, TRUCK);
    expect(finish.triangles).toBeGreaterThan(0);
    expect(finish.triangles).toBeLessThanOrEqual(80);
    // Harbor Surf introduces the dark color in a casting bucket first. These finishes share the noncasting lamps.
    expectSharedBatch(finish, "town-solid-", "#fff4c4");
    expect(finish.bounds.min.x).toBeGreaterThan(12.6);
    expect(finish.bounds.max.x).toBeLessThan(13);
    expect(finish.bounds.min.z).toBeGreaterThan(-31.65);
    expect(finish.bounds.max.z).toBeLessThan(-28.75);
    expect(surface(town.group, [12.9, 2.5, -30.2], [-1, 0, 0]).hex).toBe("#e4d6ba");
    expect(surface(town.group, [14, 1.78, -30.2], [-1, 0, 0]).hex).toBe("#53645e");
    expect(surface(town.group, [14, 2.15, -30.2], [-1, 0, 0]).hex).toBe("#2b3338");
    const tray = surface(town.group, [12.8, 1.9, -29.6], [0, -1, 0]);
    expect(tray.hex).toBe("#ead8b6");
    expect(tray.hit.point.y).toBeCloseTo(1.565);
    expect(town.photoSpots.find((p) => p.id === "food_truck")).toEqual({ id: "food_truck", x: 11.4, y: 1.9, z: -31 });
    const truckBox = town.colliders.boxes.find((b) => Math.abs(b.minX - 10.05) < 1e-6 && Math.abs(b.minZ + 34.15) < 1e-6)!;
    expect(truckBox.maxX).toBeCloseTo(12.75);
    expect(truckBox.maxZ).toBeCloseTo(-27.85);
  });
});
