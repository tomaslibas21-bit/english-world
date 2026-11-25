import type { Object3D, Vector3 } from "three";
import type { GameCharacter } from "../characters";
import { audio, type AudioSystem } from "../audio";
import type { NaturalPoseDriver, TalkLineId, VoiceVisualOwner } from "./contract";
import { blockedHands, ENTRY_SECONDS } from "./contract";
import { PoseEntry } from "./entry";
import { VoiceMouth } from "./mouth";

export interface ActingTarget {
  actor: GameCharacter;
  id: string;
  player?: GameCharacter;
  partner?: GameCharacter;
  zone?: { id: string; group: Object3D };
  scope?: "mode" | "street" | "greeting" | "town";
  motion?: "head" | "face";
  action?(): boolean;
}

export type ActingFeedback = "understood" | "puzzled" | "repeat";

export interface ActingLine {
  key: TalkLineId;
  text: string;
  seconds: number;
  owner?: VoiceVisualOwner;
  replay: boolean;
  finished?: boolean;
}

export interface ActingTurn {
  target: ActingTarget;
  line?: ActingLine;
  waiting: boolean;
  paused: boolean;
  learner: boolean;
  feedback?: ActingFeedback;
  glance?: Vector3;
  close?(seconds?: number): void;
  refresh?(): void;
}

export function mounted(actor: GameCharacter) {
  if (!actor.root.parent) return false;
  for (let node: Object3D | null = actor.root; node; node = node.parent) if (!node.visible) return false;
  return true;
}

/** Keeps the current mounted actor and request available while the pose and semantics load. */
export class ActorTalk {
  private turn?: ActingTurn;
  private paused = false;

  constructor(private readonly voice: AudioSystem = audio) {}

  private aim(target: ActingTarget) {
    const actor = target.actor;
    if (mounted(actor) && this.turn?.target.actor === actor && this.turn.close) {
      this.turn.target = target;
      return this.turn;
    }
    this.drop();
    if (!mounted(actor) || actor.talkPose && !actor.talkPose.releasing) return;
    const rig = actor.naturalRig?.();
    if (!rig) return;
    const entry = !target.motion && !target.action && actor.anim !== "sit" ? new PoseEntry(actor, rig) : undefined;
    actor.talkPose?.interrupt();
    actor.beginNaturalPose?.(true);
    if (actor.anim === "wave") actor.setAnim("idle");
    const turn = this.turn = { target, waiting: false, paused: this.paused, learner: false } as ActingTurn;
    const pending = new PendingMouth(turn, this.voice, entry);
    actor.talkPose = pending;
    turn.close = pending.interrupt;
    turn.refresh = () => actor.update(0);
    void import("./exchange").then(({ presentExchange }) => {
      if (actor.talkPose !== pending) return;
      if (!mounted(actor)) { pending.interrupt(); return; }
      pending.detach();
      presentExchange(turn, pending.lips, this.voice, entry, pending.entryAge);
    }).catch(() => { if (actor.talkPose === pending) pending.interrupt(); });
    return turn;
  }

  speak(target: ActingTarget, key: TalkLineId, text: string, seconds: number, voiced: boolean, replay = false) {
    const turn = this.aim(target);
    if (!turn) return;
    this.finish(turn.line);
    turn.learner = false;
    return turn.line = {
      key, text, seconds, replay,
      owner: voiced && !this.paused ? { actor: target.actor, line: key, replay: replay ? "turn" : undefined } : undefined,
    };
  }

  finish(line?: ActingLine) {
    if (!line || line.finished) return;
    line.finished = true;
    if (line.owner) this.voice.disownVisual(line.owner);
  }

  listen(target: ActingTarget | undefined, waiting: boolean) {
    const turn = waiting && target ? this.aim(target) : this.turn;
    if (turn) turn.waiting = waiting && !!target;
  }

  learner(playing: boolean) {
    const turn = this.turn;
    if (!turn || turn.learner === playing) return;
    turn.learner = playing;
    if (playing) {
      this.finish(turn.line);
      turn.refresh?.();
    }
  }

  react(kind: ActingFeedback) {
    if (this.turn?.close && !this.paused) this.turn.feedback = kind;
  }

  glance(point: Vector3) {
    if (this.turn?.close && !this.paused) this.turn.glance = point;
  }

  pause(paused: boolean) {
    if (this.paused === paused) return;
    this.paused = paused;
    if (!this.turn) return;
    this.turn.paused = paused;
    if (paused) {
      this.finish(this.turn.line);
      this.turn.feedback = undefined;
      this.turn.glance = undefined;
      this.turn.refresh?.();
    }
  }

  private drop(seconds?: number) {
    this.finish(this.turn?.line);
    this.turn?.close?.(seconds);
    this.turn = undefined;
  }

  release(seconds?: number) {
    this.drop(seconds);
    this.paused = false;
  }
}

class PendingMouth implements NaturalPoseDriver {
  readonly lips = new VoiceMouth();
  readonly releasing = false;
  readonly baseGaze = true;
  readonly baseWork = true;
  private readonly motion = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)");
  private readonly mount: Object3D[] = [];
  private readonly actor: GameCharacter;
  entryAge = 0;
  get mouth() { return this.lips.mouth; }
  get roundness() { return this.lips.roundness; }
  get reduced() { return this.motion?.matches ?? false; }

  constructor(private readonly turn: ActingTurn, private readonly voice: AudioSystem, private readonly entry?: PoseEntry) {
    this.actor = turn.target.actor;
    this.motion?.addEventListener("change", this.motionChanged);
    this.motionChanged();
    for (let node: Object3D | null = this.actor.root; node; node = node.parent) {
      node.addEventListener("removed", this.interrupt);
      this.mount.push(node);
    }
  }

  private readonly motionChanged = () => {
    if (this.reduced) this.entryAge = ENTRY_SECONDS;
  };

  advance(dt: number) {
    const { line, paused, learner } = this.turn;
    if (!mounted(this.actor)) { this.interrupt(); return; }
    const held = paused || learner || !!globalThis.document?.hidden;
    if (!held) this.entryAge = Math.min(ENTRY_SECONDS, this.entryAge + dt);
    this.lips.read(dt, this.voice, line?.finished ? undefined : line?.owner, held);
  }

  apply(moving: boolean) {
    if (moving || this.actor.anim === "sit" || this.turn.paused || this.turn.learner) this.entryAge = ENTRY_SECONDS;
    if (!this.entry || this.entryAge >= ENTRY_SECONDS) return;
    const part = this.entryAge / ENTRY_SECONDS;
    this.entry.mixArms(1 - part * part * (3 - 2 * part), blockedHands(this.actor, this.entry.rig));
  }
  restoreBase() {}

  detach() {
    this.motion?.removeEventListener("change", this.motionChanged);
    for (let i = 0; i < this.mount.length; i++) this.mount[i].removeEventListener("removed", this.interrupt);
    this.mount.length = 0;
    if (this.actor.talkPose === this) this.actor.talkPose = undefined;
    this.turn.close = this.turn.refresh = undefined;
  }

  readonly interrupt = () => {
    if (this.actor.talkPose !== this) return;
    const owner = this.turn.line?.owner;
    if (owner) this.voice.disownVisual(owner);
    this.lips.reset();
    this.detach();
    this.actor.update(0);
  };
}
