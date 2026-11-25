import type { ReactElement } from "react";
import type { StateCreator, StoreApi } from "zustand/vanilla";
import { afterEach, expect, it, vi } from "vitest";
import { testFleetURL } from "../fixtures/car-assets";

type Element = ReactElement<Record<string, any>>;
type Effect = () => void | (() => void);
type Component = (props: Record<string, any>) => Element;
const hooks = vi.hoisted(() => ({
  owner: undefined as { state: any[]; effects: Effect[]; index: number } | undefined,
}));
const imports = vi.hoisted(() => ({ game: vi.fn(), parser: vi.fn(), watch: vi.fn() }));
vi.mock("react", async (actual) => {
  const react = await actual<typeof import("react")>();
  const shim = {
    useState(initial: unknown) {
      const owner = hooks.owner!, index = owner.index++;
      if (!(index in owner.state)) owner.state[index] = typeof initial === "function" ? initial() : initial;
      return [owner.state[index], (next: unknown) => {
        owner.state[index] = typeof next === "function" ? next(owner.state[index]) : next;
      }];
    },
    useEffect(run: Effect) { hooks.owner!.effects.push(run); },
    useRef(initial: unknown) { return { current: initial === null ? {} : initial }; },
  };
  return { ...react, ...shim };
});
// Use the same vanilla store and read snapshots without a DOM renderer.
vi.mock("zustand", async () => {
  const { createStore } = await import("zustand/vanilla");
  return {
    create: (initializer: StateCreator<unknown>) => {
      const store = createStore(initializer);
      return Object.assign((select: (state: unknown) => unknown) => select(store.getState()), store);
    },
    useStore: (store: StoreApi<unknown>, select: (state: unknown) => unknown) => select(store.getState()),
  };
});
vi.mock("virtual:fleet-pack-url", () => ({ default: testFleetURL }));
vi.mock("../../src/game/prefetch", async (actual) => ({
  ...await actual<typeof import("../../src/game/prefetch")>(),
  watchSituations: imports.watch,
}));

function mounted() {
  const owner = { state: [], effects: [] as Effect[], index: 0 };
  return {
    render(component: Component, props = {}) {
      owner.index = 0;
      owner.effects = [];
      hooks.owner = owner;
      try { return component(props); }
      finally { hooks.owner = undefined; }
    },
    effect() { return owner.effects[0]() as () => void; },
  };
}
function child(tree: Element, find: (candidate: Element) => boolean) {
  return (tree.props.children as Element[]).find((el) => el && find(el))!;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

async function setup(search = "", playNow = false) {
  vi.doMock("../../src/game/world/carModelLoader", () => imports.parser());
  vi.doMock("../../src/game/Game", () => imports.game());
  const web = new URL("https://localhost/course/game/" + search);
  const launch = { getItem: vi.fn(() => playNow ? "1" : null), removeItem: vi.fn() };
  const history = { replaceState: vi.fn() };
  const win = { addEventListener: vi.fn(), removeEventListener: vi.fn() };
  vi.stubGlobal("location", web);
  vi.stubGlobal("sessionStorage", launch);
  vi.stubGlobal("history", history);
  vi.stubGlobal("window", win);
  vi.stubGlobal("document", {
    querySelector: () => null,
    body: { classList: { add: vi.fn(), remove: vi.fn() } },
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
  });
  vi.stubGlobal("screen", { width: 390, height: 844 });
  vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  const fetchFile = vi.fn(async () => new Response("test transfer"));
  vi.stubGlobal("fetch", fetchFile);
  const { useStore } = await import("../../src/state/store");
  const { App } = await import("../../src/ui/App");
  const { NPCS } = await import("../../src/content/npcs");
  const { EDITION } = await import("../../src/edition");
  const gameRef = await import("../../src/game/gameRef");
  const store = useStore.getState();
  store.updateProgress((progress) => {
    progress.profile = { name: "Learner", surname: "", gender: "f", look: NPCS.mia.look, lookId: "test" };
  });
  store.setSettings({ play: "town" });
  return { App, useStore, gameRef, fetchFile, win, history, launch, helper: EDITION.helper };
}

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.doUnmock("../../src/game/world/carModelLoader");
  vi.doUnmock("../../src/game/Game");
  vi.resetModules();
});

it("starts no 3D requests from the title or light selection and fetches the pack before either 3D import resolves", async () => {
  const parser = deferred<{ prepareCars: () => Promise<Map<string, never>> }>();
  const gameModule = deferred<{ Game: new () => unknown }>();
  imports.parser.mockReturnValue(parser.promise);
  imports.game.mockReturnValue(gameModule.promise);
  const { App, useStore, fetchFile, gameRef, win } = await setup();
  const root = mounted(), play = mounted();
  const title = child(root.render(App), ({ type }) => (type as Function).name === "Title");
  expect(title).toBeDefined();
  expect(fetchFile).not.toHaveBeenCalled();
  expect(imports.game).not.toHaveBeenCalled();
  expect(imports.parser).not.toHaveBeenCalled();

  useStore.getState().setSettings({ play: "light" });
  title.props.onPlay();
  const { audio } = await import("../../src/game/audio");
  vi.spyOn(audio, "init").mockResolvedValue(undefined);
  const lightComponent = child(root.render(App), ({ type }) => (type as Function).name === "LightPlay");
  const light = mounted();
  light.render(lightComponent.type as Component, lightComponent.props);
  const stopLight = light.effect();
  expect(gameRef.game?.light).toBe(true);
  expect(fetchFile).not.toHaveBeenCalled();
  expect(imports.game).not.toHaveBeenCalled();
  expect(imports.parser).not.toHaveBeenCalled();
  stopLight();
  imports.watch.mockClear();
  const lightDebug = Reflect.get(win, "__ew");

  useStore.getState().setSettings({ play: "town" });
  title.props.onPlay();
  const component = child(root.render(App), ({ type }) => (type as Function).name === "Play");
  play.render(component.type as Component, component.props);
  const stop = play.effect();
  expect(fetchFile.mock.calls).toHaveLength(1);
  expect(fetchFile).toHaveBeenCalledWith(testFleetURL, expect.objectContaining({ signal: expect.any(AbortSignal) }));
  await vi.waitFor(() => expect(imports.parser).toHaveBeenCalledTimes(1));
  await vi.waitFor(() => expect(imports.game).toHaveBeenCalledTimes(1));
  expect(useStore.getState().screen).toBe("loading");
  expect(gameRef.game).toBeNull();
  expect(imports.watch).not.toHaveBeenCalled();
  stop();
  const construct = vi.fn();
  gameModule.resolve({ Game: class { constructor() { construct(); } } });
  parser.resolve({ prepareCars: async () => new Map<string, never>() });
  await import("../../src/game/Game");
  await new Promise<void>((resolve) => setImmediate(resolve));
  expect(construct).not.toHaveBeenCalled();
  expect(Reflect.get(win, "__ew")).toBe(lightDebug);
}, 15_000);

it("preserves the launch flag and linked destination through failures, and publishes once the initialized attempt draws", async () => {
  const firstFrame = deferred<void>();
  const failed = vi.spyOn(console, "error").mockImplementation(() => {});
  const startScenario = vi.fn(), dispose = vi.fn();
  let builds = 0;
  class Game {
    onReady?: () => void;
    init = vi.fn(async (linked?: string | null) => {
      expect(linked).toBe("x08-rosario");
      if (++builds < 3) throw new Error("Startup unavailable");
      await firstFrame.promise;
      this.onReady?.();
    });
    dispose = dispose;
    startScenario = startScenario;
    debugBarista = () => ({ state: "barista" });
    debugBilliards = () => ({ state: "billiards" });
    debugLoteria = () => ({ state: "loteria" });
  }
  imports.parser.mockReturnValue({ prepareCars: async () => new Map() });
  imports.game.mockReturnValue({ Game });
  const { App, useStore, gameRef, win, history, launch, helper } = await setup("?sit=x08-rosario", true);
  const root = mounted(), play = mounted();
  const component = child(root.render(App), ({ type }) => (type as Function).name === "Play");
  expect(history.replaceState).toHaveBeenCalledExactlyOnceWith(undefined, "", "/course/game/");
  expect(launch.removeItem).toHaveBeenCalledExactlyOnceWith("ew-play-now");
  const renderPlay = () => play.render(component.type as Component, component.props);
  const startAttempt = () => { renderPlay(); return play.effect(); };

  for (let attempt = 1; attempt <= 2; attempt++) {
    const stop = startAttempt();
    await vi.waitFor(() => expect(failed).toHaveBeenCalledTimes(attempt));
    expect(useStore.getState().screen).toBe("loading");
    expect(gameRef.game).toBeNull();
    const notice = child(renderPlay(), ({ props }) => props.role === "alert");
    const [_, retry, back] = notice.props.children as Element[];
    expect(retry.props.children).toBe(helper === "en" ? "Try again" : "Bandyti dar kartą");
    expect(back.props.children).toBe(helper === "en" ? "Go back" : "Grįžti");
    retry.props.onClick();
    stop();
  }

  const stop = startAttempt();
  await vi.waitFor(() => expect(builds).toBe(3));
  expect(imports.watch).not.toHaveBeenCalled();
  expect(win).not.toHaveProperty("__ew");
  firstFrame.resolve();
  await vi.waitFor(() => expect(gameRef.game).toBeInstanceOf(Game));
  expect(useStore.getState().screen).toBe("play");
  expect(imports.watch).toHaveBeenCalledExactlyOnceWith(gameRef.game);
  expect(win).toHaveProperty("__ew", expect.objectContaining({
    game: gameRef.game, surf: expect.any(Function), sea: expect.any(Function),
    loteria: { state: "loteria" }, barista: { state: "barista" }, billiards: { state: "billiards" },
  }));
  expect(startScenario).toHaveBeenCalledExactlyOnceWith("x08-rosario", true);
  stop();
  expect(gameRef.game).toBeNull();
  expect(win).not.toHaveProperty("__ew");
  expect(dispose).toHaveBeenCalledTimes(3);
});

it("returns to the title from a failed start while retaining a pending debug launch", async () => {
  const failed = vi.spyOn(console, "error").mockImplementation(() => {});
  const init = vi.fn().mockRejectedValueOnce(new Error("Offline")).mockResolvedValue(undefined);
  imports.game.mockReturnValue({
    Game: class {
      init = init;
      dispose() {}
    },
  });
  imports.parser.mockReturnValue({ prepareCars: async () => new Map() });
  const { App, useStore } = await setup("?billiards=1");
  const root = mounted(), play = mounted();
  const component = child(root.render(App), ({ type }) => (type as Function).name === "Play");
  const renderPlay = () => play.render(component.type as Component, component.props);
  renderPlay();
  const stop = play.effect();
  await vi.waitFor(() => expect(failed).toHaveBeenCalledTimes(1));
  const notice = child(renderPlay(), ({ props }) => props.role === "alert");
  notice.props.children[2].props.onClick();
  stop();
  expect(useStore.getState().screen).toBe("title");
  const title = child(root.render(App), ({ type }) => (type as Function).name === "Title");
  title.props.onPlay();
  renderPlay();
  const stopAgain = play.effect();
  await vi.waitFor(() => expect(init).toHaveBeenCalledTimes(2));
  expect(init.mock.calls).toEqual([[null, "billiards"], [null, "billiards"]]);
  stopAgain();
});
