import * as THREE from "three";
import { afterEach, expect, it, vi } from "vitest";
import { loadSituation } from "../../src/content/situations/catalog";
import { audio } from "../../src/game/audio";
import { CameraRig } from "../../src/game/camera";
import { createCharacter } from "../../src/game/characters";
import { Game } from "../../src/game/Game";
import { Colliders } from "../../src/game/world/util";
import { useStore } from "../../src/state/store";

const look = { skin: "#f2d3bd", hair: { style: "short" as const, color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" };

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("opens the live picker actor at the shop, pump and startup board on repeat visits", async () => {
  const initial = useStore.getState();
  const ids = ["x05-tienda", "s71b-gas", "p18-startup"];
  await Promise.all(ids.map(loadSituation));
  vi.useFakeTimers();
  const context = new Proxy({
    measureText: (s: string) => ({ width: s.length * 10 }),
    createLinearGradient: () => ({ addColorStop() {} }),
  }, { get: (target, key) => Reflect.get(target, key) ?? (() => {}) });
  class Canvas {
    width = 0;
    height = 0;
    getContext() { return context; }
  }
  const rect = (width = 0, height = 0, top = 0, left = 0) => ({ left, top, width, height, right: left + width, bottom: top + height });
  let wide = false;
  const panel = { getBoundingClientRect: () => wide ? rect(627, 378, 6, 211) : rect(390, 633, 211), getAnimations: () => [], matches: () => true };
  const root = new EventTarget();
  Object.assign(root, { querySelector: () => panel, querySelectorAll: () => [], appendChild() {}, matches: () => false });
  const canvas = { closest: () => root, getBoundingClientRect: () => wide ? rect(844, 390) : rect(390, 844) };
  vi.stubGlobal("HTMLCanvasElement", Canvas);
  vi.stubGlobal("document", {
    createElement: (tag: string) => tag === "canvas" ? new Canvas() : {
      remove() {}, style: {}, matches: () => false, getBoundingClientRect: () => rect(),
    },
    addEventListener() {}, removeEventListener() {},
  });
  vi.stubGlobal("window", {});
  vi.stubGlobal("innerWidth", 390);
  vi.stubGlobal("innerHeight", 844);
  vi.stubGlobal("getComputedStyle", () => ({ display: "block", visibility: "visible", opacity: "1", transform: "none", filter: "none" }));
  vi.stubGlobal("requestAnimationFrame", (read: FrameRequestCallback) => setTimeout(() => read(performance.now()), 16));
  vi.stubGlobal("cancelAnimationFrame", clearTimeout);
  vi.stubGlobal("MutationObserver", class { observe() {} disconnect() {} });
  vi.spyOn(audio, "prefetch").mockResolvedValue(undefined);
  vi.spyOn(audio, "play").mockReturnValue(new Promise(() => {}));
  vi.spyOn(audio, "stop").mockImplementation(() => {});

  // Supply the renderer-independent services and run the real entry, spawning, session and close methods.
  const noop = () => {};
  const town = { id: "town", group: new THREE.Group(), colliders: new Colliders() };
  const scene = new THREE.Scene(), npcLayer = new THREE.Group();
  const player = createCharacter(look);
  scene.add(town.group, npcLayer, player.root);
  const game = Object.assign(Object.create(Game.prototype), {
    zone: town, zones: new Map([[town.id, town]]), scene, npcLayer, player, npcs: [], extras: [],
    tagLayer: { appendChild: noop }, ambient: { group: new THREE.Group() },
    sky: new THREE.Group(), hemi: new THREE.HemisphereLight(), sun: new THREE.DirectionalLight(),
    modes: { exit: noop, get: noop, owns: noop, cancelQueued: noop, launchQueued: noop },
    quests: { handlesNpc: () => false, stopReplay: noop },
    rides: { healCrashes: noop, group: new THREE.Group() }, phone: { dismiss: noop },
    steer: { carry: noop, reset: noop }, gait: { sync: noop }, fader: { reset: noop },
    keepsake: { clear: noop }, endRide: noop, surface: noop,
    hop: { land: noop }, rig: new CameraRig(390 / 844),
    vel: new THREE.Vector3(), moveVel: new THREE.Vector3(),
    sceneDelays: new Set(), zoneTimers: new Set(), keys: new Set(), conversationLoads: 0, dropIn: 0,
    phoneTask: noop, currentObjective: noop, refreshObjective: noop, observeStreetAndPhone: noop, savePlace: noop,
    renderer: { domElement: canvas },
  });
  useStore.setState({ settings: { ...initial.settings, scenes: false } });

  async function check(sit: string, zone: string, npc: string, at: [number, number], home: [number, number]) {
    // Sproutly's two sleeping-dog billboards are rendered objects with camera-dependent raycasts.
    if (zone === "sproutly" && game.zone.id === zone) {
      const sprites: THREE.Sprite[] = [];
      game.zone.group.traverseVisible((node: THREE.Object3D) => {
        const sprite = node as THREE.Sprite;
        if (sprite.isSprite) sprites.push(sprite);
      });
      expect(sprites).toHaveLength(2);
      for (const sprite of sprites) sprite.raycast = () => { throw new Error("Framing queried a billboard as a mesh"); };
    }
    await vi.advanceTimersByTimeAsync(400);
    expect(game.zone.id).toBe(zone);
    expect([player.root.position.x, player.root.position.z]).toEqual(at);
    const actor = game.npcs.find((n: { id: string }) => n.id === npc);
    expect(actor).toBeDefined();
    expect([actor.home.x, actor.home.z]).toEqual(home);
    expect(game.talkNpc).toBe(actor);
    expect(game.talkCast).toContain(actor);
    expect(game.rig.mode).toBe("talk");
    useStore.getState().setConv({ introOpen: false });
    await vi.advanceTimersByTimeAsync(0);
    const conv = useStore.getState().conv;
    expect(conv).toMatchObject({ active: true, sitId: sit, hostId: npc, npcId: npc, phase: "npc" });
    expect(conv.transcript.find((line) => line.id === conv.speaking)).toMatchObject({ who: "npc", npc });
    await vi.dynamicImportSettled();
    await vi.advanceTimersByTimeAsync(32);
    expect(game.rig.talk, sit).toBeTruthy();
    expect(game.rig.cam.position.toArray().every(Number.isFinite)).toBe(true);
    return conv.run;
  }

  const paco = () => check("x05-tienda", "gas-station", "tienda", [-3, -1.7], [-3, -3.8]);
  const tono = () => check("p18-startup", "sproutly", "tyler", [2.2, -3.75 + 2.3], [2.2, -3.75]);
  function rotate(landscape: boolean, width: number, height: number) {
    wide = landscape;
    vi.stubGlobal("innerWidth", width);
    vi.stubGlobal("innerHeight", height);
    game.rig.resize(width, height, landscape);
    game.talkCamera.resize();
    // Game draws after update, even if the observer's queued RAF has yet to run.
    game.talkCamera.update(1 / 60);
    expect(game.talkCamera.layout).toMatchObject({ width, height });
    expect(game.rig.cam.view).toMatchObject({ enabled: true, fullWidth: width, fullHeight: height });
  }
  try {
    game.startScenario("x05-tienda");
    const firstShop = await paco();
    rotate(true, 844, 390);
    rotate(false, 390, 844);
    game.restartScenario();
    expect(await paco()).toBeGreaterThan(firstShop);
    game.closeConversation();
    expect(useStore.getState().conv.active).toBe(false);
    game.startScenario("p18-startup");
    const firstStartup = await tono();
    game.startScenario("s71b-gas");
    await check("s71b-gas", "town", "dot", [111.6, 8.3], [111.35, 6.1]);
    game.startScenario("p18-startup");
    expect(await tono()).toBeGreaterThan(firstStartup);
    game.closeConversation();
    game.startScenario("x05-tienda");
    expect(await paco()).toBeGreaterThan(firstShop);
  } finally {
    game.closeConversation();
    useStore.setState(initial);
  }
});
