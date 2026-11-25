import { Vector3, type Object3D } from "three";
import { classifyTalk, talkPersonality } from "../../content/talkNatural";
import type { ConvUI, TranscriptLine } from "../../state/store";
import type { AudioSystem } from "../audio";
import type { GameCharacter } from "../characters";
import { talkRoomAnchors } from "../world/talkNatural";
import type { ClassifiedCue, VoiceVisualOwner } from "./contract";
import type { SessionReaction } from "./feedback";
import { inspectTalkNatural, inspectedRequest } from "./inspection";
import { bindConversationPose, type GestureRequest, type TalkRole } from "./pose";
import { lineSeed, talkRandom } from "./seed";

export interface TalkActor { id: string; ch: GameCharacter }
type Pose = NonNullable<ReturnType<typeof bindConversationPose>>;
type Voice = Pick<AudioSystem, "visualOwner" | "visualState" | "visualElapsed" | "readVisualEnvelope">;
const CUE_WINDOW = 0.24;

export interface NaturalOptions {
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
  idleWorkHands?(actor: TalkActor): boolean;
}

interface Peer {
  actor: TalkActor;
  pose?: Pose;
  style: ReturnType<typeof talkPersonality>;
  random: () => number;
  lastStroke?: { serial: number; kind: ClassifiedCue["family"]; side?: -1 | 1; straight?: true; count?: number };
}

export function mountedTalkActor(ch: GameCharacter) {
  if (!ch.root.parent) return false;
  for (let node: Object3D | null = ch.root; node; node = node.parent) if (!node.visible) return false;
  return true;
}

/** The staged rigs follow the existing turn, camera and playback owners. */
export class NaturalSession {
  private readonly anchors;
  private readonly cast: Peer[];
  private readonly extras: TalkActor[];
  private readonly observerRandom: () => number;
  private bystander?: Peer;
  private observerReduced = false;
  private readonly player: Peer;
  private current?: Peer;
  private shown = false;
  releasing = false;
  private phase?: ConvUI["phase"];
  private observedLine?: number | null;
  private observedNpc?: string;
  private observedOwner?: VoiceVisualOwner;
  private voice?: VoiceVisualOwner;
  private line: number | null = null;
  private lastLine: number | null = null;
  private skipLine: number | null = null;
  private skipOwner?: VoiceVisualOwner;
  private cueLine: number | null = null;
  private readonly openings = new Map<string, number>();
  private serial = 0;
  private pending?: { line: number; peer: Peer; cue: ClassifiedCue; at: number; entry: TranscriptLine };
  private time = 0;
  private armAt = -Infinity;
  private bystanderAt = Infinity;
  private bystanderUntil = Infinity;
  private completion?: Peer;
  private farewell = false;
  private reaction?: { peer: Peer; kind: "understood" | "puzzled" | "repeat" | "farewell"; sequence: number };
  private sequence = 0;
  private readonly uninspect?: () => void;
  private readonly world = new Vector3();
  private readonly target = new Vector3();
  private readonly forward = new Vector3();
  private readonly learnerHead = new Vector3();
  private readonly speakerHead = new Vector3();
  private readonly watchAt = new Vector3();
  private readonly watchFrom = new Vector3();
  private watchAge = 0;
  private attention?: Peer;

  constructor(private readonly options: NaturalOptions) {
    this.anchors = talkRoomAnchors(options.zone.id, options.zone.group);
    this.player = this.makePeer({ id: "player", ch: options.player });
    this.cast = options.cast.map((actor) => this.makePeer(actor));
    this.current = this.cast.find(({ actor }) => actor === options.host);
    this.extras = options.extras.map((ch, i) => ({ id: `nearby:${i}`, ch }));
    this.observerRandom = talkRandom(lineSeed(options.host.id, options.run, 0, 10));
    this.scheduleBystander();
    if (import.meta.env.DEV) this.uninspect = inspectTalkNatural(() => this.sample());
  }

  private makePeer(actor: TalkActor): Peer {
    return { actor, style: talkPersonality(actor.id), random: talkRandom(lineSeed(actor.id, this.options.run, 0, 9)) };
  }

  private findBystander(speaker: Peer) {
    const { people, authoredCast, free } = this.options;
    speaker.actor.ch.root.getWorldPosition(this.target);
    let nearest: TalkActor | undefined, best = 4.5 ** 2;
    const consider = (actor: TalkActor) => {
      const ch = actor.ch;
      if (!free(actor) || !this.canObserve(ch)) return;
      ch.root.getWorldPosition(this.world);
      const distance = this.target.distanceToSquared(this.world);
      if (distance >= best) return;
      this.forward.set(0, 0, 1).transformDirection(ch.root.matrixWorld);
      this.world.subVectors(this.target, this.world).normalize();
      if (this.forward.dot(this.world) < Math.cos(65 * Math.PI / 180)) return;
      nearest = actor;
      best = distance;
    };
    for (const actor of people) {
      if (!this.cast.some((peer) => peer.actor === actor) && !authoredCast?.includes(actor.id)) consider(actor);
    }
    for (const actor of this.extras) consider(actor);
    return nearest;
  }

  private canObserve(ch: GameCharacter) {
    return mountedTalkActor(ch) && (ch.anim === "idle" || ch.anim === "sit") && !ch.busy &&
      !ch.handsOccupied && !ch.rightHand.children.length && (!ch.talkPose || ch.talkPose === this.bystander?.pose) &&
      ch.canNoticeTalk?.() !== false && !ch.naturalRig?.()?.carry;
  }

  private getPeer(id: string, ch?: GameCharacter) {
    const peer = this.cast.find(({ actor }) => actor.id === id && (!ch || ch === actor.ch));
    if (peer && this.options.free(peer.actor) && mountedTalkActor(peer.actor.ch)) {
      this.bind(peer, "cast");
      return peer.pose?.active ? peer : undefined;
    }
  }

  private bind(peer: Peer, role: TalkRole) {
    const ch = peer.actor.ch;
    if ((ch.talkPose && !ch.talkPose.releasing) || !mountedTalkActor(ch)) return;
    const counter = role === "cast" && this.anchors.counter?.withinReach(ch.root.getWorldPosition(this.world)) ? this.anchors.counter : undefined;
    peer.pose = bindConversationPose(ch, {
      audio: this.options.audio, role, random: peer.random, counterY: counter?.center.y,
      counterContains: counter?.contains, idleWorkHands: role === "cast" && this.options.idleWorkHands?.(peer.actor),
    });
  }

  present(conv: ConvUI, allowCurrent: boolean) {
    if (!this.options.free(this.options.host) || !mountedTalkActor(this.options.host.ch)) return;
    this.shown = true;
    this.phase = undefined;
    if (!allowCurrent) this.discardPending(conv);
    for (const entry of conv.transcript) {
      if (entry.who === "npc" && entry.npc && !this.openings.has(entry.npc)) this.openings.set(entry.npc, entry.id);
    }
    for (const peer of this.cast) {
      if (this.options.free(peer.actor)) this.bind(peer, "cast");
    }
    this.bind(this.player, "learner");
    this.update(conv, 0);
  }

  discardPending(conv: ConvUI) {
    this.pending = this.completion = undefined;
    this.current?.pose?.discardReadablePoint();
    this.skipLine = conv.speaking;
    this.skipOwner = this.options.audio.visualOwner;
  }

  /** The camera owns aim. Drop the old voice before either actor runs its next pose update. */
  aim(id: string) {
    if (!this.shown || this.current?.actor.id === id) return;
    this.current?.pose?.setRole("cast");
    this.voice = this.pending = undefined;
    this.observedNpc = undefined;
  }

  suspend() {
    this.shown = false;
    this.pending = this.completion = this.voice = undefined;
    this.reaction = undefined;
    this.attention = undefined;
    this.interruptActors();
    this.bystanderUntil = Infinity;
    this.scheduleBystander();
  }

  close() {
    this.releasing = true;
    this.shown = false;
    this.pending = this.completion = this.voice = this.observedOwner = this.skipOwner = undefined;
    for (const peer of this.cast) peer.pose?.release();
    this.player.pose?.release();
    this.bystander?.pose?.release();
  }

  dispose() {
    this.shown = this.releasing = false;
    this.interruptActors();
    if (import.meta.env.DEV) this.uninspect?.();
  }

  private interruptActors() {
    for (const peer of this.cast) peer.pose?.interrupt();
    this.player.pose?.interrupt();
    this.bystander?.pose?.interrupt();
  }

  private hasPose() {
    if (this.player.pose?.active || this.bystander?.pose?.active) return true;
    for (let i = 0; i < this.cast.length; i++) if (this.cast[i].pose?.active) return true;
    return false;
  }

  feedback(id: string, kind: SessionReaction) {
    if (!this.shown) return;
    const peer = this.getPeer(id);
    if (!peer) return;
    if (kind === "clap") {
      if (!this.farewell && !peer.pose?.reduced) this.completion = peer;
      return;
    }
    const response = kind === "nod" ? "understood" : kind;
    if (peer.pose?.react(response === "understood" ? response : "repeat",
      lineSeed(id, this.options.run, this.line ?? this.lastLine ?? 0, this.sequence) < 0.5 ? -1 : 1)) {
      this.reaction = { peer, kind: response, sequence: ++this.sequence };
    }
  }

  private readTurn(conv: ConvUI, owner?: VoiceVisualOwner) {
    const replay = owner?.replay === "transcript" && typeof owner.line === "number";
    const line = replay ? owner.line as number : conv.phase === "npc" ? conv.speaking : null;
    const entry = line === null ? undefined : conv.transcript.find((l) => l.id === line && l.who === "npc");
    const peer = this.getPeer(entry?.npc ?? conv.npcId, replay ? owner.actor : undefined);
    const speaker = entry?.sentence && peer ? peer : undefined;
    const previousVoice = this.voice;
    this.current = peer ?? this.getPeer(conv.npcId) ?? this.getPeer(this.options.host.id);
    this.line = speaker ? line : null;
    if (this.line !== null) this.lastLine = this.line;
    this.voice = speaker && owner?.line === line && owner.actor === speaker.actor.ch ? owner : undefined;
    const role = conv.phase === "ended" ? "closing" : conv.phase === "you" ? "listening" : "thinking";
    for (const other of this.cast) if (other !== speaker) other.pose?.setRole(role);
    this.player.pose?.setRole(conv.phase === "ended" ? "closing" : "learner");

    if (!speaker || !entry?.sentence || line === null) {
      this.pending = undefined;
      return;
    }
    const repeated = replay || entry.acting?.replay || this.voice?.replay === "turn";
    if (repeated) {
      this.pending = undefined;
      speaker.pose?.discardReadablePoint();
    }
    speaker.pose?.speak(line, this.voice ?? null, undefined, !repeated);
    if (replay) {
      this.pending = undefined;
      if (this.voice && this.voice !== previousVoice && this.voice !== this.skipOwner && conv.phase !== "ended") {
        this.feedback(speaker.actor.id, "repeat");
      }
      return;
    }
    if (line === this.cueLine) return;
    this.cueLine = line;
    this.pending = undefined;
    this.serial++;
    const id = speaker.actor.id;
    if (!this.openings.has(id)) this.openings.set(id, line);
    if (line === this.skipLine || speaker.pose?.reduced || repeated) return;
    const cue = classifyTalk(entry.sentence.say, this.options.zone.id, this.openings.get(id) === line,
      conv.stepId === "closing");
    this.pending = { line, peer: speaker, cue, at: this.time, entry };
  }

  private signOff(peer: Peer, line: number, delay: number, textOnly = false) {
    if (this.farewell) return;
    this.farewell = true;
    this.completion = undefined;
    const pose = peer.pose;
    if (!pose) return;
    let kind: typeof peer.style.farewell | "headGreeting" = peer.style.farewell;
    if (!pose.canWave || this.time + delay - this.armAt < 1.6 ||
      lineSeed(peer.actor.id, this.options.run, line, 5) >= peer.style.armChance) kind = peer.style.directs ? "headGreeting" : "yes";
    const side = lineSeed(peer.actor.id, this.options.run, line, 4) < 0.5 ? -1 : 1;
    if (pose.react(kind, side, delay, line, textOnly && peer.style.directs)) {
      if (kind === "wave" || kind === "heart") this.armAt = this.time + delay;
      this.reaction = { peer, kind: "farewell", sequence: ++this.sequence };
    }
  }

  private glance(peer: Peer, cue: ClassifiedCue, delay: number, hold: number) {
    if (!cue.anchor) return;
    let point = this.anchors[cue.anchor];
    if (cue.anchor === "handoff") {
      const { ch } = peer.actor;
      const counter = this.anchors.counter;
      ch.headJoint.getWorldPosition(this.world);
      this.forward.set(0, 0, 1).transformDirection(ch.root.matrixWorld);
      point = counter?.handoff(this.world, this.forward, this.target) ? this.target : undefined;
    }
    if (point) peer.pose?.glanceAt(point, delay, hold, cue.anchor);
  }

  private playCue(elapsed: number, textOnly = false) {
    const pending = this.pending;
    if (!pending) return;
    this.pending = undefined;
    const { peer, cue, line } = pending, pose = peer.pose;
    if (!pose?.active || pose.reduced || peer !== this.current || !mountedTalkActor(peer.actor.ch) ||
      this.voice?.replay || cue.family === "repeat") return;
    const { ch, id } = peer.actor;
    const run = this.options.run;
    const glanceAt = 0.25 + 0.30 * lineSeed(id, run, line, 1);
    if (elapsed <= glanceAt) this.glance(peer, cue, glanceAt - elapsed, 0.26 + 0.16 * lineSeed(id, run, line, 6));
    if (elapsed > CUE_WINDOW) {
      if (cue.family === "goodbye") { this.farewell = true; this.completion = undefined; }
      return;
    }
    if (cue.family === "rest") return;
    const delay = textOnly ? 0 : Math.max(0, 0.05 + 0.17 * lineSeed(id, run, line, 2) - elapsed);
    if (cue.family === "goodbye") { this.signOff(peer, line, delay, textOnly); return; }
    const last = peer.lastStroke;
    if (last?.serial === this.serial - 1 && last.kind === cue.family && last.side === cue.side &&
      last.straight === cue.straight && last.count === cue.quantity) {
      last.serial = this.serial;
      return;
    }
    peer.lastStroke = { serial: this.serial, kind: cue.family, side: cue.side, straight: cue.straight, count: cue.quantity };

    let side: -1 | 1 = lineSeed(id, run, line, 3) < 0.5 ? -1 : 1;
    if (cue.side) {
      ch.root.getWorldPosition(this.world);
      this.options.player.root.getWorldPosition(this.target);
      this.target.sub(this.world);
      this.forward.set(1, 0, 0).transformDirection(ch.root.matrixWorld);
      // Learner-right when looking towards the speaker, projected onto the actor's own lateral axis.
      const direction = this.target.z * this.forward.x - this.target.x * this.forward.z;
      side = direction >= 0 ? cue.side : cue.side === 1 ? -1 : 1;
    }
    let kind: GestureRequest["kind"] = cue.family;
    const wantsArm = kind !== "yes" && kind !== "no";
    const routePoint = peer.style.directs && kind === "point" && (cue.side || cue.straight);
    const allowed = peer.style.directs ? routePoint : lineSeed(id, run, line, 5) < peer.style.armChance;
    const opportunity = pose.armOpportunity;
    const arms = wantsArm && opportunity > 0 && this.time + delay - this.armAt >= 1.6 &&
      allowed && (kind !== "greeting" || pose.canWave);
    if (wantsArm && !arms) {
      if (kind === "greeting" || kind === "offer" || peer.style.directs) kind = "headGreeting";
      else return;
    }
    // Carry the existing point high enough to read above the portrait panel, using the free arm.
    const strength = routePoint && arms ? 1.2 / opportunity : peer.style.smallGreeting && kind === "greeting" ? 0.53 : 1;
    if (pose.gestureForLine(line, { kind, side, count: cue.quantity, delay, directional: !!cue.side && !cue.straight,
      straight: cue.straight, strength,
      smile: peer.style.quickSmile && (kind === "greeting" || kind === "offer"),
      readable: textOnly && (kind === "point" || (peer.style.directs && cue.family === "point")) })) {
      if (arms) this.armAt = this.time + delay;
    }
  }

  private scheduleBystander() {
    this.bystanderAt = this.time + 6 + 4 * this.observerRandom();
  }

  private observe(edge: boolean, ended: boolean) {
    const reduced = this.player.pose?.reduced ?? false;
    if (reduced !== this.observerReduced) {
      this.observerReduced = reduced;
      this.bystanderUntil = reduced ? Infinity : this.time;
      edge = true;
    }
    if (this.time >= this.bystanderUntil || (ended && edge && !reduced)) {
      this.bystander?.pose?.release(0.16);
      this.bystanderUntil = Infinity;
    }
    const due = !ended && this.time >= this.bystanderAt;
    if (!edge && !due) return;
    if (due) this.scheduleBystander();
    if (!this.current?.pose?.active || this.bystanderUntil !== Infinity || (!reduced && this.bystander?.pose?.active)) return;
    const candidate = this.findBystander(this.current);
    if (candidate !== this.bystander?.actor) {
      this.bystander?.pose?.interrupt();
      this.bystander = candidate ? this.makePeer(candidate) : undefined;
    }
    const peer = this.bystander;
    if (!peer || (!reduced && !due)) return;
    this.bind(peer, "bystander");
    if (reduced) return;
    const hold = 0.26 + 0.08 * peer.random();
    if (peer.pose?.glanceAt(this.speakerHead, 0, hold, this.current.actor.id)) this.bystanderUntil = this.time + 0.43 + hold;
    else peer.pose?.interrupt();
  }

  private aimEyes(dt: number) {
    const current = this.current, learner = this.player.actor.ch;
    if (!current?.pose?.active) return;
    const learnerVisible = mountedTalkActor(learner);
    current.actor.ch.headJoint.getWorldPosition(this.speakerHead);
    if (learnerVisible) learner.headJoint.getWorldPosition(this.learnerHead);
    if (this.attention !== current) {
      this.watchFrom.copy(this.attention ? this.watchAt : this.speakerHead);
      this.attention = current;
      this.watchAge = 0;
    }
    this.watchAge = Math.min(0.10, this.watchAge + dt);
    this.watchAt.lerpVectors(this.watchFrom, this.speakerHead, this.watchAge / 0.10);
    if (this.player.pose) this.player.pose.watch = learnerVisible ? this.watchAt : null;
    for (let i = 0; i < this.cast.length; i++) {
      const peer = this.cast[i], pose = peer.pose;
      if (pose?.active) pose.watch = peer !== current && this.line !== null ? this.speakerHead
        : learnerVisible ? this.learnerHead : null;
    }
  }

  update(conv: ConvUI, dt: number) {
    if (this.releasing) return this.hasPose();
    if (!this.shown) return true;
    if (!conv.active || conv.run !== this.options.run) return false;
    this.time += dt;
    const owner = this.options.audio.visualOwner;
    const edge = conv.phase !== this.phase || conv.speaking !== this.observedLine || conv.npcId !== this.observedNpc;
    if (edge || owner !== this.observedOwner) {
      this.phase = conv.phase;
      this.observedLine = conv.speaking;
      this.observedNpc = conv.npcId;
      this.observedOwner = owner;
      this.readTurn(conv, owner);
    }
    this.aimEyes(dt);
    const pending = this.pending;
    if (pending) {
      const acting = pending.entry.acting;
      const voice = this.voice;
      const state = voice && this.options.audio.visualState(voice);
      if (acting?.replay) {
        pending.peer.pose?.discardReadablePoint();
        this.pending = undefined;
      } else if (voice && (state === "playing" || state === "muted")) this.playCue(this.options.audio.visualElapsed(voice));
      else if (state === "unavailable" || (!owner && acting?.unavailable)) {
        const age = acting ? (performance.now() - acting.at) / 1000 : 0;
        this.playCue(Math.max(age, this.time - pending.at), true);
      }
    }
    const ended = conv.phase === "ended";
    if (ended && this.completion) this.signOff(this.completion, this.lastLine ?? 0, 0);
    this.observe(edge, ended);
    return true;
  }

  sample() {
    if (!import.meta.env.DEV || (!this.shown && !this.releasing) || !this.hasPose()) return null;
    const snapshot = (peer?: Peer, watch?: string) => {
      const a = peer?.pose?.applied;
      return peer && a?.active ? {
        ...a, actorId: peer.actor.id, identity: peer.actor.ch.root.uuid, deltas: { ...a.deltas },
        gaze: { target: a.gazeTarget ?? (a.watching ? watch ?? null : null), yaw: a.gazeYaw, pitch: a.gazePitch, eyeX: a.gazeEyeX, eyeY: a.gazeEyeY },
        listening: a.role === "listening" || a.role === "thinking", envelope: a.level !== null && a.level >= 0 ? a.level : null,
      } : null;
    };
    const { audio, run, host, zone } = this.options;
    const { voice, current, reaction } = this;
    const speakerId = current?.actor.id ?? null;
    const speaker = snapshot(current, "learner");
    return {
      version: 1, scope: "session", run, room: zone.id, actorId: host.id, speakerId,
      lineId: this.line ?? this.lastLine, speakingLineId: this.releasing ? null : this.line,
      phase: this.releasing ? "released" : this.phase, mode: "talk", role: speaker?.role ?? null,
      playback: voice ? audio.visualState(voice) : "idle", elapsed: voice && audio.visualOwner === voice ? audio.visualElapsed(voice) : null,
      requestId: voice ? inspectedRequest(voice) : null, requestOwned: !!voice && audio.visualOwner === voice,
      listening: this.phase === "you" && !this.releasing, reduced: speaker?.reduced ?? false,
      envelope: speaker?.envelope ?? null, mouth: speaker?.mouth ?? 0, blink: speaker?.blink ?? 0,
      gesture: speaker?.gesture ?? null, gestureWeight: speaker?.gestureWeight ?? 0, gaze: speaker?.gaze ?? null,
      listeningWeight: speaker?.listeningWeight ?? 0, deltas: speaker?.deltas ?? null,
      timers: { time: this.time, armAt: this.armAt, bystanderAt: this.bystanderAt, aim: this.watchAge },
      reaction: reaction ? { actorId: reaction.peer.actor.id, kind: reaction.kind, sequence: reaction.sequence,
        weight: (reaction.kind === "farewell" ? reaction.peer.pose?.applied.gestureWeight : reaction.peer.pose?.applied.reactionWeight) ?? 0 } : null,
      speaker, player: snapshot(this.player, speakerId ?? undefined), bystander: snapshot(this.bystander),
      others: this.cast.filter((peer) => peer !== current).map((peer) => snapshot(peer, this.line === null ? "learner" : speakerId ?? undefined)).filter(Boolean),
    };
  }
}
