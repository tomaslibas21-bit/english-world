import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { BEACH_Z, ROADS, SEA_Z, WORLD } from "../src/game/world/layout";
import { BAY, floorY, sandY } from "../src/game/water";
import { Group, Vector3 } from "three";
import { buildTown, HILL_MARGIN, type Town } from "../src/game/world/town";
import { NavGrid } from "../src/game/nav";
import { COVE_APPROACH, COVE_DOORS, RING_TARGET, SLATE_COVE, RING_STAIRS, filterSlateCoveNav, inSlateCove } from "../src/game/world/slateCovePlan";
import { buildSlateCove } from "../src/game/world/slateCove";
import * as caveCode from "../src/game/cave/zone";
import { applyCaveEvent, buildCaveZone, caveRouting, caveRules, countCaveVisit, type CaveZone } from "../src/game/cave/zone";
import { CaveLoader, CaveTravel, coveDoorNear } from "../src/game/cave/travel";
import { EXITS, SPAWNS, floorY as caveFloorY } from "../src/game/cave/plan";
import { CHAMBERS, GATES } from "../src/game/world/slateCave";
import { emptyCave } from "../src/game/cave/progress";
import { Hop } from "../src/game/movement";
import { CameraRig } from "../src/game/camera";
import { readPlayStats } from "../src/state/playStats";
import { useStore } from "../src/state/store";

describe("Harbor Road and the west shore", () => {
  it("keeps the town and bay footprints and the two western road ends", () => {
    expect(WORLD).toEqual({ minX: -112, maxX: 182, minZ: -104, maxZ: 96 });
    expect([BEACH_Z, SEA_Z, HILL_MARGIN]).toEqual([-64, -72, 40]);
    expect(ROADS[0]).toMatchObject({ x1: -104, z1: -55, name: "Harbor Road" });
    expect(ROADS[1]).toMatchObject({ x1: -112, z1: -8 });
    expect(BAY).toEqual({ x0: -106, x1: 176, z0: -146 });
  });

  it("uses the dry terrain at the Harbor Road turn and the north lip", () => {
    for (const [x, z] of [[-101, -55], [-108, -59], [-112, -59], [-140, -68]]) {
      expect(sandY(x, z)).toBe(0);
      expect(floorY(x, z)).toBe(0);
    }
  });
});

const canvasMock = () => {
  const canvas = { width: 0, height: 0 } as HTMLCanvasElement;
  const context = new Proxy({
    canvas, measureText: (text: string) => ({ width: text.length * 8 }),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
  }, { get: (o, k) => Reflect.get(o, k) ?? (() => undefined) });
  canvas.getContext = (() => context) as unknown as typeof canvas.getContext;
  return canvas;
};

describe("the dry headland and ring", () => {
  let town: Town, nav: NavGrid;
  beforeAll(() => {
    vi.stubGlobal("document", { createElement: canvasMock });
    town = buildTown();
    nav = new NavGrid(SLATE_COVE.minX, WORLD.minZ, WORLD.maxX, WORLD.maxZ, 1, town.colliders, 0.45);
    filterSlateCoveNav(nav, town.colliders);
  });
  afterAll(() => vi.unstubAllGlobals());

  const checkRoute = (goal: { x: number; z: number }, start = COVE_APPROACH) => {
    const path = nav.path(start.x, start.z, goal.x, goal.z);
    expect(path, JSON.stringify(goal)).not.toBeNull();
    expect(path!.at(-1)).toEqual([goal.x, goal.z]);
    const p = new Vector3(start.x, floorY(start.x, start.z), start.z), hop = new Hop();
    hop.land(p.y);
    for (const [x, z] of path!.slice(1)) {
      for (let i = 0; i < 900 && Math.hypot(x - p.x, z - p.z) > 0.18; i++) {
        const d = Math.hypot(x - p.x, z - p.z);
        p.x += (x - p.x) / d * 0.073;
        p.z += (z - p.z) / d * 0.073;
        town.colliders.resolve(p, 0.38, true);
        hop.update(1 / 60, floorY(p.x, p.z));
      }
      expect(Math.hypot(x - p.x, z - p.z), JSON.stringify({ x, z, p })).toBeLessThan(0.19);
    }
    return hop.y;
  };

  it("walks from Harbor Road through the real town to both mouths and the lawn", () => {
    for (const door of Object.values(COVE_DOORS)) {
      checkRoute(door.out);
      checkRoute({ x: door.x + door.dx * 1.7, z: door.z + door.dz * 1.7 });
      expect(coveDoorNear(door.out, -door.dx, -door.dz)).toBeUndefined();
      expect(town.walkableAt(door.out.x, door.out.z)).toBe(true);
      expect(coveDoorNear({ x: door.x + door.dx * 2, z: door.z + door.dz * 2 }, -door.dx, -door.dz)).toBe(door.id);
      expect(coveDoorNear({ x: door.x + door.dx * 2, z: door.z + door.dz * 2 }, door.dx, door.dz)).toBeUndefined();
    }
    checkRoute(RING_TARGET);
    checkRoute({ x: -117, z: -48 });
  });

  it("seals the pocket and leaves the old road exit outside pedestrian navigation", () => {
    for (let i = 0; i < nav.blocked.length; i++) {
      const [x, z] = nav.center(i);
      if (x < WORLD.minX && !inSlateCove(x, z)) expect(nav.blocked[i]).toBe(1);
    }
    for (const [x, z] of [[-140.1, -52], [-126, -68.1], [-126, -42.9], [-112.1, -62], [-112.1, -56.3], [-113, -8]]) {
      expect(town.walkableAt(x, z)).toBe(false);
      expect(town.colliders.blocked(x, z, 0.15)).toBe(true);
    }
    expect(town.walkableAt(-112, -59)).toBe(true);
  });

  it("walks up eighteen treads on a continuous floor and walks back down", () => {
    const { x, foot, top } = RING_STAIRS;
    expect(floorY(x, foot)).toBe(0);
    expect(floorY(x, (foot + top) / 2)).toBeCloseTo(1.8, 8);
    expect(floorY(x, top - 0.3)).toBeCloseTo(3.6, 8);
    expect(checkRoute({ x, z: -56 }, RING_TARGET)).toBeCloseTo(3.6, 1);
    expect(checkRoute(RING_TARGET, { x, z: -56 })).toBeCloseTo(0, 1);
    expect(nav.free(nav.idx(x, -56.9))).toBe(false);
    expect(town.colliders.blocked(x, -56.9, 0.38)).toBe(true);
    const art = buildSlateCove();
    expect(art.geometry.attributes.position.count).toBeGreaterThan(2000);
    art.geometry.dispose(); art.material.dispose();
  });
});

describe("the shared cave", () => {
  let zone: CaveZone;
  beforeAll(() => {
    vi.stubGlobal("document", { createElement: canvasMock });
    zone = buildCaveZone(undefined, () => {});
  });
  afterAll(() => { zone?.view.dispose(); vi.unstubAllGlobals(); });

  it("builds every chamber and has a dry route between the two exits", () => {
    expect(zone.group).toBeInstanceOf(Group);
    expect(CHAMBERS.map((room) => !!zone.group.getObjectByName("cave-" + room.id))).toEqual([true, true, true, true, true]);
    for (const spawn of Object.values(SPAWNS)) {
      expect(caveFloorY(spawn.x, spawn.z)).toBe(0);
      expect(zone.safeSpawn(spawn)).toBe(spawn);
      for (const exit of EXITS) expect(zone.nav.path(spawn.x, spawn.z, exit.x, exit.z)).not.toBeNull();
    }
    expect(caveFloorY(0, EXITS[0].z)).toBe(0);
    expect(caveFloorY(2, 8.6)).toBeLessThan(0);
    expect(zone.interior.npcs.map((actor) => actor.npc)).toEqual(["cave_bram", "cave_fern"]);
    expect(zone.view.fog.density).toBe(0.0185);
  });

  it("blocks inward crossings and leaves the return side traversable at each closed gate", () => {
    zone.quest.replace(emptyCave());
    const at = new Vector3(), previous = new Vector3();
    for (const gate of GATES) {
      const n = Math.sin(gate.rot), m = Math.cos(gate.rot);
      const a = { x: gate.x + n * 1.6, z: gate.z + m * 1.6 }, b = { x: gate.x - n * 1.6, z: gate.z - m * 1.6 };
      expect(caveRouting.firstClosedGate(a, b, zone.quest.save)?.id).toBe(gate.id);
      expect(caveRouting.firstClosedGate(b, a, zone.quest.save)).toBeUndefined();
      expect(zone.nav.path(a.x, a.z, b.x, b.z), gate.id + " inward").toBeNull();
      expect(zone.nav.path(b.x, b.z, a.x, a.z), gate.id + " outward").not.toBeNull();
      at.set(gate.x - n * 0.05, 0, gate.z - m * 0.05);
      previous.set(gate.x + n * 0.48, 0, gate.z + m * 0.48);
      zone.resolveStep(at, previous, 0.38);
      expect((at.x - gate.x) * n + (at.z - gate.z) * m).toBeCloseTo(0.46, 7);
      at.set(gate.x + n * 0.48, 0, gate.z + m * 0.48);
      previous.set(gate.x - n * 0.05, 0, gate.z - m * 0.05);
      zone.resolveStep(at, previous, 0.38);
      expect((at.x - gate.x) * n + (at.z - gate.z) * m).toBeCloseTo(0.48, 7);
    }
  });

  it("opens the five-stone route with the two keeper releases and validates restores", () => {
    const quest = zone.quest;
    quest.replace(emptyCave());
    expect(quest.mask).toBe(0);
    expect(caveRouting.target(SPAWNS.cleft, quest.save)?.id).toBe("cave_bram");
    const completed = (id: string) => ({ active: true, sit: { id }, conv: { completed: true } });
    expect(applyCaveEvent(quest, completed("x06-bram"), "cave_bram", false, "cave-pass", { gate: "bram" })).toBe(true);
    for (const id of ["tide-1", "tide-2"]) expect(quest.light(id)).toBe(true);
    expect(quest.light("tide-2")).toBe(false);
    expect(quest.light("bad")).toBe(false);
    expect(quest.mask).toBe(1);
    quest.light("tide-3");
    expect(quest.mask).toBe(3);
    quest.light("root-1");
    expect(quest.mask).toBe(7);
    expect(quest.save.heart).toBe(false);
    quest.light("root-2");
    expect(quest.save.heart).toBe(true);
    expect(quest.mask).toBe(7);
    expect(quest.treeHeard()).toBe(false);
    expect(caveRouting.target(SPAWNS.cleft, quest.save)?.id).toBe("cave_fern");
    applyCaveEvent(quest, completed("x07-fern"), "cave_fern", false, "cave-pass", { gate: "fern" });
    expect(quest.mask).toBe(63);
    expect(caveRouting.target(SPAWNS.cleft, quest.save)?.id).toBe("cave_oak");
    const nav = zone.nav;
    expect(nav.path(0, 2.2, 6, -176.8)).not.toBeNull();
    expect(nav.path(6, -176.8, 9.2, -2.2)).not.toBeNull();
    for (const room of CHAMBERS) for (const stone of room.stones) {
      const x = stone.x + Math.sin(stone.rot) * 1.35, z = stone.z + Math.cos(stone.rot) * 1.35;
      expect(nav.path(0, 2.2, x, z), stone.id).not.toBeNull();
    }
    expect(quest.treeHeard()).toBe(true);
    expect(quest.treeHeard()).toBe(false);
    const restored = caveRules.normalize({ ...quest.save, lit: [...quest.save.lit, "bad", "tide-1"], passed: [...quest.save.passed, "bram"] });
    expect(restored).toEqual(quest.save);
    expect(caveRules.gateMask(restored)).toBe(63);
  });

  it("restores a position beyond a closed gate and follows behind both dry spawns", () => {
    const saved = { x: 6, z: -176.8, rot: 0 };
    const resumed = buildCaveZone({ lit: ["tide-1", "tide-2"], passed: ["bram"] }, () => {});
    try {
      expect(resumed.quest.mask).toBe(1);
      expect(resumed.safeSpawn(saved)).toBe(saved);
      expect(resumed.safeSpawn({ ...saved, x: NaN })).toBe(SPAWNS.main);
      expect(resumed.nav.path(saved.x, saved.z, EXITS[0].x, EXITS[0].z)).not.toBeNull();
      for (const [width, height] of [[390, 844], [1280, 800]]) {
        for (const spawn of Object.values(SPAWNS)) {
          const rig = new CameraRig(width / height);
          rig.space = resumed.view.space;
          rig.mode = "follow";
          rig.pitch = rig.homePitch = 0.3;
          rig.dist = 9.5;
          rig.target.set(spawn.x, 0, spawn.z);
          rig.yaw = spawn.rot;
          rig.snap();
          rig.update(1 / 60, spawn.rot, false, true, true);
          expect(rig.cam.position.z).toBeGreaterThan(spawn.z);
          expect(resumed.view.space.inside(rig.cam.position)).toBe(false);
        }
      }
    } finally { resumed.view.dispose(); }
  });

  it("rechecks a dry crossing at fade commit and restores with the requested spawn", async () => {
    const loader = new CaveLoader();
    const enter = vi.spyOn(zone.quest, "enter").mockImplementation(() => {});
    const count = vi.fn(), build = vi.fn(() => zone);
    loader.code = { ...caveCode, buildCaveZone: build, countCaveVisit: count };
    const mouth = COVE_DOORS.cleft;
    let position: { x: number; z: number } = mouth;
    let commit: () => void = () => {};
    const saved = { x: 6, z: -176.8, rot: 0 }, progress = emptyCave();
    const ending = {
      ready: () => true, position: () => position, fade: (run: () => void) => { commit = run; },
      save: () => progress, mount: vi.fn(() => true), entered: vi.fn(),
    };
    const crossing = { door: mouth.id, instant: false, crossing: true };
    try {
      await loader.open(crossing, ending);
      expect(loader.pending).toBe(true);
      position = { x: mouth.x + 4, z: mouth.z };
      commit();
      expect(loader.pending).toBe(false);
      expect(build).not.toHaveBeenCalled();
      expect(count).not.toHaveBeenCalled();

      position = { x: mouth.x, z: mouth.z };
      await loader.open(crossing, ending);
      commit();
      commit();
      expect(build).toHaveBeenCalledExactlyOnceWith(progress);
      expect(ending.mount).toHaveBeenCalledExactlyOnceWith(zone, SPAWNS.cleft);
      expect(ending.entered).toHaveBeenCalledTimes(1);
      expect(count).toHaveBeenCalledTimes(1);

      await loader.open({ door: mouth.id, saved, instant: true, crossing: false }, ending);
      expect(ending.mount).toHaveBeenLastCalledWith(zone, saved);
      expect(count).toHaveBeenCalledTimes(1);
      expect(enter).toHaveBeenCalledTimes(2);
    } finally { enter.mockRestore(); }
  });

  it("counts once at a successful dry transition and skips cancelled, failed and restored entries", () => {
    const travel = new CaveTravel();
    const before = readPlayStats(useStore.getState().progress).games["slate-cove-cave"] ?? 0;
    const count = vi.fn(countCaveVisit);
    const cancelled = travel.start();
    travel.cancel();
    const valid = travel.start();
    expect(travel.arrive(cancelled, () => true, count)).toBe(false);
    expect(travel.arrive(valid, () => true, count)).toBe(true);
    expect(travel.arrive(valid, () => true, count)).toBe(false);
    expect(travel.arrive(travel.start(), () => false, count)).toBe(false);
    expect(travel.arrive(travel.start(), () => true)).toBe(true);
    expect(count).toHaveBeenCalledTimes(1);
    expect(readPlayStats(useStore.getState().progress).games["slate-cove-cave"]).toBe(before + 1);
  });
});
