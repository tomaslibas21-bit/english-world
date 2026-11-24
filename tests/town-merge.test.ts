import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import { bakedMaterial, Merger } from "../src/game/world/util";

const bake = { name: "town-solid", cell: 100, keep: /^(pier|gas-canopy)/ };

function indexedTriangle(x: number, z: number, withNormals = true) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute([
    x - 0.125, 0.36, z + 0.125, x + 0.125, 0.13, z, x, 0.91, z - 0.125,
    800, 100, 800, // Unreferenced vertex must stay out of the bounds and output.
  ], 3));
  if (withNormals) geo.setAttribute("normal", new THREE.Float32BufferAttribute([-0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 0], 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1], 2));
  geo.setIndex([2, 1, 0, 2, 2, 2]); // Include a zero-area face.
  return geo;
}

function attributes(mesh: THREE.Mesh) {
  return Object.entries(mesh.geometry.attributes).map(([name, attr]) => [
    name, attr.itemSize, attr.count, attr.normalized, attr.array.constructor.name,
    new Uint8Array(attr.array.buffer, attr.array.byteOffset, attr.array.byteLength),
  ]);
}

function meshState(mesh: THREE.Mesh) {
  return {
    name: mesh.name, cast: mesh.castShadow, receive: mesh.receiveShadow, autoMatrix: mesh.matrixAutoUpdate,
    matrix: mesh.matrix.elements, index: mesh.geometry.index, drawRange: mesh.geometry.drawRange,
    bounds: [mesh.geometry.boundingBox, mesh.geometry.boundingSphere], attributes: attributes(mesh),
  };
}

describe("outdoor Lambert bake", () => {
  it("matches the existing buffers, groups and shadows across cell boundaries", () => {
    function build(directBake: boolean) {
      const merger = new Merger({ directBake });
      const root = new THREE.Group();
      const trim = new THREE.MeshLambertMaterial({ color: "#c7b260" });
      const lamp = new THREE.MeshLambertMaterial({ color: "#e9d1ce", emissive: "#fe9347", emissiveIntensity: 0.5 });
      const stone = new THREE.MeshLambertMaterial({ color: "#505566" });
      const changing = new THREE.MeshLambertMaterial({ color: "#ccb79f" });
      const shared = indexedTriangle(-100, -100);
      const borrowed = indexedTriangle(-100, -100, false).toNonIndexed();
      const disposed = vi.fn();
      borrowed.addEventListener("dispose", disposed);

      merger.add("trim", trim, shared, false, true);
      merger.add("stone", stone, borrowed, false, true);
      merger.add("trim", lamp, indexedTriangle(-100.125, -100), true, false);
      shared.translate(0.125, 1, 0);
      merger.add("trim", trim, shared, true, false);
      shared.translate(900, 0, 900);
      shared.index!.setX(0, 3);
      merger.add("stone-edge", stone, indexedTriangle(-100, -100.125, false), false, true);
      merger.add("step", stone, indexedTriangle(-100, -100), true, false);
      merger.add("pier", trim, indexedTriangle(0, 0));
      merger.add("pier", lamp, indexedTriangle(0, 0), false, false);
      merger.add("changed", changing, indexedTriangle(0, 0));
      lamp.flatShading = true;
      lamp.emissiveIntensity = 0.37;
      trim.color.set("#b4cb73");
      changing.map = new THREE.Texture();

      merger.build(root, bake);
      expect(disposed).toHaveBeenCalledTimes(1);
      expect(shared.getAttribute("uv")).toBeDefined();
      return root.children as THREE.Mesh[];
    }

    const meshes = build(true);
    expect(meshes.map((mesh) => [mesh.name, mesh.castShadow, mesh.receiveShadow])).toEqual([
      ["pier", true, true], ["pier~2", true, true], ["changed", true, true],
      ["town-solid-0", false, true], ["town-solid-1", false, true], ["town-solid-2", false, true], ["town-solid-3", true, false],
    ]);
    expect(meshes.map(meshState)).toEqual(build(false).map(meshState));
    expect(meshes[0].geometry.getAttribute("uv").count).toBe(6);
    expect(meshes[3].geometry.getAttribute("position").count).toBe(18);
    expect(meshes[4].material).toBe(bakedMaterial());
    expect(Array.from(meshes[4].geometry.getAttribute("emi").array.slice(0, 3))).toEqual(
      new THREE.Color("#fe9347").multiplyScalar(0.37).toArray().map(Math.fround),
    );
  });

  it("retains the legacy merge for a chunk containing unusual attributes", () => {
    function build(directBake: boolean) {
      const merger = new Merger({ directBake });
      const root = new THREE.Group();
      const material = new THREE.MeshLambertMaterial();
      const unusual = indexedTriangle(1, 1).toNonIndexed();
      unusual.setAttribute("normal", new THREE.Float32BufferAttribute([0, 1, 0], 3));
      merger.add("wall", material, indexedTriangle(1, 1));
      merger.add("floor", material, unusual);
      merger.build(root, bake);
      return root.children as THREE.Mesh[];
    }
    const meshes = build(true);
    expect(meshes.map(meshState)).toEqual(build(false).map(meshState));
    expect(meshes[0].geometry.getAttribute("normal").count).toBe(7);
  });
});
