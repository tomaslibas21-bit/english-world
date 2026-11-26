import * as THREE from "three";
import { afterEach, expect, it, vi } from "vitest";
import { TABLE_X as BILLIARDS_X, TABLE_Z as BILLIARDS_Z } from "../../src/game/billiards/table";
import { buildCave } from "../../src/game/cave/Cave";
import * as cavePlan from "../../src/game/cave/plan";
import { R as CENOTE_RADIUS } from "../../src/game/cave/groundsPlan";
import { CALLER_CARD, LOTERIA_APPROACH, TABLES, TABLE_Z } from "../../src/game/loteria/location";
import { loteriaTables } from "../../src/game/loteria/scene";
import { FLOORS, POOLS, floorY } from "../../src/game/water";
import { getInterior } from "../../src/game/world/interiors";
import { WORLD } from "../../src/game/world/layout";
import { cenote, cenoteWalk, type Part, type SignAtlas } from "../../src/game/world/mexican";
import { THEME } from "../../src/game/world/theme";
import { Colliders } from "../../src/game/world/util";

class Canvas {
  width = 0;
  height = 0;
  fills: { x: number; y: number; w: number; h: number; color: string }[] = [];
  rims: number[] = [];
  paints: string[] = [];
  context: CanvasRenderingContext2D;
  constructor() {
    const noop = () => {};
    const gradient = () => ({ addColorStop: noop });
    const context = {
      font: "", fillStyle: "", lineWidth: 1,
      measureText(text: string) { return { width: text.length * 10 }; },
      createLinearGradient: gradient, createRadialGradient: gradient,
      fillRect: (x: number, y: number, w: number, h: number): void => {
        this.fills.push({ x, y, w, h, color: String(this.context.fillStyle) });
      },
      strokeRect: (): void => { this.rims.push(this.context.lineWidth); },
      fill: (): void => { this.paints.push(String(this.context.fillStyle)); },
    };
    this.context = new Proxy(context, { get: (target, key) => Reflect.get(target, key) ?? noop }) as unknown as CanvasRenderingContext2D;
  }
  getContext() { return this.context; }
}

function canvasDocument() {
  vi.stubGlobal("HTMLCanvasElement", Canvas);
  vi.stubGlobal("document", { createElement: () => new Canvas() });
}

afterEach(() => { vi.unstubAllGlobals(); });
const triangles = (geometry: THREE.BufferGeometry) => (geometry.index?.count ?? geometry.attributes.position.count) / 3;
const luminance = (c: THREE.Color) => c.r * 0.2126 + c.g * 0.7152 + c.b * 0.0722;
const vertexColor = (hit: THREE.Intersection) => {
  const colors = (hit.object as THREE.Mesh).geometry.attributes.color;
  return new THREE.Color().fromBufferAttribute(colors, hit.face!.a);
};

it("fits the hut's thatch courses inside the old hip and leaves Inés's approach dry and clear", () => {
  const parts: Part[] = [], atlas = { add: vi.fn() } as unknown as SignAtlas;
  const spot = THEME.cenote!, hx = spot.x + CENOTE_RADIUS + 4.8, hz = spot.z + 4.6;
  const floors = FLOORS.slice(), pools = POOLS.slice();
  const material = new THREE.MeshBasicMaterial();
  try {
    cenote(parts, atlas, spot);
    const roof = parts.filter(([, color]) => ["#765c3b", "#a5814d", "#987344"].includes(String(color)));
    const trim = parts.filter(([, color]) => color === "#e5d3ab");
    const original = new THREE.ConeGeometry(2.7, 1.6, 4).rotateY(Math.PI / 4).scale(1.15, 1, 1).translate(hx, 3.35, hz);
    original.computeBoundingBox();
    const bounds = new THREE.Box3(), point = new THREE.Vector3();
    for (const [geometry] of roof) {
      const position = geometry.attributes.position;
      for (let i = 0; i < position.count; i++) bounds.expandByPoint(point.fromBufferAttribute(position, i));
    }
    expect(bounds.min.distanceTo(original.boundingBox!.min)).toBeLessThan(0.0001);
    expect(bounds.max.distanceTo(original.boundingBox!.max)).toBeLessThan(0.0001);
    expect(roof.reduce((sum, [g]) => sum + triangles(g), 0) - triangles(original)
      + trim.reduce((sum, [g]) => sum + triangles(g), 0)).toBeLessThanOrEqual(80);
    original.dispose();
    const meshes = roof.map(([g, color]) => Object.assign(new THREE.Mesh(g, material), { name: String(color) }));
    for (const [y, color] of [[2.60, "#765c3b"], [2.86, "#a5814d"], [3.14, "#765c3b"], [3.40, "#987344"], [3.68, "#765c3b"], [3.95, "#a5814d"]] as const) {
      const [hit] = new THREE.Raycaster(new THREE.Vector3(hx + 4, y, hz), new THREE.Vector3(-1, 0, 0)).intersectObjects(meshes);
      expect(hit.object.name).toBe(color);
      expect(hit.face!.normal.y).toBeGreaterThan(0.5);
    }
    const panels = trim.map(([g]) => new THREE.Mesh(g, material));
    for (const y of [0.14, 0.86]) {
      const [hit] = new THREE.Raycaster(new THREE.Vector3(hx + 3, y, hz), new THREE.Vector3(-1, 0, 0)).intersectObjects(panels);
      expect(hit.point.x).toBeCloseTo(hx + 1.702);
    }
    const colliders = new Colliders();
    cenoteWalk(colliders, spot.x, spot.z, WORLD.minX);
    expect(colliders.blocked(spot.guide!.ax, spot.guide!.az, 0.38)).toBe(false);
    expect(floorY(spot.guide!.ax, spot.guide!.az)).toBe(0);
    expect(atlas.add).toHaveBeenCalledWith(expect.stringContaining("cenote:"), expect.anything(), expect.anything(), expect.anything(),
      expect.anything(), expect.anything(), expect.anything(), expect.anything(), expect.anything(), expect.anything());
  } finally {
    for (const [geometry] of parts) geometry.dispose();
    material.dispose();
    FLOORS.splice(0, FLOORS.length, ...floors); POOLS.splice(0, POOLS.length, ...pools);
  }
});

it("keeps La Buchaca's fired-clay joints narrow and low contrast on the existing room floor", () => {
  canvasDocument();
  const room = getInterior("pool-hall")!;
  const floor = room.group.children[0] as THREE.Mesh<THREE.PlaneGeometry, THREE.MeshLambertMaterial>;
  const map = floor.material.map!, canvas = map.image as Canvas;
  expect([canvas.width, canvas.height]).toEqual([512, 512]);
  expect(map.repeat.toArray()).toEqual([11 / 4, 10 / 4]);
  expect(triangles(floor.geometry)).toBe(2);
  expect(floor.position.y).toBe(0);
  const grout = canvas.fills.find(({ w, h, color }) => w === 512 && h === 512 && color === "#9b765c")!;
  expect(grout).toBeDefined();
  const tiles = canvas.fills.filter(({ w, h }) => w > 50 && w < 64 && w === h);
  expect(tiles).toHaveLength(64);
  const jointLight = luminance(new THREE.Color(grout.color));
  for (const tile of tiles) {
    expect(64 - tile.w).toBeLessThanOrEqual(2);
    const clayLight = luminance(new THREE.Color(tile.color));
    expect((Math.max(clayLight, jointLight) + 0.05) / (Math.min(clayLight, jointLight) + 0.05)).toBeLessThan(1.6);
  }
  expect(canvas.rims.every((width) => width <= 1)).toBe(true);
  expect(canvas.paints.every((color) => Number(/,([\d.]+)\)$/.exec(color)![1]) <= 0.05)).toBe(true);
  expect(room.colliders.boxes).toContainEqual(expect.objectContaining({
    minX: -BILLIARDS_X, maxX: BILLIARDS_X, minZ: -BILLIARDS_Z, maxZ: BILLIARDS_Z,
  }));
});

it("weaves the three lotería cloths into the existing set while all paper boards and beans remain exposed", () => {
  const col = new Colliders(), group = loteriaTables(col);
  group.updateMatrixWorld(true);
  const mesh = group.children[0] as THREE.Mesh;
  expect(group.children).toHaveLength(4);
  expect(mesh.geometry.groups).toHaveLength(0);
  expect(triangles(mesh.geometry)).toBeLessThanOrEqual(2422 + 80);
  const paperAt = (x: number, z: number) => new THREE.Raycaster(new THREE.Vector3(x, 1.2, z), new THREE.Vector3(0, -1, 0)).intersectObject(mesh)[0];
  for (const x of [21.55, 22.75, 25.1, 26.2, 27.15]) {
    const paper = paperAt(x, TABLE_Z + 0.26);
    expect(vertexColor(paper).getHex()).toBe(0xfff0c8);
    expect(paper.point.y).toBeCloseTo(0.9975);
    const beans = paperAt(x - 0.08, TABLE_Z + 0.12);
    expect([0x603329, 0x754331]).toContain(vertexColor(beans).getHex());
    expect(beans.point.y).toBeGreaterThan(1);
  }
  for (const x of TABLES) {
    expect(vertexColor(paperAt(x + 0.3, TABLE_Z - 0.455)).getHex()).toBe(0xe6cfa2);
    const [apron] = new THREE.Raycaster(new THREE.Vector3(x, 0.843, TABLE_Z + 0.8), new THREE.Vector3(0, 0, -1)).intersectObject(mesh);
    expect(vertexColor(apron).getHex()).toBe(0xe6cfa2);
    expect(apron.point.z).toBeCloseTo(TABLE_Z + 0.53);
    expect(col.blocked(x, TABLE_Z, 0.38)).toBe(true);
  }
  expect(col.boxes).toHaveLength(8);
  expect(col.circles).toHaveLength(4);
  expect(col.blocked(LOTERIA_APPROACH.x, LOTERIA_APPROACH.z, 0.38)).toBe(false);
  const holder = group.getObjectByName("loteria-card-holder")!;
  expect(holder.position.toArray()).toEqual([CALLER_CARD.x, CALLER_CARD.y, CALLER_CARD.z]);
});

it("lights the worn sacbé beneath Kin's approach through the existing water-hall mesh", async () => {
  canvasDocument();
  const cave = buildCave();
  await Promise.resolve(); // finish the existing tree-flower paint microtask
  try {
    const stone = cave.group.getObjectByName("cave-agua") as THREE.Mesh;
    expect(cave.group.children.filter(({ name }) => cavePlan.CHAMBERS.some((c) => name === `cave-${c.id}`))).toHaveLength(5);
    expect(cave.group.getObjectsByProperty("isLight", true)).toHaveLength(0);
    const { position } = stone.geometry.attributes;
    const p = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    let slabTriangles = 0;
    for (let i = 0; i < position.count; i += 3) {
      a.fromBufferAttribute(position, i); b.fromBufferAttribute(position, i + 1); c.fromBufferAttribute(position, i + 2);
      if (![a, b, c].every((v) => Math.abs(v.y - 0.012) < 0.00001 && v.z >= -14 && v.z <= 3.2)) continue;
      slabTriangles++;
      expect(b.clone().sub(a).cross(c.clone().sub(a)).y).toBeGreaterThan(0);
      for (const v of [a, b, c]) {
        expect(cavePlan.walkable(v.x, v.z, 0.1)).toBe(true);
        expect(cavePlan.floorY(v.x, v.z)).toBe(0);
      }
    }
    expect(slabTriangles).toBeGreaterThanOrEqual(32);
    expect(slabTriangles).toBeLessThanOrEqual(64);
    for (const [x, z] of [[0, 0], [0, -4.3], [-0.15, -10], [-0.3, -13.2], [1.2, -0.7]]) {
      const hits = new THREE.Raycaster(p.set(x, 0.3, z), new THREE.Vector3(0, -1, 0)).intersectObject(stone);
      const wear = hits.find((hit) => Math.abs(hit.point.y - 0.012) < 0.00001)!;
      const ground = hits.find((hit) => Math.abs(hit.point.y) < 0.00001)!;
      expect(wear).toBeDefined(); expect(ground).toBeDefined();
      expect(luminance(vertexColor(wear))).toBeGreaterThan(luminance(vertexColor(ground)) * 1.1);
    }
    expect(cave.colliders.blocked(1.2, -0.7, 0.38)).toBe(false);
  } finally {
    cave.group.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Points) {
        o.geometry.dispose();
        for (const material of Array.isArray(o.material) ? o.material : [o.material]) material.dispose();
      }
    });
  }
});
