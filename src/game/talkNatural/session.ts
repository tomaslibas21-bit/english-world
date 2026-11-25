import { Vector3, type Object3D } from "three";
import { classifyTalk, talkPersonality } from "../../content/talkNatural";
import type { ConvUI } from "../../state/store";
import type { AudioSystem } from "../audio";
import type { GameCharacter } from "../characters";
import { talkCounterHeight, talkRoomAnchors } from "../world/talkNatural";
import type { ClassifiedCue, TalkLineId, VoiceVisualOwner } from "./contract";
import { inspectTalkNatural, inspectedRequest, snapshotActor } from "./inspection";
import { lineSeed } from "./seed";
import { bindConversationPose, type GestureRequest, type TalkRole } from "./pose";

export { presentExchange } from "./exchange";
export { lineSeed } from "./seed";

export interface TalkActor { id: string; ch: GameCharacter }
type Pose = NonNullable<ReturnType<typeof bindConversationPose>>;
type Voice = Pick<AudioSystem, "visualOwner" | "visualState" | "visualElapsed" | "level" | "vowel">;
export type SessionReaction = "nod" | "puzzled" | "repeat" | "clap";

interface Options {
  run: number;
  zone: { id: string; group: Object3D };
  host: TalkActor;
  cast: readonly TalkActor[];
  people: readonly TalkActor[];
  extras: readonly GameCharacter[];
  authoredCast?: readonly string[];
  player: GameCharacter;
  audio: Voice;
  free(actor: TalkActor): boolean;
}

interface Participant {
  actor: TalkActor;
  pose?: Pose;
  personality: ReturnType<typeof talkPersonality>;
  lastBeat?: GestureRequest;
}

/** One presentation per live 3D situation. The game continues to own movement, turns and the camera. */
export class NaturalSession {
  private readonly anchors;
  private readonly participants = new Map<string, Participant>();
  private readonly cast: Participant[];
  private readonly player: Participant;
  private bystander?: Participant;
  private current?: Participant;
  private shown = false;
  releasing = false;
  private phase?: ConvUI["phase"];
  private npcId?: string;
  private speaking?: number | null;
  private observedOwner?: VoiceVisualOwner;
  private voice?: VoiceVisualOwner;
  private line: number | null = null;
  private lastLine: number | null = null;
  private skipLine: number | null = null;
  private skipOwner?: VoiceVisualOwner;
  private pending?: { line: number; peer: Participant; cue: ClassifiedCue };
  private cueLine: number | null = null;
  private time = 0;
  private armAt = -Infinity;
  private bystanderAt = Infinity;
  private bystanderSeed = 0;
  private readonly world = new Vector3();
  private readonly target = new Vector3();
  private completion?: Participant;
  private farewell = false;
  private reaction?: { peer: Participant; kind: "understood" | "puzzled" | "repeat" | "farewell"; sequence: number };
  private sequence = 0;
  private readonly uninspect?: () => void;

  constructor(private readonly options: Options) {
    this.anchors = talkRoomAnchors(options.zone.id, options.zone.group);
    this.player = this.participant({ id: "player", ch: options.player });
    for (const actor of options.cast) this.participants.set(actor.id, this.participant(actor));
    this.cast = Array.from(this.participants.values());
    this.current = this.participants.get(options.host.id);
    this.bystander = this.findBystander();
    if (this.bystander) {
      const first = this.chance(this.bystander, 1, 0);
      this.bystanderSeed = first * 0x100000000;
      this.bystanderAt = 6 + 4 * first;
    }
    if (import.meta.env.DEV) this.uninspect = inspectTalkNatural(() => this.sample(), 1);
  }

  get speaker() { return this.shown && this.validPeer(this.current) ? this.current.actor.ch : undefined; }

  private participant(actor: TalkActor): Participant {
    return { actor, personality: talkPersonality(actor.id) };
  }

  private findBystander() {
    const { host, people, extras, authoredCast, free } = this.options;
    host.ch.root.getWorldPosition(this.target);
    let nearest: TalkActor | undefined, best = 4.5 ** 2;
    const consider = (actor: TalkActor) => {
      const ch = actor.ch;
      if (!ch.root.visible || ch.anim !== "idle" || ch.busy || ch.talkPose) return;
      ch.root.getWorldPosition(this.world);
      const distance = this.world.distanceToSquared(this.target);
      if (distance >= best) return;
      const yaw = Math.atan2(this.target.x - this.world.x, this.target.z - this.world.z) - ch.root.rotation.y;
      if (Math.cos(yaw) < Math.cos(65 * Math.PI / 180)) return;
      nearest = actor;
      best = distance;
    };
    for (const actor of people) {
      if (!this.participants.has(actor.id) && !authoredCast?.includes(actor.id) && free(actor)) consider(actor);
    }
    for (let i = 0; i < extras.length; i++) consider({ id: `nearby:${i}`, ch: extras[i] });
    return nearest && this.participant(nearest);
  }

  private validPeer(peer?: Participant): peer is Participant {
    return !!peer?.pose?.active && peer.actor.ch.root.visible;
  }

  private bind(peer: Participant, role: TalkRole, counter = false) {
    const ch = peer.actor.ch;
    if (ch.talkPose && !ch.talkPose.releasing || !ch.root.parent || !ch.root.visible) return;
    const counterY = counter ? talkCounterHeight(this.anchors, ch.root.getWorldPosition(this.world)) : undefined;
    peer.pose = bindConversationPose(ch, { audio: this.options.audio, role, counterY });
  }

  private peer(id: string, ch?: GameCharacter) {
    let peer = this.participants.get(id);
    if (peer && !this.options.free(peer.actor)) return;
    if (!peer) {
      const actor = this.options.people.find((p) => p.id === id && (!ch || p.ch === ch));
      if (!actor || !this.options.free(actor)) return;
      if (this.bystander?.actor.ch === actor.ch) {
        this.bystander.pose?.interrupt();
        this.bystander = undefined;
        this.bystanderAt = Infinity;
      }
      peer = this.participant(actor);
      this.participants.set(id, peer);
      this.cast.push(peer);
    }
    if (ch && peer.actor.ch !== ch) return;
    if (!peer.pose) this.bind(peer, "cast", true);
    return this.validPeer(peer) ? peer : undefined;
  }

  present(conv: ConvUI, allowCurrent: boolean) {
    this.shown = true;
    this.phase = undefined;
    if (!allowCurrent) this.discardPending(conv);
    for (const peer of this.cast) {
      if (this.options.free(peer.actor)) this.bind(peer, "cast", true);
    }
    this.bind(this.player, "learner");
    if (this.bystander) this.bind(this.bystander, "bystander");
    this.update(conv, 0);
  }

  discardPending(conv: ConvUI) {
    this.pending = this.completion = undefined;
    this.skipLine = conv.speaking;
    this.skipOwner = this.options.audio.visualOwner;
  }

  suspend() {
    this.shown = false;
    this.pending = this.completion = this.voice = undefined;
    this.interruptActors();
    this.nextBystander();
  }

  close() {
    this.releasing = true;
    this.shown = false;
    this.pending = this.completion = this.voice = this.observedOwner = this.skipOwner = undefined;
    for (const peer of this.cast) peer.pose?.release();
    this.player.pose?.release();
    this.bystander?.pose?.release();
  }

  private interruptActors() {
    for (const peer of this.cast) { peer.pose?.interrupt(); peer.pose = undefined; }
    this.player.pose?.interrupt(); this.player.pose = undefined;
    this.bystander?.pose?.interrupt();
    if (this.bystander) this.bystander.pose = undefined;
  }

  dispose() {
    this.shown = this.releasing = false;
    this.interruptActors();
    if (import.meta.env.DEV) this.uninspect?.();
  }

  private hasPose() {
    // A hidden actor still owns its pose until the release or an interrupt detaches it.
    if (this.player.pose?.active || this.bystander?.pose?.active) return true;
    for (let i = 0; i < this.cast.length; i++) {
      if (this.cast[i].pose?.active) return true;
    }
    return false;
  }

  feedback(id: string, kind: SessionReaction) {
    if (!this.shown) return;
    const peer = this.peer(id);
    if (!peer) return;
    if (kind === "clap") {
      if (!this.farewell && !peer.pose?.reduced) this.completion = peer;
      return;
    }
    const response = kind === "nod" ? "understood" : kind;
    if (peer.pose?.react(response === "understood" ? response : "repeat", this.chance(peer, this.line ?? 0, this.sequence) < 0.5 ? -1 : 1)) {
      this.reaction = { peer, kind: response, sequence: ++this.sequence };
    }
  }

  private chance(peer: Participant, line: TalkLineId, salt: number) {
    return lineSeed(peer.actor.id, this.options.run, line, salt);
  }

  private readTurn(conv: ConvUI, owner: VoiceVisualOwner | undefined) {
    const replay = owner?.replay === "transcript" && typeof owner.line === "number";
    const line = replay ? owner.line as number : conv.phase === "npc" ? conv.speaking : null;
    const entry = line !== null ? conv.transcript.find((l) => l.id === line && l.who === "npc") : undefined;
    const peer = this.peer(entry?.npc ?? conv.npcId, replay ? owner.actor : undefined);
    const voice = peer && owner?.line === line && owner.actor === peer.actor.ch ? owner : undefined;
    const speaker = entry && peer ? peer : undefined;
    const previousLine = this.line;
    const previousVoice = this.voice;
    this.current = peer ?? this.participants.get(this.options.host.id);
    this.line = speaker ? line : null;
    if (this.line !== null) this.lastLine = this.line;
    this.voice = voice ?? (speaker && !replay && previousLine === line && previousVoice?.actor === speaker.actor.ch ? previousVoice : undefined);
    for (const other of this.cast) {
      const role = conv.phase === "ended" ? "closing" : conv.phase === "you" ? "listening" : "thinking";
      if (other !== speaker) other.pose?.setRole(role);
    }
    this.player.pose?.setRole(conv.phase === "ended" ? "closing" : "learner");
    if (!speaker || !entry?.sentence || line === null) {
      this.pending = undefined;
      return;
    }
    speaker.pose?.speak(line, this.voice ?? null);
    if (replay) {
      this.pending = undefined;
      if (voice && voice !== previousVoice && voice !== this.skipOwner && conv.phase !== "ended") this.feedback(speaker.actor.id, "repeat");
      return;
    }
    if (line === this.cueLine) return;
    this.cueLine = line;
    this.pending = undefined;
    if (line === this.skipLine || speaker.pose?.reduced) return;
    const opening = conv.transcript.find((l) => l.who === "npc" && l.npc === entry.npc)?.id === line;
    const cue = classifyTalk(entry.sentence.say, this.options.zone.id, opening, conv.stepId === "closing", !!owner?.replay);
    this.pending = { line, peer: speaker, cue };
  }

  private closingBeat(peer: Participant, line: TalkLineId, delay: number) {
    if (this.farewell) return;
    this.farewell = true;
    this.completion = undefined;
    const pose = peer.pose;
    if (!pose) return;
    let kind = peer.personality.farewell;
    if ((kind === "wave" && !pose.canWave) || (kind === "heart" && pose.armOpportunity === 0) ||
      this.time + delay - this.armAt < 1.6) kind = "yes";
    const side = this.chance(peer, line, 4) < 0.5 ? -1 : 1;
    if (pose.react(kind, side, delay)) {
      if (kind !== "yes") this.armAt = this.time + delay;
      this.reaction = { peer, kind: "farewell", sequence: ++this.sequence };
    }
  }

  private playCue(elapsed: number) {
    const pending = this.pending;
    if (!pending) return;
    this.pending = undefined;
    const { peer, cue, line } = pending, pose = peer.pose;
    if (!pose || pose.reduced) return;
    const point = cue.anchor && this.anchors[cue.anchor];
    const glanceAt = 0.25 + 0.30 * this.chance(peer, line, 1);
    if (point && elapsed <= glanceAt) pose.glanceAt(point, glanceAt - elapsed, 0.19, cue.anchor);
    // Late hydration can join the look and the lips at the current time.
    if (elapsed > 0.12) {
      if (cue.family === "goodbye") { this.farewell = true; this.completion = undefined; }
      return;
    }
    const delay = Math.max(0, 0.05 + 0.17 * this.chance(peer, line, 2) - elapsed);
    if (cue.family === "goodbye") { this.closingBeat(peer, line, delay); return; }
    if (cue.family === "rest" || cue.family === "repeat") return;
    const inLearnerFrame = -Math.cos(this.options.player.root.rotation.y - peer.actor.ch.root.rotation.y) >= 0 ? 1 : -1;
    let side: -1 | 1 = cue.side ? (cue.side === inLearnerFrame ? 1 : -1) : this.chance(peer, line, 3) < 0.5 ? -1 : 1;
    let kind: GestureRequest["kind"] = cue.family;
    const arms = kind !== "yes" && kind !== "no";
    if (arms && (this.time + delay - this.armAt < 1.6 ||
      this.chance(peer, line, 5) >= peer.personality.armChance * pose.armOpportunity || kind === "greeting" && !pose.canWave)) {
      if (kind === "greeting" || kind === "offer") kind = "headGreeting";
      else return;
    }
    const last = peer.lastBeat;
    if (last?.kind === kind && last.count === cue.quantity && last.side === side) {
      if (cue.side || kind === "yes" || kind === "headGreeting") return;
      side = side === 1 ? -1 : 1;
    }
    const gesture = { kind, side, count: cue.quantity, delay, directional: !!cue.side };
    peer.lastBeat = gesture;
    if (arms && kind !== "headGreeting") this.armAt = this.time + delay;
    pose.gestureForLine(line, gesture);
  }

  private nextBystander() {
    if (!this.bystander) return;
    // Advance the session's seeded 32-bit linear congruential generator once per interval.
    this.bystanderSeed = (Math.imul(1664525, this.bystanderSeed) + 1013904223) >>> 0;
    this.bystanderAt = this.time + 6 + 4 * (this.bystanderSeed / 0x100000000);
  }

  /** Runs before the existing character updates. Store reads do not schedule React work. */
  update(conv: ConvUI, dt: number) {
    if (this.releasing) return this.hasPose();
    if (!this.shown) return true;
    if (!conv.active || conv.run !== this.options.run) return false;
    this.time += dt;
    const owner = this.options.audio.visualOwner;
    if (this.phase !== conv.phase || this.npcId !== conv.npcId || this.speaking !== conv.speaking || this.observedOwner !== owner) {
      this.phase = conv.phase;
      this.npcId = conv.npcId;
      this.speaking = conv.speaking;
      this.observedOwner = owner;
      this.readTurn(conv, owner);
    }
    if (this.pending && this.voice && this.options.audio.visualState(this.voice) === "playing") {
      this.playCue(this.options.audio.visualElapsed(this.voice));
    }
    if (conv.phase === "ended" && this.completion) this.closingBeat(this.completion, this.lastLine ?? 0, 0);
    if (this.time >= this.bystanderAt) {
      const speaker = this.speaker, peer = this.bystander, pose = peer?.pose;
      if (speaker && pose && conv.phase !== "ended" && this.validPeer(peer) && this.options.free(peer.actor)) {
        speaker.headJoint.getWorldPosition(this.target);
        pose.glanceAt(this.target, 0, 0.31, speaker === this.current?.actor.ch ? this.current.actor.id : "speaker");
      }
      this.nextBystander();
    }
    return true;
  }

  private sample() {
    if (!import.meta.env.DEV) return null;
    if ((!this.shown && !this.releasing) || !this.hasPose()) return null;
    const current = this.current, voice = this.voice, audio = this.options.audio;
    const speakerId = current?.actor.id ?? null;
    const snapshot = (peer: Participant | undefined, watch: string | null) =>
      peer ? snapshotActor(peer.pose, peer.actor.id, watch) : null;
    const reaction = this.reaction;
    const applied = snapshot(current, "learner");
    return {
      version: 1, scope: "session", run: this.options.run, actorId: this.options.host.id, speakerId,
      lineId: this.line ?? this.lastLine, speakingLineId: this.releasing ? null : this.line,
      phase: this.releasing ? "released" : this.phase, playback: voice ? audio.visualState(voice) : "idle",
      elapsed: voice && audio.visualOwner === voice ? audio.visualElapsed(voice) : null,
      requestId: voice ? inspectedRequest(voice) : null, requestOwned: !!voice && audio.visualOwner === voice,
      listening: this.phase === "you" && !this.releasing, reduced: applied?.reduced ?? false,
      envelope: applied?.envelope ?? null, mouth: applied?.mouth ?? 0, blink: applied?.blink ?? 0,
      gesture: applied?.gesture ?? null, gestureWeight: applied?.gestureWeight ?? 0,
      gaze: applied?.gaze ?? null, listeningWeight: applied?.listeningWeight ?? 0, deltas: applied?.deltas ?? null,
      reaction: reaction ? { actorId: reaction.peer.actor.id, kind: reaction.kind, sequence: reaction.sequence,
        weight: (reaction.kind === "farewell" ? reaction.peer.pose?.applied.gestureWeight : reaction.peer.pose?.applied.reactionWeight) ?? 0 } : null,
      speaker: applied, player: snapshot(this.player, speakerId), bystander: snapshot(this.bystander, "learner"),
      others: this.cast.filter((p) => p !== current).map((p) => snapshot(p, "learner")).filter(Boolean),
    };
  }
}
