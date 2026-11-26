import * as THREE from "three";
import { afterEach, expect, it, vi } from "vitest";
import { buildCave } from "../../src/game/cave/Cave";
import * as stelae from "../../src/game/cave/stelae";
import { CHAMBERS } from "../../src/game/cave/plan";
import { busParts, mergeCarParts, VEHICLE_LENGTH } from "../../src/game/world/car";
import * as busFront from "../../src/game/world/cityBusFront";
import { cantinaStoolParts } from "../../src/game/world/cantinaStool";
import { getInterior } from "../../src/game/world/interiors";
import { BUILDINGS } from "../../src/game/world/layout";
import { airportFront, type Part, type SignAtlas } from "../../src/game/world/mexican";
import { TownMerger } from "../../src/game/world/townMerger";
import { Colliders, colourMerge } from "../../src/game/world/util";
import { townCanvasDocument } from "../../tools/town-canvas-stub";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const triangles = (g: THREE.BufferGeometry) => (g.index?.count ?? g.attributes.position.count) / 3;
const disposeParts = (parts: Part[]) => parts.forEach(([g]) => g.dispose());
const colorAt = (hit: THREE.Intersection) => new THREE.Color()
  .fromBufferAttribute((hit.object as THREE.Mesh).geometry.attributes.color, hit.face!.a).getHex();
function area(g: THREE.BufferGeometry) {
  const p = g.attributes.position, a = new THREE.Vector3(), b = a.clone(), c = a.clone();
  let sum = 0;
  for (let i = 0; i < (g.index?.count ?? p.count); i += 3) {
    const at = (j: number) => g.index ? g.index.getX(i + j) : i + j;
    a.fromBufferAttribute(p, at(0)); b.fromBufferAttribute(p, at(1)); c.fromBufferAttribute(p, at(2));
    sum += b.sub(a).cross(c.sub(a)).length() / 2;
  }
  return sum;
}
function bounds(parts: Part[]) {
  const box = new THREE.Box3(), p = new THREE.Vector3();
  for (const [g] of parts) for (let i = 0; i < g.attributes.position.count; i++) box.expandByPoint(p.fromBufferAttribute(g.attributes.position, i));
  return box;
}

it("courses the airport drop-off's closed hip within the old roof and keeps the welcome sign and planters", () => {
  const terminal = BUILDINGS.find(b => b.id === "terminal")!, dx = terminal.x - terminal.w / 2;
  const c = { x0: dx - 8, x1: dx, z0: terminal.z - 10, z1: terminal.z + 10, y: 5.5, top: 6.15 };
  const parts: Part[] = [], roofs: Part[] = [], col = new Colliders(), add = vi.fn();
  airportFront(parts, col, { add } as unknown as SignAtlas, roofs, c, ["Bienvenidos", "Welcome"]);
  const cx = (c.x0 + c.x1) / 2, cz = terminal.z, hw = 4.5, hd = 10.5;
  const original = new THREE.ConeGeometry(1, c.top - c.y, 4).rotateY(Math.PI / 4)
    .scale(hw * Math.SQRT2, 1, hd * Math.SQRT2).translate(cx, (c.y + c.top) / 2, cz);
  const hip = roofs.filter(([g]) => { g.computeBoundingBox(); return g.boundingBox!.min.y >= c.y - 1e-5; });
  const g = colourMerge(hip), material = new THREE.MeshBasicMaterial(), mesh = new THREE.Mesh(g, material);
  try {
    expect(hip).toHaveLength(6);
    expect(triangles(g) - triangles(original)).toBe(32);
    expect(triangles(g) - triangles(original)).toBeLessThanOrEqual(48);
    expect(area(g)).toBeCloseTo(area(original), 2);
    const old = bounds([[original, "white"]]), now = bounds(hip), all = bounds(roofs);
    expect(now.min.distanceTo(old.min)).toBeLessThan(1e-4); expect(now.max.distanceTo(old.max)).toBeLessThan(1e-4);
    expect(all.min.y).toBeCloseTo(c.y - 0.53, 5); expect(all.max.y).toBeCloseTo(c.top, 5);
    expect(all.min.x).toBeGreaterThanOrEqual(cx - hw - 0.1301); expect(all.max.x).toBeLessThanOrEqual(cx + hw + 0.1301);
    expect(all.min.z).toBeGreaterThanOrEqual(cz - hd - 0.1301); expect(all.max.z).toBeLessThanOrEqual(cz + hd + 0.1301);
    for (const [t, ink] of [[0.18, 0xb89258], [0.36, 0x80643e], [0.5, 0xa88955], [0.7, 0x80643e], [0.85, 0xb89258]]) {
      const y = c.y + (c.top - c.y) * t;
      const [hit] = new THREE.Raycaster(new THREE.Vector3(cx - hw - 2, y, cz), new THREE.Vector3(1, 0, 0)).intersectObject(mesh);
      expect(colorAt(hit)).toBe(ink);
      expect(hit.point.x).toBeCloseTo(cx - hw * (1 - t), 4);
      expect(hit.face!.normal.y).toBeGreaterThan(0.9);
    }
    const merger = new TownMerger(50), group = new THREE.Group();
    merger.addParts(hip.map(([geo, ink]) => [geo.clone(), ink]), "thinCast"); merger.build(group);
    expect(group.children.map(o => o.name)).toEqual([`town-thinCast-${Math.floor(cx / 50)},${Math.floor(cz / 50)}`]);
    const batch = group.children[0] as THREE.Mesh;
    expect(batch.userData.thin).toBe(true); expect(batch.castShadow).toBe(true); expect(batch.geometry.groups).toHaveLength(0);
    batch.geometry.dispose();
    expect(col.boxes).toHaveLength(2); expect(col.circles).toHaveLength(2);
    expect(add).toHaveBeenCalledTimes(1);
    expect(add.mock.calls[0].slice(4)).toEqual([5, 1.5,
      c.x0 + 1.2 + 0.1 * Math.sin(-1.15), 3, c.z0 - 3.6 + 0.1 * Math.cos(-1.15), -1.15, true]);
  } finally { original.dispose(); g.dispose(); material.dispose(); disposeParts([...parts, ...roofs]); }
});

it("fits the city bus nose into one existing geometry and retains its route bars, wheels and crash wheel range", () => {
  const finish = vi.spyOn(busFront, "cityBusFrontParts").mockReturnValue([]);
  const before = busParts("#f4f6f8", "#1f8fa3", 7); expect(finish).toHaveBeenCalledOnce(); finish.mockRestore();
  const after = busParts("#f4f6f8", "#1f8fa3", 7), art = after.slice(before.length - 8, -8);
  const retained = [...after.slice(0, before.length - 8), ...after.slice(-8)];
  for (let i = 0; i < before.length; i++) {
    expect(retained[i][1]).toBe(before[i][1]);
    expect(retained[i][0].attributes.position.array).toEqual(before[i][0].attributes.position.array);
  }
  const oldBox = bounds(before), newBox = bounds(after);
  expect(newBox.min.distanceTo(oldBox.min)).toBeLessThan(1e-6); expect(newBox.max.distanceTo(oldBox.max)).toBeLessThan(1e-6);
  expect(art.reduce((sum, [g]) => sum + triangles(g), 0)).toBe(24);
  expect(art.reduce((sum, [g]) => sum + triangles(g), 0)).toBeLessThanOrEqual(32);
  const old = mergeCarParts(before), g = mergeCarParts(after), material = new THREE.MeshBasicMaterial(), mesh = new THREE.Mesh(g, material);
  try {
    expect(g.groups).toHaveLength(0); expect(VEHICLE_LENGTH.bus).toBe(9.6);
    const [oldStart, oldEnd] = old.userData.crashWheels, [start, end] = g.userData.crashWheels;
    expect(end - start).toBe(oldEnd - oldStart);
    expect(Array.from(g.attributes.position.array).slice(start * 3)).toEqual(Array.from(old.attributes.position.array).slice(oldStart * 3));
    const front = (x: number, y: number) => new THREE.Raycaster(new THREE.Vector3(x, y, 5.5), new THREE.Vector3(0, 0, -1)).intersectObject(mesh)[0];
    for (const [x, y, ink] of [[0, 0.98, 0x8dada7], [0, 1.18, 0xc4c9b9], [0.94, 1.14, 0xe9a34e],
      [0.85, 0.8, 0xfff4c2], [0, 1.95, 0x34545d], [0.53, 1.54, 0x293f46], [0.75, 2.78, 0xffb627]]) {
      expect(colorAt(front(x, y))).toBe(ink);
    }
  } finally { old.dispose(); g.dispose(); material.dispose(); disposeParts([...before, ...after]); }
});

it("finishes three cantina stools at the original seat height with an open foot ring and unchanged collision", () => {
  const parts = cantinaStoolParts(), original = new THREE.CylinderGeometry(0.24, 0.24, 0.09, 12).translate(0, 0.695, 0);
  const seat = colourMerge(parts.slice(0, 3)), ring = colourMerge(parts.slice(3));
  const material = new THREE.MeshBasicMaterial(), mesh = new THREE.Mesh(seat, material), foot = new THREE.Mesh(ring, material);
  try {
    expect(triangles(seat) + triangles(ring) - triangles(original) - 48).toBe(72);
    expect(3 * (triangles(seat) + triangles(ring) - triangles(original) - 48)).toBeLessThanOrEqual(240);
    expect(area(seat)).toBeCloseTo(area(original), 6);
    const oldBox = bounds([[original, "white"]]), newBox = bounds([[seat, "white"]]);
    expect(newBox.min.distanceTo(oldBox.min)).toBeLessThan(1e-6); expect(newBox.max.distanceTo(oldBox.max)).toBeLessThan(1e-6);
    for (const [x, ink] of [[0, 0xb06d52], [0.222, 0xbf9566]]) {
      const [hit] = new THREE.Raycaster(new THREE.Vector3(x, 1, 0.01), new THREE.Vector3(0, -1, 0)).intersectObject(mesh);
      expect(colorAt(hit)).toBe(ink); expect(hit.point.y).toBeCloseTo(0.74, 6); expect(hit.face!.normal.y).toBeGreaterThan(0.99);
    }
    expect(new THREE.Raycaster(new THREE.Vector3(0, 0.6, 0), new THREE.Vector3(0, -1, 0)).intersectObject(foot)).toHaveLength(0);
    expect(new THREE.Raycaster(new THREE.Vector3(0.145, 0.6, 0), new THREE.Vector3(0, -1, 0)).intersectObject(foot).length).toBeGreaterThan(0);
  } finally { seat.dispose(); ring.dispose(); original.dispose(); material.dispose(); disposeParts(parts); }
  const doc = townCanvasDocument();
  class Canvas { width = 0; height = 0; getContext = doc.createElement().getContext; }
  vi.stubGlobal("HTMLCanvasElement", Canvas); vi.stubGlobal("document", { createElement: () => new Canvas() });
  const room = getInterior("pool-hall")!, batch = room.group.getObjectByName("room-cast") as THREE.Mesh;
  const p = batch.geometry.attributes.position, c = batch.geometry.attributes.color, ink = new THREE.Color();
  let seats = 0;
  for (let i = 0; i < p.count; i += 3) if ([0x86463b, 0xb06d52, 0xbf9566].includes(ink.fromBufferAttribute(c, i).getHex())) seats++;
  expect(seats).toBe(216); expect(batch.geometry.groups).toHaveLength(0);
  // Room ledge sampling adds collision metadata; retain the authored stool footprints.
  for (const x of [-4.25, -3.05, -1.85]) expect(room.colliders.circles).toContainEqual(expect.objectContaining({ x, z: -3.05, r: 0.25 }));
});

it("carves the speaking stelae around their original glyphs in the five existing chamber draws", async () => {
  const parts = stelae.stelaCarvings(), g = colourMerge(parts), material = new THREE.MeshBasicMaterial(), mesh = new THREE.Mesh(g, material);
  try {
    expect(triangles(g)).toBe(22);
    const p = g.attributes.position, n = g.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      expect(Math.abs(p.getX(i))).toBeLessThan(0.5); expect(p.getY(i)).toBeGreaterThan(0.3); expect(p.getY(i)).toBeLessThan(2.2);
      expect(p.getZ(i)).toBeCloseTo(0.211, 6); expect(n.getZ(i)).toBeGreaterThan(0.99);
      expect(Math.abs(p.getX(i)) > 0.4 || p.getY(i) < 1.05 || p.getY(i) > 1.85).toBe(true);
    }
    expect(new THREE.Raycaster(new THREE.Vector3(0, 1.45, 1), new THREE.Vector3(0, 0, -1)).intersectObject(mesh)).toHaveLength(0);
    expect(colorAt(new THREE.Raycaster(new THREE.Vector3(0.455, 1.45, 1), new THREE.Vector3(0, 0, -1)).intersectObject(mesh)[0])).toBe(0x81958b);
  } finally { g.dispose(); material.dispose(); disposeParts(parts); }
  vi.stubGlobal("document", townCanvasDocument());
  const carving = vi.spyOn(stelae, "stelaCarvings").mockReturnValue([]), before = buildCave();
  await Promise.resolve();
  expect(carving).toHaveBeenCalledTimes(15); carving.mockRestore();
  const after = buildCave(); await Promise.resolve();
  try {
    expect(after.group.children.map(o => o.name)).toEqual(before.group.children.map(o => o.name));
    expect(after.colliders.boxes).toEqual(before.colliders.boxes); expect(after.colliders.circles).toEqual(before.colliders.circles);
    let added = 0;
    for (const chamber of CHAMBERS) {
      const a = before.group.getObjectByName(`cave-${chamber.id}`) as THREE.Mesh;
      const b = after.group.getObjectByName(`cave-${chamber.id}`) as THREE.Mesh;
      added += triangles(b.geometry) - triangles(a.geometry);
      expect(b.geometry.groups).toHaveLength(0);
    }
    expect(added).toBe(330); expect(added).toBeLessThanOrEqual(360);
    for (const name of ["cave-glyphs", "cave-sparks", "cave-water", "cave-falls", "cave-shafts"]) {
      const a = (before.group.getObjectByName(name) as THREE.Mesh).geometry;
      const b = (after.group.getObjectByName(name) as THREE.Mesh).geometry;
      for (const key of Object.keys(a.attributes)) expect(b.attributes[key].array).toEqual(a.attributes[key].array);
    }
    expect(after.group.getObjectsByProperty("isLight", true)).toHaveLength(0);
  } finally {
    for (const cave of [before, after]) cave.group.traverse(o => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Points) {
        o.geometry.dispose(); for (const m of Array.isArray(o.material) ? o.material : [o.material]) m.dispose();
      }
    });
  }
});
