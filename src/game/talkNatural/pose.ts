// Load when a visible exchange starts. The character adapters import only the contract types.
import { Euler, Matrix4, Quaternion, Vector3, type Object3D } from "three";
import type { GameCharacter } from "../characters";
import type { NaturalPoseDriver, NaturalRig, TalkLineId, VoiceVisualOwner } from "./contract";
import { blockedHands, ENTRY_SECONDS } from "./contract";
import { captureConversationPose, type PoseEntry } from "./entry";
import { VoiceMouth, type VoiceSource } from "./binding";

export { captureConversationPose } from "./entry";
export type { TalkLineId, VoiceVisualOwner } from "./contract";
export type TalkRole = "speaking" | "listening" | "thinking" | "reaction" | "cast" | "learner" | "bystander" | "closing";
export type TalkGesture = "greeting" | "headGreeting" | "question" | "point" | "shrug" | "yes" | "no" | "count" | "offer";
export type TalkReaction = "understood" | "repeat" | "wave" | "openPalm" | "heart";
type CueKind = TalkGesture | TalkReaction;

export interface GestureRequest {
  kind: TalkGesture;
  side?: -1 | 1;
  count?: 1 | 2 | 3;
  delay?: number;
  directional?: boolean;
  straight?: boolean;
  strength?: number;
  smile?: boolean;
}

export interface PoseOptions {
  audio?: VoiceSource;
  role?: TalkRole;
  /** World-space top of a counter in reach of the actor. */
  counterY?: number;
  counterContains?(point: Vector3): boolean;
  idleWorkHands?: boolean;
  random?(): number;
  entry?: PoseEntry;
  armEntryAge?: number;
  mouth?: VoiceMouth;
  preserveWork?: boolean;
  beforeAdvance?(dt: number): boolean;
  deferRefresh?: boolean;
  onDetach?(): void;
}

const clamp = (t: number, min: number, max: number) => Math.max(min, Math.min(max, t));
const ease = (t: number) => { const u = clamp(t, 0, 1); return u * u * (3 - 2 * u); };
const HANDOFF_SECONDS = 0.16;
const RELEASE_SECONDS = 0.30;

export function oneShot(t: number, rise: number, hold: number, release: number) {
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
  greeting: { forward: -0.34, out: 0.75, bend: -1.4, twist: -0.32, side: 0 },
  question: { forward: -0.27, out: 0.20, bend: -0.81, twist: -0.85, side: 0.18, both: true },
  point: { forward: -0.56, out: 0.19, bend: -0.68, twist: -0.22, side: 0.12 },
  shrug: { forward: -0.10, out: 0.16, bend: -0.56, twist: -0.70, side: 0.24, both: true },
  count: { forward: -0.37, out: 0.17, bend: -1.04, twist: -0.55, side: 0.12 },
  offer: { forward: -0.48, out: 0.12, bend: -0.90, twist: -0.95, side: 0.12 },
  wave: { forward: -0.32, out: 0.65, bend: -1.36, twist: -0.32, side: 0 },
  openPalm: { forward: -0.35, out: 0.18, bend: -0.96, twist: -0.85, side: 0.18 },
  heart: { forward: -0.40, out: -0.08, bend: -1.51, twist: -0.20, side: -0.56 },
};

const STRAIGHT: Reach = { forward: -0.62, out: 0.06, bend: -0.65, twist: -0.20, side: 0 };

interface Cue {
  kind: CueKind | null;
  age: number;
  side: -1 | 1;
  count: 1 | 2 | 3;
  directional: boolean;
  straight: boolean;
  strength: number;
  smile: boolean;
}

function emptyCue(): Cue { return { kind: null, age: 0, side: 1, count: 1, directional: false, straight: false, strength: 1, smile: false }; }

function cueTime(kind: CueKind | null, age: number) {
  if (!kind) return 0;
  if (kind === "understood") return oneShot(age, 0.23, 0.02, 0.27);
  if (kind === "repeat") return oneShot(age, 0.22, 0.15, 0.28);
  if (kind === "wave" || kind === "openPalm" || kind === "heart") return oneShot(age, 0.22, 0.28, 0.28);
  return oneShot(age, 0.20, kind === "count" ? 0.35 : 0.23, 0.28);
}

function jointValues() {
  return {
    torsoPitch: 0, hipRoll: 0, headPitch: 0, headYaw: 0, headRoll: 0, eyeX: 0, eyeY: 0,
    shoulderL: 0, shoulderR: 0, upperL: 0, upperR: 0, outL: 0, outR: 0,
    elbowL: 0, elbowR: 0, foreSideL: 0, foreSideR: 0, thumbL: 0, thumbR: 0,
    browL: 0, browR: 0, smile: 0,
  };
}

type JointValues = ReturnType<typeof jointValues>;
const jointKeys = import.meta.env.DEV ? Object.keys(jointValues()) as (keyof JointValues)[] : undefined;

function readJoints(r: NaturalRig, a: JointValues) {
  a.torsoPitch = r.body.rotation.x; a.hipRoll = r.body.rotation.z;
  a.headPitch = r.head.rotation.x; a.headYaw = r.head.rotation.y; a.headRoll = r.head.rotation.z;
  a.eyeX = r.eye.position.x; a.eyeY = r.eye.position.y;
  a.shoulderL = r.upperL.position.y; a.shoulderR = r.upperR.position.y;
  a.upperL = r.upperL.rotation.x; a.upperR = r.upperR.rotation.x;
  a.outL = r.upperL.rotation.z; a.outR = r.upperR.rotation.z;
  a.elbowL = r.foreL.rotation.x; a.elbowR = r.foreR.rotation.x;
  a.foreSideL = r.foreL.rotation.z; a.foreSideR = r.foreR.rotation.z;
  a.thumbL = r.foreL.rotation.y; a.thumbR = r.foreR.rotation.y;
  a.browL = r.browL.position.y; a.browR = (r.browR ?? r.browL).position.y;
  a.smile = r.corners?.position.y ?? 0;
}

function observation() {
  return {
    ...jointValues(), deltas: jointValues(), active: true, role: "cast" as TalkRole, reduced: false, weight: 0,
    gesture: null as CueKind | null, gestureWeight: 0, listeningWeight: 0, reactionWeight: 0, watching: false,
    sample: "text-only" as VoiceMouth["sample"], level: 0 as number | null, mouth: 0, mouthScaleY: 0, blink: 0,
    gazeTarget: null as string | null, gazeYaw: 0, gazePitch: 0, gazeEyeX: 0, gazeEyeY: 0,
  };
}

class ConversationPose implements NaturalPoseDriver {
  declare private readonly values: ReturnType<typeof observation>;
  /** The live joint sample is allocated and updated only in development. */
  get applied(): Readonly<ReturnType<typeof observation>> { return this.values; }
  private readonly lips: VoiceMouth;
  get mouth() { return this.lips.mouth; }
  get roundness() { return this.lips.roundness; }
  private closed = false;
  get active() { return !this.closed && this.actor.talkPose === this; }
  get releasing() { return !this.closed && this.releaseSeconds > 0; }
  weight = 0;
  reduced = false;
  watch?: Vector3 | null;
  get watchSpeed() { return this.role === "learner" ? 22 : undefined; }
  private role: TalkRole;
  channel: "full" | "head" | "face" = "full";
  get baseGaze() { return this.channel !== "full"; }
  get baseWork() { return this.options.preserveWork; }
  get poolHead() { return this.channel === "head"; }
  private headX = 0;
  private headY = 0;
  private headZ = 0;
  private entryAge = 0;
  private entrySeconds = ENTRY_SECONDS;
  private releaseAge = 0;
  private releaseSeconds = 0;
  private blendOrigin = true;

  private voice?: VoiceVisualOwner;
  private line?: TalkLineId;
  private readonly gestured = new Set<TalkLineId>();
  private readonly cue = emptyCue();
  private readonly fading = emptyCue();
  private readonly response = emptyCue();
  private fadeAge = 0;
  private lastArm = -Infinity;
  private saidGoodbye = false;
  private time = 0;
  private listenWeight = 0;
  private listenAt = Infinity;
  private listenAge = Infinity;
  private learnerHip = false;
  private phraseAge = Infinity;
  private lastPhrase = -Infinity;
  private afterQuiet = true;
  private counterY: number | undefined;

  private readonly gaze = new Vector3();
  private readonly ray = new Vector3();
  private readonly inverseWorld = new Matrix4();
  private gazeAge = Infinity;
  private gazeFade = 1;
  private gazeEnding = false;
  private gazeHold = 0.32;
  private gazeTarget = "";
  private peripheral = false;
  private readonly random: () => number;

  private readonly hand = new Vector3();
  private readonly eyes = new Vector3();
  private readonly armAngle = new Euler();
  private readonly foreAngle = new Euler();
  private readonly bodyBase = new Quaternion();
  private readonly bodyDelta = new Quaternion();
  private torsoMixed = false;

  // Only these channels can carry an additive result into the next base frame.
  private shouldersMixed = false;
  private shoulderBaseL = 0;
  private shoulderBaseR = 0;
  private thighsMixed = false;
  private readonly thighBaseL = new Vector3();
  private readonly thighBaseR = new Vector3();
  private readonly thighRotationL = new Quaternion();
  private readonly thighRotationR = new Quaternion();
  private eyeMixed = false;
  private readonly eyeBase = new Vector3();

  private readonly motion = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : undefined;
  private readonly mount: Object3D[] = [];

  constructor(private readonly actor: GameCharacter, private readonly rig: NaturalRig,
    private readonly options: PoseOptions, private readonly origin: PoseEntry, handoff: boolean) {
    if (import.meta.env.DEV) this.values = observation();
    this.lips = options.mouth ?? new VoiceMouth();
    this.role = options.role ?? "cast";
    this.counterY = options.counterY;
    this.entryAge = options.armEntryAge ?? 0;
    this.random = options.random ?? Math.random;
    if (handoff && !options.beforeAdvance) this.entrySeconds = HANDOFF_SECONDS;
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
      this.entryAge = this.entrySeconds;
      this.blendOrigin = false;
      if (this.line !== undefined) this.gestured.add(this.line);
      this.cue.kind = this.fading.kind = this.response.kind = null;
      this.gazeAge = this.phraseAge = this.listenAge = Infinity;
      this.listenWeight = 0;
      this.afterQuiet = false;
    } else this.scheduleListener();
  };

  setRole(role: TalkRole) {
    if (!this.active || this.releasing || role === this.role) return;
    this.role = role;
    this.voice = undefined;
    this.fadeCue();
    this.endGlance();
    this.phraseAge = this.listenAge = Infinity;
    this.scheduleListener();
  }

  setCounterHeight(worldY?: number) { this.counterY = worldY; }

  settle() {
    this.setRole("cast");
    this.voice = undefined;
    this.cue.kind = this.fading.kind = this.response.kind = null;
    this.gazeAge = this.phraseAge = this.listenAge = Infinity;
    this.listenWeight = 0;
    this.blendOrigin = false;
    this.lips.reset();
  }

  speak(line: TalkLineId, owner: VoiceVisualOwner | null, gesture?: GestureRequest) {
    if (!this.active || this.releasing) return;
    this.setRole("speaking");
    const voice = owner?.actor === this.actor && owner.line === line ? owner : undefined;
    if (voice !== this.voice) {
      this.voice = voice;
      this.afterQuiet = true;
      this.phraseAge = Infinity;
    }
    if (this.line !== line) {
      this.line = line;
      this.fadeCue();
      this.endGlance();
    }
    if (this.reduced) this.gestured.add(line);
    if (gesture) this.gestureForLine(line, gesture);
  }

  gestureForLine(line: TalkLineId, gesture: GestureRequest) {
    if (!this.active || this.releasing || this.line !== line || this.gestured.has(line)) return false;
    this.gestured.add(line);
    if (this.reduced) return false;
    this.fadeCue();
    return this.startCue(gesture.kind, gesture.side, gesture.count, gesture.delay, gesture.directional, gesture.straight, gesture.strength, gesture.smile);
  }

  react(kind: TalkReaction | "yes" | "headGreeting", side: -1 | 1 = 1, delay = 0) {
    if (!this.active || this.releasing || this.reduced) return false;
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
    return this.startCue(kind, side, 1, delay);
  }

  glanceAt(point: Vector3, delay = 0.32, hold = 0.32, target = "", peripheral = false) {
    if (!this.active || this.releasing || this.reduced || !this.gazeAngles(point, peripheral)) return false;
    this.gaze.copy(point);
    this.gazeAge = -Math.max(0, delay);
    this.gazeHold = clamp(hold, 0.26, 0.42);
    this.gazeFade = 1;
    this.gazeEnding = false;
    this.gazeTarget = target;
    this.peripheral = peripheral;
    return true;
  }

  private endGlance() {
    if (this.gazeAge < 0) this.gazeAge = Infinity;
    this.gazeEnding = true;
  }

  release(seconds = RELEASE_SECONDS) {
    if (!this.active || this.releasing) return;
    if (seconds <= 0) { this.interrupt(); return; }
    this.origin.capture();
    this.releaseSeconds = seconds;
    this.blendOrigin = !this.reduced;
    this.voice = undefined;
    this.watch = undefined;
  }

  readonly interrupt = () => { this.detach(true); };

  private detach(refresh: boolean) {
    if (this.closed) return;
    const owned = this.active;
    if (owned) this.restoreBase();
    this.closed = true;
    this.voice = undefined;
    this.lips.reset();
    this.gestured.clear();
    this.weight = 0;
    if (import.meta.env.DEV) {
      const a = this.values;
      a.active = false; a.weight = a.mouth = a.gestureWeight = a.reactionWeight = 0;
      a.gesture = null; a.sample = "interrupt"; a.level = 0;
    }
    this.motion?.removeEventListener("change", this.motionChanged);
    for (let i = 0; i < this.mount.length; i++) this.mount[i].removeEventListener("removed", this.interrupt);
    this.mount.length = 0;
    if (owned) {
      this.actor.talkPose = undefined;
      if (refresh) this.actor.update(0);
    }
    this.options.onDetach?.();
  }

  /** The new binding already has the visible transforms. Clear only this driver's bookkeeping. */
  preempt() { this.detach(false); }

  private fadeCue() {
    if (!this.cue.kind) return;
    if (cueTime(this.cue.kind, this.cue.age) > 0) {
      Object.assign(this.fading, this.cue);
      this.fadeAge = 0;
    }
    this.cue.kind = null;
  }

  private startCue(kind: CueKind, side: -1 | 1 = 1, count: 1 | 2 | 3 = 1, delay = 0,
    directional = false, straight = false, strength = 1, smile = false) {
    if (kind === "greeting" || kind === "wave" || kind === "heart" || kind === "openPalm") {
      if (!this.canWave) kind = "headGreeting";
    }
    if (REACH[kind]) {
      const onset = this.time + delay;
      if (onset - this.lastArm < 1.6) {
        if (kind === "greeting" || kind === "wave" || kind === "heart" || kind === "openPalm") kind = "headGreeting";
        else return false;
      } else this.lastArm = onset;
    }
    this.cue.kind = kind;
    this.cue.age = -delay;
    this.cue.side = side;
    this.cue.count = count;
    this.cue.directional = directional;
    this.cue.straight = straight;
    this.cue.strength = strength;
    this.cue.smile = smile;
    return true;
  }

  get armOpportunity() {
    if (this.channel !== "full") return 0;
    const blocked = blockedHands(this.actor, this.rig, this.options.idleWorkHands);
    return (blocked === 3 || this.actor.anim === "sit" || this.actor.poolPose ? 0 : blocked ? 0.66 : 1);
  }

  get canWave() { return this.counterY === undefined && this.armOpportunity > 0; }

  private scheduleListener() {
    this.listenAt = this.time + (this.role === "learner" ? 5 + this.random() * 3 : 2 + this.random() * 1.5);
  }

  advance(dt: number) {
    if (!this.active) return;
    const held = (!this.releasing && this.options.beforeAdvance?.(dt)) || !!globalThis.document?.hidden;
    if (!this.active) return;
    this.restoreBase();
    if (held) dt = 0;
    if (this.releasing) {
      this.releaseAge += dt;
      this.weight = 1 - ease(this.releaseAge / this.releaseSeconds);
    } else {
      this.entryAge += dt;
      this.weight = ease(this.entryAge / this.entrySeconds);
      this.time += dt;
      this.cue.age += dt;
      this.response.age += dt;
      this.fadeAge += dt;
      if (this.fadeAge >= HANDOFF_SECONDS) this.fading.kind = null;
      this.phraseAge += dt;
      this.listenAge += dt;
      if (this.gazeEnding) this.gazeFade = Math.max(0, this.gazeFade - dt / HANDOFF_SECONDS);
      else this.gazeAge += dt;

      const listening = this.role === "listening", learner = this.role === "learner";
      if (!this.reduced) {
        const incline = (listening || this.role === "thinking") && cueTime(this.response.kind, this.response.age) === 0;
        this.listenWeight = clamp(this.listenWeight + dt / (incline ? 0.26 : -0.22), 0, 1);
        if ((listening || learner) && this.time >= this.listenAt) {
          this.listenAge = 0;
          this.learnerHip = !this.learnerHip;
          this.listenAt = this.time + (learner ? 5 : 4) + this.random() * 3;
        }
      }
    }

    this.lips.read(dt, this.options.audio, this.voice, held);
    const { sample, level, silence } = this.lips;
    if (silence >= 0.18) this.afterQuiet = true;
    if (this.afterQuiet && sample === "voiced" && level! >= 0.18) {
      this.afterQuiet = false;
      if (!this.reduced && this.time - this.lastPhrase >= 0.75) {
        this.phraseAge = 0;
        this.lastPhrase = this.time;
      }
    }
  }

  private retainThighs() {
    if (this.thighsMixed) return;
    this.thighsMixed = true;
    this.thighBaseL.copy(this.rig.thighL.position);
    this.thighBaseR.copy(this.rig.thighR.position);
    this.thighRotationL.copy(this.rig.thighL.quaternion);
    this.thighRotationR.copy(this.rig.thighR.quaternion);
  }

  private retainShoulders() {
    if (this.shouldersMixed) return;
    this.shouldersMixed = true;
    this.shoulderBaseL = this.rig.upperL.position.y;
    this.shoulderBaseR = this.rig.upperR.position.y;
  }

  private retainEyes() {
    if (this.eyeMixed) return;
    this.eyeMixed = true;
    this.eyeBase.copy(this.rig.eye.position);
  }

  restoreBase() {
    if (!this.active) return;
    const r = this.rig;
    if (this.shouldersMixed) {
      this.shouldersMixed = false;
      r.upperL.position.y = this.shoulderBaseL;
      r.upperR.position.y = this.shoulderBaseR;
    }
    if (this.thighsMixed) {
      this.thighsMixed = false;
      r.thighL.position.copy(this.thighBaseL);
      r.thighR.position.copy(this.thighBaseR);
      r.thighL.quaternion.copy(this.thighRotationL);
      r.thighR.quaternion.copy(this.thighRotationR);
    }
    if (this.eyeMixed) {
      this.eyeMixed = false;
      r.eye.position.copy(this.eyeBase);
    }
    if (this.torsoMixed) {
      this.torsoMixed = false;
      r.body.quaternion.copy(this.bodyBase);
    }
  }

  private mixTorso(pitch: number, roll: number) {
    if (pitch === 0 && roll === 0) return;
    const { body, thighL, thighR } = this.rig;
    this.retainThighs();
    this.torsoMixed = true;
    this.bodyBase.copy(body.quaternion);
    body.rotation.x += pitch;
    body.rotation.z += roll;
    this.bodyDelta.copy(body.quaternion).invert().multiply(this.bodyBase);
    // Keep the feet on the base stance while inclining the torso.
    thighL.position.multiply(body.scale).applyQuaternion(this.bodyDelta).divide(body.scale);
    thighR.position.multiply(body.scale).applyQuaternion(this.bodyDelta).divide(body.scale);
    thighL.quaternion.premultiply(this.bodyDelta);
    thighR.quaternion.premultiply(this.bodyDelta);
  }

  private gazeYaw = 0;
  private gazePitch = 0;

  private gazeAngles(point: Vector3, peripheral: boolean) {
    const { head } = this.rig;
    const root = this.actor.root;
    head.updateWorldMatrix(true, false);
    this.inverseWorld.copy(root.matrixWorld).invert();
    this.hand.setFromMatrixPosition(head.matrixWorld).applyMatrix4(this.inverseWorld);
    this.ray.copy(point).applyMatrix4(this.inverseWorld).sub(this.hand);
    const yaw = Math.atan2(this.ray.x, this.ray.z);
    const pitch = -Math.atan2(this.ray.y, Math.hypot(this.ray.x, this.ray.z));
    const horizontal = 65 * Math.PI / 180, vertical = 35 * Math.PI / 180;
    if (!peripheral && (Math.abs(yaw) > horizontal || Math.abs(pitch) > vertical)) return false;
    this.inverseWorld.copy(head.matrixWorld).invert();
    this.ray.copy(point).applyMatrix4(this.inverseWorld);
    this.gazeYaw = Math.atan2(this.ray.x, this.ray.z);
    this.gazePitch = -Math.atan2(this.ray.y, Math.hypot(this.ray.x, this.ray.z));
    return peripheral || Math.abs(this.gazeYaw) <= horizontal && Math.abs(this.gazePitch) <= vertical;
  }

  private applyGaze() {
    const age = this.gazeAge, blend = ease(this.gazeFade);
    const eyesWeight = oneShot(age, 0.08, 0.13 + this.gazeHold, 0.22) * blend;
    if (eyesWeight === 0 || !this.gazeAngles(this.gaze, this.peripheral)) return false;
    const { head, eye } = this.rig;
    const x = this.gazeYaw, y = this.gazePitch;
    this.retainEyes();
    const eyeX = clamp(x * 0.028 - eye.position.x, -0.009, 0.009) * eyesWeight;
    const eyeY = clamp(-y * 0.019, -0.004, 0.004) * eyesWeight;
    eye.position.x += eyeX;
    eye.position.y += eyeY;
    const headWeight = oneShot(age - 0.08, 0.13, this.gazeHold, 0.22) * blend;
    const turn = clamp(x, -0.12, 0.12) * headWeight;
    const nod = clamp(y, -0.07, 0.07) * headWeight;
    head.rotation.y += turn;
    head.rotation.x += nod;
    if (import.meta.env.DEV) {
      const a = this.values;
      a.gazeTarget = this.gazeTarget || null;
      a.gazeYaw = turn; a.gazePitch = nod; a.gazeEyeX = eyeX; a.gazeEyeY = eyeY;
    }
    return true;
  }

  private handFits(upper: Object3D, fore: Object3D, forward: number, out: number, bend: number, twist: number, swing: number) {
    this.hand.set(0, -this.rig.handLength, 0.02).applyEuler(this.foreAngle.set(bend, twist, swing, fore.rotation.order));
    this.hand.add(fore.position).applyEuler(this.armAngle.set(forward, upper.rotation.y, out, upper.rotation.order));
    this.hand.add(upper.position).applyMatrix4(this.rig.body.matrixWorld);
    return this.hand.y <= this.eyes.y - 0.11 && (this.counterY === undefined || this.hand.y >= this.counterY + 0.07 || this.options.counterContains?.(this.hand) === false);
  }

  private mixArm(side: -1 | 1, reach: Reach, weight: number, range: number, wave: number, pulse: number) {
    const r = this.rig;
    const upper = side < 0 ? r.upperL : r.upperR, fore = side < 0 ? r.foreL : r.foreR;
    const forward = upper.rotation.x + reach.forward * weight;
    const out = upper.rotation.z + side * reach.out * weight;
    const bend = fore.rotation.x + reach.bend * weight;
    const twist = fore.rotation.y + side * (reach.twist * weight + pulse);
    const swing = fore.rotation.z + side * (reach.side + wave) * weight;
    r.eye.getWorldPosition(this.eyes);
    if (this.counterY !== undefined && !this.options.counterContains && !this.handFits(upper, fore, upper.rotation.x, upper.rotation.z, fore.rotation.x, fore.rotation.y, fore.rotation.z)) return false;
    // Check the stroke's destination as well as this frame so counter and face clearance hold during the ease.
    if (!this.handFits(upper, fore, upper.rotation.x + reach.forward * range, upper.rotation.z + side * reach.out * range,
      fore.rotation.x + reach.bend * range, fore.rotation.y + side * reach.twist * range, fore.rotation.z + side * reach.side * range)
      || !this.handFits(upper, fore, forward, out, bend, twist, swing)) return false;
    upper.rotation.x = forward;
    upper.rotation.z = out;
    fore.rotation.set(bend, twist, swing);
    return true;
  }

  private applyCue(c: Cue, weight: number, blocked: number, supported: boolean) {
    const kind = c.kind;
    if (!kind || weight <= 0) return;
    const { head, browL, browR, corners, upperL, upperR } = this.rig;
    if (kind === "yes" || kind === "understood" || kind === "headGreeting") {
      head.rotation.x += (kind === "yes" ? 0.065 : kind === "understood" ? 0.08 : 0.036) * weight;
      if (corners && kind !== "yes") corners.position.y += (kind === "understood" ? 0.008 : 0.005) * weight;
    } else if (kind === "no") {
      head.rotation.y += Math.sin(clamp(c.age / 0.71, 0, 1) * 2 * Math.PI) * 0.085 * weight;
    } else if (kind === "repeat") {
      head.rotation.z += 0.055 * c.side * weight;
      const brow = c.side < 0 ? browL : browR ?? browL;
      brow.position.y += 0.005 * weight;
    }

    if (c.smile && corners && kind !== "headGreeting") corners.position.y += 0.005 * weight;
    const reach = c.straight ? STRAIGHT : REACH[kind];
    if (!reach) return;
    if (kind === "shrug") {
      if (!supported) {
        this.retainShoulders();
        upperL.position.y = this.shoulderBaseL + 0.015 * weight;
        upperR.position.y = this.shoulderBaseR + 0.015 * weight;
      }
      head.rotation.z += 0.025 * c.side * weight;
    }
    const preferred = c.side < 0 ? 1 : 2;
    const side = !c.directional && blocked & preferred ? (c.side === -1 ? 1 : -1) : c.side;
    const range = (supported ? 0.65 : 1) * c.strength;
    const amount = weight * range;
    const wave = kind === "greeting" || kind === "wave" ? 0.14 * oneShot(c.age - 0.20, 0.10, 0, 0.16) : 0;
    const countAge = c.age - 0.15, beat = Math.floor(countAge / 0.19);
    const pulse = kind === "count" && beat >= 0 && beat < c.count
      ? 0.09 * oneShot(countAge - beat * 0.19, 0.07, 0, 0.07) * amount : 0;
    let used = !(blocked & (side < 0 ? 1 : 2)) && this.mixArm(side, reach, amount, range, wave, pulse);
    if (reach.both && !blocked) used = this.mixArm(side < 0 ? 1 : -1, reach, amount, range, 0, 0) || used;
    if (!used && c.directional) head.rotation.y += 0.055 * side * weight;
    else if (!used && kind !== "shrug") head.rotation.x += 0.033 * weight;
  }

  apply(moving: boolean, blink: number, watching = false) {
    if (!this.active) return;
    const r = this.rig, seated = this.actor.anim === "sit";
    const headOnly = this.channel === "head";
    const occupied = blockedHands(this.actor, r, this.options.idleWorkHands), blocked = seated || headOnly ? 3 : occupied;
    const supported = blocked !== 0 || this.counterY !== undefined;
    if (moving || seated !== this.origin.seated) this.blendOrigin = false;
    let gesture = null as CueKind | null, gestureWeight = 0, reactionWeight = 0, listen = 0;
    if (import.meta.env.DEV) {
      const a = this.values;
      readJoints(r, a.deltas);
      a.gazeTarget = null;
      a.gazeYaw = a.gazePitch = a.gazeEyeX = a.gazeEyeY = 0;
    }
    if (!this.reduced && !moving && this.channel !== "face") {
      if (!this.releasing) {
        const response = cueTime(this.response.kind, this.response.age);
        const incoming = ease(this.fadeAge / HANDOFF_SECONDS);
        const fading = cueTime(this.fading.kind, this.fading.age) * (1 - incoming);
        const cue = cueTime(this.cue.kind, this.cue.age) * (this.fading.kind ? incoming : 1);
        const learner = this.role === "learner";
        const listenBeat = oneShot(this.listenAge, 0.23, 0.02, 0.30) * (1 - Math.max(cue, response));
        const hip = learner && this.learnerHip && !supported;
        const headBase = r.head.rotation.x, yawBase = r.head.rotation.y, rollBase = r.head.rotation.z;
        const browBaseL = r.browL.position.y, browBaseR = r.browR?.position.y ?? browBaseL;
        const smileBase = r.corners?.position.y ?? 0;
        listen = ease(this.listenWeight);
        if (!supported) {
          this.mixTorso(0.035 * listen, hip ? 0.012 * listenBeat : 0);
          r.foreL.rotation.x -= 0.13 * listen;
          r.foreR.rotation.x -= 0.13 * listen;
        }
        if (!hip) r.head.rotation.x += (learner ? 0.03 : 0.035) * listenBeat;
        const phrase = this.role === "speaking" ? oneShot(this.phraseAge, 0.09, 0.02, 0.28) * (1 - response) : 0;
        r.head.rotation.x += 0.045 * phrase * (1 - Math.max(cue, fading));
        r.browL.position.y += 0.008 * phrase;
        if (r.browR) r.browR.position.y += 0.008 * phrase;
        this.applyCue(this.fading, fading * (1 - response), blocked, supported);
        this.applyCue(this.cue, cue * (1 - response), blocked, supported);
        this.applyCue(this.response, response, blocked, supported);
        const gazing = (cue === 0 || this.cue.kind !== "no") && this.applyGaze();
        const pitchLimit = response || this.cue.kind === "yes" || this.fading.kind === "yes" ? 0.08
          : gazing ? 0.07 : supported && listen > 0 && this.role !== "speaking" ? 0.059 : 0.045;
        const headLimit = headOnly || (this.options.preserveWork && (seated || blocked) && this.role !== "speaking") ? 0.035 : undefined;
        const pitch = headLimit ?? pitchLimit;
        const yaw = headLimit ?? 0.12;
        const roll = headLimit ?? (response ? 0.055 : 0.025);
        this.headX = clamp(r.head.rotation.x - headBase + (supported ? 0.024 * listen : 0), -pitch, pitch);
        this.headY = clamp(r.head.rotation.y - yawBase, -yaw, yaw);
        this.headZ = clamp(r.head.rotation.z - rollBase, -roll, roll);
        const headWeight = headOnly ? this.weight : 1;
        r.head.rotation.x = headBase + this.headX * headWeight;
        r.head.rotation.y = yawBase + this.headY * headWeight;
        r.head.rotation.z = rollBase + this.headZ * headWeight;
        r.browL.position.y = Math.min(r.browL.position.y, browBaseL + 0.008);
        if (r.browR) r.browR.position.y = Math.min(r.browR.position.y, browBaseR + 0.008);
        if (r.corners) r.corners.position.y = Math.min(r.corners.position.y, smileBase + 0.008);
        if (import.meta.env.DEV) {
          gestureWeight = (cue || fading) * (1 - response) * this.weight;
          gesture = gestureWeight > 0 ? (cue ? this.cue.kind : this.fading.kind) : null;
          reactionWeight = response * this.weight;
        }
      }

      const originWeight = this.releasing ? this.weight : 1 - this.weight;
      if (headOnly && this.releasing) {
        r.head.rotation.x += this.headX * originWeight;
        r.head.rotation.y += this.headY * originWeight;
        r.head.rotation.z += this.headZ * originWeight;
      }
      if (!headOnly && !this.releasing && this.options.armEntryAge !== undefined && this.blendOrigin && originWeight > 0) {
        this.origin.mixArms(originWeight, blocked);
      } else if (!headOnly && this.blendOrigin && originWeight > 0) {
        this.retainThighs();
        this.retainShoulders();
        this.retainEyes();
        this.origin.mix(originWeight, blocked);
      }
    }
    if (import.meta.env.DEV) {
      const a = this.values;
      a.role = this.role; a.reduced = this.reduced; a.weight = this.weight;
      a.sample = this.lips.sample; a.level = this.lips.level;
      a.mouth = this.mouth; a.mouthScaleY = r.mouth.scale.y; a.blink = blink;
      a.gesture = gesture; a.gestureWeight = gestureWeight; a.reactionWeight = reactionWeight;
      a.listeningWeight = listen * this.weight; a.watching = watching && !this.reduced;
      readJoints(r, a);
      const keys = jointKeys!;
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        a.deltas[key] = a[key] - a.deltas[key];
      }
    }
    if (this.releasing && this.weight <= 1e-8) this.detach(false);
  }
}

/** Acquires a rig if free, or hands off from its current release using the displayed local transforms. */
export function bindConversationPose(actor: GameCharacter, options: PoseOptions = {}) {
  const prior = actor.talkPose;
  if (prior && !prior.releasing) return prior instanceof ConversationPose ? prior : undefined;
  const supplied = options.entry?.actor === actor ? options.entry : undefined;
  const entry = supplied ? supplied.mountedAsCaptured && actor.naturalRig?.() && supplied : captureConversationPose(actor);
  if (!entry) return;
  if (prior instanceof ConversationPose) prior.preempt();
  else prior?.interrupt();
  if (actor.talkPose) return;
  actor.beginNaturalPose?.(options.preserveWork);
  if (actor.anim === "wave") actor.setAnim("idle");
  const binding = new ConversationPose(actor, entry.rig, options, entry, !!prior);
  actor.talkPose = binding;
  if (!options.deferRefresh) actor.update(0);
  return binding;
}
