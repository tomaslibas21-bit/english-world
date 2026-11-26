import { Group, Mesh, MeshLambertMaterial, Raycaster, Vector3 } from "three";
import { describe, expect, it, vi } from "vitest";
import { collisionRanges } from "../src/game/collisionGeometry";
import { Ledges } from "../src/game/ledges";
import { OcclusionField } from "../src/game/occlusion";
import { boxGeo, Colliders, Merger } from "../src/game/world/util";

function fixture(mode: "legacy" | "direct" | "unbaked", decorated: boolean) {
  const root = new Group(), merger = new Merger({ directBake: mode === "direct" });
  const material = new MeshLambertMaterial({ color: "#55747c" });
  merger.add("scenery", material, boxGeo(2, 0.9, 2, 2, 0.45, 2));
  if (decorated) merger.addVisual("scenery", material, boxGeo(2.2, 3, 2.2, 2, 1.5, 2));
  merger.add("scenery", material, boxGeo(0.5, 0.6, 0.5, 4, 0.3, 2));
  merger.build(root, mode === "unbaked" ? undefined : { name: "fixture" });
  const colliders = new Colliders();
  colliders.addBox(2, 2, 2, 2);
  colliders.addBox(4, 2, 0.5, 0.5);
  return { root, colliders };
}

describe("render finishes preserve collision sampling", () => {
  it.each(["legacy", "direct", "unbaked"] as const)("retains visible detail and the original field/ledges through the %s merge", (mode) => {
    const original = fixture(mode, false), decorated = fixture(mode, true);
    expect(decorated.root.children).toHaveLength(original.root.children.length);
    const mesh = decorated.root.children[0] as Mesh;
    expect(mesh.geometry.getAttribute("position").count).toBe(108);
    expect(collisionRanges(mesh.geometry)).toEqual([[0, 36], [72, 108]]);
    // Rendering/raycasting still sees the high finish, even though the underlying collider stays low.
    decorated.root.updateMatrixWorld(true);
    const ray = new Raycaster(new Vector3(2, 4, 2), new Vector3(0, -1, 0));
    expect(ray.intersectObject(decorated.root, true)[0].point.y).toBeCloseTo(3);
    for (const transformed of [false, true]) {
      original.root.position.y = decorated.root.position.y = transformed ? 0.1 : 0;
      const bounds = { minX: 0, maxX: 6, minZ: 0, maxZ: 6 };
      const field = (root: Group) => OcclusionField.fromObject(root, bounds, { minCells: 1 });
      const baseline = field(original.root), polished = field(decorated.root);
      expect(polished.lo).toEqual(baseline.lo);
      expect(polished.hi).toEqual(baseline.hi);
      expect(polished.base).toEqual(baseline.base);
      // Each sampler gets fresh boxes, since Ledges annotates its collider objects with split flags.
      const a = fixture(mode, false), b = fixture(mode, true);
      a.root.position.y = b.root.position.y = original.root.position.y;
      const before = Ledges.build(a.root, a.colliders), after = Ledges.build(b.root, b.colliders);
      expect(before.pieces.length).toBeGreaterThan(0);
      expect(after.pieces).toStrictEqual(before.pieces);
      expect(after.things).toStrictEqual(before.things);
      expect(b.colliders.boxes).toStrictEqual(a.colliders.boxes);
    }
  });

  it("resumes sliced ledge sampling across omitted finish triangles", () => {
    const original = fixture("direct", false), decorated = fixture("direct", true);
    const baseline = Ledges.build(original.root, original.colliders);
    const work: (() => void)[] = [];
    let now = 0;
    const clock = vi.spyOn(performance, "now").mockImplementation(() => now += 10);
    try {
      const ledges = Ledges.build(decorated.root, decorated.colliders, {}, (next) => work.push(next));
      expect(ledges.ready).toBe(false);
      for (let i = 0; i < work.length; i++) work[i]();
      expect(work.length).toBeGreaterThan(1);
      expect(ledges.ready).toBe(true);
      expect(ledges.pieces).toStrictEqual(baseline.pieces);
      expect(ledges.things).toStrictEqual(baseline.things);
      expect(decorated.colliders.boxes).toStrictEqual(original.colliders.boxes);
    } finally { clock.mockRestore(); }
  });
});
