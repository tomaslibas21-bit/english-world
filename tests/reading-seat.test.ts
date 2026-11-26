import { Group, Mesh, PerspectiveCamera, Vector3, type Material } from "three";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { LIBRARY_COPY } from "../src/content/library";
import { Character } from "../src/game/characters/Character";
import { CameraRig } from "../src/game/camera";
import { Game } from "../src/game/Game";
import { PadButton } from "../src/game/padButtons";
import { ModeRegistry, type ModeScreen } from "../src/game/kit/modes";
import { ReadingSeat, READING_SEAT, libraryStandingPoint, type ReadingSeatHost } from "../src/game/library/readingSeat";
import { NavGrid } from "../src/game/nav";
import { Colliders } from "../src/game/world/util";
import { getInterior } from "../src/game/world/interiors";
import { LIBRARY_CHAIRS } from "../src/game/world/libraryRoom";
import { Gait, Hop, Steer } from "../src/game/movement";
import { audio } from "../src/game/audio";
import { radio } from "../src/radio";
import { useStore } from "../src/state/store";
import { townCanvasDocument } from "../tools/town-canvas-stub";

vi.mock("../src/content/library", async (original) => ({
  ...await original<typeof import("../src/content/library")>(), LIBRARY_ENABLED: true,
}));
const cleanup: (() => void)[] = [];
const frame = { dt: 1 / 60, time: 1, x: 0, y: 0, brake: false, blocked: false };
beforeEach(() => {
  vi.stubGlobal("document", townCanvasDocument());
  vi.spyOn(audio, "sfx").mockImplementation(() => {});
});
afterEach(() => {
  for (const dispose of cleanup.splice(0)) dispose();
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});

function setup(height = 1, aspect = 390 / 844) {
  const interior = getInterior("library")!, colliders = new Colliders();
  colliders.boxes = interior.colliders.boxes.map((b) => ({ ...b }));
  colliders.circles = interior.colliders.circles.map((c) => ({ ...c }));
  const room = { group: interior.group, colliders, nav: new NavGrid(-7, -6, 7, 8, 0.5, colliders, 0.35) };
  const player = new Character({ skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653", height });
  player.root.position.set(0, 0, 3.4);
  const rig = new CameraRig(aspect);
  rig.mode = "interior"; rig.interiorView = interior.camera!; rig.snap();
  let screen: ModeScreen | null = null, currentRoom: typeof room | null = room;
  let path: [number, number][] | null = null;
  const setScreen = vi.fn((next: ModeScreen | null) => { screen = next; });
  const modes = new ModeRegistry({ read: () => screen, set: setScreen });
  const place = vi.fn((x: number, z: number, rot: number) => { player.root.position.set(x, 0, z); player.root.rotation.y = rot; });
  const host: ReadingSeatHost = {
    room: () => currentRoom, player: () => player, rig,
    canStart: vi.fn(() => true), prepare: vi.fn(),
    approach: vi.fn((x, z) => { path = room.nav.path(player.root.position.x, player.root.position.z, x, z); return !!path?.length; }),
    approaching: () => !!path?.length, cancelApproach: () => { path = null; }, place,
    entered: () => modes.entered(READING_SEAT), left: () => modes.left(READING_SEAT),
    save: vi.fn(), reader: vi.fn(), reducedMotion: () => false,
  };
  const seat = new ReadingSeat(host); modes.register(seat);
  cleanup.push(() => { modes.dispose(); player.dispose(); });
  const arrive = (index: number) => {
    const { approach } = LIBRARY_CHAIRS[index];
    player.root.position.set(approach.x, 0, approach.z); path = null;
    return seat.arrive(index);
  };
  return { room, interior, player, rig, modes, seat, host, arrive, setScreen, place,
    path: () => path, leave: () => { currentRoom = null; } };
}

it.each([0, 1])("walks to chair %i before posing and opening the reader exactly once", (index) => {
  const f = setup(), chair = LIBRARY_CHAIRS[index];
  expect(f.modes.start(READING_SEAT, String(index))).toBe(true);
  expect(f.path()?.at(-1)).toEqual([chair.approach.x, chair.approach.z]);
  expect(f.seat.active).toBe(false);
  expect(f.player.anim).not.toBe("sit");
  expect(f.host.reader).not.toHaveBeenCalled();
  expect(f.arrive(index)).toBe(true);
  const dx = f.player.root.position.x - chair.x, dz = f.player.root.position.z - chair.z;
  expect(dx * Math.sin(chair.rot) + dz * Math.cos(chair.rot)).toBeCloseTo(0.25);
  expect(dx * Math.cos(chair.rot) - dz * Math.sin(chair.rot)).toBeCloseTo(0);
  expect(f.player.root.position.y).toBe(0);
  expect(f.player.root.rotation.y).toBe(chair.rot);
  expect(f.player.seatY).toBe(chair.seatY);
  expect(f.player.anim).toBe("sit");
  expect(f.player.root.visible).toBe(true);
  const phones = f.player.root.getObjectByName("library-headphones") as Mesh;
  expect(phones.parent).toBe(f.player.headJoint);
  expect(phones.material).toBe((f.room.group.getObjectByName("library-furniture") as Mesh).material);
  expect(f.host.reader).toHaveBeenCalledExactlyOnceWith(index);
  expect(f.arrive(index)).toBe(false);
  expect(f.modes.world).toBe(true);
  expect(f.setScreen).not.toHaveBeenCalled(); // Keep the ordinary world HUD and radio controls.
  const saved = f.seat.standingPoint!;
  expect(f.room.colliders.blocked(saved.x, saved.z, 0.38)).toBe(false);
  expect(saved).toEqual({ ...chair.approach, rot: chair.rot });
});

it("ignores duplicate sit presses during the approach and cancels the pending seat on movement", () => {
  const f = setup();
  expect(f.modes.start(READING_SEAT, "0")).toBe(true);
  expect(f.modes.start(READING_SEAT, "1")).toBe(false);
  expect(f.seat.input({ kind: "interact" })).toBe(true);
  expect(f.seat.input({ kind: "tap" })).toBe(true);
  expect(f.seat.input({ kind: "key", key: "e", repeat: true, keys: new Set() })).toBe(true);
  expect(f.host.approach).toHaveBeenCalledTimes(1);
  expect(f.seat.input({ kind: "key", key: "w", repeat: false, keys: new Set() })).toBe(false);
  expect(f.modes.engaged).toBe(false);
  expect(f.path()).toBeNull();
  expect(f.arrive(0)).toBe(false);
  expect(f.host.reader).not.toHaveBeenCalled();
  expect(f.player.root.getObjectByName("library-headphones")).toBeUndefined();
});

it("rejects a blocked chair approach, an interrupted walk and a remote arrival", () => {
  const f = setup(), c = LIBRARY_CHAIRS[0];
  const obstruction = f.room.colliders.addCircle(c.approach.x, c.approach.z, 0.5);
  expect(f.modes.start(READING_SEAT, "0")).toBe(false);
  f.room.colliders.circles.splice(f.room.colliders.circles.indexOf(obstruction), 1);
  expect(f.modes.start(READING_SEAT, "0")).toBe(true);
  expect(f.seat.arrive(0)).toBe(false); // The player has not walked there yet.
  expect(f.modes.engaged).toBe(false);
  expect(f.modes.start(READING_SEAT, "1")).toBe(true);
  f.host.cancelApproach(); f.seat.tick();
  expect(f.modes.engaged).toBe(false);
});

it("stands on clear ground when the first approach becomes occupied, and normalizes legacy seated saves", () => {
  const f = setup(), c = LIBRARY_CHAIRS[0];
  f.modes.start(READING_SEAT, "0"); f.arrive(0);
  f.room.colliders.addCircle(c.approach.x, c.approach.z, 0.6);
  const safe = f.seat.standingPoint!;
  expect(f.room.colliders.blocked(safe.x, safe.z, 0.38)).toBe(false);
  f.modes.exit();
  expect(f.player.root.position.toArray()).toEqual([safe.x, 0, safe.z]);
  expect(f.player.anim).toBe("idle");
  for (const chair of LIBRARY_CHAIRS) {
    const restored = libraryStandingPoint(f.room, chair);
    expect(f.room.colliders.blocked(restored.x, restored.z, 0.38)).toBe(false);
    expect(f.room.nav.free(f.room.nav.idx(restored.x, restored.z))).toBe(true);
  }
});

it.each(["reset", "zone", "dispose", "pending-zone"])("releases camera, pose and accessory on %s exactly once", (how) => {
  const f = setup(), originalAccessory = new Group();
  f.player.headJoint.add(originalAccessory);
  const watch = new Vector3(1, 2, 3);
  f.player.watch = watch; f.player.fidgets = true; f.player.busy = "paper";
  f.player.seatY = 0.62; f.player.recline = 0.04;
  f.rig.cam.zoom = 1.13; f.rig.yaw = 0.43;
  const stage = { pos: new Vector3(2, 3, 4), look: new Vector3(), rate: 2 };
  f.rig.stage = stage;
  f.modes.start(READING_SEAT, "0");
  if (how === "pending-zone") {
    f.leave(); f.seat.tick();
    expect(f.path()).toBeNull(); expect(f.modes.engaged).toBe(false);
    expect(f.host.reader).not.toHaveBeenCalled();
    return;
  }
  f.arrive(0);
  const phones = f.player.root.getObjectByName("library-headphones") as Mesh;
  const releaseGeometry = vi.fn(), releaseShared = vi.fn();
  phones.geometry.addEventListener("dispose", releaseGeometry);
  (phones.material as Material).addEventListener("dispose", releaseShared);
  if (how === "zone") { f.leave(); f.seat.tick(); }
  else if (how === "dispose") f.modes.dispose();
  else f.modes.exit(true);
  f.seat.exit(true);
  expect(f.modes.engaged).toBe(false);
  expect(f.player.root.getObjectByName("library-headphones")).toBeUndefined();
  expect(originalAccessory.parent).toBe(f.player.headJoint);
  expect(releaseGeometry).toHaveBeenCalledTimes(1);
  expect(releaseShared).not.toHaveBeenCalled();
  expect(f.player.watch).toBe(watch);
  expect(f.player.fidgets).toBe(true);
  expect(f.player.busy).toBe("paper");
  expect(f.player.seatY).toBe(0.62);
  expect(f.player.recline).toBe(0.04);
  expect(f.rig.mode).toBe("interior");
  expect(f.rig.stage).toBe(stage);
  expect(f.rig.yaw).toBe(0.43);
  expect(f.rig.cam.zoom).toBe(1.13);
});

it("keeps standing after a reader finishes loading late", async () => {
  const f = setup();
  let finish!: () => void;
  const loading = new Promise<void>((resolve) => { finish = resolve; });
  f.host.reader = vi.fn(() => { void loading.then(() => f.seat.chairIndex); });
  f.modes.start(READING_SEAT, "0"); f.arrive(0);
  f.modes.exit(); finish(); await loading;
  expect(f.player.anim).toBe("idle");
  expect(f.seat.chairIndex).toBeNull();
  expect(f.modes.engaged).toBe(false);
  expect(f.player.root.getObjectByName("library-headphones")).toBeUndefined();
});

it("restores walking on keys, touch/controller movement and Stand up, while a blocked overlay holds the seat", () => {
  const f = setup();
  const sit = () => { expect(f.modes.start(READING_SEAT, "1")).toBe(true); expect(f.arrive(1)).toBe(true); };
  sit();
  f.seat.update({ ...frame, x: 1, blocked: true });
  expect(f.seat.active).toBe(true);
  f.seat.update({ ...frame, x: 1 });
  expect(f.seat.active).toBe(false);
  sit();
  expect(f.seat.input({ kind: "key", key: "r", repeat: false, keys: new Set() })).toBe(false);
  expect(f.seat.active).toBe(true); // R remains available to the one radio.
  expect(f.seat.input({ kind: "tap" })).toBe(true); // Ignore the second cushion tap during seating.
  f.seat.update({ ...frame, dt: 0.3 });
  expect(f.seat.input({ kind: "tap" })).toBe(false); // A settled ground tap reaches click-to-walk.
  expect(f.seat.input({ kind: "key", key: "arrowup", repeat: false, keys: new Set() })).toBe(false);
  expect(f.seat.active).toBe(false);
  sit();
  expect(f.seat.padAction && f.seat.padDriving).toBe(true);
  expect(f.seat.padTick({ x: 0, y: 0, rx: 0, ry: 0, throttle: 0, brake: false }, PadButton.X)).toBe("interact");
  expect(f.seat.active).toBe(false);
});

it.each([0.9, 1.1])("fits one head-mounted mesh at avatar height %f with a centered lamp view at all review sizes", (height) => {
  const f = setup(height);
  for (const index of [0, 1]) for (const aspect of [390 / 844, 844 / 390, 1280 / 800]) {
    f.rig.cam.aspect = aspect;
    f.modes.start(READING_SEAT, String(index)); f.arrive(index);
    const phones = f.player.root.getObjectByName("library-headphones") as Mesh;
    expect(phones.parent).toBe(f.player.headJoint);
    phones.geometry.computeBoundingBox();
    expect(phones.geometry.boundingBox!.max.x).toBeGreaterThan(0.34);
    expect(phones.geometry.boundingBox!.min.x).toBeLessThan(-0.34);
    expect(phones.geometry.groups).toHaveLength(0);
    expect(phones.geometry.attributes.position.count / 3).toBeLessThanOrEqual(300);
    const shot = f.rig.stage!, camera = new PerspectiveCamera(shot.fov!, aspect, 0.1, 100);
    camera.position.copy(shot.pos); camera.lookAt(shot.look); camera.updateMatrixWorld(true);
    const c = LIBRARY_CHAIRS[index], head = f.player.headJoint.getWorldPosition(new Vector3());
    const features = [head, head.clone().add(new Vector3(0, 0.36, 0)), new Vector3(c.tableX, 1.9, c.tableZ), new Vector3(c.x, 0.05, c.z)];
    for (const point of features) {
      const ndc = point.project(camera);
      expect(Math.abs(ndc.x)).toBeLessThan(0.9); expect(Math.abs(ndc.y)).toBeLessThan(0.9);
      expect(ndc.z).toBeGreaterThan(-1); expect(ndc.z).toBeLessThan(1);
    }
    expect(shot.shiftY).toBe(0);
    f.modes.exit();
  }
});

it("settles reduced-motion seating and resize without an animated camera sweep", () => {
  const f = setup(); f.host.reducedMotion = () => true;
  const snap = vi.spyOn(f.rig, "stageSnap");
  f.modes.start(READING_SEAT, "0"); f.arrive(0);
  expect(snap).toHaveBeenCalledTimes(1);
  f.rig.cam.aspect = 844 / 390;
  f.seat.update(frame);
  expect(snap).toHaveBeenCalledTimes(2);
  const shot = f.rig.stage;
  for (let i = 0; i < 20; i++) f.seat.update(frame);
  expect(f.rig.stage).toBe(shot);
  expect(snap).toHaveBeenCalledTimes(2);
});

it("keeps the caller's paused or playing talk clock through seating, reader dismissal and standing", () => {
  const f = setup();
  const power = vi.spyOn(radio, "power"), hold = vi.spyOn(radio, "hold"), release = vi.spyOn(radio, "release"), bed = vi.spyOn(audio, "bed");
  // The reader handoff owns this existing clock. Any construction of a second media element fails here.
  const secondClock = vi.fn(() => { throw new Error("A seat must reuse the reader's transport"); });
  vi.stubGlobal("Audio", secondClock);
  const clock = { position: 91.25, paused: true, tick(dt: number) { if (!this.paused) this.position += dt; } };
  const readers: typeof clock[] = [];
  f.host.reader = () => { readers.push(clock); };
  f.modes.start(READING_SEAT, "0"); f.arrive(0); clock.tick(1);
  expect(clock).toMatchObject({ position: 91.25, paused: true });
  f.modes.exit();
  clock.paused = false; clock.tick(1);
  f.modes.start(READING_SEAT, "1"); f.arrive(1); clock.tick(1);
  f.seat.update(frame); // Closing a reader does not relinquish the chair or its headphones.
  expect(f.seat.active).toBe(true);
  f.modes.exit(); clock.tick(1);
  expect(readers).toEqual([clock, clock]);
  expect(clock).toMatchObject({ position: 94.25, paused: false });
  for (const call of [power, hold, release, bed, secondClock]) expect(call).not.toHaveBeenCalled();
});

it("routes the public hooks to the shelf and chair, exposes a typed bilingual Stand up prompt, and stands explicitly", () => {
  const f = setup(), shelf = vi.fn(), reader = vi.fn();
  const prior = useStore.getState().hud;
  cleanup.push(() => useStore.setState({ hud: prior }));
  const game: Game = Object.assign(Object.create(Game.prototype), {
    zone: { id: "library" }, modes: f.modes, player: f.player, rides: { riding: null }, readingSeat: f.seat,
    onLibraryShelf: shelf, onLibraryReader: reader, transitioning: false, disposed: false,
  });
  f.host.reader = (index) => game.onLibraryReader?.(index);
  game.onLibraryAction("browse");
  expect(shelf).toHaveBeenCalledTimes(1);
  game.onLibraryAction("sit", 0); f.arrive(0);
  game["updateHud"]();
  expect(useStore.getState().hud.prompt).toEqual({ kind: "library-stand", ...LIBRARY_COPY.stand });
  expect(game.libraryChair).toBe(0);
  expect(reader).toHaveBeenCalledExactlyOnceWith(0);
  game.standFromLibrary();
  expect(game.libraryChair).toBeNull();
});

it("keeps the seated pose on the exact walking-arrival frame before walking collision can push it away", () => {
  const f = setup(), noop = () => {};
  const game: Game = Object.assign(Object.create(Game.prototype), {
    zone: { id: "library", interior: f.interior, ...f.room }, readingSeat: f.seat,
    player: f.player, rig: f.rig, modes: f.modes, rides: { riding: null },
    keys: new Set(), joy: { x: 0, y: 0 }, steer: new Steer(), gait: new Gait(), hop: new Hop(),
    vel: new Vector3(), moveVel: new Vector3(), walkWant: new Vector3(), walkFrom: new Vector3(),
    wading: { depth: 0 }, swimK: 0, diveK: 0, diveT: 0, gaitOn: false, jogT: 0, jogDir: null,
    heading: 0, lastHeading: 0, stepOut: 0, t: 0,
    applyHop: noop,
  });
  f.modes.start(READING_SEAT, "0");
  const c = LIBRARY_CHAIRS[0];
  f.player.root.position.set(c.approach.x, 0, c.approach.z);
  game["autoPath"] = [[c.approach.x, c.approach.z]];
  game["autoTarget"] = { kind: "library-seat", id: "0" };
  game["updatePlayer"](1 / 60, false);
  expect(f.player.anim).toBe("sit");
  expect(f.player.root.position.x).toBeCloseTo(c.x + 0.25 * Math.sin(c.rot));
  expect(f.player.root.position.y).toBe(0);
  expect(f.player.root.position.z).toBeCloseTo(c.z + 0.25 * Math.cos(c.rot));
  expect(f.player.root.getObjectByName("library-headphones")).toBeDefined();
});

it("plans a clicked walk from the clear standing point and releases the seat before pathfinding", () => {
  const f = setup();
  f.modes.start(READING_SEAT, "0"); f.arrive(0);
  const stand = f.seat.standingPoint!, planned = vi.spyOn(f.room.nav, "path");
  const game: Game = Object.assign(Object.create(Game.prototype), {
    zone: { id: "library", interior: f.interior, ...f.room }, readingSeat: f.seat,
    player: f.player, modes: f.modes,
  });
  game.walkTo(0, 3.4, { kind: "point" });
  expect(f.modes.engaged).toBe(false);
  expect(planned).toHaveBeenCalledWith(stand.x, stand.z, 0, 3.4, true);
  expect(game["autoPath"]?.at(-1)).toEqual([0, 3.4]);
});
