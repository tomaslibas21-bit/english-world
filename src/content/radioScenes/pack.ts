import { NPCS } from "../npcs";
import { npcVoice } from "../voices";
import type { RadioScene, ScenePath, SceneTurn } from "./types";

// NPC rows reference cast[index]. Learner rows reference cast[-index - 1], identifying their addressee.
type PackedTurn =
  | [cast: number, text: string, translation: string, speed: number]
  | [cast: number, text: string, translation: string, clipKey: string, duration: number];

export interface PackedRadioScene extends Omit<RadioScene, "turns" | "paths" | "shortHappyPath"> {
  cast: [id: string, voice: string, speed: number][];
  turns: PackedTurn[];
  contexts: ScenePath["context"][];
  replies: string[];
  paths: number[][];
  shortHappyPath?: number[];
}

/** Compact storage with shared cast and replay references. Playback callers receive RadioScene. */
export function packScene(scene: RadioScene): PackedRadioScene {
  const { turns, paths, shortHappyPath, ...rest } = scene;
  const cast: PackedRadioScene["cast"] = [];
  const castIds = new Map<string, number>();
  const addCast = (id: string, voice: string, speed: number) => {
    const key = JSON.stringify([id, voice, speed]);
    let index = castIds.get(key);
    if (index === undefined) {
      index = cast.length;
      cast.push([id, voice, speed]);
      castIds.set(key, index);
    }
    return index;
  };
  const contexts: ScenePath["context"][] = [];
  const contextIds = new Map<string, number>();
  const replies: string[] = [];
  const replyIds = new Map<string, number>();
  const encodePath = (path: ScenePath) => {
    const key = JSON.stringify(path.context);
    let context = contextIds.get(key);
    if (context === undefined) {
      context = contexts.length;
      contexts.push(path.context);
      contextIds.set(key, context);
    }
    return [context, ...path.replies.map((ref) => {
      let id = replyIds.get(ref);
      if (id === undefined) {
        id = replies.length;
        replies.push(ref);
        replyIds.set(ref, id);
      }
      return id;
    })];
  };
  const encodedPaths = paths.map(encodePath);
  const happy = shortHappyPath ? encodePath(shortHappyPath) : undefined;
  return {
    ...rest, cast,
    turns: turns.map((turn): PackedTurn => "to" in turn
      ? [-addCast(turn.to, npcVoice(NPCS[turn.to], true), NPCS[turn.to]?.speed ?? 1) - 1, turn.text, turn.translation, turn.speed]
      : [addCast(turn.speaker, turn.voice, turn.speed), turn.text, turn.translation, turn.clipKey, turn.duration]),
    contexts, replies, paths: encodedPaths,
    ...(happy === undefined ? {} : { shortHappyPath: happy }),
  };
}

export function unpackScene(scene: PackedRadioScene): RadioScene {
  const { cast, turns, contexts, replies, paths, shortHappyPath, ...rest } = scene;
  const decodePath = ([context, ...refs]: number[]): ScenePath => ({
    context: contexts[context], replies: refs.map((id) => replies[id]),
  });
  return {
    ...rest,
    turns: turns.map((turn): SceneTurn => turn.length === 4
      ? { speaker: "learner", text: turn[1], translation: turn[2], speed: turn[3], to: cast[-turn[0] - 1][0] }
      : { speaker: cast[turn[0]][0], text: turn[1], translation: turn[2], speed: cast[turn[0]][2],
          voice: cast[turn[0]][1], clipKey: turn[3], duration: turn[4] }),
    paths: paths.map(decodePath),
    ...(shortHappyPath === undefined ? {} : { shortHappyPath: decodePath(shortHappyPath) }),
  };
}
