import { readFileSync } from "node:fs";
import { Color, Group, Material, Mesh, PerspectiveCamera } from "three";
import { afterEach, describe, expect, it, vi } from "vitest";
import { audioKey } from "../../src/audio-key";
import { SEA_EDITION, SEA_UI } from "../../src/content/sea";
import { audioDir } from "../../src/content/voices";
import { audio } from "../../src/game/audio";
import { OpenSea } from "../../src/game/kit/openSea";
import { Rides, type RideHost } from "../../src/game/rides/Rides";
import { pickPrompt } from "../../src/game/road/review";
import { SEA_VIEW } from "../../src/game/sea/look";
import { prepareSea } from "../../src/game/sea/mode";
import { SHORE } from "../../src/game/water";
import { RIDES } from "../../src/game/world/rides";
import { THEME } from "../../src/game/world/theme";
import { makeLanchas } from "../../src/game/world/town";
import { Colliders } from "../../src/game/world/util";
import { emptyProgress, sitProgress } from "../../src/state/progress";
import { useStore } from "../../src/state/store";
import { L } from "../../src/ui/i18n";

describe("Puerto Colibrí open water", () => {
  afterEach(() => vi.restoreAllMocks());

  it("blends the bay colours across increasing positive distances", () => {
    const { shallowTo, midTo } = THEME.sea!;
    expect(Number.isFinite(shallowTo) && Number.isFinite(midTo)).toBe(true);
    expect(shallowTo).toBeGreaterThan(0);
    expect(midTo).toBeGreaterThan(shallowTo);
  });

  it("renders the course water on one indexed disc with the Puerto Colibrí palette", () => {
    const sea = new OpenSea(SEA_VIEW.water, 0, 1500);
    try {
      const { mesh } = sea;
      const { index, attributes } = mesh.geometry;
      expect(mesh).toBeInstanceOf(Mesh);
      expect(mesh.children).toHaveLength(0);
      expect(mesh.material).toBeInstanceOf(Material);
      expect(index).not.toBeNull();
      expect((index?.count ?? attributes.position.count) / 3).toBe(5096);
      expect(mesh.material.uniforms.deep.value).toEqual(new Color("#07677e"));
    } finally {
      sea.dispose();
    }
  });

  it("uses its own edition key and the road's Spanish recordings and English glosses", async () => {
    expect(SEA_EDITION).toEqual({ id: "puerto-colibri", enabled: true });
    expect(L(SEA_UI.title)).toBe("Open sea");
    const ids = ["s65a-passport", "s65b-baggage", "s66-taxi"];
    const progress = emptyProgress(), previous = useStore.getState().progress;
    for (const id of ids) progress.sits[id] = { ...sitProgress(progress, id), completions: 1 };
    const manifest: Record<string, number> = JSON.parse(readFileSync(new URL(`../../public/${audioDir()}manifest.json`, import.meta.url), "utf8"));
    vi.spyOn(audio, "init").mockResolvedValue(undefined);
    vi.spyOn(audio, "hasClip").mockImplementation((voice, speed, text) => !!manifest[audioKey(voice, speed, text)]);
    useStore.setState({ progress });
    try {
      const { first, pool } = await prepareSea();
      expect(ids).toContain(first?.word.situation);
      expect(first?.gap).toBeUndefined();
      expect(first?.options[first.right]).toBe(first?.word.lt);
      const history = pool.listen.slice(0, 7).map((prompt) => ({ prompt, correct: true }));
      expect(history).toHaveLength(7);
      const gap = pickPrompt(pool, [], [], history, 8, Math.random);
      expect(ids).toContain(gap?.word.situation);
      expect(gap?.gap?.sentence.en).toContain("____");
      expect(gap?.options[gap.right]).toBe(gap?.word.en.toLowerCase());
    } finally {
      useStore.setState({ progress: previous });
    }
  });

  it("boards all six lanchas and launches each beached one with the learner at the helm", () => {
    const hulls = makeLanchas(), colliders = new Colliders();
    const player = { root: new Group(), setAnim() {}, update() {} };
    const splash = vi.fn(), launchSound = vi.fn();
    const host = { player, ambient: { rideBoxes: [] }, cam: new PerspectiveCamera(), colliders, outdoors: () => true, splash, launchSound };
    const rides = new Rides(host as unknown as RideHost, { ...RIDES, cars: [] }, hulls);
    expect(rides.list.map(({ id }) => id)).toEqual([
      ...RIDES.boats.map(({ id }) => id),
      ...[1, 2, 3].map((i) => `lancha-afloat-${i}`),
      ...[1, 2, 3].map((i) => `lancha-beached-${i}`),
    ]);
    expect(colliders.circles).toHaveLength(9);
    let time = 0;
    const step = (seconds: number) => {
      const frames = Math.ceil(seconds / 0.025);
      for (let i = 0; i < frames; i++) {
        time += seconds / frames;
        rides.update(seconds / frames, time, null);
      }
    };
    for (const hull of hulls) {
      const ride = rides.find(hull.name)!;
      const { x, z } = ride.home;
      const { deck, helm, wide, beached } = ride.townBoat!;
      expect(ride.mesh).toBe(hull);
      const beside = hull.localToWorld(player.root.position.set(wide + 0.7, deck, helm[1]));
      expect(rides.near(beside.x, beside.z)).toBe(ride);
      if (beached) {
        expect(colliders.blocked(x, z, 0.1)).toBe(true);
        expect(rides.board(ride, false)).toBe(true);
        expect(colliders.blocked(x, z, 0.1)).toBe(false);
        step(0.55);
        expect(rides.phase).toBe("launch");
        step(0.75);
        expect(rides.phase).toBe("launch");
        expect(ride.m.z).toBeLessThan(z);
        expect(ride.m.z).toBeGreaterThan(ride.beach!.launch.z);
        expect(rides.leave()).toBe(false);
        expect(hull.worldToLocal(player.root.position.clone()).z).toBeCloseTo(helm[1]);
        step(0.76);
        expect(rides.phase).toBe("on");
        expect(ride.m.z + ride.m.spec.half).toBeCloseTo(SHORE.edge);
        expect(ride.m.heading).toBeCloseTo(0);
        expect(ride.beach).toBeUndefined();
        expect(rides.leave()).toBe(true);
        step(0.6);
      } else {
        expect(rides.restoreBoat(ride, time)).toBe(true);
        const feet = hull.worldToLocal(player.root.position.clone());
        expect(feet.y).toBeCloseTo(deck);
        expect(feet.z).toBeCloseTo(helm[1]);
        rides.abandon();
      }
      const moored = [ride.m.x, ride.m.z];
      step(25);
      expect([ride.m.x, ride.m.z]).toEqual(moored);
    }
    expect(splash).toHaveBeenCalledTimes(3);
    expect(launchSound).toHaveBeenCalledTimes(3);
    expect(colliders.circles).toHaveLength(0);
  });
});
