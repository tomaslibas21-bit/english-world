import type { Object3D } from "three";
import type { GameCharacter } from "../characters";
import { audio } from "../audio";
import type { NaturalPoseDriver, NaturalRig, TalkLineId, VoiceVisualOwner } from "./contract";
import { VoiceMouth } from "./mouth";

export interface ActingTarget {
  actor: GameCharacter;
  id: string;
  player?: GameCharacter;
  partner?: GameCharacter;
  zone?: { id: string; group: Object3D };
  scope?: "mode" | "street" | "greeting" | "town";
}

type Feedback = "understood" | "puzzled" | "repeat";
export interface ActingLine {
  key: TalkLineId;
  text: string;
  seconds: number;
  owner?: VoiceVisualOwner;
  repeat: boolean;
  finished?: boolean;
}
export interface ActingTurn {
  target: ActingTarget;
  line?: ActingLine;
  waiting: boolean;
  paused: boolean;
  feedback?: { kind: Feedback; at: number };
  close?: (seconds?: number) => void;
  refresh?: () => void;
}

/** The synchronous seam owns only the current events and the lips until the lazy mixer can join. */
export class ActorTalk {
  private turn?: ActingTurn;
  private paused = false;

  private aim(target: ActingTarget | undefined) {
    if (target && this.turn?.target.actor === target.actor && this.turn.close) {
      this.turn.target = target;
      return this.turn;
    }
    this.turn?.close?.(target ? 0.16 : undefined);
    this.turn = undefined;
    const actor = target?.actor;
    if (!target || !actor?.naturalRig || !actor.root?.parent || !actor.root.visible) return;
    if (actor.talkPose?.releasing) actor.talkPose.interrupt();
    if (actor.talkPose) return;
    const turn: ActingTurn = { target, waiting: false, paused: this.paused };
    this.turn = turn;
    const pending = new PendingMouth(actor, actor.naturalRig(), turn);
    turn.close = pending.interrupt;
    turn.refresh = () => actor.update(0);
    if (actor.anim === "wave") actor.setAnim("idle");
    actor.talkPose = pending;
    void import("./session").then(({ presentExchange }) => {
      if (actor.talkPose !== pending) return;
      pending.detach();
      presentExchange(turn, pending.rig, pending.mouthState, audio);
    }).catch(pending.interrupt);
    return turn;
  }

  speak(target: ActingTarget | undefined, key: TalkLineId, text: string, seconds: number, voiced: boolean, repeat = false): ActingLine | undefined {
    const turn = this.aim(target);
    if (!turn) return;
    const owner: VoiceVisualOwner | undefined = voiced ? { actor: turn.target.actor, line: key, replay: repeat ? "turn" : undefined } : undefined;
    return turn.line = { key, text, seconds, owner, repeat };
  }

  listen(target: ActingTarget | undefined, waiting: boolean) {
    const turn = waiting ? this.aim(target) : this.turn;
    if (turn) turn.waiting = waiting;
  }

  react(kind: Feedback) {
    if (this.turn?.close && !this.paused) this.turn.feedback = { kind, at: performance.now() };
  }

  pause(paused: boolean) {
    if (paused === this.paused) return;
    this.paused = paused;
    if (this.turn) {
      this.turn.paused = paused;
      if (paused) this.turn.refresh?.();
    }
  }

  release(seconds?: number) {
    this.turn?.close?.(seconds);
    this.turn = undefined;
    this.paused = false;
  }
}

class PendingMouth implements NaturalPoseDriver {
  readonly mouthState = new VoiceMouth();
  private readonly motion = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)");
  private age = 0;
  private readonly mount: Object3D[] = [];
  get mouth() { return this.mouthState.mouth; }
  get roundness() { return this.mouthState.roundness; }
  get reduced() { return this.motion?.matches ?? false; }
  get weight() { return this.reduced ? 1 : 0; }

  constructor(private actor: GameCharacter, readonly rig: NaturalRig, private turn: ActingTurn) {
    for (let node: Object3D | null = actor.root; node; node = node.parent) {
      node.addEventListener("removed", this.interrupt);
      this.mount.push(node);
    }
  }

  advance(dt: number) {
    const { line, waiting, paused } = this.turn;
    const owner = line?.owner;
    this.mouthState.read(dt, audio, owner, paused || !!globalThis.document?.hidden);
    if (waiting || owner && audio.visualOwner === owner) this.age = 0;
    else if ((this.age += dt) >= (line ? Math.min(line.seconds, 0.24) : 0.24)) this.interrupt();
  }

  apply() {}
  restoreBody() {}
  detach() {
    for (const node of this.mount) node.removeEventListener("removed", this.interrupt);
    this.mount.length = 0;
    if (this.actor.talkPose === this) this.actor.talkPose = undefined;
    this.turn.close = this.turn.refresh = undefined;
  }
  readonly interrupt = () => { this.mouthState.reset(); this.detach(); };
}
