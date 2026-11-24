import * as THREE from "three";
import { afterEach, beforeAll, expect, it, vi } from "vitest";
import type { Game } from "../../src/game/Game";
import type { Progress } from "../../src/state/progress";
import { townCanvasDocument } from "../../tools/town-canvas-stub";
import { buildFleetPack } from "../../tools/fleet-pack-plugin";
import { stubCarAssets, testFleetURL } from "../fixtures/car-assets";

const renderers: FakeRenderer[] = [];

function element() {
  return { style: {}, classList: { toggle: vi.fn() }, appendChild: vi.fn(), addEventListener: vi.fn(), remove: vi.fn(),
    clientWidth: 390, clientHeight: 844, getBoundingClientRect: () => ({ left: 0, top: 0, width: 390, height: 844 }) };
}

class FakeRenderer {
  domElement = element();
  shadowMap = { enabled: false, type: 0 };
  info = { render: { calls: 0, triangles: 0, frame: 0 } };
  setPixelRatio = vi.fn();
  getPixelRatio = () => 1.75;
  setSize = vi.fn();
  dispose = vi.fn();
  forceContextLoss = vi.fn();
  frame: (() => void) | null = null;
  setAnimationLoop = vi.fn((frame: (() => void) | null) => { this.frame = frame; });
  render = vi.fn((_scene: THREE.Scene, _camera: THREE.Camera) => { this.info.render.frame++; });
  constructor() { renderers.push(this); }
}

vi.mock("three", async (actual) => ({
  ...await actual<typeof THREE>(),
  WebGLRenderer: class { constructor() { return new FakeRenderer(); } },
}));

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((ok) => { resolve = ok; });
  return { promise, resolve };
}

const fleet = vi.hoisted(() => ({ url: undefined as string | undefined }));
vi.mock("virtual:fleet-pack-url", () => ({ get default() { return fleet.url; } }));
let game: Game | undefined;

async function start(place: Progress["place"], linked?: string, reducedMotion = false) {
  const canvas = townCanvasDocument();
  const doc = { hidden: false, querySelectorAll: () => [],
    createElement: (tag: string) => tag === "canvas" ? canvas.createElement() : element(),
    addEventListener: vi.fn(), removeEventListener: vi.fn() };
  const win = { devicePixelRatio: 2, addEventListener: vi.fn(), removeEventListener: vi.fn() };
  vi.stubGlobal("window", win);
  vi.stubGlobal("document", doc);
  vi.stubGlobal("HTMLCanvasElement", class {});
  vi.stubGlobal("screen", { width: 390, height: 844 });
  vi.stubGlobal("location", { search: "" });
  vi.stubGlobal("matchMedia", () => ({ matches: reducedMotion }));

  const [{ Game }, { useStore }, { emptyProgress }, { NPCS }, { audio }, { prepareExteriorCars }] = await Promise.all([
    import("../../src/game/Game"), import("../../src/state/store"), import("../../src/state/progress"), import("../../src/content/npcs"),
    import("../../src/game/audio"), import("../../src/game/exteriorAssets"),
  ]);
  vi.spyOn(audio, "init").mockResolvedValue(undefined);
  vi.spyOn(audio, "prefetch").mockResolvedValue(undefined);
  vi.spyOn(audio, "play").mockResolvedValue(false);
  useStore.setState({ progress: { ...emptyProgress(), profile: {
    name: "Learner", surname: "", gender: "f", look: NPCS.mia.look, lookId: "test",
  }, place }, settings: { ...useStore.getState().settings, quality: "high", phoneCalls: false } });
  const models = prepareExteriorCars();
  const current = game = new Game(element() as unknown as HTMLElement, element() as unknown as HTMLDivElement, models);
  const renderer = renderers.at(-1)!;
  const ready = vi.fn(() => { useStore.getState().setScreen("play"); });
  current.onReady = ready;
  const init = current.init(linked);
  void init.catch(() => {});
  return { current, renderer, models, ready, init, useStore, win };
}

function exteriorFrame(scene: THREE.Scene) {
  const traffic: THREE.InstancedMesh[] = [], parking: THREE.Mesh[] = [];
  let taxi: THREE.Mesh | undefined;
  scene.traverseVisible((object) => {
    if (object.name.startsWith("traffic-")) traffic.push(object as THREE.InstancedMesh);
    if (object.name === "parked-car-models") parking.push(object as THREE.Mesh);
    if (object.name === "mode-car-taxi") taxi = object.getObjectByName("body") as THREE.Mesh;
  });
  return { traffic, parking, taxi };
}

let packed: Uint8Array<ArrayBuffer>;
beforeAll(async () => {
  const { EDITION } = await import("../../src/edition");
  packed = Uint8Array.from(await buildFleetPack(process.cwd(), "es", EDITION.helper === "lt" ? "lt" : ""));
}, 20_000);

function stubFleetAssets(beforePalette?: () => Promise<void>) {
  fleet.url = testFleetURL;
  return stubCarAssets({ fleetResponse: () => new Response(packed), beforePalette });
}

async function until(assert: () => void) {
  await vi.waitFor(assert, { timeout: 4000, interval: 10 });
}

afterEach(() => {
  game?.dispose();
  game = undefined;
  renderers.length = 0;
  fleet.url = undefined;
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.resetModules();
});

it("renders the complete fleet from the saved taxi camera before publishing gameplay", async () => {
  const paint = deferred();
  const { palette, fetchFile, loadPalette } = stubFleetAssets(() => paint.promise);
  const { PARKED_CARS, TAXI } = await import("../../src/game/world/layout");
  const { current, renderer, init, ready, useStore, win } = await start({ zone: "town", x: TAXI.x - 1, z: TAXI.z + 2, rot: 0.71 });

  expect(current.init()).toBe(init);
  await until(() => expect(loadPalette).toHaveBeenCalledTimes(1));
  expect(useStore.getState().screen).toBe("loading");
  expect(renderer.render).not.toHaveBeenCalled();
  expect(ready).not.toHaveBeenCalled();
  expect(win.addEventListener.mock.calls.some(([event]) => event === "keydown")).toBe(false);

  const firstDraw = vi.fn((scene: THREE.Scene, camera: THREE.Camera) => {
    const first = exteriorFrame(scene);
    expect(useStore.getState().screen).toBe("loading");
    expect(current.carStats()).toMatchObject({ loadedCarModels: 9, trafficModels: 6, parkedModels: PARKED_CARS.length, taxi: true });
    expect(first.traffic.filter(({ name }) => !name.endsWith("wheels")).reduce((n, mesh) => n + mesh.count, 0)).toBe(6);
    expect(first.traffic.filter(({ name }) => name === "traffic-taxi-wheels")).toHaveLength(2);
    expect(first.traffic.every((mesh) => mesh.count > 0)).toBe(true);
    expect(first.parking).toHaveLength(2);
    expect(first.taxi).toBeInstanceOf(THREE.Mesh);
    expect(scene.getObjectByName("stand-taxi-fallback")).toBeUndefined();
    for (const mesh of [...first.traffic, ...first.parking, first.taxi!]) {
      expect((mesh.material as THREE.MeshLambertMaterial).map).toBe(palette);
      expect(mesh.castShadow).toBe(true);
    }
    expect(camera.position.distanceTo(new THREE.Vector3(TAXI.x, 0, TAXI.z))).toBeLessThan(22);
    const procedural = current["ambient"].traffic.filter((car) => !car.model);
    expect(procedural.map(({ kind }) => kind)).toEqual(["bus", "colectivo"]);
    for (const { mesh, whole } of procedural) {
      expect(mesh.geometry.getAttribute("position").count).toBeGreaterThan(100);
      expect(mesh.parent).toBe(current["ambient"].group);
      expect(mesh.visible).toBe(true);
      expect(whole).toBe(true);
    }
    expect(current.rides.list.filter(({ townBoat }) => !!townBoat)).toHaveLength(6);
    const open = current.rides.list.filter((ride) => ride.kind === "car");
    expect(open).toHaveLength(3);
    for (const ride of open) {
      expect(ride.model).toBeUndefined();
      expect(ride.mesh).toBeInstanceOf(THREE.Mesh);
      expect(ride.owners.length).toBeGreaterThan(0);
      expect(ride.owners.every(({ ch, state }) => ch.anim === "sit" && state === "in")).toBe(true);
    }
    for (const id of ["muelle", "playa"]) {
      const lancha = current.rides.find(id);
      expect(lancha?.kind).toBe("boat");
      expect(lancha?.mesh).toBeInstanceOf(THREE.Mesh);
      expect(lancha?.mesh.parent).toBe(current.rides.group);
    }
    return first;
  });
  renderer.render.mockImplementationOnce(firstDraw);
  paint.resolve();
  await init;
  expect(firstDraw).toHaveBeenCalledTimes(1);
  expect(renderer.render.mock.invocationCallOrder[0]).toBeLessThan(ready.mock.invocationCallOrder[0]);
  expect(useStore.getState().screen).toBe("play");
  expect(useStore.getState().hud.minimap).toBeTruthy();

  const before = firstDraw.mock.results[0].value;
  current.setJoystick(1, 0);
  renderer.frame?.();
  const after = exteriorFrame(renderer.render.mock.calls[1][0]);
  expect(after.taxi).toBe(before.taxi);
  after.traffic.forEach((mesh, i) => expect(mesh).toBe(before.traffic[i]));
  after.parking.forEach((mesh, i) => expect(mesh).toBe(before.parking[i]));
  expect(fetchFile.mock.calls.map(([url]) => url)).toEqual([testFleetURL]);
  expect(ready).toHaveBeenCalledTimes(1);
}, 20_000);

it("draws the airport independently and holds the first exit until an actual complete draw", async () => {
  const paint = deferred();
  const { loadPalette } = stubFleetAssets(() => paint.promise);
  const { current, init, renderer, ready, useStore, models } = await start(null, undefined, true);
  await init;
  expect(current.zoneId).toBe("airport");
  expect(renderer.render).toHaveBeenCalledTimes(1);
  await until(() => expect(loadPalette).toHaveBeenCalledTimes(1));

  const entered = vi.fn();
  current.enterZone("town", { x: 28, z: -14.6, rot: Math.PI }, true, undefined, entered);
  expect(useStore.getState().hud.fade).toBe(1);
  expect(current.zoneId).toBe("airport");
  expect(current.carStats().taxi).toBe(false);
  paint.resolve();
  await models;
  await until(() => expect(current.zoneId).toBe("town"));
  expect(renderer.render).toHaveBeenCalledTimes(1);
  expect(entered).not.toHaveBeenCalled();
  expect(useStore.getState().hud.fade).toBe(1);
  renderer.frame?.();
  expect(exteriorFrame(renderer.render.mock.calls[1][0]).taxi).toBeDefined();
  await until(() => expect(useStore.getState().hud.fade).toBe(0));
  expect(entered).toHaveBeenCalledTimes(1);
  expect(ready).toHaveBeenCalledTimes(1);
}, 20_000);

it("ignores late fleet completion after disposal during Game.init", async () => {
  const pending = deferred();
  stubCarAssets({ beforeModel: () => pending.promise });
  const { current, init, renderer, ready, useStore, models, win } = await start(
    { zone: "airport", x: -14, z: -1, rot: Math.PI }, "x08-rosario",
  );
  await until(() => expect(current["carVisuals"]).toBeDefined());
  expect(current.zoneId).toBeUndefined();
  current.dispose();
  const state = useStore.getState();
  const bodies = current["ambient"].group.children.slice();
  pending.resolve();
  await models;
  await init;
  expect(current["ambient"].group.children).toEqual(bodies);
  expect(current["town"].parkedCars.taxi?.instance).toBeUndefined();
  expect(renderer.render).not.toHaveBeenCalled();
  expect(renderer.dispose).toHaveBeenCalledTimes(1);
  expect(win.addEventListener.mock.calls.some(([event]) => event === "keydown")).toBe(false);
  expect(ready).not.toHaveBeenCalled();
  expect(useStore.getState()).toBe(state);
}, 20_000);

it("keeps the first exit covered on failure and supports backing out and retrying the same exit", async () => {
  let missing = true;
  const { fetchFile, loadPalette } = stubCarAssets({
    beforeModel: async (file) => { if (missing && file === "taxi.glb") throw new Error("Taxi unavailable"); },
  });
  const { current, init, renderer, ready, useStore, models } = await start(null, undefined, true);
  const failure = current.onExteriorError = vi.fn();
  await init;
  await expect(models).rejects.toThrow("Taxi unavailable");
  current.exitInterior();
  await until(() => expect(failure).toHaveBeenCalledTimes(1));
  expect(useStore.getState().hud.fade).toBe(1);
  expect(current.zoneId).toBe("airport");
  failure.mock.calls[0][1]();
  await until(() => expect(useStore.getState().hud.fade).toBe(0));
  expect(current.carStats()).toMatchObject({ trafficModels: 0, parkedModels: 0, taxi: false });

  current.exitInterior();
  await until(() => expect(failure).toHaveBeenCalledTimes(2));
  missing = false;
  failure.mock.calls[1][0]();
  await until(() => expect(current.zoneId).toBe("town"));
  renderer.frame?.();
  await until(() => expect(useStore.getState().hud.fade).toBe(0));
  expect(exteriorFrame(renderer.render.mock.calls[1][0]).taxi).toBeDefined();
  expect(fetchFile.mock.calls.filter(([url]) => !url.endsWith("/taxi.glb"))).toHaveLength(8);
  expect(loadPalette).toHaveBeenCalledTimes(1);
  expect(ready).toHaveBeenCalledTimes(1);
}, 20_000);

it.each([undefined, "x08-rosario"])("draws the first visit from the intended exterior camera (link %s)", async (linked) => {
  const pending = deferred();
  stubCarAssets({ beforeModel: () => pending.promise });
  const { current, init, renderer, ready, useStore } = await start(null, linked);
  await until(() => expect(current["carVisuals"]).toBeDefined());
  expect(renderer.render).not.toHaveBeenCalled();
  const talk = vi.spyOn(current, "talkTo");
  if (linked) ready.mockImplementationOnce(() => {
    useStore.getState().setScreen("play");
    current.startScenario(linked, true);
  });
  pending.resolve();
  await init;
  expect(exteriorFrame(renderer.render.mock.calls[0][0]).taxi).toBeDefined();
  if (linked) {
    expect(current["flight"]).toBeNull();
    const rosario = current["npcs"].find(({ id }) => id === "rosario")!;
    expect(current["player"].root.position.distanceTo(rosario.home)).toBeLessThan(4);
    await until(() => expect(useStore.getState().conv).toMatchObject({ active: true, npcId: "rosario", sitId: linked }));
    expect(talk).toHaveBeenCalledExactlyOnceWith("rosario", linked);
    useStore.getState().setConv({ introOpen: false });
    await until(() => expect(useStore.getState().conv.transcript[0]).toMatchObject({ who: "npc", npc: "rosario" }));
    current.closeConversation();
  } else {
    expect(current["flight"]).toBeDefined();
    const [, camera] = renderer.render.mock.calls[0];
    const { flightAt } = await import("../../src/game/flyover");
    const { THEME } = await import("../../src/game/world/theme");
    expect(camera.position.distanceTo(flightAt(THEME.flyover, 0).pos)).toBeLessThan(0.01);
  }
}, 20_000);

it("restores the helm, mooring and saved camera before drawing the town from the boat", async () => {
  const paint = deferred();
  stubFleetAssets(() => paint.promise);
  const berth = { x: -10, z: -100, rot: Math.PI - 0.35 };
  const mooring = { x: -11.5, z: -74.3, rot: Math.PI - 0.25 };
  const { current, init, renderer, ready, useStore } = await start({
    zone: "town", ...berth, boat: { id: "muelle", ...berth, mooring },
  });
  expect(renderer.render).not.toHaveBeenCalled();
  paint.resolve();
  await init;
  expect(current.rides.riding?.id).toBe("muelle");
  expect(current.rides.phase).toBe("on");
  expect(current.rides.riding?.mesh.position.z).toBeCloseTo(berth.z, 0);
  expect(useStore.getState().progress.place?.boat?.mooring).toEqual(mooring);
  expect(useStore.getState().hud.ride).toBe("boat");
  const [scene, cam] = renderer.render.mock.calls[0];
  expect(exteriorFrame(scene).taxi).toBeDefined();
  expect(cam.position.distanceTo(new THREE.Vector3(berth.x, 0, berth.z))).toBeLessThan(20);
  expect(ready).toHaveBeenCalledTimes(1);
}, 20_000);

it("starts inside the grotto and fast-travels under cover to its first exterior draw", async () => {
  const pending = deferred();
  stubCarAssets({ beforeModel: () => pending.promise });
  const { CAVE_ZONE } = await import("../../src/game/cave/groundsPlan");
  const { current, init, renderer, ready, useStore, models } = await start({ zone: CAVE_ZONE, x: 0, z: 0, rot: 0 });
  await init;
  expect(current.zoneId).toBe(CAVE_ZONE);
  expect(current.cave).toBeTruthy();
  current.ride("airport");
  expect(useStore.getState().hud.fade).toBe(1);
  expect(current.zoneId).toBe(CAVE_ZONE);
  expect(renderer.render).toHaveBeenCalledTimes(1);

  pending.resolve();
  await models;
  await until(() => expect(current.zoneId).toBe("town"));
  expect(current.cave).toBeNull();
  expect(useStore.getState().hud.fade).toBe(1);
  renderer.frame?.();
  expect(exteriorFrame(renderer.render.mock.calls[1][0]).taxi).toBeDefined();
  await until(() => expect(useStore.getState().hud.fade).toBe(0));
  expect(ready).toHaveBeenCalledTimes(1);
}, 20_000);
