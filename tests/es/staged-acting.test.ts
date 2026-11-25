import { Group, Vector3 } from "three";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NPCS } from "@/content/npcs";
import { loadSituation } from "@/content/situations/catalog";
import { LOTERIA_SITUATION } from "@/editions/es/content/loteria";
import { audio } from "@/game/audio";
import { CameraRig } from "@/game/camera";
import { ALUXES } from "@/game/cave/plan";
import { createCharacter } from "@/game/characters";
import { ModeDialogue, type KitLine } from "@/game/kit/dialogue";
import type { ModeHost } from "@/game/kit/host";
import { conversationLine, learnerTurn } from "@/game/kit/lines";
import type { ModeFrame } from "@/game/kit/modes";
import { TABLE_SEAT, TONAS_SEAT } from "@/game/loteria/location";
import { createLoteriaMode } from "@/game/loteria/mode";
import { createPoolMode } from "@/game/pool/mode";
import { StreetLife, useStreet, type StreetActor } from "@/game/street/StreetLife";
import type { StreetSnapshot } from "@/game/street/schedule";
import { ActorTalk } from "@/game/talkNatural/binding";
import type { VoiceVisualOwner } from "@/game/talkNatural/contract";
import { NaturalSession } from "@/game/talkNatural/session";
import { hotelPoolKidY, POOL_CIRCLE, POOL_KIDS } from "@/game/world/pool";
import { TAXI_LINES } from "@/content/taxi-lines";
import { EMPTY_CONV, useStore, type ConvUI } from "@/state/store";

let owner: VoiceVisualOwner | undefined;
let calls: { owner?: VoiceVisualOwner; slow?: boolean; finish(ok: boolean): void }[];
const store = useStore.getState();
const frame: ModeFrame = { dt: 0.05, time: 0, x: 0, y: 0, brake: false, blocked: false };

beforeEach(() => {
  owner = undefined;
  calls = [];
  vi.stubGlobal("document", { hidden: false });
  vi.spyOn(audio, "clipDuration").mockReturnValue(0.2);
  vi.spyOn(audio, "preload").mockImplementation(() => {});
  vi.spyOn(audio, "sfx").mockImplementation(() => {});
  vi.spyOn(audio, "getState").mockReturnValue("playing");
  vi.spyOn(audio, "visualOwner", "get").mockImplementation(() => owner);
  vi.spyOn(audio, "visualState").mockImplementation((visual) => visual === owner ? "playing" : "interrupt");
  vi.spyOn(audio, "visualElapsed").mockReturnValue(0);
  vi.spyOn(audio, "level").mockReturnValue(0.8);
  vi.spyOn(audio, "vowel").mockReturnValue(null);
  vi.spyOn(audio, "disownVisual").mockImplementation((visual) => { if (visual === owner) owner = undefined; });
  vi.spyOn(audio, "stop").mockImplementation(() => { owner = undefined; });
  vi.spyOn(audio, "play").mockImplementation((_voice, _speed, _text, opts) => new Promise((finish) => {
    owner = opts?.visual;
    calls.push({ owner, slow: opts?.slow, finish });
  }));
  useStore.setState({ settings: { ...store.settings, volume: 1, slowVoice: false } });
});

afterEach(() => {
  useStore.setState({ progress: store.progress, settings: store.settings });
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function stage() {
  const world = new Group(), player = createCharacter(NPCS.renata.look);
  world.add(player.root);
  const host = {
    acting: () => new ActorTalk(), player: () => player, rig: new CameraRig(1),
    place: (x, z, rot) => { player.root.position.set(x, 0, z); player.root.rotation.y = rot; },
    add: (...objects) => { world.add(...objects); },
    prepare() {}, entered() {}, left() {}, splash() {}, updatePose: (dt) => player.update(dt),
    canStart: () => true, owns: () => true, portrait: () => true,
    fade: (enter) => { enter(); return true; },
  } satisfies Partial<ModeHost>;
  return { world, player, host };
}

it("hands lotería off to the mounted Beto and Toña and releases both on exit", async () => {
  await loadSituation(LOTERIA_SITUATION);
  const { host, world, player } = stage();
  const tona = createCharacter(NPCS.tona.look), townBeto = createCharacter(NPCS.beto.look);
  tona.root.position.set(TONAS_SEAT.x, 0, TONAS_SEAT.z);
  tona.setAnim("sit");
  tona.seatY = TABLE_SEAT;
  world.add(tona.root, townBeto.root);
  const mode = createLoteriaMode(host, {
    npc: (id) => id === "tona" ? tona : townBeto,
    prop: () => undefined, dusk: () => () => {}, save() {},
  })!;
  expect(mode.start()).toBe(true);
  const beto = owner?.actor;
  expect(beto).toBeDefined();
  expect(beto).not.toBe(townBeto);
  expect(beto?.root.name).toBe("loteria-beto");
  expect(player.root.visible).toBe(false);
  mode.exit(false);
  expect(owner?.actor).toBe(tona);
  expect(owner?.line).toBe("lt_t_bye");
  mode.exit(true);
  await vi.dynamicImportSettled();
  expect(tona.talkPose).toBeUndefined();
  expect(beto?.talkPose).toBeUndefined();
  expect(owner).toBeUndefined();
  expect(player.root.visible).toBe(true);
  expect(tona.seatY).toBe(TABLE_SEAT);
  expect(mode.start()).toBe(true);
  expect(owner?.actor?.root.name).toBe("loteria-beto");
  expect(owner?.actor).not.toBe(beto);
  await vi.dynamicImportSettled();
  mode.update(frame);
  expect(owner?.actor.talkPose?.mouth).toBeGreaterThan(0);
  mode.update({ ...frame, blocked: true });
  expect(owner).toBeUndefined();
  mode.dispose();
  world.clear();
});

it("owns only the audible pool child, preserves catch and float poses, and restores the learner on exit", async () => {
  const { host, world, player } = stage();
  const kids = new Map(POOL_KIDS.map((id) => [id, createCharacter(NPCS[id].look)]));
  for (const [id, kid] of kids) {
    kid.root.position.set(POOL_CIRCLE[id].x, hotelPoolKidY(id), POOL_CIRCLE[id].z);
    world.add(kid.root);
  }
  useStore.setState({ progress: { ...store.progress, pool: { rulesHeard: true, rounds: 0, best: 0 } } });
  const oldPoolPose = player.poolPose = { paddle: 0.3, reach: 0, surprise: 0, laugh: 0 };
  player.seatY = 0.42;
  const mode = createPoolMode({ ...host, npc: (id: string) => kids.get(id as typeof POOL_KIDS[number]) } as unknown as ModeHost)!;
  vi.spyOn(Math, "random").mockReturnValue(0.42);
  let time = 0;
  function update() {
    time += frame.dt;
    mode.update({ ...frame, time });
    for (const [id, kid] of kids) { mode.poseKid(kid, id, frame.dt, false); kid.update(frame.dt); }
  }
  expect(mode.start()).toBe(true);
  update();
  expect(owner).toMatchObject({ line: "pl_start", actor: kids.get("vale") });
  await vi.dynamicImportSettled();
  const start = calls.at(-1)!;
  start.finish(true);
  await Promise.resolve();
  expect(owner).toBeUndefined();
  for (let i = 0; i < 30 && mode.debug().phase === "opening"; i++) update();
  expect(mode.debug().phase).toBe("play");
  expect(owner).toMatchObject({ line: "pl_tuya", actor: kids.get("diego") });
  await vi.dynamicImportSettled();
  update();
  const diego = kids.get("diego")!, santi = kids.get("santi")!;
  expect(diego.talkPose?.baseGaze).toBe(true);
  expect(diego.talkPose?.poolHead).toBe(false);
  expect(diego.talkPose?.mouth).toBeGreaterThan(0);
  expect(diego.poolPose?.reach).toBeGreaterThan(0);
  expect(santi.root.position.y).toBe(hotelPoolKidY("santi"));
  expect(santi.talkPose).toBeUndefined();
  mode.exit(false);
  expect(owner).toBeUndefined();
  expect(player.poolPose).toBe(oldPoolPose);
  expect(player.seatY).toBe(0.42);
  expect(player.root.visible).toBe(true);
  mode.dispose();
  world.clear();
});

it("uses a fresh request per composed clip and never gives the learner's example to the NPC", async () => {
  const { world, player } = stage();
  const actor = createCharacter(NPCS.memo.look);
  world.add(actor.root);
  const sentence = (key: string) => conversationLine("s66-taxi", "vinnie", key, TAXI_LINES, false)!;
  const cue: KitLine = { key: "call", sentence: sentence("tx_hello"), pieces: [sentence("tx_hello"), sentence("tx_a_where")] };
  const dialogue = new ModeDialogue({
    acting: () => new ActorTalk(), actor: () => ({ actor, id: "memo", motion: "head" }),
    say() {}, mic() {}, choices() {},
  });
  dialogue.micOn = false;
  const first = dialogue.sayPieces(cue, "caller", 1, true);
  calls[0].finish(true);
  await vi.waitFor(() => expect(calls).toHaveLength(2));
  expect(calls[0].owner).not.toBe(calls[1].owner);
  expect(calls[1].owner).toMatchObject({ actor, line: cue.key });
  calls[1].finish(true);
  expect(await first).toBe(true);
  useStore.getState().setSettings({ slowVoice: true });
  const replay = dialogue.replayLine(cue, "caller", 1, true);
  expect(calls[2]).toMatchObject({ owner: { actor, line: cue.key, replay: "turn" }, slow: true });
  dialogue.cancel();
  await replay;
  expect(owner).toBeUndefined();

  const answer: KitLine = { key: "tx_a_where", sentence: sentence("tx_a_where") };
  const turn = dialogue.expectLines([answer], learnerTurn([answer], {}));
  await vi.dynamicImportSettled();
  dialogue.choose(answer.key);
  expect(calls.at(-1)?.owner).toBeUndefined();
  expect(actor.talkPose?.mouth).toBe(0);
  expect(player.talkPose).toBeUndefined();
  dialogue.cancel();
  expect(await turn).toBeNull();
  world.clear();
});

it("keeps both street turns with the approached person and releases a new mount of the same cast on departure", async () => {
  const { world, player, host } = stage();
  const mounts: StreetActor["person"][] = [];
  const street = new StreetLife({
    acting: host.acting,
    learner: host.player,
    near: () => true,
    prepare: () => () => {
      const person = createCharacter(NPCS.beto.look);
      person.root.position.z = -4;
      world.add(person.root);
      mounts.push(person);
      return {
        person, tick: (dt) => person.update(dt), answer() {}, tooFar: () => false,
        projection: () => ({ person: { x: 0.5, y: 0.6, onScreen: true }, prop: null }),
        leave: () => person.root.removeFromParent(), dispose: () => person.root.removeFromParent(),
      };
    },
    pairs: () => [], anchor: () => null, gender: () => "m", tick() {}, dispose() {},
  });
  const snapshot: StreetSnapshot = {
    visible: true, town: true, outdoors: true, onFoot: true, grounded: true, enabled: true,
    conversation: false, panel: false, dialog: false, guide: false, banner: false, cardOpen: false,
    flight: false, loading: false, transition: false, mode: false,
  };
  let done = 0;
  async function reach(step: string, exchange: number) {
    for (let i = 0; i < 100; i++) {
      const moment = useStreet.getState().moment;
      if (moment?.step === step && moment.exchange === exchange) return moment;
      street.tick(0.05, snapshot);
      if (done < calls.length) calls[done++].finish(true);
      await Promise.resolve();
    }
    throw new Error(`Street moment did not reach ${step} ${exchange}`);
  }
  try {
    street.observe(snapshot);
    expect(street.streetNow("i_dropped", "a")).toBe(true);
    const first = await reach("choices", 0);
    first.choose(first.choices[0].key);
    expect(calls.at(-1)?.owner).toBeUndefined();
    const second = await reach("choices", 1);
    expect(calls.some(({ owner }) => owner?.actor === mounts[0])).toBe(true);
    second.choose(second.choices[0].key);
    await reach("done", 1);
    expect(calls.filter(({ owner }) => owner).every(({ owner }) => owner?.actor === mounts[0])).toBe(true);
    expect(mounts[0].talkPose).toBeUndefined();
    street.tick(11, snapshot);
    await Promise.resolve();
    street.tick(11, snapshot);
    expect(street.streetNow("i_dropped", "a")).toBe(true);
    const rerun = await reach("choices", 0);
    rerun.choose(rerun.choices[0].key);
    await reach("reply", 0);
    expect(calls.at(-1)?.owner?.actor).toBe(mounts[1]);
    street.observe({ ...snapshot, outdoors: false });
    await vi.dynamicImportSettled();
    expect(owner).toBeUndefined();
    expect(mounts[1].talkPose).toBeUndefined();
  } finally {
    street.dispose();
    player.talkPose?.interrupt();
    world.clear();
  }
});

it.each(["alux_kin", "alux_nikte"])("uses %s's mounted height for the ordinary grotto presentation", (id) => {
  const spot = ALUXES.find(({ npc }) => npc === id)!;
  const { world, player } = stage();
  const actor = createCharacter(NPCS[id].look);
  actor.root.position.set(spot.x, 0, spot.z);
  actor.root.rotation.y = spot.rot;
  if (spot.sit) { actor.seatY = spot.seat; actor.setAnim("sit"); }
  player.root.position.set(spot.ax, 0, spot.az);
  world.add(actor.root);
  actor.update(0);
  const at = actor.headJoint.getWorldPosition(new Vector3());
  const cast = { id, ch: actor };
  const say = "¡Hola!";
  const conv: ConvUI = {
    ...EMPTY_CONV, active: true, phase: "npc", run: 1, npcId: id, hostId: id, speaking: 1,
    transcript: [{ id: 1, who: "npc", npc: id, sentence: { en: say, say, nat: "", units: [] } }],
  };
  const session = new NaturalSession({
    run: conv.run, zone: { id: "gruta", group: world }, host: cast, cast: [cast], people: [cast],
    extras: [], player, audio, free: () => true,
  });
  try {
    owner = { actor, line: 1 };
    session.present(conv, true);
    session.update(conv, 0.1);
    actor.update(0.1);
    expect(actor.talkPose?.mouth).toBeGreaterThan(0);
    expect(actor.root.position.toArray()).toEqual([spot.x, 0, spot.z]);
    expect(actor.headJoint.getWorldPosition(new Vector3()).y).toBeCloseTo(at.y, 1);
    if (id === "alux_nikte") expect(actor.seatY).toBe(0.74);
    session.close();
    actor.update(0.3);
    player.update(0.3);
    expect(actor.talkPose).toBeUndefined();
  } finally {
    session.dispose();
    world.clear();
  }
});
