import * as THREE from "three";
import { afterEach, expect, it, vi } from "vitest";
import { buildCave } from "../../src/game/cave/Cave";
import * as mushrooms from "../../src/game/cave/mushrooms";
import { CHAMBERS } from "../../src/game/cave/plan";
import { ROAD_LOOK } from "../../src/game/road/look";
import { PERIOD, Ranges } from "../../src/game/road/ranges";
import { POOLS } from "../../src/game/water";
import { hotelPool, rolledTowelParts, type Part } from "../../src/game/world/mexican";
import { HOTEL_POOL } from "../../src/game/world/pool";
import { TownMerger } from "../../src/game/world/townMerger";
import { Colliders, colourMerge } from "../../src/game/world/util";
import { townCanvasDocument } from "../../tools/town-canvas-stub";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const triangles = (g: THREE.BufferGeometry) => (g.index?.count ?? g.attributes.position.count) / 3;
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
const colorAt = (hit: THREE.Intersection) => new THREE.Color()
  .fromBufferAttribute((hit.object as THREE.Mesh).geometry.attributes.color, hit.face!.a).getHex();
function poolFixture() {
  const parts: Part[] = [], flat: Part[] = [], col = new Colliders(), pools = POOLS.slice();
  try { hotelPool(parts, flat, col); } finally { POOLS.splice(0, POOLS.length, ...pools); }
  return { parts, col, dispose: () => { for (const [g] of [...parts, ...flat]) g.dispose(); } };
}
function assertPoolBatch(parts: Part[]) {
  const merger = new TownMerger(50), group = new THREE.Group();
  merger.addParts(parts.map(([g, ink]) => [g.clone(), ink]), "cast");
  merger.build(group);
  try {
    expect(group.children.map(o => o.name)).toEqual(["town-cast--3,-1"]);
    const mesh = group.children[0] as THREE.Mesh;
    expect(mesh.castShadow).toBe(true);
    expect(mesh.geometry.groups).toHaveLength(0);
    expect(Array.isArray(mesh.material)).toBe(false);
  } finally { group.traverse(o => { if (o instanceof THREE.Mesh) o.geometry.dispose(); }); }
}

it("hems both pool parasols on their original planes, with the same rims, poles and town draw", () => {
  const pool = poolFixture(), { x, z } = HOTEL_POOL;
  const hems = ["#dfd2bb", "#80c1b2", "#e8b08a", "#bcb59e", "#438e83", "#bb7859"];
  const inks = [...hems, "#fff4df", "#239b9a", "#ed7954"];
  const cloth = pool.parts.filter(([g, ink]) => {
    g.computeBoundingBox();
    return inks.includes(ink as string) && g.boundingBox!.min.y > 2.29 && g.boundingBox!.max.y < 2.86;
  });
  const g = colourMerge(cloth), mat = new THREE.MeshBasicMaterial(), mesh = new THREE.Mesh(g, mat);
  try {
    expect(triangles(g)).toBe(120);
    expect(triangles(g) - 2 * 10 * 2).toBeLessThanOrEqual(80);
    assertPoolBatch(cloth);
    for (const px of [-2.95, 2.65]) {
      const center = new THREE.Vector3(x + px, 2.85, z - 7.5);
      expect(pool.col.circles).toContainEqual({ x: center.x, z: center.z, r: 0.3 });
      let originalArea = 0;
      for (let i = 0; i < 10; i++) {
        const a = i * Math.PI * 2 / 10, b = (i + 1) * Math.PI * 2 / 10;
        const A = new THREE.Vector3(Math.cos(a) * 1.55, -0.55, Math.sin(a) * 1.55);
        const B = new THREE.Vector3(Math.cos(b) * 1.55, -0.55, Math.sin(b) * 1.55);
        originalArea += A.clone().cross(B).length(); // both windings of the old wedge
        for (const t of [0.5, 0.95]) {
          const point = center.clone().add(A.clone().add(B).multiplyScalar(t / 2));
          const top = new THREE.Raycaster(new THREE.Vector3(point.x, 3.2, point.z), new THREE.Vector3(0, -1, 0)).intersectObject(mesh)[0];
          const below = new THREE.Raycaster(new THREE.Vector3(point.x, 2, point.z), new THREE.Vector3(0, 1, 0)).intersectObject(mesh)[0];
          expect(top.point.y).toBeCloseTo(point.y, 4); expect(below.point.y).toBeCloseTo(point.y, 4);
          expect(top.face!.normal.y).toBeGreaterThan(0.9); expect(below.face!.normal.y).toBeLessThan(-0.9);
          const base = i % 2 ? 0xfff4df : px < 0 ? 0x239b9a : 0xed7954;
          expect(colorAt(top)).toBe(t < 0.9 ? base : i % 2 ? 0xdfd2bb : px < 0 ? 0x80c1b2 : 0xe8b08a);
          expect(colorAt(below)).toBe(t < 0.9 ? base : i % 2 ? 0xbcb59e : px < 0 ? 0x438e83 : 0xbb7859);
        }
      }
      const actual = cloth.filter(([geo]) => {
        geo.computeBoundingBox(); return Math.abs(geo.boundingBox!.getCenter(new THREE.Vector3()).x - center.x) < 1.6;
      }).reduce((sum, [geo]) => sum + area(geo), 0);
      // The parasols are 5.6 m apart, so this selects one complete canopy.
      expect(actual).toBeCloseTo(originalArea, 3);
    }
    for (const [geo] of cloth) {
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const dx = Math.min(...[-2.95, 2.65].map(px => Math.abs(p.getX(i) - x - px)));
        expect(Math.hypot(dx, p.getZ(i) - z + 7.5)).toBeLessThanOrEqual(1.55002);
      }
    }
  } finally { g.dispose(); mat.dispose(); pool.dispose(); }
});

it("weaves all nine rolled towels without changing their closed surfaces or rack collision", () => {
  const original = new THREE.CylinderGeometry(0.115, 0.115, 0.44, 10).rotateX(Math.PI / 2);
  original.computeBoundingBox();
  try {
    for (const color of ["#fff6e5", "#38aab4", "#f6a853"]) {
      const parts = rolledTowelParts(color);
      for (const [geo] of parts) geo.rotateX(Math.PI / 2);
      const g = colourMerge(parts), mat = new THREE.MeshBasicMaterial(), mesh = new THREE.Mesh(g, mat);
      try {
        g.computeBoundingBox();
        expect(triangles(g) - triangles(original)).toBe(40);
        expect(area(g)).toBeCloseTo(area(original), 6);
        expect(g.boundingBox!.min.distanceTo(original.boundingBox!.min)).toBeLessThan(1e-6);
        expect(g.boundingBox!.max.distanceTo(original.boundingBox!.max)).toBeLessThan(1e-6);
        const top = (pz: number) => new THREE.Raycaster(new THREE.Vector3(0.015, 0.3, pz), new THREE.Vector3(0, -1, 0)).intersectObject(mesh)[0];
        expect(colorAt(top(0.115))).toBe(color === "#fff6e5" ? 0x557d77 : 0xe7d8b6);
        expect(colorAt(top(-0.1))).toBe(new THREE.Color(color).getHex());
        for (const side of [-1, 1]) {
          const end = new THREE.Raycaster(new THREE.Vector3(0.015, 0.02, side * 0.4), new THREE.Vector3(0, 0, -side)).intersectObject(mesh)[0];
          expect(end.point.z).toBeCloseTo(side * 0.22, 6);
          expect(end.face!.normal.z * side).toBeGreaterThan(0.99);
        }
      } finally { g.dispose(); mat.dispose(); for (const [geo] of parts) geo.dispose(); }
    }
  } finally { original.dispose(); }
  const pool = poolFixture(), { x, z } = HOTEL_POOL;
  try {
    const bands = pool.parts.filter(([, ink]) => ["#557d77", "#e7d8b6"].includes(ink as string));
    expect(bands).toHaveLength(9);
    const rolls = pool.parts.filter(([g, ink]) => {
      if (!["#fff6e5", "#38aab4", "#f6a853", "#557d77", "#e7d8b6"].includes(ink as string)) return false;
      g.computeBoundingBox();
      return g.boundingBox!.min.z > z + 3.75 - 0.221 && g.boundingBox!.max.z < z + 3.75 + 0.221;
    });
    expect(rolls).toHaveLength(45);
    expect(rolls.reduce((sum, [g]) => sum + triangles(g), 0) - 9 * 40).toBeLessThanOrEqual(360);
    assertPoolBatch(bands);
    const expected = new Colliders(); expected.addBox(x - 4.7, z + 3.75, 1.12, 0.6);
    expect(pool.col.boxes).toContainEqual(expected.boxes[0]);
    for (const [g] of bands) {
      g.computeBoundingBox();
      expect(g.boundingBox!.min.x).toBeGreaterThan(x - 5.26);
      expect(g.boundingBox!.max.x).toBeLessThan(x - 4.14);
      expect(g.boundingBox!.min.z).toBeCloseTo(z + 3.75 + 0.08, 5);
      expect(g.boundingBox!.max.z).toBeCloseTo(z + 3.75 + 0.15, 5);
    }
  } finally { pool.dispose(); }
});

it("gives PC's mesa material broad strata while retaining two instances, geometry and haze streaming", () => {
  const ranges = new Ranges(ROAD_LOOK.rock), { mesh } = ranges, u = mesh.material.uniforms;
  const positions = mesh.geometry.attributes.position.array.slice(), tone = mesh.geometry.attributes.tone.array.slice();
  try {
    expect(u.uStrata.value).toBe(1);
    expect(mesh.count).toBe(2);
    expect(mesh.geometry.groups).toHaveLength(0);
    expect(triangles(mesh.geometry)).toBeLessThanOrEqual(36 * (2 * 8 * 4 + 7 * 4));
    expect(mesh.geometry.attributes.shade.count).toBe(mesh.geometry.attributes.position.count);
    const haze = new THREE.Color("#b98a8c"), light = new THREE.Color("#ffe6bb");
    ranges.light(haze, light);
    expect(u.haze.value.equals(haze)).toBe(true);
    expect(u.tint.value.equals(light.clone().multiplyScalar(1 / Math.max(light.r, light.g, light.b)))).toBe(true);
    for (const distance of [0, 80, PERIOD + 80, PERIOD * 4 + 80]) {
      ranges.update(distance);
      for (let i = 0; i < 2; i++) {
        const m = new THREE.Matrix4(); mesh.getMatrixAt(i, m);
        expect(new THREE.Vector3().setFromMatrixPosition(m).toArray()).toEqual([0, 0, -(Math.floor((distance - 70) / PERIOD) + i) * PERIOD]);
      }
    }
    // PC's finish is entirely material-side; disabling it uses the same buffers and streaming geometry.
    u.uStrata.value = 0;
    expect(mesh.geometry.attributes.position.array).toEqual(positions);
    expect(mesh.geometry.attributes.tone.array).toEqual(tone);
    expect(mesh.material.transparent).toBe(true);
    expect(mesh.frustumCulled).toBe(false);
  } finally { ranges.dispose(); }
});

it("paints mushroom flecks and lower rims without changing the grotto's five chamber meshes or collisions", async () => {
  const shape = new THREE.SphereGeometry(0.2, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2);
  expect(triangles(shape)).toBe(49); shape.dispose();
  const base = new THREE.Color("#ff9bd6"), luma = (c: THREE.Color) => c.r * 0.2126 + c.g * 0.7152 + c.b * 0.0722;
  let rims = 0, flecks = 0;
  for (let i = 0; i < 49; i++) {
    const ink = base.clone(); mushrooms.finishMushroomCap(ink, i);
    if (i >= 35) { rims++; expect(luma(ink)).toBeLessThan(luma(base)); }
    else if (!ink.equals(base)) { flecks++; expect(ink.g).toBeGreaterThan(base.g); }
  }
  expect(rims).toBe(14); expect(flecks).toBe(3);
  vi.stubGlobal("document", townCanvasDocument());
  const paint = vi.spyOn(mushrooms, "finishMushroomCap").mockImplementation(() => {});
  const before = buildCave();
  await Promise.resolve();
  expect(paint.mock.calls.length).toBeGreaterThan(49);
  paint.mockRestore();
  const after = buildCave();
  await Promise.resolve();
  try {
    expect(after.group.children.map(o => o.name)).toEqual(before.group.children.map(o => o.name));
    expect(after.group.getObjectsByProperty("isLight", true)).toHaveLength(0);
    expect(after.colliders.boxes).toEqual(before.colliders.boxes);
    expect(after.colliders.circles).toEqual(before.colliders.circles);
    expect(after.colliders.blocked(1.2, -0.7, 0.38)).toBe(false);
    let changed = 0;
    for (const chamber of CHAMBERS) {
      const a = before.group.getObjectByName(`cave-${chamber.id}`) as THREE.Mesh;
      const b = after.group.getObjectByName(`cave-${chamber.id}`) as THREE.Mesh;
      expect(a).toBeDefined(); expect(b).toBeDefined();
      expect(b.geometry.attributes.position.array).toEqual(a.geometry.attributes.position.array);
      expect(triangles(b.geometry)).toBe(triangles(a.geometry));
      expect(b.geometry.groups).toHaveLength(0);
      const old = a.geometry.attributes.color.array, now = b.geometry.attributes.color.array;
      for (let i = 0; i < now.length; i++) if (now[i] !== old[i]) changed++;
    }
    expect(CHAMBERS).toHaveLength(5); expect(changed).toBeGreaterThan(0);
  } finally {
    for (const cave of [before, after]) cave.group.traverse(o => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Points) {
        o.geometry.dispose();
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) m.dispose();
      }
    });
  }
});
