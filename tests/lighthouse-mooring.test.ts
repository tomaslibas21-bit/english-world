import { Group, PerspectiveCamera } from "three";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KEEPER_SIT, loadSituation } from "../src/content/situations/catalog";
import { Game } from "../src/game/Game";
import { Rides, type RideHost } from "../src/game/rides/Rides";
import { RIDES } from "../src/game/world/rides";
import { Colliders } from "../src/game/world/util";
import { emptyProgress, loadProgress, saveProgress } from "../src/state/progress";
import { useStore } from "../src/state/store";

const cafe = { zone: "sunny-cup", x: -1, z: 2, rot: 0 };
const berth = { x: 82.6, z: -83.1, rot: Math.PI / 2 };
const { keeper } = RIDES.island!;
const { x, z } = keeper.approach;
const keeperSpawn = { x, z, rot: Math.atan2(keeper.x - x, keeper.z - z) };
const keeperActor = { id: "lighthouse_keeper" };

function makeRides(outdoors = () => true) {
  const player = { root: new Group(), setAnim() {}, update() {} };
  const host = { player, outdoors, cam: new PerspectiveCamera(), colliders: new Colliders(), ambient: { rideBoxes: [] } };
  return new Rides(host as unknown as RideHost, { ...RIDES, cars: [] }, []);
}

// Run Game's real save and picker methods without constructing the renderer.
function makeTown(rides: Rides, place = cafe, arrive: (enter: () => void) => void = (enter) => enter()) {
  const game = Object.create(Game.prototype) as {
    savePlace(): void;
    startScenario(id: string): void;
    islandScene?: { keeperActor: typeof keeperActor; keeperSpawn: typeof keeperSpawn };
    disposed: boolean;
    zone: { id: string };
    heading: number;
  };
  rides.host.player.root.position.set(place.x, 0, place.z);
  const enterZone = vi.fn((zone: string, spawn = cafe, _instant?: boolean, _via?: "in" | "out", onEntered?: () => void) => {
    arrive(() => {
      game.zone = { id: zone };
      game.heading = spawn.rot;
      rides.host.player.root.position.set(spawn.x, 0, spawn.z);
      game.savePlace();
      onEntered?.();
    });
  });
  const startSession = vi.fn();
  return Object.assign(game, {
    rides, zone: { id: place.zone }, player: rides.host.player, heading: place.rot,
    modes: { get: () => undefined, owns: () => false, exit() {}, cancelQueued() {} },
    phone: { saveClock() {}, dismiss() {} }, quests: { stopReplay() {} }, observeStreetAndPhone() {},
    afterSceneDelay() {},
    conversationLoads: 0, keeperPick: 0,
    async loadIsland() { game.islandScene = { keeperActor, keeperSpawn }; },
    enterZone, startSession,
  });
}

const initial = useStore.getState();
beforeEach(() => {
  const storage = new Map<string, string>();
  vi.stubGlobal("localStorage", { getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => { storage.set(key, value); } });
  useStore.setState({ progress: { ...emptyProgress(), objective: "s73-restaurant", lighthouse: { greeted: true } } });
});
afterEach(() => {
  useStore.setState(initial);
  vi.unstubAllGlobals();
});

describe("saved lighthouse mooring", () => {
  it.each(["beach", "pier"])("restores a physically docked %s boat after saving and resaving in the café", async (id) => {
    await loadSituation(KEEPER_SIT);
    const rides = makeRides(() => false);
    const boat = rides.find(id)!;
    const docked = { id, x: 82.8, z: -83.15, rot: 1.6 };
    rides.resetPosition(boat, docked);
    expect(rides.restoreBoat(boat, 0)).toBe(true);
    expect(rides.leave()).toBe(true);
    rides.update(1, 1, null);
    rides.update(4, 5, null);
    expect(rides.islandBoat()).toEqual(docked);

    makeTown(rides).savePlace();
    const saved = loadProgress();
    expect(saved.place).toEqual(cafe);
    expect(saved.lighthouse).toEqual({ greeted: true, boat: docked });

    useStore.setState({ progress: saved });
    const coldRides = makeRides();
    let enter: (() => void) | undefined;
    const cold = makeTown(coldRides, saved.place!, (arrive) => { enter = arrive; });
    cold.savePlace();
    expect(cold.islandScene).toBeUndefined();
    expect(coldRides.islandBoat()).toBeUndefined();
    expect(loadProgress().lighthouse).toEqual(saved.lighthouse);

    cold.startScenario(KEEPER_SIT);
    cold.startScenario(KEEPER_SIT);
    await vi.waitFor(() => expect(cold.enterZone).toHaveBeenCalledExactlyOnceWith("town", keeperSpawn, true, undefined, expect.any(Function)));
    expect(cold.startSession).not.toHaveBeenCalled();
    expect(coldRides.islandBoat()).toBeUndefined();
    enter!();
    expect(cold.startSession).toHaveBeenCalledTimes(1);
    expect(coldRides.islandBoat()).toEqual(docked);
    expect(coldRides.list.map((r) => r.m.x)).toEqual(coldRides.list.map((r) => r.id === id ? docked.x : r.home.x));
    expect(loadProgress()).toMatchObject({ place: { zone: "town", x: 108.4, z: -83.55 }, objective: "s73-restaurant" });

    coldRides.restoreIslandBoat({ id: id === "beach" ? "pier" : "beach", ...berth });
    expect(coldRides.islandBoat()).toEqual(docked);
  });

  it.each([
    [undefined, "pier"],
    [{ id: "unknown", x: 82.8, z: -83.15, rot: 1.6 }, "pier"],
    [{ id: "beach", x: -20, z: -85, rot: 1.6 }, "beach"],
    [{ id: "beach", x: 82.8, z: -83.15, rot: NaN }, "beach"],
  ] as const)("uses the safe berth for unusable saved data %j", async (boat, id) => {
    await loadSituation(KEEPER_SIT);
    const progress = { ...emptyProgress(), lighthouse: { greeted: true, boat }, place: cafe };
    saveProgress(progress);
    useStore.setState({ progress: loadProgress() });
    const rides = makeRides();
    const game = makeTown(rides);
    game.startScenario(KEEPER_SIT);
    await vi.waitFor(() => expect(game.startSession).toHaveBeenCalledTimes(1));
    expect(rides.islandBoat()).toEqual({ id, ...berth });
  });

  it("discards an indoor record if that boat is taken out before a keeper replay", () => {
    const rides = makeRides();
    useStore.getState().updateProgress((p) => { p.lighthouse!.boat = { id: "beach", ...berth }; });
    expect(rides.restoreBoat(rides.find("beach")!, 0)).toBe(true);
    makeTown(rides, { ...cafe, zone: "town" }).savePlace();
    const saved = loadProgress();
    expect(saved.lighthouse).toEqual({ greeted: true });
    expect(saved.place?.boat?.id).toBe("beach");
  });

  it("releases a mooring when the boat is taken or returned home", () => {
    const rides = makeRides();
    const released = rides.onIslandBoatReleased = vi.fn();
    const boat = rides.find("beach")!;
    rides.restoreIslandBoat({ id: boat.id, ...berth });
    expect(rides.restoreBoat(boat, 0)).toBe(true);
    expect(rides.islandBoat()).toBeUndefined();
    expect(released).toHaveBeenCalledExactlyOnceWith(boat.id);
    rides.abandon();
    rides.restoreIslandBoat({ id: boat.id, ...berth });
    rides.host.cam.position.z = 100;
    rides.host.cam.updateMatrixWorld();
    rides.update(25, 25, null);
    expect(rides.islandBoat()).toBeUndefined();
    expect(released).toHaveBeenCalledTimes(2);
    expect(boat.m).toMatchObject({ x: boat.home.x, z: boat.home.z, heading: boat.home.rot });
  });

  it("keeps a boat already moored when a picker interrupts disembarking", () => {
    const rides = makeRides();
    const boat = rides.find("beach")!;
    rides.resetPosition(boat, berth);
    expect(rides.restoreBoat(boat, 0)).toBe(true);
    expect(rides.leave()).toBe(true);
    rides.abandon();
    expect(rides.riding).toBeNull();
    expect(rides.islandBoat()).toEqual({ id: boat.id, ...berth });
  });

  it("leaves the boat and the player in place if the game is disposed during the island load", async () => {
    const rides = makeRides();
    const game = makeTown(rides);
    game.startScenario(KEEPER_SIT);
    game.disposed = true;
    await Promise.resolve();
    expect(game.enterZone).not.toHaveBeenCalled();
    expect(game.startSession).not.toHaveBeenCalled();
    expect(rides.islandBoat()).toBeUndefined();
  });

  it("cancels the pending island arrival when another picker card is selected", async () => {
    const rides = makeRides();
    const game = makeTown(rides);
    game.startScenario(KEEPER_SIT);
    game.startScenario("s33-small-talk");
    await Promise.resolve();
    expect(game.enterZone).toHaveBeenCalledTimes(1);
    expect(game.zone.id).toBe("town");
    expect(game.startSession).not.toHaveBeenCalled();
    expect(rides.islandBoat()).toBeUndefined();
  });
});
