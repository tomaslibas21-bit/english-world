import { afterEach, describe, expect, it, vi } from "vitest";
import { Group } from "three";
import { ASK_WAY_LINES } from "../src/content/ask-way-lines";
import { NPCS } from "../src/content/npcs";
import { cafe } from "../src/content/situations/s72-cafe";
import { tickets } from "../src/content/situations/s67a-tickets";
import { classifyTalk, talkPersonality } from "../src/content/talkNatural";
import { compose } from "../src/convo/compose";
import type { VisualPlaybackState } from "../src/game/audio";
import { Character } from "../src/game/characters/Character";
import type { VoiceVisualOwner } from "../src/game/talkNatural/contract";
import { bindConversationPose } from "../src/game/talkNatural/pose";
import { lineSeed, NaturalSession } from "../src/game/talkNatural/session";
import { talkRoomAnchors } from "../src/game/world/talkNatural";
import { EMPTY_CONV, type ConvUI } from "../src/state/store";

describe("Maple Harbor talk cues", () => {
  const say = (src: Parameters<typeof compose>[0]) => compose(src, {}, { look: () => undefined }).say;

  it("classifies composed lines from the directions, café and ticket scenes", () => {
    const way = (id: string) => classifyTalk(say(ASK_WAY_LINES[id][0]), "town", id === "aw_greet");
    expect(way("aw_greet").family).toBe("greeting");
    expect(way("aw_post_1")).toMatchObject({ family: "point", side: -1 });
    expect(way("aw_cafe_1")).toMatchObject({ family: "point", side: 1 });
    expect(way("aw_cafe_2")).toMatchObject({ family: "point", side: -1 });
    expect(way("aw_bye").family).toBe("goodbye");
    expect(classifyTalk(say(cafe.lines.served_here[0]), "sunny-cup", false)).toMatchObject({ family: "offer", anchor: "handoff" });
    expect(classifyTalk(say(cafe.lines.menu_line[1]), "sunny-cup", false)).toMatchObject({ family: "rest", anchor: "menu" });
    expect(classifyTalk(say(tickets.lines.ticket_one[0]), "station", false)).toMatchObject({ family: "offer", anchor: "handoff" });
    expect(classifyTalk(say(tickets.lines.no_problem[0]), "station", false).family).toBe("yes");
    expect(classifyTalk(say(tickets.lines.have_trip[1]), "station", false, true, true).family).toBe("repeat");
  });

  it.each([
    ["Here you go!", "offer"],
    ["It's on your right.", "point"],
    ["We're ready, right?", "rest"],
    ["I think it's this one.", "shrug"],
    ["No, that's all.", "no"],
    ["Okay, two tickets.", "count"],
    ["That's ticket number 241.", "rest"],
    ["That is your one-way ticket.", "rest"],
    ["Hi! Where can I take you?", "greeting"],
    ["Nice to see you!", "greeting"],
    ["Good to see you again! What would you like today?", "greeting"],
    ["Where can I take you?", "question"],
    ["See you later.", "goodbye"],
    ["Good night! Get home safe.", "goodbye"],
    ["I'll take care of that.", "rest"],
  ] as const)("resolves %s as %s", (say, family) => {
    expect(classifyTalk(say, "station", true).family).toBe(family);
  });

  it("uses the existing room coordinates and distinguishes a machine from a counter exchange", () => {
    const room = new Group();
    room.position.set(1, 0, 2);
    room.userData.mapSpot = { x: 4.5, y: 2.2, z: -5.8 };
    expect(talkRoomAnchors("visitor-center", room).map?.toArray()).toEqual([5.5, 2.2, -3.8]);
    const handoff = talkRoomAnchors("sunny-cup", room).handoff!;
    expect(handoff.x).toBeCloseTo(-0.2);
    expect(handoff.y).toBe(1.08);
    expect(handoff.z).toBeCloseTo(-1.2);
    expect(talkRoomAnchors("station", room).machine?.z).toBeCloseTo(-6.37);
    expect(classifyTalk("Use the ticket machine.", "station", false).anchor).toBe("machine");
    expect(classifyTalk("Use the ticket machine.", "sunny-cup", false).anchor).toBeUndefined();
    expect(classifyTalk("Your train leaves from Track 2.", "station", false).anchor).toBeUndefined();
    expect(classifyTalk("Here's your ticket.", "station", false).anchor).toBe("handoff");
    expect(talkPersonality("walter").armChance).toBe(0.45);
    expect(talkPersonality("dan").armChance).toBe(0.70);
    expect(talkPersonality("rosie").armChance).toBe(0.55);
    expect(lineSeed("dan", 2, 3)).toBe(lineSeed("dan", 2, 3));
    expect(lineSeed("dan", 2, 3)).not.toBe(lineSeed("dan", 3, 3));
  });
});

type Sample = NonNullable<ReturnType<NaturalSession["sample"]>>;
const sample = () => (window as Window & { __talkNatural?: { sample(): Sample | null } }).__talkNatural?.sample();
const fixtures: (() => void)[] = [];
afterEach(() => {
  for (const dispose of fixtures.splice(0)) dispose();
  vi.unstubAllGlobals();
});

function scene(run = 17, room = "dans-house", npc = "dan") {
  if (typeof window === "undefined") vi.stubGlobal("window", {});
  const group = new Group();
  const host = { id: npc, ch: new Character(NPCS[npc].look) };
  const other = { id: "nora", ch: new Character(NPCS.nora.look) };
  const near = new Character(NPCS.dan.look);
  const player = new Character(NPCS.dan.look);
  group.add(host.ch.root, other.ch.root, near.root, player.root);
  host.ch.root.position.set(room === "sunny-cup" ? -1.2 : 0, 0, room === "sunny-cup" ? -4.2 : 0);
  other.ch.root.position.x = 1.8;
  near.root.position.z = -3;
  player.root.position.z = 2;
  player.root.rotation.y = Math.PI;
  const conv: ConvUI = { ...EMPTY_CONV, run, active: true, hostId: host.id, npcId: host.id, transcript: [] };
  const audio = {
    visualOwner: undefined as VoiceVisualOwner | undefined,
    state: "playing" as VisualPlaybackState,
    elapsed: 0,
    visualState(owner: VoiceVisualOwner) { return owner === this.visualOwner ? this.state : "interrupt" as const; },
    visualElapsed() { return this.elapsed; },
    level: () => 0.7,
    vowel: () => 0.5,
  };
  const people = [host, other];
  const natural = new NaturalSession({
    run, zone: { id: room, group }, host, cast: [host, other], people,
    extras: [near], player, audio, free: () => true,
  });
  const actors = [host.ch, other.ch, near, player];
  fixtures.push(() => { natural.dispose(); actors.forEach((actor) => actor.dispose()); });
  const turn = (id: number, say: string, actor = host, replay?: VoiceVisualOwner["replay"]) => {
    conv.transcript.push({ id, who: "npc", npc: actor.id, sentence: { en: say, say, nat: "", units: [] } });
    conv.npcId = actor.id;
    conv.phase = "npc";
    conv.speaking = id;
    audio.elapsed = 0;
    return audio.visualOwner = { line: id, actor: actor.ch, replay };
  };
  const waitForLearner = () => {
    conv.speaking = null;
    conv.phase = "you";
    audio.visualOwner = undefined;
  };
  const advance = (seconds: number) => {
    for (let i = 0; i < Math.round(seconds * 60); i++) {
      natural.update(conv, 1 / 60);
      actors.forEach((actor) => actor.update(1 / 60));
      if (audio.visualOwner && audio.state === "playing") audio.elapsed += 1 / 60;
    }
  };
  return { natural, group, host, other, people, player, near, conv, audio, turn, advance, waitForLearner };
}

describe("the 3D situation presentation", () => {
  it("hydrates live playback without replaying an old wave, then routes replays and speaker handoff by owner", () => {
    const s = scene();
    const first = s.turn(1, "Hi! Where can I take you?");
    s.audio.elapsed = 0.4;
    s.natural.present(s.conv, true);
    s.advance(0.3);
    const opening = sample()!;
    expect(opening).toMatchObject({ run: 17, lineId: 1, actorId: "dan", speakerId: "dan", playback: "playing", gesture: null, requestOwned: true });
    expect(opening.mouth).toBeGreaterThan(0.6);
    expect(opening.bystander?.mouth).toBe(0);
    expect(opening.others[0]?.mouth).toBe(0);

    s.waitForLearner();
    s.conv.typing = true;
    s.conv.practice = { en: "sample", status: "playing", heard: "" };
    s.advance(0.3);
    expect(sample()).toMatchObject({ listening: true, mouth: 0, requestOwned: false, listeningWeight: 1 });
    s.natural.feedback(s.host.id, "puzzled");
    s.advance(0.22);
    expect(sample()?.reaction).toMatchObject({ kind: "puzzled", sequence: 1 });
    expect(sample()?.reaction?.weight).toBeGreaterThan(0.8);

    s.audio.visualOwner = { ...first, replay: "transcript" };
    s.advance(0.23);
    expect(sample()).toMatchObject({ lineId: 1, requestOwned: true, gesture: null });
    expect(sample()?.requestId).not.toBe(opening.requestId);
    expect(sample()?.reaction).toMatchObject({ kind: "repeat", sequence: 2 });
    s.natural.feedback(s.other.id, "nod");
    s.turn(2, "Yes, I'm ready.", s.other);
    s.advance(0.24);
    expect(sample()).toMatchObject({ speakerId: "nora", lineId: 2, requestOwned: true, reaction: { kind: "understood", sequence: 3 } });
    expect(sample()?.reaction?.weight).toBeGreaterThan(0.5);
    expect(sample()?.others[0]?.mouth).toBe(0);
    expect(sample()?.mouth).toBeGreaterThan(0.6);
  });

  it("rejoins a covered line by its current request, but drops queued gaze and reactions", () => {
    const s = scene(2, "sunny-cup", "mia");
    s.natural.present(s.conv, true);
    s.audio.state = "loading";
    s.turn(1, "Here is your coffee!");
    s.advance(0.08);
    s.natural.suspend();
    expect(s.host.ch.talkPose).toBeUndefined();
    expect(sample()).toBeNull();
    s.natural.feedback(s.host.id, "repeat");
    s.audio.state = "playing";
    s.natural.present(s.conv, false);
    s.advance(0.4);
    expect(sample()).toMatchObject({ reaction: null, gesture: null, playback: "playing", requestOwned: true });
    expect(sample()?.gaze?.target).not.toBe("handoff");

    s.turn(2, "Here is your receipt.");
    s.advance(0.57);
    expect(sample()?.gaze?.target).toBe("handoff");
    expect(Math.abs(sample()!.gaze!.pitch)).toBeLessThanOrEqual(0.07);
    s.turn(3, "Our menu is on the board behind me.");
    s.advance(0.57);
    expect(sample()?.gaze?.target).not.toBe("menu");
  });

  it("uses the learner's side, leaves 1.6 s between arm beats and keeps one nearby observer", () => {
    const s = scene();
    s.near.root.rotation.y = 0.5;
    s.natural.present(s.conv, true);
    const ids = Array.from({ length: 30 }, (_, i) => i + 1).filter((id) => lineSeed("dan", 17, id, 5) < 0.70);
    s.turn(ids[0], "Turn left.");
    s.advance(0.33);
    expect(sample()).toMatchObject({ gesture: "point" });
    expect(sample()?.deltas?.outL).toBeLessThan(-0.03);
    expect(sample()?.deltas?.outR).toBe(0);
    s.waitForLearner();
    s.advance(0.7);
    s.turn(ids[1], "Turn right.");
    s.advance(0.33);
    expect(sample()?.gesture).toBeNull();
    s.waitForLearner();
    s.advance(0.7);
    s.turn(ids[2], "It's on your right.");
    s.advance(0.33);
    expect(sample()?.deltas?.outL).toBe(0);
    expect(sample()?.deltas?.outR).toBeGreaterThan(0.03);
    s.advance(3.5);
    expect(sample()?.bystander?.gaze.target).not.toBe("dan");
    let glanced = false;
    for (let i = 0; i < 85; i++) {
      s.advance(0.05);
      glanced ||= sample()?.bystander?.gaze.target === "dan";
    }
    expect(glanced).toBe(true);
  });

  it("varies the bystander's intervals reproducibly for the same run", () => {
    const intervals = () => {
      const s = scene();
      s.natural.present(s.conv, true);
      const glance = vi.spyOn(bindConversationPose(s.near)!, "glanceAt");
      const gaps: number[] = [];
      let last = 0;
      for (let frame = 1; frame <= 31 * 60; frame++) {
        s.natural.update(s.conv, 1 / 60);
        if (glance.mock.calls.length > gaps.length) {
          gaps.push(frame - last);
          last = frame;
        }
      }
      glance.mockRestore();
      s.natural.dispose();
      return gaps;
    };
    const gaps = intervals();
    expect(gaps.length).toBeGreaterThanOrEqual(3);
    expect(gaps.every((gap) => gap >= 6 * 60 - 1 && gap <= 10 * 60 + 1)).toBe(true);
    expect(Math.max(...gaps) - Math.min(...gaps)).toBeGreaterThan(1);
    expect(intervals()).toEqual(gaps);
  });

  it.each([true, false])("deduplicates completion and farewell, then releases existing rigs (completion first %s)", (first) => {
    const s = scene();
    s.natural.present(s.conv, true);
    if (first) s.natural.feedback(s.host.id, "clap");
    s.turn(4, "See you later!");
    s.advance(0.3);
    if (!first) s.natural.feedback(s.host.id, "clap");
    s.audio.visualOwner = undefined;
    s.conv.phase = "ended";
    s.advance(0.12);
    expect(sample()).toMatchObject({ phase: "ended", gesture: "wave", reaction: { kind: "farewell", sequence: 1 } });
    s.natural.close();
    s.advance(0.15);
    expect(sample()).toMatchObject({ phase: "released", requestOwned: false });
    expect(sample()?.speaker?.weight).toBeCloseTo(0.5);
    s.advance(0.15);
    expect(sample()).toBeNull();
    expect(s.player.talkPose).toBeUndefined();
  });

  it("waits for a hidden late cast member to detach after the other poses are gone", () => {
    const s = scene();
    s.player.root.visible = false;
    s.natural.present(s.conv, true);
    expect(s.player.talkPose).toBeUndefined();
    expect(s.near.talkPose).toBeDefined();

    const late = { id: "chloe", ch: new Character(NPCS.chloe.look) };
    fixtures.push(() => late.ch.dispose());
    s.group.add(late.ch.root);
    s.people.push(late);
    s.turn(1, "Hi!", late);
    s.advance(0.3);
    late.ch.update(0.3);
    expect(s.natural.speaker).toBe(late.ch);

    s.natural.close();
    s.group.remove(s.near.root, s.host.ch.root, s.other.ch.root);
    late.ch.root.visible = false;
    expect(s.natural.update(s.conv, 0)).toBe(true);
    late.ch.update(0.15);
    expect(s.natural.update(s.conv, 0)).toBe(true);
    late.ch.update(0.15);
    expect(late.ch.talkPose).toBeUndefined();
    expect(s.natural.update(s.conv, 0)).toBe(false);
  });

  it("clears a delayed cue on live reduced motion and does not let a removed run displace a new one", () => {
    const query = new EventTarget() as EventTarget & { matches: boolean };
    query.matches = false;
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
    s.natural.close();
    s.group.remove(s.host.ch.root);
    expect(s.host.ch.talkPose).toBeUndefined();
    const next = scene(18);
    next.natural.present(next.conv, true);
    s.natural.dispose();
    expect(sample()).toMatchObject({ run: 18, reaction: null, lineId: null });
  });
});
