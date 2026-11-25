import { afterEach, describe, expect, it, vi } from "vitest";
import { Group, Vector3 } from "three";
import { NPCS } from "../src/content/npcs";
import type { VisualPlaybackState } from "../src/game/audio";
import { Character } from "../src/game/characters/Character";
import { bindConversationPose, type VoiceVisualOwner } from "../src/game/talkNatural/pose";

const step = (actor: { update(dt: number): void }, seconds: number, hz = 60) => {
  for (let i = 0; i < Math.round(seconds * hz); i++) actor.update(1 / hz);
};

class MotionPreference extends EventTarget {
  matches = false;
  set(matches: boolean) {
    this.matches = matches;
    this.dispatchEvent(new Event("change"));
  }
}

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("natural conversation on the baked rig", () => {
  it.each([30, 60])("samples only the owner and shuts on quiet, stop and end at %i Hz", (hz) => {
    const speaker = new Character(NPCS.mia.look), other = new Character(NPCS.chloe.look);
    const first = { actor: speaker, line: 1 };
    const replay = { actor: speaker, line: 1 };
    const wrongActor = { actor: other, line: 1 };
    let owner: VoiceVisualOwner = first;
    let state: VisualPlaybackState = "loading";
    let level: number | null = 1;
    const audio = {
      visualState: (request: VoiceVisualOwner) => request === owner ? state : "interrupt" as const,
      level: vi.fn(() => level), vowel: vi.fn(() => 0.85),
    };
    const pose = bindConversationPose(speaker, { audio })!;
    const listener = bindConversationPose(other, { audio })!;
    pose.speak(1, first);
    listener.speak(1, first);
    speaker.talk(30, () => { throw new Error("legacy envelope read"); });
    speaker.express("surprised");
    step(speaker, 0.3, hz);
    step(other, 0.3, hz);
    expect(pose.applied.sample).toBe("loading");
    expect(listener.applied.sample).toBe("text-only");
    expect(audio.level).not.toHaveBeenCalled();

    state = "blocked";
    speaker.update(1 / hz);
    expect(pose.applied.sample).toBe("blocked");
    expect(pose.applied.mouth).toBe(0);
    state = "playing";
    step(speaker, 0.5, hz);
    step(other, 0.5, hz);
    expect(audio.level).toHaveBeenCalledTimes(hz / 2);
    expect(audio.level).toHaveBeenCalledWith(false);
    expect(audio.vowel).toHaveBeenCalledTimes(hz / 2);
    expect(pose.applied.mouth).toBeGreaterThan(0.99);
    expect(pose.applied.mouthScaleY).toBeGreaterThan(0.8);
    expect(listener.applied.mouth).toBe(0);

    level = 0;
    for (let i = 0; i < Math.floor(0.24 * hz); i++) speaker.update(1 / hz);
    expect(pose.applied.sample).toBe("quiet");
    expect(pose.applied.mouth).toBe(0);
    expect(pose.applied.mouthScaleY).toBeLessThan(0.001);
    level = null;
    step(speaker, 0.3, hz);
    expect(pose.applied.sample).toBe("unknown");
    expect(pose.applied.mouth).toBeGreaterThan(0.08);
    expect(pose.applied.mouth).toBeLessThanOrEqual(0.36);

    owner = wrongActor;
    level = 1;
    audio.level.mockClear();
    step(speaker, 0.24, hz);
    expect(pose.applied.sample).toBe("interrupt");
    expect(pose.applied.mouth).toBe(0);
    expect(audio.level).not.toHaveBeenCalled();
    owner = replay;
    pose.speak(1, replay);
    step(speaker, 0.25, hz);
    expect(pose.applied.mouth).toBeGreaterThan(0.98);
    level = -1;
    step(speaker, 0.24, hz);
    expect(pose.applied.sample).toBe("ended");
    expect(pose.applied.level).toBe(-1);
    expect(pose.applied.mouth).toBe(0);
    speaker.dispose(); other.dispose();
  });

  it.each([30, 60])("uses the thumb-side forearm for three bounded pulses at %i Hz", (hz) => {
    const actor = new Character(NPCS.mia.look), dt = 1 / hz;
    const pose = bindConversationPose(actor)!;
    step(actor, 0.3, hz);
    pose.speak("count", null, { kind: "count", count: 3 });
    const samples: number[] = [];
    const a = pose.applied;
    for (let i = 0; i < hz; i++) {
      actor.update(dt);
      samples.push(a.thumbR + 0.55 * a.gestureWeight);
      expect(a.thumbL).toBe(0);
    }
    const peaks = samples.flatMap((v, i) => v > 0.05 && v > samples[i - 1] && v > samples[i + 1] ? [i] : []);
    expect(peaks).toHaveLength(3);
    expect(Math.max(...samples)).toBeLessThanOrEqual(0.09 + 1e-9);
    for (let i = 1; i < peaks.length; i++) expect(Math.abs((peaks[i] - peaks[i - 1]) * dt - 0.19)).toBeLessThan(dt);
    step(actor, 1, hz);
    pose.speak("other", null);
    pose.speak("count", null, { kind: "count", count: 3 });
    step(actor, 0.35, hz);
    expect(a.gestureWeight).toBe(0);
    expect(a.thumbR).toBe(0);
    actor.dispose();
  });

  it("holds the seat and prop during live reduced motion and still moves the voiced lips and blinks", () => {
    const query = new MotionPreference();
    vi.stubGlobal("matchMedia", () => query);
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const actor = new Character({ ...NPCS.chloe.look, carry: "cup" });
    actor.seatY = 0.48;
    actor.setAnim("sit");
    actor.rightHand.add(new Group());
    actor.root.position.set(1, 0.1, 2);
    actor.root.rotation.y = 0.4;
    const owner = { actor, line: 1 };
    let level = 1;
    const audio = { visualState: () => "playing" as const, level: () => level, vowel: () => 0.5 };
    const pose = bindConversationPose(actor, { audio })!;
    const { applied } = pose;
    const rig = actor.naturalRig();
    pose.speak(1, owner, { kind: "greeting" });
    step(actor, 0.3);
    expect(applied.outL).toBeLessThan(0.3);
    const held = actor.rightHand.getWorldPosition(new Vector3());
    query.set(true);
    actor.update(1 / 60);
    expect(applied.reduced).toBe(true);
    expect(applied.gesture).toBeNull();
    expect(applied.mouth).toBeGreaterThan(0.9);
    const ready = actor.rightHand.getWorldPosition(new Vector3());
    expect(ready.distanceTo(held)).toBeLessThan(0.01);
    const stable = [
      rig.body.position, rig.body.quaternion, rig.head.quaternion, rig.upperL.quaternion, rig.upperR.quaternion,
      rig.foreL.quaternion, rig.foreR.quaternion, rig.thighL.quaternion, rig.thighR.quaternion, rig.eye.position,
      rig.browL.position, rig.browR!.position, actor.root.position, actor.root.quaternion,
    ];
    const initial = stable.map((v) => v.toArray());
    let blink = false;
    level = 0;
    actor.watch = new Vector3(2, 4, 5);
    actor.setAnim("wave");
    actor.react("clap");
    pose.react("wave");
    pose.glanceAt(actor.watch, 0);
    for (let i = 0; i < 270; i++) {
      actor.update(1 / 60);
      expect(stable.map((v) => v.toArray())).toEqual(initial);
      blink ||= applied.blink > 0.9;
    }
    expect(blink).toBe(true);
    expect(actor.anim).toBe("sit");
    expect(applied.mouth).toBe(0);
    expect(actor.rightHand.getWorldPosition(new Vector3()).distanceTo(ready)).toBeLessThan(1e-10);
    query.set(false);
    step(actor, 0.45);
    expect(applied.gestureWeight).toBe(0);
    actor.dispose();
    expect(actor.talkPose).toBeUndefined();
    expect(applied.active).toBe(false);
  });

  it("locks listening leg placement, fades on release, and interrupts on removal", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const parent = new Group(), actor = new Character(NPCS.mia.look), base = new Character(NPCS.mia.look);
    parent.add(actor.root, base.root);
    const rig = actor.naturalRig(), baseline = base.naturalRig();
    const pose = bindConversationPose(actor, { role: "listening" })!;
    const rest = bindConversationPose(base)!;
    expect(bindConversationPose(actor)).toBe(pose);
    step(actor, 0.3); step(base, 0.3);
    expect(pose.applied.torsoPitch - rest.applied.torsoPitch).toBeCloseTo(0.035, 8);
    expect(pose.applied.elbowR - rest.applied.elbowR).toBeCloseTo(-0.13, 8);
    pose.setRole("cast");
    step(actor, 0.08);
    expect(pose.applied.elbowR).toBeLessThan(rest.applied.elbowR);
    step(actor, 0.1);
    expect(pose.applied.elbowR).toBeCloseTo(rest.applied.elbowR, 8);
    pose.setRole("listening");
    step(actor, 0.2);
    expect(rig.thighR.getWorldPosition(new Vector3()).distanceTo(baseline.thighR.getWorldPosition(new Vector3()))).toBeLessThan(1e-10);
    pose.release();
    step(actor, 0.15);
    expect(pose.applied.weight).toBeCloseTo(0.5);
    expect(actor.talkPose).toBe(pose);
    step(actor, 0.15);
    expect(actor.talkPose).toBeUndefined();
    const next = bindConversationPose(actor)!;
    next.speak(2, null, { kind: "greeting" });
    step(actor, 0.3);
    expect(rig.upperR.rotation.z).toBeCloseTo(0.75);
    parent.remove(actor.root);
    expect(actor.talkPose).toBeUndefined();
    expect(next.applied.active).toBe(false);
    expect(Math.abs(rig.upperR.rotation.z)).toBeLessThan(0.012);
    actor.dispose(); base.dispose();
  });

  it("leads an object glance with the eyes and keeps a counter reach above the surface", () => {
    const actor = new Character(NPCS.mia.look);
    const pose = bindConversationPose(actor, { counterY: 1.08 })!;
    step(actor, 0.3);
    const { applied: a } = pose;
    const yaw = a.headYaw, pitch = a.headPitch, arm = a.upperR;
    pose.speak("offer", null, { kind: "offer" });
    step(actor, 0.3);
    expect(a.upperR).toBeCloseTo(arm);
    expect(a.headPitch - pitch).toBeCloseTo(0.033);
    step(actor, 0.8);
    pose.glanceAt(new Vector3(1.8, 1.15, 3), 0);
    step(actor, 0.05);
    expect(a.eyeX).toBeGreaterThan(0);
    expect(a.headYaw).toBeCloseTo(yaw);
    step(actor, 0.2);
    expect(a.headYaw - yaw).toBeGreaterThan(0.09);
    expect(a.headYaw - yaw).toBeLessThanOrEqual(0.12 + 1e-10);
    expect(a.eyeX).toBeLessThanOrEqual(0.009);
    expect(Math.abs(a.eyeY)).toBeLessThanOrEqual(0.004);
    const turned = a.headYaw;
    pose.release();
    actor.update(1 / 60);
    expect(a.headYaw).toBeCloseTo(turned, 2);
    step(actor, 0.3);
    expect(actor.talkPose).toBeUndefined();
    expect(Math.abs(actor.headJoint.rotation.y - yaw)).toBeLessThan(0.07);
    actor.dispose();
  });

  it("adapts the trial skeleton and neutralizes a late legacy wave before the first bound frame", async () => {
    vi.stubGlobal("location", { search: "?style=toon" });
    const query = new MotionPreference();
    query.matches = true;
    vi.stubGlobal("matchMedia", () => query);
    const { StyledCharacter } = await import("../src/game/characters/StyledCharacter");
    const actor = new StyledCharacter(NPCS.chloe.look);
    actor.setAnim("wave");
    actor.update(1 / 60);
    const rig = actor.naturalRig();
    expect(rig.upperR.rotation.z).toBeGreaterThan(2);
    const pose = bindConversationPose(actor)!;
    expect(pose.applied.outR).toBeLessThan(0.2);
    expect(actor.anim).toBe("idle");
    const rest = rig.head.quaternion.toArray();
    pose.speak(1, null, { kind: "greeting" });
    step(actor, 0.3);
    expect(rig.head.quaternion.toArray()).toEqual(rest);
    expect(pose.applied.outR).toBeLessThan(0.2);
    query.set(false);
    step(actor, 0.3);
    expect(pose.applied.gestureWeight).toBe(0);
    pose.interrupt();
  });
});
