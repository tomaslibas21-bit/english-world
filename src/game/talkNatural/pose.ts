// Import on conversation entry. The existing game can animate characters without loading this module.
import { Euler, Matrix4, Quaternion, Vector3 } from "three";
import type { Object3D } from "three";
import type { AudioSystem, VisualPlaybackState } from "../audio";
import type { GameCharacter } from "../characters";
import type { NaturalPoseDriver, NaturalRig, TalkLineId, VoiceVisualOwner } from "./contract";

export type { TalkLineId, VoiceVisualOwner } from "./contract";
export type TalkRole = "speaking" | "listening" | "reaction" | "cast" | "learner" | "bystander";
export type TalkGesture = "greeting" | "question" | "point" | "shrug" | "yes" | "no" | "count" | "offer";
export type TalkReaction = "understood" | "repeat" | "wave" | "openPalm" | "heart";
export interface GestureRequest {
  kind: TalkGesture;
  side?: -1 | 1;
  count?: 1 | 2 | 3;
}
type CueKind = TalkGesture | TalkReaction;
type VoiceSource = Pick<AudioSystem, "visualState" | "level" | "vowel">;
type VoiceSample = VisualPlaybackState | "text-only" | "unknown" | "quiet" | "voiced";

export interface PoseOptions {
  audio?: VoiceSource;
  role?: TalkRole;
  /** World-space top of a counter in reach of the actor. */
  counterY?: number;
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const mix = (base: number, target: number, weight: number) => base + (target - base) * weight;
const ease = (t: number) => { const u = clamp(t, 0, 1); return u * u * (3 - 2 * u); };
const damp = (dt: number, seconds: number) => 1 - Math.exp(-dt / seconds);

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
  wave: { forward: -0.32, out: 0.65, bend: -1.5, twist: -0.32, side: 0 },
  openPalm: { forward: -0.35, out: 0.18, bend: -1.1, twist: -0.85, side: 0.18 },
  heart: { forward: -0.4, out: -0.08, bend: -1.65, twist: -0.2, side: -0.56 },
};

interface Cue {
  kind: CueKind | null;
  age: number;
  side: -1 | 1;
  count: 1 | 2 | 3;
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
function observation() {
  return {
    active: true, role: "cast" as TalkRole, reduced: false, weight: 0, gesture: null as CueKind | null, gestureWeight: 0,
    sample: "text-only" as VoiceSample, level: null as number | null, mouth: 0, mouthScaleY: 0, blink: 0,
    torsoPitch: 0, hipRoll: 0, headPitch: 0, headYaw: 0, headRoll: 0, eyeX: 0, eyeY: 0,
    shoulderL: 0, shoulderR: 0, upperL: 0, upperR: 0, outL: 0, outR: 0,
    elbowL: 0, elbowR: 0, foreSideL: 0, foreSideR: 0, thumbL: 0, thumbR: 0,
    browL: 0, browR: 0, smile: 0,
  };
}

class ConversationPose implements NaturalPoseDriver {
  private readonly values = observation();
  get applied(): Readonly<ReturnType<typeof observation>> { return this.values; }
  weight = 0;
  mouth = 0;
  roundness = 0.3;
  reduced = false;
  private role: TalkRole;
  private engaged = true;
  get releasing() { return !this.engaged && !this.closed; }
  private closed = false;
  private blend = 0;
  private listenWeight = 0;
  private time = 0;
  private listenAt = Infinity;
  private listenAge = Infinity;
  private learnerHip = false;

  private voice: VoiceVisualOwner | null = null;
  private readonly lines = new Set<TalkLineId>();
  private openness = 0;
  private silence = 1;
  private voicedAge = 0;
  private phraseAge = Infinity;
  private lastPhrase = -Infinity;
  private afterQuiet = true;

  private readonly cue: Cue = { kind: null, age: 0, side: 1, count: 1 };
  private readonly fading: Cue = { kind: null, age: 0, side: 1, count: 1 };
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
  private bystanderAt = 0;

  private readonly hand = new Vector3();
  private readonly armAngle = new Euler();
  private readonly foreAngle = new Euler();
  private readonly bodyBase = new Quaternion();
  private readonly bodyDelta = new Quaternion();
  private readonly leftThigh: Thigh;
  private readonly rightThigh: Thigh;
  private torsoMixed = false;
  private readonly motion: MediaQueryList | undefined;
  private readonly mount: Object3D[] = [];
  private eyeBaseX = 0;
  private eyeBaseY = 0;

  constructor(private readonly actor: GameCharacter, private readonly rig: NaturalRig, private readonly audio: VoiceSource | undefined, options: PoseOptions) {
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
      this.cue.kind = this.fading.kind = null;
      this.gazeAge = this.phraseAge = this.listenAge = Infinity;
    } else this.scheduleListener();
  };

  /** Supply a role when the turn changes. Repeating a role keeps its listening cadence. */
  setRole(role: TalkRole) {
    if (!this.engaged || role === this.role) return;
    this.role = role;
    this.voice = null;
    this.fadeCue();
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
      this.openness = this.mouth = this.voicedAge = 0;
      this.silence = 1;
      this.afterQuiet = true;
      this.phraseAge = Infinity;
    }
    if (this.lines.has(line)) return;
    this.lines.add(line);
    this.fadeCue();
    this.endGlance();
    if (this.reduced || !gesture) return;
    if (REACH[gesture.kind]) {
      if (this.time - this.lastArm < 1.6) return;
      this.lastArm = this.time;
    }
    this.startCue(gesture.kind, gesture.side, gesture.count);
  }

  /** Feedback may overlap speech. The current recording retains ownership of the lips. */
  react(kind: TalkReaction, side: -1 | 1 = 1) {
    if (!this.engaged || this.reduced) return;
    if (kind === "wave" || kind === "openPalm" || kind === "heart") {
      if (this.saidGoodbye) return;
      this.saidGoodbye = true;
    }
    this.fadeCue();
    this.startCue(kind, side);
  }

  /** A brief look toward an existing world-space point. Eyes lead the additional head turn by 80 ms. */
  glanceAt(worldPoint: Vector3, delay = 0.32, hold = this.role === "bystander" ? 0.32 : 0.16) {
    if (!this.engaged || this.reduced || this.time < this.bystanderAt) return;
    if (this.role === "bystander") {
      this.actor.root.getWorldPosition(this.ray);
      if (this.ray.distanceToSquared(worldPoint) > 4.5 ** 2) return;
      this.bystanderAt = this.time + 6 + Math.random() * 4;
    }
    this.gaze.copy(worldPoint);
    this.gazeAge = -Math.max(0, delay);
    this.gazeHold = this.role === "bystander" ? clamp(hold, 0.22, 0.5) : clamp(hold, 0.10, 0.24);
    this.gazeFade = 1;
    this.gazeEnding = false;
  }

  private endGlance() {
    if (this.gazeAge < 0) this.gazeAge = Infinity;
    this.gazeEnding = true;
  }

  /** Restore the current underlying idle over 300 ms. Call interrupt for removal or a hard cut. */
  release() {
    if (!this.engaged) return;
    this.engaged = false;
    this.voice = null;
  }

  readonly interrupt = () => {
    if (this.closed) return;
    this.restoreBody();
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
    this.lines.clear();
    this.mouth = this.weight = 0;
    this.values.active = false;
    this.values.weight = this.values.mouth = this.values.gestureWeight = 0;
    this.values.gesture = null;
    this.motion?.removeEventListener("change", this.motionChanged);
    for (const node of this.mount) node.removeEventListener("removed", this.interrupt);
    this.mount.length = 0;
    if (this.actor.talkPose === this) this.actor.talkPose = undefined;
  }

  private fadeCue() {
    if (!this.cue.kind) return;
    Object.assign(this.fading, this.cue);
    this.fadeAge = 0;
    this.cue.kind = null;
  }

  private startCue(kind: CueKind, side: -1 | 1 = 1, count: 1 | 2 | 3 = 1) {
    this.cue.kind = kind;
    this.cue.age = 0;
    this.cue.side = side;
    this.cue.count = count;
  }

  private scheduleListener() {
    this.listenAt = this.time + (this.role === "learner" ? 5 + Math.random() * 3 : 2 + Math.random() * 1.5);
  }

  private sampleVoice(dt: number) {
    const voice = this.voice, audio = this.audio;
    let target = 0, round = 0.3;
    let state: VoiceSample = voice && audio ? audio.visualState(voice) : "text-only";
    let level: number | null = state === "ended" ? -1 : null;
    if (state === "playing" && audio) {
      level = audio.level(false);
      if (level === null) {
        state = "unknown";
        this.voicedAge += dt;
        target = 0.23 + 0.13 * Math.sin(this.voicedAge * 12);
      } else if (level < 0) state = "ended";
      else if (level <= 0.05) state = "quiet";
      else {
        state = "voiced";
        target = clamp(level, 0, 1);
        round = audio.vowel() ?? round;
      }
    }
    this.values.level = level;
    this.values.sample = state;
    this.silence = target === 0 ? this.silence + dt : 0;
    this.openness = mix(this.openness, target, damp(dt, target > this.openness ? 0.045 : 0.080));
    if (target === 0 && this.silence >= 0.24 - dt * 0.5) this.openness = 0;
    this.mouth = this.openness >= (this.mouth > 0 ? 0.04 : 0.08) ? this.openness : 0;
    this.roundness = mix(this.roundness, round, damp(dt, 0.045));

    if (this.silence >= 0.18) this.afterQuiet = true;
    if (state === "voiced" && target >= 0.18 && this.afterQuiet) {
      this.afterQuiet = false;
      if (!this.reduced && this.time - this.lastPhrase >= 0.75) {
        this.phraseAge = 0;
        this.lastPhrase = this.time;
      }
    }
  }

  advance(dt: number) {
    this.restoreBody();
    this.time += dt;
    this.blend = this.reduced && this.engaged ? 1 : clamp(this.blend + dt * (this.engaged ? 1 / 0.24 : -1 / 0.30), 0, 1);
    if (this.blend < 1e-8) this.blend = 0;
    this.weight = ease(this.blend);
    const listening = this.role === "listening";
    this.listenWeight = clamp(this.listenWeight + dt * (listening ? 1 : -1) / 0.16, 0, 1);
    if (this.engaged) {
      this.cue.age += dt;
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
    this.sampleVoice(dt);
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
    eye.position.x = mix(eyeX, clamp(x * 0.028, -0.009, 0.009), eyesWeight);
    eye.position.y = (this.rig.corners ? 0 : this.eyeBaseY) + mix(eyeY, clamp(-y * 0.019, -0.004, 0.004), eyesWeight);
    const headWeight = oneShot(age - 0.08, 0.13, this.gazeHold, 0.22) * blend;
    head.rotation.y += clamp(x, -0.12, 0.12) * headWeight;
    head.rotation.x += clamp(y, -0.07, 0.07) * headWeight;
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

  restoreBody() {
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
    } else if (kind === "repeat") {
      head.rotation.z += 0.055 * c.side * weight;
      const brow = c.side < 0 ? browL : this.rig.browR ?? browL;
      brow.position.y += 0.005 * weight;
    }
    const r = REACH[kind];
    if (!r) return;
    if (kind === "shrug") {
      if (!supported) { upperL.position.y += 0.015 * weight; upperR.position.y += 0.015 * weight; }
      head.rotation.z += 0.04 * c.side * weight;
    }
    const side = c.side < 0 ? (left ? -1 : 1) : (right ? 1 : -1);
    const amount = weight * (seated ? 0.52 : supported ? 0.65 : 1);
    const beat = kind === "greeting" || kind === "wave" ? 0.14 * oneShot(c.age - 0.20, 0.10, 0, 0.16) : 0;
    const countTime = c.age - 0.15;
    const index = Math.floor(countTime / 0.19);
    const pulse = kind === "count" && index >= 0 && index < c.count
      ? 0.09 * oneShot(countTime - index * 0.19, 0.07, 0, 0.07) * weight : 0;
    let usedArm = false;
    if (side < 0 ? left : right) usedArm = this.mixArm(side, r, amount, beat, pulse * (seated || supported ? 0.5 : 1));
    if (r.both && !seated && left && right) usedArm = this.mixArm(side === 1 ? -1 : 1, r, amount, 0, 0) || usedArm;
    if (!usedArm && kind !== "shrug") head.rotation.x += 0.033 * weight;
  }

  apply(dt: number, moving: boolean, blink: number) {
    const r = this.rig, a = this.values, actor = this.actor;
    const seated = actor.anim === "sit";
    const busy = actor.busy;
    const both = busy === "paper" || r.carry === "paper" || busy === "wheel" || busy === "type" || busy === "wipe";
    const blockL = both || r.carry === "bag" || busy === "doorL";
    const blockR = both || Boolean(actor.rightHand.children.length) || r.carry === "coffee" || r.carry === "cup" ||
      busy === "cup" || busy === "tiller" || busy === "doorR";
    const supported = seated || blockL || blockR || this.counterY !== undefined;
    this.eyeBaseX = r.eye.position.x;
    this.eyeBaseY = r.eye.position.y;
    const kind = this.cue.kind;
    const cueWeight = kind ? cueTime(kind, this.cue.age) * this.weight : 0;
    if (!this.reduced && !moving && this.weight > 0) {
      const left = !blockL, right = !blockR;
      const listen = ease(this.listenWeight) * this.weight;
      const learner = this.role === "learner";
      const listenBeat = oneShot(this.listenAge, 0.23, 0.02, 0.30) * this.weight * (1 - cueWeight);
      const hip = learner && this.learnerHip && !supported;
      if (!supported) this.mixTorso(0.035 * listen, hip ? 0.012 * listenBeat : 0);
      if (!seated && this.counterY === undefined) {
        if (left) r.foreL.rotation.x -= 0.13 * listen;
        if (right) r.foreR.rotation.x -= 0.13 * listen;
      }
      if (!hip) r.head.rotation.x += (learner ? 0.03 : 0.035) * listenBeat;
      if (this.role === "speaking" && (cueWeight === 0 || (kind !== "understood" && kind !== "repeat" && kind !== "yes" && kind !== "no"))) {
        const phrase = oneShot(this.phraseAge, 0.09, 0.02, 0.28) * this.weight;
        r.head.rotation.x += 0.045 * phrase * (1 - cueWeight);
        r.browL.position.y += 0.008 * phrase;
        if (r.browR) r.browR.position.y += 0.008 * phrase;
      }
      const fading = this.fading.kind;
      if (fading && this.fadeAge < 0.16) {
        const w = cueTime(fading, this.fading.age) * (1 - ease(this.fadeAge / 0.16)) * this.weight;
        this.applyCue(this.fading, w, seated, left, right, supported);
      }
      this.applyCue(this.cue, cueWeight, seated, left, right, supported);
      this.applyGaze(r.head, r.eye);
    }
    a.role = this.role; a.weight = this.weight; a.reduced = this.reduced;
    a.gesture = cueWeight && !moving && !this.reduced ? kind : null;
    a.gestureWeight = a.gesture ? cueWeight : 0;
    a.mouth = this.mouth; a.mouthScaleY = r.mouth.scale.y; a.blink = blink;
    a.torsoPitch = r.body.rotation.x; a.hipRoll = r.body.rotation.z;
    a.headPitch = r.head.rotation.x; a.headYaw = r.head.rotation.y; a.headRoll = r.head.rotation.z;
    a.eyeX = r.eye.position.x; a.eyeY = this.rig.corners ? r.eye.position.y : r.eye.position.y - this.eyeBaseY;
    a.shoulderL = r.upperL.position.y; a.shoulderR = r.upperR.position.y;
    a.upperL = r.upperL.rotation.x; a.upperR = r.upperR.rotation.x; a.outL = r.upperL.rotation.z; a.outR = r.upperR.rotation.z;
    a.elbowL = r.foreL.rotation.x; a.elbowR = r.foreR.rotation.x;
    a.foreSideL = r.foreL.rotation.z; a.foreSideR = r.foreR.rotation.z;
    a.thumbL = r.foreL.rotation.y; a.thumbR = r.foreR.rotation.y;
    a.browL = r.browL.position.y; a.browR = (r.browR ?? r.browL).position.y; a.smile = r.corners?.position.y ?? 0;
    if (!this.engaged && this.weight === 0) this.detach();
  }
}

/** One controller per participating rig. Import this module only when starting actor-side conversation. */
export function bindConversationPose(actor: GameCharacter, options: PoseOptions = {}): ConversationPose | undefined {
  if (actor.talkPose instanceof ConversationPose) {
    if (!actor.talkPose.releasing) return actor.talkPose;
    actor.talkPose.interrupt();
  }
  if (actor.talkPose || !actor.naturalRig) return;
  const rig = actor.naturalRig();
  if (actor.anim === "wave") actor.setAnim("idle");
  const binding = new ConversationPose(actor, rig, options.audio, options);
  actor.talkPose = binding;
  actor.update(0);
  return binding;
}
