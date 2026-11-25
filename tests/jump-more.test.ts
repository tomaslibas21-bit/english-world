import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import { climbAudit } from "../src/dev/climbAudit";
import { EDITION } from "../src/edition";
import { groundsBounds } from "../src/game/cave/grounds";
import { GATES } from "../src/game/cave/plan";
import { buildCaveZone } from "../src/game/cave/zone";
import { CLIMB, LAND, Ledges } from "../src/game/ledges";
import { Hop } from "../src/game/movement";
import { OcclusionField } from "../src/game/occlusion";
import { Rides, type RideHost } from "../src/game/rides/Rides";
import { floorY } from "../src/game/water";
import { getInterior, INTERIOR_IDS } from "../src/game/world/interiors";
import { WORLD } from "../src/game/world/layout";
import { ruinsBounds } from "../src/game/world/mexican";
import { HOTEL_POOL } from "../src/game/world/pool";
import { THEME } from "../src/game/world/theme";
import { buildTown, buildTownLedges } from "../src/game/world/town";
import { boxGeo, Colliders, cylGeo } from "../src/game/world/util";

function scene() {
  const group = new THREE.Group(), col = new Colliders();
  const material = new THREE.MeshBasicMaterial();
  const add = (geo: THREE.BufferGeometry) => group.add(new THREE.Mesh(geo, material));
  return { group, col, add };
}

function run(col: Colliders, led: Ledges, start: [number, number], jumpAt: number, dt: number, dx = 0, dz = -1, ground = (_x: number, _z: number) => 0) {
  const p = new THREE.Vector3(start[0], 0, start[1]), hop = new Hop();
  hop.land(ground(p.x, p.z));
  let landing = 0;
  for (let frame = 0; frame < Math.ceil(1.5 / dt); frame++) {
    if (frame === jumpAt) hop.start();
    p.x += dx * 7.4 * dt;
    p.z += dz * 7.4 * dt;
    col.resolve(p, 0.38, true);
    led.resolve(p, 0.38, hop.y, hop.air);
    const surface = led.supportPiece(p.x, p.z, hop.y, hop.air);
    hop.update(dt, surface?.top ?? ground(p.x, p.z));
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

it("keeps the town and rooms inside their bounds with a way back down", () => {
  const draw = () => {};
  const gradient = () => ({ addColorStop: draw });
  const canvas = new Proxy({
    measureText: (text: string) => ({ width: text.length * 9 }), createLinearGradient: gradient, createRadialGradient: gradient,
  }, { get: (target, key) => Reflect.get(target, key) ?? draw });
  class Canvas {
    width = 0;
    height = 0;
    getContext() { return canvas; }
  }
  vi.stubGlobal("HTMLCanvasElement", Canvas);
  vi.stubGlobal("document", { createElement: () => new Canvas() });
  try {
    const town = buildTown({ movableParking: true }), { group, colliders: col } = town;
    const field = OcclusionField.fromObject(group, {
      minX: WORLD.minX - 24 - (THEME.cenote?.open ? 25 : 0), maxX: WORLD.maxX + 24, minZ: WORLD.minZ - 24, maxZ: WORLD.maxZ + 24,
    }, { skip: (o) => o.userData.v !== undefined || o.userData.gull || o.userData.boat || o.userData.thin || o === town.parkedCars.group });
    field.fillFootprints(col.boxes, col.circles);
    const led = buildTownLedges(town, field);
    if (EDITION.id === "en") {
      // Both patio tables at Sunny Cup and both at the Trattoria are under umbrellas.
      for (const x of [-61.4, -54.6, -44, -38]) {
        const table = col.circles.find((c) => c.x === x && c.z === -2.7 && c.r === 0.9);
        expect(table).toBeDefined();
        expect(table?.split).toBeFalsy();
        expect(led.support(x, -2.7, Hop.TOP, true)).toBe(0);
      }
      expect(led.support(44, -22, Hop.TOP, true)).toBe(0);
      expect(led.support(-49.5, 42.5, Hop.TOP, true)).toBeCloseTo(1.35); // mailbox
    }
    const rackApproach: [number, number] = [-16.8, 47.95];
    expect(run(col, led, rackApproach, -1, 1 / 60, 1, 0).x).toBeLessThan(-14.3);
    expect(Array.from({ length: 30 }, (_, frame) => run(col, led, rackApproach, frame, 1 / 60, 1, 0))
      .some(({ x, landing }) => x > -12.4 && landing === 0)).toBe(true);

    const boats = town.group.children.filter((o) => o.userData.boat);
    const rides = new Rides({ colliders: col, ledges: led, ambient: {}, quality: "low" } as RideHost,
      { cars: [], boats: [], lots: [], rocks: [], bumps: [], deep: "" }, boats);
    const beached = rides.list.filter((ride) => ride.beach);
    if (EDITION.id === "es") {
      const vault = (x: number, z: number) => led.things.find((t) => Math.abs(t.x - x) < 0.01 && Math.abs(t.z - z) < 0.01 && t.vault)?.vault;
      expect(vault(8.2, -13.5)).toBeCloseTo(0.83); // one of the zócalo bolardos
      expect(vault(-25.9, -0.35)).toBeGreaterThan(1); // a planted maceta
      expect(vault(24.5, -42)).toBeCloseTo(0.625); // stacked huacales in front of the fruit stall
      const stall = col.boxes.find((b) => b.tag === "counter" && b.minX < 26 && b.maxX > 26 && b.minZ < -43 && b.maxZ > -43);
      expect(stall).toBeDefined();
      expect(stall?.split).toBeFalsy();
      expect(led.support(26, -43, Hop.TOP, true)).toBe(0);
      expect(field.overSolid(30, -30)).toBe(true);
      expect(led.support(30, -30, Hop.TOP, true)).toBe(0);
      expect(col.circles.find((c) => c.x === -56.8 && c.z === 45)?.tag).toBe("edge"); // porch column
      expect(col.circles.some((c) => c.tag === "edge" && c.split)).toBe(false);

      const h = THEME.hammock!, hx = (h.x1 + h.x2) / 2;
      const approach: [number, number] = [hx, h.z + 2.4];
      expect(run(col, led, approach, -1, 1 / 60, 0, -1, floorY).z).toBeGreaterThan(h.z);
      for (const fps of [30, 60]) {
        expect(Array.from({ length: fps / 2 }, (_, frame) => run(col, led, approach, frame, 1 / fps, 0, -1, floorY))
          .some(({ z, landing }) => z < h.z - 1.25 && landing === 0)).toBe(true);
      }
      for (const offset of [-4.3, -1.55, 1.25, 4.05]) {
        expect(led.support(HOTEL_POOL.x + offset, HOTEL_POOL.z - 6.41, Hop.PEAK, true)).toBeCloseTo(0.515);
      }
      expect(beached).toHaveLength(3);
      for (const boat of beached) {
        expect(boat.beach?.circles.every((c) => c.split)).toBe(true);
        expect(led.support(boat.home.x, boat.home.z, Hop.PEAK, true)).toBeGreaterThan(0.2);
      }
      const office = getInterior("office")!;
      expect(office.ledges?.support(-2.6, 5.7, Hop.PEAK, true)).toBeCloseTo(0.58); // cane settee
      expect(office.ledges?.support(-8.9, 1.95, Hop.TOP, true)).toBe(0); // Elena's desk
      const glass = office.colliders.boxes.find((b) => Math.abs(b.minX + 3.3) < 0.001 && b.minZ === -7.8);
      expect(glass?.tag).toBe("edge");
      expect(glass?.split).toBeFalsy();
    }
    const cafe = getInterior("sunny-cup")!;
    expect(cafe.ledges?.support(5.8, 2.6, Hop.PEAK, true)).toBeCloseTo(0.79);
    const { cenote, ruins } = THEME;
    const open = cenote?.open ? [groundsBounds(cenote.x, cenote.z, WORLD.minX)]
      : cenote?.walk ? [{ minX: cenote.x - 8, maxX: WORLD.minX, minZ: cenote.z - 10.5, maxZ: cenote.z + 9.5 }] : [];
    if (ruins?.walk) open.push(ruinsBounds(ruins.x, ruins.z, WORLD.minX));
    const starts: [number, number][] = [[28, -14.6]];
    if (cenote?.walk) starts.push([cenote.x + 12, cenote.z]);
    if (ruins?.walk) starts.push([ruins.x, ruins.z]);
    for (const start of starts) {
      const audit = climbAudit(col, led, WORLD, start, 0.25, open);
      expect(audit.outside, JSON.stringify(audit.outsideAt)).toBe(0);
      expect(audit.maxHeight).toBeGreaterThan(2.3);
      expect(audit.maxHeight).toBeLessThanOrEqual(CLIMB);
      expect(audit.reached).toBeGreaterThan(30_000);
      expect(audit.fresh.filter((f) => f.out === "stuck")).toEqual([]);
    }

    if (cenote?.grotto) {
      const { interior, view } = buildCaveZone("grotto");
      for (const gate of GATES) view.setGate(gate.id, true, true);
      const wild = interior.wild!;
      const audit = climbAudit(interior.colliders, new Ledges(), wild.bounds, [interior.spawn.x, interior.spawn.z],
        0.25, [], (x, z) => wild.walkable(x, z, 0.3) ? wild.floor(x, z) : undefined);
      expect(audit.outside).toBe(0);
      expect(audit.reached).toBeGreaterThan(500);
      expect(audit.fresh.every((f) => f.out !== "stuck")).toBe(true);
    }
    for (const id of INTERIOR_IDS) {
      const room = getInterior(id)!;
      const bounds = { minX: -room.w / 2, maxX: room.w / 2, minZ: -room.d / 2, maxZ: room.d / 2 + 1.1 };
      const audit = climbAudit(room.colliders, room.ledges!, bounds, [room.spawn.x, room.spawn.z], 0.25, [], () => 0);
      expect(audit.outside, id).toBe(0);
      expect(audit.reached, id).toBeGreaterThan(room.w * room.d / 4);
      expect(audit.maxHeight, id).toBeLessThanOrEqual(Hop.PEAK);
      expect(audit.fresh.every((f) => f.out !== "stuck"), id).toBe(true);
      expect(room.colliders.boxes.some((b) => b.split && (b.tag === "edge" || b.tag === "counter")), id).toBe(false);
    }
    if (beached.length) {
      const boat = beached[0];
      const { circles, launch, pieces } = boat.beach!;
      const removed = [...pieces];
      rides.resetPosition(boat, launch);
      expect(col.circles.some((c) => circles.includes(c))).toBe(false);
      expect(led.pieces.some((p) => removed.includes(p))).toBe(false);
      expect(led.support(boat.home.x, boat.home.z, Hop.PEAK, true)).toBe(0);
    }
  } finally {
    vi.unstubAllGlobals();
  }
}, 30_000);
