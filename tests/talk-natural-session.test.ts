import { afterEach, describe, expect, it, vi } from "vitest";
import { Group, Vector3 } from "three";
import { NPCS } from "../src/content/npcs";
import { classifyTalk } from "../src/content/talkNatural";
import type { VisualPlaybackState, VisualVoiceSample } from "../src/game/audio";
import { Character } from "../src/game/characters/Character";
import { ROOM_PEOPLE } from "../src/game/world/roomPeople";
import type { VoiceVisualOwner } from "../src/game/talkNatural/contract";
import { NaturalSession, type NaturalOptions } from "../src/game/talkNatural/session";
import { lineSeed } from "../src/game/talkNatural/seed";
import { bindNaturalTalk } from "../src/game/talkNatural/view";
import { DEFAULT_SETTINGS, EMPTY_CONV, useStore, type ConvUI } from "../src/state/store";

type InspectWindow = Window & { __talkNatural?: { sample(): ReturnType<NaturalSession["sample"]> } };
const sample = () => (window as InspectWindow).__talkNatural?.sample();
const fixtures: (() => void)[] = [];

afterEach(() => {
  for (const dispose of fixtures.splice(0).reverse()) dispose();
  vi.unstubAllGlobals();
});

function scene(run = 17, room = "dans-house", npc = "dan", phone = false) {
  vi.stubGlobal("window", new EventTarget());
  const doc = Object.assign(new EventTarget(), { hidden: false });
  vi.stubGlobal("document", doc);
  const group = new Group();
  const host = { id: npc, ch: new Character(NPCS[npc].look) };
  const other = { id: "nora", ch: new Character(NPCS.nora.look) };
  const near = new Character({ ...NPCS.dan.look, carry: undefined, phone });
  const player = new Character(NPCS.dan.look);
  group.add(host.ch.root, other.ch.root, near.root, player.root);
  host.ch.root.position.set(room === "sunny-cup" ? -1.2 : 0, 0, room === "sunny-cup" ? -4.2 : 0);
  other.ch.root.position.x = 1.8;
  near.root.position.set(host.ch.root.position.x + 0.8, 0, host.ch.root.position.z - 2.5);
  player.root.position.set(host.ch.root.position.x, 0, host.ch.root.position.z + 2);
  player.root.rotation.y = Math.PI;
  const conv: ConvUI = { ...EMPTY_CONV, run, active: true, hostId: host.id, npcId: host.id, transcript: [] };
  const audio = {
    visualOwner: undefined as VoiceVisualOwner | undefined,
    state: "playing" as VisualPlaybackState,
    elapsed: 0,
    visualState(owner: VoiceVisualOwner) { return owner === this.visualOwner ? this.state : "interrupt" as const; },
    visualElapsed() { return this.elapsed; },
    readVisualEnvelope(owner: VoiceVisualOwner, sample: VisualVoiceSample) {
      Object.assign(sample, { time: this.elapsed, level: 0.7, vowel: 0.5, quiet: 0 });
      return this.visualState(owner);
    },
  };
  const options: NaturalOptions = {
    run, zone: { id: room, group }, host, cast: [host, other], people: [host, other],
    extras: [near], player, audio, free: () => true,
  };
  const natural = new NaturalSession(options);
  const actors = [host.ch, other.ch, player, near];
  for (const ch of actors) { ch.fidgets = false; ch.update(0); }
  fixtures.push(() => { natural.dispose(); actors.forEach((ch) => ch.dispose()); });

  function turn(id: number, say: string, actor = host, replay?: VoiceVisualOwner["replay"]) {
    conv.transcript.push({ id, who: "npc", npc: actor.id, sentence: { en: say, say, nat: "", units: [] } });
    Object.assign(conv, { npcId: actor.id, phase: "npc", speaking: id });
    audio.elapsed = 0;
    return audio.visualOwner = { line: id, actor: actor.ch, replay };
  }
  function waitForLearner() {
    Object.assign(conv, { speaking: null, phase: "you" });
    audio.visualOwner = undefined;
  }
  function authored(unavailable: boolean, replay = false, age = 0) {
    return (conv.transcript.at(-1)!.acting = { at: performance.now() - age * 1000, replay, unavailable });
  }
  function advance(seconds: number) {
    for (let i = 0; i < Math.round(seconds * 60); i++) {
      natural.update(conv, 1 / 60);
      for (const ch of actors) ch.update(1 / 60);
      if (audio.visualOwner && audio.state === "playing") audio.elapsed += 1 / 60;
    }
  }
  return { natural, conv, options, audio, group, doc, host, other, player, near, advance, turn, waitForLearner, authored };
}

function eligible(id: string, run: number, chance = 0.70) {
  return Array.from({ length: 40 }, (_, i) => i + 1).filter((n) => lineSeed(id, run, n, 5) < chance);
}

describe("shared 3D presentation", () => {
  it("keeps the base edition's resolver and deterministic cues", () => {
    expect(classifyTalk("Hi! Where can I take you?", "town", true).family).toBe("greeting");
    expect(classifyTalk("Here's your ticket.", "station", false)).toEqual({ family: "offer", anchor: "handoff" });
    expect(lineSeed("dan", 2, 3)).toBe(lineSeed("dan", 2, 3));
    expect(lineSeed("dan", 2, 3)).not.toBe(lineSeed("dan", 3, 3));
  });

  it("joins a live line late, listens through choices and mic waiting, and uses fresh replay owners", () => {
    const s = scene();
    const first = s.turn(1, "Hi! Where can I take you?");
    s.audio.elapsed = 0.4;
    s.natural.present(s.conv, true);
    s.advance(0.3);
    const opening = sample()!;
    expect(opening).toMatchObject({ run: 17, lineId: 1, speakerId: "dan", playback: "playing", gesture: null, requestOwned: true });
    expect(opening.mouth).toBeGreaterThan(0.6);
    expect(opening.others[0]?.mouth).toBe(0);

    s.waitForLearner();
    s.conv.speechChoices = ["Yes", "No"];
    s.conv.mic = { status: "listening", heard: "" };
    s.conv.practice = { en: "example", status: "playing", heard: "" };
    s.audio.visualOwner = { actor: s.host.ch, line: "unrelated" };
    s.advance(0.3);
    expect(sample()).toMatchObject({ listening: true, mouth: 0, requestOwned: false, listeningWeight: 1 });
    s.natural.feedback(s.host.id, "puzzled");
    s.advance(0.22);
    expect(sample()?.reaction).toMatchObject({ kind: "puzzled", sequence: 1 });
    expect(sample()?.reaction?.weight).toBeGreaterThan(0.8);

    s.audio.visualOwner = { ...first, replay: "transcript" };
    s.advance(0.23);
    expect(sample()).toMatchObject({ lineId: 1, requestOwned: true, gesture: null, reaction: { kind: "repeat", sequence: 2 } });
    expect(sample()?.requestId).not.toBe(opening.requestId);

    s.natural.feedback(s.other.id, "nod");
    s.natural.aim(s.other.id);
    expect(sample()?.requestOwned).toBe(false);
    s.turn(2, "Yes, I'm ready.", s.other);
    s.advance(0.11);
    expect(sample()?.timers.aim).toBeCloseTo(0.10);
    s.advance(0.13);
    expect(sample()).toMatchObject({ speakerId: "nora", lineId: 2, requestOwned: true, reaction: { kind: "understood", sequence: 3 } });
    expect(sample()?.reaction?.weight).toBeGreaterThan(0.5);
    expect(sample()?.speaker?.deltas.smile).toBeGreaterThan(0.003);
    expect(sample()?.others[0]?.mouth).toBe(0);
    expect(sample()?.mouth).toBeGreaterThan(0.6);
  });

  it("discards a covered cue and glances once at the forward handoff, within the angle and motion limits", () => {
    const s = scene(2, "sunny-cup", "mia");
    s.natural.present(s.conv, true);
    s.audio.state = "loading";
    s.turn(1, "Here is your coffee!");
    s.advance(0.08);
    s.natural.suspend();
    expect(sample()).toBeNull();
    expect(s.host.ch.talkPose).toBeUndefined();
    s.audio.state = "playing";
    s.natural.present(s.conv, false);
    s.advance(0.4);
    expect(sample()).toMatchObject({ reaction: null, gesture: null, playback: "playing", requestOwned: true });

    s.turn(2, "Here is your receipt.");
    let glances = 0, first = -1, eyesLead = false;
    for (let i = 0; i < 80; i++) {
      s.advance(1 / 60);
      const gaze = sample()?.gaze;
      if (gaze?.target !== "handoff") continue;
      if (first < 0) first = (i + 1) / 60;
      glances++;
      eyesLead ||= gaze.eyeY !== 0 && gaze.pitch === 0;
      expect(Math.abs(gaze.pitch)).toBeLessThanOrEqual(0.07);
      expect(Math.abs(gaze.yaw)).toBeLessThanOrEqual(0.12);
      expect(Math.abs(gaze.eyeX)).toBeLessThanOrEqual(0.009);
      expect(Math.abs(gaze.eyeY)).toBeLessThanOrEqual(0.004);
    }
    expect(first).toBeGreaterThanOrEqual(0.25);
    expect(first).toBeLessThanOrEqual(0.57);
    expect(eyesLead).toBe(true);
    expect(glances / 60).toBeGreaterThan(0.59);
    expect(sample()?.gaze?.target).toBe("learner");

    s.turn(3, "The menu is on the board behind me.");
    s.advance(0.65);
    expect(sample()?.gaze?.target).toBe("learner");
    const pose = s.host.ch.talkPose as ReturnType<typeof import("../src/game/talkNatural/pose").bindConversationPose>;
    expect(pose?.glanceAt(new Vector3(-1.2, 6, -3.5))).toBe(false);
    expect(pose?.glanceAt(new Vector3(1.8, 1.5, -3.9))).toBe(false);
    s.waitForLearner();
    s.advance(0.35);
    expect(sample()).toMatchObject({ role: "listening", listeningWeight: 1, deltas: { torsoPitch: 0, elbowL: 0, elbowR: 0 } });
    expect(sample()!.deltas!.headPitch).toBeGreaterThan(0.015);
  });

  it("gives the visible learner a small, seeded nod or weight shift every five to eight seconds", () => {
    const s = scene();
    s.waitForLearner();
    s.natural.present(s.conv, true);
    const starts: number[] = [];
    let moving = false;
    for (let i = 1; i <= 24 * 60; i++) {
      s.advance(1 / 60);
      if (i <= 18) continue; // The entry blend finishes before the first listening beat.
      const { headPitch, hipRoll } = sample()!.player!.deltas;
      const beat = Math.max(Math.abs(headPitch), Math.abs(hipRoll)) > 1e-7;
      expect(Math.abs(headPitch)).toBeLessThanOrEqual(0.0550001);
      expect(Math.abs(hipRoll)).toBeLessThanOrEqual(0.0140001);
      if (beat && !moving) starts.push(i / 60);
      moving = beat;
    }
    expect(starts.length).toBeGreaterThanOrEqual(3);
    let at = 0;
    for (const start of starts) {
      expect(start - at).toBeGreaterThanOrEqual(5 - 1 / 60);
      expect(start - at).toBeLessThanOrEqual(8 + 1 / 60);
      at = start;
    }
  });

  it("uses the actual facing, enforces 1.6 seconds between arm beats, and drops matching strokes in succession", () => {
    const s = scene();
    s.natural.present(s.conv, true);
    const ids = eligible("dan", 17);
    s.turn(ids[0], "Turn left.");
    s.advance(0.33);
    expect(sample()).toMatchObject({ gesture: "point" });
    expect(sample()?.deltas?.outL).toBeLessThan(-0.03);
    expect(sample()?.deltas?.outR).toBe(0);
    const first = sample()!.timers.armAt;

    s.waitForLearner(); s.advance(0.7);
    s.turn(ids[1], "Turn right.");
    s.advance(0.33);
    expect(sample()?.gesture).toBeNull();
    expect(sample()?.timers.armAt).toBe(first);
    s.waitForLearner(); s.advance(0.8);
    s.turn(ids[2], "It's on your right.");
    s.advance(0.33);
    expect(sample()?.gesture).toBeNull();

    s.host.ch.root.rotation.y = Math.PI;
    s.waitForLearner(); s.advance(0.2);
    s.turn(ids[3], "Turn left.");
    s.advance(0.33);
    expect(sample()?.deltas?.outL).toBe(0);
    expect(sample()?.deltas?.outR).toBeGreaterThan(0.03);
    expect(sample()!.timers.armAt - first).toBeGreaterThanOrEqual(1.6);
  });

  it("renders one authored silent point, finishes its stroke on a fast same-speaker handoff, and retains the signed arm", () => {
    const s = scene();
    const [line, next] = eligible("dan", 17);
    s.turn(line, "Turn left.");
    s.audio.visualOwner = undefined;
    s.authored(true);
    s.natural.present(s.conv, true);
    s.advance(0.15);
    const before = sample()!.speaker!;
    expect(before).toMatchObject({ gestureLine: line, pointLine: line, pointSide: -1, mouth: 0 });

    s.turn(next, "Yes, I'm ready.");
    s.audio.visualOwner = undefined;
    s.authored(true);
    s.advance(0.10);
    const peak = sample()!;
    expect(peak).toMatchObject({ lineId: next, speakingLineId: next, requestOwned: false, mouth: 0,
      speaker: { gestureLine: next, pointLine: line, pointSide: -1, pointStraight: false } });
    expect(peak.speaker!.pointWeight).toBeGreaterThan(before.pointWeight);
    expect(peak.deltas!.outL).toBeLessThan(-0.03);
    expect(peak.deltas!.outR).toBe(0);
    const rig = s.host.ch.naturalRig()!;
    expect(rig.mouth.scale.toArray().every((axis) => Math.abs(axis) <= 0.00002)).toBe(true);
    expect(rig.upperL.rotation.x).toBeCloseTo(peak.speaker!.upperL);
    s.advance(0.17);
    expect(sample()?.speaker?.pointLine).toBeNull();
    const onset = peak.timers.armAt;
    expect(sample()?.timers.armAt).toBe(onset);
  });

  it.each(["unavailable", "optional failure", "playing", "stale"] as const)("waits for the pending owner or a confirmed %s", (resolution) => {
    const s = scene();
    const [line] = eligible("dan", 17);
    const owner = s.turn(line, "Turn right.");
    if (resolution !== "optional failure") s.authored(false);
    s.audio.state = "loading";
    s.natural.present(s.conv, true);
    s.advance(resolution === "stale" || resolution === "playing" ? 0.32 : 0.08);
    expect(sample()).toMatchObject({ requestOwned: true, gesture: null, mouth: 0 });
    if (resolution === "optional failure") {
      s.audio.visualOwner = undefined;
      s.authored(true);
    } else s.audio.state = resolution === "playing" ? "playing" : "unavailable";

    s.advance(0.36);
    if (resolution === "stale") expect(sample()?.gesture).toBeNull();
    else {
      expect(sample()).toMatchObject({ gesture: "point", speaker: { pointLine: line, pointSide: 1 } });
      expect(sample()!.speaker!.pointWeight).toBeGreaterThan(0.20);
      if (resolution === "playing") expect(sample()!.mouth).toBeGreaterThan(0.6);
      else expect(sample()!.mouth).toBe(0);
    }
    const armAt = sample()!.timers.armAt;
    s.audio.visualOwner = { ...owner };
    s.audio.elapsed = 0;
    s.audio.state = "playing";
    s.advance(0.8);
    expect(sample()).toMatchObject({ gesture: null, timers: { armAt } });
  });

  it("discards recovery at cast handoff and skips stale, replayed, and unowned lines", () => {
    const s = scene();
    const ids = eligible("dan", 17);
    for (const [i, unavailable, replay, age] of [[0, false, false, 0], [1, true, true, 0], [2, true, false, 0.5]] as const) {
      s.turn(ids[i], "Turn left.");
      s.audio.visualOwner = { actor: s.other.ch, line: ids[i] };
      s.authored(unavailable, replay, age);
      if (i === 0) s.natural.present(s.conv, true);
      s.advance(0.2);
      expect(sample()).toMatchObject({ requestOwned: false, gesture: null, mouth: 0 });
    }
    s.turn(ids[3], "Turn right.");
    s.audio.visualOwner = undefined;
    s.authored(true);
    s.advance(0.12);
    expect(sample()?.speaker?.pointLine).toBe(ids[3]);
    s.natural.aim(s.other.id);
    s.turn(ids[4], "Here we are.", s.other);
    s.audio.visualOwner = undefined;
    s.authored(true);
    s.advance(0.10);
    expect(sample()).toMatchObject({ speakerId: s.other.id, gesture: null, others: [{ gesture: null, pointLine: null }] });
  });

  it("lets one free nearby observer glance briefly after the seeded interval", () => {
    const s = scene();
    s.natural.present(s.conv, true);
    const start = sample()!.timers.bystanderAt;
    expect(start).toBeGreaterThanOrEqual(6);
    expect(start).toBeLessThanOrEqual(10);
    let glances = 0;
    for (let i = 0; i < 11 * 60; i++) {
      s.advance(1 / 60);
      const state = sample();
      if (state?.bystander?.gaze.target === s.host.id) {
        expect(state.timers.time).toBeGreaterThanOrEqual(start);
        expect(state.bystander.mouth).toBe(0);
        glances++;
      }
    }
    expect(glances / 60).toBeGreaterThanOrEqual(0.45);
    expect(glances / 60).toBeLessThanOrEqual(0.8);
    expect(s.near.talkPose).toBeUndefined();
  });

  it("finds the real café phone neighbour only once their hands are free, and holds the reduced rig quiet", () => {
    const query = Object.assign(new EventTarget(), { matches: true });
    vi.stubGlobal("matchMedia", () => query);
    const s = scene(17, "sunny-cup", "mia", true);
    const { x, z, rot } = ROOM_PEOPLE["sunny-cup"][4];
    s.near.root.position.set(x, 0, z);
    s.near.root.rotation.y = rot;
    s.group.rotation.y = Math.PI / 3;
    const phone = s.near["phone"]!;
    expect(phone.scale.x).toBeLessThan(0.5);
    expect(s.near.canNoticeTalk()).toBe(true);

    const random = vi.spyOn(Math, "random").mockReturnValue(0.1);
    fixtures.push(() => random.mockRestore());
    s.near.fidgets = true;
    s.near["momentT"] = 0;
    s.near.update(0.4);
    expect(phone.scale.x).toBeGreaterThanOrEqual(0.5);
    expect(s.near.canNoticeTalk()).toBe(false);
    s.turn(1, "Hi!");
    s.natural.present(s.conv, false);
    expect(sample()?.bystander).toBeNull();

    s.near.attentive = true;
    s.advance(0.5);
    expect(phone.scale.x).toBeLessThan(0.5);
    expect(s.near.canNoticeTalk()).toBe(true);
    const prop = new Group();
    s.near.rightHand.add(prop);
    s.waitForLearner();
    s.advance(0.1);
    expect(sample()?.bystander).toBeNull();
    s.near.rightHand.remove(prop);
    s.turn(2, "Hi again.");
    s.advance(0.1);
    expect(sample()?.bystander).toMatchObject({ identity: s.near.root.uuid, role: "bystander", reduced: true,
      mouth: 0, gestureWeight: 0, gaze: { target: null } });
    expect(sample()!.timers.time).toBeLessThan(sample()!.timers.bystanderAt);

    s.waitForLearner();
    const rig = s.near.naturalRig()!;
    const nodes = [rig.body, rig.head, rig.eye, rig.corners!, rig.upperL, rig.foreR];
    const joints = () => nodes.flatMap(({ rotation, position }) => [rotation.x, rotation.y, rotation.z, ...position.toArray()]);
    const rest = joints();
    for (let i = 0; i < 14; i++) {
      s.advance(0.5);
      expect(Math.max(...joints().map((value, j) => Math.abs(value - rest[j])))).toBeLessThanOrEqual(0.002);
      expect(sample()?.bystander?.identity).toBe(s.near.root.uuid);
    }
  });

  it.each([true, false])("deduplicates completion and farewells, then releases the rigs (clap first %s)", (clapFirst) => {
    const s = scene();
    s.natural.present(s.conv, true);
    if (clapFirst) s.natural.feedback(s.host.id, "clap");
    s.turn(eligible("dan", 17)[0], "See you later!");
    s.advance(0.3);
    if (!clapFirst) s.natural.feedback(s.host.id, "clap");
    s.audio.visualOwner = undefined;
    s.conv.phase = "ended";
    s.advance(0.12);
    expect(sample()).toMatchObject({ phase: "ended", reaction: { kind: "farewell", sequence: 1 } });
    s.natural.close();
    s.advance(0.15);
    expect(sample()).toMatchObject({ phase: "released", requestOwned: false });
    expect(sample()?.speaker?.weight).toBeCloseTo(0.5);
    s.advance(0.15);
    expect(sample()).toBeNull();
    expect(s.player.talkPose).toBeUndefined();
  });

  it("clears delayed gestures on live reduced motion and removes the rig when unmounted", () => {
    const query = Object.assign(new EventTarget(), { matches: false });
    vi.stubGlobal("matchMedia", () => query);
    const s = scene();
    s.audio.state = "loading";
    s.turn(1, "Hi!");
    s.natural.present(s.conv, true);
    query.matches = true;
    query.dispatchEvent(new Event("change"));
    s.natural.discardPending(s.conv);
    s.audio.state = "playing";
    s.advance(0.35);
    expect(sample()).toMatchObject({ reduced: true, gesture: null, deltas: { headPitch: 0, browL: 0, upperL: 0, torsoPitch: 0 } });
    expect(sample()?.mouth).toBeGreaterThan(0.6);
    query.matches = false;
    query.dispatchEvent(new Event("change"));
    s.advance(0.3);
    expect(sample()?.gesture).toBeNull();
    s.group.remove(s.host.ch.root);
    expect(s.host.ch.talkPose).toBeUndefined();
  });
});

describe("visibility before the lazy import resolves", () => {
  it("waits for intro and readiness, discards imports on picture, panels, tab hide and handoff, and binds on fresh return", async () => {
    const s = scene();
    const page = window, motion = Object.assign(new EventTarget(), { matches: false });
    Object.assign(page, { matchMedia: () => motion });
    const listeners = [page, s.doc, motion].map((target) => ({
      add: vi.spyOn(target, "addEventListener"), remove: vi.spyOn(target, "removeEventListener"),
    }));
    const { settings, conv, hud } = useStore.getState();
    fixtures.push(() => useStore.setState({ settings, conv, hud }));
    useStore.setState({ settings: { ...DEFAULT_SETTINGS, scenes: false }, conv: { ...s.conv, introOpen: true }, hud: { ...hud, panel: null } });
    const loads: ((value: typeof import("../src/game/talkNatural/session")) => void)[] = [];
    const load = () => new Promise<typeof import("../src/game/talkNatural/session")>((resolve) => loads.push(resolve));
    const module = await import("../src/game/talkNatural/session");
    let ready = false;
    const current = () => useStore.getState().conv;
    const view = bindNaturalTalk(s.options, {
      hasArt: true, valid: () => current().active && current().run === 17, ready: () => ready, blocked: () => false,
    }, load);
    fixtures.push(() => view.stop());
    expect(loads).toHaveLength(0);
    useStore.getState().setConv({ introOpen: false });
    expect(loads).toHaveLength(0);
    ready = true;
    view.update(current(), 0);
    useStore.getState().setSettings({ scenes: true });
    loads[0](module);
    await Promise.resolve();
    expect(s.host.ch.talkPose).toBeUndefined();

    useStore.getState().setSettings({ scenes: false });
    useStore.getState().setHud({ panel: "map" });
    useStore.getState().setHud({ panel: null });
    s.doc.hidden = true;
    s.doc.dispatchEvent(new Event("visibilitychange"));
    s.doc.hidden = false;
    s.doc.dispatchEvent(new Event("visibilitychange"));
    view.aim(s.other.id);
    expect(loads).toHaveLength(5);
    for (const settle of loads.slice(1, -1)) settle(module);
    await Promise.resolve();
    expect(s.host.ch.talkPose).toBeUndefined();
    loads.at(-1)!(module);
    await Promise.resolve();
    expect(s.host.ch.talkPose).toBeDefined();
    expect(sample()?.run).toBe(17);
    useStore.getState().setConv({ run: 18, active: false });
    expect(s.host.ch.talkPose).toBeUndefined();
    expect(view.stop()).toBe(false);
    view.aim(s.host.id);
    expect(loads).toHaveLength(5);
    for (const { add, remove } of listeners) expect(remove.mock.calls).toEqual(add.mock.calls);
  });

  it("invalidates imports on pagehide, close and immediate reentry", async () => {
    const s = scene();
    const { settings, conv, hud } = useStore.getState();
    fixtures.push(() => useStore.setState({ settings, conv, hud }));
    useStore.setState({ settings: { ...DEFAULT_SETTINGS, scenes: false }, conv: s.conv, hud: { ...hud, panel: null } });
    const loads: ((value: typeof import("../src/game/talkNatural/session")) => void)[] = [];
    const load = () => new Promise<typeof import("../src/game/talkNatural/session")>((resolve) => loads.push(resolve));
    const module = await import("../src/game/talkNatural/session");
    const visibility = (run: number) => ({
      hasArt: true, valid: () => useStore.getState().conv.run === run, ready: () => true, blocked: () => false,
    });
    const old = bindNaturalTalk(s.options, visibility(17), load);
    window.dispatchEvent(new Event("pagehide"));
    window.dispatchEvent(new Event("pageshow"));
    old.stop();
    useStore.getState().setConv({ run: 18 });
    const next = bindNaturalTalk({ ...s.options, run: 18 }, visibility(18), load);
    fixtures.push(() => next.stop());
    expect(loads).toHaveLength(3);
    loads[2](module);
    await Promise.resolve();
    const binding = s.host.ch.talkPose;
    expect(binding).toBeDefined();
    loads[0](module);
    loads[1](module);
    await Promise.resolve();
    expect(s.host.ch.talkPose).toBe(binding);
    expect(sample()?.run).toBe(18);
    expect(next.stop(true)).toBe(true);
    expect(next.stop(true)).toBe(true);
    expect(binding?.releasing).toBe(true);
    window.dispatchEvent(new Event("pagehide"));
    expect(s.host.ch.talkPose).toBeUndefined();
    expect(s.player.talkPose).toBeUndefined();
    expect(next.update(useStore.getState().conv, 0)).toBe(false);
    window.dispatchEvent(new Event("pageshow"));
    expect(loads).toHaveLength(3);
  });

  it("leaves an absent actor unbound", () => {
    const s = scene();
    s.group.remove(s.host.ch.root);
    s.turn(1, "Hi!");
    s.natural.present(s.conv, true);
    s.advance(0.4);
    expect(sample()).toBeNull();
    expect(s.player.talkPose).toBeUndefined();
    expect(s.other.ch.talkPose).toBeUndefined();
  });
});
