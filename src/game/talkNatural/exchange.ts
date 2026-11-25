import { Vector3 } from "three";
import { classifyTalk, talkPersonality } from "../../content/talkNatural";
import type { AudioSystem } from "../audio";
import type { GameCharacter } from "../characters";
import { talkCounterHeight, talkRoomAnchors } from "../world/talkNatural";
import type { ActingLine, ActingTurn } from "./binding";
import type { NaturalRig, TalkLineId } from "./contract";
import { inspectTalkNatural, inspectedRequest, snapshotActor } from "./inspection";
import type { VoiceMouth } from "./mouth";
import { bindConversationPose, type GestureRequest } from "./pose";
import { lineSeed } from "./seed";

type Pose = NonNullable<ReturnType<typeof bindConversationPose>>;
let nextRun = 0;

export function presentExchange(turn: ActingTurn, rig: NaturalRig, mouth: VoiceMouth, audio: AudioSystem) {
  const { actor, id, zone, scope = "mode" } = turn.target;
  if (!actor.root.parent || !actor.root.visible || actor.naturalRig === undefined) return;
  const run = ++nextRun;
  const personality = talkPersonality(id);
  const position = new Vector3();
  const anchors = zone && talkRoomAnchors(zone.id, zone.group);
  const counterY = anchors && talkCounterHeight(anchors, actor.root.getWorldPosition(position));
  let pose: Pose | undefined;
  let listener: { ch: GameCharacter; pose: Pose; player: boolean } | undefined;
  let addressee: GameCharacter | undefined;
  let line: ActingLine | undefined, played: ActingLine | undefined, previousKey: TalkLineId | undefined;
  let feedback: ActingTurn["feedback"], sequence = 0;
  let reaction: "understood" | "puzzled" | "repeat" | "farewell" | undefined;
  let idle = 0, elapsedText = 0, reactionLeft = 0, opening = true;
  let closed = false;
  let uninspect: (() => void) | undefined;

  const close = (seconds?: number) => {
    if (closed) return;
    closed = true;
    turn.close = turn.refresh = undefined;
    if (seconds === 0) {
      pose?.interrupt();
      listener?.pose.interrupt();
    } else {
      pose?.release(seconds);
      listener?.pose.release(seconds);
    }
  };

  const look = new Vector3();
  const beforeAdvance = (dt: number) => {
    if (!pose || closed) return false;
    if (!actor.root.visible) { close(); return false; }
    const paused = turn.paused || !!globalThis.document?.hidden;
    const target = turn.target;
    const partner = target.partner ?? target.player;
    if (partner !== addressee) bindListener(partner, !!target.player);
    if (partner) {
      partner.headJoint.getWorldPosition(look);
      actor.root.parent?.worldToLocal(look);
      pose.watch = look;
    } else pose.watch = undefined;

    const next = turn.line;
    if (line !== next) {
      if (line && line.key !== next?.key) previousKey = line.key;
      line = next;
      elapsedText = idle = 0;
      if (line) pose.speak(line.key, line.owner ?? null);
    }
    const owner = line?.owner;
    const playing = owner && audio.visualState(owner) === "playing";
    const pending = owner && audio.visualOwner === owner && !line?.finished;
    if (paused) return true;
    elapsedText += dt;
    reactionLeft = Math.max(0, reactionLeft - dt);
    if (line?.repeat && !owner && line !== played) {
      played = line;
      if (pose.react("repeat")) { reaction = "repeat"; sequence++; reactionLeft = 0.65; }
    }
    if (line && playing && line !== played) {
      played = line;
      const elapsed = audio.visualElapsed(owner);
      const repeat = line.repeat;
      const cue = classifyTalk(line.text, zone?.id ?? "", opening, false, repeat);
      const seed = lineSeed(id, run, line.key);
      const side: -1 | 1 = cue.side && partner && Math.cos(partner.root.rotation.y - actor.root.rotation.y) > 0 ? (cue.side === 1 ? -1 : 1)
        : cue.side ?? (seed < 0.5 ? -1 : 1);
      const glanceAt = 0.25 + 0.30 * seed;
      const point = cue.anchor && anchors?.[cue.anchor];
      if (point && elapsed <= glanceAt) pose.glanceAt(point, glanceAt - elapsed, 0.19, cue.anchor);
      if (repeat && elapsed <= 0.65 && pose.react("repeat", side, -elapsed)) {
        reaction = "repeat"; sequence++; reactionLeft = 0.65 - elapsed;
      } else if (elapsed <= 0.12 && !repeat && previousKey !== line.key) {
        const delay = Math.max(0, 0.05 + 0.17 * seed - elapsed);
        const family = scope === "greeting" ? "greeting" : cue.family;
        if (family === "goodbye") {
          const farewell = personality.farewell === "wave" && !pose.canWave || pose.armOpportunity === 0 ? "yes" : personality.farewell;
          if (pose.react(farewell, side, delay)) { reaction = "farewell"; sequence++; }
        } else if (family !== "rest" && family !== "repeat") {
          let kind: GestureRequest["kind"] = family;
          if (family === "greeting" && !pose.canWave || family === "offer" && !pose.armOpportunity) kind = "headGreeting";
          if (family === "greeting" || family === "point" || family === "offer" || family === "yes" || family === "no" ||
            lineSeed(id, run, line.key, 1) < personality.armChance * pose.armOpportunity) {
            pose.gestureForLine(line.key, { kind, side, count: cue.quantity, delay, directional: !!cue.side });
          }
        }
      }
      opening = false;
    }
    if (turn.feedback !== feedback) {
      feedback = turn.feedback;
      if (feedback && performance.now() - feedback.at < 450 &&
          pose.react(feedback.kind === "understood" ? "understood" : "repeat")) {
        reaction = feedback.kind; sequence++; reactionLeft = feedback.kind === "understood" ? 0.52 : 0.65;
      }
      idle = 0;
    }
    if (!playing && !pending && (!line || line.finished || elapsedText >= line.seconds || owner)) {
      if (turn.waiting) pose.setRole("listening");
      else if (pose.mouth === 0) pose.setRole("cast");
      if (!turn.waiting && (idle += dt) >= (scope === "greeting" || scope === "town" ? 0 : 0.30) && reactionLeft <= 0) close();
    } else idle = 0;
    return false;
  };

  function bindListener(ch?: GameCharacter, player = false) {
    addressee = ch;
    listener?.pose.release(0.16);
    listener = undefined;
    if (!ch?.root.visible || !ch.root.parent || ch.talkPose && !ch.talkPose.releasing) return;
    const watch = new Vector3();
    const listening = bindConversationPose(ch, {
      role: player ? "learner" : "cast",
      beforeAdvance: () => {
        actor.headJoint.getWorldPosition(watch);
        ch.root.parent?.worldToLocal(watch);
        return !closed && (turn.paused || !!globalThis.document?.hidden);
      },
    });
    if (listening) {
      listening.watch = watch;
      listener = { ch, pose: listening, player };
    }
  }

  pose = bindConversationPose(actor, { audio, counterY, rig, mouth, beforeAdvance, energy: personality.energy, onDetach: () => {
    close();
    if (import.meta.env.DEV) uninspect?.();
  } });
  if (!pose) return;
  turn.close = close;
  turn.refresh = () => { actor.update(0); listener?.ch.update(0); };
  bindListener(turn.target.partner ?? turn.target.player, !!turn.target.player);
  if (import.meta.env.DEV) uninspect = inspectTalkNatural(() => {
    const speaker = snapshotActor(pose, id, listener?.player ? "learner" : listener ? "partner" : null);
    if (!speaker) return null;
    const current = turn.line;
    const owner = current?.owner;
    const listening = turn.waiting && !closed && speaker.role !== "speaking";
    return {
      version: 1, scope, run, actorId: id, speakerId: id, lineId: current?.key ?? null,
      speakingLineId: !closed && speaker.role === "speaking" ? current?.key ?? null : null,
      phase: closed ? "released" : listening ? "you" : "npc",
      playback: owner ? audio.visualState(owner) : "idle",
      elapsed: owner && audio.visualOwner === owner ? audio.visualElapsed(owner) : null,
      requestId: owner ? inspectedRequest(owner) : null, requestOwned: !!owner && audio.visualOwner === owner,
      listening, reduced: speaker.reduced, envelope: speaker.envelope, mouth: speaker.mouth, blink: speaker.blink,
      gesture: speaker.gesture, gestureWeight: speaker.gestureWeight, gaze: speaker.gaze,
      listeningWeight: speaker.listeningWeight, deltas: speaker.deltas,
      reaction: reaction ? { actorId: id, kind: reaction, sequence,
        weight: reaction === "farewell" ? speaker.gestureWeight : speaker.reactionWeight } : null,
      speaker, player: listener?.player ? snapshotActor(listener.pose, "player", id) : null,
      bystander: null, others: listener && !listener.player && listener.pose.applied.active ? [snapshotActor(listener.pose, "partner", id)] : [],
    };
  }, scope === "street" || scope === "mode" ? 1 : 0);
}
