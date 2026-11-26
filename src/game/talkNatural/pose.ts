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
  /** A text-only beat that can share the pose with the learner-response nod. */
  readable?: boolean;
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
  /** How large this character moves: about 0.75 for a reserved one, 1.25 for a lively one. */
  energy?: number;
}

const clamp = (t: number, min: number, max: number) => Math.max(min, Math.min(max, t));
const mix = (base: number, target: number, weight: number) => base + (target - base) * weight;
const ease = (t: number) => { const u = clamp(t, 0, 1); return u * u * (3 - 2 * u); };
const HANDOFF_SECONDS = 0.16;
const RELEASE_SECONDS = 0.30;
const READABLE_POINT_HOLD = 0.24;
const SUPPORTED_REACH = 0.65;

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
  // A wave is a hand up beside the head: the arm out to the side, the forearm up from the elbow.
  greeting: { forward: -0.15, out: 1.38, bend: -0.11, twist: -0.3, side: 1.3 },
  question: { forward: -0.27, out: 0.20, bend: -0.81, twist: -0.85, side: 0.18, both: true },
  point: { forward: -1.05, out: 0.6, bend: -0.16, twist: -0.22, side: 0.1 },
  shrug: { forward: -0.10, out: 0.16, bend: -0.56, twist: -0.70, side: 0.24, both: true },
  count: { forward: -0.37, out: 0.17, bend: -1.04, twist: -0.55, side: 0.12 },
  offer: { forward: -0.48, out: 0.12, bend: -0.90, twist: -0.95, side: 0.12 },
  wave: { forward: -0.15, out: 1.34, bend: -0.11, twist: -0.3, side: 1.3 },
  openPalm: { forward: -0.35, out: 0.18, bend: -0.96, twist: -0.85, side: 0.18 },
  heart: { forward: -0.40, out: -0.08, bend: -1.51, twist: -0.20, side: -0.56 },
};

const STRAIGHT: Reach = { forward: -0.95, out: 0.06, bend: -0.3, twist: -0.20, side: 0 };

/** Behind a counter or a till the hands come up in front of the chest, where the learner can see them (whole poses,
 *  not added to the resting arm). */
const REACH_HIGH: Partial<Record<CueKind, Reach>> = {
  greeting: { forward: -0.2, out: 1.15, bend: -0.3, twist: -0.3, side: 1.4 },
  question: { forward: -1.05, out: 0.08, bend: -1.72, twist: -0.9, side: 0.14 },
  point: { forward: -0.95, out: 0.45, bend: -1.45, twist: -0.2, side: 0.45 },
  shrug: { forward: -0.75, out: 0.26, bend: -1.95, twist: -0.8, side: 0.36, both: true },
  count: { forward: -0.85, out: 0.2, bend: -2.05, twist: -0.4, side: 0.08 },
  offer: { forward: -1.15, out: 0.04, bend: -1.3, twist: -1.0, side: 0.04 },
  wave: { forward: -0.2, out: 1.15, bend: -0.3, twist: -0.3, side: 1.4 },
  openPalm: { forward: -1.0, out: 0.12, bend: -1.8, twist: -0.85, side: 0.14 },
  heart: { forward: -0.85, out: -0.08, bend: -2.3, twist: -0.2, side: -0.5 },
};
/** On the way up from below a counter the forearm folds first, so the hand rises close to the body. */
const TUCK_FORWARD = -0.32, TUCK_BEND = -2.45;

/** An arm stroke: seconds to arrive, the longest it is held, seconds to let go. It lets go sooner when the phrase ends. */
const STROKE: Partial<Record<CueKind, readonly [number, number, number]>> = {
  greeting: [0.26, 0.66, 0.42], wave: [0.26, 0.74, 0.45],
  question: [0.30, 1.05, 0.50], point: [0.30, 1.30, 0.52], shrug: [0.28, 0.55, 0.46],
  count: [0.28, 0.80, 0.46], offer: [0.34, 1.15, 0.55], openPalm: [0.30, 0.75, 0.50], heart: [0.34, 0.80, 0.55],
};
const MIN_HOLD = 0.34;
/** Two hands never move as one: the second follows this far behind. */
const ARM_LAG = 0.07;
/** Seconds between the starts of two arm gestures by one person. */
export const ARM_REST = 2.3;

interface Cue {
  kind: CueKind | null;
  age: number;
  side: -1 | 1;
  count: 1 | 2 | 3;
  directional: boolean;
  straight: boolean;
  strength: number;
  smile: boolean;
  line?: TalkLineId;
  readable?: boolean;
  /** Arm strokes: seconds to arrive, and the age at which the hand starts back. */
  rise: number;
  end: number;
  /** A sign-off or a reply plays out whole; a stroke on a spoken line ends with its phrase. */
  whole?: boolean;
}

function emptyCue(): Cue {
  return { kind: null, age: 0, side: 1, count: 1, directional: false, straight: false, strength: 1, smile: false, rise: 0.3, end: 1 };
}

/** A small double nod: down, most of the way back, a lighter second dip. */
function nodTwice(age: number) {
  return oneShot(age, 0.17, 0.02, 0.24) + 0.5 * oneShot(age - 0.40, 0.15, 0, 0.26);
}

function cueTime(c: Cue, age = c.age) {
  const kind = c.kind;
  if (!kind) return 0;
  const stroke = STROKE[kind];
  if (stroke) {
    // Arrive a touch past the pose and settle into it, hold while the phrase lasts, let go slower than the rise.
    const arrive = ease(age / c.rise) + 0.06 * Math.sin(Math.PI * clamp((age - 0.6 * c.rise) / (0.9 * c.rise), 0, 1));
    return arrive * ease((c.end + stroke[2] - age) / stroke[2]);
  }
  if (kind === "understood") return oneShot(age, 0.23, 0.02, 0.27);
  if (kind === "repeat") return oneShot(age, 0.24, 0.30, 0.36);
  if (kind === "yes") return nodTwice(age);
  return oneShot(age, 0.20, 0.23, 0.28);
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
    gestureLine: null as TalkLineId | null, pointLine: null as TalkLineId | null,
    pointSide: 0, pointDirection: 0, pointStraight: false, pointWeight: 0,
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
  private readonly recovery = emptyCue();
  private recoverFrom = -Infinity;
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
  /** Speech carriage: the head rides the voice (stress) and drifts a little while the line plays (talk). */
  private talk = 0;
  private stress = 0;
  /** Quiet attention: the speaker has stopped (or not yet begun) and is simply with the learner. */
  private rest = 0;
  private readonly energy: number;
  private readonly swayA: number;
  private readonly swayB: number;
  /** Lively people arrive at a pose sooner, reserved ones take their time. */
  private readonly tempo: number;
  /** This person's own pace of small movements (about 0.85 to 1.2). */
  private readonly pace: number;
  /** The side the attentive head rests on; it changes now and then while the learner thinks. */
  private attendSide: -1 | 1;
  private attendNow: number;
  private beats = 0;
  private nodKind = 0;
  private nodSize = 1;
  private phrases = 0;
  private accent = 0;
  /** The eyes flick to the learner's mouth or hands and back while they wait. */
  private dartAge = Infinity;
  private dartAt = Infinity;
  private darts = 0;
  private dartX = 0;
  private dartY = 0;

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
    this.energy = options.energy ?? 1;
    // Each person's own drift, from where they stand: no random draw, so seeded runs keep their sequence.
    const spot = Math.abs(actor.root.position.x * 12.9898 + actor.root.position.z * 78.233);
    this.swayA = spot % 6.283;
    this.swayB = (spot * 1.618) % 6.283;
    this.tempo = clamp(1.6 - 0.6 * this.energy, 0.8, 1.2);
    this.pace = 0.85 + 0.35 * ((spot * 0.7548) % 1);
    this.attendNow = this.attendSide = this.swayA > 3.1416 ? 1 : -1;
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
      this.cue.kind = this.fading.kind = this.response.kind = this.recovery.kind = null;
      this.gazeAge = this.phraseAge = this.listenAge = Infinity;
      this.listenWeight = 0;
      this.afterQuiet = false;
    } else this.scheduleListener();
  };

  /** This person's own variety, the same on every run: no random draw. */
  private pick(n: number, salt: number) {
    const x = Math.sin(n * 12.9898 + salt * 78.233 + this.swayA) * 43758.5453;
    return x - Math.floor(x);
  }

  /** Staff behind a counter or a till: their hands work below it, so a gesture comes up in front of the chest. */
  private get high() {
    const busy = this.actor.busy;
    return this.counterY !== undefined || (!!this.options.idleWorkHands && (busy === "wipe" || busy === "type"));
  }

  setRole(role: TalkRole) {
    if (!this.active || this.releasing || role === this.role) return;
    this.role = role;
    this.voice = undefined;
    this.discardReadablePoint();
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

  speak(line: TalkLineId, owner: VoiceVisualOwner | null, gesture?: GestureRequest, keepReadablePoint = false) {
    if (!this.active || this.releasing) return;
    this.setRole("speaking");
    const voice = owner?.actor === this.actor && owner.line === line ? owner : undefined;
    if (voice?.replay) this.discardReadablePoint();
    if (voice !== this.voice) {
      this.voice = voice;
      this.afterQuiet = true;
      this.phraseAge = Infinity;
    }
    if (this.line !== line) {
      this.line = line;
      if (keepReadablePoint && this.cue.kind === "point" && this.cue.readable &&
        this.cue.age >= 0 && this.cue.age < READABLE_POINT_HOLD + HANDOFF_SECONDS) {
        Object.assign(this.recovery, this.cue);
        this.recoverFrom = this.time - this.cue.age;
        this.cue.kind = null;
      }
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
    if (!this.startCue(gesture.kind, gesture.side, gesture.count, gesture.delay, gesture.directional, gesture.straight, gesture.strength, gesture.smile)) return false;
    this.cue.line = line;
    this.cue.readable = gesture.readable;
    return true;
  }

  discardReadablePoint() {
    this.recovery.kind = null;
    if (this.cue.kind === "point" && this.cue.readable) this.cue.kind = null;
    if (this.fading.kind === "point" && this.fading.readable) this.fading.kind = null;
  }

  react(kind: TalkReaction | "yes" | "headGreeting", side: -1 | 1 = 1, delay = 0, line?: TalkLineId, readable?: boolean) {
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
    if (!this.startCue(kind, side, 1, delay)) return false;
    this.cue.whole = true;
    this.cue.line = line;
    this.cue.readable = readable;
    return true;
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
    if (cueTime(this.cue) > 0) {
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
      if (onset - this.lastArm < ARM_REST) {
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
    this.cue.line = undefined;
    this.cue.readable = false;
    const stroke = STROKE[kind];
    this.cue.rise = stroke ? stroke[0] * this.tempo : 0.2;
    this.cue.end = stroke ? this.cue.rise + stroke[1] + (kind === "count" ? 0.19 * (count - 1) : 0) : 0;
    this.cue.whole = false;
    return true;
  }

  get armOpportunity() {
    if (this.channel !== "full") return 0;
    const blocked = blockedHands(this.actor, this.rig, this.options.idleWorkHands);
    return (blocked === 3 || this.actor.anim === "sit" || this.actor.poolPose ? 0 : blocked ? SUPPORTED_REACH : 1);
  }

  get canWave() { return this.armOpportunity > 0; }

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
        const incline = (listening || this.role === "thinking") && cueTime(this.response) === 0;
        this.listenWeight = clamp(this.listenWeight + dt / (incline ? 0.26 : -0.22), 0, 1);
        if ((listening || learner) && this.time >= this.listenAt) {
          this.listenAge = 0;
          this.learnerHip = !this.learnerHip;
          this.listenAt = this.time + (learner ? 5 : 4) + this.random() * 3;
          // The first is a plain nod. After it: a nod, a slower double nod, or the head only settles to its other side.
          const n = this.beats++, k = n && listening ? this.pick(n, 1) : 0;
          this.nodKind = k < 0.5 ? 0 : k < 0.78 ? 1 : 2;
          this.nodSize = n ? 0.7 + 0.5 * this.pick(n, 2) : 1;
          if (listening && n && (this.nodKind === 2 || this.pick(n, 3) < 0.35)) this.attendSide = this.attendSide === 1 ? -1 : 1;
        }
        this.attendNow += (this.attendSide - this.attendNow) * (1 - Math.exp(-dt / 0.3));
        this.dartAge += dt;
        if (this.role === "speaking" || this.role === "closing" || this.role === "learner") this.dartAt = Infinity;
        else if (this.dartAt === Infinity) this.dartAt = this.time + 1.6 + 2 * this.pick(1, 7);
        else if (this.time >= this.dartAt) {
          const n = ++this.darts;
          this.dartAge = 0;
          this.dartX = (this.pick(n, 8) - 0.5) * 0.006;
          this.dartY = -0.001 - 0.0022 * this.pick(n, 9);
          this.dartAt = this.time + 2.4 + 3.2 * this.pick(n, 7);
        }
      }
    }

    this.lips.read(dt, this.options.audio, this.voice, held);
    const { sample, level, silence } = this.lips;
    const speaking = !this.releasing && this.role === "speaking";
    const voiced = speaking && silence < 0.45;
    this.talk = clamp(this.talk + dt * (voiced ? 1 / 0.30 : -1 / 0.45), 0, 1);
    this.rest = clamp(this.rest + dt * (speaking && silence >= 0.5 ? 1 / 0.4 : -1 / 0.25), 0, 1);
    this.stress += (this.lips.mouth - this.stress) * (1 - Math.exp(-dt / 0.11));
    // The hand goes back when the phrase it belongs to is over, not on a fixed count.
    const c = this.cue;
    if (c.kind && !c.whole && !c.readable && c.age < c.end && c.age > c.rise + MIN_HOLD && silence >= 0.22 &&
      (sample === "quiet" || sample === "ended")) c.end = c.age;
    if (silence >= 0.18) this.afterQuiet = true;
    if (this.afterQuiet && sample === "voiced" && level! >= 0.18) {
      this.afterQuiet = false;
      if (!this.reduced && this.time - this.lastPhrase >= 0.75) {
        this.phraseAge = 0;
        this.lastPhrase = this.time;
        // Not the same nod on every phrase: mostly a dip, sometimes the chin lifts, the head tips or only the brows go.
        const a = this.phrases++ ? this.pick(this.phrases, 5) : 0;
        this.accent = a < 0.45 ? 0 : a < 0.65 ? 1 : a < 0.85 ? 2 : 3;
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

  private mixArm(side: -1 | 1, reach: Reach, weight: number, range: number, wave: number, pulse: number, direction = side, high = false, ride = 0) {
    const r = this.rig;
    const upper = side < 0 ? r.upperL : r.upperR, fore = side < 0 ? r.foreL : r.foreR;
    if (high) {
      // From below the counter: the forearm folds up against the chest first, then the arm carries the hand out
      // over the top. On the way back the same in reverse. The hand never sweeps through the counter.
      const lift = ease(weight / 0.55), carry = ease((weight - 0.3) / 0.7);
      const forward = mix(mix(upper.rotation.x, TUCK_FORWARD, lift), reach.forward, carry);
      const out = mix(upper.rotation.z, direction * reach.out, carry);
      const bend = mix(mix(fore.rotation.x, TUCK_BEND, lift), reach.bend, carry) + ride * carry;
      const twist = mix(fore.rotation.y, side * reach.twist, lift) + side * pulse;
      const swing = mix(fore.rotation.z, direction * (reach.side + wave), carry);
      r.eye.getWorldPosition(this.eyes);
      if (!this.handFits(upper, fore, reach.forward, direction * reach.out, reach.bend, side * reach.twist, direction * reach.side)
        || !this.handFits(upper, fore, forward, out, bend, twist, swing)) return false;
      upper.rotation.x = forward;
      upper.rotation.z = out;
      fore.rotation.set(bend, twist, swing);
      return true;
    }
    const forward = upper.rotation.x + reach.forward * weight;
    const out = upper.rotation.z + direction * reach.out * weight;
    const bend = fore.rotation.x + reach.bend * weight + ride * weight;
    const twist = fore.rotation.y + side * (reach.twist * weight + pulse);
    const swing = fore.rotation.z + direction * (reach.side + wave) * weight;
    r.eye.getWorldPosition(this.eyes);
    if (this.counterY !== undefined && !this.options.counterContains && !this.handFits(upper, fore, upper.rotation.x, upper.rotation.z, fore.rotation.x, fore.rotation.y, fore.rotation.z)) return false;
    // Check the stroke's destination as well as this frame so counter and face clearance hold during the ease.
    if (!this.handFits(upper, fore, upper.rotation.x + reach.forward * range, upper.rotation.z + direction * reach.out * range,
      fore.rotation.x + reach.bend * range, fore.rotation.y + side * reach.twist * range, fore.rotation.z + direction * reach.side * range)
      || !this.handFits(upper, fore, forward, out, bend, twist, swing)) return false;
    upper.rotation.x = forward;
    upper.rotation.z = out;
    fore.rotation.set(bend, twist, swing);
    return true;
  }

  /** `weight` moves the leading arm and the head; `lagged` is the same stroke a moment later, for the other arm. */
  private applyCue(c: Cue, weight: number, lagged: number, blocked: number, supported: boolean, ride = 0) {
    const kind = c.kind;
    if (!kind || (weight <= 0 && lagged <= 0)) return 0;
    const { head, browL, browR, corners, upperL, upperR } = this.rig;
    if (kind === "yes" || kind === "understood" || kind === "headGreeting") {
      head.rotation.x += (kind === "yes" ? 0.12 : kind === "understood" ? 0.15 : 0.085) * weight;
      if (corners && kind === "headGreeting") corners.position.y += 0.01 * weight;
    } else if (kind === "no") {
      head.rotation.y += Math.sin(clamp(c.age / 0.71, 0, 1) * 2 * Math.PI) * 0.15 * weight;
    } else if (kind === "repeat") {
      // "Hm?": the head tips to one side, one brow up.
      head.rotation.z += 0.11 * c.side * weight;
      const brow = c.side < 0 ? browL : browR ?? browL;
      brow.position.y += 0.012 * weight;
    }

    if (c.smile && corners && kind !== "headGreeting") corners.position.y += 0.005 * weight;
    const high = this.high && !!REACH_HIGH[kind];
    const reach = high ? REACH_HIGH[kind] : c.straight ? STRAIGHT : REACH[kind];
    if (!reach) return 0;
    if (kind === "shrug") {
      if (!supported) {
        this.retainShoulders();
        const lift = 0.015 * Math.min(1, weight);
        upperL.position.y = this.shoulderBaseL + lift;
        upperR.position.y = this.shoulderBaseR + lift;
      }
      head.rotation.z += 0.025 * c.side * weight;
    }
    const preferred = c.side < 0 ? 1 : 2;
    // A free hand can point across the body while the bag or prop stays in its own hand.
    const side = blocked & preferred ? (c.side === -1 ? 1 : -1) : c.side;
    const direction = c.directional ? c.side : side;
    const waving = kind === "greeting" || kind === "wave";
    // A raised hand stays a raised hand: a small greeting is a lower wave, never a flap at the hip. Over a counter
    // the pose is whole, so it clears the top.
    const range = high ? (waving ? Math.max(0.8, Math.min(1, c.strength)) : 1)
      : (supported ? SUPPORTED_REACH : 1) * (waving ? Math.max(0.8, c.strength) : c.strength);
    const amount = weight * range;
    // A wave is the hand out, back across and out again, each swing smaller.
    const swing = c.age - c.rise * 0.8;
    const wave = waving
      ? 0.17 * (oneShot(swing, 0.10, 0, 0.13) - 0.8 * oneShot(swing - 0.21, 0.11, 0, 0.13) + 0.55 * oneShot(swing - 0.43, 0.11, 0, 0.15)) : 0;
    const countAge = c.age - c.rise + 0.05, beat = Math.floor(countAge / 0.19);
    const pulse = kind === "count" && beat >= 0 && beat < c.count
      ? 0.09 * oneShot(countAge - beat * 0.19, 0.07, 0, 0.07) * Math.min(1, amount) : 0;
    let used = !(blocked & (side < 0 ? 1 : 2)) && this.mixArm(side, reach, amount, range, wave, pulse, direction, high, ride);
    if (reach.both && !blocked) used = this.mixArm(side < 0 ? 1 : -1, reach, lagged * range * 0.92, range, 0, 0, undefined, high, ride * 0.6) || used;
    if (kind === "point" && used && !c.straight) {
      // A look where the hand goes, then back to the learner while the arm still holds.
      head.rotation.y += 0.11 * direction * oneShot(c.age - 0.04, 0.22, 0.3, 0.38) * Math.min(1, weight);
    } else if (!used && c.directional) head.rotation.y += 0.055 * direction * weight;
    else if (!used && kind !== "shrug") head.rotation.x += 0.033 * weight;
    return used ? side : 0;
  }

  apply(moving: boolean, blink: number, watching = false) {
    if (!this.active) return;
    const r = this.rig, seated = this.actor.anim === "sit";
    const headOnly = this.channel === "head";
    const occupied = blockedHands(this.actor, r, this.options.idleWorkHands), blocked = seated || headOnly ? 3 : occupied;
    const supported = blocked !== 0 || this.high;
    if (moving || seated !== this.origin.seated) this.blendOrigin = false;
    let gesture = null as CueKind | null, gestureWeight = 0, reactionWeight = 0, listen = 0;
    if (import.meta.env.DEV) {
      const a = this.values;
      readJoints(r, a.deltas);
      a.gazeTarget = null;
      a.gazeYaw = a.gazePitch = a.gazeEyeX = a.gazeEyeY = 0;
      a.gestureLine = a.pointLine = null;
      a.pointSide = a.pointDirection = a.pointWeight = 0;
      a.pointStraight = false;
    }
    if (!this.reduced && !moving && this.channel !== "face") {
      if (!this.releasing) {
        const response = cueTime(this.response);
        const incoming = ease(this.fadeAge / HANDOFF_SECONDS);
        const fadeOut = 1 - incoming, fadeIn = this.fading.kind ? incoming : 1;
        const fading = cueTime(this.fading) * fadeOut;
        const cue = cueTime(this.cue) * fadeIn;
        const recoveryAge = this.time - this.recoverFrom;
        const recovered = this.recovery.kind ? cueTime(this.recovery, recoveryAge) *
          (1 - ease((recoveryAge - READABLE_POINT_HOLD) / HANDOFF_SECONDS)) : 0;
        const learner = this.role === "learner";
        const nod = this.nodKind === 0 ? oneShot(this.listenAge, 0.23, 0.02, 0.30) : this.nodKind === 1 ? 0.8 * nodTwice(this.listenAge) : 0;
        const listenBeat = nod * this.nodSize * (1 - Math.min(1, Math.max(cue, response)));
        const hip = learner && this.learnerHip && !supported;
        const headBase = r.head.rotation.x, yawBase = r.head.rotation.y, rollBase = r.head.rotation.z;
        const browBaseL = r.browL.position.y, browBaseR = r.browR?.position.y ?? browBaseL;
        const smileBase = r.corners?.position.y ?? 0;
        listen = ease(this.listenWeight);
        const e = this.energy, t = this.time, pace = this.pace, stress = this.stress;
        const busyArm = Math.min(1, Math.max(cue, fading));
        // The attentive head belongs to whoever waits for the learner, and to the quiet before and after a line.
        const attend = (this.role === "learner" ? 0 : Math.max(listen, ease(this.rest))) * (1 - response);
        const talk = ease(this.talk) * (1 - response) * (1 - 0.6 * busyArm) * e;
        if (!supported) {
          // A person on their feet is never a post from the neck down: the weight drifts slowly from side to side,
          // the body leans a touch into a stressed word, and the forearms lift with it (one more than the other).
          const sway = Math.sin(t * 0.55 * pace + this.swayB) * 0.012 * Math.max(attend, talk);
          this.mixTorso(0.055 * listen + 0.014 * stress * talk, (hip ? 0.014 * listenBeat : 0) + sway);
          const lift = stress * talk * (1 - busyArm);
          r.foreL.rotation.x -= 0.13 * listen + 0.075 * lift;
          r.foreR.rotation.x -= 0.13 * listen + 0.05 * lift;
        }
        if (!hip) r.head.rotation.x += (learner ? 0.055 : 0.075 * e) * listenBeat;
        // An attentive head: a little to one side, the mouth a touch warmer. It is never a statue: the head drifts
        // very slowly, each person at their own pace, and the eyes flick to the learner's mouth and back.
        r.head.rotation.z += (0.042 * this.attendNow + Math.sin(t * 0.6 * pace + this.swayB) * 0.009) * e * attend;
        r.head.rotation.y += (Math.sin(t * 0.8 * pace + this.swayA) * 0.014 + Math.sin(t * 0.33 * pace + this.swayB) * 0.009) * e * attend;
        if (r.corners) r.corners.position.y += 0.005 * attend;
        const dart = oneShot(this.dartAge, 0.06, 0.26, 0.09) * attend;
        if (dart > 0 && !this.baseGaze) {
          this.retainEyes();
          r.eye.position.x += this.dartX * dart;
          r.eye.position.y += this.dartY * dart;
        }
        const phrase = this.role === "speaking" ? oneShot(this.phraseAge, 0.09, 0.02, 0.28) * (1 - response) : 0;
        const accent = this.accent, free = phrase * (1 - busyArm) * e;
        if (accent === 0) r.head.rotation.x += 0.06 * free;
        else if (accent === 1) r.head.rotation.x -= 0.032 * free;
        else if (accent === 2) r.head.rotation.z += (this.swayB > 3.1416 ? 0.045 : -0.045) * free;
        const brow = (accent === 1 || accent === 3 ? 0.013 : 0.009) * phrase;
        r.browL.position.y += brow;
        if (r.browR) r.browR.position.y += brow;
        if (talk > 0) {
          // The head rides the voice: down a little on a stressed syllable, and it never sits dead still mid-sentence.
          // Two slow waves of different lengths on each axis, at this person's pace: no loop to spot, no two alike.
          r.head.rotation.x += (0.07 * stress - 0.012) * talk;
          r.head.rotation.y += (Math.sin(t * 1.9 * pace + this.swayA) * 0.024 + Math.sin(t * 0.83 * pace + this.swayB) * 0.016) * talk;
          r.head.rotation.z += (Math.sin(t * 1.3 * pace + this.swayB) * 0.017 + Math.sin(t * 0.61 * pace + this.swayA) * 0.012) * talk;
          r.browL.position.y += 0.006 * stress * talk;
          if (r.browR) r.browR.position.y += 0.006 * stress * talk;
        }
        const fadingShare = this.fading.readable ? 1 : 1 - response;
        const cueShare = this.cue.readable ? 1 : 1 - response;
        const fadingWeight = fading * fadingShare;
        const cueWeight = cue * cueShare;
        // While the hand is out it beats lightly with the stressed syllables.
        const ride = this.role === "speaking" ? -0.09 * (stress - 0.3) * ease(this.talk) : 0;
        const recoveredSide = this.applyCue(this.recovery, recovered, recovered, blocked, supported);
        const fadingSide = this.applyCue(this.fading, fadingWeight, cueTime(this.fading, this.fading.age - ARM_LAG) * fadeOut * fadingShare, blocked, supported);
        const cueSide = this.applyCue(this.cue, cueWeight, cueTime(this.cue, this.cue.age - ARM_LAG) * fadeIn * cueShare, blocked, supported, ride);
        this.applyCue(this.response, response, response, blocked, supported);
        // The smile outlasts the nod.
        if (this.response.kind === "understood" && r.corners) {
          r.corners.position.y += 0.012 * oneShot(this.response.age - 0.1, 0.2, 0.75, 0.5);
        }
        const gazing = (cue === 0 || this.cue.kind !== "no") && this.applyGaze();
        const pitchLimit = response || this.cue.kind === "yes" || this.fading.kind === "yes" ? 0.16
          : gazing ? 0.09 : supported && listen > 0 && this.role !== "speaking" ? 0.10 : 0.09;
        const headLimit = headOnly || (this.options.preserveWork && (seated || blocked) && this.role !== "speaking") ? 0.06 : undefined;
        const pitch = headLimit ?? pitchLimit;
        const yaw = headLimit ?? 0.12;
        const roll = headLimit ?? (response ? 0.12 : 0.07);
        this.headX = clamp(r.head.rotation.x - headBase + (supported ? 0.024 * listen : 0), -pitch, pitch);
        this.headY = clamp(r.head.rotation.y - yawBase, -yaw, yaw);
        this.headZ = clamp(r.head.rotation.z - rollBase, -roll, roll);
        const headWeight = headOnly ? this.weight : 1;
        r.head.rotation.x = headBase + this.headX * headWeight;
        r.head.rotation.y = yawBase + this.headY * headWeight;
        r.head.rotation.z = rollBase + this.headZ * headWeight;
        r.browL.position.y = Math.min(r.browL.position.y, browBaseL + 0.014);
        if (r.browR) r.browR.position.y = Math.min(r.browR.position.y, browBaseR + 0.014);
        if (r.corners) r.corners.position.y = Math.min(r.corners.position.y, smileBase + 0.014);
        if (import.meta.env.DEV) {
          const a = this.values;
          const main = cueWeight ? this.cue : fadingWeight ? this.fading : this.recovery;
          gestureWeight = (cueWeight || fadingWeight || recovered) * this.weight;
          gesture = gestureWeight > 0 ? main.kind : null;
          a.gestureLine = gesture ? main.line ?? null : null;
          const point = cueSide && this.cue.kind === "point" ? this.cue
            : recoveredSide ? this.recovery : fadingSide && this.fading.kind === "point" ? this.fading : null;
          if (point) {
            a.pointLine = point.line ?? null;
            a.pointStraight = point.straight;
            a.pointDirection = point.directional ? point.side : 0;
            a.pointSide = point === this.cue ? cueSide : point === this.recovery ? recoveredSide : fadingSide;
            a.pointWeight = (point === this.cue ? cueWeight : point === this.recovery ? recovered : fadingWeight) * this.weight;
          }
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
