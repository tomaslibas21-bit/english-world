import * as THREE from "three";
import { afterEach, expect, it, vi } from "vitest";
import { CenoteAnimals } from "../../src/game/cenoteTour/animals";
import { SNORKEL_FOV } from "../../src/game/cenoteTour/mode";
import { aimSwim, swimAt } from "../../src/game/cenoteTour/route";
import { Ledges } from "../../src/game/ledges";
import { Hop } from "../../src/game/movement";
import { Undersea } from "../../src/game/rides/undersea";
import { floorY } from "../../src/game/water";
import { CENOTE_ROUTE } from "../../src/game/world/cenoteTour";
import { getInterior } from "../../src/game/world/interiors";
import { FOUNTAIN } from "../../src/game/world/layout";
import { RIDES } from "../../src/game/world/rides";
import { Colliders } from "../../src/game/world/util";
import { townCanvasDocument } from "../../tools/town-canvas-stub";
import { buildTownFixture } from "./town-fixture";

afterEach(() => { vi.unstubAllGlobals(); });
const triangles = (g: THREE.BufferGeometry) => (g.index?.count ?? g.attributes.position.count) / 3;
const colorAt = (hit: THREE.Intersection) => new THREE.Color()
  .fromBufferAttribute((hit.object as THREE.Mesh).geometry.attributes.color, hit.face!.a).getHex();

/** Read the actual merged triangles, including the town merger's indexed buffers. */
function colored(root: THREE.Object3D, colors: number[]) {
  const meshes = new Set<THREE.Mesh>(), bounds = new THREE.Box3(), vertices: THREE.Vector3[] = [];
  const color = new THREE.Color();
  let count = 0;
  root.traverse(child => {
    if (!(child instanceof THREE.Mesh)) return;
    const g = child.geometry, p = g.attributes.position, c = g.attributes.color;
    if (!c) return;
    for (let i = 0, n = (g.index?.count ?? p.count); i < n; i += 3) {
      const a = g.index ? g.index.getX(i) : i;
      if (!colors.includes(color.fromBufferAttribute(c, a).getHex())) continue;
      count++;
      meshes.add(child);
      for (let j = 0; j < 3; j++) {
        const v = new THREE.Vector3().fromBufferAttribute(p, g.index ? g.index.getX(i + j) : i + j);
        vertices.push(v);
        bounds.expandByPoint(v);
      }
    }
  });
  return { meshes: [...meshes], triangles: count, bounds, vertices };
}

it("grounds both snorkel stops with low limestone and seagrass in the existing seabed draw", () => {
  const sea = new Undersea(RIDES.deep, RIDES.rocks);
  sea.build();
  try {
    const art = colored(sea.group, [0xb9bea0, 0xc7c8ab, 0x899b89, 0x638e79]);
    expect(art.triangles).toBeLessThanOrEqual(100);
    expect(art.triangles).toBeGreaterThan(60);
    expect(art.meshes.map(m => m.name)).toEqual(["seabed-things"]);
    expect(sea.group.children).toHaveLength(6);
    expect(art.bounds.min.x).toBeLessThan(-63);
    expect(art.bounds.max.x).toBeGreaterThan(-51);
    for (const p of art.vertices) {
      expect(p.y - floorY(p.x, p.z)).toBeGreaterThanOrEqual(0.019);
      expect(p.y - floorY(p.x, p.z)).toBeLessThan(0.56);
    }
    const [fx, fz] = CENOTE_ROUTE!.fish.center, [tx, tz] = CENOTE_ROUTE!.turtles.center;
    for (const [x, z] of [[fx + 3, fz - 4], [fx + 6, fz - 0.8], [tx + 4, tz - 3], [tx + 6.5, tz + 0.5]]) {
      const [hit] = new THREE.Raycaster(new THREE.Vector3(x, floorY(x, z) + 0.8, z), new THREE.Vector3(0, -1, 0))
        .intersectObject(art.meshes[0]);
      expect([0xb9bea0, 0xc7c8ab]).toContain(colorAt(hit));
      expect(Math.abs(hit.point.y - floorY(x, z) - 0.18)).toBeLessThan(0.01);
      expect(hit.face!.normal.y).toBeGreaterThan(0.99);
    }
    // The wide lens and caption can hide nearby floor detail. At each real stop, retain a shelf
    // in the exposed lower-middle strip as the school/pair completes its authored motion.
    const eye = new THREE.Vector3(), aim = new THREE.Vector3(), target = new THREE.Vector3();
    for (const [w, h, fov] of [[390, 844, SNORKEL_FOV.portrait], [1280, 800, SNORKEL_FOV.wide]]) {
      const camera = new THREE.PerspectiveCamera(fov, w / h, 0.1, 260);
      camera.setViewOffset(w, h, 0, h * 0.15, w, h);
      for (const elapsed of [34, 58]) for (const time of [0, 4, 8, 12]) {
        swimAt(CENOTE_ROUTE!, elapsed, time, eye);
        aimSwim(CENOTE_ROUTE!, elapsed, time, time, eye, aim, target);
        camera.position.copy(eye); camera.lookAt(aim); camera.updateMatrixWorld();
        const visible = art.vertices.filter(p => {
          const q = p.clone().project(camera), x = (1 + q.x) / 2, y = (1 - q.y) / 2;
          return q.z > -1 && q.z < 1 && x > 0.04 && x < 0.96 && y > 0.40 && y < 0.64;
        });
        expect(visible.length, `${w}×${h}, stop ${elapsed}, phase ${time}`).toBeGreaterThan(8);
      }
    }
  } finally { sea.dispose(); }
});

it("keeps turtle scutes on the shell and retains four wildlife draws and the flipper silhouettes", () => {
  const animals = new CenoteAnimals(CENOTE_ROUTE!);
  try {
    expect(animals.design.draws).toBe(4);
    expect(animals.design.triangles - 2112).toBeLessThanOrEqual(160);
    expect(animals.design.triangles).toBeLessThanOrEqual(2500);
    const shell = animals.group.getObjectByName("cenote-turtles") as THREE.InstancedMesh;
    expect(shell.count).toBe(2);
    const scutes = colored(shell, [0x688357, 0x839969, 0x789261]);
    expect(scutes.triangles).toBe(42);
    expect(colored(shell, [0xb8b380]).triangles).toBe(24);
    expect(shell.geometry.boundingBox!.max.y).toBeLessThanOrEqual(0.224);
    for (const p of scutes.vertices) {
      expect((p.x / 0.35) ** 2 + (p.z / 0.5) ** 2).toBeLessThan(1);
      expect(p.y).toBeCloseTo(0.222 * Math.sqrt(1 - (p.x / 0.35) ** 2 - (p.z / 0.5) ** 2) + 0.0015, 6);
    }
    const material = new THREE.MeshBasicMaterial();
    try {
      const mesh = new THREE.Mesh(shell.geometry, material);
      const [hit] = new THREE.Raycaster(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0)).intersectObject(mesh);
      expect(colorAt(hit)).toBe(0x839969);
      expect(hit.face!.normal.y).toBeGreaterThan(0.8);
    } finally { material.dispose(); }
    expect((animals.group.getObjectByName("cenote-turtle-flippers") as THREE.InstancedMesh).count).toBe(4);
  } finally { animals.dispose(); }
});

it("courses the kiosco plinth inside its old collider and existing regional shadow bucket", () => {
  const { town, restore } = buildTownFixture();
  try {
    const [plinth] = colored(town.group, [0x50776b]).meshes;
    const art = colored(plinth, [0xb6a58b, 0x50776b]);
    expect(art.triangles).toBeLessThanOrEqual(96);
    expect(art.triangles).toBeGreaterThan(60);
    expect(art.meshes).toHaveLength(1);
    expect(art.meshes[0].name).toBe("town-cast-0,-1");
    expect(art.meshes[0].castShadow).toBe(true);
    for (const p of art.vertices) {
      expect(Math.hypot(p.x - FOUNTAIN.x, p.z - FOUNTAIN.z)).toBeLessThan(4.5);
      expect(p.y).toBeGreaterThan(0.18);
      expect(p.y).toBeLessThan(1);
    }
    expect(town.colliders.circles).toContainEqual({ x: FOUNTAIN.x, z: FOUNTAIN.z, r: 4.5 });
    expect(town.colliders.boxes).toContainEqual({ minX: FOUNTAIN.x - 1.35, maxX: FOUNTAIN.x + 1.35,
      minZ: FOUNTAIN.z + 4.15, maxZ: FOUNTAIN.z + 5.65, tag: undefined });
    for (const [y, color] of [[0.36, 0xb6a58b], [0.835, 0x50776b]]) {
      const [hit] = new THREE.Raycaster(new THREE.Vector3(FOUNTAIN.x - 6, y, FOUNTAIN.z), new THREE.Vector3(1, 0, 0))
        .intersectObject(art.meshes[0]);
      expect(colorAt(hit)).toBe(color);
    }
  } finally { restore(); }
});

it("wraps the restaurant wall in clay and tile below the speakers without adding a room draw", () => {
  const doc = townCanvasDocument();
  class Canvas { width = 0; height = 0; getContext = doc.createElement().getContext; }
  vi.stubGlobal("HTMLCanvasElement", Canvas);
  vi.stubGlobal("document", { createElement: () => new Canvas() });
  const room = getInterior("trattoria")!;
  const art = colored(room.group, [0xb77955, 0x8b634d, 0xeadbb8, 0x416b7a]);
  expect(art.triangles).toBeLessThanOrEqual(128);
  expect(art.triangles).toBeGreaterThan(90);
  expect(art.meshes.map(m => m.name)).toEqual(["room-still"]);
  expect(art.meshes[0].castShadow).toBe(false);
  expect(art.bounds.min.y).toBeCloseTo(0.3);
  expect(art.bounds.max.y).toBeCloseTo(1.24);
  expect(room.npcs).toContainEqual({ npc: "marco_host", x: -5.5, z: 3.2, rot: Math.PI / 2 });
  expect(room.colliders.boxes).toContainEqual({ minX: -5.95, maxX: -5.05, minZ: 4.2 - 0.3, maxZ: 4.5, tag: undefined });
  expect(room.spawn).toEqual({ x: 0, z: 5.4, rot: Math.PI });
  // Compare the derived jump/collision grid against the same room without the new wall finish.
  const baseline = room.group.clone(true), colliders = new Colliders();
  colliders.boxes = room.colliders.boxes.map(({ split: _split, vault: _vault, ...box }) => box);
  colliders.circles = room.colliders.circles.map(({ split: _split, vault: _vault, ...circle }) => circle);
  colliders.roofs = room.colliders.roofs.map(roof => ({ ...roof }));
  const wall = baseline.getObjectByName("room-still") as THREE.Mesh;
  const oldGeometry = wall.geometry, positions: number[] = [], finish = [0xb77955, 0x8b634d, 0xeadbb8, 0x416b7a];
  const point = new THREE.Vector3(), color = new THREE.Color();
  for (let i = 0; i < oldGeometry.attributes.position.count; i += 3) {
    if (finish.includes(color.fromBufferAttribute(oldGeometry.attributes.color, i).getHex())) continue;
    for (let j = 0; j < 3; j++) positions.push(...point.fromBufferAttribute(oldGeometry.attributes.position, i + j).toArray());
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  wall.geometry = geometry;
  try {
    const beside: [number, number][] = room.npcs.flatMap(({ x, z, ax, az }) => ax !== undefined && az !== undefined ? [[x, z], [ax, az]] : [[x, z]]);
    const ledges = Ledges.build(baseline, colliders, { beside, maxTop: Hop.PEAK });
    expect(room.colliders.boxes).toEqual(colliders.boxes);
    expect(room.colliders.circles).toEqual(colliders.circles);
    expect(room.ledges!.pieces).toEqual(ledges.pieces);
  } finally { geometry.dispose(); }
  room.group.updateMatrixWorld(true);
  for (const [from, direction] of [
    [[0, 0, 0], [0, 0, -1]], [[-7, 0, 3.2], [-1, 0, 0]], [[7, 0, 0], [1, 0, 0]],
  ]) {
    for (const [y, color] of [[0.8, 0xb77955], [1.22, 0xeadbb8], [1.4, 0xf2cf7c]]) {
      const origin = new THREE.Vector3().fromArray(from).setY(y);
      const [hit] = new THREE.Raycaster(origin, new THREE.Vector3().fromArray(direction)).intersectObject(art.meshes[0]);
      expect(colorAt(hit)).toBe(color);
    }
  }
  expect(triangles(art.meshes[0].geometry)).toBeGreaterThan(art.triangles);
});
