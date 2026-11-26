import { afterEach, describe, expect, it, vi } from "vitest";
import { HL } from "../../src/ui/i18n";
import { PHOTO_THINGS } from "../../src/content/photo-walk-lines";
import { CABINETS, cabinetNear, cabinetPose, TOWN_GAMES, type Cabinet } from "../../src/game/arcade/cabinets";
import { ArcadeMode, useArcade } from "../../src/game/arcade/mode";
import { arcadeRecord, formatArcadeMetric, prerequisite, TOWN_DETAILS } from "../../src/game/arcade/records";
import type { ModeHost } from "../../src/game/kit/host";
import { ModeRegistry, type ModeScreen } from "../../src/game/kit/modes";
import { saveBest } from "../../src/game/road/ghost";
import { Vector3 } from "three";
import { Rides, type RideHost } from "../../src/game/rides/Rides";
import { NavGrid } from "../../src/game/nav";
import { RIDES } from "../../src/game/world/rides";
import { Colliders } from "../../src/game/world/util";
import { CameraRig } from "../../src/game/camera";
import { TABLE_X, TABLE_Z, TINA_HOME } from "../../src/game/billiards/table";
import { emptyPlayStats } from "../../src/state/playStats";
import { type Progress } from "../../src/state/progress";

const oldSave = () => ({ sits: {} }) as Progress;

afterEach(() => { vi.unstubAllGlobals(); });

it("resolves two independent front approaches and leaves the table, host and exit clear", () => {
  for (const id of ["road", "billiards"] as const) {
    const { x, z } = cabinetPose(id);
    expect(cabinetNear(x, z)).toEqual({ id, distance: 0 });
    expect(cabinetNear(x, 2)).toBeNull();
  }
  for (const [x, z] of [[0, 1.58], [1.55, 1.28], [0, 4.1]]) expect(cabinetNear(x, z)).toBeNull();
});

it.each([[390, 844], [390, 664], [844, 390], [1280, 800]])("frames the hall doorway at %i by %i", (w, h) => {
  const rig = new CameraRig(w / h);
  rig.mode = "interior";
  rig.interiorBounds = { w: 11, d: 10, cabinetCorner: true };
  rig.target.set(0, 0, 3.4); // The hall spawn is 1.6 m inside its open front.
  rig.cam.fov = rig.fovFor(w, h, false);
  rig.cam.updateProjectionMatrix();
  rig.snap();
  rig.update(1 / 60, Math.PI, false, true, true);
  rig.cam.updateMatrixWorld();
  const landmarks = [new Vector3(TINA_HOME.x, 1.7, TINA_HOME.z)];
  for (const x of [-TABLE_X, TABLE_X]) for (const z of [-TABLE_Z, TABLE_Z]) landmarks.push(new Vector3(x, 0.9, z));
  for (const x of [3.20 - 0.39, 4.20 + 0.39]) for (const y of [0, 2.34]) landmarks.push(new Vector3(x, y, 2.98));
  for (const point of landmarks) {
    const ndc = point.project(rig.cam);
    expect(Math.abs(ndc.x)).toBeLessThan(1);
    expect(Math.abs(ndc.y)).toBeLessThan(1);
  }
});

it("visits a reachable boat even when the beach lancha is offshore", () => {
  const colliders = new Colliders();
  const nav = new NavGrid(-30, -72, 30, -50, 1, colliders);
  const host = { colliders, nav, ambient: { rideBoxes: [] } } as unknown as RideHost;
  const rides = new Rides(host, { ...RIDES, cars: [] }, []);
  const beach = rides.find("playa")!;
  for (const id of ["playa", "muelle"]) {
    const step = rides.boatApproach(beach.home.x, beach.home.z + 3)!;
    expect(nav.free(nav.idx(step.x, step.z))).toBe(true);
    expect(rides.near(step.x, step.z)?.id).toBe(id);
    rides.resetPosition(rides.find(id)!, { x: 0, z: -120, rot: Math.PI });
  }
  expect(rides.boatApproach(beach.home.x, beach.home.z + 3)).toBeUndefined();
});

it("shows this town's titles and the current helper", () => {
  expect(CABINETS.road.title).toBe("Carretera del Desierto");
  expect(CABINETS.billiards.title).toBe("Billar");
  expect(TOWN_GAMES.billiards).toEqual(["loteria", "barista", "gym", "pool"]);
  expect(TOWN_DETAILS.pool.title).toBe("Juego de pelota en la alberca");
  expect(CABINETS.billiards.helper).toBe(HL === "lt" ? "Biliardas" : "Billiards");
});

it("keeps the number with the correctly inflected unit in this learner layer", () => {
  const lt = HL === "lt";
  const points = [0, 1, 2, 11, 21, 100];
  const units = lt ? ["taškų", "taškas", "taškai", "taškų", "taškas", "taškų"]
    : ["points", "point", "points", "points", "points", "points"];
  expect(points.map((n) => formatArcadeMetric("road", n))).toEqual(points.map((n, i) => n + "\u00a0" + units[i]));
  expect(formatArcadeMetric("billiards", 1)).toBe(lt ? "1\u00a0žaidimas" : "1\u00a0game");
  expect(formatArcadeMetric("barista", 2)).toBe(lt ? "2\u00a0pamainos" : "2\u00a0shifts");
  expect(formatArcadeMetric("surf", 11)).toBe(lt ? "11\u00a0bangų" : "11\u00a0waves");
  expect(formatArcadeMetric("pool", 2)).toBe(lt ? "2\u00a0perdavimai" : "2\u00a0passes");
  expect(formatArcadeMetric("photowalk", "2 / 12")).toBe("2 / 12");
});

it("reads separate Road and Sea bests, ignoring damaged ghosts and preserving a higher score", () => {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", { getItem: (k: string) => values.get(k), setItem: (k: string, v: string) => values.set(k, v) });
  const progress = oldSave();
  const town = "puerto-colibri";
  saveBest("maple-harbor", { points: 1000, frames: [] });
  const empty = HL === "lt" ? "Rezultato dar nėra" : "No score yet";
  expect(arcadeRecord("road", progress).value).toBe(empty);
  values.set("english-world-sea-v1:puerto-colibri", '{"points":9,"frames":[null]}');
  expect(arcadeRecord("sea", progress).value).toBe(empty);
  saveBest(town, { points: 300, frames: [] });
  saveBest(town, { points: 99, frames: [] }, undefined, undefined, "sea");
  expect(saveBest(town, { points: 200, frames: [] })).toBe(false);
  expect(arcadeRecord("road", progress).value).toBe(300);
  expect(arcadeRecord("sea", progress).value).toBe(99);
});

it("counts only distinct album finds, surf waves and native starts, including in an older save", () => {
  const p = oldSave();
  expect(arcadeRecord("barista", p).value).toBe(0);
  expect(arcadeRecord("pool", p).value).toBe(HL === "lt" ? "Rezultato dar nėra" : "No score yet");
  p.pool = { best: 8, rounds: 5, rulesHeard: true };
  p.play = { ...emptyPlayStats(), games: { billiards: 4, barista: 3, taxi: 2, pool: 12, loteria: 6 } };
  p.taxi = { nextRoute: 11 } as Progress["taxi"];
  p.surf = { waves: 7, seconds: 90 } as Progress["surf"];
  p.photoWalk = { status: "paused", found: [PHOTO_THINGS[1].id, PHOTO_THINGS[1].id, "unknown"] } as Progress["photoWalk"];
  const original = structuredClone(p);
  expect((["billiards", "barista", "taxi", "pool", "loteria", "surf", "photowalk"] as const).map((id) =>
    arcadeRecord(id, p).value)).toEqual([4, 3, 2, 8, 6, 7, `1 / ${PHOTO_THINGS.length}`]);
  expect(p).toEqual(original);
  expect(prerequisite("loteria", p)).toBeUndefined();
  expect(prerequisite("pool", p)).toMatch(/Vale/);
  expect(prerequisite("barista", p)).toMatch(/kavinėje|café/);
  for (const id of ["x09-alberca", "s72-cafe"]) p.sits[id] = { completions: 1 } as Progress["sits"][string];
  expect(prerequisite("pool", p)).toBeUndefined();
  expect(prerequisite("barista", p)).toBeUndefined();
});

describe("cabinet handoff", () => {
  function session(id: Cabinet) {
    let screen: ModeScreen | null = null;
    const modes = new ModeRegistry({ read: () => screen, set: (next) => { screen = next; } });
    let position = cabinetPose(id);
    let starts = 0, active = false;
    const host = { player: () => ({ root: { position } }), prepare() {}, canStart: () => true,
      entered: (id: string) => modes.entered(id),
      left: (id: string) => { modes.left(id); arcade.returnedFrom(id); } } as unknown as ModeHost;
    const room = { here: () => true, place: vi.fn((p) => { position = p; }), start: modes.start.bind(modes),
      refocus: vi.fn(), visit: vi.fn(), holdRadio: vi.fn() };
    const arcade = new ArcadeMode(host, room);
    modes.register(arcade);
    modes.register({ id, cleanScreen: "menu", get active() { return active; },
      start() { active = true; ++starts; host.entered(id); return true; },
      update() {}, input: () => false, exit() { active = false; host.left(id); }, dispose() {} });
    return { modes, arcade, room, screen: () => screen?.id, starts: () => starts };
  }

  it.each(["road", "billiards"] as const)("restores %s only for a cabinet start", (id) => {
    const { modes, arcade, room, screen, starts } = session(id);
    for (let n = 1; n <= 10; n++) {
      expect(modes.start("arcade")).toBe(true);
      arcade.action("play"); arcade.action("play");
      expect(screen()).toBe(id);
      expect(starts()).toBe(n);
      modes.exit();
      expect(room.place).toHaveBeenLastCalledWith(cabinetPose(id));
      expect(screen()).toBe("arcade");
      expect(useArcade.getState()).toMatchObject({ cabinet: id, page: "featured", playing: null });
      modes.exit();
      expect(room.holdRadio.mock.calls.slice(-2)).toEqual([[true], [false]]);
    }
    modes.start(id); modes.exit();
    expect(screen()).toBeUndefined();
    expect(room.place).toHaveBeenCalledTimes(10);
  });

  it.each(["road", "billiards"] as const)("browses every %s directory item without starting it", (id) => {
    const { modes, arcade, room, screen, starts } = session(id);
    for (const selected of TOWN_GAMES[id]) {
      modes.start("arcade"); arcade.action("list"); arcade.action("select", selected);
      arcade.action("back");
      expect(useArcade.getState()).toMatchObject({ page: "list", selected });
      arcade.action("select", selected); arcade.action("play"); arcade.action("visit");
      expect(room.visit).toHaveBeenLastCalledWith(selected);
      expect(screen()).toBeUndefined();
    }
    expect(starts()).toBe(0);
    expect(room.holdRadio).not.toHaveBeenCalled();
  });
});
