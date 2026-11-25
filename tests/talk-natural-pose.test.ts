import { afterEach, describe, expect, it, vi } from "vitest";
import { Group, Mesh, SkinnedMesh, Vector3, type Object3D } from "three";
import { NPCS } from "../src/editions/es/content/npcs";
import { Character } from "../src/game/characters/Character";
import { bindConversationPose, captureConversationPose, type VoiceVisualOwner } from "../src/game/talkNatural/pose";
import type { VisualPlaybackState, VisualVoiceSample } from "../src/game/audio";

function blocks(id: string) {
  const { look, gender } = NPCS[id];
  const actor = new Character({ ...look, female: gender === "f" });
  new Group().add(actor.root);
  return actor;
}

function step(actor: { update(dt: number): void }, seconds: number, hz: number) {
  for (let i = 0; i < Math.round(seconds * hz); i++) actor.update(1 / hz);
}

class MotionPreference extends EventTarget {
  constructor(public matches = false) { super(); }
  set(matches: boolean) {
    this.matches = matches;
    this.dispatchEvent(new Event("change"));
  }
}

function voiceSource(dt: number) {
  let current: VoiceVisualOwner | undefined;
  let state: VisualPlaybackState = "loading";
  let level: number | null = 0;
  let time = 0, quiet = 0;
  const measure = vi.fn(() => level);
  const audio = {
    readVisualEnvelope(owner: VoiceVisualOwner, sample: VisualVoiceSample) {
      if (owner !== current) return "interrupt" as const;
      if (state === "playing") {
        sample.time = time += dt;
        sample.level = measure();
        sample.vowel = 0.65;
        sample.quiet = level !== null && level <= 0.05 ? quiet += dt : 0;
      }
      return state;
    },
  };
  return { audio, measure, follow(owner: VoiceVisualOwner) { current = owner; }, state(value: VisualPlaybackState) { state = value; },
    level(value: number | null) { level = value; if (value === null || value > 0.05) quiet = 0; } };
}

function budget(actor: { root: Group }) {
  const meshes: Mesh[] = [];
  const bones = new Set();
  actor.root.traverse((node) => {
    if (node instanceof Mesh) meshes.push(node);
    if (node instanceof SkinnedMesh) for (const joint of node.skeleton.bones) bones.add(joint);
  });
  return { meshes, materials: meshes.map((mesh) => mesh.material), bones: [...bones] };
}

const smooth = (t: number) => { const u = Math.min(1, t); return u * u * (3 - 2 * u); };
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe.each([30, 60])("PC conversation rig at %i Hz", (hz) => {
  const dt = 1 / hz;

  it("inherits the pre-aim wave and releases from the single displayed pose into live idle", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const actor = blocks("vinnie"), idle = blocks("vinnie");
    actor.fidgets = idle.fidgets = false;
    actor.setAnim("wave");
    step(actor, 0.3, hz); step(idle, 0.3, hz);
    const r = actor.naturalRig()!, rest = idle.naturalRig()!;
    const initial = budget(actor);
    expect(initial.bones).toHaveLength(18);
    expect(initial.meshes.filter((mesh) => mesh instanceof SkinnedMesh)).toHaveLength(1);
    const position = actor.root.position.clone(), head = r.head.quaternion.clone(), body = r.body.position.clone();
    const upper = r.upperR.quaternion.clone(), fore = r.foreR.quaternion.clone();
    expect(r.upperR.rotation.z).toBeGreaterThan(2);
    const entry = captureConversationPose(actor);
    actor.setAnim("idle");
    actor.update(0);
    const pose = bindConversationPose(actor, { entry })!;
    expect(pose.weight).toBe(0);
    expect(r.upperR.quaternion.angleTo(upper)).toBeLessThan(1e-6);
    expect(r.foreR.quaternion.angleTo(fore)).toBeLessThan(1e-6);
    expect(r.head.quaternion.angleTo(head)).toBeLessThan(1e-6);
    expect(r.body.position.distanceTo(body)).toBeLessThan(1e-9);
    const base = blocks("vinnie");
    bindConversationPose(base);
    step(base, 0.25, hz);
    const target = base.naturalRig()!;
    for (let i = 1; i <= Math.round(0.1 * hz); i++) {
      actor.update(dt); idle.update(dt);
      const w = smooth(i * dt / 0.24);
      expect(r.upperR.quaternion.angleTo(upper.clone().slerp(target.upperR.quaternion, w))).toBeLessThan(1e-6);
      expect(r.foreR.quaternion.angleTo(fore.clone().slerp(target.foreR.quaternion, w))).toBeLessThan(1e-6);
    }
    const releaseUpper = r.upperR.quaternion.clone(), releaseFore = r.foreR.quaternion.clone();
    pose.release();
    actor.update(0);
    expect(r.upperR.quaternion.angleTo(releaseUpper)).toBeLessThan(1e-6);
    expect(r.foreR.quaternion.angleTo(releaseFore)).toBeLessThan(1e-6);
    for (let i = 1; i <= Math.round(0.30 * hz); i++) {
      actor.update(dt); idle.update(dt);
      pose.release(); // Repeated cleanup must leave the original release pose intact.
      const w = smooth(i * dt / 0.30);
      expect(r.upperR.quaternion.angleTo(releaseUpper.clone().slerp(rest.upperR.quaternion, w))).toBeLessThan(1e-6);
      expect(r.foreR.quaternion.angleTo(releaseFore.clone().slerp(rest.foreR.quaternion, w))).toBeLessThan(1e-6);
    }
    expect(actor.talkPose).toBeUndefined();
    actor.setAnim("wave");
    actor.update(0);
    const secondWave = r.upperR.quaternion.clone();
    const fullEntry = bindConversationPose(actor)!;
    for (let i = 1; i <= Math.ceil(0.24 * hz); i++) {
      actor.update(dt);
      const w = smooth(i * dt / 0.24);
      expect(fullEntry.weight).toBeCloseTo(w, 9);
      expect(r.upperR.quaternion.angleTo(secondWave.clone().slerp(target.upperR.quaternion, w))).toBeLessThan(1e-6);
    }
    expect(actor.root.position.equals(position)).toBe(true);
    expect(budget(actor)).toEqual(initial);
    actor.dispose(); idle.dispose(); base.dispose();
  });

  it("hands off a releasing actor over 160 ms and rejects updates from the previous driver", () => {
    const actor = blocks("vinnie"), r = actor.naturalRig()!;
    actor.setAnim("wave"); actor.update(0);
    const old = bindConversationPose(actor)!;
    step(actor, 0.1, hz);
    old.release(0.16);
    step(actor, 0.04, hz);
    const origin = r.upperR.quaternion.clone();
    const next = bindConversationPose(actor)!;
    expect(next).not.toBe(old);
    expect(r.upperR.quaternion.angleTo(origin)).toBeLessThan(1e-6);
    old.restoreBase(); old.interrupt(); old.apply(false, 0);
    expect(actor.talkPose).toBe(next);
    expect(r.upperR.quaternion.angleTo(origin)).toBeLessThan(1e-6);
    for (let i = 1; i <= Math.ceil(0.16 * hz); i++) {
      actor.update(dt);
      expect(next.weight).toBeCloseTo(smooth(i * dt / 0.16), 9);
    }
    expect(Math.abs(r.upperR.rotation.z)).toBeLessThan(0.012);
    const parent = actor.root.parent!;
    const beforeRemoval = captureConversationPose(actor);
    parent.remove(actor.root);
    expect(actor.talkPose).toBeUndefined();
    expect(next.active).toBe(false);
    expect(bindConversationPose(actor, { entry: beforeRemoval })).toBeUndefined();
    parent.add(actor.root);
    const entry = captureConversationPose(actor);
    actor.dispose();
    expect(bindConversationPose(actor, { entry })).toBeUndefined();
  });

  it.each(["counter", "seated", "occupied"] as const)("makes %s listening readable without lifting the arms", (support) => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const actor = blocks("mia");
    if (support === "seated") actor.setAnim("sit");
    if (support === "occupied") actor.rightHand.add(new Group());
    actor.update(0);
    const pose = bindConversationPose(actor, { counterY: support === "counter" ? 1.08 : undefined })!;
    step(actor, 0.3, hz);
    const r = actor.naturalRig()!;
    const arms = [r.upperL, r.foreL, r.upperR, r.foreR], angles = arms.map((arm) => arm.quaternion.clone());
    const hip = r.body.quaternion.clone(), startingPitch = r.head.rotation.x;
    pose.setRole("listening");
    step(actor, 0.13, hz);
    expect(r.head.rotation.x - startingPitch).toBeGreaterThan(0.01);
    step(actor, 0.17, hz);
    expect(r.head.rotation.x - startingPitch).toBeCloseTo(0.024, 8);
    let peak = 0;
    for (let i = 0; i < 4 * hz; i++) {
      actor.update(dt);
      peak = Math.max(peak, r.head.rotation.x - startingPitch);
      arms.forEach((arm, j) => expect(arm.quaternion.angleTo(angles[j])).toBeLessThan(1e-6));
    }
    expect(peak).toBeCloseTo(0.059, 3);
    expect(r.body.quaternion.angleTo(hip)).toBeLessThan(1e-6);
    expect(pose.applied.mouth).toBe(0);
    actor.dispose();
  });

  it("softens the unsupported elbows and keeps the stance through the listening lean", () => {
    const actor = blocks("mia");
    const pose = bindConversationPose(actor)!;
    step(actor, 0.3, hz);
    const r = actor.naturalRig()!;
    const before = r.thighR.getWorldPosition(new Vector3()), root = actor.root.position.clone();
    pose.setRole("listening");
    step(actor, 0.3, hz);
    expect(pose.applied.deltas.torsoPitch).toBeCloseTo(0.035, 9);
    expect(pose.applied.deltas.elbowR).toBeCloseTo(-0.13, 9);
    expect(r.thighR.getWorldPosition(new Vector3()).distanceTo(before)).toBeLessThan(1e-9);
    expect(actor.root.position.equals(root)).toBe(true);
    actor.dispose();
  });

  it("closes on separate gaps and invalidates a same-speaker replay with the same line", () => {
    const actor = blocks("mia"), source = voiceSource(dt);
    const owner = { actor, line: 7 }, replay = { actor, line: 7, replay: "turn" as const };
    const pose = bindConversationPose(actor, { audio: source.audio })!;
    const listener = blocks("walter"), other = bindConversationPose(listener, { audio: source.audio })!;
    other.speak(7, owner);
    pose.speak(7, owner); source.follow(owner);
    step(actor, 0.3, hz); step(listener, 0.3, hz);
    expect(source.measure).not.toHaveBeenCalled();
    source.state("playing"); source.level(1);
    step(actor, 0.3, hz); step(listener, 0.3, hz);
    expect(pose.applied.mouth).toBeGreaterThan(0.98);
    expect(other.applied.mouth).toBe(0);
    for (const gap of [0, 0.049]) {
      source.level(gap);
      step(actor, 0.1, hz);
      expect(pose.applied.mouth).toBeGreaterThan(0.04);
      step(actor, 0.13, hz);
      expect(pose.applied).toMatchObject({ sample: "quiet", mouth: 0 });
      source.level(0.85);
      step(actor, 0.2, hz);
      expect(pose.applied.mouth).toBeGreaterThan(0.8);
    }
    source.follow(replay);
    actor.update(dt);
    expect(pose.applied).toMatchObject({ sample: "interrupt", mouth: 0 });
    source.state("loading");
    pose.speak(7, replay);
    actor.update(dt);
    expect(pose.applied).toMatchObject({ sample: "loading", mouth: 0 });
    source.state("playing"); source.level(null);
    step(actor, 0.3, hz);
    expect(pose.applied.sample).toBe("unknown");
    expect(pose.applied.mouth).toBeGreaterThanOrEqual(0.08);
    expect(pose.applied.mouth).toBeLessThanOrEqual(0.36);
    for (const state of ["muted", "blocked", "unavailable", "ended"] as const) {
      source.state(state);
      actor.update(dt);
      expect(pose.applied).toMatchObject({ sample: state, mouth: 0, level: state === "ended" ? -1 : 0 });
    }
    actor.dispose(); listener.dispose();
  });

  it("closes the outgoing mouth bones before disposal and binds a fresh voice to the replacement", () => {
    const actor = blocks("mia"), source = voiceSource(dt), owner = { actor, line: 7 };
    const pose = bindConversationPose(actor, { audio: source.audio })!;
    const mouth = actor.naturalRig()!.mouth, smile = actor["smile"];
    source.follow(owner); source.state("playing"); source.level(1);
    pose.speak(7, owner);
    step(actor, 0.3, hz);
    expect(mouth.scale.y).toBeGreaterThan(0.5);
    expect(smile.scale.y).toBeLessThan(0.001);

    pose.release();
    actor.dispose();
    actor.root.removeFromParent();
    expect(actor.naturalRig()).toBeUndefined();
    expect(actor.talkPose).toBeUndefined();
    expect(pose).toMatchObject({ active: false, weight: 0, mouth: 0 });
    expect(mouth.scale.toArray()).toEqual([0.00001, 0.00001, 0.00001]);
    expect(smile.scale.y).toBe(1);

    const next = blocks("mia"), replay = { actor: next, line: 7 };
    const reopened = bindConversationPose(next, { audio: source.audio })!;
    source.follow(replay);
    reopened.speak(7, owner);
    next.update(dt);
    expect(reopened.mouth).toBe(0);
    reopened.speak(7, replay);
    next.update(dt);
    expect(reopened.mouth).toBeCloseTo(1 - Math.exp(-dt / 0.045));
    expect(next.naturalRig()!.mouth).not.toBe(mouth);
    expect(mouth.scale.y).toBe(0.00001);
    next.dispose();
  });

  it("keeps hidden and visible corners at neutral during live reduced speech, quiet, and release", () => {
    const query = new MotionPreference();
    vi.stubGlobal("matchMedia", () => query);
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const actor = blocks("mia"), source = voiceSource(dt), owner = { actor, line: 1 };
    const pose = bindConversationPose(actor, { audio: source.audio })!;
    const r = actor.naturalRig()!, corners = r.corners!;
    const skin = actor["skin"]!, { bones } = skin.skeleton;
    const visible = actor["smile"], eyes = actor["eyes"], lids = actor["lids"];
    const live = new Set<Object3D>([r.mouth, visible, eyes, lids]);
    const still = bones.filter((bone) => !live.has(bone));
    const channels = () => still.flatMap((bone) => [
      ...bone.position.toArray(), ...bone.quaternion.toArray(), ...(bone === corners ? [] : bone.scale.toArray()),
    ]);
    step(actor, 0.3, hz);
    const base = corners.position.y;
    expect(base).toBeCloseTo(0.020, 9);

    source.follow(owner); source.state("playing"); source.level(1);
    pose.speak(1, owner, { kind: "headGreeting" });
    step(actor, 0.27, hz);
    expect(corners.position.y - base).toBeCloseTo(0.005, 8);
    expect(corners.scale.y).toBeLessThan(0.001);
    step(actor, 0.5, hz);
    expect(pose.react("understood")).toBe(true);
    step(actor, 0.24, hz);
    expect(corners.position.y - base).toBeCloseTo(0.008, 7);
    expect(corners.scale.y).toBeLessThan(0.001);
    const height = r.mouth.scale.y;
    pose.watch = new Vector3(1, 1.6, 1);
    query.set(true);
    actor.update(dt);
    expect(r.mouth.scale.y).toBeCloseTo(height, 5);
    expect(corners.position.y).toBeCloseTo(base, 10);
    const neutral = channels();

    source.level(0.03);
    step(actor, 0.1, hz);
    expect(r.mouth.scale.y).toBeGreaterThan(0.04);
    step(actor, 0.05, hz);
    expect(r.mouth.scale.y).toBe(0.00001);
    expect(visible.scale.y).toBe(1);
    step(actor, 0.05, hz);
    expect(r.mouth.scale.y).toBe(0.00001);
    source.level(0.85);
    actor.update(dt);
    expect(r.mouth.scale.y).toBeGreaterThan(0.04);
    expect(visible.scale.y).toBe(0.00001);

    let maxDrift = 0, blink = false, hidden = false, closed = false;
    for (let i = 0; i < 7 * hz; i++) {
      source.level(i < hz || i >= 4 * hz ? 0.6 : 0);
      pose.watch.x = Math.sin(i * dt);
      actor.update(dt);
      const current = channels();
      for (let j = 0; j < current.length; j++) maxDrift = Math.max(maxDrift, Math.abs(current[j] - neutral[j]));
      expect(corners.position.y).toBeCloseTo(base, 10);
      blink ||= pose.applied.blink > 0.45 && eyes.scale.y < 0.65;
      hidden ||= corners.scale.y < 0.001;
      closed ||= corners.scale.y === 1;
    }
    expect(maxDrift).toBeLessThanOrEqual(0.002);
    expect([blink, hidden, closed]).toEqual([true, true, true]);
    expect(pose.applied.mouth).toBeGreaterThan(0.5);

    query.set(false);
    step(actor, 0.3, hz);
    expect(pose.applied).toMatchObject({ reduced: false, gesture: null, reactionWeight: 0 });
    expect(pose.applied.mouth).toBeGreaterThan(0.5);
    expect(corners.position.y).toBeCloseTo(base, 10);
    query.set(true);
    actor.update(dt);
    pose.release();
    step(actor, 0.15, hz);
    expect(channels().every((value, i) => Math.abs(value - neutral[i]) <= 0.002)).toBe(true);
    expect(pose.applied.mouth).toBe(0);
    step(actor, 0.15, hz);
    expect(actor.talkPose).toBeUndefined();
    actor.dispose();
  });

  it("keeps a fresh reduced learner and observer still with their authored seat and equipment", () => {
    vi.stubGlobal("matchMedia", () => new MotionPreference(true));
    const learner = blocks("tona"), observer = blocks("walter");
    learner.setAnim("sit");
    learner.rightHand.add(new Group());
    const player = bindConversationPose(learner, { role: "learner" })!, nearby = bindConversationPose(observer, { role: "bystander" })!;
    player.watch = nearby.watch = new Vector3(1, 1.2, 3);
    const r = learner.naturalRig()!, other = observer.naturalRig()!;
    const hand = learner.rightHand.getWorldPosition(new Vector3()), initial = budget(learner);
    const joints = [r.body, r.head, r.eye, r.upperR, r.foreR, r.corners!, other.body, other.head, other.eye, other.corners!];
    const channels = () => joints.flatMap((joint) => [...joint.position.toArray(), ...joint.quaternion.toArray(), ...joint.scale.toArray()]);
    const neutral = channels();
    expect(nearby.glanceAt(new Vector3(1, 1.2, 3))).toBe(false);
    for (let i = 0; i < 7 * hz; i++) {
      learner.update(dt); observer.update(dt);
      expect(channels().every((value, j) => Math.abs(value - neutral[j]) <= 0.002)).toBe(true);
    }
    expect(learner.anim).toBe("sit");
    expect(learner.rightHand.getWorldPosition(new Vector3()).distanceTo(hand)).toBeLessThan(1e-8);
    expect(budget(learner)).toEqual(initial);
    learner.dispose(); observer.dispose();
  });

  it("counts with three bounded thumb-side beats and carries feedback into a new voice", () => {
    const actor = blocks("mia"), r = actor.naturalRig()!;
    const pose = bindConversationPose(actor)!;
    step(actor, 0.3, hz);
    pose.speak(1, null, { kind: "count", count: 3 });
    const pulses: number[] = [];
    for (let i = 0; i < Math.round(0.82 * hz); i++) {
      actor.update(dt);
      const amount = r.foreR.rotation.y + 0.55 * pose.applied.gestureWeight;
      pulses.push(amount);
      expect(r.foreL.rotation.y).toBe(0);
    }
    const peaks = pulses.flatMap((value, i) => value > 0.02 && value > (pulses[i - 1] ?? 0) && value >= (pulses[i + 1] ?? 0) ? [i] : []);
    expect(peaks).toHaveLength(3);
    expect(Math.max(...pulses)).toBeLessThanOrEqual(0.09 + 1e-9);
    expect((peaks[2] - peaks[1]) * dt).toBeCloseTo(0.19, 1);

    pose.setRole("listening");
    pose.react("understood");
    step(actor, 0.13, hz);
    pose.speak(2, { actor, line: 2 });
    step(actor, 0.12, hz);
    expect(pose.applied.reactionWeight).toBeGreaterThan(0.95);
    expect(pose.applied.deltas.headPitch).toBeGreaterThan(0.06);
    expect(pose.applied.deltas.smile).toBeLessThanOrEqual(0.008 + 1e-9);
    step(actor, 0.3, hz);
    expect(pose.applied.reactionWeight).toBe(0);
    actor.dispose();
  });

  it("keeps greeting, directions, and offering within the local reach limits", () => {
    const actor = blocks("vinnie"), r = actor.naturalRig()!;
    const pose = bindConversationPose(actor)!;
    step(actor, 0.3, hz);
    const arm = r.upperR.rotation.clone(), fore = r.foreR.rotation.clone();
    const hand = new Vector3(), eye = new Vector3();
    const peaks: number[] = [];
    pose.speak("greeting", null, { kind: "greeting" });
    for (let i = 0; i < Math.round(0.75 * hz); i++) {
      actor.update(dt);
      expect(r.upperR.rotation.z - arm.z).toBeLessThanOrEqual(0.75 + 1e-9);
      expect(r.foreR.rotation.z - fore.z).toBeLessThanOrEqual(0.14 + 1e-9);
      r.foreR.localToWorld(hand.set(0, -r.handLength, 0));
      expect(hand.y).toBeLessThan(r.eye.getWorldPosition(eye).y);
      peaks.push(r.foreR.rotation.z - fore.z);
    }
    expect(Math.max(...peaks)).toBeGreaterThan(0.12);
    expect(peaks.filter((value, i) => value > 0.08 && value > (peaks[i - 1] ?? 0) && value >= (peaks[i + 1] ?? 0))).toHaveLength(1);

    step(actor, 0.95, hz);
    pose.speak("direction", null, { kind: "point", side: 1, directional: true });
    step(actor, 0.3, hz);
    expect(r.upperR.rotation.x - arm.x).toBeCloseTo(-0.56, 8);
    expect(r.foreR.rotation.x - fore.x).toBeCloseTo(-0.68, 8);
    step(actor, 1.5, hz);
    pose.speak("offer", null, { kind: "offer" });
    step(actor, 0.3, hz);
    expect(r.upperR.rotation.x - arm.x).toBeCloseTo(-0.48, 8);
    expect(r.foreR.rotation.x - fore.x).toBeCloseTo(-0.90, 8);
    actor.dispose();
  });

  it("reuses the far skin and restores the toon rig's shoulders after a shrug", async () => {
    const actor = blocks("mia"), twin = Character.far(actor.look);
    expect(actor.attachFar(twin)).toBe(true);
    const initial = budget(actor);
    expect(initial.meshes.filter((mesh) => mesh instanceof SkinnedMesh)).toHaveLength(2);
    actor.setFar(true);
    const pose = bindConversationPose(actor)!;
    pose.speak(1, null, { kind: "shrug" });
    step(actor, 0.3, hz);
    expect(budget(actor)).toEqual(initial);
    pose.interrupt();
    expect(actor["farSkin"]?.visible).toBe(true);
    actor.dispose();

    vi.resetModules();
    vi.stubGlobal("location", { search: "?style=toon" });
    const { StyledCharacter } = await import("../src/game/characters/StyledCharacter");
    expect((await import("../src/game/style")).STYLE).toBe("toon");
    const trial = new StyledCharacter(NPCS.chloe.look);
    const r = trial.naturalRig(), baseline = r.upperR.position.y, trialBudget = budget(trial);
    expect(trialBudget.meshes).toHaveLength(2); // The trial's existing fill and outline share one skeleton.
    const styled = bindConversationPose(trial)!;
    step(trial, 0.3, hz);
    styled.speak(1, null, { kind: "shrug" });
    step(trial, 0.25, hz);
    expect(r.upperR.position.y - baseline).toBeCloseTo(0.015, 8);
    styled.release();
    step(trial, 0.3, hz);
    expect(r.upperR.position.y).toBe(baseline);
    expect(budget(trial)).toEqual(trialBudget);
  });
});
