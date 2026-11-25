import { Vector3 } from "three";
import { classifyTalk, talkPersonality } from "../../content/talkNatural";
import type { AudioSystem } from "../audio";
import type { GameCharacter } from "../characters";
import { talkRoomAnchors } from "../world/talkNatural";
import { mounted, type ActingLine, type ActingTurn, type VoiceMouth } from "./binding";
import { inspectTalkNatural, inspectedRequest, snapshotActor } from "./inspection";
import type { PoseEntry } from "./entry";
import { bindConversationPose, type GestureRequest } from "./pose";
import { lineSeed, talkRandom } from "./seed";

type Pose = NonNullable<ReturnType<typeof bindConversationPose>>;
let nextRun = 0;

export function presentExchange(turn: ActingTurn, mouth: VoiceMouth, audio: AudioSystem, entry?: PoseEntry, entryAge = 0) {
  const { actor, id, zone, scope = "mode" } = turn.target;
  const run = ++nextRun;
  const personality = talkPersonality(id);
  const anchors = zone && talkRoomAnchors(zone.id, zone.group);
  const origin = new Vector3();
  const counter = anchors?.counter;
  const atCounter = counter?.withinReach(actor.root.getWorldPosition(origin));
  const look = new Vector3(), partnerLook = new Vector3(), lateral = new Vector3();
  let pose: Pose | undefined, listener: Pose | undefined, addressee: GameCharacter | undefined;
  let line: ActingLine | undefined, played: ActingLine | undefined;
  let previous: ActingLine | undefined;
  const gazePoint = new Vector3();
  let time = 0, elapsedText = 0, idle = 0, reactionUntil = 0, sequence = 0;
  let learner = false, opening = true, closed = false;
  let reaction: "understood" | "puzzled" | "repeat" | "farewell" | undefined;
  let uninspect: (() => void) | undefined;

  function close(seconds?: number) {
    if (closed) return;
    closed = true;
    turn.close = turn.refresh = undefined;
    if (turn.line?.owner) audio.disownVisual(turn.line.owner);
    pose?.release(seconds);
    listener?.release(seconds);
  }

  function bindListener(partner?: GameCharacter) {
    addressee = partner;
    listener?.release();
    listener = undefined;
    if (!partner || !mounted(partner) || partner.talkPose && !partner.talkPose.releasing) return;
    listener = bindConversationPose(partner, {
      role: partner === turn.target.player ? "learner" : "cast",
      preserveWork: true,
      random: talkRandom(lineSeed(id, run, 0, 8)),
      beforeAdvance: () => {
        actor.headJoint.getWorldPosition(partnerLook);
        partner.root.parent?.worldToLocal(partnerLook);
        return turn.paused;
      },
    });
    if (listener) listener.watch = partnerLook;
  }

  function react(kind: NonNullable<typeof reaction>, delay = 0) {
    if (!pose || pose.channel === "face" || !pose.react(kind === "understood" ? kind : "repeat", 1, delay)) return;
    reaction = kind;
    sequence++;
    reactionUntil = time + (kind === "understood" ? 0.52 : 0.65);
  }

  function cueFor(line: ActingLine, elapsed: number, partner?: GameCharacter) {
    if (!pose || pose.reduced || pose.channel === "face") return;
    if (line.replay) {
      if ((!previous?.replay || previous.key !== line.key) && elapsed < 0.3) react("repeat", -elapsed);
      return;
    }
    const greeting = opening && scope === "street";
    const cue = classifyTalk(line.text, zone?.id ?? "", opening);
    opening = false;
    const seed = lineSeed(id, run, line.key);
    const point = cue.anchor && anchors?.[cue.anchor];
    const glanceAt = 0.25 + 0.30 * seed;
    if (previous?.key === line.key) return;
    if (point && elapsed <= glanceAt) pose.glanceAt(point, glanceAt - elapsed, 0.26, cue.anchor);
    if (elapsed > 0.24) return;

    let side: -1 | 1 = cue.side ?? (seed < 0.5 ? -1 : 1);
    if (cue.side && partner) {
      actor.root.getWorldPosition(origin);
      partner.root.getWorldPosition(gazePoint).sub(origin);
      lateral.set(1, 0, 0).transformDirection(actor.root.matrixWorld);
      if (gazePoint.z * lateral.x - gazePoint.x * lateral.z < 0) side = side === 1 ? -1 : 1;
    }
    const delay = Math.max(0, 0.05 + 0.17 * seed - elapsed);
    const family = scope === "greeting" || greeting ? "greeting" : cue.family;
    if (family === "goodbye") {
      const kind = pose.canWave ? personality.farewell : "yes";
      if (pose.react(kind, side, delay)) { reaction = "farewell"; sequence++; }
    } else if (family !== "rest" && family !== "repeat") {
      let kind: GestureRequest["kind"] = family;
      const arm = kind !== "yes" && kind !== "no";
      if (arm && (scope === "street" && family === "greeting" || !pose.armOpportunity || family === "greeting" && !pose.canWave)) {
        kind = "headGreeting";
      } else if (arm && family !== "point" && family !== "greeting" && lineSeed(id, run, line.key, 5) >= personality.armChance) return;
      pose.gestureForLine(line.key, { kind, side, delay, count: cue.quantity, straight: cue.straight,
        directional: !!cue.side, strength: family === "greeting" ? 0.53 : 1, smile: personality.quickSmile });
    }
  }

  function beforeAdvance(dt: number) {
    if (!pose || closed) return false;
    if (!mounted(actor)) { close(0); return false; }
    const { target } = turn;
    const channel = target.action?.() ? "face" : target.motion ?? "full";
    if (pose.channel !== channel) pose.channel = channel;
    const partner = channel === "full" ? target.partner ?? target.player : undefined;
    if (partner !== addressee) bindListener(partner);
    const held = turn.paused || !!globalThis.document?.hidden;
    if (held || turn.learner) {
      if (!learner) pose.settle();
      learner = true;
      return held;
    }
    if (learner) { learner = false; line = undefined; }
    if (partner && mounted(partner)) {
      partner.headJoint.getWorldPosition(look);
      actor.root.parent?.worldToLocal(look);
      pose.watch = look;
    } else if (pose.watch) pose.watch = undefined;

    const next = turn.line;
    if (line !== next) {
      if (line) previous = line;
      line = next;
      idle = elapsedText = 0;
      if (line && !line.finished) pose.speak(line.key, line.owner ?? null);
    }
    time += dt;
    elapsedText += dt;
    const owner = line?.finished ? undefined : line?.owner;
    const playing = owner && audio.visualState(owner) === "playing";
    const pending = owner && audio.visualOwner === owner;
    if (line && line !== played && (playing || !line.replay && (scope === "greeting" || opening && scope === "street") && !owner && !line.finished)) {
      played = line;
      cueFor(line, owner ? audio.visualElapsed(owner) : elapsedText, partner);
      if (partner && pose.watch) {
        partner.headJoint.getWorldPosition(look);
        actor.root.parent?.worldToLocal(look);
      }
    }
    if (turn.feedback) {
      react(turn.feedback);
      turn.feedback = undefined;
      idle = 0;
    }
    if (!playing && !pending && (!line || line.finished || elapsedText >= line.seconds)) {
      pose.setRole(turn.waiting ? "listening" : "cast");
      if (!turn.waiting && (idle += dt) >= 0.3 && time >= reactionUntil) close();
    } else idle = 0;
    if (turn.glance) {
      if (channel !== "face") pose.glanceAt(turn.glance, 0, 0.26, "card", true);
      turn.glance = undefined;
    }
    return false;
  }

  pose = bindConversationPose(actor, {
    audio, mouth, entry, armEntryAge: entry ? entryAge : undefined, beforeAdvance, deferRefresh: true, preserveWork: true,
    onDetach: () => { close(mounted(actor) ? undefined : 0); uninspect?.(); },
    counterY: atCounter ? counter?.center.y : undefined, counterContains: atCounter ? counter?.contains : undefined,
    random: talkRandom(lineSeed(id, run, 0, 7)),
  });
  if (!pose) {
    if (turn.line?.owner) audio.disownVisual(turn.line.owner);
    return;
  }
  turn.close = close;
  turn.refresh = () => actor.update(0);
  actor.update(0);
  if (import.meta.env.DEV) uninspect = inspectTalkNatural(() => {
    const speaker = snapshotActor(pose, id, listener ? "learner" : null);
    if (!speaker) return null;
    const current = turn.line, owner = current?.owner;
    const listening = turn.waiting && !closed && speaker.role === "listening";
    return {
      version: 1, scope, run, actorId: id, speakerId: id, lineId: current?.key ?? null,
      speakingLineId: !closed && speaker.role === "speaking" ? current?.key ?? null : null,
      phase: closed ? "released" : listening ? "you" : "npc",
      playback: owner ? audio.visualState(owner) : "idle",
      elapsed: owner && audio.visualOwner === owner ? audio.visualElapsed(owner) : null,
      requestId: owner ? inspectedRequest(owner) : null, requestOwned: !!owner && audio.visualOwner === owner,
      listening, reduced: speaker.reduced, mouth: speaker.mouth, blink: speaker.blink,
      envelope: speaker.envelope, gesture: speaker.gesture, gestureWeight: speaker.gestureWeight, gaze: speaker.gaze,
      listeningWeight: speaker.listeningWeight, deltas: speaker.deltas,
      reaction: reaction ? { actorId: id, kind: reaction, sequence,
        weight: reaction === "farewell" ? speaker.gestureWeight : speaker.reactionWeight } : null,
      speaker, player: addressee === turn.target.player ? snapshotActor(listener, "player", id) : null,
      bystander: null, others: addressee !== turn.target.player && listener ? [snapshotActor(listener, "partner", id)] : [],
    };
  }, scope === "mode" || scope === "street" ? 1 : 0);
}
