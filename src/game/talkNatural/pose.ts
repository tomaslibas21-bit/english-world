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
  /** How large this character moves: about 0.75 for a reserved one, 1.25 for a lively one. */
  energy?: number;
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
  // A wave is a hand up beside the head: the arm out to the side, the forearm up from the elbow.
  greeting: { forward: -0.15, out: 1.38, bend: -0.25, twist: -0.3, side: 1.3 },
  question: { forward: -0.27, out: 0.20, bend: -0.95, twist: -0.85, side: 0.18, both: true },
  point: { forward: -1.2, out: 0.7, bend: -0.3, twist: -0.22, side: 0.1 },
  shrug: { forward: -0.1, out: 0.16, bend: -0.68, twist: -0.7, side: 0.24, both: true },
  count: { forward: -0.37, out: 0.17, bend: -1.18, twist: -0.55, side: 0.12 },
  offer: { forward: -0.48, out: 0.12, bend: -0.9, twist: -0.95, side: 0.12 },
  wave: { forward: -0.15, out: 1.34, bend: -0.25, twist: -0.3, side: 1.3 },
  openPalm: { forward: -0.35, out: 0.18, bend: -1.1, twist: -0.85, side: 0.18 },
  heart: { forward: -0.4, out: -0.08, bend: -1.65, twist: -0.2, side: -0.56 },
};

/** Behind a counter or a till the hands come up in front of the chest, where the learner can see them. */
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
/** A stroke cut short by a change of turn lets go over this long. */
const FADE_SECONDS = 0.22;
/** Two hands never move as one: the second follows this far behind. */
const ARM_LAG = 0.07;
/** Seconds between the starts of two arm gestures by one person. */
export const ARM_REST = 2.3;

interface Cue {
  kind: CueKind | null;
  age: number;
  side: -1 | 1;
  count: 1 | 2 | 3;
  directional?: boolean;
  /** Arm strokes: seconds to arrive, and the age at which the hand starts back. */
  rise: number;
  end: number;
  /** A sign-off or a reply plays out whole; a stroke on a spoken line ends with its phrase. */
  whole?: boolean;
}

const newCue = (): Cue => ({ kind: null, age: 0, side: 1, count: 1, rise: 0.3, end: 1 });

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
const joints = import.meta.env.DEV ? Object.keys(jointValues()) as (keyof JointValues)[] : undefined;

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
  declare private readonly values: ReturnType<typeof observation>;
  declare private readonly base: JointValues;
  /** Live DEV sample. Runtime callers use the pose's own animation and lifetime state. */
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
  get active() { return !this.closed; }
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
  /** Speech carriage: the head rides the voice (stress) and drifts a little while the line plays (talk). */
  private talk = 0;
  private stress = 0;
  /** Quiet attention: the speaker has stopped (or not yet begun) and is simply with the learner. */
  private rest = 0;
  private readonly energy: number;
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
  /** Each person's own drift, from where they stand: no random draw, so seeded runs keep their sequence. */
  private readonly swayA: number;
  private readonly swayB: number;

  private voice: VoiceVisualOwner | null = null;
  private line: TalkLineId | null = null;
  private readonly gestured = new Set<TalkLineId>();
  private phraseAge = Infinity;
  private lastPhrase = -Infinity;
  private afterQuiet = true;

  private readonly cue = newCue();
  private readonly fading = newCue();
  private readonly response = newCue();
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

  private readonly hand = new Vector3();
  private readonly armAngle = new Euler();
  private readonly foreAngle = new Euler();
  private readonly bodyBase = new Quaternion();
  private readonly bodyDelta = new Quaternion();
  private readonly leftThigh: Thigh;
  private readonly rightThigh: Thigh;
  private torsoMixed = false;
  private shouldersMixed = false;
  private shoulderBaseL = 0;
  private shoulderBaseR = 0;
  private readonly motion: MediaQueryList | undefined;
  private readonly mount: Object3D[] = [];
  private eyeBaseX = 0;
  private eyeBaseY = 0;

  constructor(private readonly actor: GameCharacter, private readonly rig: NaturalRig, private readonly audio: VoiceSource | undefined, private readonly options: PoseOptions, entry: ArmEntry) {
    if (import.meta.env.DEV) {
      this.values = observation();
      this.base = jointValues();
    }
    this.blend = entry.progress;
    this.weight = ease(this.blend);
    if (entry.active && this.blend < 1) this.armEntry = entry;
    this.lips = options.mouth ?? new VoiceMouth();
    this.role = options.role ?? "cast";
    this.energy = options.energy ?? 1;
    this.tempo = clamp(1.6 - 0.6 * this.energy, 0.8, 1.2);
    const spot = Math.abs(actor.root.position.x * 12.9898 + actor.root.position.z * 78.233);
    this.swayA = spot % 6.283;
    this.swayB = (spot * 1.618) % 6.283;
    this.pace = 0.85 + 0.35 * ((spot * 0.7548) % 1);
    this.attendNow = this.attendSide = this.swayA > 3.1416 ? 1 : -1;
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

  /** This person's own variety, the same on every run: no random draw. */
  private pick(n: number, salt: number) {
    const x = Math.sin(n * 12.9898 + salt * 78.233 + this.swayA) * 43758.5453;
    return x - Math.floor(x);
  }

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
    this.startCue(kind, side, 1, delay, false, true);
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
    if (import.meta.env.DEV) {
      this.values.sample = "interrupt";
      this.values.level = null;
    }
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
    if (import.meta.env.DEV) {
      this.values.active = false;
      this.values.weight = this.values.mouth = this.values.gestureWeight = 0;
      this.values.gesture = null;
    }
    this.motion?.removeEventListener("change", this.motionChanged);
    for (let i = 0; i < this.mount.length; i++) this.mount[i].removeEventListener("removed", this.interrupt);
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

  private startCue(kind: CueKind, side: -1 | 1 = 1, count: 1 | 2 | 3 = 1, delay = 0, directional = false, whole = false) {
    if (STROKE[kind]) {
      const onset = this.time + delay;
      if (onset - this.lastArm < ARM_REST) {
        if (kind === "greeting" || kind === "wave" || kind === "heart") kind = "headGreeting";
        else return;
      } else this.lastArm = onset;
    }
    const c = this.cue, stroke = STROKE[kind];
    c.kind = kind;
    c.age = -delay;
    c.side = side;
    c.count = count;
    c.directional = directional;
    c.rise = stroke ? stroke[0] * this.tempo : 0.2;
    c.end = stroke ? c.rise + stroke[1] + (kind === "count" ? 0.19 * (count - 1) : 0) : 0;
    c.whole = whole;
  }

  /** Staff behind a counter or a till: their hands work below it, so a gesture comes up in front of the chest. */
  private get high() {
    const busy = this.actor.busy;
    return this.counterY !== undefined || busy === "wipe" || busy === "type";
  }

  private get blockedHands() {
    return blockedHands(this.actor, this.rig);
  }

  get armOpportunity() {
    const blocked = this.blockedHands;
    return (blocked === 3 ? 0 : blocked ? 0.66 : 1) * (this.actor.anim === "sit" || this.high ? 0.6 : 1);
  }

  get canWave() { return this.blockedHands !== 3 && this.actor.anim !== "sit"; }

  private scheduleListener() {
    this.listenAt = this.time + (this.role === "learner" ? 5 + Math.random() * 3 : 2 + Math.random() * 1.5);
  }

  private sampleVoice(dt: number, paused: boolean) {
    this.lips.read(dt, this.audio, this.voice ?? undefined, paused);
    const { sample, level, silence } = this.lips;
    if (import.meta.env.DEV) {
      this.values.sample = sample;
      this.values.level = level;
    }
    if (silence >= 0.18) this.afterQuiet = true;
    if (sample === "voiced" && level! >= 0.18 && this.afterQuiet) {
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
      // The first is a plain nod. After it: a nod, a slower double nod, or the head only settles to its other side.
      const n = this.beats++, k = n && listening ? this.pick(n, 1) : 0;
      this.nodKind = k < 0.5 ? 0 : k < 0.78 ? 1 : 2;
      this.nodSize = n ? 0.7 + 0.5 * this.pick(n, 2) : 1;
      if (listening && n && (this.nodKind === 2 || this.pick(n, 3) < 0.35)) this.attendSide = this.attendSide === 1 ? -1 : 1;
    }
    if (!this.reduced) {
      const incline = listening && !(cueTime(this.response) > 0);
      this.inclination = clamp(this.inclination + dt * (incline ? 1 / 0.26 : -1 / 0.20), 0, 1);
      this.attendNow += (this.attendSide - this.attendNow) * (1 - Math.exp(-dt / 0.3));
      if (this.engaged) this.dartAge += dt;
      if (!this.engaged || this.role === "speaking" || this.role === "closing") this.dartAt = Infinity;
      else if (this.dartAt === Infinity) this.dartAt = this.time + 1.6 + 2 * this.pick(1, 7);
      else if (this.time >= this.dartAt) {
        const n = ++this.darts;
        this.dartAge = 0;
        this.dartX = (this.pick(n, 8) - 0.5) * 0.006;
        this.dartY = -0.001 - 0.0022 * this.pick(n, 9);
        this.dartAt = this.time + 2.4 + 3.2 * this.pick(n, 7);
      }
    }
    this.sampleVoice(dt, paused);
    const speaking = this.engaged && this.role === "speaking";
    const voiced = speaking && this.lips.silence < 0.45;
    this.talk = clamp(this.talk + dt * (voiced ? 1 / 0.30 : -1 / 0.45), 0, 1);
    this.rest = clamp(this.rest + dt * (speaking && this.lips.silence >= 0.5 ? 1 / 0.4 : -1 / 0.25), 0, 1);
    this.stress += (this.lips.mouth - this.stress) * (1 - Math.exp(-dt / 0.11));
    // The hand goes back when the phrase it belongs to is over, not on a fixed count.
    const c = this.cue;
    if (c.kind && !c.whole && c.age < c.end && c.age > c.rise + MIN_HOLD && this.lips.silence >= 0.22 &&
      (this.lips.sample === "quiet" || this.lips.sample === "ended")) c.end = c.age;
  }

  private applyGaze(head: Object3D, eye: Object3D) {
    const age = this.gazeAge;
    const blend = this.weight * ease(this.gazeFade);
    const eyesWeight = oneShot(age, 0.08, 0.13 + this.gazeHold, 0.22) * blend;
    if (eyesWeight === 0) return false;
    // The target is in world space. Work in the root's frame so parent rotation/scale also count.
    const root = this.actor.root, body = this.rig.body;
    root.updateWorldMatrix(true, false);
    body.updateMatrix();
    this.inverseWorld.copy(root.matrixWorld).invert();
    this.hand.copy(head.position).applyMatrix4(body.matrix);
    this.ray.copy(this.gaze).applyMatrix4(this.inverseWorld).sub(this.hand);
    const yaw = Math.atan2(this.ray.x, this.ray.z);
    const pitch = -Math.atan2(this.ray.y, Math.hypot(this.ray.x, this.ray.z));
    if (Math.abs(yaw) > 65 * Math.PI / 180 || Math.abs(pitch) > 35 * Math.PI / 180) return false;
    const x = yaw - head.rotation.y, y = pitch - head.rotation.x;
    // With no iris joint, move the style's shared eye joint by the same limited amount.
    const eyeX = clamp(eye.position.x, -0.009, 0.009);
    const eyeY = this.rig.corners ? clamp(eye.position.y, -0.004, 0.004) : 0;
    const eyeBeforeX = import.meta.env.DEV ? eye.position.x : 0;
    const eyeBeforeY = import.meta.env.DEV ? eye.position.y : 0;
    eye.position.x = mix(eyeX, clamp(x * 0.028, -0.009, 0.009), eyesWeight);
    eye.position.y = (this.rig.corners ? 0 : this.eyeBaseY) + mix(eyeY, clamp(-y * 0.019, -0.004, 0.004), eyesWeight);
    const headWeight = oneShot(age - 0.08, 0.13, this.gazeHold, 0.22) * blend;
    const gazeYaw = clamp(x, -0.12, 0.12) * headWeight;
    const gazePitch = clamp(y, -0.07, 0.07) * headWeight;
    if (import.meta.env.DEV) {
      const a = this.values;
      a.gazeTarget = this.gazeTarget;
      a.gazeEyeX = eye.position.x - eyeBeforeX;
      a.gazeEyeY = eye.position.y - eyeBeforeY;
      a.gazeYaw = gazeYaw;
      a.gazePitch = gazePitch;
    }
    head.rotation.y += gazeYaw;
    head.rotation.x += gazePitch;
    return !!this.gazeTarget;
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
      this.rig.upperL.position.y = this.shoulderBaseL;
      this.rig.upperR.position.y = this.shoulderBaseR;
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

  private mixArm(side: -1 | 1, r: Reach, weight: number, beat: number, pulse: number, high: boolean, ride: number) {
    const upper = side < 0 ? this.rig.upperL : this.rig.upperR;
    const fore = side < 0 ? this.rig.foreL : this.rig.foreR;
    if (high) {
      // From below the counter: the forearm folds up against the chest first, then the arm carries the hand out
      // over the top. On the way back the same in reverse. The hand never sweeps through the counter.
      if (!this.aboveCounter(upper, fore, r.forward, r.out * side, r.bend, r.twist * side, r.side * side)) return false;
      const lift = ease(weight / 0.55), reach = ease((weight - 0.3) / 0.7);
      upper.rotation.x = mix(mix(upper.rotation.x, TUCK_FORWARD, lift), r.forward, reach);
      upper.rotation.z = mix(upper.rotation.z, r.out * side, reach);
      fore.rotation.set(
        mix(mix(fore.rotation.x, TUCK_BEND, lift), r.bend, reach) + ride * reach,
        mix(fore.rotation.y, r.twist * side, lift) + pulse * side,
        mix(fore.rotation.z, (r.side + beat) * side, reach));
      return true;
    }
    upper.rotation.x = mix(upper.rotation.x, r.forward, weight);
    upper.rotation.z = mix(upper.rotation.z, r.out * side, weight);
    fore.rotation.set(
      mix(fore.rotation.x, r.bend, weight) + ride * weight,
      mix(fore.rotation.y, r.twist * side, weight) + pulse * side,
      mix(fore.rotation.z, (r.side + beat) * side, weight));
    return true;
  }

  /** `weight` moves the leading arm and the head; `lagged` is the same stroke a moment later, for the other arm. */
  private applyCue(c: Cue, weight: number, lagged: number, seated: boolean, left: boolean, right: boolean, supported: boolean, ride = 0) {
    const kind = c.kind;
    if (!kind || (weight === 0 && lagged === 0)) return;
    const { head, browL, corners, upperL, upperR } = this.rig;
    if (kind === "yes" || kind === "understood") {
      head.rotation.x += (kind === "yes" ? 0.12 : 0.15) * weight;
    } else if (kind === "no") {
      const phase = clamp(c.age / 0.71, 0, 1);
      head.rotation.y += Math.sin(phase * Math.PI * 2) * 0.15 * weight;
    } else if (kind === "headGreeting") {
      head.rotation.x += 0.085 * weight;
      if (corners) corners.position.y += 0.01 * weight;
    } else if (kind === "repeat") {
      // "Hm?": the head tips to one side, one brow up.
      head.rotation.z += 0.11 * c.side * weight;
      const brow = c.side < 0 ? browL : this.rig.browR ?? browL;
      brow.position.y += 0.012 * weight;
    }
    const high = this.high && !seated;
    const r = (high ? REACH_HIGH : REACH)[kind];
    if (!r) return;
    if (kind === "shrug") {
      if (!supported) {
        if (!this.shouldersMixed) {
          this.shoulderBaseL = upperL.position.y;
          this.shoulderBaseR = upperR.position.y;
          this.shouldersMixed = true;
        }
        const lift = 0.015 * Math.min(1, weight);
        upperL.position.y = this.shoulderBaseL + lift;
        upperR.position.y = this.shoulderBaseR + lift;
      }
      head.rotation.z += 0.04 * c.side * weight;
    }
    const side = c.directional ? c.side : c.side < 0 ? (left ? -1 : 1) : (right ? 1 : -1);
    const scale = seated ? 0.52 : high ? 1 : supported ? 0.65 : 1;
    // A wave is the hand out, back across and out again, each swing smaller.
    const swing = c.age - c.rise * 0.8;
    const beat = kind === "greeting" || kind === "wave"
      ? 0.17 * (oneShot(swing, 0.10, 0, 0.13) - 0.8 * oneShot(swing - 0.21, 0.11, 0, 0.13) + 0.55 * oneShot(swing - 0.43, 0.11, 0, 0.15)) : 0;
    const countTime = c.age - c.rise + 0.05;
    const index = Math.floor(countTime / 0.19);
    const pulse = kind === "count" && index >= 0 && index < c.count
      ? 0.09 * oneShot(countTime - index * 0.19, 0.07, 0, 0.07) * Math.min(1, weight) : 0;
    let usedArm = false;
    if (side < 0 ? left : right) usedArm = this.mixArm(side, r, weight * scale, beat, pulse * (seated || supported ? 0.5 : 1), high, ride);
    if (r.both && !seated && left && right) usedArm = this.mixArm(side === 1 ? -1 : 1, r, lagged * scale * 0.92, 0, 0, high, ride * 0.6) || usedArm;
    if (kind === "point" && usedArm) {
      // A look where the hand goes, then back to the learner while the arm still holds.
      head.rotation.y += 0.11 * side * oneShot(c.age - 0.04, 0.22, 0.3, 0.38) * Math.min(1, weight);
    } else if (!usedArm && c.directional) head.rotation.y += 0.055 * side * weight;
    else if (!usedArm && kind !== "shrug") head.rotation.x += 0.033 * weight;
  }

  apply(dt: number, moving: boolean, blink: number, watching = false) {
    const r = this.rig, actor = this.actor;
    const seated = actor.anim === "sit";
    const blocked = this.blockedHands, blockL = !!(blocked & 1), blockR = !!(blocked & 2);
    const supported = seated || blockL || blockR || this.high;
    this.eyeBaseX = r.eye.position.x;
    this.eyeBaseY = r.eye.position.y;
    const kind = this.cue.kind;
    const cueWeight = cueTime(this.cue) * this.weight;
    const response = this.response.kind;
    const responseWeight = cueTime(this.response) * this.weight;
    const addResponse = kind === "yes" || kind === "no" || kind === "headGreeting" ? 1 - responseWeight : 1;
    let faded = 0;
    if (import.meta.env.DEV) {
      const a = this.values;
      a.gazeTarget = null;
      a.gazeYaw = a.gazePitch = a.gazeEyeX = a.gazeEyeY = a.listeningWeight = a.reactionWeight = 0;
      readJoints(r, this.base, r.corners ? 0 : this.eyeBaseY);
    }
    if (!this.reduced && !moving && this.weight > 0) {
      const incline = supported && this.inclination > 0;
      const headBasePitch = incline ? r.head.rotation.x : 0;
      const left = !blockL, right = !blockR;
      const listen = ease(this.listenWeight) * this.weight;
      if (import.meta.env.DEV) this.values.listeningWeight = listen;
      const learner = this.role === "learner";
      const nod = this.nodKind === 0 ? oneShot(this.listenAge, 0.23, 0.02, 0.30) : this.nodKind === 1 ? 0.8 * nodTwice(this.listenAge) : 0;
      const listenBeat = nod * this.nodSize * this.weight * (1 - Math.min(1, Math.max(cueWeight, responseWeight)));
      const hip = learner && this.learnerHip && !supported;
      const e = this.energy;
      if (!supported) this.mixTorso(0.055 * listen, hip ? 0.014 * listenBeat : 0);
      if (!supported) {
        if (left) r.foreL.rotation.x -= 0.13 * listen;
        if (right) r.foreR.rotation.x -= 0.13 * listen;
      }
      if (!hip) r.head.rotation.x += (learner ? 0.055 : 0.075 * e) * listenBeat;
      // An attentive head: a little to one side, the mouth a touch warmer, for as long as the learner has the turn,
      // and in the quiet before and after the speaker's own line. It is never a statue: the head drifts very slowly,
      // each person at their own pace, and the eyes flick to the learner's mouth and back.
      const t = this.time, pace = this.pace;
      const attend = Math.max(listen, ease(this.rest) * this.weight) * (1 - responseWeight);
      r.head.rotation.z += (0.042 * this.attendNow + Math.sin(t * 0.37 * pace + this.swayB) * 0.009) * e * attend;
      r.head.rotation.y += (Math.sin(t * 0.53 * pace + this.swayA) * 0.014 + Math.sin(t * 0.21 * pace + this.swayB) * 0.009) * e * attend;
      if (r.corners) r.corners.position.y += 0.005 * attend;
      const dart = oneShot(this.dartAge, 0.06, 0.26, 0.09) * attend;
      if (dart > 0) {
        r.eye.position.x += this.dartX * dart;
        r.eye.position.y += this.dartY * dart;
      }
      if (this.role === "speaking" && kind !== "yes" && kind !== "no") {
        const phrase = oneShot(this.phraseAge, 0.09, 0.02, 0.28) * this.weight * (1 - responseWeight);
        const accent = this.accent, free = phrase * (1 - Math.min(1, cueWeight)) * e;
        if (accent === 0) r.head.rotation.x += 0.06 * free;
        else if (accent === 1) r.head.rotation.x -= 0.032 * free;
        else if (accent === 2) r.head.rotation.z += (this.swayB > 3.1416 ? 0.045 : -0.045) * free;
        const brow = (accent === 1 || accent === 3 ? 0.013 : 0.009) * phrase;
        r.browL.position.y += brow;
        if (r.browR) r.browR.position.y += brow;
      }
      const talk = ease(this.talk) * this.weight * (1 - responseWeight) * (1 - 0.6 * Math.min(1, cueWeight)) * e;
      if (talk > 0) {
        // The head rides the voice: down a little on a stressed syllable, and it never sits dead still mid-sentence.
        // Two slow waves of different lengths on each axis, at this person's pace: no loop to spot, no two alike.
        const stress = this.stress;
        r.head.rotation.x += (0.07 * stress - 0.012) * talk;
        r.head.rotation.y += (Math.sin(t * 1.9 * pace + this.swayA) * 0.024 + Math.sin(t * 0.83 * pace + this.swayB) * 0.016) * talk;
        r.head.rotation.z += (Math.sin(t * 1.3 * pace + this.swayB) * 0.017 + Math.sin(t * 0.61 * pace + this.swayA) * 0.012) * talk;
        r.browL.position.y += 0.006 * stress * talk;
        if (r.browR) r.browR.position.y += 0.006 * stress * talk;
      }
      const fading = this.fading.kind;
      if (fading && this.fadeAge < FADE_SECONDS) {
        const out = (1 - ease(this.fadeAge / FADE_SECONDS)) * this.weight;
        faded = cueTime(this.fading) * out;
        this.applyCue(this.fading, faded, cueTime(this.fading, this.fading.age - ARM_LAG) * out, seated, left, right, supported);
      }
      // While the hand is out it beats lightly with the stressed syllables.
      const ride = this.role === "speaking" ? -0.09 * (this.stress - 0.3) * ease(this.talk) : 0;
      const scale = this.weight * addResponse;
      this.applyCue(this.cue, cueWeight * addResponse, cueTime(this.cue, this.cue.age - ARM_LAG) * scale, seated, left, right, supported, ride);
      this.applyCue(this.response, responseWeight, responseWeight, seated, left, right, supported);
      // The smile outlasts the nod.
      if (response === "understood" && r.corners) {
        r.corners.position.y += 0.012 * oneShot(this.response.age - 0.1, 0.2, 0.75, 0.5) * this.weight;
      }
      if (import.meta.env.DEV) this.values.reactionWeight = responseWeight;
      const gazing = this.applyGaze(r.head, r.eye);
      if (incline) {
        // Leave room for the listening nod and give speech, glances and reactions their pitch.
        const limit = responseWeight > 0 ? 0.08 : gazing ? 0.07 : this.role === "speaking" ? 0.045 : 0.08;
        const room = Math.max(0, limit - (r.head.rotation.x - headBasePitch));
        const pitch = Math.min(room, 0.024 * ease(this.inclination) * this.weight);
        r.head.rotation.x += pitch;
        if (watching && !gazing) r.eye.position.y += pitch * 0.012;
      }
    }
    if (this.armEntry) {
      const weight = this.engaged ? this.weight : ease(this.releaseAge / this.releaseSeconds);
      if (weight === 1 || seated || moving) this.armEntry = undefined;
      else this.armEntry.apply(weight, blocked);
    }
    if (import.meta.env.DEV) {
      const a = this.values;
      a.role = this.role; a.weight = this.weight; a.reduced = this.reduced; a.watching = watching && !this.reduced;
      const appliedCue = moving || this.reduced ? 0 : cueWeight * addResponse;
      a.gesture = appliedCue ? kind : faded ? this.fading.kind : null;
      a.gestureWeight = appliedCue || faded;
      a.mouth = this.mouth; a.mouthScaleY = r.mouth.scale.y; a.blink = blink;
      readJoints(r, a, r.corners ? 0 : this.eyeBaseY);
      const keys = joints!;
      for (let i = 0; i < keys.length; i++) {
        const joint = keys[i];
        a.deltas[joint] = a[joint] - this.base[joint];
      }
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
