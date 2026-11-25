import { afterEach, expect, it, vi } from "vitest";
import { Group, SkinnedMesh, Vector3, type Object3D } from "three";
import { GYM_ENTRY } from "../src/content/gym-entry";
import { NPCS } from "../src/content/npcs";
import { npcVoice } from "../src/content/voices";
import { captureAudio } from "../src/convo/audioFocus";
import type { SpeechOptions } from "../src/convo/speech";
import { CameraRig } from "../src/game/camera";
import { Character } from "../src/game/characters/Character";
import { createGymMode } from "../src/game/gym/entry";
import { useGym } from "../src/game/gym/store";
import { FrameFade } from "../src/game/kit/frameFade";
import type { ModeHost } from "../src/game/kit/host";
import { ModeRegistry, type ModeScreen } from "../src/game/kit/modes";
import { GYM_MAT, GYM_STAGE } from "../src/game/world/gym";
import { readPlayStats } from "../src/state/playStats";
import { useStore } from "../src/state/store";

const mocks = vi.hoisted(() => ({
  audio: { volume: 0.9, play: vi.fn(), clipDuration: vi.fn(() => 1), sfx: vi.fn() },
  load: vi.fn(),
  loadGate: null as Promise<void> | null,
  attempts: [] as { options: SpeechOptions; dispose: ReturnType<typeof vi.fn> }[],
}));
vi.mock("../src/game/audio", () => ({ audio: mocks.audio }));
vi.mock("../src/content/situations/catalog", async (original) => {
  const catalog = await original<typeof import("../src/content/situations/catalog")>();
  return { ...catalog, loadSituation: async (id: string) => { mocks.load(id); await mocks.loadGate; return catalog.loadSituation(id); } };
});
vi.mock("../src/convo/speech", async (original) => ({
  ...await original<typeof import("../src/convo/speech")>(),
  speechSupported: () => true,
  createSpeechAttempt(options: SpeechOptions) {
    const dispose = vi.fn();
    mocks.attempts.push({ options, dispose });
    return { start: vi.fn(), dispose };
  },
}));

function setup() {
  let room: Group | null = new Group();
  const player = new Character(NPCS.rosa.look), trainer = new Character(NPCS.jordan.look);
  let roomTrainer = trainer;
  player.root.position.set(GYM_MAT.x + 0.4, 0, GYM_MAT.z);
  player.root.rotation.y = 0.42;
  trainer.root.position.set(4.8, 0, -2.6);
  trainer.root.rotation.set(0.02, -0.55, 0.012);
  trainer.busy = "paper";
  trainer.watch = new Vector3(1, 1.5, 0);
  trainer.setAnim("wave");
  trainer.update(0.12);
  const home = {
    player: player.root.position.clone(), trainer: trainer.root.position.clone(),
    rotation: trainer.root.rotation.clone(), arm: trainer.joint("armR").quaternion.clone(), watch: trainer.watch,
  };
  let screen: ModeScreen | null = null;
  const registry = new ModeRegistry({ read: () => screen, set: (value) => { screen = value; } });
  const fade = new FrameFade(() => {});
  const rig = new CameraRig(390 / 844);
  rig.mode = "interior";
  rig.cam.zoom = 1.03;
  rig.cam.setViewOffset(390, 844, 0, -80, 390, 844);
  let gated = false, heading = 0.45, time = 0;
  const held = new Set(["w"]);
  const prepare = vi.fn();
  const host = {
    rig, player: () => player, rides: { riding: null }, time: () => time, prepare,
    canStart: () => !fade.active && !gated,
    fade: (fn: () => void) => { if (fade.active) return false; fade.start(fn); return true; },
    owns: (id: string) => registry.owns(id), entered: (id: string) => registry.entered(id), left: (id: string) => registry.left(id),
  } as unknown as ModeHost;
  const savePlace = vi.fn(() => player.root.position.toArray());
  const entry = createGymMode(host, {
    room: () => room, trainer: () => roomTrainer, heading: () => heading, savePlace,
    viewport: () => ({ width: 390, height: 844 }),
    place: (x, z, rot) => {
      heading = rot;
      player.root.position.set(x, 0, z);
      player.root.rotation.set(0, rot, 0);
      held.clear();
      rig.mode = "interior";
    },
  });
  registry.register(entry);
  const step = async (frames = 1) => {
    for (let i = 0; i < frames; i++) {
      time += 0.05;
      fade.update(0.05);
      registry.update({ dt: 0.05, time, blocked: fade.active, x: 0, y: 0, brake: false });
      await Promise.resolve();
    }
  };
  const view = () => useGym.getState().view!;
  const until = async (phase: string) => {
    for (let i = 0; i < 90 && view()?.phase !== phase; i++) await step();
    expect(view()?.phase).toBe(phase);
  };
  const open = async () => {
    expect(registry.start("gym")).toBe(true);
    await vi.waitFor(() => expect(fade.active).toBe(true), { timeout: 5000 });
    await step(15);
    expect(view().phase).toBe("ready");
  };
  return {
    player, trainer, home, registry, entry, fade, rig, held, prepare, savePlace, step, view, until, open,
    screen: () => screen, heading: () => heading, gate: (value: boolean) => { gated = value; },
    replaceRoom: () => { room = new Group(); },
    replaceTrainer: (next: Character) => { roomTrainer = next; },
    dispose: () => { registry.dispose(); player.dispose(); trainer.dispose(); },
  };
}

const count = () => readPlayStats(useStore.getState().progress).games.gym ?? 0;

function poseOf(ch: Character) {
  const transform = ({ position, rotation, scale }: Object3D) => ({
    position: position.toArray(), rotation: rotation.toArray(), scale: scale.toArray(),
  });
  return {
    root: transform(ch.root), visible: ch.root.visible, anim: ch.anim,
    watch: ch.watch?.toArray() ?? ch.watch, busy: ch.busy, steady: ch.steady, attentive: ch.attentive, fidgets: ch.fidgets,
    lift: ch.lift, tuck: ch.tuck, squash: ch.squash, flip: ch.flip, bank: ch.bank, moveSpeed: ch.moveSpeed,
    joints: {
      body: transform(ch.joint("body")), head: transform(ch.joint("head")),
      armL: transform(ch.joint("armL")), armR: transform(ch.joint("armR")),
      foreL: transform(ch.joint("foreL")), foreR: transform(ch.joint("foreR")),
      legL: transform(ch.joint("legL")), legR: transform(ch.joint("legR")),
      shinL: transform(ch.joint("shinL")), shinR: transform(ch.joint("shinR")),
    },
  };
}

afterEach(() => {
  mocks.audio.play.mockReset();
  mocks.audio.clipDuration.mockReset().mockReturnValue(1);
  mocks.audio.volume = 0.9;
  mocks.load.mockClear();
  mocks.attempts.length = 0;
  mocks.loadGate = null;
  vi.unstubAllGlobals();
});

it("keeps the loading entry cancellable and never stages a stale room or fade", async () => {
  const game = setup();
  let release!: () => void;
  mocks.loadGate = new Promise((resolve) => { release = resolve; });
  try {
    game.gate(true);
    expect(game.registry.offer(GYM_ENTRY.situation)).toMatchObject({ id: "gym" });
    expect(game.registry.start("gym")).toBe(false);
    game.gate(false);
    expect(game.registry.prompt(GYM_MAT.x + 1, GYM_MAT.z, 0.9, true)).toBeNull();
    expect(game.registry.prompt(GYM_MAT.x, GYM_MAT.z, Infinity, false)).toBeNull();
    expect(game.registry.prompt(GYM_MAT.x, GYM_MAT.z, Infinity, true)?.kind).toBe("gym");
    expect(game.registry.start("gym")).toBe(true);
    expect(game.registry.engaged && game.registry.modal).toBe(true);
    expect(game.registry.input({ kind: "key", key: "escape", repeat: false, keys: game.held })).toBe(true);
    expect(game.registry.engaged).toBe(false);
    expect(game.registry.start("gym")).toBe(true);
    await vi.waitFor(() => expect(mocks.load).toHaveBeenCalledWith(GYM_ENTRY.situation), { timeout: 5000 });
    game.registry.exit(true);
    release();
    await game.step(20);
    expect(game.registry.engaged).toBe(false);
    expect(game.view()).toBeNull();
    expect(game.player.root.position).toEqual(game.home.player);

    expect(game.registry.queue("gym")).toBe(true);
    game.registry.launchQueued();
    await vi.waitFor(() => expect(game.fade.active).toBe(true), { timeout: 5000 });
    game.replaceRoom();
    await game.step(20);
    expect(game.registry.engaged).toBe(false);
    expect(game.trainer.root.position).toEqual(game.home.trainer);
    const started = count();
    await game.open();
    game.registry.exit();
    await game.step(15);
    expect(count()).toBe(started);
    expect(game.registry.engaged).toBe(false);
  } finally { game.dispose(); }
});

it("restores the fidgets-enabled trainer's full hands-on-hips pose at release", async () => {
  // The real idle scheduler starts a hips fidget after 4.75 s with this seed.
  const random = vi.spyOn(Math, "random").mockReturnValue(0.75);
  const game = setup();
  const { trainer, registry } = game;
  let entry: ReturnType<typeof poseOf> | undefined, release: ReturnType<typeof poseOf> | undefined;
  game.prepare.mockImplementation(() => { entry = poseOf(trainer); });
  const originalLeft = registry.left;
  const left = vi.spyOn(registry, "left").mockImplementation(function (this: ModeRegistry, ...args) {
    if (args[0] === "gym" && this.owns("gym")) release = poseOf(trainer);
    return originalLeft.apply(this, args);
  });
  try {
    trainer.busy = null;
    trainer.setAnim("idle");
    trainer.squash = 0.24;
    for (let i = 0; i < 105; i++) trainer.update(0.05);
    random.mockRestore();

    const started = count();
    await game.open();
    expect(entry).toBeDefined();
    expect(entry!.fidgets).toBe(true);
    expect(entry!.joints.armL.rotation.slice(0, 3)).toEqual([0.12, 0, -0.6]);
    expect(trainer.fidgets).toBe(false);
    expect(trainer.joint("armL").rotation.toArray()).not.toEqual(entry!.joints.armL.rotation);
    expect(trainer.joint("body").scale.toArray()).not.toEqual(entry!.joints.body.scale);
    expect(game.entry.ownsNpc(GYM_ENTRY.npc)).toBe(true);

    game.entry.action("exit");
    await game.step(15);
    expect(release).toStrictEqual(entry);
    expect(registry.engaged).toBe(false);
    expect(game.entry.ownsNpc(GYM_ENTRY.npc)).toBe(false);
    expect(count()).toBe(started);
    trainer.update(0.05);
    expect(trainer.joint("armL").rotation.toArray()).not.toEqual(release!.joints.armL.rotation);
    expect(trainer.fidgets).toBe(true);
  } finally {
    left.mockRestore();
    random.mockRestore();
    game.dispose();
  }
});

it.each(["room", "trainer"] as const)("cancels a staged gym with a stale %s", async (stale) => {
  const game = setup(), started = count();
  const trainer = stale === "trainer" ? new Character(NPCS.jordan.look) : game.trainer;
  mocks.audio.play.mockImplementation(() => new Promise(() => {}));
  try {
    await game.open();
    game.entry.action("start");
    const signal = mocks.audio.play.mock.calls[0][3].signal as AbortSignal;
    expect(signal.aborted).toBe(false);
    if (stale === "room") {
      game.replaceRoom();
      game.player.root.position.set(2, 0, 4);
    } else game.replaceTrainer(trainer);
    trainer.root.position.set(1, 0, 3);
    const nextPose = poseOf(trainer);

    await game.step();
    expect(signal.aborted).toBe(true);
    expect(game.registry.engaged).toBe(false);
    expect(game.view()).toBeNull();
    expect(game.rig.stage).toBeNull();
    expect(game.rig.mode).toBe("interior");
    expect(game.player.root.position.toArray()).toEqual(stale === "room" ? [2, 0, 4] : game.home.player.toArray());
    expect(poseOf(trainer)).toEqual(nextPose);
    expect(game.savePlace).not.toHaveBeenCalled();
    expect(count()).toBe(started + 1);
  } finally {
    game.dispose();
    if (trainer !== game.trainer) trainer.dispose();
  }
});

it("bounds recordings on the game clock, cancels the mic before feedback and restores the stage on exit", async () => {
  const game = setup();
  vi.stubGlobal("window", { addEventListener: vi.fn(), removeEventListener: vi.fn() });
  const pending: ((ok: boolean) => void)[] = [];
  mocks.audio.play.mockImplementation(() => new Promise((resolve) => { pending.push(resolve); }));
  try {
    const started = count();
    await game.open();
    expect(window.__gym?.state()?.phase).toBe("ready");
    expect(game.view().phase).toBe("ready");
    expect(game.screen()).toMatchObject({ id: "gym", kind: "menu" });
    expect(game.entry.ownsNpc(GYM_ENTRY.npc)).toBe(true);
    expect(game.player.root.position.toArray()).toEqual([GYM_STAGE.player.x, 0, GYM_STAGE.player.z]);
    expect(game.trainer.root.position.toArray()).toEqual([GYM_STAGE.trainer.x, 0, GYM_STAGE.trainer.z]);
    expect(count()).toBe(started);
    game.entry.action("start");
    game.entry.action("start");
    expect(count()).toBe(started + 1);
    expect(game.view().line?.key).toBe("gy_intro");
    expect(mocks.audio.play.mock.calls[0]).toEqual([
      npcVoice(NPCS.jordan), NPCS.jordan.speed ?? 1, "Move with me!",
      { optional: true, recordingOnly: true, signal: expect.any(AbortSignal), slow: false, male: false },
    ]);
    pending[0](true);
    await game.step(19);
    expect(game.view().phase).toBe("intro");
    await game.step();
    expect(game.view()).toMatchObject({ phase: "listen", caption: null });
    expect(mocks.audio.play.mock.calls[1][2]).toBe("Jumping jacks!");
    game.entry.action("reveal");
    game.entry.action("pick", "jacks");
    await game.step(6);
    expect(game.view()).toMatchObject({ phase: "listen", caption: null });
    await game.step();
    expect(game.view()).toMatchObject({ phase: "listen", caption: { detail: "full" } });
    await game.until("choose");
    const stalled = mocks.audio.play.mock.calls[1][3].signal as AbortSignal;
    expect(stalled.aborted).toBe(true);
    expect(game.view()).toMatchObject({ fallback: true, audible: false, helpLevel: 0, highlight: "jacks" });
    pending[1](true);
    await game.step();
    expect(game.view().audible).toBe(false);

    let cue = game.view().sayIt!;
    cue.toggle();
    expect(game.view().micStatus).toBe("listening");
    expect(mocks.attempts[0].options.lang).toBe("en-US");
    const lease = captureAudio();
    game.entry.action("replay");
    expect(mocks.attempts[0].dispose).toHaveBeenCalledOnce();
    expect(mocks.audio.play).toHaveBeenCalledTimes(2);
    mocks.attempts[0].options.onCommit("Jumping jacks", []);
    lease.ended();
    await game.step(3);
    expect(mocks.audio.play).toHaveBeenCalledTimes(3);
    pending[2](true);
    await game.until("choose");
    expect(game.view()).toMatchObject({ fallback: true, audible: true, revealed: true, score: { said: 0, completed: 0 } });
    cue = game.view().sayIt!;
    cue.toggle();
    mocks.attempts[1].options.onCommit("Touch your toes", []);
    expect(game.view().micStatus).toBe("miss");
    cue.toggle();
    mocks.attempts[2].options.onCommit("Jumping jacks", []);
    expect(game.view()).toMatchObject({ micStatus: "hit", score: { said: 1, completed: 0 } });

    expect(game.registry.input({ kind: "key", key: "enter", repeat: false, keys: game.held })).toBe(false);
    expect(game.registry.input({ kind: "key", key: " ", repeat: false, keys: game.held })).toBe(false);
    game.registry.input({ kind: "key", key: "1", repeat: true, keys: game.held });
    expect(game.view().phase).toBe("choose");
    game.entry.action("pick", "circles");
    expect(game.view().phase).toBe("retry");
    pending[3](true);
    await game.step(9);
    expect(window.__gym?.state()?.pose).toMatchObject({ player: "circles", trainer: "jacks" });
    await game.until("listen");
    pending[4](true);
    await game.until("choose");
    expect(game.view().sayIt?.awarded).toBe(true);
    game.registry.input({ kind: "key", key: "arrowleft", repeat: false, keys: game.held });
    game.entry.action("pick", "jacks");
    expect(game.view()).toMatchObject({ phase: "right", score: { completed: 1, firstTry: 0, wrong: 1, said: 1 } });
    await game.step(25);
    expect(game.view().phase).toBe("right");
    expect(window.__gym?.state()?.pose).toBeNull();
    const praise = mocks.audio.play.mock.calls[5][3].signal as AbortSignal;
    expect(praise.aborted).toBe(false);
    game.held.add("arrowleft");
    game.registry.exit();
    expect(praise.aborted).toBe(true);
    expect(window.__gym).toBeUndefined();
    pending[5](true);
    await game.step(15);
    expect(game.registry.engaged).toBe(false);
    expect(game.view()).toBeNull();
    expect(game.screen()).toBeNull();
    expect(game.held.size).toBe(0);
    expect(game.heading()).toBe(0.45);
    expect(game.rig.mode).toBe("interior");
    expect(game.rig.cam.zoom).toBe(1.03);
    expect(game.rig.cam.view?.offsetY).toBe(-80);
    expect(game.player.root.position).toEqual(game.home.player);
    expect(game.trainer.root.position).toEqual(game.home.trainer);
    expect(game.trainer.root.rotation.toArray()).toEqual(game.home.rotation.toArray());
    expect(game.trainer.joint("armR").quaternion.toArray()).toEqual(game.home.arm.toArray());
    expect(game.trainer.watch).toBe(game.home.watch);
    expect(game.trainer.busy).toBe("paper");
    expect(game.trainer.anim).toBe("wave");
    expect(game.savePlace).toHaveBeenCalledOnce();
  } finally { game.dispose(); }
});

it("fits the real staged actors, scores a muted round, resets Again and returns Done to the mat", async () => {
  const game = setup(), started = count();
  const windowEvents = {
    addEventListener: vi.fn<(type: string, listener: () => void) => void>(),
    removeEventListener: vi.fn(),
  };
  vi.stubGlobal("window", windowEvents);
  // Even a successful recording request needs the complete text when the sound is muted.
  mocks.audio.volume = 0;
  mocks.audio.play.mockResolvedValue(true);
  const viewport = { width: 390, height: 844, top: 0 };
  const header = { bottom: 156 }, dock = { top: 578 };
  const element = (bounds: object) => ({ getBoundingClientRect: () => bounds }) as HTMLElement;
  const fitted = () => {
    for (const actor of [game.player, game.trainer]) {
      actor.root.updateMatrixWorld(true);
      actor.root.traverseVisible((node) => {
        if (!(node instanceof SkinnedMesh)) return;
        const point = new Vector3(), vertexCount = node.geometry.getAttribute("position").count;
        let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
        for (let i = 0; i < vertexCount; i++) {
          node.getVertexPosition(i, point).applyMatrix4(node.matrixWorld).project(game.rig.cam);
          const x = (1 + point.x) * viewport.width / 2, y = (1 - point.y) * viewport.height / 2;
          left = Math.min(left, x); right = Math.max(right, x);
          top = Math.min(top, y); bottom = Math.max(bottom, y);
        }
        const sample = JSON.stringify({ pose: window.__gym?.state()?.pose, actor: actor === game.player ? "learner" : "trainer", left, right, top, bottom });
        expect(left, sample).toBeGreaterThanOrEqual(8);
        expect(right, sample).toBeLessThanOrEqual(viewport.width - 8);
        expect(top, sample).toBeGreaterThanOrEqual(header.bottom + 8);
        expect(bottom, sample).toBeLessThanOrEqual(dock.top - 8);
      });
    }
  };
  try {
    await game.open();
    const stop = game.view().observeFrame(element(viewport), element(header), element(dock));
    fitted();
    game.entry.action("start");
    for (let i = 1; i <= 10; i++) {
      await game.until("choose");
      expect(game.view()).toMatchObject({ index: i, fallback: true, audible: false, caption: { detail: "full" } });
      if (i === 5) {
        game.entry.action("pick", game.view().options.find((id) => id !== "run"));
        await game.until("choose");
        expect(game.view()).toMatchObject({ index: i, callId: "run", helpLevel: 0 });
      }
      if (i === 7) expect(game.view()).toMatchObject({ helpLevel: 2, highlight: null });
      game.entry.action("pick", game.view().callId!);
      if (i === 1 || i === 6 || i === 8) {
        await game.step(9);
        fitted();
      }
    }
    await game.until("score");
    expect(game.view()).toMatchObject({ ratio: 0.9, score: { completed: 10, firstTry: 9, wrong: 1, said: 0 } });
    expect(count()).toBe(started + 1);
    mocks.audio.volume = 0.9;
    game.entry.action("again");
    game.entry.action("again");
    expect(game.view()).toMatchObject({ phase: "intro", score: { completed: 0, firstTry: 0, wrong: 0, said: 0 } });
    expect(count()).toBe(started + 2);

    viewport.width = 1280;
    viewport.height = 800;
    header.bottom = 146;
    dock.top = 625;
    const [, resize] = windowEvents.addEventListener.mock.calls.find(([name]) => name === "resize")!;
    resize();
    expect(game.rig.cam.fov).toBe(44);
    fitted();
    await game.until("choose");
    expect(game.view()).toMatchObject({ index: 1, callId: "squats", helpLevel: 0, revealed: false });
    for (let i = 0; i < 10; i++) {
      await game.until("choose");
      expect(game.view()).toMatchObject({
        audible: true, fallback: false, caption: i < 3 ? { detail: "full" } : i < 6 ? { detail: "target" } : null,
      });
      game.entry.action("pick", game.view().callId!);
    }
    await game.until("score");
    game.entry.action("done");
    await game.step(15);
    stop();
    expect(windowEvents.removeEventListener).toHaveBeenCalledWith("resize", resize);
    expect(game.view()).toBeNull();
    expect(game.player.root.position.toArray()).toEqual([GYM_MAT.x, 0, GYM_MAT.z]);
    expect(game.savePlace.mock.results[0].value).toEqual([GYM_MAT.x, 0, GYM_MAT.z]);
  } finally { game.dispose(); }
});
