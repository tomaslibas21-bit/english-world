import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DirectionalLight, Group, HemisphereLight, Mesh, PlaneGeometry, ShaderMaterial, type Object3D } from "three";
import { afterEach, describe, expect, it, vi } from "vitest";
import { boardFaces } from "../src/game/kit/boardFaces";
import { audio } from "../src/game/audio";
import { CameraRig } from "../src/game/camera";
import { Rides, type RideHost } from "../src/game/rides/Rides";
import { CRUISE_SPEED, FIRST_GATE } from "../src/game/sea/course";
import type { SeaHost } from "../src/game/sea/entry";
import { prepareSea, SeaMode } from "../src/game/sea/mode";
import { useSea } from "../src/game/sea/store";
import { BAY } from "../src/game/water";
import { RIDES } from "../src/game/world/rides";
import { makeBoats } from "../src/game/world/town";
import { useStore } from "../src/state/store";

vi.mock("../src/convo/speech", async (load) => ({
  ...await load<typeof import("../src/convo/speech")>(),
  speechSupported: () => true,
}));

vi.mock("../src/game/sea/store", async (load) => {
  const store = await load<typeof import("../src/game/sea/store")>();
  return { ...store, useSea: Object.assign(() => store.useSea.getState(), store.useSea) };
});

vi.mock("../src/state/store", async (load) => {
  const store = await load<typeof import("../src/state/store")>();
  type State = ReturnType<typeof store.useStore.getState>;
  return { ...store, useStore: Object.assign((select: (state: State) => unknown) => select(store.useStore.getState()), store.useStore) };
});

describe("rendering the first sea approach", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it.each([[1280, 800], [390, 844], [390, 664]])("draws three boards and mounts three controls at 25 m on %ix%i", async (w, h) => {
    vi.stubGlobal("location", { search: "" });
    const { Hud } = await import("../src/ui/Hud");
    vi.spyOn(audio, "init").mockResolvedValue(undefined);
    const prepared = await prepareSea();
    vi.stubGlobal("window", { matchMedia: (query: string) => ({ matches: query.includes("900px") ? w >= 900 : w < h }) });
    vi.stubGlobal("document", {
      documentElement: {},
      createElement: () => ({ getContext: () => ({ measureText: (text: string) => ({ width: text.length * 45 }) }) }),
    });
    vi.spyOn(audio, "play").mockResolvedValue(true);
    let time = 10;

    const rig = new CameraRig(w / h), player = { root: new Group(), update() {} };
    const rides = new Rides({ ambient: { rideBoxes: [] } } as unknown as RideHost,
      { ...RIDES, cars: [], boats: [] }, [makeBoats()[0]]);
    const source = rides.list[0];
    const z = BAY.z0 + 2.64;
    source.m.set(-10, z, Math.PI);
    source.m.speed = CRUISE_SPEED;
    source.mesh.position.set(-10, 0, z);
    source.mesh.rotation.y = Math.PI;
    player.root.position.set(-10, 0.62, z + 2.16);
    rig.cam.position.set(-10, 7.4, z + 13.6);
    rig.cam.lookAt(-10, 1.6, z);
    if (w < h) rig.cam.setViewOffset(w, h, 0, -0.12 * h, w, h);
    const sea = new Mesh(new PlaneGeometry(), new ShaderMaterial({ uniforms: { uTime: { value: 0 } } }));
    const env = { sky: new Mesh(), sea, fog: null, hemi: new HemisphereLight(), sun: new DirectionalLight() };
    const hud = useStore.getState().hud;
    const host = {
      player: () => player, rig, rides, time: () => time, environment: () => env, portrait: () => w < h,
      entered: () => useStore.getState().setHud({ modeScreen: { kind: "menu", id: "sea" }, showTouch: w < h }),
      left: () => useStore.getState().setHud(hud),
      clearTownHud() {}, returnBoat() {},
    } as unknown as SeaHost;
    const word = { en: "boat", lt: "valtis", situation: "s66-taxi", clip: { say: "boat", voice: "", speed: 1, male: false } };
    // The boat sails down the center, so desktop exercises a correct pass and the phones exercise a miss.
    const prompt = { word, options: ["Jis oranžinis", "Jis sidabrinis", "Jis violetinis"], right: w < h ? 0 : 1 };
    const mode = new SeaMode(host, source, { ...prepared, pick: () => prompt, first: prompt });
    const renderer = { render: (scene: Object3D) => scene.updateMatrixWorld() };

    function sailFor(seconds: number) {
      const frames = Math.ceil(seconds / 0.05), dt = seconds / frames;
      for (let frame = 0; frame < frames; frame++) {
        time += dt;
        mode.update({ dt, time, x: 0, y: 0, brake: false, blocked: false });
        mode.render(renderer, w, h);
      }
    }

    try {
      mode.start();
      mode.render(renderer, w, h);
      expect(renderToStaticMarkup(createElement(Hud))).toContain('<header class="road-header"');

      sailFor((FIRST_GATE - 25) / CRUISE_SPEED);
      expect(mode.debug().gateDistance).toBeCloseTo(25);
      const { boards, gateId, width, height, renderSerial } = boardFaces.sea.debug();
      expect(gateId).toBe(useSea.getState().gateId);
      expect([width, height]).toEqual([w, h]);
      expect(renderSerial).toBeGreaterThan(10);
      expect(boards.map(({ lane }) => lane)).toEqual([0, 1, 2]);
      expect(boards.every(({ visible, opacity, world }) => visible && opacity === 1 && world.length === 16)).toBe(true);

      const html = renderToStaticMarkup(createElement(Hud));
      expect(html.match(/<button[^>]*class="road-gate"/g)).toHaveLength(3);
      expect(html).toContain('class="say-it-mic"');
      if (w >= 900) expect(html).toMatch(/<span[^>]*>Jis sidabrinis<\/span>/);

      sailFor(25 / CRUISE_SPEED + 0.05);
      const passed = renderToStaticMarkup(createElement(Hud));
      expect(useSea.getState().feedback?.correct).toBe(w >= 900);
      expect(useSea.getState().sayIt).toBeUndefined();
      expect(passed).not.toContain('class="say-it-mic"');
      expect(passed).toMatch(/<div class="road-gate" data-lane="1" aria-label="Jis sidabrinis"/);
      expect(passed.match(/class="road-gate"/g)).toHaveLength(1);
    } finally {
      mode.exit(true);
    }
  }, 15_000);
});
