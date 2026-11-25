import * as THREE from "three";
import { afterEach, expect, it, vi } from "vitest";
import type { Game } from "../src/game/Game";
import type { Progress } from "../src/state/progress";
import { buildFleetPack } from "../tools/fleet-pack-plugin";
import { townCanvasDocument } from "../tools/town-canvas-stub";
import { bakeTownCollision } from "../tools/town-collision-data";
import { stubCarAssets, testFleetURL } from "./fixtures/car-assets";

const renderers: FakeRenderer[] = [];

function element() {
  return { style: {}, appendChild: vi.fn(), addEventListener: vi.fn(), remove: vi.fn(),
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
  frame: (() => void) | null = null;
  setAnimationLoop = vi.fn((frame: (() => void) | null) => { this.frame = frame; });
  render = vi.fn((_scene: THREE.Scene, _camera: THREE.Camera) => { this.info.render.frame++; });
  constructor() { renderers.push(this); }
}

const fleet = vi.hoisted(() => ({ url: undefined as string | undefined }));
const collision = vi.hoisted(() => ({ url: undefined as string | undefined }));
vi.mock("virtual:fleet-pack-url", () => ({ get default() { return fleet.url; } }));
vi.mock("virtual:town-collision-url", () => ({ get default() { return collision.url; } }));
vi.mock("three", async (actual) => ({
  ...await actual<typeof THREE>(),
  WebGLRenderer: class { constructor() { return new FakeRenderer(); } },
}));

function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((ok, fail) => { resolve = ok; reject = fail; });
  return { promise, resolve, reject };
}

let game: Game | undefined;
let packed: Promise<Uint8Array<ArrayBuffer>> | undefined;

function stubFleetAssets(options: { beforePack?: Promise<void>; beforePalette?: () => Promise<void> } = {}) {
  fleet.url = testFleetURL;
  packed ??= buildFleetPack(process.cwd()).then((bytes) => Uint8Array.from(bytes));
  return stubCarAssets({
    fleetResponse: async () => {
      await options.beforePack;
      return new Response(await packed);
    },
    beforePalette: options.beforePalette,
  });
}

async function start(place: Progress["place"], linked?: string, reducedMotion = false) {
  const canvas = townCanvasDocument();
  const doc = { baseURI: "https://game.example/lesson/", hidden: false, querySelector: () => null, querySelectorAll: () => [],
    createElement: (tag: string) => tag === "canvas" ? canvas.createElement() : element(),
    addEventListener: vi.fn(), removeEventListener: vi.fn() };
  const win = { devicePixelRatio: 2, addEventListener: vi.fn(), removeEventListener: vi.fn() };
  vi.stubGlobal("window", win);
  vi.stubGlobal("document", doc);
  vi.stubGlobal("screen", { width: 390, height: 844 });
  vi.stubGlobal("location", { search: "" });
  vi.stubGlobal("matchMedia", () => ({ matches: reducedMotion }));

  const [{ Game }, { useStore }, { emptyProgress }, { NPCS }, { audio }, { prepareExteriorCars }, { OcclusionField }] = await Promise.all([
    import("../src/game/Game"), import("../src/state/store"), import("../src/state/progress"), import("../src/content/npcs"),
    import("../src/game/audio"), import("../src/game/exteriorAssets"), import("../src/game/occlusion"),
  ]);
  vi.spyOn(audio, "init").mockResolvedValue(undefined);
  useStore.setState({ progress: { ...emptyProgress(), profile: {
    name: "Learner", surname: "", gender: "f", look: NPCS.mia.look, lookId: "test",
  }, place }, settings: { ...useStore.getState().settings, quality: "high", phoneCalls: false } });
  const models = prepareExteriorCars();
  const current = game = new Game(element() as unknown as HTMLElement, element() as unknown as HTMLDivElement, models);
  const renderer = renderers.at(-1)!;
  const ready = vi.fn(() => { useStore.getState().setScreen("play"); });
  current.onReady = ready;
  const addGeometry = vi.spyOn(OcclusionField.prototype, "addGeometry");
  const init = current.init(linked);
  void init.catch(() => {});
  return { current, renderer, models, ready, init, useStore, win, addGeometry };
}

function exteriorFrame(scene: THREE.Scene) {
  const island = scene.getObjectByName("lighthouse-island");
  if (!island) throw new Error("Exterior frame is missing the lighthouse island");
  const traffic: THREE.InstancedMesh[] = [], parking: THREE.Mesh[] = [];
  let taxi: THREE.Mesh | undefined;
  scene.traverseVisible((object) => {
    if (object.name.startsWith("traffic-")) traffic.push(object as THREE.InstancedMesh);
    if (object.name === "parked-car-models") parking.push(object as THREE.Mesh);
    if (object.name === "mode-car-taxi") taxi = object.getObjectByName("body") as THREE.Mesh;
  });
  return { island, traffic, parking, taxi };
}

async function until(assert: () => void) {
  await vi.waitFor(assert, { timeout: 2000, interval: 10 });
}

afterEach(() => {
  game?.dispose();
  game = undefined;
  renderers.length = 0;
  fleet.url = undefined;
  collision.url = undefined;
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.resetModules();
});

it("drops a collision reply for a disposed Game and restores in a fresh Game", async () => {
  collision.url = "./assets/mh-town-collision-test.bin";
  const workers: CollisionWorker[] = [];
  class CollisionWorker extends EventTarget {
    postMessage = vi.fn();
    terminate = vi.fn();
    constructor() { super(); workers.push(this); }
    deliver(data: ArrayBuffer) { this.dispatchEvent(new MessageEvent("message", { data })); }
  }
  vi.stubGlobal("Worker", CollisionWorker);
  stubCarAssets();
  const place = { zone: "town", x: 0, z: 0, rot: 0 };
  const abandoned = await start(place);
  await until(() => expect(abandoned.current["town"]).toBeDefined());
  expect(workers).toHaveLength(1);
  expect(workers[0].postMessage).toHaveBeenCalledExactlyOnceWith("https://game.example/lesson/assets/mh-town-collision-test.bin");
  abandoned.current.dispose();

  const { buildTown } = await import("../src/game/world/town");
  const { decodeTownCollision } = await import("../src/game/townCollisionTransport");
  const bytes = await decodeTownCollision(Uint8Array.from(bakeTownCollision(buildTown()).compressed).buffer);
  workers[0].deliver(bytes.slice(0));
  await abandoned.init;
  expect(workers[0].terminate).toHaveBeenCalledOnce();
  expect(abandoned.current["field"]).toBeUndefined();
  expect(abandoned.ready).not.toHaveBeenCalled();

  const retry = await start(place);
  expect(workers).toHaveLength(2);
  workers[1].deliver(bytes);
  await retry.init;
  expect(workers[1].terminate).toHaveBeenCalledOnce();
  expect(retry.current["field"].lo.buffer).toBe(bytes);
  expect(retry.current["ledges"]?.dynamic).toBeTypeOf("function");
  expect(retry.ready).toHaveBeenCalledOnce();
}, 10000);

it("draws the saved island camera with the ten real models and one palette before publishing readiness", async () => {
  const traffic = deferred(), parking = deferred(), paint = deferred();
  const trafficFiles = ["sedan.glb", "suv.glb", "van.glb", "truck.glb"];
  const { palette, fetchFile, loadPalette } = stubCarAssets({
    beforeModel: (file) => trafficFiles.includes(file) ? traffic.promise : parking.promise, beforePalette: () => paint.promise,
  });
  const { LIGHTHOUSE_ISLAND: island } = await import("../src/game/world/island");
  const { PARKED_CARS } = await import("../src/game/world/layout");
  const { current, renderer, addGeometry, init, ready, useStore, win } = await start({
    zone: "town", ...island!.center, rot: 0.71,
  });

  expect(current.init()).toBe(init);
  await until(() => {
    expect(fetchFile).toHaveBeenCalledTimes(10);
    expect(loadPalette).toHaveBeenCalledTimes(1);
    expect(addGeometry).toHaveBeenCalled();
  });
  expect(renderer.render).not.toHaveBeenCalled();
  parking.resolve();
  await Promise.resolve();
  expect(ready).not.toHaveBeenCalled();
  paint.resolve();
  await until(() => expect(current.carStats().loadedCarModels).toBe(6));
  expect(renderer.render).not.toHaveBeenCalled();
  expect(win.addEventListener.mock.calls.some(([event]) => event === "keydown")).toBe(false);

  traffic.resolve();
  await init;
  expect(ready).toHaveBeenCalledTimes(1);
  expect(renderer.render).toHaveBeenCalledTimes(1);
  expect(renderer.render.mock.invocationCallOrder[0]).toBeLessThan(ready.mock.invocationCallOrder[0]);
  expect(useStore.getState().screen).toBe("play");
  expect(current.carStats()).toMatchObject({ loadedCarModels: 10, trafficModels: 8, parkedModels: PARKED_CARS.length, taxi: true });
  const [scene, camera] = renderer.render.mock.calls[0];
  const first = exteriorFrame(scene);
  expect(first.island.visible).toBe(true);
  expect(first.island.getObjectByName("lighthouse-island-gull")?.position.z).toBeLessThan(-60);
  expect(scene.getObjectByName("ride-boat-beach")?.position.z).toBeLessThan(-60);
  expect(camera.position.distanceTo(new THREE.Vector3(island!.center.x, island!.y, island!.center.z))).toBeLessThan(20);
  expect(first.traffic).toHaveLength(6);
  expect(first.traffic.every((mesh) => mesh.count > 0)).toBe(true);
  expect(first.parking).toHaveLength(2);
  expect(first.taxi?.isMesh).toBe(true);
  for (const mesh of [...first.traffic, ...first.parking, first.taxi!]) {
    expect((mesh.material as THREE.MeshLambertMaterial).map).toBe(palette);
    expect(mesh.castShadow).toBe(true);
  }
  const islandGeometry = current["islandScene"]!.ground.geometry;
  expect(addGeometry.mock.calls.filter(([geometry]) => geometry === islandGeometry)).toHaveLength(1);
  expect(current["islandScene"]!.keeper.watch).toBe(current["learnerAt"]);
  const warmup = vi.spyOn(current.rides, "compileCrashShaders");
  current.setJoystick(1, 0);
  renderer.frame?.();
  expect(warmup).not.toHaveBeenCalled();
  const second = exteriorFrame(scene);
  expect(second.island).toBe(first.island);
  expect(second.taxi).toBe(first.taxi);
  for (const [i, mesh] of second.traffic.entries()) expect(mesh).toBe(first.traffic[i]);
  for (const [i, mesh] of second.parking.entries()) expect(mesh).toBe(first.parking[i]);
  expect(fetchFile).toHaveBeenCalledTimes(10);
  expect(ready).toHaveBeenCalledTimes(1);
}, 10000);

it("draws the reduced-motion airport immediately and holds an instant exit until the first completed outdoor draw", async () => {
  const paint = deferred();
  const { fetchFile, loadPalette, palette } = stubFleetAssets({ beforePalette: () => paint.promise });
  const { current, init, renderer, ready, useStore, models } = await start(null, undefined, true);
  await init;
  expect(current.zoneId).toBe("airport");
  expect(ready).toHaveBeenCalledTimes(1);
  expect(renderer.render).toHaveBeenCalledTimes(1);
  await until(() => expect(loadPalette).toHaveBeenCalledTimes(1));

  const entered = vi.fn();
  current.enterZone("town", { x: 28, z: -14.6, rot: Math.PI }, true, undefined, entered);
  current.enterZone("town", { x: 0, z: 0, rot: 0 }, true);
  await new Promise((resolve) => setTimeout(resolve, 460));
  expect(current.zoneId).toBe("airport");
  expect(useStore.getState().hud.fade).toBe(1);
  expect(entered).not.toHaveBeenCalled();

  paint.resolve();
  await models;
  await until(() => expect(current.zoneId).toBe("town"));
  expect(renderer.render).toHaveBeenCalledTimes(1);
  expect(entered).not.toHaveBeenCalled();
  expect(useStore.getState().hud.fade).toBe(1);
  renderer.frame?.();
  const scene = renderer.render.mock.calls[1][0];
  const first = exteriorFrame(scene);
  expect(first.taxi?.isMesh).toBe(true);
  expect(first.traffic.filter(({ name }) => name === "traffic-wheels")).toHaveLength(2);
  expect(scene.getObjectByName("mode-car-taxi")?.getObjectByName("wheel-front-left")).toBeInstanceOf(THREE.Mesh);
  for (const mesh of [...first.traffic, ...first.parking, first.taxi!]) {
    expect((mesh.material as THREE.MeshLambertMaterial).map).toBe(palette);
  }
  expect(fetchFile.mock.calls.map(([url]) => url)).toEqual([testFleetURL]);
  expect(loadPalette.mock.calls[0][0]).toMatch(/^blob:/);
  await until(() => expect(useStore.getState().hud.fade).toBe(0));
  expect(entered).toHaveBeenCalledTimes(1);
  expect(ready).toHaveBeenCalledTimes(1);
}, 10000);

it("keeps a linked outdoor conversation under the initial logo and ignores completions after disposal", async () => {
  const pending = deferred();
  const { fetchFile } = stubFleetAssets({ beforePack: pending.promise });
  const { current, init, renderer, ready, useStore, models, win } = await start(
    { zone: "airport", x: -14, z: -1, rot: Math.PI }, "s66-taxi",
  );
  await until(() => expect(current["islandScene"]).toBeDefined());
  expect(current.zoneId).toBeUndefined();
  current.dispose();
  const state = useStore.getState();
  const bodies = current["ambient"].group.children.slice();

  pending.resolve();
  await models;
  await init;
  expect(fetchFile.mock.calls.map(([url]) => url)).toEqual([testFleetURL]);
  expect(current["ambient"].group.children).toEqual(bodies);
  expect(current["town"].parkedCars.taxi?.instance).toBeUndefined();
  expect(renderer.render).not.toHaveBeenCalled();
  expect(win.addEventListener.mock.calls.map(([event]) => event)).toEqual(["storage"]);
  expect(ready).not.toHaveBeenCalled();
  expect(useStore.getState()).toBe(state);
}, 10000);

it("returns to the indoor scene after a real GLB error and retries only the failed model", async () => {
  let missing = true;
  const { fetchFile, loadPalette } = stubCarAssets({
    beforeModel: async (file) => { if (missing && file === "taxi.glb") throw new Error("Offline taxi request"); },
  });
  vi.spyOn(console, "warn").mockImplementation(() => {});
  const { current, init, renderer, ready, useStore, models } = await start(
    { zone: "town", x: 0, z: 0, rot: 0 }, "s72-cafe",
  );
  await init;
  await expect(models).rejects.toThrow("Offline taxi request");
  expect(current.zoneId).toBe("sunny-cup");
  expect(renderer.render).toHaveBeenCalledTimes(1);
  current.exitInterior();
  expect(useStore.getState().hud.fade).toBe(1);
  await until(() => expect(useStore.getState().hud.fade).toBe(0));
  expect(current.zoneId).toBe("sunny-cup");
  expect(current.carStats()).toMatchObject({ trafficModels: 0, parkedModels: 0, taxi: false });
  expect(useStore.getState().townToasts.some(({ toast }) => toast.title === "Nepavyko įkelti miesto")).toBe(true);

  missing = false;
  current.exitInterior();
  await until(() => expect(current.zoneId).toBe("town"));
  renderer.frame?.();
  await until(() => expect(useStore.getState().hud.fade).toBe(0));
  expect(exteriorFrame(renderer.render.mock.calls[1][0]).taxi).toBeDefined();
  expect(fetchFile).toHaveBeenCalledTimes(11);
  expect(loadPalette).toHaveBeenCalledTimes(1);
  expect(ready).toHaveBeenCalledTimes(1);
}, 10000);

it.each([undefined, "s66-taxi"])("begins the first visit at the intended exterior camera (link %s)", async (linked) => {
  const pending = deferred();
  stubCarAssets({ beforeModel: () => pending.promise });
  const { current, init, renderer, ready } = await start(null, linked);
  await until(() => expect(current["islandScene"]).toBeDefined());
  expect(renderer.render).not.toHaveBeenCalled();

  const talk = vi.spyOn(current, "talkTo").mockImplementation(() => {});
  if (linked) ready.mockImplementationOnce(() => current.startScenario(linked, true));
  pending.resolve();
  await init;
  expect(exteriorFrame(renderer.render.mock.calls[0][0]).taxi).toBeDefined();
  if (linked) {
    expect(current["flight"]).toBeNull();
    const vinnie = current["npcs"].find(({ id }) => id === "vinnie")!;
    expect(current["player"].root.position.distanceTo(vinnie.home)).toBeLessThan(4);
    await until(() => expect(talk).toHaveBeenCalledExactlyOnceWith("vinnie", linked));
  } else {
    expect(current["flight"]).toBeDefined();
    const [, camera] = renderer.render.mock.calls[0];
    const { flightAt } = await import("../src/game/flyover");
    const { THEME } = await import("../src/game/world/theme");
    expect(camera.position.distanceTo(flightAt(THEME.flyover, 0).pos)).toBeLessThan(0.01);
  }
}, 10000);

it.each(["GLB", "palette"])("bounds a stalled %s request and retries the failed preparation", async (asset) => {
  vi.useFakeTimers();
  vi.spyOn(console, "error").mockImplementation(() => {});
  const palette = deferred();
  let stalled = true;
  const { fetchFile, loadPalette } = stubCarAssets({
    beforeModel: async (file, signal) => {
      if (stalled && asset === "GLB" && file === "taxi.glb") await new Promise((_, reject) => {
        signal?.addEventListener("abort", () => reject(signal.reason), { once: true });
      });
    },
    beforePalette: () => stalled && asset === "palette" ? palette.promise : Promise.resolve(),
  });
  const { prepareExteriorCars } = await import("../src/game/exteriorAssets");
  const prepared = prepareExteriorCars();
  const failure = expect(prepared).rejects.toThrow(asset === "GLB" ? /abort/i : "Car palette timed out");
  await until(() => expect(loadPalette).toHaveBeenCalledTimes(1));
  await vi.advanceTimersByTimeAsync(10000);
  await failure;

  stalled = false;
  const retry = prepareExteriorCars();
  expect(retry).not.toBe(prepared);
  palette.resolve();
  expect((await retry).size).toBe(10);
  expect(fetchFile).toHaveBeenCalledTimes(asset === "GLB" ? 11 : 20);
  expect(loadPalette).toHaveBeenCalledTimes(asset === "GLB" ? 1 : 2);
}, 10000);
