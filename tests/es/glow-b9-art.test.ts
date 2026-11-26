import * as THREE from "three";
import { afterEach, expect, it, vi } from "vitest";
import { buildCave } from "../../src/game/cave/Cave";
import { lilyBloom, lilyPadVeins } from "../../src/game/cave/lilies";
import * as cavePlan from "../../src/game/cave/plan";
import { CenoteAnimals } from "../../src/game/cenoteTour/animals";
import { BOARDS, surfboardParts } from "../../src/game/surf/shapes";
import { CENOTE_ROUTE } from "../../src/game/world/cenoteTour";
import { BUILDINGS } from "../../src/game/world/layout";
import { colourMerge } from "../../src/game/world/util";
import { townCanvasDocument } from "../../tools/town-canvas-stub";
import { buildTownFixture } from "./town-fixture";

afterEach(() => { vi.unstubAllGlobals(); });
const triangles = (g: THREE.BufferGeometry) => (g.index?.count ?? g.attributes.position.count) / 3;
const colorAt = (hit: THREE.Intersection) => new THREE.Color()
  .fromBufferAttribute((hit.object as THREE.Mesh).geometry.attributes.color, hit.face!.a).getHex();
function selected(root: THREE.Object3D, inks: number[]) {
  const meshes = new Set<THREE.Mesh>(), vertices: THREE.Vector3[] = [], color = new THREE.Color();
  let count = 0;
  root.traverse(child => {
    if (!(child instanceof THREE.Mesh)) return;
    const g = child.geometry, p = g.attributes.position, c = g.attributes.color;
    if (!c) return;
    for (let i = 0; i < (g.index?.count ?? p.count); i += 3) {
      const at = (j: number) => g.index ? g.index.getX(i + j) : i + j;
      if (!inks.includes(color.fromBufferAttribute(c, at(0)).getHex())) continue;
      count++; meshes.add(child);
      for (let j = 0; j < 3; j++) vertices.push(new THREE.Vector3().fromBufferAttribute(p, at(j)));
    }
  });
  return { meshes: [...meshes], triangles: count, vertices };
}

it("paints the school fish on their original body facets and retains all four wildlife draws", () => {
  const animals = new CenoteAnimals(CENOTE_ROUTE!);
  const original = new THREE.SphereGeometry(1, 8, 5).scale(0.105, 0.122, 0.355).translate(0, 0, 0.05);
  const legacy = original.toNonIndexed();
  try {
    const fish = animals.group.getObjectByName("cenote-fish") as THREE.InstancedMesh;
    expect(fish.count).toBe(12);
    expect(animals.design).toEqual({ draws: 4, triangles: 2244 });
    expect(animals.group.children).toHaveLength(4);
    expect(fish.geometry.groups).toHaveLength(0);
    const positions = fish.geometry.attributes.position.array;
    expect(Array.from(positions).slice(0, legacy.attributes.position.array.length)).toEqual(Array.from(legacy.attributes.position.array));
    for (const color of [0x42897d, 0xdec88b, 0x538c77, 0xcce0cf, 0x203735]) {
      const paint = selected(fish, [color]);
      expect(paint.triangles).toBeGreaterThan(0);
      expect(paint.meshes).toEqual([fish]);
    }
    expect((animals.group.getObjectByName("cenote-fish-tails") as THREE.InstancedMesh).count).toBe(12);
    expect((animals.group.getObjectByName("cenote-turtles") as THREE.InstancedMesh).count).toBe(2);
  } finally { original.dispose(); legacy.dispose(); animals.dispose(); }
});

it("keeps the sun and waves below the surfboard's old stringer height and inside all three board outlines", () => {
  for (const board of Object.values(BOARDS)) {
    const parts = surfboardParts(board.len, board.wid, board.deck, board.stripe, board.thick);
    const marks = parts.slice(3, 6), baseline = new THREE.Box3(), finished = new THREE.Box3();
    parts.forEach(([g], i) => {
      g.computeBoundingBox(); finished.union(g.boundingBox!);
      if (i < 3 || i >= 6) baseline.union(g.boundingBox!);
    });
    expect(marks.reduce((sum, [g]) => sum + triangles(g), 0)).toBeLessThanOrEqual(24);
    expect(marks).toHaveLength(3);
    expect(finished.min.distanceTo(baseline.min)).toBeLessThan(1e-6);
    expect(finished.max.distanceTo(baseline.max)).toBeLessThan(1e-6);
    const g = colourMerge(parts), material = new THREE.MeshBasicMaterial(), mesh = new THREE.Mesh(g, material);
    try {
      expect(g.groups).toHaveLength(0);
      const [sun] = new THREE.Raycaster(new THREE.Vector3(-board.wid * 0.21, 1, -board.len * 0.09), new THREE.Vector3(0, -1, 0))
        .intersectObject(mesh);
      expect(colorAt(sun)).toBe(new THREE.Color(board.stripe).getHex());
      expect(sun.point.y).toBeCloseTo(board.thick + 0.0015, 6);
      expect(sun.face!.normal.y).toBeGreaterThan(0.99);
    } finally { g.dispose(); material.dispose(); }
  }
});

it("veins the original lily pads and opens their flowers through the cave's five static chambers", async () => {
  const material = new THREE.MeshBasicMaterial();
  for (const radius of [0.32, 0.54]) {
    const leaf = new THREE.CircleGeometry(radius, 7, 0.5, Math.PI * 2 - 0.9).rotateX(-Math.PI / 2).translate(0, -0.03, 0);
    const veins = lilyPadVeins(radius).rotateX(-Math.PI / 2).translate(0, -0.03, 0), mesh = new THREE.Mesh(leaf, material);
    try {
      expect(triangles(veins)).toBe(6);
      const p = veins.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const point = new THREE.Vector3().fromBufferAttribute(p, i);
        expect(point.y).toBeCloseTo(-0.0285, 6);
        expect(veins.attributes.normal.getY(i)).toBeGreaterThan(0.99);
        expect(new THREE.Raycaster(point.clone().setY(0.2), new THREE.Vector3(0, -1, 0)).intersectObject(mesh).length).toBeGreaterThan(0);
      }
    } finally { leaf.dispose(); veins.dispose(); }
  }
  material.dispose();
  const bloom = lilyBloom(), original = new THREE.ConeGeometry(0.11, 0.16, 6).rotateX(Math.PI).translate(0, 0.06, 0);
  original.computeBoundingBox();
  try {
    expect(triangles(bloom.petals) + triangles(bloom.center) - triangles(original)).toBe(4);
    for (const g of [bloom.petals, bloom.center]) {
      g.computeBoundingBox();
      expect(original.boundingBox!.clone().expandByScalar(1e-6).containsBox(g.boundingBox!)).toBe(true);
    }
  } finally { original.dispose(); bloom.petals.dispose(); bloom.center.dispose(); }
  const eligible = cavePlan.POOLS.filter(q => !q.deck && q.rx >= 2.5);
  const limit = eligible.reduce((sum, q) => { const n = Math.round(3 + q.rx * 0.7); return sum + n * 6 + Math.ceil(n / 2) * 4; }, 0);
  expect(limit).toBeLessThanOrEqual(480);
  vi.stubGlobal("document", townCanvasDocument());
  const cave = buildCave();
  await Promise.resolve();
  try {
    const chambers = cave.group.children.filter(o => cavePlan.CHAMBERS.some(c => o.name === `cave-${c.id}`)) as THREE.Mesh[];
    expect(chambers).toHaveLength(5);
    expect(cave.group.getObjectsByProperty("isLight", true)).toHaveLength(0);
    let veins = 0;
    for (const mesh of chambers) {
      const p = mesh.geometry.attributes.position;
      for (let i = 0; i < p.count; i += 3) {
        if (![0, 1, 2].every(j => Math.abs(p.getY(i + j) + 0.0285) < 1e-6)) continue;
        veins++;
        for (let j = 0; j < 3; j++) expect(eligible.some(q => Math.hypot((p.getX(i + j) - q.x) / (q.rx + 0.55),
          (p.getZ(i + j) - q.z) / (q.rz + 0.55)) <= 1)).toBe(true);
      }
    }
    expect(veins).toBeGreaterThan(0);
    expect(veins % 6).toBe(0);
    expect(cave.colliders.blocked(1.2, -0.7, 0.38)).toBe(false);
  } finally {
    cave.group.traverse(o => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Points) {
        o.geometry.dispose();
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) m.dispose();
      }
    });
  }
});

it("finishes pharmacy shelves behind the original glass in the existing west-window batch", () => {
  const { town, restore } = buildTownFixture();
  try {
    const colors = [0xc7d4c5, 0x648577, 0x4b665b, 0xe6e2d2];
    const art = selected(town.group, colors), labels = selected(town.group, [0xe6e2d2]);
    expect(art.meshes.map(m => m.name)).toEqual(["shop-windows-west"]);
    expect(art.meshes[0].receiveShadow).toBe(true);
    const windows = labels.triangles / 24;
    expect(windows).toBeGreaterThan(0);
    expect(Number.isInteger(windows)).toBe(true);
    expect(art.triangles / windows).toBeLessThanOrEqual(80);
    const b = BUILDINGS.find(b => b.id === "pharmacy")!, front = b.z - b.d / 2;
    const boxes = town.colliders.boxes.filter(q => Math.abs(q.maxZ - front) < 1e-6 && Math.abs(q.maxZ - q.minZ - 0.5) < 1e-6);
    for (const p of art.vertices) {
      expect(p.y).toBeGreaterThan(0.9); expect(p.y).toBeLessThan(1.9);
      expect(p.z).toBeGreaterThan(front - 0.47); // all new relief stays behind the old glass
      expect(boxes.some(q => p.x >= q.minX - 1e-5 && p.x <= q.maxX + 1e-5 && p.z >= q.minZ - 1e-5 && p.z <= q.maxZ + 1e-5)).toBe(true);
    }
    expect(town.doors.some(door => door.bid === "pharmacy")).toBe(true);
    expect(selected(art.meshes[0], [0x2e8b57]).triangles).toBeGreaterThan(0); // original green cross and cartons
  } finally { restore(); }
});
