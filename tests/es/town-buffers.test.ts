import * as THREE from "three";
import { expect, it, vi } from "vitest";
import { TownMerger } from "../../src/game/world/townMerger";
import { colourMerge, mat } from "../../src/game/world/util";

function triangle(x: number, z: number, indexed = true) {
  const g = new THREE.BufferGeometry();
  // Keep a deliberately unusual attribute order.
  g.setAttribute("normal", new THREE.Float32BufferAttribute([1, 0, 0, 0, 1, 0, 0, 0, 1], 3));
  g.setAttribute("position", new THREE.Float32BufferAttribute([
    x, 0.125, z, x, 3.14159, z + 0.75, x + 0.25, 2.71828, z - 0.75,
  ], 3));
  if (indexed) g.setIndex([2, 1, 0]);
  return g;
}

function reference(geo: THREE.BufferGeometry, flat = false) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  if (flat) g.deleteAttribute("normal");
  if (!g.getAttribute("normal")) g.computeVertexNormals();
  return g;
}

function checkBuffers(actual: THREE.BufferGeometry, expected: THREE.BufferGeometry) {
  expect(actual.index).toBeNull();
  expect(actual.groups).toEqual(expected.groups);
  expect(Object.keys(actual.attributes)).toEqual(Object.keys(expected.attributes));
  for (const [name, a] of Object.entries(expected.attributes)) {
    const attr = actual.getAttribute(name);
    expect(attr).toBeInstanceOf(THREE.BufferAttribute);
    expect(attr).toHaveProperty("gpuType", THREE.FloatType);
    expect([attr.array.constructor, attr.itemSize, attr.normalized, attr.count])
      .toEqual([a.array.constructor, a.itemSize, a.normalized, a.count]);
    const bytes = (array: ArrayBufferView) => Buffer.from(array.buffer, array.byteOffset, array.byteLength);
    expect(bytes(attr.array)).toEqual(bytes(a.array));
  }
}

function meshAt(parent: THREE.Group, name: string) {
  const mesh = parent.getObjectByName(name) as THREE.Mesh;
  expect(mesh?.isMesh, name).toBe(true);
  return mesh;
}

it("packs referenced indexed positions and unindexed triangles in the original cell and attribute order", () => {
  const town = new TownMerger(50), parent = new THREE.Group();
  const smooth = triangle(-50, 0);
  // This vertex is not referenced. It must not move the bounds to a different cell.
  smooth.setAttribute("position", new THREE.Float32BufferAttribute([...smooth.getAttribute("position").array, 500, 0, 500], 3));
  smooth.setAttribute("normal", new THREE.Float32BufferAttribute([...smooth.getAttribute("normal").array, 1, 0, 0], 3));
  const flat = triangle(-49.875, 0, false);
  const missing = triangle(-50, 0);
  missing.deleteAttribute("normal").setIndex([2, 1, 0, 0, 0, 0]);
  const pale = new THREE.MeshLambertMaterial({ color: "#88aacc" });
  const brick = new THREE.MeshLambertMaterial({ color: "#a84630", flatShading: true });
  const expected = colourMerge([
    [reference(smooth), pale.color], [reference(flat, true), brick.color], [reference(missing), pale.color],
  ]);
  town.add("smooth", pale, smooth);
  town.add("flat", brick, flat);
  town.add("smooth", pale, missing, false);
  town.add("left", pale, triangle(-50.25, -0.01));
  town.add("boundary", pale, triangle(49.875, 50), false);
  town.build(parent);
  expect(parent.children.map(mesh => mesh.name)).toEqual(["town-cast--1,0", "town-cast--2,-1", "town-still-1,1"]);
  const first = meshAt(parent, "town-cast--1,0");
  expect(first.castShadow && first.receiveShadow).toBe(true);
  checkBuffers(first.geometry, expected);
});

it("keeps the thin kinds and first-key shadows, and leaves specialized materials in Merger", () => {
  const town = new TownMerger(50), parent = new THREE.Group();
  const plain = mat("#2b3b4b");
  const glass = mat("#445566", { transparent: 0.5 });
  const glow = mat("#445566", { emissive: "#ffffdd" });
  const texture = new THREE.MeshLambertMaterial({ map: new THREE.Texture() });
  const custom = new THREE.MeshLambertMaterial();
  custom.onBeforeCompile = () => {};
  town.add("glow", glow, triangle(0, 0), false, false);
  town.add("custom", custom, triangle(0, 0), false);
  town.add("texture", texture, triangle(0, 0));
  town.add("glass", glass, triangle(0, 0), false);
  town.add("glass", plain, triangle(0, 0), true);
  town.add("hotel-canopy-roof", plain, triangle(0, 0), false);
  town.addParts([[triangle(0, 0), "#123456"]], "thin");
  town.addParts([[triangle(0, 0), "#654321"]], "thinCast");
  town.build(parent);
  expect(parent.children.map(mesh => mesh.name)).toEqual([
    "glow", "custom", "texture", "glass", "town-still-0,0", "town-thin-0,0", "town-thinCast-0,0",
  ]);
  expect(meshAt(parent, "glow").receiveShadow).toBe(false);
  for (const [name, material] of [["custom", custom], ["texture", texture], ["glass", glass]] as const) {
    expect(meshAt(parent, name).material).toBe(material);
  }
  for (const [name, cast] of [["town-thin-0,0", false], ["town-thinCast-0,0", true]] as const) {
    const mesh = meshAt(parent, name);
    expect([mesh.userData.thin, mesh.castShadow, mesh.receiveShadow]).toEqual([true, cast, true]);
  }
  expect(meshAt(parent, "town-still-0,0").castShadow).toBe(false);
});

it("snapshots indexed inputs and colours, and keeps the mutable unindexed path and disposal", () => {
  const town = new TownMerger(50), parent = new THREE.Group();
  const indexed = triangle(1, 1);
  const borrowed = triangle(1, 1, false);
  const snapshot = reference(indexed);
  const red = new THREE.MeshLambertMaterial({ color: "#ad2410" });
  const oldRed = red.color.clone(), blue = new THREE.Color("#304f9a");
  const releasedIndexed = vi.fn(), releasedBorrowed = vi.fn();
  indexed.addEventListener("dispose", releasedIndexed);
  borrowed.addEventListener("dispose", releasedBorrowed);
  borrowed.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 0, 1, 1, 0], 2));
  town.add("red", red, indexed);
  town.add("red", red, borrowed);
  town.addParts([[borrowed, blue]], "cast");
  red.color.set("white");
  blue.set("green");
  indexed.translate(120, 0, 0);
  indexed.getAttribute("normal").setXYZ(0, -1, -1, -1);
  indexed.setIndex([0, 0, 0]);
  const moved = reference(indexed);
  town.add("red", red, indexed);
  borrowed.translate(110, 0, 0);
  const lastColour = new THREE.Color("#304f9a");
  const expected = colourMerge([[snapshot, oldRed], [borrowed.clone(), lastColour], [borrowed.clone(), lastColour]]);
  town.build(parent);
  expect(parent.children.map(mesh => mesh.name)).toEqual(["town-cast-0,0", "town-cast-2,0"]);
  checkBuffers(meshAt(parent, "town-cast-0,0").geometry, expected);
  checkBuffers(meshAt(parent, "town-cast-2,0").geometry, colourMerge([[moved, oldRed]]));
  expect(releasedIndexed).not.toHaveBeenCalled();
  expect(releasedBorrowed).toHaveBeenCalledTimes(2);
  expect(Object.keys(borrowed.attributes)).toEqual(["position", "normal", "color"]);
});

it("uses the Three merge for interleaved and morph layouts in a mixed cell", () => {
  const town = new TownMerger(50), parent = new THREE.Group();
  const standard = triangle(0, 0);
  const unusual = triangle(0, 0);
  const px = unusual.getAttribute("position").array;
  const stride = new THREE.InterleavedBuffer(new Float32Array([px[0], px[1], px[2], 7, px[3], px[4], px[5], 7, px[6], px[7], px[8], 7]), 4);
  unusual.setAttribute("position", new THREE.InterleavedBufferAttribute(stride, 3, 0));
  unusual.morphAttributes.position = [new THREE.Float32BufferAttribute([1, 2, 3, 4, 5, 6, 7, 8, 9], 3)];
  const tint = new THREE.Color("#36789a");
  const expected = colourMerge([[reference(unusual, true), tint], [reference(standard, true), tint]]);
  town.addParts([[unusual, tint], [standard, tint]], "cast");
  town.build(parent);
  const actual = meshAt(parent, "town-cast-0,0").geometry;
  checkBuffers(actual, expected);
  expect(actual.morphAttributes.position![0].array).toEqual(expected.morphAttributes.position![0].array);
});
