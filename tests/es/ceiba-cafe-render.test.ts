import * as THREE from "three";
import { expect, it, vi } from "vitest";
import { CounterProps } from "../../src/game/barista/props";
import { getInterior } from "../../src/game/world/interiors";

function renderSize(root: THREE.Object3D) {
  let meshes = 0, triangles = 0;
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const geometry = object.geometry;
    const instances = object instanceof THREE.InstancedMesh ? object.count : 1;
    meshes++;
    triangles += (geometry.index?.count ?? geometry.attributes.position.count) / 3 * instances;
  });
  return { meshes, triangles };
}

it("keeps Café La Ceiba daylight and the counter within the blocks render budget", () => {
  const noop = () => {};
  const context = new Proxy({
    measureText: (s: string) => ({ width: s.length * 10 }),
    createLinearGradient: () => ({ addColorStop: noop }),
    createRadialGradient: () => ({ addColorStop: noop }),
  }, { get: (target, key) => Reflect.get(target, key) ?? noop });
  class Canvas {
    width = 0;
    height = 0;
    getContext() { return context; }
  }
  vi.stubGlobal("HTMLCanvasElement", Canvas);
  vi.stubGlobal("document", { createElement: (tag: string) => tag === "canvas" ? new Canvas() : undefined });

  try {
    const cafe = getInterior("sunny-cup")!;
    const { group } = cafe;
    expect(cafe.background).toBe("#bad4d2");
    expect(group.getObjectByName("room-panels")).toBeInstanceOf(THREE.Mesh);
    const room = renderSize(group);
    expect(room.meshes).toBeLessThanOrEqual(16);
    expect(room.triangles).toBeLessThanOrEqual(10786);

    const outside = group.getObjectByName("outside") as THREE.Mesh<THREE.BufferGeometry, THREE.MeshLambertMaterial>;
    expect(outside).toBeInstanceOf(THREE.Mesh);
    const street = renderSize(outside);
    expect(street.meshes).toBe(1);
    expect(street.triangles).toBeLessThanOrEqual(96);
    expect(outside.castShadow).toBe(false);
    expect(outside.geometry.groups).toHaveLength(0);
    expect(outside.material).toBeInstanceOf(THREE.MeshLambertMaterial);
    expect(outside.material).toMatchObject({ side: THREE.FrontSide, transparent: false, vertexColors: true, map: null });
    const positions = outside.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      if (positions.getY(i) <= 0.1) continue;
      expect(Math.abs(positions.getX(i))).toBeLessThanOrEqual(20);
      expect(positions.getZ(i)).toBeGreaterThanOrEqual(24.62);
      expect(positions.getZ(i)).toBeLessThanOrEqual(24.66);
    }

    const cast = group.getObjectByName("room-cast") as THREE.Mesh;
    expect(cast).toBeInstanceOf(THREE.Mesh);
    const castSize = renderSize(cast);
    expect(castSize.triangles).toBeLessThanOrEqual(976);
    expect(cafe.colliders.boxes).toContainEqual({
      minX: -2 - 7 / 2, maxX: -2 + 7 / 2, minZ: -3.2 - 1.1 / 2, maxZ: -3.2 + 1.1 / 2, tag: "counter",
    });
    group.updateMatrixWorld(true);
    const hitFace = (mesh: THREE.Mesh, origin: [number, number, number], direction: [number, number, number], color: string) => {
      const [hit] = new THREE.Raycaster(new THREE.Vector3(...origin), new THREE.Vector3(...direction)).intersectObject(mesh, false);
      expect(hit, `surface at ${origin} facing the ray`).toBeDefined();
      const actual = new THREE.Color().fromBufferAttribute(mesh.geometry.attributes.color, hit.face!.a);
      expect("#" + actual.getHexString()).toBe(color);
      return hit;
    };
    for (const [x, color] of [[-12, "#dcab93"], [-4, "#e3c995"], [8, "#a4c2b7"]] as const) {
      const front = hitFace(outside, [x, 2.2, 6], [0, 0, 1], color);
      expect(front.point.z).toBeCloseTo(24.65);
      expect(front.face!.normal.z).toBeCloseTo(-1);
    }
    for (const [z, color] of [[-3.76, "#486c87"], [-3.69, "#f0ddba"], [-3, "#d8b693"]] as const) {
      expect(hitFace(cast, [-2, 2, z], [0, -1, 0], color).point.y).toBeCloseTo(1.08, 5);
    }
    expect(hitFace(cast, [-2, 1.04, -4.5], [0, 0, 1], "#e9d3b0").point.z).toBeCloseTo(-3.81, 5);
    expect(hitFace(cast, [-2, 1.04, -2], [0, 0, -1], "#e9d3b0").point.z).toBeCloseTo(-2.59, 5);
    expect(hitFace(cast, [-2, 0.5, -4.5], [0, 0, 1], "#945e45").point.z).toBeCloseTo(-3.75, 5);
    expect(hitFace(cast, [-2, 0.5, -2], [0, 0, -1], "#945e45").point.z).toBeCloseTo(-2.65, 5);

    const service = renderSize(new CounterProps().root);
    expect(service).toEqual({ meshes: 32, triangles: 2822 });
  } finally {
    vi.unstubAllGlobals();
  }
});
