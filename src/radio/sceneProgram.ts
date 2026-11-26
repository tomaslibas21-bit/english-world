import { audio, clipUrl, filesToken } from "../game/audio";
import type { RadioScene, SceneTitle } from "../content/radioScenes/types";
import { nextSceneRoute, validBag } from "./sceneBag";
import { loadScene, routeTurns } from "./scenes";
import { talkFingerprint, type TalkCue, type TalkItem, type TalkTrack } from "./talkPlayer";
import type { TalkProgress, TalkSelection } from "./talkProgress";

export interface SceneCue extends TalkCue {
  speaker: string;
  translation: string;
  number: number;
  recording(): string;
}

export interface SceneItem extends TalkItem {
  title: SceneTitle;
  routeId: number;
  tracks: { target: TalkTrack & { cues: SceneCue[] } };
}

export function sceneSelection(id: string): TalkSelection {
  return { itemKey: `scene/${id}/pc`, chapterId: id };
}

function program(scene: RadioScene, routeId: number): SceneItem {
  const turns = routeTurns(scene, routeId);
  if (!turns) throw { kind: "missing" };
  let duration = 0;
  const cues: SceneCue[] = turns.map((turn, index) => {
    const start = duration;
    duration += turn.duration;
    return {
      number: index + 1, sentenceId: `turn-${index + 1}`, textHash: talkFingerprint(turn.text),
      language: "es", text: turn.text, speaker: turn.speaker, translation: turn.translation, start, end: duration,
      recording: () => clipUrl(audio.base, turn.clipKey, audio.repairVersions[turn.clipKey], filesToken()),
    };
  });
  const audioVersion = talkFingerprint(`${scene.version}/${routeId}`);
  return { selection: sceneSelection(scene.id), title: scene.title, routeId,
    tracks: { target: { mode: "target", cues, duration, audioVersion, recording: cues[0].recording } } };
}

export async function loadSceneProgram(selection: TalkSelection, signal: AbortSignal, fresh: boolean, progress: TalkProgress) {
  const [scene] = await Promise.all([loadScene(selection.chapterId), audio.init()]);
  signal.throwIfAborted();
  if (!scene || sceneSelection(scene.id).itemKey !== selection.itemKey) throw { kind: "missing" };
  const saved = progress.getSnapshot().items[selection.itemKey]?.sceneBag;
  if (!fresh && validBag(saved, scene) && saved.position) return program(scene, saved.order[saved.position - 1]);

  let item!: SceneItem;
  progress.beginScene(selection, (previous) => {
    const draw = nextSceneRoute(scene, previous);
    if (!draw) throw { kind: "missing" };
    item = program(scene, draw.routeId);
    const { audioVersion, cues } = item.tracks.target;
    return { bag: draw.bag, start: { audioVersion, sentence: cues[0].sentenceId, textHash: cues[0].textHash,
      leg: "es", fraction: 0, offsetSec: 0, complete: false } };
  });
  return item;
}
