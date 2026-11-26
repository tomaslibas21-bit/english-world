import * as THREE from "three";
import { afterEach, expect, it, vi } from "vitest";
import { getInterior } from "../../src/game/world/interiors";
import { MALECON, malecon, surfShack, terrace, type Part, type SignAtlas } from "../../src/game/world/mexican";
import { THEME } from "../../src/game/world/theme";
import { Colliders, colourMerge } from "../../src/game/world/util";
import { townCanvasDocument } from "../../tools/town-canvas-stub";

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

it("fits La Ceiba's static espresso fittings into its original prop draw and room budget", () => {
  const doc = townCanvasDocument();
  class Canvas { width = 0; height = 0; getContext = doc.createElement().getContext; }
  vi.stubGlobal("HTMLCanvasElement", Canvas);
  vi.stubGlobal("document", { createElement: () => new Canvas() });
  const cafe = getInterior("sunny-cup")!, props = cafe.group.getObjectByName("sunny-cup-counter-props")!;
  const art = selected(props, [0x2f7772, 0x335352, 0xc2c9bf, 0x3e4e48, 0xead9b3, 0x8d6b4e]);
  expect(art.triangles).toBe(148);
  expect(art.triangles).toBeLessThanOrEqual(160);
  expect(art.meshes).toHaveLength(1);
  expect(art.meshes[0].parent).toBe(props);
  expect(art.meshes[0].castShadow).toBe(true);
  for (const p of art.vertices) {
    expect(p.x).toBeGreaterThanOrEqual(-4.76001); expect(p.x).toBeLessThanOrEqual(-3.63999);
    expect(p.y).toBeGreaterThanOrEqual(1.09999); expect(p.y).toBeLessThanOrEqual(1.91001);
    expect(p.z).toBeGreaterThanOrEqual(-3.71001); expect(p.z).toBeLessThanOrEqual(-3.08999);
  }
  // Only the buried upper dough rings were removed; the sugar crust and visible dough collar remain.
  expect(selected(props, [0xd9a35e]).triangles).toBe(600);
  let draws = 0, count = 0;
  cafe.group.traverse(o => {
    if (o instanceof THREE.Mesh) { draws++; count += triangles(o.geometry) * (o instanceof THREE.InstancedMesh ? o.count : 1); }
  });
  expect(draws).toBeLessThanOrEqual(16);
  expect(count).toBeLessThanOrEqual(10786);
  expect(cafe.colliders.boxes).toContainEqual({
    minX: -2 - 7 / 2, maxX: -2 + 7 / 2,
    minZ: -3.2 - 1.1 / 2, maxZ: -3.2 + 1.1 / 2, tag: "counter",
  });
  cafe.group.updateMatrixWorld(true);
  const front = (x: number, y: number) => new THREE.Raycaster(new THREE.Vector3(x, y, -2.8), new THREE.Vector3(0, 0, -1))
    .intersectObject(art.meshes[0])[0];
  expect(colorAt(front(-4.235, 1.675))).toBe(0xead9b3);
  expect(colorAt(front(-4.48, 1.395))).toBe(0x3e4e48);
  const [crust] = new THREE.Raycaster(new THREE.Vector3(-2.04 + 0.045, 2, -3.21 + 0.045), new THREE.Vector3(0, -1, 0))
    .intersectObject(art.meshes[0]);
  expect(colorAt(crust)).toBe(0xf6e7c1);
});

it("gives La Ola's kayak foot pads and fittings inside the original hull and three blocking circles", () => {
  const parts: Part[] = [], roofs: Part[] = [], col = new Colliders(), atlas = { add: vi.fn() } as unknown as SignAtlas;
  const shack = THEME.surfShack!, [x, z, angle] = shack.kayak;
  surfShack(parts, roofs, col, atlas, shack);
  const g = colourMerge(parts), material = new THREE.MeshBasicMaterial(), mesh = new THREE.Mesh(g, material);
  try {
    const art = selected(mesh, [0x405c57, 0x789187, 0x506660, 0xa4b7a8, 0x354b49]);
    expect(art.meshes).toEqual([mesh]);
    expect(art.triangles).toBe(88);
    expect(art.triangles).toBeLessThanOrEqual(96);
    const up = new THREE.Vector3(0, 1, 0);
    for (const p of art.vertices) {
      const local = p.clone().sub(new THREE.Vector3(x, 0, z)).applyAxisAngle(up, -angle);
      expect(Math.abs(local.x)).toBeLessThan(0.36);
      expect(local.y).toBeGreaterThan(0.4); expect(local.y).toBeLessThan(0.61);
      expect(Math.abs(local.z)).toBeLessThan(1.75);
    }
    const circles = col.circles.filter(c => c.r === 0.5);
    expect(circles).toHaveLength(3);
    for (const distance of [-1.1, 0, 1.1]) expect(circles).toContainEqual({
      x: x + Math.sin(angle) * distance, z: z + Math.cos(angle) * distance, r: 0.5,
    });
    const overhead = (lx: number, lz: number) => {
      const p = new THREE.Vector3(lx, 1, lz).applyAxisAngle(up, angle).add(new THREE.Vector3(x, 0, z));
      return new THREE.Raycaster(p, new THREE.Vector3(0, -1, 0)).intersectObject(mesh)[0];
    };
    expect(colorAt(overhead(0, 1.1))).toBe(0xa4b7a8);
    expect(colorAt(overhead(0.11, 0.25))).toBe(0x405c57);
    expect(g.groups).toHaveLength(0);
  } finally { g.dispose(); material.dispose(); for (const [roof] of roofs) roof.dispose(); }
});

it("paints El Muelle's two decks at the original height beneath the original joints and furniture", () => {
  const parts: Part[] = [], col = new Colliders();
  terrace(parts, col, THEME.terrace);
  const g = colourMerge(parts), material = new THREE.MeshBasicMaterial(), mesh = new THREE.Mesh(g, material);
  try {
    const art = selected(mesh, [0xb78a60, 0xc0986c, 0xad8158]);
    expect(art.meshes).toEqual([mesh]);
    expect(art.triangles - THEME.terrace.length * 2).toBeLessThanOrEqual(64);
    expect(col.boxes).toHaveLength(2);
    THEME.terrace.forEach(([x0, x1, z0, z1], index) => {
      const b = col.boxes[index];
      expect(b.minX).toBeCloseTo(x0); expect(b.maxX).toBeCloseTo(x1);
      expect(b.minZ).toBeCloseTo(z0); expect(b.maxZ).toBeCloseTo(z1);
      const boards = Math.round((x1 - x0) / 0.5), step = (x1 - x0) / boards;
      for (let i = 0; i < 3; i++) {
        const [hit] = new THREE.Raycaster(new THREE.Vector3(x0 + (i + 0.5) * step, 0.6, z1 - 0.35), new THREE.Vector3(0, -1, 0))
          .intersectObject(mesh);
        expect(colorAt(hit)).toBe([0xb78a60, 0xc0986c, 0xad8158][i]);
        expect(hit.point.y).toBeCloseTo(0.4, 6);
        expect(hit.face!.normal.y).toBeGreaterThan(0.99);
      }
    });
    for (const p of art.vertices) {
      expect(p.y).toBeCloseTo(0.4, 6);
      expect(THEME.terrace.some(([x0, x1, z0, z1]) => p.x >= x0 - 1e-5 && p.x <= x1 + 1e-5 && p.z >= z0 - 1e-5 && p.z <= z1 + 1e-5)).toBe(true);
    }
    expect(g.groups).toHaveLength(0);
  } finally { g.dispose(); material.dispose(); }
});

it("tiles only the malecón's sea face while retaining its plaque, steps and car barriers", () => {
  const parts: Part[] = [], col = new Colliders(), add = vi.fn(), atlas = { add } as unknown as SignAtlas;
  const benches = malecon(parts, col, atlas, "Malecón de Puerto Colibrí");
  const g = colourMerge(parts), material = new THREE.MeshBasicMaterial(), mesh = new THREE.Mesh(g, material);
  try {
    const art = selected(mesh, [0x497a8c, 0xb5b8a5, 0x3c887c]);
    expect(art.meshes).toEqual([mesh]);
    expect(art.triangles).toBeLessThanOrEqual(80);
    expect(art.triangles).toBeGreaterThan(40);
    expect(col.boxes.filter(b => b.carRim)).toHaveLength(11);
    for (const p of art.vertices) {
      expect(p.y).toBeGreaterThan(0); expect(p.y).toBeLessThanOrEqual(0.7);
      expect(p.z).toBeLessThan(MALECON.z - 0.18);
      expect(col.boxes.some(b => p.x >= b.minX - 1e-5 && p.x <= b.maxX + 1e-5 && p.z >= b.minZ && p.z <= b.maxZ)).toBe(true);
    }
    const openingCenters = [-96, -72, -48, -30, -12, 12, 36, 60, 84, 108];
    for (const x of openingCenters) expect(col.blocked(x, MALECON.z, 0.3)).toBe(false);
    expect(benches).toEqual([-88, -60, -40, -21, 0, 22, 46, 70, 94, 116].map(x => [x, MALECON.z + 1.25, Math.PI]));
    expect(add).toHaveBeenCalledTimes(1);
    expect(add).toHaveBeenCalledWith("malecon", 384, 128, expect.any(Function), 1.2, 0.4, -34.1, 0.55, MALECON.z + 0.19, 0);
    for (const [x, y, color] of [[-100.6, 0.615, 0x497a8c], [-100.6, 0.685, 0xb5b8a5], [-102.3, 0.42, 0x3c887c]]) {
      const [hit] = new THREE.Raycaster(new THREE.Vector3(x, y, MALECON.z - 3), new THREE.Vector3(0, 0, 1)).intersectObject(mesh);
      expect(colorAt(hit)).toBe(color);
      expect(hit.face!.normal.z).toBeLessThan(-0.99);
    }
  } finally { g.dispose(); material.dispose(); }
});
