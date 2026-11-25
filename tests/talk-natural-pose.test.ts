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
  it.each([30, 60])("joins the presented wave and tracks the live target at %i Hz", (hz) => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const actor = new Character(NPCS.vinnie.look), target = new Character(NPCS.vinnie.look);
    const rig = actor.naturalRig(), base = target.naturalRig();
    actor.setAnim("wave");
    actor.update(1 / 60);
    target.update(1 / 60);
    const upper = rig.upperR.quaternion.clone(), fore = rig.foreR.quaternion.clone();
    const incoming = rig.upperR.rotation.z;
    expect(incoming).toBeGreaterThan(2);
    // Losing the animation flag between frames leaves the presented rotations in place.
    if (hz === 30) actor.setAnim("idle");
    const pose = bindConversationPose(actor)!;
    const rest = bindConversationPose(target)!;
    // Let locomotion clear the reference's incoming arm blend at the same time.
    target.setAnim("walk");
    target.update(0);
    target.setAnim("idle");
    expect(rig.upperR.rotation.z).toBeCloseTo(incoming, 6);
    expect(rig.foreR.quaternion.angleTo(fore)).toBeLessThan(0.002);
    expect(pose.weight).toBe(0);
    pose.speak("hi", null, { kind: "greeting" });
    rest.speak("hi", null, { kind: "greeting" });
    let last = incoming;
    for (let frame = 1; frame <= 0.3 * hz; frame++) {
      actor.update(1 / hz);
      target.update(1 / hz);
      const u = Math.min(1, frame / hz / 0.24);
      const w = u * u * (3 - 2 * u);
      expect(rig.upperR.quaternion.angleTo(upper.clone().slerp(base.upperR.quaternion, w))).toBeLessThan(1e-6);
      expect(rig.foreR.quaternion.angleTo(fore.clone().slerp(base.foreR.quaternion, w))).toBeLessThan(1e-6);
      if (frame / hz <= 0.2) {
        expect(rig.upperR.rotation.z).toBeLessThan(last);
        expect(last - rig.upperR.rotation.z).toBeLessThan(0.55);
      }
      last = rig.upperR.rotation.z;
    }
    actor.dispose(); target.dispose();
  });

  it("releases an interrupted entry from the current arm and gives locomotion control immediately", () => {
    const actor = new Character(NPCS.vinnie.look), rig = actor.naturalRig();
    actor.setAnim("wave");
    actor.update(1 / 60);
    const pose = bindConversationPose(actor)!;
    step(actor, 0.1);
    const before = rig.upperR.rotation.z;
    pose.release(0.16);
    actor.update(0);
    expect(rig.upperR.rotation.z).toBeCloseTo(before, 6);
    step(actor, 0.08);
    expect(rig.upperR.rotation.z).toBeLessThan(before);
    step(actor, 0.08);
    expect(actor.talkPose).toBeUndefined();

    actor.setAnim("wave");
    actor.update(1 / 60);
    bindConversationPose(actor);
    actor.setAnim("walk");
    actor.update(1 / 60);
    expect(Math.abs(rig.upperR.rotation.z)).toBeLessThan(0.012);
    actor.setAnim("idle");
    actor.update(1 / 60);
    expect(Math.abs(rig.upperR.rotation.z)).toBeLessThan(0.012);
    actor.dispose();
  });

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

  it.each([30, 60])("resets hidden blocks smile corners through voiced cues and live reduced motion at %i Hz", (hz) => {
    const query = new MotionPreference();
    vi.stubGlobal("matchMedia", () => query);
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const actor = new Character(NPCS.mia.look), dt = 1 / hz;
    const rig = actor.naturalRig(), { mouth } = rig, corners = rig.corners!;
    const bones = actor["skin"]!.skeleton.bones;
    const stroke = actor["smile"], eyes = actor["eyes"];
    expect(bones).toContain(mouth);
    expect(bones).toContain(corners);
    const owner = { actor, line: 1 };
    let level = 1;
    const audio = {
      visualState: (request: VoiceVisualOwner) => request === owner ? "playing" as const : "interrupt" as const,
      level: () => level, vowel: () => 0.65,
    };
    const pose = bindConversationPose(actor, { audio })!;
    step(actor, 0.3, hz);
    const base = corners.position.y;
    expect(base).toBeCloseTo(0.02, 9);
    const openCorners = (seconds: number) => Array.from({ length: Math.round(seconds * hz) }, () => {
      actor.update(dt);
      expect(mouth.scale.y).toBeGreaterThan(0.2);
      expect(stroke.scale.y).toBeLessThan(0.001);
      expect(corners.scale.y).toBeLessThan(0.001);
      return corners.position.y;
    });

    pose.speak(owner.line, owner, { kind: "headGreeting" });
    const greeting = openCorners(0.75);
    expect(pose.react("understood")).toBe(true);
    const understood = openCorners(0.25);
    const voicedHeight = mouth.scale.y;

    query.set(true);
    const still: number[][] = [];
    let blink = false;
    const reducedFrames = (frames: number) => {
      for (let i = 0; i < frames; i++) {
        actor.update(dt);
        still.push(bones.flatMap((joint) => [
          joint.rotation.x, joint.rotation.y, joint.rotation.z, ...joint.position.toArray(),
        ]));
        blink ||= pose.applied.blink > 0.45 && eyes.scale.y < 0.65;
      }
    };
    reducedFrames(1);
    const firstReduced = corners.position.y;
    expect(pose.applied.reduced).toBe(true);
    expect(mouth.scale.y).toBeCloseTo(voicedHeight, 6);
    expect(corners.scale.y).toBeLessThan(0.001);

    level = 0.45;
    reducedFrames(Math.round(0.3 * hz));
    const softHeight = mouth.scale.y;
    expect(softHeight).toBeGreaterThan(0.2);
    expect(softHeight).toBeLessThan(voicedHeight - 0.2);
    level = 0;
    reducedFrames(Math.floor(0.24 * hz));
    expect(pose.applied.sample).toBe("quiet");
    expect(mouth.scale.y).toBeLessThan(0.001);
    expect(stroke.scale.y).toBe(1);
    reducedFrames(7 * hz);
    expect(blink).toBe(true);

    level = 0.8;
    reducedFrames(Math.round(0.3 * hz));
    expect(pose.applied.sample).toBe("voiced");
    expect(mouth.scale.y).toBeGreaterThan(softHeight + 0.2);
    expect(stroke.scale.y).toBeLessThan(0.001);
    expect(pose.react("headGreeting", 1, 0.1)).toBe(false);
    query.set(false);
    for (let i = 0; i < Math.round(0.3 * hz); i++) {
      actor.update(dt);
      expect(pose.applied).toMatchObject({ reduced: false, gesture: null, gestureWeight: 0, reactionWeight: 0 });
      expect(mouth.scale.y).toBeGreaterThan(softHeight + 0.2);
      expect(corners.position.y).toBeCloseTo(base, 9);
    }

    for (const [samples, amplitude] of [[greeting, 0.01], [understood, 0.012]] as const) {
      expect(samples.every(Number.isFinite)).toBe(true);
      expect(Math.min(...samples)).toBeGreaterThanOrEqual(base);
      // The smile after a right answer outlasts the nod, so this window can end while it is still rising.
      expect(Math.max(...samples) - base).toBeGreaterThan(amplitude * 0.8);
      expect(Math.max(...samples) - base).toBeLessThanOrEqual(amplitude + 1e-9);
    }
    expect(firstReduced).toBeCloseTo(base, 9);
    still[0].forEach((_, channel) => {
      const values = still.map((row) => row[channel]);
      expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(0.002);
    });
    actor.dispose();
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
    expect(pose.applied.torsoPitch - rest.applied.torsoPitch).toBeCloseTo(0.055, 8);
    expect(pose.applied.elbowR - rest.applied.elbowR).toBeCloseTo(-0.13, 8);
    pose.setRole("cast");
    step(actor, 0.08);
    expect(pose.applied.elbowR).toBeLessThan(rest.applied.elbowR);
    step(actor, 0.1);
    expect(pose.applied.elbowR).toBeCloseTo(rest.applied.elbowR, 8);
    pose.setRole("listening");
    step(actor, 0.2);
    step(base, 0.38); // the comparison figure breathes along
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

  it.each([
    ["counter", 30], ["counter", 60], ["seat", 60], ["prop", 60],
  ] as const)("adds and releases sustained head pitch with %s support at %i Hz", (support, hz) => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const actor = new Character(NPCS.mia.look), rig = actor.naturalRig();
    if (support === "seat") actor.setAnim("sit");
    if (support === "prop") actor.rightHand.add(new Group());
    const pose = bindConversationPose(actor, { role: "cast", counterY: support === "counter" ? 1.08 : undefined })!;
    pose.watch = new Vector3(0.3, 1.7, 2);
    step(actor, 1, hz);
    const { applied: a } = pose;
    const arms = [rig.upperL, rig.foreL, rig.upperR, rig.foreR];
    const holds = arms.map((joint) => joint.quaternion.toArray());
    const body = rig.body.quaternion.toArray();
    const pitch = rig.head.rotation.x;
    pose.setRole("listening");
    actor.update(0);
    expect(rig.head.rotation.x).toBe(pitch);
    step(actor, 8 / 60, hz);
    expect(a.deltas.headPitch).toBeGreaterThan(0.010);
    expect(a.deltas.headPitch).toBeLessThan(0.014);
    step(actor, 11 / 60, hz);
    expect(a.listeningWeight).toBe(1);
    expect(a.deltas.headPitch).toBeCloseTo(0.024, 8);
    expect(rig.head.rotation.x - pitch).toBeCloseTo(0.024, 3);
    expect(a.deltas.headYaw).toBe(0);
    expect(a.watching).toBe(true);
    expect(a.mouth).toBe(0);
    expect(arms.map((joint) => joint.quaternion.toArray())).toEqual(holds);
    expect(rig.body.quaternion.toArray()).toEqual(body);

    // First nod is separate from the held inclination.
    step(actor, 2.67, hz);
    expect(a.deltas.headPitch).toBeCloseTo(0.08, 3);
    step(actor, 0.4, hz);
    expect(a.deltas.headPitch).toBeCloseTo(0.024, 8);
    pose.react("repeat");
    step(actor, 0.1, hz);
    expect(a.deltas.headPitch).toBeCloseTo(0.012, 8);
    step(actor, 0.1, hz);
    expect(a.deltas.headPitch).toBeCloseTo(0, 8);
    step(actor, 0.8, hz);
    expect(a.deltas.headPitch).toBeCloseTo(0.024, 8);
    pose.speak("reply", null);
    step(actor, 0.1, hz);
    expect(a.deltas.headPitch).toBeCloseTo(0.012, 8);
    step(actor, 0.1, hz);
    expect(a.deltas.headPitch).toBeCloseTo(0, 8);
    expect(arms.map((joint) => joint.quaternion.toArray())).toEqual(holds);
    actor.dispose();
  });

  it.each([30, 60])("restores styled shoulder bases after repeated and interrupted shrugs at %i Hz", async (hz) => {
    vi.stubGlobal("location", { search: "?style=toon" });
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const { StyledCharacter } = await import("../src/game/characters/StyledCharacter");
    const world = new Group(), actor = new StyledCharacter(NPCS.chloe.look), rig = actor.naturalRig();
    world.add(actor.root);
    const pose = bindConversationPose(actor)!;
    step(actor, 1, hz);
    const shoulders = [rig.upperL, rig.upperR];
    const base = shoulders.map((joint) => joint.position.y);
    for (const line of [1, 2]) {
      pose.speak(line, null, { kind: "shrug" });
      let peak = 0;
      for (let i = 0; i < 2 * hz; i++) {
        actor.update(1 / hz);
        shoulders.forEach((joint, side) => {
          const rise = joint.position.y - base[side];
          peak = Math.max(peak, rise);
          expect(rise).toBeGreaterThanOrEqual(0);
          expect(rise).toBeLessThanOrEqual(0.015 + 1e-9);
        });
      }
      expect(peak).toBeCloseTo(0.015, 8);
      expect(shoulders.map((joint) => joint.position.y)).toEqual(base);
    }
    pose.speak(3, null, { kind: "shrug" });
    step(actor, 0.25, hz);
    expect(rig.upperR.position.y - base[1]).toBeCloseTo(0.015, 8);
    pose.release();
    step(actor, 0.3, hz);
    expect(shoulders.map((joint) => joint.position.y)).toEqual(base);
    expect(actor.talkPose).toBeUndefined();

    const rebound = bindConversationPose(actor)!;
    step(actor, 0.3, hz);
    rebound.speak(4, null, { kind: "shrug" });
    step(actor, 0.25, hz);
    expect(rig.upperR.position.y - base[1]).toBeCloseTo(0.015, 8);
    world.remove(actor.root);
    expect(shoulders.map((joint) => joint.position.y)).toEqual(base);
    expect(actor.talkPose).toBeUndefined();
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
