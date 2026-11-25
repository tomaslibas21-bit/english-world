import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import { climbAudit } from "../src/dev/climbAudit";
import { CLIMB, LAND, Ledges } from "../src/game/ledges";
import { Hop } from "../src/game/movement";
import { OcclusionField } from "../src/game/occlusion";
import { getInterior, INTERIOR_IDS } from "../src/game/world/interiors";
import { WORLD } from "../src/game/world/layout";
import { buildTown, buildTownLedges } from "../src/game/world/town";
import { boxGeo, Colliders, cylGeo } from "../src/game/world/util";

function scene() {
  const group = new THREE.Group(), col = new Colliders();
  const material = new THREE.MeshBasicMaterial();
  const add = (geo: THREE.BufferGeometry) => group.add(new THREE.Mesh(geo, material));
  return { group, col, add };
}

function run(col: Colliders, led: Ledges, start: [number, number], jumpAt: number, dt: number, dx = 0, dz = -1) {
  const p = new THREE.Vector3(start[0], 0, start[1]), hop = new Hop();
  let landing = 0;
  for (let frame = 0; frame < Math.ceil(1.5 / dt); frame++) {
    if (frame === jumpAt) hop.start();
    p.x += dx * 7.4 * dt;
    p.z += dz * 7.4 * dt;
    col.resolve(p, 0.38, true);
    led.resolve(p, 0.38, hop.y, hop.air);
    hop.update(dt, led.support(p.x, p.z, hop.y, hop.air));
    if (!hop.air) landing = Math.max(landing, hop.y);
  }
  return { x: p.x, z: p.z, landing };
}

describe("jumping over and onto low props", () => {
  it("vaults a slatted fence, a sparse hedge and a bollard with one running jump", () => {
    const { group, col, add } = scene();
    for (let x = -2; x <= 2; x += 0.5) add(boxGeo(0.1, 0.85, 0.06, x, 0.425, 0));
    col.addBox(0, 0, 4.15, 0.16);
    const leaves = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.5, 0), new THREE.MeshBasicMaterial(), 1);
    leaves.setMatrixAt(0, new THREE.Matrix4().makeTranslation(5, 0.25, 0));
    group.add(leaves);
    col.addCircle(5, 0, 0.5).vault = 0.75;
    add(cylGeo(0.11, 0.12, 0.76, 9, 0.38, 0, 10));
    col.addCircle(9, 0, 0.14);
    const led = Ledges.build(group, col);

    for (const x of [0, 5, 9]) {
      expect(led.things.find((t) => t.x === x)?.vault).toBeGreaterThan(0);
      expect(led.support(x, 0, Hop.TOP, true)).toBe(0);
      expect(run(col, led, [x, 3.25], -1, 1 / 60).z).toBeGreaterThan(0.38);
      for (const fps of [30, 60]) {
        const jumps = Array.from({ length: Math.ceil(fps * 0.5) }, (_, frame) => run(col, led, [x, 3.25], frame, 1 / fps));
        expect(jumps.some(({ z, landing }) => z < -2 && landing === 0), `x=${x}, ${fps} fps`).toBe(true);
      }
    }
  });

  it("lands on an uncovered table, barrel, crate and bench while protecting the clerk, doors and bounds", () => {
    const { group, col, add } = scene();
    add(cylGeo(0.5, 0.5, 0.06, 0, 0.75, 0, 12));
    add(cylGeo(0.06, 0.08, 0.74, 0, 0.37, 0, 8));
    add(boxGeo(0.45, 0.5, 0.45, 0.8, 0.25, 0));
    col.addCircle(0, 0, 0.9);
    add(cylGeo(0.31, 0.32, 0.65, 4, 0.325, 0, 12));
    col.addCircle(4, 0, 0.34);
    add(boxGeo(0.8, 0.6, 0.7, 7, 0.3, 0));
    col.addBox(7, 0, 0.8, 0.7);
    add(boxGeo(1.8, 0.1, 0.52, 10, 0.5, 0));
    add(boxGeo(1.8, 0.5, 0.08, 10, 0.8, -0.22));
    col.addBox(10, 0, 2, 0.6);
    add(boxGeo(2, 0.9, 0.7, 10, 0.45, -1.7));
    const counter = col.addBox(10, -1.7, 2, 0.7);
    const npc = col.addCircle(10, -1.1, 0.25);
    npc.npc = "clerk";
    add(boxGeo(3, 0.8, 0.2, 14, 0.4, 0));
    const edge = col.addBox(14, 0, 3, 0.2, "edge");
    add(boxGeo(1.2, 0.8, 0.2, 18, 0.4, 0));
    const door = col.addBox(18, 0, 1.2, 0.2, "building");
    add(boxGeo(1.2, 0.6, 1.2, 22, 0.3, 0));
    const covered = col.addBox(22, 0, 1.2, 1.2);
    const led = Ledges.build(group, col, { beside: [[10, -1.1]], tall: (x) => x > 21 });

    for (const [x, height] of [[0, 0.78], [4, 0.65], [7, 0.6], [10, 0.55]]) {
      expect(led.support(x, 0.1, 1.02, true)).toBeCloseTo(height);
      expect(led.support(x, 0.1, 0, false)).toBe(0);
    }
    expect(led.things.find((t) => t.x === 10 && t.z < -1.5)?.cap).toBe(LAND);
    for (const b of [counter, npc, edge, door, covered]) expect(b.split).toBeFalsy();
    expect(led.support(10, -1.7, Hop.TOP, true)).toBe(0);
    for (const x of [14, 18, 22]) expect(run(col, led, [x, 3.25], 15, 1 / 60).z).toBeGreaterThan(0);
  });

  it("floods both sides of a vaultable fence without using the fence as a landing", () => {
    const { group, col, add } = scene();
    const bounds = { minX: -5, maxX: 5, minZ: -5, maxZ: 5 };
    for (const side of [-1, 1]) {
      col.addBox(side * 5.25, 0, 0.5, 11, "edge");
      col.addBox(0, side * 5.25, 11, 0.5, "edge");
    }
    add(boxGeo(10, 0.8, 0.18, 0, 0.4, 0));
    col.addBox(0, 0, 10, 0.18);
    add(boxGeo(0.8, 0.6, 0.7, 2, 0.3, 3));
    col.addBox(2, 3, 0.8, 0.7);
    const led = Ledges.build(group, col);
    const audit = climbAudit(col, led, bounds, [0, -3]);
    expect(audit.outside).toBe(0);
    expect(audit.maxHeight).toBe(0.6);
    expect(audit.maxHeight).toBeLessThanOrEqual(CLIMB);
    expect(audit.fresh).toEqual([expect.objectContaining({ out: "jump", area: expect.any(Number) })]);
    expect(audit.fresh[0].area).toBeGreaterThan(30);
  });
});

it("keeps the built Maple Harbor and its rooms inside their bounds with a way back down", () => {
  const draw = () => {};
  const gradient = () => ({ addColorStop: draw });
  const canvas = new Proxy({
    measureText: (text: string) => ({ width: text.length * 9 }), createLinearGradient: gradient, createRadialGradient: gradient,
  }, { get: (target, key) => Reflect.get(target, key) ?? draw });
  vi.stubGlobal("document", { createElement: () => ({ getContext: () => canvas }) });
  try {
    const town = buildTown(), { group, colliders: col } = town;
    const field = OcclusionField.fromObject(group, {
      minX: WORLD.minX - 24, maxX: WORLD.maxX + 24, minZ: WORLD.minZ - 24, maxZ: WORLD.maxZ + 24,
    }, { skip: (o) => o.userData.v !== undefined || o.userData.gull || o.userData.boat || o.userData.thin || o === town.parkedCars.group });
    field.fillFootprints(col.boxes, col.circles);
    const led = buildTownLedges(town, field);
    // Both patio tables at Sunny Cup and both at the Trattoria stay solid under their umbrellas.
    for (const x of [-61.4, -54.6, -44, -38]) {
      const table = col.circles.find((c) => c.x === x && c.z === -2.7 && c.r === 0.9);
      expect(table).toBeDefined();
      expect(table?.split).toBeFalsy();
      expect(led.support(x, -2.7, Hop.TOP, true)).toBe(0);
    }
    expect(led.support(44, -22, Hop.TOP, true)).toBe(0);
    expect(led.support(-49.5, 42.5, Hop.TOP, true)).toBeCloseTo(1.35); // a mailbox with a broad top on a post
    expect(col.circles.find(({ x, z }) => x === 44 && z === -22)?.split).toBeFalsy();
    expect(col.circles.filter((b) => b.vault && b.split).length).toBeGreaterThan(30);
    expect(col.boxes.filter((b) => b.vault && b.split)).toHaveLength(4);
    const rackApproach: [number, number] = [-16.8, 47.95];
    expect(run(col, led, rackApproach, -1, 1 / 60, 1, 0).x).toBeLessThan(-14.3);
    expect(Array.from({ length: 30 }, (_, frame) => run(col, led, rackApproach, frame, 1 / 60, 1, 0))
      .some(({ x, landing }) => x > -12.4 && landing === 0)).toBe(true);
    expect(led.pieces.length).toBeLessThanOrEqual(2129); // Maple Harbor's static ledges before this change
    const audit = climbAudit(col, led, WORLD, [28, -14.6]);
    expect(audit.outside).toBe(0);
    expect(audit.maxHeight).toBeGreaterThan(2.3);
    expect(audit.maxHeight).toBeLessThanOrEqual(CLIMB);
    expect(audit.fresh.every((f) => f.out !== "stuck")).toBe(true);

    const cafe = getInterior("sunny-cup")!;
    expect(cafe.ledges.support(5.8, 2.6, Hop.PEAK, true)).toBeCloseTo(0.79);
    expect(cafe.ledges.support(-2, -3.2, Hop.TOP, true)).toBe(0);
    for (const id of INTERIOR_IDS) {
      const room = getInterior(id)!;
      const bounds = { minX: -room.w / 2, maxX: room.w / 2, minZ: -room.d / 2, maxZ: room.d / 2 + 1.1 };
      const audit = climbAudit(room.colliders, room.ledges, bounds, [room.spawn.x, room.spawn.z]);
      expect(audit.outside, id).toBe(0);
      expect(audit.maxHeight, id).toBeLessThanOrEqual(Hop.PEAK);
      expect(audit.fresh.every((f) => f.out !== "stuck"), id).toBe(true);
      expect(room.colliders.boxes.some((b) => b.split && (b.tag === "edge" || b.tag === "counter")), id).toBe(false);
    }
  } finally {
    vi.unstubAllGlobals();
  }
}, 15_000);
