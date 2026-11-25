import { afterEach, expect, it, vi } from "vitest";
import { Box3, Group, Mesh, PlaneGeometry, Raycaster, SkinnedMesh, Vector3, type Object3D } from "three";
import { GYM_ENTRY } from "../src/content/gym-entry";
import { NPCS } from "../src/content/npcs";
import * as catalog from "../src/content/situations/catalog";
import { npcVoice } from "../src/content/voices";
import { captureAudio } from "../src/convo/audioFocus";
import { variety } from "../src/convo/compose";
import type { SpeechOptions } from "../src/convo/speech";
import { EDITION } from "../src/edition";
import { CameraRig } from "../src/game/camera";
import { addFarVersion, setBlobShadows, type CharacterJoint, withBackpack } from "../src/game/characters";
import { Character } from "../src/game/characters/Character";
import { createGymMode } from "../src/game/gym/entry";
import { useGym } from "../src/game/gym/store";
import { FrameFade } from "../src/game/kit/frameFade";
import type { ModeHost } from "../src/game/kit/host";
import { ModeRegistry, type ModeScreen } from "../src/game/kit/modes";
import { GYM_MAT, GYM_STAGE } from "../src/game/world/gym";
import { getInterior } from "../src/game/world/interiors";
import { readPlayStats } from "../src/state/playStats";
import { useStore } from "../src/state/store";

const mocks = vi.hoisted(() => ({
  audio: { volume: 0.9, play: vi.fn(), clipDuration: vi.fn(() => 1) },
  attempts: [] as { options: SpeechOptions; start: ReturnType<typeof vi.fn>; dispose: ReturnType<typeof vi.fn> }[],
}));
vi.mock("../src/game/audio", () => ({ audio: mocks.audio }));
vi.mock("../src/convo/speech", async (original) => ({
  ...await original<typeof import("../src/convo/speech")>(),
  speechSupported: () => true,
  createSpeechAttempt(options: SpeechOptions) {
    const attempt = { options, start: vi.fn(), dispose: vi.fn() };
    mocks.attempts.push(attempt);
    return attempt;
  },
}));

const learnerLook = withBackpack({
  skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653", female: true,
});
const trainerLook = { ...NPCS.jordan.look, female: NPCS.jordan.look.female ?? NPCS.jordan.gender === "f" };
const pc = EDITION.id === "es";
const intro = pc ? "¡Muévete conmigo!" : "Move with me!";
const jacks = pc ? "¡Haz saltos de tijera!" : "Jumping jacks!";
const toes = pc ? "¡Tócate los pies!" : "Touch your toes!";
const firstHelp = pc
  ? EDITION.helper === "lt" ? "Šokinėk, skėsk kojas ir kelk rankas!" : "Do jumping jacks!"
  : "Pašokite, išskėskite kojas ir pakelkite rankas!";
const firstGloss = pc
  ? EDITION.helper === "lt" ? ["Daryk", "šuoliukus išskečiant kojas!"] : ["Do", "jumping jacks!"]
  : ["Šuoliukai išskečiant kojas!"];

function setup(constructorPhase?: number) {
  let room = new Group();
  const random = constructorPhase === undefined ? undefined : vi.spyOn(Math, "random").mockReturnValue(constructorPhase);
  const player = new Character(learnerLook), trainer = new Character(trainerLook);
  random?.mockRestore();
  let roomTrainer = trainer;
  player.root.position.set(GYM_MAT.x + 0.4, 0, GYM_MAT.z);
  player.root.rotation.y = 0.42;
  trainer.root.position.set(4.8, 0, -2.6);
  trainer.root.rotation.set(0, -0.3, 0);
  trainer.busy = "paper";
  trainer.watch = new Vector3(1, 1.5, 0);
  trainer.setAnim("wave");
  trainer.update(0.12);
  const home = { player: poseOf(player), trainer: poseOf(trainer), watch: trainer.watch };
  const beforeScreen: ModeScreen = { id: "original", kind: "overlay" };
  let screen: ModeScreen | null = beforeScreen;
  const registry = new ModeRegistry({ read: () => screen, set: (value) => { screen = value; } });
  const fade = new FrameFade(() => {});
  const rig = new CameraRig(390 / 844);
  rig.mode = "interior";
  rig.cam.zoom = 1.03;
  rig.cam.fov = 52;
  rig.cam.near = 0.16;
  rig.viewShift.y = -0.16;
  rig.cam.setViewOffset(390, 844, 0, -80, 390, 844);
  let gated = false, heading = 0.45, time = 0;
  const held = new Set(["w"]), prepare = vi.fn();
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
  const step = async (frames = 1, dt = 0.05) => {
    for (let i = 0; i < frames; i++) {
      time += dt;
      fade.update(dt);
      registry.update({ dt, time, blocked: fade.active, x: 0, y: 0, brake: false });
      await Promise.resolve();
    }
  };
  const view = () => useGym.getState().view!;
  const until = async (phase: string) => {
    for (let i = 0; i < 100 && view()?.phase !== phase; i++) await step();
    expect(view()?.phase).toBe(phase);
  };
  const open = async () => {
    expect(registry.start("gym")).toBe(true);
    await vi.waitFor(() => expect(fade.active).toBe(true), { timeout: 5000 });
    await step(15);
    expect(view().phase).toBe("ready");
  };
  return {
    player, trainer, home, registry, entry, fade, rig, held, prepare, savePlace, step, view, until, open, beforeScreen,
    screen: () => screen, heading: () => heading, gate: (value: boolean) => { gated = value; },
    replaceRoom: () => { room = new Group(); }, replaceTrainer: (next: Character) => { roomTrainer = next; },
    dispose: () => { registry.dispose(); player.dispose(); trainer.dispose(); },
  };
}

const joints: CharacterJoint[] = ["body", "head", "armL", "armR", "foreL", "foreR", "legL", "legR", "shinL", "shinR"];
function poseOf(ch: Character) {
  const transform = ({ position, rotation, scale }: Object3D) => ({
    position: position.toArray(), rotation: rotation.toArray(), scale: scale.toArray(),
  });
  return {
    root: transform(ch.root), visible: ch.root.visible, anim: ch.anim,
    watch: ch.watch?.toArray() ?? ch.watch, busy: ch.busy, steady: ch.steady, attentive: ch.attentive, fidgets: ch.fidgets,
    lift: ch.lift, tuck: ch.tuck, squash: ch.squash, flip: ch.flip, bank: ch.bank, moveSpeed: ch.moveSpeed,
    joints: Object.fromEntries(joints.map((name) => [name, transform(ch.joint(name))])),
  };
}
const count = () => readPlayStats(useStore.getState().progress).games.gym ?? 0;
const key = (game: ReturnType<typeof setup>, key: string, repeat = false) =>
  game.registry.input({ kind: "key", key, repeat, keys: game.held });

afterEach(() => {
  mocks.audio.play.mockReset();
  mocks.audio.clipDuration.mockReset().mockReturnValue(1);
  mocks.audio.volume = 0.9;
  mocks.attempts.length = 0;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("releases a failed data load and composes the correct learner help on direct mat retry", async () => {
  const game = setup(), started = count();
  vi.spyOn(catalog, "loadSituation").mockRejectedValueOnce(new Error("offline"));
  mocks.audio.play.mockRejectedValue(new Error("clip unavailable"));
  try {
    if (pc) {
      const neighbor = "s72-cafe";
      catalog.prefetchSituations([GYM_ENTRY.situation, neighbor]);
      await vi.waitFor(() => expect(catalog.getSituation(neighbor)).toBeDefined(), { timeout: 5000 });
      expect(catalog.getSituation(GYM_ENTRY.situation)).toBeUndefined();
    }
    expect(game.registry.start("gym")).toBe(true);
    await vi.waitFor(() => expect(game.registry.engaged).toBe(false), { timeout: 5000 });
    expect(game.fade.active).toBe(false);
    expect(game.view()).toBeNull();
    expect(game.screen()).toBe(game.beforeScreen);
    expect(poseOf(game.trainer)).toEqual(game.home.trainer);
    await game.open();
    game.entry.action("start");
    await game.until("choose");
    expect(game.view()).toMatchObject({
      index: 1, audible: false, fallback: true, caption: { detail: "full", line: { key: "gy_jacks", sentence: { say: jacks, nat: firstHelp } } },
    });
    expect(game.view().caption?.line.sentence.units.map(({ lt }) => lt)).toEqual(firstGloss);
    expect(count()).toBe(started + 1);
  } finally { game.dispose(); }
});

it("cancels pending entry, the situation load and a stale fade", async () => {
  const game = setup(), load = vi.spyOn(catalog, "loadSituation");
  const original = load.getMockImplementation() ?? catalog.loadSituation;
  let release!: () => void;
  const loading = new Promise<void>((resolve) => { release = resolve; });
  try {
    game.gate(true);
    expect(game.registry.offer(GYM_ENTRY.situation)).toMatchObject({ id: "gym", label: GYM_ENTRY.startLabel });
    expect(game.registry.start("gym")).toBe(false);
    game.gate(false);
    expect(game.registry.prompt(GYM_MAT.x + 1, GYM_MAT.z, 0.9, true)).toBeNull();
    expect(game.registry.prompt(GYM_MAT.x, GYM_MAT.z, Infinity, false)).toBeNull();
    expect(game.registry.prompt(GYM_MAT.x, GYM_MAT.z, Infinity, true)?.kind).toBe("gym");
    expect(game.registry.start("gym")).toBe(true);
    expect(game.registry.engaged && game.registry.modal).toBe(true);
    expect(key(game, "escape")).toBe(true);
    expect(game.registry.engaged).toBe(false);

    load.mockImplementationOnce(async (id) => { await loading; return original(id); });
    expect(game.registry.start("gym")).toBe(true);
    expect(game.registry.start("gym")).toBe(false);
    await vi.waitFor(() => expect(load).toHaveBeenCalledWith(GYM_ENTRY.situation), { timeout: 5000 });
    game.registry.exit(true);
    release();
    await game.step(20);
    expect(game.registry.engaged).toBe(false);
    expect(game.view()).toBeNull();
    expect(poseOf(game.player)).toEqual(game.home.player);

    expect(game.registry.queue("gym")).toBe(true);
    game.registry.launchQueued();
    await vi.waitFor(() => expect(game.fade.active).toBe(true), { timeout: 5000 });
    game.replaceRoom();
    await game.step(20);
    expect(game.registry.engaged).toBe(false);
    expect(poseOf(game.trainer)).toEqual(game.home.trainer);
    const started = count();
    await game.open();
    game.registry.exit();
    await game.step(15);
    expect(count()).toBe(started);
    expect(game.registry.engaged).toBe(false);
  } finally { game.dispose(); }
});

it("restores the fidgets-enabled trainer's full hands-on-hips pose at release", async () => {
  const random = vi.spyOn(Math, "random").mockReturnValue(0.75);
  const game = setup();
  const { trainer, registry } = game;
  let entry: ReturnType<typeof poseOf> | undefined, release: ReturnType<typeof poseOf> | undefined;
  game.prepare.mockImplementation(() => { entry = poseOf(trainer); });
  const left = registry.left.bind(registry);
  vi.spyOn(registry, "left").mockImplementation((id) => {
    if (id === "gym" && registry.owns("gym")) release = poseOf(trainer);
    left(id);
  });
  try {
    trainer.busy = null;
    trainer.setAnim("idle");
    trainer.squash = 0.24;
    for (let i = 0; i < 105; i++) trainer.update(0.05);
    random.mockRestore();

    const started = count();
    await game.open();
    expect(entry!.fidgets).toBe(true);
    expect(entry!.joints.armL.rotation.slice(0, 3)).toEqual([0.12, 0, -0.6]);
    expect(trainer.fidgets).toBe(false);
    expect(trainer.joint("armL").rotation.toArray()).not.toEqual(entry!.joints.armL.rotation);
    expect(trainer.joint("body").scale.toArray()).not.toEqual(entry!.joints.body.scale);
    expect(game.entry.controlsNpc(GYM_ENTRY.npc)).toBe(true);

    game.entry.action("exit");
    await game.step(15);
    expect(release).toStrictEqual(entry);
    expect(registry.engaged).toBe(false);
    expect(game.entry.controlsNpc(GYM_ENTRY.npc)).toBe(false);
    expect(count()).toBe(started);
    trainer.update(0.05);
    expect(trainer.joint("armL").rotation.toArray()).not.toEqual(release!.joints.armL.rotation);
    expect(trainer.fidgets).toBe(true);
  } finally { game.dispose(); }
});

it("uses the detailed original rig on the stage and restores its visibility on disposal", async () => {
  const game = setup();
  try {
    expect(addFarVersion(game.trainer, trainerLook)).toBe(true);
    const skins = game.trainer.root.children.filter((node) => node instanceof SkinnedMesh);
    expect(skins).toHaveLength(2);
    game.trainer.setFar(true);
    expect(skins.map(({ visible }) => visible)).toEqual([false, true]);
    await game.open();
    expect(game.entry.controlsNpc(GYM_ENTRY.npc)).toBe(true);
    expect(skins.map(({ visible }) => visible)).toEqual([true, false]);
    game.registry.dispose();
    expect(skins.map(({ visible }) => visible)).toEqual([false, true]);
    expect(poseOf(game.trainer)).toEqual(game.home.trainer);
    expect(game.screen()).toBe(game.beforeScreen);
  } finally { game.dispose(); }
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
    expect(game.player.root.position.toArray()).toEqual(stale === "room" ? [2, 0, 4] : game.home.player.root.position);
    expect(poseOf(trainer)).toEqual(nextPose);
    if (stale === "trainer") expect(poseOf(game.trainer)).toEqual(game.home.trainer);
    expect(game.savePlace).not.toHaveBeenCalled();
    expect(count()).toBe(started + 1);
  } finally {
    game.dispose();
    if (trainer !== game.trainer) trainer.dispose();
  }
});

it("bounds playback on stepped time, closes attempts across replay and answer and restores on stalled exit", async () => {
  const game = setup(), started = count();
  const prompt = { label: GYM_ENTRY.startLabel, kind: "gym" } as const;
  useStore.getState().setHud({ prompt });
  vi.stubGlobal("window", { addEventListener: vi.fn(), removeEventListener: vi.fn() });
  const pending: ((ok: boolean) => void)[] = [];
  mocks.audio.play.mockImplementation(() => new Promise((resolve) => { pending.push(resolve); }));
  try {
    await game.open();
    expect(window.__gym?.state()?.phase).toBe("ready");
    expect(game.screen()).toMatchObject({ id: "gym", kind: "menu" });
    expect(game.entry.controlsNpc(GYM_ENTRY.npc)).toBe(true);
    expect(game.player.root.position.toArray()).toEqual([GYM_STAGE.player.x, 0, GYM_STAGE.player.z]);
    expect(game.trainer.root.position.toArray()).toEqual([GYM_STAGE.trainer.x, 0, GYM_STAGE.trainer.z]);
    expect(count()).toBe(started);
    game.entry.action("start");
    game.entry.action("start");
    expect(count()).toBe(started + 1);
    expect(game.view().line?.key).toBe("gy_intro");
    expect(mocks.audio.play.mock.calls[0]).toEqual([
      npcVoice(NPCS.jordan), NPCS.jordan.speed ?? 1, intro,
      { optional: true, recordingOnly: true, signal: expect.any(AbortSignal), slow: false, male: false },
    ]);
    pending[0](true);
    await game.step(19);
    expect(game.view().phase).toBe("intro");
    await game.step();
    expect(game.view()).toMatchObject({ phase: "listen", caption: null, highlight: null, sayIt: null });
    expect(mocks.audio.play.mock.calls[1][2]).toBe(jacks);
    const call = game.view().options;
    game.entry.action("reveal");
    game.entry.action("pick", "jacks");
    await game.step(6);
    expect(game.view()).toMatchObject({ phase: "listen", caption: null });
    await game.step();
    expect(game.view()).toMatchObject({ phase: "listen", caption: { detail: "full" } });
    await game.step(40);
    expect(game.view().phase).toBe("listen");
    await game.step();
    const stalled = mocks.audio.play.mock.calls[1][3].signal as AbortSignal;
    expect(stalled.aborted).toBe(true);
    expect(game.view()).toMatchObject({ phase: "choose", fallback: true, audible: false, helpLevel: 0, highlight: "jacks" });
    pending[1](true);
    await game.step();
    expect(game.view().audible).toBe(false);
    expect(mocks.attempts).toHaveLength(0);

    let cue = game.view().sayIt!;
    cue.toggle();
    expect(game.view().micStatus).toBe("listening");
    expect(mocks.attempts[0].options.lang).toBe(EDITION.target);
    const lease = captureAudio();
    try {
      game.entry.action("replay");
      expect(mocks.attempts[0].dispose).toHaveBeenCalledOnce();
      expect(mocks.audio.play).toHaveBeenCalledTimes(2);
      mocks.attempts[0].options.onCommit(jacks, []);
    } finally { lease.ended(); }
    await game.step(3);
    expect(mocks.audio.play).toHaveBeenCalledTimes(3);
    pending[2](true);
    await game.until("choose");
    expect(game.view()).toMatchObject({ fallback: true, audible: true, revealed: true, score: { said: 0, completed: 0 } });
    expect(game.view().options).toBe(call);
    cue = game.view().sayIt!;
    cue.toggle();
    mocks.attempts[1].options.onCommit(toes, []);
    expect(game.view().micStatus).toBe("miss");
    cue.toggle();
    mocks.attempts[2].options.onCommit(jacks, []);
    expect(game.view()).toMatchObject({ micStatus: "hit", score: { said: 1, completed: 0 } });

    expect(key(game, "enter")).toBe(false);
    expect(key(game, " ")).toBe(false);
    key(game, "1", true);
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
    expect(game.view().options).toBe(call);
    key(game, "arrowleft");
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
    expect(game.screen()).toBe(game.beforeScreen);
    expect(useStore.getState().hud.prompt).toBe(prompt);
    expect(game.held.size).toBe(0);
    expect(game.heading()).toBe(0.45);
    expect(game.rig.mode).toBe("interior");
    expect(game.rig.cam.zoom).toBe(1.03);
    expect(game.rig.cam.fov).toBe(52);
    expect(game.rig.cam.near).toBe(0.16);
    expect(game.rig.cam.view?.offsetY).toBe(-80);
    expect(game.rig.viewShift.y).toBe(-0.16);
    expect(poseOf(game.player)).toEqual(game.home.player);
    expect(poseOf(game.trainer)).toEqual(game.home.trainer);
    expect(game.trainer.watch).toBe(game.home.watch);
    expect(game.savePlace).toHaveBeenCalledOnce();
  } finally {
    game.dispose();
    useStore.getState().setHud({ prompt: null });
  }
});

it("uses the slow manifest deadline and recovers a rejected late call without an answer deadline", async () => {
  const game = setup();
  const settings = useStore.getState().settings;
  useStore.setState({ settings: { ...settings, slowVoice: true } });
  mocks.audio.clipDuration.mockReturnValue(2.46);
  mocks.audio.play.mockResolvedValueOnce(true).mockImplementationOnce(() => new Promise(() => {})).mockResolvedValue(true);
  try {
    await game.open();
    game.entry.action("start");
    await game.until("listen");
    expect(mocks.audio.play.mock.calls[1][3]).toMatchObject({ slow: true, optional: true, recordingOnly: true });
    const signal: AbortSignal = mocks.audio.play.mock.calls[1][3].signal;
    await game.step(74);
    expect(game.view()).toMatchObject({ phase: "listen", caption: null, highlight: null });
    expect(signal.aborted).toBe(false);
    await game.step();
    expect(game.view()).toMatchObject({ phase: "choose", fallback: true, score: { completed: 0, wrong: 0 } });
    expect(signal.aborted).toBe(true);
    await game.step(100);
    expect(game.view()).toMatchObject({ phase: "choose", score: { completed: 0, wrong: 0 } });
    for (let i = 1; i <= 9; i++) {
      game.entry.action("pick", game.view().callId!);
      if (i === 9) {
        mocks.audio.play.mockRejectedValueOnce(new Error("failed final recording"));
      }
      await game.until("choose");
    }
    expect(game.view()).toMatchObject({ index: 10, helpLevel: 2, highlight: null, audible: false, caption: { detail: "full" } });
    game.entry.action("pick", game.view().callId!);
    await game.until("closing");
    await game.step(19);
    expect(game.view().phase).toBe("closing");
    await game.step();
    expect(game.view()).toMatchObject({ phase: "score", ratio: 1, score: { completed: 10, firstTry: 10, wrong: 0, said: 0 } });

    mocks.audio.play.mockResolvedValueOnce(true).mockImplementationOnce(() => new Promise(() => {}));
    game.entry.action("again");
    await game.until("listen");
    const roundSignal: AbortSignal = mocks.audio.play.mock.lastCall![3].signal;
    game.registry.exit(true);
    expect(roundSignal.aborted).toBe(true);
    expect(game.view()).toBeNull();
    expect(game.screen()).toBe(game.beforeScreen);
    expect(poseOf(game.player)).toEqual(game.home.player);
    expect(poseOf(game.trainer)).toEqual(game.home.trainer);
  } finally {
    game.dispose();
    useStore.setState({ settings });
  }
});

it.skipIf(!pc)("requires a distinctive Spanish command and discards transcripts from prior calls", async () => {
  const game = setup();
  mocks.audio.play.mockResolvedValue(true);
  try {
    await game.open();
    game.entry.action("start");
    await game.until("choose");
    for (let i = 0; i < 2; i++) {
      game.entry.action("pick", game.view().callId!);
      await game.until("choose");
    }
    expect(game.view().callId).toBe("squats");
    game.view().sayIt!.toggle();
    const { options } = mocks.attempts[0];
    expect(variety()).toBe("default");
    expect(options.lang).toBe("es-MX");
    expect(options.evaluate("Haz una")).toBe("prefix");
    expect(options.evaluate("Haz una lagartija")).toBe("none");
    expect(options.evaluate("Haz un desplante")).toBe("none");
    expect(options.evaluate("Haz una sentadilla")).toBe("complete");
    options.onCommit("Haz una", []);
    expect(game.view()).toMatchObject({ phase: "choose", micStatus: "miss", score: { said: 0, completed: 2 } });
    game.view().sayIt!.toggle();
    game.entry.action("pick", "squats");
    expect(mocks.attempts[1].dispose).toHaveBeenCalledOnce();
    await game.until("choose");
    mocks.attempts[1].options.onCommit("Haz una sentadilla", []);
    expect(game.view()).toMatchObject({ callId: "circles", micStatus: "idle", score: { said: 0, completed: 3 } });
    game.view().sayIt!.toggle();
    mocks.attempts[2].options.onCommit("Haz círculos con los brazos", []);
    expect(game.view()).toMatchObject({ phase: "choose", micStatus: "hit", score: { said: 1, completed: 3 } });
    game.dispose();
    expect(game.registry.engaged).toBe(false);
    expect(game.view()).toBeNull();
  } finally { game.dispose(); }
});

const rigPhases = [0.12, (9 + 0.01) / 21, 0.75];
const phone = [390, 844, 156, 578] as const;
const desktop = [1280, 800, 146, 625] as const;
const compact = [390, 664, 156, 416] as const;

function stageFrame() {
  const viewport = { width: 390, height: 844, left: 0, top: 0 };
  const header = { bottom: 156 }, dock = { top: 578 };
  const element = (bounds: object) => ({ getBoundingClientRect: () => bounds }) as HTMLElement;
  const observe = (game: ReturnType<typeof setup>) => {
    const stop = game.view().observeFrame(element(viewport), element(header), element(dock));
    const [, resize] = vi.mocked(window.addEventListener).mock.calls.find(([name]) => (name as string) === "resize")!;
    const fitView = ([width, height, top, bottom]: typeof phone | typeof compact | typeof desktop) => {
      Object.assign(viewport, { width, height });
      header.bottom = top;
      dock.top = bottom;
      (resize as () => void)();
    };
    return { stop, resize, fitView };
  };
  return { viewport, header, dock, observe };
}

function gymRoomMeshes(cam: CameraRig["cam"]) {
  const draw = () => {};
  const gradient = () => ({ addColorStop: draw });
  const context = new Proxy({
    measureText: (text: string) => ({ width: text.length * 9 }), createLinearGradient: gradient, createRadialGradient: gradient,
  }, { get: (target, key) => Reflect.get(target, key) ?? draw });
  class Canvas { getContext() { return context; } }
  vi.stubGlobal("HTMLCanvasElement", Canvas);
  vi.stubGlobal("document", { createElement: () => new Canvas() });
  const room = getInterior("gym")!.group;
  room.updateMatrixWorld(true);
  const meshes: Mesh[] = [];
  room.traverseVisible((node) => {
    if (node instanceof Mesh && node.layers.test(cam.layers) && !Array.isArray(node.material)
      && node.material.visible && !node.material.transparent) meshes.push(node);
  });
  return meshes;
}

it.each(rigPhases)("fits the actual rigs in both views and scores a muted round before Again and Done (phase %s)", async (phase) => {
  const game = setup(phase), started = count();
  vi.stubGlobal("window", { addEventListener: vi.fn(), removeEventListener: vi.fn() });
  mocks.audio.volume = 0;
  mocks.audio.play.mockResolvedValue(true);
  const { viewport, header, dock, observe } = stageFrame();
  // Use the PC boxing ring's bounds to find rays that could hit its platform, pads or ropes.
  const ring = new Box3(new Vector3(-4.9, 0, -1), new Vector3(-1.1, 1.72, 2.8));
  const sightline = new Raycaster(), intersection = new Vector3();
  const { ray } = sightline;
  sightline.layers.mask = game.rig.cam.layers.mask;
  let roomMeshes: Mesh[] = [];
  const fitted = (press?: "high" | "low") => {
    expect(game.rig.cam.position.z).toBeLessThan(7);
    const faces = [game.player, game.trainer].map((actor) =>
      actor.headPosition(new Vector3()).project(game.rig.cam).x * viewport.width / 2);
    expect(Math.abs(faces[0] - faces[1])).toBeGreaterThan(viewport.width * 0.06);
    const outlines = [game.player, game.trainer].map((actor) => {
      const outline = { left: Infinity, right: -Infinity };
      actor.root.updateMatrixWorld(true);
      actor.root.traverseVisible((node) => {
        if (!(node instanceof SkinnedMesh)) return;
        const point = new Vector3(), vertexCount = node.geometry.getAttribute("position").count;
        let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity, obstructed = 0;
        for (let i = 0; i < vertexCount; i++) {
          node.getVertexPosition(i, point).applyMatrix4(node.matrixWorld);
          if (pc) {
            ray.origin.copy(game.rig.cam.position);
            ray.direction.subVectors(point, ray.origin);
            sightline.far = ray.direction.length();
            ray.direction.normalize();
            if (ray.intersectBox(ring, intersection) && intersection.distanceTo(ray.origin) < sightline.far
              && sightline.intersectObjects(roomMeshes, false).some((hit) => ring.containsPoint(hit.point))) obstructed++;
          }
          point.project(game.rig.cam);
          const x = (1 + point.x) * viewport.width / 2, y = (1 - point.y) * viewport.height / 2;
          left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
        }
        const sample = JSON.stringify({ pose: window.__gym?.state()?.pose, actor: actor === game.player ? "learner" : "trainer", left, right, top, bottom });
        expect(obstructed, sample).toBe(0);
        expect(left, sample).toBeGreaterThanOrEqual(8);
        expect(right, sample).toBeLessThanOrEqual(viewport.width - 8);
        expect(top, sample).toBeGreaterThanOrEqual(header.bottom + 8);
        expect(bottom, sample).toBeLessThanOrEqual(dock.top - 8);
        expect(bottom - top, sample).toBeGreaterThan(30);
        outline.left = Math.min(outline.left, left);
        outline.right = Math.max(outline.right, right);
      });
      return outline;
    });
    if (press) {
      expect(window.__gym?.state()?.pose).toMatchObject({ player: "pushups", trainer: "pushups" });
      expect(outlines.every(({ left, right }) => right > left)).toBe(true);
      expect(outlines[1].left - outlines[0].right, `${viewport.width}x${viewport.height} ${press} push-up gap in CSS px`)
        .toBeGreaterThanOrEqual(8);
    }
  };
  try {
    if (pc) roomMeshes = gymRoomMeshes(game.rig.cam);
    await game.open();
    const { stop, resize, fitView } = observe(game);
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
      if (i === 6) expect(game.view().helpLevel).toBe(0);
      if (i === 7) expect(game.view()).toMatchObject({ helpLevel: 2, highlight: null });
      game.entry.action("pick", game.view().callId!);
      if (i <= 8) {
        for (let frame = 1; frame <= 15; frame++) {
          await game.step();
          if (frame % 3 === 0) fitted();
          if (pc && i === 8 && (frame === 4 || frame === 9)) {
            for (const view of [phone, desktop, compact]) {
              fitView(view);
              fitted(frame === 4 ? "high" : "low");
            }
            fitView(phone);
          }
        }
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

    fitView(compact);
    fitted();

    fitView(desktop);
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
      if (i < 8) {
        await game.step(9);
        fitted();
      }
    }
    await game.until("score");
    game.entry.action("done");
    await game.step(15);
    stop();
    expect(window.removeEventListener).toHaveBeenCalledWith("resize", resize);
    expect(game.view()).toBeNull();
    expect(game.player.root.position.toArray()).toEqual([GYM_MAT.x, 0, GYM_MAT.z]);
    expect(game.rig.cam.aspect).toBe(1280 / 800);
    expect(game.savePlace.mock.results[0].value).toEqual([GYM_MAT.x, 0, GYM_MAT.z]);
    expect(poseOf(game.trainer)).toEqual(game.home.trainer);
    expect(count()).toBe(started + 2);
  } finally { game.dispose(); }
});

it.skipIf(!pc).each(rigPhases)("clears both push-up outlines with low-quality floor shadows (phase %s)", async (phase) => {
  const game = setup(phase);
  const { viewport, observe } = stageFrame();
  const { cam } = game.rig;
  const previousShadows = Character.blobShadows;
  vi.stubGlobal("window", { addEventListener: vi.fn(), removeEventListener: vi.fn() });
  mocks.audio.volume = 0;
  mocks.audio.play.mockResolvedValue(true);
  setBlobShadows(true);
  try {
    await game.open();
    const { fitView } = observe(game);
    game.entry.action("start");
    for (let i = 1; i <= 7; i++) {
      await game.until("choose");
      game.entry.action("pick", game.view().callId!);
    }
    await game.until("choose");
    expect(game.view()).toMatchObject({ index: 8, callId: "pushups" });
    game.entry.action("pick", "pushups");

    const point = new Vector3();
    const sample = (ms: number) => {
      const pose = window.__gym?.state()?.pose;
      expect(pose).toMatchObject({ player: "pushups", trainer: "pushups" });
      expect(pose?.progress).toBeCloseTo(ms / 900, 6);
      for (const view of [phone, desktop, compact]) {
        fitView(view);
        const label = `${viewport.width}x${viewport.height} at ${ms} ms`;
        const [learner, trainer] = [game.player, game.trainer].map((actor) => {
          let left = Infinity, right = -Infinity, floorVertices = 0;
          actor.root.updateMatrixWorld(true);
          // Match sampleRigs in tests/browser/gym.mjs, including transparent and rigid meshes.
          actor.root.traverseVisible((mesh) => {
            if (!(mesh instanceof Mesh) || Array.isArray(mesh.material) || !mesh.material.visible || !mesh.layers.test(cam.layers)) return;
            const { count } = mesh.geometry.getAttribute("position");
            if (mesh.parent === actor.root && mesh.geometry instanceof PlaneGeometry && mesh.material.transparent) floorVertices += count;
            for (let i = 0; i < count; i++) {
              mesh.getVertexPosition(i, point).applyMatrix4(mesh.matrixWorld).project(cam);
              const x = viewport.left + (point.x + 1) * viewport.width / 2;
              left = Math.min(left, x);
              right = Math.max(right, x);
            }
          });
          const who = actor === game.player ? "learner" : "trainer";
          expect(floorVertices, `${label} ${who} projects the floor shadow`).toBeGreaterThan(0);
          expect(right, `${label} ${who} has a projected outline`).toBeGreaterThan(left);
          return { left, right };
        });
        expect.soft(trainer.left - learner.right, `${label} push-up silhouette gap in CSS px`).toBeGreaterThanOrEqual(8);
      }
      fitView(phone);
    };
    await game.step(4);
    sample(200);
    await game.step(4);
    await game.step(1, 0.005);
    sample(405);
    await game.step(1, 0.045);
    sample(450);
  } finally {
    setBlobShadows(previousShadows);
    game.dispose();
  }
});
