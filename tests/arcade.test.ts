import { afterEach, describe, expect, it, vi } from "vitest";
import { PHOTO_THINGS } from "../src/content/photo-walk-lines";
import { cabinetNear, cabinetPose, TOWN_GAMES, type Cabinet } from "../src/game/arcade/cabinets";
import { ArcadeMode, useArcade } from "../src/game/arcade/mode";
import { arcadeRecord, prerequisite } from "../src/game/arcade/records";
import type { ModeHost } from "../src/game/kit/host";
import { ModeRegistry, type ModeScreen } from "../src/game/kit/modes";
import { saveBest } from "../src/game/road/ghost";
import { emptyPlayStats } from "../src/state/playStats";
import { type Progress } from "../src/state/progress";

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

it("reads separate Road and Sea bests, ignoring damaged ghosts and preserving a higher score", () => {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", { getItem: (k: string) => values.get(k), setItem: (k: string, v: string) => values.set(k, v) });
  const progress = oldSave();
  const town = "maple-harbor";
  expect(arcadeRecord("road", progress).value).toBe("Rezultato dar nėra");
  values.set("english-world-sea-v1:maple-harbor", '{"points":9,"frames":[null]}');
  expect(arcadeRecord("sea", progress).value).toBe("Rezultato dar nėra");
  saveBest(town, { points: 300, frames: [] });
  saveBest(town, { points: 99, frames: [] }, undefined, undefined, "sea");
  expect(saveBest(town, { points: 200, frames: [] })).toBe(false);
  expect(arcadeRecord("road", progress).value).toBe(300);
  expect(arcadeRecord("sea", progress).value).toBe(99);
});

it("counts only distinct album finds, surf waves and native starts, including in an older save", () => {
  const p = oldSave();
  expect(arcadeRecord("barista", p).value).toBe(0);
  p.play = { ...emptyPlayStats(), games: { billiards: 4, barista: 3, taxi: 2 } };
  p.taxi = { nextRoute: 11 } as Progress["taxi"];
  p.surf = { waves: 7, seconds: 90 } as Progress["surf"];
  p.photoWalk = { status: "paused", found: [PHOTO_THINGS[1].id, PHOTO_THINGS[1].id, "unknown"] } as Progress["photoWalk"];
  const original = structuredClone(p);
  expect((["billiards", "barista", "taxi", "surf", "photowalk"] as const).map((id) =>
    arcadeRecord(id, p).value)).toEqual([4, 3, 2, 7, `1 / ${PHOTO_THINGS.length}`]);
  expect(p).toEqual(original);
  expect(prerequisite("gofish", p)).toMatch(/Danu/);
  expect(prerequisite("barista", p)).toMatch(/kavinėje/);
  for (const id of ["s85-dinner", "s72-cafe"]) p.sits[id] = { completions: 1 } as Progress["sits"][string];
  expect(prerequisite("gofish", p)).toBeUndefined();
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
