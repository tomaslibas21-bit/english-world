import { Group, Mesh, PerspectiveCamera, Vector3 } from "three";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { EDITION } from "../../src/edition";
import { loadSituation } from "../../src/content/situations/catalog";
import { CameraRig } from "../../src/game/camera";
import { CenoteAnimals } from "../../src/game/cenoteTour/animals";
import { CenoteTourEntry, type CenoteTourHost } from "../../src/game/cenoteTour/entry";
import { CenoteTourMode, SNORKEL_FOV } from "../../src/game/cenoteTour/mode";
import { aimSwim, swimAt } from "../../src/game/cenoteTour/route";
import { useCenoteTour } from "../../src/game/cenoteTour/store";
import type { GameCharacter } from "../../src/game/characters";
import { ModeRegistry, type ModeScreen } from "../../src/game/kit/modes";
import { Undersea } from "../../src/game/rides/undersea";
import { BAY, floorY, SEA_LEVEL, SHORE, waterY } from "../../src/game/water";
import { CENOTE_ROUTE } from "../../src/game/world/cenoteTour";
import { RIDES } from "../../src/game/world/rides";
import { useCards } from "../../src/state/cards";
import { readPlayStats } from "../../src/state/playStats";
import { useStore } from "../../src/state/store";

const audio = vi.hoisted(() => ({ play: vi.fn(), stop: vi.fn(), clipDuration: vi.fn<() => number | null>(() => null) }));
vi.mock("../../src/game/audio", () => ({ audio }));
const id = "x14-cenote";
const lt = EDITION.helper === "lt";
const savedAnswers: Record<string, [string, string]> = {
  see_yes: ["Yes, I see them.", "Taip, matau."],
  see_where: ["Where are they?", "Kur jos?"],
  see_one: ["I see one.", "Matau vieną."],
  see_two: ["I see two.", "Matau du."],
};
const route = CENOTE_ROUTE!;
beforeAll(() => loadSituation(id).then(() => undefined));
afterEach(() => { vi.clearAllMocks(); vi.unstubAllGlobals(); });
const tick = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
const playCount = () => readPlayStats(useStore.getState().progress).games["cenote-tour"] ?? 0;

function character() {
  const root = new Group();
  const ch: GameCharacter = {
    root, rightHand: new Group(), height: 1.7, anim: "idle", update: vi.fn(), talk: vi.fn(),
    setAnim: (anim) => { ch.anim = anim; },
  };
  return ch;
}

function hostFixture() {
  let screen: ModeScreen | null = null;
  const modes = new ModeRegistry({ read: () => screen, set: (value) => { screen = value; } });
  const world = new Group(), player = character(), guide = character(), rig = new CameraRig(390 / 844);
  const dry = [-120.65, 0, -1.4] as const;
  guide.root.position.set(-122.4, 0, -1.4);
  guide.root.rotation.y = Math.PI / 2;
  let time = 0, paused = false, curtain = 0;
  const host = {
    player: () => player, guide: () => guide, rig, paused: () => paused,
    curtain: (amount: number) => { curtain = amount; }, canStart: () => true, time: () => time,
    entered: (mode: string) => modes.entered(mode), left: (mode: string) => modes.left(mode),
    place: (x: number, z: number, rot: number) => {
      player.root.position.set(x, floorY(x, z), z);
      player.root.rotation.y = rot;
      rig.mode = "follow";
    },
    dry: vi.fn(() => host.place(dry[0], dry[2], -Math.PI / 2)),
    failed: vi.fn(),
    add: (node: Group) => world.add(node),
  } as unknown as CenoteTourHost;
  return {
    host, modes, player, guide, world, dry, screen: () => screen, curtain: () => curtain,
    pause: (value: boolean) => { paused = value; },
    frames: async (count: number) => {
      for (let i = 0; i < count; i++) {
        time += 1 / 60;
        modes.update({ dt: 1 / 60, time, blocked: false, x: 0, y: 0, brake: false });
        rig.update(1 / 60, 0, false, true, false);
        modes.active?.frameStage?.(390, 844);
        rig.cam.updateMatrixWorld();
        // Settle the same asynchronous play/expect handoff that runs between browser frames.
        await tick();
      }
    },
  };
}

type Runtime = { CenoteTourMode: typeof CenoteTourMode };
function deferred() {
  let resolve!: (runtime: Runtime) => void, reject!: () => void;
  const promise = new Promise<Runtime>((yes, no) => { resolve = yes; reject = () => no(new Error("test load error")); });
  return { promise, resolve, reject };
}

describe("cenote tour ownership", () => {
  it("queues only the positive event, coalesces starts, discards stale loads and clears failed owners", async () => {
    const f = hostFixture(), first = deferred(), second = deferred(), third = deferred(), fourth = deferred();
    const load = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
      .mockReturnValueOnce(third.promise).mockReturnValueOnce(fourth.promise);
    const entry = new CenoteTourEntry(f.host, id, load);
    const count = playCount();
    f.modes.register(entry);
    expect(entry.snapshot()).toMatchObject({ state: "idle", animalCount: 0, run: 0 });
    expect(f.modes.offer(id)).toBeNull();
    f.modes.event("declined", {});
    f.modes.launchQueued();
    expect(load).not.toHaveBeenCalled();
    expect(f.modes.start(entry.id)).toBe(false);
    const start = () => { f.modes.event("cenote-tour", undefined); f.modes.launchQueued(); };
    start(); start(); f.modes.launchQueued();
    expect(entry.snapshot()).toMatchObject({ state: "loading", animalCount: 0, run: 1 });
    expect(f.screen()).toMatchObject({ id: "cenote-tour" });
    expect(load).toHaveBeenCalledTimes(1);
    expect(f.modes.input({ kind: "key", key: "escape", repeat: false, keys: new Set() })).toBe(true);
    expect(f.modes.active).toBeNull();
    start();
    first.resolve({ CenoteTourMode });
    await tick();
    expect(entry.snapshot()).toMatchObject({ state: "loading", run: 2 });
    second.reject();
    await tick();
    expect(f.host.failed).toHaveBeenCalledOnce();
    expect(entry.snapshot()).toMatchObject({ state: "idle", lastExit: "failed" });
    expect(f.screen()).toBeNull();

    start();
    class BrokenMode extends CenoteTourMode { start() { throw new Error("test stage error"); } }
    third.resolve({ CenoteTourMode: BrokenMode });
    await tick();
    expect(f.host.failed).toHaveBeenCalledTimes(2);
    expect(f.modes.engaged).toBe(false);

    start();
    f.modes.dispose();
    fourth.resolve({ CenoteTourMode });
    await tick();
    expect(f.host.failed).toHaveBeenCalledTimes(2);
    expect(entry.snapshot()).toMatchObject({ state: "idle", lastExit: "left", run: 4 });
    expect(f.player.root.position.toArray()).toEqual(f.dry);
    expect(f.screen()).toBeNull();
    expect(f.modes.hasQueued).toBe(false);
    expect(playCount()).toBe(count);
  });

  it("cancels a fade and a pending recording without letting late callbacks resume the tour", async () => {
    const f = hostFixture(), entry = new CenoteTourEntry(f.host, id, async () => ({ CenoteTourMode }));
    f.modes.register(entry);
    const start = () => { f.modes.event("cenote-tour", undefined); f.modes.launchQueued(); };
    start();
    await tick();
    await f.frames(10);
    expect(f.curtain()).toBeGreaterThan(0);
    f.modes.exit(true);
    await f.frames(30);
    expect(f.curtain()).toBe(0);
    expect(f.player.root.position.toArray()).toEqual(f.dry);

    let settle!: (ok: boolean) => void;
    audio.clipDuration.mockReturnValue(2.5);
    audio.play.mockImplementation(() => new Promise<boolean>((resolve) => { settle = resolve; }));
    try {
      start();
      await tick();
      await f.frames(6 * 60);
      expect(audio.play).toHaveBeenCalledWith(expect.any(String), 1, expect.any(String),
        expect.objectContaining({ optional: true, recordingOnly: true }));
      f.modes.dispose();
      expect(audio.stop).toHaveBeenCalledOnce();
      settle(true);
      await f.frames(120);
      expect(entry.snapshot()).toMatchObject({ state: "idle", lastExit: "left", lineKey: null, animalCount: 0 });
      expect(f.guide.root.position.toArray()).toEqual([-122.4, 0, -1.4]);
      expect(f.player.root.visible).toBe(true);
    } finally {
      audio.clipDuration.mockReturnValue(null);
      audio.play.mockReset();
    }
  });

  it.each([["see_yes", "see_two", "ct_together", "ct_pair"], ["see_where", "see_one", "ct_ahead", "ct_second"]])(
    "plays both observations at 60 Hz with %s and %s, then restores the same dry pose",
    async (fishAnswer, turtleAnswer, fishAck, turtleAck) => {
      const f = hostFixture();
      const entry = new CenoteTourEntry(f.host, id, async () => ({ CenoteTourMode }));
      const count = playCount();
      useStore.setState({ settings: { ...useStore.getState().settings, volume: 1 } });
      f.modes.register(entry);
      f.modes.event("cenote-tour", undefined);
      f.modes.launchQueued();
      await tick();
      expect(playCount()).toBe(count + 1);
      expect(entry.snapshot()).toMatchObject({ state: "deck", animalCount: 0 });
      await f.frames(6 * 60);
      expect(entry.snapshot()).toMatchObject({ state: "deck", stopIndex: 0, lineKey: "ct_fresh", animalCount: 0 });
      await f.frames(8 * 60);
      expect(entry.snapshot().lineKey).toBe("ct_walk");
      await f.frames(10 * 60);
      expect(entry.snapshot()).toMatchObject({ state: "swim", lineKey: "ct_fish", viewer: { submerged: true } });
      await f.frames(18 * 60);
      const fish = entry.snapshot();
      expect(fish).toMatchObject({ state: "turn", stopIndex: 1, elapsed: 42, lineKey: "ct_see" });
      expect(useCenoteTour.getState().line?.sentence).toMatchObject({
        en: "¿Ve los peces?", nat: lt ? "Ar matote žuvis?" : "Can you see the fish?",
      });
      expect(useCenoteTour.getState().line?.sentence.units[0].lt).toBe(lt ? "Ar matote" : "Do-you-see");
      expect(fish.animals).toHaveLength(12);
      expect(fish.animals.every(({ species }) => species === "fish")).toBe(true);
      await f.frames(60);
      expect(entry.snapshot().elapsed).toBe(42);
      const movedFish = entry.snapshot().animals;
      expect(movedFish.map(({ id }) => id)).toEqual(fish.animals.map(({ id }) => id));
      expect(Math.hypot(movedFish[0].x - fish.animals[0].x, movedFish[0].z - fish.animals[0].z)).toBeGreaterThan(0.025);
      f.pause(true);
      await f.frames(10);
      expect(entry.snapshot().elapsed).toBe(42);
      f.pause(false);
      await f.frames(1);
      entry.action("choose", fishAnswer);
      await f.frames(75);
      expect(entry.snapshot().lineKey).toBe(fishAck);
      const ack = useCenoteTour.getState().answer;
      expect(ack?.key).toBe(fishAnswer);
      await f.frames(23 * 60);
      expect(entry.snapshot()).toMatchObject({ state: "turn", stopIndex: 2, elapsed: 62, lineKey: "ct_howmany" });
      const turtles = entry.snapshot().animals;
      expect(turtles).toHaveLength(2);
      expect(turtles.every(({ species }) => species === "turtle")).toBe(true);
      await f.frames(60);
      const movedTurtles = entry.snapshot().animals;
      expect(movedTurtles.map(({ id }) => id)).toEqual(turtles.map(({ id }) => id));
      for (const [i, turtle] of turtles.entries())
        expect(Math.hypot(movedTurtles[i].x - turtle.x, movedTurtles[i].z - turtle.z)).toBeGreaterThan(0.025);
      entry.action("choose", turtleAnswer);
      await f.frames(75);
      expect(entry.snapshot().lineKey).toBe(turtleAck);
      const countAnswer = useCenoteTour.getState().answer;
      expect(countAnswer?.key).toBe(turtleAnswer);
      await f.frames(17 * 60);
      expect(entry.snapshot()).toMatchObject({ state: "idle", lastExit: "finished", elapsed: 76, animalCount: 0 });
      expect(f.player.root.visible).toBe(true);
      expect(f.host.rig.stage).toBeNull();
      expect(f.host.rig.mode).toBe("follow");
      expect(f.world.children).toHaveLength(0);
      expect(f.player.root.position.toArray()).toEqual(f.dry);
      expect(f.guide.root.position.toArray()).toEqual([-122.4, 0, -1.4]);
      expect(f.curtain()).toBe(0);
      expect(f.screen()).toBeNull();
      expect(playCount()).toBe(count + 1);
      expect(audio.play).not.toHaveBeenCalled();
      for (const line of [ack!, countAnswer!])
        expect(useCards.getState().cards).toContainEqual(expect.objectContaining({
          en: line.sentence.en, lt: savedAnswers[line.key][lt ? 1 : 0], situationId: id,
        }));

      f.modes.event("cenote-tour", undefined);
      f.modes.launchQueued();
      await tick();
      await f.frames(36 * 60);
      expect(useCenoteTour.getState().choices).toHaveLength(2);
      f.modes.exit(true);
      await f.frames(120);
      expect(entry.snapshot()).toMatchObject({ state: "idle", lastExit: "left", animalCount: 0 });
      expect(f.world.children).toHaveLength(0);
      expect(useCenoteTour.getState()).toMatchObject({ line: null, answer: null, choices: [], mic: { status: "off" } });
      expect(f.player.root.position.toArray()).toEqual(f.dry);
      expect(playCount()).toBe(count + 2);
    },
  );
});

describe("cenote tour route and meshes", () => {
  it("keeps the moving envelopes clear of the real bay, seeded reef and wave extremes", () => {
    expect(route).not.toBeNull();
    const world = new Group(), animals = new CenoteAnimals(route), undersea = new Undersea(RIDES.deep, RIDES.rocks);
    const eye = new Vector3(), aim = new Vector3(), target = new Vector3();
    const camera = new PerspectiveCamera(82, 390 / 844, 0.1, 260);
    world.add(animals.group, undersea.group);
    undersea.update(0, 0, true, eye, 0, SEA_LEVEL);
    const reef = (undersea.group.getObjectByName("seabed-things") as Mesh).geometry.attributes.position;
    const localReef: [number, number, number][] = [];
    for (let i = 0; i < reef.count; i++) {
      const x = reef.getX(i), z = reef.getZ(i);
      if (x > -69 && x < -54 && z > -110 && z < -97) localReef.push([x, reef.getY(i), z]);
    }
    expect(animals.design.draws).toBe(4);
    expect(animals.design.triangles).toBeLessThanOrEqual(2500);
    const count = { fish: 0, turtle: 0 };
    let gapAbove = Infinity, gapBelow = Infinity, turtleGap = Infinity, reefGap = Infinity;
    try {
      for (let n = 0; n <= 1400; n++) {
        const elapsed = 22 + (n % 101) * 0.5, time = n * 0.32;
        const surface = swimAt(route, elapsed, time, eye);
        expect(surface).toBe(waterY(eye.x, eye.z, time));
        expect(eye.y).toBeGreaterThanOrEqual(floorY(eye.x, eye.z) + 0.45);
        if (elapsed <= 68) expect(eye.y).toBeLessThanOrEqual(surface - 0.2);
        aimSwim(route, elapsed, time, time, eye, aim, target);
        camera.position.copy(eye);
        camera.lookAt(aim);
        camera.updateMatrixWorld();
        animals.update(eye.y < surface, time, time, eye, elapsed);
        const active = animals.inspect(camera, time);
        const pair = active.filter(({ species }) => species === "turtle");
        if (pair.length === 2) {
          const [a, b] = pair;
          turtleGap = Math.min(turtleGap, Math.hypot(a.x - b.x, a.z - b.z) - a.radius - b.radius);
        }
        for (const a of active) {
          count[a.species]++;
          expect(a.x - a.radius).toBeGreaterThan(BAY.x0);
          expect(a.x + a.radius).toBeLessThan(BAY.x1);
          expect(a.z - a.radius).toBeGreaterThan(BAY.z0);
          expect(a.z + a.radius).toBeLessThan(SHORE.limit);
          for (const [x, z, r] of RIDES.rocks) expect(Math.hypot(a.x - x, a.z - z) - a.radius).toBeGreaterThan(r);
          for (let direction = 0; direction < Math.PI * 2; direction += Math.PI / 4) {
            const x = a.x + Math.cos(direction) * a.radius, z = a.z + Math.sin(direction) * a.radius;
            gapAbove = Math.min(gapAbove, waterY(x, z, time)! - a.top);
            gapBelow = Math.min(gapBelow, a.bottom - floorY(x, z));
          }
          // The reef's largest scattering meshes in this corridor are < 3 m across.
          for (const [x, y, z] of localReef) {
            if (Math.hypot(x - a.x, z - a.z) <= a.radius + 3) reefGap = Math.min(reefGap, a.bottom - y);
          }
        }
      }
      expect(count.fish).toBeGreaterThan(7500);
      expect(count.turtle).toBeGreaterThan(1200);
      expect(gapAbove).toBeGreaterThanOrEqual(0.12);
      expect(gapBelow).toBeGreaterThanOrEqual(1.55);
      expect(turtleGap).toBeGreaterThan(0);
      expect(reefGap).toBeGreaterThanOrEqual(0.15);
      console.log({ ...animals.design, count, gapAbove, gapBelow, turtleGap, reefGap });
    } finally {
      animals.dispose();
      undersea.dispose();
    }
    expect(world.children).toHaveLength(0);
  });
  it.each([[390, 844, SNORKEL_FOV.portrait], [1280, 800, SNORKEL_FOV.wide]])("keeps the turtle silhouettes clear of the caption at %s×%s", (w, h, fov) => {
    const world = new Group(), animals = new CenoteAnimals(route);
    const eye = new Vector3(), aim = new Vector3(), target = new Vector3();
    const camera = new PerspectiveCamera(fov, w / h, 0.1, 260);
    camera.setViewOffset(w, h, 0, h * 0.15, w, h);
    world.add(animals.group);
    let left = 1, right = 0, top = 1, bottom = 0, overlap = 0;
    try {
      for (let n = 0; n <= 4370; n += 4) {
        const t = n / 10;
        swimAt(route, 58, t, eye);
        aimSwim(route, 58, t, t, eye, aim, target);
        camera.position.copy(eye);
        camera.lookAt(aim);
        camera.updateMatrixWorld();
        animals.update(true, t, t, eye, 58);
        const turtles = animals.inspect(camera, t).filter(({ species }) => species === "turtle");
        expect(turtles).toHaveLength(2);
        const [a, b] = turtles.map(({ screen }) => screen);
        left = Math.min(left, a.left, b.left);
        right = Math.max(right, a.right, b.right);
        top = Math.min(top, a.top, b.top);
        bottom = Math.max(bottom, a.bottom, b.bottom);
        overlap = Math.max(overlap, Math.min(a.right, b.right) - Math.max(a.left, b.left));
      }
      console.log({ w, h, left, right, top, bottom, overlap });
      expect(left).toBeGreaterThan(0.12);
      expect(right).toBeLessThan(0.88);
      expect(top).toBeGreaterThan(0.22);
      expect(bottom).toBeLessThan(0.54);
      expect(overlap).toBe(0);
    } finally {
      animals.dispose();
    }
  });

});
