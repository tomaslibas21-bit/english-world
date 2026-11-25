import type { Object3D, Vector3 } from "three";
import { picturesOn, useStore } from "../../state/store";
import { sceneFor } from "../../ui/scenes";
import type { GameCharacter } from "../characters";
import { audio, VOICE_ENVELOPE_GATE, type AudioSystem, type VisualPlaybackState, type VisualVoiceSample } from "../audio";
import type { NaturalPoseDriver, TalkLineId, VoiceVisualOwner } from "./contract";
import { blockedHands, ENTRY_SECONDS, presentTalkVoice } from "./contract";
import { PoseEntry } from "./entry";
import type { TalkActor } from "./session";

export function talkVoice<T extends TalkActor>(cast: readonly T[], people: readonly T[], layer: Object3D,
  id: string, line: number, replay: VoiceVisualOwner["replay"]) {
  const { conv, hud, settings } = useStore.getState();
  if (!conv.active || conv.introOpen || hud.panel || hud.glyph || hud.fade || hud.modeScreen || document.hidden ||
    (picturesOn(settings) && sceneFor(conv.sitId, conv.hostId))) return;
  const actor = cast.find((speaker) => speaker.id === id);
  if (actor && people.includes(actor) && actor.ch.root.parent === layer && actor.ch.root.visible) {
    return presentTalkVoice(actor.ch, line, replay, conv.transcript.at(-1));
  }
}

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
  private lastKitActor?: { key: string; target: ActingTarget };

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
    this.lastKitActor = undefined;
  }

  /** The kit signals playback edges and continues to own completion, the clock and mic. */
  kitPlayback(current: ActingTarget | undefined, key: string, text: string, seconds: number,
    learner: boolean, audible: boolean, replay: boolean) {
    const previous = replay && this.lastKitActor?.key === key ? this.lastKitActor.target : undefined;
    const target = previous ? (current?.actor === previous.actor ? previous : undefined) : current;
    if (target && !previous) this.lastKitActor = { key, target };
    if (!target && !learner) {
      this.drop();
      this.paused = false;
      return;
    }
    let playing: ActingLine | undefined;
    return {
      restart: (again: boolean) => {
        if (learner) this.learner(audible);
        else if (target) playing = this.speak(target, key, text, seconds, audible, again);
        return playing?.owner;
      },
      finish: () => {
        this.finish(playing);
        if (learner) this.learner(false);
      },
    };
  }

  play(target: ActingTarget, key: string, seconds: number, voice: string, speed: number, text: string,
    options: Parameters<AudioSystem["play"]>[3], replay: boolean, after?: () => void) {
    const line = this.speak(target, key, text, seconds, this.voice.volume > 0, replay);
    void this.voice.play(voice, speed, text, { ...options, visual: line?.owner }).then(() => {
      this.finish(line);
      after?.();
    });
  }

  playLearner(voice: string, text: string) {
    const turn = this.turn;
    this.learner(true);
    void this.voice.play(voice, 1, text).then(() => {
      if (this.turn === turn) this.learner(false);
    });
  }
}

// The pending speaker needs this sampler while the pose mixer is still loading.
export type VoiceSource = Pick<AudioSystem, "readVisualEnvelope">;

export class VoiceMouth {
  mouth = 0;
  roundness = 0.3;
  level: number | null = 0;
  sample: VisualPlaybackState | "text-only" | "unknown" | "quiet" | "voiced" = "text-only";
  silence = 1;
  private openness = 0;
  private age = 0;
  private owner?: VoiceVisualOwner;
  private readonly envelope: VisualVoiceSample = { time: null, level: null, vowel: null, quiet: 0 };

  read(dt: number, audio?: VoiceSource, owner?: VoiceVisualOwner, paused = false) {
    if (this.owner !== owner) this.reset();
    this.owner = owner;
    const sample = this.envelope;
    const state = paused ? "blocked" : owner && audio ? audio.readVisualEnvelope(owner, sample) : "text-only";
    if (state !== "playing" || sample.time === null) {
      this.reset();
      this.sample = state === "playing" ? "unknown" : state;
      this.level = state === "playing" ? null : state === "ended" ? -1 : 0;
      return;
    }

    const level = this.level = sample.level;
    let target = 0, round = 0.3;
    if (level === null) {
      this.age += dt;
      target = 0.23 + 0.13 * Math.sin(this.age * 12);
    } else if (level > VOICE_ENVELOPE_GATE) {
      target = Math.min(1, level);
      round = sample.vowel ?? round;
    }
    this.sample = level === null ? "unknown" : target ? "voiced" : "quiet";
    this.silence = target === 0 ? this.silence + dt : 0;
    this.openness += (target - this.openness) * (1 - Math.exp(-dt / (target > this.openness ? 0.045 : 0.080)));
    if (sample.quiet > 0) {
      // Ease the tail to rest during measured silence. Short syllable gaps keep
      // the ordinary release and the next attack starts from the visible opening.
      const tail = Math.max(0, 1 - sample.quiet / 0.14);
      this.openness = Math.min(this.openness, tail * tail * (3 - 2 * tail));
    }
    this.mouth = this.openness >= (this.mouth > 0 ? 0.04 : 0.08) ? this.openness : 0;
    this.roundness += (round - this.roundness) * (1 - Math.exp(-dt / 0.045));
  }

  reset() {
    this.openness = this.mouth = this.age = 0;
    this.silence = 1;
    this.roundness = 0.3;
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
