// Import on conversation entry. The existing game can animate characters without loading this module.
import { Euler, Matrix4, Quaternion, Vector3 } from "three";
import type { Object3D } from "three";
import type { AudioSystem } from "../audio";
import type { GameCharacter } from "../characters";
import type { NaturalPoseDriver, NaturalRig, TalkLineId, VoiceVisualOwner } from "./contract";
import { ArmEntry, blockedHands, ease, ENTRY_SECONDS } from "./contract";
import { VoiceMouth } from "./mouth";

export type { TalkLineId, VoiceVisualOwner } from "./contract";
export type TalkRole = "speaking" | "listening" | "thinking" | "reaction" | "cast" | "learner" | "bystander" | "closing";
export type TalkGesture = "greeting" | "headGreeting" | "question" | "point" | "shrug" | "yes" | "no" | "count" | "offer";
export type TalkReaction = "understood" | "repeat" | "wave" | "openPalm" | "heart";
export interface GestureRequest {
  kind: TalkGesture;
  side?: -1 | 1;
  count?: 1 | 2 | 3;
  delay?: number;
  directional?: boolean;
}
type CueKind = TalkGesture | TalkReaction;
type VoiceSource = Pick<AudioSystem, "visualState" | "level" | "vowel">;

export interface PoseOptions {
  audio?: VoiceSource;
  role?: TalkRole;
  /** World-space top of a counter in reach of the actor. */
  counterY?: number;
  rig?: NaturalRig;
  mouth?: VoiceMouth;
  beforeAdvance?(dt: number): boolean;
  onDetach?(): void;
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const mix = (base: number, target: number, weight: number) => base + (target - base) * weight;

/** All arguments are seconds. The hold can be zero for a single nod or other short accent. */
export function oneShot(t: number, rise: number, hold: number, release: number): number {
  return ease(t / rise) * ease((rise + hold + release - t) / release);
}

interface Reach {
  forward: number;
  out: number;
  bend: number;
  twist: number;
  side: number;
  both?: true;
}

const REACH: Partial<Record<CueKind, Reach>> = {
  greeting: { forward: -0.34, out: 0.75, bend: -1.55, twist: -0.32, side: 0 },
  question: { forward: -0.27, out: 0.20, bend: -0.95, twist: -0.85, side: 0.18, both: true },
  point: { forward: -0.56, out: 0.19, bend: -0.68, twist: -0.22, side: 0.12 },
  shrug: { forward: -0.1, out: 0.16, bend: -0.68, twist: -0.7, side: 0.24, both: true },
  count: { forward: -0.37, out: 0.17, bend: -1.18, twist: -0.55, side: 0.12 },
  offer: { forward: -0.48, out: 0.12, bend: -0.9, twist: -0.95, side: 0.12 },
  wave: { forward: -0.25, out: 0.48, bend: -1.32, twist: -0.32, side: 0 },
  openPalm: { forward: -0.35, out: 0.18, bend: -1.1, twist: -0.85, side: 0.18 },
  heart: { forward: -0.4, out: -0.08, bend: -1.65, twist: -0.2, side: -0.56 },
};

interface Cue {
  kind: CueKind | null;
  age: number;
  side: -1 | 1;
  count: 1 | 2 | 3;
  directional?: boolean;
}

function cueTime(kind: CueKind, age: number) {
  if (kind === "understood") return oneShot(age, 0.23, 0.02, 0.27);
  if (kind === "repeat") return oneShot(age, 0.22, 0.15, 0.28);
  if (kind === "wave" || kind === "openPalm" || kind === "heart") return oneShot(age, 0.22, 0.28, 0.28);
  return oneShot(age, 0.20, kind === "count" ? 0.35 : 0.23, 0.28);
}

interface Thigh {
  joint: Object3D;
  position: Vector3;
  rotation: Quaternion;
}

const thigh = (joint: Object3D): Thigh => ({ joint, position: joint.position.clone(), rotation: new Quaternion() });

/** Live values from the last character update. Copy these only when taking an external snapshot. */
function jointValues() {
  return {
    torsoPitch: 0, hipRoll: 0, headPitch: 0, headYaw: 0, headRoll: 0, eyeX: 0, eyeY: 0,
    shoulderL: 0, shoulderR: 0, upperL: 0, upperR: 0, outL: 0, outR: 0,
    elbowL: 0, elbowR: 0, foreSideL: 0, foreSideR: 0, thumbL: 0, thumbR: 0,
    browL: 0, browR: 0, smile: 0,
  };
}

type JointValues = ReturnType<typeof jointValues>;
const joints = Object.keys(jointValues()) as (keyof JointValues)[];

function readJoints(r: NaturalRig, a: JointValues, eyeBaseY: number) {
  a.torsoPitch = r.body.rotation.x; a.hipRoll = r.body.rotation.z;
  a.headPitch = r.head.rotation.x; a.headYaw = r.head.rotation.y; a.headRoll = r.head.rotation.z;
  a.eyeX = r.eye.position.x; a.eyeY = r.eye.position.y - eyeBaseY;
  a.shoulderL = r.upperL.position.y; a.shoulderR = r.upperR.position.y;
  a.upperL = r.upperL.rotation.x; a.upperR = r.upperR.rotation.x; a.outL = r.upperL.rotation.z; a.outR = r.upperR.rotation.z;
  a.elbowL = r.foreL.rotation.x; a.elbowR = r.foreR.rotation.x;
  a.foreSideL = r.foreL.rotation.z; a.foreSideR = r.foreR.rotation.z;
  a.thumbL = r.foreL.rotation.y; a.thumbR = r.foreR.rotation.y;
  a.browL = r.browL.position.y; a.browR = (r.browR ?? r.browL).position.y; a.smile = r.corners?.position.y ?? 0;
}

function observation() {
  return {
    active: true, role: "cast" as TalkRole, reduced: false, weight: 0, gesture: null as CueKind | null, gestureWeight: 0,
    sample: "text-only" as VoiceMouth["sample"], level: null as number | null, mouth: 0, mouthScaleY: 0, blink: 0,
    gazeTarget: null as string | null, gazeYaw: 0, gazePitch: 0, gazeEyeX: 0, gazeEyeY: 0,
    watching: false, listeningWeight: 0, reactionWeight: 0, ...jointValues(), deltas: jointValues(),
  };
}

class ConversationPose implements NaturalPoseDriver {
  private readonly values = observation();
  get applied(): Readonly<ReturnType<typeof observation>> { return this.values; }
  weight = 0;
  private readonly lips: VoiceMouth;
  get mouth() { return this.lips.mouth; }
  get roundness() { return this.lips.roundness; }
  watch?: Vector3;
  reduced = false;
  private role: TalkRole;
  private engaged = true;
  get releasing() { return !this.engaged && !this.closed; }
  private closed = false;
  private blend: number;
  private armEntry?: ArmEntry;
  private releaseFrom = 0;
  private releaseAge = 0;
  private releaseSeconds = 0.30;
  private listenWeight = 0;
  private inclination = 0;
  private time = 0;
  private listenAt = Infinity;
  private listenAge = Infinity;
  private learnerHip = false;

  private voice: VoiceVisualOwner | null = null;
  private line: TalkLineId | null = null;
  private readonly gestured = new Set<TalkLineId>();
  private phraseAge = Infinity;
  private lastPhrase = -Infinity;
  private afterQuiet = true;

  private readonly cue: Cue = { kind: null, age: 0, side: 1, count: 1 };
  private readonly fading: Cue = { kind: null, age: 0, side: 1, count: 1 };
  private readonly response: Cue = { kind: null, age: 0, side: 1, count: 1 };
  private fadeAge = 0;
  private lastArm = -Infinity;
  private saidGoodbye = false;
  private counterY: number | undefined;
  private readonly gaze = new Vector3();
  private readonly ray = new Vector3();
  private readonly inverseWorld = new Matrix4();
  private gazeAge = Infinity;
  private gazeFade = 1;
  private gazeEnding = false;
  private gazeHold = 0.32;
  private gazeTarget = "";
  private readonly base = jointValues();

  private readonly hand = new Vector3();
  private readonly armAngle = new Euler();
  private readonly foreAngle = new Euler();
  private readonly bodyBase = new Quaternion();
  private readonly bodyDelta = new Quaternion();
  private readonly leftThigh: Thigh;
  private readonly rightThigh: Thigh;
  private torsoMixed = false;
  private shouldersMixed = false;
  private readonly motion: MediaQueryList | undefined;
  private readonly mount: Object3D[] = [];
  private eyeBaseX = 0;
  private eyeBaseY = 0;

  constructor(private readonly actor: GameCharacter, private readonly rig: NaturalRig, private readonly audio: VoiceSource | undefined, private readonly options: PoseOptions, entry: ArmEntry) {
    this.blend = entry.progress;
    this.weight = ease(this.blend);
    if (entry.active && this.blend < 1) this.armEntry = entry;
    this.lips = options.mouth ?? new VoiceMouth();
    this.role = options.role ?? "cast";
    this.counterY = options.counterY;
    this.leftThigh = thigh(rig.thighL);
    this.rightThigh = thigh(rig.thighR);
    this.eyeBaseX = rig.eye.position.x;
    this.eyeBaseY = rig.eye.position.y;
    this.motion = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : undefined;
    this.motion?.addEventListener("change", this.motionChanged);
    this.motionChanged();
    this.scheduleListener();
    for (let node: Object3D | null = actor.root; node; node = node.parent) {
      node.addEventListener("removed", this.interrupt);
      this.mount.push(node);
    }
  }

  private readonly motionChanged = () => {
    const reduced = this.motion?.matches ?? false;
    if (this.reduced === reduced) return;
    this.reduced = reduced;
    if (reduced) {
      if (this.engaged) this.weight = this.blend = 1;
      this.armEntry = undefined;
      this.inclination = 0;
      this.cue.kind = this.fading.kind = this.response.kind = null;
      this.gazeAge = this.phraseAge = this.listenAge = Infinity;
    } else this.scheduleListener();
  };

  /** Supply a role when the turn changes. Repeating a role keeps its listening cadence. */
  setRole(role: TalkRole) {
    if (!this.engaged || role === this.role) return;
    this.role = role;
    this.voice = null;
    if (role !== "closing") this.fadeCue();
    this.endGlance();
    this.phraseAge = this.listenAge = Infinity;
    this.scheduleListener();
  }

  setCounterHeight(worldY?: number) { this.counterY = worldY; }

  /** A transcript line may be replayed with a fresh owner, but its gesture is consumed on the first request. */
  speak(line: TalkLineId, owner: VoiceVisualOwner | null, gesture?: GestureRequest) {
    if (!this.engaged) return;
    this.setRole("speaking");
    const voice = owner?.actor === this.actor && owner.line === line ? owner : null;
    if (voice !== this.voice) {
      this.voice = voice;
      this.afterQuiet = true;
      this.phraseAge = Infinity;
    }
    if (line !== this.line) {
      this.line = line;
      this.fadeCue();
      this.endGlance();
    }
    this.gestureForLine(line, gesture);
  }

  gestureForLine(line: TalkLineId, gesture?: GestureRequest) {
    if (!this.engaged || this.gestured.has(line)) return;
    if (this.reduced || !gesture) return;
    this.gestured.add(line);
    this.startCue(gesture.kind, gesture.side, gesture.count, gesture.delay, gesture.directional);
  }

  /** Feedback may overlap speech. The current recording retains ownership of the lips. */
  react(kind: TalkReaction | "yes" | "headGreeting", side: -1 | 1 = 1, delay = 0) {
    if (!this.engaged || this.reduced) return false;
    if (kind === "understood" || kind === "repeat") {
      this.response.kind = kind;
      this.response.age = -delay;
      this.response.side = side;
      return true;
    }
    if (kind === "wave" || kind === "openPalm" || kind === "heart") {
      if (this.saidGoodbye) return false;
      this.saidGoodbye = true;
    }
    this.fadeCue();
    this.startCue(kind, side, 1, delay);
    return true;
  }

  /** A brief look toward an existing world-space point. Eyes lead the additional head turn by 80 ms. */
  glanceAt(worldPoint: Vector3, delay = 0.32, hold = this.role === "bystander" ? 0.32 : 0.16, target = "object") {
    if (!this.engaged || this.reduced) return;
    if (this.role === "bystander") {
      this.actor.root.getWorldPosition(this.ray);
      if (this.ray.distanceToSquared(worldPoint) > 4.5 ** 2) return;
    }
    this.gaze.copy(worldPoint);
    this.gazeTarget = target;
    this.gazeAge = -delay;
    this.gazeHold = this.role === "bystander" ? clamp(hold, 0.22, 0.5) : clamp(hold, 0.10, 0.24);
    this.gazeFade = 1;
    this.gazeEnding = false;
  }

  private endGlance() {
    if (this.gazeAge < 0) this.gazeAge = Infinity;
    this.gazeEnding = true;
  }

  /** Restore the current underlying idle over 300 ms. Call interrupt for removal or a hard cut. */
  release(seconds = 0.30) {
    if (!this.engaged) return;
    this.armEntry?.capture();
    this.releaseSeconds = seconds;
    this.engaged = false;
    this.releaseFrom = this.blend;
    this.voice = null;
  }

  readonly interrupt = () => {
    if (this.closed) return;
    this.restoreBase();
    this.rig.eye.position.x = this.eyeBaseX;
    this.rig.eye.position.y = this.eyeBaseY;
    this.detach();
    this.values.sample = "interrupt";
    this.values.level = null;
    if (this.actor.anim === "wave") this.actor.setAnim("idle");
    this.actor.update(0);
  };

  private detach() {
    this.closed = true;
    this.engaged = false;
    this.voice = null;
    this.gestured.clear();
    this.lips.reset();
    this.weight = 0;
    this.values.active = false;
    this.values.weight = this.values.mouth = this.values.gestureWeight = 0;
    this.values.gesture = null;
    this.motion?.removeEventListener("change", this.motionChanged);
    for (const node of this.mount) node.removeEventListener("removed", this.interrupt);
    this.mount.length = 0;
    if (this.actor.talkPose === this) this.actor.talkPose = undefined;
    this.options.onDetach?.();
  }

  private fadeCue() {
    if (!this.cue.kind) return;
    if (this.cue.age >= 0) {
      Object.assign(this.fading, this.cue);
      this.fadeAge = 0;
    }
    this.cue.kind = null;
  }

  private startCue(kind: CueKind, side: -1 | 1 = 1, count: 1 | 2 | 3 = 1, delay = 0, directional = false) {
    if (REACH[kind]) {
      const onset = this.time + delay;
      if (onset - this.lastArm < 1.6) {
        if (kind === "greeting" || kind === "wave" || kind === "heart") kind = "headGreeting";
        else return;
      } else this.lastArm = onset;
    }
    this.cue.kind = kind;
    this.cue.age = -delay;
    this.cue.side = side;
    this.cue.count = count;
    this.cue.directional = directional;
  }

  private get blockedHands() {
    return blockedHands(this.actor, this.rig);
  }

  get armOpportunity() {
    const blocked = this.blockedHands;
    return (blocked === 3 ? 0 : blocked ? 0.66 : 1) * (this.actor.anim === "sit" || this.counterY !== undefined ? 0.6 : 1);
  }

  get canWave() { return this.blockedHands !== 3 && this.counterY === undefined && this.actor.anim !== "sit"; }

  private scheduleListener() {
    this.listenAt = this.time + (this.role === "learner" ? 5 + Math.random() * 3 : 2 + Math.random() * 1.5);
  }

  private sampleVoice(dt: number, paused: boolean) {
    this.lips.read(dt, this.audio, this.voice ?? undefined, paused);
    const { sample, level, silence } = this.lips;
    this.values.sample = sample;
    this.values.level = level;
    if (silence >= 0.18) this.afterQuiet = true;
    if (sample === "voiced" && level! >= 0.18 && this.afterQuiet) {
      this.afterQuiet = false;
      if (!this.reduced && this.time - this.lastPhrase >= 0.75) {
        this.phraseAge = 0;
        this.lastPhrase = this.time;
      }
    }
  }

  advance(dt: number) {
    this.restoreBase();
    const paused = this.options.beforeAdvance?.(dt) ?? false;
    if (paused) dt = 0;
    this.time += dt;
    if (this.engaged) this.blend = this.reduced ? 1 : Math.min(1, this.blend + dt / ENTRY_SECONDS);
    else this.blend = this.releaseFrom * Math.max(0, 1 - (this.releaseAge += dt) / this.releaseSeconds);
    if (this.blend < 1e-8) this.blend = 0;
    this.weight = ease(this.blend);
    const listening = this.role === "listening";
    this.listenWeight = clamp(this.listenWeight + dt * (listening || this.role === "thinking" ? 1 : -1) / 0.16, 0, 1);
    if (this.engaged) {
      this.cue.age += dt;
      this.response.age += dt;
      this.fadeAge += dt;
      if (this.gazeEnding) this.gazeFade = Math.max(0, this.gazeFade - dt / 0.16);
      else this.gazeAge += dt;
      this.phraseAge += dt;
      this.listenAge += dt;
    }
    if (!this.reduced && this.engaged && (listening || this.role === "learner") && this.time >= this.listenAt) {
      this.listenAge = 0;
      this.learnerHip = !this.learnerHip;
      this.listenAt = this.time + (listening ? 4 : 5) + Math.random() * 3;
    }
    if (!this.reduced) {
      const { kind, age } = this.response;
      const incline = listening && !(kind && cueTime(kind, age) > 0);
      this.inclination = clamp(this.inclination + dt * (incline ? 1 / 0.26 : -1 / 0.20), 0, 1);
    }
    this.sampleVoice(dt, paused);
  }

  private applyGaze(head: Object3D, eye: Object3D) {
    const age = this.gazeAge;
    const blend = this.weight * ease(this.gazeFade);
    const eyesWeight = oneShot(age, 0.08, 0.13 + this.gazeHold, 0.22) * blend;
    if (eyesWeight === 0) return;
    // The target is in world space. Work in the root's frame so parent rotation/scale also count.
    const root = this.actor.root, body = this.rig.body;
    root.updateWorldMatrix(true, false);
    body.updateMatrix();
    this.inverseWorld.copy(root.matrixWorld).invert();
    this.hand.copy(head.position).applyMatrix4(body.matrix);
    this.ray.copy(this.gaze).applyMatrix4(this.inverseWorld).sub(this.hand);
    const yaw = Math.atan2(this.ray.x, this.ray.z);
    const pitch = -Math.atan2(this.ray.y, Math.hypot(this.ray.x, this.ray.z));
    if (Math.abs(yaw) > 65 * Math.PI / 180 || Math.abs(pitch) > 35 * Math.PI / 180) return;
    const x = yaw - head.rotation.y, y = pitch - head.rotation.x;
    // With no iris joint, move the style's shared eye joint by the same limited amount.
    const eyeX = clamp(eye.position.x, -0.009, 0.009);
    const eyeY = this.rig.corners ? clamp(eye.position.y, -0.004, 0.004) : 0;
    const eyeBeforeX = eye.position.x, eyeBeforeY = eye.position.y;
    eye.position.x = mix(eyeX, clamp(x * 0.028, -0.009, 0.009), eyesWeight);
    eye.position.y = (this.rig.corners ? 0 : this.eyeBaseY) + mix(eyeY, clamp(-y * 0.019, -0.004, 0.004), eyesWeight);
    const headWeight = oneShot(age - 0.08, 0.13, this.gazeHold, 0.22) * blend;
    const a = this.values;
    a.gazeTarget = this.gazeTarget;
    a.gazeEyeX = eye.position.x - eyeBeforeX;
    a.gazeEyeY = eye.position.y - eyeBeforeY;
    a.gazeYaw = clamp(x, -0.12, 0.12) * headWeight;
    a.gazePitch = clamp(y, -0.07, 0.07) * headWeight;
    head.rotation.y += a.gazeYaw;
    head.rotation.x += a.gazePitch;
  }

  private mixTorso(pitch: number, roll: number) {
    if (pitch === 0 && roll === 0) return;
    const body = this.rig.body;
    this.torsoMixed = true;
    this.bodyBase.copy(body.quaternion);
    body.rotation.x += pitch;
    body.rotation.z += roll;
    // Counter-rotate about the body origin in local space. The thighs' complete world transforms stay in place.
    this.bodyDelta.copy(body.quaternion).invert().multiply(this.bodyBase);
    this.keepThighInPlace(this.leftThigh);
    this.keepThighInPlace(this.rightThigh);
  }

  private keepThighInPlace(t: Thigh) {
    t.rotation.copy(t.joint.quaternion);
    const scale = this.rig.body.scale;
    t.joint.position.copy(t.position).multiply(scale).applyQuaternion(this.bodyDelta).divide(scale);
    t.joint.quaternion.premultiply(this.bodyDelta);
  }

  restoreBase() {
    if (this.shouldersMixed) {
      this.shouldersMixed = false;
      this.rig.upperL.position.y = this.base.shoulderL;
      this.rig.upperR.position.y = this.base.shoulderR;
    }
    if (!this.torsoMixed) return;
    this.torsoMixed = false;
    this.rig.body.quaternion.copy(this.bodyBase);
    this.leftThigh.joint.position.copy(this.leftThigh.position);
    this.leftThigh.joint.quaternion.copy(this.leftThigh.rotation);
    this.rightThigh.joint.position.copy(this.rightThigh.position);
    this.rightThigh.joint.quaternion.copy(this.rightThigh.rotation);
  }

  private aboveCounter(upper: Object3D, fore: Object3D, forward: number, out: number, bend: number, twist: number, side: number) {
    if (this.counterY === undefined) return true;
    const body = this.rig.body;
    body.updateWorldMatrix(true, false);
    this.hand.set(0, -this.rig.handLength, 0).applyEuler(this.foreAngle.set(bend, twist, side, fore.rotation.order));
    this.hand.add(fore.position).applyEuler(this.armAngle.set(forward, upper.rotation.y, out, upper.rotation.order));
    this.hand.add(upper.position).applyMatrix4(body.matrixWorld);
    return this.hand.y >= this.counterY + 0.065;
  }

  private mixArm(side: -1 | 1, r: Reach, weight: number, beat: number, pulse: number) {
    const upper = side < 0 ? this.rig.upperL : this.rig.upperR;
    const fore = side < 0 ? this.rig.foreL : this.rig.foreR;
    const forward = mix(upper.rotation.x, r.forward, weight);
    const out = mix(upper.rotation.z, r.out * side, weight);
    const bend = mix(fore.rotation.x, r.bend, weight);
    const twist = mix(fore.rotation.y, r.twist * side, weight) + pulse * side;
    const swing = mix(fore.rotation.z, (r.side + beat) * side, weight);
    if (this.counterY !== undefined && (
      !this.aboveCounter(upper, fore, upper.rotation.x, upper.rotation.z, fore.rotation.x, fore.rotation.y, fore.rotation.z) ||
      !this.aboveCounter(upper, fore, r.forward, r.out * side, r.bend, (r.twist + pulse) * side, (r.side + beat) * side) ||
      !this.aboveCounter(upper, fore, forward, out, bend, twist, swing)
    )) return false;
    upper.rotation.x = forward;
    upper.rotation.z = out;
    fore.rotation.set(bend, twist, swing);
    return true;
  }

  private applyCue(c: Cue, weight: number, seated: boolean, left: boolean, right: boolean, supported: boolean) {
    const kind = c.kind;
    if (!kind || weight === 0) return;
    const { head, browL, corners, upperL, upperR } = this.rig;
    if (kind === "yes" || kind === "understood") {
      head.rotation.x += (kind === "yes" ? 0.065 : 0.08) * weight;
      if (kind === "understood" && corners) corners.position.y += 0.008 * weight;
    } else if (kind === "no") {
      const phase = clamp(c.age / 0.71, 0, 1);
      head.rotation.y += Math.sin(phase * Math.PI * 2) * 0.085 * weight;
    } else if (kind === "headGreeting") {
      head.rotation.x += 0.036 * weight;
      if (corners) corners.position.y += 0.005 * weight;
    } else if (kind === "repeat") {
      head.rotation.z += 0.055 * c.side * weight;
      const brow = c.side < 0 ? browL : this.rig.browR ?? browL;
      brow.position.y += 0.005 * weight;
    }
    const r = REACH[kind];
    if (!r) return;
    if (kind === "shrug") {
      if (!supported) {
        this.shouldersMixed = true;
        upperL.position.y = this.base.shoulderL + 0.015 * weight;
        upperR.position.y = this.base.shoulderR + 0.015 * weight;
      }
      head.rotation.z += 0.04 * c.side * weight;
    }
    const side = c.directional ? c.side : c.side < 0 ? (left ? -1 : 1) : (right ? 1 : -1);
    const amount = weight * (seated ? 0.52 : supported ? 0.65 : 1);
    const beat = kind === "greeting" || kind === "wave" ? 0.14 * oneShot(c.age - 0.20, 0.10, 0, 0.16) : 0;
    const countTime = c.age - 0.15;
    const index = Math.floor(countTime / 0.19);
    const pulse = kind === "count" && index >= 0 && index < c.count
      ? 0.09 * oneShot(countTime - index * 0.19, 0.07, 0, 0.07) * weight : 0;
    let usedArm = false;
    if (side < 0 ? left : right) usedArm = this.mixArm(side, r, amount, beat, pulse * (seated || supported ? 0.5 : 1));
    if (r.both && !seated && left && right) usedArm = this.mixArm(side === 1 ? -1 : 1, r, amount, 0, 0) || usedArm;
    if (!usedArm && c.directional) head.rotation.y += 0.055 * side * weight;
    else if (!usedArm && kind !== "shrug") head.rotation.x += 0.033 * weight;
  }

  apply(dt: number, moving: boolean, blink: number, watching = false) {
    const r = this.rig, a = this.values, actor = this.actor;
    const seated = actor.anim === "sit";
    const blocked = this.blockedHands, blockL = !!(blocked & 1), blockR = !!(blocked & 2);
    const supported = seated || blockL || blockR || this.counterY !== undefined;
    this.eyeBaseX = r.eye.position.x;
    this.eyeBaseY = r.eye.position.y;
    const kind = this.cue.kind;
    const cueWeight = kind ? cueTime(kind, this.cue.age) * this.weight : 0;
    const response = this.response.kind;
    const responseWeight = response ? cueTime(response, this.response.age) * this.weight : 0;
    const addResponse = kind === "yes" || kind === "no" || kind === "headGreeting" ? 1 - responseWeight : 1;
    let faded = 0;
    a.gazeTarget = null;
    a.gazeYaw = a.gazePitch = a.gazeEyeX = a.gazeEyeY = a.listeningWeight = a.reactionWeight = 0;
    readJoints(r, this.base, r.corners ? 0 : this.eyeBaseY);
    if (!this.reduced && !moving && this.weight > 0) {
      const left = !blockL, right = !blockR;
      const listen = ease(this.listenWeight) * this.weight;
      a.listeningWeight = listen;
      const learner = this.role === "learner";
      const listenBeat = oneShot(this.listenAge, 0.23, 0.02, 0.30) * this.weight * (1 - Math.max(cueWeight, responseWeight));
      const hip = learner && this.learnerHip && !supported;
      if (!supported) this.mixTorso(0.035 * listen, hip ? 0.012 * listenBeat : 0);
      if (!supported) {
        if (left) r.foreL.rotation.x -= 0.13 * listen;
        if (right) r.foreR.rotation.x -= 0.13 * listen;
      }
      if (!hip) r.head.rotation.x += (learner ? 0.03 : 0.035) * listenBeat;
      if (this.role === "speaking" && kind !== "yes" && kind !== "no") {
        const phrase = oneShot(this.phraseAge, 0.09, 0.02, 0.28) * this.weight * (1 - responseWeight);
        r.head.rotation.x += 0.045 * phrase * (1 - cueWeight);
        r.browL.position.y += 0.008 * phrase;
        if (r.browR) r.browR.position.y += 0.008 * phrase;
      }
      const fading = this.fading.kind;
      if (fading && this.fadeAge < 0.16) {
        faded = cueTime(fading, this.fading.age) * (1 - ease(this.fadeAge / 0.16)) * this.weight;
        this.applyCue(this.fading, faded, seated, left, right, supported);
      }
      this.applyCue(this.cue, cueWeight * addResponse, seated, left, right, supported);
      this.applyCue(this.response, responseWeight, seated, left, right, supported);
      a.reactionWeight = responseWeight;
      this.applyGaze(r.head, r.eye);
      if (supported && this.inclination > 0) {
        // Leave room for the listening nod and give speech, glances and reactions their pitch.
        const limit = responseWeight > 0 ? 0.08 : a.gazeTarget ? 0.07 : this.role === "speaking" ? 0.045 : 0.08;
        const room = Math.max(0, limit - (r.head.rotation.x - this.base.headPitch));
        const pitch = Math.min(room, 0.024 * ease(this.inclination) * this.weight);
        r.head.rotation.x += pitch;
        if (watching && !a.gazeTarget) r.eye.position.y += pitch * 0.012;
      }
    }
    if (this.armEntry) {
      const weight = this.engaged ? this.weight : ease(this.releaseAge / this.releaseSeconds);
      if (weight === 1 || seated || moving) this.armEntry = undefined;
      else this.armEntry.apply(weight, blocked);
    }
    a.role = this.role; a.weight = this.weight; a.reduced = this.reduced; a.watching = watching && !this.reduced;
    const appliedCue = moving || this.reduced ? 0 : cueWeight * addResponse;
    a.gesture = appliedCue ? kind : faded ? this.fading.kind : null;
    a.gestureWeight = appliedCue || faded;
    a.mouth = this.mouth; a.mouthScaleY = r.mouth.scale.y; a.blink = blink;
    readJoints(r, a, r.corners ? 0 : this.eyeBaseY);
    for (let i = 0; i < joints.length; i++) {
      const joint = joints[i];
      a.deltas[joint] = a[joint] - this.base[joint];
    }
    if (!this.engaged && this.weight === 0 && !this.armEntry) this.detach();
  }
}

/** One controller per participating rig. Import this module only when starting actor-side conversation. */
export function bindConversationPose(actor: GameCharacter, options: PoseOptions = {}): ConversationPose | undefined {
  const prior = actor.talkPose;
  if (prior instanceof ConversationPose && !prior.releasing) return prior;
  if ((prior && !(prior instanceof ConversationPose)) || !actor.naturalRig) return;
  const rig = options.rig ?? actor.naturalRig();
  const entry = rig.entry ?? new ArmEntry(rig);
  delete rig.entry;
  prior?.interrupt();
  if (actor.anim === "wave") actor.setAnim("idle");
  const binding = new ConversationPose(actor, rig, options.audio, options, entry);
  actor.talkPose = binding;
  if (!options.rig) actor.update(0);
  return binding;
}
